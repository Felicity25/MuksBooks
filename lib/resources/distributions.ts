export type DistributionId = 'normal' | 'binomial' | 'poisson' | 'exponential' | 'gamma'

export interface DistributionParameter {
  key: string
  label: string
  symbol: string
  min: number
  max: number
  step: number
  defaultValue: number
}

export interface DistributionDefinition {
  id: DistributionId
  name: string
  family: 'Discrete' | 'Continuous'
  formula: string
  parameters: DistributionParameter[]
  intuition: string
  actuarialUse: string
  commonMistake: string
  syllabus: string[]
}

export interface DistributionPoint {
  x: number
  y: number
}

export interface DistributionSummary {
  mean: number
  variance: number
  standardDeviation: number
  support: string
}

export type DistributionMetric = 'density' | 'cdf' | 'survival' | 'hazard'

export const DISTRIBUTIONS: DistributionDefinition[] = [
  {
    id: 'normal',
    name: 'Normal',
    family: 'Continuous',
    formula: 'f(x) = exp(-(x - mu)^2 / (2 sigma^2)) / (sigma sqrt(2 pi))',
    parameters: [
      { key: 'mu', label: 'Location', symbol: 'mu', min: -20, max: 20, step: 0.5, defaultValue: 0 },
      { key: 'sigma', label: 'Standard deviation', symbol: 'sigma', min: 0.2, max: 10, step: 0.2, defaultValue: 1 }
    ],
    intuition: 'A symmetric model for aggregate effects built from many small, roughly independent contributions.',
    actuarialUse: 'Approximation of aggregate claims, residual models, credibility estimators and simulation diagnostics.',
    commonMistake: 'Using it for positive, strongly skewed losses without checking the tail or the possibility of negative values.',
    syllabus: ['CS1', 'CM2', 'Actuaries Institute Foundation']
  },
  {
    id: 'binomial',
    name: 'Binomial',
    family: 'Discrete',
    formula: 'P(X = k) = C(n,k) p^k (1-p)^(n-k)',
    parameters: [
      { key: 'n', label: 'Trials', symbol: 'n', min: 1, max: 100, step: 1, defaultValue: 20 },
      { key: 'p', label: 'Event probability', symbol: 'p', min: 0.01, max: 0.99, step: 0.01, defaultValue: 0.25 }
    ],
    intuition: 'Counts successes across a fixed number of independent trials with the same event probability.',
    actuarialUse: 'Claim incidence, policy conversion, mortality counts and portfolio event-frequency models.',
    commonMistake: 'Ignoring dependence or differing probabilities between policyholders.',
    syllabus: ['CS1', 'CS2', 'Actuaries Institute Foundation']
  },
  {
    id: 'poisson',
    name: 'Poisson',
    family: 'Discrete',
    formula: 'P(X = k) = exp(-lambda) lambda^k / k!',
    parameters: [
      { key: 'lambda', label: 'Expected count', symbol: 'lambda', min: 0.1, max: 30, step: 0.1, defaultValue: 4 }
    ],
    intuition: 'Models independent event arrivals over a fixed exposure when events occur at a stable average rate.',
    actuarialUse: 'Claim frequency, operational incidents, deaths in a period and collective risk models.',
    commonMistake: 'Assuming the mean-equals-variance restriction remains adequate when data are overdispersed.',
    syllabus: ['CS1', 'CS2', 'CM1']
  },
  {
    id: 'exponential',
    name: 'Exponential',
    family: 'Continuous',
    formula: 'f(x) = lambda exp(-lambda x), x >= 0',
    parameters: [
      { key: 'lambda', label: 'Rate', symbol: 'lambda', min: 0.05, max: 5, step: 0.05, defaultValue: 1 }
    ],
    intuition: 'A memoryless waiting-time model associated with a constant event intensity.',
    actuarialUse: 'Inter-claim times, simple survival models, reliability and building blocks for loss models.',
    commonMistake: 'Confusing the rate lambda with the mean, which is 1 / lambda.',
    syllabus: ['CS1', 'CS2', 'CM1']
  },
  {
    id: 'gamma',
    name: 'Gamma',
    family: 'Continuous',
    formula: 'f(x) = x^(alpha-1) exp(-x/theta) / (Gamma(alpha) theta^alpha)',
    parameters: [
      { key: 'alpha', label: 'Shape', symbol: 'alpha', min: 0.5, max: 15, step: 0.5, defaultValue: 3 },
      { key: 'theta', label: 'Scale', symbol: 'theta', min: 0.1, max: 10, step: 0.1, defaultValue: 2 }
    ],
    intuition: 'A flexible positive, right-skewed model whose shape becomes more symmetric as alpha increases.',
    actuarialUse: 'Claim severity, aggregate waiting times, Bayesian conjugacy and continuous loss modelling.',
    commonMistake: 'Mixing rate and scale parameterisations; this laboratory uses scale theta.',
    syllabus: ['CS1', 'CS2', 'CM2']
  }
]

