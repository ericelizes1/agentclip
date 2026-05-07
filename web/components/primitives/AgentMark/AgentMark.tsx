'use client'

import { motion, useReducedMotion } from 'framer-motion'

import { cn } from '@/lib/utils'

export interface AgentMarkProps {
  /** Pixel height. Width auto-scales to keep the 4:3 aspect. */
  size?: number
  /**
   * When this number changes, the mark replays the snap animation
   * (lens flashes vermillion, the body does a tiny vertical bounce).
   * Drive this from a capture counter so each new capture re-triggers.
   * When omitted, the mark is fully static.
   */
  captureKey?: number
  /**
   * When true, the lens-eye stays lit vermillion and pulses softly to
   * indicate the page is "live" / recording. Independent of captureKey.
   */
  live?: boolean
  className?: string
  'aria-label'?: string
}

/**
 * AgentClip brand mark — a friendly camera character.
 *
 * Composition (32 × 24 viewBox):
 *   - a rounded "camera body" rectangle (currentColor, parents recolor
 *     via Tailwind `text-*` utilities)
 *   - a small dome/head on top center, suggesting the agent operating
 *     the camera — gives the otherwise-generic camera a face
 *   - a vermillion lens "eye" in the middle of the body
 *
 * Replaces the prior `TicketMark` for surfaces where AgentClip wants
 * its mark to feel alive (the AgentWidget, the navbar). The character
 * is part of the lockup itself, not a separate animated figure.
 */
export function AgentMark({
  size = 22,
  captureKey,
  live = false,
  className,
  'aria-label': ariaLabel,
}: AgentMarkProps) {
  const reduce = useReducedMotion()
  const width = (size * 32) / 24

  return (
    <motion.svg
      key={captureKey}
      width={width}
      height={size}
      viewBox="0 0 32 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role={ariaLabel ? 'img' : undefined}
      aria-hidden={ariaLabel ? undefined : true}
      aria-label={ariaLabel}
      className={cn('inline-block', className)}
      initial={reduce || captureKey === undefined ? false : { y: 0 }}
      animate={
        reduce || captureKey === undefined
          ? {}
          : { y: [0, -2, 0, -1, 0] }
      }
      transition={
        reduce || captureKey === undefined
          ? {}
          : { duration: 0.55, times: [0, 0.32, 0.6, 0.78, 1], ease: 'easeOut' }
      }
    >
      {/* Head dome — the agent's silhouette peeking above the camera. */}
      <path
        d="M 12 4 Q 16 0 20 4 L 20 7 L 12 7 Z"
        fill="currentColor"
      />

      {/* Camera body — the reference to the ticket lineage, reinterpreted. */}
      <rect
        x="2"
        y="6"
        width="28"
        height="16"
        rx="3"
        ry="3"
        fill="currentColor"
      />

      {/* Lens iris (paper-colored ring) sets off the vermillion pupil. */}
      <circle cx="16" cy="14" r="4.5" fill="var(--color-paper, #faf9f5)" />

      {/* Lens pupil — vermillion. Pulses softly when `live`, flashes
          brighter on each captureKey change. */}
      <motion.circle
        cx="16"
        cy="14"
        r="2.6"
        initial={
          reduce || captureKey === undefined
            ? false
            : { scale: 1 }
        }
        animate={
          reduce || captureKey === undefined
            ? {}
            : { scale: [1, 1.45, 1.45, 1] }
        }
        transition={
          reduce || captureKey === undefined
            ? {}
            : { duration: 0.55, times: [0, 0.3, 0.55, 1], ease: 'easeOut' }
        }
        style={{ transformOrigin: '16px 14px' }}
        fill="var(--color-vermillion-500, #d94824)"
        className={live && !reduce ? 'animate-pulse' : undefined}
      />

      {/* Tiny shutter button on the camera's top-right — texture detail. */}
      <rect
        x="24"
        y="3"
        width="3"
        height="3"
        rx="0.5"
        fill="currentColor"
      />
    </motion.svg>
  )
}
