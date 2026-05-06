import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/lib/api', () => ({
  api: { GET: vi.fn() },
}))

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
}))

import { api } from '@/lib/api'
import { notFound } from 'next/navigation'
import ViewerPage from './page'

const mockedGet = vi.mocked(api.GET)
const mockedNotFound = vi.mocked(notFound)

const sample = {
  id: 'a4d5e1ce-ff43-46f8-93dd-2b4b53b13a40',
  title: 'Onboarding regression',
  description: 'Post-login redirect dropped a query parameter.',
  summary: 'Bug repro in 47 seconds.',
  created_by: 'Eric Elizes',
  created_by_url: 'https://github.com/elizes',
  created_at: '2026-03-14T18:42:00Z',
  share_url: 'https://agentclip.dev/s/abc/',
  slides: [
    {
      id: 1,
      position: 1,
      caption: 'Login screen.',
      media_url: 'https://cdn.example/slide1.png',
      media_kind: 'image' as const,
    },
    {
      id: 2,
      position: 2,
      caption: 'Token issued; redirect dropped param.',
      media_url: 'https://cdn.example/slide2.mp4',
      media_kind: 'video' as const,
    },
  ],
}

async function renderViewer(token: string) {
  const ui = await ViewerPage({ params: Promise.resolve({ token }) })
  render(ui)
}

describe('ViewerPage', () => {
  beforeEach(() => {
    mockedGet.mockReset()
    mockedNotFound.mockClear()
  })

  it('renders the ClipViewer when the API returns a slideshow', async () => {
    mockedGet.mockResolvedValueOnce({
      data: sample,
      response: { status: 200 } as Response,
      error: undefined,
    } as never)

    await renderViewer('abc123')

    expect(
      screen.getByRole('heading', { name: 'Onboarding regression' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Bug repro in 47 seconds.')).toBeInTheDocument()
    expect(screen.getByText('Login screen.')).toBeInTheDocument()
  })

  it('calls notFound() on a 404 response', async () => {
    mockedGet.mockResolvedValueOnce({
      data: undefined,
      response: { status: 404 } as Response,
      error: { detail: 'Not found.' },
    } as never)

    await expect(renderViewer('does-not-exist')).rejects.toThrow('NEXT_NOT_FOUND')
    expect(mockedNotFound).toHaveBeenCalledOnce()
  })
})
