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
        views.slideshow_patch,
        name='api_slideshow_patch',
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

    # Read API — gallery feed for the home page
    path('api/v1/gallery/', views.GalleryListView.as_view(), name='gallery_list'),
    path(
        'api/v1/slideshow/<str:share_token>/',
        views.SlideshowPublicView.as_view(),
        name='slideshow_public',
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
]
