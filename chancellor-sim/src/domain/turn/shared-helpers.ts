import { GameState } from '../../types';

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export interface AdviserBonuses {
  taxRevenueMultiplier: number;
  spendingEfficiencyMultiplier: number;
  backbenchBonus: number;
  pmTrustBonus: number;
  gdpGrowthBonus: number;
  debtInterestReduction: number;
  credibilityBonus: number;
}

export function getAdviserBonuses(state: GameState): AdviserBonuses {
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

  const loyaltyMultiplier = (loyalty: number): number => {
    if (loyalty >= 70) return 1.0;
    if (loyalty >= 50) return 0.75;
    if (loyalty >= 30) return 0.5;
    return 0.25;
  };

  const applyScaledBonus = <K extends keyof AdviserBonuses>(
    key: K,
    baseValue: AdviserBonuses[K],
    hired: any
  ): void => {
    const stateData = hired.state;
    const loyalty = stateData?.loyaltyScore ?? 75;
    const mult = loyaltyMultiplier(loyalty);
    const provenBonus = stateData?.provenTrackRecord ? 1.2 : 1.0;
    const scaled = (baseValue - (key === 'taxRevenueMultiplier' || key === 'spendingEfficiencyMultiplier' ? 1.0 : 0)) * mult * provenBonus;
    bonuses[key] = (bonuses[key] as number) + scaled;
  };

  if (advisersMap.has('treasury_mandarin')) {
    const hired = advisersMap.get('treasury_mandarin');
    applyScaledBonus('taxRevenueMultiplier', 1.03, hired);
    applyScaledBonus('credibilityBonus', 5, hired);
  }

  if (advisersMap.has('political_operator')) {
    const hired = advisersMap.get('political_operator');
    applyScaledBonus('backbenchBonus', 3, hired);
    applyScaledBonus('pmTrustBonus', 2, hired);
  }

  if (advisersMap.has('heterodox_economist')) {
    const hired = advisersMap.get('heterodox_economist');
    applyScaledBonus('gdpGrowthBonus', 0.15, hired);
  }

  if (advisersMap.has('fiscal_hawk')) {
    const hired = advisersMap.get('fiscal_hawk');
    applyScaledBonus('debtInterestReduction', 8, hired);
    applyScaledBonus('credibilityBonus', 8, hired);
  }

  if (advisersMap.has('social_democrat')) {
    const hired = advisersMap.get('social_democrat');
    applyScaledBonus('spendingEfficiencyMultiplier', 1.12, hired);
  }

  if (advisersMap.has('technocratic_centrist')) {
    const hired = advisersMap.get('technocratic_centrist');
    applyScaledBonus('credibilityBonus', 6, hired);
    applyScaledBonus('spendingEfficiencyMultiplier', 1.05, hired);
    applyScaledBonus('taxRevenueMultiplier', 1.02, hired);
  }

  return bonuses;
}

export type RiskAggregate = {
  macroShockScaleDelta: number;
  productivityMonthlyPenalty_pp: number;
  strikeThresholdMultiplier: number;
  marketReactionScaleDelta: number;
  taxAvoidanceScaleDelta: number;
};

export function getPolicyRiskAggregate(state: GameState): RiskAggregate {
  const modifiers = Array.isArray(state.policyRiskModifiers) ? state.policyRiskModifiers : [];
  return modifiers.reduce<RiskAggregate>(
    (acc, modifier) => {
      acc.macroShockScaleDelta += modifier.macroShockScaleDelta || 0;
      acc.productivityMonthlyPenalty_pp += modifier.productivityMonthlyPenalty_pp || 0;
      acc.marketReactionScaleDelta += modifier.marketReactionScaleDelta || 0;
      acc.taxAvoidanceScaleDelta += modifier.taxAvoidanceScaleDelta || 0;
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
      taxAvoidanceScaleDelta: 0,
    }
  );
}

export function getDetailedSpendingBudget(state: GameState, id: string, fallback = 0): number {
  const found = state.fiscal.detailedSpending?.find((item: { id: string; currentBudget: number }) => item.id === id);
  return found?.currentBudget ?? fallback;
}

export function getDetailedTaxRate(state: GameState, id: string, fallback = 0): number {
  const found = state.fiscal.detailedTaxes?.find((item: { id: string; currentRate: number }) => item.id === id);
  return found?.currentRate ?? fallback;
}

export function getProgrammeTotal(state: GameState, ids: string[]): number {
  const BASELINE_FISCAL_STATE = (require('../../game-integration') as any).createInitialFiscalState();
  const BASELINE_DETAILED_SPENDING = Object.fromEntries(
    BASELINE_FISCAL_STATE.detailedSpending.map((item: { id: string; currentBudget: number }) => [item.id, item.currentBudget])
  ) as Record<string, number>;
  return ids.reduce((sum, id) => sum + getDetailedSpendingBudget(state, id, BASELINE_DETAILED_SPENDING[id] || 0), 0);
}

export function evolveServiceMetric(
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

export function getCreditRatingPremium(rating?: string): number {
  switch (rating) {
    case 'AAA':
      return -0.2;
    case 'AA+':
      return -0.1;
    case 'AA':
      return 0;
    case 'AA-':
      return 0.1;
    case 'A+':
      return 0.3;
    case 'A':
      return 0.5;
    default:
      return 0.1;
  }
}
