const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['node-ical']
  },
  webpack: (config, { dev }) => {
    if (!process.env.VERCEL) {
      // Avoid filesystem pack cache races on local synced folders.
      config.cache = false
    }

    if (dev) {
      config.snapshot = {
        ...(config.snapshot || {}),
        managedPaths: []
      }
      config.watchOptions = {
        ...(config.watchOptions || {}),
        ignored: [
          '**/.git/**',
          '**/.next/**',
          '**/Knowledge/**',
          '**/ETC3400/**',
          '**/ETC3420/**',
          '**/MuksBooks/**',
          '**/logs/**',
          '**/data/**'
        ]
      }
    }

    return config
  }
}

export default nextConfig
