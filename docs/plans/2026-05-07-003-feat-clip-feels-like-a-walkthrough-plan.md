---
title: 'feat: make a clip actually feel like a narrated walkthrough'
type: feat
status: active
date: 2026-05-07
---

# feat: make a clip actually feel like a narrated walkthrough

## Overview

Today's "narrated MP4" is captions read aloud, slide by slide, in a single
hardcoded voice (`nova`). No spoken intro, no spoken outro, no run-type
variation, and the visual MP4 is just letterboxed slide images on a black
canvas — no title card, no end card. The marketing copy ("narrated
walkthroughs of your work") writes a check the audio can't cash.

Separately, the share page chrome has a couple of UX bugs surfaced by
Eric: the creator credit shows only the avatar circle (not the name)
and "Filed by" copy reads stiffly across CLI output, install docs,
and skill prose.

This plan ships a single, coherent change-set that makes the clip feel
like a real walkthrough in both consumption modes:

- **Video mode (rendered MP4):** title card → intro audio (from
  slideshow description) → slide segments → outro audio (from
  slideshow summary) → end card. Voice + pacing pulled from
  `run_type`. The MP4 is now narratively complete on its own — a
  Slack/Discord/PR consumer who only watches the video gets full
  context without ever clicking through.
- **Slideshow mode (visual scroll):** title hero, description
  subheader, slide list, summary callout, share/export panel.
  Largely unchanged but gets the creator-credit fix.

The agent skill grows a small "before you click" pre-flight that
confirms the spine and run type, with sensible defaults so the
agent never blocks on user input that wasn't volunteered.

## Problem Frame

Three converging issues:

1. **The MP4 sounds like a log file read aloud, not a walkthrough.**
   No opener tells the listener what they're about to watch. No
   closer wraps it up. Every clip uses the same voice regardless of
   whether it's a tense bug repro or a polished recruiter demo.
   Captions get spoken correctly; nothing else does.

2. **The MP4 looks empty without the share page chrome.** A user
   pasting a `.mp4` URL in a GitHub PR sees just letterboxed slide
   images. No "AgentClip" brand mark, no clip title, no creator
   credit, no link back to the live page. The artifact does not
   stand on its own as a shareable thing.

3. **The user-facing language is inconsistent and a small UX bug
   exists in the share page.** The skill description says "QA
   slideshow"; the marketing says "narrated walkthrough"; the model
   says `Slideshow`. The MetaRow on the share page renders the
   creator avatar without the name. CLI output and install docs
   talk about "Filed by" credit which reads stiffly.

The product positioning is "AgentClip turns a coding agent's QA
into a shareable, narrated walkthrough." This plan makes the
artifact match the positioning.

## Requirements Trace

- **R1.** Every rendered MP4 begins with a brand title card (3-5s) and
  spoken intro derived from `Slideshow.description`. The title card
  shows the clip title and creator credit when set.
- **R2.** Every rendered MP4 ends with a brand end card (3-5s) and
  spoken outro derived from `Slideshow.summary`. The end card shows
  the share URL and "Made with AgentClip" footer.
- **R3.** Voice and pacing for all narration in a single clip
  (intro + slide captions + outro) are picked from a new
  `Slideshow.run_type` enum. The same voice is used throughout so
  the listener hears one consistent presenter.
- **R4.** `run_type` is optional and defaults to `generic` (`nova`,
  1.0× pacing). When set explicitly via the CLI/SDK, the clip
  inherits the matching voice.
- **R5.** `Slide.caption` is required at the API boundary — empty
  captions return 400. Silent slides with no spoken context are not
  a valid output state.
- **R6.** `Slide.title` (eyebrow, 3-7 words) remains slideshow-mode
  chrome only. Not spoken, not burned into MP4 frames in v1.
  Documented asymmetry; revisit in v1.1 if mute readability becomes
  a complaint.
- **R7.** Description and summary become required for new
  slideshows (downgraded from "optional but agents always set them"
  to "the API enforces them"). Existing rows with empty fields
  render with graceful fallbacks (skip intro/outro segments).
- **R8.** The share page MetaRow renders the creator name **next to**
  the avatar circle, not just initials. No "Filed by" prefix —
  just the name as a compact label.
- **R9.** "Filed by" framing is removed from CLI output, install
  docs, and SKILL.md. The user-facing word for the artifact is
  "clip" (with "walkthrough" as a synonym in prose). Tool names,
  CLI command structure, and Django model names stay
  (`slideshow_create`, `agentclip slideshow ...`) since those are
  load-bearing API contracts.
- **R10.** The agent skill includes a brief pre-flight that confirms
  spine + run_type before the agent starts capturing. The agent
  picks `run_type` heuristically from the spine table without
  asking when the trigger phrasing is unambiguous (e.g. "QA the
  signup flow" → `smoke_test`, "repro the bug" → `bug_repro`).

## Scope Boundaries

- **Not** introducing per-slide voice variation. One clip = one
  voice end-to-end.
- **Not** burning slide titles into MP4 frames in this plan. (See
  R6 — slide title is slideshow-mode chrome only.)
- **Not** changing the existing CLI command structure
  (`agentclip slideshow ...`). The verb stays for backwards
  compatibility; the user-facing prose and printed output flips
  to "clip."
- **Not** changing the Django model name `Slideshow`. It's a
  database-table name; renaming it requires a migration that's
  bigger than the value of the rename.
- **Not** changing the renderer codec profile. H.264 baseline +
  AAC stereo at 1080p30 stays.
- **Not** adding multilingual narration. English only in v1.
- **Not** adding per-clip voice override at create time beyond
  what `run_type` provides. (Power-user knob: future `--voice
  shimmer` flag.)

### Deferred to Separate Tasks

- Burned-in slide-title chyrons in MP4 frames: future PR if
  on-mute readability becomes a complaint.
- A standalone `agentclip whoami --voice nova` user-level voice
  preference: future PR once `run_type`-driven voices have been
  observed in real clips.
- Speech-to-text fallback (auto-derive captions from a recorded
  voice clip): out of scope, separate product axis.

## Context & Research

### Relevant Code and Patterns

- `api/slideshows/narration.py` — pure-module shape; gains
  `synthesize_intro(slideshow)` and `synthesize_outro(slideshow)`
  alongside the existing `synthesize_slide`. Voice lookup helper
  reads `slideshow.run_type`.
- `api/slideshows/mp4.py` — gains `build_title_card(slideshow)` and
  `build_end_card(slideshow)` Pillow helpers; `build_mp4` accepts
  optional intro/outro `(image_bytes, audio_bytes, duration)`
  triples and prepends/appends them in the segment list.
- `api/slideshows/tasks.py::render_clip_mp4` — orchestrates
  intro/outro synth alongside the existing slide-narration step
  before calling `build_mp4`.
- `api/slideshows/models.py` — adds `Slideshow.run_type` (text
  choices), `Slideshow.intro_audio` and `Slideshow.outro_audio`
  FileFields. New migration.
- `api/slideshows/serializers.py::SlideWriteSerializer` — gains
  caption-required validation. `SlideshowCreateSerializer` accepts
  optional `run_type`.
- `web/components/composites/MetaRow/MetaRow.tsx` — renders the
  creator name next to the avatar (drop avatar-only mode).
- `agentclip-python/src/agentclip/cli.py` — `slideshow create`
  accepts optional `--type/-T`. Drops "Filed by" copy in the
  whoami output.
- `agentclip-python/src/agentclip/skill/SKILL.md` — gains a
  pre-flight step + run_type guidance. Drops "Filed by" prose.
  Recasts user-facing language to "clip."

### Institutional Learnings

- The existing narration plan (`2026-05-07-001`) establishes the
  pure-module + management-command pattern; intro/outro synth
  follows it exactly.
- The render-pipeline plan (`2026-05-07-002`) establishes the
  render_version + cache-invalidation primitive; description and
  summary edits already bump render_version, so re-narration on
  edit is automatic.

### External References

- OpenAI TTS-1-HD voice list: `alloy`, `echo`, `fable`, `onyx`,
  `nova`, `shimmer`. `tts-1-hd` model accepts a `speed` param
  (0.25–4.0, default 1.0).
- Pillow's `ImageDraw.text` with system font fallbacks is enough
  for the title/end cards. No custom font shipping; Helvetica /
  Liberation Sans on the worker image.

## Key Technical Decisions

- **One voice per clip.** Picked from `run_type`, used for intro,
  every slide, and outro. Variation across slides would feel
  schizophrenic.
- **Title/end cards are rendered images, not animated.** Static
  Pillow output prepended/appended to the ffmpeg concat list.
  Held for the duration of the intro/outro audio. Cheap, fast,
  brand-controlled.
- **`run_type` defaults to `generic`** so existing rows and any
  caller that doesn't set it gets nova at 1.0× — exactly today's
  behavior. Backwards compatible.
- **`description` and `summary` are now part of the spoken
  contract.** Empty values cause the corresponding intro/outro
  segments to be skipped (renders still succeed). New API writes
  enforce non-empty; existing rows with empty fields render with
  the segment skipped.
- **Caption required at the serializer level**, not the model
  level. `Slide.caption = TextField()` stays open at the DB so
  the management command + admin can still tolerate legacy rows;
  the public API simply rejects empty captions. Less migration
  pain.
- **Creator name beside avatar, not under or hovered.** MetaRow
  shifts from `<CreatorAvatar>` to `<CreatorChip avatarOnly={false} byline={false}>`.
  Compact, visible, no "Filed by" prefix.
- **The agent picks run_type heuristically.** Trigger phrasing
  in the user prompt maps to a run type via the existing spine
  table. Only ambiguous triggers ("show me what happened")
  prompt the agent to ask once.
- **Vocabulary split: prose vs API contracts.** "Clip" replaces
  "slideshow" in user-facing copy (CLI output, skill prose,
  install docs, marketing). Tool names, CLI command names, and
  Django model name stay because they're contracts.

## Open Questions

### Resolved During Planning

- Are intro/outro narration / cards optional? — They render when
  `description`/`summary` are set, and skip cleanly when empty.
- Should the agent ask the user about voice? — No. Agent picks
  from `run_type`, defaults to generic if unset.
- Should `slide.title` be burned into MP4 frames? — Not in v1;
  asymmetry documented in R6.
- "Filed by" stays or goes? — Goes everywhere user-facing.

### Deferred to Implementation

- Title/end card visual layout (font sizes, exact spacing,
  whether to include the creator chip on the title card or just
  the end card). Implementer makes a first pass; Eric reviews
  against a real render before locking.
- Whether the brand mark on the cards is text-only ("AgentClip"
  in vermillion) or a rendered SVG / logo asset. Defer to
  implementation; text-only is simpler and ships fast.
- Exact phrasing for the intro/outro separators if needed
  (e.g. "From AgentClip, here's…" prefix). Probably not — let
  the description speak for itself.

## High-Level Technical Design

> *Directional guidance for review, not implementation specification.*

```
Slideshow row
├── title         — h1 (slideshow mode) + title card text (video mode)
├── description   — subheader (slideshow mode) + intro audio (video mode)
├── summary       — callout (slideshow mode) + outro audio (video mode)
├── run_type      — voice/pacing selector for ALL narration in this clip
├── created_by    — credit chip beside avatar (slideshow + title/end cards)
├── intro_audio   — generated MP3 of description, voice from run_type
└── outro_audio   — generated MP3 of summary, voice from run_type

Slide rows (1..N, ordered by position)
├── title         — eyebrow (slideshow mode); not in video mode
├── caption       — body paragraph (slideshow mode) + spoken audio (video mode)
├── media         — inline element (slideshow mode) + canvas frame (video mode)
└── audio         — narration MP3, voice from slideshow.run_type

Render pipeline (Celery render_clip_mp4)
1. Auto-narrate any unnarrated slides
   (slides + intro + outro all share slideshow.run_type → voice)
2. Build segments:
     [title_card_img + intro_audio]              ← intro segment
     [slide_1.media + slide_1.audio] (×N)        ← per-slide
     [end_card_img + outro_audio]                ← outro segment
3. Concat-demuxer assembles into one MP4
```

## Implementation Units

- [ ] **Unit 1: Schema — run_type, intro_audio, outro_audio**

**Goal:** Three new fields on `Slideshow` plus a migration. Foundation
for everything else; the render pipeline reads these fields to decide
voice and to populate the audio segments.

**Requirements:** R3, R4, R7

**Dependencies:** None.

**Files:**
- Modify: `api/slideshows/models.py`
- Create: `api/slideshows/migrations/0010_slideshow_runtype_introoutro.py`
- Test: `api/slideshows/test_runtype.py`

**Approach:**
- Add `Slideshow.RunType(TextChoices)` with values
  `BUG_REPRO`, `SMOKE_TEST`, `DEMO`, `ONBOARDING_EVAL`,
  `COMPETITIVE_TEARDOWN`, `GENERIC` (default).
- Add `Slideshow.run_type = CharField(max_length=24, choices=RunType.choices, default=RunType.GENERIC)`.
- Add `intro_audio` / `outro_audio` FileFields keyed off
  `_render_path` (versioned alongside MP4/PDF/poster). Cleared
  by `bump_render_version` — extend the helper's field list.
- Migration: additive only, all defaults backwards-compatible.

**Test scenarios:**
- Happy path: `Slideshow.RunType.choices` includes all six values.
- Happy path: a fresh `Slideshow.objects.create()` defaults to `GENERIC`.
- Happy path: `bump_render_version()` clears `intro_audio` and
  `outro_audio` alongside the existing fields.
- Edge case: setting `run_type='smoke_test'` and saving round-trips
  cleanly.

---

- [ ] **Unit 2: narration.py — voice mapping + intro/outro synth**

**Goal:** `synthesize_intro(slideshow)` and `synthesize_outro(slideshow)`
produce MP3 bytes from description / summary. A single
`voice_for(slideshow)` helper centralizes the run_type → (voice,
speed) mapping; `narrate_slideshow` (already auto-called by render)
uses the same helper so per-slide audio matches.

**Requirements:** R1, R2, R3, R4

**Dependencies:** Unit 1.

**Files:**
- Modify: `api/slideshows/narration.py`
- Test: `api/slideshows/test_narration.py` (extend existing tests)

**Approach:**
- Module-level constant `RUN_TYPE_VOICE` mapping each `RunType`
  to `(voice_name, speed)`.
- `voice_for(slideshow) -> (str, float)` helper.
- `synthesize_intro(slideshow, *, dry_run=False) -> NarrationOutcome`
  uses `slideshow.description`; returns `('skipped', reason='empty')`
  when description is blank.
- `synthesize_outro(slideshow, *, dry_run=False) -> NarrationOutcome`
  uses `slideshow.summary`; same skip behavior.
- `narrate_slideshow` calls `voice_for(slideshow)` instead of the
  hardcoded `DEFAULT_VOICE` so per-slide audio matches the rest.

**Test scenarios:**
- Happy path: `synthesize_intro` on a slideshow with description
  returns non-empty MP3 bytes.
- Happy path: `synthesize_intro` on a slideshow with empty
  description returns a skipped outcome.
- Happy path: `voice_for` returns `('nova', 1.0)` for `GENERIC`.
- Happy path: `voice_for` returns `('shimmer', 0.95)` for `DEMO`.
- Integration: `narrate_slideshow` on a slideshow with
  `run_type='demo'` produces audio that records `audio_voice='shimmer'`
  on each slide.

---

- [ ] **Unit 3: mp4.py — title/end cards + intro/outro segments**

**Goal:** `build_title_card(slideshow)` and `build_end_card(slideshow)`
emit Pillow JPEG bytes; `build_mp4` accepts optional intro/outro
inputs and prepends/appends segments built from them.

**Requirements:** R1, R2

**Dependencies:** Unit 2 (so the synth functions exist for the
caller to invoke).

**Files:**
- Modify: `api/slideshows/mp4.py`
- Test: `api/slideshows/test_mp4.py` (extend)

**Approach:**
- `build_title_card(slideshow) -> bytes`: 1920×1080 black background,
  vermillion eyebrow "AGENTCLIP", `slideshow.title` rendered in
  large bold, optional creator credit subtitle. JPEG bytes.
- `build_end_card(slideshow) -> bytes`: 1920×1080 black background,
  vermillion brand mark, `slideshow.share_url` mid-card, "Made with
  AgentClip" footer. JPEG bytes.
- `BookendInput` dataclass: `image_bytes`, `audio_bytes`, default
  duration if no audio. Used for both intro and outro.
- `build_mp4(slides, *, intro=None, outro=None) -> RenderResult`:
  prepends an image-segment built from `intro` and appends one
  built from `outro` when provided.
- Reuse the existing `_build_image_segment` for the bookend
  segments — they're just static images with audio.

**Test scenarios:**
- Happy path: `build_title_card` returns valid JPEG with the
  expected dimensions; embeds the slideshow title text.
- Happy path: `build_end_card` likewise.
- Happy path: `build_mp4(slides, intro=BookendInput(...), outro=BookendInput(...))`
  produces an MP4 whose duration ≈ intro_seconds + sum(slide_seconds) + outro_seconds.
- Edge case: `build_mp4(slides)` (no bookends) still produces a
  valid MP4 — bookends are strictly opt-in.
- Edge case: `BookendInput` with empty audio holds the card image
  for `STILL_DURATION_S`.

---

- [ ] **Unit 4: tasks.py — orchestrate bookends in render_clip_mp4**

**Goal:** The render task synthesizes intro + outro audio + cards
and feeds them as bookend inputs to `build_mp4`. Auto-runs as part
of every render, just like the existing auto-narrate-on-render.

**Requirements:** R1, R2, R7

**Dependencies:** Units 2 and 3.

**Files:**
- Modify: `api/slideshows/tasks.py`
- Test: `api/slideshows/test_tasks.py` (extend)

**Approach:**
- Inside `render_clip_mp4`, after the auto-narrate step:
  - Synthesize intro audio if `description` is set; persist to
    `slideshow.intro_audio` (so we don't re-synth on every
    render).
  - Synthesize outro audio if `summary` is set; persist to
    `slideshow.outro_audio`.
  - Build title and end cards via `mp4.build_title_card` /
    `mp4.build_end_card`.
  - Pass `intro=BookendInput(card_bytes, intro_audio_bytes, ...)` and
    `outro=BookendInput(card_bytes, outro_audio_bytes, ...)` into
    `build_mp4`.
- Failure modes match the existing pattern: `NarrationConfigError`
  falls through to a silent intro/outro (held card image).
  `MP4RenderError` retries.

**Test scenarios:**
- Happy path: a slideshow with description + summary set produces
  an MP4 with intro and outro segments; `intro_audio` /
  `outro_audio` populated on the row.
- Happy path: a slideshow with empty description renders without
  an intro segment; outro still renders if summary is set.
- Edge case: missing OPENAI_API_KEY → intro/outro audio synth
  errors fall through to silent card frames; MP4 render still
  succeeds.

---

- [ ] **Unit 5: API — required caption + run_type CLI/SDK plumbing**

**Goal:** Caption required at the serializer level (400 on empty);
`SlideshowCreateSerializer` and `SlideshowPatchSerializer` accept
optional `run_type`; SDK `create_slideshow` and CLI
`slideshow create` expose `--type`.

**Requirements:** R3, R4, R5

**Dependencies:** Unit 1.

**Files:**
- Modify: `api/slideshows/serializers.py`
- Modify: `api/slideshows/views.py` (verify error envelope)
- Modify: `agentclip-python/src/agentclip/_models.py`
- Modify: `agentclip-python/src/agentclip/sdk.py`
- Modify: `agentclip-python/src/agentclip/cli.py`
- Test: extend `api/slideshows/tests.py`, `agentclip-python/tests/test_sdk.py`,
  `agentclip-python/tests/test_cli.py`

**Approach:**
- `SlideWriteSerializer.caption`: explicit `required=True, allow_blank=False`.
  Returns 400 with a clear message on empty.
- `SlideshowCreateSerializer.run_type`: optional, choices match the
  model.
- `SlideshowPatchSerializer.run_type`: optional. Setting it bumps
  render_version (existing pattern).
- SDK: `create_slideshow(*, run_type=None)` passes through.
- CLI: `agentclip slideshow create --type/-T <run_type>`. Accepts
  any of the six values.

**Test scenarios:**
- Happy path: `slide_add` with empty caption returns 400.
- Happy path: `slideshow_create` with `run_type='demo'` round-trips.
- Happy path: PATCH with `run_type` change bumps render_version.
- Edge case: invalid `run_type` value returns 400 with the
  allowed-values list.

---

- [ ] **Unit 6: Web — MetaRow shows name beside avatar**

**Goal:** Drop avatar-only mode in MetaRow. Render the creator's
name + initials avatar inline. No "Filed by" prefix.

**Requirements:** R8

**Dependencies:** None.

**Files:**
- Modify: `web/components/composites/MetaRow/MetaRow.tsx`
- Test: `web/components/composites/MetaRow/MetaRow.test.tsx`

**Approach:**
- Replace the inline `<CreatorAvatar>` usage with
  `<CreatorChip name={...} url={...} size="sm" byline={false} avatarOnly={false} />`.
- Visual: bullet · creator-name · avatar in a single row.
- Test snapshot: the rendered HTML includes the name text node.

**Test scenarios:**
- Happy path: MetaRow rendered with `createdBy="Eric Elizes"`
  contains the literal text "Eric Elizes".
- Happy path: MetaRow without a `createdBy` does not render the
  CreatorChip block.

---

- [ ] **Unit 7: Vocabulary cleanup**

**Goal:** "Filed by" framing dropped from CLI + skill + install
docs. User-facing prose says "clip" instead of "slideshow." Tool
and command names unchanged.

**Requirements:** R9

**Dependencies:** None.

**Files:**
- Modify: `agentclip-python/src/agentclip/cli.py` (whoami output
  + slideshow_create summary lines)
- Modify: `agentclip-python/src/agentclip/skill/SKILL.md`
- Modify: `agentclip-python/src/agentclip/setup.py` (any user-facing copy)
- Modify: `web/public/install.md`
- Modify: `agentclip-python/tests/test_cli.py` (the assertion that
  expects "Filed by" — change to whatever new copy reads)

**Approach:**
- `agentclip whoami --set ...` output switches from
  `'saved. clips will display "Filed by {label}".'` to
  `'saved. {label} will be credited on every clip.'` (or similar
  natural phrasing).
- `slideshow_create` summary block: `'created clip {id}'` instead
  of `'created slideshow {id}'`. The CLI command verb stays
  `slideshow`.
- SKILL.md: replace user-facing "slideshow" with "clip";
  "walkthrough" sparingly when it reads better. Tool names like
  `slideshow_create` stay verbatim.
- Install docs: same rename.

**Test scenarios:**
- Happy path: `agentclip whoami --set 'X'` output does NOT include
  "Filed by".
- Happy path: `agentclip slideshow create --title T` summary block
  includes the literal text "created clip" instead of "created slideshow".

---

- [ ] **Unit 8: Skill pre-flight — confirm spine + run_type**

**Goal:** SKILL.md grows a brief Step 0 that names the spine and
picks a run_type from the trigger phrasing. The agent only asks
the user when the trigger is ambiguous (e.g. plain "show me what
happened" without a flow named).

**Requirements:** R10

**Dependencies:** Unit 7 (skill is being edited anyway).

**Files:**
- Modify: `agentclip-python/src/agentclip/skill/SKILL.md`

**Approach:**
- New "Step 0: Pick the spine and run type" section before
  "Step 1: Decide what to capture before you click."
- A heuristic mapping table: trigger phrase → run_type. E.g.:
  - "QA / smoke test / smoke" → `smoke_test`
  - "repro / reproduce / bug" → `bug_repro`
  - "demo / show / walkthrough" → `demo`
  - "onboard / first impression / friction" → `onboarding_eval`
  - "compare / teardown / vs" → `competitive_teardown`
  - Plain narrative request → `generic`
- A short "ask only when…" decision rule: agent asks once if
  the trigger is too ambiguous to map (e.g. "make a clip" with
  no context) — and asks naturally, not formally.
- Caption guidance gets a "narration-friendly" addendum
  encouraging em-dashes for natural pacing.

**Test scenarios:**
- N/A (markdown change). Verify the file parses as the bundled
  skill via `agentclip install-skill --dry-run` if such a flag
  exists; otherwise visual review only.

## System-Wide Impact

- **Interaction graph:** `bump_render_version` already runs on
  description/summary edits; extending the helper to clear
  `intro_audio` / `outro_audio` keeps re-narration on edit
  automatic with no new wiring.
- **Error propagation:** Intro/outro narration failures degrade
  to silent card frames rather than failing the whole render.
  Slide narration was already this way; pattern stays consistent.
- **State lifecycle risks:** Adding three optional fields is
  additive-only; existing rows continue to render with skipped
  segments. The new caption-required validation is the only
  potentially breaking change for API callers — but the existing
  agent skill already requires captions.
- **Integration coverage:** End-to-end test in `test_tasks.py`
  exercises the full pipeline (auto-narrate slides + intro +
  outro + render with bookends).
- **Unchanged invariants:** Slide tool names, CLI command verbs
  (`agentclip slideshow ...`), Django model name `Slideshow`,
  R2 storage paths, render-version invalidation primitive, all
  unchanged.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Title/end card visual design feels half-baked next to a real product hero. | Iterate after seeing real renders. Title/end card generation lives entirely in `mp4.py` so visual polish is a follow-up edit, not a re-architecture. |
| `run_type` enum values get stale or insufficient. | Six values cover the agent skill's existing spine table. Adding a value later is a one-line model change + voice-map entry. |
| OpenAI charges add up if every render re-synthesizes intro/outro. | Persist `intro_audio` / `outro_audio` on the Slideshow row. Re-synth only when render_version bumps (i.e., when the source text actually changed). |
| Vocabulary churn from "slideshow" → "clip" leaks into command names. | Out-of-scope by design (R9). Plan keeps tool/CLI verbs frozen; only prose changes. |
| Skill pre-flight slows the agent down with unwanted questions. | Heuristic mapping covers the common triggers without prompting. Asking is reserved for ambiguous prompts only. |

## Documentation / Operational Notes

- README + install docs need a one-paragraph update describing
  the `run_type` parameter and the new bookend behavior.
- Operator runbook: re-narration on description/summary edit is
  automatic; no manual step needed unless an explicit re-narrate
  is desired (existing `agentclip slideshow narrate --force`
  still works).

## Sources & References

- Predecessor plans:
  - [docs/plans/2026-05-07-001-feat-openai-tts-narration-plan.md](2026-05-07-001-feat-openai-tts-narration-plan.md)
  - [docs/plans/2026-05-07-002-feat-clip-mp4-pdf-embed-plan.md](2026-05-07-002-feat-clip-mp4-pdf-embed-plan.md)
- Related code:
  - `api/slideshows/narration.py` — pure-module pattern
  - `api/slideshows/mp4.py` — render pipeline entry point
  - `web/components/composites/MetaRow/MetaRow.tsx` — credit rendering
- External:
  - OpenAI TTS-1-HD voice + speed parameters
  - Pillow `ImageDraw.text` for title/end card composition
