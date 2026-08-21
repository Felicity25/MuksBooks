import { createRng } from '@/lib/resources/stochastic/random'
import type { MultiPathResult, PathPoint } from '@/lib/resources/stochastic/types'

export function createTimeGrid(steps: number, horizon: number) {
  const safeSteps = Math.max(2, Math.floor(steps))
  const safeHorizon = Math.max(0.1, horizon)
  return Array.from({ length: safeSteps + 1 }, (_, i) => i * safeHorizon / safeSteps)
}

export function simulateBrownianPaths(seed: number, steps: number, horizon: number, pathCount: number): MultiPathResult {
  const rng = createRng(seed)
  const times = createTimeGrid(steps, horizon)
  const dt = horizon / Math.max(1, steps)
  const scale = Math.sqrt(dt)
  const paths = Array.from({ length: Math.max(1, Math.floor(pathCount)) }, () => {
    const values: number[] = [0]
    for (let i = 1; i < times.length; i += 1) {
      const prev = values[i - 1]
      const dW = scale * rng.normal()
      values.push(prev + dW)
    }
    return values
  })
  return { times, paths }
}

export function simulateDriftBrownianPaths(seed: number, steps: number, horizon: number, pathCount: number, mu: number, sigma: number, x0 = 0): MultiPathResult {
  const rng = createRng(seed)
  const times = createTimeGrid(steps, horizon)
  const dt = horizon / Math.max(1, steps)
  const scale = Math.sqrt(dt)
  const paths = Array.from({ length: Math.max(1, Math.floor(pathCount)) }, () => {
    const values: number[] = [x0]
    for (let i = 1; i < times.length; i += 1) {
      const prev = values[i - 1]
      const dW = scale * rng.normal()
      values.push(prev + mu * dt + sigma * dW)
    }
    return values
  })
  return { times, paths }
}

export function simulateGeometricBrownianPaths(seed: number, steps: number, horizon: number, pathCount: number, s0: number, mu: number, sigma: number): MultiPathResult {
  const rng = createRng(seed)
  const times = createTimeGrid(steps, horizon)
  const dt = horizon / Math.max(1, steps)
  const scale = Math.sqrt(dt)
  const paths = Array.from({ length: Math.max(1, Math.floor(pathCount)) }, () => {
    const values: number[] = [Math.max(1e-6, s0)]
    for (let i = 1; i < times.length; i += 1) {
      const prev = values[i - 1]
      const z = rng.normal()
      const next = prev * Math.exp((mu - 0.5 * sigma * sigma) * dt + sigma * scale * z)
      values.push(Math.max(1e-6, next))
    }
    return values
  })
  return { times, paths }
}

export function simulateSimpleRandomWalk(seed: number, steps: number, pathCount: number): MultiPathResult {
  const rng = createRng(seed)
  const safeSteps = Math.max(5, Math.floor(steps))
  const times = Array.from({ length: safeSteps + 1 }, (_, i) => i / safeSteps)
  const scale = 1 / Math.sqrt(safeSteps)
  const paths = Array.from({ length: Math.max(1, Math.floor(pathCount)) }, () => {
    const values: number[] = [0]
    for (let i = 1; i <= safeSteps; i += 1) {
      const step = rng.next() < 0.5 ? -1 : 1
      values.push(values[i - 1] + scale * step)
    }
    return values
  })
  return { times, paths }
}

export function simulatePoissonPath(seed: number, steps: number, horizon: number, lambda: number): PathPoint[] {
  const rng = createRng(seed)
  const dt = horizon / Math.max(1, steps)
  const points: PathPoint[] = [{ t: 0, y: 0 }]
  let count = 0
  for (let i = 1; i <= steps; i += 1) {
    const t = i * dt
    const threshold = lambda * dt
    if (rng.next() < threshold) count += 1
    points.push({ t, y: count })
  }
  return points
}

function sampleExponential(r: ReturnType<typeof createRng>, rate: number): number {
  const u = Math.max(Number.EPSILON, r.next())
  return -Math.log(u) / Math.max(1e-6, rate)
}

