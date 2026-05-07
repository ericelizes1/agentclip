'use client'

import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef } from 'react'

import { AgentMark } from '@/components/primitives/AgentMark/AgentMark'
import { useViewfinder } from '@/components/patterns/PageViewfinder/PageViewfinder'
import { cn } from '@/lib/utils'

export interface AgentWidgetProps {
  /** URL the "Your walkthrough →" CTA links to once every slot is captured. */
  walkthroughHref: string
  className?: string
}

/**
 * AgentClip "live capture" widget — the brand surface on the home page.
 *
 * Layout, top to bottom:
 *   1. Brand bar — the AgentMark glyph (which IS the agent character;
 *      no separate stick figure) plus the AgentClip wordmark and a
 *      small LIVE indicator. The mark itself flashes its lens and
 *      bounces on every new capture, so the brand is the animation.
 *   2. Slot stack — four thumbnail slots that fill as the visitor
 *      scrolls past each registered section.
 *   3. Walkthrough CTA — placeholder showing "Clipped 0X / 04" while
 *      slots are still filling, morphs into a vermillion "Your
 *      walkthrough →" link once everything is captured.
 */
export function AgentWidget({ walkthroughHref, className }: AgentWidgetProps) {
  const reduce = useReducedMotion()
  const { slides, capturedIds, registerSlot } = useViewfinder()
  const total = slides.length
  if (total === 0) return null

  const captured = capturedIds.size
  const completed = captured === total

  return (
    <aside
      aria-label="Live agent capture"
      className={cn(
        'flex w-[244px] flex-col overflow-hidden rounded-[18px]',
        'border border-ink-200 bg-paper',
        'shadow-[0_24px_56px_-24px_rgba(20,20,19,0.18),0_4px_14px_-6px_rgba(20,20,19,0.08)]',
        className,
      )}
    >
      {/* ── Brand bar — the agent IS the logo. ────────────── */}
      <div className="flex items-center justify-between gap-2 border-b border-ink-200 bg-paper-raised px-4 py-3">
        <Link
          href="/"
          className="flex items-center gap-2 text-ink-900"
        >
          {/* `captured` keys the snap animation; `live` keeps the lens
              gently pulsing while the recording is in progress. */}
          <AgentMark
            size={22}
            captureKey={captured}
            live={!completed}
            className="text-vermillion-500"
          />
          <span className="text-[14px] font-semibold tracking-tight">
            AgentClip
          </span>
        </Link>
        <span
          aria-hidden="true"
          className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.14em] text-vermillion-700"
        >
          <span
            className={cn(
              'inline-block size-1.5 rounded-full bg-vermillion-500',
              !completed && 'animate-pulse',
            )}
          />
          Live
        </span>
      </div>

      {/* ── Slot stack ────────────────────────────────────── */}
      <ol className="flex flex-col gap-2 px-3 py-3" role="list">
        {slides.map((slide) => (
          <li key={slide.id} className="list-none">
            <SlotCard
              slide={slide}
              filled={capturedIds.has(slide.id)}
              registerSlot={registerSlot}
              reduce={reduce ?? false}
            />
          </li>
        ))}
      </ol>

      {/* ── Walkthrough CTA ───────────────────────────────── */}
      <div className="border-t border-ink-200 px-3 py-3">
        {completed ? (
          <Link
            href={walkthroughHref}
            className={cn(
              'group flex w-full items-center justify-between gap-2 rounded-[8px] px-3 py-2',
              'bg-vermillion-500 text-paper shadow-[0_8px_22px_-12px_rgba(217,72,36,0.65)]',
              'transition-transform duration-200 ease-out hover:-translate-y-px',
              !reduce && 'animate-[pulse_2.4s_ease-in-out_infinite]',
            )}
          >
            <span className="text-[12px] font-medium tracking-tight">
              Your walkthrough
            </span>
            <ArrowRight aria-hidden="true" className="size-3.5" />
          </Link>
        ) : (
          <div
            aria-live="polite"
            className="flex items-center justify-between gap-2 rounded-[8px] border border-dashed border-ink-300 px-3 py-2 text-[12px] text-ink-500"
          >
            <span>
              Clipped{' '}
              <span className="font-mono tabular-nums text-ink-700">
                {String(captured).padStart(2, '0')}
              </span>
              <span className="text-ink-300"> / </span>
              <span className="font-mono tabular-nums">
                {String(total).padStart(2, '0')}
              </span>
            </span>
            <ArrowRight aria-hidden="true" className="size-3.5 opacity-30" />
          </div>
        )}
      </div>
    </aside>
  )
}

/* ── Slot card ────────────────────────────────────────────── */

function SlotCard({
  slide,
  filled,
  registerSlot,
  reduce,
}: {
  slide: { id: string; thumbnailUrl: string; caption: string; position: number }
  filled: boolean
  registerSlot: (id: string, node: HTMLElement | null) => void
  reduce: boolean
}) {
  const positionLabel = String(slide.position).padStart(2, '0')
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    registerSlot(slide.id, ref.current)
    return () => registerSlot(slide.id, null)
  }, [slide.id, registerSlot])

  return (
    <div
      ref={ref}
      className={cn(
        'relative w-full overflow-hidden rounded-[8px] transition-all duration-300',
        filled
          ? 'border border-ink-200 bg-paper'
          : 'border border-dashed border-ink-300/70 bg-paper/60',
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
            transition={{ duration: 0.45, ease: [0.2, 0.7, 0.2, 1] }}
            src={slide.thumbnailUrl}
            alt=""
            loading="lazy"
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-[10px] italic text-ink-400">
            awaiting
          </div>
        )}
      </div>
      {filled && (
        <p className="line-clamp-2 px-2 py-1.5 text-[10.5px] leading-snug text-ink-700">
          {slide.caption}
        </p>
      )}
    </div>
  )
}
