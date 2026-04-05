// Step 13.5: Update MP Stances
import { GameState } from '../../types';

import { createInitialFiscalState } from '../../game-integration';
import { BudgetChanges } from '../../types';
import { calculateAllMPStances } from '../../mp-system';

const BASELINE_FISCAL_STATE = createInitialFiscalState();
const BASELINE_DETAILED_SPENDING = Object.fromEntries(
  BASELINE_FISCAL_STATE.detailedSpending.map((item) => [item.id, item.currentBudget])
) as Record<string, number>;
const BASELINE_DETAILED_TAX = Object.fromEntries(
  BASELINE_FISCAL_STATE.detailedTaxes.map((item) => [item.id, item.currentRate])
) as Record<string, number>;

export function processStepMPStances(state: GameState): GameState {
  if (!state.mpSystem || state.mpSystem.allMPs.size === 0) {
    return state;
  }

  const baseline = createInitialFiscalState();
  const budgetChanges: BudgetChanges = {
    incomeTaxBasicChange: state.fiscal.incomeTaxBasicRate - baseline.incomeTaxBasicRate,
    incomeTaxHigherChange: state.fiscal.incomeTaxHigherRate - baseline.incomeTaxHigherRate,
    incomeTaxAdditionalChange: state.fiscal.incomeTaxAdditionalRate - baseline.incomeTaxAdditionalRate,
    niEmployeeChange: state.fiscal.nationalInsuranceRate - baseline.nationalInsuranceRate,
    niEmployerChange: state.fiscal.employerNIRate - baseline.employerNIRate,
    vatChange: state.fiscal.vatRate - baseline.vatRate,
    corporationTaxChange: state.fiscal.corporationTaxRate - baseline.corporationTaxRate,
    nhsSpendingChange: state.fiscal.spending.nhs - baseline.spending.nhs,
    educationSpendingChange: state.fiscal.spending.education - baseline.spending.education,
    defenceSpendingChange: state.fiscal.spending.defence - baseline.spending.defence,
    welfareSpendingChange: state.fiscal.spending.welfare - baseline.spending.welfare,
    infrastructureSpendingChange: state.fiscal.spending.infrastructure - baseline.spending.infrastructure,
    policeSpendingChange: state.fiscal.spending.police - baseline.spending.police,
    justiceSpendingChange: state.fiscal.spending.justice - baseline.spending.justice,
    otherSpendingChange: state.fiscal.spending.other - baseline.spending.other,
    detailedTaxRates: Object.fromEntries(
      (state.fiscal.detailedTaxes || []).map((tax: { id: string; currentRate: number }) => [
        tax.id,
        tax.currentRate - (BASELINE_DETAILED_TAX[tax.id] ?? tax.currentRate),
      ])
    ),
    detailedSpendingBudgets: Object.fromEntries(
      (state.fiscal.detailedSpending || []).map((item: { id: string; currentBudget: number }) => [
        item.id,
        item.currentBudget - (BASELINE_DETAILED_SPENDING[item.id] ?? item.currentBudget),
      ])
    ),
  };

  const manifestoViolations: string[] = [];
  if (state.manifesto && state.manifesto.pledges) {
    state.manifesto.pledges.forEach((pledge: any) => {
      if (pledge.violated || pledge.broken) {
        manifestoViolations.push(pledge.id || pledge.description || 'unknown');
      }
    });
  }

  const newStances = calculateAllMPStances(
    state.mpSystem,
    budgetChanges,
    manifestoViolations,
    state.metadata.currentTurn,
    {
      whipStrength: state.parliamentary.whipStrength,
      taxDistribution: state.distributional.lastTaxChangeDistribution,
    }
  );

  return {
    ...state,
    mpSystem: {
      ...state.mpSystem,
      currentBudgetSupport: newStances,
    },
  };
}
