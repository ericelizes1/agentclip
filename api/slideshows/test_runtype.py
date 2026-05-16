'''Tests for the RunType enum + intro/outro audio fields.

Foundation tests for unit 1 of the walkthrough plan. Confirms the
new fields exist, default correctly, and integrate with the existing
bump_render_version helper.
'''

from __future__ import annotations

from django.core.cache import cache
from django.core.files.base import ContentFile
from django.test import TestCase, override_settings

from slideshows.models import RunType, Slideshow


@override_settings(
    CACHES={'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}}
)
class RunTypeChoicesTests(TestCase):
    def test_five_values_present(self) -> None:
        # demo + qa + guide + bug are the canonical four. walkthrough
        # remains as a deprecated-legacy value so existing rows validate.
        values = {choice[0] for choice in RunType.choices}
        self.assertEqual(values, {'demo', 'qa', 'guide', 'bug', 'walkthrough'})

    def test_default_run_type_is_demo(self) -> None:
        slideshow = Slideshow.objects.create()
        self.assertEqual(slideshow.run_type, RunType.DEMO)
        self.assertEqual(slideshow.run_type, 'demo')

    def test_run_type_round_trips_via_string(self) -> None:
        slideshow = Slideshow.objects.create(run_type='guide')
        slideshow.refresh_from_db()
        self.assertEqual(slideshow.run_type, RunType.GUIDE)

    def test_run_type_validates_against_choices(self) -> None:
        # Django doesn't enforce choices at the DB level, so the model
        # itself accepts any string. The serializer is where validation
        # lives. This test pins that the field accepts any of the known
        # choices without complaint.
        for choice in RunType.values:
            slideshow = Slideshow.objects.create(run_type=choice)
            slideshow.refresh_from_db()
            self.assertEqual(slideshow.run_type, choice)

    def test_legacy_walkthrough_still_valid(self) -> None:
        # walkthrough rows pre-date the demo/qa split. Keep them
        # readable + mutable so the operator can manually recategorize
        # hero clips later without a forced data migration.
        slideshow = Slideshow.objects.create(run_type='walkthrough')
        slideshow.refresh_from_db()
        self.assertEqual(slideshow.run_type, 'walkthrough')


@override_settings(
    CACHES={'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}}
)
class IntroOutroAudioFieldTests(TestCase):
    def setUp(self) -> None:
        cache.clear()
        self.slideshow = Slideshow.objects.create()

    def test_fields_blank_by_default(self) -> None:
        self.assertFalse(self.slideshow.intro_audio)
        self.assertFalse(self.slideshow.outro_audio)

    def test_bump_clears_intro_outro_audio(self) -> None:
        # Stash audio so the bump has something to delete.
        self.slideshow.intro_audio.save(
            'intro.mp3', ContentFile(b'fake intro mp3'), save=True
        )
        self.slideshow.outro_audio.save(
            'outro.mp3', ContentFile(b'fake outro mp3'), save=True
        )
        self.slideshow.refresh_from_db()
        self.assertTrue(self.slideshow.intro_audio)
        self.assertTrue(self.slideshow.outro_audio)

        self.slideshow.bump_render_version()

        self.slideshow.refresh_from_db()
        self.assertFalse(self.slideshow.intro_audio)
        self.assertFalse(self.slideshow.outro_audio)

    def test_bump_clears_all_render_artifacts_atomically(self) -> None:
        # Pin the full clear-list: rendered_mp4 / pdf / poster /
        # intro_audio / outro_audio all reset together so a fresh
        # render version starts with no stale state.
        self.slideshow.rendered_mp4.save('m.mp4', ContentFile(b'm'), save=False)
        self.slideshow.rendered_pdf.save('p.pdf', ContentFile(b'p'), save=False)
        self.slideshow.poster_image.save('o.jpg', ContentFile(b'o'), save=False)
        self.slideshow.intro_audio.save('i.mp3', ContentFile(b'i'), save=False)
        self.slideshow.outro_audio.save('u.mp3', ContentFile(b'u'), save=False)
        self.slideshow.save()
        self.slideshow.refresh_from_db()

        self.slideshow.bump_render_version()

        self.slideshow.refresh_from_db()
        for field in (
            'rendered_mp4',
            'rendered_pdf',
            'poster_image',
            'intro_audio',
            'outro_audio',
        ):
            self.assertFalse(getattr(self.slideshow, field), field)

    def test_render_version_increments_through_bump(self) -> None:
        self.assertEqual(self.slideshow.render_version, 0)
        self.slideshow.bump_render_version()
        self.assertEqual(self.slideshow.render_version, 1)
