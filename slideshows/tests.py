'''Integration tests for the slideshow API.

Uses Django's test client through DRF's APIClient because we want
the full request path (URL routing, auth class, parser, ratelimit
decorators) to fire — not the view function in isolation. The wire
contract these endpoints expose is the contract the SDK depends on,
so the tests assert on response shapes the SDK actually parses.

Rate-limit tests override the in-memory cache to make limits
predictable per-test; without that override the limit state would
leak between tests via the default LocMemCache.
'''

from __future__ import annotations

import io

from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from PIL import Image
from rest_framework.test import APIClient

from slideshows.models import Slide, Slideshow


def _png_bytes(color: str = 'red') -> bytes:
    '''Smallest valid PNG. Real bytes so ImageField/FileField are happy.'''
    buf = io.BytesIO()
    Image.new('RGB', (8, 8), color).save(buf, format='PNG')
    return buf.getvalue()


def _png_upload(name: str = 'shot.png', color: str = 'red') -> SimpleUploadedFile:
    return SimpleUploadedFile(name, _png_bytes(color), content_type='image/png')


def _gif_bytes(color: str = 'red') -> bytes:
    buf = io.BytesIO()
    Image.new('RGB', (8, 8), color).save(buf, format='GIF')
    return buf.getvalue()


def _gif_upload(name: str = 'clip.gif') -> SimpleUploadedFile:
    return SimpleUploadedFile(name, _gif_bytes(), content_type='image/gif')


def _mp4_upload(name: str = 'clip.mp4') -> SimpleUploadedFile:
    '''A handful of bytes labeled video/mp4. Sufficient to exercise the
    content-type sniffing path; we don't validate video stream contents
    server-side, browsers do.'''
    return SimpleUploadedFile(name, b'\x00\x00\x00\x18ftypisom' + b'\x00' * 32, content_type='video/mp4')


