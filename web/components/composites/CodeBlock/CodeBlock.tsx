'use client'

import { Check, Copy } from 'lucide-react'
import { useState, type KeyboardEvent } from 'react'

import { cn } from '@/lib/utils'

export interface CodeBlockProps {
  /** Multi-line snippet body. Whitespace is preserved verbatim. */
  code: string
  /** Optional shell-prompt prefix (`$`, `>`, `›`). Stripped from copy. */
  prompt?: string
  /** Visible label announcing the snippet ("Install yourself", etc). */
  label?: string
  className?: string
}

/**
 * Click-to-copy code panel. The entire block is the click target —
 * no separate button — and the copy/check glyph in the corner is a
 * pure visual indicator (it shows what will happen, then confirms
 * it). Activating with Enter or Space also copies, so keyboard users
 * get the same affordance.
 *
 * Resets the "Copied" feedback after 1.6s — long enough for the eye
 * to land on it, short enough that a second copy attempt isn't
 * blocked by stale UI state.
 */
export function CodeBlock({ code, prompt, label, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // Clipboard API can fail in insecure contexts or when the user
      // denies permission. Swallow silently — the user can still
      // select + copy manually.
    }
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      void copy()
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={copied ? 'Copied to clipboard' : 'Click to copy snippet'}
      onClick={() => void copy()}
      onKeyDown={onKeyDown}
      className={cn(
        'group relative cursor-pointer rounded-md border border-ink-200 bg-paper-oat',
        'transition-colors duration-150',
        'hover:border-ink-300 hover:bg-paper-sunken',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vermillion-500',
        className,
      )}
    >
      {label && (
        <div className="border-b border-ink-200 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">
          {label}
        </div>
      )}
      <pre className="overflow-x-auto px-4 py-3 pr-10 font-mono text-sm leading-6 text-ink-800">
        {code.split('\n').map((line, i) => (
          <div key={i}>
            {prompt && <span className="select-none text-ink-400">{prompt} </span>}
            {line}
          </div>
        ))}
      </pre>
      {/* Pure visual indicator — the actual click target is the whole
          panel above. Vertically centered against the panel so single-
          line snippets read balanced; multi-line panels still show the
          icon at the visual midline. Swaps to a vermillion check on
          copy and resets after 1.6s. */}
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 inline-flex size-4 items-center justify-center',
          'transition-colors duration-150',
          copied ? 'text-vermillion-600' : 'text-ink-400 group-hover:text-ink-700',
        )}
      >
        {copied ? (
          <Check className="size-4" />
        ) : (
          <Copy className="size-3.5" />
        )}
      </span>
    </div>
  )
}
