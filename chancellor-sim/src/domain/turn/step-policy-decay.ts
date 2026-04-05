// Step 0.6: Policy Decay, Fiscal Events, Legislative Pipeline, Industrial Strategy, Capital Delivery, Housing Supply, Annual Pay Rounds

import { GameState } from '../../types';
import { getDifficultySettings } from '../game/difficulty';
import { processFiscalEventCycle } from '../fiscal/fiscal-event-cycle';

export function processStepPolicyDecay(state: GameState, randomSeeds: number[]): GameState {
  let s = state;
  let seedIdx = 0;

  // processPolicyRiskModifiers
  s = processPolicyRiskModifiers(s);

  // triggerSpendingReviewIfDue
  s = triggerSpendingReviewIfDue(s);

  // processFiscalEventCycle
  s = processFiscalEventCycle(s);

  // processLegislativePipeline
  s = processLegislativePipeline(s, randomSeeds[seedIdx++], randomSeeds[seedIdx++], randomSeeds[seedIdx++]);

  // processIndustrialStrategy
  s = processIndustrialStrategy(s, randomSeeds[seedIdx++], randomSeeds[seedIdx++]);

  // processCapitalDelivery
  s = processCapitalDelivery(s);

  // processHousingSupply
  s = processHousingSupply(s);

  // processAnnualPayRounds
  s = processAnnualPayRounds(s);

  return s;
}

function processPolicyRiskModifiers(state: GameState): GameState {
  const current = Array.isArray(state.policyRiskModifiers) ? state.policyRiskModifiers : [];
  if (current.length === 0) return state;

  const updated = current
    .map((modifier) => ({
      ...modifier,
      turnsRemaining: Math.max(0, modifier.turnsRemaining - 1),
    }))
    .filter((modifier) => modifier.turnsRemaining > 0);

  const strikeThreshold = updated.reduce((acc, modifier) => {
    if (modifier.strikeThresholdMultiplier !== undefined) {
      return Math.min(acc, modifier.strikeThresholdMultiplier);
    }
    return acc;
  }, 1);

  return {
    ...state,
    policyRiskModifiers: updated,
    services: {
      ...state.services,
      nhsStrikeMonthsRemaining: Math.max(0, (state.services.nhsStrikeMonthsRemaining || 0) - 1),
      educationStrikeMonthsRemaining: Math.max(0, (state.services.educationStrikeMonthsRemaining || 0) - 1),
      pensionerRevoltCooldown: Math.max(0, (state.services.pensionerRevoltCooldown || 0) - 1),
      nhsStrikeCooldown: Math.max(0, (state.services.nhsStrikeCooldown || 0) - 1),
      teacherStrikeCooldown: Math.max(0, (state.services.teacherStrikeCooldown || 0) - 1),
      strikeTriggerThresholdMultiplier: strikeThreshold,
    },
  };
}

function triggerSpendingReviewIfDue(state: GameState): GameState {
  const sr = state.spendingReview;
  if (!sr || sr.inReview) return state;
  const scheduledReviewTurns = new Set([1, 37]);
  const isScheduledReview =
    scheduledReviewTurns.has(state.metadata.currentTurn) && sr.lastReviewTurn < state.metadata.currentTurn;
  if (!isScheduledReview) return state;
  return {
    ...state,
    spendingReview: {
      ...sr,
      inReview: true,
    },
  };
}

