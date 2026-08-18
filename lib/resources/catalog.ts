export type ResourceKind = 'Deep Dive' | 'Textbook' | 'Paper' | 'Professional' | 'Regulatory'
export type ResourceDifficulty = 'Introductory' | 'University' | 'Professional' | 'Advanced'

export interface ActuarialResource {
  id: string
  title: string
  kind: ResourceKind
  difficulty: ResourceDifficulty
  summary: string
  topics: string[]
  professionalSubjects: string[]
  sourceName: string
  sourceUrl: string
  sourceClass: 'Professional' | 'Academic' | 'Regulatory'
  access: 'Open' | 'Library / purchase' | 'Institutional access'
  confidence: 'High' | 'Curated'
}

export interface ProfessionalSubject {
  id: string
  institute: 'Actuaries Institute Australia' | 'Institute and Faculty of Actuaries'
  title: string
  stage: string
  themes: string[]
  sourceUrl: string
}

export const PROFESSIONAL_SUBJECTS: ProfessionalSubject[] = [
  {
    id: 'au-foundation', institute: 'Actuaries Institute Australia', title: 'Foundation Program', stage: 'Foundation',
    themes: ['Actuarial statistics', 'Actuarial mathematics', 'Business and economics'],
    sourceUrl: 'https://www.actuaries.asn.au/becoming-an-actuary'
  },
  {
    id: 'au-actuary', institute: 'Actuaries Institute Australia', title: 'Actuary Program', stage: 'Associate',
    themes: ['Actuarial control cycle', 'Data science principles', 'Professionalism and communication'],
    sourceUrl: 'https://www.actuaries.asn.au/becoming-an-actuary'
  },
  {
    id: 'ifoa-cs1', institute: 'Institute and Faculty of Actuaries', title: 'CS1 Actuarial Statistics', stage: 'Core Principles',
    themes: ['Probability distributions', 'Statistical inference', 'Regression', 'Bayesian statistics'],
    sourceUrl: 'https://actuaries.org.uk/qualify/curriculum/actuarial-statistics/'
  },
  {
    id: 'ifoa-cs2', institute: 'Institute and Faculty of Actuaries', title: 'CS2 Risk Modelling and Survival Analysis', stage: 'Core Principles',
    themes: ['Stochastic processes', 'Survival models', 'Machine learning', 'Time series'],
    sourceUrl: 'https://actuaries.org.uk/qualify/curriculum/risk-modelling-and-survival-analysis/'
  },
  {
    id: 'ifoa-cm1', institute: 'Institute and Faculty of Actuaries', title: 'CM1 Actuarial Mathematics', stage: 'Core Principles',
    themes: ['Interest theory', 'Cash-flow models', 'Life contingencies', 'Pricing and reserving'],
    sourceUrl: 'https://actuaries.org.uk/qualify/curriculum/actuarial-mathematics/'
  },
  {
    id: 'ifoa-cm2', institute: 'Institute and Faculty of Actuaries', title: 'CM2 Economic Modelling', stage: 'Core Principles',
    themes: ['Utility theory', 'Asset models', 'Derivatives', 'Portfolio theory'],
    sourceUrl: 'https://actuaries.org.uk/qualify/curriculum/economic-modelling/'
  },
  {
    id: 'ifoa-cb', institute: 'Institute and Faculty of Actuaries', title: 'CB1 / CB2 Business Subjects', stage: 'Core Principles',
    themes: ['Finance', 'Accounting', 'Economics', 'Business strategy'],
    sourceUrl: 'https://actuaries.org.uk/qualify/curriculum/'
  }
]

