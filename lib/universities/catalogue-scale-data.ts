import type { Programme } from './types.ts'

const CHECKED_AT = '2026-09-10'

type InstitutionSeed = {
  institutionId: string
  sourceUrl: string
  country: string
  region: string
  campus: string
  programmes: string[]
}

const slug = (value: string) => value.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

function studyAreas(name: string) {
  const terms: Array<[RegExp, string]> = [
    [/actuar|insurance|risk/i, 'Actuarial Science'], [/account|commerce|business|management|marketing|finance|econom/i, 'Business and Commerce'],
    [/computer|computing|software|information technology|cyber|data|artificial intelligence|digital/i, 'Computer Science and Data'],
    [/engineer|geomatics|surveying|mechatronic|robotics/i, 'Engineering'], [/architect|construction|built environment|quantity surveying|urban|property/i, 'Built Environment'],
    [/medicine|medical|health|nursing|pharmacy|pharmacology|dental|oral|therapy|audiology|biokinetic|podiatry|radiography|chiropractic|nutrition|neuroscience/i, 'Health Sciences'],
    [/law|legal|criminology|crime/i, 'Law and Criminology'], [/education|teaching/i, 'Education'],
    [/science|biology|biotech|chemistry|physics|mathemat|statistics|environment|agricult|forestry|food|ecology/i, 'Science'],
    [/arts|humanities|language|history|music|theatre|design|fashion|film|media|journalism|social|policy|politics|philosophy|psychology|anthropology/i, 'Arts and Social Sciences']
  ]
  const matches = terms.filter(([pattern]) => pattern.test(name)).map(([, area]) => area)
  return matches.length ? matches : ['Interdisciplinary Studies']
}

function faculty(name: string) {
  const area = studyAreas(name)[0]
  const labels: Record<string, string> = {
    'Actuarial Science': 'Business and Science', 'Business and Commerce': 'Business and Economics', 'Computer Science and Data': 'Computing and Information Technology',
    Engineering: 'Engineering', 'Built Environment': 'Architecture and the Built Environment', 'Health Sciences': 'Health Sciences',
    'Law and Criminology': 'Law', Education: 'Education', Science: 'Science', 'Arts and Social Sciences': 'Arts and Social Sciences',
    'Interdisciplinary Studies': 'Interdisciplinary Studies'
  }
  return labels[area]
}

function isCombined(name: string) {
  const bachelorCount = name.match(/\bBachelor\b/gi)?.length ?? 0
  return bachelorCount > 1 || /\s*(?:\/|and|with)\s+(?:Bachelor|BSc|BA|BASc|BCom|BEng|Laws|Legal|Science|Arts|Business|Commerce|Engineering|Computing|Education|Criminology|Finance|Accounting|Psychology)/i.test(name)
}

function programme(seed: InstitutionSeed, name: string): Programme {
  const areas = studyAreas(name)
  const combined = isCombined(name)
  return {
    id: `${seed.institutionId}-scale-${slug(name)}`,
    institutionId: seed.institutionId,
    name,
    normalizedName: name.toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/\b(bachelor|honours|honors|degree|diploma|advanced|of|in|the)\b/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim(),
    aliases: areas,
    qualification: name,
    degreeType: combined ? 'Double degree' : /diploma/i.test(name) ? 'Diploma' : 'Bachelor',
    qualificationLevel: 'Undergraduate',
    faculty: combined ? 'Combined faculties' : faculty(name),
    studyAreas: areas,
    industryAreas: areas,
    tags: Array.from(new Set([name.toLowerCase(), ...areas.map((area) => area.toLowerCase()), ...name.toLowerCase().split(/\W+/).filter(Boolean)])),
    country: seed.country,
    region: seed.region,
    campus: seed.campus,
    deliveryMode: 'Check official course finder',
    intakeYears: [2027],
    officialProgrammeUrl: seed.sourceUrl,
    curriculumRequirements: ['Requirements vary by curriculum and intake. Confirm them in the official course finder.'],
    prerequisiteSubjects: [],
    entryRequirements: ['Check the official programme entry for current prerequisites and selection requirements.'],
    applicationInformation: 'Programme title was reviewed against the current official undergraduate programme index. Confirm current intake, campus and requirements before applying.',
    active: true,
    sourceUrl: seed.sourceUrl,
    sourceType: 'official-course-finder',
    sourceAcademicYear: '2027',
    admissionsCycle: '2027',
    confidenceStatus: 'NEEDS_REVIEW',
    lastCheckedAt: CHECKED_AT,
    lastVerifiedAt: CHECKED_AT
  }
}

