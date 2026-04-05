// Step 19: Game Over Check

import { GameState } from '../../types';
import { DifficultySettings } from '../game/difficulty';

export function processStepGameOver(state: GameState, difficultySettings: DifficultySettings): GameState {
  let s = checkGameOver(state, difficultySettings);
  s = decaySpendingReviewBonus(s);
  return s;
}

function checkGameOver(state: GameState, difficulty: DifficultySettings): GameState {
  const { political, metadata, markets, fiscal } = state;

  if (political.pmTrust < difficulty.gameOverThresholds.pmTrustMinimum) {
    return {
      ...state,
      metadata: {
        ...metadata,
        gameOver: true,
        gameOverReason:
          'The Prime Minister has lost all confidence in your ability to manage the economy. You have been removed from office.',
      },
    };
  }

  if (political.backbenchSatisfaction < difficulty.gameOverThresholds.backbenchSatisfactionMinimum) {
    const revoltProbability = political.backbenchSatisfaction < difficulty.gameOverThresholds.backbenchSatisfactionMinimum - 10 ? 0.6 : 0.3;
    if (Math.random() < revoltProbability) {
      return {
        ...state,
        metadata: {
          ...metadata,
          gameOver: true,
          gameOverReason:
            'A backbench revolt has forced your resignation. Your party has lost confidence in your economic management.',
        },
      };
    }
  }

  if (markets.giltYield10y > difficulty.gameOverThresholds.giltYieldMaximum) {
    return {
      ...state,
      metadata: {
        ...metadata,
        gameOver: true,
        gameOverReason:
          'Gilt yields have surged above 7.5%. The UK faces a sovereign debt crisis. An emergency government has been formed without you.',
      },
    };
  }

  if (fiscal.debtPctGDP > difficulty.gameOverThresholds.debtPctGDPMaximum) {
    return {
      ...state,
      metadata: {
        ...metadata,
        gameOver: true,
        gameOverReason:
          'UK national debt has exceeded 120% of GDP. The IMF has been called in. Your chancellorship is over.',
      },
    };
  }

  return state;
}

function decaySpendingReviewBonus(state: GameState): GameState {
  const current = state.spendingReview?.srCredibilityBonus || 0;
  if (current <= 0) return state;
  return {
    ...state,
    spendingReview: {
      ...state.spendingReview,
      srCredibilityBonus: Math.max(0, current - 1),
    },
  };
}
