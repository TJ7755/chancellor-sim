// Step 17: Credit Rating

import { GameState } from '../../types';

export function processStepCreditRating(state: GameState): GameState {
  const { fiscal, political, markets } = state;

  if (state.metadata.currentTurn % 6 !== 0 || state.metadata.currentTurn === 0) {
    return state;
  }

  const currentRating = political.creditRating || 'AA-';
  const ratingScale = ['A', 'A+', 'AA-', 'AA', 'AA+', 'AAA'];
  const currentIndex = ratingScale.indexOf(currentRating);

  let score = 0;
  score += fiscal.debtPctGDP < 85 ? 2 : fiscal.debtPctGDP < 95 ? 1 : fiscal.debtPctGDP < 105 ? 0 : -1;
  score += fiscal.deficitPctGDP < 2 ? 2 : fiscal.deficitPctGDP < 3 ? 1 : fiscal.deficitPctGDP < 5 ? 0 : -1;
  score += markets.giltYield10y < 4.5 ? 1 : markets.giltYield10y < 5.5 ? 0 : -1;
  score += political.credibilityIndex > 60 ? 1 : political.credibilityIndex > 40 ? 0 : -1;

  let newIndex = currentIndex;
  if (score >= 4 && currentIndex < ratingScale.length - 1) {
    newIndex = currentIndex + 1;
  } else if (score <= -2 && currentIndex > 0) {
    newIndex = currentIndex - 1;
  }

  const newRating = ratingScale[newIndex] as GameState['political']['creditRating'];
  const outlook: GameState['political']['creditRatingOutlook'] = score >= 2 ? 'positive' : score <= -1 ? 'negative' : 'stable';

  let credibilityChange = 0;
  if (newIndex < currentIndex) credibilityChange = -10;
  if (newIndex > currentIndex) credibilityChange = 5;

  return {
    ...state,
    political: {
      ...political,
      creditRating: newRating,
      creditRatingOutlook: outlook,
      credibilityIndex: Math.max(0, Math.min(100, political.credibilityIndex + credibilityChange)),
    },
  };
}
