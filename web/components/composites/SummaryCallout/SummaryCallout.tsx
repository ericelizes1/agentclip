import { cn } from '@/lib/utils'

export interface SummaryCalloutProps {
  /** Slideshow.summary — the agent's elevator pitch for the run. */
  summary: string
  className?: string
}

/**
 * Vermillion left-rule + "SUMMARY" eyebrow + body. Sits above the
 * MediaFrame stack on the viewer; provides the one-paragraph
 * abstract a reader can scan before deciding to play through.
 *
 * Renders nothing when `summary` is empty so the viewer can drop
 * the callout entirely without the consumer guarding the call.
 */
export function SummaryCallout({ summary, className }: SummaryCalloutProps) {
  if (!summary.trim()) return null

  return (
    <figure
      role="note"
      aria-label="Summary"
      className={cn(
        'border-l-2 border-vermillion-500 pl-5',
        'text-ink-700',
        className,
      )}
    >
      <figcaption className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-vermillion-700">
        Summary
      </figcaption>
      <p className="text-base leading-relaxed">{summary}</p>
    </figure>
  )
}