@override_settings(
    CACHES={'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}}
)
class SlideshowAPITests(TestCase):
    def setUp(self) -> None:
        cache.clear()
        self.client = APIClient()

    # ----- POST /api/slideshow/ -----

    def test_create_returns_id_share_url_write_token(self):
        response = self.client.post(
            '/api/slideshow/',
            {'title': 'Signup QA', 'description': 'walking through signup'},
            format='json',
        )
        self.assertEqual(response.status_code, 201)
        body = response.json()
        # The SDK depends on these three keys verbatim.
        self.assertIn('id', body)
        self.assertIn('share_url', body)
        self.assertIn('write_token', body)
        self.assertTrue(body['share_url'].endswith('/'))
        self.assertEqual(len(body['write_token']), 32)

    def test_create_with_no_body_succeeds(self):
        response = self.client.post('/api/slideshow/', {}, format='json')
        self.assertEqual(response.status_code, 201)

    def test_create_records_client_ip(self):
        self.client.post(
            '/api/slideshow/',
            {'title': 'forensics test'},
            format='json',
            REMOTE_ADDR='198.51.100.7',
        )
        slideshow = Slideshow.objects.get(title='forensics test')
        self.assertEqual(slideshow.created_ip, '198.51.100.7')

    def test_create_honors_x_forwarded_for(self):
        '''DO App Platform sets X-Forwarded-For; REMOTE_ADDR alone is the proxy.'''
        self.client.post(
            '/api/slideshow/',
            {'title': 'forwarded'},
            format='json',
            HTTP_X_FORWARDED_FOR='203.0.113.42, 10.0.0.1',
            REMOTE_ADDR='10.0.0.1',
        )
        slideshow = Slideshow.objects.get(title='forwarded')
        self.assertEqual(slideshow.created_ip, '203.0.113.42')

    # ----- POST /api/slideshow/<id>/slides/ -----

    def test_add_slide_with_valid_token_succeeds(self):
        show = Slideshow.objects.create(title='show')
        response = self.client.post(
            f'/api/slideshow/{show.id}/slides/',
            {'media': _png_upload(), 'caption': 'first'},
            format='multipart',
            HTTP_AUTHORIZATION=f'Bearer {show.write_token}',
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()['position'], 1)

    def test_add_slide_assigns_sequential_positions(self):
        show = Slideshow.objects.create(title='show')
        for n in range(1, 4):
            response = self.client.post(
                f'/api/slideshow/{show.id}/slides/',
                {'media': _png_upload(f'shot{n}.png'), 'caption': f'slide {n}'},
                format='multipart',
                HTTP_AUTHORIZATION=f'Bearer {show.write_token}',
            )
            self.assertEqual(response.status_code, 201)
            self.assertEqual(response.json()['position'], n)

    def test_add_slide_without_auth_returns_401(self):
        show = Slideshow.objects.create(title='show')
        response = self.client.post(
            f'/api/slideshow/{show.id}/slides/',
            {'media': _png_upload(), 'caption': 'x'},
            format='multipart',
        )
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response['WWW-Authenticate'], 'Bearer')

    def test_add_slide_with_bad_token_returns_401(self):
        show = Slideshow.objects.create(title='show')
        response = self.client.post(
            f'/api/slideshow/{show.id}/slides/',
            {'media': _png_upload(), 'caption': 'x'},
            format='multipart',
            HTTP_AUTHORIZATION='Bearer wrong-token',
        )
        self.assertEqual(response.status_code, 401)

    def test_add_slide_with_missing_image_returns_400(self):
        show = Slideshow.objects.create(title='show')
        response = self.client.post(
            f'/api/slideshow/{show.id}/slides/',
            {'caption': 'no image'},
            format='multipart',
            HTTP_AUTHORIZATION=f'Bearer {show.write_token}',
        )
        self.assertEqual(response.status_code, 400)

    def test_add_slide_for_nonexistent_slideshow_returns_404(self):
        response = self.client.post(
            '/api/slideshow/00000000-0000-0000-0000-000000000000/slides/',
            {'media': _png_upload(), 'caption': 'x'},
            format='multipart',
            HTTP_AUTHORIZATION='Bearer anything',
        )
        self.assertEqual(response.status_code, 404)

    def test_add_slide_with_other_slideshows_token_returns_401(self):
        '''Token from slideshow A must not authorize mutations on slideshow B.'''
        a = Slideshow.objects.create(title='A')
        b = Slideshow.objects.create(title='B')
        response = self.client.post(
            f'/api/slideshow/{b.id}/slides/',
            {'media': _png_upload(), 'caption': 'x'},
            format='multipart',
            HTTP_AUTHORIZATION=f'Bearer {a.write_token}',
        )
        self.assertEqual(response.status_code, 401)

    # ----- PATCH /api/slideshow/<id>/slides/<position>/ -----

    def test_update_slide_caption_only(self):
        show = Slideshow.objects.create(title='show')
        slide = Slide.objects.create(
            slideshow=show, position=1, media=_png_upload(), caption='old'
        )
        response = self.client.patch(
            f'/api/slideshow/{show.id}/slides/1/',
            {'caption': 'new'},
            format='json',
            HTTP_AUTHORIZATION=f'Bearer {show.write_token}',
        )
        self.assertEqual(response.status_code, 200)
        slide.refresh_from_db()
        self.assertEqual(slide.caption, 'new')

    def test_update_slide_with_bad_position_returns_404(self):
        show = Slideshow.objects.create(title='show')
        response = self.client.patch(
            f'/api/slideshow/{show.id}/slides/99/',
            {'caption': 'new'},
            format='json',
            HTTP_AUTHORIZATION=f'Bearer {show.write_token}',
        )
        self.assertEqual(response.status_code, 404)

    # ----- PATCH /api/slideshow/<id>/ -----

    def test_set_summary(self):
        show = Slideshow.objects.create(title='show')
        response = self.client.patch(
            f'/api/slideshow/{show.id}/',
            {'summary': 'wrap up'},
            format='json',
            HTTP_AUTHORIZATION=f'Bearer {show.write_token}',
        )
        self.assertEqual(response.status_code, 200)
        show.refresh_from_db()
        self.assertEqual(show.summary, 'wrap up')

    # ----- creator credit (created_by / created_by_url) -----

    def test_create_with_created_by_returns_credit_in_response(self):
        '''SDK depends on these field names; do not change without updating qagent.'''
        response = self.client.post(
            '/api/slideshow/',
            {
                'title': 'credited',
                'created_by': 'Eric Elizes',
                'created_by_url': 'https://elizes.dev',
            },
            format='json',
        )
        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertEqual(body['created_by'], 'Eric Elizes')
        self.assertEqual(body['created_by_url'], 'https://elizes.dev')

    def test_create_without_credit_persists_empty_strings(self):
        '''Default values are empty strings, not NULL, so template logic stays simple.'''
        response = self.client.post('/api/slideshow/', {'title': 'no credit'}, format='json')
        self.assertEqual(response.status_code, 201)
        slideshow = Slideshow.objects.get(title='no credit')
        self.assertEqual(slideshow.created_by, '')
        self.assertEqual(slideshow.created_by_url, '')

    def test_patch_can_update_created_by(self):
        show = Slideshow.objects.create(title='show', created_by='Old Name')
        response = self.client.patch(
            f'/api/slideshow/{show.id}/',
            {'created_by': 'New Name', 'created_by_url': 'https://new.example'},
            format='json',
            HTTP_AUTHORIZATION=f'Bearer {show.write_token}',
        )
        self.assertEqual(response.status_code, 200)
        show.refresh_from_db()
        self.assertEqual(show.created_by, 'New Name')
        self.assertEqual(show.created_by_url, 'https://new.example')

    def test_patch_with_malformed_url_returns_400(self):
        show = Slideshow.objects.create(title='show')
        response = self.client.patch(
            f'/api/slideshow/{show.id}/',
            {'created_by_url': 'not-a-real-url'},
            format='json',
            HTTP_AUTHORIZATION=f'Bearer {show.write_token}',
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('created_by_url', response.json())

    def test_create_rejects_overlong_created_by(self):
        response = self.client.post(
            '/api/slideshow/',
            {'title': 'x', 'created_by': 'a' * 101},
            format='json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('created_by', response.json())

    def test_patch_slideshow_can_update_title_and_description(self):
        show = Slideshow.objects.create(title='show', description='old')
        self.client.patch(
            f'/api/slideshow/{show.id}/',
            {'title': 'new title', 'description': 'new desc'},
            format='json',
            HTTP_AUTHORIZATION=f'Bearer {show.write_token}',
        )
        show.refresh_from_db()
        self.assertEqual(show.title, 'new title')
        self.assertEqual(show.description, 'new desc')

    # ----- media kind detection -----

    def test_add_slide_classifies_png_as_image(self):
        show = Slideshow.objects.create(title='show')
        response = self.client.post(
            f'/api/slideshow/{show.id}/slides/',
            {'media': _png_upload(), 'caption': 'png'},
            format='multipart',
            HTTP_AUTHORIZATION=f'Bearer {show.write_token}',
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()['media_kind'], 'image')

    def test_add_slide_classifies_gif_as_image(self):
        '''GIFs animate natively in the viewer; they are still classified as
        image so the template renders them in an <img> tag.'''
        show = Slideshow.objects.create(title='show')
        response = self.client.post(
            f'/api/slideshow/{show.id}/slides/',
            {'media': _gif_upload(), 'caption': 'gif'},
            format='multipart',
            HTTP_AUTHORIZATION=f'Bearer {show.write_token}',
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()['media_kind'], 'image')

    def test_add_slide_classifies_mp4_as_video(self):
        show = Slideshow.objects.create(title='show')
        response = self.client.post(
            f'/api/slideshow/{show.id}/slides/',
            {'media': _mp4_upload(), 'caption': 'video clip'},
            format='multipart',
            HTTP_AUTHORIZATION=f'Bearer {show.write_token}',
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()['media_kind'], 'video')

    def test_add_slide_rejects_unsupported_mime(self):
        show = Slideshow.objects.create(title='show')
        bad = SimpleUploadedFile('x.zip', b'PK\x03\x04not-a-real-zip', content_type='application/zip')
        response = self.client.post(
            f'/api/slideshow/{show.id}/slides/',
            {'media': bad, 'caption': 'x'},
            format='multipart',
            HTTP_AUTHORIZATION=f'Bearer {show.write_token}',
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('media', response.json())

    def test_viewer_renders_video_tag_for_video_slide(self):
        show = Slideshow.objects.create(title='video show')
        # POST through the API so media_kind is set by the validator path.
        self.client.post(
            f'/api/slideshow/{show.id}/slides/',
            {'media': _mp4_upload(), 'caption': 'a clip'},
            format='multipart',
            HTTP_AUTHORIZATION=f'Bearer {show.write_token}',
        )
        response = self.client.get(f'/s/{show.share_token}/')
        body = response.content.decode()
        self.assertIn('<video', body)
        self.assertNotIn('<img src="/media/slideshows/', body)


@override_settings(
    CACHES={'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}}
)
class RateLimitTests(TestCase):
    def setUp(self) -> None:
        cache.clear()
        self.client = APIClient()

    def test_create_rate_limit_eventually_returns_429(self):
        '''20/h on the create endpoint; 21st call from same IP gets 429.'''
        for n in range(20):
            r = self.client.post('/api/slideshow/', {'title': f'r{n}'}, format='json')
            self.assertEqual(r.status_code, 201, msg=f'request {n} should pass')
        r = self.client.post('/api/slideshow/', {'title': 'over'}, format='json')
        self.assertEqual(r.status_code, 429)


class PublicViewerTests(TestCase):
    def test_viewer_renders_slideshow_by_share_token(self):
        show = Slideshow.objects.create(title='Public test', summary='everything passed')
        Slide.objects.create(
            slideshow=show, position=1, media=_png_upload(), caption='one'
        )
        response = self.client.get(f'/s/{show.share_token}/')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Public test')
        self.assertContains(response, 'everything passed')

    def test_viewer_unknown_token_returns_404(self):
        response = self.client.get('/s/does-not-exist/')
        self.assertEqual(response.status_code, 404)

    def test_home_renders(self):
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'agentclip')

    def test_share_token_does_not_leak_write_token(self):
        '''The viewer must never put write_token into the rendered page.'''
        show = Slideshow.objects.create(title='leaktest')
        response = self.client.get(f'/s/{show.share_token}/')
        self.assertNotIn(show.write_token, response.content.decode())
