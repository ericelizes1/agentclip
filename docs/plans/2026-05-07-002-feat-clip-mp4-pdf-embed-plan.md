---
title: 'feat: Server-rendered MP4 + branded PDF + universal embed across share surfaces'
type: feat
status: active
date: 2026-05-07
---

# feat: Server-rendered MP4 + branded PDF + universal embed across share surfaces

## Overview

Today a clip is a captioned, narrated slideshow that only plays inside agentclip.dev.
Outside agentclip.dev — GitHub PRs, Slack channels, Notion docs, blog posts — the link
collapses to a generic preview card or, in GitHub's case, nothing at all. This plan
turns every clip into something that embeds natively wherever you paste it.

We materialize two artifacts per clip on the backend: a real `.mp4` video file
(stitched from per-slide image + per-slide narration MP3 via ffmpeg) and a branded
`.pdf` walkthrough (slides + captions + title/end card via WeasyPrint). Both render
lazily on first external fetch, are cached in R2 keyed by a per-slideshow
`render_version`, and invalidate automatically when the slideshow is edited.

The `/s/<token>` page itself stays fast: the existing client-stitched
`VideoClipPlayer` remains the in-app watch experience, with a tab toggle to switch
between the video view (default) and a slide-by-slide scroll view. A four-button
Share/Export panel below the player exposes Copy Link, Copy MP4 URL (for GitHub
PRs), Copy Slideshow Link, and Copy Embed Code; PDF is a Download button next to
them. A new chrome-less `/embed/<token>` route is the iframe target for Notion and
similar embed-aware tools.

## Problem Frame

The product positions itself as "Loom for coding agents." The promise is that a
recipient — reviewer, teammate, customer — can land on a clip and *get it*, fast,
wherever it shows up. Reality today:

- Pasting a clip URL in a GitHub PR description renders a bare hyperlink. GitHub
  strips iframes and only inlines URLs ending in `.mp4`. We don't expose one.
- Pasting in Slack/Discord/iMessage shows a thumbnail card with no inline video,
  because the page sets no `og:video` meta tags pointing at a real video file.
- Pasting in Notion gets a bookmark card. To get an inline player, Notion users
  need an iframe URL or oEmbed discovery; we have neither.
- The detail page itself shows the slide list, not a clear "press play and watch"
  affordance. The watch experience exists (`VideoClipPlayer`) but isn't the
  primary thing a visitor sees.
- There's no way to take a clip with you when you can't / don't want to watch
  video — for example, attaching a walkthrough to a Jira ticket where the
  reviewer is on a locked-down corp network.

This plan closes all four gaps with a single rendering pipeline (render_version
+ R2-cached artifacts + django-rq worker) and a small set of share-page
affordances. No origin requirements document exists — requirements were
established in a chat brainstorm captured below.

## Requirements Trace

- **R1.** Visiting `/s/<share_token>` defaults to a video-first layout. The clip
  plays via the existing client-stitched `VideoClipPlayer`. A tab/toggle switches
  to a slide-by-slide scroll view; the URL reflects state via `?view=scroll` so
  it deep-links.
- **R2.** Every clip exposes a stable `.mp4` URL (`/s/<share_token>.mp4` on the
  web edge, backed by `/api/v1/slideshow/<share_token>/clip.mp4`). Pasting it in
  a GitHub PR or README inlines as a `<video>` element.
- **R3.** Every clip exposes a stable `.pdf` URL serving a branded walkthrough
  (cover page, one page per slide with media + caption, end card). Linkable and
  downloadable.
- **R4.** The `/s/<share_token>` HTML page sets OpenGraph + Twitter Card meta
  tags so Slack, Discord, iMessage, Twitter, and Linear unfurl pasted links into
  inline video previews — no copy-MP4 step required.
- **R5.** A chrome-less `/embed/<share_token>` route serves a fullscreen player
  suitable for `<iframe>` embedding in Notion, Substack, blog editors, and
  other iframe-aware surfaces.
- **R6.** The detail page surfaces a Share/Export panel with: Copy Link, Copy
  MP4 URL, Copy Slideshow Link, Copy Embed Code, Download PDF.
- **R7.** Clips remain editable after publish via both the agent path
  (`write_token`, full API) and the in-browser owner path (`edit_token`, caption
  + delete-slide). Edits invalidate the cached MP4 and PDF; subsequent external
  fetches re-render lazily.
- **R8.** Render is execution-isolated: a separate Fly process group runs
  django-rq workers backed by the existing Redis URL. ffmpeg and WeasyPrint
  ship in the worker image. Render failures don't block the API.
- **R9.** The agent-facing CLI surfaces the new artifact URLs in the response of
  `slideshow create` / `add` / `summary` so the bundled skill can echo them
  in agent output. No new required CLI step; lazy render covers the path where
  the agent never explicitly asks for the MP4.
- **R10.** When a clip is finalized (the existing `set_summary` "I'm done"
  signal), both render jobs are pre-warmed at low priority so the artifacts
  are usually ready by the time someone pastes the link.

## Scope Boundaries

- Not changing the existing `VideoClipPlayer` client-stitched player. It remains
  the primary in-app watch experience.
- Not changing how narration works (per-slide MP3 from `narrate` command);
  that's the upstream of this pipeline, not part of it.
- Not changing the editability model (write_token / edit_token surfaces stay).
- Not adding admin gating on edits to gallery-featured clips. If the owner edits
  a featured clip weirdly, admins can unfeature via existing tooling.
- No oEmbed endpoint in v1. Iframe + meta tags cover the named use cases.
  Defer until a tool we care about (Notion-style auto-discovery) needs it.
- No per-slide audio re-mux into video-kind slides. For slides where the media
  is itself an uploaded video clip, we use the source video's audio if present;
  otherwise narration MP3 is layered. Video slides are rare; revisit if usage
  grows.
- No video transitions, motion effects, or subtitle burn-in in v1. Clean cuts.
- No PDF interactivity (clickable share links inside the PDF are a nice-to-have
  but not a v1 requirement).
- No GC of stale render artifacts in v1. Old `v<n>` files accumulate in R2 until
  a future maintenance command sweeps them.

### Deferred to Separate Tasks

- Stale-render GC management command: future PR once we have data on edit
  frequency × storage growth.
