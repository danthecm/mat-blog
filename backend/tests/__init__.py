from django.contrib.auth.models import User, Group, Permission
from django.contrib.contenttypes.models import ContentType
from rest_framework_simplejwt.tokens import RefreshToken
from blog.models import Blog, BlogCategory, BlogTag, BlogView, BlogStatus
from user.models import UserProfile


def ensure_group_permissions(group_name):
    """
    Ensure the specified group has the necessary model-level permissions.
    This mimics the logic in the 0002_setup_groups migration for test environments.
    """
    group, _ = Group.objects.get_or_create(name=group_name)
    
    # Define basic permissions for tests
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
        ],
    }

    if group_name in ROLE_PERMISSIONS:
        for app_label, model_name, codename in ROLE_PERMISSIONS[group_name]:
            try:
                ct = ContentType.objects.get(app_label=app_label, model=model_name)
                perm = Permission.objects.get(codename=codename, content_type=ct)
                group.permissions.add(perm)
            except (ContentType.DoesNotExist, Permission.DoesNotExist):
                pass
    return group


def create_user(username, role='contributor', is_approved=True, password='testpass123'):
    """Create a user with an attached UserProfile and the correct Group membership."""
    user = User.objects.create_user(
        username=username, password=password, email=f'{username}@test.com'
    )
    UserProfile.objects.create(user=user, role=role, is_approved=is_approved)
    
    # Ensure group exists and has permissions, then add user
    group = ensure_group_permissions(role)
    user.groups.add(group)
    return user


def get_token(user):
    """Return a JWT access token string for the given user."""
    return str(RefreshToken.for_user(user).access_token)


def create_blog(author, title='Test Blog', status=BlogStatus.PUBLISHED, featured=False, content=None):
    """
    Create and return a Blog instance with realistic Guardian permissions assigned.
    - Draft: Author has change + delete.
    - Pending/Published: Author has no edit rights (controlled by newsroom workflow).
    """
    from guardian.shortcuts import assign_perm
    
    blog = Blog(
        title=title,
        content=content or '<p>' + ('word ' * 300) + '</p>',
        author=author,
        status=status,
        featured=featured,
    )
    blog.save()
    
    # Mirroring the real application workflow:
    # 1. Author gets permissions on creation (which starts as DRAFT usually)
    assign_perm('blog.change_blog', author, blog)
    assign_perm('blog.delete_blog', author, blog)
    
    # 2. If we are creating it in a non-draft status for a test, 
    # we need to simulate the permissions being revoked (as in SubmitForReviewView)
    if status != BlogStatus.DRAFT:
        from guardian.shortcuts import remove_perm
        remove_perm('blog.change_blog', author, blog)
        
        # If it's published, they also lose delete rights (only admins/editors can delete published)
        if status == BlogStatus.PUBLISHED:
            remove_perm('blog.delete_blog', author, blog)
    
    return blog
