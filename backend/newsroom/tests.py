"""
Tests for the `newsroom` app.
Covers: submission workflow (submit, inbox, publish, schedule, reject),
        RBAC enforcement, editorial notes, and email notifications.
"""
from unittest.mock import patch
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APITestCase
from blog.models import Blog, BlogStatus
from newsroom.models import SubmissionNotification, EditorialNote
from tests import create_user, get_token, create_blog


# ─── Submit for Review ────────────────────────────────────────────────────────

class SubmitForReviewTests(APITestCase):

    def setUp(self):
        self.contributor = create_user('sub_contrib')
        self.editor = create_user('sub_editor', role='editor')
        self.other = create_user('sub_other')
        self.draft = create_blog(self.contributor, title='My Draft', status=BlogStatus.DRAFT)

    @patch('newsroom.views.send_mail')
    def test_contributor_submits_own_draft_changes_status_to_pending(self, mock_mail):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(self.contributor)}')
        r = self.client.post(f'/newsroom/blogs/{self.draft.slug}/submit/')
        self.assertEqual(r.status_code, 201)
        self.draft.refresh_from_db()
        self.assertEqual(self.draft.status, BlogStatus.PENDING)

    @patch('newsroom.views.send_mail')
    def test_submit_creates_notification_record(self, mock_mail):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(self.contributor)}')
        self.client.post(f'/newsroom/blogs/{self.draft.slug}/submit/')
        self.assertTrue(
            SubmissionNotification.objects.filter(blog=self.draft, submitted_by=self.contributor).exists()
        )

    @patch('newsroom.views.send_mail')
    def test_submit_sends_email_to_editors(self, mock_mail):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(self.contributor)}')
        self.client.post(f'/newsroom/blogs/{self.draft.slug}/submit/')
        mock_mail.assert_called_once()
        call_args = mock_mail.call_args
        self.assertIn('My Draft', call_args[1]['subject'])

    def test_contributor_cannot_submit_another_authors_blog(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(self.other)}')
        r = self.client.post(f'/newsroom/blogs/{self.draft.slug}/submit/')
        self.assertEqual(r.status_code, 404)
        self.draft.refresh_from_db()
        self.assertEqual(self.draft.status, BlogStatus.DRAFT)  # Unchanged

    @patch('newsroom.views.send_mail')
    def test_cannot_submit_already_published_blog(self, mock_mail):
        published = create_blog(self.contributor, title='Already Live', status=BlogStatus.PUBLISHED)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(self.contributor)}')
        r = self.client.post(f'/newsroom/blogs/{published.slug}/submit/')
        self.assertEqual(r.status_code, 400)
        self.assertIn('already published', r.data['error'])

    def test_unauthenticated_submit_returns_401(self):
        r = self.client.post(f'/newsroom/blogs/{self.draft.slug}/submit/')
        self.assertEqual(r.status_code, 401)


# ─── Editor Inbox ─────────────────────────────────────────────────────────────