function factorial(value: number) {
  let result = 1
  for (let current = 2; current <= value; current += 1) result *= current
  return result
}

function combination(total: number, selected: number) {
  if (selected < 0 || selected > total) return 0
  const count = Math.min(selected, total - selected)
  let result = 1
  for (let index = 1; index <= count; index += 1) {
    result = result * (total - count + index) / index
  }
  return result
}

function gammaFunction(value: number): number {
  const coefficients = [
    676.5203681218851, -1259.1392167224028, 771.3234287776531,
    -176.6150291621406, 12.507343278686905, -0.13857109526572012,
    9.984369578019572e-6, 1.5056327351493116e-7
  ]
  if (value < 0.5) return Math.PI / (Math.sin(Math.PI * value) * gammaFunction(1 - value))
  const adjusted = value - 1
  let series = 0.9999999999998099
  coefficients.forEach((coefficient, index) => {
    series += coefficient / (adjusted + index + 1)
  })
  const shifted = adjusted + coefficients.length - 0.5
  return Math.sqrt(2 * Math.PI) * shifted ** (adjusted + 0.5) * Math.exp(-shifted) * series
}

function normalCdf(value: number) {
  const sign = value < 0 ? -1 : 1
  const scaled = Math.abs(value) / Math.sqrt(2)
  const approximation = 1 - (((((1.061405429 * (1 / (1 + 0.3275911 * scaled)) - 1.453152027)
    * (1 / (1 + 0.3275911 * scaled)) + 1.421413741) * (1 / (1 + 0.3275911 * scaled)) - 0.284496736)
    * (1 / (1 + 0.3275911 * scaled)) + 0.254829592) * (1 / (1 + 0.3275911 * scaled))) * Math.exp(-scaled * scaled)
  return 0.5 * (1 + sign * approximation)
}

function regularizedGamma(shape: number, value: number) {
  if (value <= 0) return 0
  if (value < shape + 1) {
    let term = 1 / shape
    let sum = term
    let denominator = shape
    for (let index = 0; index < 100; index += 1) {
      denominator += 1
      term *= value / denominator
      sum += term
      if (Math.abs(term) < Math.abs(sum) * 1e-12) break
    }
    return Math.min(1, sum * Math.exp(-value + shape * Math.log(value)) / gammaFunction(shape))
  }

  let previous = 0
  let current = 1
  let numeratorPrevious = 1
  let numeratorCurrent = value
  for (let index = 1; index <= 100; index += 1) {
    const coefficient = index * (shape - index)
    const denominator = value + 2 * index - shape
    const nextNumerator = denominator * numeratorCurrent + coefficient * numeratorPrevious
    const nextDenominator = denominator * current + coefficient * previous
    if (nextDenominator !== 0) {
      const ratio = nextNumerator / nextDenominator
      if (Math.abs((ratio - numeratorCurrent / current) / ratio) < 1e-12) {
        return Math.max(0, 1 - Math.exp(-value + shape * Math.log(value)) / gammaFunction(shape) / ratio)
      }
    }
    numeratorPrevious = numeratorCurrent
    numeratorCurrent = nextNumerator
    previous = current
    current = nextDenominator
    if (Math.abs(numeratorCurrent) > 1e100) {
      numeratorPrevious *= 1e-100
      numeratorCurrent *= 1e-100
      previous *= 1e-100
      current *= 1e-100
    }
  }
  return Math.max(0, Math.min(1, 1 - Math.exp(-value + shape * Math.log(value)) / gammaFunction(shape) * current / numeratorCurrent))
}

