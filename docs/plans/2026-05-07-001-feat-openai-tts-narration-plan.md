---
title: 'feat: OpenAI TTS narration so visitors watch real videos on agentclip.dev'
type: feat
status: active
date: 2026-05-07
---

# feat: OpenAI TTS narration so visitors watch real videos on agentclip.dev

## Overview

AgentClip's marketing now positions the product as a Loom competitor where a coding
agent records itself, narrates each screen, and ships a watchable walkthrough. The
artifact today is a captioned silent slideshow — a credibility gap with the copy.
This plan ships a real narrated experience: each slide gets an MP3 generated via
OpenAI TTS-1-HD ("nova" voice), uploaded alongside its image to Cloudflare R2.
The web viewer plays slide images synchronously with audio and auto-advances on
audio end. Generation is operator-controlled via a Django management command —
no auto-narration on every clip create, no surprise OpenAI bills.

The home page's `HeroPreview` is the highest-leverage surface: visitors land,
click play, and hear "nova" describe what the agent did. This plan keeps the
existing silent-slideshow viewer as graceful fallback so older slideshows (and
slideshows whose narration generation hasn't run yet) still render correctly.

## Problem Frame

The hero copy says "Your coding agent now makes narrated, shareable walkthroughs
of your work." Visitors who click through to a clip see a silent slideshow. The
gap between promise and product erodes credibility and prevents word-of-mouth
sharing — the artifact isn't watchable in the way "Skip the demo" implies.

The fix: make the narrated walkthrough real. Per-slide audio. Synchronized
playback. One shareable URL the recipient can play and walk away understanding
what the agent did. We accept manual operator control for v1 — generation runs
once per featured clip via CLI, costs ~$0.01 per slideshow, no autoscaling
surprises while the product finds its footing.

## Requirements Trace

- R1. Each slide of a slideshow can carry a generated MP3 audio narration of its
  caption (sourced from OpenAI TTS-1-HD, voice "nova").
- R2. Audio files live in the same R2 bucket as media files, served via the same
  public-host domain (no new infra).
- R3. Operators can generate, regenerate, and verify narration via a single CLI
  command per slideshow (`python manage.py narrate <share_token>`).
- R4. The public API exposes `audio_url` on each slide so the frontend can play
  it; existing slideshows without audio continue to serve cleanly.
- R5. The home-page hero polaroid plays the narrated walkthrough inline when the
  featured clip has audio on every slide; falls back to today's silent autoplay
  otherwise.
- R6. The public viewer (`/s/[token]`) plays the narrated walkthrough as a
  proper video-style player when audio is available, with play/pause/scrub/mute
  controls and auto-advance on audio end.
- R7. Migration is non-disruptive — no data transformation required, no breaking
  serializer change for existing API consumers.
- R8. Generation is idempotent — re-running the CLI on a slideshow skips slides
  that already have audio unless `--force` is passed; reports per-slide status
  and total OpenAI cost in the output.

## Scope Boundaries

- Auto-narration on slideshow create — deferred to v2 (manual control wins this
  iteration; chosen explicitly to control quality and spend).
- Voice cloning or custom voices — stock "nova" only.
- Streaming narration / SSE — full-file generation only.
- Provider abstraction layer for ElevenLabs/Cartesia/etc. — single OpenAI
  implementation now; refactor to abstract once we actually swap.
- Captions/subtitles overlay drawn on the video player — slide caption already
  renders below the media.
- Mobile-app embed of the player — web only.
- Re-generating audio when a caption is edited — operator re-runs the CLI; no
  change-detection plumbing yet.

### Deferred to Separate Tasks

- Auto-narration pipeline (background job on slideshow create): future PR once
  manual-mode usage data tells us the cost/quality envelope.
- Provider abstraction (ElevenLabs swap): future PR if we decide stock OpenAI
  voices aren't enough.

## Context & Research

### Relevant Code and Patterns

- `api/slideshows/models.py` — `Slide` model and `_slide_media_path` helper (line
  92). New `audio` FileField mirrors `media` exactly: same FileField pattern,
  same upload-to function shape, same R2 backend transparency.
- `api/agentclip_app/settings.py` (lines 161–197) — `STORAGES['default']`
  uses `S3Boto3Storage` routed through `R2_ACCESS_KEY_ID`/`R2_BUCKET`/
  `R2_ENDPOINT`/`R2_PUBLIC_HOST`. FileField uploads transparently use this
  backend. No new storage config required for audio.
- `api/slideshows/serializers.py` — `SlidePublicSerializer` (lines 61–70) shows
  the `media_url` SerializerMethodField + `_absolute_media_url` pattern. New
  `audio_url` follows the same shape, returning `None` when `audio` is blank.
- `api/slideshows/migrations/0007_slideshow_is_hero.py` — most recent migration
  pattern (BooleanField default=False, db_index=True). Audio fields are
  similarly additive, all nullable/blankable so existing rows backfill silently.
- `web/components/patterns/HeroPreview/HeroPreview.tsx` — existing inline
  autoplay loop (2.8s interval, vermillion play overlay, progress bar). Audio
  variant replaces the timer-driven advance with `audio.ended` event-driven
  advance. Same play/pause UI; same fallback.
- `web/components/patterns/ClipViewer/ClipViewer.tsx` — current public viewer
  renders `<ol>` of all slides at once. Audio variant becomes a single-slide
  player at the top (with the same scrubber + creator chip layout below) and
  the silent `<ol>` becomes the fallback for non-narrated clips.
- `web/lib/api-schema.json` + `pnpm gen:api` — typed OpenAPI client
  regeneration. Adding `audio_url` to `SlidePublicSerializer` automatically
  propagates the field into `web/lib/api-types.ts` after schema regen.

### Institutional Learnings

- `docs/solutions/` is empty, so no prior solutions to reference. The `is_hero`
  feature shipped earlier this session is the closest precedent for a
  serializer-only addition with a frontend toggle.

### External References

- OpenAI TTS API: `client.audio.speech.create(model="tts-1-hd", voice="nova",
  input=...)` returns an HTTP response whose body is the MP3 stream. The
  recommended pattern is `with client.audio.speech.with_streaming_response.
  create(...) as response: response.stream_to_file(path)`. Pricing as of 2026:
  $0.030/1K characters at HD; a typical 4-slide walkthrough at ~50 chars/slide
  costs ~$0.006.
- The `openai` Python SDK is the canonical client; supports `OPENAI_API_KEY`
  env-var auth out of the box. Need to add to `api/pyproject.toml`.
- Synchronous HTML5 `<audio>` + slide-image playback: the player pattern is
  well-established (Howler.js, react-h5-audio-player). For our needs (single
  audio element at a time, no playlist scrubbing across multiple files), a
  hand-rolled `<audio ref>` + `audio.addEventListener('ended', advance)` is
  the simplest implementation; no library needed.

## Key Technical Decisions

- **Storage backend is Cloudflare R2**, not DigitalOcean Spaces. The original
  feature description mentioned Spaces but the codebase actually uses R2 via
  `S3Boto3Storage`. Audio FileField goes to the same R2 bucket, served at the
  same custom domain (`R2_PUBLIC_HOST`). No new storage config or env vars.
- **`audio` is a Django `FileField`**, not a string `audio_url`. FileField
  routes through Django's storage backend automatically (R2 in production,
  local FS in dev), gives us deletion-on-row-delete semantics, and exposes the
  same public URL via `obj.audio.url` that `media.url` already provides. The
  serializer method exposes it as `audio_url` for the public API.
