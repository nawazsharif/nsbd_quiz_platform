import type { NextConfig } from 'next'

const API_PROXY_TARGET = process.env.API_PROXY_TARGET || 'http://api.quiz.test'

const nextConfig: NextConfig = {
  // Temporarily disable standalone output for deployment
  // output: 'standalone',

  // Force all pages to be dynamic to prevent static generation issues
  experimental: {
    dynamicIO: false,
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
