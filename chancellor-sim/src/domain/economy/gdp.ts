// Pure GDP growth calculation functions extracted from turn-processor.ts.
// These accept narrow inputs and return narrow outputs, making them unit-testable.

export interface GDPInputs {
  productivityGrowthAnnual: number;
  unemploymentRate: number;
  inflationCPI: number;
  gdpGrowthAnnual: number;
  gdpNominal_bn: number;
  spending: {
    nhsCurrent: number;
    educationCurrent: number;
    defenceCurrent: number;
    welfareCurrent: number;
    policeCurrent: number;
    justiceCurrent: number;
    otherCurrent: number;
    nhsCapital: number;
    educationCapital: number;
    defenceCapital: number;
    infrastructureCapital: number;
    policeCapital: number;
    justiceCapital: number;
    otherCapital: number;
  };
  taxRates: {
    incomeTaxBasicRate: number;
    incomeTaxHigherRate: number;
    incomeTaxAdditionalRate: number;
    nationalInsuranceRate: number;
    employerNIRate: number;
    vatRate: number;
    corporationTaxRate: number;
  };
  bankRate: number;
  giltYield10y: number;
  businessConfidence: number;
  gdpGrowthBonus: number;
  difficultyMarketReactionScale: number;
}

export interface GDPResult {
  gdpGrowthMonthly: number;
  gdpGrowthAnnual: number;
  gdpNominal_bn: number;
  outputGap: number;
}

// July 2024 baseline spending values
const BASELINE = {
  nhsCurrent: 168.4,
  educationCurrent: 104.0,
  defenceCurrent: 39.0,
  welfareCurrent: 290.0,
  otherCurrent: 337.2,
  capital: 141.4,
};

// Baseline tax rates
const BASELINE_TAX = {
  incomeTaxBasic: 20,
  incomeTaxHigher: 40,
  incomeTaxAdditional: 45,
  niEmployee: 8,
  niEmployer: 13.8,
  vat: 20,
  corpTax: 25,
};

