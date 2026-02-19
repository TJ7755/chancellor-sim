/**
 * Projections Engine
 *
 * Simulates future economic, fiscal, services, and market outcomes
 * based on current policies and optionally unapplied budget changes.
 *
 * This allows the Chancellor to see the projected impact of their
 * policy decisions before applying them.
 */

import type { GameState } from './game-state';
import { processTurn } from './turn-processor';

function deepCloneForSimulation(state: GameState): GameState {
  // Important: projections must preserve Maps/Sets in game state (e.g. mpSystem/allMPs).
  // JSON cloning will turn Maps into plain objects, causing runtime crashes.
  const sc = (globalThis as any).structuredClone as undefined | ((value: any) => any);
  if (typeof sc === 'function') {
    return sc(state) as GameState;
  }

  // Fallback for older environments: JSON clone plain data, then restore known Maps/Sets
  // from the original state (cloned to avoid mutating the original during simulation).
  const cloned = JSON.parse(JSON.stringify(state)) as GameState;

  cloned.mpSystem = {
    ...cloned.mpSystem,
    allMPs: state.mpSystem?.allMPs instanceof Map ? new Map(state.mpSystem.allMPs) : new Map(),
    votingRecords: state.mpSystem?.votingRecords instanceof Map ? new Map(state.mpSystem.votingRecords) : new Map(),
    promises: state.mpSystem?.promises instanceof Map ? new Map(state.mpSystem.promises) : new Map(),
    concernProfiles: state.mpSystem?.concernProfiles instanceof Map ? new Map(state.mpSystem.concernProfiles) : new Map(),
    currentBudgetSupport: state.mpSystem?.currentBudgetSupport instanceof Map ? new Map(state.mpSystem.currentBudgetSupport) : new Map(),
  } as any;

  cloned.advisers = {
    ...cloned.advisers,
    hiredAdvisers: state.advisers?.hiredAdvisers instanceof Map ? new Map(state.advisers.hiredAdvisers) : cloned.advisers?.hiredAdvisers,
    availableAdvisers: state.advisers?.availableAdvisers instanceof Set ? new Set(state.advisers.availableAdvisers) : cloned.advisers?.availableAdvisers,
    currentOpinions: state.advisers?.currentOpinions instanceof Map ? new Map(state.advisers.currentOpinions) : cloned.advisers?.currentOpinions,
  } as any;

  return cloned;
}

export interface ProjectionScenario {
  name: string;
  description: string;
  applyPendingBudget: boolean;
}

export interface ProjectionPoint {
  turn: number;
  date: string;
  gdpGrowth: number;
  inflation: number;
  unemployment: number;
  productivity: number;
  wageGrowth: number;
  deficit: number;
  debt: number;
  totalRevenue: number;
  totalSpending: number;
  debtInterest: number;
  fiscalHeadroom: number;
  bankRate: number;
  giltYield2y: number;
  giltYield10y: number;
  giltYield30y: number;
  mortgageRate2y: number;
  sterlingIndex: number;
  spendingBreakdown: {
    nhs: number;
    education: number;
    defence: number;
    welfare: number;
    infrastructure: number;
    police: number;
    justice: number;
    other: number;
  };
  services: {
    nhsQuality: number;
    educationQuality: number;
    infrastructureQuality: number;
    mentalHealthAccess: number;
    primaryCareAccess: number;
    socialCareQuality: number;
    prisonSafety: number;
    courtBacklogPerformance: number;
    legalAidAccess: number;
    policingEffectiveness: number;
    borderSecurityPerformance: number;
    railReliability: number;
    affordableHousingDelivery: number;
    floodResilience: number;
    researchInnovationOutput: number;
  };
  averageServiceQuality: number;
}

export interface ProjectionsResult {
  baseline: ProjectionPoint[];
  withPendingChanges?: ProjectionPoint[];
  metadata: {
    projectionMonths: number;
    startDate: string;
    generatedAt: number;
    hasPendingChanges: boolean;
  };
}

interface TaxChange {
  id: string;
  name: string;
  currentRate: number;
  proposedRate: number;
  currentRevenue: number;
  projectedRevenue: number;
  unit: string;
}