function processLegislativePipeline(state: GameState, seed1: number, seed2: number, seed3: number): GameState {
  const difficulty = getDifficultySettings(state.metadata.difficultyMode || 'standard');
  const consultationPenalty = (state.legislativePipeline.consultationLoad || 0) > 70 ? 0.1 : 0;
  let hmrcLoad = 0;

  const queue = (state.legislativePipeline.queue || []).map((item) => {
    const next = { ...item };
    if (next.status === 'active') return next;
    if (next.status === 'queued' && next.announcedTurn <= state.metadata.currentTurn) {
      next.status = 'in_progress';
    }
    if (next.status === 'in_progress' || next.status === 'delayed') {
      if (next.type === 'hmrc_systems') hmrcLoad += next.capacityCost || 0;
      const delayRisk = Math.max(0, Math.min(0.8, (next.delayRisk || 0) + consultationPenalty));
      if (seed1 < delayRisk * (difficulty.shockIntensity * 0.85)) {
        const delayTurns = 1 + Math.floor(seed2 * 3);
        next.status = 'delayed';
        next.effectiveTurn += delayTurns;
        next.turnsRemaining += delayTurns;
      } else {
        next.turnsRemaining = Math.max(0, next.effectiveTurn - state.metadata.currentTurn);
        next.status = next.turnsRemaining <= 0 ? 'active' : 'in_progress';
      }
    }
    return next;
  });

  const hmrcCapacityBase = 100 + Math.round((state.fiscal.hmrcSystemsInvestment_bn || 0.3) * 20);
  const overload = Math.max(0, hmrcLoad - hmrcCapacityBase);
  const delayedQueue = queue.map((item) => {
    if (overload > 0 && item.type === 'hmrc_systems' && item.status === 'in_progress') {
      return {
        ...item,
        status: 'delayed' as const,
        effectiveTurn: item.effectiveTurn + 1,
        turnsRemaining: item.turnsRemaining + 1,
      };
    }
    return item;
  });
  const antiAvoidanceNowActive = delayedQueue.some(
    (item) => item.measureId.includes('anti_avoidance') && item.status === 'active'
  );
  const hasComplianceModifier = (state.policyRiskModifiers || []).some((modifier) =>
    modifier.id.startsWith('anti_avoidance_effect_')
  );
  const policyRiskModifiers: GameState['policyRiskModifiers'] =
    antiAvoidanceNowActive && !hasComplianceModifier
      ? [
          ...(state.policyRiskModifiers || []),
          {
            id: `anti_avoidance_effect_${state.metadata.currentTurn}`,
            type: 'tax_compliance_boost' as const,
            turnsRemaining: 12,
            taxAvoidanceScaleDelta: -Math.min(
              0.5,
              Math.max(0, (state.fiscal.antiAvoidanceInvestment_bn || 0.3) - 0.3) * 0.15
            ),
            description: 'HMRC compliance programme is now reducing tax avoidance.',
          },
        ]
      : state.policyRiskModifiers;

  return {
    ...state,
    legislativePipeline: {
      ...state.legislativePipeline,
      queue: delayedQueue,
      hmrcSystemsCapacity: hmrcCapacityBase,
      consultationLoad: Math.max(
        0,
        Math.min(100, (state.legislativePipeline.consultationLoad || 0) - 1 + (overload > 0 ? 4 : 0))
      ),
    },
    policyRiskModifiers,
  };
}

function processIndustrialStrategy(state: GameState, seed1: number, seed2: number): GameState {
  const difficulty = getDifficultySettings(state.metadata.difficultyMode || 'standard');
  let credibilityDelta = 0;
  let productivityBoostAccumulated = state.industrialStrategy.productivityBoostAccumulated || 0;
  let failedInterventionCount = state.industrialStrategy.failedInterventionCount || 0;

  const activeInterventions = (state.industrialStrategy.activeInterventions || []).map((intervention) => {
    const next = { ...intervention, turnsActive: intervention.turnsActive + 1 };
    if (!next.outcomeRevealed && next.turnsActive >= next.turnsToEffect) {
      const draw = seed1;
      const adjustedSuccess = Math.max(
        0.2,
        Math.min(0.9, next.successProbability - (difficulty.shockIntensity - 1) * 0.08)
      );
      next.outcomeRevealed = true;
      if (draw <= adjustedSuccess) {
        next.outcome = 'success';
        if (next.sector === 'clean_energy') productivityBoostAccumulated += 0.12;
        else if (next.sector === 'life_sciences') productivityBoostAccumulated += 0.1;
        else if (next.sector === 'advanced_manufacturing') productivityBoostAccumulated += 0.08;
        else if (next.sector === 'digital') productivityBoostAccumulated += 0.06;
        else if (next.sector === 'defence') productivityBoostAccumulated += 0.05;
        else productivityBoostAccumulated += 0.05;
      } else if (draw <= adjustedSuccess + 0.2) {
        next.outcome = 'partial';
        productivityBoostAccumulated += 0.03;
      } else {
        next.outcome = 'failure';
        failedInterventionCount += 1;
        credibilityDelta -= 2 + seed2 * 2;
      }
    }
    return next;
  });

  const totalAnnualCost_bn = activeInterventions.reduce((sum, item) => sum + item.annualCost_bn, 0);
  let stateAidRisk = state.industrialStrategy.stateAidRisk || 15;
  if (totalAnnualCost_bn > 4) {
    stateAidRisk = Math.min(100, stateAidRisk + (totalAnnualCost_bn - 4) * 1.6);
  } else {
    stateAidRisk = Math.max(0, stateAidRisk - 0.8);
  }

  const disputeProbability = stateAidRisk > 60 ? 0.1 * difficulty.shockIntensity : 0;
  const disputeTriggered = seed1 < disputeProbability;

  return {
    ...state,
    industrialStrategy: {
      ...state.industrialStrategy,
      activeInterventions,
      totalAnnualCost_bn,
      productivityBoostAccumulated,
      failedInterventionCount,
      stateAidRisk,
      exportShockTurnsRemaining: disputeTriggered
        ? 6
        : Math.max(0, (state.industrialStrategy.exportShockTurnsRemaining || 0) - 1),
    },
    political: {
      ...state.political,
      credibilityIndex: Math.max(0, Math.min(100, state.political.credibilityIndex + credibilityDelta)),
    },
  };
}

