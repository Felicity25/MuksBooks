import type { Programme } from './types.ts'
import { SCALE_CATALOGUE_DEPTH } from './catalogue-scale-data.ts'

const CHECKED_AT = '2026-09-10'

type ProgrammeSeed = {
  id: string
  institutionId: string
  name: string
  normalizedName: string
  faculty: string
  studyAreas: string[]
  sourceUrl: string
  country: string
  region: string
  campus: string
  degreeType?: string
  duration?: string
  department?: string
  majors?: string[]
  specialisations?: string[]
  streams?: string[]
  aliases?: string[]
}

function reviewedProgramme(seed: ProgrammeSeed): Programme {
  const searchableTerms = [seed.normalizedName, ...seed.studyAreas, ...(seed.majors ?? []), ...(seed.specialisations ?? []), ...(seed.streams ?? [])]
  return {
    id: seed.id,
    institutionId: seed.institutionId,
    name: seed.name,
    normalizedName: seed.normalizedName,
    aliases: seed.aliases ?? seed.studyAreas,
    qualification: seed.name,
    degreeType: seed.degreeType ?? 'Bachelor',
    qualificationLevel: 'Undergraduate',
    faculty: seed.faculty,
    department: seed.department,
    majors: seed.majors,
    specialisations: seed.specialisations,
    streams: seed.streams,
    studyAreas: seed.studyAreas,
    industryAreas: seed.studyAreas,
    tags: Array.from(new Set(searchableTerms.flatMap((term) => [term.toLowerCase(), ...term.toLowerCase().split(/\s+/)]))),
    country: seed.country,
    region: seed.region,
    campus: seed.campus,
    deliveryMode: 'Check official course finder',
    duration: seed.duration,
    intakeYears: [2027],
    officialProgrammeUrl: seed.sourceUrl,
    curriculumRequirements: ['Requirements vary by curriculum and intake. Confirm them in the official course finder.'],
    prerequisiteSubjects: [],
    entryRequirements: ['Check the official programme entry for current prerequisites and selection requirements.'],
    applicationInformation: 'Programme structure was reviewed against the current official undergraduate catalogue. Confirm the current intake, campus and requirements before applying.',
    active: true,
    sourceUrl: seed.sourceUrl,
    sourceType: 'official-course-finder',
    sourceAcademicYear: '2027',
    admissionsCycle: '2027',
    confidenceStatus: 'VERIFIED_OFFICIAL',
    lastCheckedAt: CHECKED_AT,
    lastVerifiedAt: CHECKED_AT
  }
}

const UCT_COURSES = 'https://uct.ac.za/students/study-uct-degrees-diplomas-uct'
const WITS_COURSES = 'https://www.wits.ac.za/course-finder/undergraduate/'
const MONASH_COURSES = 'https://www.monash.edu/study/courses/find-a-course'
const MELBOURNE_COURSES = 'https://study.unimelb.edu.au/find/courses/undergraduate'
const UNSW_COURSES = 'https://www.unsw.edu.au/study/find-a-degree-or-course'

const uct = (seed: Omit<ProgrammeSeed, 'institutionId' | 'sourceUrl' | 'country' | 'region' | 'campus'>) => reviewedProgramme({ ...seed, institutionId: 'uct', sourceUrl: UCT_COURSES, country: 'South Africa', region: 'Western Cape', campus: 'Cape Town' })
const wits = (seed: Omit<ProgrammeSeed, 'institutionId' | 'sourceUrl' | 'country' | 'region' | 'campus'>) => reviewedProgramme({ ...seed, institutionId: 'wits', sourceUrl: WITS_COURSES, country: 'South Africa', region: 'Gauteng', campus: 'Johannesburg' })
const monash = (seed: Omit<ProgrammeSeed, 'institutionId' | 'sourceUrl' | 'country' | 'region' | 'campus'>) => reviewedProgramme({ ...seed, institutionId: 'monash', sourceUrl: MONASH_COURSES, country: 'Australia', region: 'Victoria', campus: 'Clayton' })
const melbourne = (seed: Omit<ProgrammeSeed, 'institutionId' | 'sourceUrl' | 'country' | 'region' | 'campus'>) => reviewedProgramme({ ...seed, institutionId: 'unimelb', sourceUrl: MELBOURNE_COURSES, country: 'Australia', region: 'Victoria', campus: 'Parkville' })
const unsw = (seed: Omit<ProgrammeSeed, 'institutionId' | 'sourceUrl' | 'country' | 'region' | 'campus'>) => reviewedProgramme({ ...seed, institutionId: 'unsw', sourceUrl: UNSW_COURSES, country: 'Australia', region: 'New South Wales', campus: 'Kensington' })

