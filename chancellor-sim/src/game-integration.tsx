// Game Integration Layer
// Creates initialization functions and type mappings for all game systems

// This file bridges the existing system files with the new unified game state

// ===========================
// Fiscal Rules Framework
// ===========================

export type FiscalRuleId =
  | 'starmer-reeves'       // Labour 2024: current budget balance + debt falling in 5th year
  | 'golden-rule'          // Brown-style: borrow only for investment, current budget balanced over cycle
  | 'maastricht'           // EU-style: deficit <3% GDP, debt <60% GDP
  | 'balanced-budget'      // Swabian housewife: balanced overall budget every year
  | 'debt-anchor'          // Swedish-style: debt target with operational surplus rule
  | 'mmt-inspired';        // Modern Monetary Theory inspired: focus on inflation/employment, no deficit target

export interface FiscalRule {
  id: FiscalRuleId;
  name: string;
  shortDescription: string;
  detailedDescription: string;
  historicalPrecedent: string;
  rules: {
    currentBudgetBalance: boolean;   // Must balance current (non-investment) budget
    overallBalance: boolean;         // Must balance entire budget
    deficitCeiling?: number;         // Maximum deficit as % GDP (if applicable)
    debtTarget?: number;             // Debt/GDP target (if applicable)
    debtFalling: boolean;            // Debt must be on falling path
    investmentExempt: boolean;       // Can borrow for investment
    timeHorizon: number;             // Years over which rules must be met (rolling)
  };
  marketReaction: {
    giltYieldBps: number;            // Basis point impact on initial gilt yields
    sterlingPercent: number;         // Percentage impact on sterling
    credibilityChange: number;       // Impact on credibility index
  };
  politicalReaction: {
    pmTrustChange: number;
    backbenchChange: number;
    approvalChange: number;
  };
}

