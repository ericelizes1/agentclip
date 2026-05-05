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

- The hosted service at `agentclip.dev`
- The Django app, its API endpoints, the public viewer, and the admin
- The Bearer write_token auth path
- Object-storage URL exposure and access controls

## What's out of scope (handle via the appropriate upstream)

- Vulnerabilities in pinned dependencies (Django, DRF, django-storages, boto3) — report to those projects directly
- Issues in the Python package consuming this backend — see [`agentclip/SECURITY.md`](https://github.com/ericelizes/agentclip/blob/main/SECURITY.md)
- Vulnerabilities in DigitalOcean infrastructure — report to DigitalOcean

## Disclosure history

None yet.
