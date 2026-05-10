import type { GameState } from '../../game-state';

export interface BudgetSubmissionResult {
  success: boolean;
  errors: string[];
  warnings: string[];
}

export function validateBudgetSubmission(state: GameState): BudgetSubmissionResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!state.fiscal) {
    errors.push('Fiscal state not initialised');
    return { success: false, errors, warnings };
  }

  const { deficitPctGDP, debtPctGDP } = state.fiscal;
  const fiscalRuleCompliance = state.political?.fiscalRuleCompliance;

  if (deficitPctGDP !== undefined && deficitPctGDP > 10) {
    errors.push('Deficit exceeds 10% of GDP - budget not viable');
  }

  if (debtPctGDP !== undefined && debtPctGDP > 150) {
    warnings.push('Debt ratio above 150% - markets may react adversely');
  }

  if (fiscalRuleCompliance && !fiscalRuleCompliance.overallCompliant) {
    const breaches: string[] = [];
    if (!fiscalRuleCompliance.currentBudgetMet) breaches.push('current budget');
    if (!fiscalRuleCompliance.overallBalanceMet) breaches.push('overall balance');
    if (!fiscalRuleCompliance.deficitCeilingMet) breaches.push('deficit ceiling');
    if (!fiscalRuleCompliance.debtTargetMet) breaches.push('debt target');
    if (!fiscalRuleCompliance.debtFallingMet) breaches.push('debt falling');
    if (breaches.length > 0) {
      warnings.push(`Fiscal rule breaches: ${breaches.join(', ')}`);
    }
  }

  return {
    success: errors.length === 0,
    errors,
    warnings,
  };
}


