/**
 * EVENTS & MEDIA SYSTEM
 *
 * Generates random events and newspaper headlines for the UK Chancellor simulation.
 * Creates realistic newspapers with appropriate bias, opposition quotes, and context-aware coverage.
 */

import React from 'react';
import type { EmergencyProgramme } from './game-state';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type EventType =
  | 'international_crisis'
  | 'domestic_shock'
  | 'market_panic'
  | 'natural_disaster'
  | 'scandal'
  | 'industrial_action'
  | 'economic_data'
  | 'policy_consequence'
  | 'political_crisis';

export type EventSeverity = 'minor' | 'major' | 'crisis';

export interface EventImpact {
  gdpGrowth?: number;           // Percentage point impact on quarterly growth
  inflation?: number;            // Percentage point impact on CPI
  unemployment?: number;         // Percentage point impact
  approvalRating?: number;       // Percentage point impact
  pmTrust?: number;              // Points impact
  politicalCapital?: number;     // Points impact
  giltYieldBps?: number;         // Basis points impact on gilt yields
  sterlingPercent?: number;      // Percentage impact on sterling
}

export interface EventResponseOption {
  label: string;
  description: string;
  politicalCost: number;         // Political capital required
  economicImpact: EventImpact;   // Effects if chosen
  fiscalCost?: number;           // Immediate fiscal cost in £bn
  rebuildingMonths?: number;     // How many months to rebuild (for disasters)
  rebuildingCostPerMonth?: number; // Monthly rebuild cost in £bn
}

export interface RandomEvent {
  id: string;
  type: EventType;
  severity: EventSeverity;
  month: number;
  date: Date;
  title: string;
  description: string;
  immediateImpact: EventImpact;
  responseOptions?: EventResponseOption[];
  requiresResponse: boolean;     // Major events need modal
  warningMonthsBefore?: number;  // Some events give advance warning
}

export type NewspaperBias = 'left' | 'centre-left' | 'centre-right' | 'right' | 'populist-right' | 'financial';

export interface NewspaperSource {
  name: string;
  bias: NewspaperBias;
  style: 'tabloid' | 'broadsheet';
  priorities: string[];          // What they care about most
}

export interface OppositionQuote {
  speaker: string;               // Name and title
  quote: string;
  party: 'Conservative' | 'LibDem' | 'SNP' | 'Reform';
}

export interface NewsArticle {
  newspaper: NewspaperSource;
  headline: string;
  subheading: string;
  paragraphs: string[];
  oppositionQuote: OppositionQuote;
  month: number;
  date: Date;
  isSpecialEdition: boolean;     // Breaking news
}

export interface EventLogEntry {
  event: RandomEvent;
  newsArticle?: NewsArticle;
  playerResponse?: string;       // Which option they chose
  resolved: boolean;
}

// ============================================================================
// NEWSPAPER SOURCES
// ============================================================================

const NEWSPAPERS: NewspaperSource[] = [
  {
    name: 'The Guardian',
    bias: 'left',
    style: 'broadsheet',
    priorities: ['public_services', 'inequality', 'environment', 'social_justice']
  },
  {
    name: 'The Telegraph',
    bias: 'right',
    style: 'broadsheet',
    priorities: ['tax_cuts', 'fiscal_discipline', 'business', 'traditional_values']
  },
  {
    name: 'The Times',
    bias: 'centre-right',
    style: 'broadsheet',
    priorities: ['stability', 'competence', 'establishment', 'credibility']
  },
  {
    name: 'Financial Times',
    bias: 'financial',
    style: 'broadsheet',
    priorities: ['markets', 'debt', 'growth', 'monetary_policy', 'international_trade']
  },
  {
    name: 'The Sun',
    bias: 'populist-right',
    style: 'tabloid',
    priorities: ['ordinary_people', 'benefits', 'immigration', 'patriotism']
  },
  {
    name: 'Daily Mail',
    bias: 'populist-right',
    style: 'broadsheet',
    priorities: ['pensions', 'property', 'middle_class', 'law_and_order']
  }
];

function normaliseText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

function buildRecentNewsCorpus(state: any): string {
  const recent = state?.recentNewspapers;
  if (!Array.isArray(recent) || recent.length === 0) {
    return '';
  }

  return recent
    .slice(-18)
    .flatMap((article: any) => {
      if (!article) return [];
      const parts: string[] = [];
      if (typeof article.headline === 'string') parts.push(article.headline);
      if (typeof article.subheading === 'string') parts.push(article.subheading);
      if (Array.isArray(article.paragraphs)) {
        parts.push(...article.paragraphs.filter((p: any) => typeof p === 'string'));
      }
      if (article.oppositionQuote?.quote) parts.push(article.oppositionQuote.quote);
      return parts;
    })
    .join(' ')
    .toLowerCase();
}

function countOccurrences(haystack: string, needle: string): number {
  if (!haystack || !needle) return 0;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matches = haystack.match(new RegExp(escaped, 'g'));
  return matches ? matches.length : 0;
}

function pickLeastRepeated(candidates: string[], recentCorpus: string): string {
  if (!Array.isArray(candidates) || candidates.length === 0) return '';
  if (!recentCorpus) return candidates[Math.floor(Math.random() * candidates.length)];

  const scored = candidates.map((candidate) => {
    const normalisedCandidate = normaliseText(candidate);
    const keyPhrase = normalisedCandidate.split(',')[0];
    const score = countOccurrences(recentCorpus, normalisedCandidate) * 3 + countOccurrences(recentCorpus, keyPhrase);
    return { candidate, score };
  });

  const minScore = Math.min(...scored.map((entry) => entry.score));
  const shortlist = scored.filter((entry) => entry.score === minScore).map((entry) => entry.candidate);
  return shortlist[Math.floor(Math.random() * shortlist.length)];
}

// ============================================================================
// EVENT TEMPLATES
// ============================================================================

interface EventTemplate {
  type: EventType;
  severity: EventSeverity;
  probability: number;           // Base probability per month (0-1)
  conditions?: (state: any) => boolean;  // Only trigger if conditions met
  generate: (state: any) => Omit<RandomEvent, 'id' | 'month' | 'date'>;
}

