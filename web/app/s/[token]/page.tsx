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

interface ClipArtifacts {
  clipMp4Url: string
  clipPdfUrl: string
  embedUrl: string
  posterImageUrl: string | null
  fallbackPosterUrl: string | null
}

interface FetchResult {
  slideshow: ClipViewerSlideshow
  artifacts: ClipArtifacts
}

async function fetchSlideshow(token: string): Promise<FetchResult | null> {
  const { data, response } = await api.GET('/api/v1/slideshow/{share_token}/', {
    params: { path: { share_token: token } },
  })
  if (response.status === 404 || !data) return null

  // The API ships the SlideshowPublicSerializer shape (snake_case).
  // Map onto the local ClipViewer types — same field names today,
  // but the indirection lets the pattern stay decoupled from the
  // wire shape if either ever diverges.
  const slideshow: ClipViewerSlideshow = {
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
  const artifacts: ClipArtifacts = {
    clipMp4Url: data.clip_mp4_url,
    clipPdfUrl: data.clip_pdf_url,
    embedUrl: data.embed_url,
    posterImageUrl: data.poster_image_url ?? null,
    // First image-kind slide media is the unfurl fallback while the
    // server-rendered poster JPEG is still being generated.
    fallbackPosterUrl:
      slideshow.slides.find((s) => s.media_kind === 'image')?.media_url ?? null,
  }
  return { slideshow, artifacts }
}

export async function generateMetadata({
  params,
}: ViewerPageProps): Promise<Metadata> {
  const { token } = await params
  const result = await fetchSlideshow(token)
  if (!result) return { title: 'Clip not found · AgentClip' }
  const { slideshow, artifacts } = result

  const title = slideshow.title || 'Untitled run'
  const description =
    slideshow.summary ||
    slideshow.description ||
    'A QA run captured by AgentClip.'

  // Prefer the dedicated 1200x630 poster JPEG once it's rendered;
  // fall back to the first slide's media so unfurls always have an
  // image (Slack/iMessage cards look broken without one).
  const posterUrl = artifacts.posterImageUrl ?? artifacts.fallbackPosterUrl ?? undefined

  return {
    title: `${title} · AgentClip`,
    description,
    openGraph: {
      title,
      description,
      url: `/s/${token}`,
      // og:type=video.other unlocks the inline-video card in Slack
      // and Discord when og:video is present. Falls back to the
      // generic article card when consumers don't speak video tags.
      type: 'video.other',
      videos: [
        {
          url: artifacts.clipMp4Url,
          secureUrl: artifacts.clipMp4Url,
          type: 'video/mp4',
          width: 1920,
          height: 1080,
        },
      ],
      images: posterUrl ? [{ url: posterUrl, width: 1200, height: 630 }] : undefined,
    },
    twitter: {
      // 'player' card type renders an inline player when the platform
      // recognizes our domain. Even without that, the og:image fallback
      // gives a usable summary card.
      card: 'player',
      title,
      description,
      players: [
        {
          playerUrl: artifacts.embedUrl,
          streamUrl: artifacts.clipMp4Url,
          width: 1920,
          height: 1080,
        },
      ],
      images: posterUrl ? [posterUrl] : undefined,
    },
  }
}

export default async function ViewerPage({ params }: ViewerPageProps) {
  const { token } = await params
  const result = await fetchSlideshow(token)
  if (!result) notFound()

  return <ClipViewer slideshow={result.slideshow} />
}