const SOUTH_AFRICA: InstitutionSeed[] = [
  ['uct','https://uct.ac.za/students/prospective-students/undergraduate-prospectus','Western Cape','Cape Town',['Bachelor of Social Work','Bachelor of Music','Diploma in Music Performance','Bachelor of Arts in Fine Art','Bachelor of Arts in Theatre and Performance','Bachelor of Science in Engineering in Geomatics','Bachelor of Science in Engineering in Mechatronics','Bachelor of Science in Engineering in Electrical and Computer Engineering']],
  ['wits','https://www.wits.ac.za/course-finder/undergraduate/','Gauteng','Johannesburg',['Bachelor of Science in Actuarial Science','Bachelor of Dental Science','Bachelor of Pharmacy','Bachelor of Clinical Medical Practice','Bachelor of Oral Health Sciences','Bachelor of Science in Occupational Therapy','Bachelor of Science in Physiotherapy','Bachelor of Arts in Speech-Language Pathology']],
  ['uj','https://www.uj.ac.za/admission-aid/undergraduate/','Gauteng','Johannesburg',['Bachelor of Optometry','Bachelor of Health Sciences in Biokinetics','Bachelor of Health Sciences in Podiatry','Bachelor of Nursing','Bachelor of Emergency Medical Care','Bachelor of Arts in Fashion Design','Bachelor of Arts in Communication Design','Bachelor of Arts in Industrial Design']],
  ['up','https://www.up.ac.za/undergraduate','Gauteng','Pretoria',['Bachelor of Commerce in Econometrics','Bachelor of Commerce in Law','Bachelor of Science in Quantity Surveying','Bachelor of Science in Construction Management','Bachelor of Town and Regional Planning','Bachelor of Audiology','Bachelor of Speech-Language Pathology','Bachelor of Occupational Therapy']],
  ['stellenbosch','https://www.su.ac.za/en/programmes','Western Cape','Stellenbosch',['Bachelor of Commerce in International Business','Bachelor of Arts in Humanities','Bachelor of Arts in Development and Environment','Bachelor of Arts in Drama and Theatre Studies','Bachelor of Music','Bachelor of Science in Food Science','Bachelor of Science in Forestry','Bachelor of Science in Conservation Ecology']],
  ['ukzn','https://applications.ukzn.ac.za/Undergraduate-Programmes.aspx','KwaZulu-Natal','Durban and Pietermaritzburg',['Bachelor of Sport Science','Bachelor of Dental Therapy','Bachelor of Optometry','Bachelor of Pharmacy','Bachelor of Nursing','Bachelor of Architectural Studies','Bachelor of Science in Land Surveying','Bachelor of Science in Property Development']],
  ['nwu','https://studies.nwu.ac.za/studies/faculty-fact-sheets','North West','Multiple campuses',['Bachelor of Commerce in Economic Sciences','Bachelor of Commerce in Chartered Accountancy','Bachelor of Commerce in Financial Accountancy','Bachelor of Commerce in Management Sciences','Bachelor of Engineering in Chemical Engineering','Bachelor of Engineering in Electrical and Electronic Engineering','Bachelor of Engineering in Mechanical Engineering','Bachelor of Engineering in Industrial Engineering']],
  ['ufs','https://www.ufs.ac.za/prospective/prospective-students','Free State','Bloemfontein',['Bachelor of Commerce in Investment Management and Banking','Bachelor of Commerce in Economics','Bachelor of Commerce in Business and Financial Analytics','Bachelor of Social Work','Bachelor of Architecture','Bachelor of Science in Quantity Surveying','Bachelor of Science in Construction Management','Bachelor of Laws']],
  ['uwc','https://www.uwc.ac.za/study/faculties-and-programmes','Western Cape','Bellville',['Bachelor of Commerce in Accounting','Bachelor of Commerce in Financial Accounting','Bachelor of Commerce in Information Systems','Bachelor of Science in Biotechnology','Bachelor of Science in Biodiversity and Conservation Biology','Bachelor of Pharmacy','Bachelor of Oral Health','Bachelor of Laws']],
  ['unisa','https://www.unisa.ac.za/sites/corporate/default/Apply-for-admission/Undergraduate-qualifications/Qualifications/All-qualifications','National','Distance',['Bachelor of Accounting Sciences in Financial Accounting','Bachelor of Accounting Sciences in Management Accounting','Bachelor of Accounting Sciences in Internal Auditing','Bachelor of Commerce in Business Management','Bachelor of Commerce in Economics','Bachelor of Commerce in Human Resource Management','Bachelor of Commerce in Marketing Management','Bachelor of Commerce in Quantitative Management']],
  ['nmu','https://www.mandela.ac.za/Study-at-Mandela/Courses-on-offer/Career-study-fields','Eastern Cape','Gqeberha',['Bachelor of Pharmacy','Bachelor of Radiography in Diagnostics','Bachelor of Environmental Health','Bachelor of Commerce in Accounting','Bachelor of Commerce in Law','Bachelor of Arts in Media, Communication and Culture','Bachelor of Music','Bachelor of Social Work']],
  ['dut','https://www.dut.ac.za/wp-content/uploads/2026/06/Study-Opportunities-2027.pdf','KwaZulu-Natal','Durban',['Diploma in Accounting','Diploma in ICT in Applications Development','Bachelor of Health Sciences in Chiropractic','Bachelor of Health Sciences in Dental Technology','Bachelor of Health Sciences in Emergency Medical Care','Diploma in Fashion Design','Bachelor of the Built Environment in Interior Design','Diploma in Journalism']],
  ['vut','https://vut.ac.za/admission-requirements/','Gauteng','Vanderbijlpark',['Diploma in Biotechnology','Diploma in Analytical Chemistry','Diploma in Information Technology','Diploma in Logistics','Diploma in Internal Auditing','Diploma in Cost and Management Accounting','Diploma in Tourism Management','Diploma in Fashion']],
  ['cut','https://www.cut.ac.za/programmes-offered','Free State','Bloemfontein',['Bachelor of Construction Management','Bachelor of Quantity Surveying','Diploma in Hydrology and Water Resources Management','Bachelor of Radiography in Diagnostics','Bachelor of Health Sciences in Clinical Technology','Bachelor of Health Science in Medical Laboratory Sciences','Bachelor of Environmental Health','Bachelor of Accountancy']]
].map(([institutionId, sourceUrl, region, campus, programmes]) => ({ institutionId, sourceUrl, country: 'South Africa', region, campus, programmes })) as InstitutionSeed[]

