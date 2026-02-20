// Turn Processor - Orchestrates monthly game calculations
// Executes 18-step economic/political calculation sequence each turn
// Integrates events-media, political-system, and credit rating

import {
  PoliticalState,
  PMInterventionEvent,
  OBRForecastComparison,
  OBRForecastSnapshot,
  OBRForecastYear,
  TurnDelta,
  TurnDeltaDriver,
  getFiscalRuleById,
  OBR_HEADROOM_CALIBRATION,
  calculateRuleHeadroom,
  FISCAL_RULE_GILT_EFFECT,
  FISCAL_RULE_STERLING_EFFECT,
  FISCAL_RULE_BACKBENCH_DRIFT_TARGET,
} from './game-integration';
import { GameState, BudgetChanges } from './game-state';
import { generateEvents, generateNewspaper, RandomEvent, NewsArticle } from './events-media';
import { calculateAllMPStances } from './mp-system';
import { createInitialFiscalState } from './game-integration';
import { calculateSocialMediaSentiment, calculateSocialMediaImpact } from './social-media-system';
import { processPMCommunications } from './pm-system';
import { checkAnnualGrowthPledges, applyManifestoViolations } from './manifesto-system';
import { renderSectorHeadline } from './data/sector-revolts';

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

type RiskAggregate = {
  macroShockScaleDelta: number;
  productivityMonthlyPenalty_pp: number;
  strikeThresholdMultiplier: number;
  marketReactionScaleDelta: number;
};

function getPolicyRiskAggregate(state: GameState): RiskAggregate {
  const modifiers = Array.isArray(state.policyRiskModifiers) ? state.policyRiskModifiers : [];
  return modifiers.reduce<RiskAggregate>(
    (acc, modifier) => {
      acc.macroShockScaleDelta += modifier.macroShockScaleDelta || 0;
      acc.productivityMonthlyPenalty_pp += modifier.productivityMonthlyPenalty_pp || 0;
      acc.marketReactionScaleDelta += modifier.marketReactionScaleDelta || 0;
      if (modifier.strikeThresholdMultiplier !== undefined) {
        acc.strikeThresholdMultiplier = Math.min(acc.strikeThresholdMultiplier, modifier.strikeThresholdMultiplier);
      }
      return acc;
    },
    {
      macroShockScaleDelta: 0,
      productivityMonthlyPenalty_pp: 0,
      strikeThresholdMultiplier: 1,
      marketReactionScaleDelta: 0,
    }
  );
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
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
  if (realRatio > 1.06) nextValue += 0.6;
  else if (realRatio > 1.0) nextValue += 0.25;
  else if (realRatio > 0.96) nextValue -= 0.12;
  else if (realRatio > 0.9) nextValue -= 0.4;
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
  const risk = getPolicyRiskAggregate(state);
  const qeReduction = Math.max(0, 875 - (state.markets?.assetPurchaseFacility_bn || 875));
  const qtMarketAdj = (qeReduction / 50) * 0.02;

  if (mode === 'forgiving') {
    return {
      macroShockScale: 0.75 + risk.macroShockScaleDelta,
      inflationShockScale: 0.75,
      pmTrustSensitivity: 0.85,
      pmInterventionTrustThreshold: 35,
      gameOverPMTrust: 15,
      gameOverBackbenchThreshold: 24,
      gameOverYieldThreshold: 8.5,
      gameOverDebtThreshold: 130,
      taxAvoidanceScale: 0.7, // 30% less tax avoidance
      spendingEfficiencyScale: 1.15, // 15% more efficient spending
      marketReactionScale: 0.8 + risk.marketReactionScaleDelta + qtMarketAdj, // 20% calmer markets
      serviceDegradationScale: 0.85, // 15% slower degradation
    };
  }

  if (mode === 'realistic') {
    return {
      macroShockScale: 1.15 + risk.macroShockScaleDelta,
      inflationShockScale: 1.15,
      pmTrustSensitivity: 1.15,
      pmInterventionTrustThreshold: 45,
      gameOverPMTrust: 24,
      gameOverBackbenchThreshold: 33,
      gameOverYieldThreshold: 7.0,
      gameOverDebtThreshold: 115,
      taxAvoidanceScale: 1.25, // 25% more tax avoidance
      spendingEfficiencyScale: 0.9, // 10% less efficient spending
      marketReactionScale: 1.2 + risk.marketReactionScaleDelta + qtMarketAdj, // 20% more volatile markets
      serviceDegradationScale: 1.15, // 15% faster degradation
    };
  }

  return {
    macroShockScale: 1.0 + risk.macroShockScaleDelta,
    inflationShockScale: 1.0,
    pmTrustSensitivity: 1.0,
    pmInterventionTrustThreshold: 40,
    gameOverPMTrust: 20,
    gameOverBackbenchThreshold: 30,
    gameOverYieldThreshold: 7.5,
    gameOverDebtThreshold: 120,
    taxAvoidanceScale: 1.0,
    spendingEfficiencyScale: 1.0,
    marketReactionScale: 1.0 + risk.marketReactionScaleDelta + qtMarketAdj,
    serviceDegradationScale: 1.0,
  };
}

// ===========================
// Turn Processing
// ===========================

