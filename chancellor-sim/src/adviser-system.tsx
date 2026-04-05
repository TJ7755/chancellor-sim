import React, { useState } from 'react';
import { X, AlertTriangle, CheckCircle, TrendingUp, Info, Brain, XCircle } from 'lucide-react';
import { ADVISER_OPINIONS, AdviserOpinionTemplate } from './data/adviser-opinions';
import {
  AdviserConflict,
  ConflictResolutionRecord,
  AdviserSynergy,
  AdviserIntervention,
} from './game-integration';

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
  deficitTolerance: number; // % of GDP where they start warning (e.g., 3.0 = 3%)
  debtTolerance: number; // % of GDP debt ceiling (e.g., 100.0 = 100%)
  taxRiseAversion: number; // 0-1 (0 = loves tax rises, 1 = hates them)
  spendingCutAversion: number; // 0-1 (0 = loves cuts, 1 = hates them)
  growthPriority: number; // 0-1 weight on growth vs stability
  politicalSensitivity: number; // 0-1 how much they care about electoral consequences
  manifestoRigidity: number; // 0-1 how much manifesto breaches matter
  fiscalRuleRigidity: number; // 0-1 how much fiscal rule breaches matter
  marketSensitivity: number; // 0-1 concern about gilt yields/market reactions
}

