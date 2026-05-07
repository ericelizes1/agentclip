'use client'

import Link from 'next/link'

import { CreatorAvatar } from '@/components/composites/CreatorAvatar/CreatorAvatar'
import { cn } from '@/lib/utils'

export interface CreatorChipProps {
  /** Display name. Drives both the initials avatar and the visible label. */
  name: string
  /** Optional URL the chip links to (portfolio, GitHub, LinkedIn). */
  url?: string
  /**
   * Visual size. `sm` for inline footers (e.g. HeroPreview meta row),
   * `md` (default) for clip headers, `lg` for landing-page emphasis.
   */
  size?: 'sm' | 'md' | 'lg'
  /**
   * When true, prefixes the name with "By " (natural English credit).
   * Default false — chips next to other meta read cleaner without it.
   */
  byline?: boolean
  /**
   * When true, hides the visible name and renders only the avatar.
   * Useful in tight rows where the tooltip is enough.
   */
  avatarOnly?: boolean
  className?: string
}

const SIZE = {
  sm: { avatar: 24, gap: 'gap-2', text: 'text-xs', weight: 'font-medium' },
  md: { avatar: 32, gap: 'gap-2.5', text: 'text-sm', weight: 'font-medium' },
  lg: { avatar: 40, gap: 'gap-3', text: 'text-base', weight: 'font-semibold' },
} as const

/**
 * Canonical creator credit. ONE widget, used everywhere a clip is
 * attributed to a person — HeroPreview footer, ClipViewer header,
 * gallery cards, anywhere else.
 *
 * Composition: deterministic gradient avatar with initials (from
 * CreatorAvatar) + the name as a label, optionally wrapped in a link
 * to the creator's portfolio. The tooltip on the avatar still carries
 * the full name for surfaces that opt into `avatarOnly`.
 *
 * Same name → same gradient → same visual signature for a creator
 * across every clip and every surface.
 */
export function CreatorChip({
  name,
  url,
  size = 'md',
  byline = false,
  avatarOnly = false,
  className,
}: CreatorChipProps) {
  if (!name.trim()) return null
  const sz = SIZE[size]
  const label = byline ? `By ${name}` : name

  // Avatar + label as a single unit. When `url` is set we wrap the
  // whole chip in a link so the entire widget is the click target —
  // not just the circle. CreatorAvatar still gets the tooltip.
  const inner = (
    <span className={cn('inline-flex items-center', sz.gap)}>
      <CreatorAvatar
        name={name}
        // Avatar's own link wrapper is suppressed when the chip itself
        // wraps in a link (avoids nested <a>).
        {...(url && avatarOnly ? { url } : {})}
        size={sz.avatar}
      />
      {!avatarOnly && (
        <span
          className={cn(
            sz.text,
            sz.weight,
            'tracking-tight text-ink-800',
            url && 'transition-colors group-hover:text-vermillion-600',
          )}
        >
          {label}
        </span>
      )}
    </span>
  )

  if (avatarOnly) {
    return <span className={cn('inline-flex', className)}>{inner}</span>
  }

  if (url) {
    const isExternal = /^https?:\/\//.test(url)
    const linkClass = cn(
      'group inline-flex items-center rounded-full',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vermillion-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
      className,
    )
    return isExternal ? (
      <a href={url} target="_blank" rel="noopener noreferrer" className={linkClass}>
        {inner}
      </a>
    ) : (
      <Link href={url} className={linkClass}>
        {inner}
      </Link>
    )
  }

  return (
    <span className={cn('inline-flex items-center', className)}>{inner}</span>
  )
}
