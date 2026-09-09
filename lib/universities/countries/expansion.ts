import type { CountryCatalogue, CountryCode, Institution, InstitutionType, Programme } from '../types.ts'

const VERIFIED_AT = '2026-09-09'

function institution(id: string, name: string, aliases: string[], institutionType: InstitutionType, country: string, code: CountryCode, region: string, city: string, officialWebsite: string, studyAreas: string[], summary: string): Institution {
  return { id, name, aliases, institutionType, country, code, region, city, officialWebsite, admissionsUrl: officialWebsite, publicPrivate: 'public', campusLocations: [city], studyAreas, shortSummary: summary, sourceUrl: officialWebsite, sourceType: 'official-institution', lastVerifiedAt: VERIFIED_AT }
}

function programme(id: string, institutionId: string, name: string, normalizedName: string, studyAreas: string[], faculty: string, officialProgrammeUrl: string, prerequisites: string[] = [], aliases: string[] = []): Programme {
  return { id, institutionId, name, normalizedName, aliases, qualification: 'Undergraduate degree', degreeType: 'Bachelor', qualificationLevel: 'Undergraduate', faculty, studyAreas, industryAreas: studyAreas, tags: studyAreas.map((area) => area.toLowerCase()), deliveryMode: 'On campus', officialProgrammeUrl, curriculumRequirements: ['Check official requirements'], prerequisiteSubjects: prerequisites, entryRequirements: ['Check official entry requirements'], applicationInformation: 'Application requirements and deadlines vary by applicant type and admissions cycle. Use the official source.', sourceUrl: officialProgrammeUrl, sourceType: 'official-programme', lastVerifiedAt: VERIFIED_AT }
}

const zaInstitutions: Institution[] = [
  institution('nmu', 'Nelson Mandela University', ['NMU'], 'University', 'South Africa', 'ZA', 'Eastern Cape', 'Gqeberha', 'https://www.mandela.ac.za/', ['Business', 'Engineering', 'Science', 'Health Sciences', 'Humanities'], 'A public university serving the Eastern Cape with professional and academic programmes.'),
  institution('ul', 'University of Limpopo', ['UL'], 'University', 'South Africa', 'ZA', 'Limpopo', 'Polokwane', 'https://www.ul.ac.za/', ['Health Sciences', 'Science', 'Humanities', 'Management and Law'], 'A public university in Limpopo offering health, science, humanities and management programmes.'),
  institution('univen', 'University of Venda', ['UNIVEN'], 'University', 'South Africa', 'ZA', 'Limpopo', 'Thohoyandou', 'https://www.univen.ac.za/', ['Science', 'Engineering', 'Agriculture', 'Law', 'Humanities'], 'A comprehensive public university in Limpopo.'),
  institution('unizulu', 'University of Zululand', ['UNIZULU'], 'University', 'South Africa', 'ZA', 'KwaZulu-Natal', 'Richards Bay', 'https://www.unizulu.ac.za/', ['Commerce', 'Science', 'Education', 'Humanities'], 'A comprehensive public university in northern KwaZulu-Natal.'),
  institution('wsu', 'Walter Sisulu University', ['WSU'], 'University', 'South Africa', 'ZA', 'Eastern Cape', 'Mthatha', 'https://www.wsu.ac.za/', ['Health Sciences', 'Engineering', 'Business', 'Education'], 'A comprehensive public university with campuses across the Eastern Cape.'),
  institution('ufh', 'University of Fort Hare', ['UFH'], 'University', 'South Africa', 'ZA', 'Eastern Cape', 'Alice', 'https://www.ufh.ac.za/', ['Humanities', 'Law', 'Science', 'Management'], 'A historic public university in the Eastern Cape.'),
  institution('spu', 'Sol Plaatje University', ['SPU'], 'University', 'South Africa', 'ZA', 'Northern Cape', 'Kimberley', 'https://www.spu.ac.za/', ['Data Science', 'Education', 'Humanities', 'Business'], 'A public university in Kimberley with emerging data, education and humanities offerings.'),
  institution('ump', 'University of Mpumalanga', ['UMP'], 'University', 'South Africa', 'ZA', 'Mpumalanga', 'Mbombela', 'https://www.ump.ac.za/', ['Agriculture', 'Science', 'Education', 'Hospitality'], 'A public university serving Mpumalanga.'),
  institution('smu', 'Sefako Makgatho Health Sciences University', ['SMU'], 'University', 'South Africa', 'ZA', 'Gauteng', 'Pretoria', 'https://www.smu.ac.za/', ['Medicine', 'Health Sciences', 'Pharmacy'], 'A specialist public health sciences university in Gauteng.'),
  institution('mut', 'Mangosuthu University of Technology', ['MUT'], 'University of Technology', 'South Africa', 'ZA', 'KwaZulu-Natal', 'Durban', 'https://www.mut.ac.za/', ['Engineering', 'Management Sciences', 'Natural Sciences'], 'A university of technology focused on applied professional education.')
]

