# Playbook: Narrate a clip end-to-end

Add narration audio to a slideshow and surface the narrated walkthrough on
agentclip.dev. Two interfaces, one engine:

- **API endpoint** (recommended) — `POST /api/v1/slideshow/<share_token>/narrate/`
  with `Authorization: Bearer <write_token>`. The agentclip CLI wraps this.
- **Django management command** (operator fallback) — `python manage.py
  narrate <share_token>` from inside the API container, for cases where the
  write_token isn't available.

Roughly 5 minutes per clip; ~$0.01 of OpenAI spend per 4-slide walkthrough.

## Prerequisites

- The agentclip-api Fly app is deployed and healthy.
- `OPENAI_API_KEY` is set in `fly secrets list -a agentclip-api`.
- You have either the slideshow's `write_token` (API path) or operator
  shell access (management command path).

## Path A: agentclip CLI / curl (recommended)

If you've just uploaded a slideshow with the `agentclip` CLI, you have the
write_token in hand. Make one more API call:

```bash
curl -X POST https://api.agentclip.dev/api/v1/slideshow/<share_token>/narrate/ \
  -H "Authorization: Bearer <write_token>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Optional flags in the body:

```json
{
  "voice": "nova",     // alloy | echo | fable | onyx | nova | shimmer
  "force": false,      // re-narrate slides that already have audio
  "dry_run": false     // estimate cost without calling OpenAI
}
```

Response (200) is the full public slideshow shape with `audio_url`
populated on each narrated slide, plus a `narration` block summarizing
the run:

```json
{
  "id": "...",
  "title": "Skip the screencast.",
  "slides": [
    { "position": 1, "audio_url": "https://cdn.agentclip.dev/...mp3", ... }
  ],
  "narration": {
    "narrated": 4,
    "skipped": 0,
    "total_chars": 550,
    "total_cost_usd": "0.0165",
    "dry_run": false,
    "outcomes": [
      { "position": 1, "status": "narrated", "chars": 148, "cost_usd": "0.0044", "voice": "nova" },
      ...
    ]
  }
}
```

Failure modes:
- `401` — missing or wrong write_token.
- `404` — share_token doesn't exist.
- `400` — slideshow has no slides yet.
- `503` — `OPENAI_API_KEY` is not configured on the API. Operator fix.

## Path B: Django management command (operator fallback)

When the write_token isn't available (e.g., backfilling narration on a
clip whose owner lost their token), run the command directly inside the
container:

```bash
fly ssh console -a agentclip-api
python manage.py narrate <share_token>
```

Same flags as the API: `--force`, `--voice <voice>`, `--dry-run`. Output
matches the API response's `narration` block, formatted for terminals:

```
narrating slideshow 'Skip the screencast.' (4 slides, voice=nova, force=False, dry_run=False)
  slide 01: narrated (148 chars, $0.0044, voice=nova)
  slide 02: narrated (132 chars, $0.0040, voice=nova)
  slide 03: narrated (96 chars, $0.0029, voice=nova)
  slide 04: narrated (174 chars, $0.0052, voice=nova)

narrated: 4 of 4 slides (0 skipped, 550 chars, $0.0165 total)
```

## Verify

Visit `https://agentclip.dev/s/<share_token>`. The page should now render
the `VideoClipPlayer` instead of the silent stacked layout — vermillion
play button centered on the slide, scrubber at the bottom, mute toggle in
the meta row. Click play; the agent narrates each slide; the player
auto-advances on audio end.

## Surface the narrated clip on the home page

The home-page hero polaroid uses the `is_hero` flag on the slideshow
record. Open Django admin (`https://agentclip-api.fly.dev/admin/`),
navigate to the slideshow, and toggle `is_hero=True`. The home page picks
it up on the next ISR rebuild (≤60 seconds; revalidate is configured in
`web/app/(home)/page.tsx`).

## Common issues

**`OPENAI_API_KEY is not set` (503)** — the API container doesn't have the
secret. Run `fly secrets set OPENAI_API_KEY=sk-... -a agentclip-api`. Note
that the secret update triggers a rolling deploy; wait ~30s before
retrying.

**A slide stays silent on the frontend after narration** — the
`audio_url` field is null on the API response. Re-call narrate with
`force=true`. If the issue persists, inspect the slide's `audio` field in
Django admin — if it's empty, the upload to R2 failed; check the API's
Fly logs for the failed request.

**Cost looks higher than expected** — call with `dry_run=true` first. The
TTS-1-HD price is $0.030 per 1K characters (May 2026). A typical 4-slide
walkthrough at ~50 chars/slide is $0.006. If a single run reports more
than $0.10, the captions are unusually long.

**Rate limit (429)** — the endpoint is rate-limited at 30 calls per IP
per hour. Plenty for normal use; the agentclip CLI calls it once per
upload. If you're hitting the limit by accident, wait an hour or use the
management-command fallback.

## Reference

- API endpoint: [`api/slideshows/views.py`](../../api/slideshows/views.py)
  (`slideshow_narrate`)
- Service module: [`api/slideshows/narration.py`](../../api/slideshows/narration.py)
- Management command: [`api/slideshows/management/commands/narrate.py`](../../api/slideshows/management/commands/narrate.py)
- Player: [`web/components/patterns/VideoClipPlayer/VideoClipPlayer.tsx`](../../web/components/patterns/VideoClipPlayer/VideoClipPlayer.tsx)
- Plan: [`docs/plans/2026-05-07-001-feat-openai-tts-narration-plan.md`](../plans/2026-05-07-001-feat-openai-tts-narration-plan.md)
