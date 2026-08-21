export interface Rng {
  next: () => number
  normal: () => number
}

function mulberry32(seed: number) {
  let state = seed >>> 0
  return () => {
    state += 0x6d2b79f5
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function createRng(seed: number): Rng {
  const uniform = mulberry32(seed || 1)
  let spare: number | null = null

  const normal = () => {
    if (spare !== null) {
      const value = spare
      spare = null
      return value
    }

    let u = 0
    let v = 0
    while (u <= Number.EPSILON) u = uniform()
    while (v <= Number.EPSILON) v = uniform()
    const magnitude = Math.sqrt(-2 * Math.log(u))
    const angle = 2 * Math.PI * v
    spare = magnitude * Math.sin(angle)
    return magnitude * Math.cos(angle)
  }

  return { next: uniform, normal }
}