class EditorInboxTests(APITestCase):

    def setUp(self):
        self.editor = create_user('inbox_editor', role='editor')
        self.contributor = create_user('inbox_contrib')
        self.blog = create_blog(self.contributor, title='Pending Blog', status=BlogStatus.PENDING)
        self.notification = SubmissionNotification.objects.create(
            blog=self.blog,
            submitted_by=self.contributor,
            message='Please review',
            is_read=False,
        )

    def test_editor_sees_pending_submissions(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(self.editor)}')
        r = self.client.get('/newsroom/inbox/')
        self.assertEqual(r.status_code, 200)
        self.assertGreaterEqual(r.data['count'], 1)
        result = r.data['results'][0]
        self.assertEqual(result['blog']['title'], 'Pending Blog')
        self.assertEqual(result['submitted_by']['username'], 'inbox_contrib')

    def test_inbox_retains_submissions_even_after_read(self):
        """Unlike before, viewing the inbox should not make submissions disappear if they are still pending."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(self.editor)}')
        # First visit
        self.client.get('/newsroom/inbox/')
        self.notification.refresh_from_db()
        self.assertTrue(self.notification.is_read)
        
        # Second visit - should still be there because blog.status is still BlogStatus.PENDING
        r = self.client.get('/newsroom/inbox/')
        self.assertGreaterEqual(r.data['count'], 1)
        self.assertEqual(r.data['results'][0]['blog']['title'], 'Pending Blog')

    def test_viewing_inbox_marks_notifications_as_read(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(self.editor)}')
        self.client.get('/newsroom/inbox/')
        self.notification.refresh_from_db()
        self.assertTrue(self.notification.is_read)

    def test_all_flag_returns_read_and_unread(self):
        self.notification.is_read = True
        self.notification.save()
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(self.editor)}')
        r = self.client.get('/newsroom/inbox/?all=true')
        self.assertEqual(r.status_code, 200)
        self.assertGreaterEqual(r.data['count'], 1)

    def test_contributor_cannot_access_inbox(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(self.contributor)}')
        r = self.client.get('/newsroom/inbox/')
        self.assertEqual(r.status_code, 403)

    def test_unauthenticated_cannot_access_inbox(self):
        r = self.client.get('/newsroom/inbox/')
        self.assertEqual(r.status_code, 401)


# ─── Publish Blog ─────────────────────────────────────────────────────────────

class PublishBlogTests(APITestCase):

    def setUp(self):
        self.editor = create_user('pub_editor', role='editor')
        self.contributor = create_user('pub_contrib')
        self.pending = create_blog(self.contributor, title='Ready to Publish', status=BlogStatus.PENDING)

    @patch('newsroom.views.send_mail')
    def test_editor_publishes_pending_blog_immediately(self, mock_mail):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(self.editor)}')
        r = self.client.post(f'/newsroom/blogs/{self.pending.slug}/publish/')
        self.assertEqual(r.status_code, 200)
        self.assertIn(BlogStatus.PUBLISHED, r.data['message'])
        self.pending.refresh_from_db()
        self.assertEqual(self.pending.status, BlogStatus.PUBLISHED)
        self.assertIsNotNone(self.pending.published_at)

    @patch('newsroom.views.send_mail')
    def test_publish_featured_blog_emails_newsletter_subscribers(self, mock_mail):
        from engagement.models import NewsletterSubscriber
        NewsletterSubscriber.objects.create(email='fan@test.com', is_active=True)
        self.pending.featured = True
        self.pending.save()
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(self.editor)}')
        self.client.post(f'/newsroom/blogs/{self.pending.slug}/publish/')
        # send_mail should be called once for the newsletter
        mock_mail.assert_called_once()
        call_args = mock_mail.call_args
        self.assertIn('fan@test.com', call_args[1]['recipient_list'])

    @patch('newsroom.views.send_mail')
    def test_schedule_future_publish_keeps_status_pending(self, mock_mail):
        future = (timezone.now() + timedelta(days=1)).isoformat()
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(self.editor)}')
        r = self.client.post(
            f'/newsroom/blogs/{self.pending.slug}/publish/',
            {'published_at': future},
            format='json'
        )
        self.assertEqual(r.status_code, 200)
        self.assertIn('Scheduled', r.data['message'])
        self.pending.refresh_from_db()
        self.assertEqual(self.pending.status, BlogStatus.PENDING)

    def test_contributor_cannot_publish(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(self.contributor)}')
        r = self.client.post(f'/newsroom/blogs/{self.pending.slug}/publish/')
        self.assertEqual(r.status_code, 403)

    @patch('newsroom.views.send_mail')
    def test_publish_invalid_datetime_returns_400(self, mock_mail):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(self.editor)}')
        r = self.client.post(
            f'/newsroom/blogs/{self.pending.slug}/publish/',
            {'published_at': 'not-a-date'},
            format='json'
        )
        self.assertEqual(r.status_code, 400)

    def test_publish_nonexistent_blog_returns_404(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(self.editor)}')
        r = self.client.post('/newsroom/blogs/no-such-slug/publish/')
        self.assertEqual(r.status_code, 404)


# ─── Reject Blog ──────────────────────────────────────────────────────────────

class RejectBlogTests(APITestCase):

    def setUp(self):
        self.editor = create_user('rej_editor', role='editor')
        self.contributor = create_user('rej_contrib')
        self.pending = create_blog(self.contributor, title='Needs Work', status=BlogStatus.PENDING)
        self.notification = SubmissionNotification.objects.create(
            blog=self.pending,
            submitted_by=self.contributor,
            message='Review this',
        )

    @patch('newsroom.views.send_mail')
    def test_editor_rejects_blog_returns_to_draft(self, mock_mail):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(self.editor)}')
        r = self.client.post(
            f'/newsroom/blogs/{self.pending.slug}/reject/',
            {'note': 'Needs more depth in section 2.'},
            format='json'
        )
        self.assertEqual(r.status_code, 200)
        self.assertIn(BlogStatus.DRAFT, r.data['message'])
        self.pending.refresh_from_db()
        self.assertEqual(self.pending.status, BlogStatus.DRAFT)

    @patch('newsroom.views.send_mail')
    def test_reject_creates_editorial_note(self, mock_mail):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(self.editor)}')
        self.client.post(
            f'/newsroom/blogs/{self.pending.slug}/reject/',
            {'note': 'Please revise the intro.'},
            format='json'
        )
        note = EditorialNote.objects.filter(notification=self.notification).first()
        self.assertIsNotNone(note)
        self.assertEqual(note.note, 'Please revise the intro.')
        self.assertEqual(note.editor, self.editor)

    @patch('newsroom.views.send_mail')
    def test_reject_emails_the_author(self, mock_mail):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(self.editor)}')
        self.client.post(
            f'/newsroom/blogs/{self.pending.slug}/reject/',
            {'note': 'Needs work.'},
            format='json'
        )
        mock_mail.assert_called_once()
        call_args = mock_mail.call_args
        self.assertIn(self.contributor.email, call_args[1]['recipient_list'])
        self.assertIn('Needs work.', call_args[1]['message'])

    def test_contributor_cannot_reject_blogs(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(self.contributor)}')
        r = self.client.post(f'/newsroom/blogs/{self.pending.slug}/reject/', {'note': 'nope'}, format='json')
        self.assertEqual(r.status_code, 403)
        self.pending.refresh_from_db()
        self.assertEqual(self.pending.status, BlogStatus.PENDING)  # Unchanged

    def test_reject_nonexistent_blog_returns_404(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(self.editor)}')
        r = self.client.post('/newsroom/blogs/no-such-post/reject/', {'note': 'nope'}, format='json')
        self.assertEqual(r.status_code, 404)


# ─── Full Submission Workflow (End-to-End) ────────────────────────────────────

class FullWorkflowTests(APITestCase):
    """
    Verifies the complete state machine: draft → pending → published / draft.
    """

    def setUp(self):
        self.contributor = create_user('wf_contrib')
        self.editor = create_user('wf_editor', role='editor')

    @patch('newsroom.views.send_mail')
    def test_full_publish_workflow(self, mock_mail):
        # 1. Contributor creates a draft
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(self.contributor)}')
        r = self.client.post('/blogs/', {
            'title': 'Full Workflow Article',
            'content': '<p>Great content</p>',
        }, format='json')
        self.assertEqual(r.status_code, 201)
        slug = r.data['slug']
        self.assertEqual(r.data['status'], BlogStatus.DRAFT)

        # 2. Contributor submits for review
        r = self.client.post(f'/newsroom/blogs/{slug}/submit/')
        self.assertEqual(r.status_code, 201)
        self.assertEqual(Blog.objects.get(slug=slug).status, BlogStatus.PENDING)

        # 3. Editor publishes
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(self.editor)}')
        r = self.client.post(f'/newsroom/blogs/{slug}/publish/')
        self.assertEqual(r.status_code, 200)
        blog = Blog.objects.get(slug=slug)
        self.assertEqual(blog.status, BlogStatus.PUBLISHED)
        self.assertIsNotNone(blog.published_at)

        # 4. Blog is now publicly visible
        self.client.credentials()  # clear auth
        r = self.client.get(f'/blogs/{slug}/')
        self.assertEqual(r.status_code, 200)

    @patch('newsroom.views.send_mail')
    def test_full_reject_workflow(self, mock_mail):
        # 1. Create draft and submit
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(self.contributor)}')
        r = self.client.post('/blogs/', {
            'title': 'Needs Revision',
            'content': '<p>Rough draft</p>',
        }, format='json')
        slug = r.data['slug']
        self.client.post(f'/newsroom/blogs/{slug}/submit/')
        self.assertEqual(Blog.objects.get(slug=slug).status, BlogStatus.PENDING)

        # 2. Editor rejects
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(self.editor)}')
        r = self.client.post(f'/newsroom/blogs/{slug}/reject/', {'note': 'Expand section 1.'}, format='json')
        self.assertEqual(r.status_code, 200)
        blog = Blog.objects.get(slug=slug)
        self.assertEqual(blog.status, BlogStatus.DRAFT)

        # 3. Blog is not publicly visible
        self.client.credentials()
        r = self.client.get(f'/blogs/{slug}/')
        self.assertEqual(r.status_code, 404)

    def test_recall_submission_workflow(self):
        # 1. Contributor submits
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(self.contributor)}')
        r = self.client.post('/blogs/', {'title': 'To Recall', 'content': '...'}, format='json')
        slug = r.data['slug']
        self.client.post(f'/newsroom/blogs/{slug}/submit/')
        
        # 2. Contributor recalls
        r = self.client.post(f'/newsroom/blogs/{slug}/recall/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(Blog.objects.get(slug=slug).status, BlogStatus.DRAFT)
        
        # 3. Other user cannot recall
        self.client.post(f'/newsroom/blogs/{slug}/submit/')
        other = create_user('other_recall')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(other)}')
        r = self.client.post(f'/newsroom/blogs/{slug}/recall/')
        self.assertEqual(r.status_code, 404)


# ─── Guardian: Reject Restores Author Permission ──────────────────────────────

class GuardianRejectPermissionTests(APITestCase):
    """
    Verifies that when an editor rejects a submission, the author's
    Guardian change_blog permission is restored so they can revise and resubmit.
    """

    def setUp(self):
        self.contributor = create_user('grej_contrib')
        self.editor = create_user('grej_editor', role='editor')
        self.draft = create_blog(self.contributor, title='Reject Perm Post', status=BlogStatus.DRAFT)

    @patch('newsroom.views.send_mail')
    def test_reject_restores_change_perm_to_author(self, mock_mail):
        from guardian.shortcuts import get_perms, assign_perm

        # Assign the perm (simulating perform_create)
        assign_perm('blog.change_blog', self.contributor, self.draft)

        # Submit — removes change_blog
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(self.contributor)}')
        self.client.post(f'/newsroom/blogs/{self.draft.slug}/submit/')
        perms_after_submit = get_perms(self.contributor, self.draft)
        self.assertNotIn('change_blog', perms_after_submit)

        # Editor rejects — should restore change_blog
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(self.editor)}')
        r = self.client.post(
            f'/newsroom/blogs/{self.draft.slug}/reject/',
            {'note': 'Needs more detail.'},
            format='json'
        )
        self.assertEqual(r.status_code, 200)

        perms_after_reject = get_perms(self.contributor, self.draft)
        self.assertIn('change_blog', perms_after_reject, 'Author SHOULD have change_blog after editor rejection')