export function defaultParameters(distribution: DistributionDefinition) {
  return Object.fromEntries(distribution.parameters.map((parameter) => [parameter.key, parameter.defaultValue]))
}

export function clampParameters(distribution: DistributionDefinition, values: Record<string, number>) {
  return Object.fromEntries(distribution.parameters.map((parameter) => {
    const value = Number(values[parameter.key])
    const bounded = Number.isFinite(value) ? Math.min(parameter.max, Math.max(parameter.min, value)) : parameter.defaultValue
    const normalized = parameter.step >= 1 ? Math.round(bounded) : bounded
    return [parameter.key, normalized]
  }))
}

export function distributionSummary(id: DistributionId, parameters: Record<string, number>): DistributionSummary {
  if (id === 'normal') {
    return { mean: parameters.mu, variance: parameters.sigma ** 2, standardDeviation: parameters.sigma, support: 'All real numbers' }
  }
  if (id === 'binomial') {
    const variance = parameters.n * parameters.p * (1 - parameters.p)
    return { mean: parameters.n * parameters.p, variance, standardDeviation: Math.sqrt(variance), support: `0, 1, ..., ${parameters.n}` }
  }
  if (id === 'poisson') {
    return { mean: parameters.lambda, variance: parameters.lambda, standardDeviation: Math.sqrt(parameters.lambda), support: '0, 1, 2, ...' }
  }
  if (id === 'exponential') {
    const variance = 1 / parameters.lambda ** 2
    return { mean: 1 / parameters.lambda, variance, standardDeviation: Math.sqrt(variance), support: 'x >= 0' }
  }
  const variance = parameters.alpha * parameters.theta ** 2
  return { mean: parameters.alpha * parameters.theta, variance, standardDeviation: Math.sqrt(variance), support: 'x > 0' }
}

export function distributionPoints(id: DistributionId, rawParameters: Record<string, number>): DistributionPoint[] {
  const definition = DISTRIBUTIONS.find((distribution) => distribution.id === id) || DISTRIBUTIONS[0]
  const parameters = clampParameters(definition, rawParameters)
  const summary = distributionSummary(id, parameters)

  if (id === 'binomial') {
    return Array.from({ length: parameters.n + 1 }, (_, x) => ({
      x,
      y: combination(parameters.n, x) * parameters.p ** x * (1 - parameters.p) ** (parameters.n - x)
    }))
  }
  if (id === 'poisson') {
    const maximum = Math.max(12, Math.ceil(parameters.lambda + 4 * Math.sqrt(parameters.lambda)))
    return Array.from({ length: maximum + 1 }, (_, x) => ({
      x,
      y: Math.exp(-parameters.lambda) * parameters.lambda ** x / factorial(x)
    }))
  }

  const start = id === 'normal' ? summary.mean - 4 * summary.standardDeviation : 0.001
  const end = id === 'normal' ? summary.mean + 4 * summary.standardDeviation : summary.mean + 5 * summary.standardDeviation
  return Array.from({ length: 81 }, (_, index) => {
    const x = start + (end - start) * index / 80
    if (id === 'normal') {
      return { x, y: Math.exp(-((x - parameters.mu) ** 2) / (2 * parameters.sigma ** 2)) / (parameters.sigma * Math.sqrt(2 * Math.PI)) }
    }
    if (id === 'exponential') {
      return { x, y: parameters.lambda * Math.exp(-parameters.lambda * x) }
    }
    return {
      x,
      y: x ** (parameters.alpha - 1) * Math.exp(-x / parameters.theta) / (gammaFunction(parameters.alpha) * parameters.theta ** parameters.alpha)
    }
  })
}

