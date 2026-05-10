// Step 2: Employment

import { GameState } from '../../types';

export function processStepEmployment(state: GameState): GameState {
  const { economic, fiscal } = state;

  const baseNAIRU = 4.25;

  let adjustedNAIRU = baseNAIRU;

  if (fiscal.employerNIRate > 15) {
    adjustedNAIRU += (fiscal.employerNIRate - 15) * 0.02;
  }

  if (fiscal.corporationTaxRate > 30) {
    adjustedNAIRU += (fiscal.corporationTaxRate - 30) * 0.015;
  }

  const effectiveMarginalRate = fiscal.incomeTaxBasicRate + fiscal.nationalInsuranceRate + 63;
  if (effectiveMarginalRate > 93) {
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
  if (fiscal.thresholdUprating === 'earnings_linked') {
    adjustedNAIRU -= 0.05;
  }
  if (state.housing.housingAffordabilityIndex < 40) {
    adjustedNAIRU += 0.1;
  }

  adjustedNAIRU = Math.max(3.5, Math.min(7.0, adjustedNAIRU));

  const trendGrowth = 1.75;
  const growthGap = economic.gdpGrowthAnnual - trendGrowth;
  const okunsCoefficient = -0.45;
  const unemploymentPressure = (growthGap * okunsCoefficient) / 12;

  let newUnemployment = economic.unemploymentRate + unemploymentPressure;

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
    const cutScale = Math.min(1, (0.95 - welfareRatio) / 0.1);
    participationRate -= 0.03 + cutScale * 0.05;
  }

  participationRate = Math.max(58, Math.min(67, participationRate));
  const economicInactivity = Math.max(16, Math.min(28, 84.5 - participationRate));

  const labourSupplyPressure = ((participationRate - 63.0) / 1.5) * 0.03;
  adjustedNAIRU = Math.max(3.3, Math.min(7.2, adjustedNAIRU - labourSupplyPressure));

  const nairuDrift = (adjustedNAIRU - newUnemployment) * 0.04;
  newUnemployment += nairuDrift;

  const nhsEmploymentEffect = state.services.nhsQuality < 50 ? (50 - state.services.nhsQuality) * 0.002 : 0;
  const educationEmploymentEffect =
    state.services.educationQuality < 55 ? (55 - state.services.educationQuality) * 0.001 : 0;
  newUnemployment += nhsEmploymentEffect + educationEmploymentEffect;

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
