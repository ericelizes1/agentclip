'use client'

import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef } from 'react'

import { cn } from '@/lib/utils'

import { useViewfinder } from './PageViewfinder'

export interface CaptureStackProps {
  /** Where the "Your walkthrough →" CTA links once all slides are captured. */
  walkthroughHref: string
  className?: string
}

/**
 * Vertical contact-sheet sidebar. Lives fixed on the right edge of
 * the viewport on lg+ screens; hidden on mobile. Renders one slot per
 * registered slide. Slots start empty (dashed vermillion outline) and
 * fill with their thumbnail + caption when the page captures them.
 *
 * Above the slots: the dormant "Your walkthrough →" CTA. Activates
 * (vermillion fill, gentle pulse) once every slot is filled. Links
 * to the supplied walkthrough URL — typically the featured meta clip
 * for v0.1, eventually a real per-visitor capture.
 */
export function CaptureStack({ walkthroughHref, className }: CaptureStackProps) {
  const reduce = useReducedMotion()
  const { slides, capturedIds } = useViewfinder()
  const total = slides.length
  if (total === 0) return null

  const completed = capturedIds.size === total

  return (
    <div
      aria-label="Page capture stack"
      role="region"
      className={cn('w-[164px]', className)}
    >
      <div className="flex flex-col gap-3">
        {/* CTA — dormant until completed, then activates with vermillion fill. */}
        <motion.div
          animate={completed ? { scale: 1 } : { scale: 0.96 }}
          transition={{ duration: 0.35, ease: [0.2, 0.7, 0.2, 1] }}
        >
          {completed ? (
            <Link
              href={walkthroughHref}
              className={cn(
                'group relative flex items-center justify-between gap-2 rounded-[10px] px-3 py-2.5',
                'bg-vermillion-500 text-paper shadow-[0_10px_28px_-12px_rgba(217,72,36,0.65)]',
                'transition-transform duration-200 ease-out hover:-translate-y-px',
                !reduce && 'animate-[pulse_2.4s_ease-in-out_infinite]',
              )}
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.16em]">
                Your walkthrough
              </span>
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          ) : (
            <div
              aria-hidden="true"
              className={cn(
                'flex items-center justify-between gap-2 rounded-[10px] px-3 py-2.5',
                'border border-dashed border-ink-300 text-ink-400',
              )}
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.16em]">
                Your walkthrough
              </span>
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </div>
          )}
        </motion.div>

        {/* Slot stack — one card per registered slide. */}
        <ol className="flex flex-col gap-3" role="list">
          {slides.map((slide) => {
            const isFilled = capturedIds.has(slide.id)
            return (
              <li key={slide.id} className="list-none">
                <SlotCard slide={slide} filled={isFilled} reduce={reduce ?? false} />
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}

function SlotCard({
  slide,
  filled,
  reduce,
}: {
  slide: { id: string; thumbnailUrl: string; caption: string; position: number }
  filled: boolean
  reduce: boolean
}) {
  const positionLabel = String(slide.position).padStart(2, '0')
  const ref = useRef<HTMLDivElement | null>(null)
  const { registerSlot } = useViewfinder()

  // Register this slot's frame node with the viewfinder so the flying
  // capture animation can compute its destination rect.
  useEffect(() => {
    registerSlot(slide.id, ref.current)
    return () => registerSlot(slide.id, null)
  }, [slide.id, registerSlot])

  return (
    <div
      ref={ref}
      className={cn(
        'relative w-[148px] overflow-hidden rounded-[10px] transition-all duration-300',
        filled
          ? 'border border-ink-200 bg-paper shadow-[0_10px_24px_-14px_rgba(20,20,19,0.25)]'
          : 'border border-dashed border-ink-300/70 bg-paper/40',
      )}
    >
      {/* Position chip top-left, like a film slate. */}
      <span
        className={cn(
          'absolute top-1.5 left-1.5 z-10 rounded-[4px] px-1.5 py-0.5 font-mono text-[9px] font-semibold tracking-[0.18em]',
          filled
            ? 'bg-ink-900/85 text-paper'
            : 'border border-ink-300/70 text-ink-400',
        )}
      >
        {positionLabel}
      </span>

      <div className="relative aspect-[16/9] overflow-hidden bg-paper-oat">
        {filled ? (
          <motion.img
            initial={reduce ? false : { opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.2, 0.7, 0.2, 1] }}
            src={slide.thumbnailUrl}
            alt=""
            loading="lazy"
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
              className="text-ink-300"
            >
              <circle
                cx="10"
                cy="10"
                r="6"
                stroke="currentColor"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <circle cx="10" cy="10" r="1" fill="currentColor" />
            </svg>
          </div>
        )}
      </div>
      <p
        className={cn(
          'line-clamp-2 px-2 py-2 text-[11px] leading-snug',
          filled ? 'text-ink-700' : 'text-ink-400 italic',
        )}
      >
        {filled ? slide.caption : 'Awaiting capture…'}
      </p>
    </div>
  )
}
