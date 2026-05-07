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
 * pure visual indicator. On copy, a small burst of vermillion
 * particles radiates from the indicator and a "Copied" tooltip fades
 * in for 1.6s.
 *
 * Activating with Enter or Space also copies, so keyboard users get
 * the same affordance.
 */
export function CodeBlock({ code, prompt, label, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const [burstKey, setBurstKey] = useState(0)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setBurstKey((k) => k + 1)
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
      <pre className="overflow-x-auto px-4 py-3 pr-12 font-mono text-sm leading-6 text-ink-800">
        {code.split('\n').map((line, i) => (
          <div key={i}>
            {prompt && <span className="select-none text-ink-400">{prompt} </span>}
            {line}
          </div>
        ))}
      </pre>
      {/* Indicator stack: glyph + burst particles + 'Copied' tooltip.
          The whole stack is centered against the panel's vertical
          midline so single-line snippets look balanced. */}
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute right-3 top-1/2 inline-flex -translate-y-1/2 items-center',
        )}
      >
        {/* "Copied" floating label — fades in on copy, fades out on
            reset. Sits to the LEFT of the glyph. */}
        <span
          className={cn(
            'mr-2 inline-block text-[10px] font-semibold uppercase tracking-[0.14em] text-vermillion-700',
            'transition-all duration-200',
            copied
              ? 'translate-x-0 opacity-100'
              : 'translate-x-1 opacity-0',
          )}
        >
          Copied
        </span>
        {/* Glyph + radiating particle burst */}
        <span
          className={cn(
            'relative inline-flex size-4 items-center justify-center',
            'transition-colors duration-150',
            copied ? 'text-vermillion-600' : 'text-ink-400 group-hover:text-ink-700',
          )}
        >
          {copied ? (
            <Check className="size-4" />
          ) : (
            <Copy className="size-3.5" />
          )}
          {/* Six small vermillion sparks radiating outward on each
              copy. Re-keyed via burstKey so the animation replays on
              repeat copies. CSS-only — no framer-motion needed. */}
          {copied && <Sparks key={burstKey} />}
        </span>
      </span>
    </div>
  )
}

function Sparks() {
  // Six particles arranged in a hex pattern. Each fades + travels
  // outward then disappears. Vermillion, ~6px diameter.
  const positions = [
    { x: -10, y: 0 },
    { x: -7, y: -7 },
    { x: 7, y: -7 },
    { x: 10, y: 0 },
    { x: 7, y: 7 },
    { x: -7, y: 7 },
  ]
  return (
    <span className="pointer-events-none absolute inset-0">
      {positions.map((pos, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 inline-block size-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-vermillion-500 opacity-0"
          style={{
            animation: `spark-out 0.55s ease-out forwards`,
            animationDelay: `${i * 0.015}s`,
            // CSS variables consumed by the keyframe (defined in
            // globals.css) so each particle travels to its slot.
            ['--spark-x' as string]: `${pos.x}px`,
            ['--spark-y' as string]: `${pos.y}px`,
          }}
        />
      ))}
    </span>
  )
}