const zaProgrammes: Programme[] = [
  programme('nmu-bsc-cs', 'nmu', 'Bachelor of Science in Computer Science', 'computer science', ['Computer Science'], 'Science', 'https://www.mandela.ac.za/Study-at-Mandela'),
  programme('ul-mbchb', 'ul', 'Bachelor of Medicine and Bachelor of Surgery', 'medicine', ['Medicine', 'Health Sciences'], 'Health Sciences', 'https://www.ul.ac.za/', ['Mathematics', 'Physical Sciences', 'Life Sciences']),
  programme('univen-bsc', 'univen', 'Bachelor of Science', 'science', ['Science'], 'Science, Engineering and Agriculture', 'https://www.univen.ac.za/students/'),
  programme('unizulu-bcom', 'unizulu', 'Bachelor of Commerce', 'commerce', ['Commerce', 'Business'], 'Commerce, Administration and Law', 'https://www.unizulu.ac.za/'),
  programme('wsu-beng', 'wsu', 'Bachelor of Engineering', 'engineering', ['Engineering'], 'Engineering', 'https://www.wsu.ac.za/', ['Mathematics', 'Physical Sciences']),
  programme('ufh-llb', 'ufh', 'Bachelor of Laws', 'law', ['Law'], 'Law', 'https://www.ufh.ac.za/'),
  programme('spu-bsc-data-science', 'spu', 'Bachelor of Science in Data Science', 'data science', ['Data Science', 'Computer Science'], 'Natural and Applied Sciences', 'https://www.spu.ac.za/'),
  programme('ump-bsc-agriculture', 'ump', 'Bachelor of Science in Agriculture', 'agriculture', ['Agriculture', 'Science'], 'Agriculture and Natural Sciences', 'https://www.ump.ac.za/'),
  programme('smu-mbchb', 'smu', 'Bachelor of Medicine and Bachelor of Surgery', 'medicine', ['Medicine', 'Health Sciences'], 'Medicine', 'https://www.smu.ac.za/schools/medicine/', ['Mathematics', 'Physical Sciences', 'Life Sciences']),
  programme('mut-bengtech', 'mut', 'Bachelor of Engineering Technology', 'engineering', ['Engineering', 'Technology'], 'Engineering', 'https://www.mut.ac.za/academic/engineering/', ['Mathematics', 'Physical Sciences'])
]

const auInstitutions: Institution[] = [
  institution('uwa', 'The University of Western Australia', ['UWA'], 'University', 'Australia', 'AU', 'Western Australia', 'Perth', 'https://www.uwa.edu.au/', ['Science', 'Engineering', 'Business', 'Health'], 'A public research university in Perth.'),
  institution('adelaide', 'The University of Adelaide', ['Adelaide University'], 'University', 'Australia', 'AU', 'South Australia', 'Adelaide', 'https://www.adelaide.edu.au/', ['Engineering', 'Science', 'Business', 'Health'], 'A public research university in South Australia.'),
  institution('utas', 'University of Tasmania', ['UTAS'], 'University', 'Australia', 'AU', 'Tasmania', 'Hobart', 'https://www.utas.edu.au/', ['Science', 'Business', 'Health', 'Marine Studies'], 'Tasmania’s public university with broad undergraduate study.'),
  institution('deakin', 'Deakin University', ['Deakin'], 'University', 'Australia', 'AU', 'Victoria', 'Geelong', 'https://www.deakin.edu.au/', ['Business', 'Health', 'Technology', 'Education'], 'A Victorian public university with campus and online study.'),
  institution('qut', 'Queensland University of Technology', ['QUT'], 'University', 'Australia', 'AU', 'Queensland', 'Brisbane', 'https://www.qut.edu.au/', ['Technology', 'Engineering', 'Business', 'Design'], 'A public university with applied technology and professional programmes.'),
  institution('curtin', 'Curtin University', ['Curtin'], 'University', 'Australia', 'AU', 'Western Australia', 'Perth', 'https://www.curtin.edu.au/', ['Engineering', 'Business', 'Science', 'Health'], 'A public research university based in Perth.'),
  institution('charles-darwin', 'Charles Darwin University', ['CDU'], 'University', 'Australia', 'AU', 'Northern Territory', 'Darwin', 'https://www.cdu.edu.au/', ['Health', 'Education', 'Engineering', 'Business'], 'A public university serving the Northern Territory.')
]

