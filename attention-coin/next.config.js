/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['pbs.twimg.com', 'abs.twimg.com'],
  },
  transpilePackages: ['@solana/wallet-adapter-base', '@solana/wallet-adapter-react'],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't bundle pino or pino-pretty on the client side
      config.resolve.alias = {
        ...config.resolve.alias,
        'pino': false,
        'pino-pretty': false,
      }
    }
    return config
  },
}

module.exports = nextConfig