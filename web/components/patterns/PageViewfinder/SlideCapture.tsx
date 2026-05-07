'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { useReducedMotion } from 'framer-motion'

import { cn } from '@/lib/utils'

import { useViewfinder } from './PageViewfinder'

export interface SlideCaptureProps {
  /** Slide id this section captures. Must match a slide registered in <PageViewfinder slides=...>. */
  slideId: string
  /** Threshold for the IntersectionObserver. Default 0.45 — section is "capturing" once almost half visible. */
  threshold?: number
  /** Optional class for the wrapper div. */
  className?: string
  children: ReactNode
}

/**
 * Wraps a page section in an IntersectionObserver. When the section
 * first crosses the threshold (default ≈45% visible), fires
 * `viewfinder.capture(slideId)` exactly once.
 *
 * On capture, the wrapper briefly flashes paper-white to mimic a
 * camera shutter; the captured thumbnail simultaneously fills its
 * slot in <CaptureStack>. The flash is purely visual and lasts ~380ms
 * (matched to the timer in PageViewfinder).
 *
 * Reduced-motion users get the capture state without the flash.
 */
export function SlideCapture({
  slideId,
  threshold = 0.45,
  className,
  children,
}: SlideCaptureProps) {
  const reduce = useReducedMotion()
  const { capture, capturedIds, flashTarget } = useViewfinder()
  const ref = useRef<HTMLDivElement | null>(null)
  const captured = capturedIds.has(slideId)

  useEffect(() => {
    if (captured) return
    const node = ref.current
    if (!node || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            capture(slideId)
            observer.disconnect()
            return
          }
        }
      },
      { threshold },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [capture, slideId, threshold, captured])

  const isFlashing = !reduce && flashTarget === slideId

  return (
    <div ref={ref} className={cn('relative', className)} data-slide-id={slideId}>
      {children}
      {/* Flash overlay — paper-white veil that fades in/out fast,
          like a camera shutter snap. Pointer-events-none so it
          doesn't interrupt clicks. */}
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-0 z-20 bg-paper transition-opacity duration-200 ease-out',
          isFlashing ? 'opacity-70' : 'opacity-0',
        )}
      />
    </div>
  )
}
