from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    BlogViewSet, BlogCategoryViewSet, BlogTagViewSet, BlogCommentViewSet,
    FeaturedBlogView, TopBlogView, TrendingBlogView, SearchView,
    SimilarBlogsView, OGImageView,
)

router = DefaultRouter()
router.register('blogs', BlogViewSet, basename='blogs')
router.register('blog-categories', BlogCategoryViewSet, basename='blog-categories')
router.register('blog-tags', BlogTagViewSet, basename='blog-tags')
router.register('blog-comments', BlogCommentViewSet, basename='blog-comments')

urlpatterns = [
    # ── Discovery ────────────────────────────────────────────────────────────
    path('featured-blogs/', FeaturedBlogView.as_view(), name='featured-blogs'),
    path('top-blogs/', TopBlogView.as_view(), name='top-blogs'),
    path('blogs/trending/', TrendingBlogView.as_view(), name='trending-blogs'),
    path('search/', SearchView.as_view(), name='search'),

    # ── Per-blog extras ──────────────────────────────────────────────────────
    path('similar-blogs/<int:blog_id>/', SimilarBlogsView.as_view(), name='similar-blogs'),
    path('blogs/<slug:slug>/og-image/', OGImageView.as_view(), name='blog-og-image'),

    path('', include(router.urls)),
]
