import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import { VideoClipPlayer, type VideoClipSlide } from './VideoClipPlayer'

const SLIDES: VideoClipSlide[] = [
  {
    position: 1,
    caption: 'Opened agentclip.dev. Hero loads.',
    mediaUrl: 'https://cdn.example/1.png',
    mediaKind: 'image',
    audioUrl: 'https://cdn.example/audio/1.mp3',
  },
  {
    position: 2,
    caption: 'Scrolled to How it works.',
    mediaUrl: 'https://cdn.example/2.png',
    mediaKind: 'image',
    audioUrl: 'https://cdn.example/audio/2.mp3',
  },
  {
    position: 3,
    caption: 'Recent fieldwork section.',
    mediaUrl: 'https://cdn.example/3.png',
    mediaKind: 'image',
    audioUrl: 'https://cdn.example/audio/3.mp3',
  },
]

beforeEach(() => {
  // jsdom doesn't implement HTMLMediaElement.play/pause. Patch them
  // directly on the prototype so the player's audio.play()/.pause()
  // calls don't throw NotImplementedError during tests.
  HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined)
  HTMLMediaElement.prototype.pause = vi.fn()
})

describe('VideoClipPlayer', () => {
  it('renders the active slide and a play affordance on mount', () => {
    render(
      <VideoClipPlayer
        shareToken="abc123"
        title="Login flow"
        slides={SLIDES}
      />,
    )
    expect(
      screen.getByLabelText(/Play narrated walkthrough/i),
    ).toBeInTheDocument()
  })

  it('renders one unified progress slider across the whole walkthrough', () => {
    render(
      <VideoClipPlayer
        shareToken="abc123"
        title="Login flow"
        slides={SLIDES.map((s, i) => ({
          ...s,
          audioDurationMs: 5000 + i * 1000,
        }))}
      />,
    )
    const slider = screen.getByRole('slider', { name: /Walkthrough progress/i })
    expect(slider).toBeInTheDocument()
    // Total = 5000 + 6000 + 7000 = 18000ms
    expect(slider).toHaveAttribute('aria-valuemax', '18000')
    expect(slider).toHaveAttribute('aria-valuenow', '0')
  })

  it('exposes an Open clip link to the full viewer', () => {
    render(
      <VideoClipPlayer
        shareToken="abc123"
        title="Login flow"
        slides={SLIDES}
      />,
    )
    expect(screen.getByRole('link', { name: /Open clip/i })).toHaveAttribute(
      'href',
      '/s/abc123',
    )
  })

  it('toggles mute on the volume button', () => {
    render(
      <VideoClipPlayer
        shareToken="abc123"
        title="Login flow"
        slides={SLIDES}
      />,
    )
    const muteButton = screen.getByLabelText('Mute audio')
    fireEvent.click(muteButton)
    expect(screen.getByLabelText('Unmute audio')).toBeInTheDocument()
  })

  it('renders the caption inside the player when variant is full', () => {
    render(
      <VideoClipPlayer
        shareToken="abc123"
        title="Login flow"
        slides={SLIDES}
        variant="full"
      />,
    )
    expect(
      screen.getByText('Opened agentclip.dev. Hero loads.'),
    ).toBeInTheDocument()
  })

  it('omits the caption inside the player when variant is compact', () => {
    render(
      <VideoClipPlayer
        shareToken="abc123"
        title="Login flow"
        slides={SLIDES}
        variant="compact"
      />,
    )
    // Compact embed expects the parent (HeroPreview) to render the caption
    // somewhere else; the player itself stays minimal.
    expect(
      screen.queryByText('Opened agentclip.dev. Hero loads.'),
    ).not.toBeInTheDocument()
  })

  it('surfaces the creator chip when creatorName is provided', () => {
    render(
      <VideoClipPlayer
        shareToken="abc123"
        title="Login flow"
        creatorName="Eric Elizes"
        slides={SLIDES}
      />,
    )
    expect(screen.getByText('Eric Elizes')).toBeInTheDocument()
  })
})