interface SpendingChange {
  id: string;
  department: string;
  programme?: string;
  currentBudget: number;
  proposedBudget: number;
  type: 'resource' | 'capital';
}

interface BudgetDraft {
  turn: number;
  taxes: [string, TaxChange][];
  spending: [string, SpendingChange][];
}

const BUDGET_DRAFT_STORAGE_KEY = 'chancellor-budget-draft-v2';

/**
 * Generate economic projections by simulating future months.
 *
 * @param state Current game state
 * @param months Number of months to project forward (default: 24)
 * @param includePendingBudget If true, also generate projections with unapplied budget changes
 * @returns Projection results with baseline and optional pending changes scenarios
 */
export function generateProjections(
  state: GameState,
  months: number = 24,
  includePendingBudget: boolean = true
): ProjectionsResult {
  const startDate = `${state.metadata.currentYear}-${String(state.metadata.currentMonth).padStart(2, '0')}`;
  const hasPending = hasPendingBudgetChanges(state);

  // Generate baseline projections (current policies)
  const baselineProjections = simulateForward(state, months, false);

  // Generate projections with pending budget changes if requested and they exist
  let pendingProjections: ProjectionPoint[] | undefined;
  if (includePendingBudget && hasPending) {
    pendingProjections = simulateForward(state, months, true);
  }

  return {
    baseline: baselineProjections,
    withPendingChanges: pendingProjections,
    metadata: {
      projectionMonths: months,
      startDate,
      generatedAt: Date.now(),
      hasPendingChanges: hasPending,
    },
  };
}

/**
 * Simulate the game forward for a specified number of months.
 *
 * @param initialState Starting game state
 * @param months Number of months to simulate
 * @param applyPendingBudget Whether to apply pending budget changes before simulating
 * @returns Array of projected snapshots
 */
function simulateForward(
  initialState: GameState,
  months: number,
  applyPendingBudget: boolean
): ProjectionPoint[] {
  // Deep clone the state to avoid mutations
  let simulationState = deepCloneForSimulation(initialState);

  // Apply pending budget changes if requested
  if (applyPendingBudget && hasPendingBudgetChanges(simulationState)) {
    simulationState = applyPendingBudgetToState(simulationState);
  }

  const projections: ProjectionPoint[] = [];

  // Run simulation for N months
  for (let i = 0; i < months; i++) {
    // Process one turn
    simulationState = processTurn(simulationState);

    projections.push(extractProjectionPoint(simulationState));

    // If game over occurs in simulation, stop projecting
    if (simulationState.metadata.gameOver) {
      break;
    }
  }

  return projections;
}

function extractProjectionPoint(state: GameState): ProjectionPoint {
  const services = state.services;
  const serviceValues = [
    services.nhsQuality,
    services.educationQuality,
    services.infrastructureQuality,
    services.mentalHealthAccess,
    services.primaryCareAccess,
    services.socialCareQuality,
    services.prisonSafety,
    services.courtBacklogPerformance,
    services.legalAidAccess,
    services.policingEffectiveness,
    services.borderSecurityPerformance,
    services.railReliability,
    services.affordableHousingDelivery,
    services.floodResilience,
    services.researchInnovationOutput,
  ];

  return {
    turn: state.metadata.currentTurn,
    date: `${state.metadata.currentYear}-${String(state.metadata.currentMonth).padStart(2, '0')}`,
    gdpGrowth: state.economic.gdpGrowthAnnual,
    inflation: state.economic.inflationCPI,
    unemployment: state.economic.unemploymentRate,
    productivity: state.economic.productivityGrowthAnnual,
    wageGrowth: state.economic.wageGrowthAnnual,
    deficit: state.fiscal.deficitPctGDP,
    debt: state.fiscal.debtPctGDP,
    totalRevenue: state.fiscal.totalRevenue_bn,
    totalSpending: state.fiscal.totalSpending_bn,
    debtInterest: state.fiscal.debtInterest_bn,
    fiscalHeadroom: state.fiscal.fiscalHeadroom_bn,
    bankRate: state.markets.bankRate,
    giltYield2y: state.markets.giltYield2y,
    giltYield10y: state.markets.giltYield10y,
    giltYield30y: state.markets.giltYield30y,
    mortgageRate2y: state.markets.mortgageRate2y,
    sterlingIndex: state.markets.sterlingIndex,
    spendingBreakdown: {
      nhs: state.fiscal.spending.nhs,
      education: state.fiscal.spending.education,
      defence: state.fiscal.spending.defence,
      welfare: state.fiscal.spending.welfare,
      infrastructure: state.fiscal.spending.infrastructure,
      police: state.fiscal.spending.police,
      justice: state.fiscal.spending.justice,
      other: state.fiscal.spending.other,
    },
    services: {
      ...services,
    },
    averageServiceQuality: serviceValues.reduce((sum, value) => sum + value, 0) / serviceValues.length,
  };
}

