// Turn Processor - Orchestrator
// Thin orchestration layer that delegates all simulation logic to step modules.

import { GameState } from './types';
import { getDifficultySettings as getDomainDifficultySettings, DifficultySettings } from './domain/game/difficulty';
import { processPMCommunicationsStep } from './domain/pm/communications-step';
import { getAdviserBonuses, AdviserBonuses } from './domain/turn/shared-helpers';

import { processStepFiscalYear } from './domain/turn/step-fiscal-year';
import { processStepEmergencyProgrammes } from './domain/turn/step-emergency-programmes';
import { processStepPolicyDecay } from './domain/turn/step-policy-decay';
import { processStepProductivity } from './domain/turn/step-productivity';
import { processStepEmployment } from './domain/turn/step-employment';
import { processStepWages } from './domain/turn/step-wages';
import { processStepBankRate } from './domain/turn/step-bank-rate';
import { processStepSpending } from './domain/turn/step-spending';
import { processStepFiscalBalance } from './domain/turn/step-fiscal-balance';
import { processStepFiscalRules } from './domain/turn/step-fiscal-rules';
import { processStepMarkets } from './domain/turn/step-markets';
import { processStepServices } from './domain/turn/step-services';
import { processStepPublicSectorPay } from './domain/turn/step-public-sector-pay';
import { processStepDistributional } from './domain/turn/step-distributional';
import { processStepBackbench } from './domain/turn/step-backbench';
import { processStepMPStances } from './domain/turn/step-mp-stances';
import { processStepPMTrust } from './domain/turn/step-pm-trust';
import { processStepFiscalFramework } from './domain/turn/step-fiscal-framework';
import { processStepPMThreats } from './domain/turn/step-pm-threats';
import { processStepPMIntervention } from './domain/turn/step-pm-intervention';
import { processStepEvents } from './domain/turn/step-events';
import { processStepCreditRating } from './domain/turn/step-credit-rating';
import { processStepSnapshot } from './domain/turn/step-snapshot';
import { processStepOBR } from './domain/turn/step-obr';
import { processStepTurnDelta } from './domain/turn/step-turn-delta';
import { processStepGameOver } from './domain/turn/step-game-over';

import { processParliamentaryMechanics } from './domain/parliament/parliamentary-mechanics';

import { calculateInflation as calculateInflationDomain, InflationInputs } from './domain/economy/inflation';
import { calculateTaxRevenue as calculateTaxRevenueDomain, TaxRevenueInputs } from './domain/fiscal/tax-revenue';

import { getDetailedTaxRate } from './domain/turn/shared-helpers';

type ExtendedDifficultySettings = DifficultySettings & {
  inflationShockScale: number;
  pmTrustSensitivity: number;
  pmInterventionTrustThreshold: number;
  gameOverPMTrust: number;
  gameOverBackbenchThreshold: number;
  gameOverYieldThreshold: number;
  gameOverDebtThreshold: number;
};

function buildExtendedDifficultySettings(mode: string): ExtendedDifficultySettings {
  const domain = getDomainDifficultySettings(mode);
  const thresholds = domain.gameOverThresholds;

  if (mode === 'forgiving') {
    return {
      ...domain,
      inflationShockScale: 0.75,
      pmTrustSensitivity: 0.85,
      pmInterventionTrustThreshold: 35,
      gameOverPMTrust: thresholds.pmTrustMinimum,
      gameOverBackbenchThreshold: thresholds.backbenchSatisfactionMinimum,
      gameOverYieldThreshold: thresholds.giltYieldMaximum,
      gameOverDebtThreshold: thresholds.debtPctGDPMaximum,
    };
  }

  if (mode === 'realistic') {
    return {
      ...domain,
      inflationShockScale: 1.15,
      pmTrustSensitivity: 1.15,
      pmInterventionTrustThreshold: 45,
      gameOverPMTrust: thresholds.pmTrustMinimum,
      gameOverBackbenchThreshold: thresholds.backbenchSatisfactionMinimum,
      gameOverYieldThreshold: thresholds.giltYieldMaximum,
      gameOverDebtThreshold: thresholds.debtPctGDPMaximum,
    };
  }

  return {
    ...domain,
    inflationShockScale: 1.0,
    pmTrustSensitivity: 1.0,
    pmInterventionTrustThreshold: 40,
    gameOverPMTrust: thresholds.pmTrustMinimum,
    gameOverBackbenchThreshold: thresholds.backbenchSatisfactionMinimum,
    gameOverYieldThreshold: thresholds.giltYieldMaximum,
    gameOverDebtThreshold: thresholds.debtPctGDPMaximum,
  };
}

