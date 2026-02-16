// MP Data - UK Constituencies and MP Names
// Realistic data for 650 constituencies across the UK

import {
  Constituency,
  RegionUK,
  AgeProfile,
  PartyAffiliation,
  LabourFaction,
  MPProfile,
  generateIdeology,
  generateTraits,
} from './mp-system';

// ===========================
// UK Constituencies Database
// ===========================

export const UK_CONSTITUENCIES: Omit<Constituency, 'id'>[] = [
  // London (73 seats)
  { name: 'Bethnal Green and Stepney', region: 'london', marginality: 15, demographics: { medianIncome: 32000, unemploymentRate: 6.2, publicSectorDependency: 25, ageProfile: 'young' }, previousMargin: 35.2, swingRequired: 17.6 },
  { name: 'Hackney North and Stoke Newington', region: 'london', marginality: 10, demographics: { medianIncome: 35000, unemploymentRate: 5.8, publicSectorDependency: 28, ageProfile: 'young' }, previousMargin: 42.8, swingRequired: 21.4 },
  { name: 'Islington North', region: 'london', marginality: 25, demographics: { medianIncome: 38000, unemploymentRate: 5.2, publicSectorDependency: 30, ageProfile: 'mixed' }, previousMargin: 28.4, swingRequired: 14.2 },
  { name: 'Westminster and Chelsea East', region: 'london', marginality: 45, demographics: { medianIncome: 55000, unemploymentRate: 3.5, publicSectorDependency: 18, ageProfile: 'mixed' }, previousMargin: 12.8, swingRequired: 6.4 },
  { name: 'Battersea', region: 'london', marginality: 40, demographics: { medianIncome: 48000, unemploymentRate: 3.8, publicSectorDependency: 20, ageProfile: 'young' }, previousMargin: 15.2, swingRequired: 7.6 },
  { name: 'Croydon Central', region: 'london', marginality: 50, demographics: { medianIncome: 36000, unemploymentRate: 5.5, publicSectorDependency: 24, ageProfile: 'mixed' }, previousMargin: 8.6, swingRequired: 4.3 },
  { name: 'Eltham and Chislehurst', region: 'london', marginality: 35, demographics: { medianIncome: 38000, unemploymentRate: 4.8, publicSectorDependency: 26, ageProfile: 'mixed' }, previousMargin: 18.4, swingRequired: 9.2 },
  { name: 'Greenwich and Woolwich', region: 'london', marginality: 20, demographics: { medianIncome: 34000, unemploymentRate: 6.0, publicSectorDependency: 32, ageProfile: 'young' }, previousMargin: 28.6, swingRequired: 14.3 },
  { name: 'Lewisham East', region: 'london', marginality: 15, demographics: { medianIncome: 33000, unemploymentRate: 5.9, publicSectorDependency: 29, ageProfile: 'young' }, previousMargin: 34.2, swingRequired: 17.1 },
  { name: 'Lewisham West and East Dulwich', region: 'london', marginality: 12, demographics: { medianIncome: 36000, unemploymentRate: 5.5, publicSectorDependency: 27, ageProfile: 'young' }, previousMargin: 38.6, swingRequired: 19.3 },

  // Northwest England (75 seats)
  { name: 'Burnley', region: 'northwest', marginality: 75, demographics: { medianIncome: 26500, unemploymentRate: 6.8, publicSectorDependency: 28, ageProfile: 'mixed' }, previousMargin: 3.2, swingRequired: 1.6 },
  { name: 'Liverpool Walton', region: 'northwest', marginality: 5, demographics: { medianIncome: 24000, unemploymentRate: 8.5, publicSectorDependency: 35, ageProfile: 'mixed' }, previousMargin: 52.4, swingRequired: 26.2 },
  { name: 'Manchester Central', region: 'northwest', marginality: 8, demographics: { medianIncome: 28000, unemploymentRate: 7.2, publicSectorDependency: 30, ageProfile: 'young' }, previousMargin: 45.8, swingRequired: 22.9 },
  { name: 'Manchester Withington', region: 'northwest', marginality: 20, demographics: { medianIncome: 32000, unemploymentRate: 5.5, publicSectorDependency: 26, ageProfile: 'young' }, previousMargin: 28.4, swingRequired: 14.2 },
  { name: 'Blackburn', region: 'northwest', marginality: 35, demographics: { medianIncome: 25500, unemploymentRate: 7.5, publicSectorDependency: 32, ageProfile: 'mixed' }, previousMargin: 18.6, swingRequired: 9.3 },
  { name: 'Bolton North East', region: 'northwest', marginality: 60, demographics: { medianIncome: 28000, unemploymentRate: 6.2, publicSectorDependency: 29, ageProfile: 'mixed' }, previousMargin: 6.4, swingRequired: 3.2 },
  { name: 'Bolton South and Walkden', region: 'northwest', marginality: 30, demographics: { medianIncome: 27500, unemploymentRate: 6.5, publicSectorDependency: 30, ageProfile: 'mixed' }, previousMargin: 22.8, swingRequired: 11.4 },
  { name: 'Bury North', region: 'northwest', marginality: 65, demographics: { medianIncome: 32000, unemploymentRate: 5.0, publicSectorDependency: 25, ageProfile: 'mixed' }, previousMargin: 5.2, swingRequired: 2.6 },
  { name: 'Bury South', region: 'northwest', marginality: 45, demographics: { medianIncome: 30000, unemploymentRate: 5.5, publicSectorDependency: 26, ageProfile: 'mixed' }, previousMargin: 12.6, swingRequired: 6.3 },
  { name: 'Chester City of', region: 'northwest', marginality: 40, demographics: { medianIncome: 31000, unemploymentRate: 4.8, publicSectorDependency: 24, ageProfile: 'mixed' }, previousMargin: 14.8, swingRequired: 7.4 },

  // Yorkshire (54 seats)
  { name: 'Sheffield Central', region: 'yorkshire', marginality: 10, demographics: { medianIncome: 27000, unemploymentRate: 6.5, publicSectorDependency: 32, ageProfile: 'young' }, previousMargin: 42.2, swingRequired: 21.1 },
  { name: 'Leeds Central and Headingley', region: 'yorkshire', marginality: 15, demographics: { medianIncome: 29000, unemploymentRate: 5.8, publicSectorDependency: 28, ageProfile: 'young' }, previousMargin: 35.6, swingRequired: 17.8 },
  { name: 'Bradford West', region: 'yorkshire', marginality: 55, demographics: { medianIncome: 23500, unemploymentRate: 8.2, publicSectorDependency: 34, ageProfile: 'young' }, previousMargin: 7.8, swingRequired: 3.9 },
  { name: 'Halifax', region: 'yorkshire', marginality: 50, demographics: { medianIncome: 27500, unemploymentRate: 6.0, publicSectorDependency: 29, ageProfile: 'mixed' }, previousMargin: 9.4, swingRequired: 4.7 },
  { name: 'Huddersfield', region: 'yorkshire', marginality: 35, demographics: { medianIncome: 28000, unemploymentRate: 5.8, publicSectorDependency: 27, ageProfile: 'mixed' }, previousMargin: 18.2, swingRequired: 9.1 },
  { name: 'Wakefield and Rothwell', region: 'yorkshire', marginality: 60, demographics: { medianIncome: 29000, unemploymentRate: 5.5, publicSectorDependency: 26, ageProfile: 'mixed' }, previousMargin: 6.2, swingRequired: 3.1 },
  { name: 'Doncaster Central', region: 'yorkshire', marginality: 40, demographics: { medianIncome: 26000, unemploymentRate: 7.0, publicSectorDependency: 31, ageProfile: 'mixed' }, previousMargin: 14.6, swingRequired: 7.3 },
  { name: 'Barnsley North', region: 'yorkshire', marginality: 20, demographics: { medianIncome: 25500, unemploymentRate: 7.2, publicSectorDependency: 33, ageProfile: 'mixed' }, previousMargin: 28.8, swingRequired: 14.4 },
  { name: 'Rotherham', region: 'yorkshire', marginality: 25, demographics: { medianIncome: 26500, unemploymentRate: 6.8, publicSectorDependency: 32, ageProfile: 'mixed' }, previousMargin: 24.4, swingRequired: 12.2 },
  { name: 'York Central', region: 'yorkshire', marginality: 45, demographics: { medianIncome: 30000, unemploymentRate: 4.5, publicSectorDependency: 28, ageProfile: 'young' }, previousMargin: 12.2, swingRequired: 6.1 },

  // West Midlands (59 seats)
  { name: 'Birmingham Edgbaston', region: 'westmidlands', marginality: 40, demographics: { medianIncome: 32000, unemploymentRate: 5.8, publicSectorDependency: 26, ageProfile: 'young' }, previousMargin: 14.8, swingRequired: 7.4 },
  { name: 'Birmingham Hall Green and Moseley', region: 'westmidlands', marginality: 30, demographics: { medianIncome: 28000, unemploymentRate: 6.5, publicSectorDependency: 29, ageProfile: 'mixed' }, previousMargin: 22.4, swingRequired: 11.2 },
  { name: 'Birmingham Ladywood', region: 'westmidlands', marginality: 8, demographics: { medianIncome: 24000, unemploymentRate: 8.0, publicSectorDependency: 35, ageProfile: 'young' }, previousMargin: 46.2, swingRequired: 23.1 },
  { name: 'Coventry North West', region: 'westmidlands', marginality: 35, demographics: { medianIncome: 29000, unemploymentRate: 6.0, publicSectorDependency: 28, ageProfile: 'mixed' }, previousMargin: 18.6, swingRequired: 9.3 },
  { name: 'Coventry South', region: 'westmidlands', marginality: 42, demographics: { medianIncome: 30000, unemploymentRate: 5.5, publicSectorDependency: 27, ageProfile: 'young' }, previousMargin: 13.8, swingRequired: 6.9 },
  { name: 'Dudley', region: 'westmidlands', marginality: 70, demographics: { medianIncome: 28500, unemploymentRate: 6.2, publicSectorDependency: 27, ageProfile: 'mixed' }, previousMargin: 4.6, swingRequired: 2.3 },
  { name: 'Walsall and Bloxwich', region: 'westmidlands', marginality: 65, demographics: { medianIncome: 27500, unemploymentRate: 6.8, publicSectorDependency: 29, ageProfile: 'mixed' }, previousMargin: 5.4, swingRequired: 2.7 },
  { name: 'Wolverhampton South East', region: 'westmidlands', marginality: 38, demographics: { medianIncome: 26500, unemploymentRate: 7.0, publicSectorDependency: 30, ageProfile: 'mixed' }, previousMargin: 16.4, swingRequired: 8.2 },
  { name: 'Stoke-on-Trent Central', region: 'westmidlands', marginality: 55, demographics: { medianIncome: 25000, unemploymentRate: 7.5, publicSectorDependency: 31, ageProfile: 'mixed' }, previousMargin: 8.2, swingRequired: 4.1 },
  { name: 'Stoke-on-Trent North', region: 'westmidlands', marginality: 60, demographics: { medianIncome: 26000, unemploymentRate: 7.2, publicSectorDependency: 30, ageProfile: 'mixed' }, previousMargin: 6.8, swingRequired: 3.4 },

  // East Midlands (47 seats)
  { name: 'Nottingham East', region: 'eastmidlands', marginality: 20, demographics: { medianIncome: 27000, unemploymentRate: 6.5, publicSectorDependency: 30, ageProfile: 'mixed' }, previousMargin: 28.6, swingRequired: 14.3 },
  { name: 'Nottingham South', region: 'eastmidlands', marginality: 35, demographics: { medianIncome: 29000, unemploymentRate: 5.8, publicSectorDependency: 28, ageProfile: 'young' }, previousMargin: 18.4, swingRequired: 9.2 },
  { name: 'Derby South', region: 'eastmidlands', marginality: 40, demographics: { medianIncome: 28500, unemploymentRate: 6.0, publicSectorDependency: 29, ageProfile: 'mixed' }, previousMargin: 14.6, swingRequired: 7.3 },
  { name: 'Leicester East', region: 'eastmidlands', marginality: 25, demographics: { medianIncome: 27500, unemploymentRate: 6.8, publicSectorDependency: 31, ageProfile: 'mixed' }, previousMargin: 24.8, swingRequired: 12.4 },
  { name: 'Leicester South', region: 'eastmidlands', marginality: 22, demographics: { medianIncome: 26500, unemploymentRate: 7.0, publicSectorDependency: 32, ageProfile: 'young' }, previousMargin: 26.4, swingRequired: 13.2 },
  { name: 'Leicester West', region: 'eastmidlands', marginality: 18, demographics: { medianIncome: 28000, unemploymentRate: 6.5, publicSectorDependency: 30, ageProfile: 'mixed' }, previousMargin: 32.2, swingRequired: 16.1 },
  { name: 'Northampton North', region: 'eastmidlands', marginality: 52, demographics: { medianIncome: 30000, unemploymentRate: 5.5, publicSectorDependency: 26, ageProfile: 'mixed' }, previousMargin: 9.2, swingRequired: 4.6 },
  { name: 'Northampton South', region: 'eastmidlands', marginality: 48, demographics: { medianIncome: 31000, unemploymentRate: 5.2, publicSectorDependency: 25, ageProfile: 'mixed' }, previousMargin: 10.8, swingRequired: 5.4 },
  { name: 'Peterborough', region: 'eastmidlands', marginality: 58, demographics: { medianIncome: 29500, unemploymentRate: 5.8, publicSectorDependency: 27, ageProfile: 'mixed' }, previousMargin: 7.2, swingRequired: 3.6 },
  { name: 'Lincoln', region: 'eastmidlands', marginality: 45, demographics: { medianIncome: 28000, unemploymentRate: 6.0, publicSectorDependency: 29, ageProfile: 'young' }, previousMargin: 12.4, swingRequired: 6.2 },

  // Southeast England (91 seats)
  { name: 'Brighton Kemptown', region: 'southeast', marginality: 42, demographics: { medianIncome: 34000, unemploymentRate: 4.8, publicSectorDependency: 24, ageProfile: 'young' }, previousMargin: 13.6, swingRequired: 6.8 },
  { name: 'Brighton Pavilion', region: 'southeast', marginality: 35, demographics: { medianIncome: 36000, unemploymentRate: 4.5, publicSectorDependency: 26, ageProfile: 'young' }, previousMargin: 18.8, swingRequired: 9.4 },
  { name: 'Canterbury', region: 'southeast', marginality: 38, demographics: { medianIncome: 32000, unemploymentRate: 5.0, publicSectorDependency: 28, ageProfile: 'young' }, previousMargin: 16.2, swingRequired: 8.1 },
  { name: 'Crawley', region: 'southeast', marginality: 55, demographics: { medianIncome: 33000, unemploymentRate: 4.5, publicSectorDependency: 22, ageProfile: 'mixed' }, previousMargin: 8.4, swingRequired: 4.2 },
  { name: 'Hastings and Rye', region: 'southeast', marginality: 62, demographics: { medianIncome: 29000, unemploymentRate: 5.8, publicSectorDependency: 26, ageProfile: 'elderly' }, previousMargin: 5.8, swingRequired: 2.9 },
  { name: 'Oxford East', region: 'southeast', marginality: 12, demographics: { medianIncome: 35000, unemploymentRate: 4.2, publicSectorDependency: 32, ageProfile: 'young' }, previousMargin: 38.4, swingRequired: 19.2 },
  { name: 'Reading Central', region: 'southeast', marginality: 40, demographics: { medianIncome: 36000, unemploymentRate: 4.0, publicSectorDependency: 24, ageProfile: 'mixed' }, previousMargin: 14.8, swingRequired: 7.4 },
  { name: 'Slough', region: 'southeast', marginality: 28, demographics: { medianIncome: 32000, unemploymentRate: 5.5, publicSectorDependency: 27, ageProfile: 'young' }, previousMargin: 23.6, swingRequired: 11.8 },
  { name: 'Southampton Test', region: 'southeast', marginality: 44, demographics: { medianIncome: 30000, unemploymentRate: 5.2, publicSectorDependency: 28, ageProfile: 'young' }, previousMargin: 13.2, swingRequired: 6.6 },
  { name: 'Worthing West', region: 'southeast', marginality: 58, demographics: { medianIncome: 32000, unemploymentRate: 4.5, publicSectorDependency: 24, ageProfile: 'elderly' }, previousMargin: 7.4, swingRequired: 3.7 },
];

