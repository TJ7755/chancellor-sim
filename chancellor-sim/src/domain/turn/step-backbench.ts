// Step 13: Backbench Satisfaction & Approval
import { GameState } from '../../types';

import { createInitialFiscalState, FISCAL_RULE_BACKBENCH_DRIFT_TARGET, FiscalRuleId } from '../../game-integration';
import { DifficultySettings } from '../game/difficulty';
import { getDetailedTaxRate, getAdviserBonuses } from './shared-helpers';
import { calculateSocialMediaSentiment, calculateSocialMediaImpact } from '../../social-media-system';

const BASELINE_FISCAL_STATE = createInitialFiscalState();
const BASELINE_DETAILED_TAX = Object.fromEntries(
  BASELINE_FISCAL_STATE.detailedTaxes.map((item) => [item.id, item.currentRate])
) as Record<string, number>;

export function processStepBackbench(state: GameState, difficultySettings: DifficultySettings): GameState {
  let s = calculateApproval(state);
  s = calculateBackbenchSatisfaction(s);
  return s;
}

function calculateApproval(state: GameState): GameState {
  const { political, economic, services, fiscal, manifesto } = state;

  let approval = political.governmentApproval;

  const gdpEffect = (economic.gdpGrowthAnnual - 1.5) * 0.5;
  const unemploymentEffect = (4.2 - economic.unemploymentRate) * 0.6;
  const inflationEffect = (2.5 - economic.inflationCPI) * 0.5;
  const realWageEffect = (economic.wageGrowthAnnual - economic.inflationCPI) * 0.4;

  const nhsEffect = (services.nhsQuality - 62) * 0.12;
  const educationEffect = (services.educationQuality - 68) * 0.05;
  const granularServicesAverage =
    (services.mentalHealthAccess +
      services.primaryCareAccess +
      services.socialCareQuality +
      services.prisonSafety +
      services.courtBacklogPerformance +
      services.legalAidAccess +
      services.policingEffectiveness +
      services.borderSecurityPerformance +
      services.railReliability +
      services.affordableHousingDelivery +
      services.floodResilience +
      services.researchInnovationOutput +
      state.devolution.localGov.localServicesQuality) /
    13;
  const granularServicesEffect = (granularServicesAverage - 55) * 0.06;

  const cakeVatProxy =
    Math.max(0, fiscal.vatRate - 20) + Math.max(0, getDetailedTaxRate(state, 'vatDomesticEnergy', 5) - 5);
  const householdTaxPressure =
    Math.max(0, getDetailedTaxRate(state, 'insurancePremiumTax', 12) - 12) * 0.35 +
    Math.max(
      0,
      getDetailedTaxRate(state, 'stampDuty', BASELINE_DETAILED_TAX.stampDuty || 5) -
        (BASELINE_DETAILED_TAX.stampDuty || 5)
    ) *
      0.25 +
    Math.max(0, getDetailedTaxRate(state, 'sdltAdditionalSurcharge', 3) - 3) * 0.25 +
    Math.max(0, (state.devolution.localGov.councilTaxGrowthCap || 3) - 5) * 0.25 +
    cakeVatProxy * 0.4;
  const householdTaxEffect = -householdTaxPressure;

  const businessTaxPressure =
    Math.max(0, fiscal.corporationTaxRate - 25) * 0.5 +
    Math.max(0, getDetailedTaxRate(state, 'energyProfitsLevy', 35) - 35) * 0.2 +
    Math.max(0, 27 - getDetailedTaxRate(state, 'rdTaxCredit', 27)) * 0.15 +
    Math.max(0, 1000000 - getDetailedTaxRate(state, 'annualInvestmentAllowance', 1000000)) / 200000;
  const businessTaxEffect = -businessTaxPressure * 0.5;

  const deficitEffect =
    fiscal.deficitPctGDP > 6 ? -1.5 : fiscal.deficitPctGDP > 5 ? -0.8 : fiscal.deficitPctGDP < 3 ? 0.5 : 0;
  const fiscalRuleBreachEffect = state.political.fiscalRuleCompliance.overallCompliant ? 0 : -0.4;
  const strikeEffect =
    (state.services.nhsStrikeMonthsRemaining > 0 ? -1.5 : 0) +
    (state.services.educationStrikeMonthsRemaining > 0 ? -1.5 : 0);

  let manifestoEffect = 0;
  if (manifesto.totalViolations === 1) {
    manifestoEffect = -0.8;
  } else if (manifesto.totalViolations === 2) {
    manifestoEffect = -2.0;
  } else if (manifesto.totalViolations >= 3) {
    manifestoEffect = -2.0 - (manifesto.totalViolations - 2) * 1.2;
  }

  const honeymoonBoost =
    state.metadata.currentTurn < 12
      ? (12 - state.metadata.currentTurn) * 0.15
      : 0;

  const socialMediaSentiment = calculateSocialMediaSentiment(state);
  const socialMediaEffect = calculateSocialMediaImpact(socialMediaSentiment);
  const distributionEffect =
    state.distributional.bottomQuintileRealIncomeGrowth * 0.3 -
    (state.distributional.giniCoefficient - 0.35) * 15 -
    (state.distributional.povertyRate - 17.5) * 0.5 +
    (state.financialStability.housingAffordabilityIndex - 38) * 0.04;

  const randomEffect = (Math.random() - 0.5) * 1.5;
  const taxDistributionEffect =
    state.distributional.lastTaxChangeDistribution === 'regressive'
      ? -3
      : state.distributional.lastTaxChangeDistribution === 'progressive'
        ? -1
        : 0;

  let totalChange =
    (gdpEffect +
      unemploymentEffect +
      inflationEffect +
      realWageEffect +
      nhsEffect +
      educationEffect +
      granularServicesEffect +
      householdTaxEffect +
      businessTaxEffect +
      deficitEffect +
      fiscalRuleBreachEffect +
      strikeEffect +
      manifestoEffect +
      honeymoonBoost +
      socialMediaEffect +
      distributionEffect +
      taxDistributionEffect +
      randomEffect) *
    0.25;

  if (approval < 30 && totalChange > 0) {
    totalChange *= 1.5;
  } else if (approval < 38 && totalChange > 0) {
    totalChange *= 1.25;
  }

  const previousSnapshot = state.simulation.monthlySnapshots?.[state.simulation.monthlySnapshots.length - 1];
  if (previousSnapshot) {
    const gdpImprovement = economic.gdpGrowthAnnual - previousSnapshot.gdpGrowth;
    const inflationImprovement = previousSnapshot.inflation - economic.inflationCPI;
    const unemploymentImprovement = previousSnapshot.unemployment - economic.unemploymentRate;

    if (gdpImprovement > 0.3 || inflationImprovement > 0.3 || unemploymentImprovement > 0.15) {
      totalChange += 0.5;
    }
  }

  if (approval < 20 && totalChange < 0) {
    totalChange *= 0.6;
  } else if (approval < 28 && totalChange < 0) {
    totalChange *= 0.8;
  }

  approval += totalChange;

  approval = Math.max(10, Math.min(70, approval));

  return {
    ...state,
    political: {
      ...political,
      governmentApproval: approval,
      chancellorApproval: approval - 3 + (Math.random() - 0.5) * 2,
    },
  };
}

