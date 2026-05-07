import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { HeroSection } from './HeroSection'

// Animation primitives drive the headline; fake timers keep tests
// deterministic. Outside the RecordingProvider the pill renders its
// idle (locked metadata) content immediately, so we can assert on
// that without setting up the provider.

describe('HeroSection', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the brand mark, headline, lede, and CTAs', () => {
    render(<HeroSection githubUrl="https://github.com/ericelizes1/agentclip" />)
    // Brand mark above the headline links back to the home page.
    const brandLink = screen.getByRole('link', { name: /AgentClip/ })
    expect(brandLink).toHaveAttribute('href', '/')
    // Advance through the typewriter so the lead phrase renders into the DOM.
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      /Walkthroughs that record.*themselves\./,
    )
    expect(screen.getByText('themselves.')).toBeInTheDocument()
    expect(
      screen.getByText(/Your AI agent runs the flow\. AgentClip captures the screens/),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /view on github/i })).toHaveAttribute(
      'href',
      'https://github.com/ericelizes1/agentclip',
    )
    expect(screen.getByRole('link', { name: /how it works/i })).toHaveAttribute(
      'href',
      '#how-it-works',
    )
  })

  it('renders the punchline word with a vermillion underline class', () => {
    render(<HeroSection />)
    const punchline = screen.getByText('themselves.')
    expect(punchline.className).toMatch(/decoration-vermillion-500/)
  })

  it('renders both install tabs by default and hides them when showInstall is false', () => {
    const { rerender } = render(<HeroSection />)
    expect(screen.getByRole('tab', { name: /install yourself/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /have your agent do it/i })).toBeInTheDocument()

    rerender(<HeroSection showInstall={false} />)
    expect(screen.queryByRole('tab', { name: /install yourself/i })).not.toBeInTheDocument()
  })

  it('renders the embedded HeroPreview when a featured clip is provided', () => {
    render(
      <HeroSection
        featured={{
          shareToken: 'abc123',
          title: 'A real run',
          slides: [
            {
              position: 1,
              caption: 'first slide',
              mediaUrl: 'https://cdn.example/1.png',
              mediaKind: 'image',
            },
          ],
        }}
      />,
    )
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(screen.getByText('first slide')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Open clip/i })).toHaveAttribute(
      'href',
      '/s/abc123',
    )
  })
})