// Note: This is a sample of 50 constituencies. In a full implementation, you would need all 650.
// For now, this demonstrates the data structure. The generateAllMPs function will create
// 650 MPs using this as a template and generating additional constituencies programmatically.

// ===========================
// MP Names Database
// ===========================

export const MP_FIRST_NAMES = [
  'Rebecca', 'James', 'Sarah', 'David', 'Emma', 'Michael', 'Jessica', 'Thomas',
  'Sophie', 'Daniel', 'Rachel', 'Matthew', 'Hannah', 'Christopher', 'Laura',
  'Andrew', 'Emily', 'Benjamin', 'Charlotte', 'William', 'Olivia', 'Joshua',
  'Tariq', 'Priya', 'Aisha', 'Mohammed', 'Fatima', 'Ali', 'Zainab', 'Hassan',
  'Amina', 'Omar', 'Yasmin', 'Ibrahim', 'Khadija', 'Yusuf', 'Samantha', 'Ryan',
  'Katie', 'Nathan', 'Lucy', 'Jack', 'Grace', 'Oliver', 'Megan', 'Harry',
  'Chloe', 'George', 'Ella', 'Samuel', 'Beth', 'Tom', 'Anna', 'Edward',
  'Catherine', 'Richard', 'Victoria', 'Peter', 'Jennifer', 'Nicholas', 'Michelle',
  'Alexander', 'Amanda', 'Jonathan', 'Angela', 'Robert', 'Helen', 'Anthony',
  'Karen', 'Steven', 'Lisa', 'Mark', 'Susan', 'Paul', 'Margaret', 'Simon',
  'Sanjay', 'Deepa', 'Rajesh', 'Anita', 'Vikram', 'Meera', 'Ravi', 'Sunita',
  'Wei', 'Mei', 'Jun', 'Lin', 'Chen', 'Ying', 'Kwame', 'Ama', 'Kofi', 'Abena',
];