export interface AdviserRedLine {
  field: string;
  threshold: number;
  direction: 'above' | 'below';
  loyaltyPenalty: number;
  description: string;
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
  pmRelationshipModifier: number;
  ideologicalRedLines: AdviserRedLine[];
  conflictsWith: string[];
  synergyWith: string[];
  interventionCooldownTurns: number;
  scandalProbabilityPerTurn: number;
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

export interface HiredAdviserState {
  loyaltyScore: number;
  ignoredRecommendationStreak: number;
  totalIgnoredRecommendations: number;
  totalFollowedRecommendations: number;
  turnsInPost: number;
  isBriefingAgainst: boolean;
  activeInterventionCooldown: number;
  resignationWarningIssued: boolean;
  provenTrackRecord: boolean;
  lastRecommendationCategory: string | null;
  lastRecommendationFollowed: boolean | null;
  redLineBreachStreak: number;
}

export interface HiredAdviser {
  profile: AdviserProfile;
  hiredMonth: number;
  adviceFollowedCount: number;
  adviceIgnoredCount: number;
  accuratePredictions: number;
  inaccuratePredictions: number;
  relationship: 'excellent' | 'good' | 'strained' | 'poor';
  state: HiredAdviserState;
}

export interface AdviserSystemState {
  hiredAdvisers: Map<AdviserType, HiredAdviser>;
  availableAdvisers: Set<AdviserType>;
  currentOpinions: Map<AdviserType, AdviserOpinion>;
  showDetailedView: AdviserType | null;
  adviserEvents: AdviserEvent[];
  activeConflicts: AdviserConflict[];
  conflictResolutionHistory: ConflictResolutionRecord[];
  activeSynergies: AdviserSynergy[];
  pendingInterventions: AdviserIntervention[];
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
    description:
      'A career Treasury official with 30 years of experience. Deeply orthodox, risk-averse, and committed to sound money principles.',
    background:
      'Oxbridge PPE, rose through the Treasury ranks advising Chancellors of all parties. Commanded respect in Whitehall for rigorous analysis.',
    strengths: [
      'Encyclopaedic knowledge of Treasury procedures',
      'Excellent at identifying fiscal risks',
      'Strong relationships with Bank of England and OBR',
      'Prevents reckless policy mistakes',
    ],
    weaknesses: [
      'Excessively risk-averse, may miss opportunities',
      'Resistant to unconventional policies',
      'Bias towards inaction and status quo',
      'Can be dismissive of political realities',
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
      marketSensitivity: 0.9,
    },
    narrativeStyle: 'formal',
    pmRelationshipModifier: 2,
    ideologicalRedLines: [
      { field: 'fiscal.deficitPctGDP', threshold: 6, direction: 'above', loyaltyPenalty: 5, description: 'Deficit exceeds 6% of GDP — this is fiscally irresponsible' },
      { field: 'fiscal.incomeTaxBasicRate', threshold: 25, direction: 'above', loyaltyPenalty: 3, description: 'Basic rate above 25% — this undermines the tax base' },
    ],
    conflictsWith: ['political_operator'],
    synergyWith: ['fiscal_hawk'],
    interventionCooldownTurns: 8,
    scandalProbabilityPerTurn: 0.01,
  },
  {
    type: 'political_operator',
    name: 'Sarah Chen',
    title: 'Chief Political Adviser',
    description:
      'Former Chief Whip special adviser. Ruthlessly focused on electoral survival and party management. Knows every marginal seat intimately.',
    background:
      'Worked on four general election campaigns. Notorious for predicting backbench rebellions with uncanny accuracy.',
    strengths: [
      'Acute political instincts',
      'Can predict backbencher and PM reactions',
      'Understands voter psychology in key seats',
      'Prevents politically suicidal decisions',
    ],
    weaknesses: [
      'May sacrifice long-term economic health for short-term polling',
      'Sometimes dismisses economically necessary but unpopular policies',
      'Focus on optics over substance',
      'Can amplify populist pressures',
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
      marketSensitivity: 0.4,
    },
    narrativeStyle: 'political',
    pmRelationshipModifier: -1,
    ideologicalRedLines: [
      { field: 'political.backbenchSatisfaction', threshold: 40, direction: 'below', loyaltyPenalty: 4, description: 'Backbench is dangerously restless — this is exactly what I warned about' },
    ],
    conflictsWith: ['treasury_mandarin'],
    synergyWith: ['social_democrat'],
    interventionCooldownTurns: 5,
    scandalProbabilityPerTurn: 0.03,
  },
  {
    type: 'heterodox_economist',
    name: 'Dr Maya Okonkwo',
    title: 'Chief Economic Adviser (Heterodox)',
    description:
      'Academic economist with post-Keynesian and MMT influences. Believes fiscal space is larger than orthodox economists claim.',
    background:
      'PhD from SOAS, previously advised Labour leadership. Published research on fiscal multipliers and sectoral balances.',
    strengths: [
      'Challenges groupthink and conventional wisdom',
      'Strong on growth-focused policies',
      'Understands fiscal multipliers and demand dynamics',
      'Can identify opportunities others miss',
    ],
    weaknesses: [
      'May underestimate market reactions and inflation risks',
      'Sometimes overly optimistic about fiscal space',
      'Can be dismissive of debt sustainability concerns',
      'Theoretical brilliance not always politically feasible',
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
      marketSensitivity: 0.3,
    },
    narrativeStyle: 'academic',
    pmRelationshipModifier: 0,
    ideologicalRedLines: [
      { field: 'fiscal.spending', threshold: 10, direction: 'above', loyaltyPenalty: 4, description: 'Spending cuts above 10% in any department — this will devastate public services' },
      { field: 'fiscal.corporationTaxRate', threshold: 30, direction: 'above', loyaltyPenalty: 2, description: 'Corporation tax above 30% — this is excessive and counterproductive' },
    ],
    conflictsWith: ['fiscal_hawk'],
    synergyWith: [],
    interventionCooldownTurns: 6,
    scandalProbabilityPerTurn: 0.015,
  },
  {
    type: 'fiscal_hawk',
    name: 'Lord Michael Braithwaite',
    title: 'Senior Economic Adviser (Fiscal Conservative)',
    description:
      'Former IMF economist and merchant banker. Obsessed with debt reduction and market credibility. Sees fiscal profligacy everywhere.',
    background:
      'Advised governments through sovereign debt crises. Believes unsustainable debt is the greatest threat to prosperity.',
    strengths: [
      'Excellent at anticipating market reactions',
      'Strong understanding of debt dynamics',
      'Prevents loss of market confidence',
      'Rigorous about long-term sustainability',
    ],
    weaknesses: [
      'May advocate austerity even during recessions',
      'Can underestimate costs of spending cuts',
      'Sometimes alarmist about debt levels',
      'May prioritise credibility over growth',
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
      marketSensitivity: 0.95,
    },
    narrativeStyle: 'urgent',
    pmRelationshipModifier: 1,
    ideologicalRedLines: [
      { field: 'fiscal.deficitPctGDP', threshold: 4, direction: 'above', loyaltyPenalty: 6, description: 'Deficit above 4% of GDP — we are on an unsustainable trajectory' },
      { field: 'fiscal.debtPctGDP', threshold: 100, direction: 'above', loyaltyPenalty: 4, description: 'Debt above 100% of GDP — this is a psychological barrier for markets' },
    ],
    conflictsWith: ['heterodox_economist', 'social_democrat'],
    synergyWith: ['treasury_mandarin'],
    interventionCooldownTurns: 8,
    scandalProbabilityPerTurn: 0.01,
  },
  {
    type: 'social_democrat',
    name: 'Rebecca Thornton',
    title: 'Social Policy Adviser',
    description:
      'Former NHS trust chief executive and social policy researcher. Passionate about public services and believes austerity was disastrous.',
    background:
      'Witnessed first-hand the impact of cuts on health and social care. Argues investment in people pays for itself.',
    strengths: [
      'Deep understanding of public service delivery',
      'Can predict service quality consequences',
      'Strong on equity and regional disparities',
      'Prevents penny-wise, pound-foolish cuts',
    ],
    weaknesses: [
      'May resist any cuts even when fiscally necessary',
      'Can underestimate deadweight costs of taxation',
      'Sometimes dismissive of fiscal constraints',
      'May prioritise spending over efficiency',
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
      marketSensitivity: 0.35,
    },
    narrativeStyle: 'urgent',
    pmRelationshipModifier: 0,
    ideologicalRedLines: [
      { field: 'services.nhsQuality', threshold: 35, direction: 'below', loyaltyPenalty: 3, description: 'A service quality metric has fallen below 35 — this is a humanitarian concern' },
      { field: 'fiscal.spending', threshold: 5, direction: 'above', loyaltyPenalty: 5, description: 'Welfare spending cut above 5% — this will devastate the most vulnerable' },
    ],
    conflictsWith: ['fiscal_hawk'],
    synergyWith: ['political_operator'],
    interventionCooldownTurns: 6,
    scandalProbabilityPerTurn: 0.02,
  },
  {
    type: 'technocratic_centrist',
    name: 'James Ashworth',
    title: 'Chief Economic Adviser (Centrist)',
    description:
      'Former Treasury economist and think tank director. Pragmatic, evidence-focused, and ideologically flexible. Values what works.',
    background:
      'Worked at Institute for Fiscal Studies and Resolution Foundation. Advises based on empirical evidence rather than ideology.',
    strengths: [
      'Balanced and pragmatic advice',
      'Strong empirical grounding',
      'Can synthesise conflicting perspectives',
      'Respected across political spectrum',
    ],
    weaknesses: [
      'Can be indecisive or fence-sitting',
      'May lack strong convictions when needed',
      'Sometimes too cautious and risk-averse',
      'Can be seen as lacking political savvy',
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
      marketSensitivity: 0.7,
    },
    narrativeStyle: 'pragmatic',
    pmRelationshipModifier: 1,
    ideologicalRedLines: [
      { field: 'political.credibilityIndex', threshold: 45, direction: 'below', loyaltyPenalty: 3, description: 'Credibility below 45 — we are losing institutional trust' },
      { field: 'economic.inflationCPI', threshold: 6, direction: 'above', loyaltyPenalty: 4, description: 'Inflation above 6% — this is eroding living standards' },
    ],
    conflictsWith: [],
    synergyWith: [],
    interventionCooldownTurns: 7,
    scandalProbabilityPerTurn: 0.01,
  },
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
        console.error('Error generating opinion for adviser:', hired.profile.type, err);
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
        ? (proposedChanges.projectedDeficit / state.economy.gdpNominal) * 100
        : (state.fiscal.deficit / state.economy.gdpNominal) * 100;
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
    ? (proposedChanges.projectedDeficit / state.economy.gdpNominal) * 100
    : (state.fiscal.deficit / state.economy.gdpNominal) * 100;
  const growthRate = state.economy.gdpGrowthAnnual;
  const publicApproval = state.political.publicApproval;