function processCapitalDelivery(state: GameState): GameState {
  const annualCapacity = state.capitalDelivery.pipelineCapacity_bn || 80;
  const monthlyCapacity = annualCapacity / 12;
  const plannedCapitalMonthly =
    (state.fiscal.spending.nhsCapital +
      state.fiscal.spending.educationCapital +
      state.fiscal.spending.defenceCapital +
      state.fiscal.spending.infrastructureCapital +
      state.fiscal.spending.policeCapital +
      state.fiscal.spending.justiceCapital +
      state.fiscal.spending.otherCapital) /
    12;

  const deliverableMonthly =
    monthlyCapacity * Math.max(0.5, Math.min(1.0, state.capitalDelivery.deliveryRiskMultiplier || 0.9));
  const deferredCapital_bn = Math.max(0, plannedCapitalMonthly - deliverableMonthly);
  const overProgrammeRatio = monthlyCapacity > 0 ? plannedCapitalMonthly / monthlyCapacity : 1;
  const overCapacityTurns = overProgrammeRatio > 1.2 ? (state.capitalDelivery.overCapacityTurns || 0) + 1 : 0;

  const deliveryRiskMultiplier =
    overCapacityTurns >= 3
      ? Math.max(0.5, (state.capitalDelivery.deliveryRiskMultiplier || 0.9) - 0.05)
      : Math.min(1.0, (state.capitalDelivery.deliveryRiskMultiplier || 0.9) + 0.01);

  const annualGrowth = Math.pow(1.02, 1 / 12);
  return {
    ...state,
    capitalDelivery: {
      ...state.capitalDelivery,
      pipelineCapacity_bn: annualCapacity * annualGrowth,
      deliveryRiskMultiplier,
      overCapacityTurns,
      deferredCapital_bn,
    },
  };
}

function processHousingSupply(state: GameState): GameState {
  const housing = state.housing;
  const mortgageRate = state.markets.mortgageRate2y;
  const baselineStarts = 240000;
  const planningDrag = 1 - housing.planningBottleneck / 200;
  const infraUnlock = 1 + ((housing.infrastructureGuarantees_bn || 0) / 50) * 0.15;
  const reformMultiplier = housing.planningReformPackage ? 1.12 : 1.0;
  const rateDrag = (mortgageRate - 5.0) * 3000;
  const councilBoost = (housing.councilHouseBuildingGrant_bn || 0) * 8000;
  const starts = Math.max(
    120000,
    baselineStarts * planningDrag * infraUnlock * reformMultiplier - rateDrag + councilBoost
  );

  const planningBottleneck = housing.planningReformPackage
    ? Math.max(20, housing.planningBottleneck - 2)
    : state.metadata.currentTurn % 6 === 0
      ? Math.min(90, housing.planningBottleneck + 1)
      : housing.planningBottleneck;

  const demandPressure = (housing.htbAndSharedOwnership_bn || 0) * 0.5;
  const affordabilityDelta = ((starts - baselineStarts) / 120000) * 3 - demandPressure;
  const housingAffordabilityIndex = Math.max(5, Math.min(95, housing.housingAffordabilityIndex + affordabilityDelta));
  const rentInflation_pct = Math.max(
    1,
    Math.min(
      12,
      housing.rentInflation_pct + (starts < baselineStarts ? 0.15 : -0.1) + (housingAffordabilityIndex < 40 ? 0.2 : 0)
    )
  );

  return {
    ...state,
    housing: {
      ...housing,
      houseBuilding_annualStarts: starts,
      planningBottleneck,
      housingAffordabilityIndex,
      rentInflation_pct,
    },
    economic: {
      ...state.economic,
      economicInactivity: Math.max(
        16,
        Math.min(28, state.economic.economicInactivity + (housingAffordabilityIndex < 40 ? 0.1 / 12 : -0.02 / 12))
      ),
    },
  };
}

