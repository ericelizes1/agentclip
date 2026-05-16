import { cn } from '@/lib/utils'

export interface SummaryCalloutProps {
  /** Slideshow.summary — the agent's elevator pitch for the run. */
  summary: string
  /**
   * Eyebrow label. Defaults to "Summary" (the spoken-outro framing
   * used in watch mode); read mode leads with this block and passes
   * "Takeaway" so it reads as an up-front abstract, not a recap.
   */
  label?: string
  className?: string
}

/**
 * Vermillion left-rule + eyebrow + body. Provides the one-paragraph
 * abstract a reader can scan; read mode renders it above the
 * MediaFrame stack, watch mode renders it after the player.
 *
 * Renders nothing when `summary` is empty so the viewer can drop
 * the callout entirely without the consumer guarding the call.
 */
export function SummaryCallout({
  summary,
  label = 'Summary',
  className,
}: SummaryCalloutProps) {
  if (!summary.trim()) return null

  return (
    <figure
      role="note"
      aria-label={label}
      className={cn(
        'border-l-2 border-vermillion-500 pl-5',
        'text-ink-700',
        className,
      )}
    >
      <figcaption className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-vermillion-700">
        {label}
      </figcaption>
      <p className="text-base leading-relaxed">{summary}</p>
    </figure>
  )
}
