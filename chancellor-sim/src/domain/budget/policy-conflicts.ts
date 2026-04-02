import type { PolicyRiskModifier } from '../../game-integration';

export interface TaxChangeInput {
  id: string;
  currentRate: number;
  proposedRate: number;
}

export interface SpendingChangeInput {
  department: string;
  currentBudget: number;
  proposedBudget: number;
}

export interface PolicyConflict {
  id: string;
  title: string;
  description: string;
  modifiers: PolicyRiskModifier[];
}

export interface PolicyConflictContext {
  nhsQuality: number;
  educationQuality: number;
}

export function detectPolicyConflicts(
  taxes: Map<string, TaxChangeInput>,
  spending: Map<string, SpendingChangeInput>,
  context: PolicyConflictContext
): PolicyConflict[] {
  const conflicts: PolicyConflict[] = [];

  const vatRise = (taxes.get('vat')?.proposedRate || 20) - (taxes.get('vat')?.currentRate || 20);
  const incomeTaxRise = (taxes.get('incomeTaxBasic')?.proposedRate || 20) - (taxes.get('incomeTaxBasic')?.currentRate || 20);

  const departments = Array.from(new Set(Array.from(spending.values()).map((item) => item.department)));
  const departmentCutCount = departments.filter((department) => {
    const items = Array.from(spending.values()).filter((item) => item.department === department);
    const current = items.reduce((sum, item) => sum + item.currentBudget, 0);
    const proposed = items.reduce((sum, item) => sum + item.proposedBudget, 0);
    return current > 0 && (proposed - current) / current < -0.05;
  }).length;

  const broadSpendingCut = departments.length > 0 && departmentCutCount >= Math.ceil(departments.length * 0.6);
  if ((vatRise >= 2 || incomeTaxRise >= 2) && broadSpendingCut) {
    conflicts.push({
      id: 'demand_shock',
      title: 'Demand shock risk',
      description: 'Large tax rises combined with broad real spending cuts could trigger a sharp demand contraction.',
      modifiers: [
        {
          id: `risk_macro_${Date.now()}`,
          type: 'macro_shock',
          turnsRemaining: 2,
          macroShockScaleDelta: 0.2,
          description: 'Demand-shock implementation risk from contradictory fiscal stance.',
        },
      ],
    });
  }

  const corpTax = taxes.get('corporationTax');
  const rdTaxCredit = taxes.get('rdTaxCredit');
  if ((corpTax?.proposedRate || 25) > 30 && (rdTaxCredit?.proposedRate || 27) < (rdTaxCredit?.currentRate || 27)) {
    conflicts.push({
      id: 'innovation_deterrent',
      title: 'Innovation deterrent',
      description: 'High corporation tax combined with weaker R&D credits may suppress investment and productivity growth.',
      modifiers: [
        {
          id: `risk_productivity_${Date.now()}`,
          type: 'productivity_drag',
          turnsRemaining: 6,
          productivityMonthlyPenalty_pp: 0.1,
          description: 'Innovation investment drag from corporate tax and R&D policy mix.',
        },
      ],
    });
  }

  const frontlineDepartments = ['Health and Social Care', 'Education', 'Home Office', 'Justice'];
  const payCut = frontlineDepartments.some((department) => {
    const items = Array.from(spending.values()).filter((item) => item.department === department && item.proposedBudget !== undefined);
    const current = items.reduce((sum, item) => sum + item.currentBudget, 0);
    const proposed = items.reduce((sum, item) => sum + item.proposedBudget, 0);
    return current > 0 && (proposed - current) / current < -0.02;
  });

  if (payCut && (context.nhsQuality < 55 || context.educationQuality < 55)) {
    conflicts.push({
      id: 'strike_accelerator',
      title: 'Industrial action accelerator',
      description: 'Public-sector take-home pay pressure with already weak service quality increases strike risk.',
      modifiers: [
        {
          id: `risk_strike_${Date.now()}`,
          type: 'strike_accelerator',
          turnsRemaining: 6,
          strikeThresholdMultiplier: 0.5,
          description: 'Lower strike-trigger threshold due to pay-service conflict.',
        },
      ],
    });
  }

  return conflicts;
}
