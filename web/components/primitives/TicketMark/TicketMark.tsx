import { cn } from '@/lib/utils'

export interface TicketMarkProps {
  /** Pixel height. Width auto-scales to keep the 8:5 ticket aspect. */
  size?: number
  /**
   * When true, the bottom-most perforation circle pulses vermillion to
   * indicate the page is "recording" itself. The home page uses this
   * via the RecordingProvider context so the navbar mark feels alive
   * while the hero animation is in flight.
   */
  recording?: boolean
  className?: string
  'aria-label'?: string
}

/**
 * AgentClip brand mark — Admit-One landscape ticket pictogram.
 *
 * Composition (32 × 20 viewBox, locked 8:5 aspect):
 * - rounded rectangle body filled with `currentColor` (parents recolor
 *   via Tailwind `text-*` utilities)
 * - four perforation circles cut through the body in the page-paper
 *   color so they read as physical punch-outs at any size — including
 *   navbar scale, where the previous dashed-line variant collapsed
 *   into an indistinguishable line at <20px
 *
 * Why circles, not dashes: dashes need pixels to read; circles read
 * at any zoom and look like real ticket perforation. They also evoke
 * the editorial "punched press card" pattern the rest of the site
 * leans into.
 */
export function TicketMark({
  size = 20,
  recording = false,
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
      {/* Four perforation punches reading top-to-bottom. r=0.95 keeps
          them visually present at 18px without crowding the body. */}
      <circle cx="11" cy="5.5" r="0.95" fill="var(--color-paper, #faf9f5)" />
      <circle cx="11" cy="9" r="0.95" fill="var(--color-paper, #faf9f5)" />
      <circle cx="11" cy="12.5" r="0.95" fill="var(--color-paper, #faf9f5)" />
      {/* Bottom punch doubles as the recording indicator. When `recording`
          is true it swaps to vermillion + pulses; otherwise renders
          identically to its three siblings. */}
      <circle
        cx="11"
        cy="16"
        r={recording ? 1.3 : 0.95}
        fill={
          recording
            ? 'var(--color-vermillion-500, #d94824)'
            : 'var(--color-paper, #faf9f5)'
        }
        className={recording ? 'animate-pulse' : undefined}
      />
    </svg>
  )
}
