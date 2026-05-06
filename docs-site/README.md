# docs-site

Mintlify v2 source for [docs.agentclip.dev](https://docs.agentclip.dev).

## Local preview

Install the Mintlify CLI once:

```bash
npm i -g mintlify
```

Then from this directory:

```bash
mintlify dev
```

Open <http://localhost:3000>.

## Files

| File | Purpose |
|---|---|
| `docs.json` | Mintlify v2 config — theme, navigation, OpenAPI tab |
| `index.mdx` | Landing page |
| `quickstart.mdx` | Install + 60-second example |
| `mcp-setup.mdx` | Claude Desktop / Cursor / Claude Code wiring |
| `cli.mdx` | Subcommand reference |
| `self-hosting.mdx` | Fly.io + Neon + R2 deploy guide |
| `troubleshooting.mdx` | Common issues |

## API reference tab

The API reference tab in `docs.json` points at the live OpenAPI 3 schema:

```
https://api.agentclip.dev/api/schema/
```

When the deployed API regenerates the schema (any time a serializer changes and CI runs `python manage.py spectacular --file ...`), the docs site picks up the new contract on the next page load.

## Deploy

Connect this directory to Mintlify Cloud via [dashboard.mintlify.com](https://dashboard.mintlify.com):

1. Add the GitHub repo.
2. Set the docs root to `docs-site/`.
3. Add the custom domain `docs.agentclip.dev` and follow Mintlify's CNAME instructions.

Each push to `main` triggers a fresh build.

## Theme

Mintlify's `mint` preset, recolored to AgentClip's vermillion palette via the `colors` block in `docs.json`:

- Primary `#d94824` (vermillion-500)
- Light `#f08a6a` (vermillion-300)
- Dark `#93281b` (vermillion-700)

These match `web/lib/tokens.ts` so the docs site reads as visually continuous with `agentclip.dev`.
