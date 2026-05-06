import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from './Badge'

describe('Badge', () => {
  it('renders text content', () => {
    render(<Badge>3 clips</Badge>)
    expect(screen.getByText('3 clips')).toBeInTheDocument()
  })

  it('applies tone-specific classes', () => {
    const { container } = render(<Badge tone="accent">NEW</Badge>)
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain('vermillion')
  })
})
