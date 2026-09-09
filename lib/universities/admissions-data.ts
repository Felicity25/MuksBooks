import type {
  AdmissionsPolicy,
  AdmissionsTestDefinition,
  AdmissionsTestFee,
  AdmissionsTestSession,
  OfficialAdmissionsSource
} from './types.ts'

const verifiedSource = (title: string, url: string, admissionsCycle?: string): OfficialAdmissionsSource => ({
  title,
  url,
  sourceType: 'official-admissions',
  lastVerifiedAt: '2026-09-09',
  admissionsCycle
})

const UBC_ENGLISH_SOURCE = verifiedSource(
  'UBC English language competency',
  'https://you.ubc.ca/applying-ubc/requirements/english-language-competency/',
  '2026/2027 Winter Session'
)

const MIT_TEST_SOURCE = verifiedSource(
  'MIT first-year tests and scores',
  'https://mitadmissions.org/apply/firstyear/tests-scores/',
  '2026-2027'
)

const COLUMBIA_TEST_SOURCE = verifiedSource(
  'Columbia undergraduate testing policy',
  'https://undergrad.admissions.columbia.edu/apply/process/testing',
  '2026-2027'
)

const MIT_INTERVIEW_SOURCE = verifiedSource(
  'MIT first-year interview',
  'https://mitadmissions.org/apply/firstyear/interview/',
  '2026-2027'
)

const MIT_PORTFOLIO_SOURCE = verifiedSource(
  'MIT creative portfolios',
  'https://mitadmissions.org/apply/firstyear/portfolios-additional-material/',
  '2026-2027'
)

const OXFORD_MATHS_SOURCE = verifiedSource(
  'Oxford Mathematics / Mathematics and Statistics',
  'https://www.ox.ac.uk/admissions/undergraduate/courses/course-listing/mathematics',
  '2027 entry'
)

const UNSW_MEDICINE_SOURCE = verifiedSource(
  'UNSW Medicine domestic application process',
  'https://www.unsw.edu.au/medicine-health/study-with-us/undergraduate/applying-to-medicine',
  '2027 entry'
)

const UCT_2027_PROSPECTUS_SOURCE = verifiedSource(
  'UCT 2027 Undergraduate Prospectus',
  'https://uct.ac.za/media/685611',
  '2027 entry'
)

