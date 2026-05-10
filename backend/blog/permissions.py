from rest_framework.permissions import BasePermission, SAFE_METHODS
from user.models import UserProfile
from .models import BlogStatus


class IsEditorOrAdmin(BasePermission):
    """Allow only users with editor or admin role."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        try:
            return request.user.profile.role in ('editor', 'admin')
        except UserProfile.DoesNotExist:
            return False


class IsAdminRole(BasePermission):
    """Allow only admin-role users."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        try:
            return request.user.profile.role == 'admin'
        except UserProfile.DoesNotExist:
            return False


class IsAuthorOrEditorOrReadOnly(BasePermission):
    """
    - Read: anyone
    - Create: authenticated (contributor+)
    - Update/Delete: author themselves, or editor/admin
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

        # 1. Admin can do EVERYTHING
        try:
            if request.user.profile.role == 'admin':
                return True
        except UserProfile.DoesNotExist:
            pass

        # 2. Edit Lock: Authors/Editors cannot edit pending submissions.
        # They must 'recall' them to drafts first (authors) or just use the Inbox (editors).
        if obj.status == BlogStatus.PENDING and request.method not in SAFE_METHODS:
            try:
                # Only editors can modify a post while it's in review (Admins already handled above)
                if request.user.profile.role == 'editor':
                    return True
                return False
            except UserProfile.DoesNotExist:
                return False

        # 3. Author permissions:
        if obj.author == request.user:
            if request.method in SAFE_METHODS:
                return True
            
            # Authors can delete their own DRAFTS
            if request.method == 'DELETE':
                return obj.status == BlogStatus.DRAFT
            
            # Authors can edit DRAFTS or PUBLISHED posts
            # But they CANNOT edit PENDING (must recall first)
            return obj.status in (BlogStatus.DRAFT, BlogStatus.PUBLISHED)
        
        # 4. Editor permissions:
        try:
            # Editors can update (but not delete) any post
            if request.user.profile.role == 'editor' and request.method != 'DELETE':
                return True
        except UserProfile.DoesNotExist:
            pass

        return False


class IsApprovedContributor(BasePermission):
    """User must be authenticated and approved to create content."""

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Admins are always approved
        try:
            if request.user.profile.role == 'admin':
                return True
            return request.user.profile.is_approved
        except UserProfile.DoesNotExist:
            return False
