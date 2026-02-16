import React, { useState } from 'react';
import { X, AlertTriangle, CheckCircle, TrendingUp, Info, Brain, XCircle } from 'lucide-react';
import { ADVISER_OPINIONS, AdviserOpinionTemplate } from './data/adviser-opinions';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type AdviserType =
  | 'treasury_mandarin'
  | 'political_operator'
  | 'heterodox_economist'
  | 'fiscal_hawk'
  | 'social_democrat'
  | 'technocratic_centrist';

export type OpinionSeverity = 'critical' | 'warning' | 'caution' | 'neutral' | 'supportive';
export type PolicyArea = 'taxation' | 'spending' | 'deficit' | 'debt' | 'growth' | 'services' | 'political';

export interface AdviserBiasParameters {
  deficitTolerance: number;         // % of GDP where they start warning (e.g., 3.0 = 3%)
  debtTolerance: number;            // % of GDP debt ceiling (e.g., 100.0 = 100%)
  taxRiseAversion: number;          // 0-1 (0 = loves tax rises, 1 = hates them)
  spendingCutAversion: number;      // 0-1 (0 = loves cuts, 1 = hates them)
  growthPriority: number;           // 0-1 weight on growth vs stability
  politicalSensitivity: number;     // 0-1 how much they care about electoral consequences
  manifestoRigidity: number;        // 0-1 how much manifesto breaches matter
  fiscalRuleRigidity: number;       // 0-1 how much fiscal rule breaches matter
  marketSensitivity: number;        // 0-1 concern about gilt yields/market reactions
}

export interface AdviserProfile {
  type: AdviserType;
  name: string;
  title: string;
  description: string;
  background: string;
  strengths: string[];
  weaknesses: string[];
  biasParameters: AdviserBiasParameters;
  narrativeStyle: 'formal' | 'pragmatic' | 'urgent' | 'academic' | 'political';
}

export interface AdviserOpinion {
  adviserId: AdviserType;
  timestamp: Date;
  overallAssessment: OpinionSeverity;
  headline: string;
  summary: string;
  detailedAnalysis: PolicyAnalysis[];
  recommendations: Recommendation[];
  warnings: AdviserWarning[];
  prediction?: Prediction;
}

export interface PolicyAnalysis {
  area: PolicyArea;
  severity: OpinionSeverity;
  title: string;
  description: string;
  quantitativeReasoning?: string;
}

export interface Recommendation {
  priority: 'immediate' | 'important' | 'consider';
  action: string;
  rationale: string;
  expectedOutcome?: string;
}

export interface AdviserWarning {
  severity: OpinionSeverity;
  title: string;
  description: string;
  consequences?: string;
}

export interface Prediction {
  timeframe: string;
  likelihood: 'almost_certain' | 'likely' | 'possible' | 'unlikely';
  outcome: string;
}

export interface HiredAdviser {
  profile: AdviserProfile;
  hiredMonth: number;
  adviceFollowedCount: number;
  adviceIgnoredCount: number;
  accuratePredictions: number;
  inaccuratePredictions: number;
  relationship: 'excellent' | 'good' | 'strained' | 'poor';
}

export interface AdviserSystemState {
  hiredAdvisers: Map<AdviserType, HiredAdviser>;
  availableAdvisers: Set<AdviserType>;
  currentOpinions: Map<AdviserType, AdviserOpinion>;
  showDetailedView: AdviserType | null;
  adviserEvents: AdviserEvent[];
}

export interface AdviserEvent {
  id: string;
  month: number;
  type: 'appointment' | 'resignation' | 'disagreement' | 'vindication' | 'criticism';
  adviserId: AdviserType;
  title: string;
  description: string;
  choices?: AdviserEventChoice[];
}

export interface AdviserEventChoice {
  label: string;
  description: string;
  consequence: string;
  outcome: (state: AdviserSystemState) => AdviserSystemState;
}

// Type for the broader simulation state (imported from other files)
export interface SimulationState {
  currentMonth: number;
  currentDate: Date;
  economy: {
    gdpReal: number;
    gdpNominal: number;
    gdpGrowthQuarterly: number;
    gdpGrowthAnnual: number;
    cpi: number;
    inflationRate: number;
    unemploymentRate: number;
    wageGrowthNominal: number;
    bankRate: number;
    outputGap: number;
  };
  fiscal: {
    totalRevenue: number;
    totalSpending: number;
    deficit: number;
    debtStock: number;
    debtToGdpPercent: number;
    incomeTaxRevenue: number;
    niRevenue: number;
    vatRevenue: number;
    corporationTaxRevenue: number;
    stabilityRuleMet: boolean;
    investmentRuleMet: boolean;
  };
  services: {
    nhsQuality: number;
    nhsWaitingList: number;
    educationQuality: number;
    defenceReadiness: number;
    policePerformance: number;
    justiceBacklog: number;
  };
  markets: {
    giltYield10yr: number;
    giltYield10yrChange: number;
    marketSentiment: 'panic' | 'nervous' | 'cautious' | 'confident' | 'bullish';
  };
  political: {
    publicApproval: number;
    pmTrust: number;
    backbenchSentiment: {
      averageBackbenchLoyalty: number;
      mpsReadyToRebel: number;
      leftFactionLoyalty: number;
      centreFactionLoyalty: number;
      rightFactionLoyalty: number;
    };
    manifestoBreaches: string[];
  };
}

// ============================================================================
// ADVISER PROFILES DATABASE
// ============================================================================

