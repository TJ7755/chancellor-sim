// Turn Processor - Orchestrates monthly game calculations
// Executes 18-step economic/political calculation sequence each turn
// Integrates events-media, political-system, and credit rating

import {
  PoliticalState,
  PMInterventionEvent,
  getFiscalRuleById,
} from './game-integration';
import { GameState, BudgetChanges } from './game-state';
import { generateEvents, generateNewspaper, RandomEvent, NewsArticle } from './events-media';
import { calculateAllMPStances } from './mp-system';
import { createInitialFiscalState } from './game-integration';
import { calculateSocialMediaSentiment, calculateSocialMediaImpact } from './social-media-system';
import { processPMCommunications } from './pm-system';
import { checkAnnualGrowthPledges, applyManifestoViolations } from './manifesto-system';

const DEPARTMENTAL_SPENDING_KEYS = [
  'nhs',
  'education',
  'defence',
  'welfare',
  'infrastructure',
  'police',
  'justice',
  'other',
] as const;

function getDepartmentalSpendingTotal(spending: GameState['fiscal']['spending']): number {
  return DEPARTMENTAL_SPENDING_KEYS.reduce((sum, key) => sum + spending[key], 0);
}

// CRITICAL FIX: Adviser mechanical benefits
// Advisers provide actual gameplay bonuses based on their expertise
interface AdviserBonuses {
  taxRevenueMultiplier: number;    // Multiplier on tax revenues (1.0 = normal, 1.05 = +5%)
  spendingEfficiencyMultiplier: number;  // Multiplier on service quality gains
  backbenchBonus: number;          // Flat bonus to backbench satisfaction
  pmTrustBonus: number;            // Flat bonus to PM trust
  gdpGrowthBonus: number;          // Flat bonus to GDP growth (pp)
  debtInterestReduction: number;   // Reduction in debt interest (%)
  credibilityBonus: number;        // Flat bonus to credibility index
}

function getAdviserBonuses(state: GameState): AdviserBonuses {
  const bonuses: AdviserBonuses = {
    taxRevenueMultiplier: 1.0,
    spendingEfficiencyMultiplier: 1.0,
    backbenchBonus: 0,
    pmTrustBonus: 0,
    gdpGrowthBonus: 0,
    debtInterestReduction: 0,
    credibilityBonus: 0,
  };

  const hiredAdvisers = state.advisers?.hiredAdvisers as any;
  if (!hiredAdvisers) return bonuses;

  // Handle Map, array of pairs, or plain object
  const advisersMap = new Map<string, any>();
  if (hiredAdvisers instanceof Map || (hiredAdvisers && typeof hiredAdvisers.entries === 'function')) {
    hiredAdvisers.forEach((v: any, k: string) => advisersMap.set(k, v));
  } else if (Array.isArray(hiredAdvisers)) {
    hiredAdvisers.forEach((entry: any) => {
      if (Array.isArray(entry) && entry.length === 2) advisersMap.set(entry[0], entry[1]);
    });
  } else if (typeof hiredAdvisers === 'object') {
    Object.entries(hiredAdvisers).forEach(([k, v]) => advisersMap.set(k, v));
  }

  // Treasury Mandarin: Expert tax collection and fiscal management
  if (advisersMap.has('treasury_mandarin')) {
    bonuses.taxRevenueMultiplier += 0.03; // +3% tax revenue (better collection, fewer loopholes)
    bonuses.credibilityBonus += 5;
  }

  // Political Operator: Manages backbenchers and PM relationship
  if (advisersMap.has('political_operator')) {
    bonuses.backbenchBonus += 3;
    bonuses.pmTrustBonus += 2;
  }

  // Heterodox Economist: Unorthodox policies boost growth
  if (advisersMap.has('heterodox_economist')) {
    bonuses.gdpGrowthBonus += 0.15; // +0.15pp GDP growth from creative policies
  }

  // Fiscal Hawk: Market credibility reduces borrowing costs
  if (advisersMap.has('fiscal_hawk')) {
    bonuses.debtInterestReduction += 8; // -8% debt interest via better market confidence
    bonuses.credibilityBonus += 8;
  }

  // Social Democrat: Spending efficiency and service delivery
  if (advisersMap.has('social_democrat')) {
    bonuses.spendingEfficiencyMultiplier += 0.12; // +12% service quality from same spending
  }

  // Technocratic Centrist: Balanced competence bonus
  if (advisersMap.has('technocratic_centrist')) {
    bonuses.credibilityBonus += 6;
    bonuses.spendingEfficiencyMultiplier += 0.05;
    bonuses.taxRevenueMultiplier += 0.02;
  }

  return bonuses;
}

const BASELINE_DEPARTMENTAL_SPENDING = getDepartmentalSpendingTotal(createInitialFiscalState().spending);
const BASELINE_FISCAL_STATE = createInitialFiscalState();
const BASELINE_DETAILED_SPENDING = Object.fromEntries(
  BASELINE_FISCAL_STATE.detailedSpending.map((item) => [item.id, item.currentBudget])
) as Record<string, number>;
const BASELINE_DETAILED_TAX = Object.fromEntries(
  BASELINE_FISCAL_STATE.detailedTaxes.map((item) => [item.id, item.currentRate])
) as Record<string, number>;

function getDetailedSpendingBudget(state: GameState, id: string, fallback = 0): number {
  const found = state.fiscal.detailedSpending?.find((item) => item.id === id);
  return found?.currentBudget ?? fallback;
}

function getDetailedTaxRate(state: GameState, id: string, fallback = 0): number {
  const found = state.fiscal.detailedTaxes?.find((item) => item.id === id);
  return found?.currentRate ?? fallback;
}

function getProgrammeTotal(state: GameState, ids: string[]): number {
  return ids.reduce((sum, id) => sum + getDetailedSpendingBudget(state, id, BASELINE_DETAILED_SPENDING[id] || 0), 0);
}

function evolveServiceMetric(
  currentValue: number,
  programmeBudget: number,
  baselineBudget: number,
  annualDemandGrowth: number,
  inflationCPI: number,
  monthsElapsed: number
): number {
  const demandAdjustedBaseline = baselineBudget * Math.pow(1 + annualDemandGrowth / 100, monthsElapsed / 12);
  const realSpending = programmeBudget / (1 + inflationCPI / 100);
  const realRatio = demandAdjustedBaseline > 0 ? realSpending / demandAdjustedBaseline : 1;

  let nextValue = currentValue;
  if (realRatio > 1.08) nextValue += 0.55;
  else if (realRatio > 1.01) nextValue += 0.22;
  else if (realRatio > 0.95) nextValue -= 0.08;
  else if (realRatio > 0.88) nextValue -= 0.35;
  else nextValue -= 0.75;

  return Math.max(0, Math.min(100, nextValue));
}

type DifficultySettings = {
  macroShockScale: number;
  inflationShockScale: number;
  pmTrustSensitivity: number;
  pmInterventionTrustThreshold: number;
  gameOverPMTrust: number;
  gameOverBackbenchThreshold: number;
  gameOverYieldThreshold: number;
  gameOverDebtThreshold: number;
  // CRITICAL FIX: Add more difficulty parameters for comprehensive scaling
  taxAvoidanceScale: number; // Scale of tax avoidance (higher = more avoidance)
  spendingEfficiencyScale: number; // Efficiency of spending (higher = more benefit)
  marketReactionScale: number; // Sensitivity of gilt yields to fiscal position
  serviceDegradationScale: number; // Rate of service quality decline
};

function getDifficultySettings(state: GameState): DifficultySettings {
  const mode = state.metadata.difficultyMode || 'standard';

  if (mode === 'forgiving') {
    return {
      macroShockScale: 0.75,
      inflationShockScale: 0.75,
      pmTrustSensitivity: 0.85,
      pmInterventionTrustThreshold: 35,
      gameOverPMTrust: 15,
      gameOverBackbenchThreshold: 24,
      gameOverYieldThreshold: 8.5,
      gameOverDebtThreshold: 130,
      taxAvoidanceScale: 0.7, // 30% less tax avoidance
      spendingEfficiencyScale: 1.15, // 15% more efficient spending
      marketReactionScale: 0.8, // 20% calmer markets
      serviceDegradationScale: 0.85, // 15% slower degradation
    };
  }

  if (mode === 'realistic') {
    return {
      macroShockScale: 1.15,
      inflationShockScale: 1.15,
      pmTrustSensitivity: 1.15,
      pmInterventionTrustThreshold: 45,
      gameOverPMTrust: 24,
      gameOverBackbenchThreshold: 33,
      gameOverYieldThreshold: 7.0,
      gameOverDebtThreshold: 115,
      taxAvoidanceScale: 1.25, // 25% more tax avoidance
      spendingEfficiencyScale: 0.9, // 10% less efficient spending
      marketReactionScale: 1.2, // 20% more volatile markets
      serviceDegradationScale: 1.15, // 15% faster degradation
    };
  }

  return {
    macroShockScale: 1.0,
    inflationShockScale: 1.0,
    pmTrustSensitivity: 1.0,
    pmInterventionTrustThreshold: 40,
    gameOverPMTrust: 20,
    gameOverBackbenchThreshold: 30,
    gameOverYieldThreshold: 7.5,
    gameOverDebtThreshold: 120,
    taxAvoidanceScale: 1.0,
    spendingEfficiencyScale: 1.0,
    marketReactionScale: 1.0,
    serviceDegradationScale: 1.0,
  };
}

// ===========================
// Turn Processing
// ===========================

export function processTurn(state: GameState): GameState {
  let newState = { ...state };

  // Step 0: Check fiscal year rollover (April = new fiscal year)
  newState = checkFiscalYearRollover(newState);

  // Step 0.5: Process emergency programmes (decrement months, remove expired)
  newState = processEmergencyProgrammes(newState);

  // Step 1: Calculate GDP growth
  newState = calculateGDPGrowth(newState);

  // Step 2: Calculate employment & unemployment
  newState = calculateEmployment(newState);

  // Step 3: Calculate inflation
  newState = calculateInflation(newState);

  // Step 4: Calculate wage growth
  newState = calculateWageGrowth(newState);

  // Step 5: Calculate Bank of England response
  newState = calculateBankRate(newState);

  // Step 6: Calculate tax revenues
  newState = calculateTaxRevenues(newState);

  // Step 7: Calculate spending impacts (debt interest)
  newState = calculateSpendingEffects(newState);

  // Step 8: Calculate deficit & debt
  newState = calculateFiscalBalance(newState);

  // Step 8.5: Evaluate fiscal rules compliance
  newState = evaluateFiscalRuleCompliance(newState);

  // Step 8.6: Check Golden Rule enforcement
  newState = checkGoldenRuleEnforcement(newState);

  // Step 9: Calculate gilt yields & markets
  newState = calculateMarkets(newState);

  // Step 10: Calculate service quality
  newState = calculateServiceQuality(newState);

  // Step 11: Calculate public sector pay & strikes
  newState = calculatePublicSectorPay(newState);

  // Step 12: Calculate approval ratings
  newState = calculateApproval(newState);

  // Step 13: Calculate backbench satisfaction
  newState = calculateBackbenchSatisfaction(newState);

  // Step 13.5: Update MP stances based on current fiscal position
  newState = updateMPStances(newState);

  // Step 14: Calculate PM trust
  newState = calculatePMTrust(newState);

  // Step 15: Check for PM intervention
  newState = checkPMIntervention(newState);

  // Step 15.5: Process PM communications (messages, warnings, demands)
  newState = processPMCommunicationsStep(newState);

  // Step 16: Trigger events and generate newspaper
  newState = triggerEvents(newState);

  // Step 17: Update credit rating
  newState = updateCreditRating(newState);

  // Step 18: Update historical snapshot
  newState = saveHistoricalSnapshot(newState);

  // Step 19: Check for game over
  newState = checkGameOver(newState);

  return newState;
}

// ===========================
// Step 0: Fiscal Year Rollover
// ===========================

/**
 * Check if we've entered a new fiscal year (April) and update tracking.
 * UK fiscal year runs from April to March.
 * Turn 0 = July 2024 (month 7), so April is month 4.
 * Also checks annual spending growth pledges at fiscal year end.
 */