export const ADMISSIONS_POLICIES: AdmissionsPolicy[] = [
  {
    id: 'ubc-undergraduate-2027',
    institutionId: 'ubc',
    intakeYears: [2027],
    admissionsCycle: '2026/2027 Winter Session',
    applicantRoutes: ['SCHOOL_LEAVER', 'GAP_YEAR'],
    english: {
      id: 'ubc-elas',
      label: 'UBC English Language Admission Standard',
      exemptions: [
        {
          curriculum: 'IB',
          subjectNames: ['English A: Language and Literature', 'English A: Literature'],
          levels: ['HL', 'SL'],
          minimumNumericGrade: 5,
          source: UBC_ENGLISH_SOURCE
        },
        {
          curriculum: 'A_LEVEL',
          subjectNames: ['English Language', 'English Literature'],
          acceptedLetterGrades: ['A', 'B'],
          source: UBC_ENGLISH_SOURCE
        }
      ],
      languageOfInstructionRules: [{
        language: 'English',
        minimumYears: 4,
        recognizedSchoolRequired: true,
        source: UBC_ENGLISH_SOURCE
      }],
      acceptedTests: [
        {
          test: 'IELTS',
          minimumOverall: 6.5,
          minimumComponents: { listening: 6, reading: 6, speaking: 6, writing: 6 },
          validOnOrAfter: '2024-01-01',
          source: UBC_ENGLISH_SOURCE
        },
        {
          test: 'PTE',
          minimumOverall: 65,
          minimumComponents: { listening: 60, reading: 60, speaking: 60, writing: 60 },
          validOnOrAfter: '2024-01-01',
          source: UBC_ENGLISH_SOURCE
        },
        {
          test: 'TOEFL',
          minimumOverall: 90,
          minimumComponents: { listening: 22, reading: 22, speaking: 21, writing: 21 },
          validOnOrAfter: '2024-01-01',
          validOnOrBefore: '2026-01-20',
          scoreScale: '1-120',
          source: UBC_ENGLISH_SOURCE
        },
        {
          test: 'TOEFL',
          minimumOverall: 4.5,
          minimumComponents: { listening: 5, reading: 4.5, speaking: 4, writing: 4.5 },
          validOnOrAfter: '2026-01-21',
          scoreScale: '1-6',
          source: UBC_ENGLISH_SOURCE
        },
        {
          test: 'CAMBRIDGE',
          minimumOverall: 180,
          validOnOrAfter: '2024-01-01',
          source: UBC_ENGLISH_SOURCE
        }
      ],
      source: UBC_ENGLISH_SOURCE
    },
    source: UBC_ENGLISH_SOURCE,
    confidenceStatus: 'VERIFIED_OFFICIAL',
    coverageLevel: 'PARTIAL'
  },
  {
    id: 'mit-first-year-2027',
    institutionId: 'mit',
    intakeYears: [2027],
    admissionsCycle: '2026-2027',
    applicantRoutes: ['SCHOOL_LEAVER', 'GAP_YEAR'],
    admissionsTests: [{
      id: 'mit-sat-or-act',
      label: 'SAT or ACT',
      acceptedTests: ['SAT', 'ACT'],
      requiredness: 'REQUIRED',
      source: MIT_TEST_SOURCE
    }],
    additionalRequirements: [
      {
        id: 'mit-interview',
        category: 'INTERVIEW',
        label: 'Educational Counselor interview',
        requiredness: 'CONDITIONAL',
        notes: 'MIT offers interviews whenever possible after submission. If no interview is available, it is waived without disadvantage.',
        action: 'After submitting, monitor your email and respond promptly if an Educational Counselor contacts you.',
        source: MIT_INTERVIEW_SOURCE
      },
      {
        id: 'mit-creative-portfolio',
        category: 'PORTFOLIO',
        label: 'Creative portfolio',
        requiredness: 'OPTIONAL',
        notes: 'MIT describes creative portfolios as truly optional and intended for significant, relevant work.',
        source: MIT_PORTFOLIO_SOURCE
      }
    ],
    source: MIT_TEST_SOURCE,
    confidenceStatus: 'VERIFIED_OFFICIAL',
    coverageLevel: 'PARTIAL'
  },
  {
    id: 'columbia-first-year-2027',
    institutionId: 'columbia',
    intakeYears: [2027],
    admissionsCycle: '2026-2027',
    applicantRoutes: ['SCHOOL_LEAVER', 'GAP_YEAR'],
    admissionsTests: [{
      id: 'columbia-sat-or-act',
      label: 'SAT or ACT',
      acceptedTests: ['SAT', 'ACT'],
      requiredness: 'TEST_OPTIONAL',
      source: COLUMBIA_TEST_SOURCE
    }],
    source: COLUMBIA_TEST_SOURCE,
    confidenceStatus: 'VERIFIED_OFFICIAL',
    coverageLevel: 'PARTIAL'
  },
  {
    id: 'oxford-mathematics-2027',
    institutionId: 'oxford',
    programmeIds: ['oxford-maths'],
    intakeYears: [2027],
    admissionsCycle: '2027 entry',
    applicantRoutes: ['SCHOOL_LEAVER', 'GAP_YEAR'],
    admissionsTests: [{
      id: 'oxford-mathematics-tmua',
      label: 'Test of Mathematics for University Admission (TMUA)',
      acceptedTests: ['TMUA'],
      requiredness: 'REQUIRED',
      notes: 'Oxford requires both TMUA Paper 1 and Paper 2 for this course.',
      source: OXFORD_MATHS_SOURCE
    }],
    additionalRequirements: [{
      id: 'oxford-mathematics-interview',
      category: 'INTERVIEW',
      label: 'Online interview if shortlisted',
      requiredness: 'CONDITIONAL',
      notes: 'Shortlisted candidates are invited to at least one online interview, expected in December.',
      action: 'If shortlisted, follow the college interview instructions and prepare for the online interview.',
      source: OXFORD_MATHS_SOURCE
    }],
    source: OXFORD_MATHS_SOURCE,
    confidenceStatus: 'VERIFIED_OFFICIAL',
    coverageLevel: 'PARTIAL'
  },
  {
    id: 'unsw-medicine-domestic-2027',
    institutionId: 'unsw',
    programmeIds: ['unsw-medicine'],
    intakeYears: [2027],
    admissionsCycle: '2027 entry',
    applicantRoutes: ['SCHOOL_LEAVER', 'GAP_YEAR'],
    applicantTypes: ['DOMESTIC'],
    admissionsTests: [{
      id: 'unsw-medicine-ucat-anz',
      label: 'UCAT ANZ',
      acceptedTests: ['UCAT_ANZ'],
      requiredness: 'REQUIRED',
      notes: 'For domestic general entry, UNSW uses the UCAT ANZ overall score with the selection rank when ranking applicants for interview.',
      source: UNSW_MEDICINE_SOURCE
    }],
    additionalRequirements: [{
      id: 'unsw-medicine-interview',
      category: 'INTERVIEW',
      label: 'Medicine interview if shortlisted',
      requiredness: 'CONDITIONAL',
      notes: 'Applicants ranked highly enough under the published domestic selection criteria are invited to interview.',
      action: 'If shortlisted, follow the interview invitation and attend the assigned interview.',
      source: UNSW_MEDICINE_SOURCE
    }],
    source: UNSW_MEDICINE_SOURCE,
    confidenceStatus: 'VERIFIED_OFFICIAL',
    coverageLevel: 'PARTIAL'
  },
  {
    id: 'uct-commerce-2027',
    institutionId: 'uct',
    programmeIds: ['uct-bcom-actuarial', 'uct-bcom-economics-finance'],
    intakeYears: [2027],
    admissionsCycle: '2027 entry',
    applicantRoutes: ['SCHOOL_LEAVER', 'GAP_YEAR'],
    admissionsTests: [{
      id: 'uct-commerce-aql',
      label: 'NBT Academic and Quantitative Literacy (AQL)',
      acceptedTests: ['NBT_AQL'],
      requiredness: 'REQUIRED',
      notes: 'The 2027 UCT prospectus requires all Commerce applicants to write AQL and states that MAT is not required for Commerce admission.',
      source: UCT_2027_PROSPECTUS_SOURCE
    }],
    source: UCT_2027_PROSPECTUS_SOURCE,
    confidenceStatus: 'VERIFIED_OFFICIAL',
    coverageLevel: 'PARTIAL'
  },
  {
    id: 'uct-mbchb-2027',
    institutionId: 'uct',
    programmeIds: ['uct-mbchb'],
    intakeYears: [2027],
    admissionsCycle: '2027 entry',
    applicantRoutes: ['SCHOOL_LEAVER', 'GAP_YEAR'],
    admissionsTests: [
      {
        id: 'uct-health-aql',
        label: 'NBT Academic and Quantitative Literacy (AQL)',
        acceptedTests: ['NBT_AQL'],
        requiredness: 'REQUIRED',
        notes: 'The 2027 UCT prospectus requires Health Sciences applicants to write AQL wherever they reside.',
        source: UCT_2027_PROSPECTUS_SOURCE
      },
      {
        id: 'uct-health-mat',
        label: 'NBT Mathematics (MAT)',
        acceptedTests: ['NBT_MAT'],
        requiredness: 'REQUIRED',
        notes: 'The 2027 UCT prospectus requires Health Sciences applicants to write the separate MAT test as well as AQL.',
        source: UCT_2027_PROSPECTUS_SOURCE
      }
    ],
    source: UCT_2027_PROSPECTUS_SOURCE,
    confidenceStatus: 'VERIFIED_OFFICIAL',
    coverageLevel: 'PARTIAL'
  }
]

