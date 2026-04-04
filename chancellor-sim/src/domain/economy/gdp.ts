// Pure GDP growth calculation functions extracted from turn-processor.ts.
// These accept narrow inputs and return narrow outputs, making them unit-testable.

export interface GDPInputs {
  productivityGrowthAnnual: number;
  unemploymentRate: number;
  inflationCPI: number;
  gdpGrowthAnnual: number;
  gdpGrowthMonthly: number;
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
  giltYield10y: number;
  sterlingIndex: number;
  gdpGrowthBonus: number;
  nhsQuality: number;
  educationQuality: number;
  infrastructureQuality: number;
  currentAccountGDP: number;
  externalShockActive: boolean;
  externalShockType: string | null;
  exportShockTurnsRemaining: number;
  houseBuildingAnnualStarts: number;
  isFirstProcessedTurn: boolean;
  currentTurn: number;
  monthlySnapshotsLength: number;
  macroShockScale: number;
}

export interface GDPResult {
  gdpGrowthMonthly: number;
  gdpGrowthAnnual: number;
  gdpNominal_bn: number;
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

  const noSpendDelta =
    nhsCurrentChange === 0 &&
    educationCurrentChange === 0 &&
    defenceCurrentChange === 0 &&
    welfareCurrentChange === 0 &&
    otherCurrentChange === 0 &&
    capitalChange === 0;

  // === TAX EFFECTS (demand-side) ===

  const basicRateChange = inputs.taxRates.incomeTaxBasicRate - BASELINE_TAX.incomeTaxBasic;
  const higherRateChange = inputs.taxRates.incomeTaxHigherRate - BASELINE_TAX.incomeTaxHigher;
  const additionalRateChange = inputs.taxRates.incomeTaxAdditionalRate - BASELINE_TAX.incomeTaxAdditional;

  const incomeTaxDemandEffect =
    ((-(basicRateChange * 7 * 0.45 + higherRateChange * 2 * 0.18 + additionalRateChange * 0.2 * 0.12) / nominalGDP) *
      100 *
      0.35 *
      slackMultiplier) /
    12;
  monthlyRealGrowth += incomeTaxDemandEffect;

  const niEmployeeChange = inputs.taxRates.nationalInsuranceRate - BASELINE_TAX.niEmployee;
  const niEmployerChange = inputs.taxRates.employerNIRate - BASELINE_TAX.niEmployer;

  const niEmployeeDemandEffect =
    ((-(niEmployeeChange * 6 * 0.5) / nominalGDP) * 100 * 0.35 * slackMultiplier) / 12;
  const niEmployerDemandEffect =
    ((-(niEmployerChange * 8.5 * 0.25) / nominalGDP) * 100 * 0.2 * slackMultiplier) / 12;
  monthlyRealGrowth += niEmployeeDemandEffect + niEmployerDemandEffect;

  const vatChange = inputs.taxRates.vatRate - BASELINE_TAX.vat;
  const vatDemandEffect = ((-(vatChange * 7.5 * 0.45) / nominalGDP) * 100 * 0.35 * slackMultiplier) / 12;
  monthlyRealGrowth += vatDemandEffect;

  const corpTaxChange = inputs.taxRates.corporationTaxRate - BASELINE_TAX.corpTax;
  const corpTaxInvestmentEffect = ((-(corpTaxChange * 0.3 * 0.5 * 0.3) / nominalGDP) * 100) / 12;
  monthlyRealGrowth += corpTaxInvestmentEffect;

  if (inputs.taxRates.corporationTaxRate > 30) {
    const corpTaxPenalty = ((inputs.taxRates.corporationTaxRate - 30) * -0.008) / 12;
    monthlyRealGrowth += corpTaxPenalty;
  }

  if (inputs.taxRates.incomeTaxAdditionalRate > 50) {
    const topRatePenalty = ((inputs.taxRates.incomeTaxAdditionalRate - 50) * -0.003) / 12;
    monthlyRealGrowth += topRatePenalty;
  }

