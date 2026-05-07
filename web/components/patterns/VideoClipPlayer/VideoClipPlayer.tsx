'use client'

import { ArrowRight, Pause, Play, Volume2, VolumeX } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

import { CreatorChip } from '@/components/composites/CreatorChip/CreatorChip'
import { MediaFrame, type MediaKind } from '@/components/composites/MediaFrame/MediaFrame'
import { cn } from '@/lib/utils'

export interface VideoClipSlide {
  position: number
  title?: string
  caption: string
  mediaUrl: string
  mediaKind: MediaKind
  audioUrl: string
  audioDurationMs?: number
}

export interface VideoClipPlayerProps {
  /** share_token of the slideshow being played; powers the "Open clip" link. */
  shareToken: string
  /** Slideshow title — wrapper aria-label so screen readers announce what plays. */
  title: string
  /** Optional creator credit; rendered as a CreatorChip beneath the player. */
  creatorName?: string
  /**
   * Slides with `audioUrl` set on every entry. The parent is responsible for
   * checking `slides.every(s => s.audioUrl)` before rendering this component;
   * we trust the contract and don't defensively skip slides at runtime.
   */
  slides: VideoClipSlide[]
  /**
   * `compact` is for embedded surfaces (HeroPreview); `full` renders the
   * caption + meta row inside the player so it reads as a self-contained
   * video on the public viewer page.
   */
  variant?: 'compact' | 'full'
  className?: string
}

/**
 * Audio-driven slide player. Plays the active slide's `<audio>` while
 * displaying its image; auto-advances to the next slide when audio ends;
 * supports play/pause/scrub/mute controls and direct dot-jumping.
 *
 * Implementation notes:
 *   - One persistent `<audio ref>` element. We swap `src` on slide change
 *     instead of mounting a new element per slide so playback continues
 *     smoothly across boundaries (Chrome restarts mid-buffer otherwise).
 *   - Autoplay does NOT begin on mount — Safari forbids audio autoplay
 *     without a user gesture. The user clicks "play" (or the centered
 *     play overlay) to start; subsequent slide advances continue without
 *     a new gesture because they're descended from the original gesture.
 *   - On the last slide's `audio.ended`, playback halts and a "Replay"
 *     affordance surfaces; visitors who've watched the whole walkthrough
 *     don't have to reset state to re-watch.
 */
