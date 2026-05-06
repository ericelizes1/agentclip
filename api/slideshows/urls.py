'''URL routes owned by the slideshows app.

API-only after the monorepo pivot. The public viewer (`/s/<share_token>/`)
and home page (`/`) used to render here as Django templates; both moved
to the Next.js web/ service. This module now exposes:

- `/api/slideshow/...`  — write endpoints used by the SDK
- `/api/v1/gallery/`    — read-only home-page gallery feed for web/
'''

from __future__ import annotations

from django.urls import path

from . import views

urlpatterns = [
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
