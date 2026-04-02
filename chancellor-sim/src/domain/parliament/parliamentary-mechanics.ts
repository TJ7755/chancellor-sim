import type { GameState } from '../../game-state';

export function applyPendingBudgetChange(fiscal: GameState['fiscal'], pending: Record<string, any>): GameState['fiscal'] {
  const next = {
    ...fiscal,
    spending: { ...fiscal.spending },
    detailedTaxes: [...(fiscal.detailedTaxes || [])],
    detailedSpending: [...(fiscal.detailedSpending || [])],
  };
  if (pending.incomeTaxBasicChange) next.incomeTaxBasicRate += pending.incomeTaxBasicChange;
  if (pending.incomeTaxHigherChange) next.incomeTaxHigherRate += pending.incomeTaxHigherChange;
  if (pending.incomeTaxAdditionalChange) next.incomeTaxAdditionalRate += pending.incomeTaxAdditionalChange;
  if (pending.niEmployeeChange) next.nationalInsuranceRate += pending.niEmployeeChange;
  if (pending.niEmployerChange) next.employerNIRate += pending.niEmployerChange;
  if (pending.vatChange) next.vatRate += pending.vatChange;
  if (pending.corporationTaxChange) next.corporationTaxRate += pending.corporationTaxChange;
  if (pending.revenueAdjustment !== undefined) next.revenueAdjustment_bn = pending.revenueAdjustment;
  const spendingKeys = [
    'nhsCurrentChange', 'nhsCapitalChange', 'educationCurrentChange', 'educationCapitalChange',
    'defenceCurrentChange', 'defenceCapitalChange', 'welfareCurrentChange', 'infrastructureCurrentChange',
    'infrastructureCapitalChange', 'policeCurrentChange', 'policeCapitalChange', 'justiceCurrentChange',
    'justiceCapitalChange', 'otherCurrentChange', 'otherCapitalChange',
  ] as const;
  spendingKeys.forEach((key) => {
    if (pending[key] === undefined) return;
    const mapped = key.replace('Change', '').replace(/^[a-z]/, (m: string) => m.toLowerCase());
    (next.spending as any)[mapped] = ((next.spending as any)[mapped] || 0) + pending[key];
  });
  next.spending.nhs = next.spending.nhsCurrent + next.spending.nhsCapital;
  next.spending.education = next.spending.educationCurrent + next.spending.educationCapital;
  next.spending.defence = next.spending.defenceCurrent + next.spending.defenceCapital;
  next.spending.welfare = next.spending.welfareCurrent;
  next.spending.infrastructure = next.spending.infrastructureCurrent + next.spending.infrastructureCapital;
  next.spending.police = next.spending.policeCurrent + next.spending.policeCapital;
  next.spending.justice = next.spending.justiceCurrent + next.spending.justiceCapital;
  next.spending.other = next.spending.otherCurrent + next.spending.otherCapital;
  if (pending.detailedTaxRates) {
    next.detailedTaxes = next.detailedTaxes.map((tax) => pending.detailedTaxRates[tax.id] !== undefined ? { ...tax, currentRate: pending.detailedTaxRates[tax.id] } : tax);
  }
  if (pending.detailedSpendingBudgets) {
    next.detailedSpending = next.detailedSpending.map((item) => pending.detailedSpendingBudgets[item.id] !== undefined ? { ...item, currentBudget: pending.detailedSpendingBudgets[item.id] } : item);
  }
  next.totalSpending_bn =
    next.spending.nhs + next.spending.education + next.spending.defence + next.spending.welfare +
    next.spending.infrastructure + next.spending.police + next.spending.justice + next.spending.other;
  return next;
}

