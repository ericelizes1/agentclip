import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RecordingProvider } from '@/components/context/RecordingProvider/RecordingProvider'
import { RecordingPill } from './RecordingPill'

const FINAL = <span>v0.1 · open source · MCP</span>

describe('RecordingPill', () => {
  it('renders the recording label when state is recording', () => {
    render(
      <RecordingProvider initial="recording">
        <RecordingPill finalContent={FINAL} />
      </RecordingProvider>,
    )
    expect(screen.getByText('Recording slide 01…')).toBeInTheDocument()
  })

  it('renders the recorded label when state is recorded', () => {
    render(
      <RecordingProvider initial="recorded">
        <RecordingPill finalContent={FINAL} />
      </RecordingProvider>,
    )
    expect(screen.getByText('Slide 01 recorded')).toBeInTheDocument()
  })

  it('renders the final content when state is idle', () => {
    render(
      <RecordingProvider initial="idle">
        <RecordingPill finalContent={FINAL} />
      </RecordingProvider>,
    )
    expect(screen.getByText('v0.1 · open source · MCP')).toBeInTheDocument()
  })

  it('falls through to idle content when no provider is mounted', () => {
    render(<RecordingPill finalContent={FINAL} />)
    expect(screen.getByText('v0.1 · open source · MCP')).toBeInTheDocument()
  })

  it('respects a custom slide number', () => {
    render(
      <RecordingProvider initial="recording">
        <RecordingPill finalContent={FINAL} slideNumber={3} />
      </RecordingProvider>,
    )
    expect(screen.getByText('Recording slide 03…')).toBeInTheDocument()
  })
})
