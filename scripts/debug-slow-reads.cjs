const fs = require('node:fs')
const { performance } = require('node:perf_hooks')

const originalReadFileSync = fs.readFileSync

fs.readFileSync = function patchedReadFileSync(path, options) {
  const start = performance.now()
  try {
    return originalReadFileSync.call(fs, path, options)
  } finally {
    const elapsed = performance.now() - start
    if (elapsed > 500) {
      const filePath = typeof path === 'string' ? path : path && path.toString ? path.toString() : String(path)
      console.error(`[debug-slow-reads] ${elapsed.toFixed(1)}ms -> ${filePath}`)
    }
  }
}