- oEmbed endpoint: future PR if/when a target platform requires it for inline
  embed (Notion does not — paste-as-iframe works without oEmbed).
- Twitter Player Card domain whitelisting: external Twitter process, not code.

## Context & Research

### Relevant Code and Patterns

- `api/slideshows/narration.py` — pure data-in/data-out service module. Render
  modules in this plan (`mp4.py`, `pdf.py`) follow the same shape: take a
  `Slideshow` + iterable of slides, return bytes, no Django-coupling, easy to
  mock in tests.
- `api/slideshows/management/commands/narrate.py` — example of a job-shaped
  command that fans out per-slide work, prints a cost/status summary, and
  persists via FileField.save(). Render management commands mirror this for
  operator escape-hatch use.
- `api/slideshows/models.py` `Slide.audio` (lines 334-365) — pattern for adding
  a render-output FileField (blank/null OK, `_slide_audio_path` upload-to
  helper). New `Slideshow.rendered_mp4` and `Slideshow.rendered_pdf` follow
  identical shape.
- `api/slideshows/views.py` `slideshow_narrate` (line 633) — pattern for an API
  endpoint that does work behind a write_token. The render-trigger endpoints
  reuse this auth pattern.
- `api/slideshows/serializers.py` `SlidePublicSerializer` `media_url`
  SerializerMethodField (lines 61-70) — pattern for surfacing an artifact URL
  that may or may not exist; new `clip_mp4_url`, `clip_pdf_url`, and `embed_url`
  follow it on `SlideshowPublicSerializer`.
- `api/agentclip_app/settings.py` `STORAGES` (lines 161-197) — R2 backend wiring;
  rendered files use the same backend transparently via FileField.
- `api/fly.toml` — current single-process app config. Worker process group is a
  copy-paste expansion; the existing Redis URL secret feeds django-rq directly.
- `web/components/patterns/VideoClipPlayer/VideoClipPlayer.tsx` — keep as-is;
  it's the in-app watch surface for both `/s/<token>` and `/embed/<token>`.
- `web/app/s/[token]/page.tsx` — current detail page; today it doesn't render
  the player by default. This plan inverts that — player first, slide list
  second, behind a tab toggle.
- `agentclip-python/src/agentclip/_models.py` — `SlideshowResult` shape; add
  `clip_mp4_url` and `walkthrough_pdf_url` fields. CLI `_print` summary
  formatting picks them up automatically when the JSON includes them.
- `agentclip-python/src/agentclip/skill/SKILL.md` — bundled agent skill copy;
  add a one-liner that the `.mp4` and `.pdf` URLs exist and are auto-managed.

### Institutional Learnings

- `docs/solutions/` is empty.
- The narration plan (`docs/plans/2026-05-07-001-feat-openai-tts-narration-plan.md`)
  is the immediate predecessor: it established the per-slide audio that this
  plan stitches together. The render pipeline only works on slideshows where
  narration ran; non-narrated clips render to a silent MP4 with images held
  for a fixed duration (3 seconds each, see Open Questions).

### External References

- ffmpeg concat demuxer reference: producing a single MP4 from per-slide
  segments without re-encoding the per-slide intermediate. Each segment is
  generated by looping a still image for the audio's duration and muxing the
  MP3 in (`-loop 1 -i image.png -i audio.mp3 -shortest -c:v libx264 -c:a aac`).
  Concat list passes generated segments. Final MP4 is H.264 baseline + AAC
  for maximum compatibility (GitHub, Slack, iMessage all happy).
- WeasyPrint HTML+CSS → PDF: simpler than headless Chrome for our use case
  (cover, per-slide layout, end card). Pure Python install. Embeds R2-hosted
  images via signed URLs at render time.
- OpenGraph video meta tag set required for Slack/Discord/iMessage inline
  unfurl: `og:type=video.other`, `og:video`, `og:video:secure_url`,
  `og:video:type=video/mp4`, `og:video:width`, `og:video:height`,
  `og:image` (poster), plus Twitter equivalents (`twitter:card=player`,
  `twitter:player:stream=...mp4`).
- GitHub renders inline `<video>` only for URLs ending in a recognized video
  extension (`.mp4`, `.webm`, `.mov`). The web edge route MUST end in `.mp4`;
  query strings are fine but the path extension is required.

## Key Technical Decisions

- **Two artifacts, one version counter.** A single `Slideshow.render_version`
  integer governs both MP4 and PDF cache validity. Any mutation that changes
  what would be in the rendered output bumps it and clears both rendered
  FileFields. Simpler than per-artifact counters; cost is occasional redundant
  re-render of an unchanged artifact, which is fine.
- **Lazy + pre-warm hybrid.** Public render endpoints render lazily on first
  request after invalidation. `set_summary` (the agent finalize signal) also
  pre-warms both render jobs at low priority so artifacts are usually ready
  by the time the link is pasted. Edits in browser do NOT auto-enqueue —
  edits are bursty and we don't want to spam the worker; lazy on next external
  fetch is sufficient.
- **In-app player is unchanged.** The `/s/<token>` and `/embed/<token>` watch
  experiences continue to use the existing client-stitched `VideoClipPlayer`.
  The MP4 file exists for *external* surfaces (GitHub PRs, OG video unfurls)
  that demand a real video file. This avoids loading-state complexity inside
  the app and keeps in-app playback instant.
- **Render execution = django-rq + Redis + Fly worker process group.** No
  managed video service. Existing Redis URL feeds django-rq directly; ffmpeg
  and WeasyPrint ship in the worker image. Trade managed-service cost and
  vendor lock-in for owning the render path. Renders are short (max ~3-min
  clips, sub-30s render time), volume is tiny, and we already have Redis.
- **Worker image vs API image.** Both use the same Dockerfile but the worker
  layer additionally `apt-get install`s ffmpeg and adds WeasyPrint's system
  deps. Different process group in `fly.toml`, same machine class, auto-stops
  when the queue is empty.
- **Versioned R2 storage paths.** `slideshows/<id>/renders/v<render_version>/clip.mp4`
  and `walkthrough.pdf`. Cache invalidation at the *URL* level — bumping
  `render_version` gives a new path, no need for cache headers gymnastics. Old
  versions persist until a future GC pass.