const AUSTRALIA: InstitutionSeed[] = [
  ['monash','https://www.monash.edu/study/courses/find-a-course','Victoria','Multiple campuses',['Bachelor of Arts and Bachelor of Business','Bachelor of Arts and Bachelor of Laws (Honours)','Bachelor of Arts and Bachelor of Music','Bachelor of Arts and Bachelor of Science','Bachelor of Biomedical Science and Bachelor of Commerce','Bachelor of Business and Bachelor of Banking and Finance','Bachelor of Business and Bachelor of Media Communication','Bachelor of Computer Science and Bachelor of Science']],
  ['unimelb','https://study.unimelb.edu.au/find/courses/undergraduate','Victoria','Parkville',['Bachelor of Agriculture','Bachelor of Fine Arts (Acting)','Bachelor of Fine Arts (Animation)','Bachelor of Fine Arts (Dance)','Bachelor of Fine Arts (Film and Television)','Bachelor of Fine Arts (Music Theatre)','Bachelor of Music','Bachelor of Oral Health']],
  ['unsw','https://www.unsw.edu.au/study/find-a-degree-or-course','New South Wales','Kensington',['Bachelor of Actuarial Studies / Bachelor of Commerce','Bachelor of Actuarial Studies / Bachelor of Economics','Bachelor of Actuarial Studies / Bachelor of Science','Bachelor of Advanced Computer Science (Honours) / Bachelor of Commerce','Bachelor of Commerce / Bachelor of Design','Bachelor of Commerce / Bachelor of Media','Bachelor of Engineering (Honours) / Bachelor of Laws','Bachelor of Science / Bachelor of Laws']],
  ['usyd','https://www.sydney.edu.au/courses/search.html?search-type=course&page=1','New South Wales','Camperdown',['Bachelor of Arts and Bachelor of Advanced Studies','Bachelor of Science and Bachelor of Advanced Studies','Bachelor of Economics and Bachelor of Advanced Studies','Bachelor of Design and Bachelor of Advanced Studies','Bachelor of Engineering Honours and Bachelor of Arts','Bachelor of Engineering Honours and Bachelor of Laws','Bachelor of Advanced Computing and Bachelor of Science','Bachelor of Applied Science (Diagnostic Radiography)']],
  ['uq','https://study.uq.edu.au/study-options/programs','Queensland','St Lucia',['Bachelor of Agribusiness / Bachelor of Agricultural Science','Bachelor of Arts / Bachelor of Education (Secondary)','Bachelor of Arts / Bachelor of Laws (Honours)','Bachelor of Arts / Bachelor of Social Science','Bachelor of Arts / Bachelor of Tourism, Hospitality and Event Management','Bachelor of Advanced Business (Honours)','Bachelor of Advanced Finance and Economics (Honours)','Bachelor of Architectural Design']],
  ['anu','https://programsandcourses.anu.edu.au/catalogue','Australian Capital Territory','Canberra',['Bachelor of Accounting','Bachelor of Accounting (Honours)','Bachelor of Actuarial Studies','Bachelor of Actuarial Studies (Honours)','Bachelor of Advanced Computing (Honours)','Bachelor of Advanced Computing (Research and Development) (Honours)','Bachelor of Applied Data Analytics','Bachelor of Applied Data Analytics (Honours)']],
  ['uts','https://www.uts.edu.au/courses','New South Wales','Sydney',['Bachelor of Business Bachelor of Laws','Bachelor of Communication Bachelor of Laws','Bachelor of Engineering (Honours) Bachelor of Business','Bachelor of Engineering Science Bachelor of Laws','Bachelor of Information Technology Bachelor of Business','Bachelor of Medical Science Bachelor of Laws','Bachelor of Science Bachelor of Laws','Bachelor of Design in Architecture Bachelor of Creative Intelligence and Innovation']],
  ['rmit','https://www.rmit.edu.au/study-with-us','Victoria','Melbourne',['Bachelor of Business/Bachelor of Laws','Bachelor of Engineering (Honours)/Bachelor of Business','Bachelor of Applied Science (Aviation)','Bachelor of Architectural Design','Bachelor of Criminal Justice','Bachelor of Fashion (Design)','Bachelor of Laboratory Medicine (Honours)','Bachelor of Social Work/Bachelor of Social Science (Psychology)']],
  ['deakin','https://www.deakin.edu.au/study/find-a-course/undergraduate-courses','Victoria','Multiple campuses',['Bachelor of Arts/Bachelor of Laws','Bachelor of Commerce/Bachelor of Laws','Bachelor of Criminology/Bachelor of Laws','Bachelor of Cyber Security/Bachelor of Criminology','Bachelor of Forensic Science/Bachelor of Criminology','Bachelor of Nursing/Bachelor of Midwifery','Bachelor of Public Health and Health Promotion/Bachelor of Nursing','Bachelor of Science/Bachelor of Laws']],
  ['latrobe','https://www.latrobe.edu.au/courses/a-z','Victoria','Multiple campuses',['Bachelor of Nursing/Bachelor of Midwifery','Bachelor of Criminology/Bachelor of Laws','Bachelor of Arts/Bachelor of Health Sciences','Bachelor of Laws (Honours)/Bachelor of Arts','Bachelor of Laws (Honours)/Bachelor of Commerce','Bachelor of Laws (Honours)/Bachelor of Criminology','Bachelor of Politics, Philosophy and Economics','Bachelor of Veterinary Nursing']],
  ['macquarie','https://www.mq.edu.au/study/find-a-course/undergraduate','New South Wales','Sydney',['Bachelor of Actuarial Studies with Bachelor of Professional Practice (Honours)','Bachelor of Applied Finance with Bachelor of Professional Accounting','Bachelor of Arts with Bachelor of Laws','Bachelor of Business Analytics with Bachelor of Applied Finance','Bachelor of Commerce with Bachelor of Laws','Bachelor of Cyber Security with Bachelor of Laws','Bachelor of Engineering (Honours) with Bachelor of Commerce','Bachelor of Psychology with Bachelor of Laws']],
  ['qut','https://www.qut.edu.au/courses','Queensland','Brisbane',['Bachelor of Business/Bachelor of Laws (Honours)','Bachelor of Business/Bachelor of Information Technology','Bachelor of Engineering (Honours)/Bachelor of Information Technology','Bachelor of Design/Bachelor of Business','Bachelor of Data Science','Bachelor of Games and Interactive Environments','Bachelor of Medical Laboratory Science','Bachelor of Urban Development (Honours) (Quantity Surveying and Cost Engineering)']],
  ['griffith','https://www.griffith.edu.au/study/degrees','Queensland','Multiple campuses',['Bachelor of Actuarial Science','Bachelor of Advanced Business (Honours)','Bachelor of Business/Bachelor of Data Science','Bachelor of Commerce','Bachelor of Computer Science','Bachelor of Cyber Security','Bachelor of Engineering (Honours)/Bachelor of Business','Bachelor of Laws (Honours)/Bachelor of Government and International Relations']],
  ['curtin','https://www.curtin.edu.au/study/undergraduate/','Western Australia','Perth',['Bachelor of Advanced Science (Honours)','Bachelor of Applied Science (Architectural Science)','Bachelor of Arts','Bachelor of Computing','Bachelor of Design','Bachelor of Laws','Bachelor of Nursing','Bachelor of Pharmacy (Honours)']],
  ['uwa','https://www.uwa.edu.au/study/explore-courses/undergraduate','Western Australia','Perth',['Bachelor of Advanced Computer Science (Honours)','Bachelor of Automation and Robotics','Bachelor of Biomedical Science','Bachelor of Business Analytics','Bachelor of Commerce and Bachelor of Science','Bachelor of Economics','Bachelor of Environmental Design','Bachelor of Philosophy (Honours)']],
  ['flinders','https://www.flinders.edu.au/study/courses','South Australia','Bedford Park',['Bachelor of Accounting','Bachelor of Arts','Bachelor of Business Analytics','Bachelor of Computer Science','Bachelor of Criminology','Bachelor of Health Sciences','Bachelor of Laws and Legal Practice (Honours)','Bachelor of Nursing (Pre-registration)']],
  ['swinburne','https://www.swinburne.edu.au/courses/find-a-course/','Victoria','Hawthorn',['Bachelor of Accounting','Bachelor of Animation','Bachelor of Aviation','Bachelor of Built Environment','Bachelor of Criminal Justice and Criminology','Bachelor of Cyber Security','Bachelor of Games and Interactivity','Bachelor of Health Science']]
].map(([institutionId, sourceUrl, region, campus, programmes]) => ({ institutionId, sourceUrl, country: 'Australia', region, campus, programmes })) as InstitutionSeed[]

