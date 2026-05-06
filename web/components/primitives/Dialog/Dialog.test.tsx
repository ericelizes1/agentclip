import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Dialog } from './Dialog'

function Fixture() {
  return (
    <Dialog.Root>
      <Dialog.Trigger>Open</Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Title>Share this clip</Dialog.Title>
        <Dialog.Description>The link is public.</Dialog.Description>
      </Dialog.Content>
    </Dialog.Root>
  )
}

describe('Dialog', () => {
  it('mounts content only once the trigger is clicked', async () => {
    render(<Fixture />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await userEvent.click(screen.getByText('Open'))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Share this clip')).toBeInTheDocument()
  })

  it('closes on the Close affordance', async () => {
    render(<Fixture />)
    await userEvent.click(screen.getByText('Open'))
    await userEvent.click(screen.getByLabelText('Close dialog'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
