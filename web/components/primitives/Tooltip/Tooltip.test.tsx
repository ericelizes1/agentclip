import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Tooltip } from './Tooltip'

describe('Tooltip', () => {
  it('renders the trigger out of the gate (content stays portal-only until open)', () => {
    render(
      <Tooltip.Provider>
        <Tooltip.Root>
          <Tooltip.Trigger>Hover me</Tooltip.Trigger>
          <Tooltip.Content>Copy share URL</Tooltip.Content>
        </Tooltip.Root>
      </Tooltip.Provider>,
    )
    expect(screen.getByText('Hover me')).toBeInTheDocument()
    // Content lives in a portal opened on hover; not in the DOM yet.
    expect(screen.queryByText('Copy share URL')).not.toBeInTheDocument()
  })
})
