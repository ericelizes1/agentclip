import { cn } from '@/lib/utils'

export interface AgentMarkProps {
  /** Pixel size of the square recorded-frame mark. */
  size?: number
  className?: string
  'aria-label'?: string
}

/**
 * AgentClip brand mark — a recorded-frame artifact.
 *
 * Composition (24 × 24 viewBox, built for navbar/favicons first):
 *   - paper-toned outer frame with a vermillion stroke
 *   - vermillion capture window inset inside the frame
 *   - a small paper "REC" dot cut out of the capture window to imply
 *     recording without turning the mark into a generic play button
 *   - two understated metadata bars along the bottom, so the icon
 *     reads as a filed artifact rather than a plain media tile
 *
 * The goal is "recorded technical proof" rather than "photo app."
 */
export function AgentMark({
  size = 22,
  className,
  'aria-label': ariaLabel,
}: AgentMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role={ariaLabel ? 'img' : undefined}
      aria-hidden={ariaLabel ? undefined : true}
      aria-label={ariaLabel}
      className={cn('inline-block', className)}
    >
      <rect
        x="1"
        y="1"
        width="22"
        height="22"
        rx="4"
        fill="var(--color-paper, #faf9f5)"
        stroke="currentColor"
        strokeWidth="2"
      />
      <rect
        x="4"
        y="4"
        width="16"
        height="10"
        rx="2"
        fill="currentColor"
      />
      <circle
        cx="17.25"
        cy="6.75"
        r="1.75"
        fill="var(--color-paper, #faf9f5)"
      />
      <rect
        x="5"
        y="17"
        width="8"
        height="1.5"
        rx="0.75"
        fill="var(--color-ink-300, #d1cfc5)"
      />
      <rect
        x="14.5"
        y="17"
        width="4.5"
        height="1.5"
        rx="0.75"
        fill="var(--color-vermillion-200, #f1b8a9)"
      />
    </svg>
  )
}
