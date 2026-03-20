import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.r2.dev' },
      { protocol: 'https', hostname: '*.cloudflare.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.unsplash.com' },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/feed',
        destination: 'https://jmlasthxrnjecedsacme.supabase.co/functions/v1/feed',
      },
    ]
  },
}

export default nextConfig