function sampleGamma(r: ReturnType<typeof createRng>, shape: number, rate: number): number {
  const k = Math.max(0.2, shape)
  if (k < 1) {
    const u = r.next()
    return sampleGamma(r, k + 1, rate) * Math.pow(u, 1 / k)
  }
  const d = k - 1 / 3
  const c = 1 / Math.sqrt(9 * d)
  while (true) {
    const x = r.normal()
    const v = Math.pow(1 + c * x, 3)
    if (v <= 0) continue
    const u = r.next()
    if (u < 1 - 0.0331 * Math.pow(x, 4)) return (d * v) / Math.max(1e-6, rate)
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return (d * v) / Math.max(1e-6, rate)
  }
}

function sampleLognormal(r: ReturnType<typeof createRng>, mu: number, sigma: number): number {
  return Math.exp(mu + sigma * r.normal())
}

function sampleWeibull(r: ReturnType<typeof createRng>, shape: number, scale: number): number {
  const u = Math.max(Number.EPSILON, 1 - r.next())
  return scale * Math.pow(-Math.log(u), 1 / Math.max(0.1, shape))
}

function samplePareto(r: ReturnType<typeof createRng>, alpha: number, xm: number): number {
  const u = Math.max(Number.EPSILON, 1 - r.next())
  return xm / Math.pow(u, 1 / Math.max(0.2, alpha))
}

export type SeverityDistribution = 'exponential' | 'gamma' | 'lognormal' | 'weibull' | 'pareto'

export function sampleSeverity(rngSeeded: ReturnType<typeof createRng>, distribution: SeverityDistribution, params: Record<string, number>) {
  if (distribution === 'gamma') return sampleGamma(rngSeeded, params.shape ?? 2, params.rate ?? 1)
  if (distribution === 'lognormal') return sampleLognormal(rngSeeded, params.mu ?? 0, params.sigma ?? 0.7)
  if (distribution === 'weibull') return sampleWeibull(rngSeeded, params.shape ?? 1.5, params.scale ?? 1)
  if (distribution === 'pareto') return samplePareto(rngSeeded, params.alpha ?? 2.5, params.xm ?? 1)
  return sampleExponential(rngSeeded, params.rate ?? 1)
}

export function simulateCompoundPoisson(seed: number, steps: number, horizon: number, lambda: number, severity: SeverityDistribution, severityParams: Record<string, number>) {
  const rng = createRng(seed)
  const dt = horizon / Math.max(1, steps)
  const arrivals: PathPoint[] = [{ t: 0, y: 0 }]
  const aggregate: PathPoint[] = [{ t: 0, y: 0 }]
  let count = 0
  let total = 0

  for (let i = 1; i <= steps; i += 1) {
    const t = i * dt
    if (rng.next() < lambda * dt) {
      count += 1
      total += sampleSeverity(rng, severity, severityParams)
    }
    arrivals.push({ t, y: count })
    aggregate.push({ t, y: total })
  }

  return { arrivals, aggregate }
}

export function deterministicCurve(steps: number, horizon: number): PathPoint[] {
  const times = createTimeGrid(steps, horizon)
  return times.map((t) => ({ t, y: Math.sin(1.8 * t) + 0.25 * t }))
}

export function quadraticVariation(path: number[], partitions: number) {
  const n = Math.max(2, Math.min(path.length - 1, partitions))
  const stride = Math.max(1, Math.floor((path.length - 1) / n))
  let sum = 0
  for (let i = stride; i < path.length; i += stride) {
    const prev = path[Math.max(0, i - stride)]
    const current = path[i]
    const diff = current - prev
    sum += diff * diff
  }
  return sum
}

export function runningMean(paths: number[][]): number[] {
  if (!paths.length) return []
  const length = paths[0].length
  const mean = Array.from({ length }, () => 0)
  for (const path of paths) {
    for (let i = 0; i < length; i += 1) mean[i] += path[i]
  }
  return mean.map((value) => value / paths.length)
}

export function empiricalVariance(paths: number[][], index: number) {
  if (!paths.length) return 0
  const mean = paths.reduce((sum, path) => sum + path[index], 0) / paths.length
  const varSum = paths.reduce((sum, path) => {
    const d = path[index] - mean
    return sum + d * d
  }, 0)
  return varSum / Math.max(1, paths.length - 1)
}
