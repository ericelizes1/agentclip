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
        // Editorial hero: wider container, oversized headline, generous
        // negative space. Each block lands as a separate beat rather
        // than running into the next.
        'relative mx-auto flex max-w-5xl flex-col gap-10 px-6 py-24 sm:px-10 sm:py-32',
        className,
      )}
    >
      {/*
        Editorial issue chip — small magazine-style marker at the top
        of the hero. Replaces the now-removed brand-mark beat with
        something that signals "this is a published piece" rather
        than "this is a generic landing page".
      */}
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={at(0)}
        className="-mb-4 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-500"
      >
        <span className="font-mono tabular-nums text-vermillion-700">
          Issue 01
        </span>
        <span aria-hidden="true" className="h-px w-8 bg-ink-300" />
        <span>2026 · Open source</span>
      </motion.div>

      <motion.h1
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={at(1)}
        className={cn(
          // Display serif (Fraunces) for the hero headline only — the
          // signature voice of the page. Body and chrome stay Geist.
          // Magazine-cover scale: pushes to 7rem on desktop so the
          // hero feels like a STATEMENT, not a feature header.
          'font-display font-semibold tracking-[-0.025em] leading-[0.98] text-ink-900',
          'text-[clamp(2.75rem,1.4rem+6vw,6.25rem)]',
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
        Install card is the PRIMARY action. Two tabs: a copy-pasteable
        pip command for visitors who'll set it up themselves, and a
        natural-language prompt visitors can hand to their agent. The
        product is "your agent uses it" — both paths are first-class.
        GitHub demoted to a small text link below.
      */}
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...at(3), delay: reduce ? 0 : 1.6 }}
        className="max-w-[640px] rounded-[14px] border border-ink-200 bg-paper shadow-[var(--shadow-whisper)]"
      >
        <Tabs.Root defaultValue="pip">
          <Tabs.List className="m-2">
            <Tabs.Trigger value="pip">Install yourself</Tabs.Trigger>
            <Tabs.Trigger value="agent">Have your agent do it</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="pip" className="mt-0 px-2 pb-2">
            <CodeBlock prompt="$" code="pip install agentclip" />
            <p className="mt-2 px-2 pb-1 text-xs text-ink-500">
              No install?{' '}
              <span className="font-mono text-ink-700">
                uvx agentclip --help
              </span>
            </p>
          </Tabs.Content>
          <Tabs.Content value="agent" className="mt-0 px-2 pb-2">
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

      {featured && featured.slides.length > 0 && (
        <motion.figure
          initial={reduce ? false : { opacity: 0, y: 16, rotate: -1.3 }}
          animate={{ opacity: 1, y: 0, rotate: reduce ? 0 : -0.6 }}
          transition={{ ...at(5), delay: reduce ? 0 : 1.85 }}
          className={cn(
            // Polaroid-style framing: rotated slightly so the embed
            // reads as a curated artifact pinned to the page rather
            // than another centered widget. Hovering lifts + levels.
            'group/embed relative mt-6 transition-transform duration-300 ease-out',
            'hover:rotate-0 hover:scale-[1.005]',
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
          {/*
            Italic caption beneath the embed — magazine-style. Reads
            as the editor's note, not as functional UI text. The em
            dash is decorative, not a typo.
          */}
          <figcaption className="mt-4 max-w-[60ch] font-display text-sm italic leading-snug text-ink-500">
            <span className="text-vermillion-700">↑</span>{' '}
            agentclip.dev itself, captured by the agent that built it.
            One real run, four shareable frames.
          </figcaption>
        </motion.figure>
      )}
    </section>
  )
}
