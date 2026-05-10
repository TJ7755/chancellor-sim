export interface BarnettInputs {
  spendingProposedBudgets: Map<string, { proposedBudget: number; currentBudget: number }>;
  detailedSpending: Array<{ id: string; currentBudget: number }>;
}

export interface BarnettResult {
  scotland_bn: number;
  wales_bn: number;
  northernIreland_bn: number;
  total_bn: number;
  perDepartment: Record<string, { scotland: number; wales: number; northernIreland: number }>;
}

export function calculateBarnettConsequentials(
  inputs: BarnettInputs
): BarnettResult {
  const { spendingProposedBudgets, detailedSpending } = inputs;

  const nhsCurrent =
    spendingProposedBudgets.get('nhsEngland')?.proposedBudget ??
    (detailedSpending.find((item) => item.id === 'nhsEngland')?.currentBudget || 164.9);
  const educationCurrent =
    spendingProposedBudgets.get('schools')?.proposedBudget ??
    (detailedSpending.find((item) => item.id === 'schools')?.currentBudget || 59.8);
  const transportHousing =
    (spendingProposedBudgets.get('railSubsidy')?.proposedBudget ?? 5.5) +
    (spendingProposedBudgets.get('housingCapital')?.proposedBudget ?? 2.5);
  const baselineTransportHousing = 5.5 + 2.5;
  const comparableChange =
    nhsCurrent - 164.9 + (educationCurrent - 59.8) + (transportHousing - baselineTransportHousing);

  const scotland = comparableChange * 0.0998;
  const wales = comparableChange * 0.0597;
  const northernIreland = comparableChange * 0.0348;

  const perDepartment: Record<string, { scotland: number; wales: number; northernIreland: number }> = {};

  const nhsDelta = nhsCurrent - 164.9;
  if (Math.abs(nhsDelta) > 0.01) {
    perDepartment['nhsEngland'] = {
      scotland: nhsDelta * 0.0998,
      wales: nhsDelta * 0.0597,
      northernIreland: nhsDelta * 0.0348,
    };
  }

  const eduDelta = educationCurrent - 59.8;
  if (Math.abs(eduDelta) > 0.01) {
    perDepartment['schools'] = {
      scotland: eduDelta * 0.0998,
      wales: eduDelta * 0.0597,
      northernIreland: eduDelta * 0.0348,
    };
  }

  const transportDelta = transportHousing - baselineTransportHousing;
  if (Math.abs(transportDelta) > 0.01) {
    perDepartment['transport_housing'] = {
      scotland: transportDelta * 0.0998,
      wales: transportDelta * 0.0597,
      northernIreland: transportDelta * 0.0348,
    };
  }

  return {
    scotland_bn: scotland,
    wales_bn: wales,
    northernIreland_bn: northernIreland,
    total_bn: scotland + wales + northernIreland,
    perDepartment,
  };
}