export const ADVISER_PROFILES: AdviserProfile[] = [
  {
    type: 'treasury_mandarin',
    name: 'Sir Humphrey Cavendish',
    title: 'Permanent Secretary to HM Treasury',
    description: 'A career Treasury official with 30 years of experience. Deeply orthodox, risk-averse, and committed to sound money principles.',
    background: 'Oxbridge PPE, rose through the Treasury ranks advising Chancellors of all parties. Commanded respect in Whitehall for rigorous analysis.',
    strengths: [
      'Encyclopaedic knowledge of Treasury procedures',
      'Excellent at identifying fiscal risks',
      'Strong relationships with Bank of England and OBR',
      'Prevents reckless policy mistakes'
    ],
    weaknesses: [
      'Excessively risk-averse, may miss opportunities',
      'Resistant to unconventional policies',
      'Bias towards inaction and status quo',
      'Can be dismissive of political realities'
    ],
    biasParameters: {
      deficitTolerance: 2.5,
      debtTolerance: 85.0,
      taxRiseAversion: 0.3,
      spendingCutAversion: 0.2,
      growthPriority: 0.3,
      politicalSensitivity: 0.1,
      manifestoRigidity: 0.4,
      fiscalRuleRigidity: 0.95,
      marketSensitivity: 0.9
    },
    narrativeStyle: 'formal'
  },
  {
    type: 'political_operator',
    name: 'Sarah Chen',
    title: 'Chief Political Adviser',
    description: 'Former Chief Whip special adviser. Ruthlessly focused on electoral survival and party management. Knows every marginal seat intimately.',
    background: 'Worked on four general election campaigns. Notorious for predicting backbench rebellions with uncanny accuracy.',
    strengths: [
      'Acute political instincts',
      'Can predict backbencher and PM reactions',
      'Understands voter psychology in key seats',
      'Prevents politically suicidal decisions'
    ],
    weaknesses: [
      'May sacrifice long-term economic health for short-term polling',
      'Sometimes dismisses economically necessary but unpopular policies',
      'Focus on optics over substance',
      'Can amplify populist pressures'
    ],
    biasParameters: {
      deficitTolerance: 5.0,
      debtTolerance: 105.0,
      taxRiseAversion: 0.8,
      spendingCutAversion: 0.85,
      growthPriority: 0.4,
      politicalSensitivity: 0.95,
      manifestoRigidity: 0.9,
      fiscalRuleRigidity: 0.3,
      marketSensitivity: 0.4
    },
    narrativeStyle: 'political'
  },
  {
    type: 'heterodox_economist',
    name: 'Dr Maya Okonkwo',
    title: 'Chief Economic Adviser (Heterodox)',
    description: 'Academic economist with post-Keynesian and MMT influences. Believes fiscal space is larger than orthodox economists claim.',
    background: 'PhD from SOAS, previously advised Labour leadership. Published research on fiscal multipliers and sectoral balances.',
    strengths: [
      'Challenges groupthink and conventional wisdom',
      'Strong on growth-focused policies',
      'Understands fiscal multipliers and demand dynamics',
      'Can identify opportunities others miss'
    ],
    weaknesses: [
      'May underestimate market reactions and inflation risks',
      'Sometimes overly optimistic about fiscal space',
      'Can be dismissive of debt sustainability concerns',
      'Theoretical brilliance not always politically feasible'
    ],
    biasParameters: {
      deficitTolerance: 8.0,
      debtTolerance: 130.0,
      taxRiseAversion: 0.4,
      spendingCutAversion: 0.9,
      growthPriority: 0.85,
      politicalSensitivity: 0.3,
      manifestoRigidity: 0.2,
      fiscalRuleRigidity: 0.15,
      marketSensitivity: 0.3
    },
    narrativeStyle: 'academic'
  },
  {
    type: 'fiscal_hawk',
    name: 'Lord Michael Braithwaite',
    title: 'Senior Economic Adviser (Fiscal Conservative)',
    description: 'Former IMF economist and merchant banker. Obsessed with debt reduction and market credibility. Sees fiscal profligacy everywhere.',
    background: 'Advised governments through sovereign debt crises. Believes unsustainable debt is the greatest threat to prosperity.',
    strengths: [
      'Excellent at anticipating market reactions',
      'Strong understanding of debt dynamics',
      'Prevents loss of market confidence',
      'Rigorous about long-term sustainability'
    ],
    weaknesses: [
      'May advocate austerity even during recessions',
      'Can underestimate costs of spending cuts',
      'Sometimes alarmist about debt levels',
      'May prioritise credibility over growth'
    ],
    biasParameters: {
      deficitTolerance: 1.5,
      debtTolerance: 75.0,
      taxRiseAversion: 0.5,
      spendingCutAversion: 0.15,
      growthPriority: 0.25,
      politicalSensitivity: 0.2,
      manifestoRigidity: 0.3,
      fiscalRuleRigidity: 0.98,
      marketSensitivity: 0.95
    },
    narrativeStyle: 'urgent'
  },
  {
    type: 'social_democrat',
    name: 'Rebecca Thornton',
    title: 'Social Policy Adviser',
    description: 'Former NHS trust chief executive and social policy researcher. Passionate about public services and believes austerity was disastrous.',
    background: 'Witnessed first-hand the impact of cuts on health and social care. Argues investment in people pays for itself.',
    strengths: [
      'Deep understanding of public service delivery',
      'Can predict service quality consequences',
      'Strong on equity and regional disparities',
      'Prevents penny-wise, pound-foolish cuts'
    ],
    weaknesses: [
      'May resist any cuts even when fiscally necessary',
      'Can underestimate deadweight costs of taxation',
      'Sometimes dismissive of fiscal constraints',
      'May prioritise spending over efficiency'
    ],
    biasParameters: {
      deficitTolerance: 6.0,
      debtTolerance: 110.0,
      taxRiseAversion: 0.25,
      spendingCutAversion: 0.95,
      growthPriority: 0.55,
      politicalSensitivity: 0.4,
      manifestoRigidity: 0.5,
      fiscalRuleRigidity: 0.25,
      marketSensitivity: 0.35
    },
    narrativeStyle: 'urgent'
  },
  {
    type: 'technocratic_centrist',
    name: 'James Ashworth',
    title: 'Chief Economic Adviser (Centrist)',
    description: 'Former Treasury economist and think tank director. Pragmatic, evidence-focused, and ideologically flexible. Values what works.',
    background: 'Worked at Institute for Fiscal Studies and Resolution Foundation. Advises based on empirical evidence rather than ideology.',
    strengths: [
      'Balanced and pragmatic advice',
      'Strong empirical grounding',
      'Can synthesise conflicting perspectives',
      'Respected across political spectrum'
    ],
    weaknesses: [
      'Can be indecisive or fence-sitting',
      'May lack strong convictions when needed',
      'Sometimes too cautious and risk-averse',
      'Can be seen as lacking political savvy'
    ],
    biasParameters: {
      deficitTolerance: 4.0,
      debtTolerance: 95.0,
      taxRiseAversion: 0.5,
      spendingCutAversion: 0.5,
      growthPriority: 0.5,
      politicalSensitivity: 0.5,
      manifestoRigidity: 0.6,
      fiscalRuleRigidity: 0.75,
      marketSensitivity: 0.7
    },
    narrativeStyle: 'pragmatic'
  }
];

// ============================================================================
// OPINION GENERATION ENGINE
// ============================================================================

// ============================================================================
// OPINION GENERATION ENGINE
// ============================================================================

export function generateAdviserOpinions(
  state: SimulationState,
  adviserSystem: AdviserSystemState,
  proposedChanges?: {
    revenueChange: number;
    spendingChange: number;
    projectedDeficit: number;
    fiscalRulesMet: boolean;
    manifestoBreaches: string[];
  }
): Map<AdviserType, AdviserOpinion> {
  const opinions = new Map<AdviserType, AdviserOpinion>();

  if (adviserSystem?.hiredAdvisers) {
    const hiredAdvisers: any = adviserSystem.hiredAdvisers;
    const processHiredObject = (hired: any) => {
      if (!hired || !hired.profile || !hired.profile.biasParameters) return;
      try {
        const opinion = generateSingleAdviserOpinion(state, hired, proposedChanges);
        opinions.set(hired.profile.type, opinion);
      } catch (err) {
        console.error("Error generating opinion for adviser:", hired.profile.type, err);
      }
    };

    if (hiredAdvisers instanceof Map) {
      hiredAdvisers.forEach((hired) => processHiredObject(hired));
    } else if (Array.isArray(hiredAdvisers)) {
      hiredAdvisers.forEach((item: any) => {
        if (Array.isArray(item) && item.length === 2) processHiredObject(item[1]);
        else processHiredObject(item);
      });
    } else if (typeof hiredAdvisers === 'object' && hiredAdvisers !== null) {
      Object.values(hiredAdvisers).forEach((hired: any) => processHiredObject(hired));
    }
  }

  return opinions;
}