export const FISCAL_RULES: FiscalRule[] = [
  {
    id: 'starmer-reeves',
    name: 'Stability Rule (Starmer-Reeves)',
    shortDescription: 'Current budget balanced; debt falling by year 5 of forecast',
    detailedDescription: 'The current budget (excluding net investment) must be in balance. Public sector net debt excluding Bank of England must be falling as a share of GDP by the fifth year of the OBR forecast period. This is the framework actually adopted by the Labour government in 2024.',
    historicalPrecedent: 'Rachel Reeves 2024. Designed to allow investment borrowing while maintaining current spending discipline. The rolling 5-year horizon provides some flexibility.',
    rules: {
      currentBudgetBalance: true,
      overallBalance: false,
      debtFalling: true,
      investmentExempt: true,
      timeHorizon: 5,
    },
    marketReaction: {
      giltYieldBps: 0,           // Baseline - this is the default expectation
      sterlingPercent: 0,
      credibilityChange: 0,
    },
    politicalReaction: {
      pmTrustChange: 0,
      backbenchChange: 0,
      approvalChange: 0,
    },
  },
  {
    id: 'golden-rule',
    name: 'Golden Rule (Brownite)',
    shortDescription: 'Borrow only to invest; current budget balanced over the economic cycle',
    detailedDescription: 'Over the economic cycle, the government will borrow only to invest and not to fund current expenditure. Net debt will be held at a stable and prudent level over the cycle. Allows significant investment borrowing but demands current spending discipline.',
    historicalPrecedent: 'Gordon Brown 1997-2007. Widely regarded as credible initially but the definition of "the cycle" was manipulated to delay compliance. Markets view with moderate scepticism.',
    rules: {
      currentBudgetBalance: true,
      overallBalance: false,
      debtFalling: false,
      investmentExempt: true,
      timeHorizon: 7, // "Over the cycle" - more flexible
    },
    marketReaction: {
      giltYieldBps: 5,           // Slightly higher yields - less strict debt rule
      sterlingPercent: -0.3,
      credibilityChange: -3,
    },
    politicalReaction: {
      pmTrustChange: -2,
      backbenchChange: 3,       // Left wing likes investment flexibility
      approvalChange: 0,
    },
  },
  {
    id: 'maastricht',
    name: 'Maastricht Criteria',
    shortDescription: 'Deficit below 3% of GDP; debt target of 60% GDP',
    detailedDescription: 'Government deficit must not exceed 3% of GDP. Government debt must not exceed 60% of GDP (or be sufficiently diminishing towards it). These are the EU convergence criteria, adapted for UK use as hard constraints.',
    historicalPrecedent: 'EU Treaty 1992. Used across the eurozone. Criticised as arbitrary but provides clear, measurable targets that markets understand. The 60% debt target would require dramatic fiscal consolidation from UK starting position.',
    rules: {
      currentBudgetBalance: false,
      overallBalance: false,
      deficitCeiling: 3.0,
      debtTarget: 60,
      debtFalling: true,
      investmentExempt: false,
      timeHorizon: 3,
    },
    marketReaction: {
      giltYieldBps: -15,         // Markets love hard constraints
      sterlingPercent: 1.0,
      credibilityChange: 8,
    },
    politicalReaction: {
      pmTrustChange: 2,
      backbenchChange: -8,       // Very unpopular with Labour backbenchers
      approvalChange: -2,        // Public nervous about implied cuts
    },
  },
  {
    id: 'balanced-budget',
    name: 'Balanced Budget Rule',
    shortDescription: 'Overall budget must be balanced every year; no structural borrowing',
    detailedDescription: 'Total government expenditure including investment must not exceed total revenue in any single year. No distinction between current and capital spending. The most restrictive fiscal framework available.',
    historicalPrecedent: 'German Schuldenbremse (debt brake) post-2009. Extremely restrictive. Would require immediate and severe fiscal consolidation from UK starting deficit. Markets would see this as highly credible but politically unsustainable.',
    rules: {
      currentBudgetBalance: true,
      overallBalance: true,
      debtFalling: true,
      investmentExempt: false,
      timeHorizon: 1,
    },
    marketReaction: {
      giltYieldBps: -25,         // Maximum market confidence
      sterlingPercent: 2.0,
      credibilityChange: 15,
    },
    politicalReaction: {
      pmTrustChange: -5,
      backbenchChange: -20,      // Devastating for Labour backbenchers
      approvalChange: -5,        // Public fears severe cuts
    },
  },
  {
    id: 'debt-anchor',
    name: 'Debt Anchor Framework',
    shortDescription: 'Target debt/GDP of 85% with 1% structural surplus to get there',
    detailedDescription: 'Set a medium-term debt anchor of 85% of GDP. Run a structural surplus of at least 1% of GDP to reduce debt towards the target. Automatic stabilisers allowed to operate in downturns. A Swedish-inspired approach adapted for UK conditions.',
    historicalPrecedent: 'Sweden post-1990s crisis. Their debt anchor framework with surplus target is widely considered the gold standard of fiscal frameworks. Markets view very favourably but requires sustained fiscal restraint.',
    rules: {
      currentBudgetBalance: true,
      overallBalance: false,
      debtTarget: 85,
      debtFalling: true,
      investmentExempt: true,
      timeHorizon: 4,
    },
    marketReaction: {
      giltYieldBps: -10,
      sterlingPercent: 0.8,
      credibilityChange: 6,
    },
    politicalReaction: {
      pmTrustChange: 0,
      backbenchChange: -5,
      approvalChange: -1,
    },
  },
  {
    id: 'mmt-inspired',
    name: 'Full Employment Framework',
    shortDescription: 'No deficit target; focus on inflation below 4% and unemployment below 4%',
    detailedDescription: 'Abandon traditional fiscal rules. Government spending should be calibrated to achieve full employment and price stability, not arbitrary deficit or debt targets. Borrow freely when unemployment is high and inflation is low. Only tighten fiscal policy when inflation becomes a genuine threat.',
    historicalPrecedent: 'No major economy has formally adopted this approach. Drawing on MMT and post-Keynesian economics. Markets would react extremely negatively to the abandonment of fiscal anchors. Very popular with the Labour left.',
    rules: {
      currentBudgetBalance: false,
      overallBalance: false,
      debtFalling: false,
      investmentExempt: true,
      timeHorizon: 0, // No time-based rule
    },
    marketReaction: {
      giltYieldBps: 45,          // Markets would be alarmed
      sterlingPercent: -3.5,
      credibilityChange: -20,
    },
    politicalReaction: {
      pmTrustChange: -15,
      backbenchChange: 12,       // Labour left would love it
      approvalChange: 2,         // Short-term public approval for spending promises
    },
  },
];

