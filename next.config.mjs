const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { dev }) => {
    if (dev) {
      // Avoid filesystem pack cache writes/reads that can hang on synced folders.
      config.cache = false
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
