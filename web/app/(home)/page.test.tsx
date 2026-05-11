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

    // Hero pick lives on the embed as aria-label, not a competing heading;
    // page <h1> carries the product promise.
    expect(screen.getByLabelText('Preview of: Hero pick')).toBeInTheDocument()
    // SectionHeader's eyebrow chip carries "How it works"; the H2 is the headline.
    expect(
      screen.getByRole('heading', { name: 'Three steps. No recording session.' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        name: 'What agents shipped, found, tested, and explained.',
      }),
    ).toBeInTheDocument()
    // The marquee band duplicates clip titles in markup for its
    // looping animation, so the gallery row plus the marquee yields
    // multiple text matches — assert at least one renders.
    expect(screen.getAllByText('Onboarding regression').length).toBeGreaterThan(0)
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

    // Closing statement is split across spans for the italic + underlined
    // emphasis on "Video" — match by content instead of exact string.
    expect(
      screen.getByText(
        (_, node) =>
          node?.textContent ===
          'Open source. Video for the work agents quietly do.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /Read the source/ }),
    ).toBeInTheDocument()
  })
})
