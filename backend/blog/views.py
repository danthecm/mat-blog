import io
import re
import textwrap
from django.http import HttpResponse
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.db.models import Count, Q, F, Sum, Count as DCount
from rest_framework import status
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import action
from PIL import Image, ImageDraw, ImageFont
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter, OpenApiResponse
from drf_spectacular.types import OpenApiTypes
from guardian.shortcuts import assign_perm, remove_perm

from .models import Blog, BlogCategory, BlogTag, BlogComment, BlogView as BlogViewModel, BlogStatus
from .serializer import (
    BlogSerializer, BlogListSerializer, BlogCategorySerializer,
    BlogTagSerializer, BlogCommentSerializer,
)
from .permissions import IsEditorOrHigher, IsAuthorOrEditorOrReadOnly, IsApprovedContributor, IsAdminRole
from .roles import is_admin, is_editor

# These are imported here to avoid circular dependencies if needed, 
# but usually views are safe to import at the top level.
from engagement.models import BlogLike, Comment


def get_client_ip(request):
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded:
        return x_forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '0.0.0.0')


class BlogPagination(PageNumberPagination):
    page_size = 6
    page_size_query_param = 'page_size'
    max_page_size = 50


# ─── Blog CRUD ────────────────────────────────────────────────────────────────

