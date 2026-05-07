'''Celery tasks for render artifact generation.

Two tasks: ``render_clip_mp4`` and ``render_clip_pdf``. Each loads a
slideshow + ordered slides, calls the matching pure render module
(``slideshows.mp4`` / ``slideshows.pdf``), and persists the resulting
bytes onto the Slideshow row's FileField.

Each task records the ``render_version`` at entry and re-checks it
before saving — if it moved during the render (concurrent edit), the
output is dropped silently and the new edit's enqueue produces the
fresh artifact. This is the safety net for the bursty-edit case
where a user is iterating in the edit page while a render is in
flight.

Failures: transient subprocess / WeasyPrint errors raise
``MP4RenderError`` / ``PDFRenderError`` and Celery's autoretry kicks
in with exponential backoff (3 attempts). Config errors
(``MP4RenderConfigError`` / ``PDFRenderConfigError``) signal an
operator misconfiguration (missing ffmpeg, missing system libs) and
are NOT retried — those need a deploy fix, not a retry.
'''

from __future__ import annotations

import logging
from pathlib import Path

from celery import shared_task
from django.core.files.base import ContentFile

from .models import Slideshow
from .mp4 import (
    MP4RenderConfigError,
    MP4RenderError,
    SlideInput,
    build_mp4,
    extract_poster,
)
from .pdf import (
    PDFRenderConfigError,
    PDFRenderError,
    PDFSlideInput,
    PDFSlideshowInput,
    build_pdf,
)


logger = logging.getLogger(__name__)


def _read_field(field) -> bytes:
    '''Read a Django FileField's bytes through the configured storage.'''
    if not field:
        return b''
    fh = field.open('rb')
    try:
        return fh.read()
    finally:
        fh.close()


def _public_share_url(slideshow: Slideshow) -> str:
    '''Build a public share URL for cover/end-card embedding.

    Uses ``AGENTCLIP_PUBLIC_BASE_URL`` when set (prod), falls back to
    a sensible localhost default in dev.
    '''
    import os
    base = os.environ.get('AGENTCLIP_PUBLIC_BASE_URL', 'http://localhost:3030')
    return f'{base.rstrip("/")}/s/{slideshow.share_token}'


@shared_task(
    name='slideshows.render_clip_mp4',
    autoretry_for=(MP4RenderError,),
    retry_backoff=True,
    retry_backoff_max=300,
    retry_jitter=True,
    max_retries=3,
)
def render_clip_mp4(slideshow_id: str) -> dict:
    '''Render the MP4 artifact for a slideshow + persist to FileField.'''
    slideshow = Slideshow.objects.filter(pk=slideshow_id).first()
    if not slideshow:
        logger.warning('render_clip_mp4: slideshow %s vanished', slideshow_id)
        return {'status': 'missing'}

    pre_render_version = slideshow.render_version
    slides = list(slideshow.slides.order_by('position').all())
    if not slides:
        logger.info('render_clip_mp4: %s has no slides; skipping', slideshow_id)
        return {'status': 'no_slides'}

    inputs: list[SlideInput] = []
    poster_source: bytes = b''
    for slide in slides:
        media_bytes = _read_field(slide.media)
        audio_bytes = _read_field(slide.audio) if slide.audio else b''
        inputs.append(
            SlideInput(
                media_bytes=media_bytes,
                media_kind=slide.media_kind,
                media_filename=Path(slide.media.name or 'slide').name,
                audio_bytes=audio_bytes or None,
                audio_duration_ms=slide.audio_duration_ms,
            )
        )
        # First image-kind slide drives the poster.
        if not poster_source and slide.media_kind == 'image':
            poster_source = media_bytes

    try:
        result = build_mp4(inputs)
    except MP4RenderConfigError:
        # Operator-fixable; don't retry.
        logger.exception('render_clip_mp4: config error on %s', slideshow_id)
        raise
    # MP4RenderError caught by autoretry_for above.

    # Race recheck: if the slideshow mutated during the render the
    # bytes we have are stale. Drop them and let the new edit's
    # enqueue re-render. Re-fetch a fresh row to compare.
    fresh = Slideshow.objects.filter(pk=slideshow_id).only('render_version').first()
    if not fresh or fresh.render_version != pre_render_version:
        logger.info(
            'render_clip_mp4: version moved on %s (%s -> %s); discarding output',
            slideshow_id,
            pre_render_version,
            fresh.render_version if fresh else None,
        )
        return {'status': 'stale'}

    slideshow.refresh_from_db()
    slideshow.rendered_mp4.save(
        'clip.mp4',
        ContentFile(result.mp4_bytes),
        save=False,
    )
    if poster_source:
        try:
            poster_bytes = extract_poster(poster_source)
            slideshow.poster_image.save(
                'poster.jpg',
                ContentFile(poster_bytes),
                save=False,
            )
        except MP4RenderError:
            # Poster failure is non-fatal — the MP4 is the load-bearing
            # artifact. Log and continue.
            logger.exception('render_clip_mp4: poster extraction failed for %s', slideshow_id)
    slideshow.save(update_fields=['rendered_mp4', 'poster_image', 'updated_at'])

    return {
        'status': 'ok',
        'duration_ms': result.duration_ms,
        'segments': result.segment_count,
    }


