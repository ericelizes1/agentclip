/**
 * AgentClip home page.
 *
 * Server Component — fetches the curated gallery from the API at
 * request time. Layout is full-bleed with a floating AgentWidget on
 * the left (LinkedIn-style sticky sidebar) that contains the brand,
 * the agent character, the slot stack, and the walkthrough CTA.
 */

import { SiGithub } from '@icons-pack/react-simple-icons'

import { AgentWidget } from '@/components/composites/AgentWidget/AgentWidget'
import { CodeBlock } from '@/components/composites/CodeBlock/CodeBlock'
import { RecordingProvider } from '@/components/context/RecordingProvider/RecordingProvider'
import { TicketMark } from '@/components/primitives/TicketMark/TicketMark'
import { GalleryGrid, type GalleryClip } from '@/components/patterns/GalleryGrid/GalleryGrid'
import {
  HeroSection,
  type HeroFeaturedClip,
} from '@/components/patterns/HeroSection/HeroSection'
import {
  PageViewfinder,
  type ViewfinderSlide,
} from '@/components/patterns/PageViewfinder/PageViewfinder'
import { SlideCapture } from '@/components/patterns/PageViewfinder/SlideCapture'
import { api } from '@/lib/api'

const GITHUB_URL = 'https://github.com/ericelizes1/agentclip'

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

  const initialRecordingState = featured ? 'recording' : 'idle'

  return (
    <RecordingProvider initial={initialRecordingState}>
      <PageViewfinder slides={viewfinderSlides}>
        {/*
          Full-bleed layout. Page content sits in a centered column
          (no screen-card framing). On lg+, the AgentWidget floats on
          the left as a sticky sidebar — the brand, the agent stage,
          the slot stack, and the walkthrough CTA all live in there.
          On mobile we collapse to a single column with a small inline
          brand row at the top.
        */}
        <div className="min-h-screen bg-paper">
          <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-10 px-4 pt-4 pb-10 sm:px-6 sm:pt-6 lg:grid-cols-[244px_minmax(0,1fr)] lg:gap-12 lg:px-8 lg:pt-8">
            {/* MOBILE — inline brand row at the top of the page. */}
            <div className="flex items-center justify-between lg:hidden">
              <a href="/" className="flex items-center gap-2 text-ink-900">
                <TicketMark size={18} className="text-vermillion-500" />
                <span className="font-semibold tracking-tight">AgentClip</span>
              </a>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-ink-700 hover:text-ink-900"
              >
                <SiGithub aria-hidden="true" className="size-4" />
                <span>GitHub</span>
              </a>
            </div>

            {/* LEFT — floating live-capture widget. Sticky on lg+. */}
            <aside className="hidden lg:block">
              <div className="sticky top-8">
                {featured && (
                  <AgentWidget walkthroughHref={`/s/${featured.shareToken}`} />
                )}
              </div>
            </aside>

            {/* RIGHT — page content, full-bleed (no card framing). */}
            <main>
              <SlideCapture slideId="hero">
                <HeroSection githubUrl={GITHUB_URL} featured={featured} />
              </SlideCapture>

              <SlideCapture slideId="how-it-works">
                <section
                  id="how-it-works"
                  aria-labelledby="how-it-works-heading"
                  className="mx-auto max-w-5xl py-16"
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
                  className="mx-auto max-w-5xl py-16"
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
                <section className="mx-auto max-w-3xl py-16 text-center">
                  <p className="text-base text-ink-600">
                    Open source. Receipts for the work agents quietly do.
                  </p>
                </section>
              </SlideCapture>

              <footer className="mt-12 border-t border-ink-200 pt-8">
                <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 text-xs uppercase tracking-[0.14em] text-ink-500">
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
            </main>
          </div>
        </div>
      </PageViewfinder>
    </RecordingProvider>
  )
}
