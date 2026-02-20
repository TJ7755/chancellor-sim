import { detectPolicyConflicts } from '../budget-system';

describe('detectPolicyConflicts', () => {
  it('flags demand-shock conflict when large tax rises combine with broad cuts', () => {
    const taxes = new Map<string, any>([
      ['vat', { currentRate: 20, proposedRate: 22 }],
      ['incomeTaxBasic', { currentRate: 20, proposedRate: 22 }],
      ['corporationTax', { currentRate: 25, proposedRate: 25 }],
    ]);

    const spending = new Map<string, any>([
      ['a', { department: 'Health and Social Care', type: 'resource', currentBudget: 100, proposedBudget: 90 }],
      ['b', { department: 'Education', type: 'resource', currentBudget: 100, proposedBudget: 90 }],
      ['c', { department: 'Defence', type: 'resource', currentBudget: 100, proposedBudget: 90 }],
      ['d', { department: 'Justice', type: 'resource', currentBudget: 100, proposedBudget: 90 }],
    ]);

    const state: any = { services: { nhsQuality: 60, educationQuality: 60 } };
    const conflicts = detectPolicyConflicts(taxes, spending, state);
    expect(conflicts.some((c) => c.id === 'demand_shock')).toBe(true);
  });
});
