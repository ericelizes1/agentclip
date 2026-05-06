# Security Policy

## Supported versions

This is the live backend behind `agentclip.dev`. The only supported version is the deployed one.

## Reporting a vulnerability

**Please do not open a public GitHub issue for security bugs.**

Email <eric@elizes.dev> with:

- A description of the issue and the impact
- Steps to reproduce, ideally a minimal repro
- The URL or endpoint where you observed the issue
- Whether you'd like to be credited in the advisory

You'll get an acknowledgement within 72 hours. Coordinated disclosure timelines are negotiable but default to 30 days from confirmation. We'll roll a fix and disclose under the agreed timeline.

## What's in scope

- The hosted service at `agentclip.dev` and `api.agentclip.dev`
- The Django API endpoints + admin
- The Next.js frontend (XSS, dependency vulns surfaced through the web bundle)
- The Bearer `write_token` auth path
- The `edit_token` recovery + rotation endpoints
- Object-storage URL exposure and access controls

## What's out of scope (handle via the appropriate upstream)

- Vulnerabilities in pinned dependencies (Django, DRF, Next.js, django-storages, boto3, etc.) — report to those projects directly
- Issues in the Python package consuming this backend — see [`agentclip-python/SECURITY.md`](https://github.com/ericelizes1/agentclip-python/blob/main/SECURITY.md)
- Vulnerabilities in Fly.io / Neon / Cloudflare infrastructure — report to those vendors directly

## Disclosure history

None yet.
