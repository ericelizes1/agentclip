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
        '''Fly.io sets X-Forwarded-For; REMOTE_ADDR alone is the proxy.'''
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

    def test_delete_slideshow_with_valid_write_token_cascades_slides(self):
        show = Slideshow.objects.create(title='doomed')
        self.client.post(
            f'/api/slideshow/{show.id}/slides/',
            {'media': _png_upload(), 'caption': 'one'},
            format='multipart',
            HTTP_AUTHORIZATION=f'Bearer {show.write_token}',
        )
        self.assertEqual(show.slides.count(), 1)

        response = self.client.delete(
            f'/api/slideshow/{show.id}/',
            HTTP_AUTHORIZATION=f'Bearer {show.write_token}',
        )
        self.assertEqual(response.status_code, 204)
        self.assertFalse(Slideshow.objects.filter(id=show.id).exists())
        self.assertEqual(Slide.objects.filter(slideshow_id=show.id).count(), 0)

    def test_delete_slideshow_without_auth_returns_401(self):
        show = Slideshow.objects.create(title='guarded')
        response = self.client.delete(f'/api/slideshow/{show.id}/')
        self.assertEqual(response.status_code, 401)
        self.assertTrue(Slideshow.objects.filter(id=show.id).exists())

    def test_delete_slideshow_with_wrong_token_returns_401(self):
        show = Slideshow.objects.create(title='other')
        response = self.client.delete(
            f'/api/slideshow/{show.id}/',
            HTTP_AUTHORIZATION='Bearer not-the-real-token',
        )
        self.assertEqual(response.status_code, 401)
        self.assertTrue(Slideshow.objects.filter(id=show.id).exists())

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
                'https://github.com/ericelizes1/agentclip',
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


class AdminSmokeTests(TestCase):
    '''Defensive smoke tests for the django-unfold-themed admin.

    Catch silent regressions: a misconfigured INSTALLED_APPS order or
    missing migration would surface here as a 500 on /admin/ before
    it surfaces in production.
    '''

    @classmethod
    def setUpTestData(cls):
        from django.contrib.auth import get_user_model
        cls.user = get_user_model().objects.create_superuser(
            username='admin', email='admin@example.com', password='pw',
        )

    def setUp(self):
        self.client.force_login(self.user)

    def test_admin_index_renders_with_unfold_theme(self):
        response = self.client.get('/admin/')
        self.assertEqual(response.status_code, 200)
        body = response.content.decode()
        # Unfold injects its own template chrome; confirm the SITE_HEADER
        # we configured shows up. (django-unfold renders SITE_HEADER as
        # the visible top-bar brand on every admin page.)
        self.assertIn('AgentClip', body)

    def test_slideshow_changelist_renders(self):
        response = self.client.get('/admin/slideshows/slideshow/')
        self.assertEqual(response.status_code, 200)

    def test_slide_changelist_renders(self):
        response = self.client.get('/admin/slideshows/slide/')
        self.assertEqual(response.status_code, 200)