function captureStartOfTurnSnapshot(state: GameState): Partial<GameState> {
  return {
    services: { ...state.services },
    economic: { ...state.economic },
    fiscal: { ...state.fiscal },
    political: { ...state.political },
    markets: { ...state.markets },
    manifesto: { ...state.manifesto },
    spendingReview: state.spendingReview ? { ...state.spendingReview } : undefined,
    obr: { ...state.obr },
    capitalDelivery: { ...state.capitalDelivery },
    legislativePipeline: { ...state.legislativePipeline },
    devolution: { ...state.devolution },
  };
}

export function processTurn(state: GameState): GameState {
  const mode = state.metadata.difficultyMode || 'standard';
  const difficulty = buildExtendedDifficultySettings(mode);

  const startOfTurnSnapshot = captureStartOfTurnSnapshot(state);

  const adviserBonuses: AdviserBonuses = getAdviserBonuses(state);

  const seedPolicyDecay: number[] = Array.from({ length: 20 }, () => Math.random());
  const seedProductivity = Math.random();
  const seedMarkets: number[] = Array.from({ length: 10 }, () => Math.random());
  const seedEvents: number[] = Array.from({ length: 20 }, () => Math.random());
  const seedPMThreats = Math.random();

  let s = state;

  if (!s.simulation.monthlySnapshots || s.simulation.monthlySnapshots.length === 0) {
    const baselineSnapshot = {
      turn: s.metadata.currentTurn,
      date: `${s.metadata.currentYear}-${String(s.metadata.currentMonth).padStart(2, '0')}`,
      gdpGrowth: s.economic.gdpGrowthAnnual,
      gdpNominal: Math.round(s.economic.gdpNominal_bn),
      inflation: s.economic.inflationCPI,
      unemployment: s.economic.unemploymentRate,
      deficit: s.fiscal.deficitPctGDP,
      debt: s.fiscal.debtPctGDP,
      approval: s.political.governmentApproval,
      giltYield: s.markets.giltYield10y,
      productivity: s.economic.productivityGrowthAnnual,
    };

    s = {
      ...s,
      simulation: {
        ...s.simulation,
        monthlySnapshots: [baselineSnapshot],
      },
    };
  }

  s = processStepFiscalYear(s);
  s = processStepEmergencyProgrammes(s);
  s = processStepPolicyDecay(s, seedPolicyDecay);
  s = processStepProductivity(s, seedProductivity, difficulty);
  s = processStepEmployment(s);
  s = processStepInflation(s, difficulty);
  s = processStepWages(s);
  s = processStepBankRate(s);
  s = processStepTaxRevenues(s, difficulty, adviserBonuses);
  s = processStepSpending(s, adviserBonuses);
  s = processStepFiscalBalance(s, adviserBonuses);
  s = processParliamentaryMechanics(s);
  s = processStepFiscalRules(s, adviserBonuses);
  s = processStepMarkets(s, difficulty, seedMarkets);
  s = processStepServices(s, difficulty);
  s = processStepPublicSectorPay(s);
  s = processStepDistributional(s);
  s = processStepBackbench(s, difficulty);
  s = processStepMPStances(s);
  s = processStepPMTrust(s, difficulty);
  s = processStepFiscalFramework(s);
  s = processStepPMThreats(s, seedPMThreats);
  s = processStepPMIntervention(s, difficulty, [Math.random(), Math.random(), Math.random(), Math.random(), Math.random()]);
  s = processPMCommunicationsStep(s);
  s = processStepEvents(s, difficulty, seedEvents);
  s = processStepCreditRating(s);
  s = processStepSnapshot(s);
  s = processStepOBR(s, s.metadata.currentMonth === 3 || s.metadata.currentMonth === 11);
  s = processStepTurnDelta(s, startOfTurnSnapshot);
  s = processStepGameOver(s, difficulty);

  return s;
}

function processStepInflation(state: GameState, difficulty: ExtendedDifficultySettings): GameState {
  const { economic, fiscal, markets } = state;

  const inflationInputs: InflationInputs = {
    inflationCPI: economic.inflationCPI,
    inflationExpectations: economic.inflationExpectations ?? economic.inflationCPI,
    inflationAnchorHealth: economic.inflationAnchorHealth ?? 100,
    unemploymentRate: economic.unemploymentRate,
    wageGrowthAnnual: economic.wageGrowthAnnual,
    bankRate: markets.bankRate,
    sterlingIndex: markets.sterlingIndex,
    vatRate: fiscal.vatRate,
    energyImportPricePressure: state.externalSector.energyImportPricePressure,
    rentInflation_pct: state.housing.rentInflation_pct || 6,
    housingAffordabilityIndex: state.housing.housingAffordabilityIndex,
    inflationShockScale: difficulty.inflationShockScale,
  };

  const result = calculateInflationDomain(inflationInputs);

  return {
    ...state,
    economic: {
      ...economic,
      inflationCPI: result.inflationCPI,
      inflationAnchorHealth: result.inflationAnchorHealth,
      inflationExpectations: result.inflationExpectations,
    },
  };
}

