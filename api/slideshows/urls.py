'''URL routes owned by the slideshows app.

API-only after the monorepo pivot. The public viewer (`/s/<share_token>/`)
and home page (`/`) used to render here as Django templates; both moved
to the Next.js web/ service. This module now exposes:

- `/api/slideshow/...`  — write endpoints used by the SDK
- `/api/v1/gallery/`    — read-only home-page gallery feed for web/
'''

from __future__ import annotations

from django.urls import path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
)

from . import views

urlpatterns = [
    # OpenAPI schema (machine-readable + Swagger UI for human inspection).
    # The web/ service generates its typed fetch client off this; humans
    # poke at it via /api/schema/swagger-ui/ when designing changes.
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path(
        'api/schema/swagger-ui/',
        SpectacularSwaggerView.as_view(url_name='schema'),
        name='swagger-ui',
    ),

    # Write API
    path('api/slideshow/', views.slideshow_create, name='api_slideshow_create'),
    path(
        'api/slideshow/<uuid:slideshow_id>/',
        views.slideshow_detail,
        name='api_slideshow_detail',
    ),
    path(
        'api/slideshow/<uuid:slideshow_id>/slides/',
        views.slide_add,
        name='api_slide_add',
    ),
    path(
        'api/slideshow/<uuid:slideshow_id>/slides/<int:position>/',
        views.slide_update,
        name='api_slide_update',
    ),

    # Admin: feature/unfeature a slideshow in the gallery (Bearer AGENTCLIP_ADMIN_TOKEN).
    path(
        'api/v1/slideshow/<str:share_token>/feature/',
        views.slideshow_feature,
        name='slideshow_feature',
    ),

    # Narration — generate per-slide audio. Bearer write_token, same
    # auth surface as slide_add, so the agentclip CLI / SDK can call
    # it directly after uploading slides.
    path(
        'api/v1/slideshow/<str:share_token>/narrate/',
        views.slideshow_narrate,
        name='slideshow_narrate',
    ),

    # Read API — gallery feed for the home page
    path('api/v1/gallery/', views.GalleryListView.as_view(), name='gallery_list'),
    path(
        'api/v1/slideshow/<str:share_token>/',
        views.SlideshowPublicView.as_view(),
        name='slideshow_public',
    ),

    # Render artifacts — lazy on miss, 302 to R2 on hit. The web edge
    # routes ``/s/<token>.mp4`` and ``/s/<token>.pdf`` proxy here.
    path(
        'api/v1/slideshow/<str:share_token>/clip.mp4',
        views.slideshow_clip_mp4,
        name='slideshow_clip_mp4',
    ),
    path(
        'api/v1/slideshow/<str:share_token>/clip.pdf',
        views.slideshow_clip_pdf,
        name='slideshow_clip_pdf',
    ),

    # Edit-token recovery + rotation (slug-keyed, write_token-authenticated)
    path(
        'api/v1/slideshow/<str:share_token>/edit-token/',
        views.edit_token_recover,
        name='edit_token_recover',
    ),
    path(
        'api/v1/slideshow/<str:share_token>/rotate-edit-token/',
        views.edit_token_rotate,
        name='edit_token_rotate',
    ),

    # Edit-page mutating endpoints (slug-keyed, edit_token-authenticated)
    path(
        'api/v1/slideshow/<str:share_token>/slides/<int:position>/caption/',
        views.slide_edit_caption,
        name='slide_edit_caption',
    ),
    path(
        'api/v1/slideshow/<str:share_token>/slides/<int:position>/',
        views.slide_edit_delete,
        name='slide_edit_delete',
    ),
]