const EVENT_TEMPLATES: EventTemplate[] = [
  // === INTERNATIONAL CRISES ===
  {
    type: 'international_crisis',
    severity: 'major',
    probability: 0.015,  // ~18% per year
    generate: (state) => ({
      type: 'international_crisis',
      severity: 'major',
      title: 'Oil Price Shock',
      description: 'Geopolitical tensions in the Middle East have caused oil prices to spike by 40% overnight. Petrol prices are surging and inflation expectations are rising sharply.',
      immediateImpact: {
        inflation: 0.8,
        gdpGrowth: -0.3,
        approvalRating: -3,
        giltYieldBps: 15
      },
      responseOptions: [
        {
          label: 'Cut fuel duty temporarily',
          description: 'Reduce fuel duty by 10p per litre for six months to shield motorists from the worst of the price rise.',
          politicalCost: 10,
          fiscalCost: 4.5,
          economicImpact: { inflation: -0.2, approvalRating: 5 }
        },
        {
          label: 'Windfall tax on energy companies',
          description: 'Impose a 35% windfall tax on oil and gas producer profits to help fund cost-of-living support.',
          politicalCost: 5,
          fiscalCost: -2.8,
          economicImpact: { approvalRating: 3, politicalCapital: -5 }
        },
        {
          label: 'Do nothing',
          description: 'Allow markets to adjust naturally. The Bank of England will respond with monetary policy.',
          politicalCost: 0,
          fiscalCost: 0,
          economicImpact: { approvalRating: -5, pmTrust: -3 }
        }
      ],
      requiresResponse: true
    })
  },
  {
    type: 'international_crisis',
    severity: 'crisis',
    probability: 0.008,  // ~10% per year
    generate: (state) => ({
      type: 'international_crisis',
      severity: 'crisis',
      title: 'Global Financial Contagion',
      description: 'A major European bank has collapsed, triggering fears of systemic financial crisis. UK banks are heavily exposed. Markets are in freefall.',
      immediateImpact: {
        gdpGrowth: -1.2,
        unemployment: 0.3,
        approvalRating: -5,
        giltYieldBps: 45,
        sterlingPercent: -3.5
      },
      responseOptions: [
        {
          label: 'Emergency bank guarantee',
          description: 'Guarantee all deposits and extend unlimited liquidity to UK banks. Costs unknown but could be vast.',
          politicalCost: 20,
          fiscalCost: 15,
          economicImpact: { giltYieldBps: -20, approvalRating: -2, pmTrust: 5 }
        },
        {
          label: 'Coordinate with G7',
          description: 'Work with international partners on coordinated response. Takes time but shares the burden.',
          politicalCost: 15,
          fiscalCost: 8,
          economicImpact: { giltYieldBps: -10, gdpGrowth: 0.2, approvalRating: 2 }
        },
        {
          label: 'Let failing banks collapse',
          description: 'Allow market discipline to work. Depositors protected up to £85,000, shareholders wiped out.',
          politicalCost: 35,
          fiscalCost: 0,
          economicImpact: { gdpGrowth: -0.8, unemployment: 0.5, approvalRating: -8 }
        }
      ],
      requiresResponse: true
    })
  },

  // === DOMESTIC SHOCKS ===
  {
    type: 'domestic_shock',
    severity: 'major',
    probability: 0.012,
    conditions: (state) => state.services.nhsQuality < 65,
    generate: (state) => ({
      type: 'domestic_shock',
      severity: 'major',
      title: 'NHS Winter Crisis',
      description: 'A harsh winter has pushed the NHS into complete crisis. A&E waiting times exceed 12 hours, operations are cancelled en masse, and two hospitals have declared major incidents.',
      immediateImpact: {
        approvalRating: -6,
        pmTrust: -5
      },
      responseOptions: [
        {
          label: 'Emergency £2bn funding',
          description: 'Provide immediate emergency funding for winter pressures and temporary staff. Will increase deficit.',
          politicalCost: 5,
          fiscalCost: 2,
          economicImpact: { approvalRating: 4 }
        },
        {
          label: 'Deploy military medics',
          description: 'Bring in armed forces medical personnel to support overwhelmed hospitals. Low cost but controversial.',
          politicalCost: 10,
          fiscalCost: 0.1,
          economicImpact: { approvalRating: -1, pmTrust: -2 }
        },
        {
          label: 'Blame NHS management',
          description: 'Publicly criticise NHS managers for poor planning and threaten reform. Politically risky.',
          politicalCost: 0,
          fiscalCost: 0,
          economicImpact: { approvalRating: -8, politicalCapital: -15 }
        }
      ],
      requiresResponse: true
    })
  },
  {
    type: 'industrial_action',
    severity: 'major',
    probability: 0.01,
    conditions: (state) => (state.economy?.inflationCPI ?? 0) > (state.economy?.wageGrowthReal ?? 4) + 2,
    generate: (state) => ({
      type: 'industrial_action',
      severity: 'major',
      title: 'Public Sector Strike Wave',
      description: 'Teachers, nurses, and rail workers have announced coordinated strike action over pay. Unions demand inflation-matching pay rises. The TUC warns of a "summer of discontent".',
      immediateImpact: {
        approvalRating: -4,
        gdpGrowth: -0.2
      },
      responseOptions: [
        {
          label: 'Meet pay demands',
          description: 'Grant above-inflation pay settlements to public sector workers. Expensive but ends strikes quickly.',
          politicalCost: 5,
          fiscalCost: 8,
          economicImpact: { approvalRating: 6, inflation: 0.3 }
        },
        {
          label: 'Offer compromise settlement',
          description: 'Propose pay rises below inflation but with one-off bonuses. May not satisfy unions.',
          politicalCost: 10,
          fiscalCost: 4,
          economicImpact: { approvalRating: 1, politicalCapital: -5 }
        },
        {
          label: 'Refuse and legislate',
          description: 'Hold firm on pay restraint and introduce minimum service level legislation. Confrontational.',
          politicalCost: 20,
          fiscalCost: 0,
          economicImpact: { approvalRating: -6, politicalCapital: -10 }
        }
      ],
      requiresResponse: true
    })
  },

  // === MARKET PANICS ===
  {
    type: 'market_panic',
    severity: 'crisis',
    probability: 0.005,  // ~6% per year
    conditions: (state) => (state.fiscal?.debtToGdpPercent ?? 0) > 100 && (state.fiscal?.deficitPctGDP ?? 0) > 5,
    generate: (state) => ({
      type: 'market_panic',
      severity: 'crisis',
      title: 'Gilt Market Crisis',
      description: 'Bond markets have lost faith in UK fiscal policy. Gilt yields are spiking, pension funds are in distress, and the pound is plummeting. The IMF has issued a rare public warning.',
      immediateImpact: {
        giltYieldBps: 120,
        sterlingPercent: -6,
        approvalRating: -8,
        pmTrust: -10
      },
      responseOptions: [
        {
          label: 'Emergency fiscal tightening',
          description: 'Announce £30bn of immediate tax rises and spending cuts. Markets will stabilise but recession likely.',
          politicalCost: 40,
          fiscalCost: -30,
          economicImpact: { giltYieldBps: -80, gdpGrowth: -0.8, approvalRating: -10 }
        },
        {
          label: 'Bank of England intervention',
          description: 'Request BoE emergency bond-buying programme. Saves time but undermines independence.',
          politicalCost: 25,
          fiscalCost: 0,
          economicImpact: { giltYieldBps: -60, inflation: 0.4, approvalRating: -4 }
        },
        {
          label: 'Resign',
          description: 'Take responsibility and offer resignation. PM may accept or refuse.',
          politicalCost: 100,
          fiscalCost: 0,
          economicImpact: { pmTrust: -50 }
        }
      ],
      requiresResponse: true
    })
  },
  {
    type: 'market_panic',
    severity: 'major',
    probability: 0.008,
    conditions: (state) => state.economy.inflationCPI > 8,
    generate: (state) => ({
      type: 'market_panic',
      severity: 'major',
      title: 'Sterling Crisis',
      description: 'The pound has fallen to its lowest level against the dollar in 40 years. Currency traders believe the UK has lost control of inflation.',
      immediateImpact: {
        sterlingPercent: -4.5,
        inflation: 0.5,
        approvalRating: -5
      },
      responseOptions: [
        {
          label: 'Emergency interest rate call',
          description: 'Publicly call for Bank of England to raise rates sharply. Controversial but may steady currency.',
          politicalCost: 15,
          fiscalCost: 0,
          economicImpact: { sterlingPercent: 2, gdpGrowth: -0.3, approvalRating: -2 }
        },
        {
          label: 'Fiscal tightening package',
          description: 'Announce credible deficit reduction plan to reassure markets about inflation control.',
          politicalCost: 20,
          fiscalCost: -15,
          economicImpact: { sterlingPercent: 3, giltYieldBps: -20, approvalRating: -4 }
        },
        {
          label: 'Wait for BoE',
          description: 'Trust the Bank of England to respond at next policy meeting. Low cost but markets may worsen.',
          politicalCost: 5,
          fiscalCost: 0,
          economicImpact: { sterlingPercent: -1, inflation: 0.2, approvalRating: -3 }
        }
      ],
      requiresResponse: true
    })
  },

  // === NATURAL DISASTERS ===
  {
    type: 'natural_disaster',
    severity: 'major',
    probability: 0.006,
    generate: (state) => ({
      type: 'natural_disaster',
      severity: 'major',
      title: 'Severe Flooding',
      description: 'Unprecedented rainfall has caused catastrophic flooding across northern England. Thousands evacuated, infrastructure damaged, insured losses estimated at £3bn.',
      immediateImpact: {
        gdpGrowth: -0.15,
        approvalRating: -2
      },
      responseOptions: [
        {
          label: 'Major relief package',
          description: 'Provide £1.5bn for immediate relief and reconstruction. Show government cares but adds to deficit.',
          politicalCost: 5,
          fiscalCost: 1.5,
          rebuildingMonths: 36,
          rebuildingCostPerMonth: 0.8,
          economicImpact: { approvalRating: 6, gdpGrowth: 0.1 }
        },
        {
          label: 'Standard emergency funding',
          description: 'Activate normal disaster relief protocols. Adequate but may seem insufficient.',
          politicalCost: 10,
          fiscalCost: 0.4,
          rebuildingMonths: 24,
          rebuildingCostPerMonth: 0.3,
          economicImpact: { approvalRating: 1 }
        },
        {
          label: 'Insurance-led response',
          description: 'Rely primarily on private insurance with minimal state intervention. Fiscally prudent but unpopular.',
          politicalCost: 15,
          fiscalCost: 0.1,
          rebuildingMonths: 12,
          rebuildingCostPerMonth: 0.1,
          economicImpact: { approvalRating: -4, politicalCapital: -10 }
        }
      ],
      requiresResponse: true
    })
  },

  // === SCANDALS ===
  {
    type: 'scandal',
    severity: 'major',
    probability: 0.01,
    generate: (state) => ({
      type: 'scandal',
      severity: 'major',
      title: 'Tax Affairs Scandal',
      description: 'The Sunday Times has revealed that a Treasury minister held offshore investments that benefited from a tax loophole your department created. Opposition demanding resignation.',
      immediateImpact: {
        approvalRating: -5,
        pmTrust: -4,
        politicalCapital: -15
      },
      responseOptions: [
        {
          label: 'Demand resignation',
          description: 'Immediately sack the minister and distance yourself. Quick resolution but shows poor judgement.',
          politicalCost: 10,
          fiscalCost: 0,
          economicImpact: { approvalRating: 2, pmTrust: -1 }
        },
        {
          label: 'Launch inquiry',
          description: 'Order an independent investigation into ministerial conduct. Buys time but prolongs story.',
          politicalCost: 5,
          fiscalCost: 0,
          economicImpact: { approvalRating: -2, politicalCapital: -5 }
        },
        {
          label: 'Defend minister',
          description: 'Argue arrangements were legal and ministers followed rules. Loyal but politically costly.',
          politicalCost: 30,
          fiscalCost: 0,
          economicImpact: { approvalRating: -7, politicalCapital: -20, pmTrust: -5 }
        }
      ],
      requiresResponse: true
    })
  },

  // === MINOR EVENTS (appear in log, no immediate response needed) ===
  {
    type: 'economic_data',
    severity: 'minor',
    probability: 0.4,  // Common
    conditions: (state) => Math.abs(state.economy?.gdpGrowthAnnual ?? 0) > 1.0,
    generate: (state) => {
      const growth = state.economy?.gdpGrowthAnnual ?? 0;
      const positive = growth > 0;
      return {
        type: 'economic_data',
        severity: 'minor',
        title: `GDP ${positive ? 'Beats' : 'Misses'} Expectations`,
        description: `ONS figures show the economy ${positive ? 'grew' : 'shrank'} by ${Math.abs(growth).toFixed(1)}% last quarter, ${positive ? 'exceeding' : 'falling short of'} City forecasts.`,
        immediateImpact: {
          approvalRating: positive ? 2 : -2,
          giltYieldBps: positive ? -5 : 5
        },
        requiresResponse: false
      };
    }
  },
  {
    type: 'economic_data',
    severity: 'minor',
    probability: 0.3,
    conditions: (state) => (state.economy?.inflationCPI ?? 0) > 3.5,
    generate: (state) => ({
      type: 'economic_data',
      severity: 'minor',
      title: 'Inflation Remains Sticky',
      description: `CPI inflation held at ${(state.economy?.inflationCPI ?? 0).toFixed(1)}% this month, disappointing hopes for a faster decline. Core inflation remains elevated.`,
      immediateImpact: {
        approvalRating: -1,
        giltYieldBps: 8
      },
      requiresResponse: false
    })
  },
  {
    type: 'political_crisis',
    severity: 'minor',
    probability: 0.15,
    conditions: (state) => state.political?.backbenchSentiment?.rebellionRisk === 'high' || (state.political?.publicApproval ?? 50) < 30,
    generate: (state) => ({
      type: 'political_crisis',
      severity: 'minor',
      title: 'Backbench Unrest',
      description: 'Labour backbenchers are openly criticising Treasury policy in WhatsApp groups and at PLP meetings. Loyalty is wearing thin.',
      immediateImpact: {
        politicalCapital: -5,
        pmTrust: -2
      },
      requiresResponse: false
    })
  },
  {
    type: 'policy_consequence',
    severity: 'minor',
    probability: 0.2,
    conditions: (state) => (state.services?.nhsQuality ?? 100) < 50,
    generate: (state) => ({
      type: 'policy_consequence',
      severity: 'minor',
      title: 'NHS Waiting Lists Hit Record',
      description: `NHS England reports waiting lists have reached a record high as service quality deteriorates. Opposition blame funding constraints.`,
      immediateImpact: {
        approvalRating: -2
      },
      requiresResponse: false
    })
  }
];

// ============================================================================
// EVENT GENERATION
// ============================================================================

let eventIdCounter = 0;

export function generateEvents(state: any): RandomEvent[] {
  const events: RandomEvent[] = [];

  for (const template of EVENT_TEMPLATES) {
    // Check conditions if any
    if (template.conditions && !template.conditions(state)) {
      continue;
    }

    // Roll for probability
    if (Math.random() < template.probability) {
      const event = template.generate(state);
      events.push({
        ...event,
        id: `event_${eventIdCounter++}_${Date.now()}`,
        month: state.currentMonth,
        date: new Date(state.currentDate)
      });
    }
  }

  return events;
}

// ============================================================================
// NEWSPAPER HEADLINE GENERATION
// ============================================================================

interface HeadlineTemplate {
  conditions: (state: any) => boolean;
  priority: number;  // Higher priority headlines shown first
  biasedVersions: Record<NewspaperBias, {
    headline: string;
    subheading: string;
  }>;
}

