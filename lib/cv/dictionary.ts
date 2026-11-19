/** Built-in reference data for the CV parser. Merged at runtime with master_skills, technology_skills,
 *  master_designation, master_country and master_location from the database. */

// canonical skill → aliases (all matched case-insensitively on word boundaries)
export const SKILL_ALIASES: Record<string, string[]> = {
  JavaScript: ['javascript', 'java script', 'js', 'es6', 'ecmascript'], TypeScript: ['typescript', 'ts'], Python: ['python', 'python3'],
  Java: ['java', 'core java', 'j2ee', 'java ee'], 'C#': ['c#', 'c sharp', 'csharp'], 'C++': ['c++', 'cpp'], C: [], Go: ['golang'], Rust: ['rust'],
  PHP: ['php'], Ruby: ['ruby'], 'Ruby on Rails': ['rails', 'ruby on rails', 'ror'], Kotlin: ['kotlin'], Swift: ['swift'], Scala: ['scala'], R: [],
  Perl: ['perl'], 'Objective-C': ['objective-c', 'objective c'], Dart: ['dart'], MATLAB: ['matlab'], Bash: ['bash', 'shell scripting', 'shell script'], PowerShell: ['powershell'],
  SQL: ['sql'], 'PL/SQL': ['pl/sql', 'plsql'], 'T-SQL': ['t-sql', 'tsql'], HTML: ['html', 'html5'], CSS: ['css', 'css3'], SASS: ['sass', 'scss'],
  React: ['react', 'react.js', 'reactjs'], 'React Native': ['react native'], Angular: ['angular', 'angularjs', 'angular.js'], 'Vue.js': ['vue', 'vue.js', 'vuejs'],
  'Next.js': ['next.js', 'nextjs'], 'Node.js': ['node', 'node.js', 'nodejs'], Express: ['express', 'express.js', 'expressjs'], NestJS: ['nestjs', 'nest.js'],
  jQuery: ['jquery'], Redux: ['redux'], 'Tailwind CSS': ['tailwind', 'tailwindcss'], Bootstrap: ['bootstrap'], GraphQL: ['graphql'], 'REST APIs': ['rest', 'rest api', 'restful', 'rest apis', 'restful services'],
  Django: ['django'], Flask: ['flask'], FastAPI: ['fastapi'], Spring: ['spring', 'spring framework'], 'Spring Boot': ['spring boot', 'springboot'], Hibernate: ['hibernate'],
  '.NET': ['.net', 'dotnet', 'dot net', '.net core', 'asp.net', 'asp.net core', 'asp.net mvc'], Laravel: ['laravel'], Symfony: ['symfony'], WordPress: ['wordpress'],
  Microservices: ['microservices', 'micro services'], Kafka: ['kafka', 'apache kafka'], RabbitMQ: ['rabbitmq'], Redis: ['redis'],
  MySQL: ['mysql'], PostgreSQL: ['postgresql', 'postgres'], 'SQL Server': ['sql server', 'mssql', 'ms sql'], Oracle: ['oracle db', 'oracle database', 'oracle'], MongoDB: ['mongodb', 'mongo'],
  Cassandra: ['cassandra'], DynamoDB: ['dynamodb'], Elasticsearch: ['elasticsearch', 'elastic search', 'elk'], Snowflake: ['snowflake'], Databricks: ['databricks'],
  AWS: ['aws', 'amazon web services'], Azure: ['azure', 'microsoft azure'], GCP: ['gcp', 'google cloud', 'google cloud platform'], Docker: ['docker'], Kubernetes: ['kubernetes', 'k8s'],
  Terraform: ['terraform'], Ansible: ['ansible'], Jenkins: ['jenkins'], 'GitHub Actions': ['github actions'], 'Azure DevOps': ['azure devops', 'vsts'], 'CI/CD': ['ci/cd', 'ci cd', 'continuous integration'],
  Git: ['git', 'github', 'gitlab', 'bitbucket'], Linux: ['linux', 'unix', 'ubuntu', 'red hat', 'rhel', 'centos'], Nginx: ['nginx'], Apache: ['apache'],
  'Machine Learning': ['machine learning', 'ml'], 'Deep Learning': ['deep learning'], NLP: ['nlp', 'natural language processing'], 'Computer Vision': ['computer vision'],
  TensorFlow: ['tensorflow'], PyTorch: ['pytorch'], 'scikit-learn': ['scikit-learn', 'sklearn'], Pandas: ['pandas'], NumPy: ['numpy'], Spark: ['spark', 'apache spark', 'pyspark'], Hadoop: ['hadoop'],
  'Generative AI': ['generative ai', 'genai', 'llm', 'llms', 'large language models'], 'Power BI': ['power bi', 'powerbi'], Tableau: ['tableau'], Excel: ['excel', 'ms excel', 'advanced excel'],
  'Data Analysis': ['data analysis', 'data analytics'], 'Data Engineering': ['data engineering'], ETL: ['etl'], 'Data Warehousing': ['data warehousing', 'data warehouse'],
  Selenium: ['selenium'], Cypress: ['cypress'], Playwright: ['playwright'], JUnit: ['junit'], TestNG: ['testng'], Jest: ['jest'], Cucumber: ['cucumber', 'bdd'], JMeter: ['jmeter'],
  'Manual Testing': ['manual testing'], 'Automation Testing': ['automation testing', 'test automation'], 'API Testing': ['api testing', 'postman'],
  Jira: ['jira'], Confluence: ['confluence'], Agile: ['agile'], Scrum: ['scrum'], Kanban: ['kanban'], SAFe: ['safe'], Waterfall: ['waterfall'],
  'Project Management': ['project management'], 'Programme Management': ['programme management', 'program management'], PRINCE2: ['prince2'], PMP: ['pmp'], ITIL: ['itil'],
  'Stakeholder Management': ['stakeholder management'], 'Business Analysis': ['business analysis'], 'Requirements Gathering': ['requirements gathering', 'requirement gathering'],
  SAP: ['sap'], 'SAP S/4HANA': ['s/4hana', 's4hana', 's/4 hana'], 'SAP FICO': ['sap fico', 'fico'], 'SAP MM': ['sap mm'], 'SAP SD': ['sap sd'], 'SAP ABAP': ['abap'],
  Salesforce: ['salesforce', 'sfdc'], ServiceNow: ['servicenow', 'service now'], Workday: ['workday'], Pega: ['pega', 'pegasystems'], 'Microsoft Dynamics 365': ['dynamics 365', 'd365', 'microsoft dynamics', 'dynamics crm', 'dynamics ax'],
  'Oracle Cloud': ['oracle cloud', 'oracle fusion', 'oracle ebs', 'oracle e-business'], 'Infor M3': ['infor m3', 'infor'], 'Charles River': ['charles river', 'crd'], Aras: ['aras innovator', 'aras plm'], Bloomberg: ['bloomberg'], Adobe: ['adobe experience manager', 'aem', 'adobe'],
  'Cyber Security': ['cyber security', 'cybersecurity', 'information security', 'infosec'], SIEM: ['siem', 'splunk', 'qradar'], 'Penetration Testing': ['penetration testing', 'pen testing', 'vapt'],
  'Identity & Access Management': ['iam', 'identity and access management', 'okta', 'sailpoint', 'cyberark'], 'ISO 27001': ['iso 27001', 'iso27001'], GDPR: ['gdpr'], SOC: ['soc'],
  Networking: ['networking', 'tcp/ip', 'lan', 'wan'], Cisco: ['cisco', 'ccna', 'ccnp'], Firewalls: ['firewall', 'firewalls', 'palo alto', 'fortinet', 'checkpoint'], VMware: ['vmware', 'vsphere'],
  'Active Directory': ['active directory'], 'Microsoft 365': ['office 365', 'microsoft 365', 'o365', 'm365'], SharePoint: ['sharepoint'], 'Power Apps': ['power apps', 'powerapps'], 'Power Automate': ['power automate', 'microsoft flow'],
  Android: ['android'], iOS: ['ios'], Flutter: ['flutter'], Figma: ['figma'], 'UI/UX': ['ui/ux', 'ux design', 'ui design', 'user experience'], Photoshop: ['photoshop'], Illustrator: ['illustrator'],
  SEO: ['seo', 'search engine optimisation', 'search engine optimization'], PPC: ['ppc', 'google ads', 'adwords'], 'Digital Marketing': ['digital marketing'], 'Content Marketing': ['content marketing'],
  'Social Media Marketing': ['social media marketing', 'smm'], 'Google Analytics': ['google analytics', 'ga4'], HubSpot: ['hubspot'], CRM: ['crm'],
  Recruitment: ['recruitment', 'recruiting', 'talent acquisition'], Sourcing: ['candidate sourcing', 'sourcing'], 'Boolean Search': ['boolean search', 'x-ray search'], Onboarding: ['onboarding'],
  'Account Management': ['account management'], 'Business Development': ['business development'], Sales: ['sales'], Negotiation: ['negotiation'], 'Customer Service': ['customer service', 'customer support'],
  Accounting: ['accounting', 'bookkeeping'], 'Financial Analysis': ['financial analysis', 'financial modelling', 'financial modeling'], Payroll: ['payroll'], Xero: ['xero'], QuickBooks: ['quickbooks'], 'Sage': ['sage 50', 'sage'],
  Leadership: ['leadership', 'team leadership', 'people management'], Communication: ['communication skills', 'communication'], 'Problem Solving': ['problem solving', 'problem-solving'],
};

