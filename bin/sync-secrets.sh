#!/usr/bin/env bash
#
# Sync Fly.io secrets from 1Password.
#
# Reads bin/.env.<app>.template (which contains op://... references),
# resolves the references via the 1Password CLI (`op`), pipes the
# resolved KEY=value lines into `fly secrets import`. The plain-text
# secrets exist only in memory for the duration of the command — they
# never touch disk and never enter git.
#
# Usage:   bin/sync-secrets.sh <api|web>
# Example: bin/sync-secrets.sh api
#
# Prereqs:
# - 1Password CLI signed in: `eval $(op signin)` (or biometric unlock)
# - flyctl signed in:        `fly auth login`
# - The Fly app exists:      `fly apps create agentclip-<api|web>` once
#
# To rotate a single secret without re-syncing everything:
#   op read 'op://Personal/agentclip/DJANGO_SECRET_KEY' \
#     | fly secrets set --app agentclip-api --stage DJANGO_SECRET_KEY=-
#   fly secrets deploy --app agentclip-api

set -euo pipefail

APP="${1:-}"
case "$APP" in
  api|web) ;;
  *) echo "usage: $0 <api|web>" >&2; exit 64;;
esac

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TEMPLATE="$ROOT/bin/.env.$APP.template"
FLY_APP="agentclip-$APP"

if [[ ! -f "$TEMPLATE" ]]; then
  echo "missing template: $TEMPLATE" >&2
  exit 1
fi

if ! command -v op >/dev/null 2>&1; then
  echo "1Password CLI ('op') not found on PATH" >&2
  exit 1
fi
if ! command -v fly >/dev/null 2>&1; then
  echo "flyctl ('fly') not found on PATH" >&2
  exit 1
fi

# `op inject` resolves op:// references inline. The output is fed
# straight to `fly secrets import`, which accepts KEY=value lines on
# stdin. Comments and blank lines are preserved by op inject and
# correctly skipped by fly.
echo "› resolving 1Password references for $FLY_APP..."
op inject --in-file "$TEMPLATE" \
  | fly secrets import --app "$FLY_APP" --stage

echo "› staged. deploying secrets..."
fly secrets deploy --app "$FLY_APP"

echo "✓ $FLY_APP secrets synced."