  const analyses: PolicyAnalysis[] = [];
  const warnings: AdviserWarning[] = [];
  const recommendations: Recommendation[] = [];
  let severityScore = 0;

  // 1. Filter relevant templates
  const relevantTemplates = ADVISER_OPINIONS.filter(
    (t) => t.adviserType === profile.type && checkOpinionTrigger(t.trigger, state, proposedChanges)
  );

  // 2. Map templates to AdviserOpinion objects
  relevantTemplates.forEach((template) => {
    // Add to score (simple weighting)
    const severityMap = { critical: 3, warning: 2, caution: 1, neutral: 0, supportive: -1 };
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
        consequences: template.consequences,
      });
    } else if (template.itemType === 'recommendation') {
      recommendations.push({
        priority: template.priority || 'consider',
        action: template.recommendationAction || template.title,
        rationale: template.recommendationRationale || template.description,
      });
    }
  });

  // OVERALL ASSESSMENT
  const overallSeverity: OpinionSeverity =
    severityScore > 5
      ? 'critical'
      : severityScore > 2.5
        ? 'warning'
        : severityScore > 0.5
          ? 'caution'
          : analyses.length === 0 && warnings.length === 0
            ? 'supportive'
            : 'neutral';

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
    prediction,
  };
}

// ============================================================================
// NARRATIVE GENERATION FUNCTIONS
// ============================================================================

function pickVariant(variants: string[]): string {
  return variants[Math.floor(Math.random() * variants.length)];
}

function generateHeadline(
  profile: AdviserProfile,
  severity: OpinionSeverity,
  deficit: number,
  growth: number,
  approval: number
): string {
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

  const topConcerns = analyses.filter((a) => a.severity === 'critical' || a.severity === 'warning').slice(0, 2);

  if (topConcerns.length === 0) {
    return 'Some areas warrant attention, but no critical issues identified.';
  }

  const concerns = topConcerns.map((a) => a.area).join(' and ');

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
  const projectedDeficitPct =
    proposedChanges?.projectedDeficit && state.economy?.gdpNominal
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
      ]),
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
      ]),
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
      ]),
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
      ]),
    };
  }

  if (
    profile.type === 'treasury_mandarin' &&
    projectedDeficitPct !== undefined &&
    projectedDeficitPct > bias.deficitTolerance + 1
  ) {
    return {
      timeframe: '6 months',
      likelihood: 'possible',
      outcome: pickVariant([
        'If this package is implemented as drafted, fiscal headroom is likely to narrow materially by the next review window.',
        'Current proposals imply reduced resilience to adverse shocks unless offsetting measures are identified.',
        'Treasury flexibility is likely to tighten over the next two quarters under this projected deficit path.',
      ]),
    };
  }

  return undefined;
}

// ============================================================================
// ADVISER RELATIONSHIP & ACCURACY TRACKING
// ============================================================================

