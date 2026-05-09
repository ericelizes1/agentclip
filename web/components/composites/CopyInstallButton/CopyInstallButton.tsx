'use client'

import { Check } from 'lucide-react'
import { useState } from 'react'

import { cn } from '@/lib/utils'

export interface CopyInstallButtonProps {
  command?: string
  className?: string
}

/**
 * Closing-CTA button that copies the install command to the clipboard
 * and morphs to a "Copied" confirmation. Visually mirrors the prior
 * `Install AgentClip` link so the page rhythm stays the same — the
 * difference is the click now does the install thing instead of
 * scrolling somewhere.
 */
export function CopyInstallButton({
  command = 'pip install agentclip',
  className,
}: CopyInstallButtonProps) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Clipboard API can fail in insecure contexts. Fall back silently —
      // the command is also visible in the hero CodeBlock above.
    }
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      aria-label={copied ? 'Install command copied' : `Copy ${command}`}
      className={cn(
        'inline-flex items-center gap-2 rounded-full bg-vermillion-500 px-5 py-2.5 text-sm font-medium tracking-tight text-paper shadow-[0_8px_22px_-12px_rgba(217,72,36,0.65)] transition-transform duration-200 ease-out hover:-translate-y-px',
        className,
      )}
    >
      {copied ? (
        <>
          Copied <span className="font-mono text-paper/80">{command}</span>
          <Check aria-hidden="true" className="size-3.5" />
        </>
      ) : (
        <>
          Install AgentClip
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M3 7 L11 7 M7 3 L11 7 L7 11"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </>
      )}
    </button>
  )
}
