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

from slideshows.models import MediaKind, Slide, Slideshow


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

    def test_video_slide_round_trip_through_api(self):
        '''Posting a video upload yields a Slide with media_kind=video.

        The old assertion was that the Django template viewer rendered a
        <video> tag; the viewer moved to web/ in the monorepo pivot, so
        this now verifies the API contract itself: media_kind is set
        correctly so web/ can branch on it during render.
        '''
        show = Slideshow.objects.create(title='video show')
        response = self.client.post(
            f'/api/slideshow/{show.id}/slides/',
            {'media': _mp4_upload(), 'caption': 'a clip'},
            format='multipart',
            HTTP_AUTHORIZATION=f'Bearer {show.write_token}',
        )
        self.assertEqual(response.status_code, 201)
        slide = show.slides.get(position=1)
        self.assertEqual(slide.media_kind, MediaKind.VIDEO)
        self.assertEqual(slide.media_content_type, 'video/mp4')


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


class GalleryEndpointTests(TestCase):
    '''Cover the read-only GET /api/v1/gallery/ endpoint.

    Replaces the old PublicViewerTests that lived here when Django
    rendered HTML. The viewer + home page now live in the Next.js
    web/ service; the API exposes a curated gallery feed instead.
    '''

    URL = '/api/v1/gallery/'

    def test_returns_only_gallery_flagged_slideshows(self):
        in_gallery = Slideshow.objects.create(
            title='in', is_gallery=True, gallery_position=1,
        )
        Slideshow.objects.create(title='hidden', is_gallery=False)

        response = self.client.get(self.URL)
        self.assertEqual(response.status_code, 200)
        ids = [item['id'] for item in response.json()]
        self.assertIn(str(in_gallery.id), ids)
        self.assertEqual(len(ids), 1)

    def test_orders_by_gallery_position_then_recency(self):
        # Same position; newer should win the tiebreak.
        old = Slideshow.objects.create(
            title='old', is_gallery=True, gallery_position=1,
        )
        new = Slideshow.objects.create(
            title='new', is_gallery=True, gallery_position=1,
        )
        # Different position; lower wins outright.
        first = Slideshow.objects.create(
            title='first', is_gallery=True, gallery_position=0,
        )

        response = self.client.get(self.URL)
        ids = [item['id'] for item in response.json()]
        # gallery_position=0 → first; then position=1 ties resolve to
        # newer (`new`) before older (`old`).
        self.assertEqual(
            ids,
            [str(first.id), str(new.id), str(old.id)],
        )

    def test_empty_gallery_returns_empty_list(self):
        Slideshow.objects.create(title='hidden', is_gallery=False)

        response = self.client.get(self.URL)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])

    def test_response_omits_internal_fields(self):
        Slideshow.objects.create(
            title='leaktest', is_gallery=True, gallery_position=1,
        )

        response = self.client.get(self.URL)
        item = response.json()[0]
        # write_token, gallery_position, is_gallery, created_ip, summary
        # are all internal and must never reach the public payload.
        for forbidden in ('write_token', 'gallery_position', 'is_gallery', 'created_ip', 'summary'):
            self.assertNotIn(forbidden, item, msg=f'leaked {forbidden}')

    def test_endpoint_is_publicly_accessible(self):
        '''No auth header required — gallery is unauthenticated.'''
        response = self.client.get(self.URL)
        self.assertEqual(response.status_code, 200)

    def test_unknown_token_no_longer_routes(self):
        '''The old /s/<share_token>/ template route was removed; assert
        Django returns 404 (not 500 or template lookup error) so we don't
        regress the route deletion.'''
        response = self.client.get('/s/does-not-exist/')
        self.assertEqual(response.status_code, 404)


class SeedGalleryTests(TestCase):
    '''Cover the seed_gallery management command.

    The command runs in the production environment to populate the
    home-page gallery; we verify behavior here so a misconfiguration
    surfaces in CI rather than mid-deploy.
    '''

    def test_seed_gallery_creates_five_slideshows(self):
        from io import StringIO
        from django.core.management import call_command

        out = StringIO()
        call_command('seed_gallery', stdout=out)

        # 5 demo clips, regardless of whether fixture images are present.
        self.assertEqual(Slideshow.objects.count(), 5)

        # All seed clips carry the AgentClip credit pair so the gallery
        # links back to the project on every card.
        for slideshow in Slideshow.objects.all():
            self.assertEqual(slideshow.created_by, 'AgentClip')
            self.assertEqual(
                slideshow.created_by_url,
                'https://github.com/ericelizes/agentclip',
            )

    def test_seed_gallery_marks_all_rows_as_gallery_with_sequential_positions(self):
        '''Every seeded row lands on the home page immediately, with a
        deterministic display order.'''
        from django.core.management import call_command

        call_command('seed_gallery')

        gallery_rows = list(
            Slideshow.objects.order_by('gallery_position').values_list(
                'is_gallery', 'gallery_position',
            )
        )
        self.assertEqual(len(gallery_rows), 5)
        # Every row is gallery=True with positions 1..5.
        self.assertTrue(all(is_gallery for is_gallery, _ in gallery_rows))
        self.assertEqual(
            [pos for _, pos in gallery_rows],
            [1, 2, 3, 4, 5],
        )

    def test_seeded_rows_appear_in_gallery_endpoint(self):
        '''End-to-end: seed → endpoint shows the rows in position order.'''
        from django.core.management import call_command

        call_command('seed_gallery')

        response = self.client.get('/api/v1/gallery/')
        self.assertEqual(response.status_code, 200)
        # All 5 demos surface (default queryset cap is 12).
        self.assertEqual(len(response.json()), 5)
