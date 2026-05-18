'use client'

import { motion, useReducedMotion, type Transition } from 'framer-motion'
import { useEffect, useState } from 'react'

import { CodeBlock } from '@/components/composites/CodeBlock/CodeBlock'
import { CreatorChip } from '@/components/composites/CreatorChip/CreatorChip'
import { TrustBar } from '@/components/composites/TrustBar/TrustBar'
import { Tabs } from '@/components/primitives/Tabs/Tabs'
import { Typewriter } from '@/components/primitives/Typewriter/Typewriter'
import { useRecording } from '@/components/context/RecordingProvider/RecordingProvider'
import {
  HeroPreview,
  type HeroPreviewSlide,
} from '@/components/patterns/HeroPreview/HeroPreview'
import { cn, formatClipDate } from '@/lib/utils'

export interface HeroFeaturedClip {
  shareToken: string
  title: string
  description?: string
  creatorName?: string
  /** ISO timestamp — rendered as the upload date. */
  createdAt?: string
  slides: HeroPreviewSlide[]
}

export interface HeroSectionProps {
  /**
   * Real clip rendered as the proof below the headline. Headline
   * leads; the embed is the payoff. When absent, the hero ends at
   * the install block + trust bar.
   */
  featured?: HeroFeaturedClip | null
  /** Live GitHub star count for the inline trust bar. */
  stars?: number | null
  className?: string
}

const HEADLINE_TEXT = 'Review what your agent did.'
const PUNCHLINE = 'did.'
const HEADLINE_LEAD = HEADLINE_TEXT.slice(
  0,
  HEADLINE_TEXT.length - PUNCHLINE.length,
) // "Review what your agent "

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
  featured,
  stars = null,
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
        transition={{ ...at(2), delay: reduce ? 0 : 0.35 }}
        className="max-w-[58ch] text-lg text-ink-600 sm:text-xl"
      >
        Your coding agent records its work as a narrated video and
        hands you a URL to share. QA, demos, release notes, bug
        repros — no recording session.
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
        transition={{ ...at(3), delay: reduce ? 0 : 0.45 }}
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

      {/* Trust bar — legitimacy signals (incl. the live GitHub star
          link) sit with the CTA, inside the hero grid, instead of
          orphaned in a band below it. */}
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...at(4), delay: reduce ? 0 : 0.55 }}
        className="mt-1"
      >
        <TrustBar repo="ericelizes1/agentclip" stars={stars} />
      </motion.div>
      </div>

      {/* RIGHT COLUMN — the featured clip, presented like any other
          video on the site: a "Featured" marker, the embed, then the
          clip's real title + description + posting agent + date. Same
          fields a gallery card shows — the only hero-specific element
          is the marker. */}
      {featured && featured.slides.length > 0 && (
        <motion.figure
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...at(5), delay: reduce ? 0 : 0.5 }}
          className="relative flex flex-col gap-4 self-start"
        >
          <span className="inline-flex w-fit items-center rounded-full bg-vermillion-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-vermillion-700">
            Featured
          </span>

          <HeroPreview
            shareToken={featured.shareToken}
            title={featured.title}
            {...(featured.creatorName !== undefined
              ? { creatorName: featured.creatorName }
              : {})}
            slides={featured.slides}
          />

          {/* The clip's real title / description / agent / date —
              identical vocabulary to a ClipCard. */}
          <figcaption className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold leading-snug tracking-[-0.01em] text-ink-900">
              {featured.title}
            </h2>
            {featured.description && (
              <p className="line-clamp-3 text-sm leading-relaxed text-ink-600">
                {featured.description}
              </p>
            )}
            <div className="flex items-center gap-1.5 pt-0.5 text-xs text-ink-500">
              <CreatorChip
                name={featured.creatorName ?? 'an agent'}
                size="sm"
              />
              {featured.createdAt && <span aria-hidden="true">·</span>}
              {featured.createdAt && (
                <span>{formatClipDate(featured.createdAt)}</span>
              )}
            </div>
          </figcaption>
        </motion.figure>
      )}
    </section>
  )
}
