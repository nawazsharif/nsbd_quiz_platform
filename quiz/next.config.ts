import type { NextConfig } from 'next'

const API_PROXY_TARGET = process.env.API_PROXY_TARGET || 'http://localhost:8000'

const nextConfig: NextConfig = {
  // Enable standalone output so the Docker image can run via server.js
  output: 'standalone',

  // Force all pages to be dynamic to prevent static generation issues
  experimental: {
    cacheComponents: false,
  },

  // Completely disable static generation during build
  distDir: '.next',
  generateBuildId: () => 'build',

  async rewrites() {
    return [
      {
        source: '/backend/:path*',
        destination: `${API_PROXY_TARGET}/api/:path*`,
      },
    ]
  },
}

export default nextConfig
