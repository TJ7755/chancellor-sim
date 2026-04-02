import { processParliamentaryMechanics } from '../domain/parliament/parliamentary-mechanics';

describe('parliamentary mechanics', () => {
  it('applies delayed budget changes when the Lords delay expires', () => {
    const state: any = {
      metadata: { currentTurn: 12, gameOver: false },
      manifesto: { totalViolations: 0 },
      spendingReview: {
        srCredibilityBonus: 0,
        departments: {
          nhs: { deliveryCapacity: 60 },
          education: { deliveryCapacity: 60 },
          defence: { deliveryCapacity: 60 },
          infrastructure: { deliveryCapacity: 60 },
          homeOffice: { deliveryCapacity: 60 },
          localGov: { deliveryCapacity: 60 },
          other: { deliveryCapacity: 60 },
        },
      },
      services: {
        nhsQuality: 60,
        nhsStrikeMonthsRemaining: 0,
        educationQuality: 60,
        educationStrikeMonthsRemaining: 0,
        policingEffectiveness: 60,
        prisonSafety: 60,
      },
      political: {
        pmTrust: 50,
        credibilityIndex: 60,
        backbenchSatisfaction: 50,
      },
      fiscal: {
        deficit_bn: 80,
        deficitPctGDP: 3.2,
        fiscalRuleBreaches: 0,
        pendingBudgetChange: {
          incomeTaxBasicChange: 1,
        },
        pendingBudgetApplyTurn: 12,
        spending: {
          nhsCurrent: 10, nhsCapital: 2, nhs: 12,
          educationCurrent: 8, educationCapital: 1, education: 9,
          defenceCurrent: 7, defenceCapital: 1, defence: 8,
          welfareCurrent: 6, welfare: 6,
          infrastructureCurrent: 5, infrastructureCapital: 2, infrastructure: 7,
          policeCurrent: 4, policeCapital: 1, police: 5,
          justiceCurrent: 3, justiceCapital: 1, justice: 4,
          otherCurrent: 2, otherCapital: 1, other: 3,
        },
        detailedTaxes: [],
        detailedSpending: [],
        incomeTaxBasicRate: 20,
      },
      parliamentary: {
        whipStrength: 70,
        lordsDelayActive: true,
        lordsDelayTurnsRemaining: 1,
        lordsDelayBillType: 'tax',
        selectCommittees: [],
        rebellionCount: 0,
        formalConfidenceVotePending: false,
        confidenceVoteTurn: null,
      },
      simulation: { monthlySnapshots: [] },
      mpSystem: {
        currentBudgetSupport: new Map(),
        allMPs: new Map(),
      },
    };

    const updated = processParliamentaryMechanics(state);

    expect(updated.fiscal.incomeTaxBasicRate).toBe(21);
    expect(updated.fiscal.pendingBudgetChange).toBeNull();
    expect(updated.parliamentary.lordsDelayActive).toBe(false);
  });
});