export const MP_LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White',
  'Harris', 'Clark', 'Lewis', 'Walker', 'Hall', 'Allen', 'Young', 'King',
  'Wright', 'Scott', 'Green', 'Baker', 'Adams', 'Nelson', 'Carter', 'Mitchell',
  'Khan', 'Ahmed', 'Hussain', 'Ali', 'Shah', 'Malik', 'Patel', 'Singh',
  'Kumar', 'Sharma', 'Mehta', 'Gupta', 'Reddy', 'Iyer', 'Nair', 'Chatterjee',
  'Chen', 'Wang', 'Li', 'Zhang', 'Liu', 'Yang', 'Huang', 'Zhao', 'Wu', 'Zhou',
  'Campbell', 'Murray', 'Robertson', 'Stewart', 'MacDonald', 'Fraser', 'Reid',
  'Davies', 'Evans', 'Hughes', 'Roberts', 'Lewis', 'Griffiths', 'Rees', 'Owen',
  'O\'Brien', 'Murphy', 'Kelly', 'Ryan', 'O\'Connor', 'Walsh', 'McCarthy',
  'MacDonald', 'MacLeod', 'MacKenzie', 'Cameron', 'Grant', 'Ross', 'Henderson',
  'Cooper', 'Bennett', 'Wood', 'Price', 'Hughes', 'Edwards', 'Collins', 'Cook',
];

