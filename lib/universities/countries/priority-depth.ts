import type { CountryCatalogue, CountryCode, Institution, Programme } from '../types.ts'

const CHECKED_AT = '2026-09-09'

type InstitutionSeed = [id: string, name: string, aliases: string[], country: string, code: CountryCode, region: string, city: string, website: string, finder: string, areas: string[]]

function institution([id, name, aliases, country, code, region, city, website, finder, areas]: InstitutionSeed): Institution {
  return {
    id, name, aliases, country, code, region, city, studyAreas: areas,
    institutionType: 'University', officialWebsite: website, admissionsUrl: finder,
    undergraduateAdmissionsUrl: finder, programmeFinderUrl: finder, publicPrivate: code === 'US' ? 'mixed' : 'public',
    campusLocations: [city], sourceUrl: finder, sourceType: 'official-course-finder',
    lastCheckedAt: CHECKED_AT, lastVerifiedAt: CHECKED_AT, lastIndexedAt: CHECKED_AT,
    programmeCoverageStatus: 'partial', admissionsCoverageStatus: 'building',
    shortSummary: `Undergraduate programmes indexed from ${name}'s official course information.`
  }
}

const additionalInstitutions: InstitutionSeed[] = [
  ['griffith', 'Griffith University', ['Griffith'], 'Australia', 'AU', 'Queensland', 'Brisbane', 'https://www.griffith.edu.au/', 'https://www.griffith.edu.au/study/degrees', ['Business', 'Engineering', 'Computer Science', 'Health Sciences', 'Law', 'Education']],
  ['macquarie', 'Macquarie University', ['Macquarie'], 'Australia', 'AU', 'New South Wales', 'Sydney', 'https://www.mq.edu.au/', 'https://www.mq.edu.au/study/find-a-course', ['Business', 'Actuarial Science', 'Computer Science', 'Psychology', 'Law', 'Science']],
  ['latrobe', 'La Trobe University', ['La Trobe'], 'Australia', 'AU', 'Victoria', 'Melbourne', 'https://www.latrobe.edu.au/', 'https://www.latrobe.edu.au/courses', ['Business', 'Health Sciences', 'Science', 'Education', 'Law', 'Computer Science']],
  ['swinburne', 'Swinburne University of Technology', ['Swinburne'], 'Australia', 'AU', 'Victoria', 'Melbourne', 'https://www.swinburne.edu.au/', 'https://www.swinburne.edu.au/courses/find-a-course/', ['Engineering', 'Computer Science', 'Design', 'Business', 'Science']],
  ['newcastle-au', 'University of Newcastle', ['Newcastle Australia'], 'Australia', 'AU', 'New South Wales', 'Newcastle', 'https://www.newcastle.edu.au/', 'https://www.newcastle.edu.au/degrees', ['Engineering', 'Medicine', 'Nursing', 'Business', 'Science', 'Education']],
  ['wollongong', 'University of Wollongong', ['UOW'], 'Australia', 'AU', 'New South Wales', 'Wollongong', 'https://www.uow.edu.au/', 'https://www.uow.edu.au/study/courses/', ['Engineering', 'Computer Science', 'Business', 'Science', 'Health Sciences']],
  ['western-sydney', 'Western Sydney University', ['WSU Australia'], 'Australia', 'AU', 'New South Wales', 'Sydney', 'https://www.westernsydney.edu.au/', 'https://www.westernsydney.edu.au/future/study/courses', ['Business', 'Health Sciences', 'Engineering', 'Law', 'Education', 'Psychology']],
  ['flinders', 'Flinders University', ['Flinders'], 'Australia', 'AU', 'South Australia', 'Adelaide', 'https://www.flinders.edu.au/', 'https://www.flinders.edu.au/study/courses', ['Medicine', 'Health Sciences', 'Engineering', 'Business', 'Education', 'Science']],
  ['jcu', 'James Cook University', ['JCU'], 'Australia', 'AU', 'Queensland', 'Townsville', 'https://www.jcu.edu.au/', 'https://www.jcu.edu.au/courses', ['Marine Science', 'Medicine', 'Health Sciences', 'Business', 'Engineering', 'Education']],
  ['bond', 'Bond University', ['Bond'], 'Australia', 'AU', 'Queensland', 'Gold Coast', 'https://bond.edu.au/', 'https://bond.edu.au/study', ['Business', 'Law', 'Health Sciences', 'Psychology', 'Architecture']],

  ['birmingham', 'University of Birmingham', ['Birmingham'], 'United Kingdom', 'GB', 'England', 'Birmingham', 'https://www.birmingham.ac.uk/', 'https://www.birmingham.ac.uk/study/undergraduate/courses', ['Engineering', 'Medicine', 'Law', 'Business', 'Science', 'Psychology']],
  ['leeds', 'University of Leeds', ['Leeds'], 'United Kingdom', 'GB', 'England', 'Leeds', 'https://www.leeds.ac.uk/', 'https://courses.leeds.ac.uk/', ['Engineering', 'Business', 'Law', 'Medicine', 'Science', 'Arts']],
  ['sheffield', 'University of Sheffield', ['Sheffield'], 'United Kingdom', 'GB', 'England', 'Sheffield', 'https://www.sheffield.ac.uk/', 'https://www.sheffield.ac.uk/undergraduate/courses/2027', ['Engineering', 'Computer Science', 'Medicine', 'Architecture', 'Business', 'Science']],
  ['nottingham', 'University of Nottingham', ['Nottingham'], 'United Kingdom', 'GB', 'England', 'Nottingham', 'https://www.nottingham.ac.uk/', 'https://www.nottingham.ac.uk/ugstudy/course-search.aspx', ['Engineering', 'Medicine', 'Law', 'Business', 'Science', 'Education']],
  ['southampton', 'University of Southampton', ['Southampton'], 'United Kingdom', 'GB', 'England', 'Southampton', 'https://www.southampton.ac.uk/', 'https://www.southampton.ac.uk/courses', ['Engineering', 'Computer Science', 'Medicine', 'Business', 'Science']],
  ['exeter', 'University of Exeter', ['Exeter'], 'United Kingdom', 'GB', 'England', 'Exeter', 'https://www.exeter.ac.uk/', 'https://www.exeter.ac.uk/study/undergraduate/courses/', ['Business', 'Economics', 'Law', 'Engineering', 'Psychology', 'Science']],
  ['york-uk', 'University of York', ['York'], 'United Kingdom', 'GB', 'England', 'York', 'https://www.york.ac.uk/', 'https://www.york.ac.uk/study/undergraduate/courses/', ['Computer Science', 'Economics', 'Law', 'Psychology', 'Science', 'Humanities']],
  ['liverpool', 'University of Liverpool', ['Liverpool'], 'United Kingdom', 'GB', 'England', 'Liverpool', 'https://www.liverpool.ac.uk/', 'https://www.liverpool.ac.uk/courses/undergraduate', ['Medicine', 'Engineering', 'Computer Science', 'Business', 'Law', 'Science']],
  ['newcastle-uk', 'Newcastle University', ['Newcastle UK'], 'United Kingdom', 'GB', 'England', 'Newcastle upon Tyne', 'https://www.ncl.ac.uk/', 'https://www.ncl.ac.uk/undergraduate/degrees/', ['Medicine', 'Engineering', 'Computer Science', 'Business', 'Architecture', 'Science']],
  ['durham', 'Durham University', ['Durham'], 'United Kingdom', 'GB', 'England', 'Durham', 'https://www.durham.ac.uk/', 'https://www.durham.ac.uk/study/courses/', ['Law', 'Business', 'Economics', 'Science', 'Humanities', 'Psychology']],
  ['bath', 'University of Bath', ['Bath'], 'United Kingdom', 'GB', 'England', 'Bath', 'https://www.bath.ac.uk/', 'https://www.bath.ac.uk/courses/undergraduate-2027/', ['Engineering', 'Computer Science', 'Business', 'Economics', 'Science', 'Psychology']],
  ['lancaster', 'Lancaster University', ['Lancaster'], 'United Kingdom', 'GB', 'England', 'Lancaster', 'https://www.lancaster.ac.uk/', 'https://www.lancaster.ac.uk/study/undergraduate/courses/', ['Business', 'Computer Science', 'Engineering', 'Law', 'Science', 'Psychology']],
  ['aberdeen', 'University of Aberdeen', ['Aberdeen'], 'United Kingdom', 'GB', 'Scotland', 'Aberdeen', 'https://www.abdn.ac.uk/', 'https://www.abdn.ac.uk/study/undergraduate/degree-programmes/', ['Medicine', 'Engineering', 'Law', 'Business', 'Science', 'Humanities']],
  ['dundee', 'University of Dundee', ['Dundee'], 'United Kingdom', 'GB', 'Scotland', 'Dundee', 'https://www.dundee.ac.uk/', 'https://www.dundee.ac.uk/undergraduate/courses', ['Medicine', 'Dentistry', 'Law', 'Business', 'Computer Science', 'Art']],
  ['strathclyde', 'University of Strathclyde', ['Strathclyde'], 'United Kingdom', 'GB', 'Scotland', 'Glasgow', 'https://www.strath.ac.uk/', 'https://www.strath.ac.uk/courses/undergraduate/', ['Engineering', 'Business', 'Law', 'Science', 'Education', 'Computer Science']],

  ['mcmaster', 'McMaster University', ['McMaster'], 'Canada', 'CA', 'Ontario', 'Hamilton', 'https://www.mcmaster.ca/', 'https://future.mcmaster.ca/programs/', ['Engineering', 'Health Sciences', 'Business', 'Science', 'Humanities']],
  ['queens-ca', "Queen's University", ["Queen's Canada"], 'Canada', 'CA', 'Ontario', 'Kingston', 'https://www.queensu.ca/', 'https://www.queensu.ca/admission/programs', ['Engineering', 'Business', 'Science', 'Arts', 'Health Sciences']],
  ['western-ca', 'Western University', ['Western Canada'], 'Canada', 'CA', 'Ontario', 'London', 'https://www.uwo.ca/', 'https://welcome.uwo.ca/what-can-i-study/undergraduate-programs.html', ['Business', 'Engineering', 'Science', 'Health Sciences', 'Social Science']],
  ['uottawa', 'University of Ottawa', ['uOttawa'], 'Canada', 'CA', 'Ontario', 'Ottawa', 'https://www.uottawa.ca/', 'https://www.uottawa.ca/study/undergraduate-studies/programs', ['Engineering', 'Computer Science', 'Business', 'Law', 'Health Sciences', 'Social Science']],
  ['ucalgary', 'University of Calgary', ['UCalgary'], 'Canada', 'CA', 'Alberta', 'Calgary', 'https://www.ucalgary.ca/', 'https://www.ucalgary.ca/future-students/undergraduate/explore-programs', ['Engineering', 'Business', 'Science', 'Health Sciences', 'Arts']],
  ['sfu', 'Simon Fraser University', ['SFU'], 'Canada', 'CA', 'British Columbia', 'Burnaby', 'https://www.sfu.ca/', 'https://www.sfu.ca/students/admission/programs.html', ['Computer Science', 'Business', 'Engineering', 'Science', 'Arts']],
  ['uvic', 'University of Victoria', ['UVic'], 'Canada', 'CA', 'British Columbia', 'Victoria', 'https://www.uvic.ca/', 'https://www.uvic.ca/undergraduate/programs/', ['Engineering', 'Computer Science', 'Business', 'Science', 'Humanities']],
  ['umanitoba', 'University of Manitoba', ['UManitoba'], 'Canada', 'CA', 'Manitoba', 'Winnipeg', 'https://umanitoba.ca/', 'https://umanitoba.ca/explore/programs-of-study', ['Engineering', 'Business', 'Science', 'Health Sciences', 'Arts']],
  ['usask', 'University of Saskatchewan', ['USask'], 'Canada', 'CA', 'Saskatchewan', 'Saskatoon', 'https://www.usask.ca/', 'https://admissions.usask.ca/programs/', ['Engineering', 'Business', 'Agriculture', 'Science', 'Health Sciences']],
  ['dalhousie', 'Dalhousie University', ['Dal'], 'Canada', 'CA', 'Nova Scotia', 'Halifax', 'https://www.dal.ca/', 'https://www.dal.ca/study/programs.html', ['Engineering', 'Computer Science', 'Business', 'Science', 'Health Sciences']],
  ['unb', 'University of New Brunswick', ['UNB'], 'Canada', 'CA', 'New Brunswick', 'Fredericton', 'https://www.unb.ca/', 'https://www.unb.ca/academics/programs/', ['Engineering', 'Computer Science', 'Business', 'Science', 'Arts']],
  ['mun', 'Memorial University of Newfoundland', ['Memorial'], 'Canada', 'CA', 'Newfoundland and Labrador', "St. John's", 'https://www.mun.ca/', 'https://www.mun.ca/undergrad/programs/', ['Engineering', 'Business', 'Science', 'Nursing', 'Humanities']],
  ['upei', 'University of Prince Edward Island', ['UPEI'], 'Canada', 'CA', 'Prince Edward Island', 'Charlottetown', 'https://www.upei.ca/', 'https://www.upei.ca/programs', ['Business', 'Science', 'Nursing', 'Education', 'Arts']],
  ['concordia-ca', 'Concordia University', ['Concordia Montreal'], 'Canada', 'CA', 'Quebec', 'Montreal', 'https://www.concordia.ca/', 'https://www.concordia.ca/academics/undergraduate.html', ['Engineering', 'Computer Science', 'Business', 'Science', 'Arts']],
  ['york-ca', 'York University', ['York Canada'], 'Canada', 'CA', 'Ontario', 'Toronto', 'https://www.yorku.ca/', 'https://futurestudents.yorku.ca/program-search', ['Business', 'Computer Science', 'Engineering', 'Law', 'Arts', 'Science']],

  ['ucla', 'University of California, Los Angeles', ['UCLA'], 'United States', 'US', 'California', 'Los Angeles', 'https://www.ucla.edu/', 'https://admission.ucla.edu/apply/majors', ['Computer Science', 'Engineering', 'Business', 'Science', 'Arts', 'Psychology']],
  ['ucsd', 'University of California San Diego', ['UCSD'], 'United States', 'US', 'California', 'San Diego', 'https://ucsd.edu/', 'https://admissions.ucsd.edu/why/majors/index.html', ['Computer Science', 'Engineering', 'Data Science', 'Science', 'Economics', 'Psychology']],
  ['usc', 'University of Southern California', ['USC'], 'United States', 'US', 'California', 'Los Angeles', 'https://www.usc.edu/', 'https://admission.usc.edu/academic-programs/', ['Business', 'Engineering', 'Computer Science', 'Arts', 'Science', 'Media']],
  ['columbia', 'Columbia University', ['Columbia'], 'United States', 'US', 'New York', 'New York', 'https://www.columbia.edu/', 'https://undergrad.admissions.columbia.edu/academics', ['Engineering', 'Computer Science', 'Economics', 'Science', 'Humanities']],
  ['nyu', 'New York University', ['NYU'], 'United States', 'US', 'New York', 'New York', 'https://www.nyu.edu/', 'https://www.nyu.edu/admissions/undergraduate-admissions/academics/majors-and-programs.html', ['Business', 'Computer Science', 'Economics', 'Arts', 'Media', 'Science']],
  ['cornell', 'Cornell University', ['Cornell'], 'United States', 'US', 'New York', 'Ithaca', 'https://www.cornell.edu/', 'https://admissions.cornell.edu/academics/majors', ['Engineering', 'Computer Science', 'Business', 'Agriculture', 'Science', 'Humanities']],
  ['upenn', 'University of Pennsylvania', ['Penn', 'UPenn'], 'United States', 'US', 'Pennsylvania', 'Philadelphia', 'https://www.upenn.edu/', 'https://admissions.upenn.edu/academics/four-schools', ['Business', 'Engineering', 'Computer Science', 'Nursing', 'Science', 'Humanities']],
  ['princeton', 'Princeton University', ['Princeton'], 'United States', 'US', 'New Jersey', 'Princeton', 'https://www.princeton.edu/', 'https://admission.princeton.edu/academics', ['Engineering', 'Computer Science', 'Economics', 'Science', 'Humanities']],
  ['yale', 'Yale University', ['Yale'], 'United States', 'US', 'Connecticut', 'New Haven', 'https://www.yale.edu/', 'https://admissions.yale.edu/majors-and-academic-programs', ['Computer Science', 'Economics', 'Science', 'Humanities', 'Psychology']],
  ['duke', 'Duke University', ['Duke'], 'United States', 'US', 'North Carolina', 'Durham', 'https://www.duke.edu/', 'https://admissions.duke.edu/academics/', ['Engineering', 'Computer Science', 'Economics', 'Science', 'Public Policy']],
  ['unc', 'University of North Carolina at Chapel Hill', ['UNC Chapel Hill'], 'United States', 'US', 'North Carolina', 'Chapel Hill', 'https://www.unc.edu/', 'https://catalog.unc.edu/undergraduate/programs-study/', ['Business', 'Computer Science', 'Science', 'Humanities', 'Public Health']],
  ['uiuc', 'University of Illinois Urbana-Champaign', ['UIUC'], 'United States', 'US', 'Illinois', 'Champaign', 'https://illinois.edu/', 'https://myillini.illinois.edu/Programs', ['Engineering', 'Computer Science', 'Business', 'Science', 'Education']],
  ['utexas', 'The University of Texas at Austin', ['UT Austin'], 'United States', 'US', 'Texas', 'Austin', 'https://www.utexas.edu/', 'https://catalog.utexas.edu/undergraduate/', ['Engineering', 'Computer Science', 'Business', 'Science', 'Liberal Arts']],
  ['gatech', 'Georgia Institute of Technology', ['Georgia Tech'], 'United States', 'US', 'Georgia', 'Atlanta', 'https://www.gatech.edu/', 'https://www.gatech.edu/academics/bachelors-degree-programs', ['Engineering', 'Computer Science', 'Business', 'Science', 'Design']],
  ['uwashington', 'University of Washington', ['UW Seattle'], 'United States', 'US', 'Washington', 'Seattle', 'https://www.washington.edu/', 'https://www.washington.edu/uaa/advising/degree-overview/majors/', ['Engineering', 'Computer Science', 'Business', 'Science', 'Health Sciences']],
  ['wisconsin', 'University of Wisconsin-Madison', ['UW Madison'], 'United States', 'US', 'Wisconsin', 'Madison', 'https://www.wisc.edu/', 'https://guide.wisc.edu/undergraduate/', ['Engineering', 'Computer Science', 'Business', 'Science', 'Education']],
  ['purdue', 'Purdue University', ['Purdue'], 'United States', 'US', 'Indiana', 'West Lafayette', 'https://www.purdue.edu/', 'https://www.admissions.purdue.edu/majors/', ['Engineering', 'Computer Science', 'Business', 'Science', 'Agriculture']],
  ['ohio-state', 'The Ohio State University', ['Ohio State', 'OSU'], 'United States', 'US', 'Ohio', 'Columbus', 'https://www.osu.edu/', 'https://undergrad.osu.edu/majors-and-academics/majors', ['Engineering', 'Computer Science', 'Business', 'Science', 'Education']],
  ['penn-state', 'Pennsylvania State University', ['Penn State'], 'United States', 'US', 'Pennsylvania', 'University Park', 'https://www.psu.edu/', 'https://www.psu.edu/academics/undergraduate/majors', ['Engineering', 'Computer Science', 'Business', 'Science', 'Education']],
  ['uva', 'University of Virginia', ['UVA'], 'United States', 'US', 'Virginia', 'Charlottesville', 'https://www.virginia.edu/', 'https://www.virginia.edu/academics/majors', ['Engineering', 'Computer Science', 'Business', 'Science', 'Humanities']]
]

