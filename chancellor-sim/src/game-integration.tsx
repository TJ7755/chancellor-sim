// Game Integration Layer
// Creates initialization functions and type mappings for all game systems

// This file bridges the existing system files with the new unified game state

// ===========================
// Fiscal Rules Framework
// ===========================

export type FiscalRuleId =
  | 'starmer-reeves'       // Labour 2024: current budget balance + debt falling in 5th year
  | 'jeremy-hunt'          // Conservative 2022–24: deficit <3% GDP + debt falling as % GDP by 5th year; no capex exemption
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
    id: 'jeremy-hunt',
    name: 'Consolidated Mandate (Jeremy Hunt)',
    shortDescription: 'Deficit below 3% of GDP by year 5; debt falling as % GDP by year 5; no investment exemption',
    detailedDescription: 'The framework used by the Conservative government 2022–2024. Two mandates: (1) the structural deficit must be below 3% of GDP in the fifth year of the forecast; (2) public sector net debt (excluding the Bank of England) must be falling as a share of GDP in the fifth year. Unlike Labour\'s Stability Rule, there is no exemption for investment spending — all borrowing counts against the debt mandate.',
    historicalPrecedent: 'Jeremy Hunt 2022–2024. Replaced the Sunak medium-term fiscal plan after the Truss mini-budget. Starting UK deficit (~3.2% GDP) means this rule is initially being breached; consolidation is required to meet it. Markets approve of the stricter no-capex-exemption approach but political tolerance for spending restraint is limited.',
    rules: {
      currentBudgetBalance: false,
      overallBalance: false,
      deficitCeiling: 3.0,
      debtFalling: true,
      investmentExempt: false,
      timeHorizon: 5,
    },
    marketReaction: {
      giltYieldBps: -5,          // Modest market improvement vs Starmer-Reeves baseline
      sterlingPercent: 0.3,
      credibilityChange: 2,
    },
    politicalReaction: {
      pmTrustChange: 3,          // PM trusts financial orthodoxy
      backbenchChange: -5,       // Labour backbenchers dislike the Conservative-era rule
      approvalChange: -1,
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
  inflationAnchorHealth: number; // 0-100, where 100 is fully anchored at 2%
  productivityGrowthAnnual: number; // % annual labour productivity growth
  productivityLevel: number; // Index: 100 = baseline (July 2024)
  participationRate: number; // Labour force participation rate (%)
  economicInactivity: number; // Economic inactivity rate (%)
}

export function createInitialEconomicState(): EconomicState {
  return {
    gdpNominal_bn: 2750,
    gdpGrowthMonthly: 0.083,
    gdpGrowthAnnual: 1.0,
    inflationCPI: 2.2,
    unemploymentRate: 4.2,
    wageGrowthAnnual: 5.4,
    inflationAnchorHealth: 72,
    productivityGrowthAnnual: 0.1,
    productivityLevel: 100, // Baseline index
    participationRate: 63.0,
    economicInactivity: 21.5,
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
  welfareDEL_bn: number;
  welfareAME_bn: number;
  pendingBudgetChange: Record<string, any> | null;
  pendingBudgetApplyTurn: number | null;
  fpcConstraintCost_bn: number;
  stampDutyRevenue_bn: number;
  housingAMEPressure_bn: number;
  barnettConsequentials_bn: number;

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
  fiscalRuleBreaches: number;
  pmPensionFloor_bn: number;
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

    totalRevenue_bn: 1090,
    totalSpending_bn: 1100,
    welfareDEL_bn: 30,
    welfareAME_bn: 115,
    pendingBudgetChange: null,
    pendingBudgetApplyTurn: null,
    fpcConstraintCost_bn: 0,
    stampDutyRevenue_bn: 16,
    housingAMEPressure_bn: 0,
    barnettConsequentials_bn: 0,
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

    // Fiscal aggregates
    // CORRECTED: debtNominal_bn and debtPctGDP now use PSND excluding Bank of England,
    // which is the measure targeted by Reeves' Stability Rule and used in OBR forecasts.
    // ONS PSF June 2024: PSND ex-BoE = 91.6% of GDP.  July 2024 estimate: ~£2,540bn / 92.4%.
    // Previous values (£2,734bn / 99.4%) were the headline PSND including BoE asset purchase
    // facility, which overstated the fiscal risk premium inputs by ~£194bn / ~7pp.
    deficit_bn: 87,
    deficitPctGDP: 3.2,
    debtNominal_bn: 2540,    // was 2734; corrected to PSND ex-BoE per ONS/OBR July 2024
    debtPctGDP: 92.4,        // was 99.4; corrected (2540 / 2750 × 100)
    debtInterest_bn: 95,
    // OBR October 2024 Autumn Statement certified headroom on the current budget rule: £9.9bn.
    // This initial display value is consistent with OBR_HEADROOM_CALIBRATION below.
    fiscalHeadroom_bn: 9.9,

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
    fiscalRuleBreaches: 0,
    pmPensionFloor_bn: 0,
  };
}

