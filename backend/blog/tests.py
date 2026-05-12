"""
Tests for the `blog` app.
Covers: CRUD with RBAC, categories, tags, featured/top/trending, search,
        similar blogs, view count tracking, OG image, auto read-time.
"""
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APITestCase
from blog.models import Blog, BlogCategory, BlogTag, BlogComment, BlogView, BlogStatus
from user.models import UserProfile
from tests import create_user, get_token, create_blog


# ─── Blog CRUD ────────────────────────────────────────────────────────────────

class BlogListTests(APITestCase):

    def setUp(self):
        self.contributor = create_user('list_contrib')
        self.editor = create_user('list_editor', role='editor')
        self.pub = create_blog(self.contributor, title='Published Post', status=BlogStatus.PUBLISHED)
        self.draft = create_blog(self.contributor, title='Draft Post', status=BlogStatus.DRAFT)
        self.pending = create_blog(self.contributor, title='Pending Post', status=BlogStatus.PENDING)

    def test_anonymous_sees_only_published_posts(self):
        r = self.client.get('/blogs/')
        self.assertEqual(r.status_code, 200)
        titles = [b['title'] for b in r.data['results']]
        self.assertIn('Published Post', titles)
        self.assertNotIn('Draft Post', titles)
        self.assertNotIn('Pending Post', titles)

    def test_contributor_sees_published_plus_own_drafts(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(self.contributor)}')
        r = self.client.get('/blogs/')
        titles = [b['title'] for b in r.data['results']]
        self.assertIn('Published Post', titles)
        self.assertIn('Draft Post', titles)

    def test_editor_sees_published_and_pending_but_only_own_drafts(self):
        # Create an editor draft
        create_blog(self.editor, title='Editor Own Draft', status=BlogStatus.DRAFT)
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(self.editor)}')
        r = self.client.get('/blogs/')
        titles = [b['title'] for b in r.data['results']]
        
        self.assertIn('Published Post', titles)
        self.assertIn('Pending Post', titles)
        self.assertIn('Editor Own Draft', titles)
        self.assertNotIn('Draft Post', titles) # This was created by 'contributor'

    def test_list_returns_expected_fields(self):
        r = self.client.get('/blogs/')
        result = r.data['results'][0]
        for field in ('id', 'title', 'slug', 'author', 'status', 'view_count', 'read_time', 'created_at'):
            self.assertIn(field, result)

    def test_list_is_paginated(self):
        r = self.client.get('/blogs/')
        self.assertIn('count', r.data)
        self.assertIn('results', r.data)

    def test_editor_can_filter_by_author(self):
        # Admin/Editor wants to see only their stuff in 'My Drafts' page
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(self.editor)}')
        r = self.client.get(f'/blogs/?author__username={self.contributor.username}')
        titles = [b['title'] for b in r.data['results']]
        
        # Should see contributor's published and pending posts, but NOT their drafts
        self.assertIn('Published Post', titles)
        self.assertIn('Pending Post', titles)
        self.assertNotIn('Draft Post', titles)
        
        # Filter for self
        r = self.client.get(f'/blogs/?author__username={self.editor.username}')
        titles = [b['title'] for b in r.data['results']]
        # Assuming we created 'Editor Own Draft' in another test, but setUp is fresh for each test?
        # No,setUp runs before each test. I didn't create it in setUp.
        # Let's create it here.
        create_blog(self.editor, title='Editor Own Draft', status=BlogStatus.DRAFT)
        r = self.client.get(f'/blogs/?author__username={self.editor.username}')
        titles = [b['title'] for b in r.data['results']]
        self.assertIn('Editor Own Draft', titles)
        self.assertNotIn('Published Post', titles) # belong to contributor


    def test_contributor_sees_only_own_drafts_with_username_filter(self):
        # Regular user visits their 'My Drafts' page
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(self.contributor)}')
        r = self.client.get(f'/blogs/?author__username={self.contributor.username}')
        self.assertEqual(r.status_code, 200)
        titles = [b['title'] for b in r.data['results']]
        
        # Should see their own draft and published posts
        self.assertIn('Published Post', titles)
        self.assertIn('Draft Post', titles)
        
        # Should NOT see anyone else's posts (if we had any other published ones, but setUp only has these)
        # Let's create another author's published post to be sure
        other = create_user('other_contrib')
        create_blog(other, title='Other Published', status=BlogStatus.PUBLISHED)
        
        r = self.client.get(f'/blogs/?author__username={self.contributor.username}')
        titles = [b['title'] for b in r.data['results']]
        self.assertNotIn('Other Published', titles)

    def test_published_at_null_remains_visible(self):
        # Regression test for published_at visibility issue
        # Create a blog with status=published but manually set published_at to None
        blog = create_blog(self.contributor, title='Null Pub Date', status=BlogStatus.PUBLISHED)
        blog.published_at = None
        blog.save() # Note: our new save() will auto-fill it unless we bypass it.
        # To truly test the fallback, we can use update()
        Blog.objects.filter(id=blog.id).update(published_at=None)
        
        r = self.client.get('/blogs/')
        titles = [b['title'] for b in r.data['results']]
        # It should NOT be in the results if the query only checks published_at__lte=now
        # But we want it to be visible or our model fix should have filled it.
        # Actually, our model fix in save() handles this.
        # Let's check that it is indeed visible.
        self.assertIn('Null Pub Date', titles)

    def test_get_drafts_and_submissions_endpoints(self):
        # 1. Contributor checks 'drafts'
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(self.contributor)}')
        r = self.client.get('/blogs/drafts/')
        self.assertEqual(r.status_code, 200)
        titles = [b['title'] for b in r.data['results']]
        self.assertIn('Draft Post', titles)
        self.assertNotIn('Published Post', titles) # drafts only

        # 2. Contributor checks 'submissions'
        # Let's make one pending
        self.draft.status = BlogStatus.PENDING
        self.draft.save()
        r = self.client.get('/blogs/submissions/')
        self.assertEqual(r.status_code, 200)
        titles = [b['title'] for b in r.data['results']]
        self.assertIn('Draft Post', titles) # it's now pending

        # 3. Test Edit Lock
        r = self.client.patch(f'/blogs/{self.draft.slug}/', {'title': 'Changed'})
        self.assertEqual(r.status_code, 403) # Locked!

        # 4. Editor cannot edit pending via standard CRUD either (Safeguard)
        # They must use the newsroom/publish or newsroom/reject endpoints.
        editor = create_user('lock_editor', role='editor')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(editor)}')
        r = self.client.patch(f'/blogs/{self.draft.slug}/', {'title': 'Editor Changed'})
        self.assertEqual(r.status_code, 403)