export function distributionDensity(id: DistributionId, x: number, rawParameters: Record<string, number>) {
  const definition = DISTRIBUTIONS.find((distribution) => distribution.id === id) || DISTRIBUTIONS[0]
  const parameters = clampParameters(definition, rawParameters)
  if (id === 'normal') return Math.exp(-((x - parameters.mu) ** 2) / (2 * parameters.sigma ** 2)) / (parameters.sigma * Math.sqrt(2 * Math.PI))
  if (id === 'binomial') {
    const integer = Math.round(x)
    return Number.isInteger(x) && integer >= 0 && integer <= parameters.n
      ? combination(parameters.n, integer) * parameters.p ** integer * (1 - parameters.p) ** (parameters.n - integer)
      : 0
  }
  if (id === 'poisson') {
    const integer = Math.round(x)
    return Number.isInteger(x) && integer >= 0 ? Math.exp(-parameters.lambda) * parameters.lambda ** integer / factorial(integer) : 0
  }
  if (id === 'exponential') return x < 0 ? 0 : parameters.lambda * Math.exp(-parameters.lambda * x)
  return x <= 0 ? 0 : x ** (parameters.alpha - 1) * Math.exp(-x / parameters.theta) / (gammaFunction(parameters.alpha) * parameters.theta ** parameters.alpha)
}

export function distributionCdf(id: DistributionId, x: number, rawParameters: Record<string, number>) {
  const definition = DISTRIBUTIONS.find((distribution) => distribution.id === id) || DISTRIBUTIONS[0]
  const parameters = clampParameters(definition, rawParameters)
  if (id === 'normal') return normalCdf((x - parameters.mu) / parameters.sigma)
  if (id === 'binomial') {
    const maximum = Math.min(parameters.n, Math.floor(x))
    if (maximum < 0) return 0
    let cumulative = 0
    for (let value = 0; value <= maximum; value += 1) cumulative += combination(parameters.n, value) * parameters.p ** value * (1 - parameters.p) ** (parameters.n - value)
    return Math.min(1, cumulative)
  }
  if (id === 'poisson') {
    if (x < 0) return 0
    let cumulative = 0
    for (let value = 0; value <= Math.floor(x); value += 1) cumulative += Math.exp(-parameters.lambda) * parameters.lambda ** value / factorial(value)
    return Math.min(1, cumulative)
  }
  if (id === 'exponential') return x < 0 ? 0 : 1 - Math.exp(-parameters.lambda * x)
  return regularizedGamma(parameters.alpha, x / parameters.theta)
}

export function distributionMetricPoints(id: DistributionId, parameters: Record<string, number>, metric: DistributionMetric) {
  const points = distributionPoints(id, parameters)
  if (metric === 'density') return points
  return points.map((point) => {
    const cumulative = distributionCdf(id, point.x, parameters)
    if (metric === 'cdf') return { x: point.x, y: cumulative }
    const survival = Math.max(0, 1 - cumulative)
    if (metric === 'survival') return { x: point.x, y: survival }
    return { x: point.x, y: survival <= 1e-12 ? 0 : distributionDensity(id, point.x, parameters) / survival }
  })
}

export function intervalProbability(id: DistributionId, lower: number, upper: number, parameters: Record<string, number>) {
  if (upper < lower) return 0
  const definition = DISTRIBUTIONS.find((distribution) => distribution.id === id) || DISTRIBUTIONS[0]
  const lowerBoundary = definition.family === 'Discrete' ? Math.ceil(lower) - 1 : lower
  return Math.max(0, Math.min(1, distributionCdf(id, upper, parameters) - distributionCdf(id, lowerBoundary, parameters)))
}

export function distributionQuantile(id: DistributionId, probability: number, parameters: Record<string, number>) {
  const target = Math.min(0.999999, Math.max(0.000001, probability))
  const definition = DISTRIBUTIONS.find((distribution) => distribution.id === id) || DISTRIBUTIONS[0]
  const points = distributionPoints(id, parameters)
  let lower = points[0].x
  let upper = points[points.length - 1].x
  if (definition.family === 'Discrete') {
    for (let value = Math.ceil(lower); value <= Math.ceil(upper * 3 + 20); value += 1) {
      if (distributionCdf(id, value, parameters) >= target) return value
    }
    return Math.ceil(upper)
  }
  for (let index = 0; index < 80; index += 1) {
    const midpoint = (lower + upper) / 2
    if (distributionCdf(id, midpoint, parameters) < target) lower = midpoint
    else upper = midpoint
  }
  return (lower + upper) / 2
}

export function simulateDistribution(id: DistributionId, parameters: Record<string, number>, count: number) {
  return Array.from({ length: Math.min(1000, Math.max(1, Math.round(count))) }, () => distributionQuantile(id, Math.random(), parameters))
}