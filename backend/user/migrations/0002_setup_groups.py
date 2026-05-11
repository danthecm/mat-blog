"""
Migration: Create Groups, assign model permissions, and migrate existing users.

This migration:
1. Creates 'contributor', 'editor', 'admin' Groups.
2. Assigns appropriate model-level permissions to each group.
3. Iterates all UserProfile records and adds users to their corresponding Group.

Note: This is a data migration. It uses RunPython so it runs once and is
idempotent — re-running migrate will not duplicate groups or memberships.
"""

from django.db import migrations


ROLE_PERMISSIONS = {
    'contributor': [
        ('blog', 'blog', 'add_blog'),
        ('blog', 'blog', 'view_blog'),
    ],
    'editor': [
        ('blog', 'blog', 'add_blog'),
        ('blog', 'blog', 'change_blog'),
        ('blog', 'blog', 'view_blog'),
        ('engagement', 'comment', 'change_comment'),
        ('engagement', 'comment', 'delete_comment'),
        ('engagement', 'comment', 'view_comment'),
    ],
    'admin': [
        ('blog', 'blog', 'add_blog'),
        ('blog', 'blog', 'change_blog'),
        ('blog', 'blog', 'view_blog'),
        ('blog', 'blog', 'delete_blog'),
        ('engagement', 'comment', 'add_comment'),
        ('engagement', 'comment', 'change_comment'),
        ('engagement', 'comment', 'delete_comment'),
        ('engagement', 'comment', 'view_comment'),
        ('engagement', 'poll', 'add_poll'),
        ('engagement', 'poll', 'change_poll'),
        ('engagement', 'poll', 'delete_poll'),
        ('engagement', 'poll', 'view_poll'),
    ],
}


def create_groups_and_migrate_users(apps, schema_editor):
    Group = apps.get_model('auth', 'Group')
    Permission = apps.get_model('auth', 'Permission')
    ContentType = apps.get_model('contenttypes', 'ContentType')
    UserProfile = apps.get_model('user', 'UserProfile')

    groups = {}
    for role_name, perms in ROLE_PERMISSIONS.items():
        group, _ = Group.objects.get_or_create(name=role_name)
        groups[role_name] = group

        # Assign model-level permissions to the group
        for app_label, model_name, codename in perms:
            try:
                ct = ContentType.objects.get(app_label=app_label, model=model_name)
                perm = Permission.objects.get(codename=codename, content_type=ct)
                group.permissions.add(perm)
            except (ContentType.DoesNotExist, Permission.DoesNotExist):
                # Permission may not exist yet (e.g., first migration on empty DB)
                pass

    # Migrate existing users to their corresponding group
    for profile in UserProfile.objects.select_related('user').all():
        role = profile.role
        if role in groups:
            profile.user.groups.add(groups[role])


def remove_groups(apps, schema_editor):
    """Reverse: remove the three role groups."""
    Group = apps.get_model('auth', 'Group')
    Group.objects.filter(name__in=['contributor', 'editor', 'admin']).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('user', '0001_initial'),
        ('auth', '__latest__'),
        ('contenttypes', '__latest__'),
    ]

    operations = [
        migrations.RunPython(create_groups_and_migrate_users, remove_groups),
    ]
