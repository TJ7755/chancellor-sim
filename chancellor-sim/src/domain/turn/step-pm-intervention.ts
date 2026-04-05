import { GameState } from '../../types';
import { PMInterventionEvent } from '../../game-integration';

type ExtendedDifficultySettings = {
  pmInterventionTrustThreshold: number;
};

export function processStepPMIntervention(state: GameState, difficultySettings: ExtendedDifficultySettings, randomSeeds: number[]): GameState {
  const { political, markets, fiscal, manifesto } = state;
  let seedIdx = 0;

  if (political.pmInterventionsPending && political.pmInterventionsPending.length > 0) {
    return state;
  }

  if (political.pmTrust > difficultySettings.pmInterventionTrustThreshold) return state;

  let intervention: PMInterventionEvent | null = null;

  const pmAnger: 'concerned' | 'angry' | 'furious' =
    political.pmTrust < 25 ? 'furious' : political.pmTrust < 35 ? 'angry' : 'concerned';

  if (political.backbenchSatisfaction < 35 && randomSeeds[seedIdx++] < 0.4) {
    intervention = {
      id: `pm_${state.metadata.currentTurn}`,
      triggered: true,
      triggerReason: 'backbench_revolt',
      pmTrust: political.pmTrust,
      pmAnger,
      demandTitle: 'Backbench Rebellion Brewing',
      demandDescription:
        'The backbenches are in open revolt. We will increase a pressured frontline service budget now and lock it into the baseline.',
      complyPolicyDescription: 'Comply: permanent +GBP 3.0bn annual NHS current spending.',
      consequencesIfComply: { pmTrustChange: 10, backbenchSentimentChange: 15, publicApprovalChange: 2 },
      consequencesIfDefy: {
        pmTrustChange: -15,
        backbenchSentimentChange: -10,
        reshuffleRisk: political.pmTrust < 30 ? 60 : 30,
      },
    };
  } else if (manifesto.totalViolations > 0 && randomSeeds[seedIdx++] < 0.25) {
    intervention = {
      id: `pm_${state.metadata.currentTurn}`,
      triggered: true,
      triggerReason: 'manifesto_breach',
      pmTrust: political.pmTrust,
      pmAnger,
      demandTitle: 'Manifesto Commitment Broken',
      demandDescription:
        'We made clear promises to the electorate. You must reverse a meaningful share of the latest manifesto breach.',
      complyPolicyDescription: 'Comply: partial reversal of the latest manifesto-violating tax rise or spending cut.',
      consequencesIfComply: { pmTrustChange: 8, backbenchSentimentChange: 10, publicApprovalChange: 1 },
      consequencesIfDefy: {
        pmTrustChange: -12,
        backbenchSentimentChange: -8,
        reshuffleRisk: political.pmTrust < 30 ? 50 : 25,
      },
    };
  } else if (political.governmentApproval < 30 && randomSeeds[seedIdx++] < 0.3) {
    intervention = {
      id: `pm_${state.metadata.currentTurn}`,
      triggered: true,
      triggerReason: 'approval_collapse',
      pmTrust: political.pmTrust,
      pmAnger,
      demandTitle: 'Public Confidence Collapsing',
      demandDescription:
        'The polling is catastrophic. We need an immediate service package that voters can feel this year.',
      complyPolicyDescription: 'Comply: immediate +GBP 2.5bn annual NHS and welfare support package.',
      consequencesIfComply: { pmTrustChange: 8, backbenchSentimentChange: 12, publicApprovalChange: 3 },
      consequencesIfDefy: {
        pmTrustChange: -10,
        backbenchSentimentChange: -12,
        reshuffleRisk: political.pmTrust < 30 ? 55 : 25,
      },
    };
  } else if ((markets.giltYield10y > 6 || fiscal.debtPctGDP > 110) && randomSeeds[seedIdx++] < 0.35) {
    intervention = {
      id: `pm_${state.metadata.currentTurn}`,
      triggered: true,
      triggerReason: 'economic_crisis',
      pmTrust: political.pmTrust,
      pmAnger,
      demandTitle: 'Economic Crisis Deepening',
      demandDescription: 'The gilt market is questioning our fiscal path. We need a credible tightening package now.',
      complyPolicyDescription:
        'Comply: enforce at least GBP 5bn annual deficit reduction through spending restraint and/or revenue.',
      consequencesIfComply: { pmTrustChange: 12, backbenchSentimentChange: 5, publicApprovalChange: 1 },
      consequencesIfDefy: {
        pmTrustChange: -20,
        backbenchSentimentChange: -5,
        reshuffleRisk: political.pmTrust < 25 ? 70 : 40,
      },
    };
  } else if (state.obr.fiscalHeadroomForecast_bn < 0 && randomSeeds[seedIdx++] < 0.45) {
    intervention = {
      id: `pm_${state.metadata.currentTurn}`,
      triggered: true,
      triggerReason: 'fiscal_rule_oc',
      pmTrust: political.pmTrust,
      pmAnger,
      demandTitle: 'OBR Fiscal Rule Breach',
      demandDescription: 'The OBR has certified a breach of our fiscal rules. The markets are already reacting.',
      complyPolicyDescription: 'Comply: deliver an immediate GBP 6bn consolidation package for the next fiscal event.',
      consequencesIfComply: { pmTrustChange: 12, backbenchSentimentChange: 8, publicApprovalChange: 0.5 },
      consequencesIfDefy: {
        pmTrustChange: -18,
        backbenchSentimentChange: -8,
        reshuffleRisk: political.pmTrust < 25 ? 70 : 45,
      },
    };
  }

  if (intervention) {
    return {
      ...state,
      political: {
        ...political,
        pmInterventionsPending: [intervention],
      },
    };
  }

  return state;
}
