/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config) => {
    // Handle PDF.js worker
    config.resolve.alias.canvas = false
    config.resolve.alias.encoding = false

    return config
  },
  // Turbopack experimental configuration
  experimental: {
    turbo: {
      resolveAlias: {
        canvas: false,
        encoding: false,
      },
    },
  },
}

export default nextConfig
