import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DeleteSlideButton } from './DeleteSlideButton'

describe('DeleteSlideButton', () => {
  it('requires a confirmation click before calling onDelete', async () => {
    const onDelete = vi.fn(async () => {})
    render(<DeleteSlideButton position={2} onDelete={onDelete} />)

    await userEvent.click(screen.getByRole('button', { name: 'Delete slide 2' }))
    expect(onDelete).not.toHaveBeenCalled()
    expect(screen.getByText(/Delete slide 02\?/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    await waitFor(() => expect(onDelete).toHaveBeenCalledOnce())
  })

  it('lets the user cancel without calling onDelete', async () => {
    const onDelete = vi.fn(async () => {})
    render(<DeleteSlideButton position={3} onDelete={onDelete} />)

    await userEvent.click(screen.getByRole('button', { name: 'Delete slide 3' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onDelete).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Delete slide 3' })).toBeInTheDocument()
  })

  it('surfaces a delete failure inline', async () => {
    const onDelete = vi.fn(async () => {
      throw new Error('Edit link is no longer valid.')
    })
    render(<DeleteSlideButton position={1} onDelete={onDelete} />)

    await userEvent.click(screen.getByRole('button', { name: 'Delete slide 1' }))
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Edit link is no longer valid.'),
    )
  })
})