export function createInitialSpendingReviewState() {
  return {
    lastReviewTurn: -1,
    nextReviewDueTurn: 1,
    inReview: false,
    srCredibilityBonus: 0,
    lastDeliveryRiskEvents: [] as string[],
    departments: {
      nhs: {
        name: 'NHS',
        resourceDEL_bn: 180,
        capitalDEL_bn: 12,
        plannedResourceDEL_bn: [180, 183, 186],
        plannedCapitalDEL_bn: [12, 12.4, 12.8],
        backlog: 45,
        deliveryCapacity: 65,
      },
      education: {
        name: 'Education',
        resourceDEL_bn: 116,
        capitalDEL_bn: 12,
        plannedResourceDEL_bn: [116, 118, 120],
        plannedCapitalDEL_bn: [12, 12.3, 12.6],
        backlog: 40,
        deliveryCapacity: 80,
      },
      defence: {
        name: 'Defence',
        resourceDEL_bn: 39,
        capitalDEL_bn: 16.6,
        plannedResourceDEL_bn: [39, 39.8, 40.6],
        plannedCapitalDEL_bn: [16.6, 17.0, 17.4],
        backlog: 30,
        deliveryCapacity: 80,
      },
      infrastructure: {
        name: 'Infrastructure',
        resourceDEL_bn: 20,
        capitalDEL_bn: 80,
        plannedResourceDEL_bn: [20, 20.4, 20.8],
        plannedCapitalDEL_bn: [80, 82, 84],
        backlog: 55,
        deliveryCapacity: 65,
      },
      homeOffice: {
        name: 'Home Office',
        resourceDEL_bn: 31.2,
        capitalDEL_bn: 0.8,
        plannedResourceDEL_bn: [31.2, 31.8, 32.4],
        plannedCapitalDEL_bn: [0.8, 0.85, 0.9],
        backlog: 35,
        deliveryCapacity: 80,
      },
      localGov: {
        name: 'Local Government',
        resourceDEL_bn: 30,
        capitalDEL_bn: 0,
        plannedResourceDEL_bn: [30, 30.6, 31.2],
        plannedCapitalDEL_bn: [0, 0, 0],
        backlog: 60,
        deliveryCapacity: 80,
      },
      other: {
        name: 'Other',
        resourceDEL_bn: 277.4,
        capitalDEL_bn: 20,
        plannedResourceDEL_bn: [277.4, 280, 282.6],
        plannedCapitalDEL_bn: [20, 20.4, 20.8],
        backlog: 30,
        deliveryCapacity: 80,
      },
    },
  };
}

