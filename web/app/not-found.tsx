import Link from 'next/link'

import { NavBar } from '@/components/composites/NavBar/NavBar'
import { Button } from '@/components/primitives/Button/Button'

export default function NotFound() {
  return (
    <>
      <NavBar />
      <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-6 px-6 py-20 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-vermillion-700">
          404
        </p>
        <h1 className="text-4xl font-semibold tracking-[-0.02em] text-ink-900">
          Clip not found.
        </h1>
        <p className="max-w-prose text-ink-600">
          The link may have been rotated, deleted, or never existed. If a teammate
          shared it with you, try asking them for a fresh URL.
        </p>
        <Button asChild variant="primary" size="md">
          <Link href="/">Back to AgentClip</Link>
        </Button>
      </main>
    </>
  )
}
