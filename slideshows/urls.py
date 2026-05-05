'''URL routes owned by the slideshows app.

Two route families share the module:

- ``/api/...`` for the SDK-facing endpoints. UUIDs match Django's
  built-in ``uuid`` converter; positions match a plain ``int``.
- ``/`` and ``/s/<share_token>/`` for the public, unauthenticated
  HTML pages.

The order matters: the more specific paths come first so the empty
``''`` for home doesn't accidentally swallow other routes during a
future refactor.
'''

from __future__ import annotations

from django.urls import path

from . import views

urlpatterns = [
    # API
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

    # Public
    path('s/<str:share_token>/', views.slideshow_viewer, name='slideshow_viewer'),
    path('', views.home, name='home'),
]
