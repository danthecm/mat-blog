"""
Django settings for react_blog_api project.
"""

from pathlib import Path
from decouple import config
from datetime import timedelta
import dj_database_url


# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = config('SECRET_KEY')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = config('DEBUG', default=False, cast=bool)

# In production, set ALLOWED_HOSTS in the environment as a comma-separated list,
# e.g. ALLOWED_HOSTS=api.example.com,www.example.com
# The wildcard fallback is only safe in local DEBUG mode.
if DEBUG:
    ALLOWED_HOSTS = ['*']
else:
    ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='', cast=lambda v: [h.strip() for h in v.split(',') if h.strip()])


# ─── Apps ─────────────────────────────────────────────────────────────────────

DJANGO_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]

THIRD_PARTY_APPS = [
    'rest_framework',
    'rest_framework_simplejwt',
    'django_filters',
    'drf_spectacular',
    'corsheaders',
    'tinymce',
    'cloudinary',
    'cloudinary_storage',
    'guardian',
]

LOCAL_APPS = [
    'blog',
    'user',
    'engagement',
    'newsroom',
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# ─── Auth & Permissions ───────────────────────────────────────────────────────

AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',
    'guardian.backends.ObjectPermissionBackend',
]

# Guardian: do not create an anonymous user (we use JWT)
ANONYMOUS_USER_NAME = None

# ─── Middleware ───────────────────────────────────────────────────────────────

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'react_blog_api.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'react_blog_api.wsgi.application'

# ─── Database ─────────────────────────────────────────────────────────────────

import sys
DATABASE_URL = config('DATABASE_URL', default=None)

# Detect if we are running tests (manage.py test or pytest)
IS_TESTING = 'test' in sys.argv or 'pytest' in sys.modules

if IS_TESTING:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': ':memory:',  # Use in-memory DB for speed and isolation
        }
    }
elif DATABASE_URL:
    DATABASES = {'default': dj_database_url.config(default=DATABASE_URL, conn_max_age=600, conn_health_checks=True)}
    if 'sqlite' not in DATABASES['default']['ENGINE']:
        DATABASES['default']['OPTIONS'] = DATABASES['default'].get('OPTIONS', {})
        DATABASES['default']['OPTIONS']['sslmode'] = 'require'
elif config('DB_HOST', default=None):
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': config('DB_DATABASE'),
            'USER': config('DB_USER'),
            'PASSWORD': config('DB_PASSWORD'),
            'HOST': config('DB_HOST'),
            'PORT': config('DB_PORT', default='5432'),
            'OPTIONS': {'sslmode': 'require'},
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# ─── Security & Validators ────────────────────────────────────────────────────

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ─── i18n ────────────────────────────────────────────────────────────────────

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# ─── Static & Media ───────────────────────────────────────────────────────────

STATIC_URL = config('STATIC_URL', default='static/')
STATIC_ROOT = BASE_DIR / 'static'
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ─── Third Party Integrations ─────────────────────────────────────────────────

# Allow all origins in development; restrict to an explicit list in production.
# Set CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com in .env
if DEBUG:
    CORS_ORIGIN_ALLOW_ALL = True
else:
    CORS_ORIGIN_ALLOW_ALL = False
    CORS_ALLOWED_ORIGINS = config(
        'CORS_ALLOWED_ORIGINS',
        default='',
        cast=lambda v: [o.strip() for o in v.split(',') if o.strip()],
    )

# ─── Site URL (used in outbound emails) ──────────────────────────────────────
# Set SITE_URL=https://yourdomain.com in production env.
SITE_URL = config('SITE_URL', default='http://localhost:3000')

CLOUDINARY_STORAGE = {
    "CLOUD_NAME": config("CLOUD_NAME"),
    "API_KEY": config("API_KEY"),
    "API_SECRET": config("API_SECRET")
}

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': ('rest_framework_simplejwt.authentication.JWTAuthentication',),
    'DEFAULT_PERMISSION_CLASSES': ('rest_framework.permissions.IsAuthenticatedOrReadOnly',),
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 10,
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'CMBlog Community API',
    'DESCRIPTION': (
        'REST API for the CMBlog community platform.\n\n'
        '## Authentication\n'
        'Most read endpoints are **public**. Write operations require a **Bearer JWT token**.\n\n'
        '## Roles\n'
        '- **Contributor** — write and submit drafts for review\n'
        '- **Editor** — review submissions, publish/reject articles, manage inbox\n'
        '- **Admin** — full access including role management\n'
    ),
    'VERSION': '2.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'CONTACT': {'name': 'CMBlog Team', 'email': 'admin@cmblog.local'},
    'LICENSE': {'name': 'MIT'},
    'TAGS': [
        {'name': 'auth', 'description': 'JWT authentication — register, login, token refresh'},
        {'name': 'users', 'description': 'User profiles, RBAC role management'},
        {'name': 'blogs', 'description': 'Blog posts — CRUD, status workflow, scheduling'},
        {'name': 'categories', 'description': 'Blog categories'},
        {'name': 'tags', 'description': 'Blog tags'},
        {'name': 'comments', 'description': 'Legacy flat comments (backward-compat)'},
        {'name': 'engagement-comments', 'description': 'Threaded comments with likes'},
        {'name': 'newsletter', 'description': 'Newsletter subscribe / unsubscribe'},
        {'name': 'polls', 'description': 'Community polls and voting'},
        {'name': 'newsroom', 'description': 'Editorial workflow — submit, inbox, publish, reject'},
        {'name': 'discovery', 'description': 'Featured, trending, top, similar, search'},
    ],
    'COMPONENT_SPLIT_REQUEST': True,
    'SORT_OPERATIONS': False,
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': False,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

EMAIL_BACKEND = config('EMAIL_BACKEND', default='django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = config('EMAIL_HOST', default='')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='noreply@cmblog.local')

# ─── Newsletter unsubscribe token secret ──────────────────────────────────────
NEWSLETTER_SECRET = config('NEWSLETTER_SECRET', default='change-me-in-production')
