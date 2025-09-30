import type { NextConfig } from 'next'

const API_PROXY_TARGET = process.env.API_PROXY_TARGET || 'http://api.quiz.test'

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/backend/:path*',
        destination: `${API_PROXY_TARGET}/api/:path*`,
      },
      {
        source: '/api/backend/:path*',
        destination: `${API_PROXY_TARGET}/api/:path*`,
      },
    ]
  },
}

export default nextConfig
