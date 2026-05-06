'''Django admin registration for slideshows and slides.

The admin is the operator UI for v1 (no public account flow yet),
so the lists need to surface the fields someone actually triages
on: title, slide count, when it was created, and which IP created
it. write_token is *not* in any list view; redacting it from the
default change-form via readonly_fields keeps it from getting
copied accidentally during an admin session.
'''

from __future__ import annotations

from django.contrib import admin
from django.utils.html import format_html
from unfold.admin import ModelAdmin, TabularInline

from .models import Slide, Slideshow


class SlideInline(TabularInline):
    model = Slide
    extra = 0
    fields = ('position', 'caption', 'media', 'media_kind', 'created_at')
    readonly_fields = ('media_kind', 'created_at')
    ordering = ('position',)


@admin.register(Slideshow)
class SlideshowAdmin(ModelAdmin):
    list_display = (
        'title_or_id',
        'is_gallery',
        'gallery_position',
        'slide_count',
        'created_at',
        'created_ip',
        'view_link',
    )
    # Inline-editable from the changelist so curating the gallery is a
    # one-click flip; no need to drill into each slideshow.
    list_editable = ('is_gallery', 'gallery_position')
    list_filter = ('is_gallery', 'created_at')
    search_fields = ('title', 'description', 'summary', 'id', 'share_token')
    date_hierarchy = 'created_at'
    ordering = ('-created_at',)

    readonly_fields = (
        'id',
        'share_token',
        'write_token',
        'created_at',
        'updated_at',
        'created_ip',
        'view_link',
    )
    fieldsets = (
        (None, {'fields': ('title', 'description', 'summary')}),
        (
            'Creator credit',
            {'fields': ('created_by', 'created_by_url')},
        ),
        (
            'Gallery curation',
            {
                'fields': ('is_gallery', 'gallery_position'),
                'description': (
                    'Flip is_gallery=True to surface this clip on the '
                    'home-page gallery. gallery_position controls sort '
                    'order (ascending; ties broken by -created_at).'
                ),
            },
        ),
        (
            'Tokens (read-only)',
            {
                'classes': ('collapse',),
                'fields': ('id', 'share_token', 'write_token'),
                'description': (
                    'write_token is a credential. Treat it the same as a '
                    'password and avoid copying it from this view unless '
                    'you have a specific reason.'
                ),
            },
        ),
        ('Audit', {'fields': ('created_at', 'updated_at', 'created_ip', 'view_link')}),
    )
    inlines = [SlideInline]

    @admin.display(description='title', ordering='title')
    def title_or_id(self, obj: Slideshow) -> str:
        return obj.title or f'(untitled) {obj.id}'

    @admin.display(description='slides')
    def slide_count(self, obj: Slideshow) -> int:
        return obj.slides.count()

    @admin.display(description='public viewer')
    def view_link(self, obj: Slideshow) -> str:
        # Hardcoded path: the public viewer now lives in the Next.js web/
        # service and isn't part of Django's URL conf. The path shape
        # (`/s/<share_token>/`) matches what web/app/s/[token]/page.tsx
        # serves in production.
        url = f'/s/{obj.share_token}/'
        return format_html('<a href="{}" target="_blank">{}</a>', url, url)


@admin.register(Slide)
class SlideAdmin(ModelAdmin):
    list_display = ('slideshow', 'position', 'caption_short', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('caption', 'slideshow__title')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at')

    @admin.display(description='caption')
    def caption_short(self, obj: Slide) -> str:
        return (obj.caption[:80] + '...') if len(obj.caption) > 80 else obj.caption
