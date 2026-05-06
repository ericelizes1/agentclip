'use client'

import Link from 'next/link'
import { useState } from 'react'

import { DeleteSlideButton } from '@/components/composites/DeleteSlideButton/DeleteSlideButton'
import { EditableCaption } from '@/components/composites/EditableCaption/EditableCaption'
import { MediaFrame, type MediaKind } from '@/components/composites/MediaFrame/MediaFrame'
import { NavBar } from '@/components/composites/NavBar/NavBar'
import { Badge } from '@/components/primitives/Badge/Badge'
import { Button } from '@/components/primitives/Button/Button'
import { api } from '@/lib/api'

export interface EditableSlide {
  id: number | string
  position: number
  title: string
  caption: string
  media_url: string
  media_kind: MediaKind
}

export interface EditableSlideshow {
  id: string
  title: string
  description: string
  slides: EditableSlide[]
}

interface EditClientProps {
  shareToken: string
  editToken: string
  initialSlideshow: EditableSlideshow
}

/**
 * Client editor: hydrates with the SSR slideshow shape, owns the
 * slide list locally, and persists each mutation through the typed
 * API client. Optimistic UI: deletes pop the slide before the API
 * call resolves; failures restore it. Caption updates do the same.
 */
export function EditClient({ shareToken, editToken, initialSlideshow }: EditClientProps) {
  const [slideshow, setSlideshow] = useState(initialSlideshow)
  const [globalError, setGlobalError] = useState<string | null>(null)

  const auth = { headers: { Authorization: `Bearer ${editToken}` } }

  const saveCaption = async (slideId: EditableSlide['id'], position: number, caption: string) => {
    const previous = slideshow
    // Optimistic patch.
    setSlideshow({
      ...slideshow,
      slides: slideshow.slides.map((s) =>
        s.id === slideId ? { ...s, caption } : s,
      ),
    })

    const { error, response } = await api.PATCH(
      '/api/v1/slideshow/{share_token}/slides/{position}/caption/',
      {
        params: { path: { share_token: shareToken, position } },
        body: { caption },
        ...auth,
      },
    )

    if (error || !response.ok) {
      setSlideshow(previous)
      const message =
        response.status === 401
          ? 'Edit link is no longer valid. Run `agentclip edit-url ' +
            shareToken +
            '` for a fresh one.'
          : 'Save failed. Try again in a moment.'
      setGlobalError(message)
      throw new Error(message)
    }
    setGlobalError(null)
  }

  const deleteSlide = async (slideId: EditableSlide['id'], position: number) => {
    const previous = slideshow
    setSlideshow({
      ...slideshow,
      slides: slideshow.slides.filter((s) => s.id !== slideId),
    })

    const { error, response } = await api.DELETE(
      '/api/v1/slideshow/{share_token}/slides/{position}/',
      {
        params: { path: { share_token: shareToken, position } },
        ...auth,
      },
    )

    if (error || !response.ok) {
      setSlideshow(previous)
      const message =
        response.status === 401
          ? 'Edit link is no longer valid. Run `agentclip edit-url ' +
            shareToken +
            '` for a fresh one.'
          : 'Delete failed. Try again in a moment.'
      setGlobalError(message)
      throw new Error(message)
    }
    setGlobalError(null)
  }

  return (
    <div className="min-h-screen bg-paper text-ink-900">
      <NavBar />

      <main className="mx-auto max-w-3xl px-6 py-12">
        <header className="mb-8 space-y-3">
          <Badge tone="accent">Edit mode</Badge>
          <h1 className="text-3xl font-semibold tracking-[-0.02em]">
            {slideshow.title || 'Untitled run'}
          </h1>
          <p className="text-sm text-ink-600">
            Captions are click-to-edit. Deletions remove the slide everywhere — the public
            viewer updates on next request.
          </p>
          <Button asChild variant="ghost" size="sm">
            <Link href={`/s/${shareToken}`}>Preview as visitor sees it →</Link>
          </Button>
        </header>

        {globalError && (
          <p
            role="alert"
            className="mb-6 rounded-md border border-vermillion-500 bg-vermillion-50 px-4 py-3 text-sm text-vermillion-700"
          >
            {globalError}
          </p>
        )}

        <ol className="space-y-10" aria-label="Editable slides">
          {slideshow.slides.map((slide) => (
            <li key={slide.id} className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <span className="font-mono text-xs uppercase tracking-[0.16em] text-ink-500">
                  Slide {String(slide.position).padStart(2, '0')}
                </span>
                <DeleteSlideButton
                  position={slide.position}
                  onDelete={() => deleteSlide(slide.id, slide.position)}
                />
              </div>
              <MediaFrame
                mediaKind={slide.media_kind}
                src={slide.media_url}
                alt={slide.caption || `Slide ${slide.position}`}
                position={slide.position}
              />
              <EditableCaption
                value={slide.caption}
                onSave={(next) => saveCaption(slide.id, slide.position, next)}
              />
            </li>
          ))}
          {slideshow.slides.length === 0 && (
            <li className="rounded-md border border-dashed border-ink-300 bg-paper-raised p-10 text-center text-sm text-ink-500">
              No slides left. The public viewer will show an empty deck.
            </li>
          )}
        </ol>
      </main>
    </div>
  )
}