const HEADLINE_TEMPLATES: HeadlineTemplate[] = [
  // === RECESSION ===
  {
    conditions: (state) => (state.economy?.gdpGrowthAnnual ?? 0) < -0.5,
    priority: 100,
    biasedVersions: {
      'left': {
        headline: 'Austerity Bites: Britain Slides Into Recession',
        subheading: 'Devastating cuts to public services blamed as economy shrinks for second consecutive quarter'
      },
      'centre-left': {
        headline: 'UK Economy Contracts as Growth Falters',
        subheading: 'Technical recession confirmed as GDP falls amid weak consumer spending and business investment'
      },
      'centre-right': {
        headline: 'Recession Fears Deepen as Output Falls',
        subheading: 'Treasury faces questions over economic strategy as contraction exceeds forecasts'
      },
      'right': {
        headline: 'Tax Burden Crushing Growth, Economists Warn',
        subheading: 'Britain enters recession as highest tax take since war stifles enterprise and investment'
      },
      'populist-right': {
        headline: 'OUR JOBS AT RISK: Economy in Freefall',
        subheading: 'Hard-working families fear redundancies as Britain crashes into recession under tax-and-spend Chancellor'
      },
      'financial': {
        headline: 'UK Enters Technical Recession',
        subheading: 'GDP contracts 0.2% as weak productivity and tight fiscal policy dampen demand'
      }
    }
  },

  // === BOOM ===
  {
    conditions: (state) => (state.economy?.gdpGrowthAnnual ?? 0) > 2.5,
    priority: 95,
    biasedVersions: {
      'left': {
        headline: 'Economic Growth Returns Despite Cuts',
        subheading: 'Recovery driven by resilient consumers, but campaigners warn prosperity not reaching poorest'
      },
      'centre-left': {
        headline: 'UK Economy Rebounds With Strong Growth',
        subheading: 'Business investment and exports drive best quarterly performance in two years'
      },
      'centre-right': {
        headline: 'Chancellor Hails Return to Growth',
        subheading: 'Treasury claims vindication as economy expands at fastest rate since pandemic'
      },
      'right': {
        headline: 'Free Enterprise Delivers: Growth Surges',
        subheading: 'Pro-business policies bear fruit as Britain outpaces European rivals in economic race'
      },
      'populist-right': {
        headline: 'BOOM TIME: Jobs and Wages Soar',
        subheading: 'British workers celebrate as economy roars back to life with biggest expansion in years'
      },
      'financial': {
        headline: 'UK Growth Beats Forecasts',
        subheading: 'Stronger-than-expected expansion raises questions about inflation risks and BoE response'
      }
    }
  },

  // === INFLATION CRISIS ===
  {
    conditions: (state) => (state.economy?.inflationCPI ?? 0) > 7,
    priority: 90,
    biasedVersions: {
      'left': {
        headline: 'Cost of Living Catastrophe Deepens',
        subheading: 'Inflation soars past 7% as millions struggle to afford food and heating amid real wage collapse'
      },
      'centre-left': {
        headline: 'Inflation Surges Despite BoE Action',
        subheading: 'Price pressures show little sign of abating as consumers face worst squeeze in generation'
      },
      'centre-right': {
        headline: 'Inflation Battle Far From Won',
        subheading: 'Persistent price rises test Chancellor resolve on public sector pay and fiscal restraint'
      },
      'right': {
        headline: 'Government Spending Fuelling Inflation',
        subheading: 'Economists link price spiral to lack of fiscal discipline as debt burden grows'
      },
      'populist-right': {
        headline: 'FAMILIES CRUSHED BY PRICE NIGHTMARE',
        subheading: 'Everything costs more while Chancellor tinkers: Average household now £2,000 worse off'
      },
      'financial': {
        headline: 'Inflation Exceeds 7% as Core Pressures Build',
        subheading: 'Services inflation remains elevated, complicating Bank of England task and pressuring gilt markets'
      }
    }
  },

  // === UNEMPLOYMENT RISING ===
  {
    conditions: (state) => (state.economy?.unemploymentRate ?? 0) > 6,
    priority: 85,
    biasedVersions: {
      'left': {
        headline: 'Jobs Bloodbath as Unemployment Soars',
        subheading: 'Treasury austerity policies destroying livelihoods as redundancies reach crisis levels'
      },
      'centre-left': {
        headline: 'Unemployment Climbs Above 6%',
        subheading: 'Labour market weakening rapidly as businesses cut costs amid economic uncertainty'
      },
      'centre-right': {
        headline: 'Jobs Market Cools as Economy Slows',
        subheading: 'Rising unemployment tests Chancellor commitment to getting Britain back to work'
      },
      'right': {
        headline: 'Regulatory Burden Costing Jobs',
        subheading: 'Business groups blame excessive employment rules and taxes for rising unemployment'
      },
      'populist-right': {
        headline: 'JOBS AXED: Thousands Face Dole Queue',
        subheading: 'Hard-working Brits losing jobs while benefits bill balloons. Where is the plan?'
      },
      'financial': {
        headline: 'UK Unemployment Rate Rises to 6%',
        subheading: 'Labour market slack emerging as cyclical downturn offsets structural tightness'
      }
    }
  },

  // === DEBT CRISIS ===
  {
    conditions: (state) => (state.fiscal?.debtToGdpPercent ?? 0) > 105,
    priority: 80,
    biasedVersions: {
      'left': {
        headline: 'Debt Fears Used to Justify More Cuts',
        subheading: 'Treasury warned against repeating austerity mistakes as economists dispute crisis narrative'
      },
      'centre-left': {
        headline: 'National Debt Burden Causes Concern',
        subheading: 'Debt now exceeds 105% of GDP as Chancellor faces difficult choices on fiscal path'
      },
      'centre-right': {
        headline: 'Public Finances on Unsustainable Path',
        subheading: 'Debt spiral threatens UK credibility as interest payments consume record share of tax revenue'
      },
      'right': {
        headline: 'Debt Time Bomb Threatens Next Generation',
        subheading: 'Profligate spending mortgaging our children future as national debt explodes past 105% of GDP'
      },
      'populist-right': {
        headline: 'MAXED OUT: Britain Credit Card Bill Hits Record',
        subheading: 'Every family now owes £80,000 share of national debt mountain. Time to tighten belt.'
      },
      'financial': {
        headline: 'UK Debt-to-GDP Breaches 105%',
        subheading: 'Fiscal sustainability concerns mount as ageing costs and weak growth outlook pressure public finances'
      }
    }
  },

  // === DEFICIT CRISIS ===
  {
    conditions: (state) => (state.fiscal?.deficitPctGDP ?? 0) > 6,
    priority: 75,
    biasedVersions: {
      'left': {
        headline: 'Deficit Obsession Risks Economic Recovery',
        subheading: 'Progressives urge Chancellor to invest through downturn rather than repeat austerity errors'
      },
      'centre-left': {
        headline: 'Budget Deficit Swells Beyond Forecasts',
        subheading: 'Borrowing exceeds 6% of GDP as tax revenues disappoint and spending pressures mount'
      },
      'centre-right': {
        headline: 'Fiscal Rules Under Threat',
        subheading: 'Chancellor faces impossible choices as deficit balloons to levels not seen since financial crisis'
      },
      'right': {
        headline: 'Out of Control: Deficit Explodes',
        subheading: 'Government borrowing £1 in every £16 spent as fiscal discipline collapses'
      },
      'populist-right': {
        headline: 'SPENDING SPREE Must Stop Now',
        subheading: 'Chancellor throwing away your money: Britain borrowing £10 billion a month'
      },
      'financial': {
        headline: 'UK Budget Deficit Widens to 6% of GDP',
        subheading: 'Market concerns grow as fiscal metrics deteriorate, potentially triggering credit rating review'
      }
    }
  },

  // === NHS CRISIS ===
  {
    conditions: (state) => (state.services?.nhsQuality ?? 100) < 55,
    priority: 70,
    biasedVersions: {
      'left': {
        headline: 'NHS on Knees as Funding Crisis Deepens',
        subheading: 'Health service quality collapses to record low as Chancellor fails to reverse years of underfunding'
      },
      'centre-left': {
        headline: 'NHS Performance Hits New Low',
        subheading: 'Patients facing longest waits on record as winter pressures overwhelm chronically underfunded system'
      },
      'centre-right': {
        headline: 'NHS Reform Urgently Needed',
        subheading: 'Money alone will not fix health service, warn ministers, as quality metrics plummet'
      },
      'right': {
        headline: 'NHS Money Pit Demands Radical Overhaul',
        subheading: 'Despite record funding, health service failing patients. Time to embrace insurance model?'
      },
      'populist-right': {
        headline: 'OUR NHS: Broken Promise',
        subheading: 'Millions waiting months for operations while managers cream off your taxes. Sort it out!'
      },
      'financial': {
        headline: 'NHS Productivity Crisis Deepens',
        subheading: 'Health service output falls despite 40% real-terms spending increase since 2010'
      }
    }
  },

  // === GILT MARKET STRESS ===
  {
    conditions: (state) => (state.markets?.giltYield10yr ?? 0) > 5.5,
    priority: 85,
    biasedVersions: {
      'left': {
        headline: 'Market Hysteria Threatens Public Services',
        subheading: 'Bond traders spooked by government policies as borrowing costs soar'
      },
      'centre-left': {
        headline: 'Borrowing Costs Surge on Fiscal Fears',
        subheading: '10-year gilt yields breach 5.5% as investors demand higher returns to hold UK debt'
      },
      'centre-right': {
        headline: 'Market Confidence Ebbing',
        subheading: 'Gilt market turmoil forces Chancellor to confront uncomfortable fiscal reality'
      },
      'right': {
        headline: 'Bond Market Revolt Over Spending',
        subheading: 'Investors losing faith in UK as profligate Treasury policies send borrowing costs soaring'
      },
      'populist-right': {
        headline: 'HOMEOWNERS TO PAY: Mortgage Misery Looms',
        subheading: 'City fat cats punish families as gilt crash threatens to send mortgage rates through roof'
      },
      'financial': {
        headline: 'Gilt Yields Spike Above 5.5%',
        subheading: 'UK sovereign risk premium widens sharply as fiscal credibility concerns trigger broad-based selling'
      }
    }
  },

  // === STRONG PUBLIC APPROVAL ===
  {
    conditions: (state) => (state.political?.publicApproval ?? 50) > 55,
    priority: 50,
    biasedVersions: {
      'left': {
        headline: 'Honeymoon Period Continues Despite Concerns',
        subheading: 'Chancellor popularity high but critics warn policies will hurt vulnerable in time'
      },
      'centre-left': {
        headline: 'Public Backs Chancellor Economic Plan',
        subheading: 'Approval ratings remain solid as voters give Treasury time to deliver on growth promises'
      },
      'centre-right': {
        headline: 'Chancellor Riding High in Polls',
        subheading: 'Steady hand on economy earns public trust as approval exceeds 55%'
      },
      'right': {
        headline: 'Low-Tax Agenda Wins Public Support',
        subheading: 'Chancellor pro-growth policies resonating with voters tired of big government'
      },
      'populist-right': {
        headline: 'PEOPLE SAY: Chancellor Doing Brilliant',
        subheading: 'Hard-working families finally have someone on their side who gets it'
      },
      'financial': {
        headline: 'Chancellor Approval Rating Holds Above 55%',
        subheading: 'Political capital cushion provides window for potentially unpopular but necessary reforms'
      }
    }
  },

  // === WEAK PUBLIC APPROVAL ===
  {
    conditions: (state) => (state.political?.publicApproval ?? 50) < 35,
    priority: 65,
    biasedVersions: {
      'left': {
        headline: 'Public Turns on Chancellor Over Failing Policies',
        subheading: 'Approval collapses as reality of cuts and tax rises hits household budgets'
      },
      'centre-left': {
        headline: 'Chancellor Approval Falls Below 35%',
        subheading: 'Voters losing confidence in Treasury stewardship as economic pain mounts'
      },
      'centre-right': {
        headline: 'Chancellor Faces Credibility Crisis',
        subheading: 'Plummeting approval leaves little political capital for difficult but necessary reforms'
      },
      'right': {
        headline: 'Tax-and-Spend Chancellor Loses Public',
        subheading: 'Broken promises on taxes see approval crater as voters demand change'
      },
      'populist-right': {
        headline: 'OUT OF TOUCH: Nation Turns on Chancellor',
        subheading: 'Ordinary people have had enough. Approval rating in freefall. Time for new face?'
      },
      'financial': {
        headline: 'Chancellor Approval Slumps Below 35%',
        subheading: 'Political weakness may constrain fiscal options and embolden backbench critics'
      }
    }
  },

  // === DEFAULT ROUTINE COVERAGE ===
  {
    conditions: (state) => true,  // Always matches
    priority: 1,
    biasedVersions: {
      'left': {
        headline: 'Wealth Gap Continues to Widen',
        subheading: 'Latest figures show richest pulling away from rest as inequality remains entrenched'
      },
      'centre-left': {
        headline: 'Mixed Economic Picture Emerges',
        subheading: 'Some indicators improving while others flash warning signs as Treasury navigates choppy waters'
      },
      'centre-right': {
        headline: 'Chancellor Stays Course on Fiscal Plan',
        subheading: 'Treasury insists long-term strategy on track despite short-term headwinds'
      },
      'right': {
        headline: 'Tax Burden Still Too High',
        subheading: 'Business leaders continue to press Chancellor for growth-boosting tax cuts'
      },
      'populist-right': {
        headline: 'ARE YOU Better Off? We Ask Families',
        subheading: 'Real people tell us whether Chancellor policies helping or hurting their finances'
      },
      'financial': {
        headline: 'Markets Digest Latest UK Data',
        subheading: 'Investors weigh economic indicators and fiscal trajectory in cautious trading'
      }
    }
  }
];

