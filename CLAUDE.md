# Claude / Codex / coding-agent instructions for `agentclip`

This is the platform monorepo behind <https://agentclip.dev>:

- `api/` — Django 6 + DRF, Postgres (Neon in prod, sqlite locally), Cloudflare R2 for media
- `web/` — Next.js 15 (App Router), React 19, TypeScript 5 strict, Tailwind 4
- Hosting: Fly.io (`agentclip-api` and `agentclip-web`); auto-deploys on push to `main`

The Python SDK / CLI / MCP server lives in the sister repo: <https://github.com/ericelizes1/agentclip-python>.

## Dogfooding agentclip from inside this repo

Working on the gallery, hero, render pipeline, or anything user-visible? Capturing a real clip is the fastest way to verify the whole loop works end-to-end. To do that from your session:

1. **Install the SDK locally** (one-time):
   ```
   pip install agentclip[browser]
   ```
   The `[browser]` extra adds Playwright for viewport-only screenshots — required (see "Never use OS screen capture" below).

2. **Restart your session** so the bundled skill loads. The skill lands at `~/.claude/skills/agentclip/SKILL.md` after install. Until you restart, it's invisible.

3. **Verify**:
   ```
   agentclip --version
   agentclip whoami
   ```

4. **Point at the live API** (default) or your local one:
   - Live: nothing to set; defaults to `https://api.agentclip.dev`
   - Local: `export AGENTCLIP_API_URL=http://localhost:8000` after `docker compose up`

## Creating a clip from this session

```
agentclip slideshow create --type walkthrough --title "..." -d "..."
agentclip slideshow add <slideshow_id> /tmp/01.png --caption "..."
agentclip slideshow summary <slideshow_id> "..."
```

The full skill rules are in the sister repo's `src/agentclip/skill/SKILL.md` — don't skip them. Captions read aloud as TTS; bad captions become bad audio.

## Featuring a clip in the home gallery

```
agentclip gallery add <share_token> -p 0    # position 0 = home-page hero
```

Requires `AGENTCLIP_ADMIN_TOKEN`. The token is in 1Password under `op://Personal/agentclip/AGENTCLIP_ADMIN_TOKEN`. Cache it once with:

```
agentclip auth login   # paste the token
```

If you don't have access to the admin token, ask the user. **Don't try to PATCH the slideshow's `is_hero` field via the write_token** — that field is admin-only.

## Never use OS screen capture

When recording clips, do **not** use `screencapture` (macOS), `scrot`, `gnome-screenshot`, or any OS-level capture. They include the IDE window, terminal panes showing the user's chat with you, system notifications, and any other open windows — all of which leak to a public URL when the clip ships. This is a privacy bug, not a stylistic one.

Use viewport-only capture only:
- `agentclip[browser]` (Playwright with controlled viewport)
- A browser MCP tool (Chrome / Playwright / Puppeteer)
- Your own scripted Playwright/Puppeteer

See `agentclip-python/src/agentclip/skill/SKILL.md` "Browser tooling" section for the full method-priority list and the recipe for getting MCP screenshots to disk.

## Local development

```
docker compose up --build
# Web:    http://localhost:3000
# API:    http://localhost:8000/api/schema/swagger-ui/
# Admin:  http://localhost:8000/admin/
```

Or natively: see `README.md` for the per-service setup.

## Tests

```
# API (Django)
cd api && DJANGO_DEBUG=true python manage.py test

# Web (Vitest + Testing Library)
cd web && pnpm test

# Web type check
cd web && pnpm type:check

# Web lint
cd web && pnpm lint
```

CI runs all of these on every PR.

## Run-type vocabulary — keep in sync with the SDK

The Django `RunType` enum at `api/slideshows/models.py` and the agentclip-python skill must agree. Current values: **`walkthrough`**, **`guide`**, **`bug`**.

If you change the enum here:

1. Update `api/slideshows/models.py` and `api/slideshows/narration.py` (voice mapping)
2. Add a Django data migration that maps existing rows forward (see `api/slideshows/migrations/0011_slideshow_runtype_consolidate.py` for the pattern)
3. Update tests in `api/slideshows/test_runtype.py` and `api/slideshows/test_narration_bookends.py`
4. Regenerate web types: from `api/`, `python manage.py spectacular --format openapi-json --file ../web/lib/api-schema.json`; then from `web/`, `pnpm gen:api`
5. Coordinate the SKILL.md update in the sister repo — without it, agents will keep writing the old vocabulary

Ship the API change first (ideally accepting both old and new during a transition), then the SKILL.md change. Otherwise agents tell the API to use values it rejects.

## API contract reference

| Method | Path | Auth |
|---|---|---|
| POST | `/api/slideshow/` | none |
| POST | `/api/slideshow/<id>/slides/` | write_token |
| PATCH | `/api/slideshow/<id>/` | write_token |
| DELETE | `/api/slideshow/<id>/` | write_token |
| GET | `/api/v1/gallery/` | none |
| GET | `/api/v1/slideshow/<share_token>/` | none |

Full spec lives in `web/lib/api-schema.json`. The Python SDK in the sister repo asserts on the wire shapes — if you change a response, link the matching SDK PR.

## Deploy

`main` auto-deploys via GitHub Actions. To deploy manually:

```
cd api && fly deploy
cd web && fly deploy
```

The Django Dockerfile runs `manage.py migrate` on every container start, so schema changes ship with the next deploy.
