export type DistributionFamily = 'Discrete' | 'Continuous'
export type DistributionMetric = 'density' | 'cdf' | 'survival' | 'hazard'
export type DistributionId =
  | 'bernoulli' | 'binomial' | 'poisson' | 'negative-binomial-1' | 'negative-binomial-2' | 'geometric' | 'discrete-uniform'
  | 'standard-normal' | 'normal' | 'exponential' | 'gamma' | 'chi-square' | 'continuous-uniform' | 'beta' | 'lognormal'
  | 'pareto-2' | 'pareto-3' | 'weibull' | 'burr' | 'student-t' | 'f'

export interface DistributionParameter {
  key: string
  label: string
  symbol: string
  min: number
  max: number
  step: number
  defaultValue: number
  description: string
}

export interface DistributionPoint { x: number; y: number }
export interface DistributionSummary {
  mean: number | null
  variance: number | null
  standardDeviation: number | null
  meanNote?: string
  varianceNote?: string
  support: string
}

type Parameters = Record<string, number>
type Domain = [number, number]

export interface DistributionDefinition {
  id: DistributionId
  name: string
  family: DistributionFamily
  support: string
  parameters: DistributionParameter[]
  latex: { density: string; cdf: string; mean: string; variance: string; moment?: string }
  intuition: string
  actuarialUse: string
  commonMistake: string
  syllabus: string[]
  related: string
  reference: string
  density: (x: number, parameters: Parameters) => number
  cdf: (x: number, parameters: Parameters) => number
  mean: (parameters: Parameters) => number | null
  variance: (parameters: Parameters) => number | null
  momentNotes?: (parameters: Parameters) => { mean?: string; variance?: string }
  domain: (parameters: Parameters) => Domain
  plotYMax?: number
  normalize?: (parameters: Parameters) => Parameters
}

const IFOA = 'Current IFoA Formulae and Tables statistical distributions; parameterisation stated explicitly here.'
const INFERENCE = 'Current IFoA CS1 statistical inference material and Formulae and Tables statistical tables.'
const parameter = (key: string, label: string, symbol: string, min: number, max: number, step: number, defaultValue: number, description: string): DistributionParameter =>
  ({ key, label, symbol, min, max, step, defaultValue, description })
const clamp01 = (value: number) => Math.max(0, Math.min(1, value))

function logGamma(value: number): number {
  const coefficients = [676.5203681218851, -1259.1392167224028, 771.3234287776531, -176.6150291621406, 12.507343278686905, -0.13857109526572012, 9.984369578019572e-6, 1.5056327351493116e-7]
  if (value < 0.5) return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * value)) - logGamma(1 - value)
  const adjusted = value - 1
  let series = 0.9999999999998099
  coefficients.forEach((coefficient, index) => { series += coefficient / (adjusted + index + 1) })
  const shifted = adjusted + coefficients.length - 0.5
  return 0.5 * Math.log(2 * Math.PI) + (adjusted + 0.5) * Math.log(shifted) - shifted + Math.log(series)
}

const gamma = (value: number) => Math.exp(logGamma(value))
const beta = (left: number, right: number) => Math.exp(logGamma(left) + logGamma(right) - logGamma(left + right))
const logChoose = (n: number, k: number) => k < 0 || k > n ? -Infinity : logGamma(n + 1) - logGamma(k + 1) - logGamma(n - k + 1)

function normalCdf(value: number) {
  const sign = value < 0 ? -1 : 1
  const scaled = Math.abs(value) / Math.sqrt(2)
  const t = 1 / (1 + 0.3275911 * scaled)
  const approximation = 1 - (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t) * Math.exp(-scaled * scaled)
  return 0.5 * (1 + sign * approximation)
}

function regularizedGamma(shape: number, value: number) {
  if (value <= 0) return 0
  if (value < shape + 1) {
    let term = 1 / shape
    let sum = term
    for (let index = 1; index < 200; index += 1) {
      term *= value / (shape + index)
      sum += term
      if (Math.abs(term) < Math.abs(sum) * 1e-14) break
    }
    return clamp01(sum * Math.exp(-value + shape * Math.log(value) - logGamma(shape)))
  }
  let b = value + 1 - shape
  let c = 1e300
  let d = 1 / b
  let fraction = d
  for (let index = 1; index < 200; index += 1) {
    const coefficient = -index * (index - shape)
    b += 2
    d = coefficient * d + b
    if (Math.abs(d) < 1e-300) d = 1e-300
    c = b + coefficient / c
    if (Math.abs(c) < 1e-300) c = 1e-300
    d = 1 / d
    const delta = d * c
    fraction *= delta
    if (Math.abs(delta - 1) < 1e-14) break
  }
  return clamp01(1 - Math.exp(-value + shape * Math.log(value) - logGamma(shape)) * fraction)
}

function betaFraction(left: number, right: number, value: number) {
  const tiny = 1e-300
  const sum = left + right
  let c = 1
  let d = 1 - sum * value / (left + 1)
  if (Math.abs(d) < tiny) d = tiny
  d = 1 / d
  let result = d
  for (let iteration = 1; iteration <= 200; iteration += 1) {
    const doubled = 2 * iteration
    let coefficient = iteration * (right - iteration) * value / ((left - 1 + doubled) * (left + doubled))
    d = 1 + coefficient * d; if (Math.abs(d) < tiny) d = tiny
    c = 1 + coefficient / c; if (Math.abs(c) < tiny) c = tiny
    d = 1 / d; result *= d * c
    coefficient = -(left + iteration) * (sum + iteration) * value / ((left + doubled) * (left + 1 + doubled))
    d = 1 + coefficient * d; if (Math.abs(d) < tiny) d = tiny
    c = 1 + coefficient / c; if (Math.abs(c) < tiny) c = tiny
    d = 1 / d
    const delta = d * c
    result *= delta
    if (Math.abs(delta - 1) < 3e-14) break
  }
  return result
}

function regularizedBeta(value: number, left: number, right: number) {
  if (value <= 0) return 0
  if (value >= 1) return 1
  const front = Math.exp(logGamma(left + right) - logGamma(left) - logGamma(right) + left * Math.log(value) + right * Math.log1p(-value))
  return clamp01(value < (left + 1) / (left + right + 2)
    ? front * betaFraction(left, right, value) / left
    : 1 - front * betaFraction(right, left, 1 - value) / right)
}