const auProgrammes: Programme[] = [
  programme('uwa-bsc-cs', 'uwa', 'Bachelor of Science in Computer Science', 'computer science', ['Computer Science'], 'Engineering and Mathematical Sciences', 'https://www.uwa.edu.au/study/courses/computer-science'),
  programme('adelaide-beng', 'adelaide', 'Bachelor of Engineering', 'engineering', ['Engineering'], 'Sciences, Engineering and Technology', 'https://www.adelaide.edu.au/degree-finder/', ['Mathematics']),
  programme('utas-bpsych', 'utas', 'Bachelor of Psychological Science', 'psychology', ['Psychology'], 'Health and Medicine', 'https://www.utas.edu.au/courses'),
  programme('deakin-bcs', 'deakin', 'Bachelor of Computer Science', 'computer science', ['Computer Science'], 'Science, Engineering and Built Environment', 'https://www.deakin.edu.au/course/bachelor-computer-science'),
  programme('qut-beng', 'qut', 'Bachelor of Engineering', 'engineering', ['Engineering'], 'Engineering', 'https://www.qut.edu.au/courses/bachelor-of-engineering-honours'),
  programme('curtin-bcom', 'curtin', 'Bachelor of Commerce', 'commerce', ['Commerce', 'Business'], 'Business and Law', 'https://www.curtin.edu.au/study/offering/course-ug-bachelor-of-commerce--b-comrce/'),
  programme('cdu-bnursing', 'charles-darwin', 'Bachelor of Nursing', 'nursing', ['Nursing', 'Health Sciences'], 'Health', 'https://www.cdu.edu.au/study/course/bachelor-nursing-wnur01')
]

const gbInstitutions: Institution[] = [
  institution('manchester', 'The University of Manchester', ['Manchester'], 'University', 'United Kingdom', 'GB', 'England', 'Manchester', 'https://www.manchester.ac.uk/', ['Engineering', 'Science', 'Medicine', 'Humanities'], 'A large public research university in Manchester.'),
  institution('warwick', 'University of Warwick', ['Warwick'], 'University', 'United Kingdom', 'GB', 'England', 'Coventry', 'https://warwick.ac.uk/', ['Economics', 'Business', 'Mathematics', 'Engineering'], 'A research university in the West Midlands.'),
  institution('bristol', 'University of Bristol', ['Bristol'], 'University', 'United Kingdom', 'GB', 'England', 'Bristol', 'https://www.bristol.ac.uk/', ['Engineering', 'Science', 'Law', 'Medicine'], 'A public research university in Bristol.'),
  institution('glasgow', 'University of Glasgow', ['Glasgow'], 'University', 'United Kingdom', 'GB', 'Scotland', 'Glasgow', 'https://www.gla.ac.uk/', ['Science', 'Medicine', 'Law', 'Humanities'], 'A public research university in Scotland.'),
  institution('st-andrews', 'University of St Andrews', ['St Andrews'], 'University', 'United Kingdom', 'GB', 'Scotland', 'St Andrews', 'https://www.st-andrews.ac.uk/', ['Science', 'Economics', 'Humanities', 'International Relations'], 'A public university in Fife, Scotland.'),
  institution('swansea', 'Swansea University', ['Swansea'], 'University', 'United Kingdom', 'GB', 'Wales', 'Swansea', 'https://www.swansea.ac.uk/', ['Engineering', 'Science', 'Business', 'Law'], 'A public research university in Wales.'),
  institution('ulster', 'Ulster University', ['Ulster'], 'University', 'United Kingdom', 'GB', 'Northern Ireland', 'Belfast', 'https://www.ulster.ac.uk/', ['Computing', 'Business', 'Health', 'Arts'], 'A multi-campus public university in Northern Ireland.')
]

