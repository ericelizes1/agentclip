import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ClipViewer, type ClipViewerSlideshow } from './ClipViewer'

const base: ClipViewerSlideshow = {
  id: 'abc',
  title: 'Onboarding regression',
  description: 'Post-login redirect dropped a parameter.',
  summary: 'Bug repro in 47 seconds.',
  created_by: 'Eric Elizes',
  created_by_url: 'https://github.com/elizes',
  created_at: '2026-03-14T18:42:00Z',
  slides: [
    { id: 1, position: 1, media_kind: 'image', media_url: '/a.png', caption: 'Step one.' },
    { id: 2, position: 2, media_kind: 'video', media_url: '/b.mp4', caption: 'Step two.' },
  ],
}

describe('ClipViewer', () => {
  it('renders title, description, summary, and slides in order', () => {
    render(<ClipViewer slideshow={base} />)
    expect(screen.getByRole('heading', { name: 'Onboarding regression' })).toBeInTheDocument()
    expect(screen.getByText('Post-login redirect dropped a parameter.')).toBeInTheDocument()
    expect(screen.getByText('Bug repro in 47 seconds.')).toBeInTheDocument()
    expect(screen.getByText('Step one.')).toBeInTheDocument()
    expect(screen.getByText('Step two.')).toBeInTheDocument()
  })

  it('uses an <ol> for the slide sequence (assistive-tech enumeration)', () => {
    render(<ClipViewer slideshow={base} />)
    const list = screen.getByRole('list', { name: 'Clip sequence' })
    expect(list.tagName).toBe('OL')
    expect(list.querySelectorAll('li')).toHaveLength(2)
  })

  it('omits the summary callout when summary is empty', () => {
    render(<ClipViewer slideshow={{ ...base, summary: '' }} />)
    expect(screen.queryByText('Summary')).not.toBeInTheDocument()
  })

  it('omits the FILED BY credit when created_by is empty', () => {
    render(<ClipViewer slideshow={{ ...base, created_by: '' }} />)
    expect(screen.queryByText(/Filed by/)).not.toBeInTheDocument()
  })

  it('falls back to "Untitled run" when title is empty', () => {
    render(<ClipViewer slideshow={{ ...base, title: '' }} />)
    expect(screen.getByRole('heading', { name: 'Untitled run' })).toBeInTheDocument()
  })
})