function checkOpinionTrigger(
  trigger: AdviserOpinionTemplate['trigger'],
  state: SimulationState,
  proposedChanges?: {
    projectedDeficit: number;
    fiscalRulesMet: boolean;
    revenueChange: number;
    spendingChange: number;
  }
): boolean {
  let currentValue = 0;

  switch (trigger.metric) {
    case 'deficit':
      currentValue = proposedChanges
        ? (proposedChanges.projectedDeficit / state.economy.gdpNominal * 100)
        : (state.fiscal.deficit / state.economy.gdpNominal * 100);
      break;
    case 'debt':
      currentValue = state.fiscal.debtToGdpPercent;
      break;
    case 'growth':
      currentValue = state.economy.gdpGrowthAnnual;
      break;
    case 'inflation':
      currentValue = state.economy.inflationRate;
      break;
    case 'unemployment':
      currentValue = state.economy.unemploymentRate;
      break;
    case 'approval':
      currentValue = state.political.publicApproval;
      break;
    case 'nhsQuality':
      currentValue = state.services.nhsQuality;
      break;
    case 'giltYield':
      currentValue = state.markets.giltYield10yr;
      break;
    case 'fiscalRules':
      currentValue = (proposedChanges ? proposedChanges.fiscalRulesMet : state.fiscal.stabilityRuleMet) ? 1 : 0;
      break;
    case 'taxChange':
      currentValue = proposedChanges ? proposedChanges.revenueChange : 0;
      break;
    case 'spendingChange':
      currentValue = proposedChanges ? proposedChanges.spendingChange : 0;
      break;
    default:
      return false;
  }

  if (trigger.operator === '>') return currentValue > trigger.value;
  if (trigger.operator === '<') return currentValue < trigger.value;

  return false;
}

function generateSingleAdviserOpinion(
  state: SimulationState,
  hired: HiredAdviser,
  proposedChanges?: {
    revenueChange: number;
    spendingChange: number;
    projectedDeficit: number;
    fiscalRulesMet: boolean;
    manifestoBreaches: string[];
  }
): AdviserOpinion {
  const profile = hired.profile;

  // Calculate handy metrics for headline generation
  const deficitPercent = proposedChanges
    ? (proposedChanges.projectedDeficit / state.economy.gdpNominal * 100)
    : (state.fiscal.deficit / state.economy.gdpNominal * 100);
  const growthRate = state.economy.gdpGrowthAnnual;
  const publicApproval = state.political.publicApproval;

  const analyses: PolicyAnalysis[] = [];
  const warnings: AdviserWarning[] = [];
  const recommendations: Recommendation[] = [];
  let severityScore = 0;

  // 1. Filter relevant templates
  const relevantTemplates = ADVISER_OPINIONS.filter(t =>
    t.adviserType === profile.type &&
    checkOpinionTrigger(t.trigger, state, proposedChanges)
  );

  // 2. Map templates to AdviserOpinion objects
  relevantTemplates.forEach(template => {
    // Add to score (simple weighting)
    const severityMap = { 'critical': 3, 'warning': 2, 'caution': 1, 'neutral': 0, 'supportive': -1 };
    if (template.severity) {
      severityScore += severityMap[template.severity] || 0;
    }
    if (template.priority === 'immediate') severityScore += 3;
    if (template.priority === 'important') severityScore += 2;

    if (template.itemType === 'analysis') {
      analyses.push({
        area: template.category,
        severity: template.severity || 'neutral',
        title: template.title,
        description: template.description,
      });
    } else if (template.itemType === 'warning') {
      warnings.push({
        severity: template.severity || 'warning',
        title: template.title,
        description: template.description,
        consequences: template.consequences
      });
    } else if (template.itemType === 'recommendation') {
      recommendations.push({
        priority: template.priority || 'consider',
        action: template.recommendationAction || template.title,
        rationale: template.recommendationRationale || template.description
      });
    }
  });

  // OVERALL ASSESSMENT
  const overallSeverity: OpinionSeverity =
    severityScore > 5 ? 'critical' :
      severityScore > 2.5 ? 'warning' :
        severityScore > 0.5 ? 'caution' :
          analyses.length === 0 && warnings.length === 0 ? 'supportive' : 'neutral';

  const headline = generateHeadline(profile, overallSeverity, deficitPercent, growthRate, publicApproval);
  const summary = generateSummary(profile, analyses, warnings);

  // Generate prediction (kept logic separate for now, or could data-drive it too)
  const prediction = generatePrediction(profile, state, proposedChanges);

  return {
    adviserId: profile.type,
    timestamp: new Date(),
    overallAssessment: overallSeverity,
    headline,
    summary,
    detailedAnalysis: analyses,
    recommendations,
    warnings,
    prediction
  };
}

// ============================================================================
// NARRATIVE GENERATION FUNCTIONS
// ============================================================================



function pickVariant(variants: string[]): string {
  return variants[Math.floor(Math.random() * variants.length)];
}

