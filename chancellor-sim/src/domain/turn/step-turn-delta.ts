// Step 18.6: Turn Delta
import { GameState } from '../../types';

import { TurnDelta, TurnDeltaDriver } from '../../game-integration';
import { round1 } from './shared-helpers';

export function processStepTurnDelta(state: GameState, startOfTurnSnapshot: Partial<GameState>): GameState {
  const previousState = startOfTurnSnapshot as GameState;
  const approvalDrivers: TurnDeltaDriver[] = [
    { name: 'NHS quality', value: (state.services.nhsQuality - previousState.services.nhsQuality) * 0.12 },
    {
      name: 'Unemployment gap',
      value: (previousState.economic.unemploymentRate - state.economic.unemploymentRate) * 0.6,
    },
    { name: 'Inflation pressure', value: (previousState.economic.inflationCPI - state.economic.inflationCPI) * 0.5 },
    {
      name: 'Manifesto penalty',
      value: (previousState.manifesto.totalViolations - state.manifesto.totalViolations) * 1.2,
    },
    {
      name: 'Real wages',
      value:
        (state.economic.wageGrowthAnnual -
          state.economic.inflationCPI -
          (previousState.economic.wageGrowthAnnual - previousState.economic.inflationCPI)) *
        0.4,
    },
  ];
  const sortedApproval = [...approvalDrivers].sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  const approvalPositive = sortedApproval
    .filter((item) => item.value > 0)
    .slice(0, 3)
    .map((item) => ({ ...item, value: round1(item.value) }));
  const approvalNegative = sortedApproval
    .filter((item) => item.value < 0)
    .slice(0, 3)
    .map((item) => ({ ...item, value: round1(item.value) }));

  const giltDrivers: TurnDeltaDriver[] = [
    {
      name: 'Debt premium',
      value:
        Math.max(0, state.fiscal.debtPctGDP - 90) * 0.02 - Math.max(0, previousState.fiscal.debtPctGDP - 90) * 0.02,
    },
    {
      name: 'Deficit premium',
      value:
        Math.max(0, state.fiscal.deficitPctGDP - 3) * 0.15 - Math.max(0, previousState.fiscal.deficitPctGDP - 3) * 0.15,
    },
    {
      name: 'Credibility',
      value: (previousState.political.credibilityIndex - state.political.credibilityIndex) * 0.008,
    },
  ].map((item) => ({ ...item, value: round1(item.value) }));

  const deficitDrivers: TurnDeltaDriver[] = [
    { name: 'Revenue delta', value: round1(state.fiscal.totalRevenue_bn - previousState.fiscal.totalRevenue_bn) },
    { name: 'Spending delta', value: round1(-(state.fiscal.totalSpending_bn - previousState.fiscal.totalSpending_bn)) },
    { name: 'Interest delta', value: round1(-(state.fiscal.debtInterest_bn - previousState.fiscal.debtInterest_bn)) },
  ];
  if (state.spendingReview?.lastDeliveryRiskEvents?.length) {
    const label = `DEL risk: ${state.spendingReview.lastDeliveryRiskEvents[0]}`;
    deficitDrivers.push({ name: label, value: 0 });
  }
  if (Math.abs(state.fiscal.barnettConsequentials_bn || 0) > 0.01) {
    deficitDrivers.push({ name: `Barnett: +£${(state.fiscal.barnettConsequentials_bn || 0).toFixed(1)}bn`, value: 0 });
  }
  if ((state.capitalDelivery.deferredCapital_bn || 0) > 0.01) {
    deficitDrivers.push({
      name: `Capital delivery cap: £${(state.capitalDelivery.deferredCapital_bn || 0).toFixed(1)}bn deferred`,
      value: 0,
    });
  }
  deficitDrivers.push({
    name: `OBR headroom: £${(state.obr.fiscalHeadroomForecast_bn ?? state.fiscal.fiscalHeadroom_bn).toFixed(1)}bn`,
    value: 0,
  });
  const delayedItem = (state.legislativePipeline.queue || []).find((item) => item.status === 'delayed');
  if (delayedItem) {
    deficitDrivers.push({ name: `HMRC delay: ${delayedItem.measureId}`, value: 0 });
  }

  const lastTurnDelta: TurnDelta = {
    approvalChange: round1(state.political.governmentApproval - previousState.political.governmentApproval),
    approvalDriversPositive: approvalPositive,
    approvalDriversNegative: approvalNegative,
    giltYieldChange: round1(state.markets.giltYield10y - previousState.markets.giltYield10y),
    giltYieldDrivers: giltDrivers,
    deficitChange: round1(state.fiscal.deficit_bn - previousState.fiscal.deficit_bn),
    deficitDrivers,
  };

  return {
    ...state,
    simulation: {
      ...state.simulation,
      lastTurnDelta,
    },
  };
}