export function createInitialDebtManagementState(debtNominal_bn: number, bankRate: number, inflationCPI: number) {
  const shortTerm = debtNominal_bn * 0.2;
  const medium = debtNominal_bn * 0.35;
  const longTerm = debtNominal_bn * 0.3;
  const indexLinked = Math.max(0, debtNominal_bn - shortTerm - medium - longTerm);

  return {
    maturityProfile: {
      shortTerm: { outstanding_bn: shortTerm, avgCoupon: bankRate, turnsToMaturity: 8 },
      medium: { outstanding_bn: medium, avgCoupon: 4.2, turnsToMaturity: 60 },
      longTerm: { outstanding_bn: longTerm, avgCoupon: 4.5, turnsToMaturity: 240 },
      indexLinked: { outstanding_bn: indexLinked, avgCoupon: inflationCPI + 0.5, turnsToMaturity: 120 },
    },
    weightedAverageMaturity: 14,
    refinancingRisk: 35,
    qeHoldings_bn: 750,
    issuanceStrategy: 'balanced' as const,
  };
}

export function createInitialParliamentaryState() {
  return {
    lordsDelayActive: false,
    lordsDelayTurnsRemaining: 0,
    lordsDelayBillType: null,
    whipStrength: 70,
    formalConfidenceVotePending: false,
    confidenceVoteThreshold: 62,
    confidenceVoteTurn: null,
    rebellionCount: 0,
    selectCommittees: [
      { id: 'treasury', scrutinyPressure: 20, isInquiryActive: false, inquiryTurnsRemaining: 0, credibilityImpact: 0, inquiryTriggerThreshold: 70 },
      { id: 'health', scrutinyPressure: 20, isInquiryActive: false, inquiryTurnsRemaining: 0, credibilityImpact: 0, inquiryTriggerThreshold: 70 },
      { id: 'education', scrutinyPressure: 20, isInquiryActive: false, inquiryTurnsRemaining: 0, credibilityImpact: 0, inquiryTriggerThreshold: 70 },
      { id: 'publicAccounts', scrutinyPressure: 20, isInquiryActive: false, inquiryTurnsRemaining: 0, credibilityImpact: 0, inquiryTriggerThreshold: 70 },
      { id: 'homeAffairs', scrutinyPressure: 20, isInquiryActive: false, inquiryTurnsRemaining: 0, credibilityImpact: 0, inquiryTriggerThreshold: 70 },
    ],
  };
}

export function createInitialExternalSectorState() {
  return {
    currentAccountGDP: -3.1,
    tradeBalanceGDP: -2.8,
    energyImportPricePressure: 0,
    tradeFrictionIndex: 35,
    exportGrowth: 1.2,
    importGrowth: 1.5,
    externalShockActive: false,
    externalShockType: null,
    externalShockTurnsRemaining: 0,
    externalShockMagnitude: 0,
  };
}

export function createInitialFinancialStabilityState() {
  return {
    housePriceIndex: 100,
    housePriceGrowthAnnual: 2.5,
    mortgageApprovals: 60,
    householdDebtToIncome: 130,
    bankStressIndex: 15,
    fpcInterventionActive: false,
    fpcInterventionType: null,
    fpcInterventionTurnsRemaining: 0,
    creditGrowthAnnual: 4.2,
    housingAffordabilityIndex: 38,
    consecutiveHousingCrashTurns: 0,
  };
}

export function createInitialDevolutionState() {
  return {
    nations: {
      scotland: { id: 'scotland', blockGrant_bn: 41, barnettBaseline_bn: 0.085, politicalTension: 45, grantDispute: false, grantDisputeTurnsRemaining: 0 },
      wales: { id: 'wales', blockGrant_bn: 20, barnettBaseline_bn: 0.05, politicalTension: 30, grantDispute: false, grantDisputeTurnsRemaining: 0 },
      northernIreland: { id: 'northernIreland', blockGrant_bn: 18, barnettBaseline_bn: 0.035, politicalTension: 35, grantDispute: false, grantDisputeTurnsRemaining: 0 },
    },
    localGov: {
      centralGrant_bn: 30,
      councilTaxBaseGrowth: 2.5,
      localGovStressIndex: 40,
      section114Notices: 0,
      localServicesQuality: 48,
    },
    barnettConsequentialMultiplier: 1,
    section114Timer: 0,
  };
}

