"""
Tests for the `engagement` app.
Covers: threaded comments, comment likes (idempotent), newsletter subscribe/unsubscribe,
        polls with vote deduplication, expired polls, and invalid options.
"""
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from unittest.mock import patch
from rest_framework.test import APITestCase
from engagement.models import (
    Comment, CommentLike, NewsletterSubscriber, Poll, PollOption, PollVote
)
from tests import create_user, get_token, create_blog


# ─── Threaded Comments ───────────────────────────────────────────────────────

class CommentListTests(APITestCase):

    def setUp(self):
        self.author = create_user('cmt_author')
        self.blog = create_blog(self.author, title='Comment Blog', status='published')
        # Top-level approved comment
        self.top = Comment.objects.create(
            blog=self.blog, author_name='Alice', content='Great read!', is_approved=True
        )
        # Reply to the top-level comment
        self.reply = Comment.objects.create(
            blog=self.blog, parent=self.top, author_name='Bob', content='Agree!', is_approved=True
        )
        # Hidden comment
        self.hidden = Comment.objects.create(
            blog=self.blog, author_name='Spam', content='Buy stuff', is_approved=False
        )

    def test_list_returns_only_approved_top_level_comments(self):
        r = self.client.get(f'/comments/?blog_id={self.blog.id}')
        self.assertEqual(r.status_code, 200)
        authors = [c['author_name'] for c in r.data['results']]
        self.assertIn('Alice', authors)
        self.assertNotIn('Spam', authors)

    def test_replies_nested_inside_parent(self):
        r = self.client.get(f'/comments/?blog_id={self.blog.id}')
        alice = next(c for c in r.data['results'] if c['author_name'] == 'Alice')
        self.assertEqual(len(alice['replies']), 1)
        self.assertEqual(alice['replies'][0]['author_name'], 'Bob')

    def test_list_without_blog_id_returns_all_top_level(self):
        r = self.client.get('/comments/')
        self.assertEqual(r.status_code, 200)
        self.assertGreaterEqual(r.data['count'], 1)

    def test_filter_by_blog_id_isolates_comments(self):
        """Comments from a different blog should not appear."""
        other_blog = create_blog(self.author, title='Other Blog', status='published')
        Comment.objects.create(blog=other_blog, author_name='Carol', content='Hi', is_approved=True)
        r = self.client.get(f'/comments/?blog_id={self.blog.id}')
        authors = [c['author_name'] for c in r.data['results']]
        self.assertNotIn('Carol', authors)


class CommentCreateTests(APITestCase):

    def setUp(self):
        self.author = create_user('cmt_create_author')
        self.blog = create_blog(self.author, title='Post with Comments', status='published')

    def test_create_top_level_comment_anonymously(self):
        r = self.client.post('/comments/', {
            'blog': self.blog.id,
            'author_name': 'Anonymous Reader',
            'content': 'Interesting perspective!',
        }, format='json')
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data['author_name'], 'Anonymous Reader')
        self.assertEqual(r.data['content'], 'Interesting perspective!')
        self.assertIsNone(r.data['parent'])

    def test_create_reply_to_existing_comment(self):
        parent = Comment.objects.create(blog=self.blog, author_name='Parent', content='First', is_approved=True)
        r = self.client.post('/comments/', {
            'blog': self.blog.id,
            'parent': parent.id,
            'author_name': 'Child',
            'content': 'Reply!',
        }, format='json')
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data['parent'], parent.id)

    def test_authenticated_comment_links_user_account(self):
        user = create_user('commentuser')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(user)}')
        r = self.client.post('/comments/', {
            'blog': self.blog.id,
            'author_name': 'Custom Name',  # Should be overridden by username
            'content': 'Logged in comment',
        }, format='json')
        self.assertEqual(r.status_code, 201)
        # Author name should be replaced with the user's username
        self.assertEqual(r.data['author_name'], 'commentuser')

    def test_create_comment_with_empty_content_fails(self):
        r = self.client.post('/comments/', {
            'blog': self.blog.id,
            'author_name': 'Reader',
            'content': '',
        }, format='json')
        self.assertEqual(r.status_code, 400)

    def test_create_comment_without_blog_id_fails(self):
        r = self.client.post('/comments/', {
            'author_name': 'Reader',
            'content': 'No blog attached',
        }, format='json')
        self.assertEqual(r.status_code, 400)


