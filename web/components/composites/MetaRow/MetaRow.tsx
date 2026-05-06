import { cn } from '@/lib/utils'

export interface MetaRowProps {
  /** Bullet-separated dot labels: dates, counts, run identifiers. */
  labels: string[]
  /** Optional creator credit, rendered after the labels as "Filed by". */
  createdBy?: string
  /** When set, the credit becomes a link to this URL. */
  createdByUrl?: string
  className?: string
}

/**
 * Reads as: `Mar 14, 2026 · 7 clips · sales-demo  ·  Filed by Eric Elizes`.
 *
 * The "Filed by" segment is only emitted when `createdBy` is non-empty.
 * If `createdByUrl` is set, the name links out (target=_blank,
 * rel=noopener); otherwise it's plain text. This mirrors the
 * pre-pivot Django template behavior so existing slideshows render
 * identically after the migration.
 */
export function MetaRow({ labels, createdBy, createdByUrl, className }: MetaRowProps) {
  const showCredit = Boolean(createdBy && createdBy.trim())
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-1',
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
        <span className="flex items-center gap-2">
          <span aria-hidden="true">·</span>
          <span className="text-ink-700">
            Filed by{' '}
            {createdByUrl ? (
              <a
                href={createdByUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-vermillion-700 underline-offset-2 hover:underline"
              >
                {createdBy}
              </a>
            ) : (
              <span className="text-ink-900">{createdBy}</span>
            )}
          </span>
        </span>
      )}
    </div>
  )
}