export function processTurn(state: GameState): GameState {
  let newState = { ...state };
  const startState = { ...state };

  // Ensure we have a baseline historical snapshot so trend/momentum logic
  // (e.g. debtTrend/deficitTrend/yield momentum) does not treat the first
  // processed month as a sudden fiscal shock.
  if (!newState.simulation.monthlySnapshots || newState.simulation.monthlySnapshots.length === 0) {
    const baselineSnapshot = {
      turn: newState.metadata.currentTurn,
      date: `${newState.metadata.currentYear}-${String(newState.metadata.currentMonth).padStart(2, '0')}`,
      gdpGrowth: newState.economic.gdpGrowthAnnual,
      gdpNominal: Math.round(newState.economic.gdpNominal_bn),
      inflation: newState.economic.inflationCPI,
      unemployment: newState.economic.unemploymentRate,
      deficit: newState.fiscal.deficitPctGDP,
      debt: newState.fiscal.debtPctGDP,
      approval: newState.political.governmentApproval,
      giltYield: newState.markets.giltYield10y,
      productivity: newState.economic.productivityGrowthAnnual,
    };

    newState = {
      ...newState,
      simulation: {
        ...newState.simulation,
        monthlySnapshots: [baselineSnapshot],
      },
    };
  }

  // Step 0: Check fiscal year rollover (April = new fiscal year)
  newState = checkFiscalYearRollover(newState);

  // Step 0.5: Process emergency programmes (decrement months, remove expired)
  newState = processEmergencyProgrammes(newState);

  // Step 0.6: Decay active implementation risk modifiers
  newState = processPolicyRiskModifiers(newState);
  newState = triggerSpendingReviewIfDue(newState);
  newState = processFiscalEventCycle(newState);

  // Step 0.7: Calculate productivity growth (before GDP since productivity affects GDP)
  newState = calculateProductivity(newState);
  newState = calculateExternalSector(newState);
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
  newState = processParliamentaryMechanics(newState);

  // Step 8.5: Evaluate fiscal rules compliance
  newState = evaluateFiscalRuleCompliance(newState);

  // Step 8.6: Check Golden Rule enforcement
  newState = checkGoldenRuleEnforcement(newState);

  // Step 9: Calculate gilt yields & markets
  newState = calculateMarkets(newState);
  newState = calculateHousingMarket(newState);

  // Step 10: Calculate service quality
  newState = calculateServiceQuality(newState);
  newState = updateDepartmentalDELs(newState);
  newState = calculateDevolution(newState);

  // Step 11: Calculate public sector pay & strikes
  newState = calculatePublicSectorPay(newState);

  // Step 12: Calculate approval ratings
  newState = calculateDistributional(newState);
  newState = calculateApproval(newState);

  // Step 13: Calculate backbench satisfaction
  newState = calculateBackbenchSatisfaction(newState);

  // Step 13.5: Update MP stances based on current fiscal position
  newState = updateMPStances(newState);

  // Step 14: Calculate PM trust
  newState = calculatePMTrust(newState);

  // Step 14.5: Apply fiscal-framework change consequences
  newState = applyFiscalFrameworkChangeConsequences(newState);

  // Step 14.6: Enforce PM threat deadlines
  newState = enforcePMThreatDeadlines(newState);

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

  // Step 18.5: Track OBR-style forecast snapshots and annual outturn comparison
  newState = processOBRForecasting(newState);

  // Step 18.6: Record a concise turn-delta explainer for the dashboard
  newState = captureTurnDelta(newState, startState);

  // Step 19: Check for game over
  newState = checkGameOver(newState);
  newState = decaySpendingReviewBonus(newState);

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
// Step 0.7: Productivity Growth
// ===========================

/**
 * Calculate labour productivity growth based on:
 * - Capital investment (infrastructure, machinery, technology)
 * - Human capital (health, education quality)
 * - Research & innovation spending
 * - Private sector investment response to tax environment
 *
 * UK context: productivity growth has been very low since 2008 (0.2-0.5% typically)
 * OBR projects gradual rise to 1.25% by 2029
 */
function calculateProductivity(state: GameState): GameState {
  const { economic, fiscal, services } = state;
  const risk = getPolicyRiskAggregate(state);

  // Base productivity growth (very low - reflects UK's productivity puzzle)
  let productivityGrowth = 0.10; // 0.10% annual baseline

  // 1. Capital investment effect (infrastructure, R&D, equipment)
  // Public capital spending builds productive capacity with lag
  const baselineCapital = 141.4; // Baseline total capital spending
  const currentCapital =
    fiscal.spending.nhsCapital +
    fiscal.spending.educationCapital +
    fiscal.spending.defenceCapital +
    fiscal.spending.infrastructureCapital +
    fiscal.spending.policeCapital +
    fiscal.spending.justiceCapital +
    fiscal.spending.otherCapital;

  const capitalRatio = currentCapital / baselineCapital;
  // Each 10% increase in capital spending adds ~0.1pp to productivity growth (with lag)
  const capitalEffect = (capitalRatio - 1) * 0.06; // 0.06 is the sensitivity
  productivityGrowth += capitalEffect;

  // 2. Human capital effect (health + education quality)
  // Healthy, educated workforce is more productive
  // Dampening: effects saturate at very high quality levels and soften at very low levels
  const nhsGap = services.nhsQuality - 62;
  const eduGap = services.educationQuality - 68;
  const healthEffect = Math.tanh(nhsGap / 18) * 0.25; // max ~±0.25pp
  const educationEffect = Math.tanh(eduGap / 18) * 0.30; // max ~±0.30pp
  productivityGrowth += healthEffect + educationEffect;

  // 3. Innovation & R&D effect
  const innovationGap = services.researchInnovationOutput - 55;
  const innovationEffect = Math.tanh(innovationGap / 20) * 0.35; // max ~±0.35pp
  productivityGrowth += innovationEffect;

  // 4. Infrastructure quality supply-side effect
  const infraGap = services.infrastructureQuality - 58;
  const infraEffect = Math.tanh(infraGap / 22) * 0.18; // max ~±0.18pp
  productivityGrowth += infraEffect;

  // 5. Tax environment for business investment
  // Corporation tax affects willingness to invest in UK
  // Lower corp tax → more investment → higher productivity (with lag)
  const corpTaxEffect = fiscal.corporationTaxRate > 25
    ? (25 - fiscal.corporationTaxRate) * 0.015 // Penalty for high corp tax
    : (25 - fiscal.corporationTaxRate) * 0.010; // Smaller boost from low corp tax
  productivityGrowth += corpTaxEffect;

  // 6. R&D tax credits and investment incentives
  const rdTaxCredit = getDetailedTaxRate(state, 'rdTaxCredit', 27);
  const rdCreditEffect = (rdTaxCredit - 27) * 0.008;
  productivityGrowth += rdCreditEffect;

  const annualInvestmentAllowance = getDetailedTaxRate(state, 'annualInvestmentAllowance', 1000000);
  const aiaEffect = (annualInvestmentAllowance - 1000000) / 500000 * 0.05;
  productivityGrowth += aiaEffect;

  // External trade friction drags on productivity via weaker competition and export scale effects.
  const tradeFrictionDrag = Math.max(0, (state.externalSector.tradeFrictionIndex - 30) / 10) * 0.02;
  productivityGrowth -= tradeFrictionDrag;

  // 7. Long-run scarring from prolonged underinvestment
  // If capital spending has been consistently low, productivity suffers
  const snapshots = state.simulation.monthlySnapshots;
  if (snapshots.length >= 24) {
    // Check average capital spending over past 24 months
    // (Would need to track this properly in state - simplified for now)
    if (currentCapital < baselineCapital * 0.85) {
      productivityGrowth -= 0.10; // Scarring effect from sustained underinvestment
    }
  }

  // Gradual adjustment (productivity changes slowly)
  const currentProductivityGrowth = economic.productivityGrowthAnnual;
  const adjustedProductivityGrowth = currentProductivityGrowth + (productivityGrowth - currentProductivityGrowth) * 0.08 - (risk.productivityMonthlyPenalty_pp || 0);

  // Clamp to realistic UK range (-0.5% to 2.5%)
  const clampedProductivityGrowth = Math.max(-0.5, Math.min(2.5, adjustedProductivityGrowth));

  // Update productivity level (index)
  const monthlyProductivityChange = clampedProductivityGrowth / 12;
  const newProductivityLevel = economic.productivityLevel * (1 + monthlyProductivityChange / 100);

  return {
    ...state,
    economic: {
      ...economic,
      productivityGrowthAnnual: clampedProductivityGrowth,
      productivityLevel: newProductivityLevel,
    },
  };
}

// ===========================
// Step 1: GDP Growth
// ===========================

/**
 * Calculate GDP growth with category-specific fiscal multipliers and supply-side effects.
 *
 * Key principles (following OBR/IFS/academic consensus):
 * 1. Spending multipliers vary by category: NHS/welfare ~0.8-1.5, capital ~0.7-1.5, defence/admin lower
 * 2. Tax cut multipliers depend on incidence: income/NI ~0.3-0.7, corp tax ~0.1-0.4 short-run
 * 3. Supply-side effects are delayed and probabilistic
 * 4. Automatic stabilisers and BoE reaction matter
 * 5. Productivity growth feeds into potential GDP
 */
function calculateGDPGrowth(state: GameState): GameState {
  const { economic, fiscal, markets } = state;
  const difficulty = getDifficultySettings(state);
  const adviserBonuses = getAdviserBonuses(state);

  // Base trend REAL growth = trend productivity growth + labour force growth
  // UK labour force growth ~0.75%/yr including net immigration contribution (OBR LTO 2024).
  // was 0.50; raised to 0.75 to match OBR potential output assumption.
  const labourForceGrowth = 0.75;
  const rawTrendGrowthAnnual = economic.productivityGrowthAnnual + labourForceGrowth;

  // Medium-term convergence to potential (~1.5% real growth)
  // Pulls the economy back toward plausible long-run UK potential output.
  // Coefficient was 0.06; raised to 0.10 to produce realistic 1.0–1.5% baseline once
  // the phantom spending-baseline bug (below) is corrected.
  const potentialGrowthTarget = 1.5;
  const trendGrowthAnnual = rawTrendGrowthAnnual + (potentialGrowthTarget - rawTrendGrowthAnnual) * 0.10;
  const trendGrowth = trendGrowthAnnual / 12; // Monthly
  let monthlyRealGrowth = trendGrowth;

  // === DEMAND-SIDE EFFECTS ===

  // Baselines — must exactly match the July 2024 values in createInitialFiscalState()
  // so that zero delta = zero fiscal demand impulse at game start.
  // BUG FIX: baselineDefenceCurrent was 39.4 (typo); correct value is 39.0.
  // CRITICAL FIX: baselineOtherCurrent was 135.8 (incorrectly derived from a partial sum).
  //   Correct value = policeCurrent(18.5) + justiceCurrent(12.7) + otherCurrent(306.0) = 337.2.
  //   The miscalibrated 135.8 created a phantom +£201bn demand impulse that added ~3%/yr
  //   to annualised GDP growth at neutral policy — the primary cause of Known Issue #1.
  const baselineNHSCurrent = 168.4;
  const baselineEducationCurrent = 104.0;
  const baselineDefenceCurrent = 39.0; // was 39.4; corrected to match initial state
  const baselineWelfareCurrent = 290.0;
  const baselineOtherCurrent = 337.2; // was 135.8; corrected to 18.5+12.7+306.0=337.2
  const baselineCapital = 141.4;

  // Changes from baseline
  const nhsCurrentChange = fiscal.spending.nhsCurrent - baselineNHSCurrent;
  const educationCurrentChange = fiscal.spending.educationCurrent - baselineEducationCurrent;
  const defenceCurrentChange = fiscal.spending.defenceCurrent - baselineDefenceCurrent;
  const welfareCurrentChange = fiscal.spending.welfareCurrent - baselineWelfareCurrent;
  const otherCurrentChange = (fiscal.spending.policeCurrent + fiscal.spending.justiceCurrent + fiscal.spending.otherCurrent) - baselineOtherCurrent;

  const capitalChange = (
    fiscal.spending.nhsCapital +
    fiscal.spending.educationCapital +
    fiscal.spending.defenceCapital +
    fiscal.spending.infrastructureCapital +
    fiscal.spending.policeCapital +
    fiscal.spending.justiceCapital +
    fiscal.spending.otherCapital
  ) - baselineCapital;

  // Economic slack multiplier (higher multipliers in recession)
  const unemploymentGap = economic.unemploymentRate - 4.5;
  const slackMultiplier = Math.max(0.9, Math.min(1.4, 1 + (unemploymentGap * 0.12)));

  // Category-specific multipliers (short-run demand effect)
  // RECALIBRATED to match OBR/IFS evidence (reduced by ~35-40%)
  // NHS current: medium-high multiplier (wages + procurement + supply chains)
  let nhsMultiplier = 0.7 * slackMultiplier;

  // Education current: medium-high multiplier (wages + local spending)
  let educationMultiplier = 0.65 * slackMultiplier;

  // Welfare/transfers: high multiplier (high MPC recipients)
  let welfareMultiplier = 0.70 * slackMultiplier;

  // Defence/admin: lower multiplier (some leakage, imports, procurement delays)
  let defenceMultiplier = 0.45 * slackMultiplier;
  let otherMultiplier = 0.5 * slackMultiplier;

  // Capital spending: medium multiplier + long-run productivity effect (handled in productivity function)
  let capitalMultiplier = 0.65 * slackMultiplier;

  // Inflation dampener (supply constraints reduce real multipliers)
  if (economic.inflationCPI > 3) {
    const dampener = Math.max(0.7, 1 - (economic.inflationCPI - 3) * 0.06);
    nhsMultiplier *= dampener;
    educationMultiplier *= dampener;
    welfareMultiplier *= dampener;
    defenceMultiplier *= dampener;
    otherMultiplier *= dampener;
    capitalMultiplier *= dampener;
  }

  const outputGapCurrent = economic.gdpGrowthAnnual - 1.0;
  if (outputGapCurrent > 0) {
    const overheatingDampener = Math.max(0.75, 1 - outputGapCurrent * 0.08);
    nhsMultiplier *= overheatingDampener;
    educationMultiplier *= overheatingDampener;
    welfareMultiplier *= overheatingDampener;
    defenceMultiplier *= overheatingDampener;
    otherMultiplier *= overheatingDampener;
    capitalMultiplier *= overheatingDampener;
  }

  // Fiscal impact on demand (convert £bn changes to % GDP impact)
  const nominalGDP = economic.gdpNominal_bn;
  const fiscalDemandImpact = (
    nhsCurrentChange * nhsMultiplier +
    educationCurrentChange * educationMultiplier +
    welfareCurrentChange * welfareMultiplier +
    defenceCurrentChange * defenceMultiplier +
    otherCurrentChange * otherMultiplier +
    capitalChange * capitalMultiplier
  ) / nominalGDP * 100 / 12; // Convert to monthly % change

  monthlyRealGrowth += fiscalDemandImpact;

  const noSpendDelta =
    nhsCurrentChange === 0 &&
    educationCurrentChange === 0 &&
    defenceCurrentChange === 0 &&
    welfareCurrentChange === 0 &&
    otherCurrentChange === 0 &&
    capitalChange === 0;

  // === TAX EFFECTS (both demand and supply-side) ===

  // Income tax changes: demand effect via disposable income
  // RECALIBRATED: OBR estimates ~0.35 multiplier for income tax (lower than previously)
  // MPC varies by income: low earners 0.6-0.9, high earners 0.1-0.4
  // Approximate weighted MPC ~0.45 for basic rate, ~0.18 for higher/additional
  const baselineIncomeTaxBasic = 20;
  const baselineIncomeTaxHigher = 40;
  const baselineIncomeTaxAdditional = 45;

  const basicRateChange = fiscal.incomeTaxBasicRate - baselineIncomeTaxBasic;
  const higherRateChange = fiscal.incomeTaxHigherRate - baselineIncomeTaxHigher;
  const additionalRateChange = fiscal.incomeTaxAdditionalRate - baselineIncomeTaxAdditional;

  // Each 1pp income tax change affects ~£7bn (basic), ~£2bn (higher), ~£0.2bn (additional)
  // Demand impact = - (tax increase) * (income affected) * MPC * multiplier / GDP
  // Reduced multiplier from 1.0 to 0.35 following OBR methodology
  const incomeTaxDemandEffect = -(basicRateChange * 7 * 0.45 + higherRateChange * 2 * 0.18 + additionalRateChange * 0.2 * 0.12) / nominalGDP * 100 * 0.35 * slackMultiplier / 12;
  monthlyRealGrowth += incomeTaxDemandEffect;

  // NI changes: similar to income tax but affects different income distribution
  // RECALIBRATED to match OBR estimates (~0.3-0.35 multiplier)
  const baselineNIEmployee = 8;
  const baselineNIEmployer = 13.8;

  const niEmployeeChange = fiscal.nationalInsuranceRate - baselineNIEmployee;
  const niEmployerChange = fiscal.employerNIRate - baselineNIEmployer;

  // Employee NI affects disposable income (£6bn per pp, MPC ~0.5)
  // Reduced multiplier to 0.35
  const niEmployeeDemandEffect = -(niEmployeeChange * 6 * 0.5) / nominalGDP * 100 * 0.35 * slackMultiplier / 12;
  // Employer NI has weaker short-run demand effect (some passed to workers, some to prices, some absorbed)
  // Reduced multiplier to 0.2
  const niEmployerDemandEffect = -(niEmployerChange * 8.5 * 0.25) / nominalGDP * 100 * 0.2 * slackMultiplier / 12;
  monthlyRealGrowth += niEmployeeDemandEffect + niEmployerDemandEffect;

  // VAT changes: point-of-sale demand effect
  // RECALIBRATED: OBR uses ~0.35 multiplier for VAT
  const baselineVAT = 20;
  const vatChange = fiscal.vatRate - baselineVAT;
  const vatDemandEffect = -(vatChange * 7.5 * 0.45) / nominalGDP * 100 * 0.35 * slackMultiplier / 12;
  monthlyRealGrowth += vatDemandEffect;

  // Corporation tax: SHORT-RUN supply-side effect (affects investment decisions)
  // Long-run effect via productivity already captured
  // Multiplier 0.1-0.4 for short-run investment response
  const baselineCorpTax = 25;
  const corpTaxChange = fiscal.corporationTaxRate - baselineCorpTax;

  // Supply-side: lower corp tax → more investment (gradual, conditional)
  // Short-run investment response: each 1pp corp tax cut adds ~£0.3bn investment (with lag)
  // Use 6-month lag: only 50% of effect hits in first month
  const corpTaxInvestmentEffect = -(corpTaxChange * 0.3 * 0.5 * 0.3) / nominalGDP * 100 / 12; // 0.3 = multiplier
  monthlyRealGrowth += corpTaxInvestmentEffect;

  // Corp tax above 30%: accelerating discouragement (base erosion, profit shifting)
  if (fiscal.corporationTaxRate > 30) {
    const corpTaxPenalty = (fiscal.corporationTaxRate - 30) * -0.008 / 12;
    monthlyRealGrowth += corpTaxPenalty;
  }

  // Top income tax above 50%: labour supply and entrepreneurship effect
  if (fiscal.incomeTaxAdditionalRate > 50) {
    const topRatePenalty = (fiscal.incomeTaxAdditionalRate - 50) * -0.003 / 12;
    monthlyRealGrowth += topRatePenalty;
  }

  // === SUPPLY-SIDE EFFECTS (from public services) ===
  // Reference levels use the July 2024 starting quality scores (45, 58, 48)
  // rather than abstract ideal values (62, 68, 58) that created a structural drag
  // of ~-0.084%/yr at baseline — i.e. the model penalised neutral policy for simply
  // starting with a stressed NHS/education system.  Effects remain non-zero relative
  // to the baseline start, so policy-driven quality improvements still lift GDP.
  // The productivity step (Step 0.7) separately captures long-run human-capital effects.

  // Healthy workforce: NHS quality affects labour supply and absenteeism
  const healthSupplySide = (state.services.nhsQuality - 45) * 0.002 / 12; // ref was 62; corrected to 45
  monthlyRealGrowth += healthSupplySide;

  // Educated workforce: education quality affects human capital accumulation
  const educationSupplySide = (state.services.educationQuality - 58) * 0.003 / 12; // ref was 68; corrected to 58
  monthlyRealGrowth += educationSupplySide;

  // Infrastructure: good infrastructure raises allocative efficiency (also captured via productivity)
  const infraSupplySide = (state.services.infrastructureQuality - 48) * 0.002 / 12; // ref was 58; corrected to 48
  monthlyRealGrowth += infraSupplySide;

  // === MONETARY CONDITIONS ===

  // Bank Rate / gilt yields affect borrowing costs → investment & consumption
  const yieldEffect = (markets.giltYield10y - 4.15) * -0.015 / 12;
  monthlyRealGrowth += yieldEffect;

  // Sterling: appreciation hurts exports, depreciation helps (with lag)
  const sterlingEffect = (markets.sterlingIndex - 100) * -0.0008 / 12;
  monthlyRealGrowth += sterlingEffect;

  const externalDemandEffect = Math.max(
    -0.04,
    Math.min(0.04, ((state.externalSector.currentAccountGDP - (-3.1)) * 0.05) / 12)
  );
  monthlyRealGrowth += externalDemandEffect;

  if (state.externalSector.externalShockActive && state.externalSector.externalShockType === 'trade_war') {
    monthlyRealGrowth *= 0.9;
  }

  // === AUTOMATIC STABILISERS ===
  // These are partly captured through unemployment-triggered welfare spending (in spending effects),
  // but also through progressive tax system automatically adjusting revenues
  // (captured in tax revenue calculations)

  // === ADVISER BONUSES ===
  monthlyRealGrowth += adviserBonuses.gdpGrowthBonus / 12;

  // === BUSINESS CYCLE RANDOMNESS ===
  // RECALIBRATED: Reduced random volatility to match realistic monthly GDP data
  // UK monthly GDP growth rarely moves more than ±0.15% from expected
  const isFirstProcessedTurn = state.metadata.currentTurn <= 1 && (state.simulation.monthlySnapshots?.length || 0) <= 1;
  const randomShock = isFirstProcessedTurn ? 0 : (Math.random() - 0.5) * 0.12 * difficulty.macroShockScale;
  monthlyRealGrowth += randomShock;

  const noTaxDelta =
    basicRateChange === 0 &&
    higherRateChange === 0 &&
    additionalRateChange === 0 &&
    niEmployeeChange === 0 &&
    niEmployerChange === 0 &&
    vatChange === 0 &&
    corpTaxChange === 0;

  if (noSpendDelta && noTaxDelta) {
    const baselineLower = trendGrowth - 0.08;
    const baselineUpper = trendGrowth + 0.08;
    monthlyRealGrowth = Math.max(baselineLower, Math.min(baselineUpper, monthlyRealGrowth));
  }

  // Clamp monthly REAL growth to realistic UK range
  // UK quarterly growth: typically -0.5% to +0.7% → monthly: -0.17% to +0.23%
  // Allow wider range for rare shocks, but not enough to generate persistent ~4% annual growth without policy moves.
  monthlyRealGrowth = Math.max(-0.25, Math.min(0.25, monthlyRealGrowth));

  // Nominal GDP growth = real growth + inflation
  const monthlyInflation = economic.inflationCPI / 12;
  let monthlyNominalGrowth = monthlyRealGrowth + monthlyInflation;

  // Turn-0 stabilisation pass: prevent an artificial first-month nominal GDP jump
  // when transitioning from static initial values into the dynamic compounding model.
  if (isFirstProcessedTurn) {
    const baselineNominalGrowth = economic.gdpGrowthMonthly + monthlyInflation;
    monthlyNominalGrowth = Math.max(
      baselineNominalGrowth - 0.10,
      Math.min(baselineNominalGrowth + 0.10, monthlyNominalGrowth)
    );
    monthlyRealGrowth = monthlyNominalGrowth - monthlyInflation;
  }

  // Calculate new nominal GDP
  let newGDP = economic.gdpNominal_bn * (1 + monthlyNominalGrowth / 100);
  if (state.metadata.currentTurn === 1) {
    const firstStepDeltaPct = ((newGDP - economic.gdpNominal_bn) / Math.max(1, economic.gdpNominal_bn)) * 100;
    if (Math.abs(firstStepDeltaPct) > 2) {
      const clampedRealMonthly = Math.max(-0.25, Math.min(0.25, monthlyRealGrowth));
      const clampedNominalMonthly = clampedRealMonthly + monthlyInflation;
      console.warn(
        '[GDP guard] First-turn nominal GDP jump exceeded 2%; clamping to monthly bounds.',
        { deltaPct: round1(firstStepDeltaPct), priorGDP: round1(economic.gdpNominal_bn), turn: state.metadata.currentTurn }
      );
      monthlyRealGrowth = clampedRealMonthly;
      monthlyNominalGrowth = clampedNominalMonthly;
      newGDP = economic.gdpNominal_bn * (1 + monthlyNominalGrowth / 100);
    }
  }

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

function calculateExternalSector(state: GameState): GameState {
  const difficulty = getDifficultySettings(state);
  const ext = { ...state.externalSector };
  let markets = { ...state.markets };
  let justStartedShock = false;
  const sterlingEffect = (state.markets.sterlingIndex - 100) * -0.03;
  const growthDifferential = (state.economic.gdpGrowthAnnual - 1.0) - 1.5;
  const importPressure = growthDifferential > 0 ? growthDifferential * 0.04 : 0;
  const baselineTarget = -2.5;
  ext.currentAccountGDP += (baselineTarget - ext.currentAccountGDP) * 0.02 + sterlingEffect + importPressure;
  ext.currentAccountGDP = Math.max(-8, Math.min(1, ext.currentAccountGDP));

  if (!ext.externalShockActive) {
    const winterMonth = (state.metadata.currentTurn % 12);
    const baseShockProb = (state.metadata.currentTurn < 24 ? 0.04 : 0.03) * difficulty.macroShockScale;
    if (Math.random() < baseShockProb) {
      const roll = Math.random();
      ext.externalShockActive = true;
      if (roll < 0.3 + (winterMonth >= 9 ? 0.15 : 0)) {
        ext.externalShockType = 'energy_spike';
        ext.externalShockTurnsRemaining = 6;
        ext.externalShockMagnitude = (1.5 + Math.random() * 1.5) * difficulty.macroShockScale;
      } else if (roll < 0.55) {
        ext.externalShockType = 'trade_war';
        ext.externalShockTurnsRemaining = 12 + Math.floor(Math.random() * 7);
        ext.externalShockMagnitude = 20 * difficulty.macroShockScale;
      } else if (roll < 0.8) {
        ext.externalShockType = 'partner_recession';
        ext.externalShockTurnsRemaining = 6 + Math.floor(Math.random() * 4);
        ext.externalShockMagnitude = (0.5 + Math.random() * 0.5) * difficulty.macroShockScale;
      } else if (roll < 0.95) {
        ext.externalShockType = 'tariff_shock';
        ext.externalShockTurnsRemaining = 6 + Math.floor(Math.random() * 7);
        ext.externalShockMagnitude = 15 * difficulty.macroShockScale;
      } else {
        ext.externalShockType = 'banking_sector_stress';
        ext.externalShockTurnsRemaining = 6;
        ext.externalShockMagnitude = (20 + Math.random() * 20) * difficulty.macroShockScale;
      }
      justStartedShock = true;
    }
  }

  if (ext.externalShockActive && ext.externalShockType) {
    if (ext.externalShockType === 'energy_spike') {
      ext.energyImportPricePressure = Math.min(5, ext.energyImportPricePressure + ext.externalShockMagnitude);
    }
    if (ext.externalShockType === 'trade_war') {
      ext.tradeFrictionIndex = Math.min(100, ext.tradeFrictionIndex + 20);
      ext.exportGrowth -= 2;
    }
    if (ext.externalShockType === 'partner_recession') {
      ext.currentAccountGDP -= ext.externalShockMagnitude;
      ext.exportGrowth -= ext.externalShockMagnitude * 1.2;
    }
    if (ext.externalShockType === 'tariff_shock') {
      ext.tradeFrictionIndex = Math.min(100, ext.tradeFrictionIndex + 15);
      markets.sterlingIndex = Math.max(70, markets.sterlingIndex - 3);
    }
    if (ext.externalShockType === 'banking_sector_stress') {
      markets.giltYield10y += ext.externalShockMagnitude / 100;
      ext.exportGrowth -= 0.4;
    }

    ext.externalShockTurnsRemaining = Math.max(0, ext.externalShockTurnsRemaining - 1);
    if (ext.externalShockTurnsRemaining === 0) {
      ext.externalShockActive = false;
      ext.externalShockType = null;
      ext.externalShockMagnitude = 0;
      ext.energyImportPricePressure *= 0.5;
      ext.tradeFrictionIndex = Math.max(30, ext.tradeFrictionIndex - 8);
    }
  } else {
    ext.energyImportPricePressure += (0 - ext.energyImportPricePressure) * 0.15;
    ext.tradeFrictionIndex += (35 - ext.tradeFrictionIndex) * 0.05;
  }

  const nextState: GameState = {
    ...state,
    markets,
    externalSector: {
      ...ext,
      energyImportPricePressure: Math.max(-2, Math.min(5, ext.energyImportPricePressure)),
    },
  };
  if (justStartedShock) {
    const eventId = `external_shock_${state.metadata.currentTurn}_${ext.externalShockType}`;
    const titleMap: Record<string, string> = {
      energy_spike: 'External Shock: Energy Price Spike',
      trade_war: 'External Shock: Trade War Escalation',
      partner_recession: 'External Shock: Partner Recession',
      tariff_shock: 'External Shock: Tariff Shock',
      banking_sector_stress: 'External Shock: Banking Sector Stress',
    };
    const descMap: Record<string, string> = {
      energy_spike: 'Energy import costs are surging and inflation pressure will intensify.',
      trade_war: 'Global trade tensions are increasing frictions and weakening export demand.',
      partner_recession: 'Major trading partners are slowing, reducing external demand for UK output.',
      tariff_shock: 'New tariffs have been imposed on key UK exports, hitting competitiveness.',
      banking_sector_stress: 'Financial-sector stress is lifting risk premia and tightening domestic credit conditions.',
    };
    return {
      ...nextState,
      events: {
        ...nextState.events,
        pendingEvents: [
          ...(nextState.events.pendingEvents || []),
          {
            id: eventId,
            type: 'international_crisis',
            severity: 'major',
            month: state.metadata.currentMonth,
            date: new Date(state.metadata.currentYear, state.metadata.currentMonth - 1, 1),
            title: titleMap[ext.externalShockType || 'trade_war'],
            description: descMap[ext.externalShockType || 'trade_war'],
            immediateImpact: {},
            responseOptions: [],
            requiresResponse: false,
          } as any,
        ],
      },
    };
  }
  return nextState;
}

// ===========================
// Step 2: Employment
// ===========================

/**
 * Calculate unemployment using Okun's Law with structural factors.
 *
 * Key fixes:
 * 1. Stronger Okun's coefficient for more responsive job creation from growth
 * 2. Tax effects influence equilibrium unemployment (NAIRU) rather than being cumulative additions
 * 3. Stronger reversion to (adjusted) NAIRU for better recovery dynamics
 */
function calculateEmployment(state: GameState): GameState {
  const { economic, fiscal } = state;

  // Base NAIRU (non-accelerating inflation rate of unemployment)
  const baseNAIRU = 4.25;

  // Tax policy effects shift the NAIRU (equilibrium unemployment)
  // rather than adding permanently to unemployment each month
  let adjustedNAIRU = baseNAIRU;

  // High employer NI → companies reduce headcount, shift to contractors/automation
  // Shifts NAIRU up: each pp above 15% adds ~0.02pp to equilibrium unemployment
  if (fiscal.employerNIRate > 15) {
    adjustedNAIRU += (fiscal.employerNIRate - 15) * 0.02;
  }

  // High corporation tax → reduced investment → less job creation
  // Shifts NAIRU up: each pp above 30% adds ~0.015pp
  if (fiscal.corporationTaxRate > 30) {
    adjustedNAIRU += (fiscal.corporationTaxRate - 30) * 0.015;
  }

  // Welfare trap: very high effective marginal rates discourage work
  // Effective marginal rate = basic rate + employee NI + benefit taper (63%)
  const effectiveMarginalRate = fiscal.incomeTaxBasicRate + fiscal.nationalInsuranceRate + 63;
  if (effectiveMarginalRate > 93) {
    // Severe poverty trap: working yields little more income than benefits
    adjustedNAIRU += (effectiveMarginalRate - 93) * 0.04;
  }
  const monthsElapsed = state.metadata.currentTurn;
  const taperDelta = 55 - (fiscal.ucTaperRate || 55);
  const workAllowanceDelta = (fiscal.workAllowanceMonthly || 344) - 344;
  const childcareDelta = (fiscal.childcareSupportRate || 30) - 30;
  const taperLag = Math.min(1, monthsElapsed / 18);
  const workAllowanceLag = Math.min(1, monthsElapsed / 12);
  const childcareLag = Math.min(1, monthsElapsed / 18);
  adjustedNAIRU -= taperDelta * 0.05 * taperLag;
  adjustedNAIRU -= (workAllowanceDelta / 50) * 0.06 * workAllowanceLag;
  adjustedNAIRU -= (childcareDelta / 10) * 0.05 * childcareLag;

  // Clamp adjusted NAIRU to realistic range
  adjustedNAIRU = Math.max(3.5, Math.min(7.0, adjustedNAIRU));

  // Okun's Law: GDP growth affects unemployment
  // RECALIBRATED: Okun's coefficient for UK is ~0.4-0.5
  // OBR/BoE use ~0.45 for UK (weaker than US ~0.5)
  // 1pp above trend growth → -0.45pp unemployment change (annualised)
  const trendGrowth = 1.75;
  const growthGap = economic.gdpGrowthAnnual - trendGrowth;
  const okunsCoefficient = -0.45; // Calibrated to match OBR estimates
  const unemploymentPressure = growthGap * okunsCoefficient / 12; // Monthly

  let newUnemployment = economic.unemploymentRate + unemploymentPressure;

  // Participation/inactivity sub-model.
  let participationRate = economic.participationRate;
  const realWageGrowth = economic.wageGrowthAnnual - economic.inflationCPI;
  const nhsImproving = state.services.nhsQuality > 55;
  const welfareRatio = fiscal.spending.welfare / 290;

  if (realWageGrowth > 1.0 && nhsImproving) {
    participationRate += Math.min(0.05, 0.02 + (realWageGrowth - 1.0) * 0.01);
  }
  participationRate += taperDelta * 0.005 * taperLag;
  participationRate += (workAllowanceDelta / 50) * 0.01 * workAllowanceLag;
  participationRate += (childcareDelta / 10) * 0.015 * childcareLag;

  if (welfareRatio < 0.95) {
    const cutScale = Math.min(1, (0.95 - welfareRatio) / 0.10);
    participationRate -= 0.03 + cutScale * 0.05;
  }

  participationRate = Math.max(58, Math.min(67, participationRate));
  const economicInactivity = Math.max(16, Math.min(28, 84.5 - participationRate));

  const labourSupplyPressure = ((participationRate - 63.0) / 1.5) * 0.03;
  adjustedNAIRU = Math.max(3.3, Math.min(7.2, adjustedNAIRU - labourSupplyPressure));

  // NAIRU reversion: unemployment drifts toward (adjusted) NAIRU
  // Reversion at 4% per month - gradual adjustment
  const nairuDrift = (adjustedNAIRU - newUnemployment) * 0.04;
  newUnemployment += nairuDrift;

  // Sectoral unemployment from public service cuts
  // Severe cuts to NHS/education cause direct job losses
  const nhsEmploymentEffect = state.services.nhsQuality < 50 ? (50 - state.services.nhsQuality) * 0.002 : 0;
  const educationEmploymentEffect = state.services.educationQuality < 55 ? (55 - state.services.educationQuality) * 0.001 : 0;
  newUnemployment += nhsEmploymentEffect + educationEmploymentEffect;

  // Clamp to reasonable range
  newUnemployment = Math.max(3.0, Math.min(12.0, newUnemployment));

  return {
    ...state,
    economic: {
      ...economic,
      unemploymentRate: newUnemployment,
      participationRate,
      economicInactivity,
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
    anchorHealth += 1.0; // Re-anchoring
  } else if (economic.inflationCPI < 2.5) {
    anchorHealth += 0.5; // Passive stability
  }

  anchorHealth = Math.max(0, Math.min(100, anchorHealth));

  // Calculate Expectations Term
  // Standard model: 40% weight on expectations
  // If anchored: 40% on Target (2.0%)
  // If de-anchored: 40% on Recent Trend (adaptive)
  const totalExpectationsWeight = 0.55;
  const anchorWeight = (anchorHealth / 100); // 1.0 = fully anchored, 0.0 = fully adaptive

  const recentTrend = economic.inflationCPI; // Simplified recent trend
  const expectationsTerm = (2.0 * anchorWeight * totalExpectationsWeight) +
    (recentTrend * (1 - anchorWeight) * totalExpectationsWeight);

  // Persistence (20%): inflation has inertia
  const persistence = economic.inflationCPI * 0.20;

  // Domestic pressure (15%): Phillips curve
  const domesticPressure = (2.0 + unemploymentGap * 0.5) * 0.15;

  // Import prices (10%): sterling effect
  const sterlingChange = (100 - markets.sterlingIndex) / 100;
  const importPressure = (2.0 + sterlingChange * 8.0) * 0.10;

  // VAT pass-through (one-off level effect spread over months)
  const vatChange = fiscal.vatRate - 20;
  const vatEffect = vatChange * 0.04; // Spread effect

  // Wage-price spiral component
  const realWageGap = economic.wageGrowthAnnual - economic.inflationCPI;
  const wagePressure = realWageGap > 2.0 ? (realWageGap - 2.0) * 0.1 : 0;
  const energyImportInflationEffect = Math.max(
    -0.4,
    Math.min(0.4, state.externalSector.energyImportPricePressure * 0.08)
  );

  let inflation = persistence + expectationsTerm + domesticPressure + importPressure + vatEffect + wagePressure + energyImportInflationEffect;

  // Small random component
  const randomShock = (Math.random() - 0.5) * 0.50 * difficulty.inflationShockScale;
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

  // Wages respond to inflation expectations, productivity, and labour market tightness
  const inflationExpectation = economic.inflationCPI;
  const labourTightness = Math.max(0, 4.25 - economic.unemploymentRate);

  // Wage growth = inflation expectations + productivity growth + tightness premium
  // FIXED: Use actual productivity growth instead of hard-coded 1.5%
  // UPDATED: Raised CPI coefficient to 1.0 to ensure real wage stability at equilibrium
  let wageGrowth = inflationExpectation * 1.0 + economic.productivityGrowthAnnual + labourTightness * 0.8;

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

  const realWageGap = economic.wageGrowthAnnual - economic.inflationCPI;
  const wagePressure = realWageGap > 2.0 ? (realWageGap - 2.0) : 0;

  const inflationForecastSimple =
    economic.inflationCPI * 0.7 +
    (2.0 + wagePressure * 0.15) * 0.3;

  const inflationGap = inflationForecastSimple - 2.0;
  const outputGap = economic.gdpGrowthAnnual - 1.0;

  const currentRate = markets.bankRate;
  const members = (markets.mpcMembers || []).map((member) => ({ ...member }));
  const stanceBias = (stance: 'dovish' | 'neutral' | 'hawkish'): number => {
    if (stance === 'dovish') return -0.35;
    if (stance === 'hawkish') return 0.35;
    return 0;
  };

  let cutVotes = 0;
  let holdVotes = 0;
  let hikeVotes = 0;
  members.forEach((member) => {
    const memberTaylor =
      3.25 +
      (1.1 + member.inflationWeight) * inflationGap +
      (0.6 + (1 - member.inflationWeight) * 0.3) * outputGap +
      stanceBias(member.stance);
    const preferredRate = Math.round(Math.max(0.1, Math.min(8.0, memberTaylor)) * 4) / 4;
    const delta = preferredRate - currentRate;
    let vote: 'cut' | 'hold' | 'hike' = 'hold';
    if (delta > 0.2) vote = 'hike';
    if (delta < -0.2) vote = 'cut';
    member.vote = vote;
    if (vote === 'cut') cutVotes += 1;
    else if (vote === 'hike') hikeVotes += 1;
    else holdVotes += 1;
  });

  let decision: 'cut' | 'hold' | 'hike' = 'hold';
  if (hikeVotes > holdVotes && hikeVotes > cutVotes) decision = 'hike';
  else if (cutVotes > holdVotes && cutVotes > hikeVotes) decision = 'cut';
  else if ((hikeVotes === holdVotes || cutVotes === holdVotes) && members.some((m) => m.role === 'Governor')) {
    const governorVote = members.find((m) => m.role === 'Governor')?.vote || 'hold';
    decision = governorVote;
  }

  let newRate = currentRate;
  if (decision === 'hike') newRate = currentRate + 0.25;
  if (decision === 'cut') newRate = currentRate - 0.25;
  newRate = Math.round(Math.max(0.1, Math.min(8.0, newRate)) * 4) / 4;

  const qtShouldPause = state.markets.giltYield10y > 6.2 || state.externalSector.externalShockType === 'banking_sector_stress';
  const qtPausedTurns = qtShouldPause ? 2 : Math.max(0, (markets.qtPausedTurns || 0) - 1);
  const qtRundown = qtPausedTurns > 0 ? 0 : 1.8;
  const assetPurchaseFacility_bn = Math.max(0, (markets.assetPurchaseFacility_bn || 875) - qtRundown);
  const voteBreakdown = `${Math.max(hikeVotes, cutVotes, holdVotes)}-${9 - Math.max(hikeVotes, cutVotes, holdVotes)} to ${decision}`;

  return {
    ...state,
    markets: {
      ...markets,
      bankRate: newRate,
      mpcMembers: members,
      lastMPCDecision: decision,
      lastMPCVoteBreakdown: voteBreakdown,
      assetPurchaseFacility_bn,
      qtPausedTurns,
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
  const baselineNominalGDP = 2750; // July 2024 nominal GDP (£bn)
  const nominalGDPRatio = economic.gdpNominal_bn / baselineNominalGDP;

  // Income tax (elasticity 1.1 to nominal GDP)
  const incomeTaxBase = 285;
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
  const niBase = 175;
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
  const vatBase = 192;
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
  const corpTaxBase = 94;
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

  // UPDATED: Reduced elasticity from 1.3 to 1.05 to match OBR estimates
  const corpTaxRevenue = Math.max(0, (corpTaxBase + corpTaxRateEffect - corpTaxAvoidanceLoss) * Math.pow(nominalGDPRatio, 1.05));

  // Other taxes (elasticity 0.8)
  const otherRevenue = 323 * Math.pow(nominalGDPRatio, 0.8);
  const baseStampDuty = 16;
  const stampDutyRevenue = baseStampDuty *
    Math.pow(Math.max(0.6, state.financialStability.housePriceIndex / 100), 1.2) *
    Math.max(0.4, state.financialStability.mortgageApprovals / 60);

  // Revenue adjustment from budget system reckoners (CGT, IHT, excise duties, reliefs, etc.)
  const revenueAdj = fiscal.revenueAdjustment_bn || 0;

  // Apply adviser bonus (Treasury Mandarin +3%, Technocratic Centrist +2%)
  const totalRevenueAnnual = (incomeTaxRevenue + niRevenue + vatRevenue + corpTaxRevenue + otherRevenue + stampDutyRevenue + revenueAdj) * adviserBonuses.taxRevenueMultiplier;

  return {
    ...state,
    fiscal: {
      ...fiscal,
      totalRevenue_bn: totalRevenueAnnual,
      stampDutyRevenue_bn: stampDutyRevenue,
    },
  };
}

// ===========================
// Step 7: Spending Effects
// ===========================

function calculateSpendingEffects(state: GameState): GameState {
  const { fiscal, economic } = state;

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
  const adviserBonuses = getAdviserBonuses(state);
  const { debtManagement, refinancingPremiumRiskModifier } = advanceDebtManagement(state);
  const profile = debtManagement.maturityProfile;
  const debtInterestFromBuckets =
    (profile.shortTerm.outstanding_bn * state.markets.bankRate / 100) +
    (profile.medium.outstanding_bn * profile.medium.avgCoupon / 100) +
    (profile.longTerm.outstanding_bn * profile.longTerm.avgCoupon / 100) +
    (profile.indexLinked.outstanding_bn * (economic.inflationCPI + 0.5) / 100);
  const debtInterest_bn = debtInterestFromBuckets * (1 - adviserBonuses.debtInterestReduction / 100);

  // Total managed expenditure = departmental spending + debt interest
  let totalManagedExpenditure = fiscal.totalSpending_bn + debtInterest_bn;

  // Add emergency programme rebuilding costs
  const emergencyRebuildingCosts = emergencyProgrammes.active
    .filter(prog => prog.remainingMonths > 0)
    .reduce((sum, prog) => sum + prog.rebuildingCostPerMonth_bn, 0);

  totalManagedExpenditure += emergencyRebuildingCosts;

  const welfareAMEFloor = 115 + Math.max(0, economic.unemploymentRate - 4.5) * 4 + (fiscal.housingAMEPressure_bn || 0);
  const welfareReformAMECost =
    Math.max(0, 55 - (fiscal.ucTaperRate || 55)) * 0.7 +
    Math.max(0, ((fiscal.workAllowanceMonthly || 344) - 344) / 50) * 0.4 +
    Math.max(0, ((fiscal.childcareSupportRate || 30) - 30) / 10) * 1.2;
  const welfareAMEApplied = Math.max(fiscal.welfareAME_bn || 115, welfareAMEFloor) + welfareReformAMECost;
  const welfareAMEAutoGrowth_bn = Math.max(0, welfareAMEApplied - (fiscal.welfareAME_bn || 115));
  totalManagedExpenditure += welfareAMEAutoGrowth_bn;

  const fpcConstraintCost_bn = fiscal.fpcConstraintCost_bn || 0;
  totalManagedExpenditure += fpcConstraintCost_bn;

  const barnettConsequentials_bn = fiscal.barnettConsequentials_bn || 0;
  totalManagedExpenditure += barnettConsequentials_bn;

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

  const currentBudgetBalance = fiscal.totalRevenue_bn - (fiscal.totalSpending_bn - totalCapitalSpending) - debtInterest_bn - emergencyRebuildingCosts;
  // Translate raw current-year balance to rule-specific headroom so the Dashboard
  // displays a figure that reflects the chosen fiscal framework's own threshold.
  const chosenRule = getFiscalRuleById(state.political.chosenFiscalRule);
  const headroom = calculateRuleHeadroom(
    chosenRule,
    currentBudgetBalance,
    deficitPctGDP,
    economic.gdpNominal_bn,
    fiscal.totalRevenue_bn,
    fiscal.totalSpending_bn,
    debtInterest_bn,
  );

  const updatedPolicyRiskModifiers = refinancingPremiumRiskModifier
    ? [...(state.policyRiskModifiers || []), refinancingPremiumRiskModifier]
    : state.policyRiskModifiers;

  return {
    ...state,
    fiscal: {
      ...fiscal,
      deficit_bn,
      deficitPctGDP,
      debtNominal_bn: newDebt,
      debtPctGDP,
      fiscalHeadroom_bn: headroom,
      welfareAME_bn: welfareAMEApplied,
      debtInterest_bn,
    },
    debtManagement,
    policyRiskModifiers: updatedPolicyRiskModifiers,
  };
}

function advanceDebtManagement(state: GameState): { debtManagement: GameState['debtManagement']; refinancingPremiumRiskModifier: any | null } {
  const dm = state.debtManagement;
  const profile = {
    shortTerm: { ...dm.maturityProfile.shortTerm },
    medium: { ...dm.maturityProfile.medium },
    longTerm: { ...dm.maturityProfile.longTerm },
    indexLinked: { ...dm.maturityProfile.indexLinked },
  };
  let refinancingPremiumRiskModifier: any | null = null;
  profile.shortTerm.turnsToMaturity = Math.max(0, profile.shortTerm.turnsToMaturity - 1);
  profile.medium.turnsToMaturity = Math.max(0, profile.medium.turnsToMaturity - 1);
  profile.longTerm.turnsToMaturity = Math.max(0, profile.longTerm.turnsToMaturity - 1);
  profile.indexLinked.turnsToMaturity = Math.max(0, profile.indexLinked.turnsToMaturity - 1);

  const monthlyBorrowing = state.fiscal.deficit_bn / 12;
  if (monthlyBorrowing > 0) {
    if (dm.issuanceStrategy === 'short') {
      profile.shortTerm.outstanding_bn += monthlyBorrowing * 0.65;
      profile.medium.outstanding_bn += monthlyBorrowing * 0.2;
      profile.longTerm.outstanding_bn += monthlyBorrowing * 0.1;
      profile.indexLinked.outstanding_bn += monthlyBorrowing * 0.05;
      profile.shortTerm.avgCoupon = state.markets.bankRate;
    } else if (dm.issuanceStrategy === 'long') {
      profile.shortTerm.outstanding_bn += monthlyBorrowing * 0.1;
      profile.medium.outstanding_bn += monthlyBorrowing * 0.25;
      profile.longTerm.outstanding_bn += monthlyBorrowing * 0.55;
      profile.indexLinked.outstanding_bn += monthlyBorrowing * 0.1;
      profile.longTerm.avgCoupon = state.markets.giltYield10y + 0.5;
    } else {
      profile.shortTerm.outstanding_bn += monthlyBorrowing * 0.25;
      profile.medium.outstanding_bn += monthlyBorrowing * 0.35;
      profile.longTerm.outstanding_bn += monthlyBorrowing * 0.25;
      profile.indexLinked.outstanding_bn += monthlyBorrowing * 0.15;
    }
  } else if (monthlyBorrowing < 0) {
    const repayment = Math.abs(monthlyBorrowing);
    profile.shortTerm.outstanding_bn = Math.max(0, profile.shortTerm.outstanding_bn - repayment);
  }

  if (profile.shortTerm.turnsToMaturity === 0) {
    const rolloverAmount = profile.shortTerm.outstanding_bn * 0.15;
    profile.shortTerm.outstanding_bn -= rolloverAmount;
    if (dm.issuanceStrategy === 'short') {
      profile.shortTerm.outstanding_bn += rolloverAmount;
      profile.shortTerm.avgCoupon = state.markets.giltYield10y;
    } else if (dm.issuanceStrategy === 'long') {
      profile.longTerm.outstanding_bn += rolloverAmount;
      profile.longTerm.avgCoupon = state.markets.giltYield10y + 0.5;
    } else {
      profile.medium.outstanding_bn += rolloverAmount * 0.6;
      profile.longTerm.outstanding_bn += rolloverAmount * 0.4;
    }
    profile.shortTerm.turnsToMaturity = 8;
    profile.medium.turnsToMaturity = Math.max(1, profile.medium.turnsToMaturity || 60);
    profile.longTerm.turnsToMaturity = Math.max(1, profile.longTerm.turnsToMaturity || 240);
  }

  const qeHoldings_bn = Math.max(0, dm.qeHoldings_bn - 8);
  const totalDebt = Math.max(1, state.fiscal.debtNominal_bn);
  const weightedAverageMaturity =
    ((profile.shortTerm.outstanding_bn * 2) +
      (profile.medium.outstanding_bn * 6.5) +
      (profile.longTerm.outstanding_bn * 18) +
      (profile.indexLinked.outstanding_bn * 12)) / totalDebt;
  const refinancingRisk = Math.max(0, Math.min(100, (profile.shortTerm.outstanding_bn / totalDebt) * 150 + (100 - qeHoldings_bn / 10)));

  const snapshots = state.simulation.monthlySnapshots || [];
  const sixAgo = snapshots.length >= 6 ? snapshots[snapshots.length - 6] : null;
  const yieldRise = sixAgo ? state.markets.giltYield10y - sixAgo.giltYield : 0;
  if (refinancingRisk > 70 && yieldRise > 1) {
    refinancingPremiumRiskModifier = {
      id: `refinancing_premium_${state.metadata.currentTurn}`,
      type: 'market_reaction_boost',
      turnsRemaining: 3,
      marketReactionScaleDelta: 0.15,
      description: 'Refinancing premium after short-term rollover stress.',
    };
  }

  const previousRolloverRiskPremium = dm.rolloverRiskPremium_bps || 0;
  let rolloverRiskPremium_bps = previousRolloverRiskPremium;
  let strategyYieldEffect_bps = 0;

  if (dm.issuanceStrategy === 'short') {
    strategyYieldEffect_bps = -7;
    rolloverRiskPremium_bps = Math.min(20, previousRolloverRiskPremium + 2);
  } else if (dm.issuanceStrategy === 'long') {
    strategyYieldEffect_bps = 10;
    rolloverRiskPremium_bps = Math.max(0, previousRolloverRiskPremium - 2);
  } else {
    strategyYieldEffect_bps = 0;
    rolloverRiskPremium_bps = Math.max(0, previousRolloverRiskPremium - 1);
  }

  const projectedDebtInterestByStrategy_bn = {
    short: Math.max(0, state.fiscal.debtInterest_bn + (state.fiscal.debtNominal_bn * -0.0007) + (rolloverRiskPremium_bps / 10000) * state.fiscal.debtNominal_bn),
    balanced: Math.max(0, state.fiscal.debtInterest_bn),
    long: Math.max(0, state.fiscal.debtInterest_bn + (state.fiscal.debtNominal_bn * 0.001)),
  };

  return {
    debtManagement: {
      ...dm,
      maturityProfile: profile,
      qeHoldings_bn,
      weightedAverageMaturity,
      refinancingRisk,
      rolloverRiskPremium_bps,
      strategyYieldEffect_bps,
      projectedDebtInterestByStrategy_bn,
    },
    refinancingPremiumRiskModifier,
  };
}

function triggerSpendingReviewIfDue(state: GameState): GameState {
  const sr = state.spendingReview;
  if (!sr || sr.inReview) return state;
  const scheduledReviewTurns = new Set([1, 37]);
  const isScheduledReview = scheduledReviewTurns.has(state.metadata.currentTurn) && sr.lastReviewTurn < state.metadata.currentTurn;
  if (!isScheduledReview) return state;
  return {
    ...state,
    spendingReview: {
      ...sr,
      inReview: true,
    },
  };
}

function decaySpendingReviewBonus(state: GameState): GameState {
  const current = state.spendingReview?.srCredibilityBonus || 0;
  if (current <= 0) return state;
  return {
    ...state,
    spendingReview: {
      ...state.spendingReview,
      srCredibilityBonus: Math.max(0, current - 1),
    },
  };
}

function processFiscalEventCycle(state: GameState): GameState {
  const month = state.metadata.currentMonth;
  const isBudgetTurn = month === 3;
  const isAutumnStatementTurn = month === 11;
  if (!isBudgetTurn && !isAutumnStatementTurn) return state;

  const pendingAnnouncements = (state.fiscal.pendingAnnouncements || []).map((announcement) => ({ ...announcement }));
  let revenueAdjustmentDelta = 0;
  pendingAnnouncements.forEach((announcement) => {
    if (!announcement.implemented && announcement.effectiveTurn <= state.metadata.currentTurn) {
      announcement.implemented = true;
      revenueAdjustmentDelta += announcement.fiscalImpact_bn;
    }
  });
  const nextFiscalEventTurn = state.metadata.currentTurn + (isBudgetTurn ? 8 : 4);

  return {
    ...state,
    fiscal: {
      ...state.fiscal,
      revenueAdjustment_bn: (state.fiscal.revenueAdjustment_bn || 0) + revenueAdjustmentDelta,
      pendingAnnouncements,
      fiscalEventType: isBudgetTurn ? 'budget' : 'autumn_statement',
      nextFiscalEventTurn,
    },
    simulation: {
      ...state.simulation,
      lastTurnDelta: state.simulation.lastTurnDelta
        ? {
          ...state.simulation.lastTurnDelta,
          deficitDrivers: [
            ...(state.simulation.lastTurnDelta.deficitDrivers || []),
            { name: `Fiscal event: ${(isBudgetTurn ? 'Budget' : 'Autumn Statement')}`, value: 0 },
          ],
        }
        : state.simulation.lastTurnDelta,
    },
  };
}

function updateDepartmentalDELs(state: GameState): GameState {
  const sr = state.spendingReview;
  if (!sr) return state;
  const updatedDepartments = { ...sr.departments };
  const deliveryRiskEvents: string[] = [];
  let services = { ...state.services };

  const applyBacklogPenalty = (deptKey: keyof typeof updatedDepartments, targetKeys: Array<keyof typeof services>) => {
    const dept = { ...updatedDepartments[deptKey] };
    const plannedResource = dept.plannedResourceDEL_bn?.[0] ?? dept.resourceDEL_bn;
    const plannedCapital = dept.plannedCapitalDEL_bn?.[0] ?? dept.capitalDEL_bn;
    const plannedTotal = plannedResource + plannedCapital;
    let actualTotal = plannedTotal;
    if (deptKey === 'nhs') actualTotal = state.fiscal.spending.nhs;
    if (deptKey === 'education') actualTotal = state.fiscal.spending.education;
    if (deptKey === 'defence') actualTotal = state.fiscal.spending.defence;
    if (deptKey === 'infrastructure') actualTotal = state.fiscal.spending.infrastructure;
    if (deptKey === 'homeOffice') actualTotal = state.fiscal.spending.police + state.fiscal.spending.justice;
    if (deptKey === 'other') actualTotal = state.fiscal.spending.other;
    if (deptKey === 'localGov') actualTotal = Math.max(0, state.devolution?.localGov?.centralGrant_bn || 30);

    const ratio = plannedTotal > 0 ? actualTotal / plannedTotal : 1;
    if (ratio > 1.05) dept.deliveryCapacity = Math.max(0, dept.deliveryCapacity - 1);
    if (ratio < 0.95) dept.backlog = Math.min(100, dept.backlog + 0.5);

    if (dept.deliveryCapacity < 50) {
      const p = (50 - dept.deliveryCapacity) / 200;
      if (Math.random() < p) {
        targetKeys.forEach((key) => {
          const current = Number(services[key] || 0);
          services[key] = Math.max(0, Math.min(100, current * 0.8)) as any;
        });
        deliveryRiskEvents.push(`${dept.name} delivery overrun`);
      }
    }

    const backlogPenalty = Math.max(0, Math.floor((dept.backlog - 40) / 10)) * 0.1;
    if (backlogPenalty > 0) {
      targetKeys.forEach((key) => {
        const current = Number(services[key] || 0);
        services[key] = Math.max(0, Math.min(100, current - backlogPenalty)) as any;
      });
    }

    updatedDepartments[deptKey] = dept;
  };

  applyBacklogPenalty('nhs', ['nhsQuality']);
  applyBacklogPenalty('education', ['educationQuality']);
  applyBacklogPenalty('infrastructure', ['infrastructureQuality']);
  applyBacklogPenalty('homeOffice', ['policingEffectiveness', 'prisonSafety', 'courtBacklogPerformance']);
  applyBacklogPenalty('localGov', ['affordableHousingDelivery']);
  applyBacklogPenalty('defence', ['infrastructureQuality']);
  applyBacklogPenalty('other', ['researchInnovationOutput']);

  return {
    ...state,
    services,
    spendingReview: {
      ...sr,
      departments: updatedDepartments,
      lastDeliveryRiskEvents: deliveryRiskEvents,
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
  const currentBudgetMet = !rule.rules.currentBudgetBalance || (currentBudgetBalance + OBR_HEADROOM_CALIBRATION) >= -0.5;

  // Overall balance: total revenue >= total spending + debt interest
  const overallBalance = fiscal.totalRevenue_bn - fiscal.totalSpending_bn - fiscal.debtInterest_bn;
  const overallBalanceMet = !rule.rules.overallBalance || overallBalance >= -0.5;

  // Deficit ceiling
  const deficitCeilingMet = rule.rules.deficitCeiling === undefined ||
    fiscal.deficitPctGDP <= rule.rules.deficitCeiling;

  // Debt target
  const debtTargetMet = rule.rules.debtTarget === undefined ||
    fiscal.debtPctGDP <= rule.rules.debtTarget;

  // Debt falling: assessment depends on the rule's time horizon and investment exemption
  // Jeremy Hunt (no capex exemption, 5yr horizon): debt/GDP falls when deficit is on a path
  //   to stay below ~3% of GDP (the ceiling itself is the operationally correct test).
  // Other medium/long-horizon rules (timeHorizon >= 4): a balanced current budget guarantees
  //   debt/GDP falls because nominal GDP grows ~3-4%/yr while only capex is borrowed.
  // Short-horizon rules (Balanced Budget 1yr, Maastricht 3yr): require actual observed falls.
  const snapshots = state.simulation.monthlySnapshots;
  let debtFallingMet = true;
  if (rule.rules.debtFalling) {
    if (rule.id === 'jeremy-hunt') {
      // No capex exemption: debt path tracks the overall deficit, not just current budget.
      // Debt/GDP falls in the 5th year when deficit is held below ~3% GDP (ceiling test).
      debtFallingMet = deficitCeilingMet;
    } else if (rule.rules.timeHorizon >= 4) {
      // Long/medium horizon: current budget balance is the operationally correct test
      const cbBalanceForDebt =
        fiscal.totalRevenue_bn -
        (fiscal.totalSpending_bn - (
          fiscal.spending.nhsCapital +
          fiscal.spending.educationCapital +
          fiscal.spending.defenceCapital +
          fiscal.spending.infrastructureCapital +
          fiscal.spending.policeCapital +
          fiscal.spending.justiceCapital +
          fiscal.spending.otherCapital
        )) -
        fiscal.debtInterest_bn;
      debtFallingMet = (cbBalanceForDebt + OBR_HEADROOM_CALIBRATION) >= -0.5;
    } else {
      // Short horizon: actual debt/GDP must be falling
      if (snapshots.length >= 12) {
        const twelveMonthsAgo = snapshots[snapshots.length - 12];
        debtFallingMet = fiscal.debtPctGDP < twelveMonthsAgo.debt;
      } else if (snapshots.length >= 6) {
        const sixMonthsAgo = snapshots[snapshots.length - 6];
        debtFallingMet = fiscal.debtPctGDP < sixMonthsAgo.debt;
      }
      // Fewer than 6 months of history: default true (benefit of doubt early game)
    }
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
    fiscal: {
      ...fiscal,
      fiscalRuleBreaches: !overallCompliant
        ? (fiscal.fiscalRuleBreaches || 0) + 1
        : fiscal.fiscalRuleBreaches || 0,
    },
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
  const baselineDeficit = 87; // Initial deficit
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

  const hasTrendHistory = !!previousSnapshot && state.simulation.monthlySnapshots.length >= 2;

  // Gilt yields respond to Bank Rate, fiscal position, credibility
  //
  // TERM PREMIUM RECALIBRATION (UK-specific):
  // The term premium reflects the compensation investors require for duration risk.
  // At restrictive policy rates (Bank Rate >> neutral), the curve inverts (negative term premium).
  // At neutral/low rates, a positive term premium of 0.2-0.4% is normal for the UK.
  // Old formula: -1.0 - restrictiveness*0.05  → produced baseYield of only 2.25% when
  //   Bank Rate reaches neutral (3.25%), far below OBR/DMO 10yr gilt consensus of ~3.5-4%.
  // New formula: 0.3 - restrictiveness*0.70
  //   Bank Rate 5.25% (restrictiveness=2.0):  termPremium = -1.10, baseYield = 4.15 ✓
  //   Bank Rate 4.00% (restrictiveness=0.75): termPremium = -0.225, baseYield = 3.775 ✓
  //   Bank Rate 3.25% (neutral, rest=0):      termPremium = +0.30, baseYield = 3.55  ✓
  //   Bank Rate 1.00% (rest=-2.25):           termPremium = +1.50 (capped), baseYield = 2.50 ✓
  const policyRestrictiveness = markets.bankRate - 3.25;
  const termPremium = Math.max(-1.8, Math.min(1.5, 0.3 - policyRestrictiveness * 0.70));
  const baseYield = markets.bankRate + termPremium;

  // UK QUANTITATIVE TIGHTENING SUPPLY PREMIUM:
  // The Bank of England began active gilt sales in Nov 2022, reducing the APF from ~£875bn
  // at peak to ~£690bn by July 2024 (target ~£50-100bn reduction per year).
  // Academic estimates (Cesa-Bianchi, Faccini, Lloyd 2023; BIS 2024) suggest QT adds
  // roughly 5-10bps to 10yr gilt yields relative to a no-QT counterfactual.
  // We model this as a flat 5bps (0.05%) supply premium, UK-specific.
  const qtDrawdown = Math.max(0, 875 - (state.markets.assetPurchaseFacility_bn || 875));
  const qtSupplyPremium = 0.05 + (qtDrawdown / 100) * 0.01;

  // HEADROOM-BASED MARKET PREMIUM:
  // Markets price fiscal sustainability via the OBR-certified current budget headroom.
  // Positive headroom → lower risk premium (government has fiscal space to absorb shocks).
  // Negative headroom (breach) → higher risk premium (solvency concern).
  // Calibration: ±£10bn headroom ≈ ±5bps, capped at -25bps (surplus) / +40bps (breach).
  // Based on UK-specific OBR/DMO work on "headroom sensitivity" (OBR FSR 2023/24).
  const headroomPremium = Math.max(-0.25, Math.min(0.40,
    -fiscal.fiscalHeadroom_bn * 0.005
  ));

  // Fiscal risk premium (non-linear: rises faster above 100% debt/GDP)
  // Threshold raised from 80% to 90%: at the corrected PSND ex-BoE debt level (~92.4%),
  // the previous 80% threshold generated a persistent +38bps overestimate of yields vs
  // the July 2024 DMO outturn of ~4.1%.  Advanced economies have demonstrated they can
  // sustain 80-90% debt without a sustained term premium; the premium starts biting above
  // 90% (IMF/BIS evidence), consistent with IMF Art. IV observations for the UK.
  // Scaled by difficulty (more volatile in realistic mode).
  const debtRatio = fiscal.debtPctGDP;
  let debtPremium = 0;
  if (debtRatio > 90) {
    // Gradual increase from 90-100%: ~0.02% per percentage point was 80%; threshold raised to 90%
    debtPremium = (debtRatio - 90) * 0.02 * difficulty.marketReactionScale;
  }
  if (debtRatio > 100) {
    // Accelerates above 100%: additional ~0.05% per percentage point
    debtPremium += (debtRatio - 100) * 0.05 * difficulty.marketReactionScale;
  }

  // Deficit premium (scaled by difficulty)
  // Markets tolerate ~3% deficit; above that, yields rise
  const deficitPremium = Math.max(0, (fiscal.deficitPctGDP - 3) * 0.15 * difficulty.marketReactionScale);

  // Direction-of-travel premium: markets price fiscal momentum, not just levels
  // RECALIBRATED: Increased sensitivity to fiscal trajectory
  const previousDebt = typeof previousSnapshot?.debt === 'number' ? previousSnapshot.debt : fiscal.debtPctGDP;
  const previousDeficit = typeof previousSnapshot?.deficit === 'number' ? previousSnapshot.deficit : fiscal.deficitPctGDP;
  const debtTrend = fiscal.debtPctGDP - previousDebt;
  const deficitTrend = fiscal.deficitPctGDP - previousDeficit;

  // New Feature: Bond Vigilantes (Realistic Mode)
  // Markets punish the RATE of change in borrowing, not just the level
  // If you try to borrow too much too quickly (e.g. +1% deficit in a single month), yields spike
  let vigilantePremium = 0;
  if (process.env.NODE_ENV !== 'test') { // Simple way to gate if needed, but we rely on logic
    if (hasTrendHistory && deficitTrend > 0.8) {
      // Massive fiscal expansion in one month -> Shock premium
      vigilantePremium = (deficitTrend - 0.8) * 0.5 * difficulty.marketReactionScale;
    }
  }

  // Worsening trajectories add premium; improving trajectories reduce it (scaled by difficulty)
  // Increased coefficients to make gilt markets more responsive
  const trendPremium = hasTrendHistory
    ? Math.max(-0.6, Math.min(0.6, (debtTrend * 0.4 + deficitTrend * 0.3) * difficulty.marketReactionScale))
    : 0;

  // Credibility discount (lower credibility = higher yields)
  const credibilityDiscount = (political.credibilityIndex - 50) * -0.008;

  // Credit rating effect
  const creditRatingPremium = getCreditRatingPremium(political.creditRating);

  // Fiscal rule credibility differential — drives persistent gilt yield level by framework.
  // FISCAL_RULE_GILT_EFFECT provides the per-rule offset (bp per month, signed).
  const fiscalRuleCredibilityEffect = FISCAL_RULE_GILT_EFFECT[political.chosenFiscalRule] ?? 0;

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

  const fiscalRuleChangeShock =
    (political.fiscalRuleYieldShockMonthsRemaining || 0) > 0
      ? (political.fiscalRuleYieldShock_pp || 0)
      : 0;

  const spendingReviewPlanPremium = (() => {
    const sr = state.spendingReview;
    if (!sr?.departments) return 0;
    const departmentKeys = Object.keys(sr.departments) as Array<keyof typeof sr.departments>;
    const yearTotals = [0, 0, 0];

    departmentKeys.forEach((key) => {
      const dept = sr.departments[key];
      for (let idx = 0; idx < 3; idx++) {
        yearTotals[idx] += (dept.plannedResourceDEL_bn?.[idx] ?? 0) + (dept.plannedCapitalDEL_bn?.[idx] ?? 0);
      }
    });

    const yearOne = yearTotals[0];
    if (yearOne <= 0) return 0;
    const outYearAverage = (yearTotals[1] + yearTotals[2]) / 2;
    const outYearExpansion = outYearAverage - yearOne;
    const headroomBuffer = Math.max(5, Math.abs(fiscal.fiscalHeadroom_bn) + 5);
    // Smaller than immediate fiscal/headroom channels: DEL out-years are guidance, not enacted budgets.
    // Cap at 20% of a comparable enacted-budget market response.
    return Math.max(-0.03, Math.min(0.04, (outYearExpansion / headroomBuffer) * 0.012));
  })();

  const issuanceStrategyEffect = (state.debtManagement.strategyYieldEffect_bps || 0) / 100;
  const rolloverRiskPremium = (state.debtManagement.rolloverRiskPremium_bps || 0) / 100;

  let newYield10y = baseYield + debtPremium + deficitPremium + trendPremium +
    vigilantePremium + credibilityDiscount + creditRatingPremium +
    fiscalRuleCredibilityEffect + marketPsychology +
    qtSupplyPremium + headroomPremium + fiscalRuleChangeShock + spendingReviewPlanPremium +
    issuanceStrategyEffect + rolloverRiskPremium;

  // LDI Crisis Logic (Realistic Mode)
  // If yields rise too fast (>50bps/month), pension funds get margin called
  // They sell gilts to raise cash, driving yields higher (feedback loop)
  let ldiPanicTriggered = markets.ldiPanicTriggered ?? false;

  const prevYield = markets.giltYield10y; // Current state yield before this turn's update
  let impliedYieldChange = newYield10y - prevYield;

  // Trigger condition: Sudden spike (>50bps) OR existing panic
  if (difficulty.marketReactionScale > 1.0 && hasTrendHistory) { // Only in Realistic/Hard modes
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
  // Fiscal rule sterling offset — stricter frameworks provide modest persistent currency support
  const fiscalRuleSterlingOffset = FISCAL_RULE_STERLING_EFFECT[political.chosenFiscalRule] ?? 0;

  let newSterlingIndex = 100 + yieldSterlingEffect + confidenceEffect + credibilityEffect + vigilanteSterlingPenalty + fiscalRuleSterlingOffset;
  newSterlingIndex = Math.max(70, Math.min(130, newSterlingIndex));

  // Gradual adjustment (unless LDI panic, then instant)
  const adjustmentSpeed = ldiPanicTriggered ? 1.0 : 0.3;
  const smoothedYield = prevYield + (newYield10y - prevYield) * adjustmentSpeed;

  const prevSterling = markets.sterlingIndex;
  const smoothedSterling = prevSterling + (newSterlingIndex - prevSterling) * 0.3;

  // Yield curve shape (dynamic vs Bank Rate)
  // 2y tends to track policy rate expectations; 30y embeds term premium.
  const curveSlope = Math.max(-1.2, Math.min(1.8, (smoothedYield - markets.bankRate) * 1.2));
  const spread2y = Math.max(-1.0, Math.min(0.8, 0.10 - curveSlope * 0.35));
  const spread30y = Math.max(0.2, Math.min(1.5, 0.55 + curveSlope * 0.25));

  // Mortgage rates
  const mortgageRate = (markets.bankRate + (smoothedYield + spread2y)) / 2 + 1.6;

  return {
    ...state,
    markets: {
      ...markets,
      giltYield10y: Math.max(0.5, Math.min(20, smoothedYield)),
      giltYield2y: Math.max(0.5, Math.min(20, smoothedYield + spread2y)),
      giltYield30y: Math.max(0.5, Math.min(20, smoothedYield + spread30y)),
      mortgageRate2y: Math.max(1.0, Math.min(20, mortgageRate)),
      sterlingIndex: smoothedSterling,
      yieldChange10y: smoothedYield - prevYield,
      ldiPanicTriggered: ldiPanicTriggered
    },
    political: {
      ...political,
      fiscalRuleYieldShock_pp:
        (political.fiscalRuleYieldShockMonthsRemaining || 0) > 0
          ? (political.fiscalRuleYieldShock_pp || 0) * (5 / 6)
          : 0,
      fiscalRuleYieldShockMonthsRemaining: Math.max(
        0,
        (political.fiscalRuleYieldShockMonthsRemaining || 0) - 1
      ),
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

function calculateHousingMarket(state: GameState): GameState {
  const fs = { ...state.financialStability };
  const difficulty = getDifficultySettings(state);
  const mortgageRate = state.markets.mortgageRate2y;
  const annualGrowth =
    (state.economic.gdpGrowthAnnual - 1.5) * 0.8 -
    (mortgageRate - 3.5) * 1.2 +
    (fs.householdDebtToIncome - 130) * -0.05 +
    ((Math.random() - 0.5) * difficulty.macroShockScale);
  fs.housePriceGrowthAnnual = Math.max(-8, Math.min(12, annualGrowth));
  fs.housePriceIndex = Math.max(40, fs.housePriceIndex * (1 + fs.housePriceGrowthAnnual / 12 / 100));
  fs.housingAffordabilityIndex = Math.max(0, Math.min(100, 100 - (fs.housePriceIndex * 0.35) - (mortgageRate * 2.5)));

  let stressDelta = 0;
  if (fs.housePriceGrowthAnnual < -3) stressDelta += 3;
  if (mortgageRate > 6 && fs.householdDebtToIncome > 140) stressDelta += 2;
  if (fs.creditGrowthAnnual > 8) stressDelta += 1;
  if (stressDelta === 0) stressDelta = -1;
  fs.bankStressIndex = Math.max(0, Math.min(100, fs.bankStressIndex + stressDelta));

  if (!fs.fpcInterventionActive && fs.bankStressIndex > 60) {
    fs.fpcInterventionActive = true;
    if (fs.housePriceGrowthAnnual > 5) {
      fs.fpcInterventionType = 'lti_cap';
      fs.mortgageApprovals *= 0.8;
      fs.housePriceGrowthAnnual -= 1.5;
    } else if (fs.householdDebtToIncome > 145) {
      fs.fpcInterventionType = 'ltv_cap';
      fs.mortgageApprovals *= 0.85;
    } else {
      fs.fpcInterventionType = 'countercyclical_buffer';
      fs.creditGrowthAnnual -= 2;
    }
    fs.fpcInterventionTurnsRemaining = 8 + Math.floor(Math.random() * 9);
  }
  if (fs.fpcInterventionActive) {
    fs.fpcInterventionTurnsRemaining = Math.max(0, fs.fpcInterventionTurnsRemaining - 1);
    if (fs.fpcInterventionTurnsRemaining === 0) {
      fs.fpcInterventionActive = false;
      fs.fpcInterventionType = null;
    }
  }

  const consecutiveHousingCrashTurns = fs.housePriceGrowthAnnual < -5
    ? (state.financialStability.consecutiveHousingCrashTurns || 0) + 1
    : 0;
  const housingAMEPressure_bn = consecutiveHousingCrashTurns >= 2 ? 1.5 + Math.random() * 1.5 : 0;
  const fpcConstraintCost_bn = fs.fpcInterventionActive ? 5 : 0;

  return {
    ...state,
    financialStability: {
      ...fs,
      consecutiveHousingCrashTurns,
    },
    fiscal: {
      ...state.fiscal,
      housingAMEPressure_bn,
      fpcConstraintCost_bn,
    },
  };
}

function calculateDevolution(state: GameState): GameState {
  const dev = { ...state.devolution, nations: { ...state.devolution.nations }, localGov: { ...state.devolution.localGov } };
  const baselineEnglandComparable = 180.4 + 116 + 30;
  const currentComparable = state.fiscal.spending.nhs + state.fiscal.spending.education + dev.localGov.centralGrant_bn;
  const comparableChange = currentComparable - baselineEnglandComparable;
  const nations = { ...dev.nations };
  (Object.keys(nations) as Array<keyof typeof nations>).forEach((key) => {
    const nation = { ...nations[key] };
    const consequential = comparableChange * nation.barnettBaseline_bn * dev.barnettConsequentialMultiplier;
    nation.blockGrant_bn = Math.max(0, nation.blockGrant_bn + consequential);
    const inflationRealCut = comparableChange < (state.economic.inflationCPI / 100) * nation.blockGrant_bn;
    if (key === 'scotland') {
      if (inflationRealCut) nation.politicalTension += 1;
      if (dev.barnettConsequentialMultiplier < 0.9) nation.politicalTension += 2;
      if (!inflationRealCut && dev.barnettConsequentialMultiplier >= 0.9) nation.politicalTension -= 0.5;
    } else if (key === 'wales') {
      if (inflationRealCut) nation.politicalTension += 0.7;
      else nation.politicalTension -= 0.4;
    } else {
      if (state.political.governmentApproval < 35 && state.political.backbenchSatisfaction < 40) nation.politicalTension += 1.2;
      else nation.politicalTension -= 0.3;
    }
    nation.politicalTension = Math.max(0, Math.min(100, nation.politicalTension));
    if (nation.politicalTension > 70) {
      nation.grantDispute = true;
      nation.grantDisputeTurnsRemaining = Math.max(nation.grantDisputeTurnsRemaining, 4);
    }
    if (nation.grantDisputeTurnsRemaining > 0) {
      nation.grantDisputeTurnsRemaining -= 1;
      if (nation.grantDisputeTurnsRemaining === 0) nation.grantDispute = false;
    }
    nations[key] = nation;
  });

  const difficulty = getDifficultySettings(state);
  const adultSocialCarePressure_bn = (dev.localGov.adultSocialCarePressure_bn || 12) * (1 + (3.5 / 12) / 100);
  const retainedRatesBoost = (dev.localGov.businessRatesRetention || 50) * 0.02;
  const councilTaxFlexBoost = Math.max(0, ((dev.localGov.councilTaxGrowthCap || 3) - 3) * 0.4);
  const coreSettlement_bn = Math.max(0, (dev.localGov.coreSettlement_bn || 14) + retainedRatesBoost + councilTaxFlexBoost);
  const fundingGap = Math.max(0, adultSocialCarePressure_bn - coreSettlement_bn);

  let localGovStress = dev.localGov.localGovStressIndex;
  localGovStress += fundingGap * 2.1;
  if (dev.localGov.centralGrant_bn < 30 * (1 + state.economic.inflationCPI / 100)) localGovStress += 1.2;
  if (dev.localGov.localServicesQuality < 40) localGovStress += 1;
  localGovStress = Math.max(0, Math.min(100, localGovStress));
  const localServicesQuality = Math.max(0, Math.min(100, dev.localGov.localServicesQuality + (fundingGap < 1 ? 0.2 : -0.35) - (localGovStress > 65 ? 0.45 : 0)));
  let section114Timer = (dev.section114Timer || 0) + 1;
  let section114Notices = dev.localGov.section114Notices;
  let section114Count = dev.localGov.section114Count || section114Notices;
  let section114Triggered = false;
  const section114Probability =
    localGovStress > 85 ? 0.35 :
      localGovStress > 70 ? 0.15 : 0;
  if (section114Timer >= 1 && Math.random() < section114Probability * difficulty.macroShockScale) {
    section114Notices += 1;
    section114Count += 1;
    section114Triggered = true;
    section114Timer = 0;
  }

  const barnettConsequentials_bn = Math.max(0, comparableChange * 0.17 * dev.barnettConsequentialMultiplier);
  const niCredibilityPenalty = nations.northernIreland.politicalTension > 60 ? 5 : 0;
  const devolutionCrisis = nations.scotland.politicalTension > 85;

  const nextState: GameState = {
    ...state,
    devolution: {
      ...dev,
      nations,
      section114Timer,
      localGov: {
        ...dev.localGov,
        localGovStressIndex: localGovStress,
        section114Notices,
        section114Count,
        localServicesQuality,
        coreSettlement_bn,
        adultSocialCarePressure_bn,
        councilFundingStress: localGovStress,
      },
    },
    fiscal: {
      ...state.fiscal,
      barnettConsequentials_bn,
    },
    political: {
      ...state.political,
      credibilityIndex: Math.max(0, state.political.credibilityIndex - niCredibilityPenalty),
      backbenchSatisfaction: Math.max(0, state.political.backbenchSatisfaction - (section114Notices > state.devolution.localGov.section114Notices ? 2 : 0)),
      governmentApproval: Math.max(10, state.political.governmentApproval - (section114Triggered ? (0.8 + Math.random() * 0.7) : 0)),
    },
  };
  if (devolutionCrisis) {
    return {
      ...nextState,
      events: {
        ...nextState.events,
        pendingEvents: [
          ...(nextState.events.pendingEvents || []),
          {
            id: `devolution_crisis_${state.metadata.currentTurn}`,
            type: 'political_crisis',
            severity: 'major',
            month: state.metadata.currentMonth,
            date: new Date(state.metadata.currentYear, state.metadata.currentMonth - 1, 1),
            title: 'Devolution Crisis Escalates',
            description: 'Relations with devolved administrations have deteriorated sharply, requiring direct PM intervention.',
            immediateImpact: { approvalRating: -2, pmTrust: -2 },
            responseOptions: [],
            requiresResponse: false,
          } as any,
        ],
      },
    };
  }
  if (section114Triggered) {
    return {
      ...nextState,
      services: {
        ...nextState.services,
        policingEffectiveness: Math.max(0, nextState.services.policingEffectiveness - 0.8),
        courtBacklogPerformance: Math.max(0, nextState.services.courtBacklogPerformance - 0.6),
        socialCareQuality: Math.max(0, nextState.services.socialCareQuality - 0.9),
      },
      events: {
        ...nextState.events,
        pendingEvents: [
          ...(nextState.events.pendingEvents || []),
          {
            id: `section114_${state.metadata.currentTurn}`,
            type: 'political_crisis',
            severity: 'major',
            month: state.metadata.currentMonth,
            date: new Date(state.metadata.currentYear, state.metadata.currentMonth - 1, 1),
            title: 'Council issues Section 114 notice',
            description: 'A local authority has effectively declared bankruptcy, intensifying pressure on local services and central government.',
            immediateImpact: { approvalRating: -1.1, pmTrust: -0.5 },
            responseOptions: [],
            requiresResponse: false,
          } as any,
        ],
      },
    };
  }
  return nextState;
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
  if (nhsRealGrowth > 5) {
    // Excessive spending (>5% above demand): diminishing returns kick in hard
    // Each additional % gives less benefit: 10-15% range gives +0.3, 15-20% gives +0.15, >20% gives +0.05
    nhsQualityChange = 0.5 + Math.log(nhsRealGrowth / 5 + 1) * 0.15; // Logarithmic: +0.5 base, then diminishing
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
  // Improvements lag more (45% per month)
  // Cuts bite faster (65% per month)
  const nhsLagCoefficient = nhsQualityChange > 0 ? 0.45 : 0.65;
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
  // Improvements lag (45% per month), cuts faster (65% per month)
  const eduLagCoefficient = eduQualityChange > 0 ? 0.45 : 0.65;
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

  if (services.nhsStrikeMonthsRemaining > 0) {
    nhsQuality -= 1;
  }

  if (services.educationStrikeMonthsRemaining > 0) {
    eduQuality -= 1;
  }

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
      consecutiveNHSCutMonths: services.consecutiveNHSCutMonths,
      consecutiveEducationCutMonths: services.consecutiveEducationCutMonths,
      consecutivePensionCutMonths: services.consecutivePensionCutMonths,
      nhsStrikeMonthsRemaining: services.nhsStrikeMonthsRemaining,
      educationStrikeMonthsRemaining: services.educationStrikeMonthsRemaining,
      pensionerRevoltCooldown: services.pensionerRevoltCooldown,
      nhsStrikeCooldown: services.nhsStrikeCooldown,
      teacherStrikeCooldown: services.teacherStrikeCooldown,
      strikeTriggerThresholdMultiplier: services.strikeTriggerThresholdMultiplier,
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

function processParliamentaryMechanics(state: GameState): GameState {
  const parliamentary = { ...state.parliamentary };
  let political = { ...state.political };
  let fiscal = { ...state.fiscal };

  // Whip dynamics.
  parliamentary.whipStrength = Math.max(0, parliamentary.whipStrength - 1);
  if ((state.manifesto.totalViolations || 0) > 0) {
    parliamentary.whipStrength = Math.max(0, parliamentary.whipStrength - 3);
  }
  if (political.pmTrust > 60) parliamentary.whipStrength = Math.min(100, parliamentary.whipStrength + 3);
  if ((state.spendingReview.srCredibilityBonus || 0) > 0) parliamentary.whipStrength = Math.min(100, parliamentary.whipStrength + 5);

  // Lords delay countdown and pending apply.
  if (parliamentary.lordsDelayActive) {
    parliamentary.lordsDelayTurnsRemaining = Math.max(0, parliamentary.lordsDelayTurnsRemaining - 1);
    if (parliamentary.lordsDelayTurnsRemaining === 0) {
      parliamentary.lordsDelayActive = false;
      parliamentary.lordsDelayBillType = null;
    }
  }

  if (fiscal.pendingBudgetChange && fiscal.pendingBudgetApplyTurn !== null && state.metadata.currentTurn >= fiscal.pendingBudgetApplyTurn) {
    fiscal = applyPendingBudgetChange(fiscal, fiscal.pendingBudgetChange);
    fiscal.pendingBudgetChange = null;
    fiscal.pendingBudgetApplyTurn = null;
  }

  // Select committee pressure.
  parliamentary.selectCommittees = parliamentary.selectCommittees.map((committee) => {
    const next = { ...committee };
    let trigger = false;
    let pressureDelta = -2;
    if (committee.id === 'treasury') {
      trigger = state.fiscal.deficit_bn > (state.simulation.monthlySnapshots?.[Math.max(0, (state.simulation.monthlySnapshots.length || 1) - 12)]?.deficit || state.fiscal.deficitPctGDP) + 30 || (state.fiscal.fiscalRuleBreaches || 0) > 0;
      pressureDelta = trigger ? 5 : -2;
    } else if (committee.id === 'health') {
      trigger = state.services.nhsQuality < 55 || (state.services.nhsStrikeMonthsRemaining || 0) > 0;
      pressureDelta = trigger ? 4 : -2;
    } else if (committee.id === 'education') {
      trigger = state.services.educationQuality < 58 || (state.services.educationStrikeMonthsRemaining || 0) > 0;
      pressureDelta = trigger ? 4 : -2;
    } else if (committee.id === 'publicAccounts') {
      const anyCapacityLow = Object.values(state.spendingReview.departments).some((d: any) => d.deliveryCapacity < 40);
      trigger = anyCapacityLow;
      pressureDelta = trigger ? 3 : -2;
    } else if (committee.id === 'homeAffairs') {
      trigger = state.services.policingEffectiveness < 48 || state.services.prisonSafety < 42;
      pressureDelta = trigger ? 3 : -2;
    }
    next.scrutinyPressure = Math.max(0, Math.min(100, next.scrutinyPressure + pressureDelta));
    if (!next.isInquiryActive && next.scrutinyPressure > (next.inquiryTriggerThreshold || 70)) {
      next.isInquiryActive = true;
      next.inquiryTurnsRemaining = 8;
      next.credibilityImpact = -3;
    }
    if (next.isInquiryActive) {
      next.inquiryTurnsRemaining = Math.max(0, next.inquiryTurnsRemaining - 1);
      if (next.inquiryTurnsRemaining === 0) {
        next.isInquiryActive = false;
        next.credibilityImpact = 0;
        next.scrutinyPressure = Math.max(20, next.scrutinyPressure - 20);
      }
    }
    return next;
  });

  const activeInquiryPenalty = parliamentary.selectCommittees.filter((c) => c.isInquiryActive).length * 3;
  political.credibilityIndex = Math.max(0, Math.min(100, political.credibilityIndex - activeInquiryPenalty));
  if ((state.spendingReview.srCredibilityBonus || 0) > 0) {
    political.credibilityIndex = Math.max(0, Math.min(100, political.credibilityIndex + (state.spendingReview.srCredibilityBonus / 8)));
  }

  const labourOppositionCount = Array.from(state.mpSystem.currentBudgetSupport.entries())
    .filter(([mpId, stance]) => state.mpSystem.allMPs.get(mpId)?.party === 'labour' && stance.stance === 'oppose')
    .length;
  if (labourOppositionCount >= 10) {
    parliamentary.rebellionCount += 1;
    if (labourOppositionCount > 15) {
      parliamentary.whipStrength = Math.max(0, parliamentary.whipStrength - 5);
    }
  }

  const confidenceTrigger = political.backbenchSatisfaction < 25 || parliamentary.rebellionCount >= 3;
  if (!parliamentary.formalConfidenceVotePending && confidenceTrigger) {
    parliamentary.formalConfidenceVotePending = true;
    parliamentary.confidenceVoteTurn = state.metadata.currentTurn + 2;
  }
  if (parliamentary.formalConfidenceVotePending && parliamentary.confidenceVoteTurn === state.metadata.currentTurn) {
    const labourMPs = Array.from(state.mpSystem.allMPs.values()).filter((mp) => mp.party === 'labour');
    const supportStances = Array.from(state.mpSystem.currentBudgetSupport.values()).filter((s) => s.stance === 'support').length;
    const supportRatio = labourMPs.length > 0 ? (supportStances / labourMPs.length) * (parliamentary.whipStrength / 100) : 1;
    if (supportRatio < 0.5) {
      return {
        ...state,
        metadata: {
          ...state.metadata,
          gameOver: true,
          gameOverReason: 'You lost a formal confidence vote in the Commons and were replaced as Chancellor.',
        },
        parliamentary,
      };
    }
    parliamentary.formalConfidenceVotePending = false;
    parliamentary.confidenceVoteTurn = null;
    parliamentary.rebellionCount = 0;
    parliamentary.whipStrength = Math.min(100, parliamentary.whipStrength + 10);
    political.backbenchSatisfaction = Math.min(100, political.backbenchSatisfaction + 15);
  }

  return {
    ...state,
    parliamentary,
    political,
    fiscal,
  };
}

function applyPendingBudgetChange(fiscal: GameState['fiscal'], pending: Record<string, any>): GameState['fiscal'] {
  const next = {
    ...fiscal,
    spending: { ...fiscal.spending },
    detailedTaxes: [...(fiscal.detailedTaxes || [])],
    detailedSpending: [...(fiscal.detailedSpending || [])],
  };
  if (pending.incomeTaxBasicChange) next.incomeTaxBasicRate += pending.incomeTaxBasicChange;
  if (pending.incomeTaxHigherChange) next.incomeTaxHigherRate += pending.incomeTaxHigherChange;
  if (pending.incomeTaxAdditionalChange) next.incomeTaxAdditionalRate += pending.incomeTaxAdditionalChange;
  if (pending.niEmployeeChange) next.nationalInsuranceRate += pending.niEmployeeChange;
  if (pending.niEmployerChange) next.employerNIRate += pending.niEmployerChange;
  if (pending.vatChange) next.vatRate += pending.vatChange;
  if (pending.corporationTaxChange) next.corporationTaxRate += pending.corporationTaxChange;
  if (pending.revenueAdjustment !== undefined) next.revenueAdjustment_bn = pending.revenueAdjustment;
  const spendingKeys = [
    'nhsCurrentChange', 'nhsCapitalChange', 'educationCurrentChange', 'educationCapitalChange',
    'defenceCurrentChange', 'defenceCapitalChange', 'welfareCurrentChange', 'infrastructureCurrentChange',
    'infrastructureCapitalChange', 'policeCurrentChange', 'policeCapitalChange', 'justiceCurrentChange',
    'justiceCapitalChange', 'otherCurrentChange', 'otherCapitalChange',
  ] as const;
  spendingKeys.forEach((key) => {
    if (pending[key] === undefined) return;
    const mapped = key.replace('Change', '').replace(/^[a-z]/, (m: string) => m.toLowerCase());
    (next.spending as any)[mapped] = ((next.spending as any)[mapped] || 0) + pending[key];
  });
  next.spending.nhs = next.spending.nhsCurrent + next.spending.nhsCapital;
  next.spending.education = next.spending.educationCurrent + next.spending.educationCapital;
  next.spending.defence = next.spending.defenceCurrent + next.spending.defenceCapital;
  next.spending.welfare = next.spending.welfareCurrent;
  next.spending.infrastructure = next.spending.infrastructureCurrent + next.spending.infrastructureCapital;
  next.spending.police = next.spending.policeCurrent + next.spending.policeCapital;
  next.spending.justice = next.spending.justiceCurrent + next.spending.justiceCapital;
  next.spending.other = next.spending.otherCurrent + next.spending.otherCapital;
  if (pending.detailedTaxRates) {
    next.detailedTaxes = next.detailedTaxes.map((tax) => pending.detailedTaxRates[tax.id] !== undefined ? { ...tax, currentRate: pending.detailedTaxRates[tax.id] } : tax);
  }
  if (pending.detailedSpendingBudgets) {
    next.detailedSpending = next.detailedSpending.map((item) => pending.detailedSpendingBudgets[item.id] !== undefined ? { ...item, currentBudget: pending.detailedSpendingBudgets[item.id] } : item);
  }
  next.totalSpending_bn =
    next.spending.nhs + next.spending.education + next.spending.defence + next.spending.welfare +
    next.spending.infrastructure + next.spending.police + next.spending.justice + next.spending.other;
  return next;
}

// ===========================
// Step 12: Approval Ratings
// ===========================

function calculateDistributional(state: GameState): GameState {
  const prev = state.distributional;
  const basicDelta = state.fiscal.incomeTaxBasicRate - 20;
  const higherDelta = state.fiscal.incomeTaxHigherRate - 40;
  const additionalDelta = state.fiscal.incomeTaxAdditionalRate - 45;
  const niEmployeeDelta = state.fiscal.nationalInsuranceRate - 8;
  const niEmployerDelta = state.fiscal.employerNIRate - 13.8;
  const vatDelta = state.fiscal.vatRate - 20;
  const welfareRatio = (state.fiscal.spending.welfareCurrent - BASELINE_FISCAL_STATE.spending.welfareCurrent) / BASELINE_FISCAL_STATE.spending.welfareCurrent;
  const nhsRatio = (state.fiscal.spending.nhsCurrent - BASELINE_FISCAL_STATE.spending.nhsCurrent) / BASELINE_FISCAL_STATE.spending.nhsCurrent;
  const eduRatio = (state.fiscal.spending.educationCurrent - BASELINE_FISCAL_STATE.spending.educationCurrent) / BASELINE_FISCAL_STATE.spending.educationCurrent;
  const vatBurdenWeight = [2.5, 2.2, 1.9, 1.6, 1.4, 1.2, 1.0, 0.9, 0.8, 1.0];
  const basicWeight = [0.03, 0.05, 0.08, 0.14, 0.16, 0.18, 0.16, 0.1, 0.06, 0.04];
  const higherWeight = [0, 0, 0.01, 0.03, 0.05, 0.08, 0.14, 0.2, 0.22, 0.27];
  const additionalWeight = [0, 0, 0, 0, 0.01, 0.02, 0.04, 0.08, 0.15, 0.7];
  const niWeight = [0.03, 0.07, 0.14, 0.16, 0.16, 0.15, 0.13, 0.1, 0.04, 0.02];
  const welfareWeight = [0.32, 0.28, 0.2, 0.14, 0.04, 0.02, 0, 0, 0, 0];
  const serviceWeight = [0.16, 0.15, 0.13, 0.12, 0.11, 0.1, 0.09, 0.07, 0.04, 0.03];
  const decileImpacts = Array.from({ length: 10 }, (_, idx) => {
    const incomeTaxEffect = -(basicDelta * basicWeight[idx] * 0.18 + higherDelta * higherWeight[idx] * 0.2 + additionalDelta * additionalWeight[idx] * 0.25);
    const niEffect = -(niEmployeeDelta * niWeight[idx] * 0.16 + niEmployerDelta * niWeight[idx] * 0.1);
    const vatEffect = -(vatDelta * 0.08 * (vatBurdenWeight[idx] / 2.5));
    const welfareEffect = welfareRatio * welfareWeight[idx] * 6.5;
    const serviceEffect = (nhsRatio + eduRatio) * serviceWeight[idx] * 1.8;
    return round1(incomeTaxEffect + niEffect + vatEffect + welfareEffect + serviceEffect);
  });

  const deciles = prev.deciles.map((decile) => {
    const income = decile.avgIncome_k * 1000;
    const pa = 12570;
    const basicUpper = 50270;
    const additionalThreshold = 125140;
    const taxable = Math.max(0, income - pa);
    const basicBand = Math.max(0, Math.min(basicUpper - pa, taxable));
    const higherBand = Math.max(0, Math.min(additionalThreshold - basicUpper, taxable - basicBand));
    const additionalBand = Math.max(0, taxable - basicBand - higherBand);
    const taxCash =
      basicBand * (state.fiscal.incomeTaxBasicRate / 100) +
      higherBand * (state.fiscal.incomeTaxHigherRate / 100) +
      additionalBand * (state.fiscal.incomeTaxAdditionalRate / 100);
    const niBand = Math.max(0, Math.min(basicUpper - pa, taxable));
    const niCash = niBand * (state.fiscal.nationalInsuranceRate / 100);
    const vatBurden = (state.fiscal.vatRate / 20) * 0.08 * (1 - decile.id / 12);
    const effectiveTaxRate = Math.max(0, Math.min(70, (taxCash + niCash) / income * 100 + vatBurden * 100));
    const prevTax = decile.effectiveTaxRate || effectiveTaxRate;
    const welfareEffect = decile.id <= 3
      ? ((state.fiscal.spending.welfareCurrent - BASELINE_FISCAL_STATE.spending.welfareCurrent) / BASELINE_FISCAL_STATE.spending.welfareCurrent) * 40
      : (decile.id <= 4 ? ((state.fiscal.spending.welfareCurrent - BASELINE_FISCAL_STATE.spending.welfareCurrent) / BASELINE_FISCAL_STATE.spending.welfareCurrent) * 20 : 0);
    const realIncomeChange =
      state.economic.wageGrowthAnnual -
      state.economic.inflationCPI -
      ((effectiveTaxRate - prevTax) * 2) +
      welfareEffect +
      (decileImpacts[decile.id - 1] || 0);
    return {
      ...decile,
      effectiveTaxRate,
      realIncomeChange,
      isWinner: realIncomeChange > 0,
    };
  });

  const incomes = deciles.map((d) => d.avgIncome_k * (1 + d.realIncomeChange / 100));
  const total = incomes.reduce((a, b) => a + b, 0);
  const shares = incomes.map((i) => (total > 0 ? i / total : 0));
  let cumulative = 0;
  let sumTerm = 0;
  shares.forEach((s) => {
    cumulative += s;
    sumTerm += cumulative * 0.1;
  });
  const giniCoefficient = Math.max(0.28, Math.min(0.55, 1 - 2 * sumTerm));
  const bottomQuintileRealIncomeGrowth = (deciles[0].realIncomeChange + deciles[1].realIncomeChange) / 2;
  const povertyRate = Math.max(8, Math.min(40, 17.5 - (bottomQuintileRealIncomeGrowth * 0.8) + (state.economic.inflationCPI > 4 ? (state.economic.inflationCPI - 4) * 0.3 : 0)));
  const childPovertyRate = Math.max(10, Math.min(60, povertyRate * 1.65));
  const topDecileEffectiveTaxRate = deciles[9].effectiveTaxRate;
  const taxProgressivityDelta = deciles[9].effectiveTaxRate - prev.deciles[9].effectiveTaxRate - (deciles[0].effectiveTaxRate - prev.deciles[0].effectiveTaxRate);
  const lastTaxChangeDistribution = taxProgressivityDelta > 0.05 ? 'progressive' : taxProgressivityDelta < -0.05 ? 'regressive' : 'neutral';

  return {
    ...state,
    distributional: {
      ...prev,
      deciles,
      giniCoefficient,
      povertyRate,
      childPovertyRate,
      bottomQuintileRealIncomeGrowth,
      topDecileEffectiveTaxRate,
      lastTaxChangeDistribution,
      decileImpacts,
    },
  };
}

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
    services.researchInnovationOutput +
    state.devolution.localGov.localServicesQuality
  ) / 13;
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
  const fiscalRuleBreachEffect = state.political.fiscalRuleCompliance.overallCompliant ? 0 : -0.4;
  const strikeEffect = (state.services.nhsStrikeMonthsRemaining > 0 ? -1.5 : 0) +
    (state.services.educationStrikeMonthsRemaining > 0 ? -1.5 : 0);

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
  const distributionEffect =
    (state.distributional.bottomQuintileRealIncomeGrowth * 0.3) -
    ((state.distributional.giniCoefficient - 0.35) * 15) -
    ((state.distributional.povertyRate - 17.5) * 0.5) +
    ((state.financialStability.housingAffordabilityIndex - 38) * 0.04);

  // Random noise
  const randomEffect = (Math.random() - 0.5) * 1.5;
  const taxDistributionEffect = state.distributional.lastTaxChangeDistribution === 'regressive'
    ? -3
    : state.distributional.lastTaxChangeDistribution === 'progressive'
      ? -1
      : 0;

  // Combine with meaningful monthly sensitivity (0.25 instead of 0.08)
  // This allows a crisis to move approval ~2-3 points per month rather than ~0.3
  let totalChange = (gdpEffect + unemploymentEffect + inflationEffect + realWageEffect +
    nhsEffect + educationEffect + granularServicesEffect +
    householdTaxEffect + businessTaxEffect +
    deficitEffect + fiscalRuleBreachEffect + strikeEffect + manifestoEffect +
    honeymoonBoost + socialMediaEffect + distributionEffect + taxDistributionEffect + randomEffect) * 0.25;

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

  // Clamp - UPDATED: Reverted ceiling to 70 to prevent positive feedback loops breaking the game
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
  // Drift target varies by chosen fiscal rule: stricter frameworks make Labour backbenchers
  // uncomfortable; more permissive frameworks (MMT, Golden Rule) are more popular.
  const ruleBackbenchTarget = FISCAL_RULE_BACKBENCH_DRIFT_TARGET[state.political.chosenFiscalRule] ?? 55;
  satisfaction += (ruleBackbenchTarget - satisfaction) * 0.008;

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
    state.metadata.currentTurn,
    {
      whipStrength: state.parliamentary.whipStrength,
      taxDistribution: state.distributional.lastTaxChangeDistribution,
    }
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

function applyFiscalFrameworkChangeConsequences(state: GameState): GameState {
  const { political } = state;
  if (!political.fiscalRuleChangedLastTurn) {
    const remaining = political.fiscalRuleUturnReactionTurnsRemaining || 0;
    if (remaining <= 0) return state;
    return {
      ...state,
      political: {
        ...political,
        fiscalRuleUturnReactionTurnsRemaining: remaining - 1,
      },
    };
  }

  const difficulty = getDifficultySettings(state);
  const changeCount = Math.max(1, political.fiscalRuleChangeCount || 1);
  const escalation = Math.pow(2, Math.max(0, changeCount - 1));
  const baseCredibilityHit = (15 + Math.random() * 10) * difficulty.marketReactionScale;
  const credibilityHit = baseCredibilityHit * escalation;
  const yieldShock = (0.3 + Math.random() * 0.2) * difficulty.marketReactionScale;

  const newspaper = {
    newspaper: {
      name: 'Financial Times',
      bias: 'financial',
      style: 'broadsheet',
      priorities: ['markets', 'debt', 'growth', 'monetary_policy', 'international_trade'],
    },
    headline: 'Chancellor performs fiscal framework U-turn as market nerves rise',
    subheading: 'Analysts warn that repeated rule changes risk permanent credibility damage in gilts and sterling.',
    paragraphs: [
      'The Treasury has changed its fiscal framework mid-parliament, prompting immediate criticism from opposition parties and several Labour backbenchers.',
      'Market participants said the move may increase risk premia unless the government quickly demonstrates a coherent medium-term plan.',
    ],
    oppositionQuote: {
      speaker: 'Shadow Chancellor',
      quote: 'You cannot rebuild trust by rewriting the rules whenever they become uncomfortable.',
      party: 'Conservative' as const,
    },
    month: state.metadata.currentMonth,
    date: new Date(state.metadata.currentYear, state.metadata.currentMonth - 1, 1),
    isSpecialEdition: true,
  };

  return {
    ...state,
    political: {
      ...political,
      credibilityIndex: Math.max(0, political.credibilityIndex - credibilityHit),
      pmTrust: Math.max(0, political.pmTrust - 8),
      backbenchSatisfaction: Math.max(0, political.backbenchSatisfaction - 5),
      fiscalRuleChangedLastTurn: false,
      fiscalRuleYieldShock_pp: (political.fiscalRuleYieldShock_pp || 0) + yieldShock,
      fiscalRuleYieldShockMonthsRemaining: Math.max(
        6,
        political.fiscalRuleYieldShockMonthsRemaining || 0
      ),
      fiscalRuleUturnReactionTurnsRemaining: 3,
    },
    events: {
      ...state.events,
      currentNewspaper: newspaper,
      eventLog: [
        ...(state.events.eventLog || []),
        {
          event: {
            id: `fiscal_rule_uturn_${state.metadata.currentTurn}`,
            type: 'political',
            title: 'Fiscal framework U-turn',
            description: 'Government changed fiscal framework mid-term.',
            active: false,
          },
          resolved: true,
          newsArticle: newspaper,
        },
      ],
    },
  };
}

function enforcePMThreatDeadlines(state: GameState): GameState {
  const activeThreats = state.pmRelationship.activeThreats || [];
  if (activeThreats.length === 0) return state;

  const currentTurn = state.metadata.currentTurn;
  let anyChanged = false;
  let breachedCount = 0;

  const updatedThreats = activeThreats.map((threat) => {
    if (threat.resolved || threat.breached) return threat;

    if (state.fiscal.deficit_bn <= threat.targetDeficit_bn) {
      anyChanged = true;
      return {
        ...threat,
        resolved: true,
      };
    }

    if (currentTurn > threat.deadlineTurn) {
      anyChanged = true;
      breachedCount += 1;
      return {
        ...threat,
        breached: true,
      };
    }

    return threat;
  });

  if (!anyChanged) return state;

  return {
    ...state,
    political: {
      ...state.political,
      pmTrust: Math.max(0, state.political.pmTrust - breachedCount * (10 + Math.random() * 5)),
      backbenchSatisfaction: Math.max(0, state.political.backbenchSatisfaction - breachedCount * 4),
    },
    pmRelationship: {
      ...state.pmRelationship,
      reshuffleRisk: Math.min(100, (state.pmRelationship.reshuffleRisk || 0) + breachedCount * 12),
      activeThreats: updatedThreats,
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
      demandDescription: 'The backbenches are in open revolt. We will increase a pressured frontline service budget now and lock it into the baseline.',
      complyPolicyDescription: 'Comply: permanent +£3.0bn annual NHS current spending.',
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
      demandDescription: 'We made clear promises to the electorate. You must reverse a meaningful share of the latest manifesto breach.',
      complyPolicyDescription: 'Comply: partial reversal of the latest manifesto-violating tax rise or spending cut.',
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
      demandDescription: 'The polling is catastrophic. We need an immediate service package that voters can feel this year.',
      complyPolicyDescription: 'Comply: immediate +£2.5bn annual NHS and welfare support package.',
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
      demandDescription: 'The gilt market is questioning our fiscal path. We need a credible tightening package now.',
      complyPolicyDescription: 'Comply: enforce at least £5bn annual deficit reduction through spending restraint and/or revenue.',
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

  const breachedThreat = (state.pmRelationship.activeThreats || []).find(
    (threat) => threat.breached && !threat.followUpSent
  );

  if (breachedThreat) {
    const followUpMessage = {
      id: `pm_${state.metadata.currentTurn}_threat_followup_${Date.now()}`,
      turn: state.metadata.currentTurn,
      type: 'threat' as const,
      subject: 'Deadline missed: PM confidence reduced',
      content:
        `Chancellor, the deadline to reduce the deficit below £${breachedThreat.targetDeficit_bn.toFixed(0)}bn has passed without delivery. ` +
        `You were given until turn ${breachedThreat.deadlineTurn}. I now require an immediate corrective package.`,
      tone: 'angry' as const,
      read: false,
      timestamp: Date.now(),
    };

    return {
      ...state,
      pmRelationship: {
        ...state.pmRelationship,
        unreadCount: state.pmRelationship.unreadCount + 1,
        messages: [...state.pmRelationship.messages, followUpMessage],
        activeThreats: state.pmRelationship.activeThreats.map((threat) =>
          threat.id === breachedThreat.id
            ? { ...threat, followUpSent: true }
            : threat
        ),
      },
    };
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
      const targetDeficit = newMessage.threatTargetDeficit_bn ?? 50;
      const deadlineTurn = newMessage.threatDeadlineTurn ?? (state.metadata.currentTurn + 3);
      const newDemand = {
        category: newMessage.demandCategory,
        description: newMessage.demandDetails,
        deadline: deadlineTurn,
        met: false,
      };
      updatedPMRelationship.activeDemands = [...updatedPMRelationship.activeDemands, newDemand];

      if (newMessage.demandCategory === 'deficit') {
        updatedPMRelationship.activeThreats = [
          ...(updatedPMRelationship.activeThreats || []),
          {
            id: `threat_${state.metadata.currentTurn}_${Date.now()}`,
            category: 'deficit',
            createdTurn: state.metadata.currentTurn,
            deadlineTurn,
            baselineDeficit_bn: newMessage.threatBaselineDeficit_bn ?? state.fiscal.deficit_bn,
            targetDeficit_bn: targetDeficit,
            breached: false,
            resolved: false,
            followUpSent: false,
          },
        ];
      }
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
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthLabel = monthNames[state.metadata.currentMonth - 1] || 'Unknown';
  const previousSnapshot = state.simulation.monthlySnapshots?.[state.simulation.monthlySnapshots.length - 1];
  const previousYield = typeof previousSnapshot?.giltYield === 'number'
    ? previousSnapshot.giltYield
    : state.markets.giltYield10y;
  const gdpGrowthMonthly = typeof state.economic.gdpGrowthMonthly === 'number'
    ? state.economic.gdpGrowthMonthly
    : state.economic.gdpGrowthAnnual / 12;
  const gdpGrowthQuarterly = (Math.pow(1 + gdpGrowthMonthly / 100, 3) - 1) * 100;
  const recentNewspapers = [
    ...(state.events.eventLog || [])
      .map((entry: any) => entry?.newsArticle)
      .filter((article: any) => !!article),
    ...(state.events.currentNewspaper ? [state.events.currentNewspaper] : []),
  ].slice(-18);

  // Sector-specific sustained-cut tracking and strike/revolt triggers.
  const monthsElapsed = state.metadata.currentTurn;
  const inflationFactor = 1 + state.economic.inflationCPI / 100;
  const nhsBaselineReal = 168.4 * Math.pow(1 + 3.5 / 100, monthsElapsed / 12);
  const educationBaselineReal = 104.0 * Math.pow(1 + 2.0 / 100, monthsElapsed / 12);
  const nhsRealGrowth = ((state.fiscal.spending.nhsCurrent / inflationFactor) - nhsBaselineReal) / nhsBaselineReal * 100;
  const educationRealGrowth = ((state.fiscal.spending.educationCurrent / inflationFactor) - educationBaselineReal) / educationBaselineReal * 100;
  const welfareCut = state.fiscal.spending.welfare < 290 * 0.95;

  const strikeTriggerMultiplier = Math.max(0.5, state.services.strikeTriggerThresholdMultiplier || 1);
  const strikeCutThreshold = Math.max(1, Math.round(2 * strikeTriggerMultiplier));
  const nextServices = {
    ...state.services,
    consecutiveNHSCutMonths: nhsRealGrowth < -2 ? (state.services.consecutiveNHSCutMonths || 0) + 1 : 0,
    consecutiveEducationCutMonths: educationRealGrowth < -2 ? (state.services.consecutiveEducationCutMonths || 0) + 1 : 0,
    consecutivePensionCutMonths: welfareCut ? (state.services.consecutivePensionCutMonths || 0) + 1 : 0,
  };

  let sectorEvent: RandomEvent | null = null;
  const hasPendingSectorEvent = (state.events.pendingEvents || []).some((event: any) =>
    String(event?.id || '').startsWith('sector_')
  );

  if (!hasPendingSectorEvent) {
    if ((nextServices.consecutivePensionCutMonths >= 2) && (nextServices.pensionerRevoltCooldown || 0) === 0) {
      const floor = Math.max(state.fiscal.pmPensionFloor_bn || 0, 130);
      sectorEvent = {
        id: `sector_pension_${state.metadata.currentTurn}`,
        type: 'political_crisis',
        severity: 'major',
        month: state.metadata.currentTurn,
        date: new Date(state.metadata.currentYear, state.metadata.currentMonth - 1, 1),
        title: 'Pensioner revolt',
        description: 'Pensioner groups have mobilised against real-terms pension pressure and are demanding a guaranteed minimum pension commitment.',
        immediateImpact: { approvalRating: -3, pmTrust: -1 },
        requiresResponse: false,
      };
      nextServices.pensionerRevoltCooldown = 12;
      const pensionHit = 2 + Math.random() * 2;
      const backbenchHit = 3;
      return {
        ...state,
        services: nextServices,
        fiscal: {
          ...state.fiscal,
          pmPensionFloor_bn: floor,
        },
        political: {
          ...state.political,
          governmentApproval: Math.max(10, state.political.governmentApproval - pensionHit),
          backbenchSatisfaction: Math.max(10, state.political.backbenchSatisfaction - backbenchHit),
        },
        events: {
          ...state.events,
          pendingEvents: [...(state.events.pendingEvents || []), sectorEvent],
        },
      };
    }

    if (
      nextServices.consecutiveNHSCutMonths >= strikeCutThreshold &&
      state.services.nhsQuality < 55 &&
      (nextServices.nhsStrikeCooldown || 0) === 0
    ) {
      const duration = 2 + Math.floor(Math.random() * 3);
      nextServices.nhsStrikeMonthsRemaining = duration;
      nextServices.nhsStrikeCooldown = 12;
      sectorEvent = {
        id: `sector_nhs_${state.metadata.currentTurn}`,
        type: 'industrial_action',
        severity: 'major',
        month: state.metadata.currentTurn,
        date: new Date(state.metadata.currentYear, state.metadata.currentMonth - 1, 1),
        title: 'NHS strike action',
        description: 'Junior doctors and nursing staff have launched strike action over pay and workload pressure.',
        immediateImpact: { approvalRating: -1.5 },
        requiresResponse: true,
        responseOptions: [
          {
            label: 'Meet pay demands',
            description: 'Fund a settlement and end industrial action immediately.',
            politicalCost: 4,
            economicImpact: { approvalRating: 1.2 },
            fiscalCost: 3.0,
          },
          {
            label: 'Stall',
            description: 'Delay agreement and keep negotiations open while strikes continue.',
            politicalCost: 2,
            economicImpact: { approvalRating: -1.0 },
            fiscalCost: 0,
          },
          {
            label: 'Legislate against strike',
            description: 'Use emergency legislation to halt strike action at significant political cost.',
            politicalCost: 18,
            economicImpact: { approvalRating: -5, pmTrust: -8 },
            fiscalCost: 0,
          },
        ],
      };
    } else if (
      nextServices.consecutiveEducationCutMonths >= strikeCutThreshold &&
      state.services.educationQuality < 60 &&
      (nextServices.teacherStrikeCooldown || 0) === 0
    ) {
      const duration = 2 + Math.floor(Math.random() * 3);
      nextServices.educationStrikeMonthsRemaining = duration;
      nextServices.teacherStrikeCooldown = 12;
      sectorEvent = {
        id: `sector_teacher_${state.metadata.currentTurn}`,
        type: 'industrial_action',
        severity: 'major',
        month: state.metadata.currentTurn,
        date: new Date(state.metadata.currentYear, state.metadata.currentMonth - 1, 1),
        title: 'Teacher strike action',
        description: 'Teacher unions have announced coordinated strike action over real-terms pay erosion.',
        immediateImpact: { approvalRating: -1.5 },
        requiresResponse: true,
        responseOptions: [
          {
            label: 'Meet pay demands',
            description: 'Fund a settlement and return schools to normal operation.',
            politicalCost: 4,
            economicImpact: { approvalRating: 1.2 },
            fiscalCost: 2.5,
          },
          {
            label: 'Stall',
            description: 'Delay settlement and continue talks while disruption persists.',
            politicalCost: 2,
            economicImpact: { approvalRating: -1.0 },
            fiscalCost: 0,
          },
          {
            label: 'Legislate against strike',
            description: 'Force a return to work and accept major political fallout.',
            politicalCost: 18,
            economicImpact: { approvalRating: -5, pmTrust: -8 },
            fiscalCost: 0,
          },
        ],
      };
    }
  }

  // Build a state object compatible with events-media.tsx's expectations
  const eventsState = {
    currentMonth: state.metadata.currentTurn,
    currentDate: new Date(state.metadata.currentYear, state.metadata.currentMonth - 1, 1),
    economy: {
      gdpGrowthAnnual: state.economic.gdpGrowthAnnual,
      gdpGrowthQuarterly,
      gdpGrowthMonthly,
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
      nhsQuality: nextServices.nhsQuality,
      educationQuality: nextServices.educationQuality,
      infrastructureQuality: nextServices.infrastructureQuality,
      mentalHealthAccess: nextServices.mentalHealthAccess,
      primaryCareAccess: nextServices.primaryCareAccess,
      socialCareQuality: nextServices.socialCareQuality,
      prisonSafety: nextServices.prisonSafety,
      courtBacklogPerformance: nextServices.courtBacklogPerformance,
      legalAidAccess: nextServices.legalAidAccess,
      policingEffectiveness: nextServices.policingEffectiveness,
      borderSecurityPerformance: nextServices.borderSecurityPerformance,
      railReliability: nextServices.railReliability,
      affordableHousingDelivery: nextServices.affordableHousingDelivery,
      floodResilience: nextServices.floodResilience,
      researchInnovationOutput: nextServices.researchInnovationOutput,
    },
    externalSector: {
      shockActive: state.externalSector.externalShockActive,
      shockType: state.externalSector.externalShockType,
      tradeFrictionIndex: state.externalSector.tradeFrictionIndex,
      currentAccountGDP: state.externalSector.currentAccountGDP,
    },
    parliamentary: {
      activeInquiries: state.parliamentary.selectCommittees.filter((c) => c.isInquiryActive).map((c) => c.id),
      lordsDelayActive: state.parliamentary.lordsDelayActive,
    },
    devolution: state.devolution,
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
  let updatedState = {
    ...state,
    services: nextServices,
  };
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

  const allPendingEvents = sectorEvent
    ? [...existingPendingEvents, sectorEvent, ...responseEvents]
    : [...existingPendingEvents, ...responseEvents];

  let currentNewspaper = newspaper;
  if (sectorEvent) {
    const headlineTokens = sectorEvent.id.startsWith('sector_nhs_')
      ? { sector: 'NHS strike', payDemand: 'a fair NHS pay settlement', month: monthLabel }
      : sectorEvent.id.startsWith('sector_teacher_')
        ? { sector: 'Teacher strike', payDemand: 'an inflation-linked pay deal', month: monthLabel }
        : { sector: 'Pensioner', payDemand: 'a guaranteed pension floor', month: monthLabel };
    const revoltType = sectorEvent.id.startsWith('sector_nhs_')
      ? 'nhs_strike'
      : sectorEvent.id.startsWith('sector_teacher_')
        ? 'teacher_strike'
        : 'pensioner_revolt';
    const rendered = renderSectorHeadline(revoltType as any, headlineTokens);
    currentNewspaper = {
      newspaper: {
        name: 'The Times',
        bias: 'centre-right',
        style: 'broadsheet',
        priorities: ['stability', 'competence', 'establishment', 'credibility'],
      },
      headline: rendered.headline,
      subheading: rendered.subheading,
      paragraphs: [
        sectorEvent.description,
        'No.10 signalled that the Prime Minister expects a credible resolution and clear medium-term funding plan.',
      ],
      oppositionQuote: {
        speaker: 'Shadow Chancellor',
        quote: 'This disruption is the direct result of avoidable Treasury choices.',
        party: 'Conservative',
      },
      month: state.metadata.currentMonth,
      date: new Date(state.metadata.currentYear, state.metadata.currentMonth - 1, 1),
      isSpecialEdition: true,
    };
  }

  const mpcDecision = state.markets.lastMPCDecision || 'hold';
  const mpcQuote = mpcDecision === 'hike'
    ? 'We remain focused on returning inflation sustainably to target.'
    : mpcDecision === 'cut'
      ? 'Disinflation is progressing and policy can begin to normalise carefully.'
      : 'Policy must stay restrictive until inflation persistence eases further.';
  const mpcBrief = `Bank of England ${mpcDecision}s Bank Rate at ${state.markets.bankRate.toFixed(2)}% (${state.markets.lastMPCVoteBreakdown || 'vote pending'}). Andrew Bailey: "${mpcQuote}"`;
  if (currentNewspaper) {
    currentNewspaper = {
      ...currentNewspaper,
      paragraphs: [
        ...currentNewspaper.paragraphs,
        '--- Institutional Briefings ---',
        mpcBrief,
        `OBR monitoring note: fiscal headroom currently £${state.fiscal.fiscalHeadroom_bn.toFixed(1)}bn under ${getFiscalRuleById(state.political.chosenFiscalRule).name}.`,
      ],
      headline: mpcDecision === 'hold' ? currentNewspaper.headline : `MPC ${mpcDecision === 'hike' ? 'raises' : 'cuts'} Bank Rate`,
      subheading: mpcDecision === 'hold' ? currentNewspaper.subheading : `${state.markets.lastMPCVoteBreakdown || 'MPC vote recorded'} as markets reassess the UK policy mix.`,
      isSpecialEdition: mpcDecision === 'hold' ? currentNewspaper.isSpecialEdition : true,
    };
  }

  return {
    ...updatedState,
    events: {
      ...updatedState.events,
      pendingEvents: allPendingEvents,
      eventLog: newEventLog,
      currentNewspaper,
    },
  };
}

function applyEventImpact(state: GameState, impact: any): GameState {
  let newState = { ...state };

  if (impact.gdpGrowth) {
    const currentMonthly = typeof newState.economic.gdpGrowthMonthly === 'number'
      ? newState.economic.gdpGrowthMonthly
      : newState.economic.gdpGrowthAnnual / 12;
    const newMonthly = currentMonthly + impact.gdpGrowth;
    const newAnnual = (Math.pow(1 + newMonthly / 100, 12) - 1) * 100;
    newState = {
      ...newState,
      economic: {
        ...newState.economic,
        gdpGrowthMonthly: newMonthly,
        gdpGrowthAnnual: newAnnual,
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
    gdpNominal: Math.round(state.economic.gdpNominal_bn),
    inflation: state.economic.inflationCPI,
    unemployment: state.economic.unemploymentRate,
    deficit: state.fiscal.deficitPctGDP,
    debt: state.fiscal.debtPctGDP,
    approval: state.political.governmentApproval,
    giltYield: state.markets.giltYield10y,
    productivity: state.economic.productivityGrowthAnnual,
  };

  return {
    ...state,
    simulation: {
      ...state.simulation,
      monthlySnapshots: [...state.simulation.monthlySnapshots, snapshot],
    },
  };
}

function processPolicyRiskModifiers(state: GameState): GameState {
  const current = Array.isArray(state.policyRiskModifiers) ? state.policyRiskModifiers : [];
  if (current.length === 0) return state;

  const updated = current
    .map((modifier) => ({
      ...modifier,
      turnsRemaining: Math.max(0, modifier.turnsRemaining - 1),
    }))
    .filter((modifier) => modifier.turnsRemaining > 0);

  const strikeThreshold = updated.reduce((acc, modifier) => {
    if (modifier.strikeThresholdMultiplier !== undefined) {
      return Math.min(acc, modifier.strikeThresholdMultiplier);
    }
    return acc;
  }, 1);

  return {
    ...state,
    policyRiskModifiers: updated,
    services: {
      ...state.services,
      nhsStrikeMonthsRemaining: Math.max(0, (state.services.nhsStrikeMonthsRemaining || 0) - 1),
      educationStrikeMonthsRemaining: Math.max(0, (state.services.educationStrikeMonthsRemaining || 0) - 1),
      pensionerRevoltCooldown: Math.max(0, (state.services.pensionerRevoltCooldown || 0) - 1),
      nhsStrikeCooldown: Math.max(0, (state.services.nhsStrikeCooldown || 0) - 1),
      teacherStrikeCooldown: Math.max(0, (state.services.teacherStrikeCooldown || 0) - 1),
      strikeTriggerThresholdMultiplier: strikeThreshold,
    },
  };
}

function buildOBRProjection(state: GameState): OBRForecastSnapshot {
  const baseGrowth = state.economic.gdpGrowthAnnual;
  const baseDeficit = state.fiscal.deficitPctGDP;
  const baseDebt = state.fiscal.debtPctGDP;

  const horizonYears: OBRForecastYear[] = [];
  for (let yearAhead = 1; yearAhead <= 5; yearAhead++) {
    const growth = baseGrowth + (1.5 - baseGrowth) * Math.min(1, yearAhead / 3);
    const deficit = baseDeficit + (2.5 - baseDeficit) * Math.min(1, yearAhead / 4);
    const debt = baseDebt + (deficit - 2.0) * 0.35 * yearAhead;

    horizonYears.push({
      fiscalYearStartTurn: state.metadata.currentTurn + yearAhead * 12,
      projectedGDPGrowth: growth,
      projectedDeficitPctGDP: deficit,
      projectedDebtPctGDP: debt,
    });
  }

  return {
    createdTurn: state.metadata.currentTurn,
    createdFiscalYear: state.metadata.currentYear,
    horizonYears,
  };
}

function compareLastFiscalYearToForecast(state: GameState): OBRForecastComparison | null {
  const snapshot = state.simulation.obrForecastSnapshot;
  if (!snapshot || snapshot.horizonYears.length === 0) return null;

  const startTurn = state.metadata.currentTurn - 12;
  const fiscalYearData = state.simulation.monthlySnapshots.filter(
    (row) => row.turn >= startTurn && row.turn < state.metadata.currentTurn
  );
  if (fiscalYearData.length === 0) return null;

  const actualGDPGrowth =
    fiscalYearData.reduce((sum, row) => sum + row.gdpGrowth, 0) / fiscalYearData.length;
  const actualDeficit =
    fiscalYearData.reduce((sum, row) => sum + row.deficit, 0) / fiscalYearData.length;
  const actualDebt = fiscalYearData[fiscalYearData.length - 1].debt;

  const baseProjection = snapshot.horizonYears[0];
  const rows: OBRForecastComparison['rows'] = [
    {
      metric: 'gdpGrowth',
      projected: baseProjection.projectedGDPGrowth,
      actual: actualGDPGrowth,
      delta: actualGDPGrowth - baseProjection.projectedGDPGrowth,
    },
    {
      metric: 'deficitPctGDP',
      projected: baseProjection.projectedDeficitPctGDP,
      actual: actualDeficit,
      delta: actualDeficit - baseProjection.projectedDeficitPctGDP,
    },
    {
      metric: 'debtPctGDP',
      projected: baseProjection.projectedDebtPctGDP,
      actual: actualDebt,
      delta: actualDebt - baseProjection.projectedDebtPctGDP,
    },
  ];

  return {
    fiscalYear: state.metadata.currentYear - 1,
    rows,
  };
}

function processOBRForecasting(state: GameState): GameState {
  if (state.metadata.currentMonth !== 4) return state;

  const comparison = compareLastFiscalYearToForecast(state);
  let credibilityDelta = 0;

  if (comparison) {
    const deficitRow = comparison.rows.find((row) => row.metric === 'deficitPctGDP');
    const deficitError = Math.abs(deficitRow?.delta || 0);
    if (deficitError > 1.5) {
      credibilityDelta = -Math.min(8, 3 + (deficitError - 1.5) * 2.5);
    } else if (deficitError < 0.5) {
      credibilityDelta = 2;
    }
  }

  const nextSnapshot = buildOBRProjection(state);
  return {
    ...state,
    simulation: {
      ...state.simulation,
      obrForecastSnapshot: nextSnapshot,
      lastObrComparison: comparison,
    },
    political: {
      ...state.political,
      credibilityIndex: Math.max(0, Math.min(100, state.political.credibilityIndex + credibilityDelta)),
    },
  };
}

function captureTurnDelta(state: GameState, previousState: GameState): GameState {
  const approvalDrivers: TurnDeltaDriver[] = [
    { name: 'NHS quality', value: (state.services.nhsQuality - previousState.services.nhsQuality) * 0.12 },
    { name: 'Unemployment gap', value: (previousState.economic.unemploymentRate - state.economic.unemploymentRate) * 0.6 },
    { name: 'Inflation pressure', value: (previousState.economic.inflationCPI - state.economic.inflationCPI) * 0.5 },
    { name: 'Manifesto penalty', value: (previousState.manifesto.totalViolations - state.manifesto.totalViolations) * 1.2 },
    { name: 'Real wages', value: ((state.economic.wageGrowthAnnual - state.economic.inflationCPI) - (previousState.economic.wageGrowthAnnual - previousState.economic.inflationCPI)) * 0.4 },
  ];
  const sortedApproval = [...approvalDrivers].sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  const approvalPositive = sortedApproval.filter((item) => item.value > 0).slice(0, 3).map((item) => ({ ...item, value: round1(item.value) }));
  const approvalNegative = sortedApproval.filter((item) => item.value < 0).slice(0, 3).map((item) => ({ ...item, value: round1(item.value) }));

  const giltDrivers: TurnDeltaDriver[] = [
    { name: 'Debt premium', value: Math.max(0, state.fiscal.debtPctGDP - 90) * 0.02 - Math.max(0, previousState.fiscal.debtPctGDP - 90) * 0.02 },
    { name: 'Deficit premium', value: Math.max(0, state.fiscal.deficitPctGDP - 3) * 0.15 - Math.max(0, previousState.fiscal.deficitPctGDP - 3) * 0.15 },
    { name: 'Credibility', value: (previousState.political.credibilityIndex - state.political.credibilityIndex) * 0.008 },
  ].map((item) => ({ ...item, value: round1(item.value) }));

  const deficitDrivers: TurnDeltaDriver[] = [
    { name: 'Revenue delta', value: round1(state.fiscal.totalRevenue_bn - previousState.fiscal.totalRevenue_bn) },
    { name: 'Spending delta', value: round1(-(state.fiscal.totalSpending_bn - previousState.fiscal.totalSpending_bn)) },
    { name: 'Interest delta', value: round1(-(state.fiscal.debtInterest_bn - previousState.fiscal.debtInterest_bn)) },
  ];
  if (state.spendingReview?.lastDeliveryRiskEvents?.length) {
    const label = `DEL risk: ${state.spendingReview.lastDeliveryRiskEvents[0]}`;
    deficitDrivers.push({ name: label, value: 0 });
  }

  const lastTurnDelta: TurnDelta = {
    approvalChange: round1(state.political.governmentApproval - previousState.political.governmentApproval),
    approvalDriversPositive: approvalPositive,
    approvalDriversNegative: approvalNegative,
    giltYieldChange: round1(state.markets.giltYield10y - previousState.markets.giltYield10y),
    giltYieldDrivers: giltDrivers,
    deficitChange: round1(state.fiscal.deficit_bn - previousState.fiscal.deficit_bn),
    deficitDrivers,
  };

  return {
    ...state,
    simulation: {
      ...state.simulation,
      lastTurnDelta,
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
