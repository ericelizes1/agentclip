'''Tests for the run-type voice mapping + intro/outro synth helpers.

These cover the bookend narration that gets prepended/appended to a
rendered MP4. The legacy NarrationServiceTests class in tests.py
covers per-slide synthesize(); here we focus on the slideshow-level
helpers added in unit 2 of the walkthrough plan.
'''

from __future__ import annotations

from decimal import Decimal
from unittest import mock

from django.core.cache import cache
from django.test import TestCase, override_settings

from slideshows import narration
from slideshows.models import RunType, Slide, Slideshow


@override_settings(
    CACHES={'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}}
)
class VoiceForTests(TestCase):
    def test_demo_uses_shimmer_slightly_slower(self) -> None:
        slideshow = Slideshow.objects.create(run_type=RunType.DEMO)
        voice, speed = narration.voice_for(slideshow)
        self.assertEqual(voice, 'shimmer')
        self.assertLess(speed, 1.0)
        self.assertGreaterEqual(speed, 0.9)

    def test_qa_uses_nova_brisk(self) -> None:
        slideshow = Slideshow.objects.create(run_type=RunType.QA)
        voice, speed = narration.voice_for(slideshow)
        self.assertEqual(voice, 'nova')
        self.assertGreater(speed, 1.0)

    def test_guide_uses_nova(self) -> None:
        slideshow = Slideshow.objects.create(run_type=RunType.GUIDE)
        self.assertEqual(narration.voice_for(slideshow), ('nova', 1.0))

    def test_bug_uses_onyx(self) -> None:
        slideshow = Slideshow.objects.create(run_type=RunType.BUG)
        self.assertEqual(narration.voice_for(slideshow), ('onyx', 1.0))

    def test_walkthrough_legacy_maps_to_demo_voice(self) -> None:
        # walkthrough rows pre-date the demo/qa split. The renderer treats
        # the legacy value as a synonym for demo so existing clips sound
        # the same after the taxonomy change.
        slideshow = Slideshow.objects.create(run_type=RunType.WALKTHROUGH)
        self.assertEqual(narration.voice_for(slideshow), ('shimmer', 0.95))

    def test_unknown_run_type_falls_back_to_demo(self) -> None:
        # Defensive: an unexpected string should not crash. Falls back
        # to the demo mapping (the new default).
        slideshow = Slideshow.objects.create()
        slideshow.run_type = 'nonsense'  # bypass model save so we can test
        self.assertEqual(narration.voice_for(slideshow), ('shimmer', 0.95))

    def test_every_run_type_has_a_voice_mapping(self) -> None:
        # Pin: every enum value MUST be in RUN_TYPE_VOICE so the render
        # task never falls through to "unknown voice."
        for value in RunType.values:
            self.assertIn(value, narration.RUN_TYPE_VOICE)


@override_settings(
    CACHES={'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}}
)
class SynthesizeIntroTests(TestCase):
    def setUp(self) -> None:
        cache.clear()

    def test_returns_no_audio_when_description_is_empty(self) -> None:
        slideshow = Slideshow.objects.create(description='')
        result = narration.synthesize_intro(slideshow)
        self.assertIsNone(result.mp3_bytes)
        self.assertEqual(result.chars, 0)
        self.assertEqual(result.cost_usd, Decimal('0'))

    def test_returns_no_audio_when_description_is_whitespace_only(self) -> None:
        slideshow = Slideshow.objects.create(description='   \n  ')
        result = narration.synthesize_intro(slideshow)
        self.assertIsNone(result.mp3_bytes)

    def test_synthesizes_when_description_present(self) -> None:
        slideshow = Slideshow.objects.create(
            description='A short how-to for the signup flow.',
            run_type=RunType.GUIDE,
        )
        with mock.patch('slideshows.narration._stream_to_bytes', return_value=b'MP3'):
            with mock.patch('slideshows.narration._get_client'):
                result = narration.synthesize_intro(slideshow)
        self.assertEqual(result.mp3_bytes, b'MP3')
        self.assertEqual(result.voice, 'nova')
        self.assertGreater(result.chars, 0)
        self.assertGreater(result.cost_usd, Decimal('0'))

    def test_intro_uses_run_type_voice(self) -> None:
        slideshow = Slideshow.objects.create(
            description='Polished walkthrough of the new feature.',
            run_type=RunType.WALKTHROUGH,
        )
        captured = {}

        def fake_stream(client, *, text, voice, model, speed=1.0, max_retries=1):
            captured['voice'] = voice
            captured['speed'] = speed
            return b'MP3'

        with mock.patch('slideshows.narration._stream_to_bytes', side_effect=fake_stream):
            with mock.patch('slideshows.narration._get_client'):
                narration.synthesize_intro(slideshow)
        self.assertEqual(captured['voice'], 'shimmer')
        self.assertLess(captured['speed'], 1.0)


@override_settings(
    CACHES={'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}}
)
class SynthesizeOutroTests(TestCase):
    def setUp(self) -> None:
        cache.clear()

    def test_returns_no_audio_when_summary_is_empty(self) -> None:
        slideshow = Slideshow.objects.create(summary='')
        result = narration.synthesize_outro(slideshow)
        self.assertIsNone(result.mp3_bytes)

    def test_synthesizes_when_summary_present(self) -> None:
        slideshow = Slideshow.objects.create(
            summary='Two flows passed; one bug at slide 4.',
            run_type=RunType.BUG,
        )
        with mock.patch('slideshows.narration._stream_to_bytes', return_value=b'MP3'):
            with mock.patch('slideshows.narration._get_client'):
                result = narration.synthesize_outro(slideshow)
        self.assertEqual(result.mp3_bytes, b'MP3')
        self.assertEqual(result.voice, 'onyx')

    def test_intro_and_outro_share_voice_within_a_clip(self) -> None:
        slideshow = Slideshow.objects.create(
            description='Walkthrough intro.',
            summary='Walkthrough outro.',
            run_type=RunType.WALKTHROUGH,
        )
        voices: list[str] = []

        def fake_stream(client, *, text, voice, model, speed=1.0, max_retries=1):
            voices.append(voice)
            return b'MP3'

        with mock.patch('slideshows.narration._stream_to_bytes', side_effect=fake_stream):
            with mock.patch('slideshows.narration._get_client'):
                narration.synthesize_intro(slideshow)
                narration.synthesize_outro(slideshow)
        self.assertEqual(voices, ['shimmer', 'shimmer'])


@override_settings(
    CACHES={'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}}
)
class NarrateSlideshowVoiceIntegrationTests(TestCase):
    '''narrate_slideshow now reads voice_for(slideshow) when no explicit
    voice is passed. Pin that the per-slide audio matches intro/outro
    voice for the same run_type.'''

    def setUp(self) -> None:
        cache.clear()
        self.slideshow = Slideshow.objects.create(run_type=RunType.WALKTHROUGH)
        Slide.objects.create(
            slideshow=self.slideshow,
            position=1,
            media_kind='image',
            media_content_type='image/png',
            caption='A caption to narrate.',
            media_bytes=10,
        )

    def test_per_slide_audio_uses_run_type_voice(self) -> None:
        captured_voice = []

        def fake_synth(text, *, voice, model='gpt-4o-mini-tts', speed=1.0):
            captured_voice.append(voice)
            return narration.NarrationResult(
                mp3_bytes=b'MP3', voice=voice, model=model,
                input_chars=len(text), cost_usd=Decimal('0.001'),
            )

        # Provide a real PNG to the slide's media field via direct file
        # save so the FileField has a backing file.
        from django.core.files.base import ContentFile
        slide = self.slideshow.slides.get(position=1)
        slide.media.save('shot.png', ContentFile(b'\x89PNG\r\n'), save=True)

        with mock.patch('slideshows.narration.synthesize', side_effect=fake_synth):
            narration.narrate_slideshow(self.slideshow)

        self.assertEqual(captured_voice, ['shimmer'])
