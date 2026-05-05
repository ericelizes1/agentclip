'''Top-level URL config for the qagent backend.

The slideshows app owns both the API surface (under /api/) and the
public-facing routes (the / landing page and /s/<token> viewer).
Keeping them in one app keeps the project layout boring; there's
not enough surface here to justify a 'web' vs 'api' split.
'''

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('slideshows.urls')),
]

# Local-dev media serving. In production, MEDIA_URL points at Spaces and
# Django never serves uploads itself.
if settings.DEBUG and not getattr(settings, 'AWS_STORAGE_BUCKET_NAME', None):
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
