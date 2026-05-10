from rest_framework import serializers
from .models import SubmissionNotification, EditorialNote
from blog.serializer import BlogListSerializer
from user.serializer import UserSerializer


class EditorialNoteSerializer(serializers.ModelSerializer):
    editor = UserSerializer(read_only=True)

    class Meta:
        model = EditorialNote
        fields = ('id', 'editor', 'note', 'created_at')


class SubmissionNotificationSerializer(serializers.ModelSerializer):
    blog = BlogListSerializer(read_only=True)
    submitted_by = UserSerializer(read_only=True)
    notes = EditorialNoteSerializer(many=True, read_only=True)

    class Meta:
        model = SubmissionNotification
        fields = ('id', 'blog', 'submitted_by', 'message', 'is_read', 'created_at', 'notes')
