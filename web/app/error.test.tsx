import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ErrorPage from './error'

describe('ErrorPage', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('renders the locked 500 copy plus the digest if provided', () => {
    const reset = vi.fn()
    const err = Object.assign(new Error('boom'), { digest: 'd-12345' })
    render(<ErrorPage error={err} reset={reset} />)

    expect(screen.getByText('500')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Something went wrong.' })).toBeInTheDocument()
    expect(screen.getByText('d-12345')).toBeInTheDocument()
    expect(consoleErrorSpy).toHaveBeenCalled()
  })

  it('calls reset() when the user clicks "Try again"', async () => {
    const reset = vi.fn()
    render(<ErrorPage error={new Error('boom')} reset={reset} />)
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(reset).toHaveBeenCalledOnce()
  })
})
