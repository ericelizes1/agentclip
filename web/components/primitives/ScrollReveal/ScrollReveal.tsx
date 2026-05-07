'use client'

import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'

export interface ScrollRevealProps {
  children: ReactNode
  /** Delay before this reveal triggers, in seconds. */
  delay?: number
  /** Translate distance during reveal, in pixels. */
  distance?: number
  /** Duration of the reveal animation, in seconds. */
  duration?: number
  className?: string
}

/**
 * Subtle fade-up-on-intersection wrapper. Reveals once when the
 * element first enters the viewport, then locks (no re-trigger on
 * scroll-up). Respects prefers-reduced-motion — collapses to a
 * static render when the user has opted out.
 *
 * Cheaper than IntersectionObserver-by-hand: framer-motion's
 * `whileInView` already debounces and uses the viewport observer.
 */
export function ScrollReveal({
  children,
  delay = 0,
  distance = 16,
  duration = 0.55,
  className,
}: ScrollRevealProps) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: distance }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration, delay, ease: [0.2, 0.7, 0.2, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
