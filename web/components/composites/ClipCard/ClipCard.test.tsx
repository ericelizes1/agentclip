import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ClipCard } from './ClipCard'

describe('ClipCard', () => {
  it('renders title, description, and links to the viewer', () => {
    render(
      <ClipCard
        shareToken="abc123"
        title="Onboarding regression"
        description="Post-login redirect dropped a param."
        coverImageUrl="/cover.png"
      />,
    )
    expect(screen.getByText('Onboarding regression')).toBeInTheDocument()
    expect(screen.getByText('Post-login redirect dropped a param.')).toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveAttribute('href', '/s/abc123')
  })

  it('falls back to "Untitled" when title is empty', () => {
    render(<ClipCard shareToken="x" title="" />)
    expect(screen.getByText('Untitled')).toBeInTheDocument()
  })

  it('renders the "No cover" placeholder when coverImageUrl is missing', () => {
    render(<ClipCard shareToken="x" title="t" />)
    expect(screen.getByText('No cover')).toBeInTheDocument()
  })
})
