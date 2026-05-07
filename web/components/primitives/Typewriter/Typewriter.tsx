'use client'

import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

import { cn } from '@/lib/utils'

export interface TypewriterProps {
  /** Full text to type out. SSR'd as-is for a11y; animation runs on mount. */
  text: string
  /** Per-character delay during typing. Default 35ms (≈300 chars/sec). */
  speedMs?: number
  /** Delay before typing starts on mount. */
  startDelayMs?: number
  /** Fires once typing completes (or immediately when reduced-motion is on). */
  onComplete?: () => void
  /** Optional override for the blinking caret element's classes. */
  cursorClassName?: string
  /** Optional class on the wrapper. */
  className?: string
}

/**
 * Character-by-character typewriter animation with a vermillion caret.
 *
 * SSR-safe: the component initializes its visible state to the FULL
 * text so server-rendered HTML contains the headline, then trims down
 * to length 0 on the client's first effect and ramps it back up. This
 * preserves SEO + screen-reader accessibility (the full text is in
 * the document tree at first paint) without flashing the static text
 * before the animation starts.
 *
 * Honors `prefers-reduced-motion`: when set, renders the full text
 * immediately and fires `onComplete` synchronously on mount. Reduced-
 * motion users never see a half-typed headline.
 *
 * Caret: a thin pill that uses `animate-pulse` for the blink. Hides
 * itself when typing completes (so it doesn't linger after the headline
 * is fully revealed).
 */
export function Typewriter({
  text,
  speedMs = 35,
  startDelayMs = 0,
  onComplete,
  cursorClassName,
  className,
}: TypewriterProps) {
  const reduce = useReducedMotion()
  // SSR + first client render: full text in the DOM. The effect below
  // resets to 0 on mount when animation should run, then ramps up.
  const [count, setCount] = useState(text.length)
  const [done, setDone] = useState(true)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    if (reduce) {
      // Reduced-motion: keep full text, mark done, fire callback once.
      setCount(text.length)
      setDone(true)
      onCompleteRef.current?.()
      return
    }

    // Animate: rewind to 0, kick off the type-in cascade.
    setCount(0)
    setDone(false)

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const tick = (nextCount: number) => {
      if (cancelled) return
      if (nextCount > text.length) {
        setDone(true)
        onCompleteRef.current?.()
        return
      }
      setCount(nextCount)
      timer = setTimeout(() => tick(nextCount + 1), speedMs)
    }

    timer = setTimeout(() => tick(1), startDelayMs)

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [text, speedMs, startDelayMs, reduce])

  return (
    <span className={cn('inline', className)} aria-label={text}>
      <span aria-hidden="true">{text.slice(0, count)}</span>
      {!done && (
        <span
          aria-hidden="true"
          className={cn(
            'ml-[0.05em] inline-block h-[0.85em] w-[0.08em] translate-y-[0.1em] animate-pulse rounded-[1px] bg-vermillion-500 align-baseline',
            cursorClassName,
          )}
        />
      )}
    </span>
  )
}