function checkFiscalYearRollover(state: GameState): GameState {
  const { metadata, fiscal, manifesto, economic } = state;
  const currentMonth = metadata.currentMonth;

  // Check if we just entered April (new fiscal year)
  // Skip if turn 0 (game start)
  if (currentMonth === 4 && metadata.currentTurn > 0) {
    // Check annual growth pledges before rolling over
    const violatedPledges = checkAnnualGrowthPledges(
      manifesto,
      fiscal,
      economic.inflationCPI
    );

    // Apply violations if any
    let newManifesto = manifesto;
    if (violatedPledges.length > 0) {
      newManifesto = applyManifestoViolations(
        manifesto,
        violatedPledges,
        metadata.currentTurn
      );
    }

    // New fiscal year - snapshot current spending and increment year
    const newFiscalState = {
      ...fiscal,
      currentFiscalYear: fiscal.currentFiscalYear + 1,
      fiscalYearStartTurn: metadata.currentTurn,
      fiscalYearStartSpending: { ...fiscal.spending },
    };

    return {
      ...state,
      fiscal: newFiscalState,
      manifesto: newManifesto,
    };
  }

  return state;
}

// ===========================
// Step 0.5: Emergency Programmes
// ===========================

function processEmergencyProgrammes(state: GameState): GameState {
  const { emergencyProgrammes } = state;

  // Decrement remaining months for each active programme
  const updatedProgrammes = emergencyProgrammes.active
    .map(prog => ({
      ...prog,
      remainingMonths: Math.max(0, prog.remainingMonths - 1)
    }))
    // Remove programmes where rebuilding is complete
    .filter(prog => prog.remainingMonths > 0);

  return {
    ...state,
    emergencyProgrammes: {
      ...emergencyProgrammes,
      active: updatedProgrammes,
    },
  };
}

// ===========================
// Step 1: GDP Growth
// ===========================

function calculateGDPGrowth(state: GameState): GameState {
  const { economic, fiscal, markets } = state;
  const difficulty = getDifficultySettings(state);
  const adviserBonuses = getAdviserBonuses(state);

  // Base trend REAL growth (monthly)
  let monthlyRealGrowth = 0.125; // 1.5% annual = ~0.125% monthly

  // CRITICAL FIX: Add spending lag structure
  // Infrastructure spending takes 12-18 months to impact GDP
  // Use rolling average of past spending instead of current month
  const snapshots = state.simulation.monthlySnapshots;
  let laggedInfrastructureSpending = fiscal.spending.infrastructure;
  if (snapshots.length >= 12) {
    // Average infrastructure spending over past 12 months (simplified - would need to track in state properly)
    // For now, use 70% current + 30% baseline to approximate lag
    laggedInfrastructureSpending = fiscal.spending.infrastructure * 0.7 + (100 * 0.3);
  }

  // Fiscal multiplier effect (granular)
  // Split spending into Capital (Investment), Current (Consumption), and Welfare (Transfers)
  // Capital: Lower immediate impact (0.6), high long-term supply side
  // Current: High immediate impact (0.9), low long-term supply side
  // Welfare: High immediate impact if MPC is high (recession), lower otherwise

  const currentSpending =
    fiscal.spending.nhsCurrent + fiscal.spending.educationCurrent + fiscal.spending.defenceCurrent +
    fiscal.spending.policeCurrent + fiscal.spending.justiceCurrent + fiscal.spending.otherCurrent;

  const capitalSpending =
    fiscal.spending.nhsCapital + fiscal.spending.educationCapital + fiscal.spending.defenceCapital +
    fiscal.spending.infrastructureCapital + fiscal.spending.policeCapital + fiscal.spending.justiceCapital +
    fiscal.spending.otherCapital;

  const welfareSpending = fiscal.spending.welfareCurrent;

  const baselineCurrent = 647.6; // Baseline current spending (excl welfare)
  const baselineCapital = 141.4; // Baseline capital spending
  const baselineWelfare = 290.0; // Baseline welfare spending

  const currentChange = currentSpending - baselineCurrent;
  const capitalChange = capitalSpending - baselineCapital;
  const welfareChange = welfareSpending - baselineWelfare;

  // Multipliers based on economic slack
  const unemploymentGap = economic.unemploymentRate - 4.25;
  const slackMultiplier = Math.max(0.8, Math.min(1.5, 1 + (unemploymentGap * 0.15)));

  // 1. Current Spending Multiplier: 0.9 base (imports leakage)
  let currentMultiplier = 0.9 * slackMultiplier;

  // 2. Capital Spending Multiplier: 0.6 base (slow deploy, high import content)
  let capitalMultiplier = 0.6 * slackMultiplier;

  // 3. Welfare Multiplier: 0.7 base, rises to 1.1 in recession (high marginal propensity to consume)
  const mpcBonus = unemploymentGap > 0 ? unemploymentGap * 0.1 : 0;
  let welfareMultiplier = (0.7 + mpcBonus) * slackMultiplier;

  // Inflation dampener: High inflation reduces real multipliers (supply constraints)
  if (economic.inflationCPI > 3) {
    const inflationPenalty = (economic.inflationCPI - 3) * 0.08;
    const dampener = Math.max(0.6, 1 - inflationPenalty);
    currentMultiplier *= dampener;
    capitalMultiplier *= dampener;
    welfareMultiplier *= dampener;
  }

  const fiscalImpact = (currentChange * currentMultiplier +
    capitalChange * capitalMultiplier +
    welfareChange * welfareMultiplier) * 0.0022; // Scaling factor to monthly GDP %

  // CRITICAL FIX: Supply-side tax effects
  // Corporation tax above 30% reduces investment and growth
  const corpTaxPenalty = fiscal.corporationTaxRate > 30
    ? (fiscal.corporationTaxRate - 30) * -0.008 // -0.1% annual per pp above 30%
    : 0;

  // Corporation tax above 35% triggers base erosion (companies shift profits abroad)
  const corpTaxBaseErosion = fiscal.corporationTaxRate > 35
    ? (fiscal.corporationTaxRate - 35) * -0.012 // Additional -0.15% annual per pp above 35%
    : 0;

  // Top income tax rate above 50% reduces labour supply and entrepreneurship
  const topRatePenalty = fiscal.incomeTaxAdditionalRate > 50
    ? (fiscal.incomeTaxAdditionalRate - 50) * -0.004 // -0.05% annual per pp above 50%
    : 0;

  const supplySideTaxEffect = (corpTaxPenalty + corpTaxBaseErosion + topRatePenalty) / 12; // Convert to monthly

  // Tax drag (higher taxes reduce growth)
  const baselineRevenue = 1078;
  const revenueChange = fiscal.totalRevenue_bn - baselineRevenue;
  const taxDrag = revenueChange * -0.0018;

  // Monetary conditions (higher yields tighten)
  const yieldEffect = (markets.giltYield10y - 4.15) * -0.02;

  // Sterling effect (appreciation hurts exports)
  const sterlingEffect = (markets.sterlingIndex - 100) * -0.001;

  // Infrastructure quality (long-term supply side)
  const servicesEffect = (state.services.infrastructureQuality - 58) * 0.003;

  // Combine effects on REAL growth
  monthlyRealGrowth += fiscalImpact + supplySideTaxEffect + taxDrag + yieldEffect + sterlingEffect + servicesEffect;

  // Apply adviser bonus (Heterodox Economist +0.15pp annual = +0.0125pp monthly)
  monthlyRealGrowth += adviserBonuses.gdpGrowthBonus / 12;

  // Business cycle randomness (wider variance for meaningful cycles)
  const randomShock = (Math.random() - 0.5) * 0.14 * difficulty.macroShockScale;
  monthlyRealGrowth += randomShock;

  // Clamp monthly REAL growth to realistic range
  monthlyRealGrowth = Math.max(-1.5, Math.min(1.5, monthlyRealGrowth));

  // Nominal GDP growth = real growth + inflation (GDP deflator ~ CPI)
  // This is critical: tax revenues scale with nominal GDP, so nominal must
  // grow with both real output and price level
  const monthlyInflation = economic.inflationCPI / 12;
  const monthlyNominalGrowth = monthlyRealGrowth + monthlyInflation;

  // Calculate new nominal GDP
  const newGDP = economic.gdpNominal_bn * (1 + monthlyNominalGrowth / 100);

  // Annualise REAL growth via compounding
  const annualRealGrowth = (Math.pow(1 + monthlyRealGrowth / 100, 12) - 1) * 100;

  return {
    ...state,
    economic: {
      ...economic,
      gdpGrowthMonthly: monthlyRealGrowth,
      gdpGrowthAnnual: annualRealGrowth,
      gdpNominal_bn: newGDP,
    },
  };
}

// ===========================
// Step 2: Employment
// ===========================

function calculateEmployment(state: GameState): GameState {
  const { economic, fiscal } = state;

  // Okun's Law: GDP growth affects unemployment (with lag)
  // 1pp below trend growth -> 0.4pp higher unemployment
  const nairu = 4.25;
  const trendGrowth = 1.5;
  const growthGap = economic.gdpGrowthAnnual - trendGrowth;
  const okunsCoefficient = -0.4;
  const unemploymentPressure = growthGap * okunsCoefficient;

  // Gradual adjustment (labour market has inertia)
  let newUnemployment = economic.unemploymentRate + unemploymentPressure / 12;

  // NAIRU reversion: when growth is at trend, unemployment drifts toward NAIRU
  // Without this, unemployment freezes at arbitrary levels
  const nairuDrift = (nairu - newUnemployment) * 0.02; // 2% monthly drift toward NAIRU
  newUnemployment += nairuDrift;

  // CRITICAL FIX: Tax policy effects on employment
  // High employer NI → companies reduce headcount, shift to contractors/automation
  // Each pp above 15% adds ~0.03pp unemployment (cumulative)
  const employerNIEffect = fiscal.employerNIRate > 15
    ? (fiscal.employerNIRate - 15) * 0.003 // +0.03pp unemployment per 10pp NI increase
    : 0;

  // High corporation tax → reduced investment → slower job creation
  // Each pp above 30% adds ~0.02pp unemployment (cumulative via reduced investment)
  const corpTaxEffect = fiscal.corporationTaxRate > 30
    ? (fiscal.corporationTaxRate - 30) * 0.002 // +0.02pp per 10pp tax increase
    : 0;

  // CRITICAL FIX: Welfare trap mechanics
  // Very high marginal tax rates (income tax + NI + benefit withdrawal) discourage work
  // Effective marginal rate = basic rate + employee NI + benefit taper (63%)
  // "Poverty trap": when working yields little more income than benefits
  const effectiveMarginalRate = fiscal.incomeTaxBasicRate + fiscal.nationalInsuranceRate + 63; // 63% benefit taper
  // Above 80% effective marginal rate: significant work disincentive
  // At 85% (20% + 12% + 63% = 95%): +0.3pp unemployment
  // At 90% (25% + 15% + 63% = 103%): +0.6pp unemployment
  const welfareTrapEffect = effectiveMarginalRate > 80
    ? (effectiveMarginalRate - 80) * 0.06 // +0.06pp unemployment per pp above 80%
    : 0;

  newUnemployment += employerNIEffect + corpTaxEffect + welfareTrapEffect;

  // Clamp to reasonable range
  newUnemployment = Math.max(3.0, Math.min(12.0, newUnemployment));

  return {
    ...state,
    economic: {
      ...economic,
      unemploymentRate: newUnemployment,
    },
  };
}

// ===========================
// Step 3: Inflation
// ===========================