export const ACTUARIAL_RESOURCES: ActuarialResource[] = [
  {
    id: 'deep-mle', title: 'Maximum likelihood: from likelihood surface to estimator', kind: 'Deep Dive', difficulty: 'University',
    summary: 'Build intuition for likelihood, derive score equations, inspect regularity conditions and connect asymptotic variance to Fisher information.',
    topics: ['maximum likelihood', 'inference', 'estimation', 'fisher information'], professionalSubjects: ['CS1'],
    sourceName: 'NIST/SEMATECH e-Handbook of Statistical Methods', sourceUrl: 'https://www.itl.nist.gov/div898/handbook/', sourceClass: 'Academic', access: 'Open', confidence: 'High'
  },
  {
    id: 'deep-martingale', title: 'Martingales as fair-value processes', kind: 'Deep Dive', difficulty: 'Advanced',
    summary: 'Move from conditional expectation to filtrations, stopping ideas and risk-neutral pricing without losing the financial intuition.',
    topics: ['martingale', 'stochastic processes', 'asset pricing'], professionalSubjects: ['CS2', 'CM2'],
    sourceName: 'MIT OpenCourseWare', sourceUrl: 'https://ocw.mit.edu/courses/18-445-introduction-to-stochastic-processes-spring-2015/', sourceClass: 'Academic', access: 'Open', confidence: 'High'
  },
  {
    id: 'deep-survival', title: 'Survival models: hazards, censoring and life tables', kind: 'Deep Dive', difficulty: 'Professional',
    summary: 'Connect survival, cumulative hazard and force of mortality before extending to censoring and proportional hazards.',
    topics: ['survival', 'hazard', 'mortality', 'censoring'], professionalSubjects: ['CS2', 'CM1'],
    sourceName: 'IFoA CS2 curriculum', sourceUrl: 'https://actuaries.org.uk/qualify/curriculum/risk-modelling-and-survival-analysis/', sourceClass: 'Professional', access: 'Open', confidence: 'High'
  },
  {
    id: 'deep-reinsurance', title: 'Reinsurance structures through loss random variables', kind: 'Deep Dive', difficulty: 'Professional',
    summary: 'Compare quota share, surplus, excess-of-loss and stop-loss contracts using ceded-loss functions and tail risk.',
    topics: ['reinsurance', 'loss models', 'tail risk'], professionalSubjects: ['CS2', 'CM2'],
    sourceName: 'Actuaries Institute Research and Knowledge', sourceUrl: 'https://www.actuaries.asn.au/research-analysis', sourceClass: 'Professional', access: 'Open', confidence: 'Curated'
  },
  {
    id: 'book-loss-models', title: 'Loss Models: From Data to Decisions', kind: 'Textbook', difficulty: 'Professional',
    summary: 'A standard actuarial treatment of frequency, severity, aggregate loss, credibility and simulation models.',
    topics: ['loss models', 'frequency', 'severity', 'credibility'], professionalSubjects: ['CS1', 'CS2', 'CM2'],
    sourceName: 'Society of Actuaries', sourceUrl: 'https://www.soa.org/education/exam-req/syllabus-study-materials/', sourceClass: 'Professional', access: 'Library / purchase', confidence: 'High'
  },
  {
    id: 'book-islf', title: 'An Introduction to Statistical Learning', kind: 'Textbook', difficulty: 'University',
    summary: 'Accessible statistical learning with regression, classification, resampling, regularisation and tree-based methods.',
    topics: ['regression', 'classification', 'machine learning'], professionalSubjects: ['CS1', 'CS2'],
    sourceName: 'StatLearning', sourceUrl: 'https://www.statlearning.com/', sourceClass: 'Academic', access: 'Open', confidence: 'High'
  },
  {
    id: 'paper-chain-ladder', title: 'Claims reserving and the chain-ladder method', kind: 'Paper', difficulty: 'Professional',
    summary: 'Enter reserving research through an established actuarial bibliography and peer-reviewed publication index.',
    topics: ['claims reserving', 'chain ladder', 'general insurance'], professionalSubjects: ['CS2', 'CM2'],
    sourceName: 'ASTIN Bulletin', sourceUrl: 'https://www.cambridge.org/core/journals/astin-bulletin-journal-of-the-iaa', sourceClass: 'Academic', access: 'Institutional access', confidence: 'Curated'
  },
  {
    id: 'reg-apra', title: 'APRA prudential standards and guidance', kind: 'Regulatory', difficulty: 'Professional',
    summary: 'Primary Australian prudential material for insurance, capital, governance and risk-management research.',
    topics: ['regulation', 'capital', 'insurance', 'risk management'], professionalSubjects: ['Actuary Program'],
    sourceName: 'Australian Prudential Regulation Authority', sourceUrl: 'https://www.apra.gov.au/industries', sourceClass: 'Regulatory', access: 'Open', confidence: 'High'
  },
  {
    id: 'professional-ai', title: 'Actuaries Institute research and analysis', kind: 'Professional', difficulty: 'Professional',
    summary: 'Australian actuarial discussion papers, public policy work, practice guidance and research.',
    topics: ['professional practice', 'public policy', 'insurance'], professionalSubjects: ['Actuary Program'],
    sourceName: 'Actuaries Institute Australia', sourceUrl: 'https://www.actuaries.asn.au/research-analysis', sourceClass: 'Professional', access: 'Open', confidence: 'High'
  }
]

export function relevanceScore(resource: ActuarialResource, topics: string[]) {
  const normalizedTopics = topics.map((topic) => topic.toLowerCase())
  return resource.topics.reduce((score, resourceTopic) => {
    const match = normalizedTopics.some((topic) => topic.includes(resourceTopic) || resourceTopic.includes(topic))
    return score + (match ? 4 : 0)
  }, resource.kind === 'Deep Dive' ? 1 : 0)
}