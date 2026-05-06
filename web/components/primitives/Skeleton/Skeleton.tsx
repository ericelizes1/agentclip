'use client'

import { useReducedMotion } from 'framer-motion'
import { forwardRef, type HTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

/**
 * Loading placeholder used by the gallery grid while clips fetch.
 * Pulse animation is disabled for users with `prefers-reduced-motion`
 * — same hook the Smoke story used to satisfy WCAG 2.3.3.
 */
export const Skeleton = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const prefersReducedMotion = useReducedMotion()
    return (
      <div
        ref={ref}
        aria-hidden="true"
        className={cn(
          'rounded-md bg-paper-raised',
          prefersReducedMotion ? '' : 'animate-pulse',
          className,
        )}
        {...props}
      />
    )
  },
)
Skeleton.displayName = 'Skeleton'
