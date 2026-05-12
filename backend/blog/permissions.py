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
    - Update/Delete: see has_object_permission for full rules

    Editorial lock rules:
    - Admins can edit/delete any post at any status (global perms bypass).
    - Editors can edit DRAFT posts globally, but CANNOT touch PENDING posts
      through this view — they must use the inbox workflow (publish/reject).
    - Authors can only edit/delete their own DRAFT posts (object-level perms).
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

        is_delete = request.method == 'DELETE'
        global_perm = 'blog.delete_blog' if is_delete else 'blog.change_blog'
        object_perm = global_perm  # same codename, checked at object level below

        # 1. Admins have the global delete_blog permission — they bypass all locks.
        #    Editors only have global change_blog (not delete_blog), so the
        #    admin-only path is: has global delete_blog perm.
        if request.user.has_perm('blog.delete_blog') and is_admin(request.user):
            return True

        # 2. PENDING edit-lock: neither editors nor contributors may mutate a
        #    pending post via the standard CRUD path.  Editors must use the
        #    newsroom inbox (publish / reject / notes) instead.
        if obj.status == BlogStatus.PENDING:
            return False

        # 3. Editors can change (but not delete) any non-pending post.
        if not is_delete and request.user.has_perm('blog.change_blog'):
            return True

        # 4. Authors can edit/delete their own posts, but only while in DRAFT.
        #    Object-level perms are revoked on submit and restored on recall/reject.
        if obj.status != BlogStatus.DRAFT:
            return False
        return request.user.has_perm(object_perm, obj)


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
