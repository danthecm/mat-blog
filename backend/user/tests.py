"""
Tests for the `user` app.
Covers: registration, JWT login/refresh, profile retrieval/update, RBAC role & approval management.
"""
from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken
from user.models import UserProfile
from tests import create_user, get_token


# ─── Registration ─────────────────────────────────────────────────────────────

class RegistrationTests(APITestCase):

    def test_register_happy_path_returns_201_with_username(self):
        data = {'username': 'alice', 'email': 'alice@test.com', 'password': 'securepass99'}
        r = self.client.post('/auth/register/', data, format='json')
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data['username'], 'alice')
        self.assertIn('message', r.data)

    def test_register_creates_contributor_profile_automatically(self):
        data = {'username': 'bob', 'email': 'bob@test.com', 'password': 'securepass99', 'bio': 'Writer'}
        self.client.post('/auth/register/', data, format='json')
        user = User.objects.get(username='bob')
        self.assertEqual(user.profile.role, 'contributor')
        self.assertEqual(user.profile.bio, 'Writer')
        self.assertTrue(user.profile.is_approved)

    def test_register_duplicate_username_returns_400(self):
        create_user('alice2')
        r = self.client.post('/auth/register/', {
            'username': 'alice2', 'email': 'x@test.com', 'password': 'securepass99'
        }, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('username', r.data)

    def test_register_password_too_short_returns_400(self):
        r = self.client.post('/auth/register/', {
            'username': 'shortpwd', 'email': 'x@test.com', 'password': 'abc'
        }, format='json')
        self.assertEqual(r.status_code, 400)

    def test_register_missing_password_returns_400(self):
        r = self.client.post('/auth/register/', {
            'username': 'nopwd', 'email': 'x@test.com'
        }, format='json')
        self.assertEqual(r.status_code, 400)


# ─── Authentication (JWT) ─────────────────────────────────────────────────────

class JWTAuthTests(APITestCase):

    def setUp(self):
        self.user = create_user('jwtuser')

    def test_login_returns_access_and_refresh_tokens(self):
        r = self.client.post('/auth/login/', {
            'username': 'jwtuser', 'password': 'testpass123'
        }, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertIn('access', r.data)
        self.assertIn('refresh', r.data)
        # Tokens must be non-trivial JWT strings
        self.assertGreater(len(r.data['access']), 50)
        self.assertGreater(len(r.data['refresh']), 50)

    def test_login_wrong_password_returns_401_no_tokens(self):
        r = self.client.post('/auth/login/', {
            'username': 'jwtuser', 'password': 'wrongpassword'
        }, format='json')
        self.assertEqual(r.status_code, 401)
        self.assertNotIn('access', r.data)

    def test_login_nonexistent_user_returns_401(self):
        r = self.client.post('/auth/login/', {
            'username': 'ghost', 'password': 'anything'
        }, format='json')
        self.assertEqual(r.status_code, 401)

    def test_token_refresh_returns_new_access_token(self):
        refresh = RefreshToken.for_user(self.user)
        r = self.client.post('/auth/token/refresh/', {'refresh': str(refresh)}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertIn('access', r.data)

    def test_token_refresh_invalid_token_returns_401(self):
        r = self.client.post('/auth/token/refresh/', {'refresh': 'notavalidtoken'}, format='json')
        self.assertEqual(r.status_code, 401)


# ─── /users/me/ ───────────────────────────────────────────────────────────────

class UserMeTests(APITestCase):

    def setUp(self):
        self.user = create_user('meuser')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(self.user)}')

    def test_get_own_profile_returns_correct_data(self):
        r = self.client.get('/users/me/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['username'], 'meuser')
        self.assertEqual(r.data['email'], 'meuser@test.com')
        self.assertIn('profile', r.data)
        self.assertEqual(r.data['profile']['role'], 'contributor')
        self.assertTrue(r.data['profile']['is_approved'])

    def test_get_own_profile_unauthenticated_returns_401(self):
        self.client.credentials()  # remove auth
        r = self.client.get('/users/me/')
        self.assertEqual(r.status_code, 401)

    def test_patch_bio_updates_profile(self):
        r = self.client.patch('/users/me/', {'bio': 'New bio text'}, format='json')
        self.assertEqual(r.status_code, 200)
        self.user.profile.refresh_from_db()
        self.assertEqual(self.user.profile.bio, 'New bio text')

    def test_patch_email_updates_user(self):
        r = self.client.patch('/users/me/', {'email': 'updated@test.com'}, format='json')
        self.assertEqual(r.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, 'updated@test.com')

    def test_patch_website_updates_profile(self):
        r = self.client.patch('/users/me/', {'website': 'https://mysite.com'}, format='json')
        self.assertEqual(r.status_code, 200)
        self.user.profile.refresh_from_db()
        self.assertEqual(self.user.profile.website, 'https://mysite.com')


# ─── Public Contributor Profiles ──────────────────────────────────────────────

class ContributorProfileTests(APITestCase):

    def setUp(self):
        self.contributor = create_user('pubcontrib', role='editor')

    def test_get_public_profile_returns_username_and_role(self):
        r = self.client.get('/users/pubcontrib/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['username'], 'pubcontrib')
        self.assertIn('profile', r.data)
        self.assertEqual(r.data['profile']['role'], 'editor')

    def test_get_nonexistent_user_returns_404(self):
        r = self.client.get('/users/doesnotexist/')
        self.assertEqual(r.status_code, 404)

    def test_profile_accessible_without_authentication(self):
        # No credentials set — should still be public
        r = self.client.get('/users/pubcontrib/')
        self.assertEqual(r.status_code, 200)


# ─── RBAC — Role Management ───────────────────────────────────────────────────

class RoleManagementTests(APITestCase):

    def setUp(self):
        self.admin = create_user('admin_u', role='admin')
        self.editor = create_user('editor_u', role='editor')
        self.contributor = create_user('contrib_u', role='contributor')

    def test_admin_promotes_contributor_to_editor(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(self.admin)}')
        r = self.client.patch('/users/contrib_u/role/', {'role': 'editor'}, format='json')
        self.assertEqual(r.status_code, 200)
        self.contributor.profile.refresh_from_db()
        self.assertEqual(self.contributor.profile.role, 'editor')

    def test_editor_cannot_change_roles(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(self.editor)}')
        r = self.client.patch('/users/contrib_u/role/', {'role': 'admin'}, format='json')
        self.assertEqual(r.status_code, 403)

    def test_contributor_cannot_change_roles(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(self.contributor)}')
        r = self.client.patch('/users/editor_u/role/', {'role': 'contributor'}, format='json')
        self.assertEqual(r.status_code, 403)

    def test_invalid_role_value_returns_400(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(self.admin)}')
        r = self.client.patch('/users/contrib_u/role/', {'role': 'superuser'}, format='json')
        self.assertEqual(r.status_code, 400)

    def test_role_change_on_nonexistent_user_returns_404(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(self.admin)}')
        r = self.client.patch('/users/nosuchperson/role/', {'role': 'editor'}, format='json')
        self.assertEqual(r.status_code, 404)


# ─── RBAC — Contributor Approval ─────────────────────────────────────────────

class ContributorApprovalTests(APITestCase):

    def setUp(self):
        self.editor = create_user('appr_editor', role='editor')
        self.contributor = create_user('appr_contrib', role='contributor')

    def test_editor_can_approve_contributor(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(self.editor)}')
        r = self.client.patch('/users/appr_contrib/approve/', {'is_approved': True}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertIn('approved', r.data['message'])

    def test_editor_can_suspend_contributor(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(self.editor)}')
        r = self.client.patch('/users/appr_contrib/approve/', {'is_approved': False}, format='json')
        self.assertEqual(r.status_code, 200)
        self.contributor.profile.refresh_from_db()
        self.assertFalse(self.contributor.profile.is_approved)

    def test_contributor_cannot_approve_others(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(self.contributor)}')
        r = self.client.patch('/users/appr_editor/approve/', {'is_approved': False}, format='json')
        self.assertEqual(r.status_code, 403)

    def test_suspended_contributor_cannot_create_blog(self):
        """A suspended contributor is blocked from writing."""
        from blog.models import Blog
        self.contributor.profile.is_approved = False
        self.contributor.profile.save()
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(self.contributor)}')
        r = self.client.post('/blogs/', {
            'title': 'Blocked Post',
            'content': 'Should not work',
        }, format='json')
        self.assertEqual(r.status_code, 403)


# ─── Serializer — groups & role fields ────────────────────────────────────────

class UserSerializerGroupsTests(APITestCase):
    """
    Phase 4 tests: verifies the /users/me/ endpoint returns both the
    `groups` array and the top-level computed `role` string.
    """

    def test_me_returns_groups_array(self):
        user = create_user('grp_check', role='editor')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(user)}')
        r = self.client.get('/users/me/')
        self.assertEqual(r.status_code, 200)
        self.assertIn('groups', r.data)
        self.assertIn('editor', r.data['groups'])

    def test_me_returns_computed_role_string(self):
        user = create_user('role_check', role='admin')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(user)}')
        r = self.client.get('/users/me/')
        self.assertEqual(r.status_code, 200)
        self.assertIn('role', r.data)
        self.assertEqual(r.data['role'], 'admin')

    def test_role_promotion_syncs_group_membership(self):
        """When an admin changes a user's role, their Group should update too."""
        from django.contrib.auth.models import Group
        admin = create_user('promo_admin', role='admin')
        target = create_user('promo_target', role='contributor')

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {get_token(admin)}')
        r = self.client.patch(f'/users/{target.username}/role/', {'role': 'editor'}, format='json')
        self.assertEqual(r.status_code, 200)

        target.refresh_from_db()
        group_names = list(target.groups.values_list('name', flat=True))
        self.assertIn('editor', group_names)
        self.assertNotIn('contributor', group_names)
