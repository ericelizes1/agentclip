import { cva, type VariantProps } from 'class-variance-authority'
import { forwardRef, type HTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

/**
 * Card surface used for the gallery grid wrappers and the summary
 * callout. Three elevations matching the locked thermal layers:
 *
 * - `flat` — no shadow, ink-200 hairline border (default for grids)
 * - `raised` — Slite three-layer whisper shadow (hover state, hero)
 * - `dark` — paper-dark inversion for the editorial card variant
 */
const cardVariants = cva(
  ['rounded-[14px] border border-ink-200 bg-paper-raised text-ink-900'],
  {
    variants: {
      elevation: {
        flat: '',
        raised: 'shadow-[var(--shadow-whisper)]',
        dark: 'border-ink-800 bg-paper-dark text-paper',
      },
    },
    defaultVariants: { elevation: 'flat' },
  },
)

export interface CardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, elevation, ...props }, ref) => (
    <div ref={ref} className={cn(cardVariants({ elevation }), className)} {...props} />
  ),
)
Card.displayName = 'Card'

export { cardVariants }
