import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HeroSection } from './HeroSection'

describe('HeroSection', () => {
  it('renders the locked pill, headline, lede, and CTAs', () => {
    render(<HeroSection githubUrl="https://github.com/ericelizes1/agentclip" />)
    expect(screen.getByText(/v0.1 · open source · MCP/)).toBeInTheDocument()
    expect(screen.getByText('screencast.')).toBeInTheDocument()
    expect(
      screen.getByText(/your agent records the run, narrates it, and ships/),
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

  it('emphasizes "screencast" via an <em> element so the underline lands on it', () => {
    render(<HeroSection />)
    const em = screen.getByText('screencast.').closest('em')
    expect(em).not.toBeNull()
  })

  it('renders both install tabs by default and hides them when showInstall is false', () => {
    const { rerender } = render(<HeroSection />)
    expect(screen.getByRole('tab', { name: /install yourself/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /have your agent do it/i })).toBeInTheDocument()

    rerender(<HeroSection showInstall={false} />)
    expect(screen.queryByRole('tab', { name: /install yourself/i })).not.toBeInTheDocument()
  })
})
