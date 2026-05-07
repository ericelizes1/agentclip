'use client'

import { motion, useMotionValue, useSpring, useReducedMotion } from 'framer-motion'
import {
  cloneElement,
  useRef,
  type MouseEvent,
  type ReactElement,
} from 'react'

export interface MagneticProps {
  /** The element to make magnetic. Should be a single React element. */
  children: ReactElement
  /**
   * Cursor-pull strength as a fraction of the cursor's offset from
   * the element center. 0.25–0.4 is a tasteful range; higher reads
   * as gimmicky.
   */
  strength?: number
}

/**
 * Wraps a child element so it gently follows the cursor on hover —
 * the Stripe / Apple "magnetic button" trick. Spring-loaded so the
 * motion feels alive (not linear). Snaps back to origin on mouse-
 * leave.
 *
 * Reduced-motion users get a no-op pass-through so the visual
 * affordance disappears without breaking the click target.
 */
export function Magnetic({ children, strength = 0.3 }: MagneticProps) {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLSpanElement | null>(null)

  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const springX = useSpring(x, { stiffness: 200, damping: 18, mass: 0.5 })
  const springY = useSpring(y, { stiffness: 200, damping: 18, mass: 0.5 })

  const onMove = (event: MouseEvent<HTMLSpanElement>) => {
    if (reduce || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    x.set((event.clientX - cx) * strength)
    y.set((event.clientY - cy) * strength)
  }

  const onLeave = () => {
    x.set(0)
    y.set(0)
  }

  if (reduce) return children

  return (
    <span
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="relative inline-block"
    >
      <motion.span
        style={{ x: springX, y: springY, display: 'inline-block' }}
      >
        {cloneElement(children)}
      </motion.span>
    </span>
  )
}