// ===========================
// Real UK MPs Database (Post-July 2024)
// ===========================

export interface RealMPData {
  name: string;
  constituency: string;
  faction: LabourFaction;
  ministerialRole?: string;
  isMinister: boolean;
  rebellionRecord?: string[];
  enteredParliament: number;
  background: string;
  // Trait overrides based on real voting behavior
  rebelliousnessOverride?: number;
  principledOverride?: number;
}

// Cabinet Members (34 MPs with real data)
export const REAL_CABINET_MPS: RealMPData[] = [
  {
    name: 'Keir Starmer',
    constituency: 'Holborn and St Pancras',
    faction: 'centre_left',
    ministerialRole: 'Prime Minister',
    isMinister: true,
    enteredParliament: 2015,
    background: 'Former Director of Public Prosecutions and human rights barrister.',
    rebelliousnessOverride: 0,
    principledOverride: 7,
  },
  {
    name: 'Rachel Reeves',
    constituency: 'Leeds West and Pudsey',
    faction: 'centre_left',
    ministerialRole: 'Chancellor of the Exchequer',
    isMinister: true,
    enteredParliament: 2010,
    background: 'Former Bank of England economist with expertise in monetary policy.',
    rebelliousnessOverride: 0,
    principledOverride: 6,
  },
  {
    name: 'Angela Rayner',
    constituency: 'Ashton-under-Lyne',
    faction: 'soft_left',
    ministerialRole: 'Deputy Prime Minister / Housing',
    isMinister: true,
    enteredParliament: 2015,
    background: 'Former trade union official and care worker, champion of workers\' rights.',
    rebelliousnessOverride: 2,
    principledOverride: 8,
  },
  {
    name: 'David Lammy',
    constituency: 'Tottenham',
    faction: 'centre_left',
    ministerialRole: 'Foreign Secretary',
    isMinister: true,
    enteredParliament: 2000,
    background: 'Harvard-educated lawyer with strong Atlantic ties.',
    rebelliousnessOverride: 1,
  },
  {
    name: 'Yvette Cooper',
    constituency: 'Pontefract, Castleford and Knottingley',
    faction: 'centre_left',
    ministerialRole: 'Home Secretary',
    isMinister: true,
    enteredParliament: 1997,
    background: 'Experienced former minister with economics background.',
    rebelliousnessOverride: 0,
  },
  {
    name: 'John Healey',
    constituency: 'Rawmarsh and Conisbrough',
    faction: 'centre_left',
    ministerialRole: 'Defence Secretary',
    isMinister: true,
    enteredParliament: 1997,
    background: 'Long-serving MP with defence expertise.',
    rebelliousnessOverride: 1,
  },
  {
    name: 'Wes Streeting',
    constituency: 'Ilford North',
    faction: 'blairite',
    ministerialRole: 'Health Secretary',
    isMinister: true,
    enteredParliament: 2015,
    background: 'Openly Blairite moderniser advocating NHS reform with private sector involvement.',
    rebelliousnessOverride: 0,
    principledOverride: 8,
  },
  {
    name: 'Bridget Phillipson',
    constituency: 'Houghton and Sunderland South',
    faction: 'centre_left',
    ministerialRole: 'Education Secretary',
    isMinister: true,
    enteredParliament: 2010,
    background: 'Loyal Starmerite focused on education reform.',
    rebelliousnessOverride: 0,
  },
  {
    name: 'Shabana Mahmood',
    constituency: 'Birmingham Ladywood',
    faction: 'centre_left',
    ministerialRole: 'Justice Secretary',
    isMinister: true,
    enteredParliament: 2010,
    background: 'Barrister with legal expertise.',
    rebelliousnessOverride: 1,
  },
  {
    name: 'Jonathan Reynolds',
    constituency: 'Stalybridge and Hyde',
    faction: 'soft_left',
    ministerialRole: 'Business & Trade Secretary',
    isMinister: true,
    enteredParliament: 2010,
    background: 'Pro-business with soft left social instincts.',
    rebelliousnessOverride: 1,
  },
  {
    name: 'Ed Miliband',
    constituency: 'Doncaster North',
    faction: 'soft_left',
    ministerialRole: 'Energy & Net Zero Secretary',
    isMinister: true,
    enteredParliament: 2005,
    background: 'Former Labour leader focused on green investment and industrial strategy.',
    rebelliousnessOverride: 2,
    principledOverride: 8,
  },
  {
    name: 'Liz Kendall',
    constituency: 'Leicester West',
    faction: 'blairite',
    ministerialRole: 'Work & Pensions Secretary',
    isMinister: true,
    enteredParliament: 2010,
    background: 'Blairite moderniser focused on welfare reform.',
    rebelliousnessOverride: 0,
  },
  {
    name: 'Heidi Alexander',
    constituency: 'Swindon South',
    faction: 'centre_left',
    ministerialRole: 'Transport Secretary',
    isMinister: true,
    enteredParliament: 2010,
    background: 'Replaced Louise Haigh after resignation.',
    rebelliousnessOverride: 0,
  },
  {
    name: 'Steve Reed',
    constituency: 'Streatham and Croydon North',
    faction: 'centre_left',
    ministerialRole: 'Environment Secretary (DEFRA)',
    isMinister: true,
    enteredParliament: 2012,
    background: 'Former council leader with local government experience.',
    rebelliousnessOverride: 1,
  },
  {
    name: 'Lisa Nandy',
    constituency: 'Wigan',
    faction: 'soft_left',
    ministerialRole: 'Culture Secretary (DCMS)',
    isMinister: true,
    enteredParliament: 2010,
    background: 'Towns and communities champion with soft left instincts.',
    rebelliousnessOverride: 2,
    principledOverride: 7,
  },
  {
    name: 'Peter Kyle',
    constituency: 'Hove and Portslade',
    faction: 'blairite',
    ministerialRole: 'Science & Technology Secretary (DSIT)',
    isMinister: true,
    enteredParliament: 2015,
    background: 'Moderniser focused on technology and innovation.',
    rebelliousnessOverride: 0,
  },
  {
    name: 'Pat McFadden',
    constituency: 'Wolverhampton South East',
    faction: 'centre_left',
    ministerialRole: 'Cabinet Office Minister',
    isMinister: true,
    enteredParliament: 2005,
    background: 'Party discipline enforcer and Starmer loyalist.',
    rebelliousnessOverride: 0,
    principledOverride: 5,
  },
  {
    name: 'Lucy Powell',
    constituency: 'Manchester Central',
    faction: 'centre_left',
    ministerialRole: 'Leader of the House',
    isMinister: true,
    enteredParliament: 2012,
    background: 'Parliamentary manager.',
    rebelliousnessOverride: 0,
  },
  {
    name: 'Hilary Benn',
    constituency: 'Leeds South',
    faction: 'centre_left',
    ministerialRole: 'Northern Ireland Secretary',
    isMinister: true,
    enteredParliament: 1999,
    background: 'Veteran MP and former shadow foreign secretary.',
    rebelliousnessOverride: 1,
  },
  {
    name: 'Ian Murray',
    constituency: 'Edinburgh South',
    faction: 'centre_left',
    ministerialRole: 'Scotland Secretary',
    isMinister: true,
    enteredParliament: 2010,
    background: 'Only Labour MP in Scotland until 2024 landslide.',
    rebelliousnessOverride: 1,
  },
  {
    name: 'Jo Stevens',
    constituency: 'Cardiff East',
    faction: 'centre_left',
    ministerialRole: 'Wales Secretary',
    isMinister: true,
    enteredParliament: 2015,
    background: 'Solicitor with Welsh focus.',
    rebelliousnessOverride: 0,
  },
];

