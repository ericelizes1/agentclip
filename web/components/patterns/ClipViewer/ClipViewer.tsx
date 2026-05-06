import { MediaFrame, type MediaKind } from '@/components/composites/MediaFrame/MediaFrame'
import { MetaRow } from '@/components/composites/MetaRow/MetaRow'
import { NavBar } from '@/components/composites/NavBar/NavBar'
import { SummaryCallout } from '@/components/composites/SummaryCallout/SummaryCallout'
import { cn } from '@/lib/utils'

export interface ClipViewerSlide {
  id: number | string
  position: number
  caption?: string
  media_url: string
  media_kind: MediaKind
}

export interface ClipViewerSlideshow {
  id: string
  title: string
  description?: string
  summary?: string
  created_by?: string
  created_by_url?: string
  created_at: string
  slides: ClipViewerSlide[]
}

export interface ClipViewerProps {
  slideshow: ClipViewerSlideshow
  /** GitHub URL for the navbar's right-hand button. */
  githubUrl?: string
  className?: string
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Top-level layout for /s/[token]. The Server Component in
 * web/app/s/[token]/page.tsx fetches the slideshow shape and hands
 * it to this pattern as one prop.
 *
 * Composition:
 *   NavBar
 *   Hero (title + description + MetaRow)
 *   SummaryCallout (omitted when empty)
 *   <ol> of MediaFrame slides
 */
export function ClipViewer({ slideshow, githubUrl, className }: ClipViewerProps) {
  const meta: string[] = [formatDate(slideshow.created_at), `${slideshow.slides.length} clips`]

  return (
    <div className={cn('min-h-screen bg-paper text-ink-900', className)}>
      <NavBar {...(githubUrl !== undefined ? { githubUrl } : {})} />

      <main className="mx-auto max-w-3xl px-6 py-12">
        <header className="mb-10 space-y-4">
          <h1 className="text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">
            {slideshow.title || 'Untitled run'}
          </h1>
          {slideshow.description && (
            <p className="text-lg text-ink-600">{slideshow.description}</p>
          )}
          <MetaRow
            labels={meta}
            {...(slideshow.created_by !== undefined ? { createdBy: slideshow.created_by } : {})}
            {...(slideshow.created_by_url !== undefined
              ? { createdByUrl: slideshow.created_by_url }
              : {})}
          />
        </header>

        {slideshow.summary && (
          <div className="mb-10">
            <SummaryCallout summary={slideshow.summary} />
          </div>
        )}

        <ol className="space-y-8" aria-label="Clip sequence">
          {slideshow.slides.map((slide) => (
            <li key={slide.id} className="space-y-2">
              <MediaFrame
                mediaKind={slide.media_kind}
                src={slide.media_url}
                alt={slide.caption || `Slide ${slide.position}`}
                position={slide.position}
              />
              {slide.caption && (
                <p className="text-base leading-relaxed text-ink-700">{slide.caption}</p>
              )}
            </li>
          ))}
        </ol>
      </main>
    </div>
  )
}