// ambiguous one/two-letter skills only count inside a skills section and when listed as standalone items
export const AMBIGUOUS_SKILLS = new Set(['C', 'R', 'Go', 'SOC', 'CRM', 'Sales', 'Sourcing', 'Communication', 'Leadership', 'Oracle', 'Adobe', 'Infor', 'Bloomberg', 'Apache', 'Spring', 'Swift', 'Rust', 'Dart', 'SAFe', 'Sage', 'ML', 'TS']);

export const SECTION_HEADINGS: Record<string, string[]> = {
  summary: ['summary', 'professional summary', 'profile', 'professional profile', 'personal profile', 'career summary', 'executive summary', 'objective', 'career objective', 'about me', 'overview', 'profile summary', 'synopsis', 'career profile', 'introduction'],
  experience: ['experience', 'work experience', 'professional experience', 'employment history', 'employment', 'work history', 'career history', 'relevant experience', 'professional background', 'career', 'experience summary', 'organisational experience', 'organizational experience', 'positions held', 'job history', 'employment details', 'professional history', 'industry experience'],
  education: ['education', 'educational qualifications', 'academic qualifications', 'academic background', 'qualifications', 'education and training', 'education & training', 'academic details', 'educational background', 'academics', 'scholastics', 'educational details', 'academic profile'],
  skills: ['skills', 'technical skills', 'key skills', 'core skills', 'core competencies', 'competencies', 'areas of expertise', 'expertise', 'technical expertise', 'skill set', 'skillset', 'it skills', 'technologies', 'tools', 'tools and technologies', 'tools & technologies', 'technical proficiency', 'key competencies', 'software skills', 'tech stack', 'technical summary', 'skills summary', 'strengths'],
  certifications: ['certifications', 'certification', 'certificates', 'licences', 'licenses', 'professional certifications', 'accreditations', 'courses', 'trainings', 'training', 'licenses and certifications', 'licences & certifications', 'professional development'],
  projects: ['projects', 'key projects', 'project experience', 'project details', 'personal projects', 'academic projects', 'notable projects'],
  languages: ['languages', 'language', 'languages known', 'language skills', 'linguistic proficiency'],
  achievements: ['achievements', 'awards', 'honours', 'honors', 'accomplishments', 'awards and achievements', 'key achievements'],
  personal: ['personal details', 'personal information', 'personal data', 'personal particulars', 'contact', 'contact details', 'contact information', 'details'],
  interests: ['interests', 'hobbies', 'hobbies and interests', 'extra curricular activities', 'extracurricular activities', 'activities', 'volunteering', 'volunteer experience'],
  references: ['references', 'referees'],
  publications: ['publications', 'papers'],
};

