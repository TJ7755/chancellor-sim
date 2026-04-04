// Pure tax revenue calculation extracted from turn-processor.ts.
// Accepts narrow inputs and returns narrow outputs for unit testability.

export interface TaxRevenueInputs {
  gdpNominal_bn: number;
  incomeTaxBasicRate: number;
  incomeTaxHigherRate: number;
  incomeTaxAdditionalRate: number;
  nationalInsuranceRate: number;
  employerNIRate: number;
  vatRate: number;
  corporationTaxRate: number;
  personalAllowance: number;
  basicRateUpperThreshold: number;
  higherRateUpperThreshold: number;
  thresholdUprating: 'frozen' | 'cpi_linked' | 'earnings_linked' | 'custom';
  thresholdFreezeMonths: number;
  wageGrowthAnnual: number;
  fullExpensing: boolean;
  sdltAdditionalDwellingsSurcharge: number;
  stampDutyRate: number;
  sdltFirstTimeBuyerThreshold: number;
  housePriceIndex: number;
  mortgageApprovals: number;
  revenueAdjustment_bn: number;
  taxAvoidanceScale: number;
  taxRevenueMultiplier: number;
}

export interface TaxRevenueResult {
  totalRevenue_bn: number;
  incomeTaxRevenue: number;
  niRevenue: number;
  vatRevenue: number;
  corpTaxRevenue: number;
  stampDutyRevenue: number;
  otherRevenue: number;
}

