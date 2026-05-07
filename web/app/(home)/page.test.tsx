import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/lib/api', () => ({
  api: { GET: vi.fn() },
}))

import { api } from '@/lib/api'
import HomePage from './page'

const mockedGet = vi.mocked(api.GET)

const galleryRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'a4d5e1ce-ff43-46f8-93dd-2b4b53b13a40',
  share_token: 'TYs5a9Wibl-Sgayn',
  title: 'Onboarding regression',
  description: 'Post-login redirect dropped a query param.',
  created_by: 'Eric Elizes',
  created_by_url: 'https://github.com/elizes',
  created_at: '2026-03-14T18:42:00Z',
  cover_image_url: 'https://cdn.example/clip.png',
  slide_count: 4,
  share_url: 'https://agentclip.dev/s/TYs5a9Wibl-Sgayn/',
  ...overrides,
})

const fullSlideshow = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'a4d5e1ce-ff43-46f8-93dd-2b4b53b13a40',
  title: 'Onboarding regression',
  description: 'Post-login redirect dropped a query param.',
  summary: '',
  created_by: 'Eric Elizes',
  created_by_url: 'https://github.com/elizes',
  created_at: '2026-03-14T18:42:00Z',
  share_url: 'https://agentclip.dev/s/TYs5a9Wibl-Sgayn/',
  slides: [
    { id: 1, position: 1, title: '', caption: 'first', media_url: 'https://cdn/1.png', media_kind: 'image' },
    { id: 2, position: 2, title: '', caption: 'second', media_url: 'https://cdn/2.png', media_kind: 'image' },
  ],
  ...overrides,
})

async function renderHome() {
  // Server Components are async — await the JSX before handing it to RTL.
  const ui = await HomePage()
  render(ui)
}

describe('HomePage', () => {
  beforeEach(() => {
    mockedGet.mockReset()
  })

  it('renders Hero + How it works + Gallery against the typed gallery feed', async () => {
    // Two-row gallery: row 0 becomes the hero (also fetched in detail),
    // row 1 lands as a gallery card. Three mock responses total.
    mockedGet
      .mockResolvedValueOnce({
        data: [
          galleryRow({ share_token: 'hero-tok', title: 'Hero pick' }),
          galleryRow({ share_token: 'card-tok', title: 'Onboarding regression', id: 'b' }),
        ],
        error: undefined,
      } as never)
      .mockResolvedValueOnce({
        data: fullSlideshow({ title: 'Hero pick' }),
        error: undefined,
      } as never)
    await renderHome()

    expect(screen.getByRole('heading', { name: 'Hero pick' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'How it works' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Recent fieldwork.' })).toBeInTheDocument()
    expect(screen.getByText('Onboarding regression')).toBeInTheDocument()
  })

  it('renders the empty-gallery state when the API returns no rows', async () => {
    mockedGet.mockResolvedValueOnce({ data: [], error: undefined } as never)
    await renderHome()

    expect(screen.getByRole('status')).toHaveTextContent(/no clips yet/i)
  })

  it('falls back to the empty state when the API call throws', async () => {
    mockedGet.mockRejectedValueOnce(new Error('network down'))
    await renderHome()

    expect(screen.getByRole('status')).toHaveTextContent(/no clips yet/i)
  })

  it('renders the closing line and footer GitHub link', async () => {
    mockedGet.mockResolvedValueOnce({ data: [], error: undefined } as never)
    await renderHome()

    expect(
      screen.getByText('Open source. Receipts for the work agents quietly do.'),
    ).toBeInTheDocument()
    const githubLinks = screen.getAllByRole('link', { name: /github/i })
    expect(githubLinks.length).toBeGreaterThanOrEqual(1)
  })
})
