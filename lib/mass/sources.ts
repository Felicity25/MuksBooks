import type { MassSourceDefinition } from './types'

export const MASS_SOURCES: MassSourceDefinition[] = [
  { id: 'mass-website', name: 'MASS Website', url: 'https://www.monashactuary.com.au/', type: 'website' },
  { id: 'mass-linktree', name: 'MASS Linktree', url: 'https://linktr.ee/monashactuary', type: 'linktree' },
  { id: 'mass-msa', name: 'MSA Clubs', url: 'https://clubs.msa.monash.edu/organisation/7258/', type: 'club-directory' }
]

export const MASS_OPTIONAL_SOCIAL_SOURCES = [
  'https://www.instagram.com/monashactuary/',
  'https://www.linkedin.com/company/monashactuary/',
  'https://www.facebook.com/monashactuary/'
]