const REVIEWED_CORE_DEPTH: Programme[] = [
  uct({ id: 'uct-bcom', name: 'Bachelor of Commerce', normalizedName: 'commerce', faculty: 'Commerce', studyAreas: ['Commerce', 'Accounting', 'Economics', 'Finance', 'Management'], specialisations: ['Accounting', 'Economics and Finance', 'Information Systems', 'Management Studies', 'Statistics and Data Science'] }),
  uct({ id: 'uct-bbus-science', name: 'Bachelor of Business Science', normalizedName: 'business science', faculty: 'Commerce', studyAreas: ['Business Science', 'Actuarial Science', 'Analytics', 'Finance'], specialisations: ['Actuarial Science', 'Analytics', 'Economics', 'Finance', 'Marketing'] }),
  uct({ id: 'uct-bsc', name: 'Bachelor of Science', normalizedName: 'science', faculty: 'Science', studyAreas: ['Science', 'Computer Science', 'Data Science', 'Mathematics', 'Statistics', 'Physics'], majors: ['Applied Mathematics', 'Astrophysics', 'Computer Science', 'Data Science', 'Mathematics', 'Ocean and Atmospheric Science', 'Physics', 'Statistics'] }),
  uct({ id: 'uct-bsc-engineering', name: 'Bachelor of Science in Engineering', normalizedName: 'engineering', faculty: 'Engineering and the Built Environment', studyAreas: ['Engineering'], streams: ['Chemical Engineering', 'Civil Engineering', 'Electrical Engineering', 'Mechanical and Mechatronic Engineering'] }),
  uct({ id: 'uct-bas', name: 'Bachelor of Architectural Studies', normalizedName: 'architecture', faculty: 'Engineering and the Built Environment', studyAreas: ['Architecture', 'Built Environment'] }),
  uct({ id: 'uct-bsc-construction-studies', name: 'Bachelor of Science in Construction Studies', normalizedName: 'construction studies', faculty: 'Engineering and the Built Environment', studyAreas: ['Construction', 'Built Environment'] }),
  uct({ id: 'uct-bsc-property-studies', name: 'Bachelor of Science in Property Studies', normalizedName: 'property studies', faculty: 'Engineering and the Built Environment', studyAreas: ['Property', 'Built Environment'] }),
  uct({ id: 'uct-ba', name: 'Bachelor of Arts', normalizedName: 'arts', faculty: 'Humanities', studyAreas: ['Arts', 'Humanities', 'Languages', 'Politics'], majors: ['African Languages and Literatures', 'English', 'Film and Television Studies', 'History', 'Linguistics', 'Politics', 'Psychology'] }),
  uct({ id: 'uct-bsocsci', name: 'Bachelor of Social Science', normalizedName: 'social science', faculty: 'Humanities', studyAreas: ['Social Science', 'Economics', 'Politics', 'Psychology'], majors: ['Economics', 'Gender Studies', 'Politics and Governance', 'Psychology', 'Sociology'] }),
  uct({ id: 'uct-llb', name: 'Bachelor of Laws', normalizedName: 'law', faculty: 'Law', studyAreas: ['Law'], degreeType: 'LLB' }),
  uct({ id: 'uct-bsc-audiology', name: 'Bachelor of Science in Audiology', normalizedName: 'audiology', faculty: 'Health Sciences', studyAreas: ['Audiology', 'Health Sciences'] }),
  uct({ id: 'uct-bsc-occupational-therapy', name: 'Bachelor of Science in Occupational Therapy', normalizedName: 'occupational therapy', faculty: 'Health Sciences', studyAreas: ['Occupational Therapy', 'Health Sciences'] }),
  uct({ id: 'uct-bsc-physiotherapy', name: 'Bachelor of Science in Physiotherapy', normalizedName: 'physiotherapy', faculty: 'Health Sciences', studyAreas: ['Physiotherapy', 'Health Sciences'] }),
  uct({ id: 'uct-bsc-speech-language-pathology', name: 'Bachelor of Science in Speech-Language Pathology', normalizedName: 'speech-language pathology', faculty: 'Health Sciences', studyAreas: ['Speech Pathology', 'Health Sciences'] }),

  wits({ id: 'wits-bcom', name: 'Bachelor of Commerce', normalizedName: 'commerce', faculty: 'Commerce, Law and Management', studyAreas: ['Commerce', 'Business', 'Finance'], majors: ['Finance', 'Information Systems', 'Insurance and Risk Management', 'Management', 'Marketing'] }),
  wits({ id: 'wits-baccsci', name: 'Bachelor of Accounting Science', normalizedName: 'accounting science', faculty: 'Commerce, Law and Management', studyAreas: ['Accounting', 'Commerce'] }),
  wits({ id: 'wits-beconsci', name: 'Bachelor of Economic Science', normalizedName: 'economic science', faculty: 'Commerce, Law and Management', studyAreas: ['Economics', 'Actuarial Science', 'Statistics'], majors: ['Actuarial Science', 'Computational and Applied Mathematics', 'Economic Science', 'Statistics'] }),
  wits({ id: 'wits-llb', name: 'Bachelor of Laws', normalizedName: 'law', faculty: 'Commerce, Law and Management', studyAreas: ['Law'], degreeType: 'LLB' }),
  wits({ id: 'wits-bsc', name: 'Bachelor of Science', normalizedName: 'science', faculty: 'Science', studyAreas: ['Science', 'Computer Science', 'Data Science', 'Mathematics'], majors: ['Computer Science', 'Data Science', 'Mathematics of Finance', 'Physics', 'Statistics'] }),
  wits({ id: 'wits-bsc-engineering', name: 'Bachelor of Science in Engineering', normalizedName: 'engineering', faculty: 'Engineering and the Built Environment', studyAreas: ['Engineering'], streams: ['Aeronautical Engineering', 'Chemical Engineering', 'Civil Engineering', 'Electrical Engineering', 'Industrial Engineering', 'Mechanical Engineering', 'Metallurgy and Materials Engineering', 'Mining Engineering'] }),
  wits({ id: 'wits-bas', name: 'Bachelor of Architectural Studies', normalizedName: 'architecture', faculty: 'Engineering and the Built Environment', studyAreas: ['Architecture', 'Built Environment'] }),
  wits({ id: 'wits-bsc-construction-studies', name: 'Bachelor of Science in Construction Studies', normalizedName: 'construction studies', faculty: 'Engineering and the Built Environment', studyAreas: ['Construction', 'Built Environment'] }),
  wits({ id: 'wits-ba', name: 'Bachelor of Arts', normalizedName: 'arts', faculty: 'Humanities', studyAreas: ['Arts', 'Humanities', 'Psychology', 'Politics'], majors: ['International Relations', 'Media Studies', 'Philosophy', 'Political Studies', 'Psychology', 'Sociology'] }),
  wits({ id: 'wits-bed', name: 'Bachelor of Education', normalizedName: 'education', faculty: 'Humanities', studyAreas: ['Education', 'Teaching'], streams: ['Foundation Phase Teaching', 'Intermediate Phase Teaching', 'Senior Phase and Further Education and Training Teaching'] }),
  wits({ id: 'wits-bhsc', name: 'Bachelor of Health Sciences', normalizedName: 'health sciences', faculty: 'Health Sciences', studyAreas: ['Health Sciences', 'Biomedical Science'], majors: ['Biokinetics', 'Biomedical Sciences', 'Health Systems Sciences'] }),
  wits({ id: 'wits-mbbch', name: 'Bachelor of Medicine and Bachelor of Surgery', normalizedName: 'medicine', faculty: 'Health Sciences', studyAreas: ['Medicine', 'Health Sciences'], degreeType: 'MBBCh', duration: '6 years' }),
  wits({ id: 'wits-bnursing', name: 'Bachelor of Nursing', normalizedName: 'nursing', faculty: 'Health Sciences', studyAreas: ['Nursing', 'Health Sciences'] }),

  melbourne({ id: 'unimelb-ba', name: 'Bachelor of Arts', normalizedName: 'arts', faculty: 'Arts', studyAreas: ['Arts', 'Humanities', 'Social Science'], majors: ['Economics', 'English and Theatre Studies', 'History', 'International Studies', 'Media and Communications', 'Politics and International Studies', 'Psychology', 'Sociology'] }),
  melbourne({ id: 'unimelb-bcom', name: 'Bachelor of Commerce', normalizedName: 'commerce', faculty: 'Business and Economics', studyAreas: ['Commerce', 'Actuarial Science', 'Business Analytics', 'Economics', 'Finance'], majors: ['Accounting', 'Actuarial Studies', 'Business Analytics', 'Economics', 'Finance', 'Management', 'Marketing'] }),
  melbourne({ id: 'unimelb-bdesign', name: 'Bachelor of Design', normalizedName: 'design', faculty: 'Architecture, Building and Planning', studyAreas: ['Design', 'Architecture', 'Built Environment', 'Computer Science'], majors: ['Architecture', 'Civil Systems', 'Computing', 'Construction', 'Digital Technologies', 'Landscape Architecture', 'Property', 'Urban Planning'] }),
  melbourne({ id: 'unimelb-bbiomed', name: 'Bachelor of Biomedicine', normalizedName: 'biomedicine', faculty: 'Medicine, Dentistry and Health Sciences', studyAreas: ['Biomedicine', 'Health Sciences'], majors: ['Bioengineering Systems', 'Biomedical Engineering Systems', 'Genetics', 'Human Structure and Function', 'Immunology', 'Neuroscience'] }),
  melbourne({ id: 'unimelb-bsc', name: 'Bachelor of Science', normalizedName: 'science', faculty: 'Science', studyAreas: ['Science', 'Computer Science', 'Data Science', 'Engineering', 'Mathematics'], majors: ['Computing and Software Systems', 'Data Science', 'Electrical Systems', 'Mathematics and Statistics', 'Mechanical Systems', 'Physics', 'Psychology'] }),

  monash({ id: 'monash-bachelor-of-commerce', name: 'Bachelor of Commerce', normalizedName: 'commerce', faculty: 'Business and Economics', studyAreas: ['Commerce', 'Accounting', 'Actuarial Science', 'Business Analytics', 'Economics', 'Finance'], majors: ['Accounting', 'Actuarial Studies', 'Behavioural Commerce', 'Business Analytics', 'Econometrics', 'Economics', 'Finance', 'Management Studies', 'Marketing Science', 'Sustainability'] }),
  monash({ id: 'monash-bachelor-of-business', name: 'Bachelor of Business', normalizedName: 'business', faculty: 'Business and Economics', studyAreas: ['Business', 'Accounting', 'Banking', 'Marketing'], majors: ['Accounting', 'Banking and Finance', 'Business Analytics and Statistics', 'Business Law', 'Economics and Business Strategy', 'Human Resource Management', 'Marketing'] }),
  monash({ id: 'monash-bachelor-of-computer-science', name: 'Bachelor of Computer Science', normalizedName: 'computer science', faculty: 'Information Technology', studyAreas: ['Computer Science', 'Data Science'], specialisations: ['Advanced Computer Science', 'Data Science'] }),
  monash({ id: 'monash-bachelor-of-information-technology', name: 'Bachelor of Information Technology', normalizedName: 'information technology', faculty: 'Information Technology', studyAreas: ['Information Technology', 'Computer Science', 'Cybersecurity'], majors: ['Business Information Systems', 'Computer Networks and Security', 'Cybersecurity', 'Games and Immersive Media', 'Software Development'] }),
  monash({ id: 'monash-bachelor-of-science', name: 'Bachelor of Science', normalizedName: 'science', faculty: 'Science', studyAreas: ['Science', 'Data Science', 'Mathematics'], majors: ['Applied Mathematics', 'Chemistry', 'Computational Science', 'Data Science', 'Ecology and Conservation Biology', 'Genetics and Genomics', 'Mathematical Statistics', 'Physics'] }),
  monash({ id: 'monash-bachelor-of-laws-honours', name: 'Bachelor of Laws (Honours)', normalizedName: 'law', faculty: 'Law', studyAreas: ['Law'], degreeType: 'LLB' }),
  monash({ id: 'monash-commerce-computer-science', name: 'Bachelor of Commerce and Bachelor of Computer Science', normalizedName: 'commerce and computer science', faculty: 'Business and Economics / Information Technology', studyAreas: ['Commerce', 'Computer Science', 'Business Analytics', 'Data Science'], degreeType: 'Double degree', duration: '4 years' }),
  monash({ id: 'monash-commerce-science', name: 'Bachelor of Commerce and Bachelor of Science', normalizedName: 'commerce and science', faculty: 'Business and Economics / Science', studyAreas: ['Commerce', 'Science', 'Actuarial Science', 'Data Science'], degreeType: 'Double degree', duration: '4 years' }),
  monash({ id: 'monash-engineering-commerce', name: 'Bachelor of Engineering (Honours) and Bachelor of Commerce', normalizedName: 'engineering and commerce', faculty: 'Engineering / Business and Economics', studyAreas: ['Engineering', 'Commerce', 'Finance'], degreeType: 'Double degree', duration: '5 years' }),
  monash({ id: 'monash-engineering-computer-science', name: 'Bachelor of Engineering (Honours) and Bachelor of Computer Science', normalizedName: 'engineering and computer science', faculty: 'Engineering / Information Technology', studyAreas: ['Engineering', 'Computer Science', 'Software Engineering'], degreeType: 'Double degree', duration: '5 years' }),
  monash({ id: 'monash-laws-commerce', name: 'Bachelor of Laws (Honours) and Bachelor of Commerce', normalizedName: 'law and commerce', faculty: 'Law / Business and Economics', studyAreas: ['Law', 'Commerce'], degreeType: 'Double degree', duration: '5 years' }),
  monash({ id: 'monash-laws-computer-science', name: 'Bachelor of Laws (Honours) and Bachelor of Computer Science', normalizedName: 'law and computer science', faculty: 'Law / Information Technology', studyAreas: ['Law', 'Computer Science'], degreeType: 'Double degree', duration: '5 years' }),

  unsw({ id: 'unsw-bachelor-of-commerce', name: 'Bachelor of Commerce', normalizedName: 'commerce', faculty: 'UNSW Business School', studyAreas: ['Commerce', 'Accounting', 'Business Analytics', 'Economics', 'Finance'], majors: ['Accounting', 'Business Analytics', 'Economics', 'Finance', 'Financial Technology', 'Human Resource Management', 'Information Systems', 'International Business', 'Marketing', 'Taxation'] }),
  unsw({ id: 'unsw-bachelor-of-economics', name: 'Bachelor of Economics', normalizedName: 'economics', faculty: 'UNSW Business School', studyAreas: ['Economics', 'Econometrics', 'Finance'], majors: ['Econometrics', 'Economics', 'Financial Economics'] }),
  unsw({ id: 'unsw-bachelor-of-actuarial-studies', name: 'Bachelor of Actuarial Studies', normalizedName: 'actuarial science', faculty: 'UNSW Business School', studyAreas: ['Actuarial Science', 'Risk', 'Finance'] }),
  unsw({ id: 'unsw-bachelor-of-data-science-and-decisions', name: 'Bachelor of Data Science and Decisions', normalizedName: 'data science', faculty: 'Science', studyAreas: ['Data Science', 'Computer Science', 'Mathematics', 'Statistics'], majors: ['Business Data Science', 'Computational Data Science', 'Quantitative Data Science'] }),
  unsw({ id: 'unsw-bachelor-of-engineering-honours', name: 'Bachelor of Engineering (Honours)', normalizedName: 'engineering', faculty: 'Engineering', studyAreas: ['Engineering'], specialisations: ['Aerospace Engineering', 'Bioinformatics Engineering', 'Chemical Engineering', 'Civil Engineering', 'Computer Engineering', 'Electrical Engineering', 'Environmental Engineering', 'Mechanical Engineering', 'Mining Engineering', 'Renewable Energy Engineering', 'Software Engineering'] }),
  unsw({ id: 'unsw-bachelor-of-science', name: 'Bachelor of Science', normalizedName: 'science', faculty: 'Science', studyAreas: ['Science', 'Computer Science', 'Data Science', 'Mathematics'], majors: ['Anatomy', 'Biochemistry and Molecular Biology', 'Biology', 'Chemistry', 'Computer Science', 'Data Science', 'Mathematics', 'Microbiology', 'Physics', 'Statistics'] }),
  unsw({ id: 'unsw-commerce-computer-science', name: 'Bachelor of Commerce / Bachelor of Computer Science', normalizedName: 'commerce and computer science', faculty: 'UNSW Business School / Engineering', studyAreas: ['Commerce', 'Computer Science', 'Business Analytics'], degreeType: 'Double degree' }),
  unsw({ id: 'unsw-actuarial-studies-computer-science', name: 'Bachelor of Actuarial Studies / Bachelor of Computer Science', normalizedName: 'actuarial science and computer science', faculty: 'UNSW Business School / Engineering', studyAreas: ['Actuarial Science', 'Computer Science', 'Data Science'], degreeType: 'Double degree' }),
  unsw({ id: 'unsw-engineering-commerce', name: 'Bachelor of Engineering (Honours) / Bachelor of Commerce', normalizedName: 'engineering and commerce', faculty: 'Engineering / UNSW Business School', studyAreas: ['Engineering', 'Commerce'], degreeType: 'Double degree' }),
  unsw({ id: 'unsw-engineering-computer-science', name: 'Bachelor of Engineering (Honours) / Bachelor of Computer Science', normalizedName: 'engineering and computer science', faculty: 'Engineering', studyAreas: ['Engineering', 'Computer Science', 'Software Engineering'], degreeType: 'Double degree' }),
  unsw({ id: 'unsw-laws-commerce', name: 'Bachelor of Laws / Bachelor of Commerce', normalizedName: 'law and commerce', faculty: 'Law & Justice / UNSW Business School', studyAreas: ['Law', 'Commerce'], degreeType: 'Double degree' }),
  unsw({ id: 'unsw-laws-computer-science', name: 'Bachelor of Laws / Bachelor of Computer Science', normalizedName: 'law and computer science', faculty: 'Law & Justice / Engineering', studyAreas: ['Law', 'Computer Science'], degreeType: 'Double degree' })
]