function discreteCdf(x: number, lower: number, pmf: (value: number) => number) {
  if (x < lower) return 0
  let total = 0
  for (let value = lower; value <= Math.floor(x) && value < lower + 5000; value += 1) total += pmf(value)
  return clamp01(total)
}

const binomialPmf = (x: number, n: number, p: number) => Number.isInteger(x) && x >= 0 && x <= n ? Math.exp(logChoose(n, x) + x * Math.log(p) + (n - x) * Math.log1p(-p)) : 0
const poissonPmf = (x: number, rate: number) => Number.isInteger(x) && x >= 0 ? Math.exp(-rate + x * Math.log(rate) - logGamma(x + 1)) : 0
const negativeBinomialPmf = (failures: number, successes: number, p: number) => Number.isInteger(failures) && failures >= 0 ? Math.exp(logChoose(failures + successes - 1, failures) + successes * Math.log(p) + failures * Math.log1p(-p)) : 0
const orderedPair = (lower: string, upper: string, gap: number) => (values: Parameters) => values[upper] <= values[lower] ? { ...values, [upper]: values[lower] + gap } : values

export const DISTRIBUTIONS: DistributionDefinition[] = [
  {
    id: 'bernoulli', name: 'Bernoulli', family: 'Discrete', support: '\\{0,1\\}', plotYMax: 1,
    parameters: [parameter('p', 'Event probability', 'p', 0.01, 0.99, 0.01, 0.35, 'Probability that the single event occurs.')],
    latex: { density: 'P(X=x)=p^x(1-p)^{1-x},\\quad x\\in\\{0,1\\}', cdf: 'F(x)=0,\\ 1-p,\\ 1\\text{ across }x<0,\\ 0\\le x<1,\\ x\\ge1', mean: 'E[X]=p', variance: '\\operatorname{Var}(X)=p(1-p)', moment: 'G_X(s)=1-p+ps' },
    intuition: 'A single claim/no-claim or survival/death indicator.', actuarialUse: 'Individual claim, survival and default indicators; the building block for portfolio event counts.', commonMistake: 'Treating dependent policy outcomes as independent indicators.', syllabus: ['Actuarial Statistics', 'Risk Modelling'], related: 'A Binomial distribution with n = 1.', reference: IFOA,
    density: (x, p) => x === 0 ? 1 - p.p : x === 1 ? p.p : 0, cdf: (x, p) => x < 0 ? 0 : x < 1 ? 1 - p.p : 1, mean: (p) => p.p, variance: (p) => p.p * (1 - p.p), domain: () => [-0.5, 1.5]
  },
  {
    id: 'binomial', name: 'Binomial', family: 'Discrete', support: '\\{0,1,\\ldots,n\\}', plotYMax: 1,
    parameters: [parameter('n', 'Trials', 'n', 1, 100, 1, 20, 'Number of independent risks or trials.'), parameter('p', 'Event probability', 'p', 0.01, 0.99, 0.01, 0.25, 'Moves the mass toward larger counts as p rises.')],
    latex: { density: 'P(X=x)={n\\choose x}p^x(1-p)^{n-x}', cdf: 'F(x)=\\sum_{j=0}^{\\lfloor x\\rfloor}{n\\choose j}p^j(1-p)^{n-j}', mean: 'E[X]=np', variance: '\\operatorname{Var}(X)=np(1-p)', moment: 'G_X(s)=(1-p+ps)^n' },
    intuition: 'Counts how many of n independent policies experience an event.', actuarialUse: 'Number of claims, deaths or defaults among n homogeneous independent risks.', commonMistake: 'Ignoring dependence or heterogeneous event probabilities.', syllabus: ['Actuarial Statistics', 'Risk Modelling'], related: 'Sum of independent Bernoulli indicators.', reference: IFOA,
    density: (x, p) => binomialPmf(x, p.n, p.p), cdf: (x, p) => discreteCdf(x, 0, (value) => binomialPmf(value, p.n, p.p)), mean: (p) => p.n * p.p, variance: (p) => p.n * p.p * (1 - p.p), domain: (p) => [-0.5, p.n + 0.5]
  },
  {
    id: 'poisson', name: 'Poisson', family: 'Discrete', support: '\\{0,1,2,\\ldots\\}', plotYMax: 1,
    parameters: [parameter('lambda', 'Expected count', '\\lambda', 0.1, 30, 0.1, 4, 'Expected event count in the interval; also controls spread.')],
    latex: { density: 'P(X=x)=e^{-\\lambda}\\frac{\\lambda^x}{x!}', cdf: 'F(x)=e^{-\\lambda}\\sum_{j=0}^{\\lfloor x\\rfloor}\\frac{\\lambda^j}{j!}', mean: 'E[X]=\\lambda', variance: '\\operatorname{Var}(X)=\\lambda', moment: 'G_X(s)=e^{\\lambda(s-1)}' },
    intuition: 'Models event counts over fixed exposure at a stable average rate.', actuarialUse: 'Claim frequency. For compound Poisson S=\\sum_{i=1}^{N}X_i, E[S]=\\lambda E[X] and Var(S)=\\lambda E[X^2].', commonMistake: 'Ignoring overdispersion when observed variance exceeds the mean.', syllabus: ['Actuarial Statistics', 'Risk Modelling', 'General Insurance'], related: 'Poisson counts pair with Exponential inter-arrival times.', reference: IFOA,
    density: (x, p) => poissonPmf(x, p.lambda), cdf: (x, p) => discreteCdf(x, 0, (value) => poissonPmf(value, p.lambda)), mean: (p) => p.lambda, variance: (p) => p.lambda, domain: (p) => [-0.5, Math.ceil(p.lambda + 5 * Math.sqrt(p.lambda)) + 0.5]
  },
  {
    id: 'negative-binomial-1', name: 'Negative Binomial - Type 1', family: 'Discrete', support: '\\{0,1,2,\\ldots\\}', plotYMax: 1,
    parameters: [parameter('r', 'Required successes', 'r', 1, 20, 1, 4, 'Target number of successes.'), parameter('p', 'Success probability', 'p', 0.05, 0.95, 0.01, 0.4, 'Higher p means fewer failures before the target.')],
    latex: { density: 'P(X=x)={x+r-1\\choose x}p^r(1-p)^x', cdf: 'F(x)=\\sum_{j=0}^{\\lfloor x\\rfloor}{j+r-1\\choose j}p^r(1-p)^j', mean: 'E[X]=r\\frac{1-p}{p}', variance: '\\operatorname{Var}(X)=r\\frac{1-p}{p^2}', moment: 'G_X(s)=\\left(\\frac{p}{1-(1-p)s}\\right)^r' },
    intuition: 'Counts failures before the r-th success.', actuarialUse: 'Overdispersed claim frequency when Poisson is too restrictive; also arises from Poisson-Gamma mixing.', commonMistake: 'Confusing failures counted with total trials in Type 2.', syllabus: ['Actuarial Statistics', 'Risk Modelling', 'General Insurance'], related: 'Geometric Type 1 when r = 1; Type 2 is X + r.', reference: IFOA,
    density: (x, p) => negativeBinomialPmf(x, p.r, p.p), cdf: (x, p) => discreteCdf(x, 0, (value) => negativeBinomialPmf(value, p.r, p.p)), mean: (p) => p.r * (1 - p.p) / p.p, variance: (p) => p.r * (1 - p.p) / p.p ** 2, domain: (p) => [-0.5, Math.ceil(p.r * (1 - p.p) / p.p + 5 * Math.sqrt(p.r * (1 - p.p) / p.p ** 2)) + 0.5]
  },
  {
    id: 'negative-binomial-2', name: 'Negative Binomial - Type 2', family: 'Discrete', support: '\\{r,r+1,r+2,\\ldots\\}', plotYMax: 1,
    parameters: [parameter('r', 'Required successes', 'r', 1, 20, 1, 4, 'Target number of successes.'), parameter('p', 'Success probability', 'p', 0.05, 0.95, 0.01, 0.4, 'Higher p means fewer total trials.')],
    latex: { density: 'P(X=x)={x-1\\choose r-1}p^r(1-p)^{x-r}', cdf: 'F(x)=\\sum_{j=r}^{\\lfloor x\\rfloor}{j-1\\choose r-1}p^r(1-p)^{j-r}', mean: 'E[X]=\\frac{r}{p}', variance: '\\operatorname{Var}(X)=r\\frac{1-p}{p^2}' },
    intuition: 'Counts total trials required to obtain r successes.', actuarialUse: 'Discrete waiting-time interpretation and an alternative convention for overdispersed counts.', commonMistake: 'Using the Type 1 mean without adding the r successes.', syllabus: ['Actuarial Statistics', 'Risk Modelling'], related: 'Type 2 equals Type 1 plus r.', reference: IFOA,
    density: (x, p) => negativeBinomialPmf(x - p.r, p.r, p.p), cdf: (x, p) => discreteCdf(x, p.r, (value) => negativeBinomialPmf(value - p.r, p.r, p.p)), mean: (p) => p.r / p.p, variance: (p) => p.r * (1 - p.p) / p.p ** 2, domain: (p) => [p.r - 0.5, Math.ceil(p.r / p.p + 5 * Math.sqrt(p.r * (1 - p.p) / p.p ** 2)) + 0.5]
  },
  {
    id: 'geometric', name: 'Geometric', family: 'Discrete', support: '\\{1,2,3,\\ldots\\}', plotYMax: 1,
    parameters: [parameter('p', 'Success probability', 'p', 0.05, 0.95, 0.01, 0.3, 'Higher p means a shorter wait to first success.')],
    latex: { density: 'P(X=x)=p(1-p)^{x-1}', cdf: 'F(x)=1-(1-p)^{\\lfloor x\\rfloor}', mean: 'E[X]=\\frac1p', variance: '\\operatorname{Var}(X)=\\frac{1-p}{p^2}', moment: 'G_X(s)=\\frac{ps}{1-(1-p)s}' },
    intuition: 'Counts trials up to and including the first success.', actuarialUse: 'Discrete waiting times such as contacts until conversion or periods until an event.', commonMistake: 'Some texts count failures from zero; this registry counts trials from one.', syllabus: ['Actuarial Statistics', 'Risk Modelling'], related: 'Negative Binomial Type 2 with r = 1.', reference: IFOA,
    density: (x, p) => Number.isInteger(x) && x >= 1 ? p.p * (1 - p.p) ** (x - 1) : 0, cdf: (x, p) => x < 1 ? 0 : 1 - (1 - p.p) ** Math.floor(x), mean: (p) => 1 / p.p, variance: (p) => (1 - p.p) / p.p ** 2, domain: (p) => [0.5, Math.ceil(1 / p.p + 5 * Math.sqrt((1 - p.p) / p.p ** 2)) + 0.5]
  },
  {
    id: 'discrete-uniform', name: 'Discrete Uniform', family: 'Discrete', support: '\\{a,a+1,\\ldots,b\\}', plotYMax: 1,
    parameters: [parameter('a', 'Lower integer', 'a', -10, 5, 1, 1, 'Moves the lower support boundary.'), parameter('b', 'Upper integer', 'b', -5, 15, 1, 6, 'Moves the upper support boundary; b must exceed a.')], normalize: orderedPair('a', 'b', 1),
    latex: { density: 'P(X=x)=\\frac1{b-a+1},\\quad x=a,\\ldots,b', cdf: 'F(x)=\\frac{\\lfloor x\\rfloor-a+1}{b-a+1}\\text{ on the support}', mean: 'E[X]=\\frac{a+b}{2}', variance: '\\operatorname{Var}(X)=\\frac{(b-a+1)^2-1}{12}' },
    intuition: 'Assigns equal probability to each integer in a finite range.', actuarialUse: 'Simple discrete simulation, randomized allocation and model-checking examples.', commonMistake: 'Forgetting that both endpoints are included.', syllabus: ['Actuarial Statistics', 'Simulation'], related: 'Discrete analogue of Continuous Uniform.', reference: IFOA,
    density: (x, p) => Number.isInteger(x) && x >= p.a && x <= p.b ? 1 / (p.b - p.a + 1) : 0, cdf: (x, p) => x < p.a ? 0 : x >= p.b ? 1 : (Math.floor(x) - p.a + 1) / (p.b - p.a + 1), mean: (p) => (p.a + p.b) / 2, variance: (p) => ((p.b - p.a + 1) ** 2 - 1) / 12, domain: (p) => [p.a - 0.5, p.b + 0.5]
  },
  {
    id: 'standard-normal', name: 'Standard Normal', family: 'Continuous', support: '\\mathbb{R}', plotYMax: 0.45, parameters: [],
    latex: { density: '\\phi(x)=\\frac1{\\sqrt{2\\pi}}e^{-x^2/2}', cdf: '\\Phi(x)=\\int_{-\\infty}^{x}\\phi(t)\\,dt', mean: 'E[X]=0', variance: '\\operatorname{Var}(X)=1', moment: 'M_X(t)=e^{t^2/2}' },
    intuition: 'The reference bell curve used to standardise Normal variables.', actuarialUse: 'Normal tables, confidence intervals, hypothesis tests and central-limit approximations.', commonMistake: 'Using standard Normal probabilities without standardising first.', syllabus: ['Actuarial Statistics', 'Statistical Inference'], related: 'If X is Normal, (X-mu)/sigma is Standard Normal.', reference: IFOA,
    density: (x) => Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI), cdf: (x) => normalCdf(x), mean: () => 0, variance: () => 1, domain: () => [-4, 4]
  },
  {
    id: 'normal', name: 'Normal', family: 'Continuous', support: '\\mathbb{R}', plotYMax: 2.1,
    parameters: [parameter('mu', 'Location', '\\mu', -8, 8, 0.25, 0, 'Moves the centre without changing shape.'), parameter('sigma', 'Standard deviation', '\\sigma', 0.2, 4, 0.1, 1, 'Controls spread; smaller sigma makes a taller, narrower curve.')],
    latex: { density: 'f(x)=\\frac1{\\sigma\\sqrt{2\\pi}}e^{-(x-\\mu)^2/(2\\sigma^2)}', cdf: 'F(x)=\\Phi\\!\\left(\\frac{x-\\mu}{\\sigma}\\right)', mean: 'E[X]=\\mu', variance: '\\operatorname{Var}(X)=\\sigma^2', moment: 'M_X(t)=e^{\\mu t+\\sigma^2t^2/2}' },
    intuition: 'A symmetric model for aggregate effects built from many small contributions.', actuarialUse: 'Sampling distributions, central-limit approximations, aggregate quantities, regression and inference.', commonMistake: 'Using it for positive, strongly skewed losses without checking tail fit.', syllabus: ['Actuarial Statistics', 'Financial Modelling'], related: 'Standardises to Standard Normal.', reference: IFOA,
    density: (x, p) => Math.exp(-((x - p.mu) ** 2) / (2 * p.sigma ** 2)) / (p.sigma * Math.sqrt(2 * Math.PI)), cdf: (x, p) => normalCdf((x - p.mu) / p.sigma), mean: (p) => p.mu, variance: (p) => p.sigma ** 2, domain: () => [-12, 12]
  },
  {
    id: 'exponential', name: 'Exponential', family: 'Continuous', support: 'x\\ge0', plotYMax: 5.2,
    parameters: [parameter('lambda', 'Rate', '\\lambda', 0.1, 5, 0.1, 1, 'Event rate. A larger lambda means shorter typical waiting times.')],
    latex: { density: 'f(x)=\\lambda e^{-\\lambda x},\\quad x\\ge0', cdf: 'F(x)=1-e^{-\\lambda x},\\quad x\\ge0', mean: 'E[X]=\\frac1\\lambda', variance: '\\operatorname{Var}(X)=\\frac1{\\lambda^2}', moment: 'P(X>s+t\\mid X>s)=P(X>t)' },
    intuition: 'A memoryless waiting-time model with constant event rate.', actuarialUse: 'Inter-arrival times in a Poisson process, constant-hazard survival and simple positive severity models.', commonMistake: 'Confusing rate lambda with scale 1/lambda. This slider uses rate.', syllabus: ['Actuarial Statistics', 'Risk Modelling', 'Survival Analysis'], related: 'Gamma with shape 1; Weibull with shape 1.', reference: IFOA,
    density: (x, p) => x < 0 ? 0 : p.lambda * Math.exp(-p.lambda * x), cdf: (x, p) => x < 0 ? 0 : 1 - Math.exp(-p.lambda * x), mean: (p) => 1 / p.lambda, variance: (p) => 1 / p.lambda ** 2, domain: () => [0, 12]
  },
  {
    id: 'gamma', name: 'Gamma', family: 'Continuous', support: 'x>0', plotYMax: 6,
    parameters: [parameter('alpha', 'Shape', '\\alpha', 0.5, 15, 0.25, 3, 'Controls skewness and event-count interpretation.'), parameter('lambda', 'Rate', '\\lambda', 0.2, 5, 0.1, 1, 'Rate, not scale; higher values compress waiting times.')],
    latex: { density: 'f(x)=\\frac{\\lambda^\\alpha}{\\Gamma(\\alpha)}x^{\\alpha-1}e^{-\\lambda x}', cdf: 'F(x)=P(\\alpha,\\lambda x)', mean: 'E[X]=\\frac{\\alpha}{\\lambda}', variance: '\\operatorname{Var}(X)=\\frac{\\alpha}{\\lambda^2}', moment: 'M_X(t)=\\left(\\frac{\\lambda}{\\lambda-t}\\right)^\\alpha' },
    intuition: 'A flexible positive model; shape changes skewness while rate changes scale.', actuarialUse: 'Positive severities, waiting time to multiple Poisson events and Gamma GLMs for insurance costs.', commonMistake: 'Mixing rate and scale. Lambda is rate throughout.', syllabus: ['Actuarial Statistics', 'Risk Modelling', 'General Insurance'], related: 'Exponential when alpha = 1; Chi-square when alpha=nu/2 and lambda=1/2.', reference: IFOA,
    density: (x, p) => x <= 0 ? 0 : Math.exp(p.alpha * Math.log(p.lambda) + (p.alpha - 1) * Math.log(x) - p.lambda * x - logGamma(p.alpha)), cdf: (x, p) => x <= 0 ? 0 : regularizedGamma(p.alpha, p.lambda * x), mean: (p) => p.alpha / p.lambda, variance: (p) => p.alpha / p.lambda ** 2, domain: () => [0.001, 35]
  },
  {
    id: 'chi-square', name: 'Chi-square', family: 'Continuous', support: 'x>0', plotYMax: 4,
    parameters: [parameter('nu', 'Degrees of freedom', '\\nu', 1, 30, 1, 5, 'Higher degrees move mass right and reduce skewness.')],
    latex: { density: 'f(x)=\\frac{x^{\\nu/2-1}e^{-x/2}}{2^{\\nu/2}\\Gamma(\\nu/2)}', cdf: 'F(x)=P\\!\\left(\\frac\\nu2,\\frac x2\\right)', mean: 'E[X]=\\nu', variance: '\\operatorname{Var}(X)=2\\nu' },
    intuition: 'A right-skewed inference distribution indexed by degrees of freedom.', actuarialUse: 'Variance inference, goodness-of-fit tests and likelihood-based statistical work.', commonMistake: 'Using Normal critical values for a Chi-square statistic.', syllabus: ['Actuarial Statistics', 'Statistical Inference'], related: 'Gamma with shape nu/2 and rate 1/2.', reference: IFOA,
    density: (x, p) => x <= 0 ? 0 : Math.exp((p.nu / 2 - 1) * Math.log(x) - x / 2 - (p.nu / 2) * Math.log(2) - logGamma(p.nu / 2)), cdf: (x, p) => x <= 0 ? 0 : regularizedGamma(p.nu / 2, x / 2), mean: (p) => p.nu, variance: (p) => 2 * p.nu, domain: () => [0.001, 55]
  },
  {
    id: 'continuous-uniform', name: 'Continuous Uniform', family: 'Continuous', support: 'a\\le x\\le b', plotYMax: 2.5,
    parameters: [parameter('a', 'Lower bound', 'a', -8, 4, 0.25, 0, 'Moves the lower edge.'), parameter('b', 'Upper bound', 'b', -4, 8, 0.25, 4, 'Moves the upper edge; b must exceed a.')], normalize: orderedPair('a', 'b', 0.25),
    latex: { density: 'f(x)=\\frac1{b-a},\\quad a\\le x\\le b', cdf: 'F(x)=\\frac{x-a}{b-a},\\quad a<x<b', mean: 'E[X]=\\frac{a+b}{2}', variance: '\\operatorname{Var}(X)=\\frac{(b-a)^2}{12}' },
    intuition: 'Every value in a finite interval has the same density.', actuarialUse: 'Uniform random-number generation and inverse-transform simulation.', commonMistake: 'Confusing equal density with positive probability at individual points.', syllabus: ['Actuarial Statistics', 'Simulation'], related: 'Starting point for inverse-CDF simulation.', reference: IFOA,
    density: (x, p) => x >= p.a && x <= p.b ? 1 / (p.b - p.a) : 0, cdf: (x, p) => x <= p.a ? 0 : x >= p.b ? 1 : (x - p.a) / (p.b - p.a), mean: (p) => (p.a + p.b) / 2, variance: (p) => (p.b - p.a) ** 2 / 12, domain: () => [-9, 9]
  },
  {
    id: 'beta', name: 'Beta', family: 'Continuous', support: '0<x<1', plotYMax: 50,
    parameters: [parameter('alpha', 'First shape', '\\alpha', 0.2, 10, 0.1, 2, 'Controls behaviour near zero.'), parameter('beta', 'Second shape', '\\beta', 0.2, 10, 0.1, 5, 'Controls behaviour near one.')],
    latex: { density: 'f(x)=\\frac{x^{\\alpha-1}(1-x)^{\\beta-1}}{B(\\alpha,\\beta)}', cdf: 'F(x)=I_x(\\alpha,\\beta)', mean: 'E[X]=\\frac\\alpha{\\alpha+\\beta}', variance: '\\operatorname{Var}(X)=\\frac{\\alpha\\beta}{(\\alpha+\\beta)^2(\\alpha+\\beta+1)}' },
    intuition: 'A model on (0,1): U-shaped, flat, skewed or concentrated depending on both shapes.', actuarialUse: 'Probabilities, proportions and Bayesian uncertainty about event probabilities.', commonMistake: 'Assuming both shapes only change location; they also control boundaries and concentration.', syllabus: ['Actuarial Statistics', 'Bayesian Statistics'], related: 'Conjugate prior for Bernoulli and Binomial probabilities.', reference: IFOA,
    density: (x, p) => x <= 0 || x >= 1 ? 0 : Math.exp((p.alpha - 1) * Math.log(x) + (p.beta - 1) * Math.log1p(-x)) / beta(p.alpha, p.beta), cdf: (x, p) => x <= 0 ? 0 : x >= 1 ? 1 : regularizedBeta(x, p.alpha, p.beta), mean: (p) => p.alpha / (p.alpha + p.beta), variance: (p) => p.alpha * p.beta / ((p.alpha + p.beta) ** 2 * (p.alpha + p.beta + 1)), domain: () => [0.001, 0.999]
  },
  {
    id: 'lognormal', name: 'Lognormal', family: 'Continuous', support: 'x>0', plotYMax: 4,
    parameters: [parameter('mu', 'Log-location', '\\mu', -2, 2, 0.1, 0, 'Moves the distribution multiplicatively.'), parameter('sigma', 'Log-standard deviation', '\\sigma', 0.2, 2, 0.1, 0.7, 'Controls right-skewness and tail spread.')],
    latex: { density: 'f(x)=\\frac1{x\\sigma\\sqrt{2\\pi}}e^{-(\\log x-\\mu)^2/(2\\sigma^2)}', cdf: 'F(x)=\\Phi\\!\\left(\\frac{\\log x-\\mu}{\\sigma}\\right)', mean: 'E[X]=e^{\\mu+\\sigma^2/2}', variance: '\\operatorname{Var}(X)=(e^{\\sigma^2}-1)e^{2\\mu+\\sigma^2}' },
    intuition: 'The exponential of a Normal variable, producing positive right-skewed outcomes.', actuarialUse: 'Positive claim severities, multiplicative loss drivers and financial modelling.', commonMistake: 'Interpreting mu and sigma as mean and SD on the original scale.', syllabus: ['Actuarial Statistics', 'Loss Models', 'Financial Modelling'], related: 'log(X) is Normal with parameters mu and sigma.', reference: IFOA,
    density: (x, p) => x <= 0 ? 0 : Math.exp(-((Math.log(x) - p.mu) ** 2) / (2 * p.sigma ** 2)) / (x * p.sigma * Math.sqrt(2 * Math.PI)), cdf: (x, p) => x <= 0 ? 0 : normalCdf((Math.log(x) - p.mu) / p.sigma), mean: (p) => Math.exp(p.mu + p.sigma ** 2 / 2), variance: (p) => (Math.exp(p.sigma ** 2) - 1) * Math.exp(2 * p.mu + p.sigma ** 2), domain: () => [0.001, 35]
  },
  {
    id: 'pareto-2', name: 'Pareto - two-parameter', family: 'Continuous', support: 'x>0', plotYMax: 12,
    parameters: [parameter('alpha', 'Tail shape', '\\alpha', 0.5, 6, 0.1, 2.5, 'Smaller alpha produces a heavier tail.'), parameter('theta', 'Scale', '\\theta', 0.5, 8, 0.1, 2, 'Sets the monetary scale.')],
    latex: { density: 'f(x)=\\frac{\\alpha\\theta^\\alpha}{(x+\\theta)^{\\alpha+1}}', cdf: 'F(x)=1-\\left(\\frac\\theta{x+\\theta}\\right)^\\alpha', mean: 'E[X]=\\frac\\theta{\\alpha-1},\\quad\\alpha>1', variance: '\\operatorname{Var}(X)=\\frac{\\alpha\\theta^2}{(\\alpha-1)^2(\\alpha-2)},\\quad\\alpha>2' },
    intuition: 'A heavy-tailed positive severity model in actuarial Lomax form.', actuarialUse: 'Large insurance losses, extreme claims and capital-sensitive severity modelling.', commonMistake: 'Reporting finite moments below their existence thresholds.', syllabus: ['Risk Modelling', 'Loss Models', 'General Insurance'], related: 'The three-parameter form adds a location threshold.', reference: IFOA,
    density: (x, p) => x < 0 ? 0 : p.alpha * p.theta ** p.alpha / (x + p.theta) ** (p.alpha + 1), cdf: (x, p) => x < 0 ? 0 : 1 - (p.theta / (x + p.theta)) ** p.alpha, mean: (p) => p.alpha > 1 ? p.theta / (p.alpha - 1) : null, variance: (p) => p.alpha > 2 ? p.alpha * p.theta ** 2 / ((p.alpha - 1) ** 2 * (p.alpha - 2)) : null, momentNotes: (p) => ({ mean: p.alpha <= 1 ? 'Undefined for alpha <= 1' : undefined, variance: p.alpha <= 2 ? 'Undefined for alpha <= 2' : undefined }), domain: () => [0, 35]
  },
  {
    id: 'pareto-3', name: 'Pareto - three-parameter', family: 'Continuous', support: 'x>\\gamma', plotYMax: 12,
    parameters: [parameter('alpha', 'Tail shape', '\\alpha', 0.5, 6, 0.1, 2.5, 'Smaller alpha produces a heavier tail.'), parameter('theta', 'Scale', '\\theta', 0.5, 8, 0.1, 2, 'Sets tail scale.'), parameter('gamma', 'Location', '\\gamma', 0, 10, 0.25, 3, 'Shifts the loss threshold.')],
    latex: { density: 'f(x)=\\frac{\\alpha\\theta^\\alpha}{(x-\\gamma+\\theta)^{\\alpha+1}},\\quad x>\\gamma', cdf: 'F(x)=1-\\left(\\frac\\theta{x-\\gamma+\\theta}\\right)^\\alpha', mean: 'E[X]=\\gamma+\\frac\\theta{\\alpha-1},\\quad\\alpha>1', variance: '\\operatorname{Var}(X)=\\frac{\\alpha\\theta^2}{(\\alpha-1)^2(\\alpha-2)},\\quad\\alpha>2' },
    intuition: 'A shifted heavy-tail model with separate threshold, scale and shape.', actuarialUse: 'Large-loss severity above a threshold when zero is not the natural origin.', commonMistake: 'Treating location gamma as scale.', syllabus: ['Risk Modelling', 'Loss Models', 'General Insurance'], related: 'X-gamma follows the two-parameter actuarial Pareto form.', reference: IFOA,
    density: (x, p) => x < p.gamma ? 0 : p.alpha * p.theta ** p.alpha / (x - p.gamma + p.theta) ** (p.alpha + 1), cdf: (x, p) => x < p.gamma ? 0 : 1 - (p.theta / (x - p.gamma + p.theta)) ** p.alpha, mean: (p) => p.alpha > 1 ? p.gamma + p.theta / (p.alpha - 1) : null, variance: (p) => p.alpha > 2 ? p.alpha * p.theta ** 2 / ((p.alpha - 1) ** 2 * (p.alpha - 2)) : null, momentNotes: (p) => ({ mean: p.alpha <= 1 ? 'Undefined for alpha <= 1' : undefined, variance: p.alpha <= 2 ? 'Undefined for alpha <= 2' : undefined }), domain: () => [0, 45]
  },
  {
    id: 'weibull', name: 'Weibull', family: 'Continuous', support: 'x>0', plotYMax: 8,
    parameters: [parameter('k', 'Shape', 'k', 0.5, 5, 0.1, 1.5, 'Changes density shape and implied hazard.'), parameter('lambda', 'Scale', '\\lambda', 0.5, 8, 0.1, 2, 'Sets lifetime scale; lambda is scale here.')],
    latex: { density: 'f(x)=\\frac{k}{\\lambda}\\left(\\frac{x}{\\lambda}\\right)^{k-1}e^{-(x/\\lambda)^k}', cdf: 'F(x)=1-e^{-(x/\\lambda)^k}', mean: 'E[X]=\\lambda\\Gamma\\!\\left(1+\\frac1k\\right)', variance: '\\operatorname{Var}(X)=\\lambda^2\\left[\\Gamma\\!\\left(1+\\frac2k\\right)-\\Gamma^2\\!\\left(1+\\frac1k\\right)\\right]' },
    intuition: 'A lifetime model with decreasing, constant or increasing hazard by shape.', actuarialUse: 'Survival and duration modelling, lifetimes and reliability-type risks.', commonMistake: 'Mixing scale and rate conventions. Lambda is scale here.', syllabus: ['Risk Modelling', 'Survival Analysis'], related: 'Exponential when k = 1.', reference: IFOA,
    density: (x, p) => x <= 0 ? 0 : (p.k / p.lambda) * (x / p.lambda) ** (p.k - 1) * Math.exp(-((x / p.lambda) ** p.k)), cdf: (x, p) => x <= 0 ? 0 : 1 - Math.exp(-((x / p.lambda) ** p.k)), mean: (p) => p.lambda * gamma(1 + 1 / p.k), variance: (p) => p.lambda ** 2 * (gamma(1 + 2 / p.k) - gamma(1 + 1 / p.k) ** 2), domain: () => [0.001, 25]
  },
  {
    id: 'burr', name: 'Burr', family: 'Continuous', support: 'x>0', plotYMax: 12,
    parameters: [parameter('alpha', 'Tail shape', '\\alpha', 0.3, 6, 0.1, 2, 'Controls tail thickness and moments.'), parameter('gamma', 'Body shape', '\\gamma', 0.5, 5, 0.1, 1.5, 'Changes body curvature and near-zero behaviour.'), parameter('theta', 'Scale', '\\theta', 0.5, 8, 0.1, 2, 'Sets severity scale.')],
    latex: { density: 'f(x)=\\frac{\\alpha\\gamma}{\\theta}\\frac{(x/\\theta)^{\\gamma-1}}{[1+(x/\\theta)^\\gamma]^{\\alpha+1}}', cdf: 'F(x)=1-[1+(x/\\theta)^\\gamma]^{-\\alpha}', mean: 'E[X]=\\theta\\frac{\\Gamma(1+1/\\gamma)\\Gamma(\\alpha-1/\\gamma)}{\\Gamma(\\alpha)},\\quad\\alpha\\gamma>1', variance: '\\operatorname{Var}(X)=E[X^2]-E[X]^2,\\quad\\alpha\\gamma>2', moment: 'E[X^r]=\\theta^r\\frac{\\Gamma(1+r/\\gamma)\\Gamma(\\alpha-r/\\gamma)}{\\Gamma(\\alpha)}' },
    intuition: 'Burr XII controls both the body and heavy tail of positive losses.', actuarialUse: 'Flexible insurance severity when Pareto is too restrictive.', commonMistake: 'Ignoring alpha*gamma thresholds for moments.', syllabus: ['Risk Modelling', 'Loss Models', 'General Insurance'], related: 'A flexible Pareto-type heavy-tail family.', reference: IFOA,
    density: (x, p) => x <= 0 ? 0 : (p.alpha * p.gamma / p.theta) * (x / p.theta) ** (p.gamma - 1) / (1 + (x / p.theta) ** p.gamma) ** (p.alpha + 1), cdf: (x, p) => x <= 0 ? 0 : 1 - (1 + (x / p.theta) ** p.gamma) ** -p.alpha,
    mean: (p) => p.alpha * p.gamma > 1 ? p.theta * gamma(1 + 1 / p.gamma) * gamma(p.alpha - 1 / p.gamma) / gamma(p.alpha) : null,
    variance: (p) => { if (p.alpha * p.gamma <= 2) return null; const mean = p.theta * gamma(1 + 1 / p.gamma) * gamma(p.alpha - 1 / p.gamma) / gamma(p.alpha); return p.theta ** 2 * gamma(1 + 2 / p.gamma) * gamma(p.alpha - 2 / p.gamma) / gamma(p.alpha) - mean ** 2 },
    momentNotes: (p) => ({ mean: p.alpha * p.gamma <= 1 ? 'Undefined for alpha*gamma <= 1' : undefined, variance: p.alpha * p.gamma <= 2 ? 'Undefined for alpha*gamma <= 2' : undefined }), domain: () => [0.001, 40]
  },
  {
    id: 'student-t', name: "Student's t", family: 'Continuous', support: '\\mathbb{R}', plotYMax: 0.42,
    parameters: [parameter('nu', 'Degrees of freedom', '\\nu', 1, 30, 1, 5, 'Higher values approach Standard Normal.')],
    latex: { density: 'f(x)=\\frac{\\Gamma((\\nu+1)/2)}{\\sqrt{\\nu\\pi}\\,\\Gamma(\\nu/2)}\\left(1+\\frac{x^2}{\\nu}\\right)^{-(\\nu+1)/2}', cdf: 'F(x)\\text{ uses }I_{\\nu/(\\nu+x^2)}', mean: 'E[X]=0,\\quad\\nu>1', variance: '\\operatorname{Var}(X)=\\frac\\nu{\\nu-2},\\quad\\nu>2' },
    intuition: 'A symmetric inference distribution with heavier tails than Normal.', actuarialUse: 'Inference for means and regression coefficients when variance is estimated.', commonMistake: 'Using a finite variance formula when nu <= 2.', syllabus: ['Actuarial Statistics', 'Statistical Inference'], related: 'Approaches Standard Normal as nu increases.', reference: INFERENCE,
    density: (x, p) => Math.exp(logGamma((p.nu + 1) / 2) - logGamma(p.nu / 2)) / Math.sqrt(p.nu * Math.PI) * (1 + x * x / p.nu) ** (-(p.nu + 1) / 2), cdf: (x, p) => { const value = regularizedBeta(p.nu / (p.nu + x * x), p.nu / 2, 0.5); return x >= 0 ? 1 - value / 2 : value / 2 }, mean: (p) => p.nu > 1 ? 0 : null, variance: (p) => p.nu > 2 ? p.nu / (p.nu - 2) : null, momentNotes: (p) => ({ mean: p.nu <= 1 ? 'Undefined for nu <= 1' : undefined, variance: p.nu <= 2 ? 'Undefined for nu <= 2' : undefined }), domain: () => [-10, 10]
  },
  {
    id: 'f', name: 'F', family: 'Continuous', support: 'x>0', plotYMax: 3,
    parameters: [parameter('d1', 'Numerator degrees', 'd_1', 1, 30, 1, 5, 'Numerator degrees of freedom.'), parameter('d2', 'Denominator degrees', 'd_2', 1, 40, 1, 10, 'Denominator degrees; controls tail and moments.')],
    latex: { density: 'f(x)=\\frac{(d_1/d_2)^{d_1/2}x^{d_1/2-1}}{B(d_1/2,d_2/2)[1+d_1x/d_2]^{(d_1+d_2)/2}}', cdf: 'F(x)=I_{d_1x/(d_1x+d_2)}\\!\\left(\\frac{d_1}{2},\\frac{d_2}{2}\\right)', mean: 'E[X]=\\frac{d_2}{d_2-2},\\quad d_2>2', variance: '\\operatorname{Var}(X)=\\frac{2d_2^2(d_1+d_2-2)}{d_1(d_2-2)^2(d_2-4)},\\quad d_2>4' },
    intuition: 'A positive inference distribution from a ratio of scaled Chi-square variables.', actuarialUse: 'Comparing variances and testing groups or nested regression models.', commonMistake: 'Swapping numerator and denominator degrees of freedom.', syllabus: ['Actuarial Statistics', 'Statistical Inference'], related: 'Ratio of independent scaled Chi-square variables.', reference: INFERENCE,
    density: (x, p) => x <= 0 ? 0 : Math.exp((p.d1 / 2) * Math.log(p.d1 / p.d2) + (p.d1 / 2 - 1) * Math.log(x) - Math.log(beta(p.d1 / 2, p.d2 / 2)) - ((p.d1 + p.d2) / 2) * Math.log1p(p.d1 * x / p.d2)), cdf: (x, p) => x <= 0 ? 0 : regularizedBeta(p.d1 * x / (p.d1 * x + p.d2), p.d1 / 2, p.d2 / 2), mean: (p) => p.d2 > 2 ? p.d2 / (p.d2 - 2) : null, variance: (p) => p.d2 > 4 ? 2 * p.d2 ** 2 * (p.d1 + p.d2 - 2) / (p.d1 * (p.d2 - 2) ** 2 * (p.d2 - 4)) : null, momentNotes: (p) => ({ mean: p.d2 <= 2 ? 'Undefined for d2 <= 2' : undefined, variance: p.d2 <= 4 ? 'Undefined for d2 <= 4' : undefined }), domain: () => [0.001, 12]
  }
]