class BlogCreateTests(APITestCase):

    def setUp(self):
        self.contributor = create_user('create_contrib')
        self.editor = create_user('create_editor', role='editor')

    def test_contributor_can_create_draft(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(self.contributor)}')
        r = self.client.post('/blogs/', {
            'title': 'My New Draft',
            'content': '<p>Content here</p>',
        }, format='json')
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data['title'], 'My New Draft')
        self.assertEqual(r.data['status'], BlogStatus.DRAFT)
        self.assertEqual(r.data['author']['username'], 'create_contrib')

    def test_new_blog_auto_calculates_read_time(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(self.contributor)}')
        long_content = '<p>' + ('word ' * 400) + '</p>'  # ~400 words = 2 min
        r = self.client.post('/blogs/', {
            'title': 'Long Article',
            'content': long_content,
        }, format='json')
        self.assertEqual(r.status_code, 201)
        self.assertGreaterEqual(r.data['read_time'], 1)

    def test_new_blog_auto_generates_slug(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(self.contributor)}')
        r = self.client.post('/blogs/', {
            'title': 'Slug Test Article',
            'content': '<p>Content</p>',
        }, format='json')
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data['slug'], 'slug-test-article')

    def test_unauthenticated_create_returns_401(self):
        r = self.client.post('/blogs/', {
            'title': 'Anon Post',
            'content': '<p>Content</p>',
        }, format='json')
        self.assertEqual(r.status_code, 401)

    def test_create_duplicate_title_returns_400(self):
        create_blog(self.contributor, title='Unique Title', status=BlogStatus.PUBLISHED)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(self.contributor)}')
        r = self.client.post('/blogs/', {
            'title': 'Unique Title',
            'content': '<p>Duplicate</p>',
        }, format='json')
        self.assertEqual(r.status_code, 400)

    def test_create_with_category_and_tags(self):
        cat = BlogCategory.objects.create(name='Tech', slug='tech')
        tag = BlogTag.objects.create(title='Python', slug='python')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(self.contributor)}')
        r = self.client.post('/blogs/', {
            'title': 'Tagged Article',
            'content': '<p>Content</p>',
            'category_id': cat.id,
            'tag_ids': [tag.id],
        }, format='json')
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data['category']['slug'], 'tech')
        self.assertEqual(r.data['tags'][0]['slug'], 'python')