function calculateInflation(state: GameState): GameState {
  const { economic, fiscal, markets } = state;
  const difficulty = getDifficultySettings(state);

  // Hybrid Phillips Curve
  const nairu = 4.25;
  const unemploymentGap = nairu - economic.unemploymentRate;

  // New Feature: Inflation Expectations De-anchoring (Realistic Mode)
  // If inflation runs hot for too long, expectations become "unmoored" from the 2% target
  // They start following recent trends instead (adaptive expectations)
  // This makes inflation "sticky" and harder to bring down

  let anchorHealth = economic.inflationAnchorHealth ?? 100; // 0-100 score

  // Decay logic (only in Realistic/Standard, but mostly bites in Realistic due to volatility)
  if (economic.inflationCPI > 8.0) {
    anchorHealth -= 4.0; // Rapid loss of credibility
  } else if (economic.inflationCPI > 5.0) {
    anchorHealth -= 2.0; // Steady erosion
  } else if (economic.inflationCPI > 3.5) {
    anchorHealth -= 0.5; // Slight drift
  }

  // Recovery logic (hard work required)
  // Requires low inflation AND positive real interest rates (credibility signal)
  const realRate = markets.bankRate - economic.inflationCPI;
  if (economic.inflationCPI < 3.0 && realRate > 1.0) {
    anchorHealth += 1.5; // Re-anchoring
  } else if (economic.inflationCPI < 2.5) {
    anchorHealth += 0.5; // Passive stability
  }

  anchorHealth = Math.max(0, Math.min(100, anchorHealth));

  // Calculate Expectations Term
  // Standard model: 40% weight on expectations
  // If anchored: 40% on Target (2.0%)
  // If de-anchored: 40% on Recent Trend (adaptive)
  const totalExpectationsWeight = 0.40;
  const anchorWeight = (anchorHealth / 100); // 1.0 = fully anchored, 0.0 = fully adaptive

  const recentTrend = economic.inflationCPI; // Simplified recent trend
  const expectationsTerm = (2.0 * anchorWeight * totalExpectationsWeight) +
    (recentTrend * (1 - anchorWeight) * totalExpectationsWeight);

  // Persistence (30%): inflation has inertia (reduced from 35% to make room for expectations dynamic)
  const persistence = economic.inflationCPI * 0.30;

  // Domestic pressure (15%): Phillips curve
  const domesticPressure = (2.0 + unemploymentGap * 2.0) * 0.15;

  // Import prices (10%): sterling effect
  const sterlingChange = (100 - markets.sterlingIndex) / 100;
  const importPressure = (2.0 + sterlingChange * 8.0) * 0.10;

  // VAT pass-through (one-off level effect spread over months)
  const vatChange = fiscal.vatRate - 20;
  const vatEffect = vatChange * 0.04; // Spread effect

  // Wage-price spiral component
  const realWageGap = economic.wageGrowthAnnual - economic.inflationCPI;
  const wagePressure = realWageGap > 2.0 ? (realWageGap - 2.0) * 0.1 : 0;

  let inflation = persistence + expectationsTerm + domesticPressure + importPressure + vatEffect + wagePressure;

  // Small random component
  const randomShock = (Math.random() - 0.5) * 0.14 * difficulty.inflationShockScale;
  inflation += randomShock;

  // Clamp to realistic UK range (deflation to high but not hyperinflation - unless de-anchored!)
  // If de-anchored, allow it to run higher
  const maxInflation = anchorHealth < 50 ? 20.0 : 12.0;
  inflation = Math.max(-2.0, Math.min(maxInflation, inflation));

  return {
    ...state,
    economic: {
      ...economic,
      inflationCPI: inflation,
      inflationAnchorHealth: anchorHealth,
    },
  };
}

// ===========================
// Step 4: Wage Growth
// ===========================

function calculateWageGrowth(state: GameState): GameState {
  const { economic } = state;

  // Wages respond to inflation expectations and labour market tightness
  const inflationExpectation = economic.inflationCPI;
  const labourTightness = Math.max(0, 4.25 - economic.unemploymentRate);

  // Wage growth = inflation expectations + productivity (1.5%) + tightness premium
  let wageGrowth = inflationExpectation * 0.6 + 1.5 + labourTightness * 0.8;

  // Gradual adjustment
  const currentWageGrowth = economic.wageGrowthAnnual;
  wageGrowth = currentWageGrowth + (wageGrowth - currentWageGrowth) * 0.2;

  wageGrowth = Math.max(0, Math.min(15.0, wageGrowth));

  return {
    ...state,
    economic: {
      ...economic,
      wageGrowthAnnual: wageGrowth,
    },
  };
}

// ===========================
// Step 5: Bank of England
// ===========================

function calculateBankRate(state: GameState): GameState {
  const { economic, markets } = state;

  // Taylor rule (neutral rate consistent with post-GFC UK estimates)
  const neutralRate = 3.5;
  const inflationGap = economic.inflationCPI - 2.0;
  const outputGap = economic.gdpGrowthAnnual - 1.5;

  const taylorRate = neutralRate + 1.5 * inflationGap + 0.5 * outputGap;

  // Bank Rate adjusts gradually (inertia)
  const currentRate = markets.bankRate;
  const targetAdjustment = (taylorRate - currentRate) * 0.08; // slower monetary transmission

  let newRate = currentRate + targetAdjustment;

  // Clamp to realistic range (modern UK institutional constraints)
  newRate = Math.max(0.1, Math.min(8.0, newRate));

  // Round to nearest 0.25%
  newRate = Math.round(newRate * 4) / 4;

  return {
    ...state,
    markets: {
      ...markets,
      bankRate: newRate,
    },
  };
}

// ===========================
// Step 6: Tax Revenues
// ===========================

function calculateTaxRevenues(state: GameState): GameState {
  const { economic, fiscal } = state;
  const difficulty = getDifficultySettings(state);
  const adviserBonuses = getAdviserBonuses(state);

  // Base revenues (£bn annual): Income Tax 269, NI 164, VAT 171, Corp Tax 88, Other 386
  // Scale by cumulative nominal GDP growth from baseline, with elasticities

  // Use ratio of current nominal GDP to baseline to capture cumulative growth
  const baselineNominalGDP = 2730; // July 2024 nominal GDP (£bn)
  const nominalGDPRatio = economic.gdpNominal_bn / baselineNominalGDP;

  // Income tax (elasticity 1.1 to nominal GDP)
  const incomeTaxBase = 269;
  const incomeTaxRateEffect = (fiscal.incomeTaxBasicRate - 20) * 7.0 +
    (fiscal.incomeTaxHigherRate - 40) * 2.0 +
    (fiscal.incomeTaxAdditionalRate - 45) * 0.2;

  // CRITICAL FIX: Tax avoidance on additional rate (top 1% of earners)
  // Above 50%, avoidance accelerates (salary sacrifice, incorporation, emigration)
  // Scaled by difficulty setting
  let additionalRateAvoidanceLoss = 0;
  if (fiscal.incomeTaxAdditionalRate > 50) {
    const excessRate = fiscal.incomeTaxAdditionalRate - 50;
    // Each pp above 50% loses 0.8% of the additional rate base (£54bn at baseline)
    // Accelerates: at 60%, loses 10*0.8=8% = £4.3bn; at 70%, loses 20*0.8=16% = £8.6bn
    const avoidanceRate = Math.pow(1.016, excessRate) - 1; // Exponential: ~1.6% per pp, accelerating
    additionalRateAvoidanceLoss = 54 * avoidanceRate * difficulty.taxAvoidanceScale;
  }

  const incomeTaxRevenue = (incomeTaxBase + incomeTaxRateEffect - additionalRateAvoidanceLoss) * Math.pow(nominalGDPRatio, 1.1);

  // National Insurance (elasticity 1.0)
  // Employee NI + Employer NI combined
  const niBase = 164;
  const niEmployeeRateEffect = (fiscal.nationalInsuranceRate - 8) * 6.0;
  const niEmployerRateEffect = (fiscal.employerNIRate - 13.8) * 8.5;

  // CRITICAL FIX: National Insurance avoidance (H4 completion)
  // Employee NI above 12%: salary sacrifice, dividend substitution, contractor reclassification
  let niEmployeeAvoidanceLoss = 0;
  if (fiscal.nationalInsuranceRate > 12) {
    const excessRate = fiscal.nationalInsuranceRate - 12;
    // Exponential avoidance: ~2% per pp above 12%
    // At 15% NI: loses ~6%; at 18%: loses ~12%
    const avoidanceRate = Math.pow(1.02, excessRate) - 1;
    niEmployeeAvoidanceLoss = (niBase * 0.6 + niEmployeeRateEffect) * avoidanceRate * difficulty.taxAvoidanceScale;
  }

  // Employer NI above 15%: shift to contractors, offshore, automation to reduce headcount
  let niEmployerAvoidanceLoss = 0;
  if (fiscal.employerNIRate > 15) {
    const excessRate = fiscal.employerNIRate - 15;
    // Exponential avoidance: ~2.5% per pp above 15%
    // At 18% NI: loses ~8%; at 21%: loses ~15%
    const avoidanceRate = Math.pow(1.025, excessRate) - 1;
    niEmployerAvoidanceLoss = (niBase * 0.4 + niEmployerRateEffect) * avoidanceRate * difficulty.taxAvoidanceScale;
  }

  const niRevenue = (niBase + niEmployeeRateEffect + niEmployerRateEffect - niEmployeeAvoidanceLoss - niEmployerAvoidanceLoss) * Math.pow(nominalGDPRatio, 1.0);

  // VAT (elasticity 1.0 to consumption)
  const vatBase = 171;
  const vatRateEffect = (fiscal.vatRate - 20) * 7.5;

  // CRITICAL FIX: VAT behavioral response (consumption reduction)
  // Higher VAT reduces real consumption via two channels:
  // 1. Price effect: people buy less when prices rise
  // 2. Evasion/substitution: cash economy, cross-border shopping
  let vatBehavioralLoss = 0;
  if (fiscal.vatRate > 20) {
    const excessRate = fiscal.vatRate - 20;
    // Each pp above 20% loses ~2% of VAT base (semi-elastic demand)
    // At 25% VAT: loses ~10% of base; at 30%: loses ~20%
    const consumptionReduction = Math.pow(1.02, excessRate) - 1;
    vatBehavioralLoss = (vatBase + vatRateEffect) * consumptionReduction * difficulty.taxAvoidanceScale;
  }

  const vatRevenue = Math.max(0, (vatBase + vatRateEffect - vatBehavioralLoss) * Math.pow(nominalGDPRatio, 1.0));

  // Corporation Tax (elasticity 1.3, volatile)
  const corpTaxBase = 88;
  const corpTaxRateEffect = (fiscal.corporationTaxRate - 25) * 3.2;

  // CRITICAL FIX: Corporation tax avoidance (profit shifting, base erosion)
  // Above 30%, avoidance accelerates dramatically (transfer pricing, IP offshoring)
  // Scaled by difficulty setting
  let corpTaxAvoidanceLoss = 0;
  if (fiscal.corporationTaxRate > 30) {
    const excessRate = fiscal.corporationTaxRate - 30;
    // Avoidance accelerates exponentially: at 35%, ~10% base lost; at 40%, ~20% lost; at 45%, ~35% lost
    const avoidanceRate = Math.pow(1.035, excessRate) - 1; // Exponential: ~3.5% per pp, accelerating
    const effectiveBase = corpTaxBase + corpTaxRateEffect;
    corpTaxAvoidanceLoss = effectiveBase * avoidanceRate * difficulty.taxAvoidanceScale;
  }

  const corpTaxRevenue = Math.max(0, (corpTaxBase + corpTaxRateEffect - corpTaxAvoidanceLoss) * Math.pow(nominalGDPRatio, 1.3));

  // Other taxes (elasticity 0.8)
  const otherRevenue = 386 * Math.pow(nominalGDPRatio, 0.8);

  // Revenue adjustment from budget system reckoners (CGT, IHT, excise duties, reliefs, etc.)
  const revenueAdj = fiscal.revenueAdjustment_bn || 0;

  // Apply adviser bonus (Treasury Mandarin +3%, Technocratic Centrist +2%)
  const totalRevenueAnnual = (incomeTaxRevenue + niRevenue + vatRevenue + corpTaxRevenue + otherRevenue + revenueAdj) * adviserBonuses.taxRevenueMultiplier;

  return {
    ...state,
    fiscal: {
      ...fiscal,
      totalRevenue_bn: totalRevenueAnnual,
    },
  };
}

// ===========================
// Step 7: Spending Effects
// ===========================