- **Per-slide audio, not a single concatenated MP3 per slideshow**. Lets the
  player advance to the next slide cleanly when each slide's audio ends, and
  lets the operator regenerate one slide's narration without re-rendering the
  whole walkthrough.
- **Manual generation via Django management command**, not auto-on-create.
  Eric runs `python manage.py narrate <token>` per featured clip. Deliberate
  for v1: predictable cost, controllable quality, no surprise bills, no
  background-job infrastructure needed.
- **Idempotent + `--force` flag**: re-running the command skips slides that
  already have audio unless explicitly forced. Lets the operator add new
  slides to a slideshow and narrate just the new ones cheaply.
- **Audio metadata stored on Slide row**: `audio_voice` (which voice was
  used — defaults to "nova") and `audio_duration_ms` (for player UX so the
  scrubber bar can render before audio loads). `audio_provider` deliberately
  omitted — single provider for v1.
- **Frontend renders new player only when *all* slides have `audio_url`**.
  Mixed slideshows (some narrated, some not) fall back to silent slideshow.
  Avoids the awkward UX of audio cutting out mid-walkthrough.
- **OpenAI client is constructed lazily in the service module**, not at import
  time, so missing `OPENAI_API_KEY` doesn't break Django startup. Tests mock
  the client; production assumes the env var is present.
- **No new auth scaffolding** — the `narrate` command runs server-side via
  `fly ssh console -a agentclip-api` + `python manage.py narrate`. The
  operator is already root inside the container; no token check needed.
- **MP3 file naming follows the same `_slide_audio_path` shape** as media:
  `slideshows/<share_token>/audio/<position>.mp3`. Predictable, deterministic,
  enables overwrite-on-regenerate.
- **Hero player replaces, not augments, the existing silent autoplay**.
  `HeroPreview` gains an internal branch: when every slide has `audio_url`,
  use the audio-driven advance; otherwise the existing timer-driven advance
  stays. No separate `<NarratedHeroPreview>` component — same visual surface,
  swapped engine.

## Open Questions

### Resolved During Planning

- **Where does the CLI live: `agentclip` Python package or a Django management
  command?** → Django management command in `api/slideshows/management/
  commands/narrate.py`. The CLI package is for *agents* uploading slides; this
  is an *operator* tool that needs Django ORM access. Django management
  commands are the right home for ORM-backed operator tooling.
- **MP3 streaming vs full download to memory?** → Streaming download to a
  `tempfile.NamedTemporaryFile`, then upload to R2 via FieldFile.save(). Avoids
  loading the whole MP3 into memory and matches Django's File handling
  expectations.
- **Audio MIME type stored on the row?** → No. We always emit MP3 at HD
  quality; provider/format details belong in the service module, not the
  schema. Add `audio_voice` for forensic/audit value (which voice was used)
  and `audio_duration_ms` for player UX.
- **What's a sensible per-slide character limit before warning the operator?**
  → OpenAI TTS-1-HD accepts up to 4096 characters per call. A slide caption
  hitting 4096 would be ~600 words — unrealistic. Cap warning at 1500 chars
  (~3 minutes spoken at 200 wpm); fail at 4096. Slide captions in practice
  are 50–200 chars.
- **What does the player look like on mobile?** → Same player as desktop.
  Tap-to-play (Safari requires user gesture before audio starts; the
  existing tap-to-play pattern on `HeroPreview` already satisfies this).
  Play/pause/scrub/mute controls are touch-targets ≥44px tall.

### Deferred to Implementation

