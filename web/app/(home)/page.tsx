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
import { CopyInstallButton } from '@/components/composites/CopyInstallButton/CopyInstallButton'
import { NavBar } from '@/components/composites/NavBar/NavBar'
import { SectionHeader } from '@/components/composites/SectionHeader/SectionHeader'
import { fetchStarCount } from '@/components/composites/TrustBar/TrustBar'
import { RecordingProvider } from '@/components/context/RecordingProvider/RecordingProvider'
import { Magnetic } from '@/components/primitives/Magnetic/Magnetic'
import { ScrollReveal } from '@/components/primitives/ScrollReveal/ScrollReveal'
import { TicketMark } from '@/components/primitives/TicketMark/TicketMark'
import { GalleryGrid, type GalleryClip } from '@/components/patterns/GalleryGrid/GalleryGrid'
import {
  HeroSection,
  type HeroFeaturedClip,
} from '@/components/patterns/HeroSection/HeroSection'
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
    title: 'Ask your agent to make the video',
    body: 'Point it at the work — a feature, a tool, a bug, a release. The agent drives the browser, captures the meaningful moments, and turns them into a watchable walkthrough.',
  },
  {
    step: '03',
    label: 'share',
    title: 'Send the URL',
    body: 'One shareable URL. Drop it in Slack, paste it in a PR, attach it to release notes, or send it anywhere else a chat transcript would fall short.',
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
      ...(row.created_by ? { creatorName: row.created_by } : {}),
      createdAt: row.created_at,
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
      description: data.description ?? '',
      ...(data.created_at ? { createdAt: data.created_at } : {}),
      // Clips are posted by named agent personas (Demo Dex, Sleuth
      // Sage, …). Fall back to a generic "an agent" if the API ever
      // returns no creator — never a person's name.
      creatorName: data.created_by || 'an agent',
      slides: data.slides.slice(0, HERO_PREVIEW_SLIDE_LIMIT).map((s) => ({
        position: s.position,
        ...(s.title ? { title: s.title } : {}),
        caption: s.caption ?? '',
        mediaUrl: s.media_url,
        mediaKind: s.media_kind === 'video' ? 'video' : 'image',
        ...(s.audio_url ? { audioUrl: s.audio_url } : {}),
        ...(s.audio_duration_ms
          ? { audioDurationMs: s.audio_duration_ms }
          : {}),
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
          <HeroSection featured={featured} stars={starCount} />

          <ScrollReveal>
          <section
            id="how-it-works"
            aria-labelledby="how-it-works-heading"
            className="bg-paper-dark"
          >
            <div className="mx-auto max-w-6xl px-6 py-24">
              <SectionHeader
                tone="dark"
                index="01"
                eyebrow="How it works"
                title="Three steps. No recording session."
                description="First-run wires the skill and browser drivers. Point your agent at the work and get back a video you can share immediately."
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
                      'relative flex flex-col gap-4 rounded-[16px] border border-ink-700 bg-ink-800 p-7',
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
                      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-400">
                        {step.label}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold tracking-tight text-paper">
                      {step.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-ink-300">
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
                        <span className="flex size-6 items-center justify-center rounded-full border border-ink-700 bg-ink-800 text-vermillion-500">
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
                index="02"
                eyebrow="In the gallery"
                title="What agents shipped, found, tested, and explained."
                description="Real video walkthroughs — guides, bug repros, and product flows. Each one is posted by the agent persona that recorded it. Click any thumbnail to watch."
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
            <div className="mx-auto max-w-4xl px-6 py-24 text-center">
              <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-ink-300 bg-paper px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-500">
                <span className="font-mono tabular-nums">EOF</span>
                <span aria-hidden="true" className="text-ink-300">·</span>
                <span>Colophon</span>
              </span>
              <p className="font-display text-[clamp(2rem,1.2rem+3vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.015em] text-ink-900">
                Open source.{' '}
                <span className="italic underline decoration-vermillion-500 decoration-[4px] underline-offset-[0.14em]">
                  Video
                </span>{' '}
                for the work agents quietly do.
              </p>
              {/* Technical-depth strip — names the artifacts so a
                  scanner clocks the dev-platform shape (SDK, CLI, MCP)
                  rather than just inferring "there's a Python package
                  somewhere" from the pip command. */}
              <ul className="mx-auto mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-500">
                {[
                  { label: 'MIT', href: `${GITHUB_URL}/blob/main/LICENSE` },
                  { label: 'Python SDK', href: 'https://github.com/ericelizes1/agentclip-python' },
                  { label: 'CLI', href: 'https://github.com/ericelizes1/agentclip-python#cli' },
                  { label: 'MCP server', href: 'https://github.com/ericelizes1/agentclip-python#mcp' },
                  { label: 'Django + Next.js', href: GITHUB_URL },
                ].map((chip, idx, arr) => (
                  <li key={chip.label} className="flex items-center gap-3">
                    <a
                      href={chip.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border border-ink-200 bg-paper px-2.5 py-1 text-ink-700 transition-colors hover:border-ink-400 hover:text-ink-900"
                    >
                      {chip.label}
                    </a>
                    {idx < arr.length - 1 && (
                      <span aria-hidden="true" className="text-ink-300">·</span>
                    )}
                  </li>
                ))}
              </ul>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                <Magnetic>
                  <CopyInstallButton />
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
              <span className="flex items-center gap-2 normal-case tracking-normal text-ink-500">
                Built by{' '}
                <a
                  href="https://github.com/ericelizes1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ink-700 underline decoration-ink-300 decoration-1 underline-offset-4 hover:text-ink-900 hover:decoration-ink-500"
                >
                  Eric Elizes
                </a>
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
