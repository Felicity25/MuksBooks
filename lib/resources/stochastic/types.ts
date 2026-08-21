export type LabConceptId =
  | 'deterministic-vs-brownian'
  | 'random-walk-limit'
  | 'brownian-motion'
  | 'brownian-drift'
  | 'gbm'
  | 'poisson'
  | 'compound-poisson'
  | 'quadratic-variation'
  | 'ito-process'
  | 'ito-lemma'
  | 'martingale'

export type ExplanationMode = 'intuition' | 'formal' | 'exam'

export interface PathPoint {
  t: number
  y: number
}

export interface MultiPathResult {
  times: number[]
  paths: number[][]
}

export interface ProcessMoments {
  meanLatex?: string
  varianceLatex?: string
  covarianceLatex?: string
}

export interface ConceptDefinition {
  id: LabConceptId
  title: string
  category: 'Foundations' | 'Stochastic Processes' | 'Ito Calculus' | 'Actuarial Models'
  shortDescription: string
  actuarialWhy: string
  formulas: {
    definition: string
    distribution?: string
    mean?: string
    variance?: string
    keyProperties?: string[]
    itoResult?: string
  }
  explanation: Record<ExplanationMode, string[]>
  checks: string[]
}