// Socialist Campaign Group (SCG) - Known Rebels
export const REAL_SCG_MPS: RealMPData[] = [
  {
    name: 'John McDonnell',
    constituency: 'Hayes and Harlington',
    faction: 'left',
    isMinister: false,
    enteredParliament: 1997,
    background: 'Former Shadow Chancellor under Corbyn. Hardest left economist.',
    rebellionRecord: ['two_child_cap', 'winter_fuel_abstain'],
    rebelliousnessOverride: 9,
    principledOverride: 10,
  },
  {
    name: 'Diane Abbott',
    constituency: 'Hackney North and Stoke Newington',
    faction: 'left',
    isMinister: false,
    enteredParliament: 1987,
    background: 'First Black woman MP. Veteran left-winger.',
    rebellionRecord: ['winter_fuel_abstain'],
    rebelliousnessOverride: 8,
    principledOverride: 10,
  },
  {
    name: 'Richard Burgon',
    constituency: 'Leeds East',
    faction: 'left',
    isMinister: false,
    enteredParliament: 2015,
    background: 'Barrister and vocal SCG member.',
    rebellionRecord: ['two_child_cap'],
    rebelliousnessOverride: 9,
    principledOverride: 10,
  },
  {
    name: 'Zarah Sultana',
    constituency: 'Coventry South',
    faction: 'left',
    isMinister: false,
    enteredParliament: 2019,
    background: 'Young left-wing activist focused on climate and inequality.',
    rebellionRecord: ['two_child_cap'],
    rebelliousnessOverride: 9,
    principledOverride: 10,
  },
  {
    name: 'Ian Lavery',
    constituency: 'Blyth and Ashington',
    faction: 'left',
    isMinister: false,
    enteredParliament: 2010,
    background: 'Former NUM official. Working-class left politics.',
    rebellionRecord: ['two_child_cap'],
    rebelliousnessOverride: 8,
    principledOverride: 9,
  },
  {
    name: 'Apsana Begum',
    constituency: 'Poplar and Limehouse',
    faction: 'left',
    isMinister: false,
    enteredParliament: 2019,
    background: 'Housing campaigner from East London.',
    rebellionRecord: ['two_child_cap'],
    rebelliousnessOverride: 9,
    principledOverride: 10,
  },
  {
    name: 'Rebecca Long-Bailey',
    constituency: 'Salford',
    faction: 'left',
    isMinister: false,
    enteredParliament: 2015,
    background: 'Solicitor. Former leadership candidate.',
    rebellionRecord: ['two_child_cap'],
    rebelliousnessOverride: 8,
    principledOverride: 9,
  },
  {
    name: 'Imran Hussain',
    constituency: 'Bradford East',
    faction: 'left',
    isMinister: false,
    enteredParliament: 2015,
    background: 'Former Bradford councillor.',
    rebellionRecord: ['two_child_cap'],
    rebelliousnessOverride: 8,
    principledOverride: 9,
  },
  {
    name: 'Nadia Whittome',
    constituency: 'Nottingham East',
    faction: 'left',
    isMinister: false,
    enteredParliament: 2019,
    background: 'One of youngest MPs. SCG-aligned but somewhat moderated under Starmer.',
    rebelliousnessOverride: 7,
    principledOverride: 9,
  },
  {
    name: 'Bell Ribeiro-Addy',
    constituency: 'Clapham and Brixton Hill',
    faction: 'left',
    isMinister: false,
    enteredParliament: 2019,
    background: 'Former Corbyn staffer. Moved slightly closer to centre.',
    rebelliousnessOverride: 6,
    principledOverride: 8,
  },
];

// Soft Left Notable MPs
export const REAL_SOFT_LEFT_MPS: RealMPData[] = [
  {
    name: 'Rachael Maskell',
    constituency: 'York Central',
    faction: 'soft_left',
    isMinister: false,
    enteredParliament: 2015,
    background: 'Unite union official. Pro-NHS.',
    rebellionRecord: ['winter_fuel_abstain'],
    rebelliousnessOverride: 5,
    principledOverride: 8,
  },
  {
    name: 'Cat Smith',
    constituency: 'Lancaster and Wyre',
    faction: 'soft_left',
    isMinister: false,
    enteredParliament: 2015,
    background: 'Pro-democracy reform advocate.',
    rebelliousnessOverride: 4,
    principledOverride: 7,
  },
  {
    name: 'Clive Lewis',
    constituency: 'Norwich South',
    faction: 'soft_left',
    isMinister: false,
    enteredParliament: 2015,
    background: 'Green New Deal advocate and former leadership candidate.',
    rebelliousnessOverride: 5,
    principledOverride: 8,
  },
  {
    name: 'Jon Trickett',
    constituency: 'Hemsworth',
    faction: 'soft_left',
    isMinister: false,
    enteredParliament: 1996,
    background: 'Veteran left-winger.',
    rebellionRecord: ['winter_fuel_vote_against'],
    rebelliousnessOverride: 7,
    principledOverride: 9,
  },
];

