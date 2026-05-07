# Playbook: Narrate a clip end-to-end

Add narration audio to a slideshow and surface the narrated walkthrough on
agentclip.dev. Roughly 5 minutes per clip; ~$0.01 of OpenAI API spend per
4-slide clip at HD voice quality.

This is the operator runbook for the `narrate` Django management command
shipped in [`docs/plans/2026-05-07-001-feat-openai-tts-narration-plan.md`](../plans/2026-05-07-001-feat-openai-tts-narration-plan.md).

## Prerequisites

- The agentclip-api Fly app is deployed and healthy.
- You have a slideshow's `share_token` in hand (the token after `/s/` in
  the URL — e.g. `KS2o_HOutMbcpBWg`).
- An OpenAI API key with TTS access.

## One-time: confirm OPENAI_API_KEY is set on the API

```bash
fly secrets list -a agentclip-api | grep OPENAI
```

If the secret is missing, add it:

```bash
fly secrets set OPENAI_API_KEY=sk-... -a agentclip-api
```

`fly secrets set` triggers a rolling deploy. Wait ~30s for the new machine
to come up before running `narrate`.

## Generate narration

SSH into the running API machine:

```bash
fly ssh console -a agentclip-api
```

You're now root inside the container. Run the narrate command:

```bash
python manage.py narrate <share_token>
```

Expected output (4-slide clip, ~$0.006 total):

```
narrating slideshow 'Skip the screencast.' (4 slides, voice=nova, force=False, dry_run=False)
  slide 01: narrated (148 chars, $0.0044, voice=nova)
  slide 02: narrated (132 chars, $0.0040, voice=nova)
  slide 03: narrated (96 chars, $0.0029, voice=nova)
  slide 04: narrated (174 chars, $0.0052, voice=nova)

narrated: 4 of 4 slides (0 skipped, 550 chars, $0.0165 total)
```

Each slide's MP3 is uploaded to the same R2 bucket as the slide images,
under `slideshows/<slideshow_uuid>/audio/<position>.mp3`.

## Verify

Visit `https://agentclip.dev/s/<share_token>`. The page should now render
the `VideoClipPlayer` instead of the silent stacked layout — vermillion
play button centered on the slide, scrubber at the bottom, mute toggle in
the meta row. Click play; the agent narrates each slide; the player
auto-advances on audio end.

If you instead see the silent stacked `<ol>`, one of the slides is missing
audio. Check that the `narrate` command finished cleanly and re-run it.

## Surface the narrated clip on the home page

The home-page hero polaroid uses the `is_hero` flag on the slideshow
record. Open Django admin (`https://agentclip-api.fly.dev/admin/`),
navigate to the slideshow, and toggle `is_hero=True`. The home page picks
it up on the next ISR rebuild (≤60 seconds; revalidate is configured in
`web/app/(home)/page.tsx`).

## Re-narrate an existing clip

By default, `narrate` skips slides that already have audio:

```bash
python manage.py narrate <share_token>
  slide 01: skip (already narrated)
  slide 02: skip (already narrated)
  ...
```

To regenerate everything (after a caption edit, or a voice change), pass
`--force`:

```bash
python manage.py narrate <share_token> --force
```

This re-uploads MP3s under the same deterministic filenames; the old files
are replaced or suffixed by django-storages depending on the backend's
overwrite setting.

## Other flags

- `--voice <voice>` — pick from OpenAI's stock voices: `alloy`, `echo`,
  `fable`, `onyx`, `nova` (default), `shimmer`. The chosen voice is
  recorded on each slide row's `audio_voice` column.
- `--dry-run` — print the planned per-slide character count and estimated
  cost without calling OpenAI or writing to the database. Useful for
  pre-flighting a long slideshow before paying for it.

## Common issues

**`OPENAI_API_KEY is not set`**: the API container doesn't have the
secret. Run `fly secrets set OPENAI_API_KEY=...` from your local shell.

**`slideshow not found for share_token 'xxx'`**: the token is wrong, or the
slideshow doesn't exist on this database. Confirm by visiting the public
viewer URL.

**A slide stays silent on the frontend after narration**: the `audio_url`
field is null on the API response. Re-run `narrate <token> --force`. If
the issue persists, check the slide's `audio` field directly in Django
admin — if it's empty, the upload to R2 failed (check the `narrate` run's
output for stderr).

**Cost looks higher than expected**: `--dry-run` first to preview. The
TTS-1-HD price is $0.030 per 1K characters (May 2026). A typical 4-slide
walkthrough at ~50 chars/slide is $0.006. If a single run reports more
than $0.10, the slideshow's captions are unusually long — operators may
want to ask the agent to write tighter captions.

## Reference

- Service module: [`api/slideshows/narration.py`](../../api/slideshows/narration.py)
- Management command: [`api/slideshows/management/commands/narrate.py`](../../api/slideshows/management/commands/narrate.py)
- Player: [`web/components/patterns/VideoClipPlayer/VideoClipPlayer.tsx`](../../web/components/patterns/VideoClipPlayer/VideoClipPlayer.tsx)
- Plan: [`docs/plans/2026-05-07-001-feat-openai-tts-narration-plan.md`](../plans/2026-05-07-001-feat-openai-tts-narration-plan.md)