export const DISTRIBUTION_BY_ID = Object.fromEntries(DISTRIBUTIONS.map((distribution) => [distribution.id, distribution])) as Record<DistributionId, DistributionDefinition>

export function normalizeParameters(distribution: DistributionDefinition, values: Parameters) {
  const normalized = Object.fromEntries(distribution.parameters.map((item) => {
    const raw = Number(values[item.key])
    const bounded = Number.isFinite(raw) ? Math.min(item.max, Math.max(item.min, raw)) : item.defaultValue
    const stepped = item.step >= 1 ? Math.round(bounded) : Math.round(bounded / item.step) * item.step
    return [item.key, Number(stepped.toFixed(10))]
  }))
  return distribution.normalize ? distribution.normalize(normalized) : normalized
}

export function defaultParameters(distribution: DistributionDefinition) {
  return normalizeParameters(distribution, Object.fromEntries(distribution.parameters.map((item) => [item.key, item.defaultValue])))
}

export const clampParameters = normalizeParameters

export function distributionSummary(id: DistributionId, rawParameters: Parameters): DistributionSummary {
  const distribution = DISTRIBUTION_BY_ID[id]
  const parameters = normalizeParameters(distribution, rawParameters)
  const mean = distribution.mean(parameters)
  const variance = distribution.variance(parameters)
  const notes = distribution.momentNotes?.(parameters)
  return { mean, variance, standardDeviation: variance === null ? null : Math.sqrt(Math.max(0, variance)), meanNote: notes?.mean, varianceNote: notes?.variance, support: distribution.support }
}

