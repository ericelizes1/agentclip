/**
 * Typed AgentClip API client.
 *
 * Wraps `openapi-fetch` with the generated `paths` types so every
 * request/response shape is enforced at compile time. A wrong field
 * name (`titel` instead of `title`) is a TS error, not a runtime
 * 400. Drift between the Django serializer and the web's expected
 * shape is caught the next time `pnpm gen:api` regenerates the
 * snapshot — `pnpm type:check` then fails until both sides agree.
 *
 * Base URL resolution:
 *   1. `process.env.AGENTCLIP_API_URL` (server-side rendering, CI)
 *   2. `process.env.NEXT_PUBLIC_AGENTCLIP_API_URL` (browser bundles)
 *   3. `https://api.agentclip.dev` as the prod default
 *
 * Production split: the web frontend lives on `agentclip.dev`; the
 * API lives on `api.agentclip.dev`. Each is its own Fly.io app, so
 * the subdomain split happens at DNS, not in a path-routing proxy.
 *
 * The Django service is API-only after the monorepo pivot; the web
 * client owns the HTML and calls this module for every read or write.
 */

import createFetchClient from 'openapi-fetch'

import type { paths } from './api-types'

export const DEFAULT_API_URL = 'https://api.agentclip.dev'

export function resolveApiUrl(): string {
  if (typeof process !== 'undefined') {
    const server = process.env.AGENTCLIP_API_URL
    if (server) return server
    const browser = process.env.NEXT_PUBLIC_AGENTCLIP_API_URL
    if (browser) return browser
  }
  return DEFAULT_API_URL
}

export function createApiClient(baseUrl: string = resolveApiUrl()) {
  return createFetchClient<paths>({ baseUrl })
}

export const api = createApiClient()

export type ApiClient = ReturnType<typeof createApiClient>
