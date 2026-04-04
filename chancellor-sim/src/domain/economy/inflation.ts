// Pure inflation calculation function extracted from turn-processor.ts.
// Accepts narrow inputs and returns narrow outputs for unit testability.

export interface InflationInputs {
  inflationCPI: number;
  inflationExpectations: number;
  inflationAnchorHealth: number;
  unemploymentRate: number;
  wageGrowthAnnual: number;
  bankRate: number;
  sterlingIndex: number;
  vatRate: number;
  energyImportPricePressure: number;
  rentInflation_pct: number;
  housingAffordabilityIndex: number;
  inflationShockScale: number;
  /** Optional override for the random shock. If not provided, Math.random() is used. */
  randomShockOverride?: number;
}

export interface InflationResult {
  inflationCPI: number;
  inflationAnchorHealth: number;
  inflationExpectations: number;
}

export function calculateInflation(inputs: InflationInputs): InflationResult {
  const nairu = 4.25;
  const unemploymentGap = nairu - inputs.unemploymentRate;

  let anchorHealth = inputs.inflationAnchorHealth ?? 100;

  // Decay logic
  if (inputs.inflationCPI > 8.0) {
    anchorHealth -= 4.0;
  } else if (inputs.inflationCPI > 5.0) {
    anchorHealth -= 2.0;
  } else if (inputs.inflationCPI > 3.5) {
    anchorHealth -= 0.5;
  }

  // Recovery logic
  const realRate = inputs.bankRate - inputs.inflationCPI;
  if (inputs.inflationCPI < 3.0 && realRate > 1.0) {
    anchorHealth += 1.0;
  } else if (inputs.inflationCPI < 2.5) {
    anchorHealth += 0.5;
  }

  anchorHealth = Math.max(0, Math.min(100, anchorHealth));

  // Expectations term
  const totalExpectationsWeight = 0.55;
  const previousExpectations = inputs.inflationExpectations ?? inputs.inflationCPI;
  const adaptiveExpectation = previousExpectations * 0.7 + inputs.inflationCPI * 0.3;
  const targetAnchoredExpectation = 2.0 * 0.3 + inputs.inflationCPI * 0.7;
  const inflationExpectations = anchorHealth < 60 ? adaptiveExpectation : targetAnchoredExpectation;
  const recentTrend = inflationExpectations;
  const expectationsTerm =
    2.0 * (anchorHealth / 100) * totalExpectationsWeight +
    recentTrend * (1 - anchorHealth / 100) * totalExpectationsWeight;

  // Persistence
  const persistence = inputs.inflationCPI * 0.2;

  // Domestic pressure (Phillips curve)
  const domesticPressure = (2.0 + unemploymentGap * 0.5) * 0.15;

  // Import prices (sterling effect)
  const sterlingChange = (100 - inputs.sterlingIndex) / 100;
  const importPressure = (2.0 + sterlingChange * 8.0) * 0.1;

  // VAT pass-through
  const vatChange = inputs.vatRate - 20;
  const vatEffect = vatChange * 0.04;

  // Wage-price spiral
  const realWageGap = inputs.wageGrowthAnnual - inputs.inflationCPI;
  const wagePressure = realWageGap > 2.0 ? (realWageGap - 2.0) * 0.1 : 0;

  const energyImportInflationEffect = Math.max(-0.4, Math.min(0.4, inputs.energyImportPricePressure * 0.08));
  const rentInflationEffect = ((inputs.rentInflation_pct || 6) - 6) * 0.08;
  const affordabilityServicesEffect = inputs.housingAffordabilityIndex < 40 ? 0.2 : 0;

  let inflation =
    persistence +
    expectationsTerm +
    domesticPressure +
    importPressure +
    vatEffect +
    wagePressure +
    energyImportInflationEffect +
    rentInflationEffect +
    affordabilityServicesEffect;

  // Random shock
  const shockValue = inputs.randomShockOverride ?? Math.random() - 0.5;
  const randomShock = shockValue * 0.5 * inputs.inflationShockScale;
  inflation += randomShock;

  // Clamp
  const maxInflation = anchorHealth < 50 ? 20.0 : 12.0;
  inflation = Math.max(-2.0, Math.min(maxInflation, inflation));

  return {
    inflationCPI: inflation,
    inflationAnchorHealth: anchorHealth,
    inflationExpectations,
  };
}
