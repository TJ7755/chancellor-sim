import { GameState } from './game-state';

type LafferTaxType =
  | 'incomeTaxBasic'
  | 'incomeTaxHigher'
  | 'incomeTaxAdditional'
  | 'employeeNI'
  | 'employerNI'
  | 'vat'
  | 'corporationTax';

function getTaxAvoidanceScale(state: GameState): number {
  const mode = state.metadata.difficultyMode || 'realistic';
  if (mode === 'forgiving') return 0.7;
  if (mode === 'realistic') return 1.25;
  return 1.0;
}

function estimateTaxRevenueAtRate(
  taxType: LafferTaxType,
  trialRate: number,
  state: GameState,
): number {
  const fiscal = state.fiscal;
  const nominalGDPRatio = state.economic.gdpNominal_bn / 2750;
  const taxAvoidanceScale = getTaxAvoidanceScale(state);

  const baseIncome = 285;
  const baseNI = 175;
  const baseVAT = 192;
  const baseCorp = 94;

  switch (taxType) {
    case 'incomeTaxBasic': {
      const base = baseIncome + (trialRate - 20) * 7 + (fiscal.incomeTaxHigherRate - 40) * 2 + (fiscal.incomeTaxAdditionalRate - 45) * 0.2;
      const effectiveMarginalRate = trialRate + fiscal.nationalInsuranceRate;
      const behaviouralFactor = 1 - Math.pow(Math.max(0, (effectiveMarginalRate - 60) / 100), 1.5);
      return Math.max(0, base * Math.pow(nominalGDPRatio, 1.1) * Math.max(0.25, behaviouralFactor));
    }
    case 'incomeTaxHigher': {
      const base = baseIncome + (fiscal.incomeTaxBasicRate - 20) * 7 + (trialRate - 40) * 2 + (fiscal.incomeTaxAdditionalRate - 45) * 0.2;
      const effectiveMarginalRate = trialRate + fiscal.nationalInsuranceRate;
      const behaviouralFactor = 1 - Math.pow(Math.max(0, (effectiveMarginalRate - 62) / 100), 1.5);
      return Math.max(0, base * Math.pow(nominalGDPRatio, 1.1) * Math.max(0.2, behaviouralFactor));
    }
    case 'incomeTaxAdditional': {
      const excessRate = Math.max(0, trialRate - 50);
      const avoidanceLoss = excessRate > 0 ? 54 * (Math.pow(1.016, excessRate) - 1) * taxAvoidanceScale : 0;
      const base = baseIncome + (fiscal.incomeTaxBasicRate - 20) * 7 + (fiscal.incomeTaxHigherRate - 40) * 2 + (trialRate - 45) * 0.2 - avoidanceLoss;
      return Math.max(0, base * Math.pow(nominalGDPRatio, 1.1));
    }
    case 'employeeNI': {
      const excessRate = Math.max(0, trialRate - 12);
      const avoidanceLoss = excessRate > 0 ? 34 * (Math.pow(1.02, excessRate) - 1) * taxAvoidanceScale : 0;
      const base = baseNI + (trialRate - 8) * 6 + (fiscal.employerNIRate - 13.8) * 8.5 - avoidanceLoss;
      return Math.max(0, base * Math.pow(nominalGDPRatio, 1.0));
    }
    case 'employerNI': {
      const excessRate = Math.max(0, trialRate - 15);
      const avoidanceLoss = excessRate > 0 ? 44 * (Math.pow(1.025, excessRate) - 1) * taxAvoidanceScale : 0;
      const base = baseNI + (fiscal.nationalInsuranceRate - 8) * 6 + (trialRate - 13.8) * 8.5 - avoidanceLoss;
      return Math.max(0, base * Math.pow(nominalGDPRatio, 1.0));
    }
    case 'vat': {
      const excessRate = Math.max(0, trialRate - 20);
      const behaviouralLoss = excessRate > 0 ? (baseVAT + (trialRate - 20) * 7.5) * (Math.pow(1.02, excessRate) - 1) * taxAvoidanceScale : 0;
      const base = baseVAT + (trialRate - 20) * 7.5 - behaviouralLoss;
      const lafferFactor = 1 - Math.pow(Math.max(0, (trialRate - 24) / 80), 1.35);
      return Math.max(0, base * Math.pow(nominalGDPRatio, 1.0) * Math.max(0.3, lafferFactor));
    }
    case 'corporationTax': {
      const excessRate = Math.max(0, trialRate - 30);
      const avoidanceLoss = excessRate > 0 ? (baseCorp + (trialRate - 25) * 3.2) * (Math.pow(1.035, excessRate) - 1) * taxAvoidanceScale : 0;
      const base = baseCorp + (trialRate - 25) * 3.2 - avoidanceLoss;
      const lafferFactor = 1 - Math.pow(Math.max(0, (trialRate - 32) / 75), 1.4);
      return Math.max(0, base * Math.pow(nominalGDPRatio, 1.05) * Math.max(0.25, lafferFactor));
    }
    default:
      return 0;
  }
}

export function calculateLafferPoint(taxType: LafferTaxType, state: GameState): number {
  const ranges: Record<LafferTaxType, { min: number; max: number }> = {
    incomeTaxBasic: { min: 10, max: 60 },
    incomeTaxHigher: { min: 20, max: 70 },
    incomeTaxAdditional: { min: 35, max: 80 },
    employeeNI: { min: 0, max: 30 },
    employerNI: { min: 5, max: 30 },
    vat: { min: 5, max: 35 },
    corporationTax: { min: 10, max: 45 },
  };

  const range = ranges[taxType];
  let bestRate = range.min;
  let bestRevenue = -Infinity;

  for (let rate = range.min; rate <= range.max; rate += 0.5) {
    const revenue = estimateTaxRevenueAtRate(taxType, rate, state);
    if (revenue > bestRevenue) {
      bestRevenue = revenue;
      bestRate = rate;
    }
  }

  return Number(bestRate.toFixed(1));
}

export function getLafferTaxTypeForControlId(taxId: string): LafferTaxType | null {
  const map: Record<string, LafferTaxType> = {
    incomeTaxBasic: 'incomeTaxBasic',
    incomeTaxHigher: 'incomeTaxHigher',
    incomeTaxAdditional: 'incomeTaxAdditional',
    employeeNI: 'employeeNI',
    employerNI: 'employerNI',
    vat: 'vat',
    corporationTax: 'corporationTax',
  };

  return map[taxId] || null;
}