@shared_task(
    name='slideshows.render_clip_pdf',
    autoretry_for=(PDFRenderError,),
    retry_backoff=True,
    retry_backoff_max=300,
    retry_jitter=True,
    max_retries=3,
)
def render_clip_pdf(slideshow_id: str) -> dict:
    '''Render the branded PDF walkthrough + persist to FileField.'''
    slideshow = Slideshow.objects.filter(pk=slideshow_id).first()
    if not slideshow:
        logger.warning('render_clip_pdf: slideshow %s vanished', slideshow_id)
        return {'status': 'missing'}

    pre_render_version = slideshow.render_version
    slides = list(slideshow.slides.order_by('position').all())
    if not slides:
        logger.info('render_clip_pdf: %s has no slides; skipping', slideshow_id)
        return {'status': 'no_slides'}

    pdf_inputs: list[PDFSlideInput] = []
    for slide in slides:
        media_bytes = _read_field(slide.media)
        # PDF only embeds images. For video-kind slides without a still,
        # we hand in empty bytes and the template renders a placeholder.
        image_bytes = media_bytes if slide.media_kind == 'image' else b''
        # Derive image format from the filename extension; default png.
        ext = Path(slide.media.name or 'slide.png').suffix.lstrip('.').lower()
        if not ext or ext not in {'png', 'jpeg', 'jpg', 'gif', 'webp'}:
            ext = 'png'
        pdf_inputs.append(
            PDFSlideInput(
                image_bytes=image_bytes,
                image_format=ext,
                media_kind=slide.media_kind,
                title=slide.title or '',
                caption=slide.caption,
            )
        )

    pdf_show = PDFSlideshowInput(
        title=slideshow.title or '',
        summary=slideshow.summary or '',
        description=slideshow.description or '',
        created_by=slideshow.created_by or '',
        created_by_url=slideshow.created_by_url or '',
        share_url=_public_share_url(slideshow),
    )

    try:
        result = build_pdf(pdf_show, pdf_inputs)
    except PDFRenderConfigError:
        logger.exception('render_clip_pdf: config error on %s', slideshow_id)
        raise

    fresh = Slideshow.objects.filter(pk=slideshow_id).only('render_version').first()
    if not fresh or fresh.render_version != pre_render_version:
        logger.info(
            'render_clip_pdf: version moved on %s (%s -> %s); discarding output',
            slideshow_id,
            pre_render_version,
            fresh.render_version if fresh else None,
        )
        return {'status': 'stale'}

    slideshow.refresh_from_db()
    slideshow.rendered_pdf.save(
        'walkthrough.pdf',
        ContentFile(result.pdf_bytes),
        save=False,
    )
    slideshow.save(update_fields=['rendered_pdf', 'updated_at'])

    return {
        'status': 'ok',
        'page_count': result.page_count,
    }