export function calculateTaxRevenue(inputs: TaxRevenueInputs): TaxRevenueResult {
  const baselineNominalGDP = 2750;
  const nominalGDPRatio = inputs.gdpNominal_bn / baselineNominalGDP;

  // Income Tax
  const incomeTaxBase = 285;
  const incomeTaxRateEffect =
    (inputs.incomeTaxBasicRate - 20) * 7.0 +
    (inputs.incomeTaxHigherRate - 40) * 2.0 +
    (inputs.incomeTaxAdditionalRate - 45) * 0.2;
  const personalAllowanceEffect = ((12570 - inputs.personalAllowance) / 100) * 0.6;
  const basicThresholdEffect = ((50270 - inputs.basicRateUpperThreshold) / 1000) * 1.1;
  const higherThresholdEffect = ((125140 - inputs.higherRateUpperThreshold) / 1000) * 0.25;

  let fiscalDragMultiplier = 1;
  if (inputs.thresholdUprating === 'frozen') {
    const freezeYears = inputs.thresholdFreezeMonths / 12;
    fiscalDragMultiplier = Math.pow(1 + Math.max(0, inputs.wageGrowthAnnual) / 100, 0.35 * Math.max(0, freezeYears));
  } else if (inputs.thresholdUprating === 'earnings_linked') {
    fiscalDragMultiplier = 0.985;
  }

  let additionalRateAvoidanceLoss = 0;
  if (inputs.incomeTaxAdditionalRate > 50) {
    const excessRate = inputs.incomeTaxAdditionalRate - 50;
    const avoidanceRate = Math.pow(1.016, excessRate) - 1;
    additionalRateAvoidanceLoss = 54 * avoidanceRate * inputs.taxAvoidanceScale;
  }

  const incomeTaxRevenue =
    (incomeTaxBase +
      incomeTaxRateEffect +
      personalAllowanceEffect +
      basicThresholdEffect +
      higherThresholdEffect -
      additionalRateAvoidanceLoss) *
    Math.pow(nominalGDPRatio, 1.1) *
    fiscalDragMultiplier;

  // National Insurance
  const niBase = 175;
  const niEmployeeRateEffect = (inputs.nationalInsuranceRate - 8) * 6.0;
  const niEmployerRateEffect = (inputs.employerNIRate - 13.8) * 8.5;

  let niEmployeeAvoidanceLoss = 0;
  if (inputs.nationalInsuranceRate > 12) {
    const excessRate = inputs.nationalInsuranceRate - 12;
    const avoidanceRate = Math.pow(1.02, excessRate) - 1;
    niEmployeeAvoidanceLoss = (niBase * 0.6 + niEmployeeRateEffect) * avoidanceRate * inputs.taxAvoidanceScale;
  }

  let niEmployerAvoidanceLoss = 0;
  if (inputs.employerNIRate > 15) {
    const excessRate = inputs.employerNIRate - 15;
    const avoidanceRate = Math.pow(1.025, excessRate) - 1;
    niEmployerAvoidanceLoss = (niBase * 0.4 + niEmployerRateEffect) * avoidanceRate * inputs.taxAvoidanceScale;
  }

  const niRevenue =
    (niBase + niEmployeeRateEffect + niEmployerRateEffect - niEmployeeAvoidanceLoss - niEmployerAvoidanceLoss) *
    Math.pow(nominalGDPRatio, 1.0);

  // VAT
  const vatBase = 192;
  const vatRateEffect = (inputs.vatRate - 20) * 7.5;

  let vatBehavioralLoss = 0;
  if (inputs.vatRate > 20) {
    const excessRate = inputs.vatRate - 20;
    const consumptionReduction = Math.pow(1.02, excessRate) - 1;
    vatBehavioralLoss = (vatBase + vatRateEffect) * consumptionReduction * inputs.taxAvoidanceScale;
  }

  const vatRevenue = Math.max(0, (vatBase + vatRateEffect - vatBehavioralLoss) * Math.pow(nominalGDPRatio, 1.0));

  // Corporation Tax
  const corpTaxBase = 94;
  const corpTaxRateEffect = (inputs.corporationTaxRate - 25) * 3.2;

  let corpTaxAvoidanceLoss = 0;
  if (inputs.corporationTaxRate > 30) {
    const excessRate = inputs.corporationTaxRate - 30;
    const avoidanceRate = Math.pow(1.035, excessRate) - 1;
    const effectiveBase = corpTaxBase + corpTaxRateEffect;
    corpTaxAvoidanceLoss = effectiveBase * avoidanceRate * inputs.taxAvoidanceScale;
  }

  const fullExpensingCost = inputs.fullExpensing ? 3.5 : 0;
  const corpTaxRevenue = Math.max(
    0,
    (corpTaxBase + corpTaxRateEffect - corpTaxAvoidanceLoss - fullExpensingCost) * Math.pow(nominalGDPRatio, 1.05)
  );

  // Other taxes (elasticity 0.8)
  const otherRevenue = 323 * Math.pow(nominalGDPRatio, 0.8);

  // Stamp duty land tax
  const baseStampDuty = 16;
  const stampDutyRateDelta = inputs.stampDutyRate - 5;
  const sdltFirstTimeThresholdDelta_k = (inputs.sdltFirstTimeBuyerThreshold - 425000) / 1000;
  const sdltSurchargeDelta = inputs.sdltAdditionalDwellingsSurcharge - 3;
  const stampDutyMechanical =
    baseStampDuty + stampDutyRateDelta * 1.5 + sdltSurchargeDelta * 0.5 - sdltFirstTimeThresholdDelta_k * 0.004;
  const stampDutyRevenue =
    Math.max(0, stampDutyMechanical) *
    Math.pow(Math.max(0.6, inputs.housePriceIndex / 100), 1.2) *
    Math.max(0.4, inputs.mortgageApprovals / 60) *
    Math.max(0.65, 1 - (sdltSurchargeDelta * 0.04 + Math.max(0, stampDutyRateDelta) * 0.03));

  const revenueAdj = inputs.revenueAdjustment_bn || 0;

  const totalRevenueAnnual =
    (incomeTaxRevenue + niRevenue + vatRevenue + corpTaxRevenue + otherRevenue + stampDutyRevenue + revenueAdj) *
    inputs.taxRevenueMultiplier;

  return {
    totalRevenue_bn: totalRevenueAnnual,
    incomeTaxRevenue,
    niRevenue,
    vatRevenue,
    corpTaxRevenue,
    stampDutyRevenue,
    otherRevenue,
  };
}
