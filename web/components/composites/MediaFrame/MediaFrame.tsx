import { Pause, Play } from 'lucide-react'

import { Badge } from '@/components/primitives/Badge/Badge'
import { cn } from '@/lib/utils'

export type MediaKind = 'image' | 'video'

export interface MediaFrameProps {
  /** Per the API: 'image' for png/jpg/gif/webp, 'video' for mp4/webm. */
  mediaKind: MediaKind
  /** Absolute or relative media URL (the API emits absolute URLs). */
  src: string
  /** Visible alt text for images; aria-label for video frames. */
  alt: string
  /**
   * 1-indexed slide position; rendered into the corner badge so the
   * viewer's deck reads as "01 / 02 / 03 …" while scrolling.
   */
  position: number
  /**
   * When true, the corner position badge is omitted. Used by the
   * home-page hero embed where the right-rail capture stack already
   * carries the slide number — rendering it on the embed too is
   * redundant.
   */
  hideBadge?: boolean
  className?: string
}

/**
 * Branches on `mediaKind` and renders either an `<img>` or a
 * `<video controls preload="metadata">`. The corner badge mirrors
 * the icon + position pattern from the locked viewer mockup
 * ("▸ 01" for image clips, "▶ 02" for video clips).
 */
export function MediaFrame({
  mediaKind,
  src,
  alt,
  position,
  hideBadge,
  className,
}: MediaFrameProps) {
  return (
    <figure
      className={cn(
        'relative overflow-hidden rounded-[14px] border border-ink-200 bg-paper-raised',
        className,
      )}
    >
      {!hideBadge && (
        <Badge tone="ink" className="absolute left-3 top-3 z-10 gap-1">
          {mediaKind === 'video' ? (
            <Play aria-hidden="true" className="size-3" />
          ) : (
            <Pause aria-hidden="true" className="size-3" />
          )}
          {String(position).padStart(2, '0')}
        </Badge>
      )}

      {mediaKind === 'video' ? (
        <video
          src={src}
          aria-label={alt}
          controls
          preload="metadata"
          playsInline
          muted
          className="block w-full"
        />
      ) : (
        // The API delivers absolute Spaces URLs; next/image's optimizer
        // is wasted work for already-CDN'd assets.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="block w-full" loading="lazy" />
      )}
    </figure>
  )
}
