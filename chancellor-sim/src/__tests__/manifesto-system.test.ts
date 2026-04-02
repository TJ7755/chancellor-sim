import { executeOneClickAction, type ManifestoPledge } from '../manifesto-system';

const currentTaxRates = {
  incomeTaxBasic: 21,
  incomeTaxHigher: 40,
  incomeTaxAdditional: 45,
  niEmployee: 8,
  niEmployer: 13.8,
  vat: 20,
  corporationTax: 25,
};

const startingTaxRates = {
  incomeTaxBasic: 20,
  incomeTaxHigher: 40,
  incomeTaxAdditional: 45,
  niEmployee: 8,
  niEmployer: 13.8,
  vat: 20,
  corporationTax: 25,
};

describe('manifesto one-click actions', () => {
  it('restores tax-lock pledges to their starting rates', () => {
    const pledge: ManifestoPledge = {
      id: 'income-tax-lock',
      category: 'tax',
      description: 'No increase in income tax rates',
      detail: 'Test pledge',
      breakCost_approval: -7,
      breakCost_pmTrust: -8,
      backbenchConcern: 8,
      violated: true,
      oneClickAvailable: true,
      oneClickType: 'lock-tax-rates',
      oneClickDescription: 'Reset income tax rates',
      progressType: 'compliance',
    };

    const result = executeOneClickAction(pledge, currentTaxRates, startingTaxRates);

    expect(result.success).toBe(true);
    expect(result.pledgeId).toBe('income-tax-lock');
    expect(result.budgetChanges?.incomeTaxBasicChange).toBe(-1);
  });

  it('applies spending-allocation one-click actions', () => {
    const pledge: ManifestoPledge = {
      id: 'nhs-growth',
      category: 'spending',
      description: 'Deliver NHS growth',
      detail: 'Test pledge',
      breakCost_approval: -5,
      breakCost_pmTrust: -6,
      backbenchConcern: 7,
      violated: true,
      oneClickAvailable: true,
      oneClickType: 'allocate-spending',
      oneClickCost: 4.5,
      oneClickDescription: 'Increase NHS spending',
      progressType: 'achievement',
      targetDepartment: 'nhs',
    };

    const result = executeOneClickAction(pledge, currentTaxRates, startingTaxRates);

    expect(result.success).toBe(true);
    expect(result.budgetChanges?.nhsSpendingChange).toBe(4.5);
  });
});
