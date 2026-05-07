'''Generate per-slide narration MP3s for a slideshow via OpenAI TTS.

    python manage.py narrate <share_token>
    python manage.py narrate <share_token> --force
    python manage.py narrate <share_token> --voice echo
    python manage.py narrate <share_token> --dry-run

Loops the slideshow's slides, generates an MP3 from each caption via
slideshows.narration.synthesize, and uploads it to the configured
storage backend (R2 in production, local FS in dev) under
slideshows/<slug>/audio/<position>.mp3.

Idempotent: by default, slides that already have audio are skipped
silently so re-running after adding a new slide only narrates the
new ones. --force regenerates everything (and overwrites existing
audio in the bucket).

Cost summary printed at the end of each run; uses the local pricing
constant in slideshows.narration so we don't have to hit the OpenAI
billing API to know what we just spent.
'''

from __future__ import annotations

from decimal import Decimal

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand, CommandError

from slideshows import narration
from slideshows.models import Slide, Slideshow


class Command(BaseCommand):
    help = 'Generate per-slide narration MP3s for a slideshow via OpenAI TTS.'

    def add_arguments(self, parser):
        parser.add_argument(
            'share_token',
            help='Share token of the slideshow to narrate.',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help=(
                'Regenerate audio for slides that already have a narration. '
                'Without this flag, narrated slides are skipped.'
            ),
        )
        parser.add_argument(
            '--voice',
            default=narration.DEFAULT_VOICE,
            help=f'OpenAI TTS voice to use. Default: {narration.DEFAULT_VOICE}',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help=(
                'Print what would be narrated and the estimated cost; '
                'do not call OpenAI or write to the database.'
            ),
        )

    def handle(self, *args, **options):
        share_token = options['share_token']
        force = options['force']
        voice = options['voice']
        dry_run = options['dry_run']

        try:
            slideshow = Slideshow.objects.get(share_token=share_token)
        except Slideshow.DoesNotExist:
            raise CommandError(
                f"slideshow not found for share_token '{share_token}'"
            )

        slides = list(slideshow.slides.order_by('position'))
        if not slides:
            self.stdout.write(self.style.WARNING(
                f'slideshow {share_token!r} has no slides; nothing to narrate'
            ))
            return

        self.stdout.write(
            f'narrating slideshow {slideshow.title or share_token!r} '
            f'({len(slides)} slides, voice={voice}, '
            f'force={force}, dry_run={dry_run})'
        )

        total_chars = 0
        total_cost = Decimal('0')
        narrated = 0
        skipped = 0

        for slide in slides:
            label = f'  slide {slide.position:02d}'

            if not slide.caption or not slide.caption.strip():
                self.stdout.write(f'{label}: skip (caption is empty)')
                skipped += 1
                continue

            if slide.audio and not force:
                self.stdout.write(f'{label}: skip (already narrated)')
                skipped += 1
                continue

            chars = len(slide.caption)
            est_cost = (
                (Decimal(chars) / Decimal(1000)) * narration.HD_COST_PER_1K_CHARS
            )

            if dry_run:
                self.stdout.write(
                    f'{label}: would narrate ({chars} chars, est ${est_cost:.4f})'
                )
                total_chars += chars
                total_cost += est_cost
                continue

            try:
                result = narration.synthesize(slide.caption, voice=voice)
            except narration.NarrationConfigError as exc:
                raise CommandError(str(exc))
            except ValueError as exc:
                self.stdout.write(self.style.WARNING(
                    f'{label}: skip (synthesis rejected: {exc})'
                ))
                skipped += 1
                continue

            self._save_audio(slide, result)
            self.stdout.write(self.style.SUCCESS(
                f'{label}: narrated ({chars} chars, ${result.cost_usd:.4f}, '
                f'voice={result.voice})'
            ))
            total_chars += result.input_chars
            total_cost += result.cost_usd
            narrated += 1

        self._print_summary(
            total=len(slides),
            narrated=narrated,
            skipped=skipped,
            total_chars=total_chars,
            total_cost=total_cost,
            dry_run=dry_run,
        )

    def _save_audio(self, slide: Slide, result: narration.NarrationResult) -> None:
        '''Persist the generated MP3 to storage and the slide row.

        FileField.save() uploads via the configured STORAGES backend
        (R2 in production via S3Boto3Storage). When the bucket already
        has a file at the deterministic name, django-storages will
        suffix the new upload — accept that for now since manual
        cleanup of the previous file isn't worth the complexity in
        v1; the most-recent URL is what serves.
        '''
        filename = f'{slide.position}.mp3'
        slide.audio.save(filename, ContentFile(result.mp3_bytes), save=False)
        slide.audio_voice = result.voice
        slide.audio_duration_ms = 0  # extraction deferred; player handles 0
        slide.save(update_fields=['audio', 'audio_voice', 'audio_duration_ms'])

    def _print_summary(
        self,
        *,
        total: int,
        narrated: int,
        skipped: int,
        total_chars: int,
        total_cost: Decimal,
        dry_run: bool,
    ) -> None:
        prefix = '[dry-run] would narrate' if dry_run else 'narrated'
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(
            f'{prefix}: {narrated} of {total} slides '
            f'({skipped} skipped, {total_chars} chars, '
            f'${total_cost:.4f} total)'
        ))
