import { calculateGDPGrowth, GDPInputs, GDPResult } from '../domain/economy/gdp';
import { calculateInflation, InflationInputs, InflationResult } from '../domain/economy/inflation';
import { calculateTaxRevenue, TaxRevenueInputs, TaxRevenueResult } from '../domain/fiscal/tax-revenue';
import { calculateDebtDynamics, DebtInputs, DebtResult } from '../domain/fiscal/debt';

// ===========================
// GDP Growth Tests
// ===========================

function defaultGDPInputs(): GDPInputs {
  return {
    productivityGrowthAnnual: 0.1,
    unemploymentRate: 4.2,
    inflationCPI: 2.2,
    gdpGrowthAnnual: 1.0,
    gdpNominal_bn: 2750,
    spending: {
      nhsCurrent: 168.4,
      educationCurrent: 104.0,
      defenceCurrent: 39.0,
      welfareCurrent: 290.0,
      policeCurrent: 18.5,
      justiceCurrent: 12.7,
      otherCurrent: 306.0,
      nhsCapital: 12.0,
      educationCapital: 12.0,
      defenceCapital: 16.6,
      infrastructureCapital: 80.0,
      policeCapital: 0.5,
      justiceCapital: 0.3,
      otherCapital: 20.0,
    },
    taxRates: {
      incomeTaxBasicRate: 20,
      incomeTaxHigherRate: 40,
      incomeTaxAdditionalRate: 45,
      nationalInsuranceRate: 8,
      employerNIRate: 13.8,
      vatRate: 20,
      corporationTaxRate: 25,
    },
    bankRate: 5.25,
    giltYield10y: 4.1,
    businessConfidence: 50,
    gdpGrowthBonus: 0,
    difficultyMarketReactionScale: 1.0,
  };
}

describe('calculateGDPGrowth', () => {
  it('returns positive baseline growth at neutral policy', () => {
    const result = calculateGDPGrowth(defaultGDPInputs());
    expect(result.gdpGrowthAnnual).toBeGreaterThan(0);
    expect(result.gdpGrowthAnnual).toBeLessThan(3.0);
  });

  it('increases growth when spending rises', () => {
    const inputs = defaultGDPInputs();
    inputs.spending.nhsCurrent += 10;
    const result = calculateGDPGrowth(inputs);
    const baseline = calculateGDPGrowth(defaultGDPInputs());
    expect(result.gdpGrowthAnnual).toBeGreaterThan(baseline.gdpGrowthAnnual);
  });

  it('decreases growth when taxes rise', () => {
    const inputs = defaultGDPInputs();
    inputs.taxRates.incomeTaxBasicRate = 22;
    const result = calculateGDPGrowth(inputs);
    const baseline = calculateGDPGrowth(defaultGDPInputs());
    expect(result.gdpGrowthAnnual).toBeLessThan(baseline.gdpGrowthAnnual);
  });

  it('decreases growth when bank rate rises', () => {
    const inputs = defaultGDPInputs();
    inputs.bankRate = 6.0;
    const result = calculateGDPGrowth(inputs);
    const baseline = calculateGDPGrowth(defaultGDPInputs());
    expect(result.gdpGrowthAnnual).toBeLessThan(baseline.gdpGrowthAnnual);
  });

  it('clamps monthly growth to realistic range', () => {
    const inputs = defaultGDPInputs();
    inputs.spending.nhsCurrent = 500;
    const result = calculateGDPGrowth(inputs);
    expect(result.gdpGrowthMonthly).toBeLessThanOrEqual(2.0);
    expect(result.gdpGrowthMonthly).toBeGreaterThanOrEqual(-1.5);
  });
});

// ===========================
// Inflation Tests
// ===========================

function defaultInflationInputs(): InflationInputs {
  return {
    inflationCPI: 2.2,
    inflationExpectations: 2.2,
    inflationAnchorHealth: 100,
    unemploymentRate: 4.2,
    wageGrowthAnnual: 5.4,
    bankRate: 5.25,
    sterlingIndex: 100,
    vatRate: 20,
    energyImportPricePressure: 0,
    rentInflation_pct: 6,
    housingAffordabilityIndex: 45,
    inflationShockScale: 1.0,
  };
}

