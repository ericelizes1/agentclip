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
    <Card elevation="flat" className={cn('overflow-hidden transition-shadow hover:shadow-[var(--shadow-whisper)]', className)}>
      <Link
        href={`/s/${shareToken}`}
        className="flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vermillion-500"
      >
        <div className="relative aspect-[16/9] bg-paper-oat">
          {coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- absolute Spaces URL
            <img
              src={coverImageUrl}
              alt=""
              loading="lazy"
              className="size-full object-cover"
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
        </div>
        <div className="space-y-1 p-4">
          <h3 className="line-clamp-1 text-base font-medium tracking-tight text-ink-900">
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
