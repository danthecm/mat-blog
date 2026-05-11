"""
Centralized role/permission helpers.

All permission checks in views and permission classes MUST go through these
functions. This is the single source of truth for role-based logic.

To add a new role (e.g., 'senior_editor') tomorrow:
  1. Create a Group with that name in the DB (via migration or Django admin).
  2. Add 'senior_editor' to the relevant function(s) below — in ONE place.
  3. Done. No views, serializers, or permission classes need changing.
"""


def user_in_group(user, *group_names) -> bool:
    """Return True if the user belongs to ANY of the specified groups."""
    if not user or not user.is_authenticated:
        return False
    return user.groups.filter(name__in=group_names).exists()


def is_contributor(user) -> bool:
    """True for contributors, editors, and admins (all can create content)."""
    return user_in_group(user, 'contributor', 'editor', 'admin')


def is_editor(user) -> bool:
    """True for editors AND admins (admins inherit all editor capabilities)."""
    return user_in_group(user, 'editor', 'admin')


def is_admin(user) -> bool:
    """True only for admins."""
    return user_in_group(user, 'admin')


def get_primary_role(user) -> str:
    """
    Return the highest-privilege role name string for a user.
    Used for serializer output and frontend display.
    """
    if not user or not user.is_authenticated:
        return 'anonymous'
    if is_admin(user):
        return 'admin'
    if user_in_group(user, 'editor'):
        return 'editor'
    return 'contributor'