const GENERIC_HEADLINE_POOL: Array<{ headline: string; subheading: string }> = [
  { headline: 'Treasury Faces Tough Autumn Trade-Offs', subheading: 'Ministers weigh tax, spending, and borrowing choices as economic indicators send mixed signals.' },
  { headline: 'Regional Growth Gap Back in Focus', subheading: 'Business groups call for targeted transport, skills, and planning reform to unlock local investment.' },
  { headline: 'Mortgage Pressure Keeps Households Cautious', subheading: 'Higher refinancing costs continue to squeeze disposable income despite steadier inflation readings.' },
  { headline: 'NHS Managers Warn on Winter Capacity', subheading: 'Trust leaders say staffing and social care bottlenecks remain critical ahead of colder months.' },
  { headline: 'Treasury Signals “No Easy Options” on Fiscal Room', subheading: 'Officials point to fragile headroom and persistent demand pressures in key public services.' },
  { headline: 'Retail Footfall Softens Outside Major Cities', subheading: 'High streets report subdued demand as consumers prioritise essentials and utility bills.' },
  { headline: 'Business Investment Plans Hold, but Confidence Patchy', subheading: 'Firms cite policy uncertainty and financing costs as barriers to larger capital commitments.' },
  { headline: 'Public Sector Pay Talks Enter Delicate Phase', subheading: 'Departments seek settlements that avoid disruption while limiting long-term fiscal spillovers.' },
  { headline: 'Infrastructure Pipeline Under Review', subheading: 'Treasury and departments reassess sequencing to protect delivery and value for money.' },
  { headline: 'Exporters Seek Sterling Stability', subheading: 'Manufacturers say predictable currency conditions matter as much as headline tax rates.' },
  { headline: 'Treasury Urged to Clarify Medium-Term Tax Path', subheading: 'Employers and households call for fewer policy reversals and clearer multi-year signalling.' },
  { headline: 'Court Delays and Prison Pressures Raise Justice Alarm', subheading: 'Sector leaders warn prolonged backlogs are creating knock-on costs across policing and probation.' },
  { headline: 'Consumer Confidence Edges Higher, Spending Still Tentative', subheading: 'Sentiment improves modestly but households remain wary of future bills and borrowing costs.' },
  { headline: 'Fiscal Debate Shifts from Size to Composition', subheading: 'Economists argue the quality of spending changes now matters more than aggregate totals alone.' },
  { headline: 'Skills Shortages Persist in Key Sectors', subheading: 'Employers report recruitment bottlenecks in health, logistics, construction, and digital services.' },
  { headline: 'Energy Policy Choices Reopen Cost-of-Living Debate', subheading: 'Analysts say household bill trajectories depend on both global prices and domestic tax settings.' },
  { headline: 'City Traders Watch OBR Signals Closely', subheading: 'Markets focus on credibility, implementation detail, and delivery risk rather than headline rhetoric.' },
  { headline: 'Small Firms Ask for Simpler Tax Administration', subheading: 'Owners say compliance complexity is becoming a larger burden than statutory rates alone.' },
  { headline: 'Local Councils Warn of Service Strain', subheading: 'Authorities report rising demand in social care, temporary accommodation, and safeguarding.' },
  { headline: 'Treasury Briefing Points to “Narrow Landing Zone”', subheading: 'Officials describe a constrained path balancing growth ambitions with fiscal discipline.' },
  { headline: 'Rail Reliability and Bus Provision Become Budget Battleground', subheading: 'Regional leaders push for stable multi-year settlements to improve commuter confidence.' },
  { headline: 'Debt Interest Bills Keep Pressure on Spending Plans', subheading: 'Even modest market moves are reshaping departmental assumptions for the year ahead.' },
  { headline: 'BoE-Treasury Coordination Under Scrutiny', subheading: 'Commentators debate how fiscal and monetary settings interact in a low-growth environment.' },
  { headline: 'Policy Fatigue Sets In as Households Seek Predictability', subheading: 'Voters tell pollsters they want fewer surprises and clearer long-term direction from ministers.' },
];

// ============================================================================
// OPPOSITION QUOTES GENERATION
// ============================================================================

interface OppositionQuoteTemplate {
  conditions: (state: any) => boolean;
  quotes: {
    guardian: string[];
    telegraph: string[];
    times: string[];
    ft: string[];
    sun: string[];
    mail: string[];
  };
}

const OPPOSITION_QUOTE_TEMPLATES: OppositionQuoteTemplate[] = [
  {
    conditions: (state) => (state.economy?.gdpGrowthAnnual ?? 0) < 0,
    quotes: {
      guardian: [
        '"This recession is the direct result of misguided Treasury policies. Working people are paying the price for economic incompetence."',
        '"You cannot tax your way to prosperity. This Chancellor has inflicted a recession on Britain through sheer mismanagement."',
        '"Families across the country are suffering while this government persists with failed economic policies that have never worked."'
      ],
      telegraph: [
        '"The Chancellor has raised taxes to their highest level in 70 years and now wonders why the economy is shrinking. This is basic economics."',
        '"Businesses are being strangled by the tax burden. No wonder investment has collapsed and we are in recession."',
        '"The Shadow Chancellor argues for even more spending when we can least afford it. At least the Treasury understands we must live within our means."'
      ],
      times: [
        '"This recession was both predictable and avoidable. The Chancellor needs to urgently reconsider the fiscal stance before more jobs are lost."',
        '"The government strategy on growth has clearly failed. Parliament deserves a revised economic plan that might actually deliver results."',
        '"We warned months ago that these policies would lead to contraction. The Chancellor owes the country an explanation."'
      ],
      ft: [
        '"The fiscal consolidation path has proven too aggressive for current economic conditions. A more gradual approach respects both growth and sustainability."',
        '"Markets are questioning whether this recession could have been prevented with more careful macroeconomic management."',
        '"The Opposition proposes slightly looser fiscal policy, though credible consolidation will be necessary whoever is in power."'
      ],
      sun: [
        '"Families are losing their jobs and this lot have no clue how to help. Absolutely hopeless."',
        '"Hard-working people getting made redundant while politicians mess about. They need to sort this out NOW."',
        '"The Chancellor has lost control. Ordinary people suffering while he shuffles papers in Whitehall."'
      ],
      mail: [
        '"This recession proves the government has lost its way. Whether tax cuts or spending discipline, something must change urgently."',
        '"Middle England is bearing the brunt of this downturn. The Chancellor seems unable to grasp what real families are facing."',
        '"Business confidence has evaporated. The Opposition may not have all the answers but this government clearly has none."'
      ]
    }
  },
  {
    conditions: (state) => (state.economy?.inflationCPI ?? 0) > 6,
    quotes: {
      guardian: [
        '"Working people cannot afford food and heating while this government does nothing. The cost-of-living crisis demands urgent intervention."',
        '"Inflation is hammering the poorest hardest. We need a windfall tax on energy giants to fund real support for families."',
        '"Corporate profiteering is fuelling this inflation crisis while the Chancellor protects the wealthy. It is obscene."'
      ],
      telegraph: [
        '"Government spending is still too high, keeping inflation embedded. The Chancellor must cut deeper to give the Bank of England a chance."',
        '"You cannot tax and spend your way out of inflation. The Opposition wants to make things worse with more borrowing."',
        '"The Shadow Chancellor proposals would add fuel to the inflationary fire. Thank goodness they are not in charge."'
      ],
      times: [
        '"Inflation at this level is corrosive to living standards and economic stability. The Treasury policy response has been inadequate."',
        '"The government needs a comprehensive anti-inflation strategy beyond relying entirely on Bank of England interest rates."',
        '"This inflation crisis reflects global factors but also domestic policy failures that must be addressed."'
      ],
      ft: [
        '"Persistent inflation suggests demand pressures that fiscal policy could help cool. The Chancellor stance appears too accommodating."',
        '"UK inflation persistently above peers raises questions about domestic policy mix and labour market tightness."',
        '"The Opposition calls for targeted support, but blanket interventions risk entrenching inflation expectations further."'
      ],
      sun: [
        '"Everything costs more and wages staying the same. How are families supposed to cope? Chancellor is useless."',
        '"My shopping bill has DOUBLED and politicians just talk. Do something to help ordinary people!"',
        '"Inflation destroying living standards while government twiddles thumbs. We demand action now."'
      ],
      mail: [
        '"Pensioners and savers are being robbed by this inflation. The Chancellor has failed to protect those who did the right thing."',
        '"Middle-class families seeing their living standards destroyed. This government has lost control of the economy."',
        '"The Opposition wants to spend even more, which would make inflation worse. But this Chancellor has no answers either."'
      ]
    }
  },
  {
    conditions: (state) => (state.fiscal?.deficitPctGDP ?? 0) > 5,
    quotes: {
      guardian: [
        '"The government obsesses over deficits while public services crumble. Investment is not the same as waste."',
        '"This deficit is the result of failed economic management. We would close loopholes and make the rich pay their share."',
        '"Austerity failed before and is failing again. You cannot cut your way to fiscal sustainability."'
      ],
      telegraph: [
        '"Britain is borrowing £10 billion a month and the Chancellor acts like there is no problem. This is fiscal incontinence."',
        '"Our children will pay for this borrowing binge. The Shadow Chancellor would make things far worse with more spending."',
        '"At least this Chancellor recognises the deficit problem, unlike the Opposition who want to spend money we do not have."'
      ],
      times: [
        '"The deficit trajectory is clearly unsustainable. The Chancellor needs a credible medium-term plan to restore fiscal balance."',
        '"Both parties are avoiding the difficult truth that either taxes must rise or spending must fall significantly."',
        '"Markets are beginning to lose patience with UK fiscal policy. The deficit cannot remain at these levels indefinitely."'
      ],
      ft: [
        '"Deficit above 5% of GDP in mid-cycle suggests structural issues requiring multi-year consolidation programme."',
        '"The Shadow Chancellor criticises austerity but has not explained how to finance spending commitments sustainably."',
        '"UK fiscal position weaker than most G7 peers, limiting ability to respond to future shocks."'
      ],
      sun: [
        '"Government throwing away our money while people struggle. Cut the waste and help families instead!"',
        '"Billion-pound deficits while people cannot afford to heat their homes. Politicians living in different world."',
        '"Stop the spending madness! Ordinary people have to balance budgets, why can government not do same?"'
      ],
      mail: [
        '"This deficit is mortgaging our children future. The Chancellor must grip public spending before it is too late."',
        '"While families tighten belts, government borrows recklessly. Time for fiscal responsibility to return to Treasury."',
        '"The Opposition would send borrowing into the stratosphere. But this Chancellor has not done enough to control spending either."'
      ]
    }
  },
  {
    conditions: (state) => (state.services?.nhsQuality ?? 100) < 60,
    quotes: {
      guardian: [
        '"The NHS is on its knees because this Chancellor refuses to invest properly. Patients are dying on trolleys in corridors. This is a national scandal."',
        '"The government promised to fix the NHS but has delivered nothing. We need proper funding for our health service immediately."',
        '"The waiting list catastrophe is the result of Treasury penny-pinching. The Chancellor must act before more lives are lost."'
      ],
      telegraph: [
        '"Pumping more money into the NHS has not worked. We need fundamental reform, not just higher spending."',
        '"NHS productivity has collapsed despite record funding. The system needs competition and management reform."',
        '"The Opposition wants to throw billions more at a failing model. That is not a plan, it is desperation."'
      ],
      times: [
        '"NHS performance is unacceptable regardless of political affiliation. The service needs both money and reform urgently."',
        '"The government has increased NHS funding substantially, yet outcomes worsen. Something is fundamentally wrong."',
        '"Patients deserve better than endless political arguments. Both parties must work together on NHS modernisation."'
      ],
      ft: [
        '"UK health spending as share of GDP now matches European average, yet outcomes lag. Systemic issues beyond just funding."',
        '"Demographic pressures and rising chronic disease burden require NHS funding model reform regardless of political persuasion."',
        '"The Opposition promises more spending but has not explained productivity improvements that would justify it."'
      ],
      sun: [
        '"People waiting months in agony while NHS crumbles. This is Britain, not a third-world country. Shameful!"',
        '"My mum waited 18 months for her hip operation. Politicians should try living like this before lecturing us."',
        '"NHS falling apart while government fiddles. Sort out our health service or resign!"'
      ],
      mail: [
        '"Middle-class families who paid into the system all their lives now cannot get GP appointments. This is betrayal."',
        '"The NHS has become a money pit delivering third-rate service. Time for fundamental reform or insurance option."',
        '"The Opposition would waste more billions on unreformed NHS. But this government record is disgraceful too."'
      ]
    }
  },
  {
    conditions: (state) => (state.political?.publicApproval ?? 50) < 35,
    quotes: {
      guardian: [
        '"The public has seen through this Chancellor economic illiteracy. His approval collapse is richly deserved."',
        '"Working people across Britain know this government does not care about them. Change cannot come soon enough."',
        '"These catastrophic approval ratings show the country is crying out for change. The Chancellor must go."'
      ],
      telegraph: [
        '"The Chancellor has lost public confidence through broken promises on taxes. He must regain credibility fast or step aside."',
        '"These dire numbers show the government has lost the country. Britain needs fresh leadership with a credible economic plan."',
        '"Thankfully, the Opposition is even less trusted on the economy than this struggling Chancellor."'
      ],
      times: [
        '"Approval ratings this low leave the Chancellor with almost no authority. The Prime Minister must consider changes."',
        '"The government has lost the confidence of the country. Whether new Chancellor or new policies, something must change."',
        '"Governing is impossible with approval this weak. The Treasury needs to regain public trust urgently."'
      ],
      ft: [
        '"Political weakness constrains Chancellor fiscal options at critical juncture. Credibility deficit compounds fiscal one."',
        '"Market participants watching political instability in UK with concern. Policy consistency becoming questionable."',
        '"The Opposition leads polls by 15 points, suggesting appetite for change regardless of economic policy merits."'
      ],
      sun: [
        '"Everyone hates the Chancellor. Time for him to go before he does more damage to ordinary families."',
        '"Out of touch, out of ideas, and now out of time. People have had enough of this shambles."',
        '"WORST CHANCELLOR EVER? Readers say yes in our poll. Do you agree?"'
      ],
      mail: [
        '"The Chancellor has lost Middle England through broken tax promises and economic incompetence. The government needs a fresh start."',
        '"These approval numbers spell electoral disaster. The Prime Minister must act decisively to restore confidence."',
        '"Neither the Chancellor nor the Shadow Chancellor inspires confidence. Britain deserves better than this."'
      ]
    }
  },
  // === DEFAULT/GENERAL QUOTES ===
  {
    conditions: (state) => true,
    quotes: {
      guardian: [
        '"The fundamental problem is the government refuses to ask the wealthiest to contribute their fair share while public services decay."',
        '"Working families need investment in services, not lectures about living within our means from those who have never struggled."',
        '"This is the same failed playbook: tax everyone into oblivion while public services still decay."'
      ],
      telegraph: [
        '"The Chancellor knows the truth: the state is too large, the tax burden too heavy, and spending must be controlled."',
        '"At least this government understands basic economics, unlike the Opposition who think money grows on trees."',
        '"We need lower taxes and sensible spending restraint. The Shadow Chancellor offers neither."'
      ],
      times: [
        '"The Chancellor faces an unenviable task. Both fiscal consolidation and growth are necessary, neither is easy."',
        '"The Opposition makes fair points about investment, but their sums do not add up any better than the government."',
        '"Britain needs serious politicians making hard choices, not empty promises from either side."'
      ],
      ft: [
        '"UK fiscal policy faces trilemma: ageing population, productivity stagnation, and constrained fiscal space. No easy answers exist."',
        '"The Shadow Chancellor proposes higher investment spending but has not articulated credible revenue measures to finance it."',
        '"Markets want sustainable fiscal trajectory. Exact tax and spending composition matters less than overall credibility."'
      ],
      sun: [
        '"Politicians talking rubbish while ordinary people struggle. They are all as bad as each other."',
        '"Why should we trust any of them? They promised better and things got worse. Simple as that."',
        '"When will someone in Westminster actually stand up for hard-working families for once?"'
      ],
      mail: [
        '"Middle-class taxpayers are being bled dry to fund government waste. Enough is enough."',
        '"The Chancellor talks about fiscal discipline but taxes have never been higher. Words are cheap."',
        '"Both parties taking Middle England for granted. Time for politicians to listen to mainstream voters."'
      ]
    }
  }
];

