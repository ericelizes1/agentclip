/**
 * ClipViewTabs — server-rendered tabs for the clip detail page.
 *
 * Two tabs: Watch (default) renders the narrated video player; Slides
 * renders the slide-by-slide stacked view. Tab state is URL-driven via
 * the `?view=scroll` query param so the picks are deep-linkable and
 * the page stays a Server Component (no hydration cost on the tabs
 * themselves).
 *
 * The Watch tab is omitted entirely when the clip isn't fully
 * narrated — VideoClipPlayer expects audio on every slide. In that
 * case the Slides view becomes the only option, no toggle.
 */

import Link from 'next/link'

import { cn } from '@/lib/utils'

export type ClipView = 'watch' | 'scroll'

export interface ClipViewTabsProps {
  shareToken: string
  current: ClipView
  /** Whether the Watch tab is available. False for non-narrated clips. */
  watchAvailable: boolean
  className?: string
}

export function ClipViewTabs({
  shareToken,
  current,
  watchAvailable,
  className,
}: ClipViewTabsProps) {
  // Single-tab UX is just an eyebrow label; no clickable toggle.
  if (!watchAvailable) {
    return (
      <div
        className={cn(
          'mb-4 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-ink-500',
          className,
        )}
      >
        <span>Slides</span>
      </div>
    )
  }

  const tabs: Array<{ key: ClipView; label: string; href: string }> = [
    { key: 'watch', label: 'Watch', href: `/s/${shareToken}` },
    { key: 'scroll', label: 'Slides', href: `/s/${shareToken}?view=scroll` },
  ]

  return (
    <nav
      className={cn(
        'mb-6 inline-flex items-center gap-1 rounded-full border border-ink-200 bg-paper-soft p-1',
        className,
      )}
      aria-label="View mode"
    >
      {tabs.map((tab) => {
        const active = tab.key === current
        return (
          <Link
            key={tab.key}
            href={tab.href}
            scroll={false}
            replace
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium transition',
              active
                ? 'bg-ink-900 text-white'
                : 'text-ink-700 hover:text-ink-900',
            )}
            aria-current={active ? 'page' : undefined}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
