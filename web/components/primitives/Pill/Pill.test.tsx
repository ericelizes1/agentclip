import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Pill } from './Pill'

describe('Pill', () => {
  it('renders its children', () => {
    render(<Pill>v0.1 · open source</Pill>)
    expect(screen.getByText('v0.1 · open source')).toBeInTheDocument()
  })
})
