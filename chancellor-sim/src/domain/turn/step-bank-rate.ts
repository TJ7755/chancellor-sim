// Step 5: Bank of England

import { GameState } from '../../types';

export function processStepBankRate(state: GameState): GameState {
  const { economic, markets } = state;

  const realWageGap = economic.wageGrowthAnnual - economic.inflationCPI;
  const wagePressure = realWageGap > 2.0 ? realWageGap - 2.0 : 0;

  const inflationForecastSimple = economic.inflationCPI * 0.7 + (2.0 + wagePressure * 0.15) * 0.3;

  const inflationGap = inflationForecastSimple - 2.0;
  const outputGap = economic.gdpGrowthAnnual - 1.0;

  const currentRate = markets.bankRate;
  const members = (markets.mpcMembers || []).map((member) => ({ ...member }));
  const stanceBias = (stance: 'dovish' | 'neutral' | 'hawkish'): number => {
    if (stance === 'dovish') return -0.35;
    if (stance === 'hawkish') return 0.35;
    return 0;
  };

  let cutVotes = 0;
  let holdVotes = 0;
  let hikeVotes = 0;
  members.forEach((member) => {
    const memberTaylor =
      3.25 +
      (1.1 + member.inflationWeight) * inflationGap +
      (0.6 + (1 - member.inflationWeight) * 0.3) * outputGap +
      stanceBias(member.stance as 'dovish' | 'neutral' | 'hawkish');
    const preferredRate = Math.round(Math.max(0.1, Math.min(8.0, memberTaylor)) * 4) / 4;
    const delta = preferredRate - currentRate;
    let vote: 'cut' | 'hold' | 'hike' = 'hold';
    if (delta > 0.2) vote = 'hike';
    if (delta < -0.2) vote = 'cut';
    member.vote = vote;
    if (vote === 'cut') cutVotes += 1;
    else if (vote === 'hike') hikeVotes += 1;
    else holdVotes += 1;
  });

  let decision: 'cut' | 'hold' | 'hike' = 'hold';
  if (hikeVotes > holdVotes && hikeVotes > cutVotes) decision = 'hike';
  else if (cutVotes > holdVotes && cutVotes > hikeVotes) decision = 'cut';
  else if ((hikeVotes === holdVotes || cutVotes === holdVotes) && members.some((m) => m.role === 'Governor')) {
    const governorVote = members.find((m) => m.role === 'Governor')?.vote || 'hold';
    decision = governorVote as 'cut' | 'hold' | 'hike';
  }

  let newRate = currentRate;
  if (decision === 'hike') newRate = currentRate + 0.25;
  if (decision === 'cut') newRate = currentRate - 0.25;
  newRate = Math.round(Math.max(0.1, Math.min(8.0, newRate)) * 4) / 4;

  const qtShouldPause =
    state.markets.giltYield10y > 6.2 || state.externalSector.externalShockType === 'banking_sector_stress';
  const qtPausedTurns = qtShouldPause ? 2 : Math.max(0, (markets.qtPausedTurns || 0) - 1);
  const qtRundown = qtPausedTurns > 0 ? 0 : 1.8;
  const assetPurchaseFacility_bn = Math.max(0, (markets.assetPurchaseFacility_bn || 875) - qtRundown);
  const voteBreakdown = `${Math.max(hikeVotes, cutVotes, holdVotes)}-${9 - Math.max(hikeVotes, cutVotes, holdVotes)} to ${decision}`;

  return {
    ...state,
    markets: {
      ...markets,
      bankRate: newRate,
      mpcMembers: members,
      lastMPCDecision: decision,
      lastMPCVoteBreakdown: voteBreakdown,
      assetPurchaseFacility_bn,
      qtPausedTurns,
    },
  };
}
