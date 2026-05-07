import { describe, expect, it, vi } from 'vitest'
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

  it('omits the creator credit when created_by is empty', () => {
    render(<ClipViewer slideshow={{ ...base, created_by: '' }} />)
    expect(screen.queryByLabelText(/By /)).not.toBeInTheDocument()
  })

  it('falls back to "Untitled run" when title is empty', () => {
    render(<ClipViewer slideshow={{ ...base, title: '' }} />)
    expect(screen.getByRole('heading', { name: 'Untitled run' })).toBeInTheDocument()
  })

  it('renders the narrated VideoClipPlayer when every slide has audio_url', () => {
    HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined)
    HTMLMediaElement.prototype.pause = vi.fn()
    const narrated: ClipViewerSlideshow = {
      ...base,
      share_token: 'abc-token',
      slides: base.slides.map((s, i) => ({
        ...s,
        audio_url: `https://cdn/audio/${i + 1}.mp3`,
      })),
    }
    render(<ClipViewer slideshow={narrated} />)
    expect(
      screen.getByLabelText(/Narrated walkthrough of: Onboarding regression/i),
    ).toBeInTheDocument()
    // Silent <ol> shouldn't render in the narrated branch.
    expect(
      screen.queryByRole('list', { name: 'Clip sequence' }),
    ).not.toBeInTheDocument()
  })

  it('falls back to silent <ol> when even one slide lacks audio_url', () => {
    const partial: ClipViewerSlideshow = {
      ...base,
      slides: base.slides.map((s, i) =>
        i === 0 ? { ...s, audio_url: 'https://cdn/1.mp3' } : s,
      ),
    }
    render(<ClipViewer slideshow={partial} />)
    expect(
      screen.getByRole('list', { name: 'Clip sequence' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByLabelText(/Narrated walkthrough of:/i),
    ).not.toBeInTheDocument()
  })
})