// Opposition Leaders (for reference)
export const REAL_OPPOSITION_MPS: RealMPData[] = [
  {
    name: 'Kemi Badenoch',
    constituency: 'North West Essex',
    faction: 'centre_left', // Not applicable but required
    isMinister: false,
    enteredParliament: 2017,
    background: 'Conservative Leader elected November 2024.',
  },
  {
    name: 'Ed Davey',
    constituency: 'Kingston and Surbiton',
    faction: 'centre_left',
    isMinister: false,
    enteredParliament: 1997,
    background: 'Liberal Democrat Leader.',
  },
  {
    name: 'Nigel Farage',
    constituency: 'Clacton',
    faction: 'centre_left',
    isMinister: false,
    enteredParliament: 2024,
    background: 'Reform UK Leader. First time elected as MP.',
  },
  {
    name: 'Carla Denyer',
    constituency: 'Bristol Central',
    faction: 'left',
    isMinister: false,
    enteredParliament: 2024,
    background: 'Green Party Co-Leader.',
  },
  {
    name: 'Adrian Ramsay',
    constituency: 'Waveney Valley',
    faction: 'left',
    isMinister: false,
    enteredParliament: 2024,
    background: 'Green Party Co-Leader.',
  },
];

/**
 * Find constituency by name (case-insensitive partial match)
 */
function findConstituencyByName(constituencies: Constituency[], name: string): Constituency | undefined {
  const normalizedName = name.toLowerCase();
  return constituencies.find(c => c.name.toLowerCase().includes(normalizedName) || normalizedName.includes(c.name.toLowerCase()));
}

/**
 * Generate a random MP name
 */
export function generateMPName(): string {
  const firstName = MP_FIRST_NAMES[Math.floor(Math.random() * MP_FIRST_NAMES.length)];
  const lastName = MP_LAST_NAMES[Math.floor(Math.random() * MP_LAST_NAMES.length)];
  return `${firstName} ${lastName}`;
}

/**
 * Generate additional constituencies to reach 650 total
 * Uses the template constituencies and creates variations
 */
export function generateAllConstituencies(): Constituency[] {
  const constituencies: Constituency[] = [];

  // Add the template constituencies
  UK_CONSTITUENCIES.forEach((template, index) => {
    constituencies.push({
      ...template,
      id: `constituency_${index + 1}`,
    });
  });

  // Generate remaining constituencies (650 - 50 = 600 more)
  const regions: RegionUK[] = [
    'london', 'southeast', 'southwest', 'eastengland', 'westmidlands',
    'eastmidlands', 'yorkshire', 'northwest', 'northeast', 'wales',
    'scotland', 'northernireland',
  ];

  const ageProfiles: AgeProfile[] = ['young', 'mixed', 'elderly'];

  for (let i = UK_CONSTITUENCIES.length; i < 650; i++) {
    const region = regions[Math.floor(Math.random() * regions.length)];
    const marginality = Math.floor(Math.random() * 90) + 5; // 5-95
    const medianIncome = 20000 + Math.floor(Math.random() * 40000); // £20k-£60k
    const unemploymentRate = 3 + Math.random() * 6; // 3-9%
    const publicSectorDependency = 15 + Math.floor(Math.random() * 25); // 15-40%
    const ageProfile = ageProfiles[Math.floor(Math.random() * ageProfiles.length)];

    constituencies.push({
      id: `constituency_${i + 1}`,
      name: `${region.toUpperCase()} Constituency ${i + 1}`,
      region,
      marginality,
      demographics: {
        medianIncome,
        unemploymentRate,
        publicSectorDependency,
        ageProfile,
      },
      previousMargin: marginality / 5,  // Rough approximation
      swingRequired: marginality / 10,
    });
  }

  return constituencies;
}

/**
 * Generate all 650 MPs with realistic profiles, prioritizing real MPs
 */
