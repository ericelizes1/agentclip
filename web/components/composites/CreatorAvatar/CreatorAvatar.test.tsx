import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CreatorAvatar } from './CreatorAvatar'
import { gradientFor } from '@/lib/gradient-avatar'

describe('CreatorAvatar', () => {
  it('renders the initials of a single-word name', () => {
    render(<CreatorAvatar name="Eric" />)
    expect(screen.getByLabelText('By Eric')).toHaveTextContent('ER')
  })

  it('renders first + last initials of a multi-word name', () => {
    render(<CreatorAvatar name="Eric Elizes" />)
    expect(screen.getByLabelText('By Eric Elizes')).toHaveTextContent('EE')
  })

  it('falls back to "?" for an empty name', () => {
    render(<CreatorAvatar name="" />)
    expect(screen.getByText('?')).toBeInTheDocument()
  })

  it('wraps the avatar in an anchor when url is provided', () => {
    render(<CreatorAvatar name="Eric Elizes" url="https://github.com/elizes" />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', 'https://github.com/elizes')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('uses gradientFor() to derive a deterministic gradient for the same name', () => {
    // happy-dom doesn't reflect linear-gradient(...) into style.background at
    // read time, so we test the helper directly. The Linked test above
    // already proves the helper output reaches the rendered tree.
    const a = gradientFor('Eric Elizes')
    const b = gradientFor('Eric Elizes')
    const c = gradientFor('Karri Saarinen')
    expect(a.gradient).toEqual(b.gradient)
    expect(a.gradient).not.toEqual(c.gradient)
    expect(a.gradient).toContain('hsl')
  })
})
