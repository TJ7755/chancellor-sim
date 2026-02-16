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

const BASELINE_DEPARTMENTAL_SPENDING = getDepartmentalSpendingTotal(createInitialFiscalState().spending);

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

  // Base trend growth (monthly)
  let monthlyGrowthRate = 0.125; // 1.5% annual = ~0.125% monthly

  // Fiscal multiplier effect (spending change from baseline)
  const departmentalSpending = getDepartmentalSpendingTotal(fiscal.spending);
  const spendingChange = departmentalSpending - BASELINE_DEPARTMENTAL_SPENDING;
  const spendingMultiplier = 0.003; // per £bn change
  const fiscalImpact = spendingChange * spendingMultiplier;

  // Tax drag (higher taxes reduce growth)
  const baselineRevenue = 1078;
  const revenueChange = fiscal.totalRevenue_bn - baselineRevenue;
  const taxDrag = revenueChange * -0.002;

  // Monetary conditions (higher yields tighten)
  const yieldEffect = (markets.giltYield10y - 4.15) * -0.02;

  // Sterling effect (appreciation hurts exports)
  const sterlingEffect = (markets.sterlingIndex - 100) * -0.001;

  // Infrastructure quality (long-term supply side)
  const servicesEffect = (state.services.infrastructureQuality - 58) * 0.003;

  // Combine effects
  monthlyGrowthRate += fiscalImpact + taxDrag + yieldEffect + sterlingEffect + servicesEffect;

  // Business cycle randomness
  const randomShock = (Math.random() - 0.5) * 0.15;
  monthlyGrowthRate += randomShock;

  // Clamp monthly growth to realistic range (-2% to 2% monthly)
  monthlyGrowthRate = Math.max(-2.0, Math.min(2.0, monthlyGrowthRate));

  // Calculate new GDP
  const newGDP = economic.gdpNominal_bn * (1 + monthlyGrowthRate / 100);

  // Annualise via compounding: (1 + monthly/100)^12 - 1
  const annualGrowth = (Math.pow(1 + monthlyGrowthRate / 100, 12) - 1) * 100;

  return {
    ...state,
    economic: {
      ...economic,
      gdpGrowthMonthly: monthlyGrowthRate,
      gdpGrowthAnnual: annualGrowth,
      gdpNominal_bn: newGDP,
    },
  };
}

// ===========================
// Step 2: Employment
// ===========================

