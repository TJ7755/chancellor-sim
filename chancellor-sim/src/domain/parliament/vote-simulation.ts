import type { MPProfile, MPSystemState, DetailedMPStance, MPPromise, BudgetChanges } from '../../mp-system';
import { calculateAllMPStances, getPartyName } from '../../mp-system';

export interface ParliamentaryVoteInputs {
  mpSystem: {
    allMPs: Map<string, MPProfile>;
    promises: Map<string, MPPromise>;
    currentBudgetSupport: Map<string, DetailedMPStance>;
  };
  budgetChanges: BudgetChanges;
  manifestoViolations: string[];
  currentMonth: number;
}

export interface ParliamentaryVoteResult {
  ayes: number;
  noes: number;
  abstentions: number;
  governmentMajority: number;
  passed: boolean;
  rebellCount: number;
  oppositionVotes: number;
  narrativeSummary: string;
  keyRebels: string[];
  whipAssessment: string;
  individualVotes: Map<string, 'aye' | 'noe' | 'abstain'>;
}

export function simulateParliamentaryVote(
  inputs: ParliamentaryVoteInputs
): ParliamentaryVoteResult {
  const { mpSystem, budgetChanges, manifestoViolations, currentMonth } = inputs;

  let ayesCount = 0;
  let noesCount = 0;
  let abstentionsCount = 0;
  const voteChoices = new Map<string, 'aye' | 'noe' | 'abstain'>();
  const keyRebels: string[] = [];

  const stances = calculateAllMPStances(
    mpSystem as unknown as MPSystemState,
    budgetChanges,
    manifestoViolations
  );
  const namedNarratives: string[] = [];

  mpSystem.allMPs.forEach((mp, mpId) => {
    const stance = stances.get(mpId);

    if (mp.party === 'sinn_fein') {
      voteChoices.set(mpId, 'abstain');
      abstentionsCount++;
    } else if (mp.party !== 'labour') {
      voteChoices.set(mpId, 'noe');
      noesCount++;
    } else {
      const mpStanceLabel = typeof stance === 'string' ? stance : stance?.stance;

      if (mpStanceLabel === 'support') {
        const hasDeal = Array.from(mpSystem.promises.values()).some(
          (promise) => promise.promisedToMPs.includes(mpId) && !promise.broken
        );
        const dealComplianceProbability =
          mp.dealComplianceProbability ??
          Math.max(
            0.55,
            Math.min(0.9, 0.8 - mp.traits.rebelliousness * 0.02 + (mp.constituency.marginality > 70 ? 0.05 : 0))
          );

        const ayeChance = hasDeal
          ? dealComplianceProbability
          : mp.isMinister
            ? 0.995
            : 0.9 - mp.traits.rebelliousness * 0.01;
        if (Math.random() < ayeChance) {
          voteChoices.set(mpId, 'aye');
          ayesCount++;
        } else {
          if (hasDeal && Math.random() < 0.45) {
            voteChoices.set(mpId, 'noe');
            noesCount++;
            keyRebels.push(mp.name);
          } else {
            voteChoices.set(mpId, 'abstain');
            abstentionsCount++;
          }
        }
      } else if (mpStanceLabel === 'oppose') {
        const noVoteChance = mp.isMinister
          ? 0.55 + mp.traits.principled * 0.02
          : 0.72 + mp.traits.principled * 0.02 + mp.traits.rebelliousness * 0.01;
        if (Math.random() < Math.min(0.97, noVoteChance)) {
          voteChoices.set(mpId, 'noe');
          noesCount++;
          keyRebels.push(mp.name);
        } else {
          voteChoices.set(mpId, 'abstain');
          abstentionsCount++;
        }
      } else {
        const roll = Math.random();
        const ayeThreshold = 0.55 - mp.traits.rebelliousness * 0.015 + (mp.isMinister ? 0.25 : 0);
        const abstainThreshold = ayeThreshold + 0.3;

        if (roll < Math.max(0.2, Math.min(0.92, ayeThreshold))) {
          voteChoices.set(mpId, 'aye');
          ayesCount++;
        } else if (roll < Math.max(0.45, Math.min(0.97, abstainThreshold))) {
          voteChoices.set(mpId, 'abstain');
          abstentionsCount++;
        } else {
          voteChoices.set(mpId, 'noe');
          noesCount++;
          keyRebels.push(mp.name);
        }
      }
    }
  });

  const governmentMajority = ayesCount - noesCount;
  const passed = governmentMajority > 0;

  let oppositionVoteCount = 0;
  mpSystem.allMPs.forEach((mp) => {
    if (mp.party !== 'labour' && mp.party !== 'sinn_fein') {
      oppositionVoteCount++;
    }
  });
  const rebellCount = Math.max(0, noesCount + abstentionsCount - oppositionVoteCount - 7);

  let narrativeSummary: string;
  const labourNoes = Math.max(0, noesCount - oppositionVoteCount);
  const profileIndex = (Math.abs(governmentMajority) + labourNoes + abstentionsCount + manifestoViolations.length) % 3;

  const taxPressureSignals = [
    budgetChanges.niEmployerChange ?? 0,
    budgetChanges.vatChange ?? 0,
    budgetChanges.detailedTaxRates?.vatDomesticEnergy ?? 0,
  ].filter((value) => value > 0).length;

  const spendingCutSignals = Object.values(budgetChanges.detailedSpendingBudgets || {}).filter(
    (value) => typeof value === 'number' && value < -0.25
  ).length;

  const pressurePoints: string[] = [];
  if (manifestoViolations.length > 0) {
    pressurePoints.push(
      `${manifestoViolations.length} manifesto breach${manifestoViolations.length === 1 ? '' : 'es'}`
    );
  }
  if (taxPressureSignals >= 2) {
    pressurePoints.push('tax package backlash');
  }
  if (spendingCutSignals >= 2) {
    pressurePoints.push('departmental cuts resistance');
  }
  if (abstentionsCount >= 20) {
    pressurePoints.push('soft dissent via abstentions');
  }

  const pressureSummary = pressurePoints.length > 0 ? ` Pressure points: ${pressurePoints.join(', ')}.` : '';

  if (!passed) {
    const defeatLeads = [
      `The Budget is defeated by ${Math.abs(governmentMajority)} votes after support collapsed across Labour backbenches.`,
      `The Commons rejects the Budget by ${Math.abs(governmentMajority)} votes, exposing a failed whipping operation.`,
      `The government loses the division by ${Math.abs(governmentMajority)} votes in a major parliamentary reverse.`,
    ];
    narrativeSummary = `${defeatLeads[profileIndex]} ${labourNoes} Labour MP${labourNoes === 1 ? '' : 's'} voted against${abstentionsCount > 0 ? ` and ${abstentionsCount} abstained` : ''}.${pressureSummary} No.10 now expects an immediate revised package.`;
  } else if (governmentMajority < 20) {
    const narrowWinLeads = [
      `The Budget scrapes through by ${governmentMajority} votes.`,
      `The government survives by only ${governmentMajority} votes.`,
      `The Budget passes on a thin margin of ${governmentMajority}.`,
    ];
    narrativeSummary = `${narrowWinLeads[profileIndex]} ${labourNoes} Labour MP${labourNoes === 1 ? '' : 's'} voted against${abstentionsCount > 0 ? ` with ${abstentionsCount} abstentions` : ''}.${pressureSummary}`;
  } else if (labourNoes > 20) {
    const largeDissentLeads = [
      `The Budget passes with a majority of ${governmentMajority}, but a major backbench split (${labourNoes} Labour MPs) dominates the aftermath.`,
      `The division is won by ${governmentMajority}, yet ${labourNoes} Labour MPs break the whip in a major display of dissent.`,
      `The government carries the vote by ${governmentMajority}, but ${labourNoes} Labour noes point to a deep internal fracture.`,
    ];
    narrativeSummary = `${largeDissentLeads[profileIndex]}${pressureSummary}`;
  } else if (labourNoes > 5 || abstentionsCount > 12) {
    narrativeSummary = `The Budget passes with a comfortable majority of ${governmentMajority}. Dissent is noticeable (${labourNoes} Labour noes${abstentionsCount > 0 ? `, ${abstentionsCount} abstentions` : ''}) and will require political follow-up.${pressureSummary}`;
  } else {
    const unityLeads = [
      `The Budget passes with a commanding majority of ${governmentMajority} and strong party discipline.`,
      `A majority of ${governmentMajority} delivers the Budget with only limited Labour defections.`,
      `The government secures a clear majority of ${governmentMajority}; the whips contain resistance effectively.`,
    ];
    narrativeSummary = `${unityLeads[profileIndex]}${pressureSummary}`;
  }

  const keyRebelsNarrative: string[] = [];
  if (labourNoes > 30) {
    keyRebelsNarrative.push('A large group of left-wing MPs voted against, citing broken manifesto commitments');
  }
  if (labourNoes > 15 && budgetChanges.niEmployerChange && budgetChanges.niEmployerChange > 0) {
    keyRebelsNarrative.push('Several MPs in marginal seats rebelled over tax increases affecting their constituents');
  }
  if (labourNoes > 8 && (budgetChanges.detailedSpendingBudgets?.nhsMentalHealth || 0) < -0.3) {
    keyRebelsNarrative.push(
      'MPs from areas with high mental health caseloads rebelled over cuts to mental health budgets'
    );
  }
  if (labourNoes > 8 && (budgetChanges.detailedSpendingBudgets?.prisonsAndProbation || 0) < -0.2) {
    keyRebelsNarrative.push(
      'Justice-focused MPs warned that reducing prisons funding would worsen overcrowding and voted against'
    );
  }
  if (
    labourNoes > 10 &&
    ((budgetChanges.detailedTaxRates?.vatDomesticEnergy || 0) > 0 || (budgetChanges.vatChange || 0) > 0)
  ) {
    keyRebelsNarrative.push(
      'Cost-of-living MPs cited higher VAT burdens on household essentials and opposed the Budget'
    );
  }
  if (abstentionsCount > 10) {
    keyRebelsNarrative.push(
      'A significant number of MPs abstained, signalling deep unease within the parliamentary party'
    );
  }
  if (manifestoViolations.length > 0) {
    keyRebelsNarrative.push('Fiscal hawks within the party voted against after manifesto violations');
  }

  const candidateNarratives = Array.from(mpSystem.allMPs.values())
    .filter((mp) => mp.party === 'labour')
    .map((mp) => {
      const stance = stances.get(mp.id);
      if (!stance || typeof stance === 'string') return null;
      return {
        mp,
        stance,
        swingScore: Math.abs((stance.score ?? 50) - 50),
      };
    })
    .filter((entry): entry is { mp: MPProfile; stance: DetailedMPStance; swingScore: number } => !!entry)
    .sort((a, b) => a.swingScore - b.swingScore)
    .slice(0, 5);

  candidateNarratives.forEach(({ mp, stance }) => {
    const stanceText =
      stance.stance === 'support' ? 'Supporting' : stance.stance === 'oppose' ? 'Opposing' : 'Undecided';
    namedNarratives.push(
      `${mp.name} (${getPartyName(mp.party)}, ${mp.constituency.name}) — ${stanceText}: ${stance.reason}`
    );
  });

  keyRebelsNarrative.push(...namedNarratives);

  let whipAssessment: string;
  if (labourNoes === 0 && abstentionsCount <= 3) {
    whipAssessment = 'Chief Whip: clean operation. Discipline held and caucus management is currently stable.';
  } else if (labourNoes <= 8) {
    whipAssessment =
      'Chief Whip: low-level dissent only. Manageable, but we should pre-negotiate with soft critics before the next vote.';
  } else if (labourNoes <= 25) {
    whipAssessment = 'Chief Whip: meaningful dissent. A concessions package is advisable to prevent further drift.';
  } else if (labourNoes <= 50) {
    whipAssessment =
      'Chief Whip: serious discipline failure. Backbench blocs are coordinating and need direct political engagement.';
  } else {
    whipAssessment =
      'Chief Whip: open revolt conditions. Without a strategic reset, future fiscal votes are unlikely to be secure.';
  }

  return {
    ayes: ayesCount,
    noes: noesCount,
    abstentions: abstentionsCount,
    governmentMajority,
    passed,
    rebellCount,
    oppositionVotes: oppositionVoteCount,
    narrativeSummary,
    keyRebels: keyRebelsNarrative,
    whipAssessment,
    individualVotes: voteChoices,
  };
}
