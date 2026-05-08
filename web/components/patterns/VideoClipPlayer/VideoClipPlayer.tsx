'use client'

import { ArrowRight, Pause, Play, Volume2, VolumeX } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

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
  shareToken: string
  title: string
  creatorName?: string
  slides: VideoClipSlide[]
  variant?: 'compact' | 'full'
  className?: string
}

const FALLBACK_SLIDE_MS = 6000

/**
 * Audio-driven slide player with a unified, video-style progress bar.
 *
 * The player concatenates per-slide narration audio into a single
 * continuous timeline. The progress bar reads as one bar across the
 * whole walkthrough — not one bar per slide — with thin tick markers
 * at slide boundaries (chapter ticks). Click anywhere to seek across
 * any slide boundary; rAF drives the bar so motion is smooth, not the
 * 4Hz `timeupdate` step.
 *
 * Implementation notes:
 *   - Per-slide durations come from the API (`audioDurationMs`). When
 *     a value is missing we probe client-side via a hidden `<audio>`
 *     and `loadedmetadata`, so legacy slideshows without server-side
 *     durations still get a coherent timeline.
 *   - One persistent `<audio ref>`. We swap `src` on slide change so
 *     playback continues across boundaries without remount churn.
 *   - Cross-boundary seek (click lands on a different slide than the
 *     active one) stashes the local offset in a ref; the next
 *     `loadedmetadata` consumes it and applies the seek.
 *   - Autoplay is gated on a user gesture (Safari requirement).
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
  const pendingSeekRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)
  const [active, setActive] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [ended, setEnded] = useState(false)
  const [globalMs, setGlobalMs] = useState(0)
  const [probedDurations, setProbedDurations] = useState<Record<number, number>>({})

  const total = slides.length
  const slide = slides[active]

  // Per-slide durations: prefer the API value, fall back to whatever
  // we've client-side-probed via metadata load. Default to a sensible
  // fixed slot so the bar doesn't collapse to zero on a fresh slide.
  const durations = useMemo(
    () =>
      slides.map(
        (s, i) =>
          s.audioDurationMs ?? probedDurations[i] ?? FALLBACK_SLIDE_MS,
      ),
    [slides, probedDurations],
  )

  const offsets = useMemo(() => {
    const out: number[] = [0]
    let acc = 0
    for (let i = 0; i < durations.length - 1; i++) {
      acc += durations[i] ?? 0
      out.push(acc)
    }
    return out
  }, [durations])

  const totalMs = useMemo(
    () => durations.reduce((a, b) => a + b, 0),
    [durations],
  )

  // Probe durations client-side for any slide missing `audioDurationMs`
  // on the server side. One hidden Audio per missing entry; we tear
  // them down on unmount.
  useEffect(() => {
    const probes: Array<[number, HTMLAudioElement, () => void]> = []
    slides.forEach((s, i) => {
      if (s.audioDurationMs || probedDurations[i]) return
      const a = new Audio()
      a.preload = 'metadata'
      a.src = s.audioUrl
      const onLoaded = () => {
        if (Number.isFinite(a.duration)) {
          setProbedDurations((prev) =>
            prev[i] ? prev : { ...prev, [i]: Math.round(a.duration * 1000) },
          )
        }
      }
      a.addEventListener('loadedmetadata', onLoaded)
      probes.push([i, a, () => a.removeEventListener('loadedmetadata', onLoaded)])
    })
    return () => {
      probes.forEach(([, a, off]) => {
        off()
        a.src = ''
      })
    }
  }, [slides, probedDurations])

  // Active-slide swap: load src, reset local position, optionally
  // resume playback or apply a pending cross-boundary seek.
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !slide) return
    audio.src = slide.audioUrl
    audio.currentTime = 0
    setEnded(false)

    const consumeSeek = () => {
      const pending = pendingSeekRef.current
      if (pending != null && Number.isFinite(audio.duration)) {
        audio.currentTime = Math.min(pending, audio.duration)
        pendingSeekRef.current = null
      }
    }
    audio.addEventListener('loadedmetadata', consumeSeek, { once: true })

    if (playing) {
      audio.play().catch(() => {})
    }
    return () => {
      audio.removeEventListener('loadedmetadata', consumeSeek)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  // Audio lifecycle wiring (auto-advance + ended state).
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onEnded = () => {
      if (active < total - 1) {
        setActive((i) => i + 1)
      } else {
        setPlaying(false)
        setEnded(true)
        setGlobalMs(totalMs)
      }
    }
    audio.addEventListener('ended', onEnded)
    return () => audio.removeEventListener('ended', onEnded)
  }, [active, total, totalMs])

  // rAF loop: smoothly track the global playhead. We sample
  // audio.currentTime on every animation frame instead of relying on
  // the browser's `timeupdate` event (which fires ~4x/sec and looks
  // step-y on a continuous bar).
  useEffect(() => {
    const tick = () => {
      const audio = audioRef.current
      if (audio && !audio.paused && Number.isFinite(audio.currentTime)) {
        const localMs = audio.currentTime * 1000
        setGlobalMs((offsets[active] ?? 0) + localMs)
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
  }, [active, offsets])

  // Convert a global ms target into (slide index, local seconds) and
  // apply. Cross-slide seek goes through the pendingSeekRef pathway.
  const seekToGlobalMs = useCallback(
    (targetMs: number) => {
      const clamped = Math.max(0, Math.min(targetMs, totalMs))
      let target = 0
      for (let i = 0; i < offsets.length; i++) {
        if (clamped >= (offsets[i] ?? 0)) target = i
      }
      const localMs = clamped - (offsets[target] ?? 0)
      const audio = audioRef.current
      if (target !== active) {
        pendingSeekRef.current = localMs / 1000
        setActive(target)
      } else if (audio) {
        audio.currentTime = localMs / 1000
      }
      setGlobalMs(clamped)
      setEnded(false)
    },
    [active, offsets, totalMs],
  )

  if (!slide) return null

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (ended) {
      pendingSeekRef.current = 0
      setActive(0)
      setEnded(false)
      setPlaying(true)
      setGlobalMs(0)
      audio.currentTime = 0
      audio.play().catch(() => {})
      return
    }
    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      audio
        .play()
        .then(() => setPlaying(true))
        .catch(() => {})
    }
  }

  const toggleMute = () => {
    const audio = audioRef.current
    if (!audio) return
    audio.muted = !audio.muted
    setMuted(audio.muted)
  }

  const onScrub = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!totalMs) return
    const rect = event.currentTarget.getBoundingClientRect()
    const fraction = Math.max(
      0,
      Math.min(1, (event.clientX - rect.left) / rect.width),
    )
    seekToGlobalMs(fraction * totalMs)
  }

  const progressFraction = totalMs > 0 ? globalMs / totalMs : 0

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

        {/* Unified continuous timeline. One bar across the whole clip,
            not per-slide. Tick markers (`offsets`) read as chapter
            boundaries. Click anywhere to seek. */}
        <div
          role="slider"
          tabIndex={0}
          aria-label="Walkthrough progress"
          aria-valuemin={0}
          aria-valuemax={Math.max(1, Math.round(totalMs))}
          aria-valuenow={Math.round(globalMs)}
          onClick={onScrub}
          className={cn(
            'absolute bottom-0 left-0 h-[4px] w-full cursor-pointer',
            'bg-ink-200/40',
          )}
        >
          <span
            aria-hidden="true"
            className="block h-full bg-vermillion-500"
            style={{ width: `${progressFraction * 100}%` }}
          />
          {offsets.slice(1).map((ms, i) => (
            <span
              key={i}
              aria-hidden="true"
              className="pointer-events-none absolute top-0 h-full w-px bg-paper/70"
              style={{ left: `${(ms / totalMs) * 100}%` }}
            />
          ))}
        </div>
      </div>

      <audio ref={audioRef} preload="metadata" />

      {variant === 'full' && (
        <p
          aria-live="polite"
          className="mt-5 text-base leading-relaxed text-ink-700"
        >
          {slide.caption}
        </p>
      )}

      <div className="mt-5 flex items-center justify-between gap-4 text-sm text-ink-500">
        <span className="font-mono tabular-nums text-xs text-ink-400">
          {formatTime(globalMs)} <span className="text-ink-300">/</span>{' '}
          {formatTime(totalMs)}
        </span>
        <div className="flex items-center gap-3">
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

function formatTime(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function ReplayIcon({ className }: { className?: string }) {
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