export function getFiscalRuleById(id: FiscalRuleId): FiscalRule {
  return FISCAL_RULES.find(r => r.id === id) || FISCAL_RULES[0];
}

// ===========================
// Economic State Initialization
// ===========================

export interface EconomicState {
  gdpNominal_bn: number;
  gdpGrowthMonthly: number;
  gdpGrowthAnnual: number;
  inflationCPI: number;
  unemploymentRate: number;
  wageGrowthAnnual: number;
}

export function createInitialEconomicState(): EconomicState {
  return {
    gdpNominal_bn: 2730,
    gdpGrowthMonthly: 0.05,
    gdpGrowthAnnual: 0.6,
    inflationCPI: 2.0,
    unemploymentRate: 4.2,
    wageGrowthAnnual: 5.7,
  };
}

// ===========================
// Fiscal State Initialization
// ===========================

export interface SpendingBreakdown {
  // Current (resource/day-to-day) spending
  nhsCurrent: number;
  educationCurrent: number;
  defenceCurrent: number;
  welfareCurrent: number;
  infrastructureCurrent: number;
  policeCurrent: number;
  justiceCurrent: number;
  otherCurrent: number;

  // Capital (investment) spending
  nhsCapital: number;
  educationCapital: number;
  defenceCapital: number;
  infrastructureCapital: number;
  policeCapital: number;
  justiceCapital: number;
  otherCapital: number;

  // Aggregate totals per department (computed from current + capital)
  nhs: number;
  education: number;
  defence: number;
  welfare: number;
  infrastructure: number;
  police: number;
  justice: number;
  other: number;
}

export interface DetailedSpendingItem {
  id: string;
  department: string;
  programme: string;
  currentBudget: number;  // Combined if legacy, but we'll migrate
  currentAllocation: number; // Day-to-day
  capitalAllocation: number; // Investment
  type: 'resource' | 'capital' | 'split';
}

export interface DetailedTaxItem {
  id: string;
  name: string;
  currentRate: number;
  unit: string;
}

export interface FiscalState {
  // Tax rates (main levers used by turn processor)
  incomeTaxBasicRate: number;
  incomeTaxHigherRate: number;
  incomeTaxAdditionalRate: number;
  nationalInsuranceRate: number;
  employerNIRate: number;
  vatRate: number;
  corporationTaxRate: number;

  // Persisted granular items
  detailedSpending: DetailedSpendingItem[];
  detailedTaxes: DetailedTaxItem[];

  // Starting tax rates (captured at game start for manifesto pledge tracking)
  startingTaxRates: {
    incomeTaxBasic: number;
    incomeTaxHigher: number;
    incomeTaxAdditional: number;
    niEmployee: number;
    niEmployer: number;
    vat: number;
    corporationTax: number;
  };

  // Revenue adjustment from "other" taxes (CGT, IHT, excise duties, reliefs, etc.)
  // Calculated by budget system reckoners and applied as a lump sum
  revenueAdjustment_bn: number;

  // Revenues and spending
  totalRevenue_bn: number;
  totalSpending_bn: number;
  spending: SpendingBreakdown;

  // Fiscal aggregates
  deficit_bn: number;
  deficitPctGDP: number;
  debtNominal_bn: number;
  debtPctGDP: number;
  debtInterest_bn: number;
  fiscalHeadroom_bn: number;

