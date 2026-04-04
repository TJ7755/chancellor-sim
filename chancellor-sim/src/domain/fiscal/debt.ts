// Pure debt dynamics calculation extracted from turn-processor.ts.
// Accepts narrow inputs and returns narrow outputs for unit testability.

export interface DebtInputs {
  debtNominal_bn: number;
  totalRevenue_bn: number;
  totalSpending_bn: number;
  gdpNominal_bn: number;
  bankRate: number;
  inflationCPI: number;
  debtMaturityProfile: {
    shortTerm_bn: number;
    shortTermCoupon: number;
    medium_bn: number;
    mediumCoupon: number;
    longTerm_bn: number;
    longTermCoupon: number;
    indexLinked_bn: number;
  };
  debtInterestReduction: number;
  emergencyRebuildingCosts: number;
  welfareAMEAutoGrowth_bn: number;
  fpcConstraintCost_bn: number;
  barnettConsequentials_bn: number;
  industrialStrategyCost_bn: number;
  localGovernmentGrantCost_bn: number;
  capitalPreparationCost_bn: number;
}

export interface DebtResult {
  debtInterest_bn: number;
  totalManagedExpenditure: number;
  deficit_bn: number;
  deficitPctGDP: number;
  debtNominal_bn: number;
  debtPctGDP: number;
}

export function calculateDebtDynamics(inputs: DebtInputs): DebtResult {
  const profile = inputs.debtMaturityProfile;
  const debtInterestFromBuckets =
    (profile.shortTerm_bn * inputs.bankRate) / 100 +
    (profile.medium_bn * profile.mediumCoupon) / 100 +
    (profile.longTerm_bn * profile.longTermCoupon) / 100 +
    (profile.indexLinked_bn * (inputs.inflationCPI + 0.5)) / 100;

  const debtInterest_bn = debtInterestFromBuckets * (1 - inputs.debtInterestReduction / 100);

  let totalManagedExpenditure = inputs.totalSpending_bn + debtInterest_bn;
  totalManagedExpenditure += inputs.emergencyRebuildingCosts;
  totalManagedExpenditure += inputs.welfareAMEAutoGrowth_bn;
  totalManagedExpenditure += inputs.fpcConstraintCost_bn;
  totalManagedExpenditure += inputs.barnettConsequentials_bn;
  totalManagedExpenditure += inputs.industrialStrategyCost_bn;
  totalManagedExpenditure += inputs.localGovernmentGrantCost_bn;
  totalManagedExpenditure += inputs.capitalPreparationCost_bn;

  const deficit_bn = totalManagedExpenditure - inputs.totalRevenue_bn;
  const deficitPctGDP = (deficit_bn / inputs.gdpNominal_bn) * 100;

  const newDebt = inputs.debtNominal_bn + deficit_bn / 12;
  const debtPctGDP = (newDebt / inputs.gdpNominal_bn) * 100;

  return {
    debtInterest_bn,
    totalManagedExpenditure,
    deficit_bn,
    deficitPctGDP,
    debtNominal_bn: newDebt,
    debtPctGDP,
  };
}
