# Contributing to AgentClip Backend

This repo holds the Django backend that powers `agentclip.dev` and the public viewer at `/s/<share_token>/`. It's the sister of [`ericelizes1/agentclip`](https://github.com/ericelizes1/agentclip) (the Python package + MCP server).

## What kind of contributions are welcome

- **Bug fixes** to the API, viewer, or admin.
- **Viewer / landing-page improvements.** Especially mobile polish.
- **Performance.** N+1 queries, slow-rendering big slideshows, etc.
- **Tests.** Coverage gaps in `slideshows/tests.py`, especially edge cases on the auth path.
- **Deployment recipes.** Beyond DigitalOcean App Platform: Fly, Render, Railway.

## What's out of scope (for now)

- **Account systems.** v1 is intentionally accountless; the `write_token` is the credential.
- **New auth schemes.** Bearer write_token is the contract the SDK depends on; changes here ripple.
- **Storage backends beyond DO Spaces** without a strong reason. Spaces is the pinned default.

## Dev setup

```bash
git clone https://github.com/ericelizes1/agentclip
cd agentclip/api

python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
DJANGO_DEBUG=true python manage.py migrate
DJANGO_DEBUG=true python manage.py createsuperuser
DJANGO_DEBUG=true python manage.py runserver
```

Tests:

```bash
DJANGO_DEBUG=true python manage.py test slideshows
```

Lint:

```bash
pip install ruff
ruff check .
```

## How to propose a change

1. **Open an issue first** for non-trivial changes.
2. **Branch off `main`.** Atomic commits, conventional prefixes.
3. **Migrations:** if you add or alter models, generate the migration in the same commit. Note any data backfill required in the PR description.
4. **Wire shapes are load-bearing.** The `agentclip` package's tests assert on the API response shapes. If you change a response, update the package's tests in the same PR (link the package PR).
5. **Mobile-first.** Templates default to a mobile viewport. Verify at 390x844 (iPhone class) before assuming a layout works.

## Hard rules for user-facing copy

These are project conventions; the reviewer holds the line:

- **No em dashes** in user-facing copy.
- **No model or vendor names** ("Claude" / "GPT" / etc.) in marketing copy.
- **Founders / operators / engineers** is the audience phrasing.
- **Honest claims.** No invented stars, users, or production deployments.

## License

By contributing, you agree your contribution is licensed under the [MIT License](LICENSE).
