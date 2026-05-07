import { CreatorChip } from '@/components/composites/CreatorChip/CreatorChip'
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
 * Reads as: `Mar 14, 2026 · 7 clips · [EE] Eric Elizes`.
 *
 * Renders the creator's name next to a circular gradient avatar
 * (via CreatorChip). No "Filed by" / "By Eric" prefix — the chip
 * itself is the credit, name plus initials. Clicking opens the
 * portfolio URL when one is set.
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
          <CreatorChip
            name={createdBy as string}
            {...(createdByUrl ? { url: createdByUrl } : {})}
            size="sm"
          />
        </span>
      )}
    </div>
  )
}