  // Fiscal year tracking (for manifesto pledge compliance)
  currentFiscalYear: number;
  fiscalYearStartTurn: number;
  fiscalYearStartSpending: SpendingBreakdown;
}

export function createInitialFiscalState(): FiscalState {
  return {
    incomeTaxBasicRate: 20,
    incomeTaxHigherRate: 40,
    incomeTaxAdditionalRate: 45,
    nationalInsuranceRate: 8,
    employerNIRate: 13.8,
    vatRate: 20,
    corporationTaxRate: 25,

    // Capture starting tax rates for manifesto pledge tracking
    startingTaxRates: {
      incomeTaxBasic: 20,
      incomeTaxHigher: 40,
      incomeTaxAdditional: 45,
      niEmployee: 8,
      niEmployer: 13.8,
      vat: 20,
      corporationTax: 25,
    },

    revenueAdjustment_bn: 0,

    totalRevenue_bn: 1078,
    totalSpending_bn: 1100,
    spending: {
      // Current (resource) spending
      nhsCurrent: 168.4,
      educationCurrent: 104.0,
      defenceCurrent: 39.0,
      welfareCurrent: 290.0,
      infrastructureCurrent: 20.0,
      policeCurrent: 18.5,
      justiceCurrent: 12.7,
      otherCurrent: 306.0,

      // Capital (investment) spending
      nhsCapital: 12.0,
      educationCapital: 12.0,
      defenceCapital: 16.6,
      infrastructureCapital: 80.0,
      policeCapital: 0.5,
      justiceCapital: 0.3,
      otherCapital: 20.0,

      // Aggregate totals
      nhs: 180.4,
      education: 116,
      defence: 55.6,
      welfare: 290,
      infrastructure: 100,
      police: 19,
      justice: 13,
      other: 326.0,
    },

    detailedSpending: [
      // NHS
      { id: 'nhsEngland', department: 'Health and Social Care', programme: 'NHS England Revenue', currentBudget: 164.9, currentAllocation: 164.9, capitalAllocation: 0, type: 'resource' },
      { id: 'nhsPrimaryCare', department: 'Health and Social Care', programme: 'Primary Care', currentBudget: 18.0, currentAllocation: 18.0, capitalAllocation: 0, type: 'resource' },
      { id: 'nhsMentalHealth', department: 'Health and Social Care', programme: 'Mental Health', currentBudget: 16.0, currentAllocation: 16.0, capitalAllocation: 0, type: 'resource' },
      { id: 'publicHealth', department: 'Health and Social Care', programme: 'Public Health', currentBudget: 3.5, currentAllocation: 3.5, capitalAllocation: 0, type: 'resource' },
      { id: 'socialCare', department: 'Health and Social Care', programme: 'Social Care Grants', currentBudget: 7.5, currentAllocation: 7.5, capitalAllocation: 0, type: 'resource' },
      { id: 'nhsCapital', department: 'Health and Social Care', programme: 'Capital Investment', currentBudget: 12.0, currentAllocation: 0, capitalAllocation: 12.0, type: 'capital' },
      // Education
      { id: 'schools', department: 'Education', programme: 'Schools Core Funding', currentBudget: 59.4, currentAllocation: 59.4, capitalAllocation: 0, type: 'resource' },
      { id: 'pupilPremium', department: 'Education', programme: 'Pupil Premium', currentBudget: 2.9, currentAllocation: 2.9, capitalAllocation: 0, type: 'resource' },
      { id: 'furtherEducation', department: 'Education', programme: 'Further Education and Skills', currentBudget: 7.2, currentAllocation: 7.2, capitalAllocation: 0, type: 'resource' },
      { id: 'higherEducation', department: 'Education', programme: 'Higher Education', currentBudget: 1.8, currentAllocation: 1.8, capitalAllocation: 0, type: 'resource' },
      { id: 'earlyYears', department: 'Education', programme: 'Early Years', currentBudget: 8.0, currentAllocation: 8.0, capitalAllocation: 0, type: 'resource' },
      { id: 'send', department: 'Education', programme: 'SEND Support', currentBudget: 10.5, currentAllocation: 10.5, capitalAllocation: 0, type: 'resource' },
      { id: 'schoolsCapital', department: 'Education', programme: 'School Buildings and Infrastructure', currentBudget: 12.0, currentAllocation: 0, capitalAllocation: 12.0, type: 'capital' },
      // Defence
      { id: 'armyRevenue', department: 'Defence', programme: 'Army', currentBudget: 11.0, currentAllocation: 11.0, capitalAllocation: 0, type: 'resource' },
      { id: 'navyRevenue', department: 'Defence', programme: 'Royal Navy', currentBudget: 8.5, currentAllocation: 8.5, capitalAllocation: 0, type: 'resource' },
      { id: 'rafRevenue', department: 'Defence', programme: 'Royal Air Force', currentBudget: 7.5, currentAllocation: 7.5, capitalAllocation: 0, type: 'resource' },
      { id: 'nuclearDeterrent', department: 'Defence', programme: 'Nuclear Deterrent', currentBudget: 3.5, currentAllocation: 3.5, capitalAllocation: 0, type: 'resource' },
      { id: 'defenceEquipment', department: 'Defence', programme: 'Equipment Plan', currentBudget: 16.6, currentAllocation: 0, capitalAllocation: 16.6, type: 'capital' },
      // Welfare
      { id: 'statePension', department: 'Work and Pensions', programme: 'State Pension', currentBudget: 130.0, currentAllocation: 130.0, capitalAllocation: 0, type: 'resource' },
      { id: 'universalCredit', department: 'Work and Pensions', programme: 'Universal Credit', currentBudget: 38.0, currentAllocation: 38.0, capitalAllocation: 0, type: 'resource' },
      { id: 'pip', department: 'Work and Pensions', programme: 'Personal Independence Payment', currentBudget: 22.0, currentAllocation: 22.0, capitalAllocation: 0, type: 'resource' },
      { id: 'housingBenefit', department: 'Work and Pensions', programme: 'Housing Benefit', currentBudget: 18.0, currentAllocation: 18.0, capitalAllocation: 0, type: 'resource' },
      { id: 'childBenefit', department: 'Work and Pensions', programme: 'Child Benefit', currentBudget: 12.6, currentAllocation: 12.6, capitalAllocation: 0, type: 'resource' },
      // Justice
      { id: 'prisonsAndProbation', department: 'Justice', programme: 'Prisons and Probation', currentBudget: 5.5, currentAllocation: 5.5, capitalAllocation: 0, type: 'resource' },
      { id: 'courts', department: 'Justice', programme: 'Courts and Tribunals', currentBudget: 2.8, currentAllocation: 2.8, capitalAllocation: 0, type: 'resource' },
      { id: 'legalAid', department: 'Justice', programme: 'Legal Aid', currentBudget: 1.9, currentAllocation: 1.9, capitalAllocation: 0, type: 'resource' },
      // Home Office
      { id: 'policing', department: 'Home Office', programme: 'Policing', currentBudget: 11.5, currentAllocation: 11.5, capitalAllocation: 0, type: 'resource' },
      { id: 'immigration', department: 'Home Office', programme: 'Immigration and Borders', currentBudget: 4.5, currentAllocation: 4.5, capitalAllocation: 0, type: 'resource' },
      { id: 'counterTerrorism', department: 'Home Office', programme: 'Counter-Terrorism', currentBudget: 1.2, currentAllocation: 1.2, capitalAllocation: 0, type: 'resource' },
      // Transport
      { id: 'railSubsidy', department: 'Transport', programme: 'Rail Subsidy', currentBudget: 5.5, currentAllocation: 5.5, capitalAllocation: 0, type: 'resource' },
      { id: 'nationalRoads', department: 'Transport', programme: 'National Roads', currentBudget: 7.0, currentAllocation: 0, capitalAllocation: 7.0, type: 'capital' },
      { id: 'localRoads', department: 'Transport', programme: 'Local Roads', currentBudget: 3.5, currentAllocation: 0, capitalAllocation: 3.5, type: 'capital' },
      { id: 'hs2', department: 'Transport', programme: 'HS2 Phase 1', currentBudget: 6.0, currentAllocation: 0, capitalAllocation: 6.0, type: 'capital' },
      // Housing
      { id: 'localGovernmentGrants', department: 'Housing and Communities', programme: 'Local Government Grants', currentBudget: 5.5, currentAllocation: 5.5, capitalAllocation: 0, type: 'resource' },
      { id: 'housingCapital', department: 'Housing and Communities', programme: 'Affordable Housing', currentBudget: 2.5, currentAllocation: 0, capitalAllocation: 2.5, type: 'capital' },
      // Environment
      { id: 'farmSubsidies', department: 'Environment and Rural Affairs', programme: 'Farm Subsidies and ELM', currentBudget: 2.4, currentAllocation: 2.4, capitalAllocation: 0, type: 'resource' },
      { id: 'floodDefences', department: 'Environment and Rural Affairs', programme: 'Flood Defences', currentBudget: 1.2, currentAllocation: 0, capitalAllocation: 1.2, type: 'capital' },
      // SciTech
      { id: 'ukri', department: 'Science and Technology', programme: 'UK Research and Innovation', currentBudget: 7.3, currentAllocation: 7.3, capitalAllocation: 0, type: 'resource' },
      { id: 'aiAndDigital', department: 'Science and Technology', programme: 'AI and Digital Infrastructure', currentBudget: 1.5, currentAllocation: 0, capitalAllocation: 1.5, type: 'capital' },
      // Energy
      { id: 'renewablesSupport', department: 'Energy and Net Zero', programme: 'Renewables Support', currentBudget: 1.0, currentAllocation: 1.0, capitalAllocation: 0, type: 'resource' },
      { id: 'homeInsulation', department: 'Energy and Net Zero', programme: 'Home Insulation', currentBudget: 1.2, currentAllocation: 1.2, capitalAllocation: 0, type: 'resource' },
      { id: 'nuclearNewBuild', department: 'Energy and Net Zero', programme: 'Nuclear New Build', currentBudget: 1.0, currentAllocation: 0, capitalAllocation: 1.0, type: 'capital' },
      // Other
      { id: 'officialDevelopmentAssistance', department: 'Foreign Office', programme: 'Official Development Assistance', currentBudget: 11.4, currentAllocation: 11.4, capitalAllocation: 0, type: 'resource' },
    ],

    detailedTaxes: [
      { id: 'sdltAdditionalSurcharge', name: 'SDLT Additional Property Surcharge', currentRate: 3, unit: '%' },
      { id: 'sdltFirstTimeBuyerThreshold', name: 'SDLT First-Time Buyer Threshold', currentRate: 425000, unit: '£' },
      { id: 'pensionAnnualAllowance', name: 'Pension Annual Allowance', currentRate: 60000, unit: '£' },
      { id: 'isaAllowance', name: 'ISA Annual Allowance', currentRate: 20000, unit: '£' },
      { id: 'dividendAllowance', name: 'Dividend Allowance', currentRate: 1000, unit: '£' },
      { id: 'insurancePremiumTax', name: 'Insurance Premium Tax', currentRate: 12, unit: '%' },
      { id: 'softDrinksLevy', name: 'Soft Drinks Industry Levy', currentRate: 100, unit: 'Index' },
      { id: 'vatDomesticEnergy', name: 'VAT on Domestic Energy', currentRate: 5, unit: '%' },
      { id: 'vatPrivateSchools', name: 'VAT on Private School Fees', currentRate: 20, unit: '%' },
      { id: 'vatRegistrationThreshold', name: 'VAT Registration Threshold', currentRate: 85000, unit: '£' },
      { id: 'annualInvestmentAllowance', name: 'Annual Investment Allowance', currentRate: 1000000, unit: '£' },
      { id: 'rdTaxCredit', name: 'R&D Tax Credit Enhanced Rate', currentRate: 27, unit: '%' },
      { id: 'bankSurcharge', name: 'Bank Corporation Tax Surcharge', currentRate: 3, unit: '%' },
      { id: 'energyProfitsLevy', name: 'Energy Profits Levy', currentRate: 35, unit: '%' },
      { id: 'patentBoxRate', name: 'Patent Box Rate', currentRate: 10, unit: '%' },
      { id: 'cgtAnnualExempt', name: 'CGT Annual Exempt Amount', currentRate: 3000, unit: '£' },
      { id: 'cgtResidentialSurcharge', name: 'CGT Residential Property Surcharge', currentRate: 8, unit: '%' },
      { id: 'badrRate', name: 'Business Asset Disposal Relief Rate', currentRate: 10, unit: '%' },
      { id: 'badrLifetimeLimit', name: 'BADR Lifetime Limit', currentRate: 1000000, unit: '£' },
      { id: 'ihtResidenceNilRate', name: 'IHT Residence Nil Rate Band', currentRate: 175000, unit: '£' },
    ],

    deficit_bn: 111,
    deficitPctGDP: 4.1,
    debtNominal_bn: 2744,
    debtPctGDP: 100.5,
    debtInterest_bn: 89,
    fiscalHeadroom_bn: 8.9,

    // Fiscal year tracking
    currentFiscalYear: 2024,
    fiscalYearStartTurn: 0,
    fiscalYearStartSpending: {
      nhsCurrent: 168.4,
      educationCurrent: 104.0,
      defenceCurrent: 39.0,
      welfareCurrent: 290.0,
      infrastructureCurrent: 20.0,
      policeCurrent: 18.5,
      justiceCurrent: 12.7,
      otherCurrent: 306.0,
      nhsCapital: 12.0,
      educationCapital: 12.0,
      defenceCapital: 16.6,
      infrastructureCapital: 80.0,
      policeCapital: 0.5,
      justiceCapital: 0.3,
      otherCapital: 20.0,
      nhs: 180.4,
      education: 116,
      defence: 55.6,
      welfare: 290,
      infrastructure: 100,
      police: 19,
      justice: 13,
      other: 326.0,
    },
  };
}

