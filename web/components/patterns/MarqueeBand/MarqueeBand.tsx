'use client'

import Link from 'next/link'

import { CreatorChip } from '@/components/composites/CreatorChip/CreatorChip'
import { cn, formatClipDate } from '@/lib/utils'

export interface MarqueeClip {
  shareToken: string
  title: string
  description?: string | undefined
  coverImageUrl?: string | null | undefined
  /** Posting agent — the "channel" credit. */
  creatorName?: string | undefined
  /** ISO timestamp — rendered as the upload date. */
  createdAt?: string | undefined
}

export interface MarqueeBandProps {
  clips: MarqueeClip[]
  /** Seconds for one full scroll loop. Larger = slower. Defaults to 50. */
  speedSec?: number
  className?: string
}

/**
 * Auto-scrolling horizontal strip of clip thumbnails. Every card is a
 * real link to a real clip; the variety of cover images carries the
 * page's color (each clip is a real product's screenshot — Stripe,
 * GitHub, design-system pages, etc.) so the band reads as evidence
 * of breadth without relying on synthetic illustration.
 *
 * Implementation: the clip list is duplicated in-place so the
 * keyframe animation can translate by exactly -50% across one loop
 * for a seamless wrap. Hover pauses the animation. Edge gradients
 * mask the wrap discontinuity for visitors with reduced motion who
 * see the strip statically.
 *
 * Renders nothing when there are no clips — the page falls back to
 * its other surfaces (gallery, hero embed) without an empty band.
 */
export function MarqueeBand({
  clips,
  speedSec = 50,
  className,
}: MarqueeBandProps) {
  if (clips.length === 0) return null

  // Duplicate the list so the keyframe can translate -50% and wrap
  // seamlessly. The two halves share the same clip data; aria-hidden
  // on the second half avoids screen-reader duplication.
  const sequence = [...clips, ...clips]

  return (
    <div
      aria-label="Featured agent runs"
      role="region"
      className={cn(
        'group/marquee relative overflow-hidden',
        // Edge fades on left + right so cards visually dissolve into
        // the page background instead of slamming into a hard cut.
        '[mask-image:linear-gradient(to_right,transparent_0,black_5%,black_95%,transparent_100%)]',
        className,
      )}
    >
      <ul
        className="flex w-max gap-4 py-1 motion-safe:animate-[marquee_var(--marquee-speed)_linear_infinite] motion-safe:group-hover/marquee:[animation-play-state:paused]"
        style={{ ['--marquee-speed' as string]: `${speedSec}s` }}
      >
        {sequence.map((clip, idx) => (
          <li
            key={`${clip.shareToken}-${idx}`}
            className="shrink-0"
            aria-hidden={idx >= clips.length ? 'true' : undefined}
          >
            <MarqueeCard clip={clip} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function MarqueeCard({ clip }: { clip: MarqueeClip }) {
  const date = clip.createdAt ? formatClipDate(clip.createdAt) : ''
  return (
    <Link
      href={`/s/${clip.shareToken}`}
      className={cn(
        // Larger poster-like cards (380px) with deeper shadow give
        // the band a cinematic feel rather than a thumbnail strip.
        'group/card block w-[380px] overflow-hidden rounded-[14px]',
        'border border-ink-200 bg-paper transition-all duration-300 ease-out',
        'shadow-[0_14px_32px_-22px_rgba(20,20,19,0.25),0_4px_10px_-6px_rgba(20,20,19,0.08)]',
        'hover:-translate-y-1 hover:border-ink-300',
        'hover:shadow-[0_28px_56px_-24px_rgba(20,20,19,0.28),0_8px_18px_-8px_rgba(20,20,19,0.10)]',
      )}
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-paper-oat">
        {clip.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={clip.coverImageUrl}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform duration-700 ease-out group-hover/card:scale-[1.05]"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-xs italic text-ink-400">
            No preview
          </div>
        )}
      </div>
      <div className="space-y-1.5 px-4 py-3">
        <p className="line-clamp-2 text-[15px] font-medium tracking-tight text-ink-900 transition-colors group-hover/card:text-vermillion-700">
          {clip.title}
        </p>
        {clip.description && (
          <p className="line-clamp-2 text-sm text-ink-600">{clip.description}</p>
        )}
        {clip.creatorName && (
          <div className="flex items-center gap-1.5 pt-1.5 text-xs text-ink-500">
            <CreatorChip name={clip.creatorName} size="sm" />
            {date && <span aria-hidden="true">·</span>}
            {date && <span>{date}</span>}
          </div>
        )}
      </div>
    </Link>
  )
}
