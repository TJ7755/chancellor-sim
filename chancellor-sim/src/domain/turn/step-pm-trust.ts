import { GameState } from '../../types';
import { getAdviserBonuses } from './shared-helpers';

type ExtendedDifficultySettings = {
  pmTrustSensitivity: number;
};

export function processStepPMTrust(state: GameState, difficultySettings: ExtendedDifficultySettings): GameState {
  const { political, manifesto, fiscal, markets } = state;
  const bonuses = getAdviserBonuses(state);

  let pmTrust = political.pmTrust;

  const approvalEffect = (political.governmentApproval - 40) * 0.15;

  const manifestoEffect = -manifesto.totalViolations * 1.5;

  const fiscalEffect =
    fiscal.deficitPctGDP > 6 ? -1.5 : fiscal.deficitPctGDP > 5 ? -0.8 : fiscal.deficitPctGDP < 3 ? 0.3 : 0;

  const marketEffect = markets.giltYield10y > 6 ? -2.5 : markets.giltYield10y > 5 ? -0.8 : 0;
  const obrHeadroomEffect =
    state.obr.fiscalHeadroomForecast_bn < 0 ? -0.5 : state.obr.fiscalHeadroomForecast_bn < 5 ? -0.2 : 0;

  const backbenchEffect = (political.backbenchSatisfaction - 50) * 0.1;

  const totalChange =
    (approvalEffect + manifestoEffect + fiscalEffect + marketEffect + backbenchEffect + obrHeadroomEffect) *
    0.3 *
    difficultySettings.pmTrustSensitivity;

  pmTrust += totalChange;

  pmTrust += (50 - pmTrust) * 0.005;

  pmTrust += bonuses.pmTrustBonus;

  pmTrust = Math.max(0, Math.min(100, pmTrust));

  return {
    ...state,
    political: {
      ...political,
      pmTrust,
    },
  };
}