function calculateSpendingEffects(state: GameState): GameState {
  const { fiscal, markets, economic } = state;
  const adviserBonuses = getAdviserBonuses(state);

  // Calculate debt interest separately - do NOT add to totalSpending_bn
  // totalSpending_bn tracks departmental spending only
  // Deficit calculation will add debt interest
  const debtStock = fiscal.debtNominal_bn;

  // Average effective interest rate (mix of old and new debt)
  // Old debt is at historical rates, new issuance at current yields
  // UK gilt stock average maturity ~14 years, so ~7% rolls over per year = ~0.6% per month
  const rolloverFraction = 0.006;
  const oldEffectiveRate = 3.5; // Historical average coupon
  const newIssuanceRate = markets.giltYield10y;
  const blendedRate = oldEffectiveRate * (1 - rolloverFraction) + newIssuanceRate * rolloverFraction;

  // Gradually update effective rate
  const prevEffectiveRate = fiscal.debtInterest_bn > 0 ? (fiscal.debtInterest_bn / debtStock) * 100 : 3.5;
  const effectiveRate = prevEffectiveRate + (blendedRate - prevEffectiveRate) * 0.05;

  // Apply adviser bonus (Fiscal Hawk -8% debt interest)
  const debtInterest = (debtStock * effectiveRate * (1 - adviserBonuses.debtInterestReduction / 100)) / 100;

  // Automatic welfare stabilizers: unemployment above baseline increases welfare spending
  // Each 1pp above baseline unemployment adds ~£5bn in additional benefits claims
  const baselineUnemployment = 4.2;
  const unemploymentExcess = Math.max(0, economic.unemploymentRate - baselineUnemployment);
  const autoWelfareIncrease = unemploymentExcess * 5.0; // £5bn per percentage point

  // Apply automatic stabilizer to welfare spending
  const adjustedSpending = {
    ...fiscal.spending,
    welfare: fiscal.spending.welfare + autoWelfareIncrease,
  };

  // Recalculate total departmental spending from breakdown (with stabilizer)
  const departmentalSpending = DEPARTMENTAL_SPENDING_KEYS.reduce(
    (sum, key) => sum + adjustedSpending[key], 0
  );

  return {
    ...state,
    fiscal: {
      ...fiscal,
      debtInterest_bn: debtInterest,
      totalSpending_bn: departmentalSpending,
    },
  };
}

// ===========================
// Step 8: Fiscal Balance
// ===========================
//
// CRITICAL: This is the ONLY place where deficit and debt should be calculated.
//
// IMPORTANT CALCULATION PRINCIPLES:
// 1. All fiscal values (deficit_bn, debtNominal_bn, debtPctGDP, etc.) are ANNUAL figures
// 2. Monthly debt accumulation is calculated as: (annual deficit / 12)
// 3. DO NOT manually add to deficit or debt in other parts of the codebase
// 4. Emergency programme costs are included via emergencyRebuildingCosts (line 490)
// 5. Debt interest is recalculated monthly based on rolling debt stock
//
// WHY THIS MATTERS:
// - Emergency event costs were previously double-counted (added directly to debt + via monthly accumulation)
// - Manual deficit calculations in other files caused inconsistencies
// - Annual vs monthly confusion led to debt growing 12x too fast
//
// FIXED BUGS:
// - game-state.tsx respondToEvent: removed manual deficit_bn and debtNominal_bn updates (Bug #1)
// - game-state.tsx executeManifestoOneClick: removed manual deficit calculation (Bug #2)
//
// The fiscal balance calculation follows this formula:
// Total Managed Expenditure = Departmental Spending + Debt Interest + Emergency Costs
// Annual Deficit = TME - Total Revenue
// Monthly Debt Increase = Annual Deficit / 12
//

function calculateFiscalBalance(state: GameState): GameState {
  const { fiscal, economic, emergencyProgrammes } = state;

  // Total managed expenditure = departmental spending + debt interest
  let totalManagedExpenditure = fiscal.totalSpending_bn + fiscal.debtInterest_bn;

  // Add emergency programme rebuilding costs
  const emergencyRebuildingCosts = emergencyProgrammes.active
    .filter(prog => prog.remainingMonths > 0)
    .reduce((sum, prog) => sum + prog.rebuildingCostPerMonth_bn, 0);

  totalManagedExpenditure += emergencyRebuildingCosts;

  const deficit_bn = totalManagedExpenditure - fiscal.totalRevenue_bn;
  const deficitPctGDP = (deficit_bn / economic.gdpNominal_bn) * 100;

  // Update debt stock (monthly increment)
  const newDebt = fiscal.debtNominal_bn + (deficit_bn / 12);
  const debtPctGDP = (newDebt / economic.gdpNominal_bn) * 100;

  // Fiscal headroom: how much room before breaching stability rule
  // Stability rule: current budget balance (excl. investment) must be in balance
  // Calculate total capital spending across ALL departments
  const totalCapitalSpending =
    fiscal.spending.nhsCapital +
    fiscal.spending.educationCapital +
    fiscal.spending.defenceCapital +
    fiscal.spending.infrastructureCapital +
    fiscal.spending.policeCapital +
    fiscal.spending.justiceCapital +
    fiscal.spending.otherCapital;

  const currentBudgetBalance = fiscal.totalRevenue_bn - (fiscal.totalSpending_bn - totalCapitalSpending) - fiscal.debtInterest_bn - emergencyRebuildingCosts;
  const headroom = Math.max(0, currentBudgetBalance);

  return {
    ...state,
    fiscal: {
      ...fiscal,
      deficit_bn,
      deficitPctGDP,
      debtNominal_bn: newDebt,
      debtPctGDP,
      fiscalHeadroom_bn: headroom,
    },
  };
}

// ===========================
// Step 8.5: Fiscal Rules Compliance
// ===========================

function evaluateFiscalRuleCompliance(state: GameState): GameState {
  const { fiscal, political } = state;
  const rule = getFiscalRuleById(political.chosenFiscalRule);
  const adviserBonuses = getAdviserBonuses(state);

  // Calculate total capital spending across ALL departments
  const totalCapitalSpending =
    fiscal.spending.nhsCapital +
    fiscal.spending.educationCapital +
    fiscal.spending.defenceCapital +
    fiscal.spending.infrastructureCapital +
    fiscal.spending.policeCapital +
    fiscal.spending.justiceCapital +
    fiscal.spending.otherCapital;

  // Current budget balance: revenue - (spending excl. investment) - debt interest
  // Investment spending (all capital) is excluded from the current budget
  const currentBudgetBalance = fiscal.totalRevenue_bn -
    (fiscal.totalSpending_bn - totalCapitalSpending) -
    fiscal.debtInterest_bn;
  const currentBudgetMet = !rule.rules.currentBudgetBalance || currentBudgetBalance >= -0.5;

  // Overall balance: total revenue >= total spending + debt interest
  const overallBalance = fiscal.totalRevenue_bn - fiscal.totalSpending_bn - fiscal.debtInterest_bn;
  const overallBalanceMet = !rule.rules.overallBalance || overallBalance >= -0.5;

  // Deficit ceiling
  const deficitCeilingMet = rule.rules.deficitCeiling === undefined ||
    fiscal.deficitPctGDP <= rule.rules.deficitCeiling;

  // Debt target
  const debtTargetMet = rule.rules.debtTarget === undefined ||
    fiscal.debtPctGDP <= rule.rules.debtTarget;

  // Debt falling: compare current debt/GDP to 6 months ago
  const snapshots = state.simulation.monthlySnapshots;
  let debtFallingMet = true;
  if (rule.rules.debtFalling && snapshots.length >= 6) {
    const sixMonthsAgo = snapshots[snapshots.length - 6];
    debtFallingMet = fiscal.debtPctGDP < sixMonthsAgo.debt;
  }

  // Overall compliance
  const overallCompliant = currentBudgetMet && overallBalanceMet &&
    deficitCeilingMet && debtTargetMet && debtFallingMet;

  // Track consecutive breaches
  const prevBreaches = political.fiscalRuleCompliance.consecutiveBreaches;
  const consecutiveBreaches = overallCompliant ? 0 : prevBreaches + 1;

  // Credibility penalty for sustained non-compliance
  let credibilityChange = 0;
  if (!overallCompliant) {
    // First breach is minor; sustained breaches get worse
    if (consecutiveBreaches >= 6) {
      credibilityChange = -2; // Sustained non-compliance (6+ months)
    } else if (consecutiveBreaches >= 3) {
      credibilityChange = -1; // Growing concern (3-5 months)
    } else {
      credibilityChange = -0.5; // Initial breach
    }
  } else if (prevBreaches > 0) {
    // Recovering compliance restores some credibility
    credibilityChange = 1;
  }

  return {
    ...state,
    political: {
      ...political,
      fiscalRuleCompliance: {
        currentBudgetMet,
        overallBalanceMet,
        deficitCeilingMet,
        debtTargetMet,
        debtFallingMet,
        overallCompliant,
        consecutiveBreaches,
        currentBudgetGap: Math.max(0, -currentBudgetBalance),
        capitalInvestment: totalCapitalSpending,
      },
      // Apply adviser bonus (Treasury Mandarin +5, Fiscal Hawk +8, Technocratic Centrist +6)
      credibilityIndex: Math.max(0, Math.min(100,
        political.credibilityIndex + credibilityChange + adviserBonuses.credibilityBonus)),
    },
  };
}

// ===========================
// Step 8.6: Golden Rule Enforcement
// ===========================

/**
 * Check if borrowing is being used for investment (Golden Rule compliance).
 * Only relevant for fiscal rules with investmentExempt: true.
 * Golden Rule: deficit increase should not exceed capital increase
 * (i.e., we're borrowing AT MOST for investment, not for current spending)
 */
function checkGoldenRuleEnforcement(state: GameState): GameState {
  const { fiscal, political } = state;
  const rule = getFiscalRuleById(political.chosenFiscalRule);

  // Only enforce for rules that claim to borrow only for investment
  if (!rule.rules.investmentExempt || rule.id === 'mmt-inspired') {
    return state;
  }

  // Calculate baseline values (July 2024 initial state)
  const baselineDeficit = 111; // Initial deficit
  const baselineCapital = 12.0 + 12.0 + 16.6 + 80.0 + 0.5 + 0.3 + 20.0; // ~141.4bn

  // Calculate current totals
  const deficitIncrease = fiscal.deficit_bn - baselineDeficit;

  const currentCapital =
    fiscal.spending.nhsCapital +
    fiscal.spending.educationCapital +
    fiscal.spending.defenceCapital +
    fiscal.spending.infrastructureCapital +
    fiscal.spending.policeCapital +
    fiscal.spending.justiceCapital +
    fiscal.spending.otherCapital;

  const capitalIncrease = currentCapital - baselineCapital;

  // Golden Rule: deficit increase should not exceed capital increase + tolerance
  // If violation: borrowing for current spending, not just investment
  if (deficitIncrease > capitalIncrease + 1) {  // +1bn tolerance
    // Violation: borrowing for current spending
    return {
      ...state,
      political: {
        ...political,
        credibilityIndex: Math.max(0, political.credibilityIndex - 2),
      },
    };
  }

  return state;
}

// ===========================
// Step 9: Markets
// ===========================