class BlogRetrieveTests(APITestCase):

    def setUp(self):
        self.contributor = create_user('ret_contrib')
        self.blog = create_blog(self.contributor, title='Retrieve Me', status=BlogStatus.PUBLISHED)

    def test_retrieve_published_blog_returns_full_data(self):
        r = self.client.get(f'/blogs/{self.blog.slug}/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['title'], 'Retrieve Me')
        self.assertIn('content', r.data)
        self.assertIn('og_image_url', r.data)
        self.assertIn('author', r.data)

    def test_retrieve_increments_view_count(self):
        initial = self.blog.view_count
        self.client.get(f'/blogs/{self.blog.slug}/')
        self.blog.refresh_from_db()
        self.assertEqual(self.blog.view_count, initial + 1)

    def test_second_retrieve_same_ip_does_not_double_count(self):
        """Same IP in same day should only count once."""
        self.client.get(f'/blogs/{self.blog.slug}/')
        self.client.get(f'/blogs/{self.blog.slug}/')
        self.blog.refresh_from_db()
        self.assertEqual(self.blog.view_count, 1)

    def test_retrieve_creates_blog_view_record(self):
        self.client.get(f'/blogs/{self.blog.slug}/')
        self.assertEqual(BlogView.objects.filter(blog=self.blog).count(), 1)

    def test_retrieve_nonexistent_slug_returns_404(self):
        r = self.client.get('/blogs/this-does-not-exist/')
        self.assertEqual(r.status_code, 404)


class BlogUpdateDeleteTests(APITestCase):

    def setUp(self):
        self.author = create_user('upd_author')
        self.other = create_user('upd_other')
        self.editor = create_user('upd_editor', role='editor')
        self.blog = create_blog(self.author, title='Editable Blog', status=BlogStatus.PUBLISHED)

    def test_author_can_update_own_blog(self):
        draft = create_blog(self.author, title='My Draft', status=BlogStatus.DRAFT)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(self.author)}')
        r = self.client.patch(f'/blogs/{draft.slug}/', {'title': 'Updated Title'}, format='json')
        self.assertEqual(r.status_code, 200)
        draft.refresh_from_db()
        self.assertEqual(draft.title, 'Updated Title')

    def test_editor_can_update_any_blog(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(self.editor)}')
        r = self.client.patch(f'/blogs/{self.blog.slug}/', {'title': 'Editor Edit'}, format='json')
        self.assertEqual(r.status_code, 200)

    def test_other_contributor_cannot_update_blog(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(self.other)}')
        r = self.client.patch(f'/blogs/{self.blog.slug}/', {'title': 'Hijacked'}, format='json')
        self.assertEqual(r.status_code, 403)

    def test_author_can_soft_delete_own_draft(self):
        # Create a draft for the author
        draft = create_blog(self.author, title='My Draft', status=BlogStatus.DRAFT)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(self.author)}')
        r = self.client.delete(f'/blogs/{draft.slug}/')
        self.assertEqual(r.status_code, 200) # Soft delete returns 200
        draft.refresh_from_db()
        self.assertTrue(draft.is_deleted)

    def test_author_cannot_delete_own_published_post(self):
        # Only Admins can delete published posts (according to strict admin requirement)
        published = create_blog(self.author, title='Published', status=BlogStatus.PUBLISHED)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(self.author)}')
        r = self.client.delete(f'/blogs/{published.slug}/')
        self.assertEqual(r.status_code, 403)

    def test_other_contributor_cannot_delete_blog(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(self.other)}')
        r = self.client.delete(f'/blogs/{self.blog.slug}/')
        self.assertEqual(r.status_code, 403)

    def test_admin_can_soft_delete_any_post(self):
        admin = create_user('super_admin', role='admin')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(admin)}')
        r = self.client.delete(f'/blogs/{self.blog.slug}/')
        self.assertEqual(r.status_code, 200)
        self.blog.refresh_from_db()
        self.assertTrue(self.blog.is_deleted)

    def test_admin_permanent_delete_workflow(self):
        admin = create_user('perm_admin', role='admin')
        # Soft delete first
        self.blog.is_deleted = True
        self.blog.save()
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(admin)}')
        r = self.client.delete(f'/blogs/{self.blog.slug}/permanent_delete/')
        self.assertEqual(r.status_code, 204)
        self.assertFalse(Blog.objects.filter(slug=self.blog.slug).exists())

    def test_admin_restore_from_trash(self):
        admin = create_user('restore_admin', role='admin')
        self.blog.is_deleted = True
        self.blog.save()
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(admin)}')
        r = self.client.post(f'/blogs/{self.blog.slug}/restore/')
        self.assertEqual(r.status_code, 200)
        self.blog.refresh_from_db()
        self.assertFalse(self.blog.is_deleted)


