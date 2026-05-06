import { SiGithub } from '@icons-pack/react-simple-icons'
import Link from 'next/link'

import { Button } from '@/components/primitives/Button/Button'
import { cn } from '@/lib/utils'

export interface NavBarProps {
  /** Public GitHub URL the right-side button links to. */
  githubUrl?: string
  className?: string
}

/**
 * Sticky top nav. Brand mark on the left (vermillion bullet +
 * AgentClip wordmark), GitHub button on the right. Sticks to the
 * top via `sticky` so it stays in view while a long viewer scrolls
 * — pre-pivot Django page used the same behavior.
 */
export function NavBar({
  githubUrl = 'https://github.com/elizes/agentclip',
  className,
}: NavBarProps) {
  return (
    <nav
      aria-label="Primary"
      className={cn(
        'sticky top-0 z-30 flex items-center justify-between gap-4',
        'border-b border-ink-200 bg-paper/80 backdrop-blur-md',
        'px-6 py-3',
        className,
      )}
    >
      <Link href="/" className="flex items-center gap-2 text-ink-900">
        <span aria-hidden="true" className="size-2.5 rounded-full bg-vermillion-500" />
        <span className="font-semibold tracking-tight">AgentClip</span>
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
