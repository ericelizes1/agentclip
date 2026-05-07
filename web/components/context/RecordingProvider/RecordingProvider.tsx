'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type RecordingState = 'recording' | 'recorded' | 'idle'

export interface RecordingContextValue {
  state: RecordingState
  setState: (next: RecordingState) => void
}

const RecordingContext = createContext<RecordingContextValue | null>(null)

/**
 * Page-level recording state for the home page's "self-recording"
 * conceit. The hero section drives state transitions (recording →
 * recorded → idle); the navbar reads them so its TicketMark logo
 * pulses while the page is recording.
 *
 * Used only on the home page; other pages render TicketMark, NavBar,
 * etc. without the provider, in which case `useRecording()` returns
 * the safe default ({ state: 'idle', setState: noop }).
 */
export function RecordingProvider({
  children,
  initial = 'idle',
}: {
  children: ReactNode
  initial?: RecordingState
}) {
  const [state, setState] = useState<RecordingState>(initial)
  const set = useCallback((next: RecordingState) => setState(next), [])
  const value = useMemo<RecordingContextValue>(
    () => ({ state, setState: set }),
    [state, set],
  )
  return (
    <RecordingContext.Provider value={value}>
      {children}
    </RecordingContext.Provider>
  )
}

/**
 * Hook for consumers. Returns a safe default outside a provider so
 * pages that don't wrap themselves still render TicketMark, NavBar,
 * etc. without crashing.
 */
export function useRecording(): RecordingContextValue {
  const ctx = useContext(RecordingContext)
  if (!ctx) {
    return { state: 'idle', setState: () => {} }
  }
  return ctx
}