// ===========================
// Market State Initialization
// ===========================

export interface MarketState {
  bankRate: number;
  giltYield2y: number;
  giltYield10y: number;
  giltYield30y: number;
  mortgageRate2y: number;
  sterlingIndex: number;
}

export function createInitialMarketState(): MarketState {
  return {
    bankRate: 5.25,
    giltYield2y: 4.15,
    giltYield10y: 4.15,
    giltYield30y: 4.55,
    mortgageRate2y: 5.50,
    sterlingIndex: 100,
  };
}

// ===========================
// Services State Initialization
// ===========================

export interface ServicesState {
  nhsQuality: number; // 0-100
  educationQuality: number; // 0-100
  infrastructureQuality: number; // 0-100
}

export function createInitialServicesState(): ServicesState {
  return {
    nhsQuality: 62,
    educationQuality: 68,
    infrastructureQuality: 58,
  };
}

// ===========================
// Political State Initialization
// ===========================

export interface PMInterventionEvent {
  id: string;
  triggered: boolean;
  triggerReason: 'backbench_revolt' | 'manifesto_breach' | 'economic_crisis' | 'approval_collapse';
  pmTrust: number;
  pmAnger: 'concerned' | 'angry' | 'furious';
  demandTitle: string;
  demandDescription: string;
  specificPolicyReversal?: {
    taxId?: string;
    spendingId?: string;
    revertToValue: number;
  };
  playerChoice?: 'comply' | 'defy';
  consequencesIfComply: {
    pmTrustChange: number;
    backbenchSentimentChange: number;
    publicApprovalChange: number;
  };
  consequencesIfDefy: {
    pmTrustChange: number;
    backbenchSentimentChange: number;
    reshuffleRisk: number;
  };
}

