// Step 0.7: Productivity Growth

import { GameState } from '../../types';
import { DifficultySettings } from '../game/difficulty';
import { getDetailedTaxRate, getPolicyRiskAggregate } from './shared-helpers';
import { BASELINE_TOTAL_CAPITAL_SPENDING_BN } from '../../game-integration';

export function processStepProductivity(state: GameState, randomSeed: number, difficultySettings: DifficultySettings): GameState {
  const { economic, fiscal, services } = state;
  const risk = getPolicyRiskAggregate(state);

  let productivityGrowth = 0.1;

  const baselineCapital = BASELINE_TOTAL_CAPITAL_SPENDING_BN;
  const plannedCapital =
    fiscal.spending.nhsCapital +
    fiscal.spending.educationCapital +
    fiscal.spending.defenceCapital +
    fiscal.spending.infrastructureCapital +
    fiscal.spending.policeCapital +
    fiscal.spending.justiceCapital +
    fiscal.spending.otherCapital;
  const deliveredCapital = Math.max(0, plannedCapital - (state.capitalDelivery.deferredCapital_bn || 0) * 12);
  const currentCapital = deliveredCapital;

  const capitalRatio = currentCapital / baselineCapital;
  const capitalEffect = (capitalRatio - 1) * 0.06;
  productivityGrowth += capitalEffect;

  const nhsGap = services.nhsQuality - 62;
  const eduGap = services.educationQuality - 68;
  const healthEffect = Math.tanh(nhsGap / 18) * 0.25;
  const educationEffect = Math.tanh(eduGap / 18) * 0.3;
  productivityGrowth += healthEffect + educationEffect;

  const innovationGap = services.researchInnovationOutput - 55;
  const innovationEffect = Math.tanh(innovationGap / 20) * 0.35;
  productivityGrowth += innovationEffect;

  const infraGap = services.infrastructureQuality - 58;
  const infraEffect = Math.tanh(infraGap / 22) * 0.18;
  productivityGrowth += infraEffect;

  const corpTaxEffect =
    fiscal.corporationTaxRate > 25
      ? (25 - fiscal.corporationTaxRate) * 0.015
      : (25 - fiscal.corporationTaxRate) * 0.01;
  productivityGrowth += corpTaxEffect;

  const rdTaxCredit = getDetailedTaxRate(state, 'rdTaxCredit', 27);
  const rdCreditEffect = (rdTaxCredit - 27) * 0.008;
  productivityGrowth += rdCreditEffect;

  const annualInvestmentAllowance = getDetailedTaxRate(state, 'annualInvestmentAllowance', 1000000);
  const aiaEffect = ((annualInvestmentAllowance - 1000000) / 500000) * 0.05;
  productivityGrowth += aiaEffect;
  if (fiscal.fullExpensing) {
    productivityGrowth += 0.08;
  }
  productivityGrowth += state.industrialStrategy.productivityBoostAccumulated || 0;

  const tradeFrictionDrag = Math.max(0, (state.externalSector.tradeFrictionIndex - 30) / 10) * 0.02;
  productivityGrowth -= tradeFrictionDrag;

  const snapshots = state.simulation.monthlySnapshots;
  if (snapshots.length >= 24) {
    if (currentCapital < baselineCapital * 0.85) {
      productivityGrowth -= 0.1;
    }
  }

  const currentProductivityGrowth = economic.productivityGrowthAnnual;
  const adjustedProductivityGrowth =
    currentProductivityGrowth +
    (productivityGrowth - currentProductivityGrowth) * 0.08 -
    (risk.productivityMonthlyPenalty_pp || 0);

  const clampedProductivityGrowth = Math.max(-0.5, Math.min(2.5, adjustedProductivityGrowth));

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