@extend_schema_view(
    list=extend_schema(
        tags=['blogs'],
        summary='List blog posts',
        description='Returns published posts. Editors/admins see all statuses. Filter by `?status=`, `?featured=true`, `?category__slug=`, `?tags__slug=`. Search with `?search=`.',
        parameters=[
            OpenApiParameter('search', OpenApiTypes.STR, description='Search title, content, author, tags'),
            OpenApiParameter('status', OpenApiTypes.STR, description='Filter by status: draft | pending | published'),
            OpenApiParameter('featured', OpenApiTypes.BOOL, description='Filter featured posts'),
            OpenApiParameter('category__slug', OpenApiTypes.STR, description='Filter by category slug'),
            OpenApiParameter('tags__slug', OpenApiTypes.STR, description='Filter by tag slug'),
        ],
    ),
    retrieve=extend_schema(
        tags=['blogs'],
        summary='Get a single blog post (also increments view count)',
    ),
    create=extend_schema(
        tags=['blogs'],
        summary='Create a new blog post (contributor+, JWT required)',
    ),
    update=extend_schema(tags=['blogs'], summary='Replace a blog post (author/editor/admin)'),
    partial_update=extend_schema(tags=['blogs'], summary='Partially update a blog post'),
    destroy=extend_schema(tags=['blogs'], summary='Delete a blog post (author/editor/admin)'),
)
class BlogViewSet(ModelViewSet):
    """
    Full CRUD for Blog posts.
    - list/retrieve: public (only published by default, unless ?status=all for editors)
    - create: authenticated approved contributors
    - update/destroy: author, editor, or admin
    """
    queryset = Blog.objects.select_related('author', 'author__profile', 'category').prefetch_related('tags')
    serializer_class = BlogSerializer
    pagination_class = BlogPagination
    lookup_field = 'slug'
    permission_classes = [IsAuthorOrEditorOrReadOnly, IsApprovedContributor]
    search_fields = ['title', 'content', 'author__username', 'tags__title']
    filterset_fields = ['status', 'featured', 'category__slug', 'tags__slug', 'author', 'author__username']
    ordering_fields = ['created_at', 'view_count', 'published_at']

    def get_queryset(self):
        qs = super().get_queryset()

        # Trash-specific actions need soft-deleted posts; all others exclude them
        if self.action not in ('trash', 'restore', 'permanent_delete'):
            qs = qs.filter(is_deleted=False)

        user = self.request.user

        if user.is_authenticated:
            if is_admin(user):
                # Admins see everything (scoping done per-action)
                # However, for the main LIST view (homepage), default to published unless status is requested
                if self.action == 'list' and not self.request.query_params.get('status'):
                    return qs.filter(status=BlogStatus.PUBLISHED).filter(
                        Q(published_at__lte=timezone.now()) | Q(published_at__isnull=True)
                    )
                return qs

            if is_editor(user):
                # Editors see all published, all pending, and their own drafts
                # For main LIST, default to published
                if self.action == 'list' and not self.request.query_params.get('status'):
                    return qs.filter(status=BlogStatus.PUBLISHED).filter(
                        Q(published_at__lte=timezone.now()) | Q(published_at__isnull=True)
                    )
                return qs.filter(
                    Q(status=BlogStatus.PUBLISHED) |
                    Q(status=BlogStatus.PENDING) |
                    Q(author=user, status=BlogStatus.DRAFT)
                )

            # Contributors: all published (and past date) + their own posts
            # For main LIST, default to published
            if self.action == 'list' and not self.request.query_params.get('status'):
                return qs.filter(status=BlogStatus.PUBLISHED).filter(
                    Q(published_at__lte=timezone.now()) | Q(published_at__isnull=True)
                )
            
            return qs.filter(
                (Q(status=BlogStatus.PUBLISHED) & (Q(published_at__lte=timezone.now()) | Q(published_at__isnull=True))) | 
                Q(author=user)
            )

        # Anonymous: published only
        return qs.filter(
            status=BlogStatus.PUBLISHED
        ).filter(
            Q(published_at__lte=timezone.now()) | Q(published_at__isnull=True)
        )

    def destroy(self, request, *args, **kwargs):
        """Soft delete: move post to trash."""
        instance = self.get_object()
        instance.is_deleted = True
        instance.save(update_fields=['is_deleted'])
        return Response({'message': 'Post moved to trash.'}, status=status.HTTP_200_OK)

    def perform_create(self, serializer):
        instance = serializer.save(author=self.request.user)
        # Grant author object-level permissions on their own post.
        # These can be revoked individually (e.g., remove change_blog on submit).
        assign_perm('blog.change_blog', self.request.user, instance)
        assign_perm('blog.delete_blog', self.request.user, instance)

    def perform_update(self, serializer):
        instance = serializer.save()
        
        # Defense in Depth: Revoke author's object-level permissions if NOT in draft.
        # This ensures that even if has_object_permission is bypassed, 
        # the author still has no underlying DB rights to the object.
        if instance.status != BlogStatus.DRAFT:
            remove_perm('blog.change_blog', instance.author, instance)
            # authors can usually keep delete_blog (for trash), but change_blog 
            # MUST be revoked during review/publication.

    def retrieve(self, request, *args, **kwargs):
        """Track view count on detail page."""
        instance = self.get_object()
        ip = get_client_ip(request)
        today = timezone.now().date()

        # Only count unique IP per day
        already_viewed = BlogViewModel.objects.filter(
            blog=instance, ip=ip,
            viewed_at__date=today
        ).exists()

        if not already_viewed:
            BlogViewModel.objects.create(blog=instance, ip=ip)
            Blog.objects.filter(pk=instance.pk).update(view_count=F('view_count') + 1)
            instance.view_count += 1

        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[AllowAny])
    def like(self, request, slug=None):
        """POST /blogs/<slug>/like/ - Toggle like on a blog post."""
        instance = self.get_object()
        ip = get_client_ip(request)
        user = request.user if request.user.is_authenticated else None
        
        # Check for existing like by user (priority) or ip (anonymous fallback)
        if user:
            existing_like = BlogLike.objects.filter(blog=instance, user=user).first()
        else:
            existing_like = BlogLike.objects.filter(blog=instance, ip=ip, user__isnull=True).first()

        if existing_like:
            existing_like.delete()
            Blog.objects.filter(pk=instance.pk).update(like_count=max(0, instance.like_count - 1))
            instance.like_count = max(0, instance.like_count - 1)
            return Response({'liked': False, 'like_count': instance.like_count})
        else:
            BlogLike.objects.create(blog=instance, ip=ip, user=user)
            Blog.objects.filter(pk=instance.pk).update(like_count=instance.like_count + 1)
            instance.like_count += 1
            return Response({'liked': True, 'like_count': instance.like_count})

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def drafts(self, request):
        """GET /blogs/drafts/ - Returns drafts (global for Admins, personal for others)."""
        qs = self.get_queryset()

        if is_admin(request.user):
            qs = qs.filter(status=BlogStatus.DRAFT)
        else:
            qs = qs.filter(author=request.user, status=BlogStatus.DRAFT)

        qs = self.filter_queryset(qs)
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def submissions(self, request):
        """GET /blogs/submissions/ - Returns pending submissions (global for Admins, personal for others)."""
        qs = self.get_queryset()

        if is_admin(request.user):
            qs = qs.filter(status=BlogStatus.PENDING)
        else:
            qs = qs.filter(author=request.user, status=BlogStatus.PENDING)

        qs = self.filter_queryset(qs)
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated, IsAdminRole])
    def all_published(self, request):
        """GET /blogs/all_published/ - Admin only: see all published posts for management."""
        qs = Blog.objects.filter(status=BlogStatus.PUBLISHED, is_deleted=False)
        qs = self.filter_queryset(qs)
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated, IsAdminRole])
    def trash(self, request):
        """GET /blogs/trash/ - Admin only: see all soft-deleted posts."""
        qs = Blog.objects.filter(is_deleted=True)
        qs = self.filter_queryset(qs)
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAdminRole])
    def restore(self, request, slug=None):
        """POST /blogs/<slug>/restore/ - Admin only: restore from trash."""
        instance = Blog.objects.get(slug=slug, is_deleted=True)
        instance.is_deleted = False
        instance.save(update_fields=['is_deleted'])
        return Response({'message': 'Post restored successfully.'})

    @action(detail=True, methods=['delete'], permission_classes=[IsAuthenticated, IsAdminRole])
    def permanent_delete(self, request, slug=None):
        """DELETE /blogs/<slug>/permanent_delete/ - Admin only: remove from DB and cascade comments."""
        instance = Blog.objects.get(slug=slug, is_deleted=True)
        instance.delete() # Physical deletion
        return Response({'message': 'Post permanently deleted.'}, status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def stats(self, request):
        """
        GET /blogs/stats/ — Dashboard statistics.
        - Admins: platform-wide stats. Add ?mine=true to scope to their own posts.
        - Editors/Contributors: always their own posts only.
        """
        mine_only = request.query_params.get('mine', 'false').lower() == 'true'
        _is_admin = is_admin(request.user)

        # Base queryset: non-deleted posts
        if _is_admin and not mine_only:
            base_qs = Blog.objects.filter(is_deleted=False)
            scope_label = 'platform'
        else:
            base_qs = Blog.objects.filter(author=request.user, is_deleted=False)
            scope_label = 'mine'

        # Aggregate counts per status + totals
        agg = base_qs.aggregate(
            total=DCount('id'),
            drafts=DCount('id', filter=Q(status=BlogStatus.DRAFT)),
            pending=DCount('id', filter=Q(status=BlogStatus.PENDING)),
            published=DCount('id', filter=Q(status=BlogStatus.PUBLISHED)),
            total_views=Sum('view_count'),
        )

        # Comment count across the scoped posts
        comment_count = Comment.objects.filter(
            blog__in=base_qs, is_approved=True
        ).count()

        # Top 5 posts by views within scope
        top_posts = (
            base_qs
            .filter(status=BlogStatus.PUBLISHED)
            .order_by('-view_count')
            .values('title', 'slug', 'view_count', 'author__username')[:5]
        )

        return Response({
            'scope': scope_label,
            'total_posts': agg['total'] or 0,
            'drafts': agg['drafts'] or 0,
            'pending': agg['pending'] or 0,
            'published': agg['published'] or 0,
            'total_views': agg['total_views'] or 0,
            'total_comments': comment_count,
            'top_posts': list(top_posts),
        })


# ─── Category ─────────────────────────────────────────────────────────────────

@extend_schema_view(
    list=extend_schema(tags=['categories'], summary='List all categories'),
    retrieve=extend_schema(tags=['categories'], summary='Get a category by slug'),
    create=extend_schema(tags=['categories'], summary='Create a category (auth required)'),
    update=extend_schema(tags=['categories'], summary='Replace a category'),
    partial_update=extend_schema(tags=['categories'], summary='Patch a category'),
    destroy=extend_schema(tags=['categories'], summary='Delete a category'),
)
class BlogCategoryViewSet(ModelViewSet):
    queryset = BlogCategory.objects.annotate(
        blog_count=Count('blogs', filter=Q(blogs__status=BlogStatus.PUBLISHED))
    ).order_by('name')
    serializer_class = BlogCategorySerializer
    lookup_field = 'slug'

    def get_permissions(self):
        """Read is public; write (create/update/delete) requires editor or admin."""
        if self.action in ('list', 'retrieve'):
            return [AllowAny()]
        return [IsEditorOrHigher()]


# ─── Tags ─────────────────────────────────────────────────────────────────────

@extend_schema_view(
    list=extend_schema(tags=['tags'], summary='List all tags'),
    retrieve=extend_schema(tags=['tags'], summary='Get a tag by slug'),
    create=extend_schema(tags=['tags'], summary='Create a tag (auth required)'),
    update=extend_schema(tags=['tags'], summary='Replace a tag'),
    partial_update=extend_schema(tags=['tags'], summary='Patch a tag'),
    destroy=extend_schema(tags=['tags'], summary='Delete a tag'),
)
class BlogTagViewSet(ModelViewSet):
    queryset = BlogTag.objects.all().order_by('title')
    serializer_class = BlogTagSerializer
    lookup_field = 'slug'
    permission_classes = [IsAuthenticatedOrReadOnly]


# ─── Comments (legacy — kept for backward compat) ─────────────────────────────

@extend_schema_view(
    list=extend_schema(
        tags=['comments'],
        summary='List legacy flat comments (filter by ?blog_id=)',
    ),
    create=extend_schema(tags=['comments'], summary='Post a legacy flat comment'),
    retrieve=extend_schema(tags=['comments'], summary='Get a comment'),
    update=extend_schema(tags=['comments'], summary='Replace a comment'),
    partial_update=extend_schema(tags=['comments'], summary='Patch a comment'),
    destroy=extend_schema(tags=['comments'], summary='Delete a comment'),
)
class BlogCommentViewSet(ModelViewSet):
    queryset = BlogComment.objects.select_related('blog')
    serializer_class = BlogCommentSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = super().get_queryset()
        blog_id = self.request.query_params.get('blog_id')
        if blog_id:
            return qs.filter(blog_id=blog_id).order_by('-created_at')
        return qs.order_by('-created_at')


# ─── Featured Blogs ───────────────────────────────────────────────────────────

@extend_schema(tags=['discovery'], summary='List featured blog posts (up to 4)')
class FeaturedBlogView(ListAPIView):
    serializer_class = BlogListSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return Blog.objects.filter(
            featured=True, 
            status=BlogStatus.PUBLISHED
        ).filter(
            Q(published_at__lte=timezone.now()) | Q(published_at__isnull=True)
        ).select_related('author', 'category').prefetch_related('tags').order_by('-published_at')[:4]


# ─── Top / Popular Blogs ──────────────────────────────────────────────────────

@extend_schema(tags=['discovery'], summary='List top blogs by comment count (up to 4)')
class TopBlogView(ListAPIView):
    serializer_class = BlogListSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return Blog.objects.filter(
            status=BlogStatus.PUBLISHED, 
            published_at__lte=timezone.now()
        ).annotate(
            comment_count=Count('engagement_comments', distinct=True),
            popularity_score=F('view_count') + F('like_count') * 5 + Count('engagement_comments', distinct=True) * 10
        ).select_related('author', 'category').prefetch_related('tags').order_by('-popularity_score')[:4]


# ─── Trending (last 24 hours by view count) ───────────────────────────────────

@extend_schema(tags=['discovery'], summary='Trending posts in the last 24 hours (by unique views, up to 6)')
class TrendingBlogView(ListAPIView):
    serializer_class = BlogListSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        since = timezone.now() - timezone.timedelta(hours=24)
        return Blog.objects.filter(
            status=BlogStatus.PUBLISHED,
            views__viewed_at__gte=since
        ).filter(
            Q(published_at__lte=timezone.now()) | Q(published_at__isnull=True)
        ).annotate(
            recent_views=Count('views', distinct=True)
        ).select_related('author', 'category').prefetch_related('tags').order_by('-recent_views')[:6]


# ─── Global Search ────────────────────────────────────────────────────────────

@extend_schema(
    tags=['discovery'],
    summary='Full-text search across titles, content, authors, and tags',
    parameters=[OpenApiParameter('q', OpenApiTypes.STR, description='Search query string', required=True)],
)
class SearchView(ListAPIView):
    serializer_class = BlogListSerializer
    permission_classes = [AllowAny]
    pagination_class = BlogPagination

    def get_queryset(self):
        q = self.request.query_params.get('q', '').strip()
        if not q:
            return Blog.objects.none()
        return Blog.objects.filter(
            Q(title__icontains=q) |
            Q(content__icontains=q) |
            Q(author__username__icontains=q) |
            Q(tags__title__icontains=q) |
            Q(category__name__icontains=q),
            status=BlogStatus.PUBLISHED
        ).filter(
            Q(published_at__lte=timezone.now()) | Q(published_at__isnull=True)
        ).distinct().select_related('author', 'category').prefetch_related('tags').order_by('-published_at')


# ─── Similar Blogs ────────────────────────────────────────────────────────────

@extend_schema(
    tags=['discovery'],
    summary='Get similar blog posts by shared tags',
    parameters=[OpenApiParameter('blog_id', OpenApiTypes.INT, OpenApiParameter.PATH, description='ID of the source blog')],
)
class SimilarBlogsView(ListAPIView):
    serializer_class = BlogListSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        blog_id = self.kwargs.get('blog_id')
        try:
            blog = Blog.objects.get(id=blog_id)
            tag_ids = list(blog.tags.values_list('id', flat=True))
        except Blog.DoesNotExist:
            return Blog.objects.none()
        return Blog.objects.filter(
            tags__id__in=tag_ids, 
            status=BlogStatus.PUBLISHED
        ).filter(
            Q(published_at__lte=timezone.now()) | Q(published_at__isnull=True)
        ).exclude(id=blog_id).distinct()[:4]


# ─── Open Graph Image ─────────────────────────────────────────────────────────

@extend_schema(
    tags=['blogs'],
    summary='Generate an Open Graph preview image (PNG, 1200×630)',
    description='Cached for 1 hour. Used as the `og:image` meta tag when sharing articles on social media.',
    responses={(200, 'image/png'): OpenApiTypes.BINARY},
)
class OGImageView(APIView):
    """GET /blogs/<slug>/og-image/ — Generates a PNG Open Graph preview image."""
    permission_classes = [AllowAny]

    @method_decorator(cache_page(60 * 60))  # cache for 1 hour
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)

    def get(self, request, slug):
        try:
            blog = Blog.objects.get(slug=slug)
        except Blog.DoesNotExist:
            return Response({'error': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Generate a 1200x630 OG image
        width, height = 1200, 630
        bg_color = (15, 15, 30)
        accent_color = (99, 102, 241)  # indigo

        img = Image.new('RGB', (width, height), color=bg_color)
        draw = ImageDraw.Draw(img)

        # Accent bar on the left
        draw.rectangle([0, 0, 10, height], fill=accent_color)

        # Overlay gradient (simple approximation)
        for i in range(200):
            alpha = int(60 * (1 - i / 200))
            draw.rectangle(
                [11, height - 200 + i, width, height - 200 + i + 1],
                fill=(99, 102, 241)
            )

        # Title text
        try:
            title_font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 64)
            meta_font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 32)
        except (IOError, OSError):
            title_font = ImageFont.load_default()
            meta_font = ImageFont.load_default()

        margin = 80
        max_chars = 38
        wrapped = textwrap.fill(blog.title, width=max_chars)
        draw.text((margin, 160), wrapped, font=title_font, fill=(255, 255, 255))

        # Author + read time
        meta = f'by {blog.author.username}  ·  {blog.read_time} min read'
        draw.text((margin, height - 120), meta, font=meta_font, fill=(180, 180, 200))

        # Blog URL
        draw.text((margin, height - 70), 'CMBlog', font=meta_font, fill=accent_color)

        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        return HttpResponse(buffer.getvalue(), content_type='image/png')