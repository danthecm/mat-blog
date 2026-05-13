from django.contrib.auth.models import User
from rest_framework import serializers
from .models import UserProfile
from blog.roles import get_primary_role


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ('role', 'bio', 'avatar', 'website', 'is_approved')
        read_only_fields = ('role', 'is_approved')  # only admins/editors change these


class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)
    # Array of group names, e.g. ["editor"] — primary source of truth for the frontend
    groups = serializers.SlugRelatedField(
        many=True, slug_field='name', read_only=True
    )
    # Convenience computed string — highest-privilege role name
    role = serializers.SerializerMethodField()

    def get_role(self, obj):
        return get_primary_role(obj)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'date_joined', 'profile', 'groups', 'role', 'is_active')


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    bio = serializers.CharField(write_only=True, required=False, default='')
    website = serializers.CharField(write_only=True, required=False, default='')

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'bio', 'website')

    def create(self, validated_data):
        from django.contrib.auth.models import Group
        bio = validated_data.pop('bio', '')
        website = validated_data.pop('website', '')
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.is_active = False  # New users require admin approval
        user.save()
        UserProfile.objects.create(user=user, bio=bio, website=website)
        # All new users start as contributors — assign Group so permission checks work
        contributor_group, _ = Group.objects.get_or_create(name='contributor')
        user.groups.add(contributor_group)
        return user


class UpdateProfileSerializer(serializers.ModelSerializer):
    bio = serializers.CharField(source='profile.bio', required=False)
    website = serializers.URLField(source='profile.website', required=False)
    avatar = serializers.ImageField(source='profile.avatar', required=False)

    class Meta:
        model = User
        fields = ('first_name', 'last_name', 'email', 'bio', 'website', 'avatar')

    def update(self, instance, validated_data):
        profile_data = {}
        if 'profile' in validated_data:
            profile_data = validated_data.pop('profile')

        # Update User fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update or create UserProfile
        profile, _ = UserProfile.objects.get_or_create(user=instance)
        for attr, value in profile_data.items():
            setattr(profile, attr, value)
        profile.save()

        return instance