# ─── Categories & Tags ───────────────────────────────────────────────────────

class BlogCategoryTests(APITestCase):

    def setUp(self):
        self.editor = create_user('cat_editor', role='editor')
        self.category = BlogCategory.objects.create(name='Science', slug='science')

    def test_list_categories_public(self):
        r = self.client.get('/blog-categories/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['results'][0]['name'], 'Science')

    def test_create_category_requires_auth(self):
        r = self.client.post('/blog-categories/', {'name': 'Arts'}, format='json')
        self.assertEqual(r.status_code, 401)

    def test_create_category_authenticated_success(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(self.editor)}')
        r = self.client.post('/blog-categories/', {'name': 'Culture', 'slug': 'culture'}, format='json')
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data['name'], 'Culture')

    def test_retrieve_category_by_slug(self):
        r = self.client.get('/blog-categories/science/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['slug'], 'science')

    def test_retrieve_nonexistent_category_returns_404(self):
        r = self.client.get('/blog-categories/nonexistent/')
        self.assertEqual(r.status_code, 404)


class BlogTagTests(APITestCase):

    def setUp(self):
        self.contributor = create_user('tag_contrib')
        BlogTag.objects.create(title='Django', slug='django')

    def test_list_tags_public(self):
        r = self.client.get('/blog-tags/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['results'][0]['title'], 'Django')

    def test_create_tag_authenticated(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(self.contributor)}')
        r = self.client.post('/blog-tags/', {'title': 'Flask', 'slug': 'flask'}, format='json')
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data['slug'], 'flask')


# ─── Discovery Endpoints ──────────────────────────────────────────────────────

class FeaturedBlogTests(APITestCase):

    def setUp(self):
        self.author = create_user('feat_author')
        self.featured = create_blog(self.author, title='Featured!', status=BlogStatus.PUBLISHED, featured=True)
        self.regular = create_blog(self.author, title='Regular', status=BlogStatus.PUBLISHED, featured=False)
        self.draft_featured = create_blog(self.author, title='Draft Featured', status=BlogStatus.DRAFT, featured=True)

    def test_featured_endpoint_returns_only_featured_published(self):
        r = self.client.get('/featured-blogs/')
        self.assertEqual(r.status_code, 200)
        titles = [b['title'] for b in r.data['results']]
        self.assertIn('Featured!', titles)
        self.assertNotIn('Regular', titles)
        self.assertNotIn('Draft Featured', titles)

    def test_featured_endpoint_public_no_auth_needed(self):
        r = self.client.get('/featured-blogs/')
        self.assertEqual(r.status_code, 200)


class TopBlogTests(APITestCase):

    def setUp(self):
        self.author = create_user('top_author')
        self.popular = create_blog(self.author, title='Popular', status=BlogStatus.PUBLISHED)
        self.unpopular = create_blog(self.author, title='Unpopular', status=BlogStatus.PUBLISHED)
        # Add comments to make 'popular' rank higher
        for i in range(3):
            BlogComment.objects.create(blog=self.popular, name=f'user{i}', comment='Nice!')

    def test_top_blogs_ordered_by_comment_count(self):
        r = self.client.get('/top-blogs/')
        self.assertEqual(r.status_code, 200)
        titles = [b['title'] for b in r.data['results']]
        self.assertEqual(titles[0], 'Popular')

    def test_top_blogs_excludes_drafts(self):
        draft = create_blog(self.author, title='Draft Top', status=BlogStatus.DRAFT)
        r = self.client.get('/top-blogs/')
        titles = [b['title'] for b in r.data['results']]
        self.assertNotIn('Draft Top', titles)


class TrendingBlogTests(APITestCase):

    def setUp(self):
        self.author = create_user('trend_author')
        self.trending = create_blog(self.author, title='Trending Now', status=BlogStatus.PUBLISHED)
        self.cold = create_blog(self.author, title='Cold Post', status=BlogStatus.PUBLISHED)
        # Create recent views for the trending post
        BlogView.objects.create(blog=self.trending, ip='10.0.0.1')
        BlogView.objects.create(blog=self.trending, ip='10.0.0.2')

    def test_trending_shows_posts_with_recent_views(self):
        r = self.client.get('/blogs/trending/')
        self.assertEqual(r.status_code, 200)
        titles = [b['title'] for b in r.data['results']]
        self.assertIn('Trending Now', titles)

    def test_trending_does_not_show_posts_without_views(self):
        r = self.client.get('/blogs/trending/')
        titles = [b['title'] for b in r.data['results']]
        self.assertNotIn('Cold Post', titles)


class SearchTests(APITestCase):

    def setUp(self):
        self.author = create_user('search_author')
        self.blog = create_blog(self.author, title='Django REST Framework Guide', status=BlogStatus.PUBLISHED)

    def test_search_by_title_returns_matching_post(self):
        r = self.client.get('/search/?q=Django')
        self.assertEqual(r.status_code, 200)
        self.assertGreaterEqual(r.data['count'], 1)
        titles = [b['title'] for b in r.data['results']]
        self.assertIn('Django REST Framework Guide', titles)

    def test_search_no_query_returns_empty(self):
        r = self.client.get('/search/?q=')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['count'], 0)

    def test_search_no_match_returns_empty_results(self):
        r = self.client.get('/search/?q=xyznonexistentterm999')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['count'], 0)

    def test_search_excludes_drafts(self):
        create_blog(self.author, title='Draft Django Guide', status=BlogStatus.DRAFT)
        r = self.client.get('/search/?q=Draft Django')
        titles = [b['title'] for b in r.data['results']]
        self.assertNotIn('Draft Django Guide', titles)


