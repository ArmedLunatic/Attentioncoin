/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['pbs.twimg.com', 'abs.twimg.com'],
  },
  transpilePackages: ['@solana/wallet-adapter-base', '@solana/wallet-adapter-react'],
  webpack: (config, { isServer }) => {
    // Only exclude pino-pretty from client-side bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'pino-pretty': false,
      }
    }
    return config
  },
}

module.exports = nextConfig