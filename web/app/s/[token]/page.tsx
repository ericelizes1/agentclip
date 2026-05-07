/**
 * Viewer page — `/s/[token]`.
 *
 * Server Component. Pulls the slideshow by share_token via the typed
 * client and hands the shape to ClipViewer. 404s on miss; dynamic OG
 * metadata is generated per-clip via `generateMetadata` (the OG image
 * itself ships in Unit 15).
 */

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import {
  ClipViewer,
  type ClipViewerSlideshow,
} from '@/components/patterns/ClipViewer/ClipViewer'
import { api } from '@/lib/api'

// Slides may stream in mid-run from the SDK; cache nothing.
export const dynamic = 'force-dynamic'

interface ViewerPageProps {
  params: Promise<{ token: string }>
}

async function fetchSlideshow(token: string): Promise<ClipViewerSlideshow | null> {
  const { data, response } = await api.GET('/api/v1/slideshow/{share_token}/', {
    params: { path: { share_token: token } },
  })
  if (response.status === 404 || !data) return null

  // The API ships the SlideshowPublicSerializer shape (snake_case).
  // Map onto the local ClipViewer types — same field names today,
  // but the indirection lets the pattern stay decoupled from the
  // wire shape if either ever diverges.
  return {
    id: data.id,
    share_token: token,
    title: data.title ?? '',
    description: data.description ?? '',
    summary: data.summary ?? '',
    created_by: data.created_by ?? '',
    created_by_url: data.created_by_url ?? '',
    created_at: data.created_at,
    slides: data.slides.map((s) => ({
      id: s.id,
      position: s.position,
      title: s.title ?? '',
      caption: s.caption ?? '',
      media_url: s.media_url,
      media_kind: s.media_kind === 'video' ? 'video' : 'image',
      audio_url: s.audio_url ?? null,
      audio_duration_ms: s.audio_duration_ms ?? 0,
    })),
  }
}

export async function generateMetadata({
  params,
}: ViewerPageProps): Promise<Metadata> {
  const { token } = await params
  const slideshow = await fetchSlideshow(token)
  if (!slideshow) return { title: 'Clip not found · AgentClip' }

  const title = slideshow.title || 'Untitled run'
  const description =
    slideshow.summary ||
    slideshow.description ||
    'A QA run captured by AgentClip.'

  return {
    title: `${title} · AgentClip`,
    description,
    openGraph: {
      title,
      description,
      url: `/s/${token}`,
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export default async function ViewerPage({ params }: ViewerPageProps) {
  const { token } = await params
  const slideshow = await fetchSlideshow(token)
  if (!slideshow) notFound()

  return <ClipViewer slideshow={slideshow} />
}