class CommentLikeTests(APITestCase):

    def setUp(self):
        self.author = create_user('like_author')
        self.blog = create_blog(self.author, title='Likeable Post', status='published')
        self.comment = Comment.objects.create(
            blog=self.blog, author_name='Writer', content='Like me!', is_approved=True
        )

    def test_like_comment_returns_liked_true_and_increments_count(self):
        r = self.client.post(f'/comments/{self.comment.id}/like/')
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data['liked'])
        self.assertEqual(r.data['like_count'], 1)

    def test_like_then_like_again_toggles_to_unlike(self):
        """Second call from same IP should remove the like."""
        self.client.post(f'/comments/{self.comment.id}/like/')
        r = self.client.post(f'/comments/{self.comment.id}/like/')
        self.assertEqual(r.status_code, 200)
        self.assertFalse(r.data['liked'])
        self.assertEqual(r.data['like_count'], 0)

    def test_like_persists_in_database(self):
        self.client.post(f'/comments/{self.comment.id}/like/')
        self.comment.refresh_from_db()
        self.assertEqual(self.comment.like_count, 1)
        self.assertEqual(CommentLike.objects.filter(comment=self.comment).count(), 1)

    def test_like_nonexistent_comment_returns_404(self):
        r = self.client.post('/comments/99999/like/')
        self.assertEqual(r.status_code, 404)


# ─── Newsletter ───────────────────────────────────────────────────────────────

