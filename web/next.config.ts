import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Standalone build trims node_modules to just what runtime needs
  // and emits a self-contained server.js — required for the small
  // production Dockerfile in web/Dockerfile.
  output: 'standalone',
  // Tailwind 4 + the OG-image renderer (Unit 15) need this so Next
  // can fetch slide media. The API serves uploads from Cloudflare R2;
  // api.agentclip.dev fronts the Django service itself.
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'api.agentclip.dev' },
      { protocol: 'https', hostname: '*.r2.cloudflarestorage.com' },
      { protocol: 'https', hostname: 'cdn.agentclip.dev' },
    ],
  },
}

export default nextConfig
