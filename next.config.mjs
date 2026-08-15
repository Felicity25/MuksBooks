const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { dev, isServer }) => {
    // Exclude native Node.js modules from the webpack bundle so they are loaded
    // at runtime rather than bundled. node:sqlite is a built-in Node 22 module.
    if (isServer) {
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : config.externals ? [config.externals] : []),
        ({ request }: { request?: string }, callback: (err?: Error | null, result?: string) => void) => {
          if (request === 'node:sqlite') {
            return callback(null, `commonjs ${request}`)
          }
          callback()
        }
      ]
    }

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
