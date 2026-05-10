// Step 11: Public Sector Pay

import { GameState } from '../../types';

export function processStepPublicSectorPay(state: GameState): GameState {
  const { economic, political } = state;

  const realWageGrowth = economic.wageGrowthAnnual - economic.inflationCPI;

  let strikeRisk = political.strikeRisk;

  if (realWageGrowth < -2.0) {
    strikeRisk = Math.min(90, strikeRisk + 5);
  } else if (realWageGrowth < 0) {
    strikeRisk = Math.min(80, strikeRisk + 2);
  } else if (realWageGrowth > 1.0) {
    strikeRisk = Math.max(10, strikeRisk - 3);
  } else {
    strikeRisk = Math.max(10, strikeRisk - 1);
  }

  return {
    ...state,
    political: {
      ...political,
      strikeRisk,
    },
  };
}
