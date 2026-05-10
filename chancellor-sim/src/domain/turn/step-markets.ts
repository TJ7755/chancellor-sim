// Step 9: Markets

import { GameState } from '../../types';
import { DifficultySettings } from '../game/difficulty';
import { getCreditRatingPremium } from './shared-helpers';
import { FISCAL_RULE_GILT_EFFECT, FISCAL_RULE_STERLING_EFFECT, FiscalRuleId } from '../../game-integration';

export function processStepMarkets(state: GameState, difficultySettings: DifficultySettings, randomSeeds: number[]): GameState {
  const { fiscal, markets, political } = state;
  const previousSnapshot = state.simulation.monthlySnapshots?.[state.simulation.monthlySnapshots.length - 1];
  const difficulty = difficultySettings;

  const hasTrendHistory = !!previousSnapshot && state.simulation.monthlySnapshots.length >= 2;

  const policyRestrictiveness = markets.bankRate - 3.25;
  const termPremium = Math.max(-1.8, Math.min(1.5, 0.3 - policyRestrictiveness * 0.7));
  const baseYield = markets.bankRate + termPremium;

  const qtDrawdown = Math.max(0, 875 - (state.markets.assetPurchaseFacility_bn || 875));
  const qtSupplyPremium = 0.05 + (qtDrawdown / 100) * 0.01;

  const certifiedHeadroom = state.obr.fiscalHeadroomForecast_bn ?? fiscal.fiscalHeadroom_bn;
  const headroomPremium = Math.max(-0.25, Math.min(0.4, -certifiedHeadroom * 0.005));
  const guaranteePremium = ((state.housing.infrastructureGuarantees_bn || 0) / 2) * 0.01;

  const debtRatio = fiscal.debtPctGDP;
  let debtPremium = 0;
  if (debtRatio > 90) {
    debtPremium = (debtRatio - 90) * 0.02 * difficulty.marketReactionScale;
  }
  if (debtRatio > 100) {
    debtPremium += (debtRatio - 100) * 0.05 * difficulty.marketReactionScale;
  }

  const deficitPremium = Math.max(0, (fiscal.deficitPctGDP - 3) * 0.15 * difficulty.marketReactionScale);

  const previousDebt = typeof previousSnapshot?.debt === 'number' ? previousSnapshot.debt : fiscal.debtPctGDP;
  const previousDeficit =
    typeof previousSnapshot?.deficit === 'number' ? previousSnapshot.deficit : fiscal.deficitPctGDP;
  const debtTrend = fiscal.debtPctGDP - previousDebt;
  const deficitTrend = fiscal.deficitPctGDP - previousDeficit;

  let vigilantePremium = 0;
  if (process.env.NODE_ENV !== 'test') {
    if (hasTrendHistory && deficitTrend > 0.8) {
      vigilantePremium = (deficitTrend - 0.8) * 0.5 * difficulty.marketReactionScale;
    }
  }

  const trendPremium = hasTrendHistory
    ? Math.max(-0.6, Math.min(0.6, (debtTrend * 0.4 + deficitTrend * 0.3) * difficulty.marketReactionScale))
    : 0;

  const credibilityDiscount = (political.credibilityIndex - 50) * -0.008;

  const creditRatingPremium = getCreditRatingPremium(political.creditRating);

  const fiscalRuleCredibilityEffect = FISCAL_RULE_GILT_EFFECT[political.chosenFiscalRule as FiscalRuleId] ?? 0;

  let marketPsychology = 0;
  const yieldLevel = markets.giltYield10y;
  const fiscalStress = (debtRatio > 95 ? 1 : 0) + (fiscal.deficitPctGDP > 5 ? 1 : 0) + (debtTrend > 1 ? 1 : 0);

  if (yieldLevel > 5.5 && fiscalStress >= 2) {
    marketPsychology = 0.3 + (yieldLevel - 5.5) * 0.15;
  } else if (yieldLevel < 4.0 && fiscalStress === 0) {
    marketPsychology = -0.15;
  }

  if (previousSnapshot) {
    const previousYield = previousSnapshot.giltYield;
    const yieldChange = yieldLevel - previousYield;
    if (Math.abs(yieldChange) > 0.3) {
      marketPsychology += yieldChange > 0 ? 0.1 : -0.1;
    }
  }

  const fiscalRuleChangeShock =
    (political.fiscalRuleYieldShockMonthsRemaining || 0) > 0 ? political.fiscalRuleYieldShock_pp || 0 : 0;

  const spendingReviewPlanPremium = (() => {
    const sr = state.spendingReview;
    if (!sr?.departments) return 0;
    const departmentKeys = Object.keys(sr.departments) as Array<keyof typeof sr.departments>;
    const yearTotals = [0, 0, 0];

    departmentKeys.forEach((key) => {
      const dept = sr.departments[key];
      for (let idx = 0; idx < 3; idx++) {
        yearTotals[idx] += (dept.plannedResourceDEL_bn?.[idx] ?? 0) + (dept.plannedCapitalDEL_bn?.[idx] ?? 0);
      }
    });

    const yearOne = yearTotals[0];
    if (yearOne <= 0) return 0;
    const outYearAverage = (yearTotals[1] + yearTotals[2]) / 2;
    const outYearExpansion = outYearAverage - yearOne;
    const headroomBuffer = Math.max(5, Math.abs(fiscal.fiscalHeadroom_bn) + 5);
    return Math.max(-0.03, Math.min(0.04, (outYearExpansion / headroomBuffer) * 0.012));
  })();

  const issuanceStrategyEffect = (state.debtManagement.strategyYieldEffect_bps || 0) / 100;
  const rolloverRiskPremium = (state.debtManagement.rolloverRiskPremium_bps || 0) / 100;

  let newYield10y =
    baseYield +
    debtPremium +
    deficitPremium +
    trendPremium +
    vigilantePremium +
    credibilityDiscount +
    creditRatingPremium +
    fiscalRuleCredibilityEffect +
    marketPsychology +
    qtSupplyPremium +
    headroomPremium +
    fiscalRuleChangeShock +
    spendingReviewPlanPremium +
    issuanceStrategyEffect +
    rolloverRiskPremium +
    guaranteePremium;

  let ldiPanicTriggered = markets.ldiPanicTriggered ?? false;

  const prevYield = markets.giltYield10y;
  let impliedYieldChange = newYield10y - prevYield;

  if (difficulty.marketReactionScale > 1.0 && hasTrendHistory) {
    if (impliedYieldChange > 0.5) {
      ldiPanicTriggered = true;
      const ldiShock = (impliedYieldChange - 0.5) * 1.5;
      newYield10y += ldiShock;
    } else if (ldiPanicTriggered) {
      if (impliedYieldChange < -0.2) {
        ldiPanicTriggered = false;
      } else {
        newYield10y += 0.4;
      }
    }
  }

  const bankRateDifferential = markets.bankRate - 3.5;
  const fiscalRiskPremium = newYield10y - markets.bankRate - 0.3;
  const yieldSterlingEffect = bankRateDifferential * 1.5 - fiscalRiskPremium * 2.0;
  const confidenceEffect = (political.governmentApproval - 40) * 0.15;
  const credibilityEffect = (political.credibilityIndex - 50) * 0.1;
  const vigilanteSterlingPenalty = vigilantePremium * -4.0;
  const fiscalRuleSterlingOffset = FISCAL_RULE_STERLING_EFFECT[political.chosenFiscalRule as FiscalRuleId] ?? 0;

  let newSterlingIndex =
    100 +
    yieldSterlingEffect +
    confidenceEffect +
    credibilityEffect +
    vigilanteSterlingPenalty +
    fiscalRuleSterlingOffset;
  newSterlingIndex = Math.max(70, Math.min(130, newSterlingIndex));

  const adjustmentSpeed = ldiPanicTriggered ? 1.0 : 0.3;
  const smoothedYield = prevYield + (newYield10y - prevYield) * adjustmentSpeed;

  const prevSterling = markets.sterlingIndex;
  const smoothedSterling = prevSterling + (newSterlingIndex - prevSterling) * 0.3;

  const curveSlope = Math.max(-1.2, Math.min(1.8, (smoothedYield - markets.bankRate) * 1.2));
  const spread2y = Math.max(-1.0, Math.min(0.8, 0.1 - curveSlope * 0.35));
  const spread30y = Math.max(0.2, Math.min(1.5, 0.55 + curveSlope * 0.25));

  const mortgageRate = (markets.bankRate + (smoothedYield + spread2y)) / 2 + 1.6;

  return {
    ...state,
    markets: {
      ...markets,
      giltYield10y: Math.max(0.5, Math.min(20, smoothedYield)),
      giltYield2y: Math.max(0.5, Math.min(20, smoothedYield + spread2y)),
      giltYield30y: Math.max(0.5, Math.min(20, smoothedYield + spread30y)),
      mortgageRate2y: Math.max(1.0, Math.min(20, mortgageRate)),
      sterlingIndex: smoothedSterling,
      yieldChange10y: smoothedYield - prevYield,
      ldiPanicTriggered: ldiPanicTriggered,
    },
    political: {
      ...political,
      fiscalRuleYieldShock_pp:
        (political.fiscalRuleYieldShockMonthsRemaining || 0) > 0
          ? (political.fiscalRuleYieldShock_pp || 0) * (5 / 6)
          : 0,
      fiscalRuleYieldShockMonthsRemaining: Math.max(0, (political.fiscalRuleYieldShockMonthsRemaining || 0) - 1),
    },
  };
}
