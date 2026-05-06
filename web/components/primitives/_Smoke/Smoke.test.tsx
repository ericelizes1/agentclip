import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Smoke } from './Smoke'

describe('Smoke', () => {
  it('renders the label alongside the lucide + simple-icons SVGs', () => {
    const { container } = render(<Smoke label="dependencies wired" />)
    expect(screen.getByText('dependencies wired')).toBeInTheDocument()
    // Both icon libraries render <svg>; the smoke test asserts at least
    // two SVGs are present so a missing dep would fail loudly.
    expect(container.querySelectorAll('svg').length).toBeGreaterThanOrEqual(2)
  })
})
