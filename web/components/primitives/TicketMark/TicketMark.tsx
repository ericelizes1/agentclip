import { cn } from '@/lib/utils'

export interface TicketMarkProps {
  /** Pixel height. Width auto-scales to keep the 8:5 ticket aspect. */
  size?: number
  className?: string
  'aria-label'?: string
}

/**
 * AgentClip brand mark — Admit-One landscape ticket pictogram.
 *
 * Two stacked elements compose the ticket:
 * - rounded rectangle body filled with `currentColor` (the parent
 *   recolors the mark via Tailwind text-* utilities)
 * - a vertical dashed perforation line in the page background color
 *   (`var(--color-paper)`) so it reads as a tear seam through the
 *   ticket body regardless of background context
 *
 * The shape locks at an 8:5 aspect (32 × 20 viewBox) so it scales
 * cleanly from the navbar (size=20) up to the favicon (size=64+).
 * Perforation sits at x=11 — about a third in — so the left "stub"
 * reads as the smaller piece and the body as the main artifact.
 */
export function TicketMark({
  size = 20,
  className,
  'aria-label': ariaLabel,
}: TicketMarkProps) {
  const width = (size * 32) / 20
  return (
    <svg
      width={width}
      height={size}
      viewBox="0 0 32 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role={ariaLabel ? 'img' : undefined}
      aria-hidden={ariaLabel ? undefined : true}
      aria-label={ariaLabel}
      className={cn('inline-block', className)}
    >
      <rect
        x="1"
        y="2"
        width="30"
        height="16"
        rx="2.5"
        ry="2.5"
        fill="currentColor"
      />
      <line
        x1="11"
        y1="3.5"
        x2="11"
        y2="16.5"
        stroke="var(--color-paper, #FAF7F2)"
        strokeWidth="0.9"
        strokeDasharray="1.2 1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}