- **Exact `audio_duration_ms` extraction approach** — `pydub` (requires
  ffmpeg) vs reading from OpenAI's response (does the SDK expose duration?)
  vs HTML5 `<audio>` `loadedmetadata` event on the frontend with a
  one-time API patch back. Implementer picks whichever is simplest; if all
  three are awkward we ship without `audio_duration_ms` and let the
  scrubber show indeterminate progress until first play. Not worth blocking
  the plan.
- **Whether to invalidate the OpenAPI schema cache after the migration runs
  on Fly** — should be automatic (drf-spectacular regenerates on first
  request), but if the dev sees stale schema in the Next.js client they
  may need to re-run `pnpm gen:api` against the deployed `/api/schema/`.
- **Whether the new `<VideoClipPlayer>` should expose imperative play/pause
  controls via `forwardRef`** — only needed if the home-page wants to
  start autoplay on a parent action. Decide during implementation when the
  UX is concrete.

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for
> review, not implementation specification. The implementing agent should
> treat it as context, not code to reproduce.*

### Generation flow

```
operator                django                 OpenAI TTS              R2 bucket
  │                       │                       │                       │
  │ python manage.py      │                       │                       │
  │ narrate <token>       │                       │                       │
  ├──────────────────────►│                       │                       │
  │                       │ for slide in slides:  │                       │
  │                       │   if slide.audio      │                       │
  │                       │   and not --force:    │                       │
  │                       │     skip              │                       │
  │                       │   else:               │                       │
  │                       │     generate(caption) │                       │
  │                       ├──────────────────────►│                       │
  │                       │ ◄────────────────MP3──┤                       │
  │                       │     slide.audio.save( │                       │
  │                       │       'N.mp3',        │                       │
  │                       │       File(tmpfile))  │                       │
  │                       ├──────────────────────────────────────────────►│
  │                       │     audio_voice='nova'│                       │
  │                       │     audio_duration_ms=N│                      │
  │                       │     .save()           │                       │
  │ ◄──per-slide status───┤                       │                       │
  │   total cost summary  │                       │                       │
```

### Playback flow (web)

```
HeroPreview / ClipViewer
        │
        ▼
allSlidesNarrated?
   │           │
  yes          no
   │           │
   ▼           ▼
<VideoClipPlayer>      <silent slideshow>   ← existing behavior
   │
   ├── render slide.media (image)
   ├── render <audio src={slide.audio_url} ref>
   ├── on play(): audio.play()
   ├── on audio.ended: setActive(i+1); audio.src = next; audio.play()
   ├── on scrub: setActive(target); audio.currentTime = 0
   └── on last slide ended: pause; show "Replay" button
```

## Output Structure

New paths created by this plan:

```
api/slideshows/
├── narration.py                           # OpenAI TTS service module (new)
├── management/
│   └── commands/
│       └── narrate.py                     # `python manage.py narrate <token>` (new)
├── migrations/
│   └── 0008_slide_audio_fields.py         # audio FileField + audio_voice + audio_duration_ms (new)
└── tests/
    ├── test_narration_service.py          # service module unit tests (new)
    ├── test_narrate_command.py            # management command tests (new)
    └── test_slide_audio_serializer.py     # SlidePublicSerializer audio_url (new)

web/components/patterns/VideoClipPlayer/
├── VideoClipPlayer.tsx                    # new audio-driven player (new)
├── VideoClipPlayer.test.tsx               # autoplay, advance, fallback tests (new)
└── VideoClipPlayer.stories.tsx            # storybook (new)
```

Existing paths modified:

```
api/slideshows/
├── models.py                              # add audio + audio_voice + audio_duration_ms to Slide
└── serializers.py                         # add audio_url to SlidePublicSerializer

web/
├── lib/api-schema.json + lib/api-types.ts # regenerated from `manage.py spectacular` + `pnpm gen:api`
├── components/patterns/HeroPreview/
│   └── HeroPreview.tsx                    # branch to VideoClipPlayer when all slides narrated
└── components/patterns/ClipViewer/
    └── ClipViewer.tsx                     # branch to VideoClipPlayer when all slides narrated
```

## Implementation Units

### Unit 1: Slide audio model fields + migration

- [ ] **Goal:** Add nullable `audio` FileField + `audio_voice` + `audio_duration_ms`
  to the `Slide` model and ship the migration. No serializer or frontend changes
  yet — purely additive schema work that's safe to merge in isolation.

**Requirements:** R1, R2, R7

**Dependencies:** None

**Files:**
- Modify: `api/slideshows/models.py`
- Create: `api/slideshows/migrations/0008_slide_audio_fields.py`

**Approach:**
- Add `_slide_audio_path(instance, filename) -> str` helper mirroring
  `_slide_media_path`. Path shape: `slideshows/<share_token>/audio/<filename>`.
- Add three fields on `Slide`:
  - `audio = models.FileField(upload_to=_slide_audio_path, blank=True, null=True)`
  - `audio_voice = models.CharField(max_length=32, blank=True, default='', help_text='OpenAI TTS voice used (nova, alloy, etc.). Blank when audio is unset.')`
  - `audio_duration_ms = models.PositiveIntegerField(default=0, help_text='Duration of the generated MP3 in milliseconds. 0 when audio is unset or duration extraction failed.')`
- Run `DJANGO_DEBUG=true uv run python manage.py makemigrations slideshows` to
  generate the migration; verify it only contains additive AddField operations.
- Existing rows backfill silently (audio NULL, voice blank, duration 0).

