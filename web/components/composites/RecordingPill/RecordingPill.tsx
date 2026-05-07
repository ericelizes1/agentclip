'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'

import { Pill } from '@/components/primitives/Pill/Pill'
import { useRecording } from '@/components/context/RecordingProvider/RecordingProvider'
import { cn } from '@/lib/utils'

export interface RecordingPillProps {
  /**
   * Final pill content to crossfade in once recording finishes (e.g.
   * `<>v0.1 · open source · MCP</>`). Rendered when state === 'idle'.
   */
  finalContent: ReactNode
  /**
   * Slide number labelled in the recording / recorded copy. Defaults
   * to 1 — the hero is "slide 01".
   */
  slideNumber?: number
}

/**
 * Stateful pill consumed by the home-page hero. Crossfades through
 * three contents based on `useRecording()` state:
 *
 *   recording → "● Recording slide 01…" (vermillion dot pulses)
 *   recorded  → "● Slide 01 recorded ✓"
 *   idle      → finalContent (the locked v0.1 metadata)
 *
 * The crossfade is opacity-only so the pill's pixel height stays
 * constant — the surrounding hero doesn't reflow when state changes.
 */
export function RecordingPill({
  finalContent,
  slideNumber = 1,
}: RecordingPillProps) {
  const { state } = useRecording()
  const reduce = useReducedMotion()
  const slideStr = String(slideNumber).padStart(2, '0')

  return (
    <Pill className="relative" aria-live="polite">
      <span className="invisible block">
        {/* Reserves intrinsic width on the longest variant so the pill
            doesn't change size as state transitions. */}
        ● Recording slide {slideStr}…
      </span>
      <AnimatePresence initial={false} mode="wait">
        {state === 'recording' && (
          <motion.span
            key="recording"
            className="absolute inset-0 flex items-center justify-center gap-1.5 px-3 py-1"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            {...(reduce ? {} : { exit: { opacity: 0 } })}
            transition={{ duration: 0.25 }}
          >
            <RecordingDot pulse />
            <span>Recording slide {slideStr}…</span>
          </motion.span>
        )}
        {state === 'recorded' && (
          <motion.span
            key="recorded"
            className="absolute inset-0 flex items-center justify-center gap-1.5 px-3 py-1"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            {...(reduce ? {} : { exit: { opacity: 0 } })}
            transition={{ duration: 0.25 }}
          >
            <RecordingDot />
            <span>Slide {slideStr} recorded</span>
            <CheckMark />
          </motion.span>
        )}
        {state === 'idle' && (
          <motion.span
            key="idle"
            className="absolute inset-0 flex items-center justify-center px-3 py-1"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            {...(reduce ? {} : { exit: { opacity: 0 } })}
            transition={{ duration: 0.25 }}
          >
            {finalContent}
          </motion.span>
        )}
      </AnimatePresence>
    </Pill>
  )
}

function RecordingDot({ pulse = false }: { pulse?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-block size-2 rounded-full bg-vermillion-500',
        pulse && 'animate-pulse',
      )}
    />
  )
}

function CheckMark() {
  return (
    <svg
      aria-hidden="true"
      width="11"
      height="11"
      viewBox="0 0 12 12"
      fill="none"
      className="text-vermillion-700"
    >
      <path
        d="M2 6.5 L5 9 L10 3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
