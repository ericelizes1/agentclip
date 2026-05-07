/**
 * Iframe embed target — `/embed/[token]`.
 *
 * Server Component. Renders the ClipViewer fullscreen with no nav,
 * no header, no footer — just the player. The host site (Notion,
 * Substack, custom HTML) drops an `<iframe src="...">` pointing
 * here and gets an inline player without any extra coupling.
 *
 * Iframe-ability is granted at the layout level (no X-Frame-Options
 * header set; CSP allows frame-ancestors *). The route metadata
 * deliberately omits og:video so this page itself doesn't try to
 * unfurl as a video — that's the parent share page's job.
 */

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import {
  ClipViewer,
  type ClipViewerSlideshow,
} from '@/components/patterns/ClipViewer/ClipViewer'
import { api } from '@/lib/api'

export const dynamic = 'force-dynamic'

interface EmbedPageProps {
  params: Promise<{ token: string }>
}

async function fetchSlideshow(token: string): Promise<ClipViewerSlideshow | null> {
  const { data, response } = await api.GET('/api/v1/slideshow/{share_token}/', {
    params: { path: { share_token: token } },
  })
  if (response.status === 404 || !data) return null

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
}: EmbedPageProps): Promise<Metadata> {
  const { token } = await params
  const slideshow = await fetchSlideshow(token)
  if (!slideshow) return { title: 'Clip not found' }
  return {
    title: slideshow.title || 'AgentClip',
    // No og:video here — this page is the embed target, not a card.
    robots: { index: false, follow: false },
  }
}

export default async function EmbedPage({ params }: EmbedPageProps) {
  const { token } = await params
  const slideshow = await fetchSlideshow(token)
  if (!slideshow) notFound()
  return (
    <div className="h-screen w-screen bg-black">
      <ClipViewer slideshow={slideshow} />
    </div>
  )
}