function generateOppositionQuote(state: any, newspaper: NewspaperSource): OppositionQuote {
  // Find the first matching template
  const template = OPPOSITION_QUOTE_TEMPLATES.find(t => t.conditions(state)) || OPPOSITION_QUOTE_TEMPLATES[OPPOSITION_QUOTE_TEMPLATES.length - 1];

  // Get quotes for this newspaper
  const newspaperKey = newspaper.name.toLowerCase().replace('the ', '').replace('daily ', '') as keyof typeof template.quotes;
  const quotes = template.quotes[newspaperKey] || template.quotes.guardian;

  const recentCorpus = buildRecentNewsCorpus(state);

  // Prefer quotes that have not appeared recently.
  const quote = pickLeastRepeated(quotes, recentCorpus);

  // Generate appropriate speaker (opposition to a Labour government = Conservative, LibDem, Reform)
  const speakers = [
    { speaker: 'Jeremy Hunt MP, Shadow Chancellor', party: 'Conservative' as const },
    { speaker: 'Mel Stride MP, Shadow Work and Pensions Secretary', party: 'Conservative' as const },
    { speaker: 'Ed Davey MP, Liberal Democrat Leader', party: 'LibDem' as const },
    { speaker: 'Sarah Olney MP, Lib Dem Treasury Spokesperson', party: 'LibDem' as const },
    { speaker: 'Stephen Flynn MP, SNP Westminster Leader', party: 'SNP' as const }
  ];

  const speaker = speakers[Math.floor(Math.random() * speakers.length)];

  return {
    ...speaker,
    quote
  };
}

// ============================================================================
// ARTICLE PARAGRAPH GENERATION
// ============================================================================

/**
 * Generates the lead story paragraphs, focused on the significant event
 */
function generateLeadStory(state: any, newspaper: NewspaperSource, event: RandomEvent): string[] {
  const paragraphs: string[] = [];

  // Event-specific lead paragraphs based on type and severity
  switch (event.type) {
    case 'natural_disaster':
      if (event.title === 'Severe Flooding') {
        paragraphs.push(`Unprecedented rainfall has caused catastrophic flooding across northern England. Thousands of residents have been evacuated from their homes, with emergency services conducting rescue operations across multiple counties. The Environment Agency warned that water levels in some areas remain at dangerous levels.`);
        paragraphs.push(`Communities from Manchester to Leeds have been devastated by the worst flooding in a generation. Hospitals and care homes have been evacuated, transport links severed, and critical infrastructure including power stations and water treatment plants damaged. Preliminary estimates suggest insured losses could exceed £3bn.`);
        paragraphs.push(`${newspaper.bias === 'left' ? 'Criticism has mounted over the Environment Agency\'s funding cuts, with campaigners arguing that climate adaptation spending has been neglected. Local councils warned last year that flood defences were deteriorating.' : 'Questions have been raised about the adequacy of drainage systems and flood defence maintenance. Property owners in affected areas complained they had received little warning of the severity of the risks.'}  The government has declared the affected regions disaster areas.`);
        paragraphs.push(`The Chancellor said the government would "provide whatever support is necessary" to help communities recover. Parliament is expected to recall early to discuss emergency relief measures. Reconstruction is expected to take years, with social services and housing support likely to remain strained for months.`);
      }
      break;

    case 'international_crisis':
      if (event.title === 'Oil Price Shock') {
        paragraphs.push(`Geopolitical tensions in the Middle East have triggered a sharp spike in global oil prices. Crude surged 40% overnight following military escalation, pushing wholesale petrol and diesel prices to their highest levels in two years.`);
        paragraphs.push(`Motorists faced chaos at filling stations as drivers rushed to top up tanks before prices rose further. Industry groups warned that transport costs would soar, raising the spectre of HGV shortages and higher food prices. Airlines issued guidance that ticket prices would likely need to increase.`);
        paragraphs.push(`${newspaper.bias === 'left' ? 'Consumer groups warned that lower-income households would bear the brunt of rising energy bills.' : 'The government was criticised for having no strategic petroleum reserves to buffer price volatility.'} Economists flagged the risk of stagflation – a deadly combination of stalled growth and rising inflation.`);
      } else if (event.title === 'Global Financial Contagion') {
        paragraphs.push(`A major European bank collapsed today, triggering the largest banking crisis since 2008. The bankruptcy sent shockwaves through global financial markets, wiping out shareholders and triggering emergency central bank operations.`);
        paragraphs.push(`UK banks and pension funds held significant exposure to the failed institution. Markets in free fall, with FTSE 100 stocks down 12% at one point and banking stocks particularly hard hit. Credit default swap spreads spiked, reflecting fears of systemic contagion across the sector.`);
        paragraphs.push(`The Bank of England announced emergency liquidity measures and was in constant contact with international regulators. The Treasury was preparing contingency plans should UK institutions require emergency support. One leading economist warned "We may be looking at another Great Financial Crisis scenario."'`);
      }
      break;

    case 'market_panic':
      if (event.title === 'Gilt Market Crisis') {
        paragraphs.push(`Bond markets have turned decisively against the UK, triggering the worst gilt sell-off in decades. Yields surged across the curve as investors sold gilts in panic selling, triggering mechanical selling from pension funds and insurance companies holding long-duration portfolios.`);
        paragraphs.push(`Ten-year gilt yields spiked above 5.5%, raising immediate concerns about mortgage costs and government borrowing. The pound plunged to its worst level in months. The IMF issued a rare public warning about UK fiscal sustainability, raising questions about the government's credibility with bond markets.`);
        paragraphs.push(`Credit rating agencies put the UK on negative outlook, warning further deterioration could trigger a ratings downgrade. Fund managers reported that UK gilts were no longer viewed as safe assets, with foreign central banks selling positions. The crisis threatened the government's ability to finance the deficit at reasonable cost.`);
      } else if (event.title === 'Sterling Crisis') {
        paragraphs.push(`The pound has collapsed to its weakest level against the dollar in 40 years, as currency traders lost confidence in UK economic management. Sterling fell 6% in a single session, raising concerns about imported inflation.`);
        paragraphs.push(`The Bank of England was criticised for losing control of inflation expectations. Emerging market central banks are reportedly divesting from pound-denominated assets. Foreign investors signalled they were demanding a significant risk premium to hold UK-exposed assets.`);
        paragraphs.push(`Business groups warned that the weak pound, whilst helping exporters, would raise costs for imported goods and commodities. Energy prices and food inflation were expected to spike further as sterling buying power weak abroad.`);
      }
      break;

    case 'scandal':
      if (event.title === 'Tax Affairs Scandal') {
        paragraphs.push(`A senior government minister has been ensnared in a major tax avoidance scandal, with investigations revealing complex offshore structures minimising personal tax bills. The revelation came just weeks after the Chancellor demanded "everyone must pay their fair share."'`);
        paragraphs.push(`Opposition parties have called for the minister's resignation. Internal government sources suggested the matter was causing acute embarrassment. The revelation threatens to undermine the government's credibility on tax fairness at a politically sensitive moment.`);
        paragraphs.push(`This is the third such scandal in as many years, prompting questions about the government's ethical standards. ${newspaper.bias === 'left' ? 'Anti-corruption groups called for immediate reform of parliamentary standards.' : 'Supporters argued private financial affairs should not be scrutinised, but media maintained intense focus.'}`);
      }
      break;

    default:
      // Fallback for unspecified events
      paragraphs.push(event.description);
      if (event.severity === 'crisis') {
        paragraphs.push(`Emergency measures are being considered, with the government convening crisis meetings. Senior civil servants are working around the clock to assess the full magnitude of the situation.`);
      }
  }

  return paragraphs;
}

