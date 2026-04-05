// Step 18: Historical Snapshot

import { GameState } from '../../types';

export function processStepSnapshot(state: GameState): GameState {
  const snapshot = {
    turn: state.metadata.currentTurn,
    date: `${state.metadata.currentYear}-${String(state.metadata.currentMonth).padStart(2, '0')}`,
    gdpGrowth: state.economic.gdpGrowthAnnual,
    gdpNominal: Math.round(state.economic.gdpNominal_bn),
    inflation: state.economic.inflationCPI,
    unemployment: state.economic.unemploymentRate,
    deficit: state.fiscal.deficitPctGDP,
    debt: state.fiscal.debtPctGDP,
    approval: state.political.governmentApproval,
    giltYield: state.markets.giltYield10y,
    productivity: state.economic.productivityGrowthAnnual,
  };

  return {
    ...state,
    simulation: {
      ...state.simulation,
      monthlySnapshots: [...state.simulation.monthlySnapshots, snapshot].slice(-120),
    },
  };
}
