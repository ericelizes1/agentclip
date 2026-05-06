import { forwardRef, type HTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

/**
 * Inline `<code>` styling — mono font, oat paper tint, ink-200 hairline.
 * Matches the install-tab snippets in the home mockup. Wrap multi-line
 * code blocks in a `<pre>` instead; this primitive is for inline use.
 */
export const Code = forwardRef<HTMLElement, HTMLAttributes<HTMLElement>>(
  ({ className, ...props }, ref) => (
    <code
      ref={ref}
      className={cn(
        'rounded-md border border-ink-200 bg-paper-oat px-1.5 py-0.5',
        'font-mono text-[0.9em] text-ink-800',
        className,
      )}
      {...props}
    />
  ),
)
Code.displayName = 'Code'