function calculateBackbenchSatisfaction(state: GameState): GameState {
  const { political, fiscal, manifesto } = state;
  const bonuses = getAdviserBonuses(state);

  let satisfaction = political.backbenchSatisfaction;

  const approvalEffect = (political.governmentApproval - 38) * 0.2;

  const deficitEffect =
    fiscal.deficitPctGDP > 6 ? -1.0 : fiscal.deficitPctGDP > 5 ? -0.5 : fiscal.deficitPctGDP < 3 ? 0.2 : 0;

  const manifestoEffect = -manifesto.totalViolations * 1.5;

  const pmEffect = (political.pmTrust - 50) * 0.06;

  const strikeEffect = political.strikeRisk > 60 ? -0.6 : political.strikeRisk > 50 ? -0.3 : 0;

  const granularServiceStress =
    (50 -
      state.services.mentalHealthAccess +
      (50 - state.services.prisonSafety) +
      (50 - state.services.courtBacklogPerformance) +
      (50 - state.services.policingEffectiveness)) /
    4;
  const constituencyIssueEffect = granularServiceStress > 0 ? -granularServiceStress * 0.04 : 0;

  const socialMediaSentiment = calculateSocialMediaSentiment(state);
  const socialMediaEffectOnMPs = calculateSocialMediaImpact(socialMediaSentiment) * 0.7;
  const obrHeadroomPenalty =
    state.obr.fiscalHeadroomForecast_bn < 0 ? -0.6 : state.obr.fiscalHeadroomForecast_bn < 5 ? -0.3 : 0;

  const totalChange =
    (approvalEffect +
      deficitEffect +
      manifestoEffect +
      pmEffect +
      strikeEffect +
      constituencyIssueEffect +
      socialMediaEffectOnMPs +
      obrHeadroomPenalty) *
    0.2;

  satisfaction += totalChange;

  const ruleBackbenchTarget = FISCAL_RULE_BACKBENCH_DRIFT_TARGET[state.political.chosenFiscalRule as FiscalRuleId] ?? 55;
  satisfaction += (ruleBackbenchTarget - satisfaction) * 0.008;

  satisfaction += bonuses.backbenchBonus;

  satisfaction = Math.max(10, Math.min(95, satisfaction));

  return {
    ...state,
    political: {
      ...political,
      backbenchSatisfaction: satisfaction,
    },
  };
}