function processAnnualPayRounds(state: GameState): GameState {
  if (state.metadata.currentMonth !== 4) return state;

  const cpiAvg = state.economic.inflationCPI;
  const productivity = state.economic.productivityGrowthAnnual;
  const recruitmentPressure = (sectorQuality: number) => Math.max(0, Math.min(1, (55 - sectorQuality) / 20));

  const nhsAward = cpiAvg * 0.9 + productivity * 0.3 + recruitmentPressure(state.services.nhsQuality) * 0.2;
  const teachersAward = cpiAvg * 0.9 + productivity * 0.3 + recruitmentPressure(state.services.educationQuality) * 0.2;
  const civilAward =
    cpiAvg * 0.9 +
    productivity * 0.3 +
    recruitmentPressure((state.services.policingEffectiveness + state.services.courtBacklogPerformance) / 2) * 0.2;
  const armedAward =
    cpiAvg * 0.9 + productivity * 0.3 + recruitmentPressure(state.services.infrastructureQuality) * 0.2;
  const policeAward =
    cpiAvg * 0.9 + productivity * 0.3 + recruitmentPressure(state.services.policingEffectiveness) * 0.2;

  const nhsWeightRaw = 0.55;
  const teachersWeightRaw = 0.22;
  const civilWeightRaw = 0.12;
  const armedWeightRaw = 0.07;
  const policeWeightRaw = 0.09;
  const totalAwardWeight = nhsWeightRaw + teachersWeightRaw + civilWeightRaw + armedWeightRaw + policeWeightRaw;
  const nhsWeight = nhsWeightRaw / totalAwardWeight;
  const teachersWeight = teachersWeightRaw / totalAwardWeight;
  const civilWeight = civilWeightRaw / totalAwardWeight;
  const armedWeight = armedWeightRaw / totalAwardWeight;
  const policeWeight = policeWeightRaw / totalAwardWeight;

  const awardCost_bn =
    nhsAward * nhsWeight +
    teachersAward * teachersWeight +
    civilAward * civilWeight +
    armedAward * armedWeight +
    policeAward * policeWeight;

  return {
    ...state,
    fiscal: {
      ...state.fiscal,
      spending: {
        ...state.fiscal.spending,
        nhsCurrent: state.fiscal.spending.nhsCurrent + awardCost_bn * 0.55,
        educationCurrent: state.fiscal.spending.educationCurrent + awardCost_bn * 0.22,
        otherCurrent: state.fiscal.spending.otherCurrent + awardCost_bn * 0.23,
        nhs: state.fiscal.spending.nhs + awardCost_bn * 0.55,
        education: state.fiscal.spending.education + awardCost_bn * 0.22,
        other: state.fiscal.spending.other + awardCost_bn * 0.23,
      },
      totalSpending_bn: state.fiscal.totalSpending_bn + awardCost_bn,
    },
    services: {
      ...state.services,
      nhsQuality: Math.min(100, state.services.nhsQuality + Math.max(-0.2, (nhsAward - cpiAvg) * 0.08)),
      educationQuality: Math.min(
        100,
        state.services.educationQuality + Math.max(-0.2, (teachersAward - cpiAvg) * 0.08)
      ),
      policingEffectiveness: Math.min(
        100,
        state.services.policingEffectiveness + Math.max(-0.2, (policeAward - cpiAvg) * 0.06)
      ),
    },
  };
}