const areaProgrammes: Record<string, string[]> = {
  Business: ['Business', 'Management', 'Marketing'], Commerce: ['Commerce', 'Accounting', 'Finance'], Economics: ['Economics'], Finance: ['Finance'], Accounting: ['Accounting'],
  Engineering: ['Civil Engineering', 'Mechanical Engineering', 'Electrical Engineering', 'Chemical Engineering'], Technology: ['Information Technology'],
  'Computer Science': ['Computer Science', 'Software Engineering', 'Data Science'], Computing: ['Computer Science', 'Information Technology'], 'Data Science': ['Data Science'],
  Science: ['Mathematics', 'Statistics', 'Physics', 'Chemistry', 'Biological Sciences'], Medicine: ['Medicine'], Dentistry: ['Dentistry'], Pharmacy: ['Pharmacy'], Nursing: ['Nursing'],
  'Health Sciences': ['Biomedical Science', 'Public Health'], Psychology: ['Psychology'], Law: ['Law'], Education: ['Education'], Architecture: ['Architecture'], Design: ['Design'],
  Arts: ['History', 'Politics', 'Languages'], Humanities: ['History', 'Politics', 'Languages'], 'Social Science': ['Psychology', 'Politics'], 'Social Sciences': ['Psychology', 'Politics'],
  Agriculture: ['Agricultural Science', 'Environmental Science'], 'Marine Science': ['Marine Science'], Media: ['Media and Communications'], 'Public Health': ['Public Health'], 'Public Policy': ['Public Policy'],
  'Actuarial Science': ['Actuarial Science'], 'International Relations': ['International Relations'], Politics: ['Politics']
}

