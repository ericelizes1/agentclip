'use client'

import { motion, useReducedMotion, type Transition } from 'framer-motion'
import { SiGithub } from '@icons-pack/react-simple-icons'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import { Button } from '@/components/primitives/Button/Button'
import { TicketMark } from '@/components/primitives/TicketMark/TicketMark'
import { Typewriter } from '@/components/primitives/Typewriter/Typewriter'
import { useRecording } from '@/components/context/RecordingProvider/RecordingProvider'
import {
  HeroPreview,
  type HeroPreviewSlide,
} from '@/components/patterns/HeroPreview/HeroPreview'
import { cn } from '@/lib/utils'

export interface HeroFeaturedClip {
  shareToken: string
  title: string
  creatorName?: string
  slides: HeroPreviewSlide[]
}

export interface HeroSectionProps {
  /** GitHub URL the primary CTA points at. */
  githubUrl?: string
  /**
   * Real clip rendered as the punchline below the headline + CTA.
   * Headline leads; embed is the payoff. When absent, the hero ends
   * at the View on GitHub button.
   */
  featured?: HeroFeaturedClip | null
  className?: string
}

const HEADLINE_TEXT = 'Walkthroughs that record themselves.'
const PUNCHLINE = 'themselves.'
const HEADLINE_LEAD = HEADLINE_TEXT.slice(
  0,
  HEADLINE_TEXT.length - PUNCHLINE.length,
) // "Walkthroughs that record "

const stagger: Transition = { duration: 0.45, ease: [0.2, 0.7, 0.2, 1] }

// Time budget for the recording-state machine on a fresh page load.
// Typewriter (~1.5s for 36 chars) → punchline reveal → "Recorded ✓"
// holds 1.4s → settles into the locked v0.1 metadata.
const TYPEWRITER_SPEED_MS = 38
const RECORDED_HOLD_MS = 1400

/**
 * Home-page hero. Conceit: the page itself is an AgentClip recording.
 *
 * On mount, the headline is typed by an agent cursor; the recording
 * pill counts the slide; the navbar's TicketMark logo (via the shared
 * RecordingProvider context) pulses; and once the typewriter completes
 * the underlined punchline word reveals with a clip-path wipe. After
 * a 1.4s "Recorded ✓" beat the pill settles into its locked metadata
 * content and the rest of the page acts normally.
 *
 * Below the embedded clip, an Easter-egg note links to the featured
 * clip itself: "↑ this page recorded itself while you read it."
 *
 * Reduced-motion users see the full headline + idle pill immediately;
 * the conceit gracefully collapses to a static, accessible page.
 */
export function HeroSection({
  githubUrl = 'https://github.com/ericelizes1/agentclip',
  featured,
  className,
}: HeroSectionProps) {
  const reduce = useReducedMotion()
  const at = (i: number) =>
    reduce ? { ...stagger, delay: 0 } : { ...stagger, delay: i * 0.06 }
  const { state, setState } = useRecording()
  const [punchlineRevealed, setPunchlineRevealed] = useState(false)

  // When the page is loaded with a "recording" initial state, drive the
  // sequencing: typewriter completes → flip to "recorded" → after a
  // short hold, settle into "idle". Skipping this entire block when the
  // provider is absent (state === 'idle' from the start) keeps non-home
  // pages quiet.
  useEffect(() => {
    if (reduce) {
      // Reduced motion: collapse straight to idle, reveal punchline.
      setPunchlineRevealed(true)
      if (state === 'recording' || state === 'recorded') setState('idle')
      return
    }
    if (state !== 'recorded') return
    const t = setTimeout(() => setState('idle'), RECORDED_HOLD_MS)
    return () => clearTimeout(t)
  }, [state, setState, reduce])

  const handleTypewriterDone = () => {
    setPunchlineRevealed(true)
    if (state === 'recording') setState('recorded')
  }

  return (
    <section
      className={cn(
        // Wider container so the hero doesn't float in dead space inside
        // the screen card on lg+ viewports. Inner elements (sub copy,
        // install snippet) have their own max-widths for readability.
        // Generous gap-12 between hero blocks so each lands as a separate
        // moment instead of running into the next.
        'mx-auto flex max-w-4xl flex-col gap-12 px-6 py-24 sm:px-10 sm:py-28',
        className,
      )}
    >
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={at(0)}
      >
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-ink-900"
        >
          <TicketMark size={22} className="text-vermillion-500" />
          <span className="font-semibold tracking-tight">AgentClip</span>
        </Link>
      </motion.div>

      <motion.h1
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={at(1)}
        className={cn(
          // Single typeface (Geist) at heavy weight for the headline —
          // keeps the page typographically consistent. Punchline word
          // is set in italic + vermillion underline as the only visual
          // emphasis.
          'font-extrabold tracking-[-0.035em] leading-[1.05] text-ink-900',
          'text-[clamp(2.5rem,1.6rem+4vw,4.25rem)]',
        )}
      >
        <Typewriter
          text={HEADLINE_LEAD}
          speedMs={TYPEWRITER_SPEED_MS}
          onComplete={handleTypewriterDone}
          className="inline"
        />
        <span
          className={cn(
            'relative inline-block whitespace-nowrap italic transition-[clip-path,opacity] duration-500 ease-out',
            punchlineRevealed
              ? '[clip-path:inset(0_0%_-0.2em_0)] opacity-100'
              : '[clip-path:inset(0_100%_-0.2em_0)] opacity-0',
          )}
        >
          <span className="underline decoration-vermillion-500 decoration-[5px] underline-offset-[0.16em]">
            {PUNCHLINE}
          </span>
        </span>
      </motion.h1>

      <motion.p
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...at(2), delay: reduce ? 0 : 1.5 }}
        className="max-w-[58ch] text-lg text-ink-600 sm:text-xl"
      >
        Your AI agent runs the flow. AgentClip captures the screens, narrates
        each step, and ships back one shareable URL — drop it in a PR, a Slack
        thread, a portfolio, a recruiter email.
      </motion.p>

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...at(3), delay: reduce ? 0 : 1.6 }}
      >
        <Button asChild variant="primary" size="lg">
          <a href={githubUrl} target="_blank" rel="noopener noreferrer">
            <SiGithub aria-hidden="true" className="size-4" />
            View on GitHub
          </a>
        </Button>
      </motion.div>

      {featured && featured.slides.length > 0 && (
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...at(5), delay: reduce ? 0 : 1.85 }}
          className="pt-6"
        >
          <HeroPreview
            shareToken={featured.shareToken}
            title={featured.title}
            {...(featured.creatorName !== undefined
              ? { creatorName: featured.creatorName }
              : {})}
            slides={featured.slides}
          />
        </motion.div>
      )}
    </section>
  )
}