describe('calculateInflation', () => {
  it('returns inflation near 2% at baseline', () => {
    const result = calculateInflation({ ...defaultInflationInputs(), randomShockOverride: 0 });
    expect(result.inflationCPI).toBeGreaterThan(1.0);
    expect(result.inflationCPI).toBeLessThan(5.0);
  });

  it('inflation rises when unemployment falls below NAIRU', () => {
    const inputs = { ...defaultInflationInputs(), randomShockOverride: 0 };
    inputs.unemploymentRate = 3.0;
    const result = calculateInflation(inputs);
    const baseline = calculateInflation({ ...defaultInflationInputs(), randomShockOverride: 0 });
    expect(result.inflationCPI).toBeGreaterThan(baseline.inflationCPI);
  });

  it('inflation rises when VAT increases', () => {
    const inputs = { ...defaultInflationInputs(), randomShockOverride: 0 };
    inputs.vatRate = 25;
    const result = calculateInflation(inputs);
    const baseline = calculateInflation({ ...defaultInflationInputs(), randomShockOverride: 0 });
    expect(result.inflationCPI).toBeGreaterThan(baseline.inflationCPI);
  });

  it('anchor health degrades when inflation is very high', () => {
    const inputs = { ...defaultInflationInputs(), randomShockOverride: 0 };
    inputs.inflationCPI = 10.0;
    const result = calculateInflation(inputs);
    expect(result.inflationAnchorHealth).toBeLessThan(100);
  });

  it('anchor health recovers when inflation is low and rates are positive', () => {
    const inputs = { ...defaultInflationInputs(), randomShockOverride: 0 };
    inputs.inflationCPI = 2.0;
    inputs.bankRate = 4.0;
    const result = calculateInflation(inputs);
    expect(result.inflationAnchorHealth).toBeGreaterThanOrEqual(100);
  });

  it('inflation is clamped to realistic range', () => {
    const inputs = { ...defaultInflationInputs(), randomShockOverride: 0 };
    inputs.inflationCPI = 100;
    const result = calculateInflation(inputs);
    expect(result.inflationCPI).toBeLessThanOrEqual(20.0);
  });
});

// ===========================
// Tax Revenue Tests
// ===========================

function defaultTaxInputs(): TaxRevenueInputs {
  return {
    gdpNominal_bn: 2750,
    incomeTaxBasicRate: 20,
    incomeTaxHigherRate: 40,
    incomeTaxAdditionalRate: 45,
    nationalInsuranceRate: 8,
    employerNIRate: 13.8,
    vatRate: 20,
    corporationTaxRate: 25,
    personalAllowance: 12570,
    basicRateUpperThreshold: 50270,
    higherRateUpperThreshold: 125140,
    thresholdUprating: 'frozen',
    thresholdFreezeMonths: 0,
    wageGrowthAnnual: 5.4,
    fullExpensing: false,
    sdltAdditionalDwellingsSurcharge: 3,
    revenueAdjustment_bn: 0,
    taxAvoidanceScale: 1.0,
    taxRevenueMultiplier: 1.0,
  };
}

