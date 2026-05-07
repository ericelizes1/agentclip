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
  title: 'AgentClip · Skip the screencast',
  description:
    'QA runs, walkthroughs, bug repros — your agent records the run, narrates ' +
    'it, and ships you a URL anyone can watch.',
  metadataBase: new URL('https://agentclip.dev'),
  openGraph: {
    title: 'AgentClip · Skip the screencast',
    description:
      'QA runs, walkthroughs, bug repros — your agent records the run, ' +
      'narrates it, and ships you a URL anyone can watch.',
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