function testDefinition(definition: Omit<AdmissionsTestDefinition, 'sourceUrl' | 'lastCheckedAt' | 'lastVerifiedAt'>): AdmissionsTestDefinition {
  return { ...definition, sourceUrl: definition.officialUrl, lastCheckedAt: '2026-09-09', lastVerifiedAt: '2026-09-09' }
}

export const ADMISSIONS_TESTS: AdmissionsTestDefinition[] = [
  testDefinition({ id: 'SAT', name: 'SAT', provider: 'College Board', testType: 'UNDERGRADUATE_ADMISSIONS', scoreScale: '400-1600', officialUrl: 'https://satsuite.collegeboard.org/sat', bookingUrl: 'https://mysat.collegeboard.org/', summary: 'A digital undergraduate admissions test used only where the selected institution and admissions cycle requires or accepts it.', components: ['Reading and Writing', 'Math'], preparationUrl: 'https://satsuite.collegeboard.org/practice' }),
  testDefinition({ id: 'ACT', name: 'ACT', provider: 'ACT', testType: 'UNDERGRADUATE_ADMISSIONS', scoreScale: '1-36', officialUrl: 'https://www.act.org/content/act/en/products-and-services/the-act.html', bookingUrl: 'https://my.act.org/', summary: 'A US undergraduate admissions test whose requirement and accepted sections depend on the institution and cycle.', preparationUrl: 'https://www.act.org/content/act/en/products-and-services/the-act/test-preparation.html' }),
  testDefinition({ id: 'NBT_AQL', name: 'NBT Academic and Quantitative Literacy', provider: 'National Benchmark Tests Project', testType: 'UNDERGRADUATE_ADMISSIONS', supportedCountries: ['ZA'], officialUrl: 'https://www.nbt.ac.za/', bookingUrl: 'https://nbtests.uct.ac.za/user', bookingNote: 'Current dates and fees have not passed the MuksBooks review gate. Confirm them in the official NBT portal.', summary: 'The combined NBT used by participating South African programmes to assess readiness for academic and quantitative university work.', components: ['Academic Literacy', 'Quantitative Literacy'], preparationUrl: 'https://www.nbt.ac.za/content/preparing-tests' }),
  testDefinition({ id: 'NBT_MAT', name: 'NBT Mathematics', provider: 'National Benchmark Tests Project', testType: 'QUANTITATIVE_ADMISSIONS', supportedCountries: ['ZA'], officialUrl: 'https://www.nbt.ac.za/', bookingUrl: 'https://nbtests.uct.ac.za/user', bookingNote: 'Current dates and fees have not passed the MuksBooks review gate. Confirm them in the official NBT portal.', summary: 'The separate NBT Mathematics test, required only by programmes or faculties whose current policy names MAT.', components: ['Mathematics'], preparationUrl: 'https://www.nbt.ac.za/content/preparing-tests' }),
  testDefinition({ id: 'UCAT', name: 'UCAT', provider: 'UCAT Consortium', testType: 'MEDICAL_ADMISSIONS', supportedCountries: ['GB'], officialUrl: 'https://www.ucat.ac.uk/', bookingUrl: 'https://ucat.useclarus.com/', summary: 'A medical and dental admissions test used by participating UK universities according to each programme’s current policy.', components: ['Verbal Reasoning', 'Decision Making', 'Quantitative Reasoning', 'Situational Judgement'], preparationUrl: 'https://www.ucat.ac.uk/prepare/' }),
  testDefinition({ id: 'UCAT_ANZ', name: 'UCAT ANZ', provider: 'UCAT ANZ Consortium', testType: 'MEDICAL_ADMISSIONS', supportedCountries: ['AU'], officialUrl: 'https://www.ucat.edu.au/', bookingUrl: 'https://wsr.pearsonvue.com/testtaker/signin/SignInPage/UMAT', summary: 'A medical and dental admissions test used by participating Australian and New Zealand programmes for specified applicant routes.', components: ['Verbal Reasoning', 'Decision Making', 'Quantitative Reasoning', 'Situational Judgement'], preparationUrl: 'https://www.ucat.edu.au/prepare/' }),
  testDefinition({ id: 'GAMSAT', name: 'GAMSAT', provider: 'ACER', testType: 'MEDICAL_ADMISSIONS', supportedCountries: ['AU', 'GB'], officialUrl: 'https://gamsat.acer.org/', bookingUrl: 'https://registration.acer.edu.au/', bookingNote: 'ACER states that March 2027 registration opens in November 2026; exact session dates are not yet shown here.', summary: 'A graduate-entry medical admissions test. It must not be applied to school-leaver medicine unless the exact programme route requires it.', components: ['Reasoning in Humanities and Social Sciences', 'Written Communication', 'Reasoning in Biological and Physical Sciences'], preparationUrl: 'https://gamsat.acer.org/prepare' }),
  testDefinition({ id: 'LNAT', name: 'LNAT', provider: 'LNAT Consortium', testType: 'LAW_ADMISSIONS', supportedCountries: ['GB'], officialUrl: 'https://lnat.ac.uk/', bookingUrl: 'https://wsr.pearsonvue.com/testtaker/signin/SignInPage/LNAT', summary: 'A law admissions test required only by participating universities and programmes.', components: ['Multiple-choice questions', 'Essay'], preparationUrl: 'https://lnat.ac.uk/how-to-prepare/' }),
  testDefinition({ id: 'TMUA', name: 'TMUA', provider: 'UAT-UK', testType: 'QUANTITATIVE_ADMISSIONS', supportedCountries: ['GB'], officialUrl: 'https://esat-tmua.ac.uk/about-the-tests/tmua/', bookingUrl: 'https://esat-tmua.ac.uk/register/', summary: 'A mathematics admissions test used by specified quantitative programmes. Oxford Mathematics requires both papers for 2027 entry.', components: ['Paper 1: Applications of Mathematical Knowledge', 'Paper 2: Mathematical Reasoning'], preparationUrl: 'https://esat-tmua.ac.uk/tmua-preparation-materials/' }),
  testDefinition({ id: 'ESAT', name: 'ESAT', provider: 'UAT-UK', testType: 'UNDERGRADUATE_ADMISSIONS', supportedCountries: ['GB'], officialUrl: 'https://esat-tmua.ac.uk/about-the-tests/esat/', bookingUrl: 'https://esat-tmua.ac.uk/register/' }),
  testDefinition({ id: 'ISAT', name: 'ISAT', provider: 'ACER', testType: 'MEDICAL_ADMISSIONS', supportedCountries: ['AU'], officialUrl: 'https://isat.acer.org/', bookingUrl: 'https://registration.acer.edu.au/' }),
  testDefinition({ id: 'IELTS', name: 'IELTS Academic', provider: 'IELTS', testType: 'ENGLISH_LANGUAGE', officialUrl: 'https://ielts.org/take-a-test', bookingUrl: 'https://ielts.org/take-a-test/book-a-test', bookingNote: 'Availability and fees depend on the selected country and test centre. Confirm both in the official booking flow.' }),
  testDefinition({ id: 'TOEFL', name: 'TOEFL iBT', provider: 'ETS', testType: 'ENGLISH_LANGUAGE', officialUrl: 'https://www.ets.org/toefl/test-takers/ibt/about.html', bookingUrl: 'https://toeflibt.ets.org/signup/register', bookingNote: 'Availability and fees depend on the selected location and delivery method. Confirm both in the official booking flow.' }),
  testDefinition({ id: 'PTE', name: 'PTE Academic', provider: 'Pearson', testType: 'ENGLISH_LANGUAGE', officialUrl: 'https://www.pearsonpte.com/pte-academic', bookingUrl: 'https://mypte.pearsonpte.com/test/search?examCode=PTE-A', bookingNote: 'Availability and fees depend on the selected country and test centre. Confirm both in the official booking flow.' }),
  testDefinition({ id: 'CAMBRIDGE', name: 'Cambridge English Qualifications', provider: 'Cambridge English', testType: 'ENGLISH_LANGUAGE', officialUrl: 'https://www.cambridgeenglish.org/exams-and-tests/', bookingUrl: 'https://www.cambridgeenglish.org/find-a-centre/find-an-exam-centre/', bookingNote: 'Exam dates and fees are set by authorised centres. Confirm them with the selected official centre.' })
]

