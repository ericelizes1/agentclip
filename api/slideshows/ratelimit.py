'''Trusted-proxy-aware client IP resolution for rate limiting + forensics.

Behind Cloudflare in front of Fly.io the inbound TCP connection comes
from Cloudflare's edge. `request.META['REMOTE_ADDR']` would be that
edge IP — meaning all traffic looks like it's from one of ~300 IPs
and django-ratelimit's default `key='ip'` becomes ~useless.

This module returns the real client IP using a strict trust hierarchy:

1. **`CF-Connecting-IP`** — set by Cloudflare's edge on every proxied
   request. Cloudflare strips and replaces this header on incoming
   traffic, so a client cannot forge it (the only way to is to bypass
   Cloudflare entirely, in which case the header is absent and we
   fall through).

2. **`X-Forwarded-For` first entry** — set by upstream load balancers
   like Fly's edge or cloudflared dev tunnels. Trusted only because
   we know the deploy puts a controlled proxy in front of Django.

3. **`REMOTE_ADDR`** — the inbound connection's source IP. Used in
   local dev when nothing's in front of `runserver`.

Both the rate-limit key function and the forensics helper consume
the same logic so the abuse-counter and the audit-log agree.
'''

from __future__ import annotations


def client_ip(request) -> str:
    '''Resolve the real client IP, honoring Cloudflare + load-balancer headers.

    Returns an empty string when nothing is determinable, which
    django-ratelimit treats as a single shared bucket — the same
    failure mode as `REMOTE_ADDR` being absent in tests.
    '''
    cf_ip = request.META.get('HTTP_CF_CONNECTING_IP')
    if cf_ip:
        return cf_ip.strip()
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if forwarded:
        # X-Forwarded-For is a comma-separated chain; the FIRST entry
        # is the original client. Subsequent entries are intermediate
        # proxies (cloudflared, Fly, etc.). The chain order is
        # client → proxy_1 → proxy_2 → us.
        return forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '') or ''


def client_ip_key(group, request) -> str:  # noqa: ARG001 — django-ratelimit API
    '''Custom key function for `@ratelimit(key='slideshows.ratelimit.client_ip_key')`.

    django-ratelimit calls this with `(group, request)` and uses the
    return value as the per-IP cache key suffix. We delegate to
    `client_ip` so any changes to the trust hierarchy flow through
    in one place.
    '''
    return client_ip(request)
