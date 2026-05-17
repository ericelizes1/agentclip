'use client'

/**
 * ClipShareButton — a single share icon for the clip detail page.
 *
 * Replaces the old full-width ClipShareExport panel. Tapping the icon
 * opens a compact popover; the primary action, "Share link," hands
 * off to the OS share sheet via the Web Share API when the browser
 * supports it (every modern mobile browser) and falls back to copying
 * the link otherwise. The export actions — MP4 URL, embed code, PDF —
 * sit below for the desktop/power cases the native sheet can't cover.
 *
 * Same actions as before, one icon instead of a five-card block.
 */

import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

export interface ClipShareButtonProps {
  /** Clip title — the native share sheet's title. */
  title: string
  shareUrl: string
  clipMp4Url: string
  clipPdfUrl: string
  embedUrl: string
  className?: string
}

function buildEmbedSnippet(embedUrl: string): string {
  return `<iframe src="${embedUrl}" width="800" height="450" frameborder="0" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>`
}

export function ClipShareButton({
  title,
  shareUrl,
  clipMp4Url,
  clipPdfUrl,
  embedUrl,
  className,
}: ClipShareButtonProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  async function copy(key: string, value: string) {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(key)
      setTimeout(() => setCopied(null), 1800)
    } catch {
      setCopied(null)
    }
  }

  async function shareLink() {
    // Web Share API → native OS share sheet. On a browser without it
    // (most desktops), fall back to copying the link.
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, url: shareUrl })
        setOpen(false)
        return
      } catch (err) {
        // User dismissed the sheet — not a failure worth surfacing.
        if ((err as Error)?.name === 'AbortError') return
      }
    }
    void copy('link', shareUrl)
  }

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Share this clip"
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-full border border-ink-200',
          'bg-paper-soft text-ink-700 transition',
          'hover:border-vermillion-500 hover:text-ink-900',
          'focus:outline-none focus:ring-2 focus:ring-vermillion-500/40',
        )}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 15V3" />
          <path d="m7 8 5-5 5 5" />
          <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Share or export this clip"
          className={cn(
            'absolute right-0 z-20 mt-2 w-64 overflow-hidden rounded-xl',
            'border border-ink-200 bg-white shadow-lg',
          )}
        >
          <button
            type="button"
            role="menuitem"
            onClick={shareLink}
            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-ink-900 transition hover:bg-vermillion-50/40"
          >
            Share link
            {copied === 'link' && (
              <span className="text-xs font-medium text-vermillion-700">Copied</span>
            )}
          </button>
          <div className="border-t border-ink-100" />
          {[
            {
              key: 'mp4',
              label: 'Copy MP4 URL',
              sub: 'GitHub PRs, READMEs',
              value: clipMp4Url,
            },
            {
              key: 'embed',
              label: 'Copy embed code',
              sub: 'Notion, Substack, blog',
              value: buildEmbedSnippet(embedUrl),
            },
          ].map((row) => (
            <button
              key={row.key}
              type="button"
              role="menuitem"
              onClick={() => copy(row.key, row.value)}
              className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition hover:bg-vermillion-50/40"
            >
              <span className="flex flex-col">
                <span className="text-sm text-ink-900">{row.label}</span>
                <span className="text-xs text-ink-500">{row.sub}</span>
              </span>
              {copied === row.key && (
                <span className="text-xs font-medium text-vermillion-700">Copied</span>
              )}
            </button>
          ))}
          <a
            role="menuitem"
            href={clipPdfUrl}
            download
            className="flex flex-col px-4 py-2.5 transition hover:bg-vermillion-50/40"
          >
            <span className="text-sm text-ink-900">Download PDF</span>
            <span className="text-xs text-ink-500">Branded walkthrough</span>
          </a>
        </div>
      )}
    </div>
  )
}
