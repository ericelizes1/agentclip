'use client'

import Link from 'next/link'
import { useEffect } from 'react'

import { NavBar } from '@/components/composites/NavBar/NavBar'
import { Button } from '@/components/primitives/Button/Button'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Surface the error to the platform's error stream. Sentry / Datadog
    // can replace this once wired; the contract stays the same.
    console.error('[agentclip] unhandled error in app/', error)
  }, [error])

  return (
    <>
      <NavBar />
      <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-6 px-6 py-20 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-vermillion-700">
          500
        </p>
        <h1 className="text-4xl font-semibold tracking-[-0.02em] text-ink-900">
          Something went wrong.
        </h1>
        <p className="max-w-prose text-ink-600">
          The viewer hit an unexpected error rendering this page. Trying again
          usually fixes it; if it doesn&apos;t, the request id below will help
          us diagnose.
        </p>
        {error.digest && (
          <code className="rounded-md border border-ink-200 bg-paper-oat px-2 py-1 font-mono text-xs text-ink-700">
            {error.digest}
          </code>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={reset} variant="primary" size="md">
            Try again
          </Button>
          <Button asChild variant="ghost" size="md">
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </main>
    </>
  )
}
