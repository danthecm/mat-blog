from django.urls import path
from .views import (
    SubmitForReviewView,
    EditorInboxView,
    PublishBlogView,
    RejectBlogView,
    RecallSubmissionView,
)

urlpatterns = [
    path('newsroom/inbox/', EditorInboxView.as_view(), name='newsroom-inbox'),
    path('newsroom/blogs/<slug:slug>/submit/', SubmitForReviewView.as_view(), name='newsroom-submit'),
    path('newsroom/blogs/<slug:slug>/publish/', PublishBlogView.as_view(), name='newsroom-publish'),
    path('newsroom/blogs/<slug:slug>/reject/', RejectBlogView.as_view(), name='newsroom-reject'),
    path('newsroom/blogs/<slug:slug>/recall/', RecallSubmissionView.as_view(), name='newsroom-recall'),
]
