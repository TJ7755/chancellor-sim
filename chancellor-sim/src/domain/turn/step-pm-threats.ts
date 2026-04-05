// Step 14.6: Enforce PM Threat Deadlines

import { GameState } from '../../types';

export function processStepPMThreats(state: GameState, randomSeed: number): GameState {
  const activeThreats = state.pmRelationship.activeThreats || [];
  if (activeThreats.length === 0) return state;

  const currentTurn = state.metadata.currentTurn;
  let anyChanged = false;
  let breachedCount = 0;

  const updatedThreats = activeThreats.map((threat) => {
    if (threat.resolved || threat.breached) return threat;

    if (state.fiscal.deficit_bn <= threat.targetDeficit_bn) {
      anyChanged = true;
      return {
        ...threat,
        resolved: true,
      };
    }

    if (currentTurn > threat.deadlineTurn) {
      anyChanged = true;
      breachedCount += 1;
      return {
        ...threat,
        breached: true,
      };
    }

    return threat;
  });

  if (!anyChanged) return state;

  return {
    ...state,
    political: {
      ...state.political,
      pmTrust: Math.max(0, state.political.pmTrust - breachedCount * (10 + randomSeed * 5)),
      backbenchSatisfaction: Math.max(0, state.political.backbenchSatisfaction - breachedCount * 4),
    },
    pmRelationship: {
      ...state.pmRelationship,
      reshuffleRisk: Math.min(100, (state.pmRelationship.reshuffleRisk || 0) + breachedCount * 12),
      activeThreats: updatedThreats,
    },
  };
}
