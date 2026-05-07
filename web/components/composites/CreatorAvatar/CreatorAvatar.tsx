'use client'

import { Tooltip } from '@/components/primitives/Tooltip/Tooltip'
import { gradientFor } from '@/lib/gradient-avatar'
import { cn } from '@/lib/utils'

export interface CreatorAvatarProps {
  /** Display name. Used to derive initials and a deterministic gradient. */
  name: string
  /** Optional URL the avatar links to (portfolio, GitHub, LinkedIn). */
  url?: string
  /** Pixel size of the circle. Defaults to 36px to match an inline meta-row. */
  size?: number
  className?: string
}

/**
 * Circular gradient avatar with initials. Replaces the "By Eric Elizes"
 * text in the viewer's MetaRow with a richer visual signature — the same
 * name produces the same gradient every time, so a creator's clips read
 * as a consistent identity even across different slideshows.
 *
 * The full name is shown on hover via Radix Tooltip so the visual stays
 * compact but the credit is never lost.
 */
export function CreatorAvatar({ name, url, size = 36, className }: CreatorAvatarProps) {
  const { initials, gradient, text } = gradientFor(name)

  const circle = (
    <span
      aria-label={`By ${name}`}
      style={{
        width: size,
        height: size,
        background: gradient,
        color: text,
        fontSize: Math.round(size * 0.36),
      }}
      className={cn(
        'inline-flex items-center justify-center rounded-full font-semibold tracking-tight',
        'shadow-[var(--shadow-whisper)] ring-1 ring-black/5',
        'select-none tabular-nums',
        className,
      )}
    >
      {initials}
    </span>
  )

  const linked = url ? (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vermillion-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper rounded-full"
    >
      {circle}
    </a>
  ) : (
    circle
  )

  return (
    <Tooltip.Provider delayDuration={150}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>{linked}</Tooltip.Trigger>
        <Tooltip.Content sideOffset={6}>{name}</Tooltip.Content>
      </Tooltip.Root>
    </Tooltip.Provider>
  )
}