- **MP4 spec: 1920×1080, H.264 baseline, AAC mono 128kbps, ≤30fps.** Letterbox
  source images to 1920×1080 with black padding to keep encoding consistent.
  Compatibility-first profile so GitHub/Slack/iMessage/Twitter all play it.
- **PDF spec: A4 portrait, single-column.** Cover page (title, summary if set,
  creator chip), one page per slide (image at top, caption below), end card
  (link back to share URL, "Made with AgentClip"). System fonts; no custom font
  shipping in v1.
- **Editability stays editable.** No publish-then-freeze model. Both
  `write_token` (agent) and `edit_token` (in-browser owner) surfaces remain
  fully editable. The `/s/<token>/edit` page gains a "Latest render: vN —
  regenerate" indicator so owners understand the artifact lags behind edits
  until next external fetch.
- **OG poster image is a render output too.** Slack/iMessage cards display a
  poster image alongside (or instead of) the video. We extract a single frame
  (the first slide's image, padded to 1200×630) at render time and store it
  alongside the MP4. Pure Pillow operation, no extra worker dep.

## Open Questions

### Resolved During Planning

- Where does the MP4 get rendered? — Lazy on first `.mp4` fetch + pre-warm on
  `set_summary`. Confirmed with Eric.
- Are clips immutable after publish? — No, fully editable forever via the
  existing two-token model. Confirmed with Eric.
- Is PDF in v1? — Yes. Confirmed with Eric.
- Iframe embed in v1? — Yes. Confirmed with Eric.
- Detail page UX shape? — Video-first with `?view=scroll` toggle to slideshow
  view; four-button share panel + PDF download. Confirmed with Eric.

### Deferred to Implementation

- Exact letterbox color: black vs. brand vermillion. Try black first; visually
  validate against a few sample clips before locking.
- Held-image duration for non-narrated clips: 3 seconds is the working default;
  may adjust after seeing real outputs. Affects only legacy non-narrated
  clips since current ones always narrate before render.
- Whether to duck source-video audio under narration when both exist on a
  video-kind slide. Needs an actual video-slide to test against; defer to the
  unit that handles video-kind slides.
- Exact PDF cover/end-card visual design. Implementer makes a first pass;
  Eric reviews against a real sample before locking.
- Concurrency limit on the worker queue. Start with 1; raise once we see real
  load.

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review,
> not implementation specification. The implementing agent should treat it as
> context, not code to reproduce.*

```
                          ┌────────────────────────────────────┐
                          │  Mutating endpoints                │
                          │  (slide_add, slide_update,         │
                          │   slide_edit_caption,              │
                          │   slide_edit_delete,               │
                          │   slideshow_narrate,               │
                          │   slideshow_detail PATCH,          │
                          │   set_summary, …)                  │
                          └─────────────────┬──────────────────┘
                                            │ on success
                                            ▼
                          ┌────────────────────────────────────┐
                          │  bump_render_version(slideshow)    │
                          │  - render_version += 1             │
                          │  - rendered_mp4.delete(save=False) │
                          │  - rendered_pdf.delete(save=False) │
                          │  - poster_image.delete(save=False) │
                          └─────────────────┬──────────────────┘
                                            │
                                            │ if endpoint == set_summary
                                            ▼
                          ┌────────────────────────────────────┐
                          │  enqueue render_clip_mp4(id)       │
                          │  enqueue render_clip_pdf(id)       │
                          │  (low priority, fire-and-forget)   │
                          └────────────────────────────────────┘

                          ───────── lazy fetch path ─────────

  GitHub fetches /s/<token>.mp4
                ▼
  Web edge rewrites to /api/v1/slideshow/<token>/clip.mp4
                ▼
        ┌───────────────────────────────────┐
        │  view: slideshow_clip_mp4         │
        │  - if rendered_mp4 exists: 302 →  │
        │      R2 CDN URL                   │
        │  - else: enqueue render job +     │
        │      respond 202 + Retry-After    │
        └───────────────────────────────────┘
                ▼
        ┌───────────────────────────────────┐
        │  worker: render_clip_mp4 job      │
        │  - load slideshow + slides        │
        │  - call mp4.build_mp4(...) [pure] │
        │  - call mp4.extract_poster(...)   │
        │  - rendered_mp4.save(bytes)       │
        │  - poster_image.save(bytes)       │
        └───────────────────────────────────┘

                          ─────── PDF path is symmetric ───────
                          (pdf.build_pdf instead of mp4.build_*)
```

## Implementation Units

- [ ] **Unit 1: Slideshow render-version schema + invalidation helper**

**Goal:** Introduce the version counter and rendered-artifact FileFields on
`Slideshow`, plus a single helper that mutating endpoints call to bump the
version and clear cached files. Lays the foundation everything else depends on.

**Requirements:** R7

**Dependencies:** None

**Files:**
- Modify: `api/slideshows/models.py`
- Create: `api/slideshows/migrations/0008_slideshow_render_version.py`
- Modify: `api/slideshows/views.py` (call helper from mutating endpoints)
- Test: `api/slideshows/test_render_versioning.py`

**Approach:**
- Add three fields to `Slideshow`: `render_version: PositiveIntegerField(default=0)`,
  `rendered_mp4: FileField(blank=True, null=True, upload_to=_render_path)`,
  `rendered_pdf: FileField(blank=True, null=True, upload_to=_render_path)`,
  `poster_image: FileField(blank=True, null=True, upload_to=_render_path)`.
- `_render_path(instance, filename)` returns
  `slideshows/<id>/renders/v<render_version>/<filename>`. Versioned at write
  time so each render version has its own R2 path; old versions persist until
  GC.
- Add `Slideshow.bump_render_version()` instance method that increments the
  counter, deletes the three FileFields' files (storage delete + field clear)
  in a single `save()`. Idempotent on no-op slideshows.
- Wire the helper into every mutating endpoint that changes user-visible content:
  `slide_add`, `slide_update`, `slideshow_narrate` (after success),
  `slide_edit_caption`, `slide_edit_delete`, `slideshow_detail` PATCH (when
  title/description/summary change). Use a `transaction.on_commit` hook so the
  bump only happens if the request completed successfully.

**Patterns to follow:**
- Existing `Slide.audio` FileField (lines 334-365 of `api/slideshows/models.py`)
  for the field-shape conventions.
- Existing migration in `api/slideshows/migrations/0007_slideshow_is_hero.py`
  for the additive-only migration pattern.

**Test scenarios:**
- Happy path — `slideshow.bump_render_version()` increments counter from 0 to 1
  on a fresh slideshow.
- Happy path — calling `slide_add` API endpoint bumps the slideshow's
  `render_version` after the response returns.
- Happy path — calling `slide_edit_caption` with a different caption bumps
  `render_version`.
- Happy path — calling `slide_edit_caption` with the same caption still bumps
  (we don't try to detect no-op edits in v1; safe over-invalidation).
- Edge case — bumping when `rendered_mp4`/`rendered_pdf` are unset (fresh
  slideshow) does not error.
- Edge case — bumping when files exist deletes the files from storage and
  clears the field on the model.
- Integration — `transaction.on_commit` ordering: bump runs only if the
  surrounding API call commits successfully. A mock DB error inside
  `slide_add` should NOT bump the version.
- Integration — `slideshow_detail` PATCH bumps version only when
  `title`/`description`/`summary` actually appears in the request body
  (a noop PATCH does not bump, to avoid pre-warm spam).

**Verification:**
- All `slideshows` tests pass.
- Manual: edit a slide's caption via `/s/<token>/edit`; confirm
  `slideshow.render_version` increments and any prior `rendered_mp4` row is
  cleared.

---

- [ ] **Unit 2: MP4 render module (pure)**

**Goal:** A self-contained module that takes a `Slideshow` + ordered slides and
returns MP4 bytes plus a poster JPEG. Pure data in/data out, no Django coupling
beyond the model objects, easy to unit-test with synthetic inputs.

**Requirements:** R2

**Dependencies:** None (the worker job in Unit 4 calls into this)

**Files:**
- Create: `api/slideshows/mp4.py`
- Test: `api/slideshows/test_mp4.py`

**Approach:**
- `build_mp4(slideshow, slides) -> bytes` — orchestrator: per-slide segment
  generation, then concat-demuxer pass.
- Per-slide segment shape: image-kind slides loop the slide image for the
  duration of the slide's narration MP3 (or 3.0s if no audio); video-kind
  slides pass the source video through with audio chosen as: source-video
  audio if present, else narration MP3, else silence.
- Letterbox/pad source images to 1920×1080 with black padding via ffmpeg's
  `scale` + `pad` filters.
- Output codec: H.264 (libx264) baseline profile, AAC 128kbps mono. Maximum
  consumer compatibility.
- `extract_poster(slideshow, slides) -> bytes` — separate function: takes the
  first slide's image, pads to 1200×630 (OG image size), encodes JPEG.
  Pillow-only; no ffmpeg.
- Subprocess invocation of ffmpeg via `subprocess.run` with explicit timeouts;
  capture stderr for failure logging. No Python ffmpeg wrapper dependency.
- Use an explicit work directory under `tempfile.TemporaryDirectory` for
  intermediate segments; clean up on return or exception.

**Execution note:** Implement test-first against synthetic 1×1 PNGs and 0.5s
synthetic MP3s — you don't need real assets to validate the pipeline shape.

**Patterns to follow:**
- `api/slideshows/narration.py` shape: pure-data dataclass return type, module-
  level constants for codec/profile/duration choices, dedicated config error
  type for failures the operator can fix vs. infrastructure errors.

**Test scenarios:**
- Happy path — 2-slide slideshow with images + narration produces a valid MP4
  (probe with ffprobe: container = mp4, video codec = h264, audio codec = aac,
  duration ≈ sum of narration durations within ±100ms).
- Happy path — `extract_poster` returns a valid JPEG of the first slide,
  1200×630.
- Edge case — slideshow with no narration on any slide renders a silent MP4
  with each slide held for 3.0s.
- Edge case — slideshow with mixed-kind slides (image + video) produces a
  single MP4 spanning both.
- Edge case — single-slide slideshow renders correctly (no concat boundary
  issues).
- Edge case — slide image with extreme aspect ratio (e.g., 100×3000 vertical)
  letterboxes to 1920×1080 without distortion.
- Error path — corrupt MP3 input causes ffmpeg subprocess to fail; module
  raises a clear `MP4RenderError` with stderr captured.
- Error path — ffmpeg binary missing on PATH raises a `MP4RenderError` with
  an operator-actionable message.
- Error path — subprocess timeout exceeded raises a `MP4RenderError`; the
  TemporaryDirectory is cleaned up.

**Verification:**
- `pytest api/slideshows/test_mp4.py` passes.
- Smoke run: `python manage.py shell` — load a real seeded slideshow,
  call `mp4.build_mp4(...)`, save to `/tmp/clip.mp4`, play locally.

---

- [ ] **Unit 3: PDF render module (pure)**

**Goal:** A self-contained module that takes a `Slideshow` + ordered slides and
returns PDF bytes for a branded walkthrough. Pure data in/data out, mirrors the
shape of `mp4.py`.

**Requirements:** R3

**Dependencies:** None

**Files:**
- Create: `api/slideshows/pdf.py`
- Create: `api/slideshows/templates/pdf/walkthrough.html`
- Modify: `api/requirements.txt` (add `weasyprint`)
- Test: `api/slideshows/test_pdf.py`

**Approach:**
- `build_pdf(slideshow, slides) -> bytes`: render the Django template with the
  slideshow context, hand the resulting HTML to WeasyPrint, return the PDF
  bytes.
- Template structure: cover page (title, summary if set, creator chip),
  one page per slide (media at top half, title eyebrow, caption below),
  end card with the share URL and "Made with AgentClip" footer.
- Page size A4 portrait. System font fallbacks (Helvetica, Arial, sans-serif)
  — no custom font shipping in v1.
- Image embedding: slides reference R2 URLs directly. WeasyPrint fetches them
  at render time. Keep timeouts tight (5s per fetch) and fail loudly on fetch
  errors so failures are observable rather than silently producing missing
  images.

**Patterns to follow:**
- `api/slideshows/narration.py` for the pure-module shape and error types.

**Test scenarios:**
- Happy path — 2-slide slideshow produces a PDF that starts with `%PDF`,
  contains the slideshow title, both captions, and the share URL string.
- Happy path — slideshow with summary set includes the summary on the cover
  page.
- Happy path — slideshow without summary produces a cover without that block
  (no orphan label).
- Edge case — slide caption with HTML-special characters renders escaped (no
  injection into the layout; no template HTML in the output).
- Edge case — single-slide slideshow produces cover + 1 slide page + end card.
- Edge case — extremely long caption wraps without overflowing the page.
- Error path — image URL fetch timeout raises a `PDFRenderError`.
- Error path — missing required template field raises a `PDFRenderError` with
  a clear message.

**Verification:**
- `pytest api/slideshows/test_pdf.py` passes.
- Smoke run: open a generated PDF and visually confirm cover, a few slide
  pages, end card.

---

- [ ] **Unit 4: Worker infrastructure + render jobs**

**Goal:** A second Fly process group that runs django-rq workers, consuming
render jobs that call into Units 2 and 3 and persist the resulting bytes onto
the `Slideshow` FileFields.

**Requirements:** R8, R10

**Dependencies:** Unit 1 (FileFields exist), Units 2 & 3 (pure modules exist)

**Files:**
- Create: `api/slideshows/jobs.py`
- Modify: `api/agentclip_app/settings.py` (django-rq config)
- Modify: `api/requirements.txt` (`django-rq`)
- Modify: `api/Dockerfile` (install ffmpeg + WeasyPrint system deps)
- Modify: `api/fly.toml` (worker process group)
- Modify: `api/slideshows/views.py` (`set_summary` triggers pre-warm enqueue)
- Test: `api/slideshows/test_jobs.py`

**Approach:**
- Two rq jobs: `render_clip_mp4(slideshow_id)` and `render_clip_pdf(slideshow_id)`.
  Each loads the slideshow + ordered slides, calls the relevant pure module,
  saves the result bytes to the appropriate FileField via `field.save(name, ContentFile(bytes))`,
  and only saves if the slideshow's `render_version` hasn't moved during the
  render (otherwise discard — a newer render is queued anyway).
- The `render_version` recheck is the safety net for the race: edit happens
  during render, render finishes, but its output is stale. Compare the
  pre-render version to the post-render slideshow row; if they differ, drop
  the result silently and let the new edit's enqueue produce the fresh artifact.
- Pre-warm on `set_summary`: after the existing endpoint commits, enqueue both
  jobs at low priority via `django_rq.get_queue('renders').enqueue(...)`.
  Same `transaction.on_commit` pattern as Unit 1.
- Fly worker process group: in `fly.toml`, add `[processes]` with
  `app = "..."` and `worker = "python manage.py rqworker default renders"`.
  Each process group becomes its own machine pool. Auto-stops when queue is
  empty.
- Dockerfile changes: `RUN apt-get install -y ffmpeg` for video; WeasyPrint's
  system deps (cairo, pango, gdk-pixbuf, libffi). Worker image inherits from
  the same base image as the API.

**Patterns to follow:**
- `api/slideshows/management/commands/narrate.py` for the model-touching
  side: how to load + iterate slides, save results to a FileField.
- Existing `transaction.on_commit` usage in Unit 1.

**Test scenarios:**
- Happy path — `render_clip_mp4(slideshow_id)` populates `slideshow.rendered_mp4`
  with the output of the pure module.
- Happy path — `render_clip_pdf(slideshow_id)` populates `slideshow.rendered_pdf`.
- Happy path — `set_summary` API call enqueues both jobs (assert via the rq
  queue mock that two jobs landed).
- Edge case — race: render starts at version=5, version bumps to 6 during
  render, job completes; the saved bytes are discarded and `rendered_mp4`
  remains unset. Newer enqueue's job re-runs and persists.
- Edge case — slideshow has no slides (deleted-all-slides race): job exits
  without writing, no error. Public endpoint will return a clean 404 instead.
- Error path — pure module raises `MP4RenderError`; job logs the error with
  slideshow ID and propagates failure to the rq failure queue. `rendered_mp4`
  remains unset; lazy fetch path will retry on next request (with backoff).
- Integration — Dockerfile build succeeds with the new system deps; ffmpeg
  binary is present at expected path inside the container.
- Integration — worker process boots in the worker image and consumes a job
  from the test queue.

**Verification:**
- `pytest api/slideshows/test_jobs.py` passes.
- Local: `python manage.py rqworker renders` consumes a manually-enqueued job
  end-to-end.
- `fly deploy` completes; `fly logs --process-group worker` shows the worker
  ready and idle.

---

- [ ] **Unit 5: Public render endpoints (.mp4 + .pdf) + lazy enqueue**

**Goal:** Two stable URLs that external consumers fetch. Each returns a 302 to
the R2 file when present, or a 202 with `Retry-After` and an enqueue side
effect when absent. The Web service exposes `.mp4`-suffixed paths so GitHub's
inline-video pattern works.

**Requirements:** R2, R3

**Dependencies:** Unit 4 (jobs exist), Unit 1 (FileFields exist)

**Files:**
- Modify: `api/slideshows/views.py` (two new view functions)
- Modify: `api/slideshows/urls.py` (two new routes)
- Create: `web/app/s/[token].mp4/route.ts`
- Create: `web/app/s/[token].pdf/route.ts`
- Test: `api/slideshows/test_render_endpoints.py`
- Test: `web/app/s/[token].mp4/route.test.ts`

**Approach:**
- `slideshow_clip_mp4(request, share_token)` view: load slideshow by share_token,
  if `rendered_mp4` exists redirect (302) to its public URL, else enqueue
  `render_clip_mp4` and return 202 with `Retry-After: 10` and a JSON body
  describing rendering state. The 302 target is the R2 public URL exposed via
  `R2_PUBLIC_HOST` (the same CDN edge that serves slide media today).
- Identical shape for `slideshow_clip_pdf`.
- Web edge routes: Next.js route handler at `web/app/s/[token].mp4/route.ts`
  proxies to the API endpoint with the same response semantics. The path
  literally ends in `.mp4` so GitHub recognizes it as a video; same for
  `.pdf`. Cache-Control: short-cache while rendering, long-cache once a
  redirect lands (the redirect target is itself versioned, so the redirect
  target can be cached aggressively).
- Rate-limit the lazy-enqueue side effect: if the same slideshow's render
  was enqueued in the last 60 seconds, skip re-enqueue. Prevents hot-retry
  loops when GitHub aggressively retries.

**Patterns to follow:**
- `api/slideshows/views.py` `SlideshowPublicView` (line lookup) for the
  share_token resolution + 404 behavior.
- `api/slideshows/views.py` `slideshow_narrate` for the write-style endpoint
  shape (auth, error handling, response envelope).
- `web/app/api/...` (existing route handler files) for the Next.js route
  pattern.

**Test scenarios:**
- Happy path — GET `/api/v1/slideshow/<token>/clip.mp4` when `rendered_mp4`
  exists returns 302 to R2 URL.
- Happy path — GET when `rendered_mp4` is unset enqueues a render job and
  returns 202 with `Retry-After`.
- Happy path — GET `/s/<token>.mp4` on the web edge proxies to the API and
  preserves the 302/202 status.
- Edge case — second GET within 60s of an enqueue does NOT re-enqueue (rate
  limit); still returns 202.
- Edge case — invalid `share_token` returns 404.
- Edge case — slideshow has zero slides: returns 404 (no MP4 makes sense).
- Integration — full path: GET `/s/<token>.mp4`, observe 202; rq worker
  picks up the job; second GET shortly after returns 302 to a real R2 URL
  that yields the MP4 bytes.
- Integration — GitHub-pattern fetch: spoofed `User-Agent: GitHub-Camo/...`
  GET works the same way (no UA-specific gating).
- Same scenarios for the `.pdf` endpoint.

**Verification:**
- `pytest api/slideshows/test_render_endpoints.py` passes.
- `pnpm --filter web test` for the route handler test.
- Manual: paste a fresh clip URL in a GitHub PR comment; observe the
  `<video>` element render after the lazy render completes. Repeat for PDF
  link.

---

- [ ] **Unit 6: Public serializer fields + share-page OG meta tags**

**Goal:** Surface `clip_mp4_url`, `clip_pdf_url`, `embed_url` on the public
slideshow API. Web detail page consumes them and emits OG video / Twitter
Card meta tags so Slack/Discord/iMessage/Twitter unfurl the link as inline
video without the user needing to copy a different URL.

**Requirements:** R4

**Dependencies:** Unit 5 (URLs exist and are stable)

**Files:**
- Modify: `api/slideshows/serializers.py`
- Modify: `web/app/s/[token]/page.tsx` (`generateMetadata` + meta tags)
- Modify: `web/lib/api-schema.json` (regenerate)
- Modify: `web/lib/api-types.ts` (regenerate)
- Test: `api/slideshows/test_serializers.py`
- Test: `web/app/s/[token]/page.test.tsx` (snapshot of head)

**Approach:**
- `SlideshowPublicSerializer` gains three SerializerMethodField entries:
  - `clip_mp4_url` — absolute `/s/<token>.mp4` URL (web edge), available
    always (the URL is stable; the artifact may not yet exist).
  - `clip_pdf_url` — absolute `/s/<token>.pdf` URL, same shape.
  - `embed_url` — absolute `/embed/<token>` URL, same shape.
  - `poster_image_url` — absolute R2 URL for the rendered poster image, or
    null while not yet rendered.
- Web detail page `generateMetadata` populates: `og:title`, `og:description`,
  `og:image` (poster_image_url, with fallback to first slide's media_url),
  `og:type=video.other`, `og:video=clip_mp4_url`,
  `og:video:secure_url=clip_mp4_url`, `og:video:type=video/mp4`,
  `og:video:width=1920`, `og:video:height=1080`, plus
  `twitter:card=player`, `twitter:player:stream=clip_mp4_url`.
- Regenerate the typed OpenAPI client (`gen-types` justfile recipe).

**Patterns to follow:**
- `SlidePublicSerializer.media_url` SerializerMethodField (lines 61-70 of
  `api/slideshows/serializers.py`).
- Existing `web/app/s/[token]/page.tsx` `generateMetadata` (if present)
  for the meta-tag emission shape.

**Test scenarios:**
- Happy path — `SlideshowPublicSerializer.clip_mp4_url` returns the absolute
  edge URL ending in `.mp4`.
- Happy path — `clip_pdf_url`, `embed_url` likewise.
- Happy path — `poster_image_url` returns the absolute R2 URL when the field
  is populated.
- Edge case — `poster_image_url` returns `null` when the field is empty.
- Integration — share page HTML includes all required OG video meta tags.
- Integration — share page HTML's `og:image` falls back to the first slide's
  media when `poster_image_url` is null (so unfurls always have an image).

**Verification:**
- `pytest api/slideshows/test_serializers.py` passes.
- `pnpm --filter web test` head-snapshot test passes.
- Manual: paste share URL in Slack DM with self; observe inline player card.

---

- [ ] **Unit 7: Detail page UX overhaul + share/export panel**

**Goal:** Restructure `/s/<token>` so the player is the primary surface, add a
tab toggle for Slides view (`?view=scroll`), and add a Share/Export panel
beneath the player with all five copy/download actions.

**Requirements:** R1, R6

**Dependencies:** Unit 5 (URLs to copy), Unit 6 (URLs surfaced via API)

**Files:**
- Modify: `web/app/s/[token]/page.tsx`
- Create: `web/components/composites/ClipShareExport/ClipShareExport.tsx`
- Create: `web/components/composites/ClipShareExport/ClipShareExport.test.tsx`
- Create: `web/components/composites/ClipViewTabs/ClipViewTabs.tsx`
- Create: `web/components/composites/ClipViewTabs/ClipViewTabs.test.tsx`
- Modify: `web/components/patterns/ClipViewer/ClipViewer.tsx` (no breaking
  change; surface as the Slides-view content)
- Test: `web/app/s/[token]/page.test.tsx`

**Approach:**
- Page layout (top to bottom): creator chip + title, the active view (player
  or slide list) wrapped in a tab toggle, summary block, share/export panel.
- `ClipViewTabs`: two tabs — Watch (default) and Slides. Tab state syncs to
  URL via `?view=scroll`. Pure client component; the page is a server
  component that reads the param to decide initial tab. Watch tab renders
  the existing `VideoClipPlayer`. Slides tab renders the existing
  `ClipViewer` (slide list).
- `ClipShareExport`: five actions in a single horizontal panel.
  - Copy Link — copies the share URL.
  - Copy MP4 URL (for GitHub) — copies `clip_mp4_url`.
  - Copy Slideshow Link — copies the share URL with `?view=scroll`.
  - Copy Embed Code — copies an `<iframe src="<embed_url>" ...>` snippet
    with sensible default width/height/allow attributes.
  - Download PDF — anchor with `download` attribute pointing at `clip_pdf_url`.
- All copy buttons use the Clipboard API with a "Copied ✓" tooltip on success
  and a fallback `select + execCommand` for older browsers.
- Empty narration fallback: if the slideshow has any slides without audio,
  the Watch tab still renders (the `VideoClipPlayer` already handles this) —
  the MP4 download URL is unaffected; render uses the 3.0s held-image fallback
  per Unit 2.

**Patterns to follow:**
- Existing `web/components/patterns/HeroPreview/HeroPreview.tsx` for player
  placement and chrome.
- Existing component layout under `web/components/composites/` for the
  share-panel composition.

**Test scenarios:**
- Happy path — `/s/<token>` renders Watch tab by default; the
  `VideoClipPlayer` is in the DOM.
- Happy path — `/s/<token>?view=scroll` renders Slides tab by default; the
  `ClipViewer` slide list is in the DOM.
- Happy path — clicking a tab updates the URL param without a full nav.
- Happy path — Copy Link button writes the share URL to the clipboard.
- Happy path — Copy MP4 URL button writes the `.mp4` URL.
- Happy path — Copy Embed Code button writes an iframe HTML snippet
  containing the embed URL.
- Happy path — Download PDF anchor has the correct `href` and `download`
  attribute.
- Edge case — slideshow with one slide and no narration still renders the
  Watch tab cleanly.
- Edge case — Copy Link in a browser without Clipboard API falls back
  gracefully and surfaces a "Copy failed" tooltip rather than crashing.
- Integration — switching tabs preserves player state across re-renders is
  out of scope for v1; verify the simpler invariant that switching to
  Slides and back to Watch starts playback from slide 1.

**Verification:**
- `pnpm --filter web test` passes.
- Manual click-through: load a real clip in dev, exercise both tabs, copy
  each URL, confirm clipboard contents, verify the embed iframe HTML pastes
  cleanly into a Notion test page.

---

- [ ] **Unit 8: Iframe embed route**

**Goal:** A chrome-less `/embed/<share_token>` route that renders the player
fullscreen, suitable for `<iframe>` embedding in Notion, Substack, blog posts,
or any iframe-aware surface.

**Requirements:** R5

**Dependencies:** Unit 6 (slideshow public API exists)

**Files:**
- Create: `web/app/embed/[token]/page.tsx`
- Create: `web/app/embed/[token]/page.test.tsx`
- Create: `web/app/embed/layout.tsx` (no nav, no chrome)

**Approach:**
- Server component that fetches the slideshow by token (same fetcher used by
  `/s/<token>`) and renders only the `VideoClipPlayer` filling the viewport.
- No navigation, no header, no footer. Background is the brand black; player
  centered.
- Sets `frame-ancestors *` via the route's response headers (or `X-Frame-Options`
  removed) so the route is iframe-able from any origin. Sandboxes set
  `allow-scripts allow-same-origin` are caller-controlled, not ours.
- Tap-to-play affordance — Safari iframe autoplay-with-sound is blocked, so
  the page mounts paused with a play button. Clicking starts playback.
- `generateMetadata` excludes `og:video` (this page IS the embed target — it
  shouldn't itself unfurl as a video).

**Patterns to follow:**
- `web/app/s/[token]/page.tsx` for the slideshow-fetch shape.
- `VideoClipPlayer` props for the client-stitched playback.

**Test scenarios:**
- Happy path — `/embed/<token>` renders the player and nothing else (no nav,
  no footer in the HTML).
- Happy path — response headers do NOT set `X-Frame-Options: DENY` and DO set
  a `Content-Security-Policy` with `frame-ancestors *` (or no
  `frame-ancestors` directive, allowing all by default).
- Happy path — `generateMetadata` does not emit `og:video` tags.
- Edge case — invalid token renders a 404.
- Integration — the iframe HTML snippet from Unit 7's Copy Embed Code, when
  rendered into a sandboxed test iframe, mounts the player without console
  errors.

**Verification:**
- `pnpm --filter web test` passes.
- Manual: paste the embed iframe code into a local test HTML page; player
  mounts and plays after a tap.

---

- [ ] **Unit 9: CLI/SDK surface — expose render URLs in agent responses**

**Goal:** The Python CLI/SDK returns the new artifact URLs in `create`/`add`/
`summary` responses so the agent and the bundled `agentclip` skill can echo
them. Lazy render means agents never have to call render explicitly. A
`regenerate-clip` escape hatch exists for force-rebuild.

**Requirements:** R9

**Dependencies:** Unit 6 (URLs surfaced in public API)

**Files:**
- Modify: `agentclip-python/src/agentclip/_models.py` (add fields to
  `SlideshowResult`)
- Modify: `agentclip-python/src/agentclip/sdk.py` (`regenerate_clip` method)
- Modify: `agentclip-python/src/agentclip/cli.py` (print URLs in summaries;
  new `slideshow regenerate-clip` command)
- Modify: `agentclip-python/src/agentclip/skill/SKILL.md` (one paragraph on
  the artifact URLs)
- Test: `agentclip-python/tests/test_sdk.py`
- Test: `agentclip-python/tests/test_cli.py`

**Approach:**
- `SlideshowResult` (or whatever the create/add response model is) gains
  optional fields: `clip_mp4_url`, `clip_pdf_url`, `embed_url`. Pydantic
  picks them up from the API response automatically.
- CLI summary text gains two lines under the existing share line:
  ```
    mp4:   <clip_mp4_url>
    pdf:   <clip_pdf_url>
    embed: <embed_url>
  ```
- `agentclip slideshow regenerate-clip <id>` — escape hatch that calls a new
  API endpoint `POST /api/v1/slideshow/<token>/render-bump/` (auth: write_token)
  that bumps `render_version` and re-pre-warms both jobs. Useful when an
  operator wants to nudge a render after a remote retry exhaustion.
- Bundled skill copy: add a one-paragraph section explaining that
  `clip_mp4_url` is GitHub-PR-friendly, `embed_url` is iframe-friendly,
  `clip_pdf_url` is downloadable; agents don't need to call any render
  command — the URLs work as soon as someone fetches them.

**Patterns to follow:**
- Existing `_models.py` field-shape conventions.
- Existing `cli.py::_print` summary formatting (it walks the result dict for
  fields it knows how to format).
- Existing CLI command shape (`slideshow_delete` is a good minimal reference
  for an auth-gated, no-payload command).

**Test scenarios:**
- Happy path — `agentclip slideshow create` with a mocked API that returns
  the new URL fields prints the `mp4:`, `pdf:`, `embed:` lines.
- Happy path — `agentclip slideshow add` likewise.
- Happy path — `agentclip slideshow summary` likewise (this one matters most
  since it's the publish moment).
- Happy path — `agentclip slideshow regenerate-clip <id>` POSTs to the
  render-bump endpoint and prints a confirmation.
- Edge case — when the API response omits the new fields (older API version),
  the CLI does not print empty `mp4:` lines and does not error.
- Integration — `--json` output includes the new fields verbatim.

**Verification:**
- `uv run pytest` from `agentclip-python/` passes.
- Manual: run a fresh `agentclip slideshow create` against local API; copy
  the printed `mp4:` URL and paste it into a GitHub PR draft to confirm
  end-to-end.

## System-Wide Impact

- **Interaction graph:** The `bump_render_version` helper is called from at
  least 6 mutating endpoints. Missing one results in the artifact silently
  drifting from the slideshow state. Unit 1's test scenarios enumerate all
  of them; Unit 1's `Verification` step requires manual check on each.
- **Error propagation:** Render failures must not block the API. Job failures
  go to the rq failure queue; the API path remains 202 + Retry-After until
  a successful render writes the FileField. Operator visibility is via
  `fly logs --process-group worker` and rq's failure queue.
- **State lifecycle risks:** Race condition between an in-flight render and a
  concurrent edit is handled by the post-render `render_version` recheck
  (Unit 4). Old render artifacts in R2 are not GC'd in v1; storage growth is
  observable but small (single-digit MB per clip × infrequent edits).
- **API surface parity:** The bundled `agentclip` skill markdown should reflect
  the new artifact URLs so agent output is consistent with what users see in
  the dashboard. Missing this drifts agent voice from product reality.
- **Integration coverage:** End-to-end tests covering the full path
  (create → narrate → first .mp4 fetch → second .mp4 fetch → edit → next
  .mp4 fetch) live in Unit 5. Unit-only tests will not catch the
  `transaction.on_commit` ordering or the lazy-enqueue rate limit.
- **Unchanged invariants:** The existing `VideoClipPlayer` interface stays the
  same; both `/s/<token>` and `/embed/<token>` consume it. Existing
  `write_token` / `edit_token` auth surfaces are unchanged. The narration
  pipeline (`narrate` command, `Slide.audio` field) is unchanged. Slideshows
  that pre-date this plan render correctly via the held-image fallback in
  Unit 2.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| GitHub PR fetcher times out before lazy render finishes; the PR shows nothing useful for several minutes. | Pre-warm both render jobs on `set_summary` (Unit 4). The artifacts are usually ready before the user pastes the link. The lazy fallback handles the cases where summary wasn't called or the worker was slow. |
| WeasyPrint system deps balloon the worker image / break the build. | Use the official Debian package set documented by WeasyPrint; pin to a single base image; build the worker image in CI to catch regressions before deploy. |
| ffmpeg subprocess on a 768MB Fly machine OOMs on a long clip. | Worker process group runs on its own machine pool (separate from the API). Set `--max-muxing-queue-size` modestly and impose a hard timeout per render. Bump machine size if real renders OOM; cheap. |
| Edit happens during render, render output is stale, gets persisted, external consumer sees stale output. | Post-render `render_version` recheck in the job (Unit 4) — discard if stale, let the new edit's enqueue produce the fresh artifact. |
| Hot-retry loops on a pathological render (broken slideshow) overwhelm the worker. | Lazy-enqueue rate limit (60s) in the public endpoint (Unit 5). Failed jobs go to rq's failure queue and are not auto-retried; operator clears them via `rqworker` admin or a future maintenance command. |
| Storage grows unbounded as edits accumulate `v<n>` paths. | Acceptable in v1 — single-digit MB per clip, edits are infrequent. Future GC management command listed in Deferred to Separate Tasks. |
| OG video unfurl uses `og:video:secure_url` pointing at an MP4 that hasn't rendered yet → first paste in Slack shows broken player. | Pre-warm on `set_summary` and the OG poster fallback to first slide's `media_url` in Unit 6 means the unfurl always has an image even if the video isn't ready. Slack re-fetches OG tags periodically; subsequent paste lands the working video. |

## Documentation / Operational Notes

- Update bundled skill (`agentclip-python/src/agentclip/skill/SKILL.md`) per Unit 9.
- Operator runbook: a new entry under `agentclip/api/README.md` (or wherever
  ops notes live) describing how to inspect failed renders via
  `fly logs --process-group worker` and how to manually re-enqueue via the
  Django shell.
- New worker process group is observable via `fly status` and `fly logs`.
  Add a smoke check to the deploy: after deploy, fetch a known clip's
  `.mp4` URL once to ensure the worker pipeline is healthy.

## Sources & References

- Origin: chat brainstorm with Eric on 2026-05-07 (no requirements doc).
- Predecessor plan: [docs/plans/2026-05-07-001-feat-openai-tts-narration-plan.md](2026-05-07-001-feat-openai-tts-narration-plan.md).
- Related code:
  - `api/slideshows/narration.py` (pure-module pattern reference)
  - `api/slideshows/models.py` `Slide.audio` (FileField pattern reference)
  - `web/components/patterns/VideoClipPlayer/VideoClipPlayer.tsx` (in-app
    player; unchanged in this plan)
- External:
  - ffmpeg concat demuxer + libx264 + AAC reference encoding profile
  - WeasyPrint HTML/CSS → PDF documentation
  - OpenGraph video tag spec (`og:type=video.other`, `og:video:secure_url`,
    `og:video:type`)
  - Twitter Player Card spec (`twitter:card=player`, `twitter:player:stream`)
  - GitHub markdown inline-video behavior (URL must end in `.mp4`/`.webm`/`.mov`)