export function processParliamentaryMechanics(state: GameState): GameState {
  const parliamentary = { ...state.parliamentary };
  let political = { ...state.political };
  let fiscal = { ...state.fiscal };

  parliamentary.whipStrength = Math.max(0, parliamentary.whipStrength - 1);
  if ((state.manifesto.totalViolations || 0) > 0) {
    parliamentary.whipStrength = Math.max(0, parliamentary.whipStrength - 3);
  }
  if (political.pmTrust > 60) parliamentary.whipStrength = Math.min(100, parliamentary.whipStrength + 3);
  if ((state.spendingReview.srCredibilityBonus || 0) > 0) parliamentary.whipStrength = Math.min(100, parliamentary.whipStrength + 5);

  if (parliamentary.lordsDelayActive) {
    parliamentary.lordsDelayTurnsRemaining = Math.max(0, parliamentary.lordsDelayTurnsRemaining - 1);
    if (parliamentary.lordsDelayTurnsRemaining === 0) {
      parliamentary.lordsDelayActive = false;
      parliamentary.lordsDelayBillType = null;
    }
  }

  if (fiscal.pendingBudgetChange && fiscal.pendingBudgetApplyTurn !== null && state.metadata.currentTurn >= fiscal.pendingBudgetApplyTurn) {
    fiscal = applyPendingBudgetChange(fiscal, fiscal.pendingBudgetChange);
    fiscal.pendingBudgetChange = null;
    fiscal.pendingBudgetApplyTurn = null;
  }

  parliamentary.selectCommittees = parliamentary.selectCommittees.map((committee) => {
    const next = { ...committee };
    let trigger = false;
    let pressureDelta = -2;
    if (committee.id === 'treasury') {
      trigger = state.fiscal.deficit_bn > (state.simulation.monthlySnapshots?.[Math.max(0, (state.simulation.monthlySnapshots.length || 1) - 12)]?.deficit || state.fiscal.deficitPctGDP) + 30 || (state.fiscal.fiscalRuleBreaches || 0) > 0;
      pressureDelta = trigger ? 5 : -2;
    } else if (committee.id === 'health') {
      trigger = state.services.nhsQuality < 55 || (state.services.nhsStrikeMonthsRemaining || 0) > 0;
      pressureDelta = trigger ? 4 : -2;
    } else if (committee.id === 'education') {
      trigger = state.services.educationQuality < 58 || (state.services.educationStrikeMonthsRemaining || 0) > 0;
      pressureDelta = trigger ? 4 : -2;
    } else if (committee.id === 'publicAccounts') {
      const anyCapacityLow = Object.values(state.spendingReview.departments).some((d: any) => d.deliveryCapacity < 40);
      trigger = anyCapacityLow;
      pressureDelta = trigger ? 3 : -2;
    } else if (committee.id === 'homeAffairs') {
      trigger = state.services.policingEffectiveness < 48 || state.services.prisonSafety < 42;
      pressureDelta = trigger ? 3 : -2;
    }
    next.scrutinyPressure = Math.max(0, Math.min(100, next.scrutinyPressure + pressureDelta));
    if (!next.isInquiryActive && next.scrutinyPressure > (next.inquiryTriggerThreshold || 70)) {
      next.isInquiryActive = true;
      next.inquiryTurnsRemaining = 8;
      next.credibilityImpact = -3;
    }
    if (next.isInquiryActive) {
      next.inquiryTurnsRemaining = Math.max(0, next.inquiryTurnsRemaining - 1);
      if (next.inquiryTurnsRemaining === 0) {
        next.isInquiryActive = false;
        next.credibilityImpact = 0;
        next.scrutinyPressure = Math.max(20, next.scrutinyPressure - 20);
      }
    }
    return next;
  });

  const activeInquiryPenalty = parliamentary.selectCommittees.filter((c) => c.isInquiryActive).length * 3;
  political.credibilityIndex = Math.max(0, Math.min(100, political.credibilityIndex - activeInquiryPenalty));
  if ((state.spendingReview.srCredibilityBonus || 0) > 0) {
    political.credibilityIndex = Math.max(0, Math.min(100, political.credibilityIndex + (state.spendingReview.srCredibilityBonus / 8)));
  }

  const labourOppositionCount = Array.from(state.mpSystem.currentBudgetSupport.entries())
    .filter(([mpId, stance]) => state.mpSystem.allMPs.get(mpId)?.party === 'labour' && stance.stance === 'oppose')
    .length;
  if (labourOppositionCount >= 10) {
    parliamentary.rebellionCount += 1;
    if (labourOppositionCount > 15) {
      parliamentary.whipStrength = Math.max(0, parliamentary.whipStrength - 5);
    }
  }

  const confidenceTrigger = political.backbenchSatisfaction < 25 || parliamentary.rebellionCount >= 3;
  if (!parliamentary.formalConfidenceVotePending && confidenceTrigger) {
    parliamentary.formalConfidenceVotePending = true;
    parliamentary.confidenceVoteTurn = state.metadata.currentTurn + 2;
  }
  if (parliamentary.formalConfidenceVotePending && parliamentary.confidenceVoteTurn === state.metadata.currentTurn) {
    const labourMPs = Array.from(state.mpSystem.allMPs.values()).filter((mp) => mp.party === 'labour');
    const supportStances = Array.from(state.mpSystem.currentBudgetSupport.values()).filter((s) => s.stance === 'support').length;
    const supportRatio = labourMPs.length > 0 ? (supportStances / labourMPs.length) * (parliamentary.whipStrength / 100) : 1;
    if (supportRatio < 0.5) {
      return {
        ...state,
        metadata: {
          ...state.metadata,
          gameOver: true,
          gameOverReason: 'You lost a formal confidence vote in the Commons and were replaced as Chancellor.',
        },
        parliamentary,
      };
    }
    parliamentary.formalConfidenceVotePending = false;
    parliamentary.confidenceVoteTurn = null;
    parliamentary.rebellionCount = 0;
    parliamentary.whipStrength = Math.min(100, parliamentary.whipStrength + 10);
    political.backbenchSatisfaction = Math.min(100, political.backbenchSatisfaction + 15);
  }

  return {
    ...state,
    parliamentary,
    political,
    fiscal,
  };
}
