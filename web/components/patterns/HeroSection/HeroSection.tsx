'use client'

import { motion, useReducedMotion, type Transition } from 'framer-motion'
import { SiGithub } from '@icons-pack/react-simple-icons'
import { useEffect, useState } from 'react'

import { CodeBlock } from '@/components/composites/CodeBlock/CodeBlock'
import { Tabs } from '@/components/primitives/Tabs/Tabs'
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

const HEADLINE_TEXT = 'Your agent shows its work.'
const PUNCHLINE = 'work.'
const HEADLINE_LEAD = HEADLINE_TEXT.slice(
  0,
  HEADLINE_TEXT.length - PUNCHLINE.length,
) // "Your agent shows its "

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
        // Two-column hero on lg+: text/CTA stack on the left, polaroid
        // embed of a real clip on the right. Above the fold the visitor
        // sees both the pitch and the proof. On mobile the columns
        // collapse and the polaroid follows the CTA, preserving the
        // single-column reading order.
        'relative mx-auto grid max-w-6xl grid-cols-1 gap-y-12 px-6 py-24 sm:px-10 sm:py-28',
        'lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-x-12',
        className,
      )}
    >
      <div className="flex flex-col gap-10 lg:gap-9">
      <motion.h1
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={at(1)}
        className={cn(
          // Display serif (Fraunces) for the hero headline only — the
          // signature voice of the page. Body and chrome stay Geist.
          // Slightly smaller cap than full-width to leave room for the
          // polaroid in the right column on lg+ — still reads big.
          'font-display font-semibold tracking-[-0.025em] leading-[0.98] text-ink-900',
          'text-[clamp(2.5rem,1.6rem+4.2vw,5rem)]',
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
        With AgentClip, your agent turns every feature into a captured demo.
        One shareable URL — drop in a Slack thread, embed in a PR, or just
        bounce ideas around.
      </motion.p>

      {/*
        Install — the primary action. Tabs sit as plain text-style
        toggles directly above the CodeBlock with no outer card chrome
        wrapping them, so we don't end up with three nested rectangles
        (outer card → tab strip → snippet box). Two visible boxes
        max: the tab strip (transparent) and the code block.
      */}
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...at(3), delay: reduce ? 0 : 1.6 }}
        className="max-w-[640px]"
      >
        <Tabs.Root defaultValue="pip">
          <Tabs.List className="mb-3 h-auto gap-4 rounded-none border-0 bg-transparent p-0">
            <Tabs.Trigger value="pip">Install yourself</Tabs.Trigger>
            <Tabs.Trigger value="agent">Have your agent do it</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="pip" className="mt-0">
            <CodeBlock prompt="$" code="pip install agentclip" />
            <p className="mt-2 text-xs text-ink-500">
              No install?{' '}
              <span className="font-mono text-ink-700">
                uvx agentclip --help
              </span>
            </p>
          </Tabs.Content>
          <Tabs.Content value="agent" className="mt-0">
            <CodeBlock code="Read agentclip.dev/install.md and set up AgentClip for me." />
          </Tabs.Content>
        </Tabs.Root>
      </motion.div>

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...at(4), delay: reduce ? 0 : 1.7 }}
      >
        <a
          href={githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-ink-600 underline decoration-ink-300 decoration-1 underline-offset-4 transition-colors hover:text-ink-900 hover:decoration-ink-500"
        >
          <SiGithub aria-hidden="true" className="size-3.5" />
          View source on GitHub
        </a>
      </motion.div>
      </div>

      {/* RIGHT COLUMN — polaroid embed of a real agent run. Sits at
          the top of the column, slightly tilted, with an editorial
          caption + a "rubber stamp" detail underneath that fills the
          remaining vertical space without bloating the embed itself. */}
      {featured && featured.slides.length > 0 && (
        <motion.figure
          initial={reduce ? false : { opacity: 0, y: 16, rotate: -1.5 }}
          animate={{ opacity: 1, y: 0, rotate: reduce ? 0 : -1 }}
          transition={{ ...at(5), delay: reduce ? 0 : 1.85 }}
          className={cn(
            'group/embed relative flex flex-col gap-5 self-start',
            'transition-transform duration-300 ease-out',
            'hover:rotate-0 hover:scale-[1.005]',
            'lg:sticky lg:top-24',
          )}
        >
          <HeroPreview
            shareToken={featured.shareToken}
            title={featured.title}
            {...(featured.creatorName !== undefined
              ? { creatorName: featured.creatorName }
              : {})}
            slides={featured.slides}
          />

          {/* Italic caption pulls the featured clip's actual title +
              slide count so the editor's note matches whatever clip is
              currently in the hero slot — not hardcoded. The stamp
              underneath is a curated flourish, not data-driven. */}
          <figcaption className="font-display text-[15px] italic leading-snug text-ink-500">
            <span className="text-vermillion-700">↑</span>{' '}
            {featured.title} — one real agent run,{' '}
            {featured.slides.length} shareable frames.
          </figcaption>

          <div
            aria-hidden="true"
            className="ml-auto mt-1 inline-flex rotate-[-4deg] flex-col items-center gap-0.5 rounded-[6px] border-2 border-vermillion-500/70 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-vermillion-700/85"
          >
            <span className="font-mono tabular-nums">REC · 00:00:42</span>
            <span className="text-[8px] tracking-[0.3em]">FILED 2026</span>
          </div>
        </motion.figure>
      )}
    </section>
  )
}
