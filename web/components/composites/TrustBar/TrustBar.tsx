import { Star } from 'lucide-react'
import { SiGithub } from '@icons-pack/react-simple-icons'

import { cn } from '@/lib/utils'

export interface TrustBarProps {
  /** GitHub repo path in `owner/repo` form. Drives the star-count link. */
  repo: string
  /**
   * Live star count. Pass null when the count is unavailable (API
   * failure, zero stars, etc) — the chip then hides the badge so we
   * never advertise "0 stars."
   */
  stars: number | null
  className?: string
}

/**
 * Single horizontal row of trust signals beneath the hero. Three
 * facts, all real:
 *   - GitHub stars (live count, fetched server-side)
 *   - Free forever
 *   - Open source
 *   - Self-hosted
 *
 * The star count is omitted when null or zero so we never advertise
 * "0 stars" — that's worse than no number at all. Once a star count
 * exists the badge surfaces automatically on the next ISR rebuild.
 */
export function TrustBar({ repo, stars, className }: TrustBarProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-center gap-x-4 gap-y-2',
        'text-[12px] font-medium tracking-tight text-ink-600',
        className,
      )}
    >
      {stars !== null && stars > 0 && (
        <a
          href={`https://github.com/${repo}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-paper px-2.5 py-1 transition-colors hover:border-ink-300 hover:text-ink-900"
        >
          <Star aria-hidden="true" className="size-3 fill-vermillion-500 text-vermillion-500" />
          <span className="font-mono tabular-nums text-ink-800">
            {stars.toLocaleString()}
          </span>
          <span className="text-ink-500">on GitHub</span>
        </a>
      )}
      <span className="inline-flex items-center gap-1.5">
        <Dot />
        Free forever
      </span>
      <Pip />
      <span className="inline-flex items-center gap-1.5">
        <SiGithub aria-hidden="true" className="size-3 text-ink-500" />
        Open source
      </span>
      <Pip />
      <span className="inline-flex items-center gap-1.5">
        <Dot />
        Self-hosted
      </span>
    </div>
  )
}

function Pip() {
  return (
    <span aria-hidden="true" className="hidden text-ink-300 sm:inline">
      ·
    </span>
  )
}

function Dot() {
  return (
    <span
      aria-hidden="true"
      className="inline-block size-1.5 rounded-full bg-vermillion-500"
    />
  )
}

/**
 * Fetches the star count from GitHub with 5-minute ISR. Returns null
 * on any failure so callers can render the bar without the badge.
 * Exported so the page-level loader can `await` it alongside the
 * gallery fetch.
 */
export async function fetchStarCount(repo: string): Promise<number | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}`, {
      next: { revalidate: 300 },
      headers: { Accept: 'application/vnd.github+json' },
    })
    if (!res.ok) return null
    const data = (await res.json()) as { stargazers_count?: number }
    return typeof data.stargazers_count === 'number'
      ? data.stargazers_count
      : null
  } catch {
    return null
  }
}
