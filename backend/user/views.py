from django.contrib.auth.models import User
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter, OpenApiExample
from drf_spectacular.types import OpenApiTypes

from .models import UserProfile
from .serializer import (
    UserSerializer, RegisterSerializer, UpdateProfileSerializer, UserProfileSerializer
)


@extend_schema(tags=['auth'])
class RegisterView(generics.CreateAPIView):
    """
    Create a new contributor account.

    By default, all new accounts are assigned the **contributor** role.
    An admin can later promote the user to **editor** or **admin**.
    """
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {'message': 'Account created successfully.', 'username': user.username},
            status=status.HTTP_201_CREATED
        )


@extend_schema(tags=['users'])
class UserMeView(generics.RetrieveUpdateAPIView):
    """
    Retrieve or update the authenticated user's own profile.

    - **GET** — returns full profile with role, bio, avatar, website.
    - **PATCH** — update `first_name`, `last_name`, `email`, `bio`, `website`, `avatar`.
    """
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return UpdateProfileSerializer
        return UserSerializer

    def get_object(self):
        return self.request.user


@extend_schema(
    tags=['users'],
    parameters=[
        OpenApiParameter('username', OpenApiTypes.STR, OpenApiParameter.PATH, description='The contributor\'s username'),
    ],
)
class ContributorProfileView(generics.RetrieveAPIView):
    """
    Retrieve a contributor's public profile.

    Returns the user's bio, avatar, website, role, and all their published articles.
    """
    queryset = User.objects.select_related('profile').prefetch_related('created_blogs')
    serializer_class = UserSerializer
    lookup_field = 'username'
    permission_classes = [AllowAny]


@extend_schema(
    tags=['users'],
    request={'application/json': {'type': 'object', 'properties': {'role': {'type': 'string', 'enum': ['contributor', 'editor', 'admin']}}}},
    responses={200: {'type': 'object', 'properties': {'message': {'type': 'string'}}}},
)
class UpdateUserRoleView(APIView):
    """
    Change a user's role. **Admin only.**

    Valid roles: `contributor`, `editor`, `admin`.
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, username):
        try:
            requester_profile = request.user.profile
        except UserProfile.DoesNotExist:
            return Response({'error': 'No profile found.'}, status=status.HTTP_403_FORBIDDEN)

        if requester_profile.role != 'admin':
            return Response({'error': 'Only admins can change user roles.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            target_user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        new_role = request.data.get('role')
        if new_role not in ('contributor', 'editor', 'admin'):
            return Response({'error': 'Invalid role.'}, status=status.HTTP_400_BAD_REQUEST)

        profile, _ = UserProfile.objects.get_or_create(user=target_user)
        profile.role = new_role
        profile.save()
        return Response({'message': f'{username} is now a {new_role}.'})


@extend_schema(
    tags=['users'],
    request={'application/json': {'type': 'object', 'properties': {'is_approved': {'type': 'boolean'}}}},
    responses={200: {'type': 'object', 'properties': {'message': {'type': 'string'}}}},
)
class ApproveContributorView(APIView):
    """
    Approve or suspend a contributor. **Editor/Admin only.**

    Set `is_approved: false` to suspend a contributor (they can no longer post).
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, username):
        try:
            requester_profile = request.user.profile
        except UserProfile.DoesNotExist:
            return Response({'error': 'No profile found.'}, status=status.HTTP_403_FORBIDDEN)

        if requester_profile.role not in ('editor', 'admin'):
            return Response({'error': 'Only editors and admins can approve contributors.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            target = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        profile, _ = UserProfile.objects.get_or_create(user=target)
        profile.is_approved = request.data.get('is_approved', True)
        profile.save()
        state = 'approved' if profile.is_approved else 'suspended'
        return Response({'message': f'{username} has been {state}.'})