const SAT_DATES_SOURCE = verifiedSource('SAT dates and deadlines', 'https://satsuite.collegeboard.org/sat/dates-deadlines', '2026-2027')
const UCAT_DATES_SOURCE = verifiedSource('UCAT registration and booking', 'https://www.ucat.ac.uk/register/booking-your-test/', '2026')
const UCAT_ANZ_DATES_SOURCE = verifiedSource('UCAT ANZ dates and fees', 'https://www.ucat.edu.au/about-ucat-anz/ucat-anz-test-cycle/', '2026')
const OXFORD_TMUA_DATES_SOURCE = verifiedSource('Oxford Mathematics TMUA dates', 'https://www.ox.ac.uk/admissions/undergraduate/courses/course-listing/mathematics', '2027 entry')

export const ADMISSIONS_TEST_SESSIONS: AdmissionsTestSession[] = [
  { id: 'sat-2026-09-12', test: 'SAT', label: '12 September 2026 SAT', registrationDeadline: '2026-08-28T23:59:00-04:00', testStartsAt: '2026-09-12T07:45:00-04:00', testEndsAt: '2026-09-12T13:00:00-04:00', deliveryModes: ['TEST_CENTRE'], status: 'BOOKING_CLOSED', bookingUrl: 'https://mysat.collegeboard.org/', source: SAT_DATES_SOURCE },
  { id: 'sat-2026-10-03', test: 'SAT', label: '3 October 2026 SAT', registrationDeadline: '2026-09-18T23:59:00-04:00', lateRegistrationDeadline: '2026-09-22T23:59:00-04:00', testStartsAt: '2026-10-03T07:45:00-04:00', testEndsAt: '2026-10-03T13:00:00-04:00', deliveryModes: ['TEST_CENTRE'], status: 'BOOKING_OPEN', bookingUrl: 'https://mysat.collegeboard.org/', source: SAT_DATES_SOURCE },
  { id: 'sat-2026-11-07', test: 'SAT', label: '7 November 2026 SAT', registrationDeadline: '2026-10-23T23:59:00-04:00', lateRegistrationDeadline: '2026-10-27T23:59:00-04:00', testStartsAt: '2026-11-07T07:45:00-05:00', testEndsAt: '2026-11-07T13:00:00-05:00', deliveryModes: ['TEST_CENTRE'], status: 'UPCOMING', bookingUrl: 'https://mysat.collegeboard.org/', source: SAT_DATES_SOURCE },
  { id: 'ucat-2026', test: 'UCAT', label: 'UCAT 2026 testing window', countryCodes: ['GB'], registrationOpensAt: '2026-05-20T00:00:00+01:00', bookingOpensAt: '2026-06-23T14:00:00+01:00', registrationDeadline: '2026-09-16T15:00:00+01:00', testStartsAt: '2026-07-13T00:00:00+01:00', testEndsAt: '2026-09-24T23:59:00+01:00', deliveryModes: ['TEST_CENTRE'], status: 'BOOKING_OPEN', bookingUrl: 'https://ucat.useclarus.com/', source: UCAT_DATES_SOURCE },
  { id: 'ucat-anz-2026', test: 'UCAT_ANZ', label: 'UCAT ANZ 2026 testing window', countryCodes: ['AU'], registrationOpensAt: '2026-02-16T00:00:00+10:00', bookingOpensAt: '2026-03-03T00:00:00+10:00', registrationDeadline: '2026-06-05T23:59:00+10:00', testStartsAt: '2026-07-01T00:00:00+10:00', testEndsAt: '2026-08-05T23:59:00+10:00', deliveryModes: ['TEST_CENTRE'], status: 'COMPLETED', bookingUrl: 'https://wsr.pearsonvue.com/testtaker/signin/SignInPage/UMAT', source: UCAT_ANZ_DATES_SOURCE },
  { id: 'tmua-oxford-2027-entry', test: 'TMUA', label: 'Oxford 2027 entry TMUA window', countryCodes: ['GB'], registrationOpensAt: '2026-06-01T15:00:00+01:00', bookingOpensAt: '2026-07-20T00:00:00+01:00', registrationDeadline: '2026-09-28T18:00:00+01:00', testStartsAt: '2026-10-12T00:00:00+01:00', testEndsAt: '2026-10-16T23:59:00+01:00', deliveryModes: ['TEST_CENTRE'], status: 'BOOKING_OPEN', bookingUrl: 'https://esat-tmua.ac.uk/register/', source: OXFORD_TMUA_DATES_SOURCE }
]