const CANADA: InstitutionSeed[] = [
  ['utoronto','https://future.utoronto.ca/academics/undergraduate-programs/','Ontario','Toronto',['Actuarial Science','Bioinformatics and Computational Biology','Cognitive Science','Ethics, Society, and Law','Financial Economics','Mathematical Applications in Economics and Finance','Peace, Conflict and Justice','Public Policy']],
  ['ubc','https://you.ubc.ca/programs/','British Columbia','Vancouver and Okanagan',['Applied Animal Biology (BSc)','Food and Nutritional Sciences (BSc)','Global Resource Systems (BSc)','Cognitive Systems (BA)','Combined Major in Business and Computer Science','Integrated Sciences (BSc)','Manufacturing Engineering (BASc)','Urban Forestry (BUF)']],
  ['mcgill','https://www.mcgill.ca/undergraduate-admissions/programs','Quebec','Montreal',['Agricultural Economics','Agro-Environmental Sciences','Bioresource Engineering','Food Science','Global Food Security','Cognitive Science','Environment','Pharmacology']],
  ['waterloo','https://uwaterloo.ca/future-students/programs','Ontario','Waterloo',['Accounting and Financial Management','Global Business and Digital Arts','Architectural Engineering','Biotechnology/Chartered Professional Accountancy','Environment and Business','Geography and Aviation','Sustainability and Financial Management','Mathematical Finance']],
  ['ualberta','https://www.ualberta.ca/en/undergraduate-programs/index.html','Alberta','Edmonton',['Bachelor of Arts in Criminology','Bachelor of Design','Bachelor of Kinesiology','Bachelor of Science in Kinesiology','Bachelor of Science in Nursing','Bachelor of Science in Medical Laboratory Science','Bachelor of Science in Radiation Therapy','Bachelor of Arts in Native Studies']],
  ['queens-ca','https://www.queensu.ca/admission/undergraduate-programs','Ontario','Kingston',['Engineering Chemistry','Geological Engineering','Mathematics and Engineering','Mechatronics and Robotics Engineering','Mining Engineering','Health Sciences','Kinesiology','Life Sciences and Biochemistry']],
  ['uottawa','https://catalogue.uottawa.ca/en/undergrad/','Ontario','Ottawa',['BASc Biomedical Mechanical Engineering and BSc Computing Technology','BASc Chemical Engineering and BSc Computing Technology','BASc Multidisciplinary Design Engineering','Honours BSc Computer Science and BSc Mathematics (Data Science)','Honours BSc Financial Mathematics and Economics','Honours BSc Physics and BASc Electrical Engineering','Honours BSocSc Conflict Studies and Human Rights','Honours BSocSc International Development and Globalization']],
  ['mcmaster','https://future.mcmaster.ca/programs/','Ontario','Hamilton',['Arts & Science','Chemical & Physical Sciences Gateway','Environmental & Earth Sciences Gateway','Honours Integrated Science','Honours Health Sciences','Medical Radiation Sciences','Integrated Biomedical Engineering & Health Sciences','Integrated Business & Humanities']],
  ['western-ca','https://westerncalendar.uwo.ca/Modules.cfm','Ontario','London',['Actuarial Science','Applied Financial Modelling','Data Science','Financial Modelling','Integrated Science with Mathematical and Statistical Sciences','Artificial Intelligence Systems Engineering','Environmental Engineering with International Development','Mechatronic Systems Engineering and Biomedical Engineering']],
  ['dalhousie','https://www.dal.ca/study/programs.html','Nova Scotia','Halifax',['Algorithms & Scientific Computing (BCS)','Applied Computer Science (BACS)','Artificial Intelligence (BCS)','Cybersecurity (BCS)','Digital Innovation (BCS)','Human-Computer Interaction (BCS)','Bioveterinary Science (BSc)','International Food Business (BAgr)']],
  ['ucalgary','https://www.ucalgary.ca/future-students/undergraduate/programs','Alberta','Calgary',['Actuarial Science (BSc)','Astrophysics (BSc)','Biochemistry (BSc)','Biomechanics (BSc)','Bioinformatics (BHSc)','Biomedical Sciences (BHSc)','Health and Society (BHSc)','Biomedical Engineering (BSc in Engineering)']],
  ['sfu','https://www.sfu.ca/students/admission/programs.html','British Columbia','Burnaby',['Interactive Arts and Technology','Mechatronic Systems Engineering','Sustainable Energy Engineering','Business and Computing Science Joint Major','Geographic Information Science','Resource and Environmental Management','Behavioural Neuroscience','Molecular Biology and Biochemistry']]
].map(([institutionId, sourceUrl, region, campus, programmes]) => ({ institutionId, sourceUrl, country: 'Canada', region, campus, programmes })) as InstitutionSeed[]

