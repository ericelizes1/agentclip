import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Tailwind 4 + the OG-image renderer (added in U15) need this so that
  // Next can find images served by the Django API at api.agentclip.dev.
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'api.agentclip.dev' },
      { protocol: 'https', hostname: '*.digitaloceanspaces.com' },
    ],
  },
}

export default nextConfig
