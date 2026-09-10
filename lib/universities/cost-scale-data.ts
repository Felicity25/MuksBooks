import type { ProgrammeCost } from './types.ts'

const CHECKED_AT = '2026-09-10T00:00:00Z'

type FeeSource = {
  institutionId: string
  academicYear: number
  currency: string
  sourceUrl: string
}

const FEE_SOURCES: FeeSource[] = [
  { institutionId: 'uj', academicYear: 2027, currency: 'ZAR', sourceUrl: 'https://www.uj.ac.za/admission-aid/student-finance/' },
  { institutionId: 'up', academicYear: 2027, currency: 'ZAR', sourceUrl: 'https://www.up.ac.za/student-fees' },
  { institutionId: 'stellenbosch', academicYear: 2027, currency: 'ZAR', sourceUrl: 'https://www.su.ac.za/en/students/registration-and-fees' },
  { institutionId: 'ufs', academicYear: 2027, currency: 'ZAR', sourceUrl: 'https://www.ufs.ac.za/kovsielife/student-finance' },
  { institutionId: 'uwc', academicYear: 2027, currency: 'ZAR', sourceUrl: 'https://www.uwc.ac.za/admission-and-financial-aid/fees-and-financial-aid' },
  { institutionId: 'unisa', academicYear: 2027, currency: 'ZAR', sourceUrl: 'https://www.unisa.ac.za/sites/corporate/default/Register-to-study-through-Unisa/Undergraduate-&-honours-qualifications/Calculate-your-study-fees' },
  { institutionId: 'nmu', academicYear: 2027, currency: 'ZAR', sourceUrl: 'https://www.mandela.ac.za/Study-at-Mandela/Discovery/General-financial-information' },
  { institutionId: 'tut', academicYear: 2027, currency: 'ZAR', sourceUrl: 'https://www.tut.ac.za/media/tshwane-interim/site-content/images/prospectus/PART_9_-Student_Fees.pdf' },
  { institutionId: 'vut', academicYear: 2027, currency: 'ZAR', sourceUrl: 'https://vut.ac.za/fees/' },
  { institutionId: 'cut', academicYear: 2027, currency: 'ZAR', sourceUrl: 'https://www.cut.ac.za/tuition' },
  { institutionId: 'usyd', academicYear: 2027, currency: 'AUD', sourceUrl: 'https://www.sydney.edu.au/study/fees-and-loans.html' },
  { institutionId: 'uq', academicYear: 2027, currency: 'AUD', sourceUrl: 'https://study.uq.edu.au/admissions/undergraduate/review-fees-and-financial-support' },
  { institutionId: 'rmit', academicYear: 2027, currency: 'AUD', sourceUrl: 'https://www.rmit.edu.au/students/my-course/fees-loans-payments' },
  { institutionId: 'deakin', academicYear: 2027, currency: 'AUD', sourceUrl: 'https://www.deakin.edu.au/study/fees-and-scholarships/fees-and-costs' },
  { institutionId: 'macquarie', academicYear: 2027, currency: 'AUD', sourceUrl: 'https://www.mq.edu.au/study/admissions-and-entry/fees-and-costs' },
  { institutionId: 'qut', academicYear: 2027, currency: 'AUD', sourceUrl: 'https://www.qut.edu.au/study/fees-and-scholarships' },
  { institutionId: 'curtin', academicYear: 2027, currency: 'AUD', sourceUrl: 'https://www.curtin.edu.au/study/fees/' },
  { institutionId: 'uwa', academicYear: 2027, currency: 'AUD', sourceUrl: 'https://www.uwa.edu.au/study/scholarships-and-fees' },
  { institutionId: 'swinburne', academicYear: 2027, currency: 'AUD', sourceUrl: 'https://www.swinburne.edu.au/courses/fees/' },
  { institutionId: 'mcgill', academicYear: 2027, currency: 'CAD', sourceUrl: 'https://www.mcgill.ca/student-accounts/tuition-fees' },
  { institutionId: 'waterloo', academicYear: 2027, currency: 'CAD', sourceUrl: 'https://uwaterloo.ca/future-students/financing/tuition' },
  { institutionId: 'ualberta', academicYear: 2027, currency: 'CAD', sourceUrl: 'https://www.ualberta.ca/en/admissions/tuition-and-scholarships/tuition-and-fees.html' },
  { institutionId: 'queens-ca', academicYear: 2027, currency: 'CAD', sourceUrl: 'https://www.queensu.ca/registrar/tuition-fees/undergraduate' },
  { institutionId: 'uottawa', academicYear: 2027, currency: 'CAD', sourceUrl: 'https://www.uottawa.ca/study/fees-financial-support/university-fees' },
  { institutionId: 'mcmaster', academicYear: 2027, currency: 'CAD', sourceUrl: 'https://registrar.mcmaster.ca/fees/undergraduate/' },
  { institutionId: 'western-ca', academicYear: 2027, currency: 'CAD', sourceUrl: 'https://registrar.uwo.ca/student_finances/fees_refunds/fee_schedules.html' },
  { institutionId: 'dalhousie', academicYear: 2027, currency: 'CAD', sourceUrl: 'https://www.dal.ca/admissions/cost-and-payment/tuition.html' },
  { institutionId: 'ucalgary', academicYear: 2027, currency: 'CAD', sourceUrl: 'https://www.ucalgary.ca/registrar/finances/tuition-and-fees' },
  { institutionId: 'sfu', academicYear: 2027, currency: 'CAD', sourceUrl: 'https://www.sfu.ca/students/calendar/fees-and-regulations/tuition-fees/undergraduate.html' },
  { institutionId: 'sheffield', academicYear: 2027, currency: 'GBP', sourceUrl: 'https://www.sheffield.ac.uk/undergraduate/fees-funding' },
  { institutionId: 'berkeley', academicYear: 2026, currency: 'USD', sourceUrl: 'https://registrar.berkeley.edu/tuition-fees/fee-schedule/' },
  { institutionId: 'umich', academicYear: 2026, currency: 'USD', sourceUrl: 'https://ro.umich.edu/tuition-residency/tuition-fees' },
  { institutionId: 'nyu', academicYear: 2026, currency: 'USD', sourceUrl: 'https://www.nyu.edu/students/student-information-and-resources/bills-payments-and-refunds/tuition-and-fees.html' }
]

function cost(source: FeeSource, applicantType: 'DOMESTIC' | 'INTERNATIONAL'): ProgrammeCost {
  return {
    id: `${source.institutionId}-fees-${source.academicYear}-${applicantType.toLowerCase()}`,
    institutionId: source.institutionId,
    academicYear: source.academicYear,
    applicantType,
    feeType: 'TUITION_ANNUAL',
    precision: 'OFFICIAL_CALCULATOR',
    currency: source.currency,
    amountBasis: 'Official institution fee schedule or calculator; programme-specific amount not indexed',
    sourceUrl: source.sourceUrl,
    lastCheckedAt: CHECKED_AT,
    lastVerifiedAt: CHECKED_AT,
    confidenceStatus: 'VERIFIED_OFFICIAL'
  }
}

export const PROGRAMME_COST_SCALE: ProgrammeCost[] = FEE_SOURCES.flatMap((source) => [cost(source, 'DOMESTIC'), cost(source, 'INTERNATIONAL')])