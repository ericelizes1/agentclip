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

  it('renders the credit as a link when createdByUrl is set', () => {
    render(
      <MetaRow
        labels={['Mar 14, 2026']}
        createdBy="Eric Elizes"
        createdByUrl="https://github.com/elizes"
      />,
    )
    const link = screen.getByRole('link', { name: 'Eric Elizes' })
    expect(link).toHaveAttribute('href', 'https://github.com/elizes')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('renders the credit as plain text when no URL is given', () => {
    render(<MetaRow labels={['Mar 14, 2026']} createdBy="Eric Elizes" />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByText('Eric Elizes')).toBeInTheDocument()
  })

  it('omits the credit segment when createdBy is empty', () => {
    render(<MetaRow labels={['Mar 14, 2026']} createdBy="" />)
    expect(screen.queryByText(/Filed by/)).not.toBeInTheDocument()
  })
})
