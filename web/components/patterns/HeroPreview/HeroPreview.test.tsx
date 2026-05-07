import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { HeroPreview, type HeroPreviewSlide } from './HeroPreview'

const SLIDES: HeroPreviewSlide[] = [
  {
    position: 1,
    caption: 'Opened agentclip.dev. Hero loads.',
    mediaUrl: 'https://cdn.agentclip.dev/x/1.png',
    mediaKind: 'image',
  },
  {
    position: 2,
    caption: 'Scrolled to How it works.',
    mediaUrl: 'https://cdn.agentclip.dev/x/2.png',
    mediaKind: 'image',
  },
  {
    position: 3,
    caption: 'Recent fieldwork section.',
    mediaUrl: 'https://cdn.agentclip.dev/x/3.png',
    mediaKind: 'image',
  },
]

describe('HeroPreview', () => {
  it('renders the first slide on mount', () => {
    render(<HeroPreview shareToken="abc123" title="Login flow QA" slides={SLIDES} />)
    expect(screen.getByText('Opened agentclip.dev. Hero loads.')).toBeInTheDocument()
  })

  it('toggles autoplay when the polaroid is clicked', () => {
    render(<HeroPreview shareToken="abc123" title="Login flow QA" slides={SLIDES} />)
    // Idle: button announces "Play walkthrough".
    const play = screen.getByLabelText(/Play walkthrough/)
    fireEvent.click(play)
    // After clicking, the same button announces the "Pause autoplay" state
    // for whatever slide is currently visible (still slide 1 immediately
    // after clicking — autoplay only advances after the interval).
    expect(screen.getByLabelText(/Pause autoplay/)).toBeInTheDocument()
  })

  it('jumps directly when a position dot is clicked', () => {
    render(<HeroPreview shareToken="abc123" title="Login flow QA" slides={SLIDES} />)
    fireEvent.click(screen.getByLabelText('Jump to slide 3'))
    expect(screen.getByText('Recent fieldwork section.')).toBeInTheDocument()
  })

  it('shows the creator credit and title-as-aria-label without competing headings', () => {
    render(
      <HeroPreview
        shareToken="qwft4GcsyM3sVDxy"
        title="Stripe checkout QA"
        creatorName="Eric Elizes"
        slides={SLIDES}
      />,
    )
    // Title is on the wrapper as aria-label so screen readers still announce it,
    // but no h2 inside the embed competes with the page's <h1>.
    expect(screen.getByLabelText('Preview of: Stripe checkout QA')).toBeInTheDocument()
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    // Creator credit is now a CreatorChip — gradient avatar + visible
    // name. Asserting on the visible name keeps the test resilient to
    // chip styling changes.
    expect(screen.getByText('Eric Elizes')).toBeInTheDocument()
  })

  it('links Open clip to the full viewer page', () => {
    render(<HeroPreview shareToken="abc123" title="Login flow QA" slides={SLIDES} />)
    const link = screen.getByRole('link', { name: /Open clip/ })
    expect(link).toHaveAttribute('href', '/s/abc123')
  })

  it('renders nothing when given an empty slide list', () => {
    const { container } = render(<HeroPreview shareToken="abc123" title="x" slides={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders the narrated VideoClipPlayer when every slide has audioUrl', () => {
    // Patch jsdom audio so the player's mount-time setup doesn't throw.
    HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined)
    HTMLMediaElement.prototype.pause = vi.fn()

    const narrated: HeroPreviewSlide[] = SLIDES.map((s, i) => ({
      ...s,
      audioUrl: `https://cdn.agentclip.dev/audio/${i + 1}.mp3`,
    }))
    render(
      <HeroPreview shareToken="abc123" title="Login flow QA" slides={narrated} />,
    )
    // VideoClipPlayer's distinctive aria-label appears only in the
    // narrated branch.
    expect(
      screen.getByLabelText(/Narrated walkthrough of: Login flow QA/i),
    ).toBeInTheDocument()
  })

  it('falls back to silent autoplay when even one slide lacks audioUrl', () => {
    const partiallyNarrated: HeroPreviewSlide[] = SLIDES.map((s, i) =>
      i === 0 ? { ...s, audioUrl: 'https://cdn/1.mp3' } : s,
    )
    render(
      <HeroPreview shareToken="abc123" title="Login flow QA" slides={partiallyNarrated} />,
    )
    // Silent variant exposes the play-walkthrough label, narrated
    // variant exposes "Narrated walkthrough of:" — the silent label
    // confirms the fallback path was chosen.
    expect(
      screen.getByLabelText(/Play walkthrough \(\d+ slides\)/),
    ).toBeInTheDocument()
  })
})
