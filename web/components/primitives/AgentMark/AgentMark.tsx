import { cn } from '@/lib/utils'

export interface AgentMarkProps {
  /** Pixel height. Width auto-scales to keep the 24:28 Polaroid aspect. */
  size?: number
  className?: string
  'aria-label'?: string
}

/**
 * AgentClip brand mark — a Polaroid silhouette.
 *
 * Brand system: everything is a polaroid. The hero embed is a tilted
 * polaroid; the navbar mark mirrors the same silhouette at chrome
 * scale. Visitors who scroll the page see the polaroid metaphor
 * reinforced at every level.
 *
 * Composition (24 × 28 viewBox, accurate to a Polaroid SX-70):
 *   - rounded outer frame (vermillion via `currentColor`; consumers
 *     recolor with Tailwind `text-*` utilities)
 *   - paper-toned image window, square, top-aligned
 *   - thick bottom band where the caption would be — implied by the
 *     inset position, not drawn separately
 */
export function AgentMark({
  size = 22,
  className,
  'aria-label': ariaLabel,
}: AgentMarkProps) {
  const width = (size * 24) / 28
  return (
    <svg
      width={width}
      height={size}
      viewBox="0 0 24 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role={ariaLabel ? 'img' : undefined}
      aria-hidden={ariaLabel ? undefined : true}
      aria-label={ariaLabel}
      className={cn('inline-block', className)}
    >
      {/* Polaroid frame — vermillion fill via currentColor. */}
      <rect
        x="1"
        y="1"
        width="22"
        height="26"
        rx="2.5"
        ry="2.5"
        fill="currentColor"
      />
      {/* Image window — paper-toned, square, top-aligned. The bottom
          band is the visual gap below this rect. */}
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="0.5"
        fill="var(--color-paper, #faf9f5)"
      />
    </svg>
  )
}
