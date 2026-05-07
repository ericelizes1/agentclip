'''Tests for the pure PDF render module.

Synthetic inputs only — Pillow generates tiny PNGs at setup time.
WeasyPrint is required; if its native libs aren't installed locally
the test imports raise OSError and the test class skips cleanly.
'''

from __future__ import annotations

import io
import unittest
from unittest import mock

from django.test import TestCase
from PIL import Image

from slideshows import pdf


def _png_bytes(color: str = 'red') -> bytes:
    buf = io.BytesIO()
    Image.new('RGB', (320, 200), color).save(buf, format='PNG')
    return buf.getvalue()


def _slideshow(**overrides) -> pdf.PDFSlideshowInput:
    return pdf.PDFSlideshowInput(
        title=overrides.get('title', 'Login bug repro'),
        summary=overrides.get('summary', 'Reproduces the rate-limit 503 on signup retry.'),
        description=overrides.get('description', ''),
        created_by=overrides.get('created_by', 'Eric Elizes'),
        created_by_url=overrides.get('created_by_url', 'https://github.com/ericelizes1'),
        share_url=overrides.get('share_url', 'https://agentclip.dev/s/abc123'),
    )


def _slide(**overrides) -> pdf.PDFSlideInput:
    return pdf.PDFSlideInput(
        image_bytes=overrides.get('image_bytes', _png_bytes()),
        image_format=overrides.get('image_format', 'png'),
        media_kind=overrides.get('media_kind', 'image'),
        title=overrides.get('title', 'Step 1'),
        caption=overrides.get('caption', 'Click the signup button.'),
    )


def _weasyprint_available() -> bool:
    try:
        from weasyprint import HTML  # noqa: F401
    except (ImportError, OSError):
        return False
    return True


def _pdf_text(pdf_bytes: bytes) -> str:
    '''Extract concatenated text content from a PDF for assertion use.'''
    try:
        from pypdf import PdfReader
    except ImportError:
        raise unittest.SkipTest('pypdf not installed')
    reader = PdfReader(io.BytesIO(pdf_bytes))
    return '\n'.join(page.extract_text() or '' for page in reader.pages)


@unittest.skipUnless(_weasyprint_available(), 'weasyprint not installed locally')
class BuildPDFTests(TestCase):
    def test_two_slides_produces_valid_pdf(self) -> None:
        result = pdf.build_pdf(
            _slideshow(),
            [
                _slide(title='Step 1', caption='Click signup.'),
                _slide(title='Step 2', caption='See the error.'),
            ],
        )
        self.assertGreater(len(result.pdf_bytes), 0)
        self.assertTrue(result.pdf_bytes.startswith(b'%PDF'))
        # 2 slides → cover + 2 slides + end card = 4 pages.
        self.assertEqual(result.page_count, 4)

    def test_pdf_includes_title_and_share_url_text(self) -> None:
        result = pdf.build_pdf(
            _slideshow(title='unique-cover-title-string'),
            [_slide(caption='unique-caption-string-aaa')],
        )
        text = _pdf_text(result.pdf_bytes)
        self.assertIn('unique-cover-title-string', text)
        self.assertIn('unique-caption-string-aaa', text)
        self.assertIn('agentclip.dev/s/abc123', text)

    def test_slideshow_without_summary_renders_cleanly(self) -> None:
        # Empty summary should not render the summary block at all.
        result = pdf.build_pdf(
            _slideshow(summary=''),
            [_slide()],
        )
        self.assertGreater(len(result.pdf_bytes), 0)
        self.assertTrue(result.pdf_bytes.startswith(b'%PDF'))

    def test_caption_with_html_special_chars_is_escaped(self) -> None:
        # Auto-escape should prevent <script> etc. from breaking the layout
        # or injecting into the PDF — the literal characters should appear
        # as caption text, not as parsed HTML.
        result = pdf.build_pdf(
            _slideshow(),
            [_slide(caption='<script>alert(1)</script> & more')],
        )
        text = _pdf_text(result.pdf_bytes)
        # The literal < and > round-trip through the layout because Django
        # auto-escapes them to &lt;/&gt; and WeasyPrint renders them back.
        self.assertIn('<script>', text)
        self.assertIn('& more', text)

    def test_video_kind_slide_without_still_renders_placeholder(self) -> None:
        result = pdf.build_pdf(
            _slideshow(),
            [_slide(image_bytes=b'', media_kind='video', caption='Video clip')],
        )
        text = _pdf_text(result.pdf_bytes).lower()
        # Placeholder text appears alongside the share URL.
        self.assertIn('video clip', text)
        self.assertIn('agentclip.dev', text)

    def test_extremely_long_caption_truncated(self) -> None:
        long_caption = 'x' * (pdf.MAX_CAPTION_CHARS + 500)
        result = pdf.build_pdf(_slideshow(), [_slide(caption=long_caption)])
        self.assertTrue(result.pdf_bytes.startswith(b'%PDF'))

    def test_single_slide_page_count(self) -> None:
        result = pdf.build_pdf(_slideshow(), [_slide()])
        self.assertEqual(result.page_count, 3)

    def test_empty_slides_raises(self) -> None:
        with self.assertRaises(pdf.PDFRenderError):
            pdf.build_pdf(_slideshow(), [])

    def test_image_format_jpg_normalized_to_jpeg(self) -> None:
        # 'jpg' is invalid in image/<mime>; build_pdf normalizes to 'jpeg'.
        # Smoke check: render does not error and produces valid PDF.
        jpeg_bytes = _png_bytes()  # PNG bytes work as a content payload here
        result = pdf.build_pdf(
            _slideshow(),
            [_slide(image_bytes=jpeg_bytes, image_format='jpg')],
        )
        self.assertTrue(result.pdf_bytes.startswith(b'%PDF'))


class ConfigErrorTests(TestCase):
    def test_missing_weasyprint_raises_config_error(self) -> None:
        # Patch out the in-function import. The real import happens
        # inside build_pdf so we patch sys.modules to make 'weasyprint'
        # raise on import.
        import sys
        with mock.patch.dict(sys.modules, {'weasyprint': None}):
            with self.assertRaises(pdf.PDFRenderConfigError):
                pdf.build_pdf(_slideshow(), [_slide()])