/**
 * Generates secondary story paragraphs providing economic/political context
 */
function generateSecondaryStory(state: any, newspaper: NewspaperSource, event: RandomEvent): string[] {
  const paragraphs: string[] = [];

  const gdpGrowth = state.economy?.gdpGrowthAnnual ?? 0;
  const inflation = state.economy?.inflationCPI ?? 2;
  const deficit = state.fiscal?.deficitPctGDP ?? 3;
  const debt = state.fiscal?.debtToGdpPercent ?? 100;
  const emergencyProgrammes: EmergencyProgramme[] = state.emergencyProgrammes?.active || [];
  const recentCorpus = buildRecentNewsCorpus(state);

  // Opening paragraph setting context
  let contextParaText = '';

  if (event.type === 'natural_disaster') {
    if (gdpGrowth > 0.5) {
      contextParaText = `The flooding strikes at a time when the economy is showing signs of recovery, with GDP growth at ${gdpGrowth.toFixed(1)}%. The disaster will likely cause a temporary setback, but strong underlying growth provides headroom for emergency investment in reconstruction.`;
    } else if (gdpGrowth < -0.1) {
      contextParaText = `The crisis comes as the economy is already contracting at ${Math.abs(gdpGrowth).toFixed(1)}%, adding to pressure on the government's finances. Emergency relief spending will further strain a stretched budget during a weak period for tax revenues.`;
    } else {
      contextParaText = `The flooding presents a fiscal challenge during a period of modest growth at ${gdpGrowth.toFixed(1)}%. The government must decide how to balance emergency relief against its wider fiscal objectives.`;
    }
  } else if (event.type === 'international_crisis' || event.type === 'market_panic') {
    if (inflation > 5) {
      contextParaText = `The crisis arrives as inflation remains stubbornly elevated at ${inflation.toFixed(1)}%, limiting the Bank of England's room to cut rates in response. Policy makers face a dilemma between supporting growth and keeping inflation under control.`;
    } else if (inflation > 3) {
      contextParaText = `Inflation at ${inflation.toFixed(1)}% complicates the policy response, as central banks are reluctant to ease whilst price pressures persist.`;
    } else {
      contextParaText = `With inflation subdued at ${inflation.toFixed(1)}%, there may be room for monetary or fiscal stimulus to offset the economic impact.`;
    }
  }

  if (contextParaText) {
    paragraphs.push(contextParaText);
  }

  // Emergency response paragraph (if this is a response-requiring event)
  if (event.type === 'natural_disaster' && emergencyProgrammes.length > 0) {
    const recentProgrammes = emergencyProgrammes.filter(p => p.eventId === event.id);
    if (recentProgrammes.length > 0) {
      const prog = recentProgrammes[0];
      paragraphs.push(`The Chancellor announced a £${prog.immediateCost_bn.toFixed(1)}bn emergency relief package following the disaster. ${prog.rebuildingMonths ? `Infrastructure rebuilding is expected to cost approximately £${prog.rebuildingCostPerMonth_bn.toFixed(1)}bn per month over the next ${prog.rebuildingMonths} months.` : ''} ${newspaper.bias === 'left' ? 'Critics argued the package was insufficient given the scale of the disaster.' : 'The scale of the government response drew mixed reactions from business groups.'}`);
    }
  }

  // Fiscal implications
  if (deficit > 5) {
    const gdpNominal = state.economy?.gdpNominal ?? 2500;
    const totalEmergencySpending = emergencyProgrammes.reduce((sum, p) => sum + p.rebuildingCostPerMonth_bn, 0);
    const emergencyContext = totalEmergencySpending > 0 ? ` Emergency relief spending is adding £${totalEmergencySpending.toFixed(1)}bn per month to the deficit.` : '';
    paragraphs.push(`The fiscal position adds urgency to the crisis response. The budget deficit has reached ${deficit.toFixed(1)}% of GDP, with the Treasury borrowing £${(deficit * gdpNominal / 100 / 12).toFixed(1)}bn per month. ${event.type === 'natural_disaster' ? 'Emergency relief spending will increase the deficit further.' : 'The government has limited fiscal headroom to respond to any economic shock.'}${emergencyContext} Public debt stands at ${debt.toFixed(0)}% of national income.`);
  }

  // Approval and political dimension
  if (state.political?.publicApproval !== undefined) {
    const approval = state.political.publicApproval ?? 40;
    if (approval < 40) {
      const sentiment = approval < 30 ? 'collapsed' : 'fallen';
      paragraphs.push(`The Chancellor's approval rating has ${sentiment} to ${approval.toFixed(0)}%, complicating efforts to build public support for whatever measure the government proposes. ${event.type === 'natural_disaster' ? 'However, disasters often generate public sympathy for government action.' : 'The crisis may further erode confidence in economic management.'}`);
    }
  }

  const mentalHealthAccess = state.services?.mentalHealthAccess;
  const prisonSafety = state.services?.prisonSafety;
  const courtBacklogPerformance = state.services?.courtBacklogPerformance;
  if (typeof mentalHealthAccess === 'number' && mentalHealthAccess < 50) {
    const mentalHealthOptions = [
      `Constituency-level mental health services are under mounting pressure, with the national access index now at ${mentalHealthAccess.toFixed(0)}/100. Backbench MPs in high-need areas warn that delayed treatment is feeding wider social and economic strain.`,
      `Mental health access remains strained at ${mentalHealthAccess.toFixed(0)}/100. Clinicians say longer waits are increasing pressure on A&E departments and primary care.`,
      `Service leaders report continued stress in mental health provision, with access measured at ${mentalHealthAccess.toFixed(0)}/100 and waiting times still elevated in several regions.`,
    ];
    paragraphs.push(pickLeastRepeated(mentalHealthOptions, buildRecentNewsCorpus(state)));
  }
  if (typeof prisonSafety === 'number' && prisonSafety < 48 && Math.random() < 0.55) {
    const prisonOptions = [
      `Justice indicators are deteriorating: prison safety has slipped to ${prisonSafety.toFixed(0)}/100, while MPs on the Justice Committee report escalating violence and staffing shortages across the estate.`,
      `Prison safety is now ${prisonSafety.toFixed(0)}/100, with inspectors warning that workforce churn and overcrowding are limiting rehabilitation outcomes.`,
      `The prison estate remains under pressure at ${prisonSafety.toFixed(0)}/100 on safety metrics, prompting renewed calls for staffing and capacity reform.`,
    ];
    paragraphs.push(pickLeastRepeated(prisonOptions, buildRecentNewsCorpus(state)));
  }
  if (typeof courtBacklogPerformance === 'number' && courtBacklogPerformance < 50 && Math.random() < 0.55) {
    const courtOptions = [
      `Court performance remains weak at ${courtBacklogPerformance.toFixed(0)}/100, with legal professionals warning that delayed hearings are undermining confidence in the rule of law.`,
      `Tribunal and Crown Court throughput is still subdued at ${courtBacklogPerformance.toFixed(0)}/100, extending waits for victims, defendants, and witnesses.`,
      `Legal sector bodies said court backlog performance of ${courtBacklogPerformance.toFixed(0)}/100 remains inconsistent with timely justice delivery.`,
    ];
    paragraphs.push(pickLeastRepeated(courtOptions, buildRecentNewsCorpus(state)));
  }

  const vatRate = state.taxation?.vatRate;
  const vatDomesticEnergy = state.taxation?.vatDomesticEnergy;
  if ((typeof vatRate === 'number' && vatRate > 20) || (typeof vatDomesticEnergy === 'number' && vatDomesticEnergy > 5)) {
    const householdTaxOptions = [
      `Household tax pressures are intensifying. Consumer groups report rising complaints that higher VAT settings are filtering through to everyday purchases, with one shopper saying even "a basic cake run for the family" now costs noticeably more.`,
      `Families report that recent VAT choices are feeding through to routine spending, with campaigners warning that essentials and utility-linked costs are taking a larger share of disposable income.`,
      `Consumer organisations said VAT-related price pressures are now visible in day-to-day bills, adding to wider cost-of-living anxiety in lower and middle income households.`,
    ];
    paragraphs.push(pickLeastRepeated(householdTaxOptions, recentCorpus));
  }

  const corporationTaxRate = state.taxation?.corporationTaxRate;
  const energyProfitsLevy = state.taxation?.energyProfitsLevy;
  if ((typeof corporationTaxRate === 'number' && corporationTaxRate > 25) || (typeof energyProfitsLevy === 'number' && energyProfitsLevy > 35)) {
    const businessTaxOptions = [
      `Business leaders criticised the cumulative burden of granular tax adjustments. A manufacturing chief executive told the paper that repeated parameter changes are "making investment planning materially harder" and called for greater tax stability.`,
      `Employers said frequent tax parameter revisions are undermining confidence in medium-term planning, with firms asking for clearer multi-year guidance from the Treasury.`,
      `Industry groups warned that policy churn across business taxes is complicating capital budgeting decisions and may delay hiring and investment in exposed sectors.`,
    ];
    paragraphs.push(pickLeastRepeated(businessTaxOptions, recentCorpus));
  }

  // Ensure at least one context paragraph
  while (paragraphs.length === 0) {
    paragraphs.push(`The government must now decide how to respond whilst managing broader economic and political pressures.`);
  }

  return paragraphs;
}

/**
 * Legacy function: combines lead and secondary stories
 * Kept for backward compatibility
 */
