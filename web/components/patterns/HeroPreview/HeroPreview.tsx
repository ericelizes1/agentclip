'use client'

import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

import { MediaFrame, type MediaKind } from '@/components/composites/MediaFrame/MediaFrame'
import { cn } from '@/lib/utils'

export interface HeroPreviewSlide {
  position: number
  title?: string
  caption: string
  mediaUrl: string
  mediaKind: MediaKind
}

export interface HeroPreviewProps {
  /** share_token of the slideshow being previewed; powers the "Open clip" link. */
  shareToken: string
  /** Slideshow title — wrapper aria-label so screen readers announce what the embed previews. Not rendered as a competing heading. */
  title: string
  /** Optional creator credit; when set, shown alongside "Open clip" without competing chrome. */
  creatorName?: string
  /** Up to 4–5 slides; first one renders on mount. */
  slides: HeroPreviewSlide[]
  className?: string
}

/**
 * Embedded mini-viewer used in the home-page hero. Minimal-technical
 * treatment: media frame, plain caption, restrained pagination dots,
 * link to the full viewer page. No eyebrows, no decorative labels —
 * the parent page supplies all the framing.
 */
export function HeroPreview({
  shareToken,
  title,
  creatorName,
  slides,
  className,
}: HeroPreviewProps) {
  const [active, setActive] = useState(0)
  const total = slides.length
  const slide = slides[active]

  if (!slide) return null

  const advance = () => setActive((i) => (i + 1) % total)

  return (
    <figure
      className={cn('relative w-full', className)}
      aria-label={`Preview of: ${title}`}
    >
      <button
        type="button"
        onClick={advance}
        aria-label={`Slide ${slide.position} of ${total}. Click to advance.`}
        className={cn(
          'group block w-full overflow-hidden rounded-[14px]',
          'border border-ink-200 bg-paper-raised',
          'shadow-[var(--shadow-whisper)] transition-shadow duration-200 ease-out',
          'hover:shadow-[0_22px_44px_-22px_rgba(20,20,19,0.18),0_8px_18px_-8px_rgba(20,20,19,0.12)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vermillion-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
        )}
      >
        <MediaFrame
          src={slide.mediaUrl}
          mediaKind={slide.mediaKind}
          alt={slide.caption}
          position={slide.position}
          hideBadge
        />
      </button>

      <figcaption className="mt-5 text-base leading-relaxed text-ink-700">
        {slide.caption}
      </figcaption>

      <div className="mt-5 flex items-center justify-between gap-4">
        <div
          className="flex items-center gap-1.5"
          role="tablist"
          aria-label="Slides"
        >
          {slides.map((s, i) => {
            const isActive = i === active
            return (
              <button
                key={s.position}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`Jump to slide ${s.position}`}
                onClick={() => setActive(i)}
                className={cn(
                  'h-[3px] rounded-full transition-all',
                  isActive
                    ? 'w-8 bg-vermillion-500'
                    : 'w-3 bg-ink-300 hover:bg-ink-400',
                )}
              />
            )
          })}
        </div>
        <div className="flex items-center gap-3 text-sm text-ink-500">
          {creatorName && (
            <span className="hidden sm:inline">By {creatorName}</span>
          )}
          <Link
            href={`/s/${shareToken}`}
            className="inline-flex items-center gap-1 font-medium text-ink-800 transition-colors hover:text-vermillion-600"
          >
            Open clip
            <ArrowRight aria-hidden="true" className="size-3.5" />
          </Link>
        </div>
      </div>
    </figure>
  )
}
