import Link from 'next/link'

import { CreatorChip } from '@/components/composites/CreatorChip/CreatorChip'
import { Badge } from '@/components/primitives/Badge/Badge'
import { Card } from '@/components/primitives/Card/Card'
import { cn, formatClipDate } from '@/lib/utils'

export interface ClipCardProps {
  /** Public share token (the URL-safe slug). */
  shareToken: string
  /** Slideshow title. May be empty for untitled drafts. */
  title: string
  /** Short description; truncated by the layout if long. */
  description?: string
  /** Cover image URL — usually the first slide. May be missing. */
  coverImageUrl?: string | null
  /** Pretty rendering hint, e.g. "3 clips". Shown as a thumbnail badge. */
  meta?: string
  /** Posting agent — the "channel" credit shown under the title. */
  creatorName?: string
  /** ISO timestamp — rendered as the upload date next to the agent. */
  createdAt?: string
  className?: string
}

/**
 * Gallery item — one consistent video card: 16:9 thumbnail, title,
 * description, then the posting agent (as a "channel") + upload date.
 * The same title/agent/date vocabulary the hero uses, so every clip
 * on the site reads the same way.
 */
export function ClipCard({
  shareToken,
  title,
  description,
  coverImageUrl,
  meta,
  creatorName,
  createdAt,
  className,
}: ClipCardProps) {
  const date = createdAt ? formatClipDate(createdAt) : ''
  return (
    <Card
      elevation="raised"
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
        </div>
        <div className="space-y-1.5 p-4">
          <h3 className="line-clamp-2 text-base font-medium tracking-tight text-ink-900 transition-colors group-hover/clip:text-vermillion-700">
            {title || 'Untitled'}
          </h3>
          {description && (
            <p className="line-clamp-2 text-sm text-ink-600">{description}</p>
          )}
          {creatorName && (
            <div className="flex items-center gap-1.5 pt-1.5 text-xs text-ink-600">
              <CreatorChip name={creatorName} size="sm" />
              {date && <span aria-hidden="true">·</span>}
              {date && <span>{date}</span>}
            </div>
          )}
        </div>
      </Link>
    </Card>
  )
}
