/**
 * AgentClip home page.
 *
 * Server Component — fetches the curated gallery from the API at
 * request time and composes the locked layout from
 * docs/mockups/index.html: NavBar → Hero → How it works →
 * Gallery → closing line → footer.
 */

import { SiGithub } from '@icons-pack/react-simple-icons'

import { CodeBlock } from '@/components/composites/CodeBlock/CodeBlock'
import { NavBar } from '@/components/composites/NavBar/NavBar'
import { RecordingProvider } from '@/components/context/RecordingProvider/RecordingProvider'
import { TicketMark } from '@/components/primitives/TicketMark/TicketMark'
import { GalleryGrid, type GalleryClip } from '@/components/patterns/GalleryGrid/GalleryGrid'
import {
  HeroSection,
  type HeroFeaturedClip,
} from '@/components/patterns/HeroSection/HeroSection'
import { CaptureStack } from '@/components/patterns/PageViewfinder/CaptureStack'
import {
  PageViewfinder,
  type ViewfinderSlide,
} from '@/components/patterns/PageViewfinder/PageViewfinder'
import { SlideCapture } from '@/components/patterns/PageViewfinder/SlideCapture'
import { api } from '@/lib/api'

const GITHUB_URL = 'https://github.com/ericelizes1/agentclip'

// Curated gallery rows turn over slowly (admin curation, not user
// edits). One-minute ISR keeps the home page snappy without serving
// stale-for-hours data after a curation change.
export const revalidate = 60

interface HowItWorksStep {
  step: string
  label: string
  title: string
  body: string
  code?: { prompt?: string; body: string }
}

const STEPS: HowItWorksStep[] = [
  {
    step: '01',
    label: 'install',
    title: 'pip install',
    body: 'First run wires the skill and browser drivers automatically — no separate setup step.',
    code: { prompt: '$', body: 'pip install agentclip' },
  },
  {
    step: '02',
    label: 'run',
    title: 'Ask your agent to QA',
    body: 'Point it at any flow. The agent drives the browser and captures meaningful moments in active voice.',
  },
  {
    step: '03',
    label: 'share',
    title: 'Send the URL',
    body: 'One shareable URL. Drop it in Slack, paste in a PR, send it cold to a recruiter. No login required.',
  },
]

async function fetchGallery(): Promise<GalleryClip[]> {
  // The Server Component runs at request time; an outage on the API
  // shouldn't take the home page down — render the empty state instead.
  try {
    const { data } = await api.GET('/api/v1/gallery/')
    if (!data) return []
    return data.map((row) => ({
      shareToken: row.share_token,
      title: row.title,
      description: row.description ?? '',
      coverImageUrl: row.cover_image_url ?? null,
      meta: `${row.slide_count} clips`,
    }))
  } catch {
    return []
  }
}

// The home hero leads with the gallery's #1 entry. Curation lives on
// the API (`AGENTCLIP_GALLERY_TOKENS`) — single source of truth, one
// env var, one redeploy. Position 0 in the env var becomes the hero;
// positions 1..n become gallery cards below.
const HERO_PREVIEW_SLIDE_LIMIT = 4

async function fetchFullSlideshow(token: string): Promise<HeroFeaturedClip | null> {
  try {
    const { data } = await api.GET('/api/v1/slideshow/{share_token}/', {
      params: { path: { share_token: token } },
    })
    if (!data || !data.slides?.length) return null
    return {
      shareToken: token,
      title: data.title || 'Untitled run',
      ...(data.created_by ? { creatorName: data.created_by } : {}),
      slides: data.slides.slice(0, HERO_PREVIEW_SLIDE_LIMIT).map((s) => ({
        position: s.position,
        ...(s.title ? { title: s.title } : {}),
        caption: s.caption ?? '',
        mediaUrl: s.media_url,
        mediaKind: s.media_kind === 'video' ? 'video' : 'image',
      })),
    }
  } catch {
    return null
  }
}

// Captions used on each slot in the CaptureStack as the visitor
// scrolls past the section. Falls back gracefully when the featured
// clip's slide captions aren't available.
const SECTION_CAPTIONS: Record<string, string> = {
  hero: 'Hero — agentclip.dev introduces itself.',
  'how-it-works': 'How it works — install, run, share.',
  gallery: 'Recent fieldwork — curated agent runs.',
  closing: 'Open source. Receipts for the work agents quietly do.',
}

