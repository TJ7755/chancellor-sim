// Step 14.5: Fiscal Framework Change Consequences

import { GameState } from '../../types';
import { getDifficultySettings } from '../game/difficulty';

export function processStepFiscalFramework(state: GameState): GameState {
  const { political } = state;
  if (!political.fiscalRuleChangedLastTurn) {
    const remaining = political.fiscalRuleUturnReactionTurnsRemaining || 0;
    if (remaining <= 0) return state;
    return {
      ...state,
      political: {
        ...political,
        fiscalRuleUturnReactionTurnsRemaining: remaining - 1,
      },
    };
  }

  const difficulty = getDifficultySettings(state.metadata.difficultyMode || 'standard');
  const changeCount = Math.max(1, political.fiscalRuleChangeCount || 1);
  const escalation = Math.pow(2, Math.max(0, changeCount - 1));
  const baseCredibilityHit = (15 + Math.random() * 10) * difficulty.marketReactionScale;
  const credibilityHit = baseCredibilityHit * escalation;
  const yieldShock = (0.3 + Math.random() * 0.2) * difficulty.marketReactionScale;

  const newspaper = {
    newspaper: {
      name: 'Financial Times',
      bias: 'financial',
      style: 'broadsheet',
      priorities: ['markets', 'debt', 'growth', 'monetary_policy', 'international_trade'],
    },
    headline: 'Chancellor performs fiscal framework U-turn as market nerves rise',
    subheading: 'Analysts warn that repeated rule changes risk permanent credibility damage in gilts and sterling.',
    paragraphs: [
      'The Treasury has changed its fiscal framework mid-parliament, prompting immediate criticism from opposition parties and several Labour backbenchers.',
      'Market participants said the move may increase risk premia unless the government quickly demonstrates a coherent medium-term plan.',
    ],
    oppositionQuote: {
      speaker: 'Shadow Chancellor',
      quote: 'You cannot rebuild trust by rewriting the rules whenever they become uncomfortable.',
      party: 'Conservative' as const,
    },
    month: state.metadata.currentMonth,
    date: new Date(state.metadata.currentYear, state.metadata.currentMonth - 1, 1),
    isSpecialEdition: true,
  };

  return {
    ...state,
    political: {
      ...political,
      credibilityIndex: Math.max(0, political.credibilityIndex - credibilityHit),
      pmTrust: Math.max(0, political.pmTrust - 8),
      backbenchSatisfaction: Math.max(0, political.backbenchSatisfaction - 5),
      fiscalRuleChangedLastTurn: false,
      fiscalRuleYieldShock_pp: (political.fiscalRuleYieldShock_pp || 0) + yieldShock,
      fiscalRuleYieldShockMonthsRemaining: Math.max(6, political.fiscalRuleYieldShockMonthsRemaining || 0),
      fiscalRuleUturnReactionTurnsRemaining: 3,
    },
    events: {
      ...state.events,
      currentNewspaper: newspaper,
      eventLog: [
        ...(state.events.eventLog || []),
        {
          event: {
            id: `fiscal_rule_uturn_${state.metadata.currentTurn}`,
            type: 'political',
            title: 'Fiscal framework U-turn',
            description: 'Government changed fiscal framework mid-term.',
            active: false,
          },
          resolved: true,
          newsArticle: newspaper,
        },
      ],
    },
  };
}