const UNITED_KINGDOM: InstitutionSeed[] = [
  {
    institutionId: 'sheffield',
    sourceUrl: 'https://www.sheffield.ac.uk/undergraduate/courses/2027',
    country: 'United Kingdom',
    region: 'England',
    campus: 'Sheffield',
    programmes: [
      'Accounting and Financial Management and Economics BA',
      'Architecture and Landscape BA',
      'Chemistry with Biological and Medicinal Chemistry BSc',
      'Data Science BSc',
      'Dental Hygiene and Dental Therapy BSc',
      'Economics and Mathematics BSc',
      'Law and Criminology LLB',
      'Philosophy, Politics and Economics BA'
    ]
  }
]

const UNITED_STATES: InstitutionSeed[] = [
  ['mit','https://catalog.mit.edu/degree-charts/','Massachusetts','Cambridge',['Materials Science and Engineering (Course 3)','Architecture (Course 4)','Chemistry (Course 5)','Biology (Course 7)','Physics (Course 8)','Brain and Cognitive Sciences (Course 9)','Chemical Engineering (Course 10)','Economics (Course 14-1)','Aerospace Engineering (Course 16)','Business Analytics (Course 15-2)']],
  ['stanford','https://majors.stanford.edu/majors','California','Stanford',['Applied Physics, BS','Biology, BS','Chemistry, BS','Civil Engineering, BS','Electrical Engineering, BS','Mechanical Engineering, BS','Physics, BS','Psychology, BA']],
  ['harvard','https://college.harvard.edu/academics/liberal-arts-sciences/concentrations','Massachusetts','Cambridge',['Astrophysics concentration','Chemistry concentration','Physics concentration','Psychology concentration','History concentration','English concentration','Integrative Biology concentration','Molecular and Cellular Biology concentration']],
  ['berkeley','https://registrar.berkeley.edu/catalog','California','Berkeley',['Civil Engineering, BS','Mechanical Engineering, BS','Materials Science and Engineering, BS','Physics, BA','Chemistry, BA','Psychology, BA','History, BA','English, BA']],
  ['umich','https://admissions.umich.edu/academics-majors/majors-degrees','Michigan','Ann Arbor',['Chemical Engineering, BSE','Civil Engineering, BSE','Electrical Engineering, BSE','Mechanical Engineering, BSE','Physics, BS','Chemistry, BS','Psychology, BA','English, BA']],
  ['nyu','https://www.nyu.edu/admissions/undergraduate-admissions/academics/majors-and-programs.html','New York','New York',['Chemical Engineering, BS','Civil Engineering, BS','Electrical Engineering, BS','Psychology, BA','History, BA','English, BA','Mathematics, BS','Physics, BS']]
].map(([institutionId, sourceUrl, region, campus, programmes]) => ({ institutionId, sourceUrl, country: 'United States', region, campus, programmes })) as InstitutionSeed[]

export const SCALE_CATALOGUE_DEPTH: Programme[] = [...SOUTH_AFRICA, ...AUSTRALIA, ...CANADA, ...UNITED_KINGDOM, ...UNITED_STATES].flatMap((seed) => seed.programmes.map((name) => programme(seed, name)))