  const noTaxDelta =
    basicRateChange === 0 &&
    higherRateChange === 0 &&
    additionalRateChange === 0 &&
    niEmployeeChange === 0 &&
    niEmployerChange === 0 &&
    vatChange === 0 &&
    corpTaxChange === 0;

  // === SUPPLY-SIDE EFFECTS ===

  const healthSupplySide = ((inputs.nhsQuality - 45) * 0.002) / 12;
  monthlyRealGrowth += healthSupplySide;

  const educationSupplySide = ((inputs.educationQuality - 58) * 0.003) / 12;
  monthlyRealGrowth += educationSupplySide;

  const infraSupplySide = ((inputs.infrastructureQuality - 48) * 0.002) / 12;
  monthlyRealGrowth += infraSupplySide;

  // === MONETARY CONDITIONS ===

  const yieldEffect = ((inputs.giltYield10y - 4.15) * -0.015) / 12;
  monthlyRealGrowth += yieldEffect;

  const sterlingEffect = ((inputs.sterlingIndex - 100) * -0.0008) / 12;
  monthlyRealGrowth += sterlingEffect;

  // === EXTERNAL DEMAND ===

  const externalDemandEffect = Math.max(
    -0.04,
    Math.min(0.04, ((inputs.currentAccountGDP - -3.1) * 0.05) / 12)
  );
  monthlyRealGrowth += externalDemandEffect;

  // === HOUSING SUPPLY ===

  const housingSupplyEffect =
    ((((inputs.houseBuildingAnnualStarts || 240000) - 240000) / 240000) * 0.025) / 12;
  monthlyRealGrowth += housingSupplyEffect;

  // === EXTERNAL SHOCKS ===

  if (inputs.externalShockActive && inputs.externalShockType === 'trade_war') {
    monthlyRealGrowth *= 0.9;
  }
  if ((inputs.exportShockTurnsRemaining || 0) > 0) {
    monthlyRealGrowth += -(0.1 + Math.random() * 0.1) / 12;
  }

  // === ADVISER BONUS ===

  monthlyRealGrowth += inputs.gdpGrowthBonus / 12;

  // === RANDOM SHOCK ===

  const randomShock = inputs.isFirstProcessedTurn
    ? 0
    : (Math.random() - 0.5) * 0.12 * inputs.macroShockScale;
  monthlyRealGrowth += randomShock;

  // === NO-CHANGE CLAMPING ===

  if (noSpendDelta && noTaxDelta) {
    const baselineLower = trendGrowth - 0.08;
    const baselineUpper = trendGrowth + 0.08;
    monthlyRealGrowth = Math.max(baselineLower, Math.min(baselineUpper, monthlyRealGrowth));
  }

  // Clamp monthly real growth to realistic UK range
  monthlyRealGrowth = Math.max(-0.25, Math.min(0.25, monthlyRealGrowth));

  // Nominal GDP growth = real growth + inflation
  const monthlyInflation = inputs.inflationCPI / 12;
  let monthlyNominalGrowth = monthlyRealGrowth + monthlyInflation;

  // Turn-0 stabilisation
  if (inputs.isFirstProcessedTurn) {
    const baselineNominalGrowth = inputs.gdpGrowthMonthly + monthlyInflation;
    monthlyNominalGrowth = Math.max(
      baselineNominalGrowth - 0.1,
      Math.min(baselineNominalGrowth + 0.1, monthlyNominalGrowth)
    );
    monthlyRealGrowth = monthlyNominalGrowth - monthlyInflation;
  }

  monthlyNominalGrowth = Math.max(-2, Math.min(2, monthlyNominalGrowth));
  monthlyRealGrowth = monthlyNominalGrowth - monthlyInflation;

  // Calculate new nominal GDP
  const newGDP = inputs.gdpNominal_bn * (1 + monthlyNominalGrowth / 100);

  // Annualise real growth via compounding
  const annualRealGrowth = (Math.pow(1 + monthlyRealGrowth / 100, 12) - 1) * 100;

  return {
    gdpGrowthMonthly: monthlyRealGrowth,
    gdpGrowthAnnual: annualRealGrowth,
    gdpNominal_bn: newGDP,
  };
}
