'use client'

import Link from 'next/link'

import { cn } from '@/lib/utils'

export interface MarqueeClip {
  shareToken: string
  title: string
  coverImageUrl?: string | null | undefined
  meta?: string | undefined
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
  return (
    <Link
      href={`/s/${clip.shareToken}`}
      className={cn(
        'group/card block w-[280px] overflow-hidden rounded-[12px]',
        'border border-ink-200 bg-paper transition-transform duration-200 ease-out',
        'hover:-translate-y-0.5 hover:border-ink-300 hover:shadow-[0_18px_40px_-20px_rgba(20,20,19,0.18)]',
      )}
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-paper-oat">
        {clip.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={clip.coverImageUrl}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 ease-out group-hover/card:scale-[1.03]"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-xs italic text-ink-400">
            No preview
          </div>
        )}
      </div>
      <div className="space-y-1 px-3 py-2.5">
        <p className="line-clamp-1 text-sm font-medium tracking-tight text-ink-900">
          {clip.title}
        </p>
        {clip.meta && (
          <p className="text-[11px] uppercase tracking-[0.14em] text-ink-500">
            {clip.meta}
          </p>
        )}
      </div>
    </Link>
  )
}
