'use client'

import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

import { useViewfinder } from './PageViewfinder'

export interface CaptureStackProps {
  /** Where the "Your walkthrough →" CTA links once all slides are captured. */
  walkthroughHref: string
  className?: string
}

/**
 * Right-rail stack: a single morphing status pill at the top, four
 * slot cards below.
 *
 * The status pill carries TWO meanings in one element:
 *   recording → "● Clipping… 00:08:16 · 02 / 04" (vermillion dot
 *               pulses; timecode + slide counter inline)
 *   complete  → "Your walkthrough →" (vermillion fill, soft pulse,
 *               links to the captured walkthrough)
 *
 * Collapsing the recording chrome and the walkthrough CTA into one
 * surface simplifies the rail's information hierarchy: visitors look
 * at exactly one thing to know what's happening on the page.
 *
 * Below the pill, four slot cards stack vertically. Each starts as a
 * dashed-outline placeholder ("Awaiting capture…") and fills with its
 * thumbnail + caption when the page captures the corresponding section.
 */
export function CaptureStack({ walkthroughHref, className }: CaptureStackProps) {
  const reduce = useReducedMotion()
  const { slides, capturedIds } = useViewfinder()
  const total = slides.length
  if (total === 0) return null

  const captured = capturedIds.size
  const completed = captured === total
  const timecode = useTimecode()

  return (
    <div
      aria-label="Page capture stack"
      role="region"
      className={cn('w-[148px]', className)}
    >
      <div className="flex flex-col gap-3">
        {/* The morphing status pill. */}
        <motion.div
          animate={completed ? { scale: 1 } : { scale: 0.98 }}
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
              <span className="text-[13px] font-medium tracking-tight">
                Your walkthrough
              </span>
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          ) : (
            <div
              aria-live="polite"
              className={cn(
                'flex flex-col gap-1 rounded-[10px] border border-dashed border-vermillion-500/40 px-3 py-2.5',
              )}
            >
              <div className="flex items-center gap-1.5 text-[13px]">
                <span
                  aria-hidden="true"
                  className="inline-block size-2 animate-pulse rounded-full bg-vermillion-500"
                />
                <span className="font-medium text-vermillion-700">
                  Clipping&hellip;
                </span>
              </div>
              <div className="font-mono text-[11px] tabular-nums text-ink-500">
                {timecode}{' '}
                <span className="text-ink-300">·</span>{' '}
                <span className="text-ink-700">
                  {String(captured).padStart(2, '0')}
                </span>
                <span className="text-ink-300">/</span>
                {String(total).padStart(2, '0')}
              </div>
            </div>
          )}
        </motion.div>

        {/* Slot stack — one card per registered slide. */}
        <ol className="flex flex-col gap-3" role="list">
          {slides.map((slide) => {
            const isFilled = capturedIds.has(slide.id)
            return (
              <li key={slide.id} className="list-none">
                <SlotCard
                  slide={slide}
                  filled={isFilled}
                  reduce={reduce ?? false}
                />
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
      <span
        className={cn(
          'absolute top-1.5 left-1.5 z-10 rounded-[4px] px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums',
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

/* ── Live SMPTE-style timecode ────────────────────────────── */

function useTimecode(): string {
  const [ms, setMs] = useState(0)
  useEffect(() => {
    const start = Date.now()
    const interval = setInterval(() => setMs(Date.now() - start), 100)
    return () => clearInterval(interval)
  }, [])
  const totalFrames = Math.floor((ms * 24) / 1000)
  const ff = totalFrames % 24
  const totalSec = Math.floor(ms / 1000)
  const ss = totalSec % 60
  const mm = Math.floor(totalSec / 60)
  return `${pad(mm)}:${pad(ss)}:${pad(ff)}`
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}
