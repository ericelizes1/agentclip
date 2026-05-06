import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MetaRow } from './MetaRow'

describe('MetaRow', () => {
  it('renders every label', () => {
    render(<MetaRow labels={['Mar 14, 2026', '7 clips', 'sales-demo']} />)
    expect(screen.getByText('Mar 14, 2026')).toBeInTheDocument()
    expect(screen.getByText('7 clips')).toBeInTheDocument()
    expect(screen.getByText('sales-demo')).toBeInTheDocument()
  })

  it('renders the creator avatar as a link when createdByUrl is set', () => {
    render(
      <MetaRow
        labels={['Mar 14, 2026']}
        createdBy="Eric Elizes"
        createdByUrl="https://github.com/elizes"
      />,
    )
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', 'https://github.com/elizes')
    expect(link).toHaveAttribute('target', '_blank')
    // The avatar's accessible name carries the credit copy.
    expect(screen.getByLabelText('Filed by Eric Elizes')).toBeInTheDocument()
  })

  it('renders the avatar without a link when no URL is given', () => {
    render(<MetaRow labels={['Mar 14, 2026']} createdBy="Eric Elizes" />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Filed by Eric Elizes')).toBeInTheDocument()
  })

  it('omits the credit segment entirely when createdBy is empty', () => {
    render(<MetaRow labels={['Mar 14, 2026']} createdBy="" />)
    expect(screen.queryByLabelText(/Filed by/)).not.toBeInTheDocument()
  })
})
