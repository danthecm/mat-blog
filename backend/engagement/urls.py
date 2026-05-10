from django.urls import path
from .views import (
    CommentListCreateView,
    CommentLikeView,
    NewsletterSubscribeView,
    NewsletterUnsubscribeView,
    ActivePollView,
    PollVoteView,
    PollDetailView,
)

urlpatterns = [
    # ── Comments ─────────────────────────────────────────────────────────────
    path('comments/', CommentListCreateView.as_view(), name='comment-list-create'),
    path('comments/<int:pk>/like/', CommentLikeView.as_view(), name='comment-like'),

    # ── Newsletter ────────────────────────────────────────────────────────────
    path('newsletter/subscribe/', NewsletterSubscribeView.as_view(), name='newsletter-subscribe'),
    path('newsletter/unsubscribe/', NewsletterUnsubscribeView.as_view(), name='newsletter-unsubscribe'),

    # ── Polls ─────────────────────────────────────────────────────────────────
    path('polls/active/', ActivePollView.as_view(), name='polls-active'),
    path('polls/<int:poll_id>/', PollDetailView.as_view(), name='poll-detail'),
    path('polls/<int:poll_id>/vote/', PollVoteView.as_view(), name='poll-vote'),
]
