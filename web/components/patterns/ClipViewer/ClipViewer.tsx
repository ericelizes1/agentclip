import { MediaFrame, type MediaKind } from '@/components/composites/MediaFrame/MediaFrame'
import { MetaRow } from '@/components/composites/MetaRow/MetaRow'
import { NavBar } from '@/components/composites/NavBar/NavBar'
import { SummaryCallout } from '@/components/composites/SummaryCallout/SummaryCallout'
import {
  VideoClipPlayer,
  type VideoClipSlide,
} from '@/components/patterns/VideoClipPlayer/VideoClipPlayer'
import { cn } from '@/lib/utils'

export interface ClipViewerSlide {
  id: number | string
  position: number
  title?: string
  caption?: string
  media_url: string
  media_kind: MediaKind
  /**
   * Optional public URL of the per-slide narration MP3. When every
   * slide in the slideshow has this set, ClipViewer renders the
   * narrated VideoClipPlayer instead of the silent stacked layout.
   */
  audio_url?: string | null
  audio_duration_ms?: number | null
}

export interface ClipViewerSlideshow {
  id: string
  /**
   * Public share token, used as the URL component at /s/<share_token>.
   * Required when the viewer renders the narrated VideoClipPlayer
   * (which embeds an "Open clip" deep link); optional otherwise.
   */
  share_token?: string
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
 *   <ol> of slides — each with eyebrow position label, optional title,
 *     MediaFrame, optional caption
 *
 * Mobile-first: padding tightens at small widths, h1 uses clamp() so
 * the headline doesn't bury content on narrow viewports, and the
 * MetaRow's avatar wraps to the right edge instead of the next line.
 */
export function ClipViewer({ slideshow, githubUrl, className }: ClipViewerProps) {
  const meta: string[] = [formatDate(slideshow.created_at), `${slideshow.slides.length} clips`]
  const allNarrated =
    slideshow.slides.length > 0 &&
    slideshow.slides.every((s) => Boolean(s.audio_url))

  return (
    <div className={cn('min-h-screen bg-paper text-ink-900', className)}>
      <NavBar {...(githubUrl !== undefined ? { githubUrl } : {})} />

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <header className="mb-8 space-y-4 sm:mb-10">
          <h1
            className="font-semibold tracking-[-0.02em] text-ink-900"
            style={{ fontSize: 'clamp(1.75rem, 1.2rem + 2.5vw, 2.5rem)', lineHeight: 1.1 }}
          >
            {slideshow.title || 'Untitled run'}
          </h1>
          {slideshow.description && (
            <p className="text-base text-ink-600 sm:text-lg">{slideshow.description}</p>
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
          <div className="mb-8 sm:mb-10">
            <SummaryCallout summary={slideshow.summary} />
          </div>
        )}

        {allNarrated ? (
          <VideoClipPlayer
            shareToken={slideshow.share_token ?? slideshow.id}
            title={slideshow.title || 'Untitled run'}
            {...(slideshow.created_by !== undefined
              ? { creatorName: slideshow.created_by }
              : {})}
            slides={slideshow.slides.map(toVideoClipSlide)}
            variant="full"
          />
        ) : (
          <ol className="space-y-10 sm:space-y-12" aria-label="Clip sequence">
            {slideshow.slides.map((slide) => (
              <li key={slide.id} className="space-y-3">
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-xs uppercase tracking-[0.16em] text-vermillion-700 tabular-nums">
                    {String(slide.position).padStart(2, '0')}
                  </span>
                  {slide.title && (
                    <h2 className="text-lg font-semibold tracking-[-0.01em] text-ink-900 sm:text-xl">
                      {slide.title}
                    </h2>
                  )}
                </div>
                <MediaFrame
                  mediaKind={slide.media_kind}
                  src={slide.media_url}
                  alt={slide.title || slide.caption || `Slide ${slide.position}`}
                  position={slide.position}
                />
                {slide.caption && (
                  <p className="text-base leading-relaxed text-ink-700">{slide.caption}</p>
                )}
              </li>
            ))}
          </ol>
        )}
      </main>
    </div>
  )
}

function toVideoClipSlide(slide: ClipViewerSlide): VideoClipSlide {
  return {
    position: slide.position,
    ...(slide.title !== undefined ? { title: slide.title } : {}),
    caption: slide.caption ?? '',
    mediaUrl: slide.media_url,
    mediaKind: slide.media_kind,
    audioUrl: slide.audio_url as string,
    ...(slide.audio_duration_ms
      ? { audioDurationMs: slide.audio_duration_ms }
      : {}),
  }
}
