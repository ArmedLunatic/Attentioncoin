/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['pbs.twimg.com', 'abs.twimg.com'],
  },
  transpilePackages: ['@solana/wallet-adapter-base', '@solana/wallet-adapter-react'],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Exclude pino-pretty and other Node.js logging modules from client bundle
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'pino-pretty': false,
        fs: false,
        net: false,
        tls: false,
      }

      // Mark pino-pretty as external to prevent webpack from trying to bundle it
      config.externals = config.externals || []
      config.externals.push({
        'pino-pretty': 'pino-pretty'
      })
    }
    return config
  },
}

module.exports = nextConfig