function generateHeadline(profile: AdviserProfile, severity: OpinionSeverity, deficit: number, growth: number, approval: number): string {
  if (severity === 'critical') {
    switch (profile.type) {
      case 'treasury_mandarin':
        return pickVariant([
          'Chancellor, We Face a Fiscal Emergency',
          'Immediate Treasury Stabilisation Is Required',
          'Fiscal Risks Have Moved Into Red-Tier Territory',
          'Policy Credibility Is Under Acute Strain',
        ]);
      case 'fiscal_hawk':
        return pickVariant([
          'Urgent Action Required to Avert Crisis',
          'Debt Dynamics Now Signal Clear Danger',
          'Market Discipline Window Is Narrowing Fast',
          'Delay Now Raises the Cost of Correction',
        ]);
      case 'political_operator':
        return pickVariant([
          'Political Catastrophe Looms Without Course Correction',
          'Marginals Are Flashing Red Across the Map',
          'This Trajectory Risks a Full Electoral Collapse',
          'Backbench and Voter Patience Is Running Out',
        ]);
      case 'social_democrat':
        return pickVariant([
          'Public Services Collapsing - Immediate Investment Essential',
          'Service Pressure Is Now a National Emergency',
          'The Social Settlement Is Starting to Fracture',
          'Frontline Capacity Is Failing Under Current Funding',
        ]);
      case 'heterodox_economist':
        return pickVariant([
          'Dangerous Austerity Mindset Risks Recession',
          'Demand Conditions Now Require Active Fiscal Support',
          'Contractionary Bias Is Becoming Self-Defeating',
          'Macroeconomic Stance Is Too Tight for Current Conditions',
        ]);
      default:
        return pickVariant([
          'Serious Concerns Across Multiple Areas',
          'High-Risk Signals Across Economy and Politics',
          'Current Policy Mix Is Under Severe Pressure',
        ]);
    }
  } else if (severity === 'warning') {
    switch (profile.type) {
      case 'treasury_mandarin':
        return pickVariant([
          'Fiscal Trajectory Requires Attention',
          'Treasury Guardrails Are Being Tested',
          'Medium-Term Fiscal Path Needs Tightening',
          'Credibility Risks Are Building at the Margin',
        ]);
      case 'fiscal_hawk':
        return pickVariant([
          'Deficit Path Unsustainable - Act Now',
          'Early Correction Would Avoid Harsher Adjustment Later',
          'Debt Risk Premium Is Drifting Upward',
          'Consolidation Timetable Needs Reinforcement',
        ]);
      case 'political_operator':
        return pickVariant([
          'Electoral Vulnerabilities Emerging',
          'Opposition Attack Lines Are Getting Stronger',
          'Backbench Nerves Are Rising in Key Cohorts',
          'Marginal Seat Exposure Is Widening',
        ]);
      case 'social_democrat':
        return pickVariant([
          'Underinvestment Harming Services',
          'Frontline Delivery Is Slipping Month by Month',
          'Service Quality Metrics Point to Avoidable Damage',
          'Social Outcomes Are Deteriorating Under Constraint',
        ]);
      case 'heterodox_economist':
        return pickVariant([
          'Growth Underperformance Demands Response',
          'Current Stance Risks Locking In Low Productivity',
          'Demand Weakness Is Becoming Structural',
          'Countercyclical Action Would Improve Fiscal Outcomes',
        ]);
      default:
        return pickVariant([
          'Several Areas Require Action',
          'Policy Adjustments Recommended Across Key Metrics',
          'Risks Manageable but Rising',
        ]);
    }
  } else if (severity === 'supportive') {
    switch (profile.type) {
      case 'treasury_mandarin':
        return pickVariant([
          'Fiscally Prudent Approach, Subject to Monitoring',
          'Current Settings Broadly Consistent with Stability',
          'Treasury Position Is Defensible at Present',
          'Near-Term Fiscal Control Appears Intact',
        ]);
      case 'fiscal_hawk':
        return pickVariant([
          'Responsible Fiscal Management',
          'Debt and Deficit Signals Are Improving',
          'Consolidation Discipline Is Holding',
          'Markets Likely to View This as Constructive',
        ]);
      case 'political_operator':
        return pickVariant([
          'Politically Defensible Position',
          'This Is Saleable in Most Battleground Seats',
          'Limited Political Exposure Under Current Conditions',
          'Narrative Holds if Delivery Stays Consistent',
        ]);
      case 'social_democrat':
        return pickVariant([
          'Progress on Service Investment',
          'Frontline Indicators Show Tentative Improvement',
          'Social Outcomes Are Stabilising',
          'Service Funding Direction Is Credible for Now',
        ]);
      case 'heterodox_economist':
        return pickVariant([
          'Sound Macroeconomic Framework',
          'Policy Mix Is Better Aligned with Demand Conditions',
          'Growth and Stability Objectives Are More Coherent',
          'Current Stance Supports a Softer Landing',
        ]);
      default:
        return pickVariant([
          'Broadly Sound Approach',
          'No Immediate Macro Alarms Identified',
          'Position Appears Stable in the Near Term',
        ]);
    }
  } else {
    return pickVariant([
      'Mixed Assessment with Concerns',
      'Balanced Picture, but Material Risks Remain',
      'Policy Mix Produces Both Gains and Exposures',
    ]);
  }
}

function generateSummary(profile: AdviserProfile, analyses: PolicyAnalysis[], warnings: AdviserWarning[]): string {
  if (analyses.length === 0 && warnings.length === 0) {
    switch (profile.type) {
      case 'treasury_mandarin':
        return pickVariant([
          'Current position is within acceptable parameters, though vigilance remains essential.',
          'No immediate red flags, but we should preserve optionality and monitor incoming data closely.',
          'The framework is holding for now; disciplined execution remains the priority.',
        ]);
      case 'fiscal_hawk':
        return pickVariant([
          'Fiscal discipline is being maintained. Continue this prudent approach.',
          'Debt and deficit indicators are not deteriorating materially; keep tightening bias where possible.',
          'Current settings are acceptable, provided we avoid policy drift.',
        ]);
      case 'political_operator':
        return pickVariant([
          'No immediate political dangers, but remain alert to changing sentiment.',
          'The line is currently defensible, though voter tolerance can move quickly.',
          'Backbench mood is manageable for now; avoid unforced messaging errors.',
        ]);
      case 'social_democrat':
        return pickVariant([
          'Service investment appears adequate for now, but we must not become complacent.',
          'There are early signs of stabilisation, though frontline resilience remains fragile.',
          'Conditions are not yet critical, but sustained pressure could reverse progress quickly.',
        ]);
      case 'heterodox_economist':
        return pickVariant([
          'Macroeconomic balances are reasonable. Consider opportunities for growth-enhancing investment.',
          'Demand and inflation signals are currently compatible with a steady policy stance.',
          'This is a workable macro position; selective investment could improve medium-term capacity.',
        ]);
      default:
        return pickVariant([
          'Overall position is satisfactory.',
          'No material deterioration detected at present.',
          'The current strategy is broadly holding.',
        ]);
    }
  }

  const topConcerns = analyses
    .filter(a => a.severity === 'critical' || a.severity === 'warning')
    .slice(0, 2);

  if (topConcerns.length === 0) {
    return 'Some areas warrant attention, but no critical issues identified.';
  }

  const concerns = topConcerns.map(a => a.area).join(' and ');

  switch (profile.type) {
    case 'treasury_mandarin':
      return pickVariant([
        `I must draw your attention to concerns regarding ${concerns}. These require prompt consideration to maintain fiscal credibility.`,
        `Our principal vulnerabilities currently sit in ${concerns}. Early action would reduce downstream policy cost.`,
        `The data indicates pressure points in ${concerns}; these should be addressed before they harden into structural risks.`,
      ]);
    case 'fiscal_hawk':
      return pickVariant([
        `Serious problems with ${concerns}. Delayed action will only magnify the eventual cost of adjustment.`,
        `Current signals on ${concerns} are adverse. Acting now is cheaper than acting under market stress later.`,
        `We are underestimating the compounding risk in ${concerns}; postponement would be an error.`,
      ]);
    case 'political_operator':
      return pickVariant([
        `Chancellor, we have political exposure on ${concerns}. This could lose us the election if not addressed.`,
        `Voters and backbenchers are converging on ${concerns} as a weakness. We need a clearer defensive line.`,
        `Our electoral risk now concentrates around ${concerns}; this needs visible corrective action.`,
      ]);
    case 'social_democrat':
      return pickVariant([
        `The data on ${concerns} shows we are failing our obligations to the public. Investment is essential.`,
        `Frontline evidence on ${concerns} is worsening. Without intervention, social costs will rise materially.`,
        `Current outcomes in ${concerns} are not sustainable for households or services. Funding and reform are both required.`,
      ]);
    case 'heterodox_economist':
      return pickVariant([
        `Issues with ${concerns} suggest misguided priorities. Rethink the framework.`,
        `The pattern in ${concerns} points to an excessively restrictive policy mix.`,
        `Outcomes in ${concerns} indicate we are choosing low-growth settings unnecessarily.`,
      ]);
    default:
      return `Key concerns: ${concerns}.`;
  }
}

