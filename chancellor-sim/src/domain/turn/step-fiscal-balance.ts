// Step 8: Fiscal Balance

import { GameState } from '../../types';
import { AdviserBonuses, getAdviserBonuses } from './shared-helpers';
import { calculateDebtDynamics, DebtInputs } from '../fiscal/debt';
import { getFiscalRuleById, calculateRuleHeadroom } from '../../game-integration';

export function processStepFiscalBalance(state: GameState, adviserBonuses: AdviserBonuses): GameState {
  const { fiscal, economic, emergencyProgrammes } = state;
  const bonuses = getAdviserBonuses(state);
  const { debtManagement, refinancingPremiumRiskModifier } = advanceDebtManagement(state);
  const profile = debtManagement.maturityProfile;

  const emergencyRebuildingCosts = emergencyProgrammes.active
    .filter((prog) => prog.remainingMonths > 0)
    .reduce((sum, prog) => sum + prog.rebuildingCostPerMonth_bn, 0);

  const welfareAMEFloor = 115 + Math.max(0, economic.unemploymentRate - 4.5) * 4 + (fiscal.housingAMEPressure_bn || 0);
  const welfareReformAMECost =
    Math.max(0, 55 - (fiscal.ucTaperRate || 55)) * 0.7 +
    Math.max(0, ((fiscal.workAllowanceMonthly || 344) - 344) / 50) * 0.4 +
    Math.max(0, ((fiscal.childcareSupportRate || 30) - 30) / 10) * 1.2;
  const welfareAMEApplied = Math.max(fiscal.welfareAME_bn || 115, welfareAMEFloor) + welfareReformAMECost;
  const welfareAMEAutoGrowth_bn = Math.max(0, welfareAMEApplied - (fiscal.welfareAME_bn || 115));

  const fpcConstraintCost_bn = fiscal.fpcConstraintCost_bn || 0;
  const barnettConsequentials_bn = fiscal.barnettConsequentials_bn || 0;
  const industrialStrategyCost_bn = state.industrialStrategy.totalAnnualCost_bn || 0;
  const localGovernmentGrantCost_bn = (state.devolution.localGov.centralGrant_bn || 30) - 30;
  const capitalPreparationCost_bn = state.capitalDelivery.procurementPrepCost_bn || 0;

  const debtInputs: DebtInputs = {
    debtNominal_bn: fiscal.debtNominal_bn,
    totalRevenue_bn: fiscal.totalRevenue_bn,
    totalSpending_bn: fiscal.totalSpending_bn,
    gdpNominal_bn: economic.gdpNominal_bn,
    bankRate: state.markets.bankRate,
    inflationCPI: economic.inflationCPI,
    debtMaturityProfile: {
      shortTerm_bn: profile.shortTerm.outstanding_bn,
      shortTermCoupon: profile.shortTerm.avgCoupon,
      medium_bn: profile.medium.outstanding_bn,
      mediumCoupon: profile.medium.avgCoupon,
      longTerm_bn: profile.longTerm.outstanding_bn,
      longTermCoupon: profile.longTerm.avgCoupon,
      indexLinked_bn: profile.indexLinked.outstanding_bn,
    },
    debtInterestReduction: bonuses.debtInterestReduction,
    emergencyRebuildingCosts,
    welfareAMEAutoGrowth_bn,
    fpcConstraintCost_bn,
    barnettConsequentials_bn,
    industrialStrategyCost_bn,
    localGovernmentGrantCost_bn,
    capitalPreparationCost_bn,
  };

  const debtResult = calculateDebtDynamics(debtInputs);

  const totalCapitalSpending =
    fiscal.spending.nhsCapital +
    fiscal.spending.educationCapital +
    fiscal.spending.defenceCapital +
    fiscal.spending.infrastructureCapital +
    fiscal.spending.policeCapital +
    fiscal.spending.justiceCapital +
    fiscal.spending.otherCapital;

  const currentBudgetBalance =
    fiscal.totalRevenue_bn -
    (fiscal.totalSpending_bn - totalCapitalSpending) -
    debtResult.debtInterest_bn -
    emergencyRebuildingCosts;
  const chosenRule = getFiscalRuleById(state.political.chosenFiscalRule);
  const headroom = calculateRuleHeadroom(
    chosenRule,
    currentBudgetBalance,
    debtResult.deficitPctGDP,
    economic.gdpNominal_bn,
    fiscal.totalRevenue_bn,
    fiscal.totalSpending_bn,
    debtResult.debtInterest_bn
  );

  const updatedPolicyRiskModifiers = refinancingPremiumRiskModifier
    ? [...(state.policyRiskModifiers || []), refinancingPremiumRiskModifier]
    : state.policyRiskModifiers;

  return {
    ...state,
    fiscal: {
      ...fiscal,
      deficit_bn: debtResult.deficit_bn,
      deficitPctGDP: debtResult.deficitPctGDP,
      debtNominal_bn: debtResult.debtNominal_bn,
      debtPctGDP: debtResult.debtPctGDP,
      fiscalHeadroom_bn: headroom,
      welfareAME_bn: welfareAMEApplied,
      debtInterest_bn: debtResult.debtInterest_bn,
    },
    debtManagement,
    policyRiskModifiers: updatedPolicyRiskModifiers,
  };
}

