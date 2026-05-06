import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SummaryCallout } from './SummaryCallout'

describe('SummaryCallout', () => {
  it('renders the body and the SUMMARY eyebrow', () => {
    render(<SummaryCallout summary="Bug repro in 47s." />)
    expect(screen.getByText('Bug repro in 47s.')).toBeInTheDocument()
    expect(screen.getByText('Summary')).toBeInTheDocument()
  })

  it('renders nothing when summary is empty', () => {
    const { container } = render(<SummaryCallout summary="" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when summary is whitespace-only', () => {
    const { container } = render(<SummaryCallout summary="   " />)
    expect(container.firstChild).toBeNull()
  })
})
