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

  it('renders the headline, lede, and CTA', () => {
    render(<HeroSection githubUrl="https://github.com/ericelizes1/agentclip" />)
    // Brand mark moved to the AgentWidget; hero leads with the headline.
    expect(
      screen.queryByRole('link', { name: /^AgentClip$/ }),
    ).not.toBeInTheDocument()
    // Advance through the typewriter so the lead phrase renders into the DOM.
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      /Your agent now creates video walkthroughs\./,
    )
    expect(screen.getByText('walkthroughs.')).toBeInTheDocument()
    expect(
      screen.getByText(/narrated, shareable video instead/i),
    ).toBeInTheDocument()
    // GitHub demoted to a small secondary text link.
    expect(
      screen.getByRole('link', { name: /view source on github/i }),
    ).toHaveAttribute('href', 'https://github.com/ericelizes1/agentclip')
    // Install Tabs are now the primary action.
    expect(
      screen.getByRole('tab', { name: /install yourself/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('tab', { name: /have your agent do it/i }),
    ).toBeInTheDocument()
    // 'How it works' secondary CTA dropped — single primary path only.
    expect(
      screen.queryByRole('link', { name: /how it works/i }),
    ).not.toBeInTheDocument()
  })

  it('renders the punchline word with a vermillion underline class', () => {
    render(<HeroSection />)
    const punchline = screen.getByText('walkthroughs.')
    expect(punchline.className).toMatch(/decoration-vermillion-500/)
  })

  it('renders the install Tabs as the primary CTA in the hero', () => {
    render(<HeroSection />)
    expect(
      screen.getByRole('tab', { name: /install yourself/i }),
    ).toBeInTheDocument()
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