**Patterns to follow:**
- `_slide_media_path` at `api/slideshows/models.py:92`
- `Slide.media` field declaration at `api/slideshows/models.py:284`
- Migration shape from `api/slideshows/migrations/0007_slideshow_is_hero.py`

**Test scenarios:**
- Happy path — Slide instance can be created with `audio=None`, `audio_voice=''`,
  `audio_duration_ms=0`; round-trips through the ORM with no errors.
- Happy path — Slide instance accepts a `ContentFile` saved into `audio`;
  `slide.audio.url` returns a non-empty string after save (uses local FS in
  test environment).
- Edge case — Existing slides created before this migration (simulated via raw
  SQL in test fixtures or a data migration test) load with `audio=None` and
  serialize cleanly.
- Edge case — `audio_duration_ms` accepts 0 and rejects negative values
  (PositiveIntegerField guard).

**Verification:**
- `uv run python manage.py migrate slideshows` applies cleanly on a fresh DB
  AND on a DB that already has 0007 applied.
- `uv run python manage.py test slideshows` reports 91+N passing tests.
- The migration file is the only change — no model behavior shifts.

### Unit 2: OpenAI TTS service module

- [ ] **Goal:** Wrap the OpenAI TTS API in a small `narration` module with a
  single function the management command will call. Returns the MP3 bytes (and
  optional duration metadata) without any storage or DB side effects — pure
  text-in, audio-out.

**Requirements:** R1

**Dependencies:** None (parallel with Unit 1)

**Files:**
- Create: `api/slideshows/narration.py`
- Create: `api/slideshows/tests/test_narration_service.py`
- Modify: `api/pyproject.toml` (add `openai` to dependencies)

**Approach:**
- Module-level constants for defaults: `DEFAULT_MODEL = 'tts-1-hd'`,
  `DEFAULT_VOICE = 'nova'`, `MAX_INPUT_CHARS = 4096`,
  `WARN_INPUT_CHARS = 1500`, `OPENAI_HD_COST_PER_1K_CHARS = Decimal('0.030')`.
- Public function: `synthesize(text: str, *, voice: str = DEFAULT_VOICE,
  model: str = DEFAULT_MODEL) -> NarrationResult`.
  - `NarrationResult` is a small dataclass: `mp3_bytes: bytes`, `voice: str`,
    `model: str`, `input_chars: int`, `cost_usd: Decimal`.
- Lazy client construction: `_client()` reads `OPENAI_API_KEY` from env; raises
  `NarrationConfigError` (custom) when missing. No client at import time.
- Validation: raise `ValueError` when `len(text) > MAX_INPUT_CHARS`; emit a
  warning via `logger.warning` when over `WARN_INPUT_CHARS`.
- Use `client.audio.speech.with_streaming_response.create(...)` to stream the
  MP3 into a `BytesIO`, return `.getvalue()` as `mp3_bytes`. No tempfile —
  service stays pure data; the management command handles tempfile + upload.
- Cost calculation: `(input_chars / 1000) * OPENAI_HD_COST_PER_1K_CHARS`.
- One retry with exponential backoff (1s, 2s) on `openai.APITimeoutError` and
  `openai.RateLimitError`. Other errors propagate so the operator sees them.

**Patterns to follow:**
- Module-as-service (no class) — matches the existing `api/slideshows/auth.py`
  shape.
- Lazy resource construction — like `STORAGES` config in settings (env-gated).

**Test scenarios:**
- Happy path — `synthesize("hello")` with a mocked OpenAI client returns a
  `NarrationResult` whose `mp3_bytes` matches the mock response, `voice='nova'`,
  `input_chars=5`, `cost_usd=Decimal('0.00015')`.
- Happy path — explicit `voice='echo'` arg overrides default; result `.voice`
  is 'echo'.
- Error path — `synthesize("")` raises `ValueError('caption is empty')` before
  any API call.
- Error path — text longer than `MAX_INPUT_CHARS` raises
  `ValueError('caption exceeds 4096 chars')` before any API call.
- Error path — `OPENAI_API_KEY` unset raises `NarrationConfigError` from the
  first `_client()` call (test by clearing env var).
- Error path — `openai.APITimeoutError` retries once then succeeds; mock
  records two calls.
- Error path — non-retryable `openai.AuthenticationError` propagates without
  retry.
- Edge case — caption at exactly 1500 chars logs a warning but succeeds;
  caption at exactly 4096 succeeds; 4097 raises.

**Verification:**
- `uv run python manage.py test slideshows.tests.test_narration_service` passes.
- `api/pyproject.toml` declares `openai>=2.0` (or current major) as a runtime
  dependency.
- Importing `slideshows.narration` does not require `OPENAI_API_KEY` to be set.

### Unit 3: `narrate` Django management command

- [ ] **Goal:** Single-command operator workflow. Loops a slideshow's slides,
  calls `narration.synthesize` for each missing audio, uploads the MP3 to R2
  via the FileField, persists `audio_voice` and `audio_duration_ms`. Idempotent
  by default; `--force` regenerates everything.

**Requirements:** R3, R8

**Dependencies:** Unit 1 (model fields), Unit 2 (service module)

**Files:**
- Create: `api/slideshows/management/__init__.py` (if not exists)
- Create: `api/slideshows/management/commands/__init__.py` (if not exists)
- Create: `api/slideshows/management/commands/narrate.py`
- Create: `api/slideshows/tests/test_narrate_command.py`