/**
 * Check if there are pending budget changes that haven't been applied.
 */
function hasPendingBudgetChanges(state: GameState): boolean {
  try {
    const raw = localStorage.getItem(BUDGET_DRAFT_STORAGE_KEY);
    if (!raw) return false;

    const draft: BudgetDraft = JSON.parse(raw);
    if (!draft || draft.turn !== state.metadata.currentTurn) {
      return false;
    }

    // Check if any tax has proposed !== current
    for (const [, tax] of draft.taxes) {
      if (Math.abs(tax.proposedRate - tax.currentRate) > 0.001) {
        return true;
      }
    }

    // Check if any spending has proposed !== current
    for (const [, spending] of draft.spending) {
      if (Math.abs(spending.proposedBudget - spending.currentBudget) > 0.001) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Apply pending budget changes to the state.
 * This creates a modified state with the pending changes applied.
 */
function applyPendingBudgetToState(state: GameState): GameState {
  try {
    const raw = localStorage.getItem(BUDGET_DRAFT_STORAGE_KEY);
    if (!raw) return state;

    const draft: BudgetDraft = JSON.parse(raw);
    if (!draft || draft.turn !== state.metadata.currentTurn) {
      return state;
    }

    const newState = {
      ...state,
      fiscal: {
        ...state.fiscal,
        spending: { ...state.fiscal.spending },
        detailedSpending: Array.isArray(state.fiscal.detailedSpending)
          ? state.fiscal.detailedSpending.map((item) => ({ ...item }))
          : state.fiscal.detailedSpending,
        detailedTaxes: Array.isArray(state.fiscal.detailedTaxes)
          ? state.fiscal.detailedTaxes.map((item) => ({ ...item }))
          : state.fiscal.detailedTaxes,
      },
    };

    // Apply tax changes
    for (const [id, tax] of draft.taxes) {
      switch (id) {
        case 'incomeTaxBasic':
          newState.fiscal.incomeTaxBasicRate = tax.proposedRate;
          break;
        case 'incomeTaxHigher':
          newState.fiscal.incomeTaxHigherRate = tax.proposedRate;
          break;
        case 'incomeTaxAdditional':
          newState.fiscal.incomeTaxAdditionalRate = tax.proposedRate;
          break;
        case 'employeeNI':
          newState.fiscal.nationalInsuranceRate = tax.proposedRate;
          break;
        case 'employerNI':
          newState.fiscal.employerNIRate = tax.proposedRate;
          break;
        case 'vat':
          newState.fiscal.vatRate = tax.proposedRate;
          break;
        case 'corporationTax':
          newState.fiscal.corporationTaxRate = tax.proposedRate;
          break;
        default:
          // Try granular tax ID mapping
          if (Array.isArray(newState.fiscal.detailedTaxes)) {
            newState.fiscal.detailedTaxes = newState.fiscal.detailedTaxes.map((item) => {
              if (item.id !== id) return item;
              return { ...item, currentRate: tax.proposedRate };
            });
          }
          break;
      }
    }

    // Apply spending changes (both aggregate and granular line items)
    for (const [id, spending] of draft.spending) {
      const key = id as keyof typeof newState.fiscal.spending;
      if (key in newState.fiscal.spending && typeof newState.fiscal.spending[key] === 'number') {
        newState.fiscal.spending[key] = spending.proposedBudget;
      }

      if (Array.isArray(newState.fiscal.detailedSpending)) {
        newState.fiscal.detailedSpending = newState.fiscal.detailedSpending.map((item) => {
          if (item.id !== id) return item;

          if (item.type === 'capital') {
            return {
              ...item,
              currentBudget: spending.proposedBudget,
              capitalAllocation: spending.proposedBudget,
              currentAllocation: 0,
            };
          }

          if (item.type === 'resource') {
            return {
              ...item,
              currentBudget: spending.proposedBudget,
              currentAllocation: spending.proposedBudget,
              capitalAllocation: 0,
            };
          }

          const total = (item.currentAllocation || 0) + (item.capitalAllocation || 0);
          const currentShare = total > 0 ? (item.currentAllocation || 0) / total : 1;
          const capitalShare = total > 0 ? (item.capitalAllocation || 0) / total : 0;
          return {
            ...item,
            currentBudget: spending.proposedBudget,
            currentAllocation: spending.proposedBudget * currentShare,
            capitalAllocation: spending.proposedBudget * capitalShare,
          };
        });
      }
    }

    recomputeAggregateSpendingFromDetailed(newState);

    return newState;
  } catch {
    return state;
  }
}

type SpendingDepartmentKey = 'nhs' | 'education' | 'defence' | 'welfare' | 'infrastructure' | 'police' | 'justice' | 'other';

function mapDepartmentToSpendingKey(department: string): SpendingDepartmentKey | null {
  const dept = department.toLowerCase();
  if (dept.includes('health')) return 'nhs';
  if (dept.includes('education')) return 'education';
  if (dept.includes('defence')) return 'defence';
  if (dept.includes('work') || dept.includes('pension')) return 'welfare';
  if (dept.includes('transport') || dept.includes('energy') || dept.includes('housing')) return 'infrastructure';
  if (dept.includes('home')) return 'police';
  if (dept.includes('justice')) return 'justice';
  if (dept.includes('debt interest')) return null;
  return 'other';
}

function recomputeAggregateSpendingFromDetailed(state: GameState): void {
  if (!Array.isArray(state.fiscal.detailedSpending) || state.fiscal.detailedSpending.length === 0) {
    return;
  }

  const currentTotals = {
    nhs: 0,
    education: 0,
    defence: 0,
    welfare: 0,
    infrastructure: 0,
    police: 0,
    justice: 0,
    other: 0,
  };

  const capitalTotals = {
    nhs: 0,
    education: 0,
    defence: 0,
    welfare: 0,
    infrastructure: 0,
    police: 0,
    justice: 0,
    other: 0,
  };

  for (const item of state.fiscal.detailedSpending) {
    const key = mapDepartmentToSpendingKey(item.department);
    if (!key) continue;

    if (item.type === 'capital') {
      capitalTotals[key] += item.currentBudget;
    } else {
      currentTotals[key] += item.currentBudget;
    }
  }

  state.fiscal.spending.nhsCurrent = currentTotals.nhs;
  state.fiscal.spending.educationCurrent = currentTotals.education;
  state.fiscal.spending.defenceCurrent = currentTotals.defence;
  state.fiscal.spending.welfareCurrent = currentTotals.welfare;
  state.fiscal.spending.infrastructureCurrent = currentTotals.infrastructure;
  state.fiscal.spending.policeCurrent = currentTotals.police;
  state.fiscal.spending.justiceCurrent = currentTotals.justice;
  state.fiscal.spending.otherCurrent = currentTotals.other;

  state.fiscal.spending.nhsCapital = capitalTotals.nhs;
  state.fiscal.spending.educationCapital = capitalTotals.education;
  state.fiscal.spending.defenceCapital = capitalTotals.defence;
  state.fiscal.spending.infrastructureCapital = capitalTotals.infrastructure;
  state.fiscal.spending.policeCapital = capitalTotals.police;
  state.fiscal.spending.justiceCapital = capitalTotals.justice;
  state.fiscal.spending.otherCapital = capitalTotals.other;

  state.fiscal.spending.nhs = currentTotals.nhs + capitalTotals.nhs;
  state.fiscal.spending.education = currentTotals.education + capitalTotals.education;
  state.fiscal.spending.defence = currentTotals.defence + capitalTotals.defence;
  state.fiscal.spending.welfare = currentTotals.welfare;
  state.fiscal.spending.infrastructure = currentTotals.infrastructure + capitalTotals.infrastructure;
  state.fiscal.spending.police = currentTotals.police + capitalTotals.police;
  state.fiscal.spending.justice = currentTotals.justice + capitalTotals.justice;
  state.fiscal.spending.other = currentTotals.other + capitalTotals.other;

  state.fiscal.totalSpending_bn =
    state.fiscal.spending.nhs +
    state.fiscal.spending.education +
    state.fiscal.spending.defence +
    state.fiscal.spending.welfare +
    state.fiscal.spending.infrastructure +
    state.fiscal.spending.police +
    state.fiscal.spending.justice +
    state.fiscal.spending.other;
}

/**
 * Calculate the difference between two projection scenarios.
 * Useful for showing the impact of pending budget changes.
 */
export function calculateProjectionDifference(
  baseline: ProjectionPoint[],
  alternative: ProjectionPoint[]
): {
  gdpGrowthDiff: number[];
  inflationDiff: number[];
  unemploymentDiff: number[];
  deficitDiff: number[];
  debtDiff: number[];
  productivityDiff: number[];
  avgServiceQualityDiff: number[];
} {
  const length = Math.min(baseline.length, alternative.length);

  return {
    gdpGrowthDiff: baseline.slice(0, length).map((b, i) => alternative[i].gdpGrowth - b.gdpGrowth),
    inflationDiff: baseline.slice(0, length).map((b, i) => alternative[i].inflation - b.inflation),
    unemploymentDiff: baseline.slice(0, length).map((b, i) => alternative[i].unemployment - b.unemployment),
    deficitDiff: baseline.slice(0, length).map((b, i) => alternative[i].deficit - b.deficit),
    debtDiff: baseline.slice(0, length).map((b, i) => alternative[i].debt - b.debt),
    productivityDiff: baseline.slice(0, length).map((b, i) => alternative[i].productivity - b.productivity),
    avgServiceQualityDiff: baseline.slice(0, length).map((b, i) => alternative[i].averageServiceQuality - b.averageServiceQuality),
  };
}

/**
 * Generate summary statistics for projections.
 */
export function summariseProjections(projections: ProjectionPoint[]): {
  averageGDPGrowth: number;
  averageInflation: number;
  averageUnemployment: number;
  averageWageGrowth: number;
  finalDeficit: number;
  finalDebt: number;
  finalGiltYield: number;
  finalBankRate: number;
  averageServiceQuality: number;
  averageProductivity: number;
} {
  if (projections.length === 0) {
    return {
      averageGDPGrowth: 0,
      averageInflation: 0,
      averageUnemployment: 0,
      averageWageGrowth: 0,
      finalDeficit: 0,
      finalDebt: 0,
      finalGiltYield: 0,
      finalBankRate: 0,
      averageServiceQuality: 0,
      averageProductivity: 0,
    };
  }

  const sum = projections.reduce(
    (acc, p) => ({
      gdpGrowth: acc.gdpGrowth + p.gdpGrowth,
      inflation: acc.inflation + p.inflation,
      unemployment: acc.unemployment + p.unemployment,
      wageGrowth: acc.wageGrowth + p.wageGrowth,
      productivity: acc.productivity + p.productivity,
      averageServiceQuality: acc.averageServiceQuality + p.averageServiceQuality,
    }),
    { gdpGrowth: 0, inflation: 0, unemployment: 0, wageGrowth: 0, productivity: 0, averageServiceQuality: 0 }
  );

  const final = projections[projections.length - 1];

  return {
    averageGDPGrowth: sum.gdpGrowth / projections.length,
    averageInflation: sum.inflation / projections.length,
    averageUnemployment: sum.unemployment / projections.length,
    averageWageGrowth: sum.wageGrowth / projections.length,
    finalDeficit: final.deficit,
    finalDebt: final.debt,
    finalGiltYield: final.giltYield10y,
    finalBankRate: final.bankRate,
    averageServiceQuality: sum.averageServiceQuality / projections.length,
    averageProductivity: sum.productivity / projections.length,
  };
}
