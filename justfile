default:
    @just --list

# --- Dev ---

# Django dev server on :8000
api-dev:
    cd api && uv run python manage.py runserver

# Next.js dev server on :3000
web-dev:
    cd web && pnpm dev

# Apply DB migrations
migrate:
    cd api && uv run python manage.py migrate

# --- Tests ---

test: test-api test-web

test-api:
    cd api && DJANGO_DEBUG=true uv run python manage.py test

test-web:
    cd web && pnpm test

# --- Codegen ---

# Regen web/lib/api-types.ts from Django OpenAPI
gen-types:
    cd api && uv run python manage.py spectacular --file ../web/lib/api-schema.json
    cd web && pnpm gen:api

# --- Deploy / ops ---

deploy-api:
    fly deploy --app agentclip-api -c api/fly.toml

deploy-web:
    fly deploy --app agentclip-web -c web/fly.toml

logs-api:
    fly logs --app agentclip-api

logs-web:
    fly logs --app agentclip-web

ssh-api:
    fly ssh console --app agentclip-api

# --- Release ---

# Tag the platform repo. SDK release lives in /home/eric/code/agentclip.
# Usage: just release 0.1.1   (omit the leading v)
release version:
    @grep -q "## \[{{version}}\]" CHANGELOG.md || (echo "Add a [{{version}}] entry to CHANGELOG.md first" && exit 1)
    @git diff --quiet || (echo "Working tree dirty — commit first" && exit 1)
    git tag v{{version}}
    git push origin main --tags
    gh release create v{{version}} --generate-notes
