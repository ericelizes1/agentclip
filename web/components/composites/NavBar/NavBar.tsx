'use client'

import { SiGithub } from '@icons-pack/react-simple-icons'
import Link from 'next/link'

import { AgentMark } from '@/components/primitives/AgentMark/AgentMark'
import { Button } from '@/components/primitives/Button/Button'
import { cn } from '@/lib/utils'

export interface NavBarProps {
  /** Public GitHub URL the right-side button links to. */
  githubUrl?: string
  className?: string
}

/**
 * Sticky top nav. Renders the AgentMark brand glyph + AgentClip
 * wordmark on the left and a GitHub button on the right. The mark's
 * vermillion capture window reads as a small dot of color in the
 * chrome — the only persistent brand-color element on the page when sections
 * alternate between paper tones.
 */
export function NavBar({
  githubUrl = 'https://github.com/ericelizes1/agentclip',
  className,
}: NavBarProps) {
  return (
    <nav
      aria-label="Primary"
      className={cn(
        'sticky top-0 z-30 flex items-center justify-between gap-4',
        'border-b border-ink-200 bg-paper/85 backdrop-blur-md',
        'px-4 py-3 sm:px-6',
        className,
      )}
    >
      <Link href="/" className="flex items-center gap-2 text-ink-900">
        <AgentMark size={20} className="text-vermillion-500" />
        <span className="text-[1.05rem] leading-none tracking-tight text-ink-900">
          <span className="font-display font-semibold">Agent</span>
          <span className="font-sans font-bold tracking-[-0.04em]">Clip</span>
        </span>
      </Link>

      <Button asChild variant="ghost" size="sm">
        <a href={githubUrl} target="_blank" rel="noopener noreferrer">
          <SiGithub aria-hidden="true" className="size-4" />
          <span>GitHub</span>
        </a>
      </Button>
    </nav>
  )
}