export function VideoClipPlayer({
  shareToken,
  title,
  creatorName,
  slides,
  variant = 'compact',
  className,
}: VideoClipPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [active, setActive] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [muted, setMuted] = useState(false)
  const [ended, setEnded] = useState(false)
  const total = slides.length
  const slide = slides[active]

  // Whenever the active slide changes, swap the audio element's src and
  // (if mid-playback) keep playing. The state machine here is:
  //   - active changed → pause, set src, reset progress
  //   - if `playing`, call .play() once metadata is ready
  // We rely on the browser's native loadedmetadata + play() ordering.
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !slide) return
    audio.src = slide.audioUrl
    audio.currentTime = 0
    setProgress(0)
    setEnded(false)
    if (playing) {
      // Catch the AbortError that fires when src changes mid-play.
      audio.play().catch(() => {})
    }
  // We intentionally exclude `playing` from deps: switching slides
  // shouldn't be triggered by play/pause toggles, only by `active`.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onTimeUpdate = () => {
      if (audio.duration && Number.isFinite(audio.duration)) {
        setProgress(audio.currentTime / audio.duration)
      }
    }
    const onEnded = () => {
      if (active < total - 1) {
        setActive((i) => i + 1)
      } else {
        setPlaying(false)
        setEnded(true)
      }
    }

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('ended', onEnded)
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('ended', onEnded)
    }
  }, [active, total])

  if (!slide) return null

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (ended) {
      // Replay: reset to the first slide and start over.
      setActive(0)
      setEnded(false)
      setPlaying(true)
      audio.currentTime = 0
      audio.play().catch(() => {})
      return
    }
    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      audio.play().then(() => setPlaying(true)).catch(() => {})
    }
  }

  const toggleMute = () => {
    const audio = audioRef.current
    if (!audio) return
    audio.muted = !audio.muted
    setMuted(audio.muted)
  }

  const jumpTo = (i: number) => {
    setActive(i)
    setPlaying(false)
    setEnded(false)
    const audio = audioRef.current
    if (audio) audio.pause()
  }

  const onScrub = (event: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    if (!audio || !audio.duration || !Number.isFinite(audio.duration)) return
    const rect = event.currentTarget.getBoundingClientRect()
    const fraction = Math.max(
      0,
      Math.min(1, (event.clientX - rect.left) / rect.width),
    )
    audio.currentTime = fraction * audio.duration
    setProgress(fraction)
  }

  return (
    <figure
      className={cn('relative w-full', className)}
      aria-label={`Narrated walkthrough of: ${title}`}
    >
      <div
        className={cn(
          'group/player relative block w-full overflow-hidden rounded-[14px]',
          'border border-ink-200 bg-paper-raised',
          'shadow-[var(--shadow-whisper)]',
        )}
      >
        <button
          type="button"
          onClick={togglePlay}
          aria-label={
            ended
              ? 'Replay walkthrough'
              : playing
                ? `Pause (slide ${slide.position} of ${total})`
                : `Play narrated walkthrough (${total} slides)`
          }
          className={cn(
            'block w-full focus-visible:outline-none',
            'focus-visible:ring-2 focus-visible:ring-vermillion-500',
            'focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
          )}
        >
          <MediaFrame
            src={slide.mediaUrl}
            mediaKind={slide.mediaKind}
            alt={slide.caption}
            position={slide.position}
            hideBadge
          />
          {/* Centered play / pause / replay overlay. Visible when paused
              or ended; fades on hover when actively playing. */}
          <span
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute inset-0 flex items-center justify-center',
              'transition-opacity duration-200',
              playing && !ended
                ? 'opacity-0 group-hover/player:opacity-100'
                : 'opacity-100',
            )}
          >
            <span
              className={cn(
                'inline-flex size-14 items-center justify-center rounded-full',
                'bg-vermillion-500/95 text-paper shadow-[0_8px_22px_-8px_rgba(217,72,36,0.65)]',
                'transition-transform duration-200 ease-out',
                'group-hover/player:scale-110',
              )}
            >
              {ended ? (
                <ReplayIcon className="size-5" />
              ) : playing ? (
                <Pause className="size-5" />
              ) : (
                <Play className="size-5 translate-x-[1px]" />
              )}
            </span>
          </span>
        </button>

        {/* Scrubber bar for the current slide's audio. Click to seek. */}
        <div
          role="slider"
          tabIndex={0}
          aria-label="Audio progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          onClick={onScrub}
          className="absolute bottom-0 left-0 h-[3px] w-full cursor-pointer bg-ink-200/40"
        >
          <span
            aria-hidden="true"
            className="block h-full bg-vermillion-500 transition-[width] duration-75"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      {/* Hidden audio element. We never render visible browser controls;
          everything funnels through our buttons + scrubber. */}
      <audio
        ref={audioRef}
        preload="metadata"
        // No `autoPlay` — Safari requires a user gesture before audio.
      />

      {variant === 'full' && (
        <p className="mt-5 text-base leading-relaxed text-ink-700">
          {slide.caption}
        </p>
      )}

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
        <div className="flex items-center gap-3 text-sm text-ink-500">
          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? 'Unmute audio' : 'Mute audio'}
            className="inline-flex size-7 items-center justify-center rounded-full text-ink-500 transition-colors hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vermillion-500"
          >
            {muted ? (
              <VolumeX className="size-4" />
            ) : (
              <Volume2 className="size-4" />
            )}
          </button>
          {creatorName && (
            <CreatorChip
              name={creatorName}
              size="sm"
              className="hidden sm:inline-flex"
            />
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

function ReplayIcon({ className }: { className?: string }) {
  // Lucide doesn't ship a "replay" glyph; this is a curved arrow that
  // reads as "play again" without needing extra deps.
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8" />
      <path d="M21 3v5h-5" />
    </svg>
  )
}
