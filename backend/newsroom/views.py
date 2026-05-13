from django.conf import settings
from django.core.mail import send_mail
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from django.utils.dateparse import parse_datetime

from blog.models import Blog, BlogStatus
from blog.permissions import IsEditorOrHigher
from blog.roles import is_editor
from engagement.models import NewsletterSubscriber
from guardian.shortcuts import assign_perm, remove_perm
from .models import SubmissionNotification, EditorialNote
from .serializer import SubmissionNotificationSerializer


@extend_schema(
    tags=['newsroom'],
    summary='Submit a draft blog for editorial review (contributor only)',
    description='Changes blog status from `draft` → `pending`. Emails all editors/admins with a notification.',
    request={'application/json': {'type': 'object', 'properties': {'message': {'type': 'string', 'description': 'Optional note to the editor'}}}},
    responses={201: {'type': 'object', 'properties': {'message': {'type': 'string'}, 'notification_id': {'type': 'integer'}}}},
)
class SubmitForReviewView(APIView):
    """
    POST /newsroom/blogs/<slug>/submit/
    Contributor submits their draft for editorial review.
    Changes status: draft → pending.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, slug):
        try:
            blog = Blog.objects.get(slug=slug, author=request.user)
        except Blog.DoesNotExist:
            return Response({'error': 'Blog not found or you are not the author.'}, status=status.HTTP_404_NOT_FOUND)

        if blog.status == BlogStatus.PUBLISHED:
            return Response({'error': 'This blog is already published.'}, status=status.HTTP_400_BAD_REQUEST)

        if blog.status == BlogStatus.PENDING:
            return Response({'error': 'This blog is already under review.'}, status=status.HTTP_400_BAD_REQUEST)

        blog.status = BlogStatus.PENDING
        blog.save(update_fields=['status'])

        # LOCK: revoke the author's edit rights while the post is under review.
        # This is restored on recall (author) or reject (editor).
        remove_perm('blog.change_blog', request.user, blog)

        # Create notification
        notification = SubmissionNotification.objects.create(
            blog=blog,
            submitted_by=request.user,
            message=request.data.get('message', f'{request.user.username} has submitted "{blog.title}" for review.'),
        )

        # Email all editors and admins
        editor_emails = list(
            User.objects.filter(
                groups__name__in=['editor', 'admin']
            ).values_list('email', flat=True)
        )
        if editor_emails:
            send_mail(
                subject=f'[CMBlog] New submission: "{blog.title}"',
                message=(
                    f'{request.user.username} has submitted an article for review.\n\n'
                    f'Title: {blog.title}\n'
                    f'Message: {notification.message}\n\n'
                    f'Log in to the admin to review it.'
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=editor_emails,
                fail_silently=True,
            )

        return Response({
            'message': 'Your article has been submitted for review.',
            'notification_id': notification.id,
        }, status=status.HTTP_201_CREATED)


from blog.views import BlogPagination

@extend_schema(
    tags=['newsroom'],
    summary='Editor inbox — list pending submission notifications (editor/admin only)',
    description='Returns unread submissions by default. Pass `?all=true` to see all submissions including read ones.',
    parameters=[OpenApiParameter('all', OpenApiTypes.BOOL, description='Pass true to include already-read notifications')],
)
class EditorInboxView(ListAPIView):
    """
    GET /newsroom/inbox/
    Lists all pending submission notifications for editors/admins.
    """
    serializer_class = SubmissionNotificationSerializer
    pagination_class = BlogPagination
    permission_classes = [IsAuthenticated, IsEditorOrHigher]

    def get_queryset(self):
        qs = SubmissionNotification.objects.select_related(
            'blog', 'blog__author', 'submitted_by'
        ).prefetch_related('notes').order_by('-created_at')

        show_all = self.request.query_params.get('all', 'false').lower() == 'true'
        if not show_all:
            # Show all notifications for blogs that still need editorial action
            qs = qs.filter(blog__status=BlogStatus.PENDING)
        return qs

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        # Mark only the notifications that were actually returned in this page as read.
        # Avoid a global update that would silently dismiss items on other pages.
        returned_ids = [item['id'] for item in response.data.get('results', response.data) if 'id' in item]
        if returned_ids:
            SubmissionNotification.objects.filter(id__in=returned_ids, is_read=False).update(is_read=True)
        return response


@extend_schema(
    tags=['newsroom'],
    summary='Publish a blog post (editor/admin only)',
    description='Publishes immediately or schedules for a future time. Pass `published_at` in ISO 8601 format to schedule. Emails newsletter subscribers if the post is marked `featured`.',
    request={'application/json': {'type': 'object', 'properties': {'published_at': {'type': 'string', 'format': 'date-time', 'description': 'Optional: ISO 8601 datetime to schedule the post'}}}},
    responses={200: {'type': 'object', 'properties': {'message': {'type': 'string'}}}},
)
class PublishBlogView(APIView):
    """
    POST /newsroom/blogs/<slug>/publish/
    Editor/Admin publishes a pending blog.
    Optionally schedules it with ?published_at=<ISO datetime>.
    Notifies newsletter subscribers if blog is marked featured.
    """
    permission_classes = [IsAuthenticated, IsEditorOrHigher]

    def post(self, request, slug):
        try:
            blog = Blog.objects.get(slug=slug)
        except Blog.DoesNotExist:
            return Response({'error': 'Blog not found.'}, status=status.HTTP_404_NOT_FOUND)

        scheduled_at = request.data.get('published_at')
        if scheduled_at:
            try:
                pub_time = parse_datetime(scheduled_at)
                if not pub_time:
                    raise ValueError
            except (ValueError, TypeError):
                return Response({'error': 'Invalid datetime format. Use ISO 8601.'}, status=status.HTTP_400_BAD_REQUEST)

            blog.published_at = pub_time
            if pub_time > timezone.now():
                blog.status = BlogStatus.PENDING  # stays pending until cron runs
                blog.save(update_fields=['status', 'published_at'])
                return Response({'message': f'Scheduled to publish at {pub_time}.'})

        # Publish now
        blog.status = BlogStatus.PUBLISHED
        blog.published_at = timezone.now()
        blog.save(update_fields=['status', 'published_at'])

        # Notify newsletter subscribers if it's a featured post
        if blog.featured:
            subscriber_emails = list(
                NewsletterSubscriber.objects.filter(is_active=True).values_list('email', flat=True)
            )
            if subscriber_emails:
                send_mail(
                    subject=f'[CMBlog] New Featured Story: "{blog.title}"',
                    message=(
                        f'A new featured story has been published!\n\n'
                        f'{blog.title}\n'
                        f'By {blog.author.username}\n\n'
                        f'Read it at: {settings.SITE_URL}/{blog.slug}'
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=subscriber_emails,
                    fail_silently=True,
                )

        return Response({'message': f'"{blog.title}" is now published.'})


@extend_schema(
    tags=['newsroom'],
    summary='Reject a submission — returns it to draft with an editorial note (editor/admin only)',
    request={'application/json': {'type': 'object', 'properties': {'note': {'type': 'string', 'description': 'Feedback for the author'}}}},
    responses={200: {'type': 'object', 'properties': {'message': {'type': 'string'}}}},
)
class RejectBlogView(APIView):
    """
    POST /newsroom/blogs/<slug>/reject/
    Editor sends the blog back to draft with a note.
    """
    permission_classes = [IsAuthenticated, IsEditorOrHigher]

    def post(self, request, slug):
        try:
            blog = Blog.objects.get(slug=slug)
        except Blog.DoesNotExist:
            return Response({'error': 'Blog not found.'}, status=status.HTTP_404_NOT_FOUND)

        note_text = request.data.get('note', 'Your submission needs revision.')
        blog.status = BlogStatus.DRAFT
        blog.save(update_fields=['status'])

        # UNLOCK: editor is rejecting, restore the author's ability to edit.
        assign_perm('blog.change_blog', blog.author, blog)

        # Save editorial note on the submission
        notification = SubmissionNotification.objects.filter(blog=blog).order_by('-created_at').first()
        if notification:
            EditorialNote.objects.create(
                notification=notification,
                editor=request.user,
                note=note_text,
            )

        # Email the author
        if blog.author.email:
            send_mail(
                subject=f'[CMBlog] Revision requested: "{blog.title}"',
                message=(
                    f'Hi {blog.author.username},\n\n'
                    f'An editor has reviewed your submission and requested changes.\n\n'
                    f'Note from editor:\n{note_text}\n\n'
                    f'Please revise and resubmit.'
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[blog.author.email],
                fail_silently=True,
            )

        return Response({'message': f'"{blog.title}" has been returned to draft.'})


class RecallSubmissionView(APIView):
    """
    POST /newsroom/blogs/<slug>/recall/
    Author brings a pending submission back to draft status to edit it.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, slug):
        try:
            blog = Blog.objects.get(slug=slug, author=request.user, status=BlogStatus.PENDING)
        except Blog.DoesNotExist:
            return Response(
                {'error': 'Pending blog not found or you are not the author.'}, 
                status=status.HTTP_404_NOT_FOUND
            )

        blog.status = BlogStatus.DRAFT
        blog.save(update_fields=['status'])

        # UNLOCK: author recalled their post, restore their edit rights.
        assign_perm('blog.change_blog', request.user, blog)

        # Mark the submission notification as read
        SubmissionNotification.objects.filter(blog=blog, is_read=False).update(is_read=True)

        return Response({'message': 'Submission recalled. You can now edit the draft.'})
