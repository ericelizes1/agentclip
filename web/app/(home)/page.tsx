/**
 * Home page placeholder.
 *
 * Intentionally minimal for U4 — Phase B's job is just to stand up
 * the skeleton that builds + serves. The real composition lands in
 * Unit 13 (HomePage), which assembles HeroSection + GalleryGrid
 * patterns from Phase C. Keeping this stub small means the U4 commit
 * stays scoped to "scaffold, no behavior".
 */
export default function HomePage() {
  return (
    <main className="mx-auto max-w-[1080px] px-6 py-24">
      <h1 className="text-4xl font-semibold tracking-tight text-ink-900">
        AgentClip
      </h1>
      <p className="mt-4 text-ink-600">
        Skip the screencast. Web bootstrapping in progress — see{' '}
        <code className="font-mono text-vermillion-500">docs/mockups/index.html</code>{' '}
        for the locked design.
      </p>
    </main>
  )
}
