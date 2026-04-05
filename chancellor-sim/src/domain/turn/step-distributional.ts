// Step 12: Distributional Analysis
import { GameState } from '../../types';

import { createInitialFiscalState } from '../../game-integration';
import { round1 } from './shared-helpers';

const BASELINE_FISCAL_STATE = createInitialFiscalState();

export function processStepDistributional(state: GameState): GameState {
  const prev = state.distributional;
  const basicDelta = state.fiscal.incomeTaxBasicRate - 20;
  const higherDelta = state.fiscal.incomeTaxHigherRate - 40;
  const additionalDelta = state.fiscal.incomeTaxAdditionalRate - 45;
  const niEmployeeDelta = state.fiscal.nationalInsuranceRate - 8;
  const niEmployerDelta = state.fiscal.employerNIRate - 13.8;
  const vatDelta = state.fiscal.vatRate - 20;
  const welfareRatio =
    (state.fiscal.spending.welfareCurrent - BASELINE_FISCAL_STATE.spending.welfareCurrent) /
    BASELINE_FISCAL_STATE.spending.welfareCurrent;
  const ucTaperDelta = 55 - (state.fiscal.ucTaperRate || 55);
  const workAllowanceDelta = ((state.fiscal.workAllowanceMonthly || 344) - 344) / 50;
  const childcareDelta = ((state.fiscal.childcareSupportRate || 30) - 30) / 10;
  const nhsRatio =
    (state.fiscal.spending.nhsCurrent - BASELINE_FISCAL_STATE.spending.nhsCurrent) /
    BASELINE_FISCAL_STATE.spending.nhsCurrent;
  const eduRatio =
    (state.fiscal.spending.educationCurrent - BASELINE_FISCAL_STATE.spending.educationCurrent) /
    BASELINE_FISCAL_STATE.spending.educationCurrent;
  const vatBurdenWeight = [1.8, 1.6, 1.4, 1.2, 1.1, 1.0, 0.9, 0.8, 0.7, 0.6];
  const basicWeight = [0.0, 0.0, 0.03, 0.08, 0.12, 0.16, 0.18, 0.18, 0.14, 0.11];
  const higherWeight = [0, 0, 0, 0.01, 0.03, 0.07, 0.12, 0.18, 0.24, 0.35];
  const additionalWeight = [0, 0, 0, 0, 0, 0.01, 0.02, 0.05, 0.12, 0.6];
  const niWeight = [0, 0.02, 0.08, 0.14, 0.16, 0.17, 0.16, 0.14, 0.09, 0.04];
  const welfareWeight = [0.34, 0.3, 0.22, 0.12, 0.02, 0, 0, 0, 0, 0];
  const ucWeight = [0.32, 0.28, 0.2, 0.12, 0.04, 0.01, 0, 0, 0, 0];
  const serviceWeight = [0.16, 0.15, 0.13, 0.12, 0.11, 0.1, 0.09, 0.07, 0.04, 0.03];
  const decileImpacts = Array.from({ length: 10 }, (_, idx) => {
    const incomeTaxEffect = -(
      basicDelta * basicWeight[idx] * 0.22 +
      higherDelta * higherWeight[idx] * 0.24 +
      additionalDelta * additionalWeight[idx] * 0.3
    );
    const niEffect = -(niEmployeeDelta * niWeight[idx] * 0.18 + niEmployerDelta * niWeight[idx] * 0.08);
    const vatEffect = -(vatDelta * 0.09 * vatBurdenWeight[idx]);
    const welfareEffect = welfareRatio * welfareWeight[idx] * 6.5;
    const ucEffect = (ucTaperDelta * 0.08 + workAllowanceDelta * 0.12 + childcareDelta * 0.11) * ucWeight[idx];
    const serviceEffect = (nhsRatio + eduRatio) * serviceWeight[idx] * 1.8;
    return round1(incomeTaxEffect + niEffect + vatEffect + welfareEffect + ucEffect + serviceEffect);
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
    const effectiveTaxRate = Math.max(0, Math.min(70, ((taxCash + niCash) / income) * 100 + vatBurden * 100));
    const prevTax = decile.effectiveTaxRate || effectiveTaxRate;
    const welfareEffect =
      decile.id <= 3
        ? ((state.fiscal.spending.welfareCurrent - BASELINE_FISCAL_STATE.spending.welfareCurrent) /
            BASELINE_FISCAL_STATE.spending.welfareCurrent) *
          40
        : decile.id <= 4
          ? ((state.fiscal.spending.welfareCurrent - BASELINE_FISCAL_STATE.spending.welfareCurrent) /
              BASELINE_FISCAL_STATE.spending.welfareCurrent) *
            20
          : 0;
    const realIncomeChange =
      state.economic.wageGrowthAnnual -
      state.economic.inflationCPI -
      (effectiveTaxRate - prevTax) * 2 +
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
  const povertyRate = Math.max(
    8,
    Math.min(
      40,
      17.5 -
        bottomQuintileRealIncomeGrowth * 0.8 +
        (state.economic.inflationCPI > 4 ? (state.economic.inflationCPI - 4) * 0.3 : 0)
    )
  );
  const childPovertyRate = Math.max(10, Math.min(60, povertyRate * 1.65));
  const topDecileEffectiveTaxRate = deciles[9].effectiveTaxRate;
  const taxProgressivityDelta =
    deciles[9].effectiveTaxRate -
    prev.deciles[9].effectiveTaxRate -
    (deciles[0].effectiveTaxRate - prev.deciles[0].effectiveTaxRate);
  const lastTaxChangeDistribution =
    taxProgressivityDelta > 0.05 ? 'progressive' : taxProgressivityDelta < -0.05 ? 'regressive' : 'neutral';

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
