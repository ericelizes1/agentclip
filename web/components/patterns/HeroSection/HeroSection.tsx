'use client'

import { motion, useReducedMotion, type Transition } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { SiGithub } from '@icons-pack/react-simple-icons'
import { useEffect, useState } from 'react'

import { Button } from '@/components/primitives/Button/Button'
import { Tabs } from '@/components/primitives/Tabs/Tabs'
import { Typewriter } from '@/components/primitives/Typewriter/Typewriter'
import { CodeBlock } from '@/components/composites/CodeBlock/CodeBlock'
import { RecordingPill } from '@/components/composites/RecordingPill/RecordingPill'
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
  /** Bare pip command — locked default per plan. Tests override this. */
  pipInstall?: string
  /** Agent prompt the second tab puts on the clipboard. */
  agentPrompt?: string
  /** Hides the install card on pages that don't need it. */
  showInstall?: boolean
  /**
   * Real clip rendered as the punchline below the install snippet, plus
   * the link target for the "this page recorded itself" Easter egg.
   * When absent, the section ends at the install card.
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

const PIP_INSTALL_DEFAULT = 'pip install agentclip'
const AGENT_PROMPT_DEFAULT = 'Read agentclip.dev/install.md and set up AgentClip for me.'

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
  pipInstall = PIP_INSTALL_DEFAULT,
  agentPrompt = AGENT_PROMPT_DEFAULT,
  showInstall = true,
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
        'mx-auto flex max-w-3xl flex-col gap-8 px-6 py-20 sm:py-24',
        className,
      )}
    >
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={at(0)}
      >
        <RecordingPill finalContent={<>v0.1 · open source · MCP</>} />
      </motion.div>

      <motion.h1
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={at(1)}
        className={cn(
          // Display serif for the hero; everything else stays Geist.
          'font-display font-semibold tracking-[-0.02em] leading-[1.05] text-ink-900',
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
        className="flex flex-wrap items-center gap-3"
      >
        <Button asChild variant="primary" size="lg">
          <a href={githubUrl} target="_blank" rel="noopener noreferrer">
            <SiGithub aria-hidden="true" className="size-4" />
            View on GitHub
          </a>
        </Button>
        <Button asChild variant="ghost" size="lg">
          <a href="#how-it-works">
            How it works
            <ArrowRight aria-hidden="true" className="size-4" />
          </a>
        </Button>
      </motion.div>

      {showInstall && (
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...at(4), delay: reduce ? 0 : 1.7 }}
          className="rounded-[14px] border border-ink-200 bg-paper shadow-[var(--shadow-whisper)]"
        >
          <Tabs.Root defaultValue="pip">
            <Tabs.List className="m-2">
              <Tabs.Trigger value="pip">Install yourself</Tabs.Trigger>
              <Tabs.Trigger value="agent">Have your agent do it</Tabs.Trigger>
            </Tabs.List>
            <Tabs.Content value="pip" className="mt-0 px-2 pb-2">
              <CodeBlock prompt="$" code={pipInstall} />
              <p className="mt-2 px-2 pb-2 text-xs text-ink-500">
                No install? <span className="font-mono text-ink-700">uvx agentclip --help</span>
              </p>
            </Tabs.Content>
            <Tabs.Content value="agent" className="mt-0 px-2 pb-2">
              <CodeBlock code={agentPrompt} />
            </Tabs.Content>
          </Tabs.Root>
        </motion.div>
      )}

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