function generatePrediction(
  profile: AdviserProfile,
  state: SimulationState,
  proposedChanges?: any
): Prediction | undefined {
  const bias = profile.biasParameters;
  const projectedDeficitPct = proposedChanges?.projectedDeficit && state.economy?.gdpNominal
    ? (proposedChanges.projectedDeficit / state.economy.gdpNominal) * 100
    : undefined;

  // Each adviser type makes predictions based on their worldview
  if (profile.type === 'fiscal_hawk' && state.fiscal.debtToGdpPercent > bias.debtTolerance + 10) {
    return {
      timeframe: '12 months',
      likelihood: 'likely',
      outcome: pickVariant([
        'Without fiscal consolidation, gilt yields will exceed 7% and we will face a market crisis requiring emergency measures.',
        'Debt dynamics imply a materially higher risk premium over the next year unless consolidation starts quickly.',
        'Absent a credible adjustment path, markets are likely to reprice UK risk and tighten financing conditions further.',
      ])
    };
  }

  if (profile.type === 'political_operator' && state.political.publicApproval < 35) {
    return {
      timeframe: '6 months',
      likelihood: 'almost_certain',
      outcome: pickVariant([
        'Polling will continue deteriorating. We will lose marginal seats in any election held this year.',
        'Current trajectory implies concentrated losses in commuter and suburban marginals within two quarters.',
        'Without a visible reset, approval erosion is likely to accelerate in key battleground constituencies.',
      ])
    };
  }

  if (profile.type === 'heterodox_economist' && state.economy.gdpGrowthAnnual < 0.5) {
    return {
      timeframe: '9 months',
      likelihood: 'likely',
      outcome: pickVariant([
        'Continued weak growth will become structural without fiscal stimulus. Tax revenues will disappoint, worsening deficit paradoxically.',
        'Persistently weak demand risks entrenching low productivity and depressing the revenue base.',
        'Without countercyclical support, sub-trend growth is likely to become self-reinforcing over the medium term.',
      ])
    };
  }

  if (profile.type === 'social_democrat' && state.services.nhsQuality < 45) {
    return {
      timeframe: '12 months',
      likelihood: 'likely',
      outcome: pickVariant([
        'NHS will face winter crisis with record waiting lists. Public anger will force policy U-turn, but damage to health outcomes will be lasting.',
        'Service pressure is likely to intensify into winter, with delayed care translating into measurable outcome deterioration.',
        'Without intervention, NHS strain is likely to trigger emergency measures and politically costly reversals.',
      ])
    };
  }

  if (profile.type === 'treasury_mandarin' && projectedDeficitPct !== undefined && projectedDeficitPct > bias.deficitTolerance + 1) {
    return {
      timeframe: '6 months',
      likelihood: 'possible',
      outcome: pickVariant([
        'If this package is implemented as drafted, fiscal headroom is likely to narrow materially by the next review window.',
        'Current proposals imply reduced resilience to adverse shocks unless offsetting measures are identified.',
        'Treasury flexibility is likely to tighten over the next two quarters under this projected deficit path.',
      ])
    };
  }

  return undefined;
}

// ============================================================================
// ADVISER RELATIONSHIP & ACCURACY TRACKING
// ============================================================================

export function updateAdviserRelationship(
  hired: HiredAdviser,
  adviceFollowed: boolean
): HiredAdviser {
  const updated = { ...hired };

  if (adviceFollowed) {
    updated.adviceFollowedCount++;
  } else {
    updated.adviceIgnoredCount++;
  }

  // Calculate relationship based on follow rate
  const totalAdvice = updated.adviceFollowedCount + updated.adviceIgnoredCount;
  const followRate = updated.adviceFollowedCount / totalAdvice;

  if (followRate > 0.7) {
    updated.relationship = 'excellent';
  } else if (followRate > 0.5) {
    updated.relationship = 'good';
  } else if (followRate > 0.3) {
    updated.relationship = 'strained';
  } else {
    updated.relationship = 'poor';
  }

  return updated;
}

export function checkAdviserResignation(hired: HiredAdviser): boolean {
  // Poor relationship + lots of ignored advice = resignation risk
  if (hired.relationship === 'poor' && hired.adviceIgnoredCount > 8) {
    return Math.random() < 0.3; // 30% chance each check
  }
  return false;
}

export function updateAdviserAccuracy(
  hired: HiredAdviser,
  predictionAccurate: boolean
): HiredAdviser {
  const updated = { ...hired };

  if (predictionAccurate) {
    updated.accuratePredictions++;
  } else {
    updated.inaccuratePredictions++;
  }

  return updated;
}

export function getAdviserAccuracyRate(hired: HiredAdviser): number {
  const total = hired.accuratePredictions + hired.inaccuratePredictions;
  if (total === 0) return 0.5; // Unknown
  return hired.accuratePredictions / total;
}

// ============================================================================
// UI COMPONENTS
// ============================================================================

interface AdviserSidebarProps {
  advisers: Map<AdviserType, HiredAdviser>;
  opinions: Map<AdviserType, AdviserOpinion>;
  onShowDetail: (type: AdviserType) => void;
}