**Approach:**
- Django `BaseCommand` subclass. Args:
  - Positional: `share_token` (required)
  - `--force` (re-narrate slides that already have audio)
  - `--voice` (override default "nova")
  - `--dry-run` (show what would be generated + total cost; skip the API)
- Resolve the slideshow via `Slideshow.objects.get(share_token=...)`. 404 →
  print friendly error to stderr, exit code 1.
- For each slide in `.slides.order_by('position')`:
  - If slide already has audio and not `--force`: print "skip slide N
    (already narrated)".
  - Else: call `narration.synthesize(slide.caption, voice=voice)`.
  - Wrap the resulting `mp3_bytes` in a `ContentFile`, save via
    `slide.audio.save(f'{slide.position}.mp3', ContentFile(...))`.
  - Optionally compute duration (see deferred question on `pydub` vs HTML5
    extraction; implementer chooses).
  - Persist `audio_voice` and `audio_duration_ms` (or 0 if not extracted).
- After the loop, print a summary line: total slides processed, total
  characters synthesized, total cost in USD (sum of per-slide
  `NarrationResult.cost_usd`).
- All status messages via `self.stdout.write()` / `self.stderr.write()` so
  the command behaves correctly under `manage.py` redirection.

**Patterns to follow:**
- Standard Django `BaseCommand` shape — no Django command exists in this
  app yet, so this is establishing the convention. Keep it minimal.
- File save via `FileField.save(name, ContentFile, save=True)` — the
  pattern `Slideshow.objects.create()` already uses for media in
  tests/fixtures.

**Test scenarios:**
- Happy path — slideshow with 3 slides, none narrated; running the command
  generates 3 MP3s. Slides have non-empty `audio.name`, `audio_voice='nova'`,
  `audio_duration_ms` populated. Final stdout reports "3 slides narrated, X
  chars, $0.0XX".
- Happy path — slideshow already fully narrated; running without `--force`
  prints "skip" for every slide; OpenAI mock receives zero calls; cost
  reported as $0.000.
- Happy path — `--force` re-narrates all slides; old `audio` field is
  overwritten; mock receives N calls.
- Happy path — `--voice echo` passes the override through to
  `narration.synthesize`; saved `audio_voice` is 'echo'.
- Happy path — `--dry-run` reports planned cost without calling OpenAI;
  mock receives zero calls; no DB writes.
- Error path — unknown share_token exits with code 1, writes friendly error
  to stderr.
- Error path — `OPENAI_API_KEY` unset raises `NarrationConfigError`; command
  exits 1 with a clear message ("set OPENAI_API_KEY before running").
- Edge case — slide with empty caption is skipped (same logic as the
  service-level `ValueError` would trigger; command catches and reports
  "skip slide N (caption empty)").
- Integration scenario — run the command, then read the slideshow back via
  the public serializer; `audio_url` is non-empty for the narrated slides.

**Verification:**
- `uv run python manage.py test slideshows.tests.test_narrate_command` passes.
- Command help text (`python manage.py narrate --help`) renders cleanly with
  all three flags documented.
- Running the command end-to-end against a local seed slideshow with a real
  `OPENAI_API_KEY` produces audible MP3s in `MEDIA_ROOT/slideshows/<token>/
  audio/`.

### Unit 4: `audio_url` on the public serializer + OpenAPI regen

- [ ] **Goal:** Expose `audio_url` on `SlidePublicSerializer` so the frontend
  can read it. Regenerate the OpenAPI schema and TypeScript types so the
  frontend gets the new field with full type safety.

**Requirements:** R4

**Dependencies:** Unit 1 (model fields)

**Files:**
- Modify: `api/slideshows/serializers.py`
- Create: `api/slideshows/tests/test_slide_audio_serializer.py`
- Modify (regenerated): `web/lib/api-schema.json`, `web/lib/api-types.ts`

**Approach:**
- Add `audio_url = serializers.SerializerMethodField()` on `SlidePublicSerializer`.
- Add `'audio_url'` to `Meta.fields` (after `media_url` for natural ordering).
- Implement `get_audio_url(self, obj: Slide) -> str | None`:
  - Return `None` when `not obj.audio`.
  - Otherwise return `_absolute_media_url(obj, ...)` adapted to read
    `obj.audio.url` instead of `obj.media.url`. (Refactor the helper to take
    the FieldFile directly, or duplicate the URL-build logic — implementer
    picks; the helper is short.)
- Optional: also expose `audio_voice` and `audio_duration_ms` on the public
  serializer for the player UX. Adding them is cheap; if the frontend doesn't
  consume them in v1 they're harmless.
- Regenerate the OpenAPI schema:
  `cd api && DJANGO_DEBUG=true uv run python manage.py spectacular --file ../web/lib/api-schema.json --format openapi-json`
  then `cd ../web && pnpm gen:api`. Verify `audio_url` appears in
  `lib/api-types.ts` under the slide schema as `audio_url: string | null`.

**Patterns to follow:**
- `SlidePublicSerializer.get_media_url` at `api/slideshows/serializers.py:69`
- The serializer-only addition pattern from when `is_hero` was added in this
  same session.

**Test scenarios:**
- Happy path — Slide with audio set: `SlidePublicSerializer(slide).data`
  contains `audio_url` matching `slide.audio.url` resolved against the
  request host.
- Happy path — Slide without audio: `audio_url` is `null` (JSON-serialized);
  `audio_voice` is `''`; `audio_duration_ms` is `0`.
- Happy path — Slideshow with one narrated and one un-narrated slide
  serializes both cleanly via `SlideshowPublicSerializer`; the embedded
  `slides[]` array has consistent shape.
