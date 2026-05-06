import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { createApiClient, resolveApiUrl, DEFAULT_API_URL } from './api'

describe('resolveApiUrl', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    delete process.env.AGENTCLIP_API_URL
    delete process.env.NEXT_PUBLIC_AGENTCLIP_API_URL
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('falls back to the production default when no env vars are set', () => {
    expect(resolveApiUrl()).toBe(DEFAULT_API_URL)
  })

  it('prefers AGENTCLIP_API_URL over the public variant', () => {
    process.env.AGENTCLIP_API_URL = 'https://srv.test'
    process.env.NEXT_PUBLIC_AGENTCLIP_API_URL = 'https://browser.test'
    expect(resolveApiUrl()).toBe('https://srv.test')
  })

  it('falls back to NEXT_PUBLIC_AGENTCLIP_API_URL when only it is set', () => {
    process.env.NEXT_PUBLIC_AGENTCLIP_API_URL = 'https://browser.test'
    expect(resolveApiUrl()).toBe('https://browser.test')
  })
})

describe('createApiClient', () => {
  it('serializes a slideshow create body matching the SlideshowCreateSerializer shape', async () => {
    // Capture the outgoing fetch so we can assert the typed client
    // sends what the Django serializer expects (snake_case keys
    // 'title', 'description', 'created_by', 'created_by_url').
    const sent: { url: string; method: string; body: string } = {
      url: '',
      method: '',
      body: '',
    }
    const fetchSpy = vi.fn(async (input: Request | string | URL) => {
      const req = input instanceof Request ? input : new Request(String(input))
      sent.url = req.url
      sent.method = req.method
      sent.body = await req.text()
      return new Response(
        JSON.stringify({
          id: 'a4d5e1ce-ff43-46f8-93dd-2b4b53b13a40',
          title: 'demo',
          description: '',
          created_by: '',
          created_by_url: '',
          share_url: 'https://api.agentclip.dev/s/abc/',
          edit_url: 'https://api.agentclip.dev/s/abc/edit?t=xyz',
          write_token: 'wt_test',
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } },
      )
    })

    const client = createApiClient('https://api.test')
    const { data, error } = await client.POST('/api/slideshow/', {
      body: { title: 'demo', description: '', created_by: '', created_by_url: '' },
      fetch: fetchSpy as unknown as typeof fetch,
    })

    expect(error).toBeUndefined()
    expect(data?.write_token).toBe('wt_test')
    expect(sent.method).toBe('POST')
    expect(sent.url).toBe('https://api.test/api/slideshow/')
    expect(JSON.parse(sent.body)).toEqual({
      title: 'demo',
      description: '',
      created_by: '',
      created_by_url: '',
    })
  })
})