export const LANGUAGES = ['English', 'Hindi', 'Marathi', 'Gujarati', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Bengali', 'Punjabi', 'Urdu', 'Odia', 'French', 'German', 'Spanish', 'Italian', 'Portuguese', 'Dutch', 'Polish', 'Romanian', 'Russian', 'Ukrainian', 'Arabic', 'Turkish', 'Persian', 'Mandarin', 'Chinese', 'Cantonese', 'Japanese', 'Korean', 'Vietnamese', 'Thai', 'Malay', 'Indonesian', 'Tagalog', 'Swahili', 'Greek', 'Hungarian', 'Czech', 'Swedish', 'Norwegian', 'Danish', 'Finnish', 'Hebrew', 'Welsh', 'Irish', 'Sinhala', 'Nepali'];

// city → [country, ISO2]
export const CITIES: Record<string, [string, string]> = {
  London: ['United Kingdom', 'GB'], Manchester: ['United Kingdom', 'GB'], Birmingham: ['United Kingdom', 'GB'], Leeds: ['United Kingdom', 'GB'], Leicester: ['United Kingdom', 'GB'], Glasgow: ['United Kingdom', 'GB'], Edinburgh: ['United Kingdom', 'GB'], Bristol: ['United Kingdom', 'GB'], Liverpool: ['United Kingdom', 'GB'], Sheffield: ['United Kingdom', 'GB'], Nottingham: ['United Kingdom', 'GB'], Cardiff: ['United Kingdom', 'GB'], Belfast: ['United Kingdom', 'GB'], Reading: ['United Kingdom', 'GB'], 'Milton Keynes': ['United Kingdom', 'GB'], Cambridge: ['United Kingdom', 'GB'], Oxford: ['United Kingdom', 'GB'], Newcastle: ['United Kingdom', 'GB'], Coventry: ['United Kingdom', 'GB'], Southampton: ['United Kingdom', 'GB'], Slough: ['United Kingdom', 'GB'], Croydon: ['United Kingdom', 'GB'], Bradford: ['United Kingdom', 'GB'], Aberdeen: ['United Kingdom', 'GB'], Swindon: ['United Kingdom', 'GB'], Watford: ['United Kingdom', 'GB'], Northampton: ['United Kingdom', 'GB'], Derby: ['United Kingdom', 'GB'], Brighton: ['United Kingdom', 'GB'], Luton: ['United Kingdom', 'GB'],
  Mumbai: ['India', 'IN'], Pune: ['India', 'IN'], Bangalore: ['India', 'IN'], Bengaluru: ['India', 'IN'], Hyderabad: ['India', 'IN'], Chennai: ['India', 'IN'], Delhi: ['India', 'IN'], 'New Delhi': ['India', 'IN'], Noida: ['India', 'IN'], Gurgaon: ['India', 'IN'], Gurugram: ['India', 'IN'], Kolkata: ['India', 'IN'], Ahmedabad: ['India', 'IN'], Nagpur: ['India', 'IN'], Nashik: ['India', 'IN'], Thane: ['India', 'IN'], 'Navi Mumbai': ['India', 'IN'], Jaipur: ['India', 'IN'], Indore: ['India', 'IN'], Kochi: ['India', 'IN'], Coimbatore: ['India', 'IN'], Chandigarh: ['India', 'IN'], Lucknow: ['India', 'IN'], Bhopal: ['India', 'IN'], Aurangabad: ['India', 'IN'], Vadodara: ['India', 'IN'], Surat: ['India', 'IN'], Mysore: ['India', 'IN'], Trivandrum: ['India', 'IN'], Visakhapatnam: ['India', 'IN'], Bhubaneswar: ['India', 'IN'], Goa: ['India', 'IN'], Kolhapur: ['India', 'IN'], Solapur: ['India', 'IN'], Latur: ['India', 'IN'],
  'New York': ['United States', 'US'], 'San Francisco': ['United States', 'US'], Chicago: ['United States', 'US'], Boston: ['United States', 'US'], Seattle: ['United States', 'US'], Austin: ['United States', 'US'], Dallas: ['United States', 'US'], Houston: ['United States', 'US'], Atlanta: ['United States', 'US'], 'Los Angeles': ['United States', 'US'], 'San Jose': ['United States', 'US'], 'New Jersey': ['United States', 'US'], Denver: ['United States', 'US'], Phoenix: ['United States', 'US'], Charlotte: ['United States', 'US'], Washington: ['United States', 'US'], Miami: ['United States', 'US'], Toronto: ['Canada', 'CA'], Vancouver: ['Canada', 'CA'], Montreal: ['Canada', 'CA'],
  Dublin: ['Ireland', 'IE'], Paris: ['France', 'FR'], Berlin: ['Germany', 'DE'], Munich: ['Germany', 'DE'], Frankfurt: ['Germany', 'DE'], Hamburg: ['Germany', 'DE'], Amsterdam: ['Netherlands', 'NL'], Rotterdam: ['Netherlands', 'NL'], 'The Hague': ['Netherlands', 'NL'], Utrecht: ['Netherlands', 'NL'], Eindhoven: ['Netherlands', 'NL'], Brussels: ['Belgium', 'BE'], Zurich: ['Switzerland', 'CH'], Geneva: ['Switzerland', 'CH'], Madrid: ['Spain', 'ES'], Barcelona: ['Spain', 'ES'], Lisbon: ['Portugal', 'PT'], Milan: ['Italy', 'IT'], Rome: ['Italy', 'IT'], Stockholm: ['Sweden', 'SE'], Copenhagen: ['Denmark', 'DK'], Oslo: ['Norway', 'NO'], Helsinki: ['Finland', 'FI'], Warsaw: ['Poland', 'PL'], Krakow: ['Poland', 'PL'], Prague: ['Czech Republic', 'CZ'], Vienna: ['Austria', 'AT'], Bucharest: ['Romania', 'RO'], Budapest: ['Hungary', 'HU'], Athens: ['Greece', 'GR'],
  Dubai: ['United Arab Emirates', 'AE'], 'Abu Dhabi': ['United Arab Emirates', 'AE'], Doha: ['Qatar', 'QA'], Riyadh: ['Saudi Arabia', 'SA'], Jeddah: ['Saudi Arabia', 'SA'], Muscat: ['Oman', 'OM'], Singapore: ['Singapore', 'SG'], 'Kuala Lumpur': ['Malaysia', 'MY'], Sydney: ['Australia', 'AU'], Melbourne: ['Australia', 'AU'], Brisbane: ['Australia', 'AU'], Perth: ['Australia', 'AU'], Auckland: ['New Zealand', 'NZ'], 'Hong Kong': ['Hong Kong', 'HK'], Tokyo: ['Japan', 'JP'], Manila: ['Philippines', 'PH'], Colombo: ['Sri Lanka', 'LK'], Karachi: ['Pakistan', 'PK'], Lahore: ['Pakistan', 'PK'], Dhaka: ['Bangladesh', 'BD'], Kathmandu: ['Nepal', 'NP'], Johannesburg: ['South Africa', 'ZA'], 'Cape Town': ['South Africa', 'ZA'], Lagos: ['Nigeria', 'NG'], Nairobi: ['Kenya', 'KE'], Cairo: ['Egypt', 'EG'],
};

export const COUNTRIES: Record<string, string> = {
  'United Kingdom': 'GB', UK: 'GB', England: 'GB', Scotland: 'GB', Wales: 'GB', 'Northern Ireland': 'GB', 'Great Britain': 'GB', India: 'IN', 'United States': 'US', USA: 'US', 'U.S.A': 'US', America: 'US', Canada: 'CA', Ireland: 'IE', France: 'FR', Germany: 'DE', Netherlands: 'NL', Belgium: 'BE', Switzerland: 'CH', Spain: 'ES', Portugal: 'PT', Italy: 'IT', Sweden: 'SE', Denmark: 'DK', Norway: 'NO', Finland: 'FI', Poland: 'PL', 'Czech Republic': 'CZ', Austria: 'AT', Romania: 'RO', Hungary: 'HU', Greece: 'GR', 'United Arab Emirates': 'AE', UAE: 'AE', Qatar: 'QA', 'Saudi Arabia': 'SA', Oman: 'OM', Singapore: 'SG', Malaysia: 'MY', Australia: 'AU', 'New Zealand': 'NZ', Japan: 'JP', Philippines: 'PH', 'Sri Lanka': 'LK', Pakistan: 'PK', Bangladesh: 'BD', Nepal: 'NP', 'South Africa': 'ZA', Nigeria: 'NG', Kenya: 'KE', Egypt: 'EG', China: 'CN',
};

export const UK_POSTCODE = /\b([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\b/;
export const IN_PIN = /\b([1-9]\d{2}\s?\d{3})\b/;

export const DEGREE_PATTERNS: [RegExp, string][] = [
  [/\bPh\.?\s?D\b|\bDoctorate\b|\bDoctor of Philosophy\b/i, 'PhD'],
  [/\bM\.?\s?B\.?\s?A\b|\bMaster of Business Administration\b|\bPGDM\b|\bPGDBM\b/i, 'MBA'],
  [/\bM\.?\s?Tech\b|\bMaster of Technology\b/i, 'M.Tech'], [/\bM\.\s?E\.(?=[\s,(-]|$)|\bMaster of Engineering\b/, 'M.E.'],
  [/\bM\.?\s?Sc\b|\bMaster of Science\b|\bMS\b(?= in )/i, 'MSc'], [/\bM\.?\s?C\.?\s?A\b|\bMaster of Computer Applications?\b/i, 'MCA'],
  [/\bM\.?\s?Com\b|\bMaster of Commerce\b/i, 'M.Com'], [/\bM\.?\s?A\.?\b(?= in |\s*\()|\bMaster of Arts\b/i, 'MA'], [/\bLL\.?\s?M\b/i, 'LLM'], [/\bMaster'?s?\b(?: degree)?(?: of| in)\b/i, 'Masters'],
  [/\bB\.?\s?Tech\b|\bBachelor of Technology\b/i, 'B.Tech'], [/\bB\.?\s?E\.?(?=[\s,(-]|$)|\bBachelor of Engineering\b/, 'B.E.'],
  [/\bB\.?\s?Sc\b|\bBachelor of Science\b|\bBS\b(?= in )/i, 'BSc'], [/\bB\.?\s?C\.?\s?A\b|\bBachelor of Computer Applications?\b/i, 'BCA'],
  [/\bB\.?\s?Com\b|\bBachelor of Commerce\b/i, 'B.Com'], [/\bB\.?\s?B\.?\s?A\b|\bBachelor of Business Administration\b/i, 'BBA'],
  [/\bB\.?\s?A\.?\b(?= in |\s*\(|\s+Hons)|\bBachelor of Arts\b/i, 'BA'], [/\bLL\.?\s?B\b/i, 'LLB'], [/\bBachelor'?s?\b(?: degree)?(?: of| in)\b/i, 'Bachelors'],
  [/\bDiploma\b/i, 'Diploma'], [/\bH\.?\s?S\.?\s?C\b|\b12th\b|\bXII\b|\bHigher Secondary\b|\bIntermediate\b/i, 'HSC'], [/\bS\.?\s?S\.?\s?C\b|\b10th\b|\bMatriculation\b|\bSecondary School\b/i, 'SSC'],
  [/\bA[- ]Levels?\b/i, 'A-Levels'], [/\bGCSEs?\b/i, 'GCSE'], [/\bBTEC\b/i, 'BTEC'], [/\bNVQ\b/i, 'NVQ'], [/\bHND\b/i, 'HND'],
];
export const INSTITUTION = /\b(University|Universit[ée]|College|Institute|Institution|School|Academy|Polytechnic|IIT|NIT|IIM|BITS|Vidyalaya|Vidyapeeth|Mahavidyalaya)\b/i;

export const COMPANY_SUFFIX = /\b(Ltd|Limited|LLP|LLC|Inc|Incorporated|Corp|Corporation|PLC|Pvt|Private|GmbH|AG|S\.A\.|B\.V\.|BV|Co\.|Company|Group|Technologies|Technology|Tech|Solutions|Services|Systems|Consulting|Consultancy|Consultants|Software|Labs|Bank|Holdings|Partners|Infotech|Infosystems|Global|International|Industries|Enterprises|Digital|Networks|Healthcare|Pharma)\b/i;

export const TITLE_WORDS = /\b(Engineer|Developer|Programmer|Architect|Consultant|Analyst|Manager|Lead|Head|Director|Officer|Specialist|Administrator|Admin|Designer|Tester|QA|Scientist|Executive|Associate|Intern|Trainee|Coordinator|Co-ordinator|Supervisor|Accountant|Recruiter|Advisor|Adviser|Representative|Technician|Assistant|President|VP|CTO|CEO|CFO|COO|Owner|Founder|Partner|Principal|Strategist|Editor|Writer|Teacher|Lecturer|Professor|Nurse|Doctor|Operator|Agent|Controller|Auditor|Planner|Expert|Practitioner|Master|Steward|Receptionist|Clerk|Cashier|Driver|Chef|Cook|Secretary|Paralegal|Solicitor|Barrister|Lawyer|Pharmacist|Physiotherapist|Therapist|Carer|Worker|Electrician|Plumber|Mechanic|Machinist|Surveyor|Estimator|Buyer|Merchandiser|Instructor|Trainer|Tutor|Coach|Counsellor|Counselor|Underwriter|Actuary|Economist|Statistician|Researcher|Fellow|Apprentice|Graduate|Volunteer|Ambassador|Champion|Owner|SME|Freelancer|Contractor)\b/i;

export const NAME_STOPWORDS = /\b(resume|résumé|curriculum|vitae|cv|profile|summary|objective|email|e-mail|phone|mobile|tel|address|contact|linkedin|github|www|http|skills|experience|education|page|confidential|date|birth|nationality|declaration|references|personal|details|information|career|professional|technical|key|core|work|history|projects?)\b/i;
