'''Seed five demo slideshows for the home-page gallery.

Run once after deploying to a fresh environment:

    python manage.py seed_gallery

Each row is created with `is_gallery=True` and a sequential
`gallery_position` (1..5), so it shows up on the home page
immediately — no source-code edits required. Operators can curate
further (re-order, hide, add their own) via Django admin.

Each demo demonstrates a different agent-QA pattern referenced in
SKILL.md (signup bug repro, onboarding walkthrough, competitive
analysis, regression check, feature tour). Fixture images are
intentionally stand-ins; replace with real screenshots from actual
agent runs when capacity allows.

This command is idempotent only in the sense that it creates new
rows on every run; it does not deduplicate. Re-running on a DB
that already has gallery rows will surface duplicates the operator
must trim via admin.
'''

from __future__ import annotations

from pathlib import Path

from django.core.files import File
from django.core.management.base import BaseCommand

from slideshows.models import MediaKind, Slide, Slideshow

FIXTURE_DIR = Path(__file__).parent / 'fixtures'

# Five demo clips. Each tuple is (theme_key, title, description, summary, slides).
# Each slide is (frame_filename_under_fixtures, caption).
DEMO_CLIPS = [
    (
        'signup-bug',
        'Signup flow QA on staging',
        "Walking through the new-user signup as a brand-new account. Looking for friction, broken validation, and surprises.",
        'Tested signup end-to-end on staging. Validation passed all three edge cases. One real bug: the /api/users endpoint returns 500 when the email contains a plus sign (slide 4). Two minor copy issues noted.',
        [
            ('signup-bug_01.png', 'Loaded the signup page as a fresh user. Form is clean, three required fields, password strength meter visible. Good first impression.'),
            ('signup-bug_02.png', 'Submitted with empty fields to test validation. Got the inline error states on each field, no submission. Clean.'),
            ('signup-bug_03.png', 'Filled with valid data and clicked Submit. Loading state engaged for ~800ms, no spinner overlay.'),
            ('signup-bug_04.png', 'Got a 500 response from /api/users for an email containing a plus sign. Backend issue. Real bug, slide ID for ticket: signup-bug-04.'),
        ],
    ),
    (
        'onboarding',
        'Onboarding walkthrough — first 60 seconds',
        'Capturing the experience of a brand-new user from landing page to first task completed. Five slides, no narration of self.',
        'Onboarding works end-to-end. Hero CTA is clear, the four-step setup is well-paced, and the dashboard renders fast on first load. No bugs surfaced. Suggest tightening the copy on step 2.',
        [
            ('onboarding_01.png', 'Landing page above the fold. Hero headline, two CTAs, single screenshot of the product. Conversion target is the dark Sign Up button.'),
            ('onboarding_02.png', 'Clicked Sign Up. Modal opened over the page, did not navigate away. Three fields, OAuth options visible. Smooth.'),
            ('onboarding_03.png', 'Step 1 of onboarding: name and team. Inline validation, no full-page reload. Filled and continued.'),
            ('onboarding_04.png', 'Step 2: pick a workspace template. Six options, two recommended. Picked "Engineering" and continued.'),
            ('onboarding_05.png', 'Dashboard loaded in under 1.2 seconds. Empty state has a clear next action: Create your first project.'),
        ],
    ),
    (
        'competitive',
        'Competitive analysis: Acme Corp pricing flow',
        'Cataloging how a competitor structures their pricing page and signup. For internal product review only.',
        'Competitor uses a four-tier pricing layout with anchor pricing. Free tier has a credit card requirement after day 14. Onboarding feels heavier than ours.',
        [
            ('competitive_01.png', 'Competitor home page. Hero is a video loop. Three CTAs above the fold; primary leads to pricing.'),
            ('competitive_02.png', 'Pricing page: four tiers, monthly default, annual saves 20 percent. Anchor tier is highlighted with a "Most popular" pill.'),
            ('competitive_03.png', 'Signed up for the free tier. Required a credit card after the email-verification step. Worth noting.'),
        ],
    ),
    (
        'regression',
        'Post-deploy smoke test on production',
        'Smoke pass after the v2.4 deploy. Five critical paths exercised: signin, project create, file upload, settings, signout.',
        'All five critical paths pass. Performance is unchanged versus pre-deploy baseline. Zero regressions. Cleared to leave the deploy in place.',
        [
            ('regression_01.png', 'Pre-deploy baseline: dashboard renders in 1.1s with five projects pinned. Captured for diff.'),
            ('regression_02.png', 'Post-deploy: same dashboard, same five projects, same pin order. Render time 1.0s. Unchanged behavior.'),
            ('regression_03.png', 'File upload smoke test: 4MB PNG to a project. Upload completes, thumbnail appears, no console errors.'),
            ('regression_04.png', 'Settings save: changed the timezone, refreshed, value persisted. No regressions on the settings path.'),
        ],
    ),
    (
        'feature-tour',
        'New search feature: end-to-end walkthrough',
        'Demonstrating the search feature shipped this morning. Queries, filters, result navigation, edge cases.',
        'Search ships clean. Free-text queries return relevant results, filters work correctly, deep linking to a specific result preserves filter state on reload. One small UX note flagged for follow-up.',
        [
            ('feature-tour_01.png', 'Opened the new global search. Cmd+K binding works. Search input appears centered, focus on open.'),
            ('feature-tour_02.png', 'Typed "QA report". Got 12 results across three result types: docs, projects, slideshows. Highlighting works on the matched substring.'),
            ('feature-tour_03.png', 'Applied the "Last 7 days" filter. Results narrowed to four. Filter chip is removable.'),
            ('feature-tour_04.png', 'Clicked into a result. Page loaded with filter state preserved in the URL hash. Browser back returns to the search with results intact.'),
        ],
    ),
]


class Command(BaseCommand):
    help = 'Create five demo slideshows for the home-page gallery (is_gallery=True).'

    def handle(self, *args, **options):
        if not FIXTURE_DIR.exists():
            self.stderr.write(self.style.ERROR(f'fixtures directory not found: {FIXTURE_DIR}'))
            return

        for gallery_position, (theme, title, description, summary, slides_data) in enumerate(
            DEMO_CLIPS, start=1
        ):
            slideshow = Slideshow.objects.create(
                title=title,
                description=description,
                summary=summary,
                created_by='AgentClip',
                created_by_url='https://github.com/ericelizes1/agentclip',
                is_gallery=True,
                gallery_position=gallery_position,
            )
            for position, (filename, caption) in enumerate(slides_data, start=1):
                fixture_path = FIXTURE_DIR / filename
                if not fixture_path.exists():
                    self.stderr.write(self.style.WARNING(
                        f'  skipping missing fixture: {fixture_path}'
                    ))
                    continue
                with fixture_path.open('rb') as fh:
                    Slide.objects.create(
                        slideshow=slideshow,
                        position=position,
                        media=File(fh, name=filename),
                        media_kind=MediaKind.IMAGE,
                        media_content_type='image/png',
                        caption=caption,
                    )
            self.stdout.write(self.style.SUCCESS(
                f'  created {theme:>14}  /s/{slideshow.share_token}/  '
                f'(position={gallery_position}, {len(slides_data)} slides)'
            ))

        self.stdout.write('')
        self.stdout.write(self.style.NOTICE(
            'Gallery seeded. The home page (web/) will fetch these via '
            '/api/v1/gallery/ on next request. Curate further via Django '
            'admin if needed.'
        ))
