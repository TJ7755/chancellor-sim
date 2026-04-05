// Step 10: Service Quality
import { GameState } from '../../types';

import { createInitialFiscalState } from '../../game-integration';
import { DifficultySettings } from '../game/difficulty';
import { evolveServiceMetric, getProgrammeTotal, getAdviserBonuses } from './shared-helpers';

const BASELINE_FISCAL_STATE = createInitialFiscalState();
const BASELINE_DETAILED_SPENDING = Object.fromEntries(
  BASELINE_FISCAL_STATE.detailedSpending.map((item: { id: string; currentBudget: number }) => [item.id, item.currentBudget])
) as Record<string, number>;

export function processStepServices(state: GameState, difficultySettings: DifficultySettings): GameState {
  const { fiscal, services, economic } = state;
  const monthsElapsed = state.metadata.currentTurn;
  const bonuses = getAdviserBonuses(state);

  const nhsDemandGrowth = 3.5;
  const nhsBaselineNominal = 180.4;
  const nhsDemandMultiplier = Math.pow(1 + nhsDemandGrowth / 100, monthsElapsed / 12);
  const nhsAdjustedBaseline = nhsBaselineNominal * nhsDemandMultiplier;

  const nhsSpending = fiscal.spending.nhs;
  const nhsSpendingReal = nhsSpending / (1 + economic.inflationCPI / 100);
  const nhsRealGrowth = ((nhsSpendingReal - nhsAdjustedBaseline) / nhsAdjustedBaseline) * 100;

  let nhsQuality = services.nhsQuality;
  const staffing = {
    ...(services.staffingCapacity || { nhs: 62, education: 64, policing: 61, civilService: 63, defence: 66 }),
  };
  const staffingMultiplierNhs = Math.max(0.65, Math.min(1.2, (staffing.nhs || 62) / 70));
  const staffingMultiplierEducation = Math.max(0.65, Math.min(1.2, (staffing.education || 64) / 70));
  const staffingMultiplierPolicing = Math.max(0.65, Math.min(1.2, (staffing.policing || 61) / 70));

  let nhsQualityChange = 0;
  if (nhsRealGrowth > 5) {
    nhsQualityChange = 0.5 + Math.log(nhsRealGrowth / 5 + 1) * 0.15;
  } else if (nhsRealGrowth > 0) {
    nhsQualityChange = 0.5;
  } else if (nhsRealGrowth > -1.5) {
    nhsQualityChange = 0.1;
  } else if (nhsRealGrowth > -3.5) {
    nhsQualityChange = -0.3;
  } else {
    nhsQualityChange = -0.8;
  }

  if (nhsQualityChange > 0) {
    nhsQualityChange *= difficultySettings.spendingEfficiency * bonuses.spendingEfficiencyMultiplier;
  } else {
    nhsQualityChange *= difficultySettings.serviceDegradationRate;
  }

  if (nhsQuality > 75 && nhsQualityChange > 0) {
    nhsQualityChange *= 0.4;
  } else if (nhsQuality > 85 && nhsQualityChange > 0) {
    nhsQualityChange *= 0.2;
  }

  const nhsLagCoefficient = nhsQualityChange > 0 ? 0.45 : 0.65;
  nhsQuality += nhsQualityChange * nhsLagCoefficient * staffingMultiplierNhs;

  const eduDemandGrowth = 2.0;
  const eduDemandMultiplier = Math.pow(1 + eduDemandGrowth / 100, monthsElapsed / 12);
  const eduSpending = fiscal.spending.education;
  const eduSpendingReal = eduSpending / (1 + economic.inflationCPI / 100);
  let eduQuality = services.educationQuality;

  let eduQualityChange = 0;
  const eduSpendingRatio = eduSpendingReal / (116 * eduDemandMultiplier);

  if (eduSpendingRatio > 1.3) {
    eduQualityChange = 0.3 + Math.log(eduSpendingRatio / 1.3 + 1) * 0.1;
  } else if (eduSpendingReal > 125 * eduDemandMultiplier) {
    eduQualityChange = 0.3;
  } else if (eduSpendingReal > 116 * eduDemandMultiplier) {
    eduQualityChange = 0.1;
  } else if (eduSpendingReal > 110 * eduDemandMultiplier) {
    eduQualityChange = -0.1;
  } else {
    eduQualityChange = -0.4;
  }

  if (eduQualityChange > 0) {
    eduQualityChange *= difficultySettings.spendingEfficiency * bonuses.spendingEfficiencyMultiplier;
  } else {
    eduQualityChange *= difficultySettings.serviceDegradationRate;
  }

  if (eduQuality > 80 && eduQualityChange > 0) {
    eduQualityChange *= 0.5;
  }

  const eduLagCoefficient = eduQualityChange > 0 ? 0.45 : 0.65;
  eduQuality += eduQualityChange * eduLagCoefficient * staffingMultiplierEducation;

  const infraDemandGrowth = 2.0;
  const infraDemandMultiplier = Math.pow(1 + infraDemandGrowth / 100, monthsElapsed / 12);
  const infraInflationMultiplier = Math.pow(1 + 2.0 / 100, monthsElapsed / 12);
  const infraScaler = infraDemandMultiplier * infraInflationMultiplier;
  const infraSpending = fiscal.spending.infrastructure;
  let infraQuality = services.infrastructureQuality;
  if (infraSpending > 115 * infraScaler) {
    infraQuality += 0.4;
  } else if (infraSpending > 100 * infraScaler) {
    infraQuality += 0.1;
  } else if (infraSpending > 90 * infraScaler) {
    infraQuality -= 0.1;
  } else {
    infraQuality -= 0.5;
  }

  infraQuality -= 0.05 / Math.max(0.8, staffingMultiplierPolicing);

  const mentalHealthAccess = evolveServiceMetric(
    services.mentalHealthAccess,
    getProgrammeTotal(state, ['nhsMentalHealth']),
    BASELINE_DETAILED_SPENDING.nhsMentalHealth || 16.0,
    4.0,
    economic.inflationCPI,
    monthsElapsed
  );
  const primaryCareAccess = evolveServiceMetric(
    services.primaryCareAccess,
    getProgrammeTotal(state, ['nhsPrimaryCare']),
    BASELINE_DETAILED_SPENDING.nhsPrimaryCare || 18.0,
    3.2,
    economic.inflationCPI,
    monthsElapsed
  );
  const socialCareQuality = evolveServiceMetric(
    services.socialCareQuality,
    getProgrammeTotal(state, ['socialCare']),
    BASELINE_DETAILED_SPENDING.socialCare || 7.5,
    4.5,
    economic.inflationCPI,
    monthsElapsed
  );
  const prisonSafety = evolveServiceMetric(
    services.prisonSafety,
    getProgrammeTotal(state, ['prisonsAndProbation']),
    BASELINE_DETAILED_SPENDING.prisonsAndProbation || 5.5,
    2.8,
    economic.inflationCPI,
    monthsElapsed
  );
  const courtBacklogPerformance = evolveServiceMetric(
    services.courtBacklogPerformance,
    getProgrammeTotal(state, ['courts']),
    BASELINE_DETAILED_SPENDING.courts || 2.8,
    2.5,
    economic.inflationCPI,
    monthsElapsed
  );
  const legalAidAccess = evolveServiceMetric(
    services.legalAidAccess,
    getProgrammeTotal(state, ['legalAid']),
    BASELINE_DETAILED_SPENDING.legalAid || 1.9,
    2.2,
    economic.inflationCPI,
    monthsElapsed
  );
  const policingEffectiveness = evolveServiceMetric(
    services.policingEffectiveness,
    getProgrammeTotal(state, ['policing', 'counterTerrorism']),
    (BASELINE_DETAILED_SPENDING.policing || 11.5) + (BASELINE_DETAILED_SPENDING.counterTerrorism || 1.2),
    2.0,
    economic.inflationCPI,
    monthsElapsed
  );
  const borderSecurityPerformance = evolveServiceMetric(
    services.borderSecurityPerformance,
    getProgrammeTotal(state, ['immigration']),
    BASELINE_DETAILED_SPENDING.immigration || 4.5,
    2.4,
    economic.inflationCPI,
    monthsElapsed
  );
  const railReliability = evolveServiceMetric(
    services.railReliability,
    getProgrammeTotal(state, ['railSubsidy', 'hs2']),
    (BASELINE_DETAILED_SPENDING.railSubsidy || 5.5) + (BASELINE_DETAILED_SPENDING.hs2 || 6.0),
    2.3,
    economic.inflationCPI,
    monthsElapsed
  );
  const affordableHousingDelivery = evolveServiceMetric(
    services.affordableHousingDelivery,
    getProgrammeTotal(state, ['housingCapital', 'localGovernmentGrants']),
    (BASELINE_DETAILED_SPENDING.housingCapital || 2.5) + (BASELINE_DETAILED_SPENDING.localGovernmentGrants || 5.5),
    3.0,
    economic.inflationCPI,
    monthsElapsed
  );
  const floodResilience = evolveServiceMetric(
    services.floodResilience,
    getProgrammeTotal(state, ['floodDefences']),
    BASELINE_DETAILED_SPENDING.floodDefences || 1.2,
    3.3,
    economic.inflationCPI,
    monthsElapsed
  );
  const researchInnovationOutput = evolveServiceMetric(
    services.researchInnovationOutput,
    getProgrammeTotal(state, ['ukri', 'aiAndDigital']),
    (BASELINE_DETAILED_SPENDING.ukri || 7.3) + (BASELINE_DETAILED_SPENDING.aiAndDigital || 1.5),
    2.0,
    economic.inflationCPI,
    monthsElapsed
  );

  const realPayGap = economic.wageGrowthAnnual - economic.inflationCPI;
  staffing.nhs = Math.max(35, Math.min(90, staffing.nhs + (realPayGap > 0 ? 0.12 : -0.18)));
  staffing.education = Math.max(35, Math.min(90, staffing.education + (realPayGap > 0 ? 0.1 : -0.15)));
  staffing.policing = Math.max(35, Math.min(90, staffing.policing + (realPayGap > 0 ? 0.08 : -0.12)));

  if (services.nhsStrikeMonthsRemaining > 0) {
    nhsQuality -= 1;
  }

  if (services.educationStrikeMonthsRemaining > 0) {
    eduQuality -= 1;
  }

  nhsQuality = Math.max(0, Math.min(100, nhsQuality));
  eduQuality = Math.max(0, Math.min(100, eduQuality));
  infraQuality = Math.max(0, Math.min(100, infraQuality));

  return {
    ...state,
    services: {
      nhsQuality,
      educationQuality: eduQuality,
      infrastructureQuality: infraQuality,
      mentalHealthAccess,
      primaryCareAccess,
      socialCareQuality,
      prisonSafety,
      courtBacklogPerformance,
      legalAidAccess,
      policingEffectiveness,
      borderSecurityPerformance,
      railReliability,
      affordableHousingDelivery,
      floodResilience,
      researchInnovationOutput,
      consecutiveNHSCutMonths: services.consecutiveNHSCutMonths,
      consecutiveEducationCutMonths: services.consecutiveEducationCutMonths,
      consecutivePensionCutMonths: services.consecutivePensionCutMonths,
      nhsStrikeMonthsRemaining: services.nhsStrikeMonthsRemaining,
      educationStrikeMonthsRemaining: services.educationStrikeMonthsRemaining,
      pensionerRevoltCooldown: services.pensionerRevoltCooldown,
      nhsStrikeCooldown: services.nhsStrikeCooldown,
      teacherStrikeCooldown: services.teacherStrikeCooldown,
      strikeTriggerThresholdMultiplier: services.strikeTriggerThresholdMultiplier,
      staffingCapacity: staffing,
    },
  };
}