function advanceDebtManagement(state: GameState): {
  debtManagement: GameState['debtManagement'];
  refinancingPremiumRiskModifier: any | null;
} {
  const dm = state.debtManagement;
  const profile = {
    shortTerm: { ...dm.maturityProfile.shortTerm },
    medium: { ...dm.maturityProfile.medium },
    longTerm: { ...dm.maturityProfile.longTerm },
    indexLinked: { ...dm.maturityProfile.indexLinked },
  };
  let refinancingPremiumRiskModifier: any | null = null;
  profile.shortTerm.turnsToMaturity = Math.max(0, profile.shortTerm.turnsToMaturity - 1);
  profile.medium.turnsToMaturity = Math.max(0, profile.medium.turnsToMaturity - 1);
  profile.longTerm.turnsToMaturity = Math.max(0, profile.longTerm.turnsToMaturity - 1);
  profile.indexLinked.turnsToMaturity = Math.max(0, profile.indexLinked.turnsToMaturity - 1);

  const monthlyBorrowing = state.fiscal.deficit_bn / 12;
  if (monthlyBorrowing > 0) {
    if (dm.issuanceStrategy === 'short') {
      profile.shortTerm.outstanding_bn += monthlyBorrowing * 0.65;
      profile.medium.outstanding_bn += monthlyBorrowing * 0.2;
      profile.longTerm.outstanding_bn += monthlyBorrowing * 0.1;
      profile.indexLinked.outstanding_bn += monthlyBorrowing * 0.05;
      profile.shortTerm.avgCoupon = state.markets.bankRate;
    } else if (dm.issuanceStrategy === 'long') {
      profile.shortTerm.outstanding_bn += monthlyBorrowing * 0.1;
      profile.medium.outstanding_bn += monthlyBorrowing * 0.25;
      profile.longTerm.outstanding_bn += monthlyBorrowing * 0.55;
      profile.indexLinked.outstanding_bn += monthlyBorrowing * 0.1;
      profile.longTerm.avgCoupon = state.markets.giltYield10y + 0.5;
    } else {
      profile.shortTerm.outstanding_bn += monthlyBorrowing * 0.25;
      profile.medium.outstanding_bn += monthlyBorrowing * 0.35;
      profile.longTerm.outstanding_bn += monthlyBorrowing * 0.25;
      profile.indexLinked.outstanding_bn += monthlyBorrowing * 0.15;
    }
  } else if (monthlyBorrowing < 0) {
    const repayment = Math.abs(monthlyBorrowing);
    profile.shortTerm.outstanding_bn = Math.max(0, profile.shortTerm.outstanding_bn - repayment);
  }

  if (profile.shortTerm.turnsToMaturity === 0) {
    const rolloverAmount = profile.shortTerm.outstanding_bn * 0.15;
    profile.shortTerm.outstanding_bn -= rolloverAmount;
    if (dm.issuanceStrategy === 'short') {
      profile.shortTerm.outstanding_bn += rolloverAmount;
      profile.shortTerm.avgCoupon = state.markets.giltYield10y;
    } else if (dm.issuanceStrategy === 'long') {
      profile.longTerm.outstanding_bn += rolloverAmount;
      profile.longTerm.avgCoupon = state.markets.giltYield10y + 0.5;
    } else {
      profile.medium.outstanding_bn += rolloverAmount * 0.6;
      profile.longTerm.outstanding_bn += rolloverAmount * 0.4;
    }
    profile.shortTerm.turnsToMaturity = 8;
    profile.medium.turnsToMaturity = Math.max(1, profile.medium.turnsToMaturity || 60);
    profile.longTerm.turnsToMaturity = Math.max(1, profile.longTerm.turnsToMaturity || 240);
  }

  const qeHoldings_bn = Math.max(0, dm.qeHoldings_bn - 8);
  const totalDebt = Math.max(1, state.fiscal.debtNominal_bn);
  const weightedAverageMaturity =
    (profile.shortTerm.outstanding_bn * 2 +
      profile.medium.outstanding_bn * 6.5 +
      profile.longTerm.outstanding_bn * 18 +
      profile.indexLinked.outstanding_bn * 12) /
    totalDebt;
  const refinancingRisk = Math.max(
    0,
    Math.min(100, (profile.shortTerm.outstanding_bn / totalDebt) * 150 + (100 - qeHoldings_bn / 10))
  );

  const snapshots = state.simulation.monthlySnapshots || [];
  const sixAgo = snapshots.length >= 6 ? snapshots[snapshots.length - 6] : null;
  const yieldRise = sixAgo ? state.markets.giltYield10y - sixAgo.giltYield : 0;
  if (refinancingRisk > 70 && yieldRise > 1) {
    refinancingPremiumRiskModifier = {
      id: `refinancing_premium_${state.metadata.currentTurn}`,
      type: 'market_reaction_boost',
      turnsRemaining: 3,
      marketReactionScaleDelta: 0.15,
      description: 'Refinancing premium after short-term rollover stress.',
    };
  }

  const previousRolloverRiskPremium = dm.rolloverRiskPremium_bps || 0;
  let rolloverRiskPremium_bps = previousRolloverRiskPremium;
  let strategyYieldEffect_bps = 0;

  const totalOutstanding = Math.max(
    1,
    profile.shortTerm.outstanding_bn +
      profile.medium.outstanding_bn +
      profile.longTerm.outstanding_bn +
      profile.indexLinked.outstanding_bn
  );
  const indexLinkedShare = profile.indexLinked.outstanding_bn / totalOutstanding;

  if (dm.issuanceStrategy === 'short') {
    strategyYieldEffect_bps = -14;
    rolloverRiskPremium_bps = Math.min(20, previousRolloverRiskPremium + 2);
  } else if (dm.issuanceStrategy === 'long') {
    strategyYieldEffect_bps = 14;
    rolloverRiskPremium_bps = Math.max(0, previousRolloverRiskPremium - 2);
  } else {
    strategyYieldEffect_bps = 0;
    rolloverRiskPremium_bps = Math.max(0, previousRolloverRiskPremium - 1);
  }
  if (indexLinkedShare > 0.25) {
    strategyYieldEffect_bps += Math.min(8, (indexLinkedShare - 0.25) * 40);
  }

  const projectedDebtInterestByStrategy_bn = {
    short: Math.max(
      0,
      state.fiscal.debtInterest_bn +
        state.fiscal.debtNominal_bn * -0.0007 +
        (rolloverRiskPremium_bps / 10000) * state.fiscal.debtNominal_bn
    ),
    balanced: Math.max(0, state.fiscal.debtInterest_bn),
    long: Math.max(0, state.fiscal.debtInterest_bn + state.fiscal.debtNominal_bn * 0.001),
  };

  return {
    debtManagement: {
      ...dm,
      maturityProfile: profile,
      qeHoldings_bn,
      weightedAverageMaturity,
      refinancingRisk,
      rolloverRiskPremium_bps,
      strategyYieldEffect_bps,
      projectedDebtInterestByStrategy_bn,
    },
    refinancingPremiumRiskModifier,
  };
}
