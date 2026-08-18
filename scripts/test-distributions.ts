import assert from 'node:assert/strict'
import {
  DISTRIBUTIONS,
  defaultParameters,
  distributionCdf,
  distributionDensity,
  distributionQuantile,
  distributionSummary,
  normalizeParameters,
  type DistributionId
} from '../lib/resources/distributions.ts'

const closeTo = (actual: number | null, expected: number, tolerance = 1e-9) => {
  assert.notEqual(actual, null)
  assert.ok(Math.abs((actual as number) - expected) <= tolerance, `Expected ${actual} to be within ${tolerance} of ${expected}`)
}

const midpointIntegral = (id: DistributionId, parameters: Record<string, number>, lower: number, upper: number, intervals = 30000) => {
  const width = (upper - lower) / intervals
  let total = 0
  for (let index = 0; index < intervals; index += 1) {
    total += distributionDensity(id, lower + (index + 0.5) * width, parameters)
  }
  return total * width
}

for (const distribution of DISTRIBUTIONS) {
  const parameters = defaultParameters(distribution)
  const lower = distributionQuantile(distribution.id, 0.00001, parameters)
  const upper = distributionQuantile(distribution.id, 0.99999, parameters)

  let previous = 0
  for (let index = 0; index <= 200; index += 1) {
    const x = lower + (upper - lower) * index / 200
    const density = distributionDensity(distribution.id, x, parameters)
    const cumulative = distributionCdf(distribution.id, x, parameters)
    assert.ok(Number.isFinite(density) && density >= 0, `${distribution.id} density must be finite and non-negative`)
    assert.ok(cumulative >= 0 && cumulative <= 1, `${distribution.id} CDF must remain in [0,1]`)
    assert.ok(cumulative + 1e-12 >= previous, `${distribution.id} CDF must be non-decreasing`)
    previous = cumulative
  }

  if (distribution.family === 'Discrete') {
    let mass = 0
    for (let value = Math.ceil(lower); value <= Math.floor(upper); value += 1) mass += distributionDensity(distribution.id, value, parameters)
    assert.ok(Math.abs(mass - 1) < 0.0001, `${distribution.id} PMF sums to ${mass}`)
  } else {
    const mass = midpointIntegral(distribution.id, parameters, lower, upper)
    assert.ok(Math.abs(mass - 0.99998) < 0.003, `${distribution.id} PDF integrates to ${mass}`)
  }
}

closeTo(distributionSummary('bernoulli', { p: 0.25 }).mean, 0.25)
closeTo(distributionSummary('binomial', { n: 20, p: 0.25 }).variance, 3.75)
closeTo(distributionSummary('poisson', { lambda: 4 }).mean, 4)
closeTo(distributionSummary('negative-binomial-1', { r: 4, p: 0.4 }).mean, 6)
closeTo(distributionSummary('negative-binomial-2', { r: 4, p: 0.4 }).mean, 10)
closeTo(distributionSummary('geometric', { p: 0.25 }).variance, 12)
closeTo(distributionSummary('normal', { mu: 2, sigma: 3 }).variance, 9)
closeTo(distributionSummary('exponential', { lambda: 4 }).mean, 0.25)
closeTo(distributionSummary('gamma', { alpha: 3, lambda: 2 }).variance, 0.75)
closeTo(distributionSummary('chi-square', { nu: 5 }).variance, 10)
closeTo(distributionSummary('beta', { alpha: 2, beta: 3 }).mean, 0.4)
closeTo(distributionSummary('lognormal', { mu: 0, sigma: 1 }).mean, Math.exp(0.5))
closeTo(distributionSummary('pareto-2', { alpha: 3, theta: 2 }).mean, 1)
assert.equal(distributionSummary('pareto-2', { alpha: 1, theta: 2 }).mean, null)
assert.equal(distributionSummary('student-t', { nu: 2 }).variance, null)
assert.equal(distributionSummary('f', { d1: 5, d2: 4 }).variance, null)

const changed = (id: DistributionId, left: Record<string, number>, right: Record<string, number>, x: number) =>
  Math.abs(distributionDensity(id, x, left) - distributionDensity(id, x, right)) > 1e-5

assert.ok(distributionDensity('exponential', 0, { lambda: 4 }) > 7.9 * distributionDensity('exponential', 0, { lambda: 0.5 }))
assert.ok(changed('normal', { mu: 0, sigma: 0.5 }, { mu: 0, sigma: 3 }, 0))
assert.ok(changed('beta', { alpha: 0.5, beta: 0.5 }, { alpha: 5, beta: 5 }, 0.5))
assert.ok(changed('weibull', { k: 0.6, lambda: 2 }, { k: 4, lambda: 2 }, 1))
assert.ok(changed('pareto-2', { alpha: 1, theta: 2 }, { alpha: 5, theta: 2 }, 10))
assert.ok(changed('burr', { alpha: 1, gamma: 1, theta: 2 }, { alpha: 4, gamma: 3, theta: 2 }, 5))
assert.ok(changed('poisson', { lambda: 2 }, { lambda: 10 }, 4))
assert.ok(changed('binomial', { n: 10, p: 0.2 }, { n: 30, p: 0.7 }, 5))
assert.ok(changed('gamma', { alpha: 2, lambda: 0.5 }, { alpha: 8, lambda: 4 }, 2))
assert.ok(changed('lognormal', { mu: -1, sigma: 0.3 }, { mu: 1, sigma: 1.5 }, 1))

const normalizedUniform = normalizeParameters(DISTRIBUTIONS.find(({ id }) => id === 'continuous-uniform')!, { a: 4, b: 2 })
assert.ok(normalizedUniform.b > normalizedUniform.a, 'Uniform bounds must remain ordered')

console.log(`Distribution tests passed for ${DISTRIBUTIONS.length} registry entries.`)