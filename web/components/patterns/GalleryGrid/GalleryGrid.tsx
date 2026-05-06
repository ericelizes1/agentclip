import { ClipCard, type ClipCardProps } from '@/components/composites/ClipCard/ClipCard'
import { cn } from '@/lib/utils'

export interface GalleryClip extends ClipCardProps {
  /** Stable list key — share_token is unique and URL-safe. */
  shareToken: string
}

export interface GalleryGridProps {
  /** Curated clips from `/api/v1/gallery/`; empty array renders the empty state. */
  clips: GalleryClip[]
  className?: string
}

/**
 * Responsive 1/2/3-column gallery. Empty array renders the dashed
 * placeholder mirroring the pre-pivot Django home — the user
 * facing message is "No clips yet" rather than nothing at all so
 * an empty deploy reads as intentional, not broken.
 */
export function GalleryGrid({ clips, className }: GalleryGridProps) {
  if (clips.length === 0) {
    return (
      <div
        role="status"
        aria-live="polite"
        className={cn(
          'flex min-h-[200px] items-center justify-center rounded-[14px] border border-dashed border-ink-300 bg-paper-raised p-10 text-center text-sm text-ink-500',
          className,
        )}
      >
        No clips yet — your first agent run starts here.
      </div>
    )
  }

  return (
    <ul
      className={cn(
        'grid gap-5',
        'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        className,
      )}
    >
      {clips.map((clip) => (
        <li key={clip.shareToken}>
          <ClipCard {...clip} />
        </li>
      ))}
    </ul>
  )
}
