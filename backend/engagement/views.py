from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone
from rest_framework import status, generics
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

from .models import Comment, CommentLike, NewsletterSubscriber, Poll, PollOption, PollVote
from .serializer import (
    CommentSerializer, CommentCreateSerializer,
    NewsletterSubscriberSerializer,
    PollSerializer, PollVoteSerializer,
)


def get_client_ip(request):
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded:
        return x_forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '0.0.0.0')


# ─── Comments ─────────────────────────────────────────────────────────────────

@extend_schema(
    tags=['engagement-comments'],
    methods=['GET'],
    summary='List threaded comments for a blog post',
    parameters=[OpenApiParameter('blog_id', OpenApiTypes.INT, description='Filter comments by blog ID')],
)
@extend_schema(
    tags=['engagement-comments'],
    methods=['POST'],
    summary='Post a new comment (supports threaded replies via `parent` field)',
    request=CommentCreateSerializer,
    responses=CommentSerializer,
)
class CommentListCreateView(generics.ListCreateAPIView):
    """
    GET  /comments/?blog_id=<id>&parent_id=<id>  — list comments (threaded)
    POST /comments/                               — create a comment
    """
    permission_classes = [AllowAny]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CommentCreateSerializer
        return CommentSerializer

    def get_queryset(self):
        qs = Comment.objects.filter(is_approved=True, parent=None)  # top-level only
        blog_id = self.request.query_params.get('blog_id')
        if blog_id:
            qs = qs.filter(blog_id=blog_id)
        return qs.select_related('blog').prefetch_related('replies')

    def perform_create(self, serializer):
        ip = get_client_ip(self.request)
        comment = serializer.save(ip=ip)

        # Link authenticated user if logged in
        if self.request.user.is_authenticated:
            comment.user = self.request.user
            comment.author_name = self.request.user.username
            comment.save(update_fields=['user', 'author_name'])

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        # Return the full representation
        full = CommentSerializer(serializer.instance)
        return Response(full.data, status=status.HTTP_201_CREATED)


@extend_schema(
    tags=['engagement-comments'],
    summary='Toggle like on a comment (idempotent — call again to unlike)',
    request=None,
    responses={200: {'type': 'object', 'properties': {'liked': {'type': 'boolean'}, 'like_count': {'type': 'integer'}}}},
)
class CommentLikeView(APIView):
    """POST /comments/<id>/like/ — Toggle like on a comment (idempotent by IP)."""
    permission_classes = [AllowAny]

    def post(self, request, pk):
        try:
            comment = Comment.objects.get(pk=pk)
        except Comment.DoesNotExist:
            return Response({'error': 'Comment not found.'}, status=status.HTTP_404_NOT_FOUND)

        ip = get_client_ip(request)
        like, created = CommentLike.objects.get_or_create(comment=comment, ip=ip)

        if created:
            Comment.objects.filter(pk=pk).update(like_count=comment.like_count + 1)
            comment.like_count += 1
            return Response({'liked': True, 'like_count': comment.like_count})
        else:
            like.delete()
            Comment.objects.filter(pk=pk).update(like_count=max(0, comment.like_count - 1))
            comment.like_count = max(0, comment.like_count - 1)
            return Response({'liked': False, 'like_count': comment.like_count})


# ─── Newsletter ───────────────────────────────────────────────────────────────

@extend_schema(
    tags=['newsletter'],
    summary='Subscribe an email address to the newsletter',
    request=NewsletterSubscriberSerializer,
    responses={201: {'type': 'object', 'properties': {'message': {'type': 'string'}}}},
)
class NewsletterSubscribeView(APIView):
    """POST /newsletter/subscribe/ — Subscribe to the newsletter."""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = NewsletterSubscriberSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']

        subscriber, created = NewsletterSubscriber.objects.get_or_create(email=email)
        if not created and subscriber.is_active:
            return Response({'message': 'You are already subscribed.'})

        subscriber.is_active = True
        subscriber.save()

        return Response({'message': f'Successfully subscribed {email} to the newsletter.'}, status=status.HTTP_201_CREATED)