class SimilarBlogsTests(APITestCase):

    def setUp(self):
        self.author = create_user('sim_author')
        self.tag = BlogTag.objects.create(title='Python', slug='python')
        self.blog1 = create_blog(self.author, title='Python Post 1', status=BlogStatus.PUBLISHED)
        self.blog1.tags.add(self.tag)
        self.blog2 = create_blog(self.author, title='Python Post 2', status=BlogStatus.PUBLISHED)
        self.blog2.tags.add(self.tag)
        self.blog3 = create_blog(self.author, title='Unrelated Post', status=BlogStatus.PUBLISHED)

    def test_similar_blogs_returns_posts_with_shared_tags(self):
        r = self.client.get(f'/similar-blogs/{self.blog1.id}/')
        self.assertEqual(r.status_code, 200)
        titles = [b['title'] for b in r.data['results']]
        self.assertIn('Python Post 2', titles)
        self.assertNotIn('Python Post 1', titles)  # Should not include itself

    def test_similar_blogs_excludes_drafts(self):
        draft = create_blog(self.author, title='Draft Python', status=BlogStatus.DRAFT)
        draft.tags.add(self.tag)
        r = self.client.get(f'/similar-blogs/{self.blog1.id}/')
        titles = [b['title'] for b in r.data['results']]
        self.assertNotIn('Draft Python', titles)


