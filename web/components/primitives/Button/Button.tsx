import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { forwardRef, type ButtonHTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

/**
 * Three visual variants matching the locked design system:
 *
 * - `primary` — vermillion fill, asymmetric `0 0 8px 8px` radius
 *   (the Anthropic signature). The hero CTA on the home page.
 * - `ghost` — outlined pill, 42px radius (the Slite signature).
 *   Secondary CTA, "View source"-style links.
 * - `accent` — vermillion border on paper, used in the dark
 *   editorial card for high-contrast affordances.
 *
 * Sizes mirror the mockup: md is the default (h-11), sm for inline
 * affordances inside cards, lg for the home hero only.
 */
const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'font-medium tracking-tight transition-colors duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vermillion-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
    'disabled:pointer-events-none disabled:opacity-50',
  ],
  {
    variants: {
      variant: {
        primary:
          'bg-vermillion-500 text-paper hover:bg-vermillion-600 [border-radius:var(--radius-cta)]',
        ghost:
          'bg-paper text-ink-900 border border-ink-200 rounded-[42px] hover:bg-paper-raised',
        accent:
          'bg-paper text-vermillion-700 border border-vermillion-500 rounded-md hover:bg-vermillion-50',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-11 px-5 text-sm',
        lg: 'h-12 px-6 text-base',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Render as a child element (e.g. `<a>`) via Radix Slot. */
  asChild?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

export { buttonVariants }