function generateArticleParagraphs(state: any, newspaper: NewspaperSource, headline: string, event?: RandomEvent): string[] {
  const paragraphs: string[] = [];
  const recentCorpus = buildRecentNewsCorpus(state);

  // If there's an event, use lead + secondary structure
  if (event) {
    const leadStory = generateLeadStory(state, newspaper, event);
    const secondaryStory = generateSecondaryStory(state, newspaper, event);
    return [...leadStory, ...secondaryStory];
  }

  // Fallback to original economic-focused paragraphs if no event
  const gdpGrowth = state.economy?.gdpGrowthAnnual ?? 0;
  const inflation = state.economy?.inflationCPI ?? 2;
  const unemployment = state.economy?.unemploymentRate ?? 4;
  const deficit = state.fiscal?.deficitPctGDP ?? 3;
  const debt = state.fiscal?.debtToGdpPercent ?? 100;

  // Economic situation paragraph
  if (gdpGrowth < -0.1) {
    paragraphs.push(`The UK economy contracted by ${Math.abs(gdpGrowth).toFixed(1)}% last quarter, marking ${gdpGrowth < -0.2 ? 'a significant recession' : 'a technical recession'} as output fell for the second consecutive quarter. The Office for National Statistics data showed weakness across manufacturing, construction, and consumer-facing services.`);
  } else if (gdpGrowth > 0.5) {
    const growthParagraphOptions = [
      `Britain's economy expanded by ${gdpGrowth.toFixed(1)}% last quarter. The ONS figures pointed to stronger activity across business investment and consumer-facing services, though economists cautioned that momentum can fade quickly under tighter financial conditions.`,
      `The latest ONS release showed quarterly growth of ${gdpGrowth.toFixed(1)}%, with gains spread across services and parts of manufacturing. Analysts said the result was encouraging but warned against assuming a straight-line recovery.`,
      `UK output rose by ${gdpGrowth.toFixed(1)}% over the quarter, according to official data. Forecasters said the picture remains mixed, with resilient demand in some sectors offset by weaker confidence in others.`,
    ];
    paragraphs.push(pickLeastRepeated(growthParagraphOptions, recentCorpus));
  } else {
    paragraphs.push(`The economy grew modestly at ${gdpGrowth.toFixed(1)}% last quarter, a subdued performance reflecting ongoing headwinds from tight monetary policy and weak business confidence. The Chancellor had forecast stronger growth at this stage of the recovery.`);
  }

  // Fiscal situation
  if (deficit > 5) {
    const gdpNominal = state.economy?.gdpNominal ?? 2500;
    paragraphs.push(`The Treasury is borrowing £${(deficit * gdpNominal / 100 / 12).toFixed(1)}bn per month as the budget deficit reached ${deficit.toFixed(1)}% of GDP, ${newspaper.bias === 'right' || newspaper.bias === 'populist-right' ? 'a level of fiscal incontinence' : 'reflecting weak tax revenues and rising debt interest costs'}. Public debt now stands at ${debt.toFixed(0)}% of national income.`);
  }

  // Inflation and living standards
  if (inflation > 3) {
    const wageGrowthReal = state.economy?.wageGrowthReal ?? 0;
    paragraphs.push(`Inflation remains ${inflation > 5 ? 'stubbornly' : 'persistently'} above the Bank of England's 2% target at ${inflation.toFixed(1)}%, ${newspaper.bias === 'left' ? 'hammering household budgets' : 'requiring continued monetary tightness'}. Real wages have ${wageGrowthReal > 0 ? 'finally turned positive' : 'fallen ' + Math.abs(wageGrowthReal).toFixed(1) + '%'}, adding to the cost-of-living pressures facing families.`);
  }

  // Labour market
  if (unemployment > 5 || Math.abs(unemployment - 4) > 1) {
    paragraphs.push(`The unemployment rate ${unemployment > 5 ? 'climbed to' : 'held at'} ${unemployment.toFixed(1)}%, ${unemployment > 6 ? 'with redundancies accelerating across multiple sectors' : 'suggesting the labour market is loosening'}. The Treasury insists its policies are working to boost employment, but ${newspaper.bias === 'left' ? 'critics argue austerity is destroying jobs' : 'businesses complain the tax burden makes hiring unaffordable'}.`);
  }

  // Political dimension
  if (state.political?.publicApproval !== undefined && state.political.publicApproval < 40) {
    const approval = state.political.publicApproval ?? 40;
    const leftText = "as voters reject the government's failed economic approach";
    const rightText = "raising questions about the government's political authority to push through necessary reforms";
    paragraphs.push(`The Chancellor's approval rating has ${approval < 30 ? 'collapsed' : 'fallen'} to ${approval.toFixed(0)}%, ${newspaper.bias === 'left' ? leftText : rightText}. Labour backbenchers are ${state.political?.backbenchSentiment?.rebellionRisk === 'high' ? 'in open revolt' : 'increasingly restive'}, with several reportedly demanding a change of direction.`);
  }

  // Market reaction
  if (state.markets?.giltYield10yr !== undefined && state.markets.giltYield10yr > 4.5) {
    const giltYield = state.markets.giltYield10yr ?? 4.5;
    const yieldChange = state.markets?.giltYield10yrChange ?? 0;
    const bankRate = state.economy?.boeBaseRate ?? state.economy?.bankRate ?? 4.5;
    const riskSpread = giltYield - bankRate;
    let movementVerb = 'edging higher';
    let reactionTone = 'cautiously';

    if (yieldChange >= 0.35) {
      movementVerb = 'jumping sharply';
      reactionTone = 'abruptly';
    } else if (yieldChange >= 0.15) {
      movementVerb = 'rising decisively';
      reactionTone = 'negatively';
    } else if (yieldChange >= 0.05) {
      movementVerb = 'moving higher';
      reactionTone = 'warily';
    } else if (yieldChange <= -0.15) {
      movementVerb = 'falling back';
      reactionTone = 'more positively';
    } else if (yieldChange < 0) {
      movementVerb = 'easing slightly';
      reactionTone = 'more calmly';
    }

    const ftOptions = [
      `Analysts said the move reflected shifting views on fiscal credibility and medium-term debt dynamics.`,
      `Dealers said pricing remained sensitive to the credibility of the fiscal path rather than single announcements.`,
      `Strategists noted that market access remains solid, but funding costs still respond quickly to policy surprises.`,
    ];
    const nonFtOptions = [
      `The move could feed through into mortgage pricing if sustained over coming months.`,
      `Borrowing costs for households and firms may rise if this trend persists.`,
      `Lenders said sustained moves in gilts typically feed into household borrowing costs with a lag.`,
    ];

    const spreadOptions = riskSpread > 1.2
      ? [
          `Traders pointed to a widening gap over Bank Rate, suggesting investors are demanding a higher fiscal risk premium.`,
          `The widening spread against policy rates was read as a credibility signal rather than a pure monetary-policy effect.`,
          `Dealers said the move looked increasingly risk-premium driven, with concern centred on fiscal trajectory rather than inflation alone.`,
        ]
      : [
          `Much of the move was attributed to the expected path of policy rates rather than disorderly fiscal repricing.`,
          `Strategists said the gilt move remained broadly aligned with monetary-policy expectations and global rate moves.`,
          `Market participants described the repricing as primarily rate-led, with limited evidence of acute fiscal stress.`,
        ];

    const tail = newspaper.name === 'Financial Times'
      ? pickLeastRepeated(ftOptions, recentCorpus)
      : pickLeastRepeated(nonFtOptions, recentCorpus);
    const spreadTail = pickLeastRepeated(spreadOptions, recentCorpus);

    paragraphs.push(`Bond markets reacted ${reactionTone}, with 10-year gilt yields ${movementVerb} to ${giltYield.toFixed(2)}%. ${tail} ${spreadTail}`);
  }

  // Newspaper-specific angle
  switch (newspaper.name) {
    case 'The Guardian':
      paragraphs.push(pickLeastRepeated([
        `Trade unions and poverty campaigners warned the government's austerity approach was inflicting unnecessary hardship on the most vulnerable. "Ministers are making political choices to protect the wealthy whilst cutting support for those who need it most," said one charity director.`,
        `Anti-poverty organisations argued that the policy mix risks widening inequality, with charities warning that lower-income households are absorbing disproportionate pressure.`,
        `Campaign groups said ministers were underestimating the social cost of tighter settings, pointing to rising demand for emergency support across several regions.`,
      ], recentCorpus));
      break;
    case 'The Telegraph':
      paragraphs.push(pickLeastRepeated([
        `Business leaders expressed frustration at the tax burden, with one FTSE 100 chief executive saying: "Britain has become one of the least competitive places to invest in the developed world. We need a government that backs enterprise, not one that sees business as a piggy bank."`,
        `Executives renewed calls for a pro-enterprise reset, arguing that predictable tax and planning frameworks matter more than one-off headline announcements.`,
        `Industry voices said competitiveness concerns are deepening, with firms comparing UK policy volatility unfavourably with peer economies.`,
      ], recentCorpus));
      break;
    case 'The Times':
      paragraphs.push(pickLeastRepeated([
        `Senior government figures acknowledged privately that the political window for controversial reforms was narrowing. The Chancellor faces a difficult choice between fiscal credibility and electoral viability, with the party trailing in polls across all regions.`,
        `Whitehall officials said privately that room for politically costly reform is shrinking, increasing pressure for a sharper prioritisation of near-term deliverables.`,
        `Insiders described an increasingly tight policy corridor, with ministers balancing market signalling against mounting electoral sensitivity.`,
      ], recentCorpus));
      break;
    case 'Financial Times':
      paragraphs.push(pickLeastRepeated([
        `Credit rating agencies are monitoring UK fiscal developments closely, with S&P warning that continued debt trajectory deterioration could trigger a downgrade from the current AA rating. Such a move would increase borrowing costs and further limit the Chancellor's room for manoeuvre.`,
        `Ratings analysts said the UK remains investment grade with substantial institutional strengths, but warned that persistent slippage could narrow fiscal flexibility.`,
        `Market participants noted that rating outlook commentary is increasingly focused on implementation credibility and medium-term debt stabilisation.`,
      ], recentCorpus));
      break;
    case 'The Sun':
      paragraphs.push(pickLeastRepeated([
        `Our readers are furious. "I've worked all my life and now can't afford to put the heating on," said Janet, 67, from Doncaster. "What are we paying these politicians for?" The Treasury had not responded to our requests for comment by the time of publication.`,
        `Readers told us they are fed up with rising bills and policy U-turns. "Every month there’s a new squeeze and no clear plan," said one father of three in Kent.`,
        `Families across the country said household budgets are stretched to breaking point, with many questioning whether ministers understand day-to-day pressures.`,
      ], recentCorpus));
      break;
    case 'Daily Mail':
      paragraphs.push(pickLeastRepeated([
        `Middle-class families who "did everything right" – saving for retirement, buying property, working hard – now find themselves worse off than benefits claimants, according to a Policy Exchange analysis. "The system punishes aspiration and rewards dependency," claimed one backbench MP.`,
        `Commentators warned that squeezed households in commuter and suburban seats feel increasingly overtaxed, with ministers facing pressure to show they back aspiration.`,
        `Backbench critics argued current policy settings are eroding incentives for work and saving, calling for a clearer pro-family tax strategy.`,
      ], recentCorpus));
      break;
  }

  // Ensure we have at least 3 paragraphs
  while (paragraphs.length < 3) {
    paragraphs.push(`Treasury sources insist the government's economic plan remains on track despite short-term turbulence. ${newspaper.bias === 'left' ? 'However, the evidence suggests otherwise' : 'Critics will doubtless disagree'}.`);
  }

  return paragraphs;
}