export function generateAllMPs(): Map<string, MPProfile> {
  const mps = new Map<string, MPProfile>();
  const constituencies = generateAllConstituencies();
  const usedNames = new Set<string>();
  const usedConstituencyIds = new Set<string>();
  
  let mpCounter = 0;
  let constituencyIndex = 0;

  // Helper to get unique name
  const getUniqueName = (): string => {
    let name = generateMPName();
    let attempts = 0;
    while (usedNames.has(name) && attempts < 100) {
      name = generateMPName();
      attempts++;
    }
    usedNames.add(name);
    return name;
  };

  // Helper to create MP from real data
  const createMPFromRealData = (realMP: RealMPData, party: PartyAffiliation = 'labour'): MPProfile | null => {
    // Try to find matching constituency
    let constituency = findConstituencyByName(constituencies, realMP.constituency);
    
    // If not found, use next available constituency
    if (!constituency) {
      constituency = constituencies[constituencyIndex];
      constituencyIndex++;
    }
    
    if (!constituency || usedConstituencyIds.has(constituency.id)) {
      constituency = constituencies[constituencyIndex];
      constituencyIndex++;
    }
    
    if (!constituency) return null;
    
    usedConstituencyIds.add(constituency.id);
    usedNames.add(realMP.name);
    
    const ideology = generateIdeology(party, realMP.faction);
    let traits = generateTraits(realMP.isMinister, realMP.faction);
    
    // Apply real-world trait overrides
    if (realMP.rebelliousnessOverride !== undefined) {
      traits.rebelliousness = realMP.rebelliousnessOverride;
    }
    if (realMP.principledOverride !== undefined) {
      traits.principled = realMP.principledOverride;
    }
    
    const mp: MPProfile = {
      id: `mp_real_${mpCounter++}`,
      name: realMP.name,
      party,
      constituency,
      faction: realMP.faction,
      ideology,
      traits,
      background: realMP.background,
      enteredParliament: realMP.enteredParliament,
      isMinister: realMP.isMinister,
      ministerialRole: realMP.ministerialRole,
      committees: [],
    };
    
    return mp;
  };

  // LABOUR MPs (411 total)
  console.log('Generating Labour MPs with real Cabinet and rebel data...');

  // 1. REAL CABINET MEMBERS (21 MPs)
  for (const realMP of REAL_CABINET_MPS) {
    const mp = createMPFromRealData(realMP);
    if (mp) {
      mps.set(mp.id, mp);
    }
  }
  console.log(`Added ${REAL_CABINET_MPS.length} real Cabinet members`);

  // 2. REAL SCG / REBEL MPs (10 MPs)
  for (const realMP of REAL_SCG_MPS) {
    const mp = createMPFromRealData(realMP);
    if (mp) {
      mps.set(mp.id, mp);
    }
  }
  console.log(`Added ${REAL_SCG_MPS.length} real SCG/rebel MPs`);

  // 3. REAL SOFT LEFT MPs (4 MPs)
  for (const realMP of REAL_SOFT_LEFT_MPS) {
    const mp = createMPFromRealData(realMP);
    if (mp) {
      mps.set(mp.id, mp);
    }
  }
  console.log(`Added ${REAL_SOFT_LEFT_MPS.length} real soft left MPs`);

  // 4. Remaining Frontbench/Payroll MPs (190 - to make 211 total ministers)
  const remainingMinisters = 211 - REAL_CABINET_MPS.length;
  
  const ministerialRoles = [
    'Junior Minister',
    'Parliamentary Under-Secretary',
    'Parliamentary Private Secretary',
    'Government Whip',
  ];

  for (let i = 0; i < remainingMinisters; i++) {
    const faction: LabourFaction =
      i < 40 ? 'centre_left' :
      i < 80 ? 'party_loyalist' :
      i < 120 ? 'soft_left' :
      i < 160 ? 'blairite' : 'centre_left';

    const constituency = constituencies[constituencyIndex++];
    if (!constituency) continue;
    
    usedConstituencyIds.add(constituency.id);
    const ideology = generateIdeology('labour', faction);
    const traits = generateTraits(true, faction);

    const mp: MPProfile = {
      id: `mp_labour_minister_${mpCounter++}`,
      name: getUniqueName(),
      party: 'labour',
      constituency,
      faction,
      ideology,
      traits,
      background: `Minister with background in ${['law', 'economics', 'education', 'healthcare', 'business'][i % 5]}.`,
      enteredParliament: 2015 + Math.floor(Math.random() * 10),
      isMinister: true,
      ministerialRole: ministerialRoles[i % ministerialRoles.length],
      committees: [],
    };

    mps.set(mp.id, mp);
  }

  // 5. Backbench Labour MPs (remaining to reach 411)
  const realLabourCount = REAL_CABINET_MPS.length + REAL_SCG_MPS.length + REAL_SOFT_LEFT_MPS.length;
  const remainingBackbenchers = 411 - 211 - (realLabourCount - REAL_CABINET_MPS.length);
  
  // Left faction (30 more - we already have 10 real ones)
  for (let i = 0; i < 30; i++) {
    const constituency = constituencies[constituencyIndex++];
    if (!constituency) continue;
    usedConstituencyIds.add(constituency.id);
    
    const ideology = generateIdeology('labour', 'left');
    const traits = generateTraits(false, 'left');

    const mp: MPProfile = {
      id: `mp_labour_left_${mpCounter++}`,
      name: getUniqueName(),
      party: 'labour',
      constituency,
      faction: 'left',
      ideology,
      traits,
      background: 'Left-wing activist with community organising background.',
      enteredParliament: 2015 + Math.floor(Math.random() * 10),
      isMinister: false,
      committees: ['Public Accounts', 'Treasury', 'Work and Pensions'][i % 3] ? [['Public Accounts', 'Treasury', 'Work and Pensions'][i % 3]] : [],
    };

    mps.set(mp.id, mp);
  }

  // Soft left (66 more - we already have 4 real ones)
  for (let i = 0; i < 66; i++) {
    const constituency = constituencies[constituencyIndex++];
    if (!constituency) continue;
    usedConstituencyIds.add(constituency.id);
    
    const ideology = generateIdeology('labour', 'soft_left');
    const traits = generateTraits(false, 'soft_left');

    const mp: MPProfile = {
      id: `mp_labour_soft_left_${mpCounter++}`,
      name: getUniqueName(),
      party: 'labour',
      constituency,
      faction: 'soft_left',
      ideology,
      traits,
      background: 'Trade union background or community organiser.',
      enteredParliament: 2010 + Math.floor(Math.random() * 15),
      isMinister: false,
      committees: [],
    };

    mps.set(mp.id, mp);
  }

  // Centre left / party loyalists (60)
  for (let i = 0; i < 60; i++) {
    const constituency = constituencies[constituencyIndex++];
    if (!constituency) continue;
    usedConstituencyIds.add(constituency.id);
    
    const ideology = generateIdeology('labour', 'centre_left');
    const traits = generateTraits(false, 'centre_left');

    const mp: MPProfile = {
      id: `mp_labour_centre_${mpCounter++}`,
      name: getUniqueName(),
      party: 'labour',
      constituency,
      faction: 'centre_left',
      ideology,
      traits,
      background: 'Professional background in law, business, or public service.',
      enteredParliament: 2015 + Math.floor(Math.random() * 10),
      isMinister: false,
      committees: [],
    };

    mps.set(mp.id, mp);
  }

  // Blairites (30)
  for (let i = 0; i < 30; i++) {
    const constituency = constituencies[constituencyIndex++];
    if (!constituency) continue;
    usedConstituencyIds.add(constituency.id);
    
    const ideology = generateIdeology('labour', 'blairite');
    const traits = generateTraits(false, 'blairite');

    const mp: MPProfile = {
      id: `mp_labour_blairite_${mpCounter++}`,
      name: getUniqueName(),
      party: 'labour',
      constituency,
      faction: 'blairite',
      ideology,
      traits,
      background: 'Moderniser focused on reform and efficiency.',
      enteredParliament: 2015 + Math.floor(Math.random() * 10),
      isMinister: false,
      committees: [],
    };

    mps.set(mp.id, mp);
  }

  console.log(`Total Labour MPs generated: ${Array.from(mps.values()).filter(mp => mp.party === 'labour').length}`);

  // CONSERVATIVE MPs (121)
  for (let i = 0; i < 121; i++) {
    const constituency = constituencies[constituencyIndex++];
    if (!constituency) continue;
    usedConstituencyIds.add(constituency.id);
    
    const ideology = generateIdeology('conservative');
    const traits = generateTraits(false);

    const mp: MPProfile = {
      id: `mp_conservative_${mpCounter++}`,
      name: getUniqueName(),
      party: 'conservative',
      constituency,
      ideology,
      traits,
      background: 'Conservative politician.',
      enteredParliament: 2010 + Math.floor(Math.random() * 15),
      isMinister: false,
      committees: [],
    };

    mps.set(mp.id, mp);
  }

  // LIBERAL DEMOCRAT MPs (72)
  for (let i = 0; i < 72; i++) {
    const constituency = constituencies[constituencyIndex++];
    if (!constituency) continue;
    usedConstituencyIds.add(constituency.id);
    
    const ideology = generateIdeology('liberal_democrat');
    const traits = generateTraits(false);

    const mp: MPProfile = {
      id: `mp_libdem_${mpCounter++}`,
      name: getUniqueName(),
      party: 'liberal_democrat',
      constituency,
      ideology,
      traits,
      background: 'Liberal Democrat campaigner.',
      enteredParliament: 2019 + Math.floor(Math.random() * 6),
      isMinister: false,
      committees: [],
    };

    mps.set(mp.id, mp);
  }

  // SNP MPs (9)
  for (let i = 0; i < 9; i++) {
    const constituency = constituencies[constituencyIndex++];
    if (!constituency) continue;
    usedConstituencyIds.add(constituency.id);
    
    const ideology = generateIdeology('snp');
    const traits = generateTraits(false);

    const mp: MPProfile = {
      id: `mp_snp_${mpCounter++}`,
      name: getUniqueName(),
      party: 'snp',
      constituency,
      ideology,
      traits,
      background: 'Scottish nationalist.',
      enteredParliament: 2015 + Math.floor(Math.random() * 10),
      isMinister: false,
      committees: [],
    };

    mps.set(mp.id, mp);
  }

  // GREEN MPs (4) - including real ones
  for (const realMP of REAL_OPPOSITION_MPS.filter(mp => mp.constituency.includes('Bristol') || mp.constituency.includes('Waveney'))) {
    const mp = createMPFromRealData(realMP, 'green');
    if (mp) {
      mps.set(mp.id, mp);
    }
  }
  
  // Add remaining Greens if needed
  const greenCount = Array.from(mps.values()).filter(mp => mp.party === 'green').length;
  for (let i = greenCount; i < 4; i++) {
    const constituency = constituencies[constituencyIndex++];
    if (!constituency) continue;
    usedConstituencyIds.add(constituency.id);
    
    const ideology = generateIdeology('green');
    const traits = generateTraits(false);

    const mp: MPProfile = {
      id: `mp_green_${mpCounter++}`,
      name: getUniqueName(),
      party: 'green',
      constituency,
      ideology,
      traits,
      background: 'Environmental activist.',
      enteredParliament: 2024,
      isMinister: false,
      committees: [],
    };

    mps.set(mp.id, mp);
  }

  // REFORM UK MPs (5)
  for (let i = 0; i < 5; i++) {
    // Add real Nigel Farage
    if (i === 0) {
      const farage = REAL_OPPOSITION_MPS.find(mp => mp.name === 'Nigel Farage');
      if (farage) {
        const mp = createMPFromRealData(farage, 'reform_uk');
        if (mp) {
          mps.set(mp.id, mp);
          continue;
        }
      }
    }
    
    const constituency = constituencies[constituencyIndex++];
    if (!constituency) continue;
    usedConstituencyIds.add(constituency.id);
    
    const ideology = generateIdeology('reform_uk');
    const traits = generateTraits(false);

    const mp: MPProfile = {
      id: `mp_reform_${mpCounter++}`,
      name: getUniqueName(),
      party: 'reform_uk',
      constituency,
      ideology,
      traits,
      background: 'Populist right politician.',
      enteredParliament: 2024,
      isMinister: false,
      committees: [],
    };

    mps.set(mp.id, mp);
  }

  // PLAID CYMRU (4)
  for (let i = 0; i < 4; i++) {
    const constituency = constituencies[constituencyIndex++];
    if (!constituency) continue;
    usedConstituencyIds.add(constituency.id);
    
    const ideology = generateIdeology('plaid_cymru');
    const traits = generateTraits(false);

    const mp: MPProfile = {
      id: `mp_plaid_${mpCounter++}`,
      name: getUniqueName(),
      party: 'plaid_cymru',
      constituency,
      ideology,
      traits,
      background: 'Welsh nationalist.',
      enteredParliament: 2015 + Math.floor(Math.random() * 10),
      isMinister: false,
      committees: [],
    };

    mps.set(mp.id, mp);
  }

  // SINN FEIN (7) - Never take seats
  for (let i = 0; i < 7; i++) {
    const constituency = constituencies[constituencyIndex++];
    if (!constituency) continue;
    usedConstituencyIds.add(constituency.id);
    
    const ideology = generateIdeology('sinn_fein');
    const traits = generateTraits(false);

    const mp: MPProfile = {
      id: `mp_sinn_fein_${mpCounter++}`,
      name: getUniqueName(),
      party: 'sinn_fein',
      constituency,
      ideology,
      traits,
      background: 'Irish republican. Does not take seat in Westminster.',
      enteredParliament: 2015 + Math.floor(Math.random() * 10),
      isMinister: false,
      committees: [],
    };

    mps.set(mp.id, mp);
  }

  // OTHER MINOR PARTIES (DUP, SDLP, Alliance, UUP, TUV, Independents - 19 total)
  // Note: sdlp, alliance, uup, tuv not in type system, using dup or independent
  for (let i = 0; i < 19; i++) {
    const constituency = constituencies[constituencyIndex++];
    if (!constituency) continue;
    usedConstituencyIds.add(constituency.id);
    
    const parties: PartyAffiliation[] = ['dup', 'dup', 'dup', 'dup', 'dup', 'independent', 'independent', 'independent', 'independent', 'independent', 'independent', 'independent', 'independent', 'independent', 'independent', 'independent', 'independent', 'independent', 'independent'];
    const partyLabels = ['DUP', 'DUP', 'DUP', 'DUP', 'DUP', 'SDLP', 'SDLP', 'Alliance', 'UUP', 'TUV', 'Independent', 'Independent', 'Independent', 'Independent', 'Independent', 'Independent', 'Independent', 'Independent', 'Independent'];
    const party = parties[i];
    const partyLabel = partyLabels[i];
    
    const ideology = generateIdeology(party === 'independent' ? 'labour' : party);
    const traits = generateTraits(false);

    const mp: MPProfile = {
      id: `mp_other_${mpCounter++}`,
      name: getUniqueName(),
      party,
      constituency,
      ideology,
      traits,
      background: `${partyLabel} politician.`,
      enteredParliament: 2015 + Math.floor(Math.random() * 10),
      isMinister: false,
      committees: [],
    };

    mps.set(mp.id, mp);
  }

  // SPEAKER (1)
  const speakerConstituency = constituencies[constituencyIndex++];
  if (speakerConstituency) {
    usedConstituencyIds.add(speakerConstituency.id);
    const ideology = generateIdeology('labour'); // Speaker is neutral but track original party
    const traits = generateTraits(false);

    const mp: MPProfile = {
      id: 'mp_speaker',
      name: 'Lindsay Hoyle',
      party: 'labour',
      constituency: speakerConstituency,
      ideology,
      traits,
      background: 'Speaker of the House of Commons. Politically neutral in role.',
      enteredParliament: 1997,
      isMinister: false,
      ministerialRole: 'Speaker',
      committees: [],
    };

    mps.set(mp.id, mp);
  }

  console.log(`Total MPs generated: ${mps.size}`);
  console.log(`Real MPs included: ${REAL_CABINET_MPS.length + REAL_SCG_MPS.length + REAL_SOFT_LEFT_MPS.length + 3} (Cabinet, Rebels, Opposition leaders)`);

  return mps;
}