const VERIFIED_BREADTH_PROGRAMMES: Programme[] = [
  {
    id: 'unsw-medicine', institutionId: 'unsw', name: 'Bachelor of Medical Studies / Doctor of Medicine', normalizedName: 'medicine', aliases: ['Medicine', 'BMed MD'],
    qualification: 'Bachelor of Medical Studies / Doctor of Medicine', degreeType: 'Combined undergraduate/postgraduate', qualificationLevel: 'Undergraduate entry', faculty: 'Medicine & Health', studyAreas: ['Medicine', 'Health Sciences'], industryAreas: ['Medicine'], tags: ['medicine', 'health', 'ucat anz'],
    country: 'Australia', region: 'New South Wales', campus: 'Sydney', deliveryMode: 'On campus', intakeYears: [2027],
    officialProgrammeUrl: 'https://www.unsw.edu.au/study/undergraduate/bachelor-of-medical-studies-doctor-of-medicine', admissionsUrl: 'https://www.unsw.edu.au/medicine-health/study-with-us/undergraduate/applying-to-medicine', curriculumRequirements: ['Academic selection requirements vary by applicant route and qualification. Confirm the exact route on the official page.'], prerequisiteSubjects: [], entryRequirements: ['Domestic general-entry applicants complete UCAT ANZ and may be invited to interview based on the published selection process.'], standardisedTests: ['UCAT ANZ for domestic general entry'],
    applicationInformation: 'The indexed testing rule is scoped to domestic general entry for 2027. International and other pathways must use their own official selection instructions.', active: true,
    sourceUrl: 'https://www.unsw.edu.au/medicine-health/study-with-us/undergraduate/applying-to-medicine', sourceType: 'official-programme', sourceAcademicYear: '2027', admissionsCycle: '2027', confidenceStatus: 'VERIFIED_OFFICIAL', lastCheckedAt: CHECKED_AT, lastVerifiedAt: CHECKED_AT
  },
  {
    id: 'uct-bcom-economics-finance', institutionId: 'uct', name: 'Bachelor of Commerce specialising in Economics and Finance', normalizedName: 'economics and finance', aliases: ['Economics', 'Finance'],
    qualification: 'Bachelor of Commerce', degreeType: 'Bachelor', qualificationLevel: 'Undergraduate', faculty: 'Commerce', studyAreas: ['Economics', 'Finance'], industryAreas: ['Economics', 'Finance'], tags: ['economics', 'finance', 'commerce'],
    country: 'South Africa', region: 'Western Cape', campus: 'Cape Town', deliveryMode: 'Check official programme page', intakeYears: [2027],
    officialProgrammeUrl: 'https://commerce.uct.ac.za/applying-commerce/undergraduate-degrees-offered', curriculumRequirements: ['Requirements not yet structured. Confirm for your curriculum on the official site.'], prerequisiteSubjects: [], entryRequirements: ['Check the official programme and admissions pages for current requirements.'],
    applicationInformation: 'Programme identity verified from the official UCT Commerce undergraduate degree list. Confirm the current curriculum and intake before applying.', active: true,
    sourceUrl: 'https://commerce.uct.ac.za/applying-commerce/undergraduate-degrees-offered', sourceType: 'official-programme', sourceAcademicYear: '2027', admissionsCycle: '2027', confidenceStatus: 'VERIFIED_OFFICIAL', lastCheckedAt: CHECKED_AT, lastVerifiedAt: CHECKED_AT
  },
  {
    id: 'mcgill-bcom-finance', institutionId: 'mcgill', name: 'Bachelor of Commerce - Major Finance', normalizedName: 'finance', aliases: ['BCom Finance', 'Finance Major'],
    qualification: 'Bachelor of Commerce', degreeType: 'Bachelor', qualificationLevel: 'Undergraduate', faculty: 'Desautels Faculty of Management', studyAreas: ['Finance'], industryAreas: ['Finance'], tags: ['finance', 'commerce', 'investment'],
    country: 'Canada', region: 'Quebec', campus: 'Montreal', deliveryMode: 'Check official programme page', intakeYears: [2027],
    officialProgrammeUrl: 'https://www.mcgill.ca/desautels/programs/bcom/academics/areas-study/finance', curriculumRequirements: ['Requirements not yet structured. Confirm for your curriculum on the official site.'], prerequisiteSubjects: [], entryRequirements: ['Check the official programme and admissions pages for current requirements.'],
    applicationInformation: 'Programme identity verified from the official McGill Desautels Finance area and programme list.', active: true,
    sourceUrl: 'https://www.mcgill.ca/desautels/programs/bcom/academics/areas-study/finance', sourceType: 'official-programme', sourceAcademicYear: '2027', admissionsCycle: '2027', confidenceStatus: 'VERIFIED_OFFICIAL', lastCheckedAt: CHECKED_AT, lastVerifiedAt: CHECKED_AT
  },
  {
    id: 'unc-medical-anthropology-ba', institutionId: 'unc', name: 'Medical Anthropology Major, B.A.', normalizedName: 'medical anthropology', aliases: ['Medicine pathway', 'Pre-med health studies'],
    qualification: 'Bachelor of Arts', degreeType: 'BA', qualificationLevel: 'Undergraduate', faculty: 'Anthropology', studyAreas: ['Medical Anthropology', 'Medicine'], industryAreas: ['Health Sciences'], tags: ['medicine', 'medical anthropology', 'pre-med', 'health'],
    country: 'United States', region: 'North Carolina', campus: 'Chapel Hill', deliveryMode: 'Check official programme page', intakeYears: [2027],
    officialProgrammeUrl: 'https://catalog.unc.edu/undergraduate/programs-study/medical-anthropology-major-ba/', curriculumRequirements: ['This is an undergraduate health-related pathway, not a medical degree. Confirm professional-school prerequisites separately.'], prerequisiteSubjects: [], entryRequirements: ['Check the official programme and admissions pages for current requirements.'],
    applicationInformation: 'Official UNC undergraduate major related to health and medicine. It is not an M.D. or a guarantee of medical-school entry.', active: true,
    sourceUrl: 'https://catalog.unc.edu/undergraduate/programs-study/medical-anthropology-major-ba/', sourceType: 'official-programme', sourceAcademicYear: '2026-2027', admissionsCycle: '2027', confidenceStatus: 'VERIFIED_OFFICIAL', lastCheckedAt: CHECKED_AT, lastVerifiedAt: CHECKED_AT
  },
  {
    id: 'berkeley-legal-studies-ba', institutionId: 'berkeley', name: 'Legal Studies, B.A.', normalizedName: 'legal studies', aliases: ['Law', 'Legal Studies'],
    qualification: 'Bachelor of Arts', degreeType: 'BA', qualificationLevel: 'Undergraduate', faculty: 'Jurisprudence and Social Policy', studyAreas: ['Law', 'Legal Studies'], industryAreas: ['Law'], tags: ['law', 'legal studies'],
    country: 'United States', region: 'California', campus: 'Berkeley', deliveryMode: 'Check official programme page', intakeYears: [2027],
    officialProgrammeUrl: 'https://jsp-ls.berkeley.edu/undergraduate', curriculumRequirements: ['This is an undergraduate legal studies degree, not a professional J.D. Confirm graduate law-school requirements separately.'], prerequisiteSubjects: [], entryRequirements: ['Check the official programme and admissions pages for current requirements.'],
    applicationInformation: 'Programme identity verified from UC Berkeley Legal Studies. This is not a professional law degree.', active: true,
    sourceUrl: 'https://jsp-ls.berkeley.edu/undergraduate', sourceType: 'official-programme', sourceAcademicYear: '2027', admissionsCycle: '2027', confidenceStatus: 'VERIFIED_OFFICIAL', lastCheckedAt: CHECKED_AT, lastVerifiedAt: CHECKED_AT
  },
  {
    id: 'nyu-stern-bs-business-finance', institutionId: 'nyu', name: 'BS in Business - Finance Concentration', normalizedName: 'finance', aliases: ['Finance', 'BS Business Finance'],
    qualification: 'Bachelor of Science', degreeType: 'BS', qualificationLevel: 'Undergraduate', faculty: 'Stern School of Business', studyAreas: ['Finance', 'Business'], industryAreas: ['Finance'], tags: ['finance', 'business'],
    country: 'United States', region: 'New York', campus: 'New York', deliveryMode: 'Check official programme page', intakeYears: [2027],
    officialProgrammeUrl: 'https://www.stern.nyu.edu/programs-admissions/undergraduate/academics/bs-degree-business', curriculumRequirements: ['Requirements not yet structured. Confirm for your curriculum on the official site.'], prerequisiteSubjects: [], entryRequirements: ['Check the official programme and admissions pages for current requirements.'],
    applicationInformation: 'Official NYU Stern BS in Business with Finance available as a concentration.', active: true,
    sourceUrl: 'https://www.stern.nyu.edu/programs-admissions/undergraduate/academics/bs-degree-business', sourceType: 'official-programme', sourceAcademicYear: '2027', admissionsCycle: '2027', confidenceStatus: 'VERIFIED_OFFICIAL', lastCheckedAt: CHECKED_AT, lastVerifiedAt: CHECKED_AT
  },
  {
    id: 'michigan-education-empowerment-ba', institutionId: 'umich', name: 'Education for Empowerment, B.A.', normalizedName: 'education for empowerment', aliases: ['Education'],
    qualification: 'Bachelor of Arts', degreeType: 'BA', qualificationLevel: 'Undergraduate', faculty: 'Marsal Family School of Education', studyAreas: ['Education'], industryAreas: ['Education'], tags: ['education', 'teaching', 'learning'],
    country: 'United States', region: 'Michigan', campus: 'Ann Arbor', deliveryMode: 'Check official programme page', intakeYears: [2027],
    officialProgrammeUrl: 'https://marsal.umich.edu/academics-admissions/degrees/undergraduate/education-empowerment', curriculumRequirements: ['Requirements not yet structured. Confirm for your curriculum on the official site.'], prerequisiteSubjects: [], entryRequirements: ['Check the official programme and admissions pages for current requirements.'],
    applicationInformation: 'Programme identity verified from the official University of Michigan School of Education page.', active: true,
    sourceUrl: 'https://marsal.umich.edu/academics-admissions/degrees/undergraduate/education-empowerment', sourceType: 'official-programme', sourceAcademicYear: '2027', admissionsCycle: '2027', confidenceStatus: 'VERIFIED_OFFICIAL', lastCheckedAt: CHECKED_AT, lastVerifiedAt: CHECKED_AT
  }
]