export default async function HomePage() {
  const galleryRows = await fetchGallery()
  const [heroRow, ...galleryCards] = galleryRows
  const featured = heroRow ? await fetchFullSlideshow(heroRow.shareToken) : null
  const clips = galleryCards

  // Build the viewfinder slide registry. Each section captures one
  // slide; thumbnails come from the featured clip itself (so the
  // visitor's "captures" are real screenshots of agentclip.dev,
  // because that's what the meta clip contains). When there's no
  // featured clip, the viewfinder is silently skipped — page renders
  // as a normal site without the chrome.
  const sectionIds = ['hero', 'how-it-works', 'gallery', 'closing'] as const
  const viewfinderSlides: ViewfinderSlide[] = featured
    ? sectionIds.map((id, idx) => {
        const slide = featured.slides[idx]
        return {
          id,
          thumbnailUrl: slide?.mediaUrl ?? '',
          caption: SECTION_CAPTIONS[id] ?? slide?.caption ?? '',
          position: idx + 1,
        }
      })
    : []

  // Wrap the entire home page in RecordingProvider so the NavBar's
  // TicketMark and the HeroSection's pill share the same state.
  // When `featured` is null, start in 'idle' so we don't kick off the
  // recording animation for a hero that has no real clip to show.
  const initialRecordingState = featured ? 'recording' : 'idle'

  return (
    <RecordingProvider initial={initialRecordingState}>
      <PageViewfinder slides={viewfinderSlides}>
        <NavBar githubUrl={GITHUB_URL} />

        {/*
          Camera-body layout. The whole page sits inside a centered,
          bordered "screen" with rounded corners and an inset shadow,
          on top of a slightly darker paper backdrop. The CaptureStack
          lives in the right margin of the outer container, sticky-
          positioned so it stays alongside the screen as the visitor
          scrolls. On mobile the frame collapses to a normal page.
        */}
        <div className="bg-paper-raised">
          <div className="mx-auto grid max-w-[1480px] grid-cols-1 gap-6 px-3 pt-3 pb-8 sm:px-5 sm:pt-5 lg:grid-cols-[minmax(0,1fr)_184px]">
            <div className="relative overflow-hidden rounded-[18px] border border-ink-200 bg-paper shadow-[0_24px_60px_-30px_rgba(20,20,19,0.18),0_2px_8px_-4px_rgba(20,20,19,0.06)]">
              {/* Inner corner brackets — the "lens" of the camera. */}
              <ScreenCorner position="top-left" />
              <ScreenCorner position="top-right" />
              <ScreenCorner position="bottom-left" />
              <ScreenCorner position="bottom-right" />

              <SlideCapture slideId="hero">
                <HeroSection githubUrl={GITHUB_URL} featured={featured} />
              </SlideCapture>

              <SlideCapture slideId="how-it-works">
                <section
                  id="how-it-works"
                  aria-labelledby="how-it-works-heading"
                  className="mx-auto max-w-5xl px-6 py-16"
                >
                  <h2
                    id="how-it-works-heading"
                    className="mb-10 text-2xl font-semibold tracking-tight text-ink-900"
                  >
                    How it works
                  </h2>
                  <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {STEPS.map((step) => (
                      <li
                        key={step.step}
                        className="space-y-3 rounded-[14px] border border-ink-200 bg-paper-raised p-6"
                      >
                        <div className="flex items-baseline gap-3">
                          <span className="font-mono text-sm tabular-nums text-vermillion-700">
                            {step.step}
                          </span>
                          <span className="text-xs uppercase tracking-[0.16em] text-ink-500">
                            {step.label}
                          </span>
                        </div>
                        <h3 className="text-lg font-medium tracking-tight text-ink-900">
                          {step.title}
                        </h3>
                        <p className="text-sm text-ink-600">{step.body}</p>
                        {step.code && (
                          <CodeBlock
                            code={step.code.body}
                            {...(step.code.prompt !== undefined
                              ? { prompt: step.code.prompt }
                              : {})}
                          />
                        )}
                      </li>
                    ))}
                  </ol>
                </section>
              </SlideCapture>

              <SlideCapture slideId="gallery">
                <section
                  aria-labelledby="gallery-heading"
                  className="mx-auto max-w-5xl px-6 py-16"
                >
                  <div className="mb-10 flex items-end justify-between gap-4">
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-vermillion-700">
                        In the gallery
                      </p>
                      <h2
                        id="gallery-heading"
                        className="text-2xl font-semibold tracking-tight text-ink-900"
                      >
                        Recent fieldwork.
                      </h2>
                      <p className="mt-1 text-sm text-ink-600">
                        Real QA runs, hand-curated.
                      </p>
                    </div>
                    {clips.length > 0 && (
                      <p className="text-xs uppercase tracking-[0.16em] text-ink-500">
                        {clips.length} clips
                      </p>
                    )}
                  </div>
                  <GalleryGrid clips={clips} />
                </section>
              </SlideCapture>

              <SlideCapture slideId="closing">
                <section className="mx-auto max-w-3xl px-6 py-16 text-center">
                  <p className="text-base text-ink-600">
                    Open source. Receipts for the work agents quietly do.
                  </p>
                </section>
              </SlideCapture>

              <footer className="border-t border-ink-200 bg-paper-raised">
                <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-xs uppercase tracking-[0.14em] text-ink-500">
                  <span className="flex items-center gap-2 text-ink-700">
                    <TicketMark size={14} className="text-vermillion-500" />
                    AgentClip
                  </span>
                  <a
                    href={GITHUB_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-ink-700 hover:text-ink-900"
                  >
                    <SiGithub aria-hidden="true" className="size-3.5" />
                    GitHub
                  </a>
                </div>
              </footer>
            </div>

            {/* Side panel column — sticky-positioned alongside the screen.
                Hidden on mobile; surfaces from xl up where the layout
                has room for the contact-sheet strip. */}
            <aside className="hidden lg:block">
              <div className="sticky top-[88px]">
                {featured && (
                  <CaptureStack
                    walkthroughHref={`/s/${featured.shareToken}`}
                  />
                )}
              </div>
            </aside>
          </div>
        </div>
      </PageViewfinder>
    </RecordingProvider>
  )
}

/* ── Inner viewport-frame corner brackets ────────────────────
   Sit at the inside corners of the "screen" container, evoking
   the cropped marks of a real camera viewfinder. */

function ScreenCorner({
  position,
}: {
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
}) {
  const placement = {
    'top-left': 'top-3 left-3',
    'top-right': 'top-3 right-3',
    'bottom-left': 'bottom-3 left-3',
    'bottom-right': 'bottom-3 right-3',
  }[position]
  const rotation = {
    'top-left': 0,
    'top-right': 90,
    'bottom-right': 180,
    'bottom-left': 270,
  }[position]
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute z-30 ${placement}`}
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path
          d="M2 11 V2 H11"
          stroke="var(--color-vermillion-500, #d94824)"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
    </span>
  )
}
