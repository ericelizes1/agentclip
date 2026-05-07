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

  it('renders the pill (idle), headline, lede, and CTAs', () => {
    render(<HeroSection githubUrl="https://github.com/ericelizes1/agentclip" />)
    // Without a RecordingProvider the pill falls through to its idle content.
    expect(screen.getByText(/v0.1 · open source · MCP/)).toBeInTheDocument()
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

  it('renders the Easter-egg note when a featured clip is provided', () => {
    render(
      <HeroSection
        featured={{
          shareToken: 'abc123',
          title: 'A real run',
          slides: [
            {
              position: 1,
              caption: 'first',
              mediaUrl: 'https://cdn.example/1.png',
              mediaKind: 'image',
            },
          ],
        }}
      />,
    )
    // Advance through reveal cascade so the Easter-egg note has mounted.
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(
      screen.getByText(/This page recorded itself while you read it/),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Watch the clip/i })).toHaveAttribute(
      'href',
      '/s/abc123',
    )
  })

  it('does NOT render the Easter-egg note when no featured clip is provided', () => {
    render(<HeroSection />)
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(
      screen.queryByText(/This page recorded itself/),
    ).not.toBeInTheDocument()
  })
})