export function distributionDensity(id: DistributionId, x: number, rawParameters: Parameters) {
  const distribution = DISTRIBUTION_BY_ID[id]
  const value = distribution.density(x, normalizeParameters(distribution, rawParameters))
  return Number.isFinite(value) && value >= 0 ? value : 0
}

export function distributionCdf(id: DistributionId, x: number, rawParameters: Parameters) {
  const distribution = DISTRIBUTION_BY_ID[id]
  return clamp01(distribution.cdf(x, normalizeParameters(distribution, rawParameters)))
}

export function distributionDomain(id: DistributionId, rawParameters: Parameters): Domain {
  const distribution = DISTRIBUTION_BY_ID[id]
  return distribution.domain(normalizeParameters(distribution, rawParameters))
}

export function distributionPoints(id: DistributionId, rawParameters: Parameters): DistributionPoint[] {
  const distribution = DISTRIBUTION_BY_ID[id]
  const parameters = normalizeParameters(distribution, rawParameters)
  const [start, end] = distribution.domain(parameters)
  if (distribution.family === 'Discrete') {
    const lower = Math.ceil(start)
    const upper = Math.floor(end)
    return Array.from({ length: Math.max(0, upper - lower + 1) }, (_, index) => ({ x: lower + index, y: distributionDensity(id, lower + index, parameters) }))
  }
  return Array.from({ length: 161 }, (_, index) => { const x = start + (end - start) * index / 160; return { x, y: distributionDensity(id, x, parameters) } })
}

