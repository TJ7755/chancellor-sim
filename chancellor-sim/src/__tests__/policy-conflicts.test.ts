import { detectPolicyConflicts } from '../domain/budget/policy-conflicts';

describe('policy conflict detection', () => {
  it('detects demand-shock risk for contradictory fiscal stance', () => {
    const taxes = new Map([
      ['vat', { id: 'vat', currentRate: 20, proposedRate: 23 }],
      ['incomeTaxBasic', { id: 'incomeTaxBasic', currentRate: 20, proposedRate: 22 }],
    ]);
    const spending = new Map([
      ['health', { department: 'Health and Social Care', currentBudget: 180, proposedBudget: 160 }],
      ['education', { department: 'Education', currentBudget: 90, proposedBudget: 80 }],
      ['homeOffice', { department: 'Home Office', currentBudget: 12, proposedBudget: 10 }],
      ['justice', { department: 'Justice', currentBudget: 9, proposedBudget: 8 }],
      ['transport', { department: 'Transport', currentBudget: 15, proposedBudget: 12 }],
    ]);

    const conflicts = detectPolicyConflicts(taxes, spending, {
      nhsQuality: 50,
      educationQuality: 45,
    });

    expect(conflicts.some((c) => c.id === 'demand_shock')).toBe(true);
  });

  it('detects innovation deterrent from corp tax and R&D policy mix', () => {
    const taxes = new Map([
      ['corporationTax', { id: 'corporationTax', currentRate: 25, proposedRate: 32 }],
      ['rdTaxCredit', { id: 'rdTaxCredit', currentRate: 27, proposedRate: 20 }],
    ]);
    const spending = new Map();

    const conflicts = detectPolicyConflicts(taxes, spending, {
      nhsQuality: 70,
      educationQuality: 70,
    });

    expect(conflicts.some((c) => c.id === 'innovation_deterrent')).toBe(true);
  });

  it('detects strike accelerator when cutting frontline departments with weak services', () => {
    const taxes = new Map();
    const spending = new Map([
      ['health', { department: 'Health and Social Care', currentBudget: 180, proposedBudget: 170 }],
    ]);

    const conflicts = detectPolicyConflicts(taxes, spending, {
      nhsQuality: 40,
      educationQuality: 70,
    });

    expect(conflicts.some((c) => c.id === 'strike_accelerator')).toBe(true);
  });

  it('returns no conflicts for balanced policy', () => {
    const taxes = new Map();
    const spending = new Map();

    const conflicts = detectPolicyConflicts(taxes, spending, {
      nhsQuality: 70,
      educationQuality: 70,
    });

    expect(conflicts).toHaveLength(0);
  });
});
