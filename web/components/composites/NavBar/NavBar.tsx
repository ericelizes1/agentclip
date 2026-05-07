'use client'

import { SiGithub } from '@icons-pack/react-simple-icons'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import { Button } from '@/components/primitives/Button/Button'
import { TicketMark } from '@/components/primitives/TicketMark/TicketMark'
import { useRecording } from '@/components/context/RecordingProvider/RecordingProvider'
import { useViewfinder } from '@/components/patterns/PageViewfinder/PageViewfinder'
import { cn } from '@/lib/utils'

export interface NavBarProps {
  /** Public GitHub URL the right-side button links to. */
  githubUrl?: string
  className?: string
}

/**
 * Sticky top nav. On pages without the PageViewfinder it renders
 * plain (logo + AgentClip wordmark + GitHub button). On the home
 * page — wrapped in PageViewfinder — it doubles as the camera's REC
 * status bar: vermillion REC chip with a pulsing dot, a SMPTE-style
 * timecode that ticks live, and a `Slide NN / TT` counter that
 * advances as the visitor scrolls past captured sections.
 *
 * Treating the navbar as the recording bar avoids stacking another
 * fixed element at the top of the viewport. It also makes the
 * conceit unmissable: every page visitor reads the navbar.
 */
export function NavBar({
  githubUrl = 'https://github.com/ericelizes1/agentclip',
  className,
}: NavBarProps) {
  // Two contexts: legacy RecordingProvider (drives the TicketMark
  // pulse during the typewriter) and PageViewfinder (drives the REC
  // chrome inline). Both fall through to safe defaults outside their
  // respective providers.
  const { state } = useRecording()
  const { slides, capturedIds } = useViewfinder()
  const recording = state === 'recording'
  const totalSlides = slides.length
  const insideViewfinder = totalSlides > 0
  const captured = capturedIds.size
  const allCaptured = insideViewfinder && captured === totalSlides

  return (
    <nav
      aria-label="Primary"
      className={cn(
        'sticky top-0 z-30 flex items-center justify-between gap-4',
        // On the home page this navbar sits inside the "camera body"
        // (bg-paper-raised) above the framed screen — its background
        // matches the body so the chrome reads as one continuous shell.
        // On other pages the navbar still falls back to plain paper.
        'border-b border-ink-200 bg-paper-raised/85 backdrop-blur-md',
        'px-4 py-3 sm:px-6',
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Link href="/" className="flex shrink-0 items-center gap-2 text-ink-900">
          <TicketMark
            size={18}
            recording={recording}
            className="text-vermillion-500"
          />
          <span className="font-semibold tracking-tight">AgentClip</span>
        </Link>

        {insideViewfinder && (
          <span
            aria-hidden="true"
            className="hidden h-4 w-px shrink-0 bg-ink-200 lg:inline-block"
          />
        )}

        {insideViewfinder && (
          <ViewfinderStatus
            captured={captured}
            total={totalSlides}
            allCaptured={allCaptured}
          />
        )}
      </div>

      <Button asChild variant="ghost" size="sm">
        <a href={githubUrl} target="_blank" rel="noopener noreferrer">
          <SiGithub aria-hidden="true" className="size-4" />
          <span>GitHub</span>
        </a>
      </Button>
    </nav>
  )
}

/* ── Viewfinder status (REC + timecode + counter) ───────────────
   Rendered inside the navbar only when wrapped in PageViewfinder. */

function ViewfinderStatus({
  captured,
  total,
  allCaptured,
}: {
  captured: number
  total: number
  allCaptured: boolean
}) {
  const timecode = useTimecode()

  return (
    <span className="hidden items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-500 lg:flex">
      <span className="inline-flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className={cn(
            'inline-block size-2 rounded-full',
            allCaptured ? 'bg-ink-400' : 'animate-pulse bg-vermillion-500',
          )}
        />
        <span
          className={cn(
            'font-semibold',
            allCaptured ? 'text-ink-500' : 'text-vermillion-700',
          )}
        >
          Rec
        </span>
      </span>
      <span aria-hidden="true" className="text-ink-300">
        ·
      </span>
      <span className="tabular-nums text-ink-700">{timecode}</span>
      <span aria-hidden="true" className="text-ink-300">
        ·
      </span>
      <span className="tabular-nums">
        Slide{' '}
        <span className="text-ink-700">{String(captured).padStart(2, '0')}</span>{' '}
        / {String(total).padStart(2, '0')}
      </span>
    </span>
  )
}

/**
 * SMPTE-style timecode (MM:SS:FF) that increments live. Frames are
 * synthesised at 24fps from wall-clock — not a real clock; the point
 * is the visual cadence, not technical accuracy. Resets each mount.
 */
function useTimecode(): string {
  const [ms, setMs] = useState(0)
  useEffect(() => {
    const start = Date.now()
    const interval = setInterval(() => setMs(Date.now() - start), 100)
    return () => clearInterval(interval)
  }, [])

  const totalFrames = Math.floor((ms * 24) / 1000)
  const ff = totalFrames % 24
  const totalSec = Math.floor(ms / 1000)
  const ss = totalSec % 60
  const mm = Math.floor(totalSec / 60)
  return `${pad(mm)}:${pad(ss)}:${pad(ff)}`
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}
