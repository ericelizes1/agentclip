/**
 * _Smoke — dependency-pipeline smoke test.
 *
 * Renders one icon from each loaded icon library plus a framer-motion
 * fade-up so Unit 8's primitives can pull from these dependencies
 * confidently. The component never ships to users; Unit 8 deletes
 * this folder when the real primitives land.
 *
 * The leading-underscore folder name signals "build-internal, not
 * part of the design system" — same convention as `_TestStub`.
 */
'use client'

import { SiGithub } from '@icons-pack/react-simple-icons'
import { motion, useReducedMotion } from 'framer-motion'
import { Sparkles } from 'lucide-react'

export interface SmokeProps {
  /** Visible label so the test can assert against rendered text. */
  label: string
}

export function Smoke({ label }: SmokeProps) {
  // Honor the OS-level "reduce motion" setting so the smoke story
  // doesn't trip addon-a11y on the WCAG 2.3.3 (Animation from
  // Interactions) check. Real primitives in Unit 8 use the same hook.
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.4 }}
      className="flex items-center gap-3 rounded-md border border-ink-100 bg-paper px-4 py-2 text-ink"
    >
      <Sparkles aria-hidden="true" className="size-4 text-vermillion-500" />
      <SiGithub aria-hidden="true" className="size-4" />
      <span>{label}</span>
    </motion.div>
  )
}
