import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CodeBlock } from './CodeBlock'

describe('CodeBlock', () => {
  it('renders each line of multi-line code', () => {
    render(<CodeBlock code={'one\ntwo\nthree'} />)
    expect(screen.getByText('one')).toBeInTheDocument()
    expect(screen.getByText('two')).toBeInTheDocument()
    expect(screen.getByText('three')).toBeInTheDocument()
  })

  it('copies the snippet body (without the prompt prefix) to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })

    render(<CodeBlock prompt="$" code="pip install agentclip" />)
    await userEvent.click(screen.getByRole('button', { name: /copy snippet/i }))
    expect(writeText).toHaveBeenCalledWith('pip install agentclip')
  })
})
