'use client'

import { Check, Copy } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/primitives/Button/Button'
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
 * Multi-line code panel with a copy-to-clipboard affordance.
 * The button uses the Button primitive's ghost variant so it
 * inherits the locked focus ring + 42px radius.
 *
 * Resets the "Copied" feedback after 1.6s — long enough for the
 * eye to land on it, short enough that a second copy attempt
 * isn't blocked by stale UI state.
 */
export function CodeBlock({ code, prompt, label, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const onCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div
      className={cn(
        'group relative rounded-md border border-ink-200 bg-paper-oat',
        className,
      )}
    >
      {label && (
        <div className="border-b border-ink-200 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">
          {label}
        </div>
      )}
      <pre className="overflow-x-auto px-4 py-3 font-mono text-sm leading-6 text-ink-800">
        {code.split('\n').map((line, i) => (
          <div key={i}>
            {prompt && <span className="select-none text-ink-400">{prompt} </span>}
            {line}
          </div>
        ))}
      </pre>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onCopy}
        aria-label={copied ? 'Copied to clipboard' : 'Copy snippet to clipboard'}
        className="absolute right-2 top-2 h-7 w-7 px-0"
      >
        {copied ? (
          <Check aria-hidden="true" className="size-3.5 text-vermillion-600" />
        ) : (
          <Copy aria-hidden="true" className="size-3.5" />
        )}
      </Button>
    </div>
  )
}
