// Step 4: Wage Growth

import { GameState } from '../../types';

export function processStepWages(state: GameState): GameState {
  const { economic } = state;

  const inflationExpectation = economic.inflationExpectations ?? economic.inflationCPI;
  const labourTightness = Math.max(0, 4.25 - economic.unemploymentRate);

  let wageGrowth = inflationExpectation * 1.0 + economic.productivityGrowthAnnual + labourTightness * 0.8;

  const currentWageGrowth = economic.wageGrowthAnnual;
  wageGrowth = currentWageGrowth + (wageGrowth - currentWageGrowth) * 0.2;

  wageGrowth = Math.max(0, Math.min(15.0, wageGrowth));

  return {
    ...state,
    economic: {
      ...economic,
      wageGrowthAnnual: wageGrowth,
    },
  };
}
