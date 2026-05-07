'use client'

import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

import { TicketMark } from '@/components/primitives/TicketMark/TicketMark'
import { useViewfinder } from '@/components/patterns/PageViewfinder/PageViewfinder'
import { cn } from '@/lib/utils'

export interface AgentWidgetProps {
  /** URL the "Your walkthrough →" CTA links to once every slot is captured. */
  walkthroughHref: string
  className?: string
}

/**
 * The AgentClip "live capture" widget. A floating rounded rectangle
 * on the left side of the home page that contains:
 *
 *   1. Brand bar at top (AgentClip wordmark)
 *   2. Stage — the wiry agent character lives here. He bobs idly and
 *      raises his camera + flashes the lens whenever a slide captures.
 *   3. Slot stack — four thumbnail slots that fill as the visitor
 *      scrolls past each section of the page.
 *   4. Walkthrough CTA — dormant placeholder until all slots are
 *      captured, then morphs into a vermillion "Your walkthrough →"
 *      link.
 *
 * The agent's snap reaction is keyed to capturedIds.size so each new
 * capture re-mounts him and replays the animation from scratch.
 *
 * Lives outside the screen-card mental model — the page is now
 * full-bleed and this widget IS the brand surface on the home page.
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
        'flex w-[228px] flex-col overflow-hidden rounded-[18px]',
        'border border-ink-200 bg-paper',
        'shadow-[0_24px_56px_-24px_rgba(20,20,19,0.18),0_4px_14px_-6px_rgba(20,20,19,0.08)]',
        className,
      )}
    >
      {/* ── Brand bar ─────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2 border-b border-ink-200 bg-paper-raised px-3.5 py-2.5">
        <Link
          href="/"
          className="flex items-center gap-2 text-ink-900"
        >
          <TicketMark size={16} className="text-vermillion-500" />
          <span className="text-[13px] font-semibold tracking-tight">
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

      {/* ── Agent stage ───────────────────────────────────── */}
      <div className="relative h-[140px] overflow-hidden bg-paper-raised">
        {/* Floor line — gives the figure a place to stand. */}
        <div
          aria-hidden="true"
          className="absolute right-4 bottom-3 left-4 h-px bg-ink-200"
        />
        <AgentFigure
          captureKey={captured}
          completed={completed}
          reduce={reduce ?? false}
        />
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

/* ── The wiry agent ───────────────────────────────────────── */

function AgentFigure({
  captureKey,
  completed,
  reduce,
}: {
  captureKey: number
  completed: boolean
  reduce: boolean
}) {
  // The captureKey is used so each new capture re-mounts the figure
  // and replays the snap animation from t=0. When `completed`, the
  // agent strikes a "thumbs up" pose by holding the camera up a bit
  // higher and not coming back down.
  return (
    <motion.svg
      key={captureKey}
      width="76"
      height="100"
      viewBox="0 0 76 100"
      fill="none"
      className="absolute right-1/2 bottom-2 translate-x-1/2"
      initial={reduce ? false : { y: 0 }}
      animate={
        reduce
          ? {}
          : {
              y: [0, -3, 0, -1, 0],
            }
      }
      transition={
        reduce
          ? {}
          : {
              duration: 3.4,
              repeat: Infinity,
              ease: 'easeInOut',
            }
      }
    >
      {/* Head */}
      <motion.circle
        cx="38"
        cy="18"
        r="9"
        stroke="var(--color-ink-700, #3d3d3a)"
        strokeWidth="2"
        fill="var(--color-paper, #faf9f5)"
        initial={reduce ? false : { rotate: 0 }}
        animate={reduce ? {} : { rotate: [0, -5, 0, 4, 0] }}
        transition={
          reduce ? {} : { duration: 0.6, ease: [0.4, 0, 0.2, 1] }
        }
        style={{ transformOrigin: '38px 18px' }}
      />

      {/* Body */}
      <line
        x1="38"
        y1="27"
        x2="38"
        y2="58"
        stroke="var(--color-ink-700, #3d3d3a)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Arms — raise to hold camera up, then return (or stay up if completed) */}
      <motion.line
        x1="38"
        y1="36"
        x2="24"
        y2="50"
        stroke="var(--color-ink-700, #3d3d3a)"
        strokeWidth="2"
        strokeLinecap="round"
        initial={reduce ? false : { rotate: 0 }}
        animate={
          reduce
            ? {}
            : completed
              ? { rotate: -65 }
              : { rotate: [0, -60, -60, 0] }
        }
        transition={
          reduce
            ? {}
            : completed
              ? { duration: 0.5, ease: [0.4, 0, 0.2, 1] }
              : { duration: 0.65, times: [0, 0.32, 0.62, 1], ease: 'easeOut' }
        }
        style={{ transformOrigin: '38px 36px' }}
      />
      <motion.line
        x1="38"
        y1="36"
        x2="52"
        y2="50"
        stroke="var(--color-ink-700, #3d3d3a)"
        strokeWidth="2"
        strokeLinecap="round"
        initial={reduce ? false : { rotate: 0 }}
        animate={
          reduce
            ? {}
            : completed
              ? { rotate: 65 }
              : { rotate: [0, 60, 60, 0] }
        }
        transition={
          reduce
            ? {}
            : completed
              ? { duration: 0.5, ease: [0.4, 0, 0.2, 1] }
              : { duration: 0.65, times: [0, 0.32, 0.62, 1], ease: 'easeOut' }
        }
        style={{ transformOrigin: '38px 36px' }}
      />

      {/* Camera — translates upward on snap */}
      <motion.g
        initial={reduce ? false : { y: 0 }}
        animate={
          reduce
            ? {}
            : completed
              ? { y: -18 }
              : { y: [0, -18, -18, 0] }
        }
        transition={
          reduce
            ? {}
            : completed
              ? { duration: 0.5, ease: [0.4, 0, 0.2, 1] }
              : { duration: 0.65, times: [0, 0.32, 0.62, 1], ease: 'easeOut' }
        }
      >
        <rect
          x="29"
          y="40"
          width="18"
          height="12"
          rx="2"
          stroke="var(--color-ink-700, #3d3d3a)"
          strokeWidth="1.6"
          fill="var(--color-paper, #faf9f5)"
        />
        {/* Lens dot — flashes vermillion on snap */}
        <motion.circle
          cx="38"
          cy="46"
          r="2.6"
          initial={reduce ? false : { fill: 'var(--color-ink-700, #3d3d3a)', scale: 1 }}
          animate={
            reduce
              ? {}
              : {
                  fill: [
                    'var(--color-ink-700, #3d3d3a)',
                    'var(--color-vermillion-500, #d94824)',
                    'var(--color-vermillion-500, #d94824)',
                    'var(--color-ink-700, #3d3d3a)',
                  ],
                  scale: [1, 1.35, 1.35, 1],
                }
          }
          transition={
            reduce
              ? {}
              : { duration: 0.65, times: [0, 0.36, 0.55, 1], ease: 'easeOut' }
          }
          style={{ transformOrigin: '38px 46px' }}
        />
      </motion.g>

      {/* Legs */}
      <line
        x1="38"
        y1="58"
        x2="28"
        y2="86"
        stroke="var(--color-ink-700, #3d3d3a)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="38"
        y1="58"
        x2="48"
        y2="86"
        stroke="var(--color-ink-700, #3d3d3a)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </motion.svg>
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
