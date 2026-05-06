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
import { GalleryGrid, type GalleryClip } from '@/components/patterns/GalleryGrid/GalleryGrid'
import { HeroSection } from '@/components/patterns/HeroSection/HeroSection'
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

export default async function HomePage() {
  const clips = await fetchGallery()

  return (
    <>
      <NavBar githubUrl={GITHUB_URL} />

      <HeroSection githubUrl={GITHUB_URL} />

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
                  {...(step.code.prompt !== undefined ? { prompt: step.code.prompt } : {})}
                />
              )}
            </li>
          ))}
        </ol>
      </section>

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

      <section className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="text-base text-ink-600">
          Open source. Receipts for the work agents quietly do.
        </p>
      </section>

      <footer className="border-t border-ink-200 bg-paper-raised">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-xs uppercase tracking-[0.14em] text-ink-500">
          <span className="flex items-center gap-2 text-ink-700">
            <span aria-hidden="true" className="size-2 rounded-full bg-vermillion-500" />
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
    </>
  )
}
