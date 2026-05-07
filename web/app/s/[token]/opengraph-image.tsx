/**
 * Dynamic per-clip OG image. Renders at /s/<token>/opengraph-image
 * via Next.js's App Router OG image convention. Slack / Twitter /
 * LinkedIn share-card unfurlers fetch this URL when a clip URL is
 * pasted; the dynamic card lifts the URL out of "boring shortened
 * link" territory.
 *
 * runtime = 'nodejs' (Render-compatible; the Edge runtime adds a
 * cold-start tax we don't need at home-page volume).
 */

import { ImageResponse } from 'next/og'

import { api } from '@/lib/api'

export const runtime = 'nodejs'
export const contentType = 'image/png'
export const size = { width: 1200, height: 630 }
export const alt = 'AgentClip · Skip the screencast'

interface OgImageProps {
  params: Promise<{ token: string }>
}

export default async function OpenGraphImage({ params }: OgImageProps) {
  const { token } = await params
  const { data } = await api.GET('/api/v1/slideshow/{share_token}/', {
    params: { path: { share_token: token } },
  })

  const title = data?.title || 'AgentClip clip'
  const byline = data?.created_by ? `By ${data.created_by}` : 'AgentClip'
  const clipCount = data?.slides.length ?? 0
  const firstImage = data?.slides.find((s) => s.media_kind === 'image')?.media_url

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#faf9f5',
          fontFamily: 'sans-serif',
          padding: 64,
          color: '#141413',
        }}
      >
        {/* Brand row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 999,
              background: '#d94824',
            }}
          />
          <span style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>
            AgentClip
          </span>
        </div>

        {/* Title row */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: '-0.03em',
              maxWidth: 1000,
            }}
          >
            {title}
          </div>
        </div>

        {/* Attribution row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid #e8e6dc',
            paddingTop: 24,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 18,
              fontSize: 22,
              color: '#5e5d59',
            }}
          >
            <span>{byline}</span>
            {clipCount > 0 && <span>·</span>}
            {clipCount > 0 && <span>{clipCount} clips</span>}
          </div>
          {firstImage && (
            <img
              src={firstImage}
              alt=""
              width={140}
              height={80}
              style={{
                objectFit: 'cover',
                borderRadius: 6,
                border: '2px solid #d94824',
              }}
            />
          )}
        </div>
      </div>
    ),
    { ...size },
  )
}
