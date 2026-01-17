/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['pbs.twimg.com', 'abs.twimg.com'],
  },
  transpilePackages: ['@solana/wallet-adapter-base', '@solana/wallet-adapter-react'],
  webpack: (config, { isServer, webpack }) => {
    // CRITICAL: Ignore pino-pretty on BOTH client and server
    // Pino (used by Supabase/Solana deps) tries to require it, but it's optional
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^pino-pretty$/,
      })
    )

    if (!isServer) {
      // Exclude Node.js modules from client bundle
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }

    return config
  },
}

module.exports = nextConfig