export function calculateGDPGrowth(inputs: GDPInputs): GDPResult {
  const labourForceGrowth = 0.75;
  const rawTrendGrowthAnnual = inputs.productivityGrowthAnnual + labourForceGrowth;
  const potentialGrowthTarget = 1.5;
  const trendGrowthAnnual = rawTrendGrowthAnnual + (potentialGrowthTarget - rawTrendGrowthAnnual) * 0.1;
  const trendGrowth = trendGrowthAnnual / 12;
  let monthlyRealGrowth = trendGrowth;

  // Spending changes from baseline
  const nhsCurrentChange = inputs.spending.nhsCurrent - BASELINE.nhsCurrent;
  const educationCurrentChange = inputs.spending.educationCurrent - BASELINE.educationCurrent;
  const defenceCurrentChange = inputs.spending.defenceCurrent - BASELINE.defenceCurrent;
  const welfareCurrentChange = inputs.spending.welfareCurrent - BASELINE.welfareCurrent;
  const otherCurrentChange =
    inputs.spending.policeCurrent +
    inputs.spending.justiceCurrent +
    inputs.spending.otherCurrent -
    BASELINE.otherCurrent;
  const capitalChange =
    inputs.spending.nhsCapital +
    inputs.spending.educationCapital +
    inputs.spending.defenceCapital +
    inputs.spending.infrastructureCapital +
    inputs.spending.policeCapital +
    inputs.spending.justiceCapital +
    inputs.spending.otherCapital -
    BASELINE.capital;

  // Economic slack multiplier
  const unemploymentGap = inputs.unemploymentRate - 4.5;
  const slackMultiplier = Math.max(0.9, Math.min(1.4, 1 + unemploymentGap * 0.12));

  // Category-specific multipliers
  let nhsMultiplier = 0.7 * slackMultiplier;
  let educationMultiplier = 0.65 * slackMultiplier;
  let welfareMultiplier = 0.7 * slackMultiplier;
  let defenceMultiplier = 0.45 * slackMultiplier;
  let otherMultiplier = 0.5 * slackMultiplier;
  let capitalMultiplier = 0.65 * slackMultiplier;

  // Inflation dampener
  if (inputs.inflationCPI > 3) {
    const dampener = Math.max(0.7, 1 - (inputs.inflationCPI - 3) * 0.06);
    nhsMultiplier *= dampener;
    educationMultiplier *= dampener;
    welfareMultiplier *= dampener;
    defenceMultiplier *= dampener;
    otherMultiplier *= dampener;
    capitalMultiplier *= dampener;
  }

  // Overheating dampener
  const outputGapCurrent = inputs.gdpGrowthAnnual - 1.0;
  if (outputGapCurrent > 0) {
    const overheatingDampener = Math.max(0.75, 1 - outputGapCurrent * 0.08);
    nhsMultiplier *= overheatingDampener;
    educationMultiplier *= overheatingDampener;
    welfareMultiplier *= overheatingDampener;
    defenceMultiplier *= overheatingDampener;
    otherMultiplier *= overheatingDampener;
    capitalMultiplier *= overheatingDampener;
  }

  // Fiscal demand impact
  const nominalGDP = inputs.gdpNominal_bn;
  const fiscalDemandImpact =
    (((nhsCurrentChange * nhsMultiplier +
      educationCurrentChange * educationMultiplier +
      welfareCurrentChange * welfareMultiplier +
      defenceCurrentChange * defenceMultiplier +
      otherCurrentChange * otherMultiplier +
      capitalChange * capitalMultiplier) /
      nominalGDP) *
      100) /
    12;

  monthlyRealGrowth += fiscalDemandImpact;

  // Tax effects on demand
  const taxDeltaBasic = inputs.taxRates.incomeTaxBasicRate - BASELINE_TAX.incomeTaxBasic;
  const taxDeltaHigher = inputs.taxRates.incomeTaxHigherRate - BASELINE_TAX.incomeTaxHigher;
  const taxDeltaAdditional = inputs.taxRates.incomeTaxAdditionalRate - BASELINE_TAX.incomeTaxAdditional;
  const taxDeltaNI = inputs.taxRates.nationalInsuranceRate - BASELINE_TAX.niEmployee;
  const taxDeltaEmployerNI = inputs.taxRates.employerNIRate - BASELINE_TAX.niEmployer;
  const taxDeltaVAT = inputs.taxRates.vatRate - BASELINE_TAX.vat;
  const taxDeltaCT = inputs.taxRates.corporationTaxRate - BASELINE_TAX.corpTax;

  const taxDemandImpact =
    (-taxDeltaBasic * 0.003 -
      taxDeltaHigher * 0.001 -
      taxDeltaAdditional * 0.0001 -
      taxDeltaNI * 0.0025 -
      taxDeltaEmployerNI * 0.003 -
      taxDeltaVAT * 0.0035 -
      taxDeltaCT * 0.0015) *
    slackMultiplier;

  monthlyRealGrowth += taxDemandImpact;

  // Monetary policy impulse (18-month lag)
  const rateGap = inputs.bankRate - 5.25;
  const monetaryImpulse = (-rateGap * 0.008) / 12;
  monthlyRealGrowth += monetaryImpulse;

  // Gilt yield effect on confidence
  const giltEffect = (-(inputs.giltYield10y - 4.1) * 0.005) / 12;
  monthlyRealGrowth += giltEffect;

  // Business confidence effect
  const confidenceEffect = (((inputs.businessConfidence - 50) / 100) * 0.05) / 12;
  monthlyRealGrowth += confidenceEffect;

  // Adviser bonus
  monthlyRealGrowth += inputs.gdpGrowthBonus / 12;

  // Difficulty scaling
  monthlyRealGrowth *= inputs.difficultyMarketReactionScale;

  // Clamp to realistic range
  monthlyRealGrowth = Math.max(-1.5, Math.min(2.0, monthlyRealGrowth));

  const gdpGrowthAnnual = monthlyRealGrowth * 12;
  const gdpNominal_bn = inputs.gdpNominal_bn * (1 + monthlyRealGrowth / 100 + inputs.inflationCPI / 1200);
  const outputGap = gdpGrowthAnnual - potentialGrowthTarget;

  return {
    gdpGrowthMonthly: monthlyRealGrowth,
    gdpGrowthAnnual,
    gdpNominal_bn,
    outputGap,
  };
}
