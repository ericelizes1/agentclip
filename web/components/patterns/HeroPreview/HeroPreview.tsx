'use client'

import { ArrowRight, Pause, Play } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

import { CreatorChip } from '@/components/composites/CreatorChip/CreatorChip'
import { MediaFrame, type MediaKind } from '@/components/composites/MediaFrame/MediaFrame'
import { VideoClipPlayer, type VideoClipSlide } from '@/components/patterns/VideoClipPlayer/VideoClipPlayer'
import { cn } from '@/lib/utils'

export interface HeroPreviewSlide {
  position: number
  title?: string
  caption: string
  mediaUrl: string
  mediaKind: MediaKind
  /**
   * Optional public URL of the per-slide narration MP3. When every
   * slide in the array has this set, HeroPreview renders the
   * narrated VideoClipPlayer instead of the silent autoplay loop.
   */
  audioUrl?: string | null
  audioDurationMs?: number | null
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

const AUTOPLAY_INTERVAL_MS = 2800

/**
 * Embedded mini-viewer used in the home-page hero. Click the polaroid
 * to start autoplay — slides cycle every ~2.8s with a vermillion play
 * indicator that flips to a pause icon while running. The "Open clip"
 * link still routes to the full viewer for visitors who want the
 * unabbreviated experience.
 *
 * The pagination dots also work as scrubber tabs — clicking one jumps
 * directly to that slide and pauses autoplay.
 */
export function HeroPreview(props: HeroPreviewProps) {
  // When every slide has narration audio, hand off to the real
  // VideoClipPlayer. Otherwise fall through to the silent autoplay
  // loop — preserves backwards-compatible behavior for clips that
  // haven't been processed by `manage.py narrate` yet.
  //
  // Dispatcher pattern (rather than an early-return inside the silent
  // variant's body) so each branch's hooks are scoped to one
  // component and React's rules-of-hooks stay satisfied.
  const allNarrated =
    props.slides.length > 0 && props.slides.every((s) => Boolean(s.audioUrl))
  if (allNarrated) {
    const narratedSlides: VideoClipSlide[] = props.slides.map((s) => ({
      position: s.position,
      ...(s.title !== undefined ? { title: s.title } : {}),
      caption: s.caption,
      mediaUrl: s.mediaUrl,
      mediaKind: s.mediaKind,
      audioUrl: s.audioUrl as string,
      ...(s.audioDurationMs ? { audioDurationMs: s.audioDurationMs } : {}),
    }))
    return (
      <VideoClipPlayer
        shareToken={props.shareToken}
        title={props.title}
        {...(props.creatorName !== undefined
          ? { creatorName: props.creatorName }
          : {})}
        slides={narratedSlides}
        variant="compact"
        {...(props.className ? { className: props.className } : {})}
      />
    )
  }
  return <SilentHeroPreview {...props} />
}

function SilentHeroPreview({
  shareToken,
  title,
  creatorName,
  slides,
  className,
}: HeroPreviewProps) {
  const [active, setActive] = useState(0)
  const [playing, setPlaying] = useState(false)
  const total = slides.length
  const slide = slides[active]
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!playing) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }
    timerRef.current = setInterval(() => {
      setActive((i) => (i + 1) % total)
    }, AUTOPLAY_INTERVAL_MS)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [playing, total])

  if (!slide) return null

  const togglePlay = () => setPlaying((p) => !p)
  const jumpTo = (i: number) => {
    setActive(i)
    setPlaying(false)
  }

  return (
    <figure
      className={cn('relative w-full', className)}
      aria-label={`Preview of: ${title}`}
    >
      <button
        type="button"
        onClick={togglePlay}
        aria-label={
          playing
            ? `Pause autoplay (slide ${slide.position} of ${total})`
            : `Play walkthrough (${total} slides)`
        }
        className={cn(
          'group/play relative block w-full overflow-hidden rounded-[14px]',
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
        {/* Play / pause indicator centered on the polaroid. Idle: a
            soft vermillion pill with a play triangle. Playing: a
            pause icon. Hover-scales for clear affordance. */}
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute inset-0 flex items-center justify-center',
            'transition-opacity duration-200',
            playing ? 'opacity-0 group-hover/play:opacity-100' : 'opacity-100',
          )}
        >
          <span
            className={cn(
              'inline-flex size-14 items-center justify-center rounded-full',
              'bg-vermillion-500/95 text-paper shadow-[0_8px_22px_-8px_rgba(217,72,36,0.65)]',
              'transition-transform duration-200 ease-out',
              'group-hover/play:scale-110',
            )}
          >
            {playing ? (
              <Pause className="size-5" />
            ) : (
              <Play className="size-5 translate-x-[1px]" />
            )}
          </span>
        </span>
        {/* Live progress bar at the bottom edge — fills toward the
            next advance during autoplay. Resets per slide via the
            keyed remount. */}
        {playing && (
          <span
            key={`${active}-${playing}`}
            aria-hidden="true"
            className="absolute bottom-0 left-0 h-[3px] bg-vermillion-500"
            style={{
              animation: `hero-progress ${AUTOPLAY_INTERVAL_MS}ms linear forwards`,
            }}
          />
        )}
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
                onClick={() => jumpTo(i)}
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
        <div className="flex items-center gap-4 text-sm text-ink-500">
          {creatorName && (
            <CreatorChip name={creatorName} size="sm" className="hidden sm:inline-flex" />
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