- Edge case — Custom domain (`AWS_S3_CUSTOM_DOMAIN` set in test settings)
  produces an `audio_url` rooted at that custom host.

**Verification:**
- `uv run python manage.py test slideshows.tests.test_slide_audio_serializer`
  passes.
- `pnpm type:check` in `web/` passes after schema regeneration.
- `web/lib/api-types.ts` contains a `readonly audio_url: string | null` (or
  equivalent) on the slide payload.

### Unit 5: `<VideoClipPlayer>` component

- [ ] **Goal:** New frontend pattern that plays slide image + audio
  synchronously and auto-advances on `audio.ended`. Reusable in both
  `HeroPreview` (compact embed) and `ClipViewer` (full viewer page).

**Requirements:** R5, R6

**Dependencies:** Unit 4 (frontend types include `audio_url`)

**Files:**
- Create: `web/components/patterns/VideoClipPlayer/VideoClipPlayer.tsx`
- Create: `web/components/patterns/VideoClipPlayer/VideoClipPlayer.test.tsx`
- Create: `web/components/patterns/VideoClipPlayer/VideoClipPlayer.stories.tsx`

**Approach:**
- Props (rough shape, finalized in implementation):
  - `slides: VideoClipSlide[]` — each carries `media_url`, `media_kind`,
    `caption`, `position`, `audio_url`, optional `audio_duration_ms`.
  - `shareToken: string` — for the "Open clip" deep link in compact embeds.
  - `creatorName?: string` — passed through to a `CreatorChip` in the meta
    row.
  - `variant?: 'compact' | 'full'` — `compact` is for `HeroPreview` (smaller
    chrome, polaroid frame styling already applied by parent), `full` is for
    `/s/[token]` (chrome rendered inside, larger controls).
- Internal state: `active: number`, `playing: boolean`, `progress: number`
  (current audio time / duration, 0–1).
- Single `<audio>` element with `ref`. On slide change:
  - Set `audio.src = slides[active].audio_url`.
  - If `playing`, call `audio.play()`.
- Event handlers:
  - `audio.timeupdate` → update `progress` for the scrubber bar.
  - `audio.ended` → advance to next slide, or stop on last slide and show a
    "Replay" affordance.
  - `audio.error` → fallback: pause, surface a small "audio failed to load"
    notice, keep the slide visible.
- Controls: play/pause button (large, vermillion when paused, ink when
  playing), scrubber bar (click to seek within the current slide), mute
  toggle, slide-position dots (jump to slide N, pauses).
- First-play UX: tap-to-play overlay matches `HeroPreview`'s current pattern
  for Safari autoplay-with-audio rules. Once started, audio plays inline.
