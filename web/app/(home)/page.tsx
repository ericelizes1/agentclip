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
import { TrustBar, fetchStarCount } from '@/components/composites/TrustBar/TrustBar'
import { RecordingProvider } from '@/components/context/RecordingProvider/RecordingProvider'
import { Magnetic } from '@/components/primitives/Magnetic/Magnetic'
import { ScrollReveal } from '@/components/primitives/ScrollReveal/ScrollReveal'
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
import { cn } from '@/lib/utils'

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

interface CuratedRow extends GalleryClip {
  isHero: boolean
}

async function fetchGallery(): Promise<CuratedRow[]> {
  try {
    const { data } = await api.GET('/api/v1/gallery/')
    if (!data) return []
    return data.map((row) => ({
      shareToken: row.share_token,
      title: row.title,
      description: row.description ?? '',
      coverImageUrl: row.cover_image_url ?? null,
      meta: `${row.slide_count} clips`,
      isHero: row.is_hero ?? false,
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
  const [galleryRows, starCount] = await Promise.all([
    fetchGallery(),
    fetchStarCount('ericelizes1/agentclip'),
  ])

  // Hero pick is curated server-side via Slideshow.is_hero (admin /
  // Django admin / future agentclip CLI command). The frontend just
  // honors the flag — first row with is_hero=true wins, falling back
  // to position 0 if the operator hasn't picked a hero yet. The rest
  // become gallery cards in their original curation order.
  const heroIdx = (() => {
    const idx = galleryRows.findIndex((row) => row.isHero)
    return idx >= 0 ? idx : 0
  })()
  const heroRow = galleryRows[heroIdx]
  const galleryCards = galleryRows.filter((_, i) => i !== heroIdx)
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

          {/* Trust bar — tiny row of legitimacy signals between hero
              and marquee. Live GitHub star count, plus "Free" / "Open
              source" / "Self-hosted" facts. Honest, not theatrical. */}
          <div className="mx-auto max-w-5xl px-6 pb-10">
            <TrustBar repo="ericelizes1/agentclip" stars={starCount} />
          </div>

          {marqueeClips.length > 0 && (
            <ScrollReveal>
            <section
              aria-labelledby="marquee-heading"
              className="border-y border-ink-200 bg-paper-raised pb-12 pt-12"
            >
              {/* Constrained eyebrow row — left-aligned to the page
                  grid so the marquee strip itself can run edge-to-edge
                  beneath. Magazine "Featured Runs" framing. */}
              <div className="mx-auto mb-7 max-w-6xl px-6">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <span className="inline-flex items-center gap-2 rounded-full border border-vermillion-500/30 bg-vermillion-500/[0.06] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-vermillion-700">
                      <span className="font-mono tabular-nums">★</span>
                      <span aria-hidden="true" className="text-vermillion-500/50">·</span>
                      <span>Featured runs</span>
                    </span>
                    <h2
                      id="marquee-heading"
                      className="mt-3 text-2xl font-semibold tracking-tight text-ink-900 sm:text-[28px]"
                    >
                      What agents made this week.
                    </h2>
                  </div>
                  <p className="hidden text-xs uppercase tracking-[0.14em] text-ink-500 sm:block">
                    Hover to pause
                  </p>
                </div>
              </div>
              <MarqueeBand clips={marqueeClips} />
            </section>
            </ScrollReveal>
          )}

          <ScrollReveal>
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
              {/*
                Connected step flow. Steps stack vertically on mobile and
                run horizontally on lg+, with a hairline rule and a small
                vermillion arrow pip between each card. Each step leads
                with a giant Fraunces numeral (the spread number) — the
                cards now read as chapters in a process, not boxes in a
                grid.
              */}
              <ol className="grid gap-6 lg:grid-cols-3 lg:gap-0">
                {STEPS.map((step, idx) => (
                  <li
                    key={step.step}
                    className={cn(
                      'relative flex flex-col gap-4 rounded-[16px] border border-ink-200 bg-paper-raised p-7',
                      // On lg+ the cards live in a connected row: square
                      // off the inner edges and overlap the borders so a
                      // single hairline runs the length of the flow.
                      'lg:rounded-none lg:border-r-0 lg:first:rounded-l-[16px] lg:last:rounded-r-[16px] lg:last:border-r',
                    )}
                  >
                    <div className="flex items-baseline gap-3">
                      <span className="font-display text-5xl font-semibold leading-none text-vermillion-500">
                        {step.step}
                      </span>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-500">
                        {step.label}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold tracking-tight text-ink-900">
                      {step.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-ink-600">
                      {step.body}
                    </p>
                    {step.code && (
                      <CodeBlock
                        code={step.code.body}
                        {...(step.code.prompt !== undefined
                          ? { prompt: step.code.prompt }
                          : {})}
                      />
                    )}
                    {/* Vermillion arrow pip between cards on lg+. Sits
                        on the right edge of every card except the last. */}
                    {idx < STEPS.length - 1 && (
                      <span
                        aria-hidden="true"
                        className="absolute top-1/2 -right-3 hidden -translate-y-1/2 lg:block"
                      >
                        <span className="flex size-6 items-center justify-center rounded-full border border-ink-200 bg-paper text-vermillion-500">
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path
                              d="M2 2 L7 5 L2 8"
                              stroke="currentColor"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          </section>
          </ScrollReveal>

          <ScrollReveal>
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
          </ScrollReveal>

          {/*
            End-credits closing. Big Fraunces statement with the key
            word ("Receipts") set in italic + vermillion underline as
            a callback to the hero punchline. Followed by a real CTA
            pair so the page ends in an action rather than a sigh.
          */}
          <ScrollReveal>
          <section className="border-t border-ink-200 bg-paper">
            <div className="mx-auto max-w-4xl px-6 py-32 text-center">
              <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-ink-300 bg-paper px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-500">
                <span className="font-mono tabular-nums">EOF</span>
                <span aria-hidden="true" className="text-ink-300">·</span>
                <span>Colophon</span>
              </span>
              <p className="font-display text-[clamp(2rem,1.2rem+3vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.015em] text-ink-900">
                Open source.{' '}
                <span className="italic underline decoration-vermillion-500 decoration-[4px] underline-offset-[0.14em]">
                  Receipts
                </span>{' '}
                for the work agents quietly do.
              </p>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                <Magnetic>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center gap-2 rounded-full bg-vermillion-500 px-5 py-2.5 text-sm font-medium tracking-tight text-paper shadow-[0_8px_22px_-12px_rgba(217,72,36,0.65)] transition-transform duration-200 ease-out hover:-translate-y-px"
                >
                  Install AgentClip
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M3 7 L11 7 M7 3 L11 7 L7 11"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </a>
                </Magnetic>
                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-ink-600 underline decoration-ink-300 decoration-1 underline-offset-4 transition-colors hover:text-ink-900 hover:decoration-ink-500"
                >
                  <SiGithub aria-hidden="true" className="size-3.5" />
                  Read the source
                </a>
              </div>
            </div>
          </section>
          </ScrollReveal>

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
