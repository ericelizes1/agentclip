'use client'

import { SiGithub } from '@icons-pack/react-simple-icons'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import { Button } from '@/components/primitives/Button/Button'
import { TicketMark } from '@/components/primitives/TicketMark/TicketMark'
import { useRecording } from '@/components/context/RecordingProvider/RecordingProvider'
import { useViewfinder } from '@/components/patterns/PageViewfinder/PageViewfinder'
import { cn } from '@/lib/utils'

export interface HomeSidebarProps {
  /** Public GitHub URL the bottom anchor points at. */
  githubUrl?: string
  className?: string
}

/**
 * Left sidebar used only on the home page. Hosts the brand mark,
 * the viewfinder status (Rec / timecode / slide counter), and the
 * GitHub link in a single vertical column. No border, no collapse —
 * sits on the camera-body background and stays sticky-positioned by
 * the parent wrapper as the visitor scrolls.
 *
 * Replaces the old fixed-top NavBar on the home page so the screen
 * content can scroll freely without anything overlaying the top of
 * the page.
 */
export function HomeSidebar({
  githubUrl = 'https://github.com/ericelizes1/agentclip',
  className,
}: HomeSidebarProps) {
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
      className={cn('flex flex-col gap-7', className)}
    >
      <Link
        href="/"
        className="flex w-fit items-center gap-2 text-ink-900"
      >
        <TicketMark
          size={20}
          recording={recording}
          className="text-vermillion-500"
        />
        <span className="font-semibold tracking-tight">AgentClip</span>
      </Link>

      {insideViewfinder && (
        <div className="flex flex-col gap-2 text-[13px] text-ink-500">
          <div className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={cn(
                'inline-block size-[7px] rounded-full',
                allCaptured ? 'bg-ink-400' : 'animate-pulse bg-vermillion-500',
              )}
            />
            <span
              className={cn(
                'font-medium',
                allCaptured ? 'text-ink-500' : 'text-vermillion-700',
              )}
            >
              Rec
            </span>
          </div>
          <Timecode />
          <div>
            Slide{' '}
            <span className="font-mono tabular-nums text-ink-700">
              {String(captured).padStart(2, '0')}
            </span>{' '}
            <span className="text-ink-300">/</span>{' '}
            <span className="font-mono tabular-nums">
              {String(totalSlides).padStart(2, '0')}
            </span>
          </div>
        </div>
      )}

      <div className="pt-2">
        <Button asChild variant="ghost" size="sm">
          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-fit"
          >
            <SiGithub aria-hidden="true" className="size-4" />
            <span>GitHub</span>
          </a>
        </Button>
      </div>
    </nav>
  )
}

/* ── Live SMPTE-style timecode ────────────────────────────── */

function Timecode() {
  const value = useTimecode()
  return (
    <span className="font-mono text-[12px] tabular-nums text-ink-600">
      {value}
    </span>
  )
}

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
