/**
 * Edit page — `/s/[token]/edit?t=<edit_token>`.
 *
 * Server Component. Reads the edit_token from the URL query string,
 * fetches the slideshow via the public read endpoint, and hands both
 * to the client editor. The token never leaves the URL + the React
 * tree — it is not persisted to localStorage and is never sent to
 * a third party.
 *
 * Auth model:
 * - The slug-based public read endpoint requires no auth, so we can
 *   render the slideshow even before validating the edit token. The
 *   first mutation attempt is the real validation: a wrong token
 *   surfaces as a 401 from the API and the client component shows
 *   the "edit link is no longer valid" banner.
 * - This is the same pattern Loom uses for its share/edit URLs.
 */

import { notFound } from 'next/navigation'

import { api } from '@/lib/api'

import { EditClient, type EditableSlideshow } from './edit-client'

// The edit page must always render fresh — captions can change in
// real time during a long-running edit session.
export const dynamic = 'force-dynamic'

interface EditPageProps {
  params: Promise<{ token: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

async function fetchSlideshow(token: string): Promise<EditableSlideshow | null> {
  const { data, response } = await api.GET('/api/v1/slideshow/{share_token}/', {
    params: { path: { share_token: token } },
  })
  if (response.status === 404 || !data) return null
  return {
    id: data.id,
    title: data.title ?? '',
    description: data.description ?? '',
    slides: data.slides.map((s) => ({
      id: s.id,
      position: s.position,
      title: s.title ?? '',
      caption: s.caption ?? '',
      media_url: s.media_url,
      media_kind: s.media_kind === 'video' ? 'video' : 'image',
    })),
  }
}

export default async function EditPage({ params, searchParams }: EditPageProps) {
  const { token: shareToken } = await params
  const search = await searchParams
  const editTokenParam = search.t
  const editToken = Array.isArray(editTokenParam) ? editTokenParam[0] : editTokenParam

  if (!editToken) notFound()

  const slideshow = await fetchSlideshow(shareToken)
  if (!slideshow) notFound()

  return (
    <EditClient
      shareToken={shareToken}
      editToken={editToken}
      initialSlideshow={slideshow}
    />
  )
}