export function createInitialDistributionalState() {
  const incomes = [9, 14, 18, 22, 27, 33, 40, 51, 68, 120];
  return {
    deciles: incomes.map((avgIncome_k, i) => ({
      id: i + 1,
      avgIncome_k,
      effectiveTaxRate: 0,
      realIncomeChange: 0,
      isWinner: false,
    })),
    giniCoefficient: 0.35,
    povertyRate: 17.5,
    childPovertyRate: 29.0,
    bottomQuintileRealIncomeGrowth: 0,
    topDecileEffectiveTaxRate: 0,
    lastTaxChangeDistribution: null as 'regressive' | 'neutral' | 'progressive' | null,
  };
}

// ===========================
// Headroom Calibration
// ===========================
//
// The game calculates the current-year current budget balance (revenue minus
// non-capital spending minus debt interest).  With neutral policy this formula
// produces ~+£36.4bn.
//
// The OBR, however, reports "fiscal headroom" as the surplus/deficit forecast
// for the *fifth year* of the projection — a forward-looking figure that
// incorporates GDP growth, spending trajectories, and debt dynamics.  At the
// OBR October 2024 Autumn Statement, certified headroom on the Starmer-Reeves
// current budget rule was £9.9bn (2029-30).
//
// On the other hand, this game begins in July 2024, rather than October, so the
// October figure cannot be used. I've instead calculated a more appropriate headroom
// figure based on a headroom of ~£21.7 Billion, which would have been the case if
// nothing had changed, but the fiscal rules had changed to the Starmer-Reeves one.
//
// Applying OBR_HEADROOM_CALIBRATION translates the game's current-year balance
// into an OBR-style projected headroom display:
//   displayed headroom  = currentBudgetBalance + OBR_HEADROOM_CALIBRATION
//                       = 36.4 + OBR_HEADROOM_CALIBRATION  ≈  +9.9  ✓
//
// Fiscal rules are treated as "met" when displayed headroom >= 0 (i.e., within
// £0bn of the threshold), providing the same margin as the OBR's test.
//
// This constant is imported by turn-processor.tsx and budget-system.tsx so that
// BOTH the Dashboard (which reads fiscal.fiscalHeadroom_bn) and the Budget tab
// (which recalculates independently) display the identical figure.
export const OBR_HEADROOM_CALIBRATION = -14.8;

// ===========================
// Rule-Specific Headroom
// ===========================
//
// Each fiscal framework measures "how close we are to the limit" differently.
// calculateRuleHeadroom returns a signed £bn figure:
//   positive = headroom above the rule's threshold
//   negative = breach depth below the rule's threshold
//
// Parameters:
//   rule                  — the chosen FiscalRule
//   currentBudgetBalance  — revenue − (totalSpending − capitalSpending) − debtInterest
//   deficitPctGDP         — current deficit as percentage of GDP
//   gdpNominal            — nominal GDP in £bn
//   totalRevenue          — total receipts in £bn
//   totalSpending         — total managed expenditure in £bn (incl. capital)
//   debtInterest          — annual debt interest cost in £bn
//
export function calculateRuleHeadroom(
  rule: FiscalRule,
  currentBudgetBalance: number,
  deficitPctGDP: number,
  gdpNominal: number,
  totalRevenue: number,
  totalSpending: number,
  debtInterest: number,
): number {
  switch (rule.id) {
    // Current-budget-balance rules: distance from balance + OBR 5-year projection offset
    case 'starmer-reeves':
    case 'golden-rule':
    case 'debt-anchor':
      return currentBudgetBalance + OBR_HEADROOM_CALIBRATION;

    // Deficit-ceiling rules: distance from the 3% ceiling in £bn terms
    // Positive = headroom below the ceiling; negative = breach above the ceiling
    case 'jeremy-hunt':
    case 'maastricht':
      return ((rule.rules.deficitCeiling ?? 3.0) - deficitPctGDP) * gdpNominal / 100;

    // Overall-balance rule: revenue must cover ALL spending including capital
    case 'balanced-budget':
      return totalRevenue - totalSpending - debtInterest;

    // MMT/Full Employment: no fiscal constraint; always show zero headroom (N/A concept)
    case 'mmt-inspired':
      return 0;

    default:
      return currentBudgetBalance + OBR_HEADROOM_CALIBRATION;
  }
}

