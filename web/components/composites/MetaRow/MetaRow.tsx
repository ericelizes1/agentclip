import { CreatorAvatar } from '@/components/composites/CreatorAvatar/CreatorAvatar'
import { cn } from '@/lib/utils'

export interface MetaRowProps {
  /** Bullet-separated dot labels: dates, counts, run identifiers. */
  labels: string[]
  /** Optional creator name, rendered as a gradient avatar circle. */
  createdBy?: string
  /** Optional URL the avatar links to (portfolio, GitHub, LinkedIn). */
  createdByUrl?: string
  className?: string
}

/**
 * Reads as: `Mar 14, 2026 · 7 clips · sales-demo   [EE]`.
 *
 * The creator credit is a circular gradient avatar with initials
 * (CreatorAvatar) instead of a "Filed by Eric" text run. The full
 * name appears on hover via the avatar's tooltip; clicking opens
 * the portfolio URL when one is set. Visual signature stays compact
 * so the row reads as facts + identity, not facts + sentence.
 */
export function MetaRow({ labels, createdBy, createdByUrl, className }: MetaRowProps) {
  const showCredit = Boolean(createdBy && createdBy.trim())
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-2',
        'text-xs uppercase tracking-[0.12em] text-ink-500',
        className,
      )}
    >
      {labels.map((label, i) => (
        <span key={`${label}-${i}`} className="flex items-center gap-3">
          {i > 0 && <span aria-hidden="true">·</span>}
          <span>{label}</span>
        </span>
      ))}
      {showCredit && (
        <span className="ml-auto flex items-center sm:ml-3">
          <span aria-hidden="true" className="mr-3 hidden sm:inline">
            ·
          </span>
          <CreatorAvatar
            name={createdBy as string}
            {...(createdByUrl ? { url: createdByUrl } : {})}
            size={32}
          />
        </span>
      )}
    </div>
  )
}
