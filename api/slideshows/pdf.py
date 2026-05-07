'''Server-side PDF render: branded walkthrough document.

Pure data in, bytes out. Mirrors mp4.py's shape so the Celery task in
unit 4 can call both modules with the same conventions.

Layout: cover page (title + summary + credit), one page per slide
(title eyebrow + image + caption), end card (share URL + brand).
A4 portrait, system fonts (Helvetica/Arial fallbacks). Images are
embedded as base64 data URLs at template-render time so the PDF has
no network dependencies during render — keeps the worker-side
behavior deterministic and the test suite self-contained.

For video-kind slides the caller is responsible for handing in a
still frame in ``image_bytes`` (e.g. via ffmpeg). When that is empty
the slide page renders a "view at <share_url>" placeholder rather
than a missing-image box.

Caller responsibility:
- Provide slides in playback order.
- Provide ``share_url`` so the cover and end card render the live
  link people land on after closing the PDF.
- Catch ``PDFRenderError`` at the entry point (the Celery task) and
  translate to a retryable failure.
'''

from __future__ import annotations

import base64
import logging
from dataclasses import dataclass, field
from typing import Sequence


logger = logging.getLogger(__name__)


# Reasonable default; some captions on legacy clips are extremely long.
MAX_CAPTION_CHARS = 4000


class PDFRenderError(Exception):
    '''Raised when PDF rendering fails.'''


class PDFRenderConfigError(PDFRenderError):
    '''Operator-fixable: WeasyPrint missing or system libraries unavailable.'''


@dataclass(frozen=True)
class PDFSlideInput:
    '''One slide's PDF render inputs.'''

    image_bytes: bytes  # may be empty for video-kind slides without a still
    image_format: str  # 'png', 'jpeg', 'webp', 'gif'
    media_kind: str  # 'image' | 'video'
    title: str
    caption: str


@dataclass(frozen=True)
class PDFSlideshowInput:
    '''Slideshow-level metadata for cover + end card.'''

    title: str
    summary: str
    description: str
    created_by: str
    created_by_url: str
    share_url: str


@dataclass(frozen=True)
class PDFResult:
    '''Output of ``build_pdf``.'''

    pdf_bytes: bytes
    page_count: int  # cover + N slides + end card


def _data_url(slide: PDFSlideInput) -> str:
    '''Encode the slide's image as a base64 data URL.

    Empty bytes return an empty string; the template branches on
    ``slide.image_data_url`` truthiness for the video placeholder.
    '''
    if not slide.image_bytes:
        return ''
    fmt = slide.image_format.lower().lstrip('.')
    if fmt == 'jpg':
        fmt = 'jpeg'
    encoded = base64.b64encode(slide.image_bytes).decode('ascii')
    return f'data:image/{fmt};base64,{encoded}'


def _truncate(text: str, limit: int = MAX_CAPTION_CHARS) -> str:
    if len(text) <= limit:
        return text
    return text[: limit - 1].rstrip() + '…'


def build_pdf(slideshow: PDFSlideshowInput, slides: Sequence[PDFSlideInput]) -> PDFResult:
    '''Render a branded walkthrough PDF for ``slideshow`` + ``slides``.

    Empty slides is a programming error — caller (the Celery task)
    short-circuits zero-slide slideshows.
    '''
    if not slides:
        raise PDFRenderError('build_pdf called with no slides')

    # Importing inside the function keeps Django startup fast on the API
    # process group (which never renders PDFs) and lets us translate
    # missing system libraries into a clean operator error.
    try:
        from weasyprint import HTML  # type: ignore
    except OSError as exc:
        raise PDFRenderConfigError(
            f'WeasyPrint failed to load native libraries: {exc}. '
            f'The render worker image must apt-install '
            f'libcairo2 + libpango-1.0-0 + libpangoft2-1.0-0 + '
            f'libgdk-pixbuf-2.0-0 + libffi.'
        ) from exc
    except ImportError as exc:
        raise PDFRenderConfigError(
            f'WeasyPrint not installed: {exc}. Add weasyprint to '
            f'api/requirements.txt and rebuild the worker image.'
        ) from exc

    # Local import — Django must be set up before render_to_string runs.
    from django.template.loader import render_to_string

    template_slides = [
        {
            'title': _truncate(s.title, 200),
            'caption': _truncate(s.caption),
            'media_kind': s.media_kind,
            'image_data_url': _data_url(s),
        }
        for s in slides
    ]
    context = {
        'slideshow': {
            'title': slideshow.title,
            'summary': slideshow.summary,
            'description': slideshow.description,
            'created_by': slideshow.created_by,
            'created_by_url': slideshow.created_by_url,
            'share_url': slideshow.share_url,
        },
        'slides': template_slides,
    }

    try:
        html_string = render_to_string('pdf/walkthrough.html', context)
    except Exception as exc:  # noqa: BLE001
        raise PDFRenderError(f'template render failed: {exc}') from exc

    try:
        pdf_bytes = HTML(string=html_string).write_pdf()
    except Exception as exc:  # noqa: BLE001
        raise PDFRenderError(f'WeasyPrint write_pdf failed: {exc}') from exc

    if not pdf_bytes or not pdf_bytes.startswith(b'%PDF'):
        raise PDFRenderError('WeasyPrint returned non-PDF bytes')

    return PDFResult(
        pdf_bytes=pdf_bytes,
        page_count=2 + len(slides),  # cover + per-slide + end card
    )
