/**
 * Layout for `/embed/[token]` — chrome-less wrapper for iframe embedding.
 *
 * No nav, no footer, no globals beyond the body reset. Hosts that drop
 * an iframe pointing here see only the player. CSP frame-ancestors *
 * is set at the route level so any origin can embed; sandboxing is
 * the caller's choice.
 */

import type { Metadata } from 'next'

import '../../globals.css'

export const metadata: Metadata = {
  // Block search indexing of the bare embed page; the share page
  // (`/s/<token>`) is the canonical URL for SEO.
  robots: { index: false, follow: false },
}

export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-black antialiased m-0 p-0 overflow-hidden">{children}</body>
    </html>
  )
}