// Label describing what the headroom figure represents for the current rule
export function getRuleHeadroomLabel(rule: FiscalRule): string {
  switch (rule.id) {
    case 'starmer-reeves':
    case 'golden-rule':
    case 'debt-anchor':
      return 'OBR Headroom (Current Budget Rule)';
    case 'jeremy-hunt':
      return 'Headroom vs 3% Deficit Ceiling';
    case 'maastricht':
      return 'Headroom vs 3% Deficit Ceiling';
    case 'balanced-budget':
      return 'Overall Budget Balance';
    case 'mmt-inspired':
      return 'No Formal Fiscal Constraint';
    default:
      return 'Fiscal Headroom';
  }
}

// Per-rule ongoing market credibility bonus applied each month when the rule is being met.
// Expressed as a gilt yield offset in basis points (negative = lower yields = better).
export const FISCAL_RULE_GILT_EFFECT: Record<FiscalRuleId, number> = {
  'starmer-reeves':  0.0,   // Baseline — no additional effect
  'jeremy-hunt':    -0.05,  // Modest improvement from slightly stricter mandate
  'golden-rule':     0.03,  // Slightly worse — perceived flexibility risk
  'maastricht':     -0.15,  // Significant improvement — hard EU-style constraint
  'balanced-budget':-0.15,  // Maximum credibility — strictest rule
  'debt-anchor':    -0.10,  // Swedish gold standard — markets approve strongly
  'mmt-inspired':    0.25,  // Markets alarmed by absence of fiscal anchor
};

// Per-rule sterling level offset (percentage points added to monthly sterling calculation).
export const FISCAL_RULE_STERLING_EFFECT: Record<FiscalRuleId, number> = {
  'starmer-reeves':  0.0,   // Baseline
  'jeremy-hunt':     0.10,  // Modest sterling support
  'golden-rule':    -0.05,  // Mild weakness from flexibility concerns
  'maastricht':      0.25,  // Strong sterling support — hard deficit ceiling
  'balanced-budget': 0.30,  // Strongest — zero-borrowing credibility
  'debt-anchor':     0.20,  // Strong support — credible surplus path
  'mmt-inspired':   -0.50,  // Sterling under significant pressure
};

// Per-rule backbench satisfaction drift target (the equilibrium value backbench satisfaction
// gravitates towards each month based purely on the framework choice).
// Actual backbench satisfaction is also affected by policy decisions.
export const FISCAL_RULE_BACKBENCH_DRIFT_TARGET: Record<FiscalRuleId, number> = {
  'starmer-reeves':  55,    // Broadly acceptable to Labour backbenchers
  'jeremy-hunt':     40,    // Labour backbenchers deeply uncomfortable with Conservative-era rule
  'golden-rule':     62,    // Left of party happy — Labour tradition
  'maastricht':      38,    // EU constraint very unpopular with the left
  'balanced-budget': 30,    // Devastating — no investment borrowing allowed
  'debt-anchor':     48,    // Moderate unease — tighter than Starmer-Reeves
  'mmt-inspired':    70,    // Labour left delighted — full spending flexibility
};

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
  yieldChange10y: number; // Month-on-month change in bps
  ldiPanicTriggered: boolean; // Whether LDI feedback loop is active
}

