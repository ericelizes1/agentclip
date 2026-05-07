import { describe, expect, it } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { RecordingProvider, useRecording } from './RecordingProvider'

function Probe() {
  const { state, setState } = useRecording()
  return (
    <div>
      <span data-testid="state">{state}</span>
      <button onClick={() => setState('recorded')}>flip</button>
    </div>
  )
}

describe('RecordingProvider', () => {
  it('provides the initial state to consumers', () => {
    render(
      <RecordingProvider initial="recording">
        <Probe />
      </RecordingProvider>,
    )
    expect(screen.getByTestId('state')).toHaveTextContent('recording')
  })

  it('updates state when setState is called', () => {
    render(
      <RecordingProvider initial="recording">
        <Probe />
      </RecordingProvider>,
    )
    act(() => {
      screen.getByText('flip').click()
    })
    expect(screen.getByTestId('state')).toHaveTextContent('recorded')
  })

  it('returns a safe idle default when no provider is mounted', () => {
    render(<Probe />)
    expect(screen.getByTestId('state')).toHaveTextContent('idle')
    // setState noop should not throw.
    act(() => {
      screen.getByText('flip').click()
    })
    expect(screen.getByTestId('state')).toHaveTextContent('idle')
  })
})
