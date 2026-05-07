'use client'

/**
 * ClipShareExport — share/embed/download panel for the clip detail page.
 *
 * Five actions:
 *   - Copy link: the canonical share URL. Slack/iMessage/Discord cards
 *     unfurl this into an inline video via OG meta tags.
 *   - Copy MP4 URL: the literal `.mp4` URL. Use in GitHub PRs/READMEs
 *     where only direct video files render inline.
 *   - Copy slideshow link: the `?view=scroll` deep link, for readers
 *     who want to skim the slides instead of watching.
 *   - Copy embed code: ready-to-paste `<iframe>` HTML. For Notion,
 *     Substack, blog posts.
 *   - Download PDF: anchor with `download` attribute. Branded
 *     walkthrough PDF generated server-side.
 *
 * Each button shows an inline "Copied" tooltip on success and a
 * "Copy failed" tooltip when the Clipboard API rejects (e.g. older
 * Safari without permission). Falls back to no-op when the browser
 * doesn't expose navigator.clipboard at all.
 */

import { useState } from 'react'

import { cn } from '@/lib/utils'

export interface ClipShareExportProps {
  shareUrl: string
  clipMp4Url: string
  clipPdfUrl: string
  embedUrl: string
  className?: string
}

interface ActionState {
  status: 'idle' | 'copied' | 'failed'
  key: string | null
}

function buildEmbedSnippet(embedUrl: string): string {
  return `<iframe src="${embedUrl}" width="800" height="450" frameborder="0" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>`
}

function buildScrollUrl(shareUrl: string): string {
  // The `?view=scroll` query param deep-links to the slide list mode
  // of the same page.
  const sep = shareUrl.includes('?') ? '&' : '?'
  return `${shareUrl}${sep}view=scroll`
}

export function ClipShareExport({
  shareUrl,
  clipMp4Url,
  clipPdfUrl,
  embedUrl,
  className,
}: ClipShareExportProps) {
  const [state, setState] = useState<ActionState>({ status: 'idle', key: null })

  async function copy(key: string, value: string) {
    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard) {
        throw new Error('clipboard API unavailable')
      }
      await navigator.clipboard.writeText(value)
      setState({ status: 'copied', key })
    } catch {
      setState({ status: 'failed', key })
    }
    // Reset the tooltip after a beat so a second click re-shows it.
    setTimeout(() => setState({ status: 'idle', key: null }), 1800)
  }

  function tooltipFor(key: string): string | null {
    if (state.key !== key) return null
    if (state.status === 'copied') return 'Copied'
    if (state.status === 'failed') return 'Copy failed'
    return null
  }

  const buttons: Array<{
    key: string
    label: string
    sublabel: string
    onClick: () => void
  }> = [
    {
      key: 'link',
      label: 'Copy link',
      sublabel: 'Slack, iMessage, Discord',
      onClick: () => copy('link', shareUrl),
    },
    {
      key: 'mp4',
      label: 'Copy MP4 URL',
      sublabel: 'GitHub PRs, READMEs',
      onClick: () => copy('mp4', clipMp4Url),
    },
    {
      key: 'scroll',
      label: 'Copy slideshow link',
      sublabel: 'Skim slide-by-slide',
      onClick: () => copy('scroll', buildScrollUrl(shareUrl)),
    },
    {
      key: 'embed',
      label: 'Copy embed code',
      sublabel: 'Notion, Substack, blog',
      onClick: () => copy('embed', buildEmbedSnippet(embedUrl)),
    },
  ]

  return (
    <section
      className={cn(
        'rounded-2xl border border-ink-200 bg-paper-soft p-5 sm:p-6',
        className,
      )}
      aria-label="Share or export this clip"
    >
      <header className="mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-ink-700">
          Share &amp; export
        </h2>
        <p className="mt-1 text-sm text-ink-500">
          One link plays as a video everywhere. Or grab the file you need.
        </p>
      </header>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {buttons.map((b) => (
          <button
            key={b.key}
            type="button"
            onClick={b.onClick}
            className={cn(
              'group relative flex flex-col items-start rounded-lg border border-ink-200',
              'bg-white px-4 py-3 text-left transition',
              'hover:border-vermillion-500 hover:bg-vermillion-50/30',
              'focus:outline-none focus:ring-2 focus:ring-vermillion-500/40',
            )}
          >
            <span className="text-sm font-medium text-ink-900">{b.label}</span>
            <span className="mt-0.5 text-xs text-ink-500">{b.sublabel}</span>
            {tooltipFor(b.key) && (
              <span
                className={cn(
                  'absolute right-3 top-3 rounded px-2 py-0.5 text-xs font-medium',
                  state.status === 'copied'
                    ? 'bg-vermillion-700 text-white'
                    : 'bg-ink-700 text-white',
                )}
              >
                {tooltipFor(b.key)}
              </span>
            )}
          </button>
        ))}
        {/* Download PDF — anchor instead of button so the browser handles
            the actual download via the `download` attribute. */}
        <a
          href={clipPdfUrl}
          download
          className={cn(
            'group flex flex-col items-start rounded-lg border border-ink-200',
            'bg-white px-4 py-3 text-left transition',
            'hover:border-vermillion-500 hover:bg-vermillion-50/30',
            'focus:outline-none focus:ring-2 focus:ring-vermillion-500/40',
            'sm:col-span-2',
          )}
        >
          <span className="text-sm font-medium text-ink-900">Download PDF</span>
          <span className="mt-0.5 text-xs text-ink-500">
            Branded walkthrough — attach to a Jira ticket or PR
          </span>
        </a>
      </div>
    </section>
  )
}
