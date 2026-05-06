'use client'

import { motion, useReducedMotion, type Transition } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { SiGithub } from '@icons-pack/react-simple-icons'

import { Button } from '@/components/primitives/Button/Button'
import { Pill } from '@/components/primitives/Pill/Pill'
import { Tabs } from '@/components/primitives/Tabs/Tabs'
import { CodeBlock } from '@/components/composites/CodeBlock/CodeBlock'
import { cn } from '@/lib/utils'

export interface HeroSectionProps {
  /** GitHub URL the primary CTA points at. */
  githubUrl?: string
  /** Bare pip command — locked default per plan. Tests override this. */
  pipInstall?: string
  /** Agent prompt the second tab puts on the clipboard. */
  agentPrompt?: string
  /** Hides the install card on pages that don't need it. */
  showInstall?: boolean
  className?: string
}

const PIP_INSTALL_DEFAULT = 'pip install agentclip'
const AGENT_PROMPT_DEFAULT = 'Read agentclip.dev/install.md and set up AgentClip for me.'

const stagger: Transition = { duration: 0.45, ease: [0.2, 0.7, 0.2, 1] }

/**
 * Home-page hero. Pill + headline (with the em-underline keyword) +
 * lede + primary/secondary CTAs + locked install card. Reveal cadence
 * is a 60ms cascade per the locked spec; honors prefers-reduced-motion
 * by collapsing all delays to zero.
 *
 * The headline emphasizes "screencast" via a `<em>` element — the CSS
 * decoration in globals.css turns it into a 5px vermillion underline,
 * matching the locked design (NOT italic, NOT colored text).
 */
export function HeroSection({
  githubUrl = 'https://github.com/ericelizes1/agentclip',
  pipInstall = PIP_INSTALL_DEFAULT,
  agentPrompt = AGENT_PROMPT_DEFAULT,
  showInstall = true,
  className,
}: HeroSectionProps) {
  const reduce = useReducedMotion()
  const at = (i: number) =>
    reduce ? { ...stagger, delay: 0 } : { ...stagger, delay: i * 0.06 }

  return (
    <section className={cn('mx-auto flex max-w-3xl flex-col gap-7 px-6 py-20', className)}>
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={at(0)}
      >
        <Pill>v0.1 · open source · MCP</Pill>
      </motion.div>

      <motion.h1
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={at(1)}
        className={cn(
          'font-bold tracking-[-0.04em] leading-[1.02] text-ink-900',
          'text-[clamp(2.5rem,1.7rem+4.5vw,4.5rem)]',
        )}
      >
        Skip the
        <br />
        <em className="not-italic [text-decoration:underline] [text-decoration-color:var(--color-vermillion-500)] [text-decoration-thickness:5px] [text-underline-offset:0.16em]">
          screencast.
        </em>
      </motion.h1>

      <motion.p
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={at(2)}
        className="max-w-[52ch] text-lg text-ink-600 sm:text-xl"
      >
        QA runs, walkthroughs, bug repros — your agent records the run, narrates
        it, and ships you a URL anyone can watch.
      </motion.p>

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={at(3)}
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
          transition={at(4)}
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
    </section>
  )
}
