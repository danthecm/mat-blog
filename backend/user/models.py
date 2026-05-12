from django.db import models
from django.contrib.auth.models import User


class UserProfile(models.Model):
    ROLE_CHOICES = [
        ('contributor', 'Contributor'),
        ('editor', 'Editor'),
        ('admin', 'Admin'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='contributor')
    bio = models.TextField(blank=True, default='')
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    website = models.URLField(blank=True, default='')
    is_approved = models.BooleanField(default=True)  # editors can approve/suspend contributors

    def __str__(self):
        return f"{self.user.username} ({self.role})"

    class Meta:
        ordering = ('user__username',)

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import Group


VALID_ROLES = {'contributor', 'editor', 'admin'}


@receiver(post_save, sender=UserProfile)
def sync_user_group(sender, instance, **kwargs):
    """
    Keep Django Group membership in sync with UserProfile.role.

    Safety rules:
    - Only runs when `role` is a recognised, non-empty value.
    - Guards against None / unexpected strings that would cause an
      IntegrityError on auth_group.name NOT NULL constraint.
    - Does NOT call profile.save() itself, so there is no recursion risk.
    """
    role = instance.role
    if not role or role not in VALID_ROLES:
        # Unknown or blank role — don't touch group membership.
        return

    group, _ = Group.objects.get_or_create(name=role)
    # Remove ALL three role groups then add the correct one.
    # Using sets to avoid an extra query when the user is already in the right group.
    current_role_groups = Group.objects.filter(name__in=VALID_ROLES)
    instance.user.groups.remove(*current_role_groups)
    instance.user.groups.add(group)

