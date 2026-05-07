'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

import { useViewfinder } from '@/components/patterns/PageViewfinder/PageViewfinder'
import { cn } from '@/lib/utils'

export interface AgentCharacterProps {
  className?: string
}

/**
 * The wiry agent: a faceless stick figure with a camera, floating in
 * the bottom-left corner of the viewport on lg+ screens. He's the
 * page's protagonist — the literal "agent" doing the recording.
 *
 * Idle: gentle vertical bob (3s loop) + occasional camera tilt.
 * Snap: when the page captures a slide (capturedIds grows), arms
 * raise, the lens flashes vermillion, the figure bounces once. Phase
 * 1 — does not yet route the captured photo through him.
 *
 * Hidden on mobile (< lg) and for prefers-reduced-motion users
 * (animation feels gimmicky without the bob; we render him still).
 */
export function AgentCharacter({ className }: AgentCharacterProps) {
  const reduce = useReducedMotion()
  const { capturedIds, slides } = useViewfinder()
  const captureCount = capturedIds.size
  const [snapKey, setSnapKey] = useState(0)
  const lastCountRef = useRef(captureCount)

  // Trigger a snap re-mount whenever capturedIds grows.
  useEffect(() => {
    if (captureCount > lastCountRef.current) {
      setSnapKey((k) => k + 1)
    }
    lastCountRef.current = captureCount
  }, [captureCount])

  // Don't render outside the viewfinder context (i.e., other pages).
  if (slides.length === 0) return null

  return (
    <motion.div
      aria-hidden="true"
      className={cn(
        'pointer-events-none fixed bottom-8 left-8 z-40 hidden lg:block',
        className,
      )}
      initial={{ y: 0 }}
      animate={reduce ? {} : { y: [0, -6, 0] }}
      transition={
        reduce
          ? {}
          : { duration: 3.2, repeat: Infinity, ease: 'easeInOut' }
      }
    >
      <Figure key={snapKey} reduce={reduce ?? false} />
    </motion.div>
  )
}

/* ── The wiry stick figure ────────────────────────────────────
   Each `snapKey` change re-mounts this component so the snap
   animation re-fires from t=0 without timeline trickery. */

function Figure({ reduce }: { reduce: boolean }) {
  // Snap timeline (no-op when reduce is true):
  //   t=0    arms at sides, camera in front of body
  //   t=0.18 arms raise to "hold camera up at eye level"
  //   t=0.36 lens flashes vermillion (a fast scale + opacity pulse)
  //   t=0.55 arms return to default

  return (
    <svg width="68" height="92" viewBox="0 0 68 92" fill="none">
      {/* HEAD — open circle, no face. Slight forward tilt suggests
          attention without anthropomorphizing. */}
      <motion.circle
        cx="34"
        cy="14"
        r="9"
        stroke="var(--color-ink-700, #3d3d3a)"
        strokeWidth="2"
        fill="var(--color-paper, #faf9f5)"
        initial={reduce ? false : { rotate: 0 }}
        animate={
          reduce
            ? {}
            : { rotate: [0, -3, 0, 3, 0] }
        }
        transition={
          reduce
            ? {}
            : { duration: 0.55, ease: [0.4, 0, 0.2, 1] }
        }
        style={{ transformOrigin: '34px 14px' }}
      />

      {/* BODY — straight line from head to hips */}
      <line
        x1="34"
        y1="23"
        x2="34"
        y2="50"
        stroke="var(--color-ink-700, #3d3d3a)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* ARMS — animate up on snap, then back to default */}
      <motion.line
        x1="34"
        y1="32"
        x2="22"
        y2="44"
        stroke="var(--color-ink-700, #3d3d3a)"
        strokeWidth="2"
        strokeLinecap="round"
        initial={reduce ? false : { rotate: 0 }}
        animate={
          reduce
            ? {}
            : { rotate: [0, -55, -55, 0] }
        }
        transition={
          reduce
            ? {}
            : { duration: 0.55, times: [0, 0.32, 0.65, 1], ease: 'easeOut' }
        }
        style={{ transformOrigin: '34px 32px' }}
      />
      <motion.line
        x1="34"
        y1="32"
        x2="46"
        y2="44"
        stroke="var(--color-ink-700, #3d3d3a)"
        strokeWidth="2"
        strokeLinecap="round"
        initial={reduce ? false : { rotate: 0 }}
        animate={
          reduce
            ? {}
            : { rotate: [0, 55, 55, 0] }
        }
        transition={
          reduce
            ? {}
            : { duration: 0.55, times: [0, 0.32, 0.65, 1], ease: 'easeOut' }
        }
        style={{ transformOrigin: '34px 32px' }}
      />

      {/* CAMERA — small rectangle in front of the body, with a lens
          dot. Translates upward on snap so it ends up "at eye level". */}
      <motion.g
        initial={reduce ? false : { y: 0 }}
        animate={
          reduce
            ? {}
            : { y: [0, -16, -16, 0] }
        }
        transition={
          reduce
            ? {}
            : { duration: 0.55, times: [0, 0.32, 0.65, 1], ease: 'easeOut' }
        }
      >
        <rect
          x="26"
          y="34"
          width="16"
          height="11"
          rx="1.5"
          stroke="var(--color-ink-700, #3d3d3a)"
          strokeWidth="1.6"
          fill="var(--color-paper-raised, #f0eee6)"
        />
        {/* Lens — flashes vermillion at the snap moment. */}
        <motion.circle
          cx="34"
          cy="39.5"
          r="2.4"
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
                  scale: [1, 1.3, 1.3, 1],
                }
          }
          transition={
            reduce
              ? {}
              : { duration: 0.55, times: [0, 0.36, 0.55, 1], ease: 'easeOut' }
          }
          style={{ transformOrigin: '34px 39.5px' }}
        />
      </motion.g>

      {/* LEGS */}
      <line
        x1="34"
        y1="50"
        x2="24"
        y2="76"
        stroke="var(--color-ink-700, #3d3d3a)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="34"
        y1="50"
        x2="44"
        y2="76"
        stroke="var(--color-ink-700, #3d3d3a)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}