export interface PoliticalState {
  governmentApproval: number;
  chancellorApproval: number;
  backbenchSatisfaction: number;
  pmTrust: number;
  credibilityIndex: number;
  strikeRisk: number;
  chosenFiscalRule: FiscalRuleId;
  fiscalRuleCompliance: {
    currentBudgetMet: boolean;
    overallBalanceMet: boolean;
    deficitCeilingMet: boolean;
    debtTargetMet: boolean;
    debtFallingMet: boolean;
    overallCompliant: boolean;
    consecutiveBreaches: number;
    currentBudgetGap: number;
    capitalInvestment: number;
  };
  pmInterventionsPending?: PMInterventionEvent[];
  // Full political state from political-system.tsx (populated after first turn)
  backbenchers?: any[];
  backbenchSentiment?: any;
  pmTrustHistory?: number[];
  reshuffleEvent?: any;
  polling?: any;
  opinionFactors?: any;
  manifestoBreaches?: {
    taxLocks: number;
    spendingPledges: number;
    fiscalRules: number;
  };
  significantEvents?: any[];
  creditRating?: 'AAA' | 'AA+' | 'AA' | 'AA-' | 'A+' | 'A';
  creditRatingOutlook?: 'stable' | 'negative' | 'positive';
}

export function createInitialPoliticalState(): PoliticalState {
  return {
    governmentApproval: 45,
    chancellorApproval: 42,
    backbenchSatisfaction: 70,
    pmTrust: 75,
    credibilityIndex: 65,
    strikeRisk: 20,
    chosenFiscalRule: 'starmer-reeves',
    fiscalRuleCompliance: {
      currentBudgetMet: true,
      overallBalanceMet: false,
      deficitCeilingMet: false,
      debtTargetMet: false,
      debtFallingMet: false,
      overallCompliant: true,
      consecutiveBreaches: 0,
      currentBudgetGap: 0,
      capitalInvestment: 82.5,
    },
    pmInterventionsPending: [],
    backbenchers: [],
    pmTrustHistory: [75],
    manifestoBreaches: { taxLocks: 0, spendingPledges: 0, fiscalRules: 0 },
    significantEvents: [],
    creditRating: 'AA-',
    creditRatingOutlook: 'negative',
  };
}

