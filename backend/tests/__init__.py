"""
Shared test utilities used across all test modules.
"""
from django.contrib.auth.models import User
from rest_framework_simplejwt.tokens import RefreshToken
from blog.models import Blog, BlogCategory, BlogTag, BlogView, BlogStatus
from user.models import UserProfile


def create_user(username, role='contributor', is_approved=True, password='testpass123'):
    """Create a user with an attached UserProfile."""
    user = User.objects.create_user(
        username=username, password=password, email=f'{username}@test.com'
    )
    UserProfile.objects.create(user=user, role=role, is_approved=is_approved)
    return user


def get_token(user):
    """Return a JWT access token string for the given user."""
    return str(RefreshToken.for_user(user).access_token)


def create_blog(author, title='Test Blog', status=BlogStatus.PUBLISHED, featured=False, content=None):
    """Create and return a Blog instance."""
    blog = Blog(
        title=title,
        content=content or '<p>' + ('word ' * 300) + '</p>',
        author=author,
        status=status,
        featured=featured,
    )
    blog.save()
    return blog