export function createInitialMarketState(): MarketState {
  return {
    bankRate: 5.25,
    giltYield2y: 4.15,
    giltYield10y: 4.10,
    giltYield30y: 4.45,
    mortgageRate2y: 5.10,
    sterlingIndex: 100,
    yieldChange10y: 0,
    ldiPanicTriggered: false,
  };
}

// ===========================
// Services State Initialization
// ===========================

export interface ServicesState {
  nhsQuality: number; // 0-100
  educationQuality: number; // 0-100
  infrastructureQuality: number; // 0-100
  mentalHealthAccess: number; // 0-100
  primaryCareAccess: number; // 0-100
  socialCareQuality: number; // 0-100
  prisonSafety: number; // 0-100
  courtBacklogPerformance: number; // 0-100
  legalAidAccess: number; // 0-100
  policingEffectiveness: number; // 0-100
  borderSecurityPerformance: number; // 0-100
  railReliability: number; // 0-100
  affordableHousingDelivery: number; // 0-100
  floodResilience: number; // 0-100
  researchInnovationOutput: number; // 0-100
  consecutiveNHSCutMonths: number;
  consecutiveEducationCutMonths: number;
  consecutivePensionCutMonths: number;
  nhsStrikeMonthsRemaining: number;
  educationStrikeMonthsRemaining: number;
  pensionerRevoltCooldown: number;
  nhsStrikeCooldown: number;
  teacherStrikeCooldown: number;
  strikeTriggerThresholdMultiplier: number;
}

