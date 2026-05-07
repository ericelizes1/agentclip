import type { Metadata } from 'next'
import { Fraunces, Geist, Geist_Mono } from 'next/font/google'
import type { ReactNode } from 'react'
import './globals.css'

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
  display: 'swap',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
})

// Display serif used only for the hero headline. Fraunces is a free
// Google Font with strong italic personality — pairs cleanly with
// Geist Sans for body copy. Variable font so the headline can ride
// optical-size + soft axes without shipping multiple weight files.
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  axes: ['SOFT', 'opsz'],
})

export const metadata: Metadata = {
  title: 'AgentClip · Skip the demo',
  description:
    'With AgentClip, your Claude or Codex agent will send you narrated, ' +
    'shareable walkthroughs of your work. Have confidence users are getting ' +
    'what you promised. Attach in PRs, Slack messages, and release notes. ' +
    'Never say "let me record that one more time" ever again.',
  metadataBase: new URL('https://agentclip.dev'),
  openGraph: {
    title: 'AgentClip · Skip the demo',
    description:
      'With AgentClip, your Claude or Codex agent will send you narrated, ' +
      'shareable walkthroughs of your work. Have confidence users are getting ' +
      'what you promised. Attach in PRs, Slack messages, and release notes. ' +
      'Never say "let me record that one more time" ever again.',
    url: 'https://agentclip.dev',
    siteName: 'AgentClip',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${geistMono.variable} ${fraunces.variable}`}
    >
      <body>{children}</body>
    </html>
  )
}
