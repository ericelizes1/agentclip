import { cn } from '@/lib/utils'

export interface SectionHeaderProps {
  /**
   * Two-digit section index, rendered in the eyebrow chip alongside
   * the eyebrow label. Pass as a string so the caller controls
   * formatting (e.g. "01" / "02"). Omit on sections that don't number.
   */
  index?: string
  /**
   * Editorial uppercase eyebrow — the section's category label
   * (e.g. "How it works", "In the gallery"). Always uppercased and
   * vermillion-tinted in the rendered output.
   */
  eyebrow: string
  /** The section's H2 — the headline. */
  title: string
  /** Optional one-liner under the H2. Plain ink-600 text. */
  description?: string
  /** Optional id propagated to the H2 for `aria-labelledby` use. */
  headingId?: string
  /** Right-side meta slot — counts, labels, secondary controls. */
  meta?: React.ReactNode
  /** Center-aligned variant for the closing line treatment. */
  align?: 'left' | 'center'
  /** Color tone — pass 'dark' when the section sits on a dark background. */
  tone?: 'light' | 'dark'
  className?: string
}

/**
 * Canonical section header used across the home page. Establishes
 * the same scan rhythm in every section: small numbered eyebrow chip
 * → bold tracking-tight H2 → optional one-line description. Adds a
 * hairline rule under the title for editorial weight.
 *
 * Reads as: `[01 · INSTALL]   How it works.   →   3 steps`
 *
 * Used in: home `How it works`, `Gallery`, `Closing` sections, and
 * any future home-page module. Keeps section-to-section transitions
 * consistent so the page reads as one continuous artifact rather
 * than four loosely-related slabs.
 */
export function SectionHeader({
  index,
  eyebrow,
  title,
  description,
  headingId,
  meta,
  align = 'left',
  tone = 'light',
  className,
}: SectionHeaderProps) {
  const dark = tone === 'dark'
  return (
    <header
      className={cn(
        'mb-10 border-b pb-5',
        dark ? 'border-ink-700' : 'border-ink-200',
        align === 'center' && 'text-center',
        className,
      )}
    >
      <div
        className={cn(
          'flex items-end gap-4',
          align === 'center' ? 'flex-col' : 'flex-wrap justify-between',
        )}
      >
        <div className={cn(align === 'center' && 'flex flex-col items-center')}>
          <span
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-2.5 py-1',
              'text-[10px] font-semibold uppercase tracking-[0.18em]',
              dark
                ? 'border-vermillion-500/40 bg-vermillion-500/15 text-vermillion-300'
                : 'border-vermillion-500/30 bg-vermillion-500/[0.06] text-vermillion-700',
            )}
          >
            {index && <span className="font-mono tabular-nums">{index}</span>}
            {index && (
              <span
                aria-hidden="true"
                className={dark ? 'text-vermillion-300/50' : 'text-vermillion-500/50'}
              >
                ·
              </span>
            )}
            <span>{eyebrow}</span>
          </span>
          <h2
            id={headingId}
            className={cn(
              'mt-3 font-display text-3xl font-medium tracking-[-0.01em] sm:text-4xl',
              dark ? 'text-paper' : 'text-ink-900',
            )}
          >
            {title}
          </h2>
          {description && (
            <p
              className={cn(
                'mt-2 max-w-[60ch] text-base',
                dark ? 'text-ink-300' : 'text-ink-600',
              )}
            >
              {description}
            </p>
          )}
        </div>
        {meta && (
          <div
            className={cn(
              'text-xs uppercase tracking-[0.14em]',
              dark ? 'text-ink-400' : 'text-ink-500',
              align === 'center' && 'mt-3',
            )}
          >
            {meta}
          </div>
        )}
      </div>
    </header>
  )
}