export function updateAdviserRelationship(hired: HiredAdviser, adviceFollowed: boolean): HiredAdviser {
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

export function updateAdviserAccuracy(hired: HiredAdviser, predictionAccurate: boolean): HiredAdviser {
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
  let advisersList: HiredAdviser[] = [];
  const advisersData: any = advisers;
  if (advisersData instanceof Map) {
    advisersList = Array.from(advisersData.values());
  } else if (Array.isArray(advisersData)) {
    if (advisersData.length > 0 && Array.isArray(advisersData[0]) && advisersData[0].length === 2) {
      advisersList = advisersData.map((entry: any) => entry[1]);
    } else {
      advisersList = advisersData as any;
    }
  } else if (typeof advisersData === 'object' && advisersData !== null) {
    advisersList = Object.values(advisersData);
  }

  advisersList = advisersList.filter((h) => h && h.profile);

  const criticalCount = advisersList.filter((h) => {
    const opinion = opinions instanceof Map ? opinions.get(h.profile.type) : (opinions as any)?.[h.profile.type];
    return opinion?.overallAssessment === 'critical';
  }).length;

  const warningCount = advisersList.filter((h) => {
    const opinion = opinions instanceof Map ? opinions.get(h.profile.type) : (opinions as any)?.[h.profile.type];
    return opinion?.overallAssessment === 'warning';
  }).length;

  return (
    <button
      onClick={() => onShowDetail(advisersList[0]?.profile.type || null)}
      className="flex items-center gap-3 px-4 py-2 text-sm font-semibold text-white bg-elevated/20 hover:bg-elevated/30 transition-colors uppercase tracking-wide"
      aria-label="Open adviser assessment"
    >
      <Brain className="w-4 h-4" />
      <span>Advisers</span>
      {(criticalCount > 0 || warningCount > 0) && (
        <span className={`text-xs px-1.5 py-0.5 ${criticalCount > 0 ? 'bg-bad text-white' : 'bg-warning text-white'}`}>
          {criticalCount > 0 ? `${criticalCount} critical` : `${warningCount} warning${warningCount > 1 ? 's' : ''}`}
        </span>
      )}
    </button>
  );
};

interface AdviserAssessmentPanelProps {
  advisers: Map<AdviserType, HiredAdviser>;
  opinions: Map<AdviserType, AdviserOpinion>;
  onSelectAdviser: (type: AdviserType) => void;
  onClose: () => void;
}

export const AdviserAssessmentPanel: React.FC<AdviserAssessmentPanelProps> = ({
  advisers,
  opinions,
  onSelectAdviser,
  onClose,
}) => {
  let advisersList: HiredAdviser[] = [];
  const advisersData: any = advisers;
  if (advisersData instanceof Map) {
    advisersList = Array.from(advisersData.values());
  } else if (Array.isArray(advisersData)) {
    if (advisersData.length > 0 && Array.isArray(advisersData[0]) && advisersData[0].length === 2) {
      advisersList = advisersData.map((entry: any) => entry[1]);
    } else {
      advisersList = advisersData as any;
    }
  } else if (typeof advisersData === 'object' && advisersData !== null) {
    advisersList = Object.values(advisersData);
  }

  advisersList = advisersList.filter((h) => h && h.profile);

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
    <div className="fixed inset-0 bg-black/60 flex items-start justify-end z-50" onClick={onClose}>
      <div
        className="w-[480px] max-h-[90vh] bg-bg-elevated border-l border-border-strong overflow-hidden flex flex-col animate-fade-in"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Adviser Assessment Panel"
      >
        <div className="border-b border-border-strong px-6 py-4 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-tertiary mb-0.5">HM Treasury</div>
            <h2 className="text-lg font-semibold text-primary">Adviser Assessment</h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-primary transition-colors p-1"
            aria-label="Close panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="divide-y divide-border-subtle">
            {advisersList.map((hired) => {
              const opinion = getOpinion(hired.profile.type);
              if (!opinion) return null;

              return (
                <div
                  key={hired.profile.type}
                  className="px-6 py-4 cursor-pointer group hover:bg-bg-subtle transition-colors"
                  onClick={() => onSelectAdviser(hired.profile.type)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectAdviser(hired.profile.type);
                    }
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-sm font-semibold text-primary">{hired.profile.name}</span>
                      <div className="text-xs text-muted">{hired.profile.title}</div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 ${getSeverityBadgeClass(opinion.overallAssessment)}`}>
                      {getSeverityLabel(opinion.overallAssessment)}
                    </span>
                  </div>
                  <p className="text-xs text-secondary leading-relaxed line-clamp-3">{opinion.summary}</p>
                  {opinion.warnings.length > 0 && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-warning">
                      <AlertTriangle className="w-3 h-3" />
                      <span>{opinion.warnings.length} warning{opinion.warnings.length !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                  <div className="mt-2 text-xs text-tertiary group-hover:text-primary transition-colors">
                    View full analysis
                  </div>
                </div>
              );
            })}
          </div>
        </div>
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
  const [activeTab, setActiveTab] = useState<'analysis' | 'recommendations' | 'profile'>('recommendations');

  const accuracyRate = getAdviserAccuracyRate(hired);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-elevated max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b border-border-strong p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                {getSeverityIcon(opinion.overallAssessment, 'w-6 h-6')}
                <h2 className="text-2xl font-bold text-primary">{opinion.headline}</h2>
              </div>
              <div className="flex items-center gap-3 text-sm text-secondary">
                <span className="font-medium text-primary">{hired.profile.name}</span>
                <span>•</span>
                <span>{hired.profile.title}</span>
                <span>•</span>
                <span className={`px-2 py-1 text-xs ${getRelationshipBadgeClass(hired.relationship)}`}>
                  {hired.relationship.charAt(0).toUpperCase() + hired.relationship.slice(1)} relationship
                </span>
              </div>
            </div>
            <button onClick={onClose} className="text-muted hover:text-secondary transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-border-strong px-6">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('analysis')}
              className={`py-3 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'analysis'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-secondary hover:text-primary'
              }`}
            >
              Analysis & Warnings
            </button>
            <button
              onClick={() => setActiveTab('recommendations')}
              className={`py-3 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'recommendations'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-secondary hover:text-primary'
              }`}
            >
              Recommendations
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`py-3 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'profile'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-secondary hover:text-primary'
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
                <h3 className="text-lg font-semibold text-primary mb-2">Summary Assessment</h3>
                <p className="text-secondary">{opinion.summary}</p>
              </div>

              {opinion.warnings.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-primary mb-3">Warnings</h3>
                  <div className="space-y-3">
                    {opinion.warnings.map((warning, idx) => (
                      <div
                        key={idx}
                        className={`border-l-4 ${getSeverityBorderClass(warning.severity)} bg-subdued p-4`}
                      >
                        <div className="flex items-start gap-2 mb-1">
                          {getSeverityIcon(warning.severity)}
                          <h4 className="font-semibold text-primary">{warning.title}</h4>
                        </div>
                        <p className="text-sm text-secondary ml-6">{warning.description}</p>
                        {warning.consequences && (
                          <p className="text-sm text-tertiary ml-6 mt-2 italic">
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
                  <h3 className="text-lg font-semibold text-primary mb-3">Detailed Analysis</h3>
                  <div className="space-y-4">
                    {opinion.detailedAnalysis.map((analysis, idx) => (
                      <div key={idx} className="border border-border-strong p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getSeverityIcon(analysis.severity, 'w-5 h-5')}
                            <h4 className="font-semibold text-primary">{analysis.title}</h4>
                          </div>
                          <span className="text-xs text-muted uppercase">{analysis.area}</span>
                        </div>
                        <p className="text-sm text-secondary">{analysis.description}</p>
                        {analysis.quantitativeReasoning && (
                          <p className="text-xs text-tertiary mt-2 font-mono bg-subdued p-2">
                            {analysis.quantitativeReasoning}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {opinion.prediction && (
                <div className="bg-subdued border border-border-subtle p-4">
                  <h4 className="font-semibold text-secondary mb-2">Prediction</h4>
                  <div className="flex items-center gap-2 text-sm text-secondary mb-2">
                    <span className="font-medium">Timeframe: {opinion.prediction.timeframe}</span>
                    <span>•</span>
                    <span
                      className={`px-2 py-0.5 text-xs ${getLikelihoodBadgeClass(opinion.prediction.likelihood)}`}
                    >
                      {opinion.prediction.likelihood.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-secondary">{opinion.prediction.outcome}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'recommendations' && (
            <div className="space-y-4">
              {opinion.recommendations.length === 0 ? (
                <p className="text-tertiary">
                  No specific recommendations at this time. Continue monitoring the situation.
                </p>
              ) : (
                opinion.recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className={`border-l-4 ${getPriorityBorderClass(rec.priority)} bg-subdued p-4`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {getPriorityIcon(rec.priority)}
                      <span className={`text-xs px-2 py-1 ${getPriorityBadgeClass(rec.priority)}`}>
                        {rec.priority}
                      </span>
                    </div>
                    <h4 className="font-semibold text-primary mb-1">{rec.action}</h4>
                    <p className="text-sm text-secondary mb-2">{rec.rationale}</p>
                    {rec.expectedOutcome && (
                      <p className="text-sm text-tertiary italic">Expected outcome: {rec.expectedOutcome}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-primary mb-2">Background</h3>
                <p className="text-secondary">{hired.profile.background}</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-primary mb-2">Description</h3>
                <p className="text-secondary">{hired.profile.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-good mb-2">Strengths</h3>
                  <ul className="space-y-1">
                    {hired.profile.strengths.map((strength, idx) => (
                      <li key={idx} className="flex gap-2 text-sm text-secondary">
                        <CheckCircle className="w-4 h-4 text-good flex-shrink-0 mt-0.5" />
                        <span>{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-warning mb-2">Weaknesses</h3>
                  <ul className="space-y-1">
                    {hired.profile.weaknesses.map((weakness, idx) => (
                      <li key={idx} className="flex gap-2 text-sm text-secondary">
                        <XCircle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                        <span>{weakness}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="bg-subdued border border-border-strong p-4">
                <h3 className="text-lg font-semibold text-primary mb-3">Track Record</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-tertiary">Advice followed:</span>
                    <span className="ml-2 font-semibold text-good">{hired.adviceFollowedCount}</span>
                  </div>
                  <div>
                    <span className="text-tertiary">Advice ignored:</span>
                    <span className="ml-2 font-semibold text-warning">{hired.adviceIgnoredCount}</span>
                  </div>
                  <div>
                    <span className="text-tertiary">Accurate predictions:</span>
                    <span className="ml-2 font-semibold text-good">{hired.accuratePredictions}</span>
                  </div>
                  <div>
                    <span className="text-tertiary">Inaccurate predictions:</span>
                    <span className="ml-2 font-semibold text-bad">{hired.inaccuratePredictions}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-tertiary">Accuracy rate:</span>
                    <span className="ml-2 font-semibold text-secondary">
                      {accuracyRate > 0 ? `${(accuracyRate * 100).toFixed(0)}%` : 'Insufficient data'}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-tertiary">Appointed:</span>
                    <span className="ml-2 font-semibold text-primary">Month {hired.hiredMonth}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border-strong p-4 bg-subdued">
          <button
            onClick={onClose}
            className="w-full bg-primary text-text-inverse py-2 px-4 hover:bg-primary-hover transition-colors font-medium"
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
  onBack,
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
  hiredAdvisersList = hiredAdvisersList.filter((h) => h && h.profile);
  // Recalculate size after filtering
  hiredAdvisersSize = hiredAdvisersList.length;

  const maxAdvisers = 3;
  const canHireMore = hiredAdvisersSize < maxAdvisers;

  return (
    <div className="min-h-screen bg-bg p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <button onClick={onBack} className="text-secondary hover:text-primary font-medium flex items-center gap-2">
            ← Back to Game
          </button>
        </div>

        <div className="bg-elevated p-6 mb-6">
          <h1 className="text-3xl font-bold text-primary mb-2">Economic Adviser Management</h1>
          <p className="text-tertiary">
            Appoint up to {maxAdvisers} economic advisers to provide guidance on policy decisions. Currently appointed:{' '}
            {hiredAdvisersSize}/{maxAdvisers}
          </p>
        </div>

        {/* Currently Hired Advisers */}
        {hiredAdvisersSize > 0 && (
          <div className="bg-elevated p-6 mb-6">
            <h2 className="text-xl font-bold text-primary mb-4">Current Advisory Team</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {hiredAdvisersList.map((hired) => (
                <div key={hired.profile.type} className="border border-border-strong p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-primary">{hired.profile.name}</h3>
                      <p className="text-sm text-tertiary">{hired.profile.title}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 ${getRelationshipBadgeClass(hired.relationship)}`}>
                      {hired.relationship}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex justify-between">
                      <span className="text-tertiary">Advice followed:</span>
                      <span className="font-semibold">{hired.adviceFollowedCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-tertiary">Advice ignored:</span>
                      <span className="font-semibold">{hired.adviceIgnoredCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-tertiary">Months in post:</span>
                      <span className="font-semibold">{currentMonth - hired.hiredMonth}</span>
                    </div>
                  </div>

                  {confirmFire === hired.profile.type ? (
                    <div className="space-y-2">
                      <p className="text-sm text-bad font-medium">Confirm dismissal?</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            onFire(hired.profile.type);
                            setConfirmFire(null);
                          }}
                          className="flex-1 bg-bad text-text-inverse py-1 px-3 text-sm hover:bg-primary-active transition-colors"
                        >
                          Yes, dismiss
                        </button>
                        <button
                          onClick={() => setConfirmFire(null)}
                          className="flex-1 bg-subdued text-secondary py-1 px-3 text-sm hover:bg-border-subtle transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmFire(hired.profile.type)}
                      className="w-full bg-bad-subtle text-bad py-2 px-4 hover:bg-bad-subtle/80 transition-colors text-sm font-medium"
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
        <div className="bg-elevated p-6">
          <h2 className="text-xl font-bold text-primary mb-4">
            {canHireMore ? 'Available Advisers' : 'All Adviser Slots Filled'}
          </h2>

          {!canHireMore && (
            <p className="text-tertiary mb-4">You must dismiss an existing adviser before hiring a new one.</p>
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
              <div key={profile.type} className="border border-border-strong p-4 hover:bg-subdued transition-colors">
                <h3 className="font-bold text-primary mb-1">{profile.name}</h3>
                <p className="text-sm text-tertiary mb-3">{profile.title}</p>
                <p className="text-sm text-secondary mb-4 line-clamp-3">{profile.description}</p>

                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedAdviser(profile)}
                    className="flex-1 bg-subdued text-secondary py-2 px-3 text-sm hover:bg-border-subtle transition-colors"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => onHire(profile.type)}
                    disabled={!canHireMore}
                    className={`flex-1 py-2 px-3 text-sm font-medium transition-colors ${
                      canHireMore
                        ? 'bg-secondary text-text-inverse hover:bg-secondary-hover'
                        : 'bg-subdued text-muted cursor-not-allowed'
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
          <div className="bg-elevated max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-primary">{selectedAdviser.name}</h2>
                <p className="text-tertiary">{selectedAdviser.title}</p>
              </div>
              <button
                onClick={() => setSelectedAdviser(null)}
                className="text-muted hover:text-secondary transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-primary mb-2">Background</h3>
                <p className="text-secondary text-sm">{selectedAdviser.background}</p>
              </div>

              <div>
                <h3 className="font-semibold text-primary mb-2">Description</h3>
                <p className="text-secondary text-sm">{selectedAdviser.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-good mb-2">Strengths</h3>
                  <ul className="space-y-1">
                    {selectedAdviser.strengths.map((strength, idx) => (
                      <li key={idx} className="flex gap-2 text-sm text-secondary">
                        <CheckCircle className="w-4 h-4 text-good flex-shrink-0 mt-0.5" />
                        <span>{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-warning mb-2">Weaknesses</h3>
                  <ul className="space-y-1">
                    {selectedAdviser.weaknesses.map((weakness, idx) => (
                      <li key={idx} className="flex gap-2 text-sm text-secondary">
                        <XCircle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
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
                className="flex-1 bg-subdued text-secondary py-2 px-4 hover:bg-border-subtle transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  onHire(selectedAdviser.type);
                  setSelectedAdviser(null);
                }}
                disabled={!canHireMore}
                className={`flex-1 py-2 px-4 font-medium transition-colors ${
                  canHireMore
                    ? 'bg-secondary text-text-inverse hover:bg-secondary-hover'
                    : 'bg-subdued text-muted cursor-not-allowed'
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
      return <AlertTriangle className={`${className} text-bad`} />;
    case 'warning':
      return <AlertTriangle className={`${className} text-warning`} />;
    case 'caution':
      return <Info className={`${className} text-warning`} />;
    case 'supportive':
      return <CheckCircle className={`${className} text-good`} />;
    default:
      return <Info className={`${className} text-tertiary`} />;
  }
}

function getSeverityLabel(severity: OpinionSeverity): string {
  return severity.charAt(0).toUpperCase() + severity.slice(1);
}

function getSeverityBadgeClass(severity: OpinionSeverity): string {
  switch (severity) {
    case 'critical':
      return 'bg-bad-subtle text-bad';
    case 'warning':
      return 'bg-warning-subtle text-warning';
    case 'caution':
      return 'bg-warning-subtle text-warning';
    case 'supportive':
      return 'bg-good-subtle text-good';
    default:
      return 'bg-neutral-subtle text-neutral';
  }
}

function getSeverityBorderClass(severity: OpinionSeverity): string {
  switch (severity) {
    case 'critical':
      return 'border-bad';
    case 'warning':
      return 'border-warning';
    case 'caution':
      return 'border-warning';
    case 'supportive':
      return 'border-good';
    default:
      return 'border-neutral';
  }
}

function getRelationshipBadgeClass(relationship: 'excellent' | 'good' | 'strained' | 'poor'): string {
  switch (relationship) {
    case 'excellent':
      return 'bg-good-subtle text-good';
    case 'good':
      return 'bg-secondary-subtle text-secondary';
    case 'strained':
      return 'bg-warning-subtle text-warning';
    case 'poor':
      return 'bg-bad-subtle text-bad';
  }
}

function getLikelihoodBadgeClass(likelihood: 'almost_certain' | 'likely' | 'possible' | 'unlikely'): string {
  switch (likelihood) {
    case 'almost_certain':
      return 'bg-bad-subtle text-bad';
    case 'likely':
      return 'bg-warning-subtle text-warning';
    case 'possible':
      return 'bg-warning-subtle text-warning';
    case 'unlikely':
      return 'bg-neutral-subtle text-neutral';
  }
}

function getPriorityIcon(priority: 'immediate' | 'important' | 'consider') {
  switch (priority) {
    case 'immediate':
      return <AlertTriangle className="w-5 h-5 text-bad" />;
    case 'important':
      return <TrendingUp className="w-5 h-5 text-warning" />;
    case 'consider':
      return <Info className="w-5 h-5 text-secondary" />;
  }
}

function getPriorityBadgeClass(priority: 'immediate' | 'important' | 'consider'): string {
  switch (priority) {
    case 'immediate':
      return 'bg-bad-subtle text-bad font-medium';
    case 'important':
      return 'bg-warning-subtle text-warning font-medium';
    case 'consider':
      return 'bg-secondary-subtle text-secondary';
  }
}

function getPriorityBorderClass(priority: 'immediate' | 'important' | 'consider'): string {
  switch (priority) {
    case 'immediate':
      return 'border-bad';
    case 'important':
      return 'border-warning';
    case 'consider':
      return 'border-secondary';
  }
}

// ============================================================================
// INITIALIZATION HELPERS
// ============================================================================

export function createInitialAdviserSystem(): AdviserSystemState {
  return {
    hiredAdvisers: new Map(),
    availableAdvisers: new Set(ADVISER_PROFILES.map((p) => p.type)),
    currentOpinions: new Map(),
    showDetailedView: null,
    adviserEvents: [],
    activeConflicts: [],
    conflictResolutionHistory: [],
    activeSynergies: [],
    pendingInterventions: [],
  };
}

export function hireAdviser(
  system: AdviserSystemState,
  adviserType: AdviserType,
  currentMonth: number
): AdviserSystemState {
  const profile = ADVISER_PROFILES.find((p) => p.type === adviserType);
  if (!profile) return system;

  const hired: HiredAdviser = {
    profile,
    hiredMonth: currentMonth,
    adviceFollowedCount: 0,
    adviceIgnoredCount: 0,
    accuratePredictions: 0,
    inaccuratePredictions: 0,
    relationship: 'good',
    state: {
      loyaltyScore: 75,
      ignoredRecommendationStreak: 0,
      totalIgnoredRecommendations: 0,
      totalFollowedRecommendations: 0,
      turnsInPost: 0,
      isBriefingAgainst: false,
      activeInterventionCooldown: 0,
      resignationWarningIssued: false,
      provenTrackRecord: false,
      lastRecommendationCategory: null,
      lastRecommendationFollowed: null,
      redLineBreachStreak: 0,
    },
  };

  const newHiredAdvisers = new Map(system.hiredAdvisers);
  newHiredAdvisers.set(adviserType, hired);

  const newAvailableAdvisers = new Set(system.availableAdvisers);
  newAvailableAdvisers.delete(adviserType);

  return {
    ...system,
    hiredAdvisers: newHiredAdvisers,
    availableAdvisers: newAvailableAdvisers,
  };
}

export function fireAdviser(system: AdviserSystemState, adviserType: AdviserType): AdviserSystemState {
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
    currentOpinions: newCurrentOpinions,
  };
}

// ============================================================================
// SYNERGY CALCULATION
// ============================================================================

export function calculateActiveSynergies(hiredAdviserIds: string[]): AdviserSynergy[] {
  const synergies: AdviserSynergy[] = [];
  const has = (id: string) => hiredAdviserIds.includes(id);

  if (has('treasury_mandarin') && has('fiscal_hawk')) {
    synergies.push({
      adviserIds: ['treasury_mandarin', 'fiscal_hawk'],
      synergyKey: 'institutional_orthodoxy',
      description: 'Both advisers reinforce a culture of fiscal discipline.',
      bonusDescription: '+6 credibility per turn, debt interest reduced by an additional 3%',
    });
  }

  if (has('political_operator') && has('social_democrat')) {
    synergies.push({
      adviserIds: ['political_operator', 'social_democrat'],
      synergyKey: 'electoral_coalition',
      description: "Both advisers focus on keeping the party's core coalition intact.",
      bonusDescription: '+4 approval per turn, +5 backbench satisfaction per turn',
    });
  }

  const economicCouncilMembers = ['treasury_mandarin', 'heterodox_economist', 'technocratic_centrist'];
  const economicCouncilCount = economicCouncilMembers.filter(has).length;
  if (economicCouncilCount >= 3) {
    synergies.push({
      adviserIds: economicCouncilMembers,
      synergyKey: 'economic_council',
      description: 'A balanced economic advisory team generates emergent insight.',
      bonusDescription: '+0.08pp GDP growth, +4 credibility per turn',
    });
  }

  return synergies;
}

// ============================================================================
// CONFLICT CHECKING
// ============================================================================

export function checkAdviserConflicts(
  hiredAdviserIds: string[],
  turn: number,
  existingConflicts: AdviserConflict[]
): AdviserConflict | null {
  const has = (id: string) => hiredAdviserIds.includes(id);

  const conflictPairs: Array<[string, string, string]> = [
    ['treasury_mandarin', 'political_operator', 'Sir Humphrey Cavendish and Sarah Chen have sent you conflicting briefings on the upcoming fiscal statement. Sir Humphrey insists on a conservative, institution-first framing. Chen argues this will cost you the next election. You must decide whose advice to follow in your public communications.'],
    ['fiscal_hawk', 'heterodox_economist', 'Lord Braithwaite and Dr Okonkwo are in open disagreement about your growth strategy. Braithwaite is demanding you rule out any further borrowing for investment. Okonkwo argues this would be economically illiterate. The disagreement has reached the financial press.'],
    ['fiscal_hawk', 'social_democrat', "Lord Braithwaite has formally objected to Rebecca Thornton's proposed service investment package, describing it in a memo — now leaked — as 'fiscally delinquent'. Thornton has responded by briefing that Braithwaite's approach will produce a lost decade in public services. You must take a position."],
  ];

  for (const [idA, idB, description] of conflictPairs) {
    if (!has(idA) || !has(idB)) continue;

    const lastResolved = existingConflicts
      .filter((c) => c.resolved && ((c.adviserIdA === idA && c.adviserIdB === idB) || (c.adviserIdA === idB && c.adviserIdB === idA)))
      .sort((a, b) => b.turnTriggered - a.turnTriggered)[0];

    if (lastResolved && turn - lastResolved.turnTriggered < 12) continue;

    if (Math.random() < 0.15) {
      return {
        id: `conflict_${idA}_${idB}_${turn}`,
        adviserIdA: idA,
        adviserIdB: idB,
        description,
        turnTriggered: turn,
        resolved: false,
        sidesWithAdviser: null,
      };
    }
  }

  return null;
}

// ============================================================================
// INTERVENTION GENERATION
// ============================================================================

export function generateAdviserIntervention(
  adviserId: string,
  turn: number
): AdviserIntervention | null {
  const profile = ADVISER_PROFILES.find((p) => p.type === adviserId);
  if (!profile) return null;

  switch (adviserId) {
    case 'treasury_mandarin':
      return {
        id: `intervention_${adviserId}_${turn}`,
        adviserId,
        adviserName: profile.name,
        title: 'Emergency Credibility Package',
        description: 'The markets are watching. A coordinated package of fiscal signalling and institutional reassurance could restore confidence, but it requires you to publicly commit to tighter near-term targets.',
        mechanicalEffect: { credibilityChange: 18, pmTrustChange: 4, fiscalHeadroomChange_bn: -2.5 },
        acceptLabel: 'Issue the statement',
        declineLabel: 'Reject the advice',
        resolved: false,
        accepted: null,
        turn,
      };
    case 'political_operator':
      return {
        id: `intervention_${adviserId}_${turn}`,
        adviserId,
        adviserName: profile.name,
        title: 'Parliamentary Management Operation',
        description: "I can work the tea rooms. A targeted round of meetings, concessions, and quiet promises would bring the backbench back onside — but it will cost you some approval with the public when it leaks, and it will leak.",
        mechanicalEffect: { backbenchSatisfactionChange: 14, approvalChange: -4, whipStrengthChange: 8 },
        acceptLabel: 'Work the rooms',
        declineLabel: 'Too risky',
        resolved: false,
        accepted: null,
        turn,
      };
    case 'heterodox_economist':
      return {
        id: `intervention_${adviserId}_${turn}`,
        adviserId,
        adviserName: profile.name,
        title: 'Demand Stimulus Package',
        description: "The economy is undershooting its potential. A targeted demand stimulus — properly designed — would lift growth without entrenching inflation. Conventional wisdom says otherwise. Conventional wisdom gave you the last decade.",
        mechanicalEffect: { gdpGrowthBoost: 0.18, inflationRisk: 0.4, boostDurationTurns: 4, credibilityChange: -6 },
        acceptLabel: 'Authorise the stimulus',
        declineLabel: 'Too unorthodox',
        resolved: false,
        accepted: null,
        turn,
      };
    case 'fiscal_hawk':
      return {
        id: `intervention_${adviserId}_${turn}`,
        adviserId,
        adviserName: profile.name,
        title: 'Emergency Deficit Reduction Protocol',
        description: "The trajectory is unacceptable. I am recommending an immediate cross-departmental efficiency review with binding targets. It will be unpopular. It will also prevent a gilt crisis.",
        mechanicalEffect: { fiscalHeadroomChange_bn: 4.5, credibilityChange: 10, approvalChange: -6, backbenchSatisfactionChange: -8 },
        acceptLabel: 'Initiate the review',
        declineLabel: 'Not now',
        resolved: false,
        accepted: null,
        turn,
      };
    case 'social_democrat':
      return {
        id: `intervention_${adviserId}_${turn}`,
        adviserId,
        adviserName: profile.name,
        title: 'Public Services Emergency Investment',
        description: "Two of our public services are in crisis. A targeted emergency investment — announced as a one-off — would arrest the decline and shore up our electoral coalition with the people who actually depend on these services.",
        mechanicalEffect: { serviceQualityTarget: 'two_lowest', serviceQualityChange: 12, approvalChange: 5, fiscalHeadroomChange_bn: -3 },
        acceptLabel: 'Authorise emergency funding',
        declineLabel: 'We cannot afford it',
        resolved: false,
        accepted: null,
        turn,
      };
    case 'technocratic_centrist':
      return {
        id: `intervention_${adviserId}_${turn}`,
        adviserId,
        adviserName: profile.name,
        title: 'Cross-Party Fiscal Consultation',
        description: "A structured consultation with the opposition finance spokespeople and the OBR would signal institutional maturity and take fiscal policy partially out of the political line of fire. It is not exciting. That is the point.",
        mechanicalEffect: { credibilityChange: 14, pmTrustChange: 5, backbenchSatisfactionChange: 4, approvalChange: 2 },
        acceptLabel: 'Initiate consultation',
        declineLabel: 'Not politically viable',
        resolved: false,
        accepted: null,
        turn,
      };
    default:
      return null;
  }
}

// ============================================================================
// RESIGNATION CHECK
// ============================================================================

export interface ResignationResult {
  shouldResign: boolean;
  reason: string;
  adviserType: AdviserType;
  adviserName: string;
}

export function checkAdviserResignation(
  hiredAdviser: HiredAdviser,
  conflictResolutionHistory: ConflictResolutionRecord[],
  turn: number
): ResignationResult | null {
  const { profile, state } = hiredAdviser;
  const adviserType = profile.type as AdviserType;

  if (state.loyaltyScore < 15) {
    return {
      shouldResign: true,
      reason: `${profile.name} has resigned. Their loyalty has collapsed — they can no longer defend your fiscal strategy in public or private.`,
      adviserType,
      adviserName: profile.name,
    };
  }

  if (state.ignoredRecommendationStreak >= 6) {
    return {
      shouldResign: true,
      reason: `${profile.name} has resigned after ${state.ignoredRecommendationStreak} consecutive months of their advice being ignored. "I cannot continue in a role where my counsel is systematically disregarded."`,
      adviserType,
      adviserName: profile.name,
    };
  }

  const lossesAgainst = conflictResolutionHistory.filter(
    (r) => r.sidesWithAdviser !== profile.type && (r.conflictId.includes(profile.type))
  ).length;
  if (lossesAgainst >= 3) {
    return {
      shouldResign: true,
      reason: `${profile.name} has resigned. Having been overruled in ${lossesAgainst} adviser conflicts, they no longer believe their voice carries weight in your decision-making.`,
      adviserType,
      adviserName: profile.name,
    };
  }

  if (state.redLineBreachStreak >= 5) {
    return {
      shouldResign: true,
      reason: `${profile.name} has resigned. Their core principles have been violated for ${state.redLineBreachStreak} consecutive months. "I cannot be associated with a policy direction I fundamentally oppose."`,
      adviserType,
      adviserName: profile.name,
    };
  }

  return null;
}

export function shouldIssueResignationWarning(hiredAdviser: HiredAdviser): boolean {
  const { state } = hiredAdviser;
  if (state.resignationWarningIssued) return false;
  if (state.loyaltyScore >= 15 && state.loyaltyScore <= 25) return true;
  if (state.ignoredRecommendationStreak === 5) return true;
  return false;
}

export function generateResignationWarning(hiredAdviser: HiredAdviser): string {
  const { profile } = hiredAdviser;
  const warnings = [
    `"I need to be frank with you, Chancellor. I am finding it increasingly difficult to defend the current direction." — ${profile.name}`,
    `"I am not sure I can continue much longer if things do not change." — ${profile.name}`,
    `"My ability to advise you effectively is being compromised. I hope you will reflect on that." — ${profile.name}`,
  ];
  return warnings[Math.floor(Math.random() * warnings.length)];
}
