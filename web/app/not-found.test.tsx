import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import NotFound from './not-found'

describe('NotFound', () => {
  it('renders the locked 404 copy and a link home', () => {
    render(<NotFound />)
    expect(screen.getByText('404')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Clip not found.' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to AgentClip' })).toHaveAttribute(
      'href',
      '/',
    )
  })
})
