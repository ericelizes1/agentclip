'use client'

import { CaptureStack } from '@/components/patterns/PageViewfinder/CaptureStack'
import { cn } from '@/lib/utils'

export interface HomeSidebarProps {
  /**
   * URL the merged "Your walkthrough →" CTA links to once every slot
   * is captured. When omitted, the rail is not rendered (e.g., the
   * home page has no featured clip configured yet).
   */
  walkthroughHref?: string
  className?: string
}

/**
 * Right-side rail used on the home page. Information hierarchy is
 * intentionally tight: a single morphing status pill at the top
 * (Clipping… → Your walkthrough →) followed by the four slot cards.
 * Brand mark and GitHub link live in the hero, not here.
 */
export function HomeSidebar({
  walkthroughHref,
  className,
}: HomeSidebarProps) {
  if (!walkthroughHref) return null
  return (
    <div className={cn('flex flex-col', className)}>
      <CaptureStack walkthroughHref={walkthroughHref} />
    </div>
  )
}
