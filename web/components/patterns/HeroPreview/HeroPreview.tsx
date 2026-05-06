'use client'

import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

import { MediaFrame, type MediaKind } from '@/components/composites/MediaFrame/MediaFrame'
import { TicketMark } from '@/components/primitives/TicketMark/TicketMark'
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
  /** Slideshow title — rendered above the media so visitors know what they're watching. */
  title: string
  /** Used in the eyebrow row credit ("Filed by ..."). */
  creatorName?: string
  /** Up to 4–5 slides; first one renders on mount. */
  slides: HeroPreviewSlide[]
  className?: string
}

/**
 * Embedded mini-viewer that lives in the home-page hero. Click the
 * media to advance; click a position dot to jump. Whole component is
 * a single press clipping — ticket-stub eyebrow, media, caption,
 * pagination, and a permalink to the full viewer page.
 *
 * Why not autoplay: visitors can't read a caption that auto-rotates
 * every 4s. Click-to-advance gives the visitor agency and keeps the
 * "this is interactive" signal explicit. We can layer autoplay on top
 * later if the slideshow is short and the captions are very brief.
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
    <div className={cn('relative w-full', className)}>
      <header className="mb-3 flex items-center gap-2 text-xs text-ink-500">
        <TicketMark size={14} className="text-vermillion-500" />
        <span className="font-mono uppercase tracking-[0.12em] text-ink-400">
          AGENTCLIP No.{shareToken.slice(0, 6).toUpperCase()}
        </span>
        {creatorName && (
          <>
            <span aria-hidden="true" className="text-ink-300">
              ·
            </span>
            <span>Filed by {creatorName}</span>
          </>
        )}
      </header>

      <h2 className="mb-4 text-xl font-semibold tracking-tight text-ink-900 sm:text-2xl">
        {title}
      </h2>

      <button
        type="button"
        onClick={advance}
        aria-label={`Slide ${slide.position} of ${total}. Click to advance.`}
        className={cn(
          'group block w-full overflow-hidden rounded-[14px]',
          'border border-ink-200 bg-paper',
          'shadow-[var(--shadow-whisper)] transition hover:shadow-[var(--shadow-soft)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vermillion-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
        )}
      >
        <MediaFrame
          src={slide.mediaUrl}
          mediaKind={slide.mediaKind}
          alt={slide.caption}
          position={slide.position}
        />
      </button>

      <p className="mt-4 text-base leading-relaxed text-ink-700">
        <span className="mr-2 font-mono text-xs uppercase tracking-[0.12em] text-ink-400">
          {String(slide.position).padStart(2, '0')}
        </span>
        {slide.caption}
      </p>

      <div className="mt-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5" role="tablist" aria-label="Slides">
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
                  'h-1.5 rounded-full transition-all',
                  isActive
                    ? 'w-6 bg-vermillion-500'
                    : 'w-1.5 bg-ink-300 hover:bg-ink-400',
                )}
              />
            )
          })}
        </div>
        <Link
          href={`/s/${shareToken}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-ink-700 transition-colors hover:text-vermillion-500"
        >
          Open clip
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
    </div>
  )
}