- Reduced-motion users: animations on play/pause are gated on
  `useReducedMotion`. Audio playback is unaffected (it's user-initiated).

**Patterns to follow:**
- `web/components/patterns/HeroPreview/HeroPreview.tsx` — current autoplay
  loop, vermillion play overlay, scrubber, slide dots. The new player should
  *visually mirror* this so the upgrade reads as continuity, not redesign.
- `web/components/composites/MediaFrame/MediaFrame.tsx` — slide media
  rendering with hideBadge prop; reuse it for the slide image.

**Test scenarios:**
- Happy path — initial render shows slide 1 with the play overlay; clicking
  play starts audio playback (mocked HTMLAudioElement) and shows the pause
  icon.
- Happy path — when the mock `audio.ended` event fires on slide 1, slide 2
  becomes active and audio.src updates; play continues.
- Happy path — on the last slide, `audio.ended` pauses playback and shows a
  "Replay" button; clicking Replay seeks to slide 1 and restarts.
- Happy path — clicking a position dot jumps to that slide; playback pauses
  and audio.currentTime resets to 0.
- Edge case — clicking the scrubber bar at 50% sets audio.currentTime to
  half the slide's duration.
- Edge case — `variant='compact'` renders without the larger NavBar/header
  chrome; `variant='full'` renders the title and meta-row above the media.
- Error path — `audio.error` event fires: the player pauses, surfaces a
  visible (but small) "audio failed" notice, slide image stays rendered.
- Integration scenario — when a slide has `audio_url=null`, the player
  doesn't crash; it skips that slide on advance OR pauses on it. Decide
  during implementation; the parent should never pass mixed-audio slides
  (the wrapper component checks `allSlidesHaveAudio` first), but defensive
  handling avoids runtime explosion.

**Verification:**
- `pnpm test web/components/patterns/VideoClipPlayer/` passes.
- Storybook story renders with three demo slides + mock MP3 URLs; manual
  smoke-test plays end to end without console warnings.
- `pnpm type:check` passes.

### Unit 6: `HeroPreview` integration — branch on narration availability

- [ ] **Goal:** Update `HeroPreview` to render the `VideoClipPlayer` (compact
  variant) when the featured clip's slides all have `audio_url`. Otherwise
  preserve today's silent autoplay behavior unchanged.

**Requirements:** R5

**Dependencies:** Unit 5 (`<VideoClipPlayer>` exists)

**Files:**
- Modify: `web/components/patterns/HeroPreview/HeroPreview.tsx`
- Modify: `web/components/patterns/HeroPreview/HeroPreview.test.tsx`

**Approach:**
- At the top of `HeroPreview`, derive
  `const allNarrated = slides.length > 0 && slides.every((s) => Boolean(s.audio_url))`.
- When `allNarrated`, render `<VideoClipPlayer variant="compact" slides={slides} shareToken={shareToken} creatorName={creatorName} />` and skip the existing autoplay timer + play overlay JSX.
- When `!allNarrated`, keep the existing behavior verbatim (no regression for
  silent slideshows).
- Update `HeroPreviewSlide` interface to include `audio_url?: string | null`.
- The polaroid frame, tilt, and rubber-stamp detail in the parent
  `HeroSection` are unchanged — they wrap whichever player renders.

**Patterns to follow:**
- The branch lives inside the existing client component. No new
  RecordingProvider wiring needed.

**Test scenarios:**
- Happy path — slides all have `audio_url`: renders `<VideoClipPlayer>`
  (assert by querying for the player's distinctive aria-label).
- Happy path — slides have no `audio_url`: renders the existing autoplay
  overlay (existing tests continue to pass).
- Edge case — mixed audio (some slides have `audio_url`, some don't): falls
  back to silent autoplay (the threshold is "every slide", not "any slide").
- Integration — the existing autoplay tests in
  `HeroPreview.test.tsx` continue to pass when slides have no `audio_url`.

**Verification:**
- `pnpm test web/components/patterns/HeroPreview/` passes (existing tests
  + new branch tests).
- Manual visual check on the home page: when a featured clip has audio,
  clicking the polaroid plays the audio; when it doesn't, the silent
  autoplay still works.

### Unit 7: `ClipViewer` integration — branch on narration availability

- [ ] **Goal:** Update the public viewer at `/s/[token]` to render the
  `VideoClipPlayer` (full variant) when every slide has `audio_url`.
  Otherwise preserve today's silent `<ol>` of slides unchanged.

**Requirements:** R6

**Dependencies:** Unit 5 (`<VideoClipPlayer>` exists)

**Files:**
- Modify: `web/components/patterns/ClipViewer/ClipViewer.tsx`
- Modify: `web/components/patterns/ClipViewer/ClipViewer.test.tsx`

**Approach:**
- Same pattern as Unit 6: derive `allNarrated`, branch.
- `<VideoClipPlayer variant="full">` replaces the `<ol>` of slides AND the
  `<MetaRow>`-with-creator chrome, since the full-variant player renders
  its own header with title + creator chip + scrubber.
- Keep the page-level NavBar and `<SummaryCallout>` (when present) — those
  are external to the player.
- Update `ClipViewerSlide` interface to include `audio_url?: string | null`.

**Patterns to follow:**
- Server component → client component handoff — the page at
  `web/app/s/[token]/page.tsx` already shapes the data and passes it to
  `<ClipViewer>`. No additional fetch logic.

**Test scenarios:**
- Happy path — slideshow with all-narrated slides renders the
  `<VideoClipPlayer variant="full">`; the silent `<ol>` is not in the
  document.
- Happy path — slideshow with no narration renders the existing `<ol>`;
  the player is not in the document.
- Edge case — mixed-audio slideshow falls back to the silent `<ol>`.
- Integration — existing `ClipViewer.test.tsx` assertions about the
  silent layout continue to pass when slides lack `audio_url`.

**Verification:**
- `pnpm test web/components/patterns/ClipViewer/` passes.
- Visiting `/s/<token>` for a narrated clip plays the audio walkthrough
  end to end; visiting an un-narrated clip renders the silent slideshow.

### Unit 8: Manual rollout playbook (docs)

- [ ] **Goal:** A short, accurate runbook the operator can follow to
  generate audio for the home-page hero clip end to end. Lives next to
  the plan so future iterations can reference it.

**Requirements:** (cross-cutting; supports R3, R5, R8)

**Dependencies:** Units 1–7 merged

**Files:**
- Create: `docs/playbooks/narrate-a-clip.md`

**Approach:**
- Document the operator workflow as a numbered checklist:
  1. Confirm `OPENAI_API_KEY` is set on agentclip-api Fly app
     (`fly secrets list -a agentclip-api`); add via
     `fly secrets set OPENAI_API_KEY=sk-... -a agentclip-api` if missing.
  2. SSH into the running machine: `fly ssh console -a agentclip-api`.
  3. Run: `python manage.py narrate <share_token>`. Verify the per-slide
     status lines and the total cost summary.
  4. Verify in Django admin (or via API) that the slideshow's slides now
     have `audio_url` populated.
  5. Optionally flip `is_hero=True` on the target slideshow via Django
     admin so the home page picks it up.
  6. The home-page `HeroPreview` will render the `VideoClipPlayer` on
     the next ISR rebuild (≤60s).
- Include a "common issues" section: missing `OPENAI_API_KEY`, transient
  rate-limit errors (use `--force` to retry), unexpected character counts
  (caption too long).
- Include a sample command session showing real output shape so the
  operator knows what success looks like.

**Test scenarios:**

- Test expectation: none — documentation. The implementer should follow
  the playbook end to end against a staging slideshow as the verification
  step, fixing any wording errors discovered during the walk.

**Verification:**
- The playbook can be followed verbatim against a real staging slideshow
  to produce a narrated clip visible on the home page.

## System-Wide Impact

- **Interaction graph:** No new callbacks, signals, or middleware added.
  The Slide model gains three nullable/blankable fields with no observers.
  The serializer gains one method field. The frontend pattern is additive
  (new component) with two parents branching to it.
- **Error propagation:** The narration service raises specific exceptions
  (`NarrationConfigError`, `ValueError`, OpenAI SDK exceptions). The
  management command catches and reports them with non-zero exit codes;
  operator sees the stderr message. The frontend player handles
  `audio.error` gracefully — pauses, surfaces a small notice, keeps the
  slide visible. Transient OpenAI rate limits get one retry; sustained
  failures bubble up.
- **State lifecycle risks:**
  - Partial-save: if `narrate` fails mid-loop on slide 3 of 5, slides 1
    and 2 keep their audio. Re-running the command (without `--force`)
    only attempts slides 3–5. Idempotent by design.
  - Stale audio: if a caption is edited after narration, the audio still
    plays the old version. v1 accepts this — operator re-runs with
    `--force` to refresh.
  - File overwrite: `_slide_audio_path` is deterministic (`<position>.mp3`),
    and `AWS_S3_FILE_OVERWRITE = False` in settings means R2 will reject
    overwrites by default. The `--force` path needs to either pass
    `overwrite=True` or delete-then-save. Implementer picks; both work.
- **API surface parity:** `audio_url` is added to `SlidePublicSerializer`
  only. `SlideWriteSerializer` (used by agents to create slides) does NOT
  expose audio — agents can't upload narration directly. This is
  intentional: narration is operator-controlled in v1.
- **Integration coverage:** End-to-end (CLI run → R2 upload → API serve
  → frontend player) needs at least one manual test against staging
  before merging; this is captured as the verification step in Unit 8
  rather than an automated test (would require live R2 + OpenAI access).
- **Unchanged invariants:**
  - Existing `Slide.media` field, upload paths, and `media_url` serialization
    are untouched. Existing slideshows render identically.
  - Existing silent slideshow viewer is preserved as the fallback path. Tests
    that assert on its behavior continue to pass.
  - The OpenAPI schema's existing endpoints are untouched; only the slide
    response shape gains an optional field.
  - `MAX_BYTES_PER_SLIDESHOW` (100MB) is not adjusted. A 4-slide MP3 set at
    HD quality is ~500KB — well under the existing budget.

## Risks & Dependencies

| Risk                                                                | Mitigation                                                                                                                                                                                              |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENAI_API_KEY` not set on Fly when the operator runs `narrate`    | Service module raises a clear `NarrationConfigError` at first call; the playbook (Unit 8) documents the `fly secrets set` step explicitly. Pre-merge check: confirm the secret exists.                  |
| OpenAI TTS API outage during narration                              | Single retry with backoff in the service module. Sustained failure prints a clean error; operator re-runs later. No data loss — slides without audio fall back to silent UX.                            |
| MP3 plays slightly out of sync with slide caption (timing drift)    | We're driving slide advance off `audio.ended`, not a fixed timer, so per-slide timing is exact regardless of audio length. No drift possible across slides.                                             |
| Frontend tests fail because `<audio>` is jsdom-stubbed              | Test scenarios mock the `HTMLAudioElement` interface (play, pause, addEventListener, src, currentTime). The existing test runner (vitest + jsdom) already handles this in adjacent components.          |
| Operator runs `--force` and accidentally regenerates 50 slideshows  | `--force` requires the `share_token` arg; one slideshow at a time. No bulk mode in v1. If a bulk version is ever added it should print confirmation + total estimated cost before proceeding.           |
| `R2_PUBLIC_HOST` not configured for audio (CORS / mixed-content)    | Audio reuses the existing media bucket and custom domain — same CORS posture, same TLS, same caching. If the existing media URLs work for `<img>`, the same URLs work for `<audio>`.                    |
| OpenAI changes their TTS API in a breaking way                      | The service module is the single integration point; refactoring to a different SDK version (or another provider) is a one-file change. The dataclass return shape insulates callers from SDK changes.   |
| `audio_duration_ms` extraction is finicky                           | We accept `audio_duration_ms=0` as a valid fallback (scrubber renders indeterminate progress until the audio metadata loads). Player works fine without it; it's a UX nice-to-have, not a blocker.      |
| Cost surprise from a careless `--force` on a high-slide slideshow   | `--dry-run` exists. Cost summary printed at end of every run. ~$0.03 per 1K characters; even an unrealistically chatty 10-slide walkthrough at 500 chars/slide is $0.15. Real risk is low.              |

## Documentation / Operational Notes

- `docs/playbooks/narrate-a-clip.md` (Unit 8) is the operator-facing
  runbook.
- `OPENAI_API_KEY` must be added to agentclip-api Fly secrets before merge.
  Pre-merge check: `fly secrets list -a agentclip-api | grep OPENAI`.
- No additional monitoring/alerting needed in v1 — operator sees errors
  directly in the CLI run.
- README update is optional. The `Slide` model docstring should be expanded
  to describe the audio fields (Unit 1's diff naturally includes this).

## Sources & References

- Origin: this plan was created directly from the user's `/ce-plan`
  invocation in the working session; no separate brainstorm document.
- Related code:
  - `api/slideshows/models.py` — Slide model, `_slide_media_path`
  - `api/slideshows/serializers.py` — `SlidePublicSerializer.get_media_url`
  - `api/slideshows/migrations/0007_slideshow_is_hero.py` — most recent
    additive migration pattern
  - `web/components/patterns/HeroPreview/HeroPreview.tsx` — existing
    autoplay loop the player should visually mirror
  - `web/components/patterns/ClipViewer/ClipViewer.tsx` — existing silent
    viewer
- External docs:
  - OpenAI TTS API: https://platform.openai.com/docs/guides/text-to-speech
  - openai-python SDK: https://github.com/openai/openai-python
  - django-storages S3 backend (already in use): https://django-storages.readthedocs.io/en/latest/backends/amazon-S3.html
- Related PRs/issues: none — first introduction of audio narration to AgentClip.