const gbProgrammes: Programme[] = [
  programme('manchester-cs', 'manchester', 'BSc Computer Science', 'computer science', ['Computer Science'], 'Science and Engineering', 'https://www.manchester.ac.uk/study/undergraduate/courses/2026/00560/bsc-computer-science/'),
  programme('warwick-econ', 'warwick', 'BSc Economics', 'economics', ['Economics'], 'Social Sciences', 'https://warwick.ac.uk/study/undergraduate/courses/bsc-economics/'),
  programme('bristol-law', 'bristol', 'LLB Law', 'law', ['Law'], 'Law', 'https://www.bristol.ac.uk/study/undergraduate/law/'),
  programme('glasgow-medicine', 'glasgow', 'Medicine MBChB', 'medicine', ['Medicine'], 'Medicine, Veterinary and Life Sciences', 'https://www.gla.ac.uk/undergraduate/degrees/medicine/', ['Chemistry']),
  programme('st-andrews-ir', 'st-andrews', 'International Relations MA', 'international relations', ['International Relations', 'Politics'], 'Arts', 'https://www.st-andrews.ac.uk/subjects/international-relations/'),
  programme('swansea-engineering', 'swansea', 'BEng Engineering', 'engineering', ['Engineering'], 'Science and Engineering', 'https://www.swansea.ac.uk/undergraduate/courses/aerospace-civil-electrical-general-mechanical-engineering/'),
  programme('ulster-cs', 'ulster', 'BSc Computer Science', 'computer science', ['Computer Science'], 'Computing', 'https://www.ulster.ac.uk/courses/202627/computer-science-41621')
]

