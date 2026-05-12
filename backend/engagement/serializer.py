from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field
from drf_spectacular.types import OpenApiTypes
from .models import Comment, CommentLike, NewsletterSubscriber, Poll, PollOption, PollVote


class CommentSerializer(serializers.ModelSerializer):
    replies = serializers.SerializerMethodField()
    like_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Comment
        fields = (
            'id', 'blog', 'parent', 'author_name', 'content',
            'like_count', 'is_approved', 'created_at', 'replies',
        )
        read_only_fields = ('like_count', 'is_approved', 'created_at')

    @extend_schema_field(serializers.ListSerializer(child=serializers.DictField()))
    def get_replies(self, obj):
        depth = self.context.get('depth', 1)
        if depth >= 4:
            return []
        children = obj.replies.filter(is_approved=True)
        # Pass the incremented depth to the context
        context = dict(self.context)
        context['depth'] = depth + 1
        return CommentSerializer(children, many=True, context=context).data


class CommentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = ('blog', 'parent', 'author_name', 'content')


class NewsletterSubscriberSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        return value.lower().strip()


class PollOptionSerializer(serializers.ModelSerializer):
    percentage = serializers.SerializerMethodField()

    class Meta:
        model = PollOption
        fields = ('id', 'text', 'vote_count', 'percentage')

    @extend_schema_field(OpenApiTypes.FLOAT)
    def get_percentage(self, obj):
        total = obj.poll.options.aggregate(
            total=__import__('django.db.models', fromlist=['Sum']).Sum('vote_count')
        )['total'] or 0
        if total == 0:
            return 0
        return round((obj.vote_count / total) * 100, 1)


class PollSerializer(serializers.ModelSerializer):
    options = PollOptionSerializer(many=True, read_only=True)
    total_votes = serializers.SerializerMethodField()

    class Meta:
        model = Poll
        fields = ('id', 'question', 'is_active', 'expires_at', 'options', 'total_votes', 'created_at')

    @extend_schema_field(OpenApiTypes.INT)
    def get_total_votes(self, obj):
        from django.db.models import Sum
        result = obj.options.aggregate(total=Sum('vote_count'))['total']
        return result or 0


class PollVoteSerializer(serializers.Serializer):
    option_id = serializers.IntegerField()
