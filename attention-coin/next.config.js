/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['pbs.twimg.com', 'abs.twimg.com'],
  },
  transpilePackages: ['@solana/wallet-adapter-base', '@solana/wallet-adapter-react'],
  webpack: (config, { isServer, webpack }) => {
    // Multiple strategies to handle pino-pretty

    // 1. IgnorePlugin - tells webpack to skip require('pino-pretty')
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^pino-pretty$/,
      })
    )

    // 2. NormalModuleReplacementPlugin - replace pino-pretty with empty module
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /pino-pretty/,
        require.resolve('./lib/empty-module.js')
      )
    )

    // 3. Externals - mark as external (don't bundle)
    if (!config.externals) {
      config.externals = []
    }
    if (typeof config.externals === 'object' && !Array.isArray(config.externals)) {
      config.externals = [config.externals]
    }
    config.externals.push('pino-pretty')

    if (!isServer) {
      // Exclude Node.js modules from client bundle
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'pino-pretty': false,
        fs: false,
        net: false,
        tls: false,
      }
    }

    return config
  },
}

module.exports = nextConfig