export function distributionMetricPoints(id: DistributionId, parameters: Parameters, metric: DistributionMetric) {
  const points = distributionPoints(id, parameters)
  if (metric === 'density') return points
  const distribution = DISTRIBUTION_BY_ID[id]
  return points.map((point) => {
    const cumulative = distributionCdf(id, point.x, parameters)
    if (metric === 'cdf') return { x: point.x, y: cumulative }
    const survival = clamp01(1 - cumulative)
    if (metric === 'survival') return { x: point.x, y: survival }
    const denominator = distribution.family === 'Discrete' ? Math.max(1e-12, 1 - distributionCdf(id, point.x - 1, parameters)) : Math.max(1e-12, survival)
    return { x: point.x, y: distributionDensity(id, point.x, parameters) / denominator }
  })
}

export function distributionPlotYMax(id: DistributionId, metric: DistributionMetric) {
  if (metric === 'cdf' || metric === 'survival') return 1
  return metric === 'density' ? DISTRIBUTION_BY_ID[id].plotYMax : undefined
}

export function intervalProbability(id: DistributionId, lower: number, upper: number, parameters: Parameters) {
  if (upper < lower) return 0
  const distribution = DISTRIBUTION_BY_ID[id]
  return clamp01(distributionCdf(id, upper, parameters) - distributionCdf(id, distribution.family === 'Discrete' ? Math.ceil(lower) - 1 : lower, parameters))
}

