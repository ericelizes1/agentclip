'''Generate per-slide narration MP3s for a slideshow via OpenAI TTS.

    python manage.py narrate <share_token>
    python manage.py narrate <share_token> --force
    python manage.py narrate <share_token> --voice echo
    python manage.py narrate <share_token> --dry-run

Operator-side counterpart to the public POST
/api/v1/slideshow/<share_token>/narrate/ endpoint. Both use the same
slideshows.narration.narrate_slideshow function under the hood; the
difference is the surface — Django admin / SSH-only for this command
vs. write_token-authenticated for the API endpoint.

Use the API endpoint for routine narration via the agentclip CLI.
Use this command for one-off operator runs (e.g., backfilling
narration on a clip whose owner no longer has the write_token, or
re-narrating after a model upgrade where the API call would be
inconvenient to scriptl).
'''

from __future__ import annotations

from django.core.management.base import BaseCommand, CommandError

from slideshows import narration
from slideshows.models import Slideshow


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

        try:
            result = narration.narrate_slideshow(
                slideshow,
                voice=voice,
                force=force,
                dry_run=dry_run,
            )
        except narration.NarrationConfigError as exc:
            raise CommandError(str(exc))

        for outcome in result.outcomes:
            label = f'  slide {outcome.position:02d}'
            if outcome.status == 'narrated':
                self.stdout.write(self.style.SUCCESS(
                    f'{label}: narrated ({outcome.chars} chars, '
                    f'${outcome.cost_usd:.4f}, voice={outcome.voice})'
                ))
            elif outcome.status == 'planned':
                self.stdout.write(
                    f'{label}: would narrate ({outcome.chars} chars, '
                    f'est ${outcome.cost_usd:.4f})'
                )
            else:  # skipped
                self.stdout.write(f'{label}: skip ({outcome.reason})')

        prefix = '[dry-run] would narrate' if result.dry_run else 'narrated'
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(
            f'{prefix}: {result.narrated} of {len(slides)} slides '
            f'({result.skipped} skipped, {result.total_chars} chars, '
            f'${result.total_cost_usd:.4f} total)'
        ))
