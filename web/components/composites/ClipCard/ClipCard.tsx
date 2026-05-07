import Link from 'next/link'

import { Badge } from '@/components/primitives/Badge/Badge'
import { Card } from '@/components/primitives/Card/Card'
import { cn } from '@/lib/utils'

export interface ClipCardProps {
  /** Public share token (the URL-safe slug). */
  shareToken: string
  /** Slideshow title. May be empty for untitled drafts. */
  title: string
  /** Short description; truncated by the layout if long. */
  description?: string
  /** Cover image URL — usually the first slide. May be missing. */
  coverImageUrl?: string | null
  /** Pretty rendering hint, e.g. "7 clips · Mar 14". */
  meta?: string
  className?: string
}

/**
 * Gallery item. Renders a thumbnail-on-paper card that links to
 * `/s/<share_token>/`. Mirrors the curation feed shape exposed by
 * the API (`GallerySlideshowSerializer`) so a slideshow row maps
 * cleanly without an intermediate adapter on the consumer side.
 */
export function ClipCard({
  shareToken,
  title,
  description,
  coverImageUrl,
  meta,
  className,
}: ClipCardProps) {
  return (
    <Card
      elevation="flat"
      className={cn(
        'group/clip overflow-hidden transition-all duration-200 ease-out',
        'hover:-translate-y-0.5 hover:border-ink-300 hover:shadow-[0_18px_40px_-22px_rgba(20,20,19,0.18)]',
        className,
      )}
    >
      <Link
        href={`/s/${shareToken}`}
        className="flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vermillion-500"
      >
        <div className="relative aspect-[16/9] overflow-hidden bg-paper-oat">
          {coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- absolute Spaces URL
            <img
              src={coverImageUrl}
              alt=""
              loading="lazy"
              className="size-full object-cover transition-transform duration-500 ease-out group-hover/clip:scale-[1.04]"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-xs text-ink-500">
              No cover
            </div>
          )}
          {meta && (
            <Badge tone="ink" className="absolute left-3 top-3">
              {meta}
            </Badge>
          )}
          {/*
            Hover-only camera-corner ticks — small vermillion L-marks
            at the four inner corners of the cover image, fading in
            on hover. Callback to the AgentMark / camera identity:
            hovering a clip "frames" it through the lens.
          */}
          <CornerTick position="top-left" />
          <CornerTick position="top-right" />
          <CornerTick position="bottom-left" />
          <CornerTick position="bottom-right" />
        </div>
        <div className="space-y-1 p-4">
          <h3 className="line-clamp-1 text-base font-medium tracking-tight text-ink-900 transition-colors group-hover/clip:text-vermillion-700">
            {title || 'Untitled'}
          </h3>
          {description && (
            <p className="line-clamp-2 text-sm text-ink-600">{description}</p>
          )}
        </div>
      </Link>
    </Card>
  )
}

function CornerTick({
  position,
}: {
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
}) {
  const placement = {
    'top-left': 'top-2 left-2',
    'top-right': 'top-2 right-2',
    'bottom-left': 'bottom-2 left-2',
    'bottom-right': 'bottom-2 right-2',
  }[position]
  const rotation = {
    'top-left': 0,
    'top-right': 90,
    'bottom-right': 180,
    'bottom-left': 270,
  }[position]
  return (
    <span
      aria-hidden="true"
      style={{ transform: `rotate(${rotation}deg)` }}
      className={cn(
        'pointer-events-none absolute z-10 opacity-0 transition-opacity duration-200',
        'group-hover/clip:opacity-100',
        placement,
      )}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path
          d="M2 8 L2 2 L8 2"
          stroke="var(--color-vermillion-500, #d94824)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </span>
  )
}