@override_settings(
    CACHES={'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}}
)
class EditTokenTests(TestCase):
    '''Cover the edit_token field, recovery endpoint, and rotate endpoint.

    Captures the contract the SDK depends on: the create response
    includes a usable edit_url, the recovery endpoint hands it back to
    the original creator, and rotation invalidates the previous URL
    immediately.

    Uses the in-memory cache override so each test gets a clean
    rate-limit slate — without it, prior tests in the same module run
    can leak state through django-ratelimit and trip 403/429 on the
    create endpoint.
    '''

    def setUp(self) -> None:
        cache.clear()
        # DRF's APIClient sets content-type and handles `format='json'`
        # correctly; Django's default test client returns 415 for our
        # JSON-only create endpoint without it.
        self.client = APIClient()

    # ----- Create response -----

    def test_create_response_includes_edit_url(self):
        response = self.client.post(
            '/api/slideshow/', {'title': 'with edit url'}, format='json',
        )
        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertIn('edit_url', body)
        # URL shape: /s/<share_token>/edit?t=<edit_token>
        self.assertIn('/edit?t=', body['edit_url'])
        # Public viewer URL is also present (existing contract).
        self.assertIn('share_url', body)

    def test_create_stamps_token_hash_on_row(self):
        '''Hash is set so the recovery endpoint has something to compare.'''
        response = self.client.post(
            '/api/slideshow/', {'title': 'hashed'}, format='json',
        )
        write_token = response.json()['write_token']
        slideshow = Slideshow.objects.get(id=response.json()['id'])
        from slideshows.models import hash_write_token
        self.assertEqual(slideshow.created_by_token_hash, hash_write_token(write_token))

    # ----- Recovery (GET) -----

    def test_recovery_with_creator_token_returns_edit_url(self):
        create = self.client.post(
            '/api/slideshow/', {'title': 'recover me'}, format='json',
        ).json()
        share_token = Slideshow.objects.get(id=create['id']).share_token

        response = self.client.get(
            f'/api/v1/slideshow/{share_token}/edit-token/',
            HTTP_AUTHORIZATION=f'Bearer {create["write_token"]}',
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertIn('edit_token', body)
        self.assertIn('edit_url', body)
        # Recovery returns the SAME edit_url as the create response.
        self.assertEqual(body['edit_url'], create['edit_url'])

    def test_recovery_without_authorization_returns_401(self):
        show = Slideshow.objects.create(title='no auth')
        response = self.client.get(f'/api/v1/slideshow/{show.share_token}/edit-token/')
        self.assertEqual(response.status_code, 401)

    def test_recovery_with_wrong_token_returns_403(self):
        show = Slideshow.objects.create(title='wrong')
        # Set a hash so the legacy-row branch doesn't fire.
        from slideshows.models import hash_write_token
        show.created_by_token_hash = hash_write_token(show.write_token)
        show.save(update_fields=['created_by_token_hash'])

        response = self.client.get(
            f'/api/v1/slideshow/{show.share_token}/edit-token/',
            HTTP_AUTHORIZATION='Bearer not-the-real-token',
        )
        self.assertEqual(response.status_code, 403)

    def test_recovery_with_unknown_share_token_returns_404(self):
        response = self.client.get(
            '/api/v1/slideshow/does-not-exist/edit-token/',
            HTTP_AUTHORIZATION='Bearer anything',
        )
        self.assertEqual(response.status_code, 404)

    def test_recovery_on_legacy_row_returns_403(self):
        '''Pre-edit_token rows have empty token_hash; recovery should fail.'''
        show = Slideshow.objects.create(title='legacy')
        # Explicitly leave created_by_token_hash blank (the migration default).
        self.assertEqual(show.created_by_token_hash, '')

        response = self.client.get(
            f'/api/v1/slideshow/{show.share_token}/edit-token/',
            HTTP_AUTHORIZATION=f'Bearer {show.write_token}',
        )
        self.assertEqual(response.status_code, 403)

    # ----- Rotation (POST) -----

    def test_rotate_returns_new_token_and_invalidates_old(self):
        create = self.client.post(
            '/api/slideshow/', {'title': 'rotate'}, format='json',
        ).json()
        share_token = Slideshow.objects.get(id=create['id']).share_token
        old_edit_token = create['edit_url'].split('?t=')[1]

        rotate_response = self.client.post(
            f'/api/v1/slideshow/{share_token}/rotate-edit-token/',
            HTTP_AUTHORIZATION=f'Bearer {create["write_token"]}',
        )
        self.assertEqual(rotate_response.status_code, 200)
        new_edit_token = rotate_response.json()['edit_token']
        self.assertNotEqual(old_edit_token, new_edit_token)
        # Subsequent recovery returns the NEW token, not the old one.
        recover = self.client.get(
            f'/api/v1/slideshow/{share_token}/edit-token/',
            HTTP_AUTHORIZATION=f'Bearer {create["write_token"]}',
        ).json()
        self.assertEqual(recover['edit_token'], new_edit_token)

    def test_rotate_without_ownership_returns_403(self):
        show = Slideshow.objects.create(title='rotate denied')
        from slideshows.models import hash_write_token
        show.created_by_token_hash = hash_write_token(show.write_token)
        show.save(update_fields=['created_by_token_hash'])
        original_edit_token = show.edit_token

        response = self.client.post(
            f'/api/v1/slideshow/{show.share_token}/rotate-edit-token/',
            HTTP_AUTHORIZATION='Bearer wrong-token',
        )
        self.assertEqual(response.status_code, 403)
        # Rotation did not happen — the row's edit_token is unchanged.
        show.refresh_from_db()
        self.assertEqual(show.edit_token, original_edit_token)

    # ----- Field hygiene: edit_token never leaks via other endpoints -----

    def test_edit_token_omitted_from_gallery_endpoint(self):
        Slideshow.objects.create(title='leak check', is_gallery=True, gallery_position=1)

        response = self.client.get('/api/v1/gallery/')
        item = response.json()[0]
        self.assertNotIn('edit_token', item)
        self.assertNotIn('created_by_token_hash', item)

    def test_edit_token_recovery_response_omits_write_token(self):
        '''Recovery response carries edit_token but never the write_token.'''
        create = self.client.post(
            '/api/slideshow/', {'title': 'no write_token leak'}, format='json',
        ).json()
        share_token = Slideshow.objects.get(id=create['id']).share_token
        response = self.client.get(
            f'/api/v1/slideshow/{share_token}/edit-token/',
            HTTP_AUTHORIZATION=f'Bearer {create["write_token"]}',
        )
        body = response.json()
        self.assertNotIn('write_token', body)
        self.assertNotIn('created_by_token_hash', body)


class OpenAPISchemaTests(TestCase):
    '''Smoke tests for the drf-spectacular schema endpoint.

    The web/ service's typed fetch client is generated from this
    schema. If the endpoint stops responding or drops a path the
    web client expects, the contract silently breaks at build
    time. These tests fail loudly instead.
    '''

    def setUp(self) -> None:
        self.client = APIClient()

    def test_schema_endpoint_returns_openapi_3(self) -> None:
        response = self.client.get('/api/schema/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'].split(';')[0], 'application/vnd.oai.openapi')

    def test_schema_includes_every_documented_path(self) -> None:
        # Asks for the JSON variant so we can introspect the structure
        # without parsing YAML. spectacular content-negotiates on Accept.
        response = self.client.get('/api/schema/', HTTP_ACCEPT='application/json')
        self.assertEqual(response.status_code, 200)
        schema = response.json()

        expected_paths = {
            '/api/slideshow/',
            '/api/slideshow/{slideshow_id}/',
            '/api/slideshow/{slideshow_id}/slides/',
            '/api/slideshow/{slideshow_id}/slides/{position}/',
            '/api/v1/gallery/',
            '/api/v1/slideshow/{share_token}/',
            '/api/v1/slideshow/{share_token}/edit-token/',
            '/api/v1/slideshow/{share_token}/feature/',
            '/api/v1/slideshow/{share_token}/rotate-edit-token/',
            '/api/v1/slideshow/{share_token}/slides/{position}/',
            '/api/v1/slideshow/{share_token}/slides/{position}/caption/',
        }
        self.assertEqual(set(schema['paths'].keys()), expected_paths)

    def test_slideshow_create_request_documents_serializer_fields(self) -> None:
        '''The typed web client speaks snake_case to match the Django serializer.

        If a field is renamed on the Python side without regenerating
        the schema, this test catches the drift before it reaches the
        web client's `pnpm gen:api`.
        '''
        response = self.client.get('/api/schema/', HTTP_ACCEPT='application/json')
        schema = response.json()

        request_ref = (
            schema['paths']['/api/slideshow/']['post']['requestBody']
            ['content']['application/json']['schema']['$ref']
        )
        component_name = request_ref.rsplit('/', 1)[-1]
        component = schema['components']['schemas'][component_name]
        self.assertEqual(
            set(component['properties'].keys()),
            {'title', 'description', 'created_by', 'created_by_url'},
        )


class SlideshowPublicReadTests(TestCase):
    '''GET /api/v1/slideshow/<share_token>/ — the public viewer feed.

    Replaces the deleted Django template view. The Next.js
    `/s/[token]` page calls this endpoint server-side; agents and
    integrations may too. Anonymous, unauthenticated.
    '''

    def setUp(self) -> None:
        self.client = APIClient()
        self.slideshow = Slideshow.objects.create(
            title='Onboarding regression',
            description='Post-login redirect dropped a query parameter.',
            summary='Bug repro in 47s.',
            created_by='Eric Elizes',
            created_by_url='https://github.com/elizes',
        )
        Slide.objects.create(
            slideshow=self.slideshow,
            position=1,
            media=SimpleUploadedFile('one.png', _png_bytes(), content_type='image/png'),
            media_kind=MediaKind.IMAGE,
            media_content_type='image/png',
            caption='Login screen on staging.',
        )
        Slide.objects.create(
            slideshow=self.slideshow,
            position=2,
            media=SimpleUploadedFile('two.png', _png_bytes('blue'), content_type='image/png'),
            media_kind=MediaKind.IMAGE,
            media_content_type='image/png',
            caption='Token issued; redirect missing query param.',
        )

    def test_returns_full_public_shape(self) -> None:
        response = self.client.get(f'/api/v1/slideshow/{self.slideshow.share_token}/')
        self.assertEqual(response.status_code, 200)
        body = response.json()

        self.assertEqual(body['title'], 'Onboarding regression')
        self.assertEqual(body['summary'], 'Bug repro in 47s.')
        self.assertEqual(body['created_by'], 'Eric Elizes')
        self.assertEqual(body['created_by_url'], 'https://github.com/elizes')
        self.assertEqual(len(body['slides']), 2)
        self.assertEqual(body['slides'][0]['position'], 1)
        self.assertEqual(body['slides'][1]['position'], 2)

    def test_omits_internal_credentials(self) -> None:
        response = self.client.get(f'/api/v1/slideshow/{self.slideshow.share_token}/')
        body = response.json()
        for forbidden in ('write_token', 'edit_token', 'created_by_token_hash', 'created_ip'):
            self.assertNotIn(forbidden, body)

    def test_returns_404_for_unknown_share_token(self) -> None:
        response = self.client.get('/api/v1/slideshow/does-not-exist/')
        self.assertEqual(response.status_code, 404)


@override_settings(
    CACHES={'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}}
)
class SlideEditTokenTests(TestCase):
    '''Edit-page mutating endpoints (PATCH caption, DELETE slide).

    Authenticated by the per-slideshow edit_token. Surface is narrow
    on purpose — the SDK's write_token routes still own media changes
    and slideshow metadata edits.
    '''

    def setUp(self) -> None:
        cache.clear()
        self.client = APIClient()
        self.slideshow = Slideshow.objects.create(title='Edit me')
        self.s1 = Slide.objects.create(
            slideshow=self.slideshow,
            position=1,
            media=_png_upload('one.png'),
            media_kind=MediaKind.IMAGE,
            media_content_type='image/png',
            caption='original',
        )
        self.s2 = Slide.objects.create(
            slideshow=self.slideshow,
            position=2,
            media=_png_upload('two.png', 'blue'),
            media_kind=MediaKind.IMAGE,
            media_content_type='image/png',
            caption='second',
        )
        self.token = self.slideshow.edit_token

    # ----- PATCH caption -----

    def test_patch_caption_with_valid_edit_token(self) -> None:
        response = self.client.patch(
            f'/api/v1/slideshow/{self.slideshow.share_token}/slides/1/caption/',
            {'caption': 'updated body'},
            format='json',
            HTTP_AUTHORIZATION=f'Bearer {self.token}',
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['caption'], 'updated body')
        self.s1.refresh_from_db()
        self.assertEqual(self.s1.caption, 'updated body')

    def test_patch_caption_without_auth_returns_401(self) -> None:
        response = self.client.patch(
            f'/api/v1/slideshow/{self.slideshow.share_token}/slides/1/caption/',
            {'caption': 'x'},
            format='json',
        )
        self.assertEqual(response.status_code, 401)

    def test_patch_caption_with_wrong_token_returns_401(self) -> None:
        response = self.client.patch(
            f'/api/v1/slideshow/{self.slideshow.share_token}/slides/1/caption/',
            {'caption': 'x'},
            format='json',
            HTTP_AUTHORIZATION='Bearer not-the-edit-token',
        )
        self.assertEqual(response.status_code, 401)

    def test_patch_caption_with_other_slideshows_token_returns_401(self) -> None:
        other = Slideshow.objects.create(title='other')
        response = self.client.patch(
            f'/api/v1/slideshow/{self.slideshow.share_token}/slides/1/caption/',
            {'caption': 'x'},
            format='json',
            HTTP_AUTHORIZATION=f'Bearer {other.edit_token}',
        )
        self.assertEqual(response.status_code, 401)

    def test_patch_caption_for_unknown_slideshow_returns_404(self) -> None:
        response = self.client.patch(
            '/api/v1/slideshow/does-not-exist/slides/1/caption/',
            {'caption': 'x'},
            format='json',
            HTTP_AUTHORIZATION=f'Bearer {self.token}',
        )
        self.assertEqual(response.status_code, 404)

    def test_patch_caption_for_unknown_position_returns_404(self) -> None:
        response = self.client.patch(
            f'/api/v1/slideshow/{self.slideshow.share_token}/slides/99/caption/',
            {'caption': 'x'},
            format='json',
            HTTP_AUTHORIZATION=f'Bearer {self.token}',
        )
        self.assertEqual(response.status_code, 404)

    def test_patch_caption_rejects_write_token(self) -> None:
        '''The write_token must NOT authorize edit-page mutations; the
        two surfaces are separated on purpose. Caller wanting both can
        still hit /api/slideshow/<id>/slides/<position>/ with write_token.'''
        response = self.client.patch(
            f'/api/v1/slideshow/{self.slideshow.share_token}/slides/1/caption/',
            {'caption': 'x'},
            format='json',
            HTTP_AUTHORIZATION=f'Bearer {self.slideshow.write_token}',
        )
        self.assertEqual(response.status_code, 401)

    # ----- DELETE slide -----

    def test_delete_slide_with_valid_edit_token(self) -> None:
        response = self.client.delete(
            f'/api/v1/slideshow/{self.slideshow.share_token}/slides/2/',
            HTTP_AUTHORIZATION=f'Bearer {self.token}',
        )
        self.assertEqual(response.status_code, 204)
        self.assertFalse(Slide.objects.filter(pk=self.s2.pk).exists())
        # Position 1 must remain untouched.
        self.assertTrue(Slide.objects.filter(pk=self.s1.pk).exists())

    def test_delete_slide_does_not_renumber_remaining(self) -> None:
        '''Deleting position 1 leaves position 2 at position 2 — gaps in
        the numeric sequence are intentional, not bugs to fix.'''
        self.client.delete(
            f'/api/v1/slideshow/{self.slideshow.share_token}/slides/1/',
            HTTP_AUTHORIZATION=f'Bearer {self.token}',
        )
        self.s2.refresh_from_db()
        self.assertEqual(self.s2.position, 2)

    def test_delete_slide_without_auth_returns_401(self) -> None:
        response = self.client.delete(
            f'/api/v1/slideshow/{self.slideshow.share_token}/slides/1/',
        )
        self.assertEqual(response.status_code, 401)

    def test_delete_slide_for_unknown_position_returns_404(self) -> None:
        response = self.client.delete(
            f'/api/v1/slideshow/{self.slideshow.share_token}/slides/99/',
            HTTP_AUTHORIZATION=f'Bearer {self.token}',
        )
        self.assertEqual(response.status_code, 404)


class ClientIPTests(TestCase):
    '''The trusted-proxy-aware client IP resolver.

    Pins the trust hierarchy CF-Connecting-IP > X-Forwarded-For (first
    entry) > REMOTE_ADDR. Both the rate-limit key function and the
    forensics helper share this code, so a regression in one shows up
    in the other — which means these tests guard both surfaces.
    '''

    def setUp(self) -> None:
        from django.http import HttpRequest
        self.request_factory = HttpRequest

    def _make_request(self, **meta) -> object:
        from django.http import HttpRequest
        req = HttpRequest()
        req.META.update(meta)
        return req

    def test_client_ip_prefers_cf_connecting_ip(self) -> None:
        from slideshows.ratelimit import client_ip
        req = self._make_request(
            HTTP_CF_CONNECTING_IP='203.0.113.50',
            HTTP_X_FORWARDED_FOR='198.51.100.10, 10.0.0.1',
            REMOTE_ADDR='10.0.0.99',
        )
        self.assertEqual(client_ip(req), '203.0.113.50')

    def test_client_ip_falls_back_to_x_forwarded_for_first_entry(self) -> None:
        from slideshows.ratelimit import client_ip
        req = self._make_request(
            HTTP_X_FORWARDED_FOR='198.51.100.10, 10.0.0.1, 172.16.0.5',
            REMOTE_ADDR='10.0.0.99',
        )
        self.assertEqual(client_ip(req), '198.51.100.10')

    def test_client_ip_falls_back_to_remote_addr(self) -> None:
        from slideshows.ratelimit import client_ip
        req = self._make_request(REMOTE_ADDR='192.0.2.42')
        self.assertEqual(client_ip(req), '192.0.2.42')

    def test_client_ip_returns_empty_string_when_nothing_known(self) -> None:
        from slideshows.ratelimit import client_ip
        req = self._make_request()
        self.assertEqual(client_ip(req), '')

    def test_client_ip_strips_whitespace_in_x_forwarded_for(self) -> None:
        '''Some proxies emit `IP1, IP2` with extra padding around commas.'''
        from slideshows.ratelimit import client_ip
        req = self._make_request(HTTP_X_FORWARDED_FOR='  198.51.100.10  ,10.0.0.1')
        self.assertEqual(client_ip(req), '198.51.100.10')

    def test_client_ip_key_returns_same_value_as_client_ip(self) -> None:
        '''The django-ratelimit key wrapper must agree with the forensics helper.'''
        from slideshows.ratelimit import client_ip, client_ip_key
        req = self._make_request(HTTP_CF_CONNECTING_IP='203.0.113.50')
        self.assertEqual(client_ip_key('any-group', req), client_ip(req))


class RateLimitKeyIsolationTests(TestCase):
    '''End-to-end: two distinct CF-Connecting-IPs must NOT share a counter.

    Behind Cloudflare with the default `key='ip'` setting, both requests
    look like the same Cloudflare edge IP and share one counter — the
    bug this whole module exists to fix. With our key function they
    each get their own bucket and only the abuser is throttled.
    '''

    def setUp(self) -> None:
        cache.clear()
        self.client = APIClient()

    @override_settings(
        CACHES={'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}}
    )
    def test_two_clients_through_same_proxy_do_not_share_counter(self) -> None:
        # Both requests come "from" the same Cloudflare edge (REMOTE_ADDR),
        # but carry different CF-Connecting-IP headers — exactly what
        # production looks like.
        EDGE = '198.41.200.13'

        # Drain attacker's bucket past the create limit.
        for _ in range(21):
            self.client.post(
                '/api/slideshow/',
                {'title': 'spam'},
                format='json',
                HTTP_CF_CONNECTING_IP='198.51.100.99',
                REMOTE_ADDR=EDGE,
            )

        # Attacker is now blocked.
        attacker = self.client.post(
            '/api/slideshow/',
            {'title': 'spam-22'},
            format='json',
            HTTP_CF_CONNECTING_IP='198.51.100.99',
            REMOTE_ADDR=EDGE,
        )
        self.assertEqual(attacker.status_code, 429)

        # Innocent user behind the same Cloudflare edge but with a
        # different real IP must NOT be blocked.
        innocent = self.client.post(
            '/api/slideshow/',
            {'title': 'first-clip'},
            format='json',
            HTTP_CF_CONNECTING_IP='203.0.113.7',
            REMOTE_ADDR=EDGE,
        )
        self.assertEqual(innocent.status_code, 201)


@override_settings(
    CACHES={'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}}
)
class PerSlideshowCapTests(TestCase):
    '''Per-slideshow caps: max 20 slides, max 100 MB total bytes.

    The cap exists to keep slideshows short and focused — the SKILL
    counsels 10–15 slides for a typical run, 3–5 for a focused bug
    repro. Anything past 20 is the run trying to be a tour or a
    portfolio collection, which is an explicit v0.2 direction.
    '''

    def setUp(self) -> None:
        cache.clear()
        self.client = APIClient()
        self.show = Slideshow.objects.create(title='cap test')
        self.auth = {'HTTP_AUTHORIZATION': f'Bearer {self.show.write_token}'}

    def test_slide_count_cap_blocks_21st_slide(self) -> None:
        # Pre-populate 20 slides directly so we don't churn through 20
        # POSTs in the test (and don't hit the rate limit either).
        for n in range(1, 21):
            Slide.objects.create(
                slideshow=self.show,
                position=n,
                media=_png_upload(f'shot{n}.png'),
                media_kind=MediaKind.IMAGE,
                media_content_type='image/png',
                media_bytes=1000,
                caption=f'slide {n}',
            )
        response = self.client.post(
            f'/api/slideshow/{self.show.id}/slides/',
            {'media': _png_upload('overflow.png'), 'caption': 'should fail'},
            format='multipart',
            **self.auth,
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('20 slides', response.json()['detail'])

    def test_slide_count_cap_allows_20th_slide(self) -> None:
        '''The 20th slide must still be accepted — boundary is strict-LESS.'''
        for n in range(1, 20):
            Slide.objects.create(
                slideshow=self.show,
                position=n,
                media=_png_upload(f'shot{n}.png'),
                media_kind=MediaKind.IMAGE,
                media_content_type='image/png',
                media_bytes=1000,
                caption=f'slide {n}',
            )
        response = self.client.post(
            f'/api/slideshow/{self.show.id}/slides/',
            {'media': _png_upload('twentieth.png'), 'caption': 'last allowed'},
            format='multipart',
            **self.auth,
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()['position'], 20)

    def test_byte_cap_blocks_when_total_would_exceed_100MB(self) -> None:
        # Pre-stuff 99 MB across two slides; a third 5 MB slide pushes
        # us over the 100 MB cap.
        Slide.objects.create(
            slideshow=self.show,
            position=1,
            media=_png_upload('big1.png'),
            media_kind=MediaKind.IMAGE,
            media_content_type='image/png',
            media_bytes=50 * 1024 * 1024,
            caption='one',
        )
        Slide.objects.create(
            slideshow=self.show,
            position=2,
            media=_png_upload('big2.png'),
            media_kind=MediaKind.IMAGE,
            media_content_type='image/png',
            media_bytes=49 * 1024 * 1024,
            caption='two',
        )
        # Synthesize a ~5 MB upload to push past 100 MB.
        big_bytes = b'\x89PNG\r\n\x1a\n' + b'\x00' * (5 * 1024 * 1024)
        big_upload = SimpleUploadedFile('overflow.png', big_bytes, content_type='image/png')

        response = self.client.post(
            f'/api/slideshow/{self.show.id}/slides/',
            {'media': big_upload, 'caption': 'overflow'},
            format='multipart',
            **self.auth,
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('100MB', response.json()['detail'])

    def test_slide_add_records_media_bytes(self) -> None:
        '''New slides must populate media_bytes for the cap to work.'''
        png_data = _png_bytes()
        upload = SimpleUploadedFile('one.png', png_data, content_type='image/png')
        response = self.client.post(
            f'/api/slideshow/{self.show.id}/slides/',
            {'media': upload, 'caption': 'first'},
            format='multipart',
            **self.auth,
        )
        self.assertEqual(response.status_code, 201)
        slide = Slide.objects.get(pk=response.json()['id'])
        self.assertEqual(slide.media_bytes, len(png_data))


class AdminFeatureEndpointTests(TestCase):
    '''Cover the POST/DELETE /api/v1/slideshow/<share_token>/feature/ admin
    endpoint. Auth: Bearer AGENTCLIP_ADMIN_TOKEN env var.

    The endpoint is the supported curation surface: the
    `agentclip slideshow feature` CLI hits this from a developer's
    machine to flip is_gallery without a Django admin trip.
    '''

    URL_TMPL = '/api/v1/slideshow/{share_token}/feature/'
    ADMIN_TOKEN = 'test-admin-token-9d8e7f6a'

    def setUp(self):
        import os
        self._prev = os.environ.get('AGENTCLIP_ADMIN_TOKEN')
        os.environ['AGENTCLIP_ADMIN_TOKEN'] = self.ADMIN_TOKEN

    def tearDown(self):
        import os
        if self._prev is None:
            os.environ.pop('AGENTCLIP_ADMIN_TOKEN', None)
        else:
            os.environ['AGENTCLIP_ADMIN_TOKEN'] = self._prev

    def test_post_features_a_slideshow_with_default_position_zero(self):
        show = Slideshow.objects.create(title='soon-to-be-featured', is_gallery=False)
        response = self.client.post(
            self.URL_TMPL.format(share_token=show.share_token),
            HTTP_AUTHORIZATION=f'Bearer {self.ADMIN_TOKEN}',
        )
        self.assertEqual(response.status_code, 200)
        show.refresh_from_db()
        self.assertTrue(show.is_gallery)
        self.assertEqual(show.gallery_position, 0)

    def test_post_with_explicit_position_updates_order(self):
        show = Slideshow.objects.create(title='a', is_gallery=False)
        response = self.client.post(
            self.URL_TMPL.format(share_token=show.share_token),
            data={'position': 3},
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {self.ADMIN_TOKEN}',
        )
        self.assertEqual(response.status_code, 200)
        show.refresh_from_db()
        self.assertEqual(show.gallery_position, 3)

    def test_post_is_idempotent_and_can_reorder(self):
        '''Calling POST twice with different positions reorders without error.'''
        show = Slideshow.objects.create(title='reorder', is_gallery=True, gallery_position=5)

        for new_pos in (0, 7, 2):
            response = self.client.post(
                self.URL_TMPL.format(share_token=show.share_token),
                data={'position': new_pos},
                content_type='application/json',
                HTTP_AUTHORIZATION=f'Bearer {self.ADMIN_TOKEN}',
            )
            self.assertEqual(response.status_code, 200)
            show.refresh_from_db()
            self.assertEqual(show.gallery_position, new_pos)
            self.assertTrue(show.is_gallery)

    def test_delete_unfeatures(self):
        show = Slideshow.objects.create(title='drop-me', is_gallery=True, gallery_position=2)
        response = self.client.delete(
            self.URL_TMPL.format(share_token=show.share_token),
            HTTP_AUTHORIZATION=f'Bearer {self.ADMIN_TOKEN}',
        )
        self.assertEqual(response.status_code, 204)
        show.refresh_from_db()
        self.assertFalse(show.is_gallery)

    def test_no_auth_returns_401(self):
        show = Slideshow.objects.create(title='guarded', is_gallery=False)
        response = self.client.post(
            self.URL_TMPL.format(share_token=show.share_token),
        )
        self.assertEqual(response.status_code, 401)
        show.refresh_from_db()
        self.assertFalse(show.is_gallery)

    def test_wrong_token_returns_401(self):
        show = Slideshow.objects.create(title='guarded', is_gallery=False)
        response = self.client.post(
            self.URL_TMPL.format(share_token=show.share_token),
            HTTP_AUTHORIZATION='Bearer wrong-token',
        )
        self.assertEqual(response.status_code, 401)
        show.refresh_from_db()
        self.assertFalse(show.is_gallery)

    def test_unset_admin_token_returns_503(self):
        '''A deploy that forgot to set AGENTCLIP_ADMIN_TOKEN fails closed.'''
        import os
        os.environ.pop('AGENTCLIP_ADMIN_TOKEN', None)
        show = Slideshow.objects.create(title='x', is_gallery=False)
        response = self.client.post(
            self.URL_TMPL.format(share_token=show.share_token),
            HTTP_AUTHORIZATION=f'Bearer {self.ADMIN_TOKEN}',
        )
        self.assertEqual(response.status_code, 503)

    def test_unknown_share_token_returns_404(self):
        response = self.client.post(
            self.URL_TMPL.format(share_token='not-a-real-token'),
            HTTP_AUTHORIZATION=f'Bearer {self.ADMIN_TOKEN}',
        )
        self.assertEqual(response.status_code, 404)

    def test_negative_position_returns_400(self):
        show = Slideshow.objects.create(title='x', is_gallery=False)
        response = self.client.post(
            self.URL_TMPL.format(share_token=show.share_token),
            data={'position': -1},
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {self.ADMIN_TOKEN}',
        )
        self.assertEqual(response.status_code, 400)

    def test_post_sets_featured_at_timestamp(self):
        '''Audit trail: featuring records when it happened.'''
        from django.utils import timezone
        before = timezone.now()
        show = Slideshow.objects.create(title='audit', is_gallery=False, featured_at=None)
        response = self.client.post(
            self.URL_TMPL.format(share_token=show.share_token),
            HTTP_AUTHORIZATION=f'Bearer {self.ADMIN_TOKEN}',
        )
        self.assertEqual(response.status_code, 200)
        show.refresh_from_db()
        self.assertIsNotNone(show.featured_at)
        self.assertGreaterEqual(show.featured_at, before)

    def test_delete_preserves_featured_at_for_audit_trail(self):
        '''Unfeaturing keeps the timestamp so we can answer "when was X
        last featured?" months later — even if it's no longer in the gallery.'''
        from django.utils import timezone
        marker = timezone.now()
        show = Slideshow.objects.create(
            title='dropped', is_gallery=True, gallery_position=0, featured_at=marker,
        )
        response = self.client.delete(
            self.URL_TMPL.format(share_token=show.share_token),
            HTTP_AUTHORIZATION=f'Bearer {self.ADMIN_TOKEN}',
        )
        self.assertEqual(response.status_code, 204)
        show.refresh_from_db()
        self.assertFalse(show.is_gallery)
        self.assertEqual(show.featured_at, marker)


class SlideAudioFieldsTests(TestCase):
    '''Migration 0008 adds three optional fields to Slide for narration:
    `audio` (FileField, nullable), `audio_voice` (CharField, blank),
    and `audio_duration_ms` (PositiveIntegerField, default 0).

    All three are additive — existing slides backfill cleanly, and
    no behavior shifts until a downstream caller (the `narrate`
    management command, the public serializer, the frontend player)
    actually reads or writes them.
    '''

    def setUp(self):
        self.show = Slideshow.objects.create(title='narration test')

    def _make_slide(self, position=1, **extra):
        return Slide.objects.create(
            slideshow=self.show,
            position=position,
            media=_png_upload(name=f'shot-{position}.png'),
            media_kind=MediaKind.IMAGE,
            caption=f'Slide {position}',
            **extra,
        )

    def test_slide_defaults_have_no_audio(self):
        slide = self._make_slide()
        self.assertFalse(bool(slide.audio))
        self.assertEqual(slide.audio_voice, '')
        self.assertEqual(slide.audio_duration_ms, 0)

    def test_slide_accepts_audio_file_and_round_trips(self):
        from django.core.files.base import ContentFile
        slide = self._make_slide()
        slide.audio.save('1.mp3', ContentFile(b'ID3\x00fakeaudio'), save=False)
        slide.audio_voice = 'nova'
        slide.audio_duration_ms = 4200
        slide.save()
        slide.refresh_from_db()
        self.assertTrue(bool(slide.audio))
        self.assertTrue(slide.audio.url)
        self.assertEqual(slide.audio_voice, 'nova')
        self.assertEqual(slide.audio_duration_ms, 4200)

    def test_audio_path_uses_per_slideshow_audio_subdir(self):
        '''_slide_audio_path scopes audio under the slideshow id and an
        `audio/` subdir so the bucket layout mirrors `media`.'''
        from django.core.files.base import ContentFile
        slide = self._make_slide()
        slide.audio.save('1.mp3', ContentFile(b'fake'), save=True)
        self.assertIn(f'slideshows/{self.show.id}/audio/', slide.audio.name)
        self.assertTrue(slide.audio.name.endswith('.mp3'))

    def test_legacy_slide_without_audio_still_round_trips(self):
        '''Slides created before migration 0008 keep working — the
        nullable audio field reads back as None and the public
        serializer code that follows in Unit 4 must handle that.'''
        slide = self._make_slide(position=2)
        slide.refresh_from_db()
        self.assertIsNone(slide.audio.name or None)
        # FileField on a nullable column stores '' when blank, so
        # truthiness ('not slide.audio') is the right check, not 'is None'.
        self.assertFalse(bool(slide.audio))


class _OverrideEnv:
    '''Tiny context manager for patching env vars in a test.'''

    def __init__(self, key, value):
        import os
        self._os = os
        self.key = key
        self.value = value
        self._previous = None

    def __enter__(self):
        self._previous = self._os.environ.get(self.key)
        if self.value is None:
            self._os.environ.pop(self.key, None)
        else:
            self._os.environ[self.key] = self.value
        return self

    def __exit__(self, *_):
        if self._previous is None:
            self._os.environ.pop(self.key, None)
        else:
            self._os.environ[self.key] = self._previous


def _override_env(key, value):
    return _OverrideEnv(key, value)


class NarrationServiceTests(TestCase):
    '''Unit tests for slideshows.narration.

    Mocks the OpenAI client so tests don't require network access or
    a real API key. The service module is pure-data — text in, MP3
    bytes out — so all behavior is deterministic with mocks.
    '''

    def setUp(self):
        from slideshows import narration
        narration.reset_client_for_tests()

    def _stub_client(self, mp3_bytes=b'ID3\x00fakeaudio'):
        '''Builds a MagicMock that mimics openai.OpenAI's streaming
        response API.'''
        from unittest.mock import MagicMock
        response = MagicMock()
        response.iter_bytes.return_value = iter([mp3_bytes])
        response.__enter__.return_value = response
        response.__exit__.return_value = False
        client = MagicMock()
        client.audio.speech.with_streaming_response.create.return_value = response
        return client

    def test_synthesize_returns_mp3_bytes_and_metadata(self):
        from unittest.mock import patch
        from decimal import Decimal
        from slideshows import narration

        with patch.object(narration, '_get_client', return_value=self._stub_client(b'MP3DATA')):
            result = narration.synthesize('hello world')

        self.assertEqual(result.mp3_bytes, b'MP3DATA')
        self.assertEqual(result.voice, 'nova')
        self.assertEqual(result.model, 'tts-1-hd')
        self.assertEqual(result.input_chars, 11)
        # 11 chars * $0.030 / 1000 = $0.00033
        self.assertEqual(result.cost_usd, Decimal('0.000330'))

    def test_synthesize_uses_explicit_voice_override(self):
        from unittest.mock import patch
        from slideshows import narration

        with patch.object(narration, '_get_client', return_value=self._stub_client()):
            result = narration.synthesize('hi', voice='echo')

        self.assertEqual(result.voice, 'echo')

    def test_synthesize_rejects_empty_caption(self):
        from slideshows import narration
        with self.assertRaises(ValueError):
            narration.synthesize('')
        with self.assertRaises(ValueError):
            narration.synthesize('   \n  ')

    def test_synthesize_rejects_caption_over_max_chars(self):
        from slideshows import narration
        too_long = 'x' * (narration.MAX_INPUT_CHARS + 1)
        with self.assertRaises(ValueError):
            narration.synthesize(too_long)

    def test_synthesize_at_exact_boundary_succeeds(self):
        '''4096 chars is the OpenAI limit; we accept it. 4097 raises.'''
        from unittest.mock import patch
        from slideshows import narration

        at_limit = 'x' * narration.MAX_INPUT_CHARS
        with patch.object(narration, '_get_client', return_value=self._stub_client()):
            result = narration.synthesize(at_limit)
        self.assertEqual(result.input_chars, narration.MAX_INPUT_CHARS)

    def test_missing_api_key_raises_narration_config_error(self):
        '''The first synthesize() call with no OPENAI_API_KEY surfaces
        a friendly NarrationConfigError, not a raw openai exception.'''
        from slideshows import narration
        with _override_env('OPENAI_API_KEY', None):
            narration.reset_client_for_tests()
            with self.assertRaises(narration.NarrationConfigError):
                narration.synthesize('hello')

    def test_retries_once_on_transient_openai_error(self):
        '''Transient errors retry once; second call succeeds.'''
        from unittest.mock import MagicMock, patch
        from slideshows import narration
        import openai

        good = self._stub_client(b'RETRIED')
        original_response = good.audio.speech.with_streaming_response.create.return_value
        call_count = {'n': 0}

        def flaky_create(*args, **kwargs):
            call_count['n'] += 1
            if call_count['n'] == 1:
                raise openai.APITimeoutError(request=MagicMock())
            return original_response

        good.audio.speech.with_streaming_response.create = flaky_create

        with patch.object(narration, '_get_client', return_value=good), \
             patch('slideshows.narration.time.sleep', lambda *_: None):
            result = narration.synthesize('hello')

        self.assertEqual(result.mp3_bytes, b'RETRIED')
        self.assertEqual(call_count['n'], 2)


class NarrateCommandTests(TestCase):
    '''Integration tests for the `narrate` management command.

    Mocks slideshows.narration.synthesize so we don't hit OpenAI but
    still exercise the full command surface: arg parsing, idempotent
    skip logic, --force regeneration, --dry-run cost estimation, and
    error paths (unknown share token, missing API key).
    '''

    def setUp(self):
        from slideshows import narration
        narration.reset_client_for_tests()
        self.show = Slideshow.objects.create(title='narrate-test')
        for i in (1, 2, 3):
            Slide.objects.create(
                slideshow=self.show,
                position=i,
                media=_png_upload(name=f'shot-{i}.png'),
                media_kind=MediaKind.IMAGE,
                caption=f'Caption for slide {i}.',
            )

    def _stub_synthesize(self, mp3_bytes=b'MP3FAKE', voice='nova'):
        '''Return a callable suitable for monkeypatching narration.synthesize.

        Records each call so tests can assert call counts and arg
        propagation (the --voice flag, in particular).
        '''
        from decimal import Decimal
        from slideshows.narration import NarrationResult
        calls = []
        def stub(text, *, voice=voice, model='tts-1-hd'):
            calls.append({'text': text, 'voice': voice, 'model': model})
            return NarrationResult(
                mp3_bytes=mp3_bytes,
                voice=voice,
                model=model,
                input_chars=len(text),
                cost_usd=(Decimal(len(text)) / Decimal(1000)) * Decimal('0.030'),
            )
        return stub, calls

    def _run_command(self, *args, **opts):
        '''Invoke the management command, capturing stdout for asserts.'''
        from io import StringIO
        from django.core.management import call_command
        out = StringIO()
        err = StringIO()
        call_command('narrate', *args, stdout=out, stderr=err, **opts)
        return out.getvalue(), err.getvalue()

    def test_narrates_all_slides_when_none_have_audio(self):
        from unittest.mock import patch
        stub, calls = self._stub_synthesize()
        with patch('slideshows.management.commands.narrate.narration.synthesize', stub):
            stdout, _ = self._run_command(self.show.share_token)
        self.assertEqual(len(calls), 3)
        for slide in self.show.slides.all():
            self.assertTrue(bool(slide.audio))
            self.assertEqual(slide.audio_voice, 'nova')
        self.assertIn('3 of 3 slides', stdout)

    def test_skips_already_narrated_slides_without_force(self):
        '''Re-running narrate without --force is a near-no-op when all
        slides already have audio.'''
        from unittest.mock import patch
        from django.core.files.base import ContentFile
        # Pre-populate audio on slide 1.
        slide_one = self.show.slides.get(position=1)
        slide_one.audio.save('1.mp3', ContentFile(b'existing'), save=False)
        slide_one.audio_voice = 'nova'
        slide_one.save()

        stub, calls = self._stub_synthesize()
        with patch('slideshows.management.commands.narrate.narration.synthesize', stub):
            stdout, _ = self._run_command(self.show.share_token)
        # Slides 2 and 3 narrated; slide 1 skipped.
        self.assertEqual(len(calls), 2)
        self.assertIn('skip (already narrated)', stdout)

    def test_force_regenerates_all_slides(self):
        '''--force re-narrates every slide even if audio exists.'''
        from unittest.mock import patch
        from django.core.files.base import ContentFile
        slide_one = self.show.slides.get(position=1)
        slide_one.audio.save('1.mp3', ContentFile(b'existing'), save=False)
        slide_one.save()

        stub, calls = self._stub_synthesize(mp3_bytes=b'NEWAUDIO')
        with patch('slideshows.management.commands.narrate.narration.synthesize', stub):
            stdout, _ = self._run_command(self.show.share_token, '--force')
        self.assertEqual(len(calls), 3)
        slide_one.refresh_from_db()
        self.assertEqual(slide_one.audio.read(), b'NEWAUDIO')

    def test_voice_flag_propagates_to_synthesize(self):
        from unittest.mock import patch
        stub, calls = self._stub_synthesize(voice='echo')
        with patch('slideshows.management.commands.narrate.narration.synthesize', stub):
            self._run_command(self.show.share_token, '--voice', 'echo')
        self.assertTrue(all(call['voice'] == 'echo' for call in calls))
        for slide in self.show.slides.all():
            self.assertEqual(slide.audio_voice, 'echo')

    def test_dry_run_reports_cost_without_synthesizing(self):
        from unittest.mock import patch
        stub, calls = self._stub_synthesize()
        with patch('slideshows.management.commands.narrate.narration.synthesize', stub):
            stdout, _ = self._run_command(self.show.share_token, '--dry-run')
        self.assertEqual(len(calls), 0)  # no API hit
        self.assertIn('would narrate', stdout)
        for slide in self.show.slides.all():
            self.assertFalse(bool(slide.audio))  # no DB writes

    def test_unknown_share_token_raises_command_error(self):
        from django.core.management.base import CommandError
        with self.assertRaises(CommandError):
            self._run_command('not-a-real-token')

    def test_skips_slide_with_empty_caption(self):
        from unittest.mock import patch
        slide_two = self.show.slides.get(position=2)
        slide_two.caption = ''
        slide_two.save()

        stub, calls = self._stub_synthesize()
        with patch('slideshows.management.commands.narrate.narration.synthesize', stub):
            stdout, _ = self._run_command(self.show.share_token)
        # Slides 1 and 3 narrated; slide 2 skipped on empty caption.
        self.assertEqual(len(calls), 2)
        self.assertIn('skip (caption is empty)', stdout)

    def test_missing_api_key_raises_command_error_via_config_error(self):
        from django.core.management.base import CommandError
        from slideshows import narration

        # Force the lazy client to actually try to construct itself,
        # then assert the CLI translates NarrationConfigError to a
        # CommandError instead of leaking the openai exception.
        with _override_env('OPENAI_API_KEY', None):
            narration.reset_client_for_tests()
            with self.assertRaises(CommandError):
                self._run_command(self.show.share_token)