export function distributionQuantile(id: DistributionId, probability: number, rawParameters: Parameters) {
  const target = Math.min(0.999999, Math.max(0.000001, probability))
  const distribution = DISTRIBUTION_BY_ID[id]
  const parameters = normalizeParameters(distribution, rawParameters)
  let [lower, upper] = distribution.domain(parameters)
  if (distribution.family === 'Discrete') {
    while (distributionCdf(id, upper, parameters) < target && upper < 10000) upper = upper * 2 + 10
    for (let value = Math.ceil(lower); value <= Math.ceil(upper); value += 1) if (distributionCdf(id, value, parameters) >= target) return value
    return Math.ceil(upper)
  }
  while (distributionCdf(id, lower, parameters) > target && lower > -1e6) lower = lower < 0 ? lower * 2 : lower - 10
  while (distributionCdf(id, upper, parameters) < target && upper < 1e6) upper = upper > 0 ? upper * 2 : upper + 10
  for (let index = 0; index < 100; index += 1) { const midpoint = (lower + upper) / 2; if (distributionCdf(id, midpoint, parameters) < target) lower = midpoint; else upper = midpoint }
  return (lower + upper) / 2
}

export function simulateDistribution(id: DistributionId, parameters: Parameters, count: number) {
  return Array.from({ length: Math.min(1000, Math.max(1, Math.round(count))) }, () => distributionQuantile(id, Math.random(), parameters))
}
