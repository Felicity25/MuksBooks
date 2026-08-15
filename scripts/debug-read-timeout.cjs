const fs = require('node:fs')

const originalReadFileSync = fs.readFileSync

fs.readFileSync = function patchedReadFileSync(path, options) {
  try {
    return originalReadFileSync.call(fs, path, options)
  } catch (error) {
    if (error && error.code === 'ETIMEDOUT') {
      const filePath = typeof path === 'string' ? path : path && path.toString ? path.toString() : String(path)
      console.error('[debug-read-timeout] ETIMEDOUT while reading:', filePath)
      console.error('[debug-read-timeout] stack:', error.stack)
    }
    throw error
  }
}
