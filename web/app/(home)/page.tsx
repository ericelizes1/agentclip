/**
 * AgentClip home page.
 *
 * Server Component — fetches the curated gallery from the API at
 * request time. Single-column full-width layout: top NavBar, hero,
 * marquee band of clip thumbnails, "How it works", gallery, closing
 * pull-quote, footer. No sidebar — the product's variety IS the
 * decoration.
 */

import { SiGithub } from '@icons-pack/react-simple-icons'

import { CodeBlock } from '@/components/composites/CodeBlock/CodeBlock'
import { NavBar } from '@/components/composites/NavBar/NavBar'
import { SectionHeader } from '@/components/composites/SectionHeader/SectionHeader'
import { RecordingProvider } from '@/components/context/RecordingProvider/RecordingProvider'
import { TicketMark } from '@/components/primitives/TicketMark/TicketMark'
import { GalleryGrid, type GalleryClip } from '@/components/patterns/GalleryGrid/GalleryGrid'
import {
  HeroSection,
  type HeroFeaturedClip,
} from '@/components/patterns/HeroSection/HeroSection'
import {
  MarqueeBand,
  type MarqueeClip,
} from '@/components/patterns/MarqueeBand/MarqueeBand'
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

export default async function HomePage() {
  const galleryRows = await fetchGallery()
  const [heroRow, ...galleryCards] = galleryRows
  const featured = heroRow ? await fetchFullSlideshow(heroRow.shareToken) : null
  const clips = galleryCards

  // Marquee uses every available clip (hero + gallery cards). With
  // only a handful of curated clips today, this still loops cleanly
  // because MarqueeBand duplicates the sequence internally. As the
  // gallery grows the band gets richer for free.
  const marqueeClips: MarqueeClip[] = galleryRows.map((row) => ({
    shareToken: row.shareToken,
    title: row.title,
    coverImageUrl: row.coverImageUrl,
    meta: row.meta,
  }))

  // RecordingProvider is still wrapped on the home page to drive the
  // hero's typewriter sequence. The "page-recording" conceit and its
  // viewfinder/sidebar machinery are gone — what's left is just the
  // hero animation timing.
  const initialRecordingState = featured ? 'recording' : 'idle'

  return (
    <RecordingProvider initial={initialRecordingState}>
      <div className="min-h-screen bg-paper">
        <NavBar githubUrl={GITHUB_URL} />

        <main>
          <HeroSection githubUrl={GITHUB_URL} featured={featured} />

          {marqueeClips.length > 0 && (
            <section
              aria-label="Featured agent runs"
              className="border-y border-ink-200 bg-paper-raised py-10"
            >
              <MarqueeBand clips={marqueeClips} />
            </section>
          )}

          <section
            id="how-it-works"
            aria-labelledby="how-it-works-heading"
            className="bg-paper"
          >
            <div className="mx-auto max-w-5xl px-6 py-24">
              <SectionHeader
                index="02"
                eyebrow="How it works"
                title="Three steps. No screencast software."
                description="First-run wires the skill and browser drivers. Point your agent at any flow."
                headingId="how-it-works-heading"
                meta={`${STEPS.length} steps`}
              />
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
            </div>
          </section>

          <section
            aria-labelledby="gallery-heading"
            className="border-t border-ink-200 bg-paper-raised"
          >
            <div className="mx-auto max-w-6xl px-6 py-24">
              <SectionHeader
                index="03"
                eyebrow="In the gallery"
                title="Recent fieldwork."
                description="Real QA runs, hand-curated. Click any thumbnail to watch the run."
                headingId="gallery-heading"
                meta={clips.length > 0 ? `${clips.length} clips` : undefined}
              />
              <GalleryGrid clips={clips} />
            </div>
          </section>

          <section className="border-t border-ink-200 bg-paper">
            <div className="mx-auto max-w-3xl px-6 py-28 text-center">
              <p className="font-display text-2xl tracking-tight text-ink-800 sm:text-3xl">
                Open source. Receipts for the work agents quietly do.
              </p>
            </div>
          </section>

          <footer className="border-t border-ink-200 bg-paper-raised">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-xs uppercase tracking-[0.14em] text-ink-500">
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
    </RecordingProvider>
  )
}
