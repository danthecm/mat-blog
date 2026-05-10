from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)

urlpatterns = [
    path('admin/', admin.site.urls),

    # ── OpenAPI Schema + Interactive Docs ─────────────────────────────────────
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    # ── DRF Browsable API session auth (login/logout in browser) ─────────────
    path('api-auth/', include('rest_framework.urls', namespace='rest_framework')),

    # ── Core blog & discovery ─────────────────────────────────────────────────
    path('', include('blog.urls')),

    # ── Auth, user profiles & RBAC ────────────────────────────────────────────
    path('', include('user.urls')),

    # ── Community engagement (comments, newsletter, polls) ────────────────────
    path('', include('engagement.urls')),

    # ── Editorial newsroom workflow ───────────────────────────────────────────
    path('', include('newsroom.urls')),

    # ── TinyMCE (existing) ────────────────────────────────────────────────────
    path('tinymce/', include('tinymce.urls')),
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)