describe('calculateTaxRevenue', () => {
  it('returns plausible total revenue at baseline', () => {
    const result = calculateTaxRevenue(defaultTaxInputs());
    expect(result.totalRevenue_bn).toBeGreaterThan(900);
    expect(result.totalRevenue_bn).toBeLessThan(1300);
  });

  it('income tax revenue increases when basic rate rises', () => {
    const inputs = defaultTaxInputs();
    inputs.incomeTaxBasicRate = 22;
    const result = calculateTaxRevenue(inputs);
    const baseline = calculateTaxRevenue(defaultTaxInputs());
    expect(result.incomeTaxRevenue).toBeGreaterThan(baseline.incomeTaxRevenue);
  });

  it('VAT revenue increases when VAT rate rises', () => {
    const inputs = defaultTaxInputs();
    inputs.vatRate = 22;
    const result = calculateTaxRevenue(inputs);
    const baseline = calculateTaxRevenue(defaultTaxInputs());
    expect(result.vatRevenue).toBeGreaterThan(baseline.vatRevenue);
  });

  it('corporation tax revenue increases when rate rises', () => {
    const inputs = defaultTaxInputs();
    inputs.corporationTaxRate = 28;
    const result = calculateTaxRevenue(inputs);
    const baseline = calculateTaxRevenue(defaultTaxInputs());
    expect(result.corpTaxRevenue).toBeGreaterThan(baseline.corpTaxRevenue);
  });

  it('tax avoidance reduces revenue at high additional rate', () => {
    const inputs = defaultTaxInputs();
    inputs.incomeTaxAdditionalRate = 60;
    const result = calculateTaxRevenue(inputs);
    const noAvoidance = calculateTaxRevenue({
      ...inputs,
      taxAvoidanceScale: 0,
    });
    expect(result.incomeTaxRevenue).toBeLessThan(noAvoidance.incomeTaxRevenue);
  });

  it('tax avoidance reduces revenue at high corporation tax', () => {
    const inputs = defaultTaxInputs();
    inputs.corporationTaxRate = 40;
    const result = calculateTaxRevenue(inputs);
    const noAvoidance = calculateTaxRevenue({
      ...inputs,
      taxAvoidanceScale: 0,
    });
    expect(result.corpTaxRevenue).toBeLessThan(noAvoidance.corpTaxRevenue);
  });

  it('VAT behavioral response reduces revenue at high rates', () => {
    const inputs = defaultTaxInputs();
    inputs.vatRate = 30;
    const result = calculateTaxRevenue(inputs);
    const noBehavioral = calculateTaxRevenue({
      ...inputs,
      taxAvoidanceScale: 0,
    });
    expect(result.vatRevenue).toBeLessThan(noBehavioral.vatRevenue);
  });

  it('fiscal drag increases revenue when thresholds frozen', () => {
    const inputs = defaultTaxInputs();
    inputs.thresholdFreezeMonths = 24;
    const result = calculateTaxRevenue(inputs);
    const baseline = calculateTaxRevenue(defaultTaxInputs());
    expect(result.incomeTaxRevenue).toBeGreaterThan(baseline.incomeTaxRevenue);
  });

  it('revenue scales with GDP growth', () => {
    const inputs = defaultTaxInputs();
    inputs.gdpNominal_bn = 3000;
    const result = calculateTaxRevenue(inputs);
    const baseline = calculateTaxRevenue(defaultTaxInputs());
    expect(result.totalRevenue_bn).toBeGreaterThan(baseline.totalRevenue_bn);
  });
});

// ===========================
// Debt Dynamics Tests
// ===========================

function defaultDebtInputs(): DebtInputs {
  return {
    debtNominal_bn: 2540,
    totalRevenue_bn: 1090,
    totalSpending_bn: 1100,
    gdpNominal_bn: 2750,
    bankRate: 5.25,
    inflationCPI: 2.2,
    debtMaturityProfile: {
      shortTerm_bn: 508,
      shortTermCoupon: 5.25,
      medium_bn: 889,
      mediumCoupon: 3.5,
      longTerm_bn: 762,
      longTermCoupon: 3.0,
      indexLinked_bn: 635,
    },
    debtInterestReduction: 0,
    emergencyRebuildingCosts: 0,
    welfareAMEAutoGrowth_bn: 0,
    fpcConstraintCost_bn: 0,
    barnettConsequentials_bn: 0,
    industrialStrategyCost_bn: 0,
    localGovernmentGrantCost_bn: 0,
    capitalPreparationCost_bn: 0,
  };
}

describe('calculateDebtDynamics', () => {
  it('returns plausible debt interest at baseline', () => {
    const result = calculateDebtDynamics(defaultDebtInputs());
    expect(result.debtInterest_bn).toBeGreaterThan(50);
    expect(result.debtInterest_bn).toBeLessThan(200);
  });

  it('deficit is positive when spending exceeds revenue', () => {
    const result = calculateDebtDynamics(defaultDebtInputs());
    expect(result.deficit_bn).toBeGreaterThan(0);
  });

  it('debt increases when there is a deficit', () => {
    const result = calculateDebtDynamics(defaultDebtInputs());
    expect(result.debtNominal_bn).toBeGreaterThan(2540);
  });

  it('debt decreases when there is a surplus', () => {
    const inputs = defaultDebtInputs();
    inputs.totalRevenue_bn = 1200;
    const result = calculateDebtDynamics(inputs);
    expect(result.debtNominal_bn).toBeLessThan(2540);
  });

  it('debt interest rises when bank rate rises', () => {
    const inputs = defaultDebtInputs();
    inputs.bankRate = 6.0;
    const result = calculateDebtDynamics(inputs);
    const baseline = calculateDebtDynamics(defaultDebtInputs());
    expect(result.debtInterest_bn).toBeGreaterThan(baseline.debtInterest_bn);
  });

  it('emergency costs increase total expenditure', () => {
    const inputs = defaultDebtInputs();
    inputs.emergencyRebuildingCosts = 5;
    const result = calculateDebtDynamics(inputs);
    const baseline = calculateDebtDynamics(defaultDebtInputs());
    expect(result.totalManagedExpenditure).toBeGreaterThan(baseline.totalManagedExpenditure);
  });
});
