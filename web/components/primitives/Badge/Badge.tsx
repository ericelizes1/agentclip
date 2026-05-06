import { cva, type VariantProps } from 'class-variance-authority'
import { forwardRef, type HTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  [
    'inline-flex items-center justify-center',
    'rounded-md px-2 py-0.5 text-xs font-medium tracking-tight',
    'tabular-nums',
  ],
  {
    variants: {
      tone: {
        accent: 'bg-vermillion-50 text-vermillion-700',
        neutral: 'bg-paper-raised text-ink-700',
        ink: 'bg-ink-900 text-paper',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
)

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, tone, ...props }, ref) => (
    <span ref={ref} className={cn(badgeVariants({ tone }), className)} {...props} />
  ),
)
Badge.displayName = 'Badge'

export { badgeVariants }
