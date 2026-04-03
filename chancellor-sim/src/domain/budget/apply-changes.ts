// Budget change application logic extracted from game-state.tsx.
// Pure function that takes the current state and budget changes, returns the new state.

import { GameState, BudgetChanges } from '../../types';
import { checkPolicyForViolations, applyManifestoViolations, ManifestoState } from '../../manifesto-system';
import { INDUSTRIAL_INTERVENTION_CATALOGUE } from '../../data/industrial-interventions';
import { PipelineItem } from '../../types';

function isFiscalEventTurn(turn: number): boolean {
  const monthInYear = ((turn + 6) % 12) + 1;
  return monthInYear === 3 || monthInYear === 11;
}

function findNextFiscalEventTurn(turn: number): number {
  for (let step = 0; step < 24; step++) {
    const candidate = turn + step;
    if (isFiscalEventTurn(candidate)) return candidate;
  }
  return turn + 1;
}

/**
 * Apply budget changes to game state. Returns the new state.
 * This is a pure function -- no side effects, no context access.
 */
export function applyBudgetChangesToState(
  prevState: GameState,
  changes: BudgetChanges
): GameState {
  const taxDeltas = {
    incomeTaxBasicChange: changes.incomeTaxBasicChange || 0,
    incomeTaxHigherChange: changes.incomeTaxHigherChange || 0,
    incomeTaxAdditionalChange: changes.incomeTaxAdditionalChange || 0,
    niEmployeeChange: changes.niEmployeeChange || 0,
    niEmployerChange: changes.niEmployerChange || 0,
    vatChange: changes.vatChange || 0,
    corporationTaxChange: changes.corporationTaxChange || 0,
  };

  const attemptedMajorTaxChange =
    taxDeltas.incomeTaxBasicChange !== 0 ||
    taxDeltas.incomeTaxHigherChange !== 0 ||
    taxDeltas.incomeTaxAdditionalChange !== 0 ||
    taxDeltas.vatChange !== 0 ||
    taxDeltas.corporationTaxChange !== 0;

  const inFiscalEventWindow = isFiscalEventTurn(prevState.metadata.currentTurn);
  const queueMajorTaxForEvent = attemptedMajorTaxChange && !inFiscalEventWindow;

  const appliedTaxDeltas = queueMajorTaxForEvent
    ? {
        incomeTaxBasicChange: 0,
        incomeTaxHigherChange: 0,
        incomeTaxAdditionalChange: 0,
        niEmployeeChange: taxDeltas.niEmployeeChange,
        niEmployerChange: taxDeltas.niEmployerChange,
        vatChange: 0,
        corporationTaxChange: 0,
      }
    : taxDeltas;

  const majorTaxRise = [
    taxDeltas.incomeTaxBasicChange,
    taxDeltas.incomeTaxHigherChange,
    taxDeltas.incomeTaxAdditionalChange,
    taxDeltas.niEmployeeChange,
    taxDeltas.niEmployerChange,
    taxDeltas.vatChange,
    taxDeltas.corporationTaxChange,
  ].some((delta) => delta > 5);

  const deptCuts: Array<{ current: number; delta: number; id: string }> = [
    { id: 'nhs', current: prevState.fiscal.spending.nhs, delta: (changes.nhsCurrentChange || 0) + (changes.nhsCapitalChange || 0) + (changes.nhsSpendingChange || 0) },
    { id: 'education', current: prevState.fiscal.spending.education, delta: (changes.educationCurrentChange || 0) + (changes.educationCapitalChange || 0) + (changes.educationSpendingChange || 0) },
    { id: 'defence', current: prevState.fiscal.spending.defence, delta: (changes.defenceCurrentChange || 0) + (changes.defenceCapitalChange || 0) + (changes.defenceSpendingChange || 0) },
    { id: 'infrastructure', current: prevState.fiscal.spending.infrastructure, delta: (changes.infrastructureCurrentChange || 0) + (changes.infrastructureCapitalChange || 0) + (changes.infrastructureSpendingChange || 0) },
    { id: 'homeOffice', current: prevState.fiscal.spending.police + prevState.fiscal.spending.justice, delta: (changes.policeCurrentChange || 0) + (changes.policeCapitalChange || 0) + (changes.justiceCurrentChange || 0) + (changes.justiceCapitalChange || 0) + (changes.policeSpendingChange || 0) + (changes.justiceSpendingChange || 0) },
    { id: 'other', current: prevState.fiscal.spending.other, delta: (changes.otherCurrentChange || 0) + (changes.otherCapitalChange || 0) + (changes.otherSpendingChange || 0) },
  ];
  const majorSpendingCut = deptCuts.some((dept) => {
    if (dept.current <= 0) return false;
    const nominalAfter = dept.current + dept.delta;
    const realAfter = nominalAfter / (1 + prevState.economic.inflationCPI / 100);
    return ((dept.current - realAfter) / dept.current) > 0.15;
  });

  if (majorTaxRise || majorSpendingCut) {
    const extendingExistingDelay = prevState.parliamentary.lordsDelayActive;
    return {
      ...prevState,
      fiscal: {
        ...prevState.fiscal,
        pendingBudgetChange: { ...(changes as Record<string, unknown>) },
        pendingBudgetApplyTurn: prevState.metadata.currentTurn + (extendingExistingDelay ? 12 : 6),
      },
      parliamentary: {
        ...prevState.parliamentary,
        lordsDelayActive: true,
        lordsDelayTurnsRemaining: extendingExistingDelay
          ? Math.min(12, Math.max(prevState.parliamentary.lordsDelayTurnsRemaining, 12))
          : 6,
        lordsDelayBillType: majorTaxRise ? 'tax' : 'spending',
      },
      political: {
        ...prevState.political,
        credibilityIndex: Math.max(0, prevState.political.credibilityIndex - 2),
      },
    };
  }

  const expectedInflationIncreaseFactor = prevState.economic.inflationCPI / 100;
  const nhsNominalChange =
    (changes.nhsCurrentChange || 0) +
    (changes.nhsCapitalChange || 0) +
    (changes.nhsSpendingChange || 0);
  const educationNominalChange =
    (changes.educationCurrentChange || 0) +
    (changes.educationCapitalChange || 0) +
    (changes.educationSpendingChange || 0);

  const nhsRequiredNominalIncrease = prevState.fiscal.spending.nhs * expectedInflationIncreaseFactor;
  const educationRequiredNominalIncrease =
    prevState.fiscal.spending.education * expectedInflationIncreaseFactor;

  const violationCheck = checkPolicyForViolations(prevState.manifesto, {
    incomeTaxBasicChange: appliedTaxDeltas.incomeTaxBasicChange,
    incomeTaxHigherChange: appliedTaxDeltas.incomeTaxHigherChange,
    incomeTaxAdditionalChange: appliedTaxDeltas.incomeTaxAdditionalChange,
    niEmployeeChange: appliedTaxDeltas.niEmployeeChange,
    niEmployerChange: appliedTaxDeltas.niEmployerChange,
    vatChange: appliedTaxDeltas.vatChange,
    corporationTaxChange: appliedTaxDeltas.corporationTaxChange,
    nhsSpendingCutReal: nhsNominalChange < nhsRequiredNominalIncrease,
    educationSpendingCutReal: educationNominalChange < educationRequiredNominalIncrease,
  });

  let newManifesto: ManifestoState = prevState.manifesto;
  if (violationCheck.violatedPledges.length > 0) {
    newManifesto = applyManifestoViolations(
      prevState.manifesto,
      violationCheck.violatedPledges,
      prevState.metadata.currentTurn
    );
  }

  const newFiscal = {
    ...prevState.fiscal,
    spending: { ...prevState.fiscal.spending },
    detailedTaxes: [...(prevState.fiscal.detailedTaxes || [])],
    detailedSpending: [...(prevState.fiscal.detailedSpending || [])],
  };

  // Update tax rates
  if (appliedTaxDeltas.incomeTaxBasicChange) newFiscal.incomeTaxBasicRate += appliedTaxDeltas.incomeTaxBasicChange;
  if (appliedTaxDeltas.incomeTaxHigherChange) newFiscal.incomeTaxHigherRate += appliedTaxDeltas.incomeTaxHigherChange;
  if (appliedTaxDeltas.incomeTaxAdditionalChange) newFiscal.incomeTaxAdditionalRate += appliedTaxDeltas.incomeTaxAdditionalChange;
  if (appliedTaxDeltas.niEmployeeChange) newFiscal.nationalInsuranceRate += appliedTaxDeltas.niEmployeeChange;
  if (appliedTaxDeltas.niEmployerChange) newFiscal.employerNIRate += appliedTaxDeltas.niEmployerChange;
  if (appliedTaxDeltas.vatChange) newFiscal.vatRate += appliedTaxDeltas.vatChange;
  if (appliedTaxDeltas.corporationTaxChange) newFiscal.corporationTaxRate += appliedTaxDeltas.corporationTaxChange;
  if (changes.personalAllowanceChange !== undefined) newFiscal.personalAllowance = Math.max(0, newFiscal.personalAllowance + changes.personalAllowanceChange);
  if (changes.basicRateUpperThresholdChange !== undefined) newFiscal.basicRateUpperThreshold = Math.max(newFiscal.personalAllowance + 1000, newFiscal.basicRateUpperThreshold + changes.basicRateUpperThresholdChange);
  if (changes.higherRateUpperThresholdChange !== undefined) newFiscal.higherRateUpperThreshold = Math.max(newFiscal.basicRateUpperThreshold + 1000, newFiscal.higherRateUpperThreshold + changes.higherRateUpperThresholdChange);
  if (changes.thresholdUprating !== undefined) newFiscal.thresholdUprating = changes.thresholdUprating;
  if (changes.fullExpensing !== undefined) newFiscal.fullExpensing = changes.fullExpensing;
  if (changes.antiAvoidanceInvestmentChange_bn !== undefined) newFiscal.antiAvoidanceInvestment_bn = Math.max(0, Math.min(3, (newFiscal.antiAvoidanceInvestment_bn || 0) + changes.antiAvoidanceInvestmentChange_bn));
  if (changes.hmrcSystemsInvestmentChange_bn !== undefined) newFiscal.hmrcSystemsInvestment_bn = Math.max(0, Math.min(1.5, (newFiscal.hmrcSystemsInvestment_bn || 0) + changes.hmrcSystemsInvestmentChange_bn));
  if (changes.sdltAdditionalDwellingsSurchargeChange !== undefined) newFiscal.sdltAdditionalDwellingsSurcharge = Math.max(0, Math.min(10, (newFiscal.sdltAdditionalDwellingsSurcharge || 3) + changes.sdltAdditionalDwellingsSurchargeChange));
  if (changes.ucTaperRateChange !== undefined) newFiscal.ucTaperRate = Math.max(35, Math.min(75, newFiscal.ucTaperRate + changes.ucTaperRateChange));
  if (changes.workAllowanceMonthlyChange !== undefined) newFiscal.workAllowanceMonthly = Math.max(0, newFiscal.workAllowanceMonthly + changes.workAllowanceMonthlyChange);
  if (changes.childcareSupportRateChange !== undefined) newFiscal.childcareSupportRate = Math.max(0, Math.min(100, newFiscal.childcareSupportRate + changes.childcareSupportRateChange));

  if (changes.detailedTaxRates) {
    newFiscal.detailedTaxes = newFiscal.detailedTaxes.map((tax: { id: string; currentRate: number }) => {
      const nextRate = changes.detailedTaxRates?.[tax.id];
      return nextRate !== undefined ? { ...tax, currentRate: nextRate } : tax;
    });
  }

  if (changes.revenueAdjustment !== undefined) newFiscal.revenueAdjustment_bn = changes.revenueAdjustment;

  // Update spending (current + capital)
  if (changes.nhsCurrentChange !== undefined) newFiscal.spending.nhsCurrent += changes.nhsCurrentChange;
  if (changes.nhsCapitalChange !== undefined) newFiscal.spending.nhsCapital += changes.nhsCapitalChange;
  if (changes.educationCurrentChange !== undefined) newFiscal.spending.educationCurrent += changes.educationCurrentChange;
  if (changes.educationCapitalChange !== undefined) newFiscal.spending.educationCapital += changes.educationCapitalChange;
  if (changes.defenceCurrentChange !== undefined) newFiscal.spending.defenceCurrent += changes.defenceCurrentChange;
  if (changes.defenceCapitalChange !== undefined) newFiscal.spending.defenceCapital += changes.defenceCapitalChange;
  if (changes.welfareCurrentChange !== undefined) newFiscal.spending.welfareCurrent += changes.welfareCurrentChange;
  if (changes.infrastructureCurrentChange !== undefined) newFiscal.spending.infrastructureCurrent += changes.infrastructureCurrentChange;
  if (changes.infrastructureCapitalChange !== undefined) newFiscal.spending.infrastructureCapital += changes.infrastructureCapitalChange;
  if (changes.policeCurrentChange !== undefined) newFiscal.spending.policeCurrent += changes.policeCurrentChange;
  if (changes.policeCapitalChange !== undefined) newFiscal.spending.policeCapital += changes.policeCapitalChange;
  if (changes.justiceCurrentChange !== undefined) newFiscal.spending.justiceCurrent += changes.justiceCurrentChange;
  if (changes.justiceCapitalChange !== undefined) newFiscal.spending.justiceCapital += changes.justiceCapitalChange;
  if (changes.otherCurrentChange !== undefined) newFiscal.spending.otherCurrent += changes.otherCurrentChange;
  if (changes.otherCapitalChange !== undefined) newFiscal.spending.otherCapital += changes.otherCapitalChange;

  // Legacy aggregate spending
  if (changes.nhsSpendingChange !== undefined) newFiscal.spending.nhs += changes.nhsSpendingChange;
  if (changes.educationSpendingChange !== undefined) newFiscal.spending.education += changes.educationSpendingChange;
  if (changes.defenceSpendingChange !== undefined) newFiscal.spending.defence += changes.defenceSpendingChange;
  if (changes.welfareSpendingChange !== undefined) newFiscal.spending.welfare += changes.welfareSpendingChange;
  if (changes.infrastructureSpendingChange !== undefined) newFiscal.spending.infrastructure += changes.infrastructureSpendingChange;
  if (changes.policeSpendingChange !== undefined) newFiscal.spending.police += changes.policeSpendingChange;
  if (changes.justiceSpendingChange !== undefined) newFiscal.spending.justice += changes.justiceSpendingChange;
  if (changes.otherSpendingChange !== undefined) newFiscal.spending.other += changes.otherSpendingChange;

  // Recompute aggregates
  newFiscal.spending.nhs = newFiscal.spending.nhsCurrent + newFiscal.spending.nhsCapital;
  newFiscal.spending.education = newFiscal.spending.educationCurrent + newFiscal.spending.educationCapital;
  newFiscal.spending.defence = newFiscal.spending.defenceCurrent + newFiscal.spending.defenceCapital;
  newFiscal.spending.welfare = newFiscal.spending.welfareCurrent;
  newFiscal.spending.infrastructure = newFiscal.spending.infrastructureCurrent + newFiscal.spending.infrastructureCapital;
  newFiscal.spending.police = newFiscal.spending.policeCurrent + newFiscal.spending.policeCapital;
  newFiscal.spending.justice = newFiscal.spending.justiceCurrent + newFiscal.spending.justiceCapital;
  newFiscal.spending.other = newFiscal.spending.otherCurrent + newFiscal.spending.otherCapital;

  newFiscal.totalSpending_bn =
    newFiscal.spending.nhs + newFiscal.spending.education + newFiscal.spending.defence +
    newFiscal.spending.welfare + newFiscal.spending.infrastructure + newFiscal.spending.police +
    newFiscal.spending.justice + newFiscal.spending.other;

  if (changes.detailedSpendingBudgets) {
    newFiscal.detailedSpending = newFiscal.detailedSpending.map((item: { id: string; type: string; currentBudget: number; currentAllocation: number; capitalAllocation: number }) => {
      const nextBudget = changes.detailedSpendingBudgets?.[item.id];
      if (nextBudget === undefined) return item;
      if (item.type === 'capital') {
        return { ...item, currentBudget: nextBudget, capitalAllocation: nextBudget, currentAllocation: 0 };
      }
      if (item.type === 'resource') {
        return { ...item, currentBudget: nextBudget, currentAllocation: nextBudget, capitalAllocation: 0 };
      }
      const total = (item.currentAllocation || 0) + (item.capitalAllocation || 0);
      const currentShare = total > 0 ? (item.currentAllocation || 0) / total : 1;
      const capitalShare = total > 0 ? (item.capitalAllocation || 0) / total : 0;
      return {
        ...item,
        currentBudget: nextBudget,
        currentAllocation: nextBudget * currentShare,
        capitalAllocation: nextBudget * capitalShare,
      };
    });
  }

  const nextCentralGrant = prevState.devolution.localGov.centralGrant_bn;
  const centralGrantAfterLevers = Math.max(0, nextCentralGrant + (changes.localGovCentralGrantChange_bn || 0));
  const councilTaxCapAfterLevers = Math.max(3, Math.min(10, (prevState.devolution.localGov.councilTaxGrowthCap || 3) + (changes.councilTaxGrowthCapChange || 0)));

  const nextSpendingReviewDepartments = {
    ...prevState.spendingReview.departments,
    nhs: {
      ...prevState.spendingReview.departments.nhs,
      resourceDEL_bn: newFiscal.spending.nhsCurrent,
      capitalDEL_bn: newFiscal.spending.nhsCapital,
      plannedResourceDEL_bn: [newFiscal.spending.nhsCurrent, ...(prevState.spendingReview.departments.nhs.plannedResourceDEL_bn || []).slice(1)],
      plannedCapitalDEL_bn: [newFiscal.spending.nhsCapital, ...(prevState.spendingReview.departments.nhs.plannedCapitalDEL_bn || []).slice(1)],
    },
    education: {
      ...prevState.spendingReview.departments.education,
      resourceDEL_bn: newFiscal.spending.educationCurrent,
      capitalDEL_bn: newFiscal.spending.educationCapital,
      plannedResourceDEL_bn: [newFiscal.spending.educationCurrent, ...(prevState.spendingReview.departments.education.plannedResourceDEL_bn || []).slice(1)],
      plannedCapitalDEL_bn: [newFiscal.spending.educationCapital, ...(prevState.spendingReview.departments.education.plannedCapitalDEL_bn || []).slice(1)],
    },
    defence: {
      ...prevState.spendingReview.departments.defence,
      resourceDEL_bn: newFiscal.spending.defenceCurrent,
      capitalDEL_bn: newFiscal.spending.defenceCapital,
      plannedResourceDEL_bn: [newFiscal.spending.defenceCurrent, ...(prevState.spendingReview.departments.defence.plannedResourceDEL_bn || []).slice(1)],
      plannedCapitalDEL_bn: [newFiscal.spending.defenceCapital, ...(prevState.spendingReview.departments.defence.plannedCapitalDEL_bn || []).slice(1)],
    },
    infrastructure: {
      ...prevState.spendingReview.departments.infrastructure,
      resourceDEL_bn: newFiscal.spending.infrastructureCurrent,
      capitalDEL_bn: newFiscal.spending.infrastructureCapital,
      plannedResourceDEL_bn: [newFiscal.spending.infrastructureCurrent, ...(prevState.spendingReview.departments.infrastructure.plannedResourceDEL_bn || []).slice(1)],
      plannedCapitalDEL_bn: [newFiscal.spending.infrastructureCapital, ...(prevState.spendingReview.departments.infrastructure.plannedCapitalDEL_bn || []).slice(1)],
    },
    homeOffice: {
      ...prevState.spendingReview.departments.homeOffice,
      resourceDEL_bn: newFiscal.spending.policeCurrent + newFiscal.spending.justiceCurrent,
      capitalDEL_bn: newFiscal.spending.policeCapital + newFiscal.spending.justiceCapital,
      plannedResourceDEL_bn: [newFiscal.spending.policeCurrent + newFiscal.spending.justiceCurrent, ...(prevState.spendingReview.departments.homeOffice.plannedResourceDEL_bn || []).slice(1)],
      plannedCapitalDEL_bn: [newFiscal.spending.policeCapital + newFiscal.spending.justiceCapital, ...(prevState.spendingReview.departments.homeOffice.plannedCapitalDEL_bn || []).slice(1)],
    },
    localGov: {
      ...prevState.spendingReview.departments.localGov,
      resourceDEL_bn: centralGrantAfterLevers,
      plannedResourceDEL_bn: [centralGrantAfterLevers, ...(prevState.spendingReview.departments.localGov.plannedResourceDEL_bn || []).slice(1)],
    },
    other: {
      ...prevState.spendingReview.departments.other,
      resourceDEL_bn: newFiscal.spending.otherCurrent,
      capitalDEL_bn: newFiscal.spending.otherCapital,
      plannedResourceDEL_bn: [newFiscal.spending.otherCurrent, ...(prevState.spendingReview.departments.other.plannedResourceDEL_bn || []).slice(1)],
      plannedCapitalDEL_bn: [newFiscal.spending.otherCapital, ...(prevState.spendingReview.departments.other.plannedCapitalDEL_bn || []).slice(1)],
    },
  };

  const policyPipelineEntries: PipelineItem[] = [];
  if (changes.antiAvoidanceInvestmentChange_bn !== undefined && changes.antiAvoidanceInvestmentChange_bn !== 0) {
    policyPipelineEntries.push({
      measureId: `anti_avoidance_${prevState.metadata.currentTurn}`,
      description: 'HMRC anti-avoidance compliance programme',
      type: 'hmrc_systems',
      announcedTurn: prevState.metadata.currentTurn,
      effectiveTurn: prevState.metadata.currentTurn + 6,
      turnsRemaining: 6,
      fiscalImpactOnEffect_bn: Math.abs(changes.antiAvoidanceInvestmentChange_bn),
      status: 'in_progress',
      delayRisk: 0.08,
      capacityCost: 20,
    });
  }
  if (changes.personalAllowanceChange !== undefined || changes.basicRateUpperThresholdChange !== undefined || changes.higherRateUpperThresholdChange !== undefined) {
    policyPipelineEntries.push({
      measureId: `thresholds_${prevState.metadata.currentTurn}`,
      description: 'Income tax threshold policy update',
      type: 'secondary_legislation',
      announcedTurn: prevState.metadata.currentTurn,
      effectiveTurn: prevState.metadata.currentTurn + 1,
      turnsRemaining: 1,
      fiscalImpactOnEffect_bn: 0,
      status: 'in_progress',
      delayRisk: 0.05,
      capacityCost: 15,
    });
  }
  if (queueMajorTaxForEvent) {
    policyPipelineEntries.push({
      measureId: `preannounced_tax_${prevState.metadata.currentTurn}`,
      description: 'Pre-announced major tax package',
      type: 'secondary_legislation',
      announcedTurn: prevState.metadata.currentTurn,
      effectiveTurn: findNextFiscalEventTurn(prevState.metadata.currentTurn + 1) + 1,
      turnsRemaining: Math.max(1, findNextFiscalEventTurn(prevState.metadata.currentTurn + 1) - prevState.metadata.currentTurn),
      fiscalImpactOnEffect_bn:
        (taxDeltas.incomeTaxBasicChange * 7) +
        (taxDeltas.incomeTaxHigherChange * 2) +
        (taxDeltas.incomeTaxAdditionalChange * 0.2) +
        (taxDeltas.vatChange * 7.5) +
        (taxDeltas.corporationTaxChange * 3.2),
      status: 'queued',
      delayRisk: 0.06,
      capacityCost: 20,
    });
  }

  const industrialInterventionsToAdd = (changes.industrialInterventionAddIds || [])
    .map((id) => INDUSTRIAL_INTERVENTION_CATALOGUE.find((item) => item.id === id))
    .filter((item): item is NonNullable<typeof item> => !!item)
    .filter((item) => !(prevState.industrialStrategy.activeInterventions || []).some((active) => active.id === item.id))
    .map((item) => ({
      id: item.id,
      name: item.name,
      sector: item.sector,
      annualCost_bn: item.annualCost_bn,
      turnsActive: 0,
      turnsToEffect: item.turnsToEffect,
      successProbability: item.successProbability,
      outcomeRevealed: false,
      outcome: null as 'success' | 'failure' | 'partial' | null,
    }));

  const planningReformActivated = changes.planningReformPackage === true && !prevState.housing.planningReformPackage;

  return {
    ...prevState,
    manifesto: newManifesto,
    policyRiskModifiers: [
      ...(prevState.policyRiskModifiers || []),
      ...((changes.policyRiskModifiers || []).map((modifier) => ({ ...modifier }))),
    ],
    spendingReview: {
      ...prevState.spendingReview,
      departments: nextSpendingReviewDepartments,
    },
    devolution: {
      ...prevState.devolution,
      localGov: {
        ...prevState.devolution.localGov,
        centralGrant_bn: centralGrantAfterLevers,
        councilTaxGrowthCap: councilTaxCapAfterLevers,
      },
    },
    housing: {
      ...prevState.housing,
      planningReformPackage: changes.planningReformPackage ?? prevState.housing.planningReformPackage,
      infrastructureGuarantees_bn: Math.max(0, Math.min(10, prevState.housing.infrastructureGuarantees_bn + (changes.infrastructureGuaranteesChange_bn || 0))),
      htbAndSharedOwnership_bn: Math.max(0, prevState.housing.htbAndSharedOwnership_bn + (changes.htbAndSharedOwnershipChange_bn || 0)),
      councilHouseBuildingGrant_bn: Math.max(0, Math.min(3, prevState.housing.councilHouseBuildingGrant_bn + (changes.councilHouseBuildingGrantChange_bn || 0))),
    },
    industrialStrategy: {
      ...prevState.industrialStrategy,
      activeInterventions: [
        ...(prevState.industrialStrategy.activeInterventions || []),
        ...industrialInterventionsToAdd,
      ],
    },
    political: {
      ...prevState.political,
      backbenchSatisfaction: planningReformActivated
        ? Math.max(0, prevState.political.backbenchSatisfaction - 2)
        : prevState.political.backbenchSatisfaction,
    },
    legislativePipeline: {
      ...prevState.legislativePipeline,
      queue: [...(prevState.legislativePipeline.queue || []), ...policyPipelineEntries],
      consultationLoad: Math.max(0, Math.min(100,
        (prevState.legislativePipeline.consultationLoad || 25) + (policyPipelineEntries.length > 0 ? 5 : 0)
      )),
    },
    fiscal: {
      ...newFiscal,
      thresholdFreezeMonths:
        (changes.thresholdUprating ?? newFiscal.thresholdUprating) === 'frozen'
          ? (prevState.fiscal.thresholdFreezeMonths || 0)
          : 0,
      nextFiscalEventTurn: findNextFiscalEventTurn(prevState.metadata.currentTurn + 1),
      pendingAnnouncements: queueMajorTaxForEvent
        ? [
            ...(prevState.fiscal.pendingAnnouncements || []),
            {
              description: 'Pre-announced major tax package for next fiscal event',
              fiscalImpact_bn:
                (taxDeltas.incomeTaxBasicChange * 7) +
                (taxDeltas.incomeTaxHigherChange * 2) +
                (taxDeltas.incomeTaxAdditionalChange * 0.2) +
                (taxDeltas.vatChange * 7.5) +
                (taxDeltas.corporationTaxChange * 3.2),
              announcedTurn: prevState.metadata.currentTurn,
              effectiveTurn: findNextFiscalEventTurn(prevState.metadata.currentTurn + 1),
              implemented: false,
            },
          ]
        : prevState.fiscal.pendingAnnouncements || [],
    },
  };
}
