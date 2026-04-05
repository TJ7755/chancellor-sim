// Step 7: Spending Effects

import { GameState } from '../../types';
import { AdviserBonuses } from './shared-helpers';

const DEPARTMENTAL_SPENDING_KEYS = [
  'nhs',
  'education',
  'defence',
  'welfare',
  'infrastructure',
  'police',
  'justice',
  'other',
] as const;

export function processStepSpending(state: GameState, adviserBonuses: AdviserBonuses): GameState {
  const { fiscal, economic } = state;

  const baselineUnemployment = 4.2;
  const unemploymentExcess = Math.max(0, economic.unemploymentRate - baselineUnemployment);
  const autoWelfareIncrease = unemploymentExcess * 5.0;

  const adjustedSpending = {
    ...fiscal.spending,
    welfare: fiscal.spending.welfare + autoWelfareIncrease,
  };

  const departmentalSpending = DEPARTMENTAL_SPENDING_KEYS.reduce((sum, key) => sum + adjustedSpending[key], 0);

  return {
    ...state,
    fiscal: {
      ...fiscal,
      totalSpending_bn: departmentalSpending,
    },
  };
}