class NewsletterSubscribeTests(APITestCase):

    def test_subscribe_new_email_returns_201(self):
        r = self.client.post('/newsletter/subscribe/', {'email': 'new@reader.com'}, format='json')
        self.assertEqual(r.status_code, 201)
        self.assertIn('Successfully subscribed', r.data['message'])
        self.assertTrue(NewsletterSubscriber.objects.filter(email='new@reader.com').exists())

    def test_subscribe_saves_lowercase_email(self):
        self.client.post('/newsletter/subscribe/', {'email': 'UPPER@Reader.COM'}, format='json')
        self.assertTrue(NewsletterSubscriber.objects.filter(email='upper@reader.com').exists())

    def test_resubscribe_previously_unsubscribed_email_reactivates(self):
        NewsletterSubscriber.objects.create(email='come@back.com', is_active=False)
        r = self.client.post('/newsletter/subscribe/', {'email': 'come@back.com'}, format='json')
        sub = NewsletterSubscriber.objects.get(email='come@back.com')
        self.assertTrue(sub.is_active)

    def test_subscribe_already_active_email_returns_message(self):
        NewsletterSubscriber.objects.create(email='already@active.com', is_active=True)
        r = self.client.post('/newsletter/subscribe/', {'email': 'already@active.com'}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertIn('already subscribed', r.data['message'])

    def test_subscribe_invalid_email_returns_400(self):
        r = self.client.post('/newsletter/subscribe/', {'email': 'notanemail'}, format='json')
        self.assertEqual(r.status_code, 400)

    def test_subscribe_missing_email_returns_400(self):
        r = self.client.post('/newsletter/subscribe/', {}, format='json')
        self.assertEqual(r.status_code, 400)


class NewsletterUnsubscribeTests(APITestCase):

    def setUp(self):
        self.subscriber = NewsletterSubscriber.objects.create(
            email='unsub@test.com', is_active=True
        )
        self.token = self.subscriber.unsubscribe_token(settings.NEWSLETTER_SECRET)

    def test_valid_token_unsubscribes_email(self):
        r = self.client.get(f'/newsletter/unsubscribe/?email=unsub@test.com&token={self.token}')
        self.assertEqual(r.status_code, 200)
        self.assertIn('unsubscribed', r.data['message'])
        self.subscriber.refresh_from_db()
        self.assertFalse(self.subscriber.is_active)

    def test_wrong_token_returns_403(self):
        r = self.client.get('/newsletter/unsubscribe/?email=unsub@test.com&token=wrongtoken')
        self.assertEqual(r.status_code, 403)
        self.subscriber.refresh_from_db()
        self.assertTrue(self.subscriber.is_active)  # Still subscribed

    def test_nonexistent_email_returns_404(self):
        r = self.client.get(f'/newsletter/unsubscribe/?email=ghost@test.com&token={self.token}')
        self.assertEqual(r.status_code, 404)

    def test_missing_parameters_returns_400(self):
        r = self.client.get('/newsletter/unsubscribe/')
        self.assertEqual(r.status_code, 400)

    def test_missing_token_returns_400(self):
        r = self.client.get('/newsletter/unsubscribe/?email=unsub@test.com')
        self.assertEqual(r.status_code, 400)


# ─── Polls ────────────────────────────────────────────────────────────────────

class PollListTests(APITestCase):

    def setUp(self):
        self.active_poll = Poll.objects.create(question='Favorite language?', is_active=True)
        PollOption.objects.create(poll=self.active_poll, text='Python')
        PollOption.objects.create(poll=self.active_poll, text='JavaScript')
        self.inactive_poll = Poll.objects.create(question='Old poll?', is_active=False)

    def test_active_polls_returns_open_polls_with_options(self):
        r = self.client.get('/polls/active/')
        self.assertEqual(r.status_code, 200)
        self.assertGreaterEqual(r.data['count'], 1)
        poll = r.data['results'][0]
        self.assertEqual(poll['question'], 'Favorite language?')
        self.assertEqual(len(poll['options']), 2)

    def test_inactive_poll_not_returned(self):
        r = self.client.get('/polls/active/')
        questions = [p['question'] for p in r.data['results']]
        self.assertNotIn('Old poll?', questions)

    def test_poll_includes_total_votes_and_percentages(self):
        r = self.client.get('/polls/active/')
        poll = r.data['results'][0]
        self.assertIn('total_votes', poll)
        self.assertIn('percentage', poll['options'][0])


class PollVoteTests(APITestCase):

    def setUp(self):
        self.poll = Poll.objects.create(question='Best framework?', is_active=True)
        self.opt_django = PollOption.objects.create(poll=self.poll, text='Django')
        self.opt_flask = PollOption.objects.create(poll=self.poll, text='Flask')

    def test_vote_on_valid_option_returns_updated_poll(self):
        r = self.client.post(f'/polls/{self.poll.id}/vote/', {'option_id': self.opt_django.id}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['question'], 'Best framework?')
        # The voted option should have 1 vote
        django_opt = next(o for o in r.data['options'] if o['text'] == 'Django')
        self.assertEqual(django_opt['vote_count'], 1)
        self.assertEqual(django_opt['percentage'], 100.0)

    def test_vote_persists_in_database(self):
        self.client.post(f'/polls/{self.poll.id}/vote/', {'option_id': self.opt_django.id}, format='json')
        self.opt_django.refresh_from_db()
        self.assertEqual(self.opt_django.vote_count, 1)
        self.assertTrue(PollVote.objects.filter(poll=self.poll, option=self.opt_django).exists())

    def test_vote_calculates_percentage_correctly(self):
        """Two votes total: 1 for Django (50%), 1 for Flask (50%)."""
        PollVote.objects.create(poll=self.poll, option=self.opt_django, ip='1.1.1.1')
        self.opt_django.vote_count = 1
        self.opt_django.save()
        r = self.client.post(f'/polls/{self.poll.id}/vote/', {'option_id': self.opt_flask.id}, format='json')
        self.assertEqual(r.status_code, 200)
        django_opt = next(o for o in r.data['options'] if o['text'] == 'Django')
        flask_opt = next(o for o in r.data['options'] if o['text'] == 'Flask')
        self.assertEqual(django_opt['percentage'], 50.0)
        self.assertEqual(flask_opt['percentage'], 50.0)

    def test_duplicate_vote_same_ip_returns_400(self):
        """Same IP cannot vote on the same poll twice."""
        self.client.post(f'/polls/{self.poll.id}/vote/', {'option_id': self.opt_django.id}, format='json')
        r = self.client.post(f'/polls/{self.poll.id}/vote/', {'option_id': self.opt_flask.id}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('already voted', r.data['error'])

    def test_vote_on_nonexistent_option_returns_400(self):
        r = self.client.post(f'/polls/{self.poll.id}/vote/', {'option_id': 99999}, format='json')
        self.assertEqual(r.status_code, 400)

    def test_vote_on_nonexistent_poll_returns_404(self):
        r = self.client.post('/polls/99999/vote/', {'option_id': self.opt_django.id}, format='json')
        self.assertEqual(r.status_code, 404)

    def test_vote_on_inactive_poll_returns_404(self):
        self.poll.is_active = False
        self.poll.save()
        r = self.client.post(f'/polls/{self.poll.id}/vote/', {'option_id': self.opt_django.id}, format='json')
        self.assertEqual(r.status_code, 404)

    def test_vote_on_expired_poll_returns_400(self):
        self.poll.expires_at = timezone.now() - timedelta(hours=1)
        self.poll.save()
        r = self.client.post(f'/polls/{self.poll.id}/vote/', {'option_id': self.opt_django.id}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('expired', r.data['error'])