const newCountries: CountryCatalogue[] = [
  {
    code: 'CA', name: 'Canada', region: 'North America', status: 'partial',
    institutions: [
      institution('utoronto', 'University of Toronto', ['U of T', 'UToronto'], 'University', 'Canada', 'CA', 'Ontario', 'Toronto', 'https://www.utoronto.ca/', ['Computer Science', 'Engineering', 'Business', 'Medicine'], 'A public research university in Ontario.'),
      institution('ubc', 'University of British Columbia', ['UBC'], 'University', 'Canada', 'CA', 'British Columbia', 'Vancouver', 'https://www.ubc.ca/', ['Science', 'Engineering', 'Business', 'Arts'], 'A public research university in British Columbia.'),
      institution('mcgill', 'McGill University', ['McGill'], 'University', 'Canada', 'CA', 'Quebec', 'Montreal', 'https://www.mcgill.ca/', ['Science', 'Engineering', 'Medicine', 'Arts'], 'A public research university in Quebec.'),
      institution('waterloo', 'University of Waterloo', ['Waterloo'], 'University', 'Canada', 'CA', 'Ontario', 'Waterloo', 'https://uwaterloo.ca/', ['Computer Science', 'Engineering', 'Mathematics', 'Business'], 'A public research university known for co-operative education.'),
      institution('ualberta', 'University of Alberta', ['UAlberta'], 'University', 'Canada', 'CA', 'Alberta', 'Edmonton', 'https://www.ualberta.ca/', ['Science', 'Engineering', 'Business', 'Health'], 'A public research university in Alberta.')
    ],
    programmes: [
      programme('utoronto-cs', 'utoronto', 'Computer Science', 'computer science', ['Computer Science'], 'Arts and Science', 'https://future.utoronto.ca/undergraduate-programs/computer-science/'),
      programme('ubc-engineering', 'ubc', 'Bachelor of Applied Science', 'engineering', ['Engineering'], 'Applied Science', 'https://you.ubc.ca/ubc_programs/engineering/'),
      programme('mcgill-economics', 'mcgill', 'Economics', 'economics', ['Economics'], 'Arts', 'https://www.mcgill.ca/undergraduate-admissions/program/economics'),
      programme('waterloo-cs', 'waterloo', 'Bachelor of Computer Science', 'computer science', ['Computer Science'], 'Mathematics', 'https://uwaterloo.ca/future-students/programs/computer-science'),
      programme('ualberta-psychology', 'ualberta', 'Bachelor of Science in Psychology', 'psychology', ['Psychology'], 'Science', 'https://www.ualberta.ca/en/undergraduate-programs/bachelor-of-science-psychology.html')
    ]
  },
  {
    code: 'US', name: 'United States', region: 'North America', status: 'partial',
    institutions: [
      institution('mit', 'Massachusetts Institute of Technology', ['MIT'], 'University', 'United States', 'US', 'Massachusetts', 'Cambridge', 'https://www.mit.edu/', ['Engineering', 'Computer Science', 'Science', 'Economics'], 'A private research university in Massachusetts.'),
      institution('stanford', 'Stanford University', ['Stanford'], 'University', 'United States', 'US', 'California', 'Stanford', 'https://www.stanford.edu/', ['Engineering', 'Computer Science', 'Science', 'Humanities'], 'A private research university in California.'),
      institution('harvard', 'Harvard University', ['Harvard'], 'University', 'United States', 'US', 'Massachusetts', 'Cambridge', 'https://www.harvard.edu/', ['Arts', 'Science', 'Economics', 'Government'], 'A private research university in Massachusetts.'),
      institution('berkeley', 'University of California, Berkeley', ['UC Berkeley', 'Berkeley'], 'University', 'United States', 'US', 'California', 'Berkeley', 'https://www.berkeley.edu/', ['Engineering', 'Computer Science', 'Business', 'Science'], 'A public research university in California.'),
      institution('umich', 'University of Michigan', ['Michigan', 'UMich'], 'University', 'United States', 'US', 'Michigan', 'Ann Arbor', 'https://umich.edu/', ['Engineering', 'Business', 'Science', 'Humanities'], 'A public research university in Michigan.')
    ],
    programmes: [
      programme('mit-course-6', 'mit', 'Electrical Engineering and Computer Science', 'computer science', ['Computer Science', 'Electrical Engineering'], 'Engineering', 'https://catalog.mit.edu/degree-charts/computer-science-engineering-course-6-3/'),
      programme('stanford-cs', 'stanford', 'Computer Science BS', 'computer science', ['Computer Science'], 'Engineering', 'https://majors.stanford.edu/majors/computer-science'),
      programme('harvard-econ', 'harvard', 'Economics', 'economics', ['Economics'], 'Arts and Sciences', 'https://economics.harvard.edu/undergraduate'),
      programme('berkeley-engineering', 'berkeley', 'Engineering', 'engineering', ['Engineering'], 'Engineering', 'https://engineering.berkeley.edu/academics/undergraduate-guide/'),
      programme('umich-psychology', 'umich', 'Psychology', 'psychology', ['Psychology'], 'Literature, Science, and the Arts', 'https://lsa.umich.edu/psych/undergraduates.html')
    ]
  },
  {
    code: 'SG', name: 'Singapore', region: 'Southeast Asia', status: 'partial',
    institutions: [
      institution('nus', 'National University of Singapore', ['NUS'], 'University', 'Singapore', 'SG', 'Singapore', 'Singapore', 'https://www.nus.edu.sg/', ['Computing', 'Engineering', 'Business', 'Medicine'], 'A national research university in Singapore.'),
      institution('ntu-sg', 'Nanyang Technological University', ['NTU', 'NTU Singapore'], 'University', 'Singapore', 'SG', 'Singapore', 'Singapore', 'https://www.ntu.edu.sg/', ['Engineering', 'Computing', 'Business', 'Science'], 'A public research university in Singapore.'),
      institution('smu-sg', 'Singapore Management University', ['SMU'], 'University', 'Singapore', 'SG', 'Singapore', 'Singapore', 'https://www.smu.edu.sg/', ['Business', 'Economics', 'Computing', 'Law'], 'A specialised public university in Singapore.'),
      institution('sutd', 'Singapore University of Technology and Design', ['SUTD'], 'University', 'Singapore', 'SG', 'Singapore', 'Singapore', 'https://www.sutd.edu.sg/', ['Engineering', 'Architecture', 'Design', 'Technology'], 'A public university focused on technology and design.')
    ],
    programmes: [
      programme('nus-cs', 'nus', 'Bachelor of Computing in Computer Science', 'computer science', ['Computer Science'], 'Computing', 'https://www.comp.nus.edu.sg/programmes/ug/cs/'),
      programme('ntu-engineering', 'ntu-sg', 'Bachelor of Engineering', 'engineering', ['Engineering'], 'Engineering', 'https://www.ntu.edu.sg/education/undergraduate-programme'),
      programme('smu-economics', 'smu-sg', 'Bachelor of Science (Economics)', 'economics', ['Economics'], 'Economics', 'https://economics.smu.edu.sg/bachelor-science-economics'),
      programme('sutd-design-ai', 'sutd', 'Design and Artificial Intelligence', 'artificial intelligence', ['Artificial Intelligence', 'Design'], 'Design and AI', 'https://www.sutd.edu.sg/education/undergraduate/design-and-artificial-intelligence/')
    ]
  },
  {
    code: 'MY', name: 'Malaysia', region: 'Southeast Asia', status: 'partial',
    institutions: [
      institution('um-malaysia', 'Universiti Malaya', ['UM', 'University of Malaya'], 'University', 'Malaysia', 'MY', 'Kuala Lumpur', 'Kuala Lumpur', 'https://www.um.edu.my/', ['Science', 'Engineering', 'Business', 'Medicine'], 'A public research university in Kuala Lumpur.'),
      institution('utm', 'Universiti Teknologi Malaysia', ['UTM'], 'University', 'Malaysia', 'MY', 'Johor', 'Johor Bahru', 'https://www.utm.my/', ['Engineering', 'Technology', 'Computing', 'Science'], 'A public research university focused on engineering and technology.'),
      institution('ukm', 'Universiti Kebangsaan Malaysia', ['UKM'], 'University', 'Malaysia', 'MY', 'Selangor', 'Bangi', 'https://www.ukm.my/', ['Science', 'Medicine', 'Engineering', 'Social Sciences'], 'A public research university in Selangor.'),
      institution('monash-malaysia', 'Monash University Malaysia', ['Monash Malaysia'], 'University', 'Malaysia', 'MY', 'Selangor', 'Subang Jaya', 'https://www.monash.edu.my/', ['Business', 'Engineering', 'Medicine', 'Science'], 'The Malaysian campus of Monash University.')
    ],
    programmes: [
      programme('um-cs', 'um-malaysia', 'Bachelor of Computer Science', 'computer science', ['Computer Science'], 'Computer Science and Information Technology', 'https://study.um.edu.my/'),
      programme('utm-engineering', 'utm', 'Bachelor of Engineering', 'engineering', ['Engineering'], 'Engineering', 'https://admission.utm.my/undergraduate-programme/'),
      programme('ukm-medicine', 'ukm', 'Doctor of Medicine', 'medicine', ['Medicine'], 'Medicine', 'https://www.ukm.my/portalukm/undergraduate/'),
      programme('monash-my-business', 'monash-malaysia', 'Bachelor of Business and Commerce', 'commerce', ['Business', 'Commerce'], 'Business', 'https://www.monash.edu.my/study/undergraduate/business/bachelor-business-commerce')
    ]
  }
]