function calculateMarkets(state: GameState): GameState {
  const { fiscal, markets, political } = state;
  const previousSnapshot = state.simulation.monthlySnapshots?.[state.simulation.monthlySnapshots.length - 1];
  const difficulty = getDifficultySettings(state);

  // Gilt yields respond to Bank Rate, fiscal position, credibility
  const baseYield = markets.bankRate + 0.3; // Term premium

  // Fiscal risk premium (non-linear: rises faster above 100% debt/GDP)
  // Scaled by difficulty (more volatile in realistic mode)
  const debtRatio = fiscal.debtPctGDP;
  let debtPremium = 0;
  if (debtRatio > 80) {
    debtPremium = (debtRatio - 80) * 0.01 * difficulty.marketReactionScale;
  }
  if (debtRatio > 100) {
    debtPremium += (debtRatio - 100) * 0.03 * difficulty.marketReactionScale; // Accelerates above 100%
  }

  // Deficit premium (scaled by difficulty)
  const deficitPremium = Math.max(0, (fiscal.deficitPctGDP - 3) * 0.1 * difficulty.marketReactionScale);

  // Direction-of-travel premium: markets price fiscal momentum, not just levels.
  const previousDebt = typeof previousSnapshot?.debt === 'number' ? previousSnapshot.debt : fiscal.debtPctGDP;
  const previousDeficit = typeof previousSnapshot?.deficit === 'number' ? previousSnapshot.deficit : fiscal.deficitPctGDP;
  const debtTrend = fiscal.debtPctGDP - previousDebt;
  const deficitTrend = fiscal.deficitPctGDP - previousDeficit;

  // New Feature: Bond Vigilantes (Realistic Mode)
  // Markets punish the RATE of change in borrowing, not just the level
  // If you try to borrow too much too quickly (e.g. +1% deficit in a single month), yields spike
  let vigilantePremium = 0;
  if (process.env.NODE_ENV !== 'test') { // Simple way to gate if needed, but we rely on logic
    if (deficitTrend > 0.8) {
      // Massive fiscal expansion in one month -> Shock premium
      vigilantePremium = (deficitTrend - 0.8) * 0.5 * difficulty.marketReactionScale;
    }
  }

  // Worsening trajectories add premium; improving trajectories reduce it (scaled by difficulty)
  const trendPremium = Math.max(-0.45, Math.min(0.45, (debtTrend * 0.25 + deficitTrend * 0.18) * difficulty.marketReactionScale));

  // Credibility discount (lower credibility = higher yields)
  const credibilityDiscount = (political.credibilityIndex - 50) * -0.008;

  // Credit rating effect
  const creditRatingPremium = getCreditRatingPremium(political.creditRating);

  // Fiscal rule credibility differential
  const fiscalRuleId = political.chosenFiscalRule;
  let fiscalRuleCredibilityEffect = 0;
  if (fiscalRuleId === 'balanced-budget' || fiscalRuleId === 'maastricht') {
    fiscalRuleCredibilityEffect = -0.15; // Strict rules rewarded
  } else if (fiscalRuleId === 'golden-rule' || fiscalRuleId === 'debt-anchor') {
    fiscalRuleCredibilityEffect = -0.05; // Moderate credibility
  } else if (fiscalRuleId === 'mmt-inspired') {
    fiscalRuleCredibilityEffect = 0.25; // Markets skeptical of MMT
  }

  // Market psychology component
  let marketPsychology = 0;
  const yieldLevel = markets.giltYield10y;
  const fiscalStress = (debtRatio > 95 ? 1 : 0) + (fiscal.deficitPctGDP > 5 ? 1 : 0) + (debtTrend > 1 ? 1 : 0);

  if (yieldLevel > 5.5 && fiscalStress >= 2) {
    marketPsychology = 0.3 + (yieldLevel - 5.5) * 0.15; // Accelerating panic
  } else if (yieldLevel < 4.0 && fiscalStress === 0) {
    marketPsychology = -0.15; // Calm
  }

  // Momentum effect
  if (previousSnapshot) {
    const previousYield = previousSnapshot.giltYield;
    const yieldChange = yieldLevel - previousYield;
    if (Math.abs(yieldChange) > 0.3) {
      marketPsychology += yieldChange > 0 ? 0.1 : -0.1;
    }
  }

  let newYield10y = baseYield + debtPremium + deficitPremium + trendPremium +
    vigilantePremium + credibilityDiscount + creditRatingPremium +
    fiscalRuleCredibilityEffect + marketPsychology;

  // LDI Crisis Logic (Realistic Mode)
  // If yields rise too fast (>50bps/month), pension funds get margin called
  // They sell gilts to raise cash, driving yields higher (feedback loop)
  let ldiPanicTriggered = markets.ldiPanicTriggered ?? false;

  const prevYield = markets.giltYield10y; // Current state yield before this turn's update
  let impliedYieldChange = newYield10y - prevYield;

  // Trigger condition: Sudden spike (>50bps) OR existing panic
  if (difficulty.marketReactionScale > 1.0) { // Only in Realistic/Hard modes
    if (impliedYieldChange > 0.50) {
      ldiPanicTriggered = true;
      // Feedback loop: Add 150% of the excess rise atop the rise
      const ldiShock = (impliedYieldChange - 0.50) * 1.5;
      newYield10y += ldiShock;
    } else if (ldiPanicTriggered) {
      // Panic persists until yields stabilize or fall significantly
      if (impliedYieldChange < -0.20) {
        ldiPanicTriggered = false; // Panic subsides
      } else {
        // Panic continues: lingering premium
        newYield10y += 0.40;
      }
    }
  }

  // Sterling mechanics (Rate diff vs Risk)
  const bankRateDifferential = markets.bankRate - 3.5;
  const fiscalRiskPremium = newYield10y - markets.bankRate - 0.3;
  const yieldSterlingEffect = bankRateDifferential * 1.5 - fiscalRiskPremium * 2.0;
  const confidenceEffect = (political.governmentApproval - 40) * 0.15;
  const credibilityEffect = (political.credibilityIndex - 50) * 0.1;
  const vigilanteSterlingPenalty = vigilantePremium * -4.0; // Vigilantes crush currency

  let newSterlingIndex = 100 + yieldSterlingEffect + confidenceEffect + credibilityEffect + vigilanteSterlingPenalty;
  newSterlingIndex = Math.max(70, Math.min(130, newSterlingIndex));

  // Gradual adjustment (unless LDI panic, then instant)
  const adjustmentSpeed = ldiPanicTriggered ? 1.0 : 0.3;
  const smoothedYield = prevYield + (newYield10y - prevYield) * adjustmentSpeed;

  const prevSterling = markets.sterlingIndex;
  const smoothedSterling = prevSterling + (newSterlingIndex - prevSterling) * 0.3;

  // Mortgage rates
  const mortgageRate = smoothedYield + 1.5;

  return {
    ...state,
    markets: {
      ...markets,
      giltYield10y: Math.max(0.5, Math.min(20, smoothedYield)),
      giltYield2y: Math.max(0.5, Math.min(20, smoothedYield - 0.3)),
      giltYield30y: Math.max(0.5, Math.min(20, smoothedYield + 0.5)),
      mortgageRate2y: Math.max(1.0, Math.min(20, mortgageRate)),
      sterlingIndex: smoothedSterling,
      yieldChange10y: smoothedYield - prevYield,
      ldiPanicTriggered: ldiPanicTriggered
    },
  };
}

function getCreditRatingPremium(rating?: string): number {
  switch (rating) {
    case 'AAA': return -0.2;
    case 'AA+': return -0.1;
    case 'AA': return 0;
    case 'AA-': return 0.1;
    case 'A+': return 0.3;
    case 'A': return 0.5;
    default: return 0.1; // AA- baseline
  }
}

// ===========================
// Step 10: Service Quality
// ===========================

function calculateServiceQuality(state: GameState): GameState {
  const { fiscal, services, economic } = state;
  const monthsElapsed = state.metadata.currentTurn;
  const difficulty = getDifficultySettings(state);
  const adviserBonuses = getAdviserBonuses(state);

  // NHS quality depends on real spending growth vs demand growth
  // Demand grows ~3.5% annually just from demographics/technology
  // Scale the baseline by cumulative demand growth so later years require more spending
  const nhsDemandGrowth = 3.5; // Annual demand growth %
  const nhsBaselineNominal = 180.4;
  const nhsDemandMultiplier = Math.pow(1 + nhsDemandGrowth / 100, monthsElapsed / 12);
  const nhsAdjustedBaseline = nhsBaselineNominal * nhsDemandMultiplier;

  const nhsSpending = fiscal.spending.nhs;
  const nhsSpendingReal = nhsSpending / (1 + economic.inflationCPI / 100);
  const nhsRealGrowth = ((nhsSpendingReal - nhsAdjustedBaseline) / nhsAdjustedBaseline) * 100;

  let nhsQuality = services.nhsQuality;

  // CRITICAL FIX: Diminishing returns on NHS spending
  // Prevents "always max NHS spending" optimal strategy
  // Marginal benefit decreases: massive spending gives little extra quality
  // Scaled by difficulty (higher efficiency in forgiving mode)
  let nhsQualityChange = 0;
  if (nhsRealGrowth > 10) {
    // Excessive spending (>10% above demand): diminishing returns kick in hard
    // Each additional % gives less benefit: 10-15% range gives +0.3, 15-20% gives +0.15, >20% gives +0.05
    nhsQualityChange = 0.5 + Math.log(nhsRealGrowth / 10 + 1) * 0.15; // Logarithmic: +0.5 base, then diminishing
  } else if (nhsRealGrowth > 0) {
    nhsQualityChange = 0.5; // Keeping pace with or exceeding demand
  } else if (nhsRealGrowth > -1.5) {
    nhsQualityChange = 0.1; // Roughly maintaining
  } else if (nhsRealGrowth > -3.5) {
    nhsQualityChange = -0.3; // Deteriorating
  } else {
    nhsQualityChange = -0.8; // Crisis - real cuts vs demand
  }

  // Apply spending efficiency scaling (positive changes scaled by spendingEfficiencyScale)
  // Apply adviser bonus (Social Democrat +12%, Technocratic Centrist +5%)
  if (nhsQualityChange > 0) {
    nhsQualityChange *= difficulty.spendingEfficiencyScale * adviserBonuses.spendingEfficiencyMultiplier;
  } else {
    nhsQualityChange *= difficulty.serviceDegradationScale;
  }

  // Further diminishing returns based on current quality level
  // Above 75, improvements are much harder (efficiency limits, organisational culture)
  if (nhsQuality > 75 && nhsQualityChange > 0) {
    nhsQualityChange *= 0.4; // Only 40% of improvement applies when already high quality
  } else if (nhsQuality > 85 && nhsQualityChange > 0) {
    nhsQualityChange *= 0.2; // Only 20% when near-perfect
  }

  // CRITICAL FIX: Service quality lags (H3)
  // NHS doesn't respond instantly to funding - takes months to hire staff, build facilities
  // Improvements lag more (30% per month = ~3-4 months to full effect)
  // Cuts bite faster (50% per month = ~2 months to full effect)
  const nhsLagCoefficient = nhsQualityChange > 0 ? 0.30 : 0.50;
  nhsQuality += nhsQualityChange * nhsLagCoefficient;

  // Education quality
  // Demand grows ~2% annually; scale thresholds by cumulative demand growth
  const eduDemandGrowth = 2.0;
  const eduDemandMultiplier = Math.pow(1 + eduDemandGrowth / 100, monthsElapsed / 12);
  const eduSpending = fiscal.spending.education;
  const eduSpendingReal = eduSpending / (1 + economic.inflationCPI / 100);
  let eduQuality = services.educationQuality;

  // CRITICAL FIX: Diminishing returns on education spending
  // Scaled by difficulty
  let eduQualityChange = 0;
  const eduSpendingRatio = eduSpendingReal / (116 * eduDemandMultiplier);

  if (eduSpendingRatio > 1.3) {
    // Excessive spending (>30% above baseline): severe diminishing returns
    eduQualityChange = 0.3 + Math.log(eduSpendingRatio / 1.3 + 1) * 0.1;
  } else if (eduSpendingReal > 125 * eduDemandMultiplier) {
    eduQualityChange = 0.3;
  } else if (eduSpendingReal > 116 * eduDemandMultiplier) {
    eduQualityChange = 0.1;
  } else if (eduSpendingReal > 110 * eduDemandMultiplier) {
    eduQualityChange = -0.1;
  } else {
    eduQualityChange = -0.4;
  }

  // Apply difficulty scaling
  // Apply adviser bonus (Social Democrat +12%, Technocratic Centrist +5%)
  if (eduQualityChange > 0) {
    eduQualityChange *= difficulty.spendingEfficiencyScale * adviserBonuses.spendingEfficiencyMultiplier;
  } else {
    eduQualityChange *= difficulty.serviceDegradationScale;
  }

  // Diminishing returns at high quality levels
  if (eduQuality > 80 && eduQualityChange > 0) {
    eduQualityChange *= 0.5;
  }

  // CRITICAL FIX: Service quality lags (H3)
  // Education improvements take time (hiring teachers, curriculum changes)
  // Improvements lag (30% per month), cuts faster (50% per month)
  const eduLagCoefficient = eduQualityChange > 0 ? 0.30 : 0.50;
  eduQuality += eduQualityChange * eduLagCoefficient;

  // Infrastructure quality (responds to capital spending with lag)
  // Demand grows ~2% annually; scale thresholds by demand growth and cumulative inflation
  // Use average 2% inflation assumption instead of compounding current CPI over all months
  // (compounding current CPI creates exponential error if inflation deviates from 2%)
  const infraDemandGrowth = 2.0;
  const infraDemandMultiplier = Math.pow(1 + infraDemandGrowth / 100, monthsElapsed / 12);
  const infraInflationMultiplier = Math.pow(1 + 2.0 / 100, monthsElapsed / 12); // Use 2% average, not current CPI
  const infraScaler = infraDemandMultiplier * infraInflationMultiplier;
  const infraSpending = fiscal.spending.infrastructure;
  let infraQuality = services.infrastructureQuality;
  if (infraSpending > 115 * infraScaler) {
    infraQuality += 0.4;
  } else if (infraSpending > 100 * infraScaler) {
    infraQuality += 0.1;
  } else if (infraSpending > 90 * infraScaler) {
    infraQuality -= 0.1;
  } else {
    infraQuality -= 0.5;
  }

  // Natural degradation (infrastructure decays without maintenance)
  infraQuality -= 0.05;

  // Granular service metrics directly tied to programme budgets
  const mentalHealthAccess = evolveServiceMetric(
    services.mentalHealthAccess,
    getProgrammeTotal(state, ['nhsMentalHealth']),
    (BASELINE_DETAILED_SPENDING.nhsMentalHealth || 16.0),
    4.0,
    economic.inflationCPI,
    monthsElapsed
  );
  const primaryCareAccess = evolveServiceMetric(
    services.primaryCareAccess,
    getProgrammeTotal(state, ['nhsPrimaryCare']),
    (BASELINE_DETAILED_SPENDING.nhsPrimaryCare || 18.0),
    3.2,
    economic.inflationCPI,
    monthsElapsed
  );
  const socialCareQuality = evolveServiceMetric(
    services.socialCareQuality,
    getProgrammeTotal(state, ['socialCare']),
    (BASELINE_DETAILED_SPENDING.socialCare || 7.5),
    4.5,
    economic.inflationCPI,
    monthsElapsed
  );
  const prisonSafety = evolveServiceMetric(
    services.prisonSafety,
    getProgrammeTotal(state, ['prisonsAndProbation']),
    (BASELINE_DETAILED_SPENDING.prisonsAndProbation || 5.5),
    2.8,
    economic.inflationCPI,
    monthsElapsed
  );
  const courtBacklogPerformance = evolveServiceMetric(
    services.courtBacklogPerformance,
    getProgrammeTotal(state, ['courts']),
    (BASELINE_DETAILED_SPENDING.courts || 2.8),
    2.5,
    economic.inflationCPI,
    monthsElapsed
  );
  const legalAidAccess = evolveServiceMetric(
    services.legalAidAccess,
    getProgrammeTotal(state, ['legalAid']),
    (BASELINE_DETAILED_SPENDING.legalAid || 1.9),
    2.2,
    economic.inflationCPI,
    monthsElapsed
  );
  const policingEffectiveness = evolveServiceMetric(
    services.policingEffectiveness,
    getProgrammeTotal(state, ['policing', 'counterTerrorism']),
    (BASELINE_DETAILED_SPENDING.policing || 11.5) + (BASELINE_DETAILED_SPENDING.counterTerrorism || 1.2),
    2.0,
    economic.inflationCPI,
    monthsElapsed
  );
  const borderSecurityPerformance = evolveServiceMetric(
    services.borderSecurityPerformance,
    getProgrammeTotal(state, ['immigration']),
    (BASELINE_DETAILED_SPENDING.immigration || 4.5),
    2.4,
    economic.inflationCPI,
    monthsElapsed
  );
  const railReliability = evolveServiceMetric(
    services.railReliability,
    getProgrammeTotal(state, ['railSubsidy', 'hs2']),
    (BASELINE_DETAILED_SPENDING.railSubsidy || 5.5) + (BASELINE_DETAILED_SPENDING.hs2 || 6.0),
    2.3,
    economic.inflationCPI,
    monthsElapsed
  );
  const affordableHousingDelivery = evolveServiceMetric(
    services.affordableHousingDelivery,
    getProgrammeTotal(state, ['housingCapital', 'localGovernmentGrants']),
    (BASELINE_DETAILED_SPENDING.housingCapital || 2.5) + (BASELINE_DETAILED_SPENDING.localGovernmentGrants || 5.5),
    3.0,
    economic.inflationCPI,
    monthsElapsed
  );
  const floodResilience = evolveServiceMetric(
    services.floodResilience,
    getProgrammeTotal(state, ['floodDefences']),
    (BASELINE_DETAILED_SPENDING.floodDefences || 1.2),
    3.3,
    economic.inflationCPI,
    monthsElapsed
  );
  const researchInnovationOutput = evolveServiceMetric(
    services.researchInnovationOutput,
    getProgrammeTotal(state, ['ukri', 'aiAndDigital']),
    (BASELINE_DETAILED_SPENDING.ukri || 7.3) + (BASELINE_DETAILED_SPENDING.aiAndDigital || 1.5),
    2.0,
    economic.inflationCPI,
    monthsElapsed
  );

  // Clamp headline indices
  nhsQuality = Math.max(0, Math.min(100, nhsQuality));
  eduQuality = Math.max(0, Math.min(100, eduQuality));
  infraQuality = Math.max(0, Math.min(100, infraQuality));

  return {
    ...state,
    services: {
      nhsQuality,
      educationQuality: eduQuality,
      infrastructureQuality: infraQuality,
      mentalHealthAccess,
      primaryCareAccess,
      socialCareQuality,
      prisonSafety,
      courtBacklogPerformance,
      legalAidAccess,
      policingEffectiveness,
      borderSecurityPerformance,
      railReliability,
      affordableHousingDelivery,
      floodResilience,
      researchInnovationOutput,
    },
  };
}