// ============================================================================
// MAIN NEWSPAPER GENERATION FUNCTION
// ============================================================================

export function generateNewspaper(state: any, event?: RandomEvent): NewsArticle {
  // Select newspaper (weighted by realism - FT and Times most common, tabloids less so)
  const weights = [15, 15, 25, 30, 8, 7];  // Guardian, Telegraph, Times, FT, Sun, Mail
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;
  let selectedNewspaper = NEWSPAPERS[0];

  for (let i = 0; i < NEWSPAPERS.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      selectedNewspaper = NEWSPAPERS[i];
      break;
    }
  }

  // If there's a special event, that's the headline. Otherwise, find best matching template.
  let headline: string;
  let subheading: string;
  const recentCorpus = buildRecentNewsCorpus(state);

  if (event) {
    // Create event-focused headline
    if (event.severity === 'crisis') {
      headline = selectedNewspaper.style === 'tabloid'
        ? event.title.toUpperCase() + ': BRITAIN IN CRISIS'
        : event.title + ' Triggers Government Crisis';
      subheading = event.description;
    } else {
      headline = event.title;
      subheading = event.description;
    }
  } else {
    // Find matching templates, then pick with diversity rather than always taking the top one.
    const sorted = [...HEADLINE_TEMPLATES]
      .filter(t => t.conditions(state))
      .sort((a, b) => b.priority - a.priority);

    const topTemplates = sorted.slice(0, Math.min(4, sorted.length));
    const weightedPool = topTemplates.flatMap((template, idx) => {
      const weight = Math.max(1, 5 - idx);
      return Array.from({ length: weight }, () => template);
    });
    const template = (weightedPool.length > 0
      ? weightedPool[Math.floor(Math.random() * weightedPool.length)]
      : HEADLINE_TEMPLATES[HEADLINE_TEMPLATES.length - 1]);
    const biasedVersion = template.biasedVersions[selectedNewspaper.bias];

    const useGenericPool = Math.random() < 0.45;
    if (useGenericPool) {
      const genericHeadline = pickLeastRepeated(
        GENERIC_HEADLINE_POOL.map((entry) => entry.headline),
        recentCorpus
      );
      const chosenGeneric = GENERIC_HEADLINE_POOL.find((entry) => entry.headline === genericHeadline) || GENERIC_HEADLINE_POOL[0];
      headline = chosenGeneric.headline;
      subheading = chosenGeneric.subheading;
    } else {
      headline = biasedVersion.headline;
      subheading = biasedVersion.subheading;
    }
  }

  // Generate article paragraphs (passes event for lead story if available)
  const paragraphs = generateArticleParagraphs(state, selectedNewspaper, headline, event);

  // Generate opposition quote
  const oppositionQuote = generateOppositionQuote(state, selectedNewspaper);

  return {
    newspaper: selectedNewspaper,
    headline,
    subheading,
    paragraphs,
    oppositionQuote,
    month: state.currentMonth,
    date: new Date(state.currentDate),
    isSpecialEdition: !!event
  };
}

// ============================================================================
// REACT COMPONENTS
// ============================================================================

/** Event Modal - Displays major events that require player response */
interface EventModalProps {
  event: RandomEvent;
  onRespond: (response: EventResponseOption) => void;
  onDismiss: () => void;
}

export const EventModal: React.FC<EventModalProps> = ({ event, onRespond, onDismiss }) => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '8px',
        maxWidth: '700px',
        maxHeight: '80vh',
        overflow: 'auto',
        border: event.severity === 'crisis' ? '3px solid #dc2626' : '2px solid #ea580c'
      }}>
        <div style={{ marginBottom: '20px' }}>
          <div style={{
            display: 'inline-block',
            padding: '4px 12px',
            borderRadius: '4px',
            backgroundColor: event.severity === 'crisis' ? '#dc2626' : event.severity === 'major' ? '#ea580c' : '#64748b',
            color: 'white',
            fontSize: '12px',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            marginBottom: '12px'
          }}>
            {event.severity === 'crisis' ? 'BREAKING: CRISIS' : event.severity === 'major' ? 'MAJOR EVENT' : 'EVENT'}
          </div>
          <h2 style={{ margin: '8px 0 16px 0', fontSize: '24px', fontWeight: 'bold', color: '#1e293b' }}>
            {event.title}
          </h2>
          <p style={{ fontSize: '16px', color: '#475569', lineHeight: '1.6' }}>
            {event.description}
          </p>
        </div>

        {event.responseOptions && event.responseOptions.length > 0 && (
          <div style={{ marginTop: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', color: '#1e293b' }}>
              Your Response:
            </h3>
            {event.responseOptions.map((option, idx) => (
              <button
                key={idx}
                onClick={() => onRespond(option)}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '16px',
                  marginBottom: '12px',
                  border: '2px solid #cbd5e1',
                  borderRadius: '6px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = '#2563eb';
                  e.currentTarget.style.backgroundColor = '#eff6ff';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = '#cbd5e1';
                  e.currentTarget.style.backgroundColor = 'white';
                }}
              >
                <div style={{ fontWeight: 'bold', fontSize: '15px', marginBottom: '6px', color: '#1e293b' }}>
                  {option.label}
                </div>
                <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '8px' }}>
                  {option.description}
                </div>
                <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                  Political cost: {option.politicalCost} points
                  {option.fiscalCost ? ` • Fiscal impact: £${Math.abs(option.fiscalCost)}bn ${option.fiscalCost > 0 ? 'cost' : 'saving'}` : ''}
                </div>
              </button>
            ))}
          </div>
        )}

        {!event.responseOptions && (
          <button
            onClick={onDismiss}
            style={{
              marginTop: '20px',
              padding: '12px 24px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
};

/** Newspaper Component - Displays monthly newspaper */
interface NewspaperProps {
  article: NewsArticle;
  onClose: () => void;
}

export const Newspaper: React.FC<NewspaperProps> = ({ article, onClose }) => {
  const { newspaper, headline, subheading, paragraphs, oppositionQuote, date, isSpecialEdition } = article;

  // Newspaper styling based on publication
  const getMastheadColor = () => {
    switch (newspaper.name) {
      case 'The Guardian': return '#052962';
      case 'The Telegraph': return '#0F3460';
      case 'The Times': return '#000000';
      case 'Financial Times': return '#FFF1E5';
      case 'The Sun': return '#FF0000';
      case 'Daily Mail': return '#0F3460';
      default: return '#000000';
    }
  };

  const getTextColor = () => {
    return newspaper.name === 'Financial Times' ? '#000000' : '#FFFFFF';
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: newspaper.name === 'Financial Times' ? '#FFF1E5' : '#FFFFFF',
        width: '100%',
        maxWidth: '800px',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        border: isSpecialEdition ? '4px solid #dc2626' : 'none'
      }}>
        {/* Masthead */}
        <div style={{
          backgroundColor: getMastheadColor(),
          padding: '20px 30px',
          borderBottom: newspaper.name === 'Financial Times' ? '1px solid #000' : 'none'
        }}>
          <div style={{
            fontSize: newspaper.style === 'tabloid' ? '42px' : '36px',
            fontWeight: 'bold',
            color: getTextColor(),
            fontFamily: newspaper.name === 'The Times' ? 'Times New Roman, serif' : newspaper.style === 'tabloid' ? 'Arial Black, sans-serif' : 'Georgia, serif',
            textAlign: 'center',
            letterSpacing: newspaper.name === 'The Guardian' ? '0.05em' : 'normal'
          }}>
            {newspaper.name.toUpperCase()}
          </div>
          <div style={{
            fontSize: '13px',
            color: getTextColor(),
            textAlign: 'center',
            marginTop: '8px',
            opacity: 0.9
          }}>
            {date.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        {/* Special edition banner */}
        {isSpecialEdition && (
          <div style={{
            backgroundColor: '#dc2626',
            color: 'white',
            padding: '8px 30px',
            fontSize: '14px',
            fontWeight: 'bold',
            textAlign: 'center',
            letterSpacing: '0.1em'
          }}>
            SPECIAL EDITION
          </div>
        )}

        {/* Article */}
        <div style={{ padding: '30px' }}>
          {/* Headline */}
          <h1 style={{
            fontSize: newspaper.style === 'tabloid' ? '38px' : '32px',
            fontWeight: 'bold',
            lineHeight: '1.1',
            marginBottom: '16px',
            fontFamily: newspaper.style === 'tabloid' ? 'Arial Black, sans-serif' : 'Georgia, serif',
            color: '#000000'
          }}>
            {headline}
          </h1>

          {/* Subheading */}
          <h2 style={{
            fontSize: '18px',
            fontWeight: newspaper.style === 'tabloid' ? 'bold' : 'normal',
            color: '#1e293b',
            marginBottom: '24px',
            fontFamily: newspaper.style === 'tabloid' ? 'Arial, sans-serif' : 'Georgia, serif',
            fontStyle: newspaper.style === 'broadsheet' ? 'italic' : 'normal',
            lineHeight: '1.4'
          }}>
            {subheading}
          </h2>

          {/* Body */}
          <div style={{
            fontSize: '16px',
            lineHeight: '1.7',
            color: '#000000',
            fontFamily: 'Georgia, serif'
          }}>
            {paragraphs.map((para, idx) => (
              <p key={idx} style={{ marginBottom: '16px' }}>
                {para}
              </p>
            ))}
          </div>

          {/* Opposition quote box */}
          <div style={{
            marginTop: '24px',
            padding: '20px',
            backgroundColor: '#f1f5f9',
            borderLeft: '4px solid #2563eb',
            fontFamily: 'Georgia, serif'
          }}>
            <div style={{
              fontSize: '14px',
              fontWeight: 'bold',
              color: '#2563eb',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Opposition Response
            </div>
            <div style={{
              fontSize: '16px',
              fontStyle: 'italic',
              color: '#1e293b',
              marginBottom: '10px',
              lineHeight: '1.6'
            }}>
              {oppositionQuote.quote}
            </div>
            <div style={{
              fontSize: '14px',
              color: '#64748b',
              fontWeight: '600'
            }}>
              — {oppositionQuote.speaker}
            </div>
          </div>
        </div>

        {/* Close button */}
        <div style={{ padding: '0 30px 30px 30px' }}>
          <button
            onClick={onClose}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

/** Event Log Panel - Shows minor events and history */
interface EventLogPanelProps {
  events: EventLogEntry[];
}

export const EventLogPanel: React.FC<EventLogPanelProps> = ({ events }) => {
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      padding: '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: '#1e293b' }}>
        Recent Events
      </h3>

      {events.length === 0 && (
        <p style={{ color: '#94a3b8', fontSize: '14px', fontStyle: 'italic' }}>
          No recent events
        </p>
      )}

      {events.slice(0, 10).map((entry, idx) => (
        <div
          key={entry.event.id}
          style={{
            padding: '12px',
            marginBottom: '8px',
            backgroundColor: entry.resolved ? '#f8fafc' : '#fef3c7',
            borderLeft: `3px solid ${
              entry.event.severity === 'crisis' ? '#dc2626' :
              entry.event.severity === 'major' ? '#ea580c' : '#94a3b8'
            }`,
            borderRadius: '4px'
          }}
        >
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>
            {entry.event.title}
          </div>
          <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
            {entry.event.description}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            Month {entry.event.month}
            {entry.playerResponse && ` • Response: ${entry.playerResponse}`}
          </div>
        </div>
      ))}
    </div>
  );
};
