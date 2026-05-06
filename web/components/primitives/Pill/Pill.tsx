import { forwardRef, type HTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

/**
 * The hero pill ("v0.1 · open source"). 42px radius, ink-100 border,
 * paper-raised background — same Slite-derived chip used on the home
 * mockup. Display only; not an interactive control.
 */
export const Pill = forwardRef<HTMLSpanElement, HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center gap-2 whitespace-nowrap',
        'rounded-[42px] border border-ink-200 bg-paper-raised',
        'px-3 py-1 text-xs font-medium tracking-tight text-ink-700',
        className,
      )}
      {...props}
    />
  ),
)
Pill.displayName = 'Pill'