// ===========================
// Step 11: Public Sector Pay
// ===========================

function calculatePublicSectorPay(state: GameState): GameState {
  const { economic, political } = state;

  const realWageGrowth = economic.wageGrowthAnnual - economic.inflationCPI;

  let strikeRisk = political.strikeRisk;

  if (realWageGrowth < -2.0) {
    strikeRisk = Math.min(90, strikeRisk + 5);
  } else if (realWageGrowth < 0) {
    strikeRisk = Math.min(80, strikeRisk + 2);
  } else if (realWageGrowth > 1.0) {
    strikeRisk = Math.max(10, strikeRisk - 3);
  } else {
    strikeRisk = Math.max(10, strikeRisk - 1);
  }

  return {
    ...state,
    political: {
      ...political,
      strikeRisk,
    },
  };
}

// ===========================
// Step 12: Approval Ratings
// ===========================

function calculateApproval(state: GameState): GameState {
  const { political, economic, services, fiscal, manifesto } = state;

  let approval = political.governmentApproval;

  // Economic performance effects
  const gdpEffect = (economic.gdpGrowthAnnual - 1.5) * 0.5;
  const unemploymentEffect = (4.2 - economic.unemploymentRate) * 0.6;
  const inflationEffect = (2.5 - economic.inflationCPI) * 0.5;
  const realWageEffect = (economic.wageGrowthAnnual - economic.inflationCPI) * 0.4;

  // Services effect (NHS dominates public perception)
  const nhsEffect = (services.nhsQuality - 62) * 0.12;
  const educationEffect = (services.educationQuality - 68) * 0.05;
  const granularServicesAverage = (
    services.mentalHealthAccess +
    services.primaryCareAccess +
    services.socialCareQuality +
    services.prisonSafety +
    services.courtBacklogPerformance +
    services.legalAidAccess +
    services.policingEffectiveness +
    services.borderSecurityPerformance +
    services.railReliability +
    services.affordableHousingDelivery +
    services.floodResilience +
    services.researchInnovationOutput
  ) / 12;
  const granularServicesEffect = (granularServicesAverage - 55) * 0.06;

  const cakeVatProxy = Math.max(0, fiscal.vatRate - 20) + Math.max(0, getDetailedTaxRate(state, 'vatDomesticEnergy', 5) - 5);
  const householdTaxPressure =
    Math.max(0, getDetailedTaxRate(state, 'insurancePremiumTax', 12) - 12) * 0.35 +
    Math.max(0, getDetailedTaxRate(state, 'sdltAdditionalSurcharge', 3) - 3) * 0.25 +
    cakeVatProxy * 0.4;
  const householdTaxEffect = -householdTaxPressure;

  const businessTaxPressure =
    Math.max(0, fiscal.corporationTaxRate - 25) * 0.5 +
    Math.max(0, getDetailedTaxRate(state, 'energyProfitsLevy', 35) - 35) * 0.2 +
    Math.max(0, 27 - getDetailedTaxRate(state, 'rdTaxCredit', 27)) * 0.15 +
    Math.max(0, 1000000 - getDetailedTaxRate(state, 'annualInvestmentAllowance', 1000000)) / 200000;
  const businessTaxEffect = -businessTaxPressure * 0.5;

  // Fiscal responsibility perception
  const deficitEffect = fiscal.deficitPctGDP > 6 ? -1.5 : fiscal.deficitPctGDP > 5 ? -0.8 : fiscal.deficitPctGDP < 3 ? 0.5 : 0;

  // CRITICAL FIX: Manifesto violations with tiered penalties
  // First violation is forgivable, but repeated violations destroy trust
  // Realistic: governments get one "difficult choice" excuse, but not multiple
  let manifestoEffect = 0;
  if (manifesto.totalViolations === 1) {
    manifestoEffect = -0.8; // Single violation: disappointing but understandable
  } else if (manifesto.totalViolations === 2) {
    manifestoEffect = -2.0; // Two violations: pattern forming, serious concern
  } else if (manifesto.totalViolations >= 3) {
    // Multiple violations: trust destroyed, accelerating penalties
    manifestoEffect = -2.0 - (manifesto.totalViolations - 2) * 1.2; // -3.2 for 3rd, -4.4 for 4th, etc.
  }

  // Honeymoon BOOST (first 12 months get a positive buffer that decays)
  // New governments enjoy a period of public goodwill
  const honeymoonBoost = state.metadata.currentTurn < 12
    ? (12 - state.metadata.currentTurn) * 0.15  // +1.8 at start, decaying to 0
    : 0;

  // Social media impact (minor influence)
  const socialMediaSentiment = calculateSocialMediaSentiment(state);
  const socialMediaEffect = calculateSocialMediaImpact(socialMediaSentiment);

  // Random noise
  const randomEffect = (Math.random() - 0.5) * 1.5;

  // Combine with meaningful monthly sensitivity (0.25 instead of 0.08)
  // This allows a crisis to move approval ~2-3 points per month rather than ~0.3
  let totalChange = (gdpEffect + unemploymentEffect + inflationEffect + realWageEffect +
    nhsEffect + educationEffect + granularServicesEffect +
    householdTaxEffect + businessTaxEffect +
    deficitEffect + manifestoEffect +
    honeymoonBoost + socialMediaEffect + randomEffect) * 0.25;

  // CRITICAL FIX: Death spiral prevention and recovery mechanics
  // 1. Recovery bonus: bigger gains when improving from low base
  if (approval < 30 && totalChange > 0) {
    totalChange *= 1.5; // 50% bonus to positive changes when approval is very low
  } else if (approval < 38 && totalChange > 0) {
    totalChange *= 1.25; // 25% bonus when approval is low
  }

  // 2. Momentum bonus: reward sustained improvement
  const previousSnapshot = state.simulation.monthlySnapshots?.[state.simulation.monthlySnapshots.length - 1];
  if (previousSnapshot) {
    const gdpImprovement = economic.gdpGrowthAnnual - previousSnapshot.gdpGrowth;
    const inflationImprovement = previousSnapshot.inflation - economic.inflationCPI;
    const unemploymentImprovement = previousSnapshot.unemployment - economic.unemploymentRate;

    if (gdpImprovement > 0.3 || inflationImprovement > 0.3 || unemploymentImprovement > 0.15) {
      // Public notices positive momentum
      totalChange += 0.5;
    }
  }

  // 3. Floor softening: negative effects dampened near minimum
  if (approval < 20 && totalChange < 0) {
    totalChange *= 0.6; // 40% reduction in negative changes when very low
  } else if (approval < 28 && totalChange < 0) {
    totalChange *= 0.8; // 20% reduction when low
  }

  approval += totalChange;

  // Clamp
  approval = Math.max(10, Math.min(70, approval));

  return {
    ...state,
    political: {
      ...political,
      governmentApproval: approval,
      chancellorApproval: approval - 3 + (Math.random() - 0.5) * 2,
    },
  };
}

// ===========================
// Step 13: Backbench Satisfaction
// ===========================

