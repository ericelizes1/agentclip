import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Card } from './Card'

describe('Card', () => {
  it('renders children inside the surface', () => {
    render(
      <Card>
        <p>Card body</p>
      </Card>,
    )
    expect(screen.getByText('Card body')).toBeInTheDocument()
  })

  it('applies the dark elevation class', () => {
    const { container } = render(<Card elevation="dark">x</Card>)
    expect((container.firstChild as HTMLElement).className).toContain('paper-dark')
  })
})
