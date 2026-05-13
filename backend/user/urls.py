from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from drf_spectacular.utils import extend_schema
from .views import (
    RegisterView,
    UserMeView,
    ContributorProfileView,
    UpdateUserRoleView,
    ApproveContributorView,
    UserListView,
)


@extend_schema(
    tags=['auth'],
    summary='Login — obtain JWT access and refresh tokens',
    description='Submit `username` and `password`. Returns `access` (1h) and `refresh` (7d) tokens.',
)
class LoginView(TokenObtainPairView):
    pass


@extend_schema(
    tags=['auth'],
    summary='Refresh — get a new access token using a refresh token',
)
class TokenRefreshSchemaView(TokenRefreshView):
    pass


urlpatterns = [
    # ── Authentication ──────────────────────────────────────────────────────
    path('auth/register/', RegisterView.as_view(), name='auth-register'),
    path('auth/login/', LoginView.as_view(), name='auth-login'),
    path('auth/token/refresh/', TokenRefreshSchemaView.as_view(), name='auth-token-refresh'),

    # ── User profiles ───────────────────────────────────────────────────────
    path('users/', UserListView.as_view(), name='user-list'),
    path('users/me/', UserMeView.as_view(), name='user-me'),
    path('users/<str:username>/', ContributorProfileView.as_view(), name='contributor-profile'),
    path('users/<str:username>/role/', UpdateUserRoleView.as_view(), name='user-role'),
    path('users/<str:username>/approve/', ApproveContributorView.as_view(), name='user-approve'),
]