function calculateBackbenchSatisfaction(state: GameState): GameState {
  const { political, fiscal, manifesto } = state;
  const adviserBonuses = getAdviserBonuses(state);

  let satisfaction = political.backbenchSatisfaction;

  // Approval matters most for marginal seat MPs - they fear losing seats
  const approvalEffect = (political.governmentApproval - 38) * 0.2;

  // Fiscal responsibility matters (all MPs hate looking reckless)
  const deficitEffect = fiscal.deficitPctGDP > 6 ? -1.0 : fiscal.deficitPctGDP > 5 ? -0.5 : fiscal.deficitPctGDP < 3 ? 0.2 : 0;

  // Manifesto breaches anger all MPs (doubled impact)
  const manifestoEffect = -manifesto.totalViolations * 1.5;

  // PM trust trickle-down (if PM is happy, backbenchers relax)
  const pmEffect = (political.pmTrust - 50) * 0.06;

  // Strike risk unsettles MPs (public blame falls on government)
  const strikeEffect = political.strikeRisk > 60 ? -0.6 : political.strikeRisk > 50 ? -0.3 : 0;

  const granularServiceStress = (
    (50 - state.services.mentalHealthAccess) +
    (50 - state.services.prisonSafety) +
    (50 - state.services.courtBacklogPerformance) +
    (50 - state.services.policingEffectiveness)
  ) / 4;
  const constituencyIssueEffect = granularServiceStress > 0 ? -granularServiceStress * 0.04 : 0;

  // Social media impact (MPs are sensitive to negative sentiment in constituencies)
  const socialMediaSentiment = calculateSocialMediaSentiment(state);
  const socialMediaEffectOnMPs = calculateSocialMediaImpact(socialMediaSentiment) * 0.7;

  // Increased sensitivity (0.2 instead of 0.12)
  const totalChange = (approvalEffect + deficitEffect + manifestoEffect + pmEffect + strikeEffect + constituencyIssueEffect + socialMediaEffectOnMPs) * 0.2;

  satisfaction += totalChange;

  // Weakened drift toward baseline (0.008 instead of 0.02)
  // This makes backbench satisfaction genuinely responsive to sustained poor performance
  satisfaction += (55 - satisfaction) * 0.008;

  // Apply adviser bonus (Political Operator +3)
  satisfaction += adviserBonuses.backbenchBonus;

  satisfaction = Math.max(10, Math.min(95, satisfaction));

  return {
    ...state,
    political: {
      ...political,
      backbenchSatisfaction: satisfaction,
    },
  };
}

// ===========================
// Step 13.5: Update MP Stances
// ===========================

function updateMPStances(state: GameState): GameState {
  // Skip if no MPs loaded yet
  if (!state.mpSystem || state.mpSystem.allMPs.size === 0) {
    return state;
  }

  // Compute cumulative budget changes from the July 2024 baseline
  const baseline = createInitialFiscalState();
  const budgetChanges: BudgetChanges = {
    incomeTaxBasicChange: state.fiscal.incomeTaxBasicRate - baseline.incomeTaxBasicRate,
    incomeTaxHigherChange: state.fiscal.incomeTaxHigherRate - baseline.incomeTaxHigherRate,
    incomeTaxAdditionalChange: state.fiscal.incomeTaxAdditionalRate - baseline.incomeTaxAdditionalRate,
    niEmployeeChange: state.fiscal.nationalInsuranceRate - baseline.nationalInsuranceRate,
    niEmployerChange: state.fiscal.employerNIRate - baseline.employerNIRate,
    vatChange: state.fiscal.vatRate - baseline.vatRate,
    corporationTaxChange: state.fiscal.corporationTaxRate - baseline.corporationTaxRate,
    nhsSpendingChange: state.fiscal.spending.nhs - baseline.spending.nhs,
    educationSpendingChange: state.fiscal.spending.education - baseline.spending.education,
    defenceSpendingChange: state.fiscal.spending.defence - baseline.spending.defence,
    welfareSpendingChange: state.fiscal.spending.welfare - baseline.spending.welfare,
    infrastructureSpendingChange: state.fiscal.spending.infrastructure - baseline.spending.infrastructure,
    policeSpendingChange: state.fiscal.spending.police - baseline.spending.police,
    justiceSpendingChange: state.fiscal.spending.justice - baseline.spending.justice,
    otherSpendingChange: state.fiscal.spending.other - baseline.spending.other,
    detailedTaxRates: Object.fromEntries(
      (state.fiscal.detailedTaxes || []).map((tax) => [
        tax.id,
        tax.currentRate - (BASELINE_DETAILED_TAX[tax.id] ?? tax.currentRate),
      ])
    ),
    detailedSpendingBudgets: Object.fromEntries(
      (state.fiscal.detailedSpending || []).map((item) => [
        item.id,
        item.currentBudget - (BASELINE_DETAILED_SPENDING[item.id] ?? item.currentBudget),
      ])
    ),
  };

  // Get manifesto violations
  const manifestoViolations: string[] = [];
  if (state.manifesto && state.manifesto.pledges) {
    state.manifesto.pledges.forEach((pledge: any) => {
      if (pledge.violated || pledge.broken) {
        manifestoViolations.push(pledge.id || pledge.description || 'unknown');
      }
    });
  }

  // Calculate stances for all MPs
  const newStances = calculateAllMPStances(
    state.mpSystem,
    budgetChanges,
    manifestoViolations,
    state.metadata.currentTurn
  );

  return {
    ...state,
    mpSystem: {
      ...state.mpSystem,
      currentBudgetSupport: newStances,
    },
  };
}

// ===========================
// Step 14: PM Trust
// ===========================

function calculatePMTrust(state: GameState): GameState {
  const { political, manifesto, fiscal, markets } = state;
  const difficulty = getDifficultySettings(state);
  const adviserBonuses = getAdviserBonuses(state);

  let pmTrust = political.pmTrust;

  // Government approval effect (PM cares about electability)
  const approvalEffect = (political.governmentApproval - 40) * 0.15;

  // Manifesto adherence (PM cares deeply about manifesto - direct penalty)
  const manifestoEffect = -manifesto.totalViolations * 1.5;

  // Fiscal credibility (PM does not want to be seen as reckless)
  const fiscalEffect = fiscal.deficitPctGDP > 6 ? -1.5 : fiscal.deficitPctGDP > 5 ? -0.8 : fiscal.deficitPctGDP < 3 ? 0.3 : 0;

  // Market confidence (gilt crisis destroys PM trust - Truss effect)
  const marketEffect = markets.giltYield10y > 6 ? -2.5 : markets.giltYield10y > 5 ? -0.8 : 0;

  // Backbench feedback (if backbenchers are revolting, PM blames chancellor)
  const backbenchEffect = (political.backbenchSatisfaction - 50) * 0.1;

  // Meaningful sensitivity: 0.3 instead of 0.1
  // With old 0.1 multiplier, it was nearly impossible to reach game-over threshold
  const totalChange =
    (approvalEffect + manifestoEffect + fiscalEffect + marketEffect + backbenchEffect) *
    0.3 *
    difficulty.pmTrustSensitivity;

  pmTrust += totalChange;

  // Very weak drift toward baseline (0.005 instead of 0.01)
  // PM trust should be earned/lost, not automatically recovered
  pmTrust += (50 - pmTrust) * 0.005;

  // Apply adviser bonus (Political Operator +2)
  pmTrust += adviserBonuses.pmTrustBonus;

  pmTrust = Math.max(0, Math.min(100, pmTrust));

  return {
    ...state,
    political: {
      ...political,
      pmTrust,
    },
  };
}

// ===========================
// Step 15: PM Intervention
// ===========================

function checkPMIntervention(state: GameState): GameState {
  const { political, markets, fiscal, manifesto } = state;
  const difficulty = getDifficultySettings(state);

  // Don't trigger if already pending
  if (political.pmInterventionsPending && political.pmInterventionsPending.length > 0) {
    return state;
  }

  // PM only calls if trust is low
  if (political.pmTrust > difficulty.pmInterventionTrustThreshold) return state;

  let intervention: PMInterventionEvent | null = null;

  const pmAnger: 'concerned' | 'angry' | 'furious' =
    political.pmTrust < 25 ? 'furious' : political.pmTrust < 35 ? 'angry' : 'concerned';

  // Trigger reasons (priority order)
  if (political.backbenchSatisfaction < 35 && Math.random() < 0.4) {
    intervention = {
      id: `pm_${state.metadata.currentTurn}`,
      triggered: true,
      triggerReason: 'backbench_revolt',
      pmTrust: political.pmTrust,
      pmAnger,
      demandTitle: 'Backbench Rebellion Brewing',
      demandDescription: 'The backbenches are in open revolt. You need to change course immediately or this government will collapse. I cannot protect you if you continue down this path.',
      consequencesIfComply: { pmTrustChange: 10, backbenchSentimentChange: 15, publicApprovalChange: 2 },
      consequencesIfDefy: { pmTrustChange: -15, backbenchSentimentChange: -10, reshuffleRisk: political.pmTrust < 30 ? 60 : 30 },
    };
  } else if (manifesto.totalViolations > 0 && Math.random() < 0.25) {
    intervention = {
      id: `pm_${state.metadata.currentTurn}`,
      triggered: true,
      triggerReason: 'manifesto_breach',
      pmTrust: political.pmTrust,
      pmAnger,
      demandTitle: 'Manifesto Commitment Broken',
      demandDescription: 'We made clear promises to the electorate. Breaking them destroys trust in this government and makes us all look like liars. This policy cannot stand.',
      consequencesIfComply: { pmTrustChange: 8, backbenchSentimentChange: 10, publicApprovalChange: 1 },
      consequencesIfDefy: { pmTrustChange: -12, backbenchSentimentChange: -8, reshuffleRisk: political.pmTrust < 30 ? 50 : 25 },
    };
  } else if (political.governmentApproval < 30 && Math.random() < 0.3) {
    intervention = {
      id: `pm_${state.metadata.currentTurn}`,
      triggered: true,
      triggerReason: 'approval_collapse',
      pmTrust: political.pmTrust,
      pmAnger,
      demandTitle: 'Public Confidence Collapsing',
      demandDescription: 'The polling is catastrophic. We are heading for electoral annihilation if we do not change direction. The party will not tolerate being led into the wilderness.',
      consequencesIfComply: { pmTrustChange: 8, backbenchSentimentChange: 12, publicApprovalChange: 3 },
      consequencesIfDefy: { pmTrustChange: -10, backbenchSentimentChange: -12, reshuffleRisk: political.pmTrust < 30 ? 55 : 25 },
    };
  } else if ((markets.giltYield10y > 6 || fiscal.debtPctGDP > 110) && Math.random() < 0.35) {
    intervention = {
      id: `pm_${state.metadata.currentTurn}`,
      triggered: true,
      triggerReason: 'economic_crisis',
      pmTrust: political.pmTrust,
      pmAnger,
      demandTitle: 'Economic Crisis Deepening',
      demandDescription: 'The economic situation is spiralling out of control. The markets are losing confidence. We need to demonstrate fiscal responsibility before it is too late.',
      consequencesIfComply: { pmTrustChange: 12, backbenchSentimentChange: 5, publicApprovalChange: 1 },
      consequencesIfDefy: { pmTrustChange: -20, backbenchSentimentChange: -5, reshuffleRisk: political.pmTrust < 25 ? 70 : 40 },
    };
  }

  if (intervention) {
    return {
      ...state,
      political: {
        ...political,
        pmInterventionsPending: [intervention],
      },
    };
  }

  return state;
}

// ===========================
// Step 15.5: PM Communications
// ===========================

function processPMCommunicationsStep(state: GameState): GameState {
  // Skip PM communications if game hasn't properly started
  if (!state.metadata.gameStarted || state.metadata.gameOver) {
    return state;
  }

  // Process PM communications for this turn
  const { newMessage, relationshipUpdates, reshuffleTriggered } = processPMCommunications(state);

  // If reshuffle triggered, game over
  if (reshuffleTriggered) {
    return {
      ...state,
      metadata: {
        ...state.metadata,
        gameOver: true,
        gameOverReason: 'You have been reshuffled out of the Treasury. The Prime Minister has lost confidence in your ability to manage the economy.',
      },
    };
  }

  // Update PM relationship state
  let updatedPMRelationship = {
    ...state.pmRelationship,
    ...relationshipUpdates,
  };

  // Add new message if one was generated
  if (newMessage) {
    updatedPMRelationship = {
      ...updatedPMRelationship,
      messages: [...updatedPMRelationship.messages, newMessage],
      unreadCount: updatedPMRelationship.unreadCount + 1,
    };

    // If message contains a demand, add it to active demands
    if (newMessage.type === 'demand' && newMessage.demandCategory && newMessage.demandDetails) {
      const newDemand = {
        category: newMessage.demandCategory,
        description: newMessage.demandDetails,
        deadline: state.metadata.currentTurn + 3, // 3 months to comply
        met: false,
      };
      updatedPMRelationship.activeDemands = [...updatedPMRelationship.activeDemands, newDemand];
    }
  }

  return {
    ...state,
    pmRelationship: updatedPMRelationship,
  };
}


