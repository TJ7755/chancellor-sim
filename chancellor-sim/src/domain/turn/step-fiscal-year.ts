import { GameState } from '../../types';
import { checkAnnualGrowthPledges, applyManifestoViolations } from '../../manifesto-system';

export function processStepFiscalYear(state: GameState): GameState {
  const { metadata, fiscal, manifesto, economic } = state;
  const currentMonth = metadata.currentMonth;

  if (currentMonth === 4 && metadata.currentTurn > 0) {
    const violatedPledges = checkAnnualGrowthPledges(manifesto, fiscal, economic.inflationCPI);

    let newManifesto = manifesto;
    if (violatedPledges.length > 0) {
      newManifesto = applyManifestoViolations(manifesto, violatedPledges, metadata.currentTurn);
    }

    const newFiscalState = {
      ...fiscal,
      currentFiscalYear: fiscal.currentFiscalYear + 1,
      fiscalYearStartTurn: metadata.currentTurn,
      fiscalYearStartSpending: { ...fiscal.spending },
    };

    return {
      ...state,
      fiscal: newFiscalState,
      manifesto: newManifesto,
    };
  }

  return state;
}
