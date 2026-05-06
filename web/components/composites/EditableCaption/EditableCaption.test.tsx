import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditableCaption } from './EditableCaption'

describe('EditableCaption', () => {
  it('renders the value as a button until clicked', () => {
    render(<EditableCaption value="hello" onSave={async () => {}} />)
    expect(screen.getByRole('button', { name: 'Edit caption' })).toHaveTextContent('hello')
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('saves on blur and reflects the new value', async () => {
    const onSave = vi.fn(async () => {})
    render(<EditableCaption value="old" onSave={onSave} />)

    await userEvent.click(screen.getByRole('button', { name: 'Edit caption' }))
    const textarea = screen.getByRole('textbox', { name: 'Edit caption' })
    await userEvent.clear(textarea)
    await userEvent.type(textarea, 'new')
    textarea.blur()

    await waitFor(() => expect(onSave).toHaveBeenCalledWith('new'))
  })

  it('does not call onSave when the value is unchanged', async () => {
    const onSave = vi.fn(async () => {})
    render(<EditableCaption value="same" onSave={onSave} />)

    await userEvent.click(screen.getByRole('button', { name: 'Edit caption' }))
    const textarea = screen.getByRole('textbox', { name: 'Edit caption' })
    textarea.blur()

    await waitFor(() => expect(screen.queryByRole('textbox')).not.toBeInTheDocument())
    expect(onSave).not.toHaveBeenCalled()
  })

  it('reverts to the original value and shows an error on save failure', async () => {
    const onSave = vi.fn(async () => {
      throw new Error('Edit link is no longer valid.')
    })
    render(<EditableCaption value="original" onSave={onSave} />)

    await userEvent.click(screen.getByRole('button', { name: 'Edit caption' }))
    const textarea = screen.getByRole('textbox', { name: 'Edit caption' })
    await userEvent.clear(textarea)
    await userEvent.type(textarea, 'broken update')
    textarea.blur()

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Edit link is no longer valid.'),
    )
    expect(screen.getByRole('button', { name: 'Edit caption' })).toHaveTextContent('original')
  })

  it('cancels on Escape without calling onSave', async () => {
    const onSave = vi.fn(async () => {})
    render(<EditableCaption value="keep me" onSave={onSave} />)

    await userEvent.click(screen.getByRole('button', { name: 'Edit caption' }))
    const textarea = screen.getByRole('textbox', { name: 'Edit caption' })
    await userEvent.clear(textarea)
    await userEvent.type(textarea, 'discarded')
    await userEvent.keyboard('{Escape}')

    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Edit caption' })).toHaveTextContent('keep me')
  })
})