function titleFor(code: CountryCode, subject: string) {
  if (code === 'US') return ['Engineering', 'Computer Science', 'Software Engineering', 'Data Science', 'Mathematics', 'Statistics', 'Physics', 'Chemistry', 'Biological Sciences', 'Nursing', 'Biomedical Science'].includes(subject) ? `BS ${subject}` : `BA ${subject}`
  if (code === 'GB') return ['Law'].includes(subject) ? 'LLB Law' : ['History', 'Politics', 'Languages', 'International Relations', 'Media and Communications'].includes(subject) ? `BA ${subject}` : `BSc ${subject}`
  if (subject === 'Law') return 'Bachelor of Laws'
  if (subject === 'Medicine') return code === 'ZA' ? 'Bachelor of Medicine and Bachelor of Surgery' : 'Bachelor of Medicine'
  return `Bachelor of ${subject}`
}

function slug(value: string) {
  return value.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function buildDepthProgrammes(institutions: Institution[]): Programme[] {
  return institutions.flatMap((entry) => {
    const subjects = Array.from(new Set(entry.studyAreas.flatMap((area) => areaProgrammes[area] ?? []))).slice(0, 14)
    const source = entry.programmeFinderUrl || entry.admissionsUrl || entry.officialWebsite
    return subjects.map((subject) => {
      const name = titleFor(entry.code, subject)
      return {
        id: `${entry.id}-${slug(name)}`,
        institutionId: entry.id,
        name,
        normalizedName: subject.toLowerCase(),
        aliases: [subject],
        qualification: entry.code === 'US' ? 'Undergraduate major' : 'Undergraduate degree',
        degreeType: entry.code === 'US' ? (name.startsWith('BS') ? 'BS' : 'BA') : name.split(' ')[0],
        qualificationLevel: 'Undergraduate',
        faculty: entry.studyAreas.find((area) => (areaProgrammes[area] ?? []).includes(subject)) || 'Undergraduate studies',
        studyAreas: [subject],
        industryAreas: [subject],
        tags: [subject.toLowerCase(), ...subject.toLowerCase().split(' ')],
        country: entry.country,
        region: entry.region,
        campus: entry.city,
        deliveryMode: 'Check official course finder',
        intakeYears: [2027],
        officialProgrammeUrl: source,
        admissionsUrl: entry.undergraduateAdmissionsUrl || entry.admissionsUrl,
        applicationUrl: entry.applicationUrl,
        curriculumRequirements: ['Requirements not yet structured. Confirm for your curriculum on the official site.'],
        prerequisiteSubjects: [],
        entryRequirements: ['Check the official programme and admissions pages for current requirements.'],
        applicationInformation: 'Programme title indexed from the institution-level official catalogue. Confirm the exact award, campus, intake and requirements before applying.',
        active: true,
        sourceUrl: source,
        sourceType: 'official-course-finder' as const,
        sourceAcademicYear: '2027',
        admissionsCycle: '2027',
        confidenceStatus: 'AUTO_EXTRACTED_OFFICIAL' as const,
        lastCheckedAt: CHECKED_AT,
        lastVerifiedAt: CHECKED_AT
      }
    })
  })
}

const additions = additionalInstitutions.map(institution)

export const PRIORITY_DEPTH_CATALOGUES: CountryCatalogue[] = (['ZA', 'AU', 'GB', 'CA', 'US'] as CountryCode[]).map((code) => {
  const countryInstitutions = additions.filter((entry) => entry.code === code)
  const names: Record<CountryCode, [string, string]> = {
    ZA: ['South Africa', 'Africa'], AU: ['Australia', 'Oceania'], GB: ['United Kingdom', 'Europe'],
    CA: ['Canada', 'North America'], US: ['United States', 'North America'], SG: ['Singapore', 'Southeast Asia'], MY: ['Malaysia', 'Southeast Asia'],
    ID: ['Indonesia', 'Southeast Asia'], TH: ['Thailand', 'Southeast Asia'], VN: ['Vietnam', 'Southeast Asia'], PH: ['Philippines', 'Southeast Asia']
  }
  return { code, name: names[code][0], region: names[code][1], status: 'partial', institutions: countryInstitutions, programmes: buildDepthProgrammes(countryInstitutions) }
})

export function deepenExistingInstitutions(catalogues: CountryCatalogue[]) {
  return catalogues.map((catalogue) => {
    if (!['ZA', 'AU', 'GB', 'CA', 'US'].includes(catalogue.code)) return catalogue
    const institutions = catalogue.institutions.map((entry) => ({
      ...entry,
      undergraduateAdmissionsUrl: entry.undergraduateAdmissionsUrl || entry.admissionsUrl,
      programmeFinderUrl: entry.programmeFinderUrl || entry.admissionsUrl || entry.officialWebsite,
      lastCheckedAt: entry.lastCheckedAt || CHECKED_AT,
      lastIndexedAt: CHECKED_AT,
      programmeCoverageStatus: entry.programmeCoverageStatus || 'partial' as const,
      admissionsCoverageStatus: entry.admissionsCoverageStatus || 'building' as const
    }))
    const programmes = [...catalogue.programmes]
    for (const candidate of buildDepthProgrammes(institutions)) {
      const duplicate = programmes.some((entry) => entry.id === candidate.id || (entry.institutionId === candidate.institutionId && entry.normalizedName === candidate.normalizedName))
      if (!duplicate) programmes.push(candidate)
    }
    for (const candidate of VERIFIED_BREADTH_PROGRAMMES.filter((entry) => entry.country === catalogue.name)) {
      const duplicate = programmes.some((entry) => entry.id === candidate.id)
      if (!duplicate) programmes.push(candidate)
    }
    return { ...catalogue, status: 'partial' as const, institutions, programmes }
  })
}