// ===========================
// Adviser System Initialization
// ===========================

export interface Adviser {
  id: string;
  type: string;
  name: string;
  hired: boolean;
}

export interface AdviserSystem {
  advisers: Adviser[];
  maxAdvisers: number;
  hiredAdvisers?: Map<string, any>;
  availableAdvisers?: Set<string>;
  currentOpinions?: Map<string, any>;
  showDetailedView?: string | null;
  adviserEvents?: any[];
}

export function createInitialAdviserSystem(): AdviserSystem {
  return {
    advisers: [],
    maxAdvisers: 3,
    hiredAdvisers: new Map(),
    availableAdvisers: new Set(['treasury', 'political', 'heterodox', 'fhawk', 'socdem', 'technocrat']),
    currentOpinions: new Map(),
    showDetailedView: null,
    adviserEvents: [],
  };
}

// ===========================
// Event State Initialization
// ===========================

export interface GameEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  active: boolean;
}

export interface EventState {
  activeEvents: GameEvent[];
  eventHistory: GameEvent[];
  pendingEvents: any[]; // RandomEvent[] from events-media
  eventLog: any[]; // EventLogEntry[] from events-media
  currentNewspaper: any | null; // NewsArticle from events-media
}

export function createInitialEventState(): EventState {
  return {
    activeEvents: [],
    eventHistory: [],
    pendingEvents: [],
    eventLog: [],
    currentNewspaper: null,
  };
}

// ===========================
// Simulation State
// ===========================

export interface HistoricalSnapshot {
  turn: number;
  date: string;
  gdpGrowth: number;
  inflation: number;
  unemployment: number;
  deficit: number;
  debt: number;
  approval: number;
  giltYield: number;
}

export interface SimulationState {
  monthlySnapshots: HistoricalSnapshot[];
}