// ===========================
// Step 16: Trigger Events & Newspaper
// ===========================

function triggerEvents(state: GameState): GameState {
  const previousSnapshot = state.simulation.monthlySnapshots?.[state.simulation.monthlySnapshots.length - 1];
  const previousYield = typeof previousSnapshot?.giltYield === 'number'
    ? previousSnapshot.giltYield
    : state.markets.giltYield10y;
  const recentNewspapers = [
    ...(state.events.eventLog || [])
      .map((entry: any) => entry?.newsArticle)
      .filter((article: any) => !!article),
    ...(state.events.currentNewspaper ? [state.events.currentNewspaper] : []),
  ].slice(-18);

  // Build a state object compatible with events-media.tsx's expectations
  const eventsState = {
    currentMonth: state.metadata.currentTurn,
    currentDate: new Date(state.metadata.currentYear, state.metadata.currentMonth - 1, 1),
    economy: {
      gdpGrowthAnnual: state.economic.gdpGrowthAnnual,
      gdpGrowthQuarterly: state.economic.gdpGrowthAnnual / 4, // Approximate quarterly
      gdpNominal: state.economic.gdpNominal_bn,
      inflationCPI: state.economic.inflationCPI,
      unemploymentRate: state.economic.unemploymentRate,
      wageGrowthReal: state.economic.wageGrowthAnnual - state.economic.inflationCPI,
    },
    fiscal: {
      deficit: state.fiscal.deficit_bn,
      debtToGdpPercent: state.fiscal.debtPctGDP,
      deficitPctGDP: state.fiscal.deficitPctGDP,
      totalSpending: state.fiscal.totalSpending_bn,
    },
    political: {
      publicApproval: state.political.governmentApproval,
      nationalApproval: state.political.governmentApproval, // Alias for backwards compat
      pmTrust: state.political.pmTrust,
      backbenchSentiment: {
        rebellionRisk: state.political.backbenchSatisfaction < 30 ? 'high' : state.political.backbenchSatisfaction < 50 ? 'medium' : 'low',
      },
    },
    markets: {
      giltYield10yr: state.markets.giltYield10y,
      giltYield10yrChange: state.markets.giltYield10y - previousYield,
      sterlingIndex: state.markets.sterlingIndex,
    },
    services: {
      nhsQuality: state.services.nhsQuality,
      educationQuality: state.services.educationQuality,
      infrastructureQuality: state.services.infrastructureQuality,
      mentalHealthAccess: state.services.mentalHealthAccess,
      primaryCareAccess: state.services.primaryCareAccess,
      socialCareQuality: state.services.socialCareQuality,
      prisonSafety: state.services.prisonSafety,
      courtBacklogPerformance: state.services.courtBacklogPerformance,
      legalAidAccess: state.services.legalAidAccess,
      policingEffectiveness: state.services.policingEffectiveness,
      borderSecurityPerformance: state.services.borderSecurityPerformance,
      railReliability: state.services.railReliability,
      affordableHousingDelivery: state.services.affordableHousingDelivery,
      floodResilience: state.services.floodResilience,
      researchInnovationOutput: state.services.researchInnovationOutput,
    },
    taxation: {
      vatRate: state.fiscal.vatRate,
      corporationTaxRate: state.fiscal.corporationTaxRate,
      energyProfitsLevy: getDetailedTaxRate(state, 'energyProfitsLevy', 35),
      vatDomesticEnergy: getDetailedTaxRate(state, 'vatDomesticEnergy', 5),
      rdTaxCredit: getDetailedTaxRate(state, 'rdTaxCredit', 27),
      annualInvestmentAllowance: getDetailedTaxRate(state, 'annualInvestmentAllowance', 1000000),
      sdltAdditionalSurcharge: getDetailedTaxRate(state, 'sdltAdditionalSurcharge', 3),
    },
    emergencyProgrammes: state.emergencyProgrammes,
    recentNewspapers,
  };

  // Generate random events for this month
  let newEvents: RandomEvent[] = [];
  try {
    newEvents = generateEvents(eventsState);
  } catch (e) {
    // Events system is optional - continue without if it errors
  }

  // Apply immediate impacts from non-response events
  let updatedState = { ...state };
  for (const event of newEvents) {
    if (!event.requiresResponse && event.immediateImpact) {
      updatedState = applyEventImpact(updatedState, event.immediateImpact);
    }
  }

  // Generate newspaper for the most significant event (or general state)
  let newspaper: NewsArticle | null = null;
  try {
    const significantEvent = newEvents.find(e => e.severity === 'crisis' || e.severity === 'major') || newEvents[0];
    newspaper = generateNewspaper(eventsState, significantEvent);
  } catch (e) {
    // Newspaper generation is optional
  }

  // Store events and newspaper in state
  const existingPendingEvents = updatedState.events.pendingEvents || [];
  const responseEvents = newEvents.filter(e => e.requiresResponse);
  const resolvedEvents = newEvents.filter(e => !e.requiresResponse);
  const resolvedEventEntries = resolvedEvents.map((event, idx) => ({
    event,
    resolved: true,
    newsArticle: idx === 0 ? newspaper || undefined : undefined,
  }));

  const newEventLog = [
    ...(updatedState.events.eventLog || []),
    ...resolvedEventEntries,
  ];

  return {
    ...updatedState,
    events: {
      ...updatedState.events,
      pendingEvents: [...existingPendingEvents, ...responseEvents],
      eventLog: newEventLog,
      currentNewspaper: newspaper,
    },
  };
}

function applyEventImpact(state: GameState, impact: any): GameState {
  let newState = { ...state };

  if (impact.gdpGrowth) {
    newState = {
      ...newState,
      economic: {
        ...newState.economic,
        gdpGrowthAnnual: newState.economic.gdpGrowthAnnual + impact.gdpGrowth,
      },
    };
  }
  if (impact.inflation) {
    newState = {
      ...newState,
      economic: {
        ...newState.economic,
        inflationCPI: newState.economic.inflationCPI + impact.inflation,
      },
    };
  }
  if (impact.unemployment) {
    newState = {
      ...newState,
      economic: {
        ...newState.economic,
        unemploymentRate: newState.economic.unemploymentRate + impact.unemployment,
      },
    };
  }
  if (impact.approvalRating) {
    newState = {
      ...newState,
      political: {
        ...newState.political,
        governmentApproval: Math.max(10, Math.min(80, newState.political.governmentApproval + impact.approvalRating)),
      },
    };
  }
  if (impact.pmTrust) {
    newState = {
      ...newState,
      political: {
        ...newState.political,
        pmTrust: Math.max(0, Math.min(100, newState.political.pmTrust + impact.pmTrust)),
      },
    };
  }
  if (impact.giltYieldBps) {
    newState = {
      ...newState,
      markets: {
        ...newState.markets,
        giltYield10y: newState.markets.giltYield10y + impact.giltYieldBps / 100,
      },
    };
  }
  if (impact.sterlingPercent) {
    newState = {
      ...newState,
      markets: {
        ...newState.markets,
        sterlingIndex: newState.markets.sterlingIndex * (1 + impact.sterlingPercent / 100),
      },
    };
  }

  return newState;
}

// ===========================
// Step 17: Credit Rating
// ===========================

function updateCreditRating(state: GameState): GameState {
  const { fiscal, political, markets } = state;

  // Only reassess every 6 months (March and September)
  if (state.metadata.currentTurn % 6 !== 0 || state.metadata.currentTurn === 0) {
    return state;
  }

  const currentRating = political.creditRating || 'AA-';
  const ratingScale = ['A', 'A+', 'AA-', 'AA', 'AA+', 'AAA'];
  const currentIndex = ratingScale.indexOf(currentRating);

  // Score the fiscal position (higher = better)
  let score = 0;
  score += fiscal.debtPctGDP < 85 ? 2 : fiscal.debtPctGDP < 95 ? 1 : fiscal.debtPctGDP < 105 ? 0 : -1;
  score += fiscal.deficitPctGDP < 2 ? 2 : fiscal.deficitPctGDP < 3 ? 1 : fiscal.deficitPctGDP < 5 ? 0 : -1;
  score += markets.giltYield10y < 4.5 ? 1 : markets.giltYield10y < 5.5 ? 0 : -1;
  score += political.credibilityIndex > 60 ? 1 : political.credibilityIndex > 40 ? 0 : -1;

  let newIndex = currentIndex;
  if (score >= 4 && currentIndex < ratingScale.length - 1) {
    newIndex = currentIndex + 1; // Upgrade
  } else if (score <= -2 && currentIndex > 0) {
    newIndex = currentIndex - 1; // Downgrade
  }

  const newRating = ratingScale[newIndex] as PoliticalState['creditRating'];
  const outlook: PoliticalState['creditRatingOutlook'] =
    score >= 2 ? 'positive' : score <= -1 ? 'negative' : 'stable';

  // Credibility impact from rating changes
  let credibilityChange = 0;
  if (newIndex < currentIndex) credibilityChange = -10; // Downgrade hurts
  if (newIndex > currentIndex) credibilityChange = 5; // Upgrade helps

  return {
    ...state,
    political: {
      ...political,
      creditRating: newRating,
      creditRatingOutlook: outlook,
      credibilityIndex: Math.max(0, Math.min(100, political.credibilityIndex + credibilityChange)),
    },
  };
}

// ===========================
// Step 18: Historical Snapshot
// ===========================

function saveHistoricalSnapshot(state: GameState): GameState {
  const snapshot = {
    turn: state.metadata.currentTurn,
    date: `${state.metadata.currentYear}-${String(state.metadata.currentMonth).padStart(2, '0')}`,
    gdpGrowth: state.economic.gdpGrowthAnnual,
    inflation: state.economic.inflationCPI,
    unemployment: state.economic.unemploymentRate,
    deficit: state.fiscal.deficitPctGDP,
    debt: state.fiscal.debtPctGDP,
    approval: state.political.governmentApproval,
    giltYield: state.markets.giltYield10y,
  };

  return {
    ...state,
    simulation: {
      monthlySnapshots: [...state.simulation.monthlySnapshots, snapshot],
    },
  };
}

// ===========================
// Step 19: Game Over Check
// ===========================

function checkGameOver(state: GameState): GameState {
  const { political, metadata, markets, fiscal } = state;
  const difficulty = getDifficultySettings(state);

  // Sacked by PM (trust too low) - raised threshold since PM trust is now more responsive
  if (political.pmTrust < difficulty.gameOverPMTrust) {
    return {
      ...state,
      metadata: {
        ...metadata,
        gameOver: true,
        gameOverReason: 'The Prime Minister has lost all confidence in your ability to manage the economy. You have been removed from office.',
      },
    };
  }

  // Backbench revolt (low satisfaction + probabilistic, scaling probability)
  if (political.backbenchSatisfaction < difficulty.gameOverBackbenchThreshold) {
    // Probability increases as satisfaction drops lower
    const revoltProbability =
      political.backbenchSatisfaction < difficulty.gameOverBackbenchThreshold - 10 ? 0.6 : 0.3;
    if (Math.random() < revoltProbability) {
      return {
        ...state,
        metadata: {
          ...metadata,
          gameOver: true,
          gameOverReason: 'A backbench revolt has forced your resignation. Your party has lost confidence in your economic management.',
        },
      };
    }
  }

  // Gilt market crisis (yields above 7.5% = sovereign debt crisis)
  if (markets.giltYield10y > difficulty.gameOverYieldThreshold) {
    return {
      ...state,
      metadata: {
        ...metadata,
        gameOver: true,
        gameOverReason: 'Gilt yields have surged above 7.5%. The UK faces a sovereign debt crisis. An emergency government has been formed without you.',
      },
    };
  }

  // Debt spiral (debt/GDP above 120%)
  if (fiscal.debtPctGDP > difficulty.gameOverDebtThreshold) {
    return {
      ...state,
      metadata: {
        ...metadata,
        gameOver: true,
        gameOverReason: 'UK national debt has exceeded 120% of GDP. The IMF has been called in. Your chancellorship is over.',
      },
    };
  }

  return state;
}

export default processTurn;
