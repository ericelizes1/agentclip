---
title: AgentClip pre-launch arc — attribution, polish, ship
type: feat
status: active
date: 2026-05-05
---

# AgentClip pre-launch arc: attribution, polish, ship

## Overview

The two AgentClip repos (`agentclip` Python package and `agentclip-app` Django backend) are functionally complete and the existing commit logs already tell a coherent narrative arc: scaffold, then SDK, then MCP, then CLI, then skill, then tests, then polish, then rename, then OSS hygiene, then video clips. This plan defines the remaining work needed to round out v0.1.0 and ship to PyPI plus DigitalOcean without breaking that narrative.

The constraint baked into every unit below: each commit reads as one focused, well-justified improvement. No "wip", no "address feedback", no batched mega-commits. Conventional prefixes (`feat`, `fix`, `refactor`, `test`, `chore`, `docs`). Commit-message bodies explain *why*, not just *what*. Each implementation unit corresponds to roughly one atomic commit.

**Target repos:** both `agentclip` (Python package) and `agentclip-app` (Django backend). The plan file lives in this repo for convenience; units below are explicit about which repo they target.

## Problem Frame

Recruiters at AI companies will run `git log --stat` on these repos before reading the code. Today's history is good but incomplete: there is no creator attribution on clips, no demo asset in the README, no real seed content on `agentclip.dev/`, and no `v0.1.0` tag (so no PyPI release, no GitHub release notes, no signal that "this is shipped"). Each gap closes with one or two commits. The order matters because the cumulative log is the artifact.

A secondary concern from a recent conversation: when Eric sends a clip URL externally, he wants the artifact to credit him so it doubles as a portfolio surface, not anonymous tool output. Adding `created_by` is the simplest way to make every clip URL a one-tap path to Eric's identity.

## Requirements Trace

- **R1.** Clips can be credited to a creator with optional name and URL, set once locally and applied automatically. Architecture: text `created_by` field now, future-compatible with a real `owner` FK when accounts later ship.
- **R2.** The remaining commits land in an order that, combined with existing commits, reads as a textbook portfolio engineering progression to a stranger running `git log`.
- **R3.** Every commit follows the existing style: conventional prefix, imperative one-line summary, body explaining tradeoffs, no em dashes in user-facing surfaces, no model or vendor names in marketing copy.
- **R4.** The launch ritual (push, tag, PyPI publish, DO deploy, gallery seed) leaves visible artifacts: live agentclip.dev, populated home-page gallery, GitHub release page, PyPI listing with hero image, MCP-registry-ready repo topics.

## Scope Boundaries

- **In scope:** `created_by` text attribution end-to-end (model, API, viewer); `whoami` CLI command; SKILL.md update; README hero asset; gallery seed script; pre-push commit-log review; `v0.1.0` tag; first DO deploy; first awesome-mcp-servers PR.
- **Out of scope:** any account / login system. v1 stays accountless; `created_by` is a string, not a user FK.
- **Out of scope:** rewriting any existing commit history. The current log is honest and well-shaped; rebasing now would erase exactly the iteration signal recruiters value (the qagent → agentclip rename, the editorial → clean-modern design pivot).

### Deferred to Separate Tasks

- "Claim my anonymous slideshows" flow: future PR after accounts ship. Will use the existing `write_token` cache as the binding key.
- Server-side video thumbnail extraction for og:image: future commit; current viewer correctly skips og:image when the first slide is video.
- MCP registry submission and Show HN post: post-PyPI, separate launch task. Research digest already documented the format.

## Context & Research

### Relevant Code and Patterns

- `agentclip/src/agentclip/state.py` — atomic-write JSON state store. Whoami data fits cleanly under a new top-level `whoami` key alongside the existing `slideshows` map. Existing 0600-perms hardening applies automatically.
- `agentclip/src/agentclip/sdk.py:create_slideshow` — point of injection for auto-applied creator credit. Caller-supplied values must override stored defaults.
- `agentclip-app/slideshows/models.py:Slideshow` — already accommodates new optional fields. Patterns to mirror: `summary` (TextField, blank=True, default=''), `created_ip` (audit-style nullable field, admin-only).
- `agentclip-app/slideshows/serializers.py` — three-serializer split (Create, Patch, Public) is already in place. Each new field gets exposed in the right shape.
- `agentclip-app/slideshows/templates/slideshows/viewer.html` — existing `.clip-meta` block in the hero is the natural slot for "Filed by ..." rendering. Existing `.label.dot::before` pattern handles the bullet-separator.
- `agentclip-app/slideshows/views.py:_GALLERY_TOKENS` — editorial-control surface for the home-page gallery, intentionally a constant (not DB-backed) so curation is explicit.

