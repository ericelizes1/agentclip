import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TestStub } from './TestStub'

describe('TestStub', () => {
  it('renders the label as a button', () => {
    render(<TestStub label="Pipeline OK" />)
    expect(screen.getByRole('button', { name: 'Pipeline OK' })).toBeInTheDocument()
  })
})