type CompactProgrammeSeed = [
  id: string,
  name: string,
  normalizedName: string,
  faculty: string,
  studyAreas: string[],
  degreeType?: string,
  majors?: string[]
]

type InstitutionDepthSeed = {
  institutionId: string
  sourceUrl: string
  country: string
  region: string
  campus: string
  programmes: CompactProgrammeSeed[]
}

function reviewedInstitutionDepth(seed: InstitutionDepthSeed) {
  return seed.programmes.map(([id, name, normalizedName, faculty, studyAreas, degreeType, majors]) => reviewedProgramme({
    id,
    name,
    normalizedName,
    faculty,
    studyAreas,
    degreeType,
    majors,
    institutionId: seed.institutionId,
    sourceUrl: seed.sourceUrl,
    country: seed.country,
    region: seed.region,
    campus: seed.campus
  }))
}

const ADDITIONAL_PRIORITY_DEPTH: InstitutionDepthSeed[] = [
  {
    institutionId: 'uj', sourceUrl: 'https://www.uj.ac.za/faculties/', country: 'South Africa', region: 'Gauteng', campus: 'Johannesburg', programmes: [
      ['uj-bcom-accountancy', 'Bachelor of Commerce in Accountancy', 'accountancy', 'College of Business and Economics', ['Accounting', 'Commerce']],
      ['uj-bcom-business-management', 'Bachelor of Commerce in Business Management', 'business management', 'College of Business and Economics', ['Business', 'Management']],
      ['uj-bcom-economics-econometrics', 'Bachelor of Commerce in Economics and Econometrics', 'economics and econometrics', 'College of Business and Economics', ['Economics', 'Econometrics']],
      ['uj-bcom-finance', 'Bachelor of Commerce in Finance', 'finance', 'College of Business and Economics', ['Finance', 'Commerce']],
      ['uj-bengtech-civil', 'Bachelor of Engineering Technology in Civil Engineering', 'civil engineering', 'Engineering and the Built Environment', ['Civil Engineering', 'Engineering']],
      ['uj-bengtech-electrical', 'Bachelor of Engineering Technology in Electrical Engineering', 'electrical engineering', 'Engineering and the Built Environment', ['Electrical Engineering', 'Engineering']],
      ['uj-bsc-information-technology', 'Bachelor of Science in Information Technology', 'information technology', 'Science', ['Information Technology', 'Computer Science']],
      ['uj-ba-strategic-communication', 'Bachelor of Arts in Strategic Communication', 'strategic communication', 'Humanities', ['Communication', 'Humanities']]
    ]
  },
  {
    institutionId: 'up', sourceUrl: 'https://www.up.ac.za/programmes/programmes', country: 'South Africa', region: 'Gauteng', campus: 'Pretoria', programmes: [
      ['up-bcom-accounting-sciences', 'Bachelor of Commerce in Accounting Sciences', 'accounting sciences', 'Economic and Management Sciences', ['Accounting', 'Commerce']],
      ['up-bcom-investment-management', 'Bachelor of Commerce in Investment Management', 'investment management', 'Economic and Management Sciences', ['Finance', 'Investment']],
      ['up-bcom-statistics-data-science', 'Bachelor of Commerce in Statistics and Data Science', 'statistics and data science', 'Economic and Management Sciences', ['Statistics', 'Data Science', 'Commerce']],
      ['up-beng-chemical', 'Bachelor of Engineering in Chemical Engineering', 'chemical engineering', 'Engineering, Built Environment and Information Technology', ['Chemical Engineering', 'Engineering']],
      ['up-beng-industrial', 'Bachelor of Engineering in Industrial Engineering', 'industrial engineering', 'Engineering, Built Environment and Information Technology', ['Industrial Engineering', 'Engineering']],
      ['up-bsc-architecture', 'Bachelor of Science in Architecture', 'architecture', 'Engineering, Built Environment and Information Technology', ['Architecture', 'Built Environment']],
      ['up-bsc-mathematical-statistics', 'Bachelor of Science in Mathematical Statistics', 'mathematical statistics', 'Natural and Agricultural Sciences', ['Mathematics', 'Statistics']],
      ['up-bvsc', 'Bachelor of Veterinary Science', 'veterinary science', 'Veterinary Science', ['Veterinary Science', 'Health Sciences']]
    ]
  },
  {
    institutionId: 'stellenbosch', sourceUrl: 'https://www.sun.ac.za/english/maties/Pages/Undergraduate-Programmes.aspx', country: 'South Africa', region: 'Western Cape', campus: 'Stellenbosch', programmes: [
      ['stellenbosch-bacc', 'Bachelor of Accounting', 'accounting', 'Economic and Management Sciences', ['Accounting', 'Commerce']],
      ['stellenbosch-bcom-management-sciences', 'Bachelor of Commerce in Management Sciences', 'management sciences', 'Economic and Management Sciences', ['Management', 'Commerce']],
      ['stellenbosch-beng-chemical', 'Bachelor of Engineering in Chemical Engineering', 'chemical engineering', 'Engineering', ['Chemical Engineering', 'Engineering']],
      ['stellenbosch-beng-electrical-electronic', 'Bachelor of Engineering in Electrical and Electronic Engineering', 'electrical and electronic engineering', 'Engineering', ['Electrical Engineering', 'Engineering']],
      ['stellenbosch-beng-data-engineering', 'Bachelor of Engineering in Data Engineering', 'data engineering', 'Engineering', ['Data Science', 'Engineering', 'Computer Science']],
      ['stellenbosch-bsc-computer-science', 'Bachelor of Science in Computer Science', 'computer science', 'Science', ['Computer Science', 'Data Science']],
      ['stellenbosch-bscagric', 'Bachelor of Science in Agriculture', 'agricultural science', 'AgriSciences', ['Agriculture', 'Science']],
      ['stellenbosch-mbchb', 'Bachelor of Medicine and Bachelor of Surgery', 'medicine', 'Medicine and Health Sciences', ['Medicine', 'Health Sciences'], 'MBChB']
    ]
  },
  {
    institutionId: 'usyd', sourceUrl: 'https://www.sydney.edu.au/courses/subject-areas/major.html', country: 'Australia', region: 'New South Wales', campus: 'Camperdown', programmes: [
      ['usyd-bachelor-of-commerce', 'Bachelor of Commerce', 'commerce', 'Business School', ['Commerce', 'Accounting', 'Business Analytics', 'Finance'], undefined, ['Accounting', 'Banking', 'Business Analytics', 'Finance', 'Industrial Relations and Human Resource Management', 'Innovation and Entrepreneurship', 'Marketing']],
      ['usyd-bachelor-of-science', 'Bachelor of Science', 'science', 'Science', ['Science', 'Computer Science', 'Data Science', 'Mathematics'], undefined, ['Computer Science', 'Data Science', 'Financial Mathematics and Statistics', 'Physics', 'Psychology', 'Software Development']],
      ['usyd-bachelor-of-engineering-honours', 'Bachelor of Engineering Honours', 'engineering', 'Engineering', ['Engineering'], undefined, ['Aeronautical Engineering', 'Biomedical Engineering', 'Chemical and Biomolecular Engineering', 'Civil Engineering', 'Electrical Engineering', 'Mechanical Engineering', 'Software Engineering']],
      ['usyd-bachelor-of-advanced-computing', 'Bachelor of Advanced Computing', 'advanced computing', 'Engineering', ['Computer Science', 'Data Science', 'Cybersecurity'], undefined, ['Computer Science', 'Computational Data Science', 'Cybersecurity', 'Software Development']],
      ['usyd-commerce-advanced-studies', 'Bachelor of Commerce and Bachelor of Advanced Studies', 'commerce and advanced studies', 'Business School', ['Commerce', 'Business Analytics', 'Finance'], 'Double degree'],
      ['usyd-engineering-commerce', 'Bachelor of Engineering Honours and Bachelor of Commerce', 'engineering and commerce', 'Engineering / Business School', ['Engineering', 'Commerce'], 'Double degree'],
      ['usyd-laws-commerce', 'Bachelor of Commerce and Bachelor of Laws', 'commerce and law', 'Business School / Law School', ['Commerce', 'Law'], 'Double degree'],
      ['usyd-advanced-computing-commerce', 'Bachelor of Advanced Computing and Bachelor of Commerce', 'advanced computing and commerce', 'Engineering / Business School', ['Computer Science', 'Commerce', 'Business Analytics'], 'Double degree']
    ]
  },
  {
    institutionId: 'uq', sourceUrl: 'https://study.uq.edu.au/study-options/programs', country: 'Australia', region: 'Queensland', campus: 'St Lucia', programmes: [
      ['uq-bachelor-of-commerce', 'Bachelor of Commerce', 'commerce', 'Business, Economics and Law', ['Commerce', 'Accounting', 'Business Analytics', 'Finance'], undefined, ['Accounting', 'Business Analytics', 'Business Information Systems', 'Finance']],
      ['uq-bachelor-of-computer-science', 'Bachelor of Computer Science', 'computer science', 'Engineering, Architecture and Information Technology', ['Computer Science', 'Data Science', 'Cybersecurity'], undefined, ['Cyber Security', 'Data Science', 'Machine Learning', 'Programming Languages']],
      ['uq-bachelor-of-engineering-honours', 'Bachelor of Engineering (Honours)', 'engineering', 'Engineering, Architecture and Information Technology', ['Engineering'], undefined, ['Chemical Engineering', 'Civil Engineering', 'Electrical Engineering', 'Mechanical Engineering', 'Mechatronic Engineering', 'Software Engineering']],
      ['uq-bachelor-of-science', 'Bachelor of Science', 'science', 'Science', ['Science', 'Data Science', 'Mathematics'], undefined, ['Data Science', 'Mathematics', 'Physics', 'Statistics']],
      ['uq-engineering-commerce', 'Bachelor of Engineering (Honours) / Bachelor of Commerce', 'engineering and commerce', 'Engineering / Business, Economics and Law', ['Engineering', 'Commerce'], 'Double degree'],
      ['uq-computer-science-science', 'Bachelor of Computer Science / Bachelor of Science', 'computer science and science', 'Engineering / Science', ['Computer Science', 'Science', 'Data Science'], 'Double degree'],
      ['uq-laws-commerce', 'Bachelor of Laws (Honours) / Bachelor of Commerce', 'law and commerce', 'Law / Business, Economics and Law', ['Law', 'Commerce'], 'Double degree'],
      ['uq-business-management-international-studies', 'Bachelor of Business Management / Bachelor of International Studies', 'business management and international studies', 'Business, Economics and Law / Humanities', ['Business', 'International Relations'], 'Double degree']
    ]
  },
  {
    institutionId: 'oxford', sourceUrl: 'https://www.ox.ac.uk/admissions/undergraduate/courses/course-listing', country: 'United Kingdom', region: 'England', campus: 'Oxford', programmes: [
      ['oxford-computer-science', 'Computer Science', 'computer science', 'Mathematical, Physical and Life Sciences', ['Computer Science']],
      ['oxford-economics-management', 'Economics and Management', 'economics and management', 'Social Sciences', ['Economics', 'Management']],
      ['oxford-engineering-science', 'Engineering Science', 'engineering science', 'Mathematical, Physical and Life Sciences', ['Engineering']],
      ['oxford-law', 'Law (Jurisprudence)', 'law', 'Social Sciences', ['Law'], 'BA'],
      ['oxford-medicine', 'Medicine', 'medicine', 'Medical Sciences', ['Medicine', 'Health Sciences'], 'BM BCh'],
      ['oxford-philosophy-politics-economics', 'Philosophy, Politics and Economics', 'philosophy politics and economics', 'Social Sciences', ['Philosophy', 'Politics', 'Economics']],
      ['oxford-physics', 'Physics', 'physics', 'Mathematical, Physical and Life Sciences', ['Physics', 'Science']],
      ['oxford-experimental-psychology', 'Experimental Psychology', 'experimental psychology', 'Medical Sciences', ['Psychology', 'Science']]
    ]
  },
  {
    institutionId: 'cambridge', sourceUrl: 'https://www.undergraduate.study.cam.ac.uk/courses', country: 'United Kingdom', region: 'England', campus: 'Cambridge', programmes: [
      ['cambridge-computer-science', 'Computer Science, BA (Hons) and MEng', 'computer science', 'Computer Science and Technology', ['Computer Science']],
      ['cambridge-economics', 'Economics, BA (Hons)', 'economics', 'Economics', ['Economics']],
      ['cambridge-human-social-political-sciences', 'Human, Social, and Political Sciences, BA (Hons)', 'human social and political sciences', 'Humanities and Social Sciences', ['Politics', 'Social Science']],
      ['cambridge-law', 'Law, BA (Hons)', 'law', 'Law', ['Law']],
      ['cambridge-mathematics', 'Mathematics, BA (Hons) and MMath', 'mathematics', 'Mathematics', ['Mathematics']],
      ['cambridge-medicine', 'Medicine, MB and BChir', 'medicine', 'Clinical Medicine', ['Medicine', 'Health Sciences'], 'MB BChir'],
      ['cambridge-natural-sciences', 'Natural Sciences, BA (Hons) and MSci', 'natural sciences', 'Biological and Physical Sciences', ['Science', 'Biological Sciences', 'Physics']],
      ['cambridge-psychological-behavioural-sciences', 'Psychological and Behavioural Sciences, BA (Hons)', 'psychological and behavioural sciences', 'Psychology', ['Psychology', 'Behavioural Science']]
    ]
  },
  {
    institutionId: 'ucl', sourceUrl: 'https://www.ucl.ac.uk/prospective-students/undergraduate/degrees', country: 'United Kingdom', region: 'England', campus: 'London', programmes: [
      ['ucl-architecture-bsc', 'Architecture BSc', 'architecture', 'The Bartlett', ['Architecture', 'Built Environment']],
      ['ucl-computer-science-bsc', 'Computer Science BSc', 'computer science', 'Engineering Sciences', ['Computer Science']],
      ['ucl-data-science-bsc', 'Data Science BSc', 'data science', 'Mathematical and Physical Sciences', ['Data Science', 'Statistics']],
      ['ucl-economics-bsc', 'Economics BSc', 'economics', 'Social and Historical Sciences', ['Economics']],
      ['ucl-engineering-mechanical-beng', 'Mechanical Engineering BEng', 'mechanical engineering', 'Engineering Sciences', ['Mechanical Engineering', 'Engineering']],
      ['ucl-law-llb', 'Law LLB', 'law', 'Laws', ['Law'], 'LLB'],
      ['ucl-medicine-mbbs', 'Medicine MBBS BSc', 'medicine', 'Medical Sciences', ['Medicine', 'Health Sciences'], 'MBBS'],
      ['ucl-psychology-bsc', 'Psychology BSc', 'psychology', 'Brain Sciences', ['Psychology']]
    ]
  },
  {
    institutionId: 'manchester', sourceUrl: 'https://www.manchester.ac.uk/study/undergraduate/courses/2027/', country: 'United Kingdom', region: 'England', campus: 'Manchester', programmes: [
      ['manchester-accounting-bsc', 'BSc Accounting', 'accounting', 'Alliance Manchester Business School', ['Accounting', 'Commerce']],
      ['manchester-computer-science-bsc', 'BSc Computer Science', 'computer science', 'Science and Engineering', ['Computer Science']],
      ['manchester-data-science-economics-bsc', 'BSc Data Science and Economics', 'data science and economics', 'Social Sciences', ['Data Science', 'Economics']],
      ['manchester-economics-bsc', 'BSc Economics', 'economics', 'Social Sciences', ['Economics']],
      ['manchester-electrical-electronic-engineering-beng', 'BEng Electrical and Electronic Engineering', 'electrical and electronic engineering', 'Science and Engineering', ['Electrical Engineering', 'Engineering']],
      ['manchester-law-llb', 'LLB Law', 'law', 'Social Sciences', ['Law'], 'LLB'],
      ['manchester-medicine-mbbs', 'MBChB Medicine', 'medicine', 'Biology, Medicine and Health', ['Medicine', 'Health Sciences'], 'MBChB'],
      ['manchester-psychology-bsc', 'BSc Psychology', 'psychology', 'Biology, Medicine and Health', ['Psychology']]
    ]
  },
  {
    institutionId: 'edinburgh', sourceUrl: 'https://study.ed.ac.uk/programmes/undergraduate', country: 'United Kingdom', region: 'Scotland', campus: 'Edinburgh', programmes: [
      ['edinburgh-artificial-intelligence-bsc', 'Artificial Intelligence BSc (Hons)', 'artificial intelligence', 'Science and Engineering', ['Artificial Intelligence', 'Computer Science']],
      ['edinburgh-business-management-ma', 'Business Management MA (Hons)', 'business management', 'Arts, Humanities and Social Sciences', ['Business', 'Management']],
      ['edinburgh-computer-science-bsc', 'Computer Science BSc (Hons)', 'computer science', 'Science and Engineering', ['Computer Science']],
      ['edinburgh-data-science-bsc', 'Data Science BSc (Hons)', 'data science', 'Science and Engineering', ['Data Science', 'Statistics']],
      ['edinburgh-economics-ma', 'Economics MA (Hons)', 'economics', 'Arts, Humanities and Social Sciences', ['Economics']],
      ['edinburgh-law-llb', 'Law LLB (Hons)', 'law', 'Arts, Humanities and Social Sciences', ['Law'], 'LLB'],
      ['edinburgh-medicine-mbchb', 'Medicine MBChB', 'medicine', 'Medicine and Veterinary Medicine', ['Medicine', 'Health Sciences'], 'MBChB'],
      ['edinburgh-software-engineering-beng', 'Software Engineering BEng (Hons)', 'software engineering', 'Science and Engineering', ['Software Engineering', 'Computer Science']]
    ]
  },
  {
    institutionId: 'utoronto', sourceUrl: 'https://future.utoronto.ca/academics/undergraduate-programs/', country: 'Canada', region: 'Ontario', campus: 'Toronto', programmes: [
      ['utoronto-architectural-studies', 'Architectural Studies', 'architectural studies', 'Architecture, Landscape, and Design', ['Architecture', 'Built Environment']],
      ['utoronto-commerce', 'Commerce', 'commerce', 'Rotman Commerce', ['Commerce', 'Accounting', 'Finance', 'Management'], undefined, ['Accounting', 'Finance and Economics', 'Management']],
      ['utoronto-computer-science', 'Computer Science', 'computer science', 'Arts and Science', ['Computer Science', 'Data Science']],
      ['utoronto-data-science', 'Data Science', 'data science', 'Arts and Science', ['Data Science', 'Statistics']],
      ['utoronto-engineering-science', 'Engineering Science', 'engineering science', 'Applied Science and Engineering', ['Engineering']],
      ['utoronto-industrial-engineering', 'Industrial Engineering', 'industrial engineering', 'Applied Science and Engineering', ['Industrial Engineering', 'Engineering']],
      ['utoronto-life-sciences', 'Life Sciences', 'life sciences', 'Arts and Science', ['Biological Sciences', 'Health Sciences']],
      ['utoronto-psychological-health-sciences', 'Psychological and Health Sciences', 'psychological and health sciences', 'Arts and Science', ['Psychology', 'Health Sciences']]
    ]
  },
  {
    institutionId: 'ubc', sourceUrl: 'https://you.ubc.ca/programs/', country: 'Canada', region: 'British Columbia', campus: 'Vancouver', programmes: [
      ['ubc-bachelor-of-commerce', 'Bachelor of Commerce', 'commerce', 'Sauder School of Business', ['Commerce', 'Accounting', 'Business Analytics', 'Finance'], undefined, ['Accounting', 'Business Analytics', 'Finance', 'General Business Management', 'Marketing']],
      ['ubc-computer-science-bsc', 'Computer Science (BSc)', 'computer science', 'Science', ['Computer Science', 'Data Science']],
      ['ubc-data-science-bsc', 'Data Science (BSc)', 'data science', 'Science', ['Data Science', 'Statistics']],
      ['ubc-applied-science-engineering', 'Bachelor of Applied Science', 'engineering', 'Applied Science', ['Engineering'], undefined, ['Biomedical Engineering', 'Chemical Engineering', 'Civil Engineering', 'Computer Engineering', 'Electrical Engineering', 'Mechanical Engineering']],
      ['ubc-economics-ba', 'Economics (BA)', 'economics', 'Arts', ['Economics']],
      ['ubc-forest-sciences-bsc', 'Forest Sciences (BSc)', 'forest sciences', 'Forestry', ['Forestry', 'Environmental Science']],
      ['ubc-international-economics', 'Bachelor of International Economics', 'international economics', 'Vancouver School of Economics', ['Economics', 'International Relations']],
      ['ubc-media-studies', 'Bachelor of Media Studies', 'media studies', 'Arts', ['Media', 'Communication']]
    ]
  },
  {
    institutionId: 'mcgill', sourceUrl: 'https://www.mcgill.ca/undergraduate-admissions/programs', country: 'Canada', region: 'Quebec', campus: 'Montreal', programmes: [
      ['mcgill-architecture-bsc', 'Bachelor of Science in Architecture', 'architecture', 'Engineering', ['Architecture', 'Built Environment']],
      ['mcgill-bachelor-of-arts', 'Bachelor of Arts', 'arts', 'Arts', ['Arts', 'Humanities', 'Social Science'], undefined, ['Computer Science', 'Economics', 'International Development Studies', 'Political Science', 'Psychology']],
      ['mcgill-bachelor-of-commerce', 'Bachelor of Commerce', 'commerce', 'Desautels Faculty of Management', ['Commerce', 'Accounting', 'Business Analytics', 'Finance'], undefined, ['Accounting', 'Business Analytics', 'Economics', 'Finance', 'Information Systems', 'Marketing']],
      ['mcgill-bachelor-of-engineering', 'Bachelor of Engineering', 'engineering', 'Engineering', ['Engineering'], undefined, ['Bioengineering', 'Chemical Engineering', 'Civil Engineering', 'Computer Engineering', 'Electrical Engineering', 'Mechanical Engineering', 'Software Engineering']],
      ['mcgill-computer-science-bsc', 'Bachelor of Science - Computer Science', 'computer science', 'Science', ['Computer Science']],
      ['mcgill-data-science-bsc', 'Bachelor of Science - Data Science', 'data science', 'Science', ['Data Science', 'Statistics']],
      ['mcgill-nursing-bn', 'Bachelor of Science in Nursing', 'nursing', 'Medicine and Health Sciences', ['Nursing', 'Health Sciences']],
      ['mcgill-software-engineering-beng', 'Bachelor of Engineering in Software Engineering', 'software engineering', 'Engineering', ['Software Engineering', 'Computer Science']]
    ]
  },
  {
    institutionId: 'waterloo', sourceUrl: 'https://uwaterloo.ca/future-students/programs', country: 'Canada', region: 'Ontario', campus: 'Waterloo', programmes: [
      ['waterloo-actuarial-science', 'Actuarial Science', 'actuarial science', 'Mathematics', ['Actuarial Science', 'Risk']],
      ['waterloo-computer-science', 'Computer Science', 'computer science', 'Mathematics', ['Computer Science', 'Data Science']],
      ['waterloo-computing-financial-management', 'Computing and Financial Management', 'computing and financial management', 'Mathematics / Arts', ['Computer Science', 'Finance']],
      ['waterloo-data-science', 'Data Science', 'data science', 'Mathematics', ['Data Science', 'Statistics']],
      ['waterloo-management-engineering', 'Management Engineering', 'management engineering', 'Engineering', ['Engineering', 'Management']],
      ['waterloo-mechatronics-engineering', 'Mechatronics Engineering', 'mechatronics engineering', 'Engineering', ['Mechatronics Engineering', 'Engineering']],
      ['waterloo-software-engineering', 'Software Engineering', 'software engineering', 'Engineering / Mathematics', ['Software Engineering', 'Computer Science']],
      ['waterloo-systems-design-engineering', 'Systems Design Engineering', 'systems design engineering', 'Engineering', ['Systems Engineering', 'Engineering']]
    ]
  },
  {
    institutionId: 'mit', sourceUrl: 'https://catalog.mit.edu/degree-charts/', country: 'United States', region: 'Massachusetts', campus: 'Cambridge', programmes: [
      ['mit-course-1', 'Civil and Environmental Engineering (Course 1)', 'civil and environmental engineering', 'Engineering', ['Civil Engineering', 'Environmental Engineering']],
      ['mit-course-2', 'Mechanical Engineering (Course 2)', 'mechanical engineering', 'Engineering', ['Mechanical Engineering', 'Engineering']],
      ['mit-course-6', 'Electrical Engineering and Computer Science (Course 6)', 'electrical engineering and computer science', 'Engineering', ['Electrical Engineering', 'Computer Science']],
      ['mit-course-6-14', 'Computer Science, Economics, and Data Science (Course 6-14)', 'computer science economics and data science', 'Engineering / Humanities, Arts, and Social Sciences', ['Computer Science', 'Economics', 'Data Science']],
      ['mit-course-15-3', 'Finance (Course 15-3)', 'finance', 'MIT Sloan School of Management', ['Finance', 'Business']],
      ['mit-course-18', 'Mathematics (Course 18)', 'mathematics', 'Science', ['Mathematics']],
      ['mit-course-20', 'Biological Engineering (Course 20)', 'biological engineering', 'Engineering', ['Biological Engineering', 'Engineering']],
      ['mit-course-11', 'Urban Studies and Planning (Course 11)', 'urban studies and planning', 'Architecture and Planning', ['Urban Planning', 'Built Environment']]
    ]
  },
  {
    institutionId: 'stanford', sourceUrl: 'https://majors.stanford.edu/majors', country: 'United States', region: 'California', campus: 'Stanford', programmes: [
      ['stanford-aeronautics-astronautics', 'Aeronautics and Astronautics, BS', 'aeronautics and astronautics', 'Engineering', ['Aerospace Engineering', 'Engineering']],
      ['stanford-bioengineering', 'Bioengineering, BS', 'bioengineering', 'Engineering', ['Bioengineering', 'Engineering']],
      ['stanford-computer-science', 'Computer Science, BS', 'computer science', 'Engineering', ['Computer Science']],
      ['stanford-data-science', 'Data Science, BS', 'data science', 'Humanities and Sciences', ['Data Science', 'Statistics']],
      ['stanford-economics', 'Economics, BA', 'economics', 'Humanities and Sciences', ['Economics']],
      ['stanford-management-science-engineering', 'Management Science and Engineering, BS', 'management science and engineering', 'Engineering', ['Management', 'Engineering', 'Data Science']],
      ['stanford-mathematics', 'Mathematics, BS', 'mathematics', 'Humanities and Sciences', ['Mathematics']],
      ['stanford-political-science', 'Political Science, BA', 'political science', 'Humanities and Sciences', ['Politics', 'Social Science']]
    ]
  },
  {
    institutionId: 'harvard', sourceUrl: 'https://college.harvard.edu/academics/liberal-arts-sciences/concentrations', country: 'United States', region: 'Massachusetts', campus: 'Cambridge', programmes: [
      ['harvard-applied-mathematics', 'Applied Mathematics concentration', 'applied mathematics', 'Arts and Sciences', ['Applied Mathematics', 'Mathematics']],
      ['harvard-biomedical-engineering', 'Biomedical Engineering concentration', 'biomedical engineering', 'Engineering and Applied Sciences', ['Biomedical Engineering', 'Engineering']],
      ['harvard-computer-science', 'Computer Science concentration', 'computer science', 'Engineering and Applied Sciences', ['Computer Science']],
      ['harvard-economics', 'Economics concentration', 'economics', 'Arts and Sciences', ['Economics']],
      ['harvard-environmental-science-public-policy', 'Environmental Science and Public Policy concentration', 'environmental science and public policy', 'Arts and Sciences', ['Environmental Science', 'Public Policy']],
      ['harvard-government', 'Government concentration', 'government', 'Arts and Sciences', ['Politics', 'Public Policy']],
      ['harvard-neuroscience', 'Neuroscience concentration', 'neuroscience', 'Arts and Sciences', ['Neuroscience', 'Biological Sciences']],
      ['harvard-statistics', 'Statistics concentration', 'statistics', 'Arts and Sciences', ['Statistics', 'Data Science']]
    ]
  },
  {
    institutionId: 'berkeley', sourceUrl: 'https://guide.berkeley.edu/undergraduate/degree-programs/', country: 'United States', region: 'California', campus: 'Berkeley', programmes: [
      ['berkeley-architecture-ba', 'Architecture, BA', 'architecture', 'Environmental Design', ['Architecture', 'Built Environment']],
      ['berkeley-business-administration-bs', 'Business Administration, BS', 'business administration', 'Haas School of Business', ['Business', 'Commerce']],
      ['berkeley-computer-science-ba', 'Computer Science, BA', 'computer science', 'Computing, Data Science, and Society', ['Computer Science']],
      ['berkeley-data-science-ba', 'Data Science, BA', 'data science', 'Computing, Data Science, and Society', ['Data Science', 'Statistics']],
      ['berkeley-economics-ba', 'Economics, BA', 'economics', 'Letters and Science', ['Economics']],
      ['berkeley-electrical-engineering-computer-sciences-bs', 'Electrical Engineering and Computer Sciences, BS', 'electrical engineering and computer sciences', 'Engineering', ['Electrical Engineering', 'Computer Science']],
      ['berkeley-environmental-economics-policy-bs', 'Environmental Economics and Policy, BS', 'environmental economics and policy', 'Natural Resources', ['Economics', 'Environmental Science']],
      ['berkeley-statistics-ba', 'Statistics, BA', 'statistics', 'Computing, Data Science, and Society', ['Statistics', 'Data Science']]
    ]
  },
  {
    institutionId: 'umich', sourceUrl: 'https://admissions.umich.edu/academics-majors/majors-degrees', country: 'United States', region: 'Michigan', campus: 'Ann Arbor', programmes: [
      ['umich-aerospace-engineering-bse', 'Aerospace Engineering, BSE', 'aerospace engineering', 'Engineering', ['Aerospace Engineering', 'Engineering']],
      ['umich-business-bba', 'Business Administration, BBA', 'business administration', 'Ross School of Business', ['Business', 'Commerce']],
      ['umich-computer-science-bse', 'Computer Science, BSE', 'computer science', 'Engineering', ['Computer Science']],
      ['umich-data-science-bse', 'Data Science, BSE', 'data science', 'Engineering', ['Data Science', 'Statistics']],
      ['umich-economics-ba', 'Economics, BA', 'economics', 'Literature, Science, and the Arts', ['Economics']],
      ['umich-industrial-operations-engineering-bse', 'Industrial and Operations Engineering, BSE', 'industrial and operations engineering', 'Engineering', ['Industrial Engineering', 'Engineering']],
      ['umich-information-bsi', 'Information, BSI', 'information', 'Information', ['Information Technology', 'Data Science']],
      ['umich-public-health-ba', 'Community and Global Public Health, BA', 'public health', 'Public Health', ['Public Health', 'Health Sciences']]
    ]
  },
  {
    institutionId: 'nyu', sourceUrl: 'https://www.nyu.edu/admissions/undergraduate-admissions/academics/majors-and-programs.html', country: 'United States', region: 'New York', campus: 'New York', programmes: [
      ['nyu-business-bs', 'Business, BS', 'business', 'Stern School of Business', ['Business', 'Commerce'], undefined, ['Accounting', 'Business Analytics', 'Computing and Data Science', 'Econometrics and Quantitative Economics', 'Finance', 'Marketing']],
      ['nyu-computer-science-bs', 'Computer Science, BS', 'computer science', 'Tandon School of Engineering', ['Computer Science']],
      ['nyu-data-science-ba', 'Data Science, BA', 'data science', 'College of Arts and Science', ['Data Science', 'Statistics']],
      ['nyu-economics-ba', 'Economics, BA', 'economics', 'College of Arts and Science', ['Economics']],
      ['nyu-integrated-design-media-bs', 'Integrated Design and Media, BS', 'integrated design and media', 'Tandon School of Engineering', ['Design', 'Media', 'Technology']],
      ['nyu-mechanical-engineering-bs', 'Mechanical Engineering, BS', 'mechanical engineering', 'Tandon School of Engineering', ['Mechanical Engineering', 'Engineering']],
      ['nyu-nursing-bs', 'Nursing, BS', 'nursing', 'Rory Meyers College of Nursing', ['Nursing', 'Health Sciences']],
      ['nyu-public-policy-ba', 'Public Policy, BA', 'public policy', 'Wagner / College of Arts and Science', ['Public Policy', 'Politics']]
    ]
  }
]

export const REVIEWED_CATALOGUE_DEPTH: Programme[] = [
  ...REVIEWED_CORE_DEPTH,
  ...ADDITIONAL_PRIORITY_DEPTH.flatMap(reviewedInstitutionDepth),
  ...SCALE_CATALOGUE_DEPTH
]