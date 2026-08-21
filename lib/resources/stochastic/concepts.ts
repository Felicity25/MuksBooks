import type { ConceptDefinition } from '@/lib/resources/stochastic/types'

export const STOCHASTIC_CONCEPTS: ConceptDefinition[] = [
  {
    id: 'deterministic-vs-brownian',
    title: 'Deterministic Calculus vs Brownian Motion',
    category: 'Foundations',
    shortDescription: 'Contrast smooth local linear behaviour with continuous-but-nowhere-differentiable Brownian paths.',
    actuarialWhy: 'Builds intuition for why deterministic calculus fails for diffusion models used in actuarial finance.',
    formulas: {
      definition: 'dx=a\,dt,\qquad dW_t\sim N(0,dt),\qquad dW_t=\sqrt{dt}Z',
      keyProperties: ['W_0=0', 'W_t-W_s\sim N(0,t-s)', '\text{Brownian paths are continuous a.s. and nowhere differentiable a.s.']
    },
    explanation: {
      intuition: ['Smooth curves become locally straight under zoom, while Brownian paths stay rough.', 'Brownian increments scale as \(\\sqrt{dt}\\), not as \(dt\\).'],
      formal: ['For a Wiener process, increments are independent, stationary and Gaussian.', 'The derivative limit fails almost surely because oscillations do not vanish at finer scales.'],
      exam: ['Know \(\\Delta W\\sim N(0,\\Delta t)\\) and the \(\\sqrt{\\Delta t}\\) simulation rule.', 'State continuity and nowhere differentiability clearly.']
    },
    checks: ['As dt shrinks, which term shrinks like sqrt(dt)?', 'Why does a smooth tangent exist for one curve but not the Brownian path?']
  },
  {
    id: 'random-walk-limit',
    title: 'Scaled Random Walk to Brownian Limit',
    category: 'Foundations',
    shortDescription: 'Show how a rescaled simple random walk resembles Brownian motion as partition size increases.',
    actuarialWhy: 'Links discrete modelling intuition to continuous-time process models.',
    formulas: {
      definition: 'S_n^*(t)=\\frac{1}{\\sqrt{n}}\\sum_{k=1}^{\\lfloor nt\\rfloor}\\xi_k,\quad \\xi_k\\in\\{-1,1\\}',
      keyProperties: ['\\text{Donsker scaling gives Brownian limit in distribution}', '\\text{A single finite walk does not literally equal Brownian motion}']
    },
    explanation: {
      intuition: ['Increasing steps with sqrt(n) scaling gives a rough shape that looks Brownian.', 'The limit is a distributional statement over paths, not a single-path identity.'],
      formal: ['Functional CLT gives weak convergence in path space.', 'Matching variance growth is key to the scaling.'],
      exam: ['Cite scaling and limiting idea, avoid over-claiming finite-n equivalence.']
    },
    checks: ['If steps increase 100x, why does sqrt(n) scaling matter?', 'Does one sample path prove convergence?']
  },
  {
    id: 'brownian-motion',
    title: 'Wiener / Standard Brownian Motion',
    category: 'Stochastic Processes',
    shortDescription: 'Interactive Wiener process with increment selection and theoretical distribution link.',
    actuarialWhy: 'Core process in continuous-time financial mathematics and Itô calculus foundations.',
    formulas: {
      definition: 'W_0=0,\quad W_t-W_s\\sim N(0,t-s)',
      mean: 'E[W_t]=0',
      variance: '\\operatorname{Var}(W_t)=t',
      keyProperties: ['\\operatorname{Cov}(W_s,W_t)=\\min(s,t)', '\\text{independent stationary increments}', '\\text{Markov and martingale}']
    },
    explanation: {
      intuition: ['A single path wanders unpredictably, but moments remain exactly tractable.', 'Selected increments tie graph movement directly to the Gaussian increment law.'],
      formal: ['A standard Wiener process and standard Brownian motion are the same object in this setting.', 'Simulation uses independent Gaussian increments of variance dt.'],
      exam: ['State increment law, mean/variance/covariance and key path properties.']
    },
    checks: ['For s<t, what is Var(W_t-W_s)?', 'Are increments over disjoint intervals independent?']
  },
  {
    id: 'brownian-drift',
    title: 'Brownian Motion with Drift',
    category: 'Stochastic Processes',
    shortDescription: 'Decompose deterministic trend and stochastic diffusion with parameter controls.',
    actuarialWhy: 'Useful bridge to general Itô processes and linear diffusion models.',
    formulas: {
      definition: 'X_t=X_0+\\mu t+\\sigma W_t',
      mean: 'E[X_t]=X_0+\\mu t',
      variance: '\\operatorname{Var}(X_t)=\\sigma^2 t'
    },
    explanation: {
      intuition: ['Drift tilts the expected path; diffusion widens the cloud around it.', 'Turning sigma to zero recovers a deterministic line.'],
      formal: ['Linear transformation of Wiener process preserves Gaussian finite-dimensional laws.', 'Increment law: X_t-X_s\\sim N(\\mu(t-s),\\sigma^2(t-s)).'],
      exam: ['Separate expected movement from randomness and quote first two moments.']
    },
    checks: ['If sigma doubles, what happens to variance?', 'If mu=0, what remains?']
  },
  {
    id: 'gbm',
    title: 'Geometric Brownian Motion',
    category: 'Actuarial Models',
    shortDescription: 'Simulate positive diffusion paths and compare against arithmetic Brownian motion.',
    actuarialWhy: 'Classic introductory continuous-time asset model in actuarial/financial mathematics.',
    formulas: {
      definition: 'dS_t=\\mu S_tdt+\\sigma S_tdW_t',
      distribution: 'S_t=S_0\\exp\\left((\\mu-\\tfrac12\\sigma^2)t+\\sigma W_t\\right)',
      mean: 'E[S_t]=S_0e^{\\mu t}'
    },
    explanation: {
      intuition: ['Noise scales with level, so absolute fluctuations grow with the process.', 'Exponential form keeps paths positive.'],
      formal: ['Apply Itô to log S_t to derive the closed form and positivity.', 'Do not over-interpret GBM as universally realistic for markets.'],
      exam: ['Remember drift correction term (mu-1/2 sigma^2) in the exponent.']
    },
    checks: ['Why does GBM remain positive?', 'What happens to dispersion when sigma increases?']
  },
  {
    id: 'poisson',
    title: 'Poisson Process',
    category: 'Stochastic Processes',
    shortDescription: 'Step-function counting process with controllable arrival intensity.',
    actuarialWhy: 'Canonical arrival model for claims/events in risk models.',
    formulas: {
      definition: 'N_t\\sim\\operatorname{Poisson}(\\lambda t)',
      mean: 'E[N_t]=\\lambda t',
      variance: '\\operatorname{Var}(N_t)=\\lambda t',
      keyProperties: ['\\text{independent stationary increments}', '\\text{càdlàg step paths}']
    },
    explanation: {
      intuition: ['Higher lambda means more frequent jumps over the same horizon.', 'The process is flat between arrivals and jumps by one at arrivals.'],
      formal: ['Increment counts over disjoint intervals are independent Poisson random variables.', 'Inter-arrival times are exponential.'],
      exam: ['Quote increment law and first two moments quickly.']
    },
    checks: ['If lambda doubles, what happens to E[N_t]?', 'Is the sample path continuous?']
  },
  {
    id: 'compound-poisson',
    title: 'Compound Poisson Process',
    category: 'Actuarial Models',
    shortDescription: 'Separate frequency and severity, then aggregate losses over time.',
    actuarialWhy: 'Directly maps to aggregate claims modelling in general insurance.',
    formulas: {
      definition: 'S_t=\\sum_{i=1}^{N_t}X_i',
      mean: 'E[S_t]=\\lambda t\\,E[X]',
      variance: '\\operatorname{Var}(S_t)=\\lambda t\\,E[X^2]'
    },
    explanation: {
      intuition: ['Arrivals control how often claims occur; severity controls jump size.', 'Frequency and severity both matter for volatility.'],
      formal: ['Assumes iid severities independent of Poisson counting process.', 'Moment formulas follow from law of total expectation/variance.'],
      exam: ['State aggregate mean/variance formulas and assumptions.']
    },
    checks: ['What changes if lambda rises but severity stays fixed?', 'Why does E[X^2] appear in variance?']
  },
  {
    id: 'quadratic-variation',
    title: 'Quadratic Variation',
    category: 'Ito Calculus',
    shortDescription: 'Numerically compare Brownian and smooth-path quadratic variation under finer partitions.',
    actuarialWhy: 'Provides the engine for the Itô correction term.',
    formulas: {
      definition: '\\sum_i (W_{t_i}-W_{t_{i-1}})^2\\to t',
      itoResult: '(dW_t)^2=dt',
      keyProperties: ['\\text{Smooth paths have quadratic variation }0']
    },
    explanation: {
      intuition: ['Brownian roughness accumulates square increments at O(dt), not 0.', 'This is why deterministic differential rules fail.'],
      formal: ['Convergence occurs in probability (and stronger senses with suitable constructions).', 'Differential identities are Itô notation, not ordinary algebra.'],
      exam: ['Use quadratic variation to justify surviving second-order term.']
    },
    checks: ['As partition gets finer, what does smooth-path quadratic variation approach?', 'Why does Brownian quadratic variation not vanish?']
  },
  {
    id: 'ito-process',
    title: 'Itô Process Decomposition',
    category: 'Ito Calculus',
    shortDescription: 'Toggle drift-only, diffusion-only and full process to isolate each term effect.',
    actuarialWhy: 'Core model form for stochastic differential equations in actuarial finance.',
    formulas: {
      definition: 'dX_t=\\mu(X_t,t)dt+\\sigma(X_t,t)dW_t',
      mean: 'E[X_t]=X_0+\\mu t\quad\\text{(constant coefficients)}',
      variance: '\\operatorname{Var}(X_t)=\\sigma^2 t\quad\\text{(constant coefficients)}'
    },
    explanation: {
      intuition: ['Drift determines direction of expectation; diffusion determines spread.', 'Decomposition toggles make each contribution visible.'],
      formal: ['For constant coefficients, explicit solution is X_t=X_0+mu t+sigma W_t.', 'General coefficients require SDE existence conditions.'],
      exam: ['Identify drift and diffusion immediately from SDE form.']
    },
    checks: ['Set sigma=0: what process remains?', 'Set mu=0: what process remains?']
  },
  {
    id: 'ito-lemma',
    title: "Itô's Lemma and W_t^2 Example",
    category: 'Ito Calculus',
    shortDescription: 'Stepwise chain-rule comparison with explicit Itô correction and martingale bridge.',
    actuarialWhy: 'Fundamental transformation rule for stochastic models and derivatives pricing math.',
    formulas: {
      definition: 'df=\\left(f_t+\\mu f_x+\\tfrac12\\sigma^2f_{xx}\\right)dt+\\sigma f_x dW_t',
      itoResult: 'd(W_t^2)=2W_t\\,dW_t+dt',
      keyProperties: ['W_t^2-t\\text{ is a martingale}']
    },
    explanation: {
      intuition: ['Ordinary chain rule misses the extra dt correction from stochastic roughness.', 'The +dt term is exactly the Itô correction from quadratic variation.'],
      formal: ['Insert dX into second-order expansion and apply Itô multiplication table.', 'Use (dW)^2=dt and higher-order negligible terms.'],
      exam: ['Be able to derive and identify the 1/2 sigma^2 f_xx term.']
    },
    checks: ['What term appears in Itô but not ordinary chain rule?', 'Why is W_t^2-t important?']
  },
  {
    id: 'martingale',
    title: 'Martingale Branching View',
    category: 'Stochastic Processes',
    shortDescription: 'Branch many futures from time s and compare conditional mean against current value.',
    actuarialWhy: 'Critical conditional-expectation concept in pricing and risk-neutral arguments.',
    formulas: {
      definition: 'E[X_t\\mid\\mathcal F_s]=X_s,\quad s<t',
      keyProperties: ['\\text{Not pathwise constant}', '\\text{Statement is about conditional expectation}']
    },
    explanation: {
      intuition: ['Future paths vary, but their average anchored on current information matches the present level.', 'Martingale does not mean flat path.'],
      formal: ['Filtration captures information growth over time.', 'Brownian motion and W_t^2-t provide canonical examples.'],
      exam: ['State definition and avoid common misinterpretation as deterministic constancy.']
    },
    checks: ['Can a martingale path move up and down?', 'What is being conditioned on in E[X_t|F_s]?']
  }
]

export const STOCHASTIC_CONCEPT_BY_ID = Object.fromEntries(STOCHASTIC_CONCEPTS.map((item) => [item.id, item]))