export const AdviserSidebar: React.FC<AdviserSidebarProps> = ({ advisers, opinions, onShowDetail }) => {
  // Handle both Map and plain object
  let advisersList: HiredAdviser[] = [];
  const advisersData: any = advisers;
  if (advisersData instanceof Map) {
    advisersList = Array.from(advisersData.values());
  } else if (Array.isArray(advisersData)) {
    // Handle serialized Map entries
    if (advisersData.length > 0 && Array.isArray(advisersData[0]) && advisersData[0].length === 2) {
      advisersList = advisersData.map((entry: any) => entry[1]);
    } else {
      advisersList = advisersData as any;
    }
  } else if (typeof advisersData === 'object' && advisersData !== null) {
    advisersList = Object.values(advisersData);
  }

  // Filter out any potential invalid entries
  advisersList = advisersList.filter(h => h && h.profile);

  if (advisersList.length === 0) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Brain className="w-5 h-5 text-slate-400" />
          <h3 className="font-semibold text-slate-700">Economic Advisers</h3>
        </div>
        <p className="text-sm text-slate-500">
          No advisers appointed. Consider hiring economic advice from the adviser management screen.
        </p>
      </div>
    );
  }

  const getOpinion = (type: AdviserType) => {
    if (opinions instanceof Map) {
      return opinions.get(type);
    } else if (Array.isArray(opinions)) {
      const entry = (opinions as any).find((item: any) => Array.isArray(item) && item[0] === type);
      return entry ? entry[1] : undefined;
    } else if (typeof opinions === 'object' && opinions !== null) {
      return (opinions as any)[type];
    }
    return undefined;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Brain className="w-5 h-5 text-slate-700" />
        <h3 className="font-semibold text-slate-900">Adviser Assessment</h3>
      </div>

      <div className="space-y-3">
        {advisersList.map((hired) => {
          const opinion = getOpinion(hired.profile.type);
          if (!opinion) return null;

          return (
            <div
              key={hired.profile.type}
              className="border border-slate-200 rounded-md p-3 hover:bg-slate-50 cursor-pointer transition-colors"
              onClick={() => onShowDetail(hired.profile.type)}
            >
              <div className="flex items-start justify-between mb-1">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {getSeverityIcon(opinion.overallAssessment)}
                    <span className="font-medium text-sm text-slate-900">{hired.profile.name}</span>
                  </div>
                  <span className="text-xs text-slate-500">{hired.profile.title}</span>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${getSeverityBadgeClass(opinion.overallAssessment)}`}>
                  {getSeverityLabel(opinion.overallAssessment)}
                </span>
              </div>

              <p className="text-sm text-slate-700 mt-2 line-clamp-2">
                {opinion.summary}
              </p>

              {opinion.warnings.length > 0 && (
                <div className="mt-2 flex items-center gap-1 text-xs text-amber-700">
                  <AlertTriangle className="w-3 h-3" />
                  <span>{opinion.warnings.length} warning{opinion.warnings.length !== 1 ? 's' : ''}</span>
                </div>
              )}

              <div className="mt-2 text-xs text-blue-600 font-medium">
                Click for detailed analysis →
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface AdviserModalProps {
  hired: HiredAdviser;
  opinion: AdviserOpinion;
  onClose: () => void;
}

export const AdviserModal: React.FC<AdviserModalProps> = ({ hired, opinion, onClose }) => {
  const [activeTab, setActiveTab] = useState<'analysis' | 'recommendations' | 'profile'>('analysis');

  const accuracyRate = getAdviserAccuracyRate(hired);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b border-slate-200 p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                {getSeverityIcon(opinion.overallAssessment, 'w-6 h-6')}
                <h2 className="text-2xl font-bold text-slate-900">{opinion.headline}</h2>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <span className="font-medium text-slate-900">{hired.profile.name}</span>
                <span>•</span>
                <span>{hired.profile.title}</span>
                <span>•</span>
                <span className={`px-2 py-1 rounded text-xs ${getRelationshipBadgeClass(hired.relationship)}`}>
                  {hired.relationship.charAt(0).toUpperCase() + hired.relationship.slice(1)} relationship
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200 px-6">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('analysis')}
              className={`py-3 border-b-2 font-medium text-sm transition-colors ${activeTab === 'analysis'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
            >
              Analysis & Warnings
            </button>
            <button
              onClick={() => setActiveTab('recommendations')}
              className={`py-3 border-b-2 font-medium text-sm transition-colors ${activeTab === 'recommendations'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
            >
              Recommendations
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`py-3 border-b-2 font-medium text-sm transition-colors ${activeTab === 'profile'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
            >
              Adviser Profile
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'analysis' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Summary Assessment</h3>
                <p className="text-slate-700">{opinion.summary}</p>
              </div>

              {opinion.warnings.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Warnings</h3>
                  <div className="space-y-3">
                    {opinion.warnings.map((warning, idx) => (
                      <div
                        key={idx}
                        className={`border-l-4 ${getSeverityBorderClass(warning.severity)} bg-slate-50 p-4 rounded-r-md`}
                      >
                        <div className="flex items-start gap-2 mb-1">
                          {getSeverityIcon(warning.severity)}
                          <h4 className="font-semibold text-slate-900">{warning.title}</h4>
                        </div>
                        <p className="text-sm text-slate-700 ml-6">{warning.description}</p>
                        {warning.consequences && (
                          <p className="text-sm text-slate-600 ml-6 mt-2 italic">
                            Consequences: {warning.consequences}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {opinion.detailedAnalysis.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Detailed Analysis</h3>
                  <div className="space-y-4">
                    {opinion.detailedAnalysis.map((analysis, idx) => (
                      <div
                        key={idx}
                        className="border border-slate-200 rounded-md p-4"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getSeverityIcon(analysis.severity, 'w-5 h-5')}
                            <h4 className="font-semibold text-slate-900">{analysis.title}</h4>
                          </div>
                          <span className="text-xs text-slate-500 uppercase">{analysis.area}</span>
                        </div>
                        <p className="text-sm text-slate-700">{analysis.description}</p>
                        {analysis.quantitativeReasoning && (
                          <p className="text-xs text-slate-600 mt-2 font-mono bg-slate-50 p-2 rounded">
                            {analysis.quantitativeReasoning}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {opinion.prediction && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">Prediction</h4>
                  <div className="flex items-center gap-2 text-sm text-blue-800 mb-2">
                    <span className="font-medium">Timeframe: {opinion.prediction.timeframe}</span>
                    <span>•</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${getLikelihoodBadgeClass(opinion.prediction.likelihood)}`}>
                      {opinion.prediction.likelihood.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-blue-800">{opinion.prediction.outcome}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'recommendations' && (
            <div className="space-y-4">
              {opinion.recommendations.length === 0 ? (
                <p className="text-slate-600">No specific recommendations at this time. Continue monitoring the situation.</p>
              ) : (
                opinion.recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className={`border-l-4 ${getPriorityBorderClass(rec.priority)} bg-slate-50 p-4 rounded-r-md`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {getPriorityIcon(rec.priority)}
                      <span className={`text-xs px-2 py-1 rounded ${getPriorityBadgeClass(rec.priority)}`}>
                        {rec.priority}
                      </span>
                    </div>
                    <h4 className="font-semibold text-slate-900 mb-1">{rec.action}</h4>
                    <p className="text-sm text-slate-700 mb-2">{rec.rationale}</p>
                    {rec.expectedOutcome && (
                      <p className="text-sm text-slate-600 italic">Expected outcome: {rec.expectedOutcome}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Background</h3>
                <p className="text-slate-700">{hired.profile.background}</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Description</h3>
                <p className="text-slate-700">{hired.profile.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-green-900 mb-2">Strengths</h3>
                  <ul className="space-y-1">
                    {hired.profile.strengths.map((strength, idx) => (
                      <li key={idx} className="flex gap-2 text-sm text-slate-700">
                        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-amber-900 mb-2">Weaknesses</h3>
                  <ul className="space-y-1">
                    {hired.profile.weaknesses.map((weakness, idx) => (
                      <li key={idx} className="flex gap-2 text-sm text-slate-700">
                        <XCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <span>{weakness}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-md p-4">
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Track Record</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-600">Advice followed:</span>
                    <span className="ml-2 font-semibold text-green-700">{hired.adviceFollowedCount}</span>
                  </div>
                  <div>
                    <span className="text-slate-600">Advice ignored:</span>
                    <span className="ml-2 font-semibold text-amber-700">{hired.adviceIgnoredCount}</span>
                  </div>
                  <div>
                    <span className="text-slate-600">Accurate predictions:</span>
                    <span className="ml-2 font-semibold text-green-700">{hired.accuratePredictions}</span>
                  </div>
                  <div>
                    <span className="text-slate-600">Inaccurate predictions:</span>
                    <span className="ml-2 font-semibold text-red-700">{hired.inaccuratePredictions}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-600">Accuracy rate:</span>
                    <span className="ml-2 font-semibold text-blue-700">
                      {accuracyRate > 0 ? `${(accuracyRate * 100).toFixed(0)}%` : 'Insufficient data'}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-600">Appointed:</span>
                    <span className="ml-2 font-semibold text-slate-900">Month {hired.hiredMonth}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 p-4 bg-slate-50">
          <button
            onClick={onClose}
            className="w-full bg-slate-900 text-white py-2 px-4 rounded-md hover:bg-slate-800 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

interface AdviserManagementScreenProps {
  currentMonth: number;
  adviserSystem: AdviserSystemState;
  onHire: (type: AdviserType) => void;
  onFire: (type: AdviserType) => void;
  onBack: () => void;
}

export const AdviserManagementScreen: React.FC<AdviserManagementScreenProps> = ({
  currentMonth,
  adviserSystem,
  onHire,
  onFire,
  onBack
}) => {
  const [selectedAdviser, setSelectedAdviser] = useState<AdviserProfile | null>(null);
  const [confirmFire, setConfirmFire] = useState<AdviserType | null>(null);

  // Handle hiredAdvisers as Map, Array (entries), or plain object
  const hiredAdvisers: any = adviserSystem?.hiredAdvisers;
  let hiredAdvisersList: HiredAdviser[] = [];
  let hiredAdvisersSize = 0;

  if (hiredAdvisers instanceof Map) {
    hiredAdvisersList = Array.from(hiredAdvisers.values());
    hiredAdvisersSize = hiredAdvisers.size;
  } else if (Array.isArray(hiredAdvisers)) {
    // Check if it's an array of entries [[key, value], ...]
    if (hiredAdvisers.length > 0 && Array.isArray(hiredAdvisers[0]) && hiredAdvisers[0].length === 2) {
      hiredAdvisersList = hiredAdvisers.map((entry: any) => entry[1]);
    } else {
      hiredAdvisersList = hiredAdvisers;
    }
    hiredAdvisersSize = hiredAdvisersList.length;
  } else if (typeof hiredAdvisers === 'object' && hiredAdvisers !== null) {
    hiredAdvisersList = Object.values(hiredAdvisers);
    hiredAdvisersSize = hiredAdvisersList.length;
  }

  // Filter out any potential invalid entries
  hiredAdvisersList = hiredAdvisersList.filter(h => h && h.profile);
  // Recalculate size after filtering
  hiredAdvisersSize = hiredAdvisersList.length;

  const maxAdvisers = 3;
  const canHireMore = hiredAdvisersSize < maxAdvisers;

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <button
            onClick={onBack}
            className="text-slate-600 hover:text-slate-900 font-medium flex items-center gap-2"
          >
            ← Back to Game
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Economic Adviser Management</h1>
          <p className="text-slate-600">
            Appoint up to {maxAdvisers} economic advisers to provide guidance on policy decisions.
            Currently appointed: {hiredAdvisersSize}/{maxAdvisers}
          </p>
        </div>

        {/* Currently Hired Advisers */}
        {hiredAdvisersSize > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Current Advisory Team</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {hiredAdvisersList.map((hired) => (
                <div
                  key={hired.profile.type}
                  className="border border-slate-200 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-slate-900">{hired.profile.name}</h3>
                      <p className="text-sm text-slate-600">{hired.profile.title}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${getRelationshipBadgeClass(hired.relationship)}`}>
                      {hired.relationship}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Advice followed:</span>
                      <span className="font-semibold">{hired.adviceFollowedCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Advice ignored:</span>
                      <span className="font-semibold">{hired.adviceIgnoredCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Months in post:</span>
                      <span className="font-semibold">{currentMonth - hired.hiredMonth}</span>
                    </div>
                  </div>

                  {confirmFire === hired.profile.type ? (
                    <div className="space-y-2">
                      <p className="text-sm text-red-700 font-medium">Confirm dismissal?</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            onFire(hired.profile.type);
                            setConfirmFire(null);
                          }}
                          className="flex-1 bg-red-600 text-white py-1 px-3 rounded text-sm hover:bg-red-700 transition-colors"
                        >
                          Yes, dismiss
                        </button>
                        <button
                          onClick={() => setConfirmFire(null)}
                          className="flex-1 bg-slate-200 text-slate-700 py-1 px-3 rounded text-sm hover:bg-slate-300 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmFire(hired.profile.type)}
                      className="w-full bg-red-100 text-red-700 py-2 px-4 rounded hover:bg-red-200 transition-colors text-sm font-medium"
                    >
                      Dismiss Adviser
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Available Advisers */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">
            {canHireMore ? 'Available Advisers' : 'All Adviser Slots Filled'}
          </h2>

          {!canHireMore && (
            <p className="text-slate-600 mb-4">
              You must dismiss an existing adviser before hiring a new one.
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ADVISER_PROFILES.filter((profile) => {
              const hiredAdvisers = adviserSystem?.hiredAdvisers;
              if (!hiredAdvisers) return true;
              if (hiredAdvisers instanceof Map) {
                return !hiredAdvisers.has(profile.type);
              } else if (typeof hiredAdvisers === 'object') {
                // Plain object from JSON
                return !Object.values(hiredAdvisers).some((h: any) => h.profile?.type === profile.type);
              }
              return true;
            }).map((profile) => (
              <div
                key={profile.type}
                className="border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors"
              >
                <h3 className="font-bold text-slate-900 mb-1">{profile.name}</h3>
                <p className="text-sm text-slate-600 mb-3">{profile.title}</p>
                <p className="text-sm text-slate-700 mb-4 line-clamp-3">{profile.description}</p>

                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedAdviser(profile)}
                    className="flex-1 bg-slate-100 text-slate-700 py-2 px-3 rounded text-sm hover:bg-slate-200 transition-colors"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => onHire(profile.type)}
                    disabled={!canHireMore}
                    className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-colors ${canHireMore
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                  >
                    Appoint
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedAdviser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{selectedAdviser.name}</h2>
                <p className="text-slate-600">{selectedAdviser.title}</p>
              </div>
              <button
                onClick={() => setSelectedAdviser(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Background</h3>
                <p className="text-slate-700 text-sm">{selectedAdviser.background}</p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Description</h3>
                <p className="text-slate-700 text-sm">{selectedAdviser.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-green-900 mb-2">Strengths</h3>
                  <ul className="space-y-1">
                    {selectedAdviser.strengths.map((strength, idx) => (
                      <li key={idx} className="flex gap-2 text-sm text-slate-700">
                        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-amber-900 mb-2">Weaknesses</h3>
                  <ul className="space-y-1">
                    {selectedAdviser.weaknesses.map((weakness, idx) => (
                      <li key={idx} className="flex gap-2 text-sm text-slate-700">
                        <XCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <span>{weakness}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setSelectedAdviser(null)}
                className="flex-1 bg-slate-200 text-slate-700 py-2 px-4 rounded hover:bg-slate-300 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  onHire(selectedAdviser.type);
                  setSelectedAdviser(null);
                }}
                disabled={!canHireMore}
                className={`flex-1 py-2 px-4 rounded font-medium transition-colors ${canHireMore
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  }`}
              >
                Appoint {selectedAdviser.name}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// HELPER FUNCTIONS FOR UI
// ============================================================================

function getSeverityIcon(severity: OpinionSeverity, className: string = 'w-5 h-5') {
  switch (severity) {
    case 'critical':
      return <AlertTriangle className={`${className} text-red-600`} />;
    case 'warning':
      return <AlertTriangle className={`${className} text-amber-600`} />;
    case 'caution':
      return <Info className={`${className} text-yellow-600`} />;
    case 'supportive':
      return <CheckCircle className={`${className} text-green-600`} />;
    default:
      return <Info className={`${className} text-slate-600`} />;
  }
}

function getSeverityLabel(severity: OpinionSeverity): string {
  return severity.charAt(0).toUpperCase() + severity.slice(1);
}

function getSeverityBadgeClass(severity: OpinionSeverity): string {
  switch (severity) {
    case 'critical':
      return 'bg-red-100 text-red-800';
    case 'warning':
      return 'bg-amber-100 text-amber-800';
    case 'caution':
      return 'bg-yellow-100 text-yellow-800';
    case 'supportive':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-slate-100 text-slate-800';
  }
}

function getSeverityBorderClass(severity: OpinionSeverity): string {
  switch (severity) {
    case 'critical':
      return 'border-red-500';
    case 'warning':
      return 'border-amber-500';
    case 'caution':
      return 'border-yellow-500';
    case 'supportive':
      return 'border-green-500';
    default:
      return 'border-slate-500';
  }
}

function getRelationshipBadgeClass(relationship: 'excellent' | 'good' | 'strained' | 'poor'): string {
  switch (relationship) {
    case 'excellent':
      return 'bg-green-100 text-green-800';
    case 'good':
      return 'bg-blue-100 text-blue-800';
    case 'strained':
      return 'bg-amber-100 text-amber-800';
    case 'poor':
      return 'bg-red-100 text-red-800';
  }
}

function getLikelihoodBadgeClass(likelihood: 'almost_certain' | 'likely' | 'possible' | 'unlikely'): string {
  switch (likelihood) {
    case 'almost_certain':
      return 'bg-red-100 text-red-800';
    case 'likely':
      return 'bg-amber-100 text-amber-800';
    case 'possible':
      return 'bg-yellow-100 text-yellow-800';
    case 'unlikely':
      return 'bg-slate-100 text-slate-800';
  }
}

function getPriorityIcon(priority: 'immediate' | 'important' | 'consider') {
  switch (priority) {
    case 'immediate':
      return <AlertTriangle className="w-5 h-5 text-red-600" />;
    case 'important':
      return <TrendingUp className="w-5 h-5 text-amber-600" />;
    case 'consider':
      return <Info className="w-5 h-5 text-blue-600" />;
  }
}

function getPriorityBadgeClass(priority: 'immediate' | 'important' | 'consider'): string {
  switch (priority) {
    case 'immediate':
      return 'bg-red-100 text-red-800 font-medium';
    case 'important':
      return 'bg-amber-100 text-amber-800 font-medium';
    case 'consider':
      return 'bg-blue-100 text-blue-800';
  }
}

function getPriorityBorderClass(priority: 'immediate' | 'important' | 'consider'): string {
  switch (priority) {
    case 'immediate':
      return 'border-red-500';
    case 'important':
      return 'border-amber-500';
    case 'consider':
      return 'border-blue-500';
  }
}

// ============================================================================
// INITIALIZATION HELPERS
// ============================================================================

export function createInitialAdviserSystem(): AdviserSystemState {
  return {
    hiredAdvisers: new Map(),
    availableAdvisers: new Set(ADVISER_PROFILES.map(p => p.type)),
    currentOpinions: new Map(),
    showDetailedView: null,
    adviserEvents: []
  };
}

export function hireAdviser(
  system: AdviserSystemState,
  adviserType: AdviserType,
  currentMonth: number
): AdviserSystemState {
  const profile = ADVISER_PROFILES.find(p => p.type === adviserType);
  if (!profile) return system;

  const hired: HiredAdviser = {
    profile,
    hiredMonth: currentMonth,
    adviceFollowedCount: 0,
    adviceIgnoredCount: 0,
    accuratePredictions: 0,
    inaccuratePredictions: 0,
    relationship: 'good'
  };

  const newHiredAdvisers = new Map(system.hiredAdvisers);
  newHiredAdvisers.set(adviserType, hired);

  const newAvailableAdvisers = new Set(system.availableAdvisers);
  newAvailableAdvisers.delete(adviserType);

  return {
    ...system,
    hiredAdvisers: newHiredAdvisers,
    availableAdvisers: newAvailableAdvisers
  };
}

export function fireAdviser(
  system: AdviserSystemState,
  adviserType: AdviserType
): AdviserSystemState {
  const newHiredAdvisers = new Map(system.hiredAdvisers);
  newHiredAdvisers.delete(adviserType);

  const newAvailableAdvisers = new Set(system.availableAdvisers);
  newAvailableAdvisers.add(adviserType);

  const newCurrentOpinions = new Map(system.currentOpinions);
  newCurrentOpinions.delete(adviserType);

  return {
    ...system,
    hiredAdvisers: newHiredAdvisers,
    availableAdvisers: newAvailableAdvisers,
    currentOpinions: newCurrentOpinions
  };
}
