"""
DRF Permission classes for the blog platform.

All role checks use `blog.roles` helpers — do NOT use `profile.role` directly.
This ensures adding/renaming roles only requires changing `roles.py`.
"""
from rest_framework.permissions import BasePermission, SAFE_METHODS
from .models import BlogStatus
from .roles import is_admin, is_editor, is_contributor


class IsEditorOrHigher(BasePermission):
    """
    Allow any user with 'editor' or 'admin' privileges.
    Role inheritance is handled by the `is_editor` helper.
    """

    def has_permission(self, request, view):
        return request.user.is_authenticated and is_editor(request.user)


class IsAdminRole(BasePermission):
    """Allow only users in the 'admin' group."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and is_admin(request.user)


class IsAuthorOrEditorOrReadOnly(BasePermission):
    """
    - Read (GET/HEAD/OPTIONS): anyone
    - Create: any authenticated user
    - Update/Delete: determined by Django permissions ('change_blog', 'delete_blog')
    """

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True

        if not request.user.is_authenticated:
            return False

        # 1. Global permissions (Editor/Admin)
        if request.method == 'DELETE':
            if request.user.has_perm('blog.delete_blog'):
                return True
        else:
            if request.user.has_perm('blog.change_blog'):
                return True

        # 2. Object-level permissions (Author)
        # Authors can ONLY edit or delete their own posts if they are still in DRAFT status.
        # Once submitted (PENDING) or PUBLISHED, they lose these rights.
        if request.method == 'DELETE':
            return request.user.has_perm('blog.delete_blog', obj) and obj.status == BlogStatus.DRAFT
        
        return request.user.has_perm('blog.change_blog', obj) and obj.status == BlogStatus.DRAFT


class IsApprovedContributor(BasePermission):
    """User must be authenticated and approved to create content."""

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        if not request.user or not request.user.is_authenticated:
            return False
        # Admins are always approved
        if is_admin(request.user):
            return True
        try:
            return request.user.profile.is_approved
        except (AttributeError, Exception):
            # Fallback for users without profiles or DB issues
            return False