### Institutional Learnings

- The existing commit log establishes the bar: every commit-message body discusses tradeoffs and surfaces alternative approaches considered. New commits must match.
- The `0001_initial` migration was regenerated cleanly when video support landed because there was no production data. The same approach can apply when `created_by` lands pre-deploy. Once DO is live with real clips, future migrations append rather than regenerate.
- The earlier "OSS launch best practices" research digest documented the exact PyPI Trusted Publisher OIDC flow, awesome-mcp-servers PR format, and badges that matter. Those answers stay valid; no need to re-research.

### External References

- [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/) — already established as the project format. Every shipped commit appends to `[Unreleased]` until the tag promotes it to a numbered section.
- [PyPI Trusted Publishers](https://docs.pypi.org/trusted-publishers/using-a-publisher/) — `release.yml` is already configured for OIDC. First-tag setup requires a one-time Pending Publisher entry on pypi.org.
- [punkpeye/awesome-mcp-servers CONTRIBUTING](https://github.com/punkpeye/awesome-mcp-servers/blob/main/CONTRIBUTING.md) — line format and category placement documented in earlier research.

## Key Technical Decisions

- **`created_by` is a text field, not a user FK.** Coexists with a future `owner_id`. Git-author analogy: text is durable display data; FK is authorization. Rationale: avoids forcing accounts in v1; zero schema waste when accounts later ship.
- **Whoami stored alongside write_tokens in `~/.agentclip/state.json` under a new `whoami` key**, not in a separate config file. The state store already has atomic-write protection and 0600 perms. One-file model keeps install / uninstall trivial.
- **The skill mentions whoami once, gently, and only suggests setup when the user signals external sharing.** Not a "ask before every clip" instruction. Friction kills adoption.
- **No commit-log rebase before push.** The existing 13 plus 14 commits across both repos already tell a strong story. Squashing the rename or the design pivot would erase exactly the iteration signal recruiters want to see.
- **`v0.1.0` is tagged on the OSS package only.** The Django backend is a service, not a versioned library; its `CHANGELOG.md` uses deploy-date headers, an established pattern.
- **Each implementation unit below corresponds to one atomic commit.** This is a hard constraint, not a guideline. If a unit grows beyond one focused change at implementation time, split it before the commit lands.

## Open Questions

### Resolved During Planning

- **Should clips display creator attribution?** Yes, optional, text-based, set via local CLI command. Confirmed during the conversation that prompted this plan.
- **Should the agent prompt for attribution every run?** No, friction. The CLI prompts once at install; the agent only suggests it when the user signals external sharing.
- **Should existing commits be rebased?** No. They read well as-is. The rename and the design pivot are honest engineering signal.
- **Per-repo or shared plan file?** Single shared file in `agentclip-app/docs/plans/`. Cross-repo arc is one logical artifact.

### Deferred to Implementation

- Exact wording of the install-skill prompt and the first-create nudge. Settle on copy at write time; both are short strings.
- Whether `created_by_url` should require `https://` (probably yes, but settle when writing the validator).
- Whether the gallery seed runs as a Django management command or a Python script. Pick at implementation time based on which reads cleanest given how the seed images are bundled.
- Hero asset format: GIF vs static PNG. Pick at capture time based on whether the motion adds anything.
- Whether to regenerate `0001_initial` again or stack a new migration. Decision depends on whether the DO deploy has happened by the time Unit 1 lands. If pre-deploy: regenerate (clean log); if post-deploy: stack.

## Implementation Units

Two phases. Phase A is pre-launch features (Units 1 through 8). Phase B is the launch ritual (Unit 9). Within Phase A, the agentclip-app units land first because the agentclip package's whoami auto-application depends on the backend accepting the new fields.

### Phase A: Features

#### `agentclip-app` (Django backend)

- [ ] **Unit 1: Add `created_by` and `created_by_url` to Slideshow**

  **Goal:** Persist optional creator attribution on each slideshow.

  **Requirements:** R1, R3.

  **Dependencies:** None.

  **Files:**
  - Modify: `slideshows/models.py`
  - Modify: `slideshows/serializers.py`
  - Modify: `slideshows/admin.py`
  - Modify: `slideshows/migrations/0001_initial.py` (or new migration; decide at implementation time per Open Questions)
  - Test: `slideshows/tests.py`

  **Approach:**
  - Add `created_by = models.CharField(max_length=100, blank=True, default='')` to `Slideshow`.
  - Add `created_by_url = models.URLField(max_length=200, blank=True, default='')`.
  - Expose both as writable in `SlideshowCreateSerializer` and `SlideshowPatchSerializer`.
  - Expose both as read-only in `SlideshowPublicSerializer` for the viewer template.
  - Admin: add the two fields to the existing audit fieldset alongside `created_at` and `created_ip`.
  - URL field validation: rely on Django's built-in `URLField` validator.

  **Patterns to follow:**
  - `Slideshow.summary` is the closest existing optional text field (TextField, blank=True, default='').
  - `created_ip` is the closest existing audit-style field for admin display patterns.

  **Test scenarios:**
  - Happy path: POST `/api/slideshow/` with `{title: ..., created_by: "Eric Elizes", created_by_url: "https://elizes.dev"}` returns 201 with both fields echoed in the response body.
  - Happy path: GET `/api/slideshow/<id>/` (or via the serializer) returns the persisted values.
  - Edge case: POST without `created_by` or `created_by_url` returns 201 and the row has empty strings (not NULL).
  - Edge case: PATCH `/api/slideshow/<id>/` with new `created_by` updates only that field.
  - Error path: PATCH with malformed `created_by_url` (e.g., `not-a-url`) returns 400 with a `created_by_url` field error.
  - Error path: POST with `created_by` longer than 100 chars returns 400.

  **Verification:**
  - All 25 existing tests still pass.
  - 5 new tests covering the scenarios above.
  - Admin shows the credit fields in a sensible audit section.

- [ ] **Unit 2: Render "Filed by" credit in the viewer hero**

  **Goal:** Show creator attribution on the public viewer page when set.

  **Requirements:** R1, R3.

  **Dependencies:** Unit 1.

  **Files:**
  - Modify: `slideshows/templates/slideshows/viewer.html`
  - Test: `slideshows/tests.py`

  **Approach:**
  - Insert a "Filed by [name]" line into the existing `.clip-meta` block in the hero, positioned between the date label and the existing meta items.
  - When `created_by_url` is set, render the name as `<a href="{{ created_by_url }}" target="_blank" rel="noopener nofollow">`. The `nofollow` matters because creator URLs are user-supplied and we do not audit them.
  - When only `created_by` is set, render as plain text.
  - When both are blank, omit the line entirely (no empty bullet, no "Filed by anonymous").
  - Match the existing `.clip-meta .label` styling and dot-separator pattern.

  **Patterns to follow:**
  - Existing `.clip-meta` and `.label.dot::before` styling in the same template.
  - `rel="noopener nofollow"` matches best-practice for any user-supplied external URL.

  **Test scenarios:**
  - Happy path: viewer renders "Filed by Eric Elizes" with an `<a>` element when both fields are set.
  - Happy path: viewer renders "Filed by Eric Elizes" as plain text when name is set but URL is blank.
  - Edge case: viewer omits the credit line entirely when both fields are blank.
  - Integration: the existing `test_share_token_does_not_leak_write_token` regression test still passes; the new template paths must not regress that invariant.

  **Verification:**
  - Render in browser at 390px and 1280px; both layouts handle the new line correctly.
  - View source confirms `rel="noopener nofollow"` on outbound creator links.

- [ ] **Unit 3: Seed gallery with 5 hand-curated example clips**

  **Goal:** Populate `_GALLERY_TOKENS` in `slideshows/views.py` with real `share_token` values so `agentclip.dev/` shows curated content from day one.

  **Requirements:** R4.

  **Dependencies:** Unit 1, Unit 2 (so seeded clips have proper attribution and the viewer renders correctly).

  **Files:**
  - Create: `slideshows/management/commands/seed_gallery.py`
  - Create: `slideshows/management/commands/fixtures/` (image and video assets for the 5 clips)
  - Modify: `slideshows/views.py` (update `_GALLERY_TOKENS` with the resulting tokens after running the command in production)

  **Approach:**
  - Management command that creates 5 anonymous slideshows directly via `Slideshow.objects.create` plus `Slide.objects.create`, populates each with 3-5 fixture screenshots, sets `created_by="AgentClip"` and `created_by_url="https://github.com/ericelizes1/agentclip"`, and prints the resulting `share_token` values.
  - Command runs once in the deployed DO environment after migrations. Operator copies the tokens into `_GALLERY_TOKENS` and commits as a follow-up.
  - Five clip themes: (1) bug find on a known public site, (2) onboarding QA, (3) competitive analysis pass, (4) regression check, (5) feature exploration. Each demonstrates a different agent-QA pattern from `SKILL.md`.

  **Execution note:** Run against deployed DO instance, not local sqlite, so `share_tokens` are stable and the gallery survives container restarts. Document this in the command's docstring.

  **Patterns to follow:**
  - Standard Django management command structure with `BaseCommand` and `handle` method.
  - The `_GALLERY_TOKENS` constant in `views.py:46` is the editorial-control surface, intentionally not DB-backed.

  **Test scenarios:**
  - Happy path: `manage.py seed_gallery` creates 5 slideshows with 3-5 slides each and exits 0, printing tokens.
  - Idempotency: re-running creates 5 NEW slideshows; no deduplication. The operator picks tokens by hand to keep editorial control explicit.
  - Integration: home page renders 5 cards in the order specified by `_GALLERY_TOKENS` after token paste-in.

  **Verification:**
  - Home page on `agentclip.dev` shows 5 populated cards after deploy + seed run + token paste-in.
  - Each card has a thumbnail, title, description, and "▸ N" badge.

- [ ] **Unit 4: Deploy to DigitalOcean and wire DNS**

  **Goal:** Boot the live service at `agentclip.dev` backed by managed Postgres and Spaces.

  **Requirements:** R4.

  **Dependencies:** Units 1 and 2 merged. Eric must provision the DO account (Postgres, Spaces, App Platform).

  **Files:** none. Operational unit, not code.

  **Approach:**
  - Eric runs the steps already documented in `README.md` Deploy section: provision Postgres, create Space, generate keys, `doctl apps create --spec .do/app.yaml`, set the secret env vars marked `type: SECRET` in `.do/app.yaml` via the App Platform UI, point `agentclip.dev` DNS at the App Platform hostname.
  - Once live, run Unit 3's `seed_gallery` command in the deployed environment.
  - Smoke test: hit `https://agentclip.dev/` (200), `https://agentclip.dev/s/<seed_token>/` (200), `POST https://agentclip.dev/api/slideshow/` (201) from a fresh `pip install agentclip` against the live URL.

  **Test expectation:** none, this unit is operational.

  **Verification:**
  - DNS resolves `agentclip.dev` to App Platform.
  - Home page renders with seeded gallery.
  - End-to-end SDK call from a fresh `pip install agentclip` succeeds against the production URL.

#### `agentclip` (Python package)

- [ ] **Unit 5: Add whoami persistence and SDK auto-application**

  **Goal:** Persist creator credit in `~/.agentclip/state.json` and auto-apply on `slideshow_create`.

  **Requirements:** R1, R3.

  **Dependencies:** Unit 1 (the backend must accept `created_by` fields).

  **Files:**
  - Modify: `src/agentclip/state.py`
  - Modify: `src/agentclip/sdk.py`
  - Test: `tests/test_state.py`
  - Test: `tests/test_sdk.py`

  **Approach:**
  - `StateStore` gains three methods: `get_whoami() -> dict | None`, `set_whoami(name: str, url: str | None = None)`, `clear_whoami()`. Stored at top-level `whoami` key in `state.json`: `{"name": "...", "url": "..."}`.
  - `AgentClipClient.create_slideshow` reads whoami from the state store when not overridden by call-site arguments and merges name plus url into the POST body as `created_by` and `created_by_url`. Caller-supplied values take precedence over stored ones.
  - Backwards-compat: pre-existing `state.json` files without a `whoami` key continue to work; `get_whoami()` returns `None`.
  - SDK wires the state-store read behind a constructor flag so tests can inject a stub state store without touching the real filesystem.

  **Patterns to follow:**
  - Existing `remember()` / `get_token()` pattern in `StateStore`.
  - The atomic-write path already in place: every whoami mutation goes through the existing `_write()` helper.

  **Test scenarios:**
  - Happy path: `store.set_whoami("Eric", "https://elizes.dev")` then `store.get_whoami()` returns the expected dict.
  - Happy path: SDK `create_slideshow()` with whoami set sends both fields in the request body.
  - Happy path: SDK `create_slideshow(created_by="Override", created_by_url="https://other.dev")` overrides the stored whoami.
  - Edge case: `clear_whoami()` removes the entry; `get_whoami()` returns `None`.
  - Edge case: SDK `create_slideshow()` with no whoami stored sends no `created_by` fields (omits them rather than sending empty strings).
  - Edge case: corrupt state.json (existing test) does not break whoami; `get_whoami()` returns `None`.
  - Integration: file format on disk matches the schema documented in state.py: `{"whoami": {...}, "slideshows": {...}}`.

  **Verification:**
  - All 20 existing tests still pass.
  - 5 to 6 new tests covering whoami persistence and SDK auto-application.

- [ ] **Unit 6: `agentclip whoami` command, install-skill prompt, first-create nudge**

  **Goal:** Make whoami discoverable and easy to set without forcing it on anyone.

  **Requirements:** R1, R3.

  **Dependencies:** Unit 5.

  **Files:**
  - Modify: `src/agentclip/cli.py`
  - Create: `tests/test_cli.py`

  **Approach:**
  - New top-level command `agentclip whoami`:
    - `--set "Name"` and `--url URL` set the credit.
    - No flags: prints current credit, or "no credit set" if none.
    - `--clear` removes it.
  - Modify `agentclip install-skill`: after writing `SKILL.md`, prompt interactively only when stdin is a TTY: "Optional: credit yourself on clips you create. Name (Enter to skip): " and "URL (Enter to skip): ". Save via `StateStore.set_whoami`. Non-TTY (CI, scripted use): skip the prompt entirely.
  - Modify `slideshow create` flow: if whoami is unset and a `nudge_shown` flag is not in state, print a one-time hint after success: `tip: run "agentclip whoami --set 'Your Name'" to credit clips you make. (this hint shows once)`. Set the flag in state to avoid repetition.

  **Patterns to follow:**
  - Existing Typer command structure in `cli.py`.
  - The `_print()` helper for stdout output.
  - The `_bail()` helper for error exits.
  - TTY detection via `sys.stdin.isatty()` (no new dependency).

  **Test scenarios:**
  - Happy path: `agentclip whoami --set "Eric" --url https://elizes.dev` writes to state and prints confirmation.
  - Happy path: `agentclip whoami` (no args) prints the stored credit.
  - Happy path: `agentclip whoami --clear` removes the credit.
  - Edge case: `install-skill` invoked in non-TTY mode (piped input) skips the interactive prompt cleanly.
  - Edge case: first-create nudge fires once and not on subsequent creates within the same state file.
  - Error path: `--url` with a malformed URL bails before writing state.
  - Integration: `agentclip --help` and `agentclip whoami --help` both surface the new command.

  **Verification:**
  - Manual smoke test: `pip install -e . && agentclip whoami --set "Test" && agentclip whoami` prints "Test".
  - CI tests pass on Python 3.11 / 3.12 / 3.13.
  - All 20+ existing tests still pass.

- [ ] **Unit 7: SKILL.md teaches whoami suggestion (one paragraph, opt-in for the agent)**

  **Goal:** Teach the agent to suggest whoami when the user signals external sharing, not on every clip.

  **Requirements:** R1, R3.

  **Dependencies:** Unit 6.

  **Files:**
  - Modify: `src/agentclip/skill/SKILL.md`

  **Approach:**
  - Add one paragraph in a new short section (e.g., "Crediting the run") near the end of the file, before "Anti-patterns to avoid".
  - Content along the lines of: "If the user mentions sharing the clip externally (a recruiter, a PR, a public Slack), and `agentclip whoami` is unset, suggest they run `agentclip whoami --set 'Your Name' --url URL` so the clip credits them. Do not push it for casual internal QA."
  - Frontmatter description stays unchanged.

  **Test expectation:** none, this is a prose change in a markdown file with no behavioral effect on the package.

  **Verification:**
  - Hard-rule sweep: no em dashes added, no model or vendor names introduced.
  - SKILL.md still under any reasonable install-skill copy budget.

- [ ] **Unit 8: README polish — hero asset and clear demo URL**

  **Goal:** Replace the placeholder demo line with a real hero GIF or screenshot of the viewer plus a working live-demo URL.

  **Requirements:** R4.

  **Dependencies:** Unit 4 (live `agentclip.dev` with seeded gallery so the demo URL resolves and the asset has real content to capture).

  **Files:**
  - Create: `docs/assets/hero.gif` or `docs/assets/hero.png`
  - Modify: `README.md`

  **Approach:**
  - Capture a 6-8 second screencast or static image of the viewer page on `agentclip.dev`, showing hero, summary card, and one or two clips. Convert to GIF under 2MB or use a static PNG if motion adds nothing.
  - Place under hero in `README.md`: `![AgentClip clip viewer](docs/assets/hero.gif)`.
  - Replace the placeholder live-demo URL with a real seeded clip URL.
  - Move the badges below the hero asset, not above; visual lands first, ground-truth signals second.

  **Test expectation:** none, docs-only change.

  **Verification:**
  - GitHub renders the hero asset above the fold on the repo home page.
  - PyPI listing renders the same image after the v0.1.0 release.

### Phase B: Launch ritual

- [ ] **Unit 9: Pre-push commit-log review, then push and tag v0.1.0**

  **Goal:** Final check that the log tells the right story; push to GitHub; tag triggers PyPI publish.

  **Requirements:** R2, R3, R4.

  **Dependencies:** Units 1 through 8.

  **Files:**
  - Modify: `agentclip/CHANGELOG.md` (promote `[Unreleased]` to `[0.1.0]` with the date and add the whoami feature line)

  **Approach:**
  - `git log --oneline` review on both repos. Confirm no commits look out of order, batched, or undercooked. Expected total: roughly 18 to 19 commits per repo at this point.
  - One final commit on the package: `docs: prep CHANGELOG for v0.1.0 release` — promotes the unreleased section.
  - Run final test pass on both repos. All green required.
  - Push: `gh repo create ericelizes/agentclip --public --source=. --push` for the package; `gh repo create ericelizes/agentclip-app --public --source=. --push` for the backend.
  - One-time PyPI Trusted Publisher setup on pypi.org per `release.yml` comments.
  - Tag: `git tag v0.1.0 && git push --tags` on `agentclip` triggers the release workflow, which publishes to PyPI and creates a GitHub release with auto-generated notes.
  - Set repo topics on GitHub: `mcp`, `model-context-protocol`, `mcp-server`, `claude`, `agents`, `python`, `qa`, `browser-automation`.

  **Test expectation:** none, this is the operational ritual. The "test" is whether the cumulative log reads well to a stranger.

  **Verification:**
  - PyPI shows `agentclip` v0.1.0 with the README hero rendered.
  - GitHub Releases shows v0.1.0 with auto-generated release notes.
  - CI badge in README resolves to a green build.
  - An independent contributor can `pip install agentclip` and run the 60-second example from the README against `agentclip.dev` successfully.
  - Final `git log --oneline | head -20` on both repos reads as a textbook progression to a stranger.

## System-Wide Impact

- **Interaction graph:** `created_by` flows from CLI → SDK → backend serializer → model → viewer template. Six layers; failure at any seam surfaces as a missing credit, not a broken page. Each unit covers its own seam.
- **Error propagation:** Bad `created_by_url` values must reject at the API boundary (400), not silently render broken `<a>` tags. Unit 1 covers this.
- **State lifecycle risks:** Whoami state in `~/.agentclip/state.json` inherits the existing atomic-write protection. No new failure modes.
- **API surface parity:** The MCP `slideshow_create` tool gets the same auto-application as the CLI because both wrap the same `AgentClipClient.create_slideshow`. Unit 5 ensures parity by injecting at the SDK layer, not at the CLI layer.
- **Integration coverage:** Unit 1's "viewer renders Filed by line correctly" tests are the cross-layer integration check that ensures `created_by` survives the serializer → template handoff.
- **Unchanged invariants:** The four MCP tool names, the four API endpoints, and the wire shapes of `slideshow_create` / `add_slide` / `update_slide` / `set_summary` all stay identical. Adding optional `created_by` and `created_by_url` is purely additive; existing consumers (the SDK's own integration tests, verified end-to-end through the cloudflared tunnel earlier today) continue to work unchanged.

## Risks & Dependencies

| Risk | Mitigation |
|---|---|
| The qagent → agentclip rename commits look weird to a stranger reading the log. | Keep them. They look like *real* iteration. The alternative (rebase to hide) breaks the "atomic commits ARE the signal" rule and rewrites mentally consistent history. |
| Tagging v0.1.0 before `agentclip.dev` is live means the README's "Live demo" link 404s for early visitors. | Sequence: deploy DO (Unit 4), seed gallery (Unit 3 + DO command run), push README polish (Unit 8), THEN tag (Unit 9). Each step has a real artifact before the next. |
| PyPI Trusted Publisher setup is one-time and fiddly. First tag may fail. | Documented fallback: if first publish fails, use a manual `uv build && uv publish` with a one-time scoped token. Fix the trusted-publisher config in a follow-up `chore(release)` commit. |
| `0001_initial` migration regenerated again, third time. Pre-launch migration churn looks messy in the log. | Acceptable: pre-launch, no production data, one clean migration is the right end state. The commit message must explicitly call out "no production data exists yet" so a reader does not think we are papering over a real migration mistake. If the DO deploy has happened by the time Unit 1 lands, stack a new migration instead. |
| Hero asset choice may take iterations to look right. | Plan for two attempts in Unit 8. If the GIF feels gimmicky after one round, fall back to a static PNG of the viewer; less impressive but never embarrassing. |
| The agent suggests whoami too aggressively from Unit 7's SKILL update. | Unit 7's prose is intentionally one paragraph and conditional. If user reports indicate the agent is over-suggesting after launch, tighten in a follow-up `docs(skill): de-emphasize whoami suggestion` commit. |

## Documentation / Operational Notes

- After Unit 4 deploy, also set: `CSRF_TRUSTED_ORIGINS` for `https://agentclip.dev`, `DJANGO_SECURE_HSTS_SECONDS=31536000`, verify Spaces public-read ACL on a sample upload.
- After Unit 9 tag, submit `awesome-mcp-servers` PR with the format from the OSS-launch research digest. PR title: `Add agentclip 🤖🤖🤖`, body links to the live demo URL.
- After PyPI listing is live, verify the project description renders the hero image and tools table correctly (PyPI markdown rendering has caveats).
- Consider a `chore(release): set up PyPI Trusted Publisher` commit if the first tag's publish requires fallback steps; documenting the workaround keeps the log honest.

## Sources & References

- Origin: this conversation. There is no upstream `ce-brainstorm` requirements document; planning bootstrap captured intent inline.
- Existing commit logs (the bar the new commits must meet):
  - `agentclip` (13 commits, ~18 after this plan executes)
  - `agentclip-app` (14 commits, ~18 after this plan executes)
- Related code: `agentclip/src/agentclip/state.py`, `agentclip-app/slideshows/models.py`, `agentclip-app/slideshows/templates/slideshows/viewer.html`, `agentclip/.github/workflows/release.yml`.
- External: [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/), [PyPI Trusted Publishers](https://docs.pypi.org/trusted-publishers/), [punkpeye/awesome-mcp-servers CONTRIBUTING](https://github.com/punkpeye/awesome-mcp-servers/blob/main/CONTRIBUTING.md).
- Earlier research artifact in this session: "OSS launch best practices for Python MCP tools" digest, returned by `ce-best-practices-researcher` and applied across the existing CI / release / hygiene commits.
