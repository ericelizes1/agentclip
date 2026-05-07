import { describe, expect, it } from 'vitest'
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

  it('advances on body click and wraps back to first', () => {
    render(<HeroPreview shareToken="abc123" title="Login flow QA" slides={SLIDES} />)
    const advance = screen.getByLabelText(/Slide 1 of 3/)
    fireEvent.click(advance)
    expect(screen.getByText('Scrolled to How it works.')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText(/Slide 2 of 3/))
    expect(screen.getByText('Recent fieldwork section.')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText(/Slide 3 of 3/))
    // Wraps back to first
    expect(screen.getByText('Opened agentclip.dev. Hero loads.')).toBeInTheDocument()
  })

  it('jumps directly when a position dot is clicked', () => {
    render(<HeroPreview shareToken="abc123" title="Login flow QA" slides={SLIDES} />)
    fireEvent.click(screen.getByLabelText('Jump to slide 3'))
    expect(screen.getByText('Recent fieldwork section.')).toBeInTheDocument()
  })

  it('renders the eyebrow with the truncated share_token + creator', () => {
    render(
      <HeroPreview
        shareToken="qwft4GcsyM3sVDxy"
        title="Stripe checkout QA"
        creatorName="Eric Elizes"
        slides={SLIDES}
      />,
    )
    expect(screen.getByText('AGENTCLIP No.QWFT4G')).toBeInTheDocument()
    expect(screen.getByText('Filed by Eric Elizes')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Stripe checkout QA' })).toBeInTheDocument()
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
})