# ─── OG Image ─────────────────────────────────────────────────────────────────

class OGImageTests(APITestCase):

    def setUp(self):
        self.author = create_user('og_author')
        self.blog = create_blog(self.author, title='OG Image Test', status=BlogStatus.PUBLISHED)

    def test_og_image_returns_png(self):
        r = self.client.get(f'/blogs/{self.blog.slug}/og-image/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r['Content-Type'], 'image/png')
        # Should be a non-trivial PNG (at least a few KB)
        self.assertGreater(len(r.content), 1000)

    def test_og_image_nonexistent_slug_returns_404(self):
        r = self.client.get('/blogs/no-such-blog/og-image/')
        self.assertEqual(r.status_code, 404)


# ─── Guardian Object Permission Lifecycle ─────────────────────────────────────

class GuardianPermissionLifecycleTests(APITestCase):
    """
    Tests that Guardian object permissions are correctly assigned and revoked
    throughout the blog post lifecycle:
      create  → author gets change_blog + delete_blog
      submit  → change_blog revoked from author
      recall  → change_blog restored to author
    (reject → change_blog restored is tested in newsroom tests)
    """

    def setUp(self):
        self.author = create_user('gpl_author')
        self.editor = create_user('gpl_editor', role='editor')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(self.author)}')

    def test_create_assigns_change_and_delete_perms_to_author(self):
        from guardian.shortcuts import get_perms
        r = self.client.post('/blogs/', {
            'title': 'Guardian Test Post',
            'content': '<p>' + 'word ' * 300 + '</p>',
        }, format='json')
        self.assertEqual(r.status_code, 201)
        blog = Blog.objects.get(slug=r.data['slug'])
        perms = get_perms(self.author, blog)
        self.assertIn('change_blog', perms)
        self.assertIn('delete_blog', perms)

    def test_submit_removes_change_perm_from_author(self):
        from unittest.mock import patch
        from guardian.shortcuts import get_perms
        blog = create_blog(self.author, title='Submit Perm Test', status=BlogStatus.DRAFT)
        # Manually assign perms (as perform_create would do)
        from guardian.shortcuts import assign_perm
        assign_perm('blog.change_blog', self.author, blog)

        with patch('newsroom.views.send_mail'):
            r = self.client.post(f'/newsroom/blogs/{blog.slug}/submit/')
        self.assertEqual(r.status_code, 201)

        perms = get_perms(self.author, blog)
        self.assertNotIn('change_blog', perms, 'Author should NOT have change_blog after submit')

    def test_recall_restores_change_perm_to_author(self):
        from unittest.mock import patch
        from guardian.shortcuts import get_perms, assign_perm
        blog = create_blog(self.author, title='Recall Perm Test', status=BlogStatus.DRAFT)
        assign_perm('blog.change_blog', self.author, blog)

        # Submit (removes change_blog)
        with patch('newsroom.views.send_mail'):
            self.client.post(f'/newsroom/blogs/{blog.slug}/submit/')

        # Recall (restores change_blog)
        r = self.client.post(f'/newsroom/blogs/{blog.slug}/recall/')
        self.assertEqual(r.status_code, 200)

        perms = get_perms(self.author, blog)
        self.assertIn('change_blog', perms, 'Author SHOULD have change_blog after recall')