@extend_schema(
    tags=['newsletter'],
    summary='Unsubscribe via email + HMAC token (from unsubscribe link in emails)',
    request=None,
    parameters=[
        OpenApiParameter('email', OpenApiTypes.STR, description='Subscriber email address'),
        OpenApiParameter('token', OpenApiTypes.STR, description='HMAC token from the unsubscribe link'),
    ],
    responses={200: {'type': 'object', 'properties': {'message': {'type': 'string'}}}},
)
class NewsletterUnsubscribeView(APIView):
    """GET /newsletter/unsubscribe/?email=<email>&token=<token> — Unsubscribe."""
    permission_classes = [AllowAny]

    def get(self, request):
        email = request.query_params.get('email', '').lower().strip()
        token = request.query_params.get('token', '')

        if not email or not token:
            return Response({'error': 'Email and token are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            subscriber = NewsletterSubscriber.objects.get(email=email)
        except NewsletterSubscriber.DoesNotExist:
            return Response({'error': 'Email not found.'}, status=status.HTTP_404_NOT_FOUND)

        expected_token = subscriber.unsubscribe_token(settings.NEWSLETTER_SECRET)
        if token != expected_token:
            return Response({'error': 'Invalid token.'}, status=status.HTTP_403_FORBIDDEN)

        subscriber.is_active = False
        subscriber.save()
        return Response({'message': f'{email} has been unsubscribed.'})


# ─── Polls ────────────────────────────────────────────────────────────────────

@extend_schema(
    tags=['polls'],
    summary='List all active polls with options and live vote percentages',
)
class ActivePollView(generics.ListAPIView):
    """GET /polls/active/ — Get the currently active poll(s)."""
    serializer_class = PollSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        now = timezone.now()
        return Poll.objects.filter(
            is_active=True
        ).filter(
            expires_at__isnull=True
        ) | Poll.objects.filter(
            is_active=True, expires_at__gt=now
        )


@extend_schema(
    tags=['polls'],
    summary='Cast a vote on a poll (one vote per IP per poll)',
    request=PollVoteSerializer,
    responses={200: PollSerializer},
)
class PollVoteView(APIView):
    """POST /polls/<id>/vote/ — Cast a vote. Idempotent per poll per IP."""
    permission_classes = [AllowAny]

    def post(self, request, poll_id):
        try:
            poll = Poll.objects.prefetch_related('options').get(pk=poll_id, is_active=True)
        except Poll.DoesNotExist:
            return Response({'error': 'Poll not found or inactive.'}, status=status.HTTP_404_NOT_FOUND)

        if poll.expires_at and poll.expires_at < timezone.now():
            return Response({'error': 'This poll has expired.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = PollVoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        option_id = serializer.validated_data['option_id']
        try:
            option = poll.options.get(pk=option_id)
        except PollOption.DoesNotExist:
            return Response({'error': 'Invalid option for this poll.'}, status=status.HTTP_400_BAD_REQUEST)

        ip = get_client_ip(request)

        # Check if this IP already voted on this poll
        already_voted = PollVote.objects.filter(poll=poll, ip=ip).exists()
        if already_voted:
            return Response({'error': 'You have already voted on this poll.'}, status=status.HTTP_400_BAD_REQUEST)

        PollVote.objects.create(poll=poll, option=option, ip=ip)
        PollOption.objects.filter(pk=option_id).update(vote_count=option.vote_count + 1)

        # Return the updated poll results
        poll.refresh_from_db()
        return Response(PollSerializer(poll).data)


@extend_schema(
    tags=['polls'],
    summary='Get a single poll by ID',
)
class PollDetailView(generics.RetrieveAPIView):
    """GET /polls/<id>/ — Get a single poll."""
    queryset = Poll.objects.all()
    serializer_class = PollSerializer
    permission_classes = [AllowAny]
    lookup_field = 'id'
    lookup_url_kwarg = 'poll_id'
