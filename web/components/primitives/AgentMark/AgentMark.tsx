import { cn } from '@/lib/utils'

export interface AgentMarkProps {
  /** Pixel height. Width auto-scales to keep the 24:30 Polaroid aspect. */
  size?: number
  className?: string
  'aria-label'?: string
}

/**
 * AgentClip brand mark — a Polaroid silhouette.
 *
 * Brand system: everything is a polaroid. The hero embed is a tilted
 * polaroid; the navbar mark mirrors the same silhouette at chrome
 * scale.
 *
 * Composition (24 × 30 viewBox, exaggerated proportions for small-
 * size legibility):
 *   - paper-toned outer frame with a vermillion stroke (the polaroid
 *     border)
 *   - vermillion image window, square, top-aligned (the "captured
 *     photo")
 *   - thick bottom band where a caption would be written, with a
 *     subtle ink-toned stroke that reads as handwritten text
 *
 * Colors are inverted vs. a naive "tinted-rectangle" approach: the
 * captured image is the colorful element (vermillion), the frame
 * itself is paper. This is what makes the silhouette read as a
 * polaroid rather than a generic rounded square.
 */
export function AgentMark({
  size = 22,
  className,
  'aria-label': ariaLabel,
}: AgentMarkProps) {
  const width = (size * 24) / 30
  return (
    <svg
      width={width}
      height={size}
      viewBox="0 0 24 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role={ariaLabel ? 'img' : undefined}
      aria-hidden={ariaLabel ? undefined : true}
      aria-label={ariaLabel}
      className={cn('inline-block', className)}
    >
      {/* Polaroid frame — paper fill with vermillion stroke. The
          stroke uses currentColor so consumers can recolor via
          Tailwind text-* utilities (the same pattern as before). */}
      <rect
        x="1"
        y="1"
        width="22"
        height="28"
        rx="2"
        ry="2"
        fill="var(--color-paper, #faf9f5)"
        stroke="currentColor"
        strokeWidth="2"
      />
      {/* Captured image — vermillion fill, top-aligned. */}
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="0.5"
        fill="currentColor"
      />
      {/* Caption line — subtle ink-toned stroke in the bottom band so
          the white-space below the image reads as "writing surface"
          rather than empty filler. */}
      <rect
        x="5"
        y="25"
        width="14"
        height="1"
        rx="0.5"
        fill="var(--color-ink-300, #d1cfc5)"
      />
    </svg>
  )
}