export const ADMISSIONS_TEST_FEES: AdmissionsTestFee[] = [
  { id: 'sat-us-2026', test: 'SAT', amount: 68, currency: 'USD', regionLabel: 'United States', countryCodes: ['US'], validFrom: '2026-06-01', validUntil: '2027-06-05', source: verifiedSource('SAT test fees', 'https://satsuite.collegeboard.org/sat/registration/fees-refunds/test-fees', '2026-2027') },
  { id: 'ucat-uk-2026', test: 'UCAT', amount: 70, currency: 'GBP', regionLabel: 'Tests taken in the UK', countryCodes: ['GB'], validFrom: '2026-05-20', validUntil: '2026-09-24', source: UCAT_DATES_SOURCE },
  { id: 'ucat-outside-uk-2026', test: 'UCAT', amount: 115, currency: 'GBP', regionLabel: 'Tests taken outside the UK', validFrom: '2026-05-20', validUntil: '2026-09-24', source: UCAT_DATES_SOURCE },
  { id: 'ucat-anz-local-2026', test: 'UCAT_ANZ', amount: 335, currency: 'AUD', regionLabel: 'Tests taken in Australia or New Zealand', countryCodes: ['AU'], validFrom: '2026-02-16', validUntil: '2026-08-05', source: UCAT_ANZ_DATES_SOURCE },
  { id: 'ucat-anz-overseas-2026', test: 'UCAT_ANZ', amount: 405, currency: 'AUD', regionLabel: 'Tests taken outside Australia and New Zealand', validFrom: '2026-02-16', validUntil: '2026-08-05', source: UCAT_ANZ_DATES_SOURCE }
]