function processStepTaxRevenues(state: GameState, difficulty: ExtendedDifficultySettings, adviserBonuses: AdviserBonuses): GameState {
  const { economic, fiscal } = state;

  const stampDutyRate = getDetailedTaxRate(state, 'stampDuty', 5);
  const sdltFirstTimeBuyerThreshold = getDetailedTaxRate(state, 'sdltFirstTimeBuyerThreshold', 425000);

  const inputs: TaxRevenueInputs = {
    gdpNominal_bn: economic.gdpNominal_bn,
    incomeTaxBasicRate: fiscal.incomeTaxBasicRate,
    incomeTaxHigherRate: fiscal.incomeTaxHigherRate,
    incomeTaxAdditionalRate: fiscal.incomeTaxAdditionalRate,
    nationalInsuranceRate: fiscal.nationalInsuranceRate,
    employerNIRate: fiscal.employerNIRate,
    vatRate: fiscal.vatRate,
    corporationTaxRate: fiscal.corporationTaxRate,
    personalAllowance: fiscal.personalAllowance || 12570,
    basicRateUpperThreshold: fiscal.basicRateUpperThreshold || 50270,
    higherRateUpperThreshold: fiscal.higherRateUpperThreshold || 125140,
    thresholdUprating: fiscal.thresholdUprating || 'frozen',
    thresholdFreezeMonths: fiscal.thresholdFreezeMonths || 0,
    wageGrowthAnnual: economic.wageGrowthAnnual,
    fullExpensing: fiscal.fullExpensing,
    sdltAdditionalDwellingsSurcharge: fiscal.sdltAdditionalDwellingsSurcharge || 3,
    stampDutyRate,
    sdltFirstTimeBuyerThreshold,
    housePriceIndex: state.financialStability.housePriceIndex,
    mortgageApprovals: state.financialStability.mortgageApprovals,
    revenueAdjustment_bn: fiscal.revenueAdjustment_bn || 0,
    taxAvoidanceScale: difficulty.taxAvoidanceMultiplier,
    taxRevenueMultiplier: adviserBonuses.taxRevenueMultiplier,
  };

  const result = calculateTaxRevenueDomain(inputs);

  const upratingRegime = fiscal.thresholdUprating || 'frozen';
  const monthlyCpiFactor = 1 + economic.inflationCPI / 100 / 12;
  const monthlyEarningsFactor = 1 + economic.wageGrowthAnnual / 100 / 12;
  const nextPersonalAllowance =
    upratingRegime === 'cpi_linked'
      ? fiscal.personalAllowance * monthlyCpiFactor
      : upratingRegime === 'earnings_linked'
        ? fiscal.personalAllowance * monthlyEarningsFactor
        : fiscal.personalAllowance;
  const nextBasicUpperThreshold =
    upratingRegime === 'cpi_linked'
      ? fiscal.basicRateUpperThreshold * monthlyCpiFactor
      : upratingRegime === 'earnings_linked'
        ? fiscal.basicRateUpperThreshold * monthlyEarningsFactor
        : fiscal.basicRateUpperThreshold;
  const nextHigherUpperThreshold =
    upratingRegime === 'cpi_linked'
      ? fiscal.higherRateUpperThreshold * monthlyCpiFactor
      : upratingRegime === 'earnings_linked'
        ? fiscal.higherRateUpperThreshold * monthlyEarningsFactor
        : fiscal.higherRateUpperThreshold;
  const nextFreezeMonths = upratingRegime === 'frozen' ? (fiscal.thresholdFreezeMonths || 0) + 1 : 0;

  return {
    ...state,
    fiscal: {
      ...fiscal,
      totalRevenue_bn: result.totalRevenue_bn,
      stampDutyRevenue_bn: result.stampDutyRevenue,
      personalAllowance: nextPersonalAllowance,
      basicRateUpperThreshold: nextBasicUpperThreshold,
      higherRateUpperThreshold: nextHigherUpperThreshold,
      thresholdFreezeMonths: nextFreezeMonths,
    },
  };
}

export default processTurn;