export function createInitialServicesState(): ServicesState {
  return {
    nhsQuality: 45,
    educationQuality: 58,
    infrastructureQuality: 48,
    mentalHealthAccess: 42,
    primaryCareAccess: 48,
    socialCareQuality: 38,
    prisonSafety: 40,
    courtBacklogPerformance: 32,
    legalAidAccess: 40,
    policingEffectiveness: 50,
    borderSecurityPerformance: 46,
    railReliability: 42,
    affordableHousingDelivery: 30,
    floodResilience: 53,
    researchInnovationOutput: 58,
    consecutiveNHSCutMonths: 0,
    consecutiveEducationCutMonths: 0,
    consecutivePensionCutMonths: 0,
    nhsStrikeMonthsRemaining: 0,
    educationStrikeMonthsRemaining: 0,
    pensionerRevoltCooldown: 0,
    nhsStrikeCooldown: 0,
    teacherStrikeCooldown: 0,
    strikeTriggerThresholdMultiplier: 1,
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
  fiscalRuleChangedLastTurn: boolean;
  fiscalRuleChangeCount: number;
  fiscalRuleYieldShock_pp: number;
  fiscalRuleYieldShockMonthsRemaining: number;
  fiscalRuleUturnReactionTurnsRemaining: number;
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
    fiscalRuleChangedLastTurn: false,
    fiscalRuleChangeCount: 0,
    fiscalRuleYieldShock_pp: 0,
    fiscalRuleYieldShockMonthsRemaining: 0,
    fiscalRuleUturnReactionTurnsRemaining: 0,
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

export interface InitialFiscalRuleMetrics {
  fiscalHeadroom_bn: number;
  fiscalRuleCompliance: PoliticalState['fiscalRuleCompliance'];
}

export function calculateInitialFiscalRuleMetrics(
  fiscal: FiscalState,
  economic: EconomicState,
  chosenFiscalRule: FiscalRuleId,
): InitialFiscalRuleMetrics {
  const rule = getFiscalRuleById(chosenFiscalRule);

  const totalCapitalSpending =
    fiscal.spending.nhsCapital +
    fiscal.spending.educationCapital +
    fiscal.spending.defenceCapital +
    fiscal.spending.infrastructureCapital +
    fiscal.spending.policeCapital +
    fiscal.spending.justiceCapital +
    fiscal.spending.otherCapital;

  const currentBudgetBalance =
    fiscal.totalRevenue_bn -
    (fiscal.totalSpending_bn - totalCapitalSpending) -
    fiscal.debtInterest_bn;

  const fiscalHeadroom_bn = calculateRuleHeadroom(
    rule,
    currentBudgetBalance,
    fiscal.deficitPctGDP,
    economic.gdpNominal_bn,
    fiscal.totalRevenue_bn,
    fiscal.totalSpending_bn,
    fiscal.debtInterest_bn,
  );

  const currentBudgetMet = !rule.rules.currentBudgetBalance || fiscalHeadroom_bn >= -0.5;
  const overallBalance = fiscal.totalRevenue_bn - fiscal.totalSpending_bn - fiscal.debtInterest_bn;
  const overallBalanceMet = !rule.rules.overallBalance || overallBalance >= -0.5;
  const deficitCeilingMet =
    rule.rules.deficitCeiling === undefined || fiscal.deficitPctGDP <= rule.rules.deficitCeiling;
  const debtTargetMet =
    rule.rules.debtTarget === undefined || fiscal.debtPctGDP <= rule.rules.debtTarget;

  let debtFallingMet = true;
  if (rule.rules.debtFalling) {
    if (rule.id === 'jeremy-hunt') {
      debtFallingMet = deficitCeilingMet;
    } else if (rule.rules.timeHorizon >= 4) {
      debtFallingMet = fiscalHeadroom_bn >= -0.5;
    } else {
      debtFallingMet = true;
    }
  }

  const overallCompliant =
    currentBudgetMet && overallBalanceMet && deficitCeilingMet && debtTargetMet && debtFallingMet;

  return {
    fiscalHeadroom_bn,
    fiscalRuleCompliance: {
      currentBudgetMet,
      overallBalanceMet,
      deficitCeilingMet,
      debtTargetMet,
      debtFallingMet,
      overallCompliant,
      consecutiveBreaches: 0,
      currentBudgetGap: Math.max(0, -currentBudgetBalance),
      capitalInvestment: totalCapitalSpending,
    },
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
  gdpNominal: number;   // Nominal GDP in £bn — the base value used in all calculations
  inflation: number;
  unemployment: number;
  deficit: number;
  debt: number;
  approval: number;
  giltYield: number;
  productivity: number; // Annual productivity growth %
}

export interface TurnDeltaDriver {
  name: string;
  value: number;
}

export interface TurnDelta {
  approvalChange: number;
  approvalDriversPositive: TurnDeltaDriver[];
  approvalDriversNegative: TurnDeltaDriver[];
  giltYieldChange: number;
  giltYieldDrivers: TurnDeltaDriver[];
  deficitChange: number;
  deficitDrivers: TurnDeltaDriver[];
}

export interface OBRForecastYear {
  fiscalYearStartTurn: number;
  projectedGDPGrowth: number;
  projectedDeficitPctGDP: number;
  projectedDebtPctGDP: number;
}

export interface OBRForecastSnapshot {
  createdTurn: number;
  createdFiscalYear: number;
  horizonYears: OBRForecastYear[];
}

export interface OBRForecastComparisonRow {
  metric: 'gdpGrowth' | 'deficitPctGDP' | 'debtPctGDP';
  projected: number;
  actual: number;
  delta: number;
}

export interface OBRForecastComparison {
  fiscalYear: number;
  rows: OBRForecastComparisonRow[];
}

export interface PolicyRiskModifier {
  id: string;
  type: 'macro_shock' | 'productivity_drag' | 'strike_accelerator' | 'market_reaction_boost';
  turnsRemaining: number;
  macroShockScaleDelta?: number;
  productivityMonthlyPenalty_pp?: number;
  strikeThresholdMultiplier?: number;
  marketReactionScaleDelta?: number;
  description: string;
}

export interface SimulationState {
  monthlySnapshots: HistoricalSnapshot[];
  lastTurnDelta: TurnDelta | null;
  obrForecastSnapshot: OBRForecastSnapshot | null;
  lastObrComparison: OBRForecastComparison | null;
}