function calculateEmployment(state: GameState): GameState {
  const { economic } = state;

  // Okun's Law: GDP growth affects unemployment (with lag)
  // 1pp below trend growth -> 0.4pp higher unemployment
  const trendGrowth = 1.5;
  const growthGap = economic.gdpGrowthAnnual - trendGrowth;
  const okunsCoefficient = -0.4;
  const unemploymentPressure = growthGap * okunsCoefficient;

  // Gradual adjustment (labour market has inertia)
  let newUnemployment = economic.unemploymentRate + unemploymentPressure / 12;

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

  // Hybrid Phillips Curve
  const nairu = 4.25;
  const unemploymentGap = nairu - economic.unemploymentRate;

  // Persistence (40%): inflation has inertia
  const persistence = economic.inflationCPI * 0.4;

  // Expectations anchor (35%): drift towards 2% target
  const expectations = 2.0 * 0.35;

  // Domestic pressure (15%): Phillips curve
  const domesticPressure = (2.0 + unemploymentGap * 0.5) * 0.15;

  // Import prices (10%): sterling effect
  const sterlingChange = (100 - markets.sterlingIndex) / 100;
  const importPressure = (2.0 + sterlingChange * 3.0) * 0.10;

  // VAT pass-through (one-off level effect spread over months)
  const vatChange = fiscal.vatRate - 20;
  const vatEffect = vatChange * 0.04; // Spread effect

  // Wage-price spiral component
  const realWageGap = economic.wageGrowthAnnual - economic.inflationCPI;
  const wagePressure = realWageGap > 2.0 ? (realWageGap - 2.0) * 0.1 : 0;

  let inflation = persistence + expectations + domesticPressure + importPressure + vatEffect + wagePressure;

  // Small random component
  const randomShock = (Math.random() - 0.5) * 0.2;
  inflation += randomShock;

  // Clamp
  inflation = Math.max(-1.0, Math.min(15.0, inflation));

  return {
    ...state,
    economic: {
      ...economic,
      inflationCPI: inflation,
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

  // Taylor rule
  const neutralRate = 2.5;
  const inflationGap = economic.inflationCPI - 2.0;
  const outputGap = economic.gdpGrowthAnnual - 1.5;

  const taylorRate = neutralRate + 1.5 * inflationGap + 0.5 * outputGap;

  // Bank Rate adjusts gradually (inertia)
  const currentRate = markets.bankRate;
  const targetAdjustment = (taylorRate - currentRate) * 0.12; // 12% adjustment per month

  let newRate = currentRate + targetAdjustment;

  // Clamp to realistic range
  newRate = Math.max(0.1, Math.min(15.0, newRate));

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
  const incomeTaxRevenue = (incomeTaxBase + incomeTaxRateEffect) * Math.pow(nominalGDPRatio, 1.1);

  // National Insurance (elasticity 1.0)
  // Employee NI + Employer NI combined
  const niBase = 164;
  const niEmployeeRateEffect = (fiscal.nationalInsuranceRate - 8) * 6.0;
  const niEmployerRateEffect = (fiscal.employerNIRate - 13.8) * 8.5;
  const niRevenue = (niBase + niEmployeeRateEffect + niEmployerRateEffect) * Math.pow(nominalGDPRatio, 1.0);

  // VAT (elasticity 1.0 to consumption)
  const vatBase = 171;
  const vatRateEffect = (fiscal.vatRate - 20) * 7.5;
  const vatRevenue = (vatBase + vatRateEffect) * Math.pow(nominalGDPRatio, 1.0);

  // Corporation Tax (elasticity 1.3, volatile)
  const corpTaxBase = 88;
  const corpTaxRateEffect = (fiscal.corporationTaxRate - 25) * 3.2;
  const corpTaxRevenue = (corpTaxBase + corpTaxRateEffect) * Math.pow(nominalGDPRatio, 1.3);

  // Other taxes (elasticity 0.8)
  const otherRevenue = 386 * Math.pow(nominalGDPRatio, 0.8);

  // Revenue adjustment from budget system reckoners (CGT, IHT, excise duties, reliefs, etc.)
  const revenueAdj = fiscal.revenueAdjustment_bn || 0;

  const totalRevenueAnnual = incomeTaxRevenue + niRevenue + vatRevenue + corpTaxRevenue + otherRevenue + revenueAdj;

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
  const { fiscal, markets } = state;

  // Calculate debt interest separately - do NOT add to totalSpending_bn
  // totalSpending_bn tracks departmental spending only
  // Deficit calculation will add debt interest
  const debtStock = fiscal.debtNominal_bn;

  // Average effective interest rate (mix of old and new debt)
  // Old debt is at historical rates, new issuance at current yields
  // Assume ~5% of debt rolls over per month at current rates
  const rolloverFraction = 0.05;
  const oldEffectiveRate = 3.5; // Historical average coupon
  const newIssuanceRate = markets.giltYield10y;
  const blendedRate = oldEffectiveRate * (1 - rolloverFraction) + newIssuanceRate * rolloverFraction;

  // Gradually update effective rate
  const prevEffectiveRate = fiscal.debtInterest_bn > 0 ? (fiscal.debtInterest_bn / debtStock) * 100 : 3.5;
  const effectiveRate = prevEffectiveRate + (blendedRate - prevEffectiveRate) * 0.05;

  const debtInterest = (debtStock * effectiveRate) / 100;

  // Recalculate total departmental spending from breakdown
  const departmentalSpending = getDepartmentalSpendingTotal(fiscal.spending);

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
      credibilityIndex: Math.max(0, Math.min(100,
        political.credibilityIndex + credibilityChange)),
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

  // Gilt yields respond to Bank Rate, fiscal position, credibility

  const baseYield = markets.bankRate + 0.3; // Term premium

  // Fiscal risk premium (non-linear: rises faster above 100% debt/GDP)
  const debtRatio = fiscal.debtPctGDP;
  let debtPremium = 0;
  if (debtRatio > 80) {
    debtPremium = (debtRatio - 80) * 0.01;
  }
  if (debtRatio > 100) {
    debtPremium += (debtRatio - 100) * 0.03; // Accelerates above 100%
  }

  // Deficit premium
  const deficitPremium = Math.max(0, (fiscal.deficitPctGDP - 3) * 0.1);

  // Credibility discount (lower credibility = higher yields)
  const credibilityDiscount = (political.credibilityIndex - 50) * -0.008;

  // Credit rating effect
  const creditRatingPremium = getCreditRatingPremium(political.creditRating);

  const newYield10y = baseYield + debtPremium + deficitPremium + credibilityDiscount + creditRatingPremium;

  // Sterling responds to relative yields and political confidence
  const yieldDifferential = newYield10y - 4.0; // vs. global benchmark
  const yieldSterlingEffect = yieldDifferential * 1.5;
  const confidenceEffect = (political.governmentApproval - 40) * 0.15;

  let newSterlingIndex = 100 + yieldSterlingEffect + confidenceEffect;
  newSterlingIndex = Math.max(70, Math.min(130, newSterlingIndex));

  // Gradual adjustment (markets don't jump instantly under normal conditions)
  const prevYield = markets.giltYield10y;
  const smoothedYield = prevYield + (newYield10y - prevYield) * 0.3;

  const prevSterling = markets.sterlingIndex;
  const smoothedSterling = prevSterling + (newSterlingIndex - prevSterling) * 0.3;

  // Mortgage rates follow yields with spread
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
  if (nhsRealGrowth > 0) {
    nhsQuality += 0.5; // Keeping pace with or exceeding demand
  } else if (nhsRealGrowth > -1.5) {
    nhsQuality += 0.1; // Roughly maintaining
  } else if (nhsRealGrowth > -3.5) {
    nhsQuality -= 0.3; // Deteriorating
  } else {
    nhsQuality -= 0.8; // Crisis - real cuts vs demand
  }

  // Education quality
  // Demand grows ~2% annually; scale thresholds by cumulative demand growth
  const eduDemandGrowth = 2.0;
  const eduDemandMultiplier = Math.pow(1 + eduDemandGrowth / 100, monthsElapsed / 12);
  const eduSpending = fiscal.spending.education;
  const eduSpendingReal = eduSpending / (1 + economic.inflationCPI / 100);
  let eduQuality = services.educationQuality;
  if (eduSpendingReal > 125 * eduDemandMultiplier) {
    eduQuality += 0.3;
  } else if (eduSpendingReal > 116 * eduDemandMultiplier) {
    eduQuality += 0.1;
  } else if (eduSpendingReal > 110 * eduDemandMultiplier) {
    eduQuality -= 0.1;
  } else {
    eduQuality -= 0.4;
  }

  // Infrastructure quality (responds to capital spending with lag)
  // Demand grows ~2% annually; thresholds are nominal, so also scale by inflation
  const infraDemandGrowth = 2.0;
  const infraDemandMultiplier = Math.pow(1 + infraDemandGrowth / 100, monthsElapsed / 12);
  const infraInflationMultiplier = Math.pow(1 + economic.inflationCPI / 100, monthsElapsed / 12);
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

  // Clamp to 0-100
  nhsQuality = Math.max(0, Math.min(100, nhsQuality));
  eduQuality = Math.max(0, Math.min(100, eduQuality));
  infraQuality = Math.max(0, Math.min(100, infraQuality));

  return {
    ...state,
    services: {
      nhsQuality,
      educationQuality: eduQuality,
      infrastructureQuality: infraQuality,
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

  // Economic performance effects (dampened - monthly changes should be small)
  const gdpEffect = (economic.gdpGrowthAnnual - 1.5) * 0.3;
  const unemploymentEffect = (4.2 - economic.unemploymentRate) * 0.4;
  const inflationEffect = (2.5 - economic.inflationCPI) * 0.3;
  const realWageEffect = (economic.wageGrowthAnnual - economic.inflationCPI) * 0.3;

  // Services effect (NHS dominates)
  const nhsEffect = (services.nhsQuality - 62) * 0.08;
  const educationEffect = (services.educationQuality - 68) * 0.03;

  // Fiscal responsibility perception
  const deficitEffect = fiscal.deficitPctGDP > 5 ? -1 : fiscal.deficitPctGDP < 3 ? 0.5 : 0;

  // Manifesto violations (persistent penalty)
  const manifestoEffect = -manifesto.totalViolations * 0.5;

  // Honeymoon decay (first 12 months)
  const honeymoonDecay = state.metadata.currentTurn < 12 ? -0.5 : 0;

  // Social media impact (minor influence)
  const socialMediaSentiment = calculateSocialMediaSentiment(state);
  const socialMediaEffect = calculateSocialMediaImpact(socialMediaSentiment);

  // Random noise
  const randomEffect = (Math.random() - 0.5) * 1.5;

  // Combine (monthly change, heavily dampened)
  const totalChange = (gdpEffect + unemploymentEffect + inflationEffect + realWageEffect +
                      nhsEffect + educationEffect + deficitEffect + manifestoEffect +
                      honeymoonDecay + socialMediaEffect + randomEffect) * 0.08;

  approval += totalChange;

  // Clamp
  approval = Math.max(15, Math.min(70, approval));

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

  let satisfaction = political.backbenchSatisfaction;

  // Approval matters most for marginal seat MPs
  const approvalEffect = (political.governmentApproval - 38) * 0.15;

  // Fiscal responsibility matters (all MPs hate looking reckless)
  const deficitEffect = fiscal.deficitPctGDP > 5 ? -0.5 : fiscal.deficitPctGDP < 3 ? 0.2 : 0;

  // Manifesto breaches anger all MPs
  const manifestoEffect = -manifesto.totalViolations * 0.8;

  // PM trust trickle-down (if PM is happy, backbenchers relax)
  const pmEffect = (political.pmTrust - 50) * 0.05;

  // Strike risk unsettles MPs
  const strikeEffect = political.strikeRisk > 50 ? -0.3 : 0;

  // Social media impact (MPs are sensitive to negative sentiment in constituencies)
  const socialMediaSentiment = calculateSocialMediaSentiment(state);
  const socialMediaEffectOnMPs = calculateSocialMediaImpact(socialMediaSentiment) * 0.7; // Slightly less than public approval

  const totalChange = (approvalEffect + deficitEffect + manifestoEffect + pmEffect + strikeEffect + socialMediaEffectOnMPs) * 0.12;

  satisfaction += totalChange;

  // Natural drift towards 60 (baseline)
  satisfaction += (60 - satisfaction) * 0.02;

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
    manifestoViolations
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

  let pmTrust = political.pmTrust;

  // Government approval effect
  const approvalEffect = (political.governmentApproval - 40) * 0.1;

  // Manifesto adherence (PM cares deeply about manifesto)
  const manifestoEffect = -manifesto.totalViolations * 1.0;

  // Fiscal credibility
  const fiscalEffect = fiscal.deficitPctGDP > 5 ? -0.5 : fiscal.deficitPctGDP < 3 ? 0.3 : 0;

  // Market confidence (gilt crisis destroys PM trust)
  const marketEffect = markets.giltYield10y > 6 ? -1.0 : markets.giltYield10y > 5 ? -0.3 : 0;

  // Backbench feedback
  const backbenchEffect = (political.backbenchSatisfaction - 50) * 0.08;

  const totalChange = (approvalEffect + manifestoEffect + fiscalEffect + marketEffect + backbenchEffect) * 0.1;

  pmTrust += totalChange;

  // Natural drift toward baseline (50)
  pmTrust += (50 - pmTrust) * 0.01;

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

  // Don't trigger if already pending
  if (political.pmInterventionsPending && political.pmInterventionsPending.length > 0) {
    return state;
  }

  // PM only calls if trust is low
  if (political.pmTrust > 40) return state;

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
      sterlingIndex: state.markets.sterlingIndex,
    },
    services: {
      nhsQuality: state.services.nhsQuality,
      educationQuality: state.services.educationQuality,
    },
    emergencyProgrammes: state.emergencyProgrammes,
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

  const newEventLog = [
    ...(updatedState.events.eventLog || []),
    ...resolvedEvents.map(e => ({ event: e, resolved: true })),
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

  // Sacked by PM (trust too low)
  if (political.pmTrust < 15) {
    return {
      ...state,
      metadata: {
        ...metadata,
        gameOver: true,
        gameOverReason: 'The Prime Minister has lost all confidence in your ability to manage the economy. You have been removed from office.',
      },
    };
  }

  // Backbench revolt (very low satisfaction + probabilistic)
  if (political.backbenchSatisfaction < 25 && Math.random() < 0.4) {
    return {
      ...state,
      metadata: {
        ...metadata,
        gameOver: true,
        gameOverReason: 'A backbench revolt has forced your resignation. Your party has lost confidence in your economic management.',
      },
    };
  }

  // Gilt market crisis (yields above 8% = sovereign debt crisis)
  if (markets.giltYield10y > 8.0) {
    return {
      ...state,
      metadata: {
        ...metadata,
        gameOver: true,
        gameOverReason: 'Gilt yields have surged above 8%. The UK faces a sovereign debt crisis. An emergency government has been formed without you.',
      },
    };
  }

  // Debt spiral (debt/GDP above 130%)
  if (fiscal.debtPctGDP > 130) {
    return {
      ...state,
      metadata: {
        ...metadata,
        gameOver: true,
        gameOverReason: 'UK national debt has exceeded 130% of GDP. The IMF has been called in. Your chancellorship is over.',
      },
    };
  }

  return state;
}

export default processTurn;