export const COUNTRY_CATALOGUE_ADDITIONS: CountryCatalogue[] = [
  { code: 'ZA', name: 'South Africa', region: 'Africa', status: 'substantial', institutions: zaInstitutions, programmes: zaProgrammes },
  { code: 'AU', name: 'Australia', region: 'Oceania', status: 'substantial', institutions: auInstitutions, programmes: auProgrammes },
  { code: 'GB', name: 'United Kingdom', region: 'Europe', status: 'substantial', institutions: gbInstitutions, programmes: gbProgrammes },
  ...newCountries
]

export function mergeCountryCatalogues(base: CountryCatalogue[], additions: CountryCatalogue[]) {
  const byCode = new Map<CountryCode, CountryCatalogue>()
  for (const catalogue of [...base, ...additions]) {
    const existing = byCode.get(catalogue.code)
    if (!existing) {
      byCode.set(catalogue.code, { ...catalogue, institutions: [...catalogue.institutions], programmes: [...catalogue.programmes] })
      continue
    }
    byCode.set(catalogue.code, {
      ...existing,
      status: catalogue.status,
      institutions: [...existing.institutions, ...catalogue.institutions.filter((entry) => !existing.institutions.some((item) => item.id === entry.id))],
      programmes: [...existing.programmes, ...catalogue.programmes.filter((entry) => !existing.programmes.some((item) => item.id === entry.id))]
    })
  }
  return Array.from(byCode.values())
}
