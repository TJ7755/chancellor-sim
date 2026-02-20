// Unified Game State Manager
// React Context API for managing all game systems

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  EconomicState,
  FiscalState,
  MarketState,
  ServicesState,
  PoliticalState,
  AdviserSystem,
  EventState,
  SimulationState,
  FiscalRuleId,
  PolicyRiskModifier,
  createInitialEconomicState,
  createInitialFiscalState,
  createInitialMarketState,
  createInitialServicesState,
  createInitialPoliticalState,
  createInitialAdviserSystem,
  createInitialEventState,
  createInitialSpendingReviewState,
  createInitialDebtManagementState,
  createInitialParliamentaryState,
  createInitialExternalSectorState,
  createInitialFinancialStabilityState,
  createInitialDevolutionState,
  createInitialDistributionalState,
  calculateInitialFiscalRuleMetrics,
} from './game-integration';
import {
  hireAdviser as hireAdviserHelper,
  fireAdviser as fireAdviserHelper,
  AdviserType,
} from './adviser-system';
import {
  ManifestoState,
  initializeManifestoState,
  checkPolicyForViolations,
  applyManifestoViolations,
  executeOneClickAction,
} from './manifesto-system';
import processTurn from './turn-processor';
import {
  MPSystemState,
  createInitialMPSystem,
  PromiseCategory,
  LobbyingApproach,
  attemptLobbying,
  calculateAllMPStances,
  generateMPConcernProfile,
  DetailedMPStance,
  MPStanceLabel,
} from './mp-system';
import { generateAllMPs } from './mp-data';
import { identifyMPGroups, shouldRecalculateGroups } from './mp-groups';
import {
  loadMPs,
  saveMPs,
  loadVotingRecords,
  loadPromises,
  savePromises,
} from './mp-storage';

// ===========================
// Game State Types
// ===========================

export interface GameMetadata {
  currentTurn: number; // 0 = July 2024, 59 = June 2029
  currentMonth: number; // 1-12
  currentYear: number; // 2024-2029
  difficultyMode: DifficultyMode;
  gameStarted: boolean;
  gameOver: boolean;
  gameOverReason?: string;
  lastSaveTime?: number;
}

export type DifficultyMode = 'forgiving' | 'standard' | 'realistic';

export interface EmergencyProgramme {
  id: string;
  eventId: string;
  name: string;
  immediateCost_bn: number;
  rebuildingMonths: number;
  rebuildingCostPerMonth_bn: number;
  remainingMonths: number;
  description: string;
}

export interface EmergencyProgrammesState {
  active: EmergencyProgramme[];
}

export type PMMessageType =
  | 'regular_checkin'        // Scheduled performance review
  | 'warning'                // Warning about poor performance
  | 'threat'                 // Direct threat of consequences
  | 'demand'                 // Policy demand from PM
  | 'support_change'         // Notification of support changes
  | 'reshuffle_warning'      // Final warning before reshuffle
  | 'praise'                 // Positive feedback for good performance
  | 'concern';               // Expressing concern about specific issue

export interface PMMessage {
  id: string;
  turn: number;
  type: PMMessageType;
  subject: string;
  content: string;
  tone: 'supportive' | 'neutral' | 'stern' | 'angry';
  read: boolean;
  timestamp: number;
  // Optional fields for actionable messages
  demandCategory?: 'tax' | 'spending' | 'deficit' | 'approval';
  demandDetails?: string;
  consequenceWarning?: string;
  threatTargetDeficit_bn?: number;
  threatDeadlineTurn?: number;
  threatBaselineDeficit_bn?: number;
}

export interface PMRelationshipState {
  // Core relationship metrics
  patience: number;              // 0-100: How much patience PM has left with Chancellor
  warningsIssued: number;        // Count of warnings given
  demandsIssued: number;         // Count of demands made
  demandsMet: number;            // Count of demands successfully met
  lastContactTurn: number;       // When PM last sent a message

  // Message history
  messages: PMMessage[];
  unreadCount: number;

  // Tracking for consequences
  consecutivePoorPerformance: number;     // Turns with low trust/approval
  reshuffleRisk: number;                  // 0-100: Risk of being sacked
  supportWithdrawn: boolean;               // Whether PM has withdrawn support
  finalWarningGiven: boolean;             // Whether final warning issued before reshuffle

  // Active demands
  activeDemands: {
    category: string;
    description: string;
    deadline: number;           // Turn number
    met: boolean;
  }[];
  activeThreats: {
    id: string;
    category: 'deficit';
    createdTurn: number;
    deadlineTurn: number;
    baselineDeficit_bn: number;
    targetDeficit_bn: number;
    breached: boolean;
    resolved: boolean;
    followUpSent: boolean;
  }[];
}

export interface SocialMediaGameState {
  recentlyUsedPostIds: string[];
}

export interface DepartmentDEL {
  name: string;
  resourceDEL_bn: number;
  capitalDEL_bn: number;
  plannedResourceDEL_bn: number[];
  plannedCapitalDEL_bn: number[];
  backlog: number;
  deliveryCapacity: number;
}

export interface SpendingReviewState {
  lastReviewTurn: number;
  nextReviewDueTurn: number;
  departments: {
    nhs: DepartmentDEL;
    education: DepartmentDEL;
    defence: DepartmentDEL;
    infrastructure: DepartmentDEL;
    homeOffice: DepartmentDEL;
    localGov: DepartmentDEL;
    other: DepartmentDEL;
  };
  inReview: boolean;
  srCredibilityBonus: number;
  lastDeliveryRiskEvents: string[];
}

export interface GiltMaturityBucket {
  outstanding_bn: number;
  avgCoupon: number;
  turnsToMaturity: number;
}

export interface DebtManagementState {
  maturityProfile: {
    shortTerm: GiltMaturityBucket;
    medium: GiltMaturityBucket;
    longTerm: GiltMaturityBucket;
    indexLinked: GiltMaturityBucket;
  };
  weightedAverageMaturity: number;
  refinancingRisk: number;
  qeHoldings_bn: number;
  issuanceStrategy: 'short' | 'balanced' | 'long';
}

export interface SelectCommittee {
  id: 'treasury' | 'health' | 'education' | 'publicAccounts' | 'homeAffairs';
  scrutinyPressure: number;
  isInquiryActive: boolean;
  inquiryTurnsRemaining: number;
  credibilityImpact: number;
  inquiryTriggerThreshold: number;
}

export interface ParliamentaryState {
  lordsDelayActive: boolean;
  lordsDelayTurnsRemaining: number;
  lordsDelayBillType: string | null;
  whipStrength: number;
  formalConfidenceVotePending: boolean;
  confidenceVoteThreshold: number;
  confidenceVoteTurn: number | null;
  selectCommittees: SelectCommittee[];
  rebellionCount: number;
}

export interface ExternalSectorState {
  currentAccountGDP: number;
  tradeBalanceGDP: number;
  energyImportPricePressure: number;
  tradeFrictionIndex: number;
  exportGrowth: number;
  importGrowth: number;
  externalShockActive: boolean;
  externalShockType: 'energy_spike' | 'trade_war' | 'partner_recession' | 'tariff_shock' | null;
  externalShockTurnsRemaining: number;
  externalShockMagnitude: number;
}

export interface FinancialStabilityState {
  housePriceIndex: number;
  housePriceGrowthAnnual: number;
  mortgageApprovals: number;
  householdDebtToIncome: number;
  bankStressIndex: number;
  fpcInterventionActive: boolean;
  fpcInterventionType: 'lti_cap' | 'ltv_cap' | 'countercyclical_buffer' | null;
  fpcInterventionTurnsRemaining: number;
  creditGrowthAnnual: number;
  housingAffordabilityIndex: number;
  consecutiveHousingCrashTurns: number;
}

export interface DevolvdNation {
  id: 'scotland' | 'wales' | 'northernIreland';
  blockGrant_bn: number;
  barnettBaseline_bn: number;
  politicalTension: number;
  grantDispute: boolean;
  grantDisputeTurnsRemaining: number;
}

export interface LocalGovState {
  centralGrant_bn: number;
  councilTaxBaseGrowth: number;
  localGovStressIndex: number;
  section114Notices: number;
  localServicesQuality: number;
}

export interface DevolutionState {
  nations: { scotland: DevolvdNation; wales: DevolvdNation; northernIreland: DevolvdNation; };
  localGov: LocalGovState;
  barnettConsequentialMultiplier: number;
  section114Timer: number;
}

export interface IncomeDecile {
  id: number;
  avgIncome_k: number;
  effectiveTaxRate: number;
  realIncomeChange: number;
  isWinner: boolean;
}

export interface DistributionalState {
  deciles: IncomeDecile[];
  giniCoefficient: number;
  povertyRate: number;
  childPovertyRate: number;
  bottomQuintileRealIncomeGrowth: number;
  topDecileEffectiveTaxRate: number;
  lastTaxChangeDistribution: 'regressive' | 'neutral' | 'progressive' | null;
}

export interface GameState {
  metadata: GameMetadata;
  economic: EconomicState;
  fiscal: FiscalState;
  markets: MarketState;
  services: ServicesState;
  political: PoliticalState;
  advisers: AdviserSystem;
  events: EventState;
  manifesto: ManifestoState;
  simulation: SimulationState;
  policyRiskModifiers: PolicyRiskModifier[];
  mpSystem: MPSystemState;
  emergencyProgrammes: EmergencyProgrammesState;
  pmRelationship: PMRelationshipState;
  socialMedia: SocialMediaGameState;
  spendingReview: SpendingReviewState;
  debtManagement: DebtManagementState;
  parliamentary: ParliamentaryState;
  externalSector: ExternalSectorState;
  financialStability: FinancialStabilityState;
  devolution: DevolutionState;
  distributional: DistributionalState;
}

export interface GameActions {
  startNewGame: (
    adviserChoice?: string,
    manifestoChoice?: string,
    fiscalRuleChoice?: FiscalRuleId,
    difficultyMode?: DifficultyMode
  ) => void;
  advanceTurn: () => void;
  saveGame: (slotName: string) => void;
  loadGame: (slotName: string) => boolean;
  applyBudgetChanges: (changes: BudgetChanges) => void;
  respondToEvent: (eventId: string, responseIndex: number) => void;
  hireAdviser: (adviserType: string) => void;
  fireAdviser: (adviserId: string) => void;
  respondToPMIntervention: (choice: 'comply' | 'defy') => void;
  lobbyMP: (mpId: string, approach: LobbyingApproach, promiseCategory?: PromiseCategory, specificValue?: number) => Promise<{ success: boolean; message: string }>;
  forcePMIntervention: () => void;
  updateMPStances: (budgetChanges: BudgetChanges, manifestoViolations: string[]) => void;
  executeManifestoOneClick: (pledgeId: string) => void;
  recordBudgetVotes: (votes: Array<{ mpId: string; choice: 'aye' | 'noe' | 'abstain'; reasoning: string; coerced?: boolean }>) => void;
  updatePromises: (brokenPromiseIds: string[]) => void;
  changeFiscalFramework: (nextRule: FiscalRuleId) => void;
  recordSocialMediaTemplates: (templateIds: string[], turn: number) => void;
  setSpendingReviewPlans: (plans: SpendingReviewState['departments']) => void;
  updateSpendingReviewPlans: (plans: SpendingReviewState['departments']) => void;
  setDebtIssuanceStrategy: (strategy: DebtManagementState['issuanceStrategy']) => void;
}

export interface BudgetChanges {
  // Tax changes (percentage point changes)
  incomeTaxBasicChange?: number;
  incomeTaxHigherChange?: number;
  incomeTaxAdditionalChange?: number;
  niEmployeeChange?: number;
  niEmployerChange?: number;
  vatChange?: number;
  corporationTaxChange?: number;
  capitalGainsTaxChange?: number;
  fuelDutyChange?: number;

  // Revenue adjustment from taxes beyond the 6 main rates (£bn)
  // Calculated by budget system reckoners for CGT, IHT, excise duties, reliefs, etc.
  revenueAdjustment?: number;

  // Current (resource) spending changes (£bn)
  nhsCurrentChange?: number;
  educationCurrentChange?: number;
  defenceCurrentChange?: number;
  welfareCurrentChange?: number;
  infrastructureCurrentChange?: number;
  policeCurrentChange?: number;
  justiceCurrentChange?: number;
  otherCurrentChange?: number;

  // Capital (investment) spending changes (£bn)
  nhsCapitalChange?: number;
  educationCapitalChange?: number;
  defenceCapitalChange?: number;
  infrastructureCapitalChange?: number;
  policeCapitalChange?: number;
  justiceCapitalChange?: number;
  otherCapitalChange?: number;

  // Legacy aggregate spending changes (for backwards compatibility)
  nhsSpendingChange?: number;
  educationSpendingChange?: number;
  defenceSpendingChange?: number;
  welfareSpendingChange?: number;
  infrastructureSpendingChange?: number;
  policeSpendingChange?: number;
  justiceSpendingChange?: number;
  otherSpendingChange?: number;

  // Granular line-item persistence from budget screen
  detailedTaxRates?: Record<string, number>;
  detailedSpendingBudgets?: Record<string, number>;
  policyRiskModifiers?: PolicyRiskModifier[];
}

// ===========================
// Context Creation
// ===========================

const GameStateContext = createContext<GameState | undefined>(undefined);
const GameActionsContext = createContext<GameActions | undefined>(undefined);

// ===========================
// Helper Functions
// ===========================

function getMonthName(month: number): string {
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  return months[month - 1];
}

function calculateTurnMetadata(turn: number): {
  month: number;
  year: number;
  monthName: string;
} {
  // Turn 0 = July 2024
  const totalMonths = turn + 6; // Start at month 7 (July)
  const year = 2024 + Math.floor(totalMonths / 12);
  const month = (totalMonths % 12) + 1;
  return {
    month,
    year,
    monthName: getMonthName(month),
  };
}

type MPStance = DetailedMPStance | MPStanceLabel;

function isMap(val: any): val is Map<any, any> {
  return val instanceof Map;
}

function robustNormalizeMap<K, V>(raw: any): Map<K, V> {
  if (raw instanceof Map) return raw;
  const map = new Map<K, V>();
  if (!raw) return map;

  if (Array.isArray(raw)) {
    raw.forEach((entry) => {
      if (Array.isArray(entry) && entry.length === 2) {
        map.set(entry[0], entry[1]);
      }
    });
  } else if (typeof raw === 'object') {
    Object.entries(raw).forEach(([k, v]) => {
      map.set(k as unknown as K, v as unknown as V);
    });
  }
  return map;
}

function normalizeCurrentBudgetSupport(
  raw: unknown
): Map<string, DetailedMPStance> {
  const finalMap = new Map<string, DetailedMPStance>();

  if (!raw) return finalMap;

  let sourceEntries: Array<[string, MPStance]> = [];

  if (isMap(raw)) {
    sourceEntries = Array.from(raw.entries());
  } else if (Array.isArray(raw)) {
    sourceEntries = raw as Array<[string, MPStance]>;
  } else if (typeof raw === 'object') {
    sourceEntries = Object.entries(raw as Record<string, MPStance>) as Array<[string, MPStance]>;
  }

  sourceEntries.forEach(([key, value]) => {
    if (typeof key !== 'string') return;

    if (typeof value === 'string') {
      finalMap.set(key, {
        stance: value as MPStanceLabel,
        score: value === 'support' ? 70 : (value === 'oppose' ? 30 : 50),
        reason: 'Legacy stance data.',
        concerns: [],
        ideologicalAlignment: 0,
        constituencyImpact: 0,
        granularImpact: 0,
        brokenPromisesCount: 0,
      });
    } else if (value && typeof value === 'object' && 'stance' in value) {
      finalMap.set(key, value as DetailedMPStance);
    }
  });

  return finalMap;
}

function normalizeAdviserSystem(system: AdviserSystem): AdviserSystem {
  if (!system) return { advisers: [], maxAdvisers: 3, hiredAdvisers: new Map(), availableAdvisers: new Set(), currentOpinions: new Map() };

  const hiredAdvisersInner = system.hiredAdvisers as any;
  const availableAdvisersInner = system.availableAdvisers as any;
  const currentOpinionsInner = system.currentOpinions as any;

  let normalizedHired = new Map<string, any>();
  if (isMap(hiredAdvisersInner)) {
    (hiredAdvisersInner as Map<string, any>).forEach((v, k) => normalizedHired.set(k, v));
  } else if (Array.isArray(hiredAdvisersInner)) {
    (hiredAdvisersInner as any[]).forEach((entry: any) => {
      if (Array.isArray(entry) && entry.length === 2) normalizedHired.set(entry[0], entry[1]);
    });
  } else if (hiredAdvisersInner && typeof hiredAdvisersInner === 'object') {
    Object.entries(hiredAdvisersInner).forEach(([k, v]) => normalizedHired.set(k, v));
  }

  let normalizedAvailable = new Set<string>();
  if (availableAdvisersInner instanceof Set || (availableAdvisersInner && typeof (availableAdvisersInner as any).has === 'function')) {
    (availableAdvisersInner as Set<string>).forEach((item: string) => normalizedAvailable.add(item));
  } else if (Array.isArray(availableAdvisersInner)) {
    (availableAdvisersInner as any[]).forEach((item: any) => normalizedAvailable.add(String(item)));
  } else {
    normalizedAvailable = new Set(['treasury', 'political', 'heterodox', 'fhawk', 'socdem', 'technocrat']);
  }

  let normalizedOpinions = new Map<string, any>();
  if (isMap(currentOpinionsInner)) {
    (currentOpinionsInner as Map<string, any>).forEach((v, k) => normalizedOpinions.set(k, v));
  } else if (Array.isArray(currentOpinionsInner)) {
    (currentOpinionsInner as any[]).forEach((entry: any) => {
      if (Array.isArray(entry) && entry.length === 2) normalizedOpinions.set(entry[0], entry[1]);
    });
  } else if (currentOpinionsInner && typeof currentOpinionsInner === 'object') {
    Object.entries(currentOpinionsInner).forEach(([k, v]) => normalizedOpinions.set(k, v));
  }

  return {
    ...system,
    hiredAdvisers: normalizedHired,
    availableAdvisers: normalizedAvailable,
    currentOpinions: normalizedOpinions,
  };
}

function normalizeLoadedState(state: GameState): GameState {
  const mpSystem = state.mpSystem ?? createInitialMPSystem();
  const emergencyProgrammes = state.emergencyProgrammes ?? { active: [] };
  const advisers = state.advisers ?? createInitialAdviserSystem();
  const metadata = {
    ...state.metadata,
    difficultyMode: (state.metadata as any)?.difficultyMode || 'realistic',
  };
  const pmRelationship = state.pmRelationship ?? {
    patience: 70,
    warningsIssued: 0,
    demandsIssued: 0,
    demandsMet: 0,
    lastContactTurn: -1,
    messages: [],
    unreadCount: 0,
    consecutivePoorPerformance: 0,
    reshuffleRisk: 0,
    supportWithdrawn: false,
    finalWarningGiven: false,
    activeDemands: [],
    activeThreats: [],
  };
  const socialMedia = state.socialMedia ?? {
    recentlyUsedPostIds: [],
  };
  const spendingReview = {
    ...createInitialSpendingReviewState(),
    ...((state as any).spendingReview || {}),
  };
  const debtManagement = {
    ...createInitialDebtManagementState(
      state?.fiscal?.debtNominal_bn ?? createInitialFiscalState().debtNominal_bn,
      state?.markets?.bankRate ?? createInitialMarketState().bankRate,
      state?.economic?.inflationCPI ?? createInitialEconomicState().inflationCPI
    ),
    ...((state as any).debtManagement || {}),
  };
  const parliamentary = {
    ...createInitialParliamentaryState(),
    ...((state as any).parliamentary || {}),
  } as ParliamentaryState;
  const externalSector = {
    ...createInitialExternalSectorState(),
    ...((state as any).externalSector || {}),
  };
  const financialStability = {
    ...createInitialFinancialStabilityState(),
    ...((state as any).financialStability || {}),
  };
  const devolution = {
    ...createInitialDevolutionState(),
    ...((state as any).devolution || {}),
  } as DevolutionState;
  const distributional = {
    ...createInitialDistributionalState(),
    ...((state as any).distributional || {}),
  };
  // Merge all state objects with defaults to handle missing properties from old saves
  const economic = {
    ...createInitialEconomicState(),
    ...(state.economic || {}),
  };
  const fiscal = state.fiscal ? {
    ...createInitialFiscalState(),
    ...state.fiscal,
  } : createInitialFiscalState();
  const markets = {
    ...createInitialMarketState(),
    ...(state.markets || {}),
  };
  const political = {
    ...createInitialPoliticalState(),
    ...(state.political || {}),
  };
  const services = {
    ...createInitialServicesState(),
    ...(state.services || {}),
  };
  const events = {
    ...createInitialEventState(),
    ...(state.events || {}),
  };
  const simulation = {
    monthlySnapshots: state.simulation?.monthlySnapshots || [],
    lastTurnDelta: state.simulation?.lastTurnDelta || null,
    obrForecastSnapshot: state.simulation?.obrForecastSnapshot || null,
    lastObrComparison: state.simulation?.lastObrComparison || null,
  };
  const policyRiskModifiers = Array.isArray((state as any).policyRiskModifiers)
    ? (state as any).policyRiskModifiers
    : [];

  // Migrate old save games to new capital/current spending structure
  if (fiscal && fiscal.spending && !fiscal.spending.nhsCurrent) {
    // Old save - split aggregated spending using baseline ratios
    // Ratios from July 2024 baseline
    const capitalRatios = {
      nhs: 12.0 / 180.4,      // ~6.7%
      education: 12.0 / 116,   // ~10.3%
      defence: 16.6 / 55.6,    // ~29.9%
      infrastructure: 80.0 / 100, // 80%
      police: 0.5 / 19,        // ~2.6%
      justice: 0.3 / 13,       // ~2.3%
      other: 20.0 / 326.0,     // ~6.1%
    };

    fiscal.spending = {
      ...fiscal.spending,
      // Calculate current (resource) spending
      nhsCurrent: fiscal.spending.nhs * (1 - capitalRatios.nhs),
      educationCurrent: fiscal.spending.education * (1 - capitalRatios.education),
      defenceCurrent: fiscal.spending.defence * (1 - capitalRatios.defence),
      welfareCurrent: fiscal.spending.welfare, // Welfare has no capital
      infrastructureCurrent: fiscal.spending.infrastructure * (1 - capitalRatios.infrastructure),
      policeCurrent: fiscal.spending.police * (1 - capitalRatios.police),
      justiceCurrent: fiscal.spending.justice * (1 - capitalRatios.justice),
      otherCurrent: fiscal.spending.other * (1 - capitalRatios.other),
      // Calculate capital spending
      nhsCapital: fiscal.spending.nhs * capitalRatios.nhs,
      educationCapital: fiscal.spending.education * capitalRatios.education,
      defenceCapital: fiscal.spending.defence * capitalRatios.defence,
      infrastructureCapital: fiscal.spending.infrastructure * capitalRatios.infrastructure,
      policeCapital: fiscal.spending.police * capitalRatios.police,
      justiceCapital: fiscal.spending.justice * capitalRatios.justice,
      otherCapital: fiscal.spending.other * capitalRatios.other,
    };
  }

  // Migrate fiscal year tracking
  if (fiscal && !fiscal.fiscalYearStartTurn) {
    fiscal.currentFiscalYear = fiscal.currentFiscalYear ?? state.metadata.currentYear;
    fiscal.fiscalYearStartTurn = 0;
    fiscal.fiscalYearStartSpending = { ...fiscal.spending };
  }

  return {
    ...state,
    metadata,
    economic,
    fiscal,
    markets,
    political,
    services,
    events,
    simulation,
    policyRiskModifiers,
    mpSystem: {
      ...mpSystem,
      allMPs: robustNormalizeMap(mpSystem.allMPs),
      votingRecords: robustNormalizeMap(mpSystem.votingRecords),
      promises: robustNormalizeMap(mpSystem.promises),
      concernProfiles: robustNormalizeMap(mpSystem.concernProfiles),
      currentBudgetSupport: normalizeCurrentBudgetSupport(
        mpSystem.currentBudgetSupport as any
      ),
    },
    advisers: normalizeAdviserSystem(advisers),
    emergencyProgrammes: {
      ...emergencyProgrammes,
      active: Array.isArray(emergencyProgrammes.active) ? emergencyProgrammes.active : [],
    },
    pmRelationship: {
      ...pmRelationship,
      activeThreats: Array.isArray((pmRelationship as any).activeThreats)
        ? (pmRelationship as any).activeThreats
        : [],
    },
    socialMedia,
    spendingReview,
    debtManagement,
    parliamentary,
    externalSector,
    financialStability,
    devolution,
    distributional,
  };
}

/**
 * Prepare game state for JSON serialization.
 * Converts Map objects in mpSystem to arrays so JSON.stringify preserves them.
 */
export function serializeGameState(state: GameState): any {
  return {
    ...state,
    mpSystem: {
      ...state.mpSystem,
      // Convert Maps to arrays of [key, value] pairs for JSON serialization
      // allMPs, votingRecords, promises are stored in IndexedDB, so we skip them
      allMPs: [], // Don't save 650 MPs to localStorage - they live in IndexedDB
      votingRecords: [],
      promises: [],
      concernProfiles: state.mpSystem.concernProfiles instanceof Map
        ? Array.from(state.mpSystem.concernProfiles.entries())
        : state.mpSystem.concernProfiles,
      currentBudgetSupport: state.mpSystem.currentBudgetSupport instanceof Map
        ? Array.from(state.mpSystem.currentBudgetSupport.entries())
        : state.mpSystem.currentBudgetSupport,
    },
    advisers: {
      ...state.advisers,
      hiredAdvisers: state.advisers.hiredAdvisers instanceof Map
        ? Array.from(state.advisers.hiredAdvisers.entries())
        : state.advisers.hiredAdvisers,
      availableAdvisers: state.advisers.availableAdvisers instanceof Set
        ? Array.from(state.advisers.availableAdvisers)
        : state.advisers.availableAdvisers,
      currentOpinions: state.advisers.currentOpinions instanceof Map
        ? Array.from(state.advisers.currentOpinions.entries())
        : state.advisers.currentOpinions,
    },
  };
}

// ===========================
// Initial Game State
// ===========================

function createInitialGameState(): GameState {
  // Initialize July 2024 baseline conditions
  const economic = createInitialEconomicState();
  const fiscal = createInitialFiscalState();
  const markets = createInitialMarketState();
  const services = createInitialServicesState();
  const political = createInitialPoliticalState();
  const advisers = createInitialAdviserSystem();
  const events = createInitialEventState();
  const spendingReview = createInitialSpendingReviewState();
  const debtManagement = createInitialDebtManagementState(
    fiscal.debtNominal_bn,
    markets.bankRate,
    economic.inflationCPI
  );
  const parliamentary = createInitialParliamentaryState() as ParliamentaryState;
  const externalSector = createInitialExternalSectorState();
  const financialStability = createInitialFinancialStabilityState();
  const devolution = createInitialDevolutionState() as DevolutionState;
  const distributional = createInitialDistributionalState();
  const manifesto = initializeManifestoState(); // Random manifesto
  const mpSystem = createInitialMPSystem(); // Initialize MP system
  const initialRuleMetrics = calculateInitialFiscalRuleMetrics(
    fiscal,
    economic,
    political.chosenFiscalRule,
  );

  return {
    metadata: {
      currentTurn: 0,
      currentMonth: 7,
      currentYear: 2024,
      difficultyMode: 'realistic',
      gameStarted: false,
      gameOver: false,
    },
    economic,
    fiscal: {
      ...fiscal,
      fiscalHeadroom_bn: initialRuleMetrics.fiscalHeadroom_bn,
    },
    markets,
    services,
    political: {
      ...political,
      fiscalRuleCompliance: initialRuleMetrics.fiscalRuleCompliance,
    },
    advisers,
    events,
    manifesto,
    simulation: {
      monthlySnapshots: [],
      lastTurnDelta: null,
      obrForecastSnapshot: null,
      lastObrComparison: null,
    },
    policyRiskModifiers: [],
    mpSystem,
    emergencyProgrammes: {
      active: [],
    },
    pmRelationship: {
      patience: 70,                      // Start with reasonable patience
      warningsIssued: 0,
      demandsIssued: 0,
      demandsMet: 0,
      lastContactTurn: -1,               // Haven't contacted yet
      messages: [],
      unreadCount: 0,
      consecutivePoorPerformance: 0,
      reshuffleRisk: 0,
      supportWithdrawn: false,
      finalWarningGiven: false,
      activeDemands: [],
      activeThreats: [],
    },
    socialMedia: {
      recentlyUsedPostIds: [],
    },
    spendingReview,
    debtManagement,
    parliamentary,
    externalSector,
    financialStability,
    devolution,
    distributional,
  };
}

// ===========================
// Game State Provider
// ===========================

export const GameStateProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [gameState, setGameState] = useState<GameState>(createInitialGameState());

  // Auto-save every turn
  useEffect(() => {
    if (gameState.metadata.gameStarted && !gameState.metadata.gameOver) {
      localStorage.setItem('chancellor-autosave', JSON.stringify(serializeGameState(gameState)));
    }
  }, [gameState.metadata.currentTurn, gameState]);

  // Load autosave on mount
  useEffect(() => {
    const autosave = localStorage.getItem('chancellor-autosave');
    if (autosave) {
      try {
        const savedState = JSON.parse(autosave);
        // Basic validation
        if (savedState.metadata && savedState.economic) {
          setGameState((prevState) => {
            const normalized = normalizeLoadedState(savedState);
            // Preserve MP data if already loaded from IndexedDB, as it's not in localStorage
            return {
              ...normalized,
              mpSystem: {
                ...normalized.mpSystem,
                allMPs: prevState.mpSystem.allMPs.size > 0 ? prevState.mpSystem.allMPs : normalized.mpSystem.allMPs,
                votingRecords: prevState.mpSystem.votingRecords.size > 0 ? prevState.mpSystem.votingRecords : normalized.mpSystem.votingRecords,
                promises: prevState.mpSystem.promises.size > 0 ? prevState.mpSystem.promises : normalized.mpSystem.promises,
              }
            };
          });
        }
      } catch (error) {
        console.error('Failed to load autosave:', error);
      }
    }
  }, []);

  // Load MP data from IndexedDB on mount
  useEffect(() => {
    async function loadMPData() {
      try {
        console.log('[MP System] Starting MP data load...');
        // Try to load existing MP data
        let mps = await loadMPs();
        const votingRecords = await loadVotingRecords();
        const promises = await loadPromises();

        console.log('[MP System] Loaded from IndexedDB:', {
          mpsLoaded: mps?.size || 0,
          votingRecordsCount: votingRecords.size,
          promisesCount: promises.size
        });

        // If no MPs found, generate initial set
        if (!mps || mps.size === 0) {
          console.log('[MP System] No MPs found in storage, generating 650 MPs...');
          mps = generateAllMPs();

          // Verify generation succeeded
          if (!mps || mps.size === 0) {
            throw new Error('generateAllMPs() returned empty Map');
          }

          console.log('[MP System] Generated MPs:', mps.size);
          await saveMPs(mps);
          console.log('[MP System] MPs saved to IndexedDB');
        }

        // Verify we have MPs before setting state
        if (mps.size > 0) {
          console.log('[MP System] Setting game state with', mps.size, 'MPs');
          // Update game state with loaded MP data
          setGameState((prev) => ({
            ...prev,
            mpSystem: {
              ...prev.mpSystem,
              allMPs: mps!,
              votingRecords,
              promises,
            },
          }));
          console.log('[MP System] Game state updated successfully');
        } else {
          throw new Error('MPs Map is empty after load/generation');
        }
      } catch (error) {
        console.error('[MP System] Failed to load MP data:', error);
        // Fallback: generate fresh MPs
        try {
          console.log('[MP System] Attempting emergency MP generation...');
          const freshMPs = generateAllMPs();

          if (!freshMPs || freshMPs.size === 0) {
            throw new Error('Emergency generation failed - received empty Map');
          }

          console.log('[MP System] Emergency generation successful:', freshMPs.size, 'MPs');
          setGameState((prev) => ({
            ...prev,
            mpSystem: {
              ...prev.mpSystem,
              allMPs: freshMPs,
            },
          }));
          console.log('[MP System] Emergency MPs loaded into game state');
        } catch (genError) {
          console.error('[MP System] CRITICAL: Failed to generate MPs:', genError);
          console.error('[MP System] MP system will not function. Check console for errors.');
        }
      }
    }

    loadMPData();
  }, []);

  // Calculate initial MP stances when MPs are loaded
  useEffect(() => {
    // Calculate stances as soon as MPs are loaded, even before game starts
    if (gameState.mpSystem.allMPs.size > 0 &&
      gameState.mpSystem.currentBudgetSupport.size === 0) {
      console.log('[MP System] Calculating initial stances for', gameState.mpSystem.allMPs.size, 'MPs...');
      // Calculate stances for current baseline policy (no changes)
      const emptyBudgetChanges: BudgetChanges = {};
      const noViolations: string[] = [];

      const initialStances = calculateAllMPStances(
        gameState.mpSystem,
        emptyBudgetChanges,
        noViolations,
        gameState.metadata.currentTurn,
        {
          whipStrength: gameState.parliamentary.whipStrength,
          taxDistribution: gameState.distributional.lastTaxChangeDistribution,
        }
      );

      console.log('[MP System] Initial stances calculated:', {
        total: initialStances.size,
        support: Array.from(initialStances.values()).filter(s => s.stance === 'support').length,
        oppose: Array.from(initialStances.values()).filter(s => s.stance === 'oppose').length,
        undecided: Array.from(initialStances.values()).filter(s => s.stance === 'undecided').length
      });

      setGameState((prev) => ({
        ...prev,
        mpSystem: {
          ...prev.mpSystem,
          currentBudgetSupport: initialStances,
        },
      }));
    }
  }, [
    gameState.mpSystem.allMPs.size,
    gameState.mpSystem.currentBudgetSupport.size,
    gameState.metadata.currentTurn,
    gameState.mpSystem,
    gameState.parliamentary.whipStrength,
    gameState.distributional.lastTaxChangeDistribution,
  ]);

  // Start new game
  const startNewGame = useCallback(
    (
      saveName?: string,
      manifestoId: string = 'standard_labour',
      fiscalRuleId: FiscalRuleId = 'starmer-reeves',
      difficultyMode: DifficultyMode = 'realistic'
    ) => {
      setGameState((prevState) => {
        const newState = createInitialGameState();
        const initialRuleMetrics = calculateInitialFiscalRuleMetrics(
          newState.fiscal,
          newState.economic,
          fiscalRuleId,
        );

        // Preserve MPs if they already exist in the state
        let workingMPs = prevState.mpSystem.allMPs;
        if (workingMPs.size === 0) {
          console.log('[MP System] No MPs in state during startNewGame, generating...');
          workingMPs = generateAllMPs();
          saveMPs(workingMPs); // Save in background
        }

        return {
          ...newState,
          metadata: {
            ...newState.metadata,
            currentYear: 2024,
            currentTurn: 0,
            playerName: saveName || 'Chancellor',
            gameStarted: true,
            difficultyMode,
          },
          fiscal: {
            ...newState.fiscal,
            fiscalHeadroom_bn: initialRuleMetrics.fiscalHeadroom_bn,
          },
          political: {
            ...newState.political,
            chosenFiscalRule: fiscalRuleId,
            fiscalRuleCompliance: initialRuleMetrics.fiscalRuleCompliance,
          },
          mpSystem: {
            ...newState.mpSystem,
            allMPs: workingMPs,
          },
          manifesto: initializeManifestoState(manifestoId),
        };
      });
    },
    []
  );

  // Advance turn (this is the big one - processes entire turn)
  const advanceTurn = useCallback(() => {
    setGameState((prevState) => {
      if (prevState.metadata.gameOver) return prevState;

      const newTurn = prevState.metadata.currentTurn + 1;
      const { month, year } = calculateTurnMetadata(newTurn);

      // Check for game end (60 months or sacking)
      if (newTurn >= 60) {
        return {
          ...prevState,
          metadata: {
            ...prevState.metadata,
            currentTurn: newTurn,
            currentMonth: month,
            currentYear: year,
            gameOver: true,
            gameOverReason: 'Survived full term! Election time.',
          },
        };
      }

      // TODO: Process full turn calculation sequence
      // Update metadata first
      const stateWithUpdatedMetadata = {
        ...prevState,
        metadata: {
          ...prevState.metadata,
          currentTurn: newTurn,
          currentMonth: month,
          currentYear: year,
        },
      };

      // Process full turn calculation sequence
      const processedState = processTurn(stateWithUpdatedMetadata);

      return processedState;
    });
  }, []);

  // Save game to named slot
  const saveGame = useCallback(
    (slotName: string) => {
      const saveData = {
        ...serializeGameState(gameState),
        metadata: {
          ...gameState.metadata,
          lastSaveTime: Date.now(),
        },
      };
      localStorage.setItem(`chancellor-save-${slotName}`, JSON.stringify(saveData));
    },
    [gameState]
  );

  // Load game from named slot
  const loadGame = useCallback((slotName: string): boolean => {
    const saveData = localStorage.getItem(`chancellor-save-${slotName}`);
    if (!saveData) return false;

    try {
      const loadedState = JSON.parse(saveData);
      // Basic validation
      if (loadedState.metadata && loadedState.economic) {
        setGameState((prevState) => {
          const normalized = normalizeLoadedState(loadedState);
          // Preserve MP data if already loaded from IndexedDB, as it's not in localStorage
          return {
            ...normalized,
            mpSystem: {
              ...normalized.mpSystem,
              allMPs: prevState.mpSystem.allMPs.size > 0 ? prevState.mpSystem.allMPs : normalized.mpSystem.allMPs,
              votingRecords: prevState.mpSystem.votingRecords.size > 0 ? prevState.mpSystem.votingRecords : normalized.mpSystem.votingRecords,
              promises: prevState.mpSystem.promises.size > 0 ? prevState.mpSystem.promises : normalized.mpSystem.promises,
            }
          };
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to load game:', error);
      return false;
    }
  }, []);

  // Apply budget changes
  //
  // IMPORTANT: This function updates tax rates, spending allocations, and revenue adjustments.
  // It does NOT calculate deficit, debt, or derived fiscal metrics.
  //
  // Fiscal metrics (deficit, debt, debtPctGDP, etc.) are ONLY calculated by the turn processor
  // in turn-processor.tsx calculateFiscalBalance(). This ensures consistency and prevents:
  // - Double-counting of costs
  // - Annual vs monthly calculation errors
  // - State synchronisation issues
  //
  // After calling this function, call advanceTurn() to recalculate all fiscal metrics.
  //
  const applyBudgetChanges = useCallback((changes: BudgetChanges) => {
    setGameState((prevState) => {
      const majorTaxRise = [
        changes.incomeTaxBasicChange || 0,
        changes.incomeTaxHigherChange || 0,
        changes.incomeTaxAdditionalChange || 0,
        changes.niEmployeeChange || 0,
        changes.niEmployerChange || 0,
        changes.vatChange || 0,
        changes.corporationTaxChange || 0,
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
            pendingBudgetChange: { ...(changes as any) },
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

      // Check for manifesto violations
      const violationCheck = checkPolicyForViolations(prevState.manifesto, {
        incomeTaxBasicChange: changes.incomeTaxBasicChange,
        incomeTaxHigherChange: changes.incomeTaxHigherChange,
        incomeTaxAdditionalChange: changes.incomeTaxAdditionalChange,
        niEmployeeChange: changes.niEmployeeChange,
        niEmployerChange: changes.niEmployerChange,
        vatChange: changes.vatChange,
        corporationTaxChange: changes.corporationTaxChange,
        nhsSpendingCutReal: nhsNominalChange < nhsRequiredNominalIncrease,
        educationSpendingCutReal: educationNominalChange < educationRequiredNominalIncrease,
      });

      // Apply violations if any
      let newManifesto = prevState.manifesto;
      if (violationCheck.violatedPledges.length > 0) {
        newManifesto = applyManifestoViolations(
          prevState.manifesto,
          violationCheck.violatedPledges,
          prevState.metadata.currentTurn
        );
      }

      // Apply fiscal changes
      const newFiscal = {
        ...prevState.fiscal,
        spending: { ...prevState.fiscal.spending },
        detailedTaxes: [...(prevState.fiscal.detailedTaxes || [])],
        detailedSpending: [...(prevState.fiscal.detailedSpending || [])],
      };

      // Update tax rates
      if (changes.incomeTaxBasicChange) {
        newFiscal.incomeTaxBasicRate += changes.incomeTaxBasicChange;
      }
      if (changes.incomeTaxHigherChange) {
        newFiscal.incomeTaxHigherRate += changes.incomeTaxHigherChange;
      }
      if (changes.incomeTaxAdditionalChange) {
        newFiscal.incomeTaxAdditionalRate += changes.incomeTaxAdditionalChange;
      }
      if (changes.niEmployeeChange) {
        newFiscal.nationalInsuranceRate += changes.niEmployeeChange;
      }
      if (changes.niEmployerChange) {
        newFiscal.employerNIRate += changes.niEmployerChange;
      }
      if (changes.vatChange) {
        newFiscal.vatRate += changes.vatChange;
      }
      if (changes.corporationTaxChange) {
        newFiscal.corporationTaxRate += changes.corporationTaxChange;
      }

      if (changes.detailedTaxRates) {
        newFiscal.detailedTaxes = newFiscal.detailedTaxes.map((tax) => {
          const nextRate = changes.detailedTaxRates?.[tax.id];
          return nextRate !== undefined ? { ...tax, currentRate: nextRate } : tax;
        });
      }

      // Revenue adjustment from "other" taxes (replaces previous value)
      if (changes.revenueAdjustment !== undefined) {
        newFiscal.revenueAdjustment_bn = changes.revenueAdjustment;
      }

      // Update spending (in £bn)
      // Handle new capital/current split fields
      if (changes.nhsCurrentChange !== undefined) {
        newFiscal.spending.nhsCurrent += changes.nhsCurrentChange;
      }
      if (changes.nhsCapitalChange !== undefined) {
        newFiscal.spending.nhsCapital += changes.nhsCapitalChange;
      }
      if (changes.educationCurrentChange !== undefined) {
        newFiscal.spending.educationCurrent += changes.educationCurrentChange;
      }
      if (changes.educationCapitalChange !== undefined) {
        newFiscal.spending.educationCapital += changes.educationCapitalChange;
      }
      if (changes.defenceCurrentChange !== undefined) {
        newFiscal.spending.defenceCurrent += changes.defenceCurrentChange;
      }
      if (changes.defenceCapitalChange !== undefined) {
        newFiscal.spending.defenceCapital += changes.defenceCapitalChange;
      }
      if (changes.welfareCurrentChange !== undefined) {
        newFiscal.spending.welfareCurrent += changes.welfareCurrentChange;
      }
      if (changes.infrastructureCurrentChange !== undefined) {
        newFiscal.spending.infrastructureCurrent += changes.infrastructureCurrentChange;
      }
      if (changes.infrastructureCapitalChange !== undefined) {
        newFiscal.spending.infrastructureCapital += changes.infrastructureCapitalChange;
      }
      if (changes.policeCurrentChange !== undefined) {
        newFiscal.spending.policeCurrent += changes.policeCurrentChange;
      }
      if (changes.policeCapitalChange !== undefined) {
        newFiscal.spending.policeCapital += changes.policeCapitalChange;
      }
      if (changes.justiceCurrentChange !== undefined) {
        newFiscal.spending.justiceCurrent += changes.justiceCurrentChange;
      }
      if (changes.justiceCapitalChange !== undefined) {
        newFiscal.spending.justiceCapital += changes.justiceCapitalChange;
      }
      if (changes.otherCurrentChange !== undefined) {
        newFiscal.spending.otherCurrent += changes.otherCurrentChange;
      }
      if (changes.otherCapitalChange !== undefined) {
        newFiscal.spending.otherCapital += changes.otherCapitalChange;
      }

      // Handle legacy aggregate spending changes (for backwards compatibility)
      if (changes.nhsSpendingChange !== undefined) {
        newFiscal.spending.nhs += changes.nhsSpendingChange;
      }
      if (changes.educationSpendingChange !== undefined) {
        newFiscal.spending.education += changes.educationSpendingChange;
      }
      if (changes.defenceSpendingChange !== undefined) {
        newFiscal.spending.defence += changes.defenceSpendingChange;
      }
      if (changes.welfareSpendingChange !== undefined) {
        newFiscal.spending.welfare += changes.welfareSpendingChange;
      }
      if (changes.infrastructureSpendingChange !== undefined) {
        newFiscal.spending.infrastructure += changes.infrastructureSpendingChange;
      }
      if (changes.policeSpendingChange !== undefined) {
        newFiscal.spending.police += changes.policeSpendingChange;
      }
      if (changes.justiceSpendingChange !== undefined) {
        newFiscal.spending.justice += changes.justiceSpendingChange;
      }
      if (changes.otherSpendingChange !== undefined) {
        newFiscal.spending.other += changes.otherSpendingChange;
      }

      // Recompute aggregates from current + capital
      newFiscal.spending.nhs = newFiscal.spending.nhsCurrent + newFiscal.spending.nhsCapital;
      newFiscal.spending.education = newFiscal.spending.educationCurrent + newFiscal.spending.educationCapital;
      newFiscal.spending.defence = newFiscal.spending.defenceCurrent + newFiscal.spending.defenceCapital;
      newFiscal.spending.welfare = newFiscal.spending.welfareCurrent;
      newFiscal.spending.infrastructure = newFiscal.spending.infrastructureCurrent + newFiscal.spending.infrastructureCapital;
      newFiscal.spending.police = newFiscal.spending.policeCurrent + newFiscal.spending.policeCapital;
      newFiscal.spending.justice = newFiscal.spending.justiceCurrent + newFiscal.spending.justiceCapital;
      newFiscal.spending.other = newFiscal.spending.otherCurrent + newFiscal.spending.otherCapital;

      // Recalculate total spending from aggregates
      newFiscal.totalSpending_bn =
        newFiscal.spending.nhs +
        newFiscal.spending.education +
        newFiscal.spending.defence +
        newFiscal.spending.welfare +
        newFiscal.spending.infrastructure +
        newFiscal.spending.police +
        newFiscal.spending.justice +
        newFiscal.spending.other;

      if (changes.detailedSpendingBudgets) {
        newFiscal.detailedSpending = newFiscal.detailedSpending.map((item) => {
          const nextBudget = changes.detailedSpendingBudgets?.[item.id];
          if (nextBudget === undefined) return item;

          if (item.type === 'capital') {
            return {
              ...item,
              currentBudget: nextBudget,
              capitalAllocation: nextBudget,
              currentAllocation: 0,
            };
          }

          if (item.type === 'resource') {
            return {
              ...item,
              currentBudget: nextBudget,
              currentAllocation: nextBudget,
              capitalAllocation: 0,
            };
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

      const localGovGrantItem = newFiscal.detailedSpending.find((item) => item.id === 'localGovernmentGrants');
      const nextCentralGrant = localGovGrantItem?.currentBudget ?? prevState.devolution.localGov.centralGrant_bn;

      const nextSpendingReviewDepartments = {
        ...prevState.spendingReview.departments,
        nhs: {
          ...prevState.spendingReview.departments.nhs,
          resourceDEL_bn: newFiscal.spending.nhsCurrent,
          capitalDEL_bn: newFiscal.spending.nhsCapital,
          plannedResourceDEL_bn: [
            newFiscal.spending.nhsCurrent,
            ...(prevState.spendingReview.departments.nhs.plannedResourceDEL_bn || []).slice(1),
          ],
          plannedCapitalDEL_bn: [
            newFiscal.spending.nhsCapital,
            ...(prevState.spendingReview.departments.nhs.plannedCapitalDEL_bn || []).slice(1),
          ],
        },
        education: {
          ...prevState.spendingReview.departments.education,
          resourceDEL_bn: newFiscal.spending.educationCurrent,
          capitalDEL_bn: newFiscal.spending.educationCapital,
          plannedResourceDEL_bn: [
            newFiscal.spending.educationCurrent,
            ...(prevState.spendingReview.departments.education.plannedResourceDEL_bn || []).slice(1),
          ],
          plannedCapitalDEL_bn: [
            newFiscal.spending.educationCapital,
            ...(prevState.spendingReview.departments.education.plannedCapitalDEL_bn || []).slice(1),
          ],
        },
        defence: {
          ...prevState.spendingReview.departments.defence,
          resourceDEL_bn: newFiscal.spending.defenceCurrent,
          capitalDEL_bn: newFiscal.spending.defenceCapital,
          plannedResourceDEL_bn: [
            newFiscal.spending.defenceCurrent,
            ...(prevState.spendingReview.departments.defence.plannedResourceDEL_bn || []).slice(1),
          ],
          plannedCapitalDEL_bn: [
            newFiscal.spending.defenceCapital,
            ...(prevState.spendingReview.departments.defence.plannedCapitalDEL_bn || []).slice(1),
          ],
        },
        infrastructure: {
          ...prevState.spendingReview.departments.infrastructure,
          resourceDEL_bn: newFiscal.spending.infrastructureCurrent,
          capitalDEL_bn: newFiscal.spending.infrastructureCapital,
          plannedResourceDEL_bn: [
            newFiscal.spending.infrastructureCurrent,
            ...(prevState.spendingReview.departments.infrastructure.plannedResourceDEL_bn || []).slice(1),
          ],
          plannedCapitalDEL_bn: [
            newFiscal.spending.infrastructureCapital,
            ...(prevState.spendingReview.departments.infrastructure.plannedCapitalDEL_bn || []).slice(1),
          ],
        },
        homeOffice: {
          ...prevState.spendingReview.departments.homeOffice,
          resourceDEL_bn: newFiscal.spending.policeCurrent + newFiscal.spending.justiceCurrent,
          capitalDEL_bn: newFiscal.spending.policeCapital + newFiscal.spending.justiceCapital,
          plannedResourceDEL_bn: [
            newFiscal.spending.policeCurrent + newFiscal.spending.justiceCurrent,
            ...(prevState.spendingReview.departments.homeOffice.plannedResourceDEL_bn || []).slice(1),
          ],
          plannedCapitalDEL_bn: [
            newFiscal.spending.policeCapital + newFiscal.spending.justiceCapital,
            ...(prevState.spendingReview.departments.homeOffice.plannedCapitalDEL_bn || []).slice(1),
          ],
        },
        localGov: {
          ...prevState.spendingReview.departments.localGov,
          resourceDEL_bn: nextCentralGrant,
          plannedResourceDEL_bn: [
            nextCentralGrant,
            ...(prevState.spendingReview.departments.localGov.plannedResourceDEL_bn || []).slice(1),
          ],
        },
        other: {
          ...prevState.spendingReview.departments.other,
          resourceDEL_bn: newFiscal.spending.otherCurrent,
          capitalDEL_bn: newFiscal.spending.otherCapital,
          plannedResourceDEL_bn: [
            newFiscal.spending.otherCurrent,
            ...(prevState.spendingReview.departments.other.plannedResourceDEL_bn || []).slice(1),
          ],
          plannedCapitalDEL_bn: [
            newFiscal.spending.otherCapital,
            ...(prevState.spendingReview.departments.other.plannedCapitalDEL_bn || []).slice(1),
          ],
        },
      };

      return {
        ...prevState,
        fiscal: newFiscal,
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
            centralGrant_bn: nextCentralGrant,
          },
        },
      };
    });
  }, []);

  // Respond to event
  const respondToEvent = useCallback((eventId: string, responseIndex: number) => {
    setGameState((prevState) => {
      const pendingEvents = prevState.events.pendingEvents || [];
      const eventIndex = pendingEvents.findIndex((e: any) => e.id === eventId);
      if (eventIndex === -1) return prevState;

      const event = pendingEvents[eventIndex];
      const responseOptions = event.responseOptions || [];
      if (responseIndex < 0 || responseIndex >= responseOptions.length) return prevState;

      const chosenResponse = responseOptions[responseIndex];
      let newState = { ...prevState };

      // Apply economic impacts from the chosen response
      const impact = chosenResponse.economicImpact;
      if (impact) {
        if (impact.gdpGrowth) {
          newState = {
            ...newState,
            economic: { ...newState.economic, gdpGrowthAnnual: newState.economic.gdpGrowthAnnual + impact.gdpGrowth },
          };
        }
        if (impact.inflation) {
          newState = {
            ...newState,
            economic: { ...newState.economic, inflationCPI: newState.economic.inflationCPI + impact.inflation },
          };
        }
        if (impact.unemployment) {
          newState = {
            ...newState,
            economic: { ...newState.economic, unemploymentRate: newState.economic.unemploymentRate + impact.unemployment },
          };
        }
        if (impact.approvalRating) {
          newState = {
            ...newState,
            political: { ...newState.political, governmentApproval: Math.max(10, Math.min(80, newState.political.governmentApproval + impact.approvalRating)) },
          };
        }
        if (impact.pmTrust) {
          newState = {
            ...newState,
            political: { ...newState.political, pmTrust: Math.max(0, Math.min(100, newState.political.pmTrust + impact.pmTrust)) },
          };
        }
        if (impact.giltYieldBps) {
          newState = {
            ...newState,
            markets: { ...newState.markets, giltYield10y: newState.markets.giltYield10y + impact.giltYieldBps / 100 },
          };
        }
        if (impact.sterlingPercent) {
          newState = {
            ...newState,
            markets: { ...newState.markets, sterlingIndex: newState.markets.sterlingIndex * (1 + impact.sterlingPercent / 100) },
          };
        }
      }

      // Sector-specific strike resolution effects.
      if (String(event.id).startsWith('sector_nhs_')) {
        if (chosenResponse.label === 'Meet pay demands') {
          newState = {
            ...newState,
            fiscal: {
              ...newState.fiscal,
              spending: {
                ...newState.fiscal.spending,
                nhsCurrent: newState.fiscal.spending.nhsCurrent + 3.0,
                nhs: (newState.fiscal.spending.nhsCurrent + 3.0) + newState.fiscal.spending.nhsCapital,
              },
            },
            services: {
              ...newState.services,
              nhsStrikeMonthsRemaining: 0,
            },
          };
        } else if (chosenResponse.label === 'Legislate against strike') {
          newState = {
            ...newState,
            political: {
              ...newState.political,
              backbenchSatisfaction: Math.max(10, newState.political.backbenchSatisfaction - 10),
              pmTrust: Math.max(0, newState.political.pmTrust - 8),
              governmentApproval: Math.max(10, newState.political.governmentApproval - 5),
            },
            services: {
              ...newState.services,
              nhsStrikeMonthsRemaining: 0,
            },
          };
        }
      }

      if (String(event.id).startsWith('sector_teacher_')) {
        if (chosenResponse.label === 'Meet pay demands') {
          newState = {
            ...newState,
            fiscal: {
              ...newState.fiscal,
              spending: {
                ...newState.fiscal.spending,
                educationCurrent: newState.fiscal.spending.educationCurrent + 2.5,
                education: (newState.fiscal.spending.educationCurrent + 2.5) + newState.fiscal.spending.educationCapital,
              },
            },
            services: {
              ...newState.services,
              educationStrikeMonthsRemaining: 0,
            },
          };
        } else if (chosenResponse.label === 'Legislate against strike') {
          newState = {
            ...newState,
            political: {
              ...newState.political,
              backbenchSatisfaction: Math.max(10, newState.political.backbenchSatisfaction - 10),
              pmTrust: Math.max(0, newState.political.pmTrust - 8),
              governmentApproval: Math.max(10, newState.political.governmentApproval - 5),
            },
            services: {
              ...newState.services,
              educationStrikeMonthsRemaining: 0,
            },
          };
        }
      }

      newState = {
        ...newState,
        fiscal: {
          ...newState.fiscal,
          totalSpending_bn:
            newState.fiscal.spending.nhs +
            newState.fiscal.spending.education +
            newState.fiscal.spending.defence +
            newState.fiscal.spending.welfare +
            newState.fiscal.spending.infrastructure +
            newState.fiscal.spending.police +
            newState.fiscal.spending.justice +
            newState.fiscal.spending.other,
        },
      };

      // Handle emergency spending - create programme if rebuilding is specified
      let newEmergencyProgrammes = [...newState.emergencyProgrammes.active];
      if (chosenResponse.fiscalCost && chosenResponse.rebuildingMonths) {
        const programmeName = event.title + ' - ' + chosenResponse.label;
        const programme: import('./game-state').EmergencyProgramme = {
          id: eventId + '-programme',
          eventId: eventId,
          name: programmeName,
          immediateCost_bn: chosenResponse.fiscalCost,
          rebuildingMonths: chosenResponse.rebuildingMonths,
          rebuildingCostPerMonth_bn: chosenResponse.rebuildingCostPerMonth || 0,
          remainingMonths: chosenResponse.rebuildingMonths,
          description: 'Emergency response to ' + event.title
        };
        newEmergencyProgrammes.push(programme);
      }

      // BUGFIX: Do NOT manually add fiscal cost to deficit/debt here.
      // The emergency programme's immediateCost_bn and rebuildingCostPerMonth_bn
      // will be automatically included in the deficit calculation during turn processing.
      // The turn processor will then add (deficit_bn / 12) to debt each month.
      // Manually adding to debt here would cause DOUBLE-COUNTING of the fiscal cost.
      //
      // The fiscal cost is already captured in:
      // 1. immediateCost_bn (one-time cost, reflected in the emergency programme tracking)
      // 2. rebuildingCostPerMonth_bn (monthly cost added to totalManagedExpenditure in turn-processor.tsx:434)
      //
      // No action needed here - the turn processor handles debt accumulation correctly.

      // Move event from pending to resolved in event log
      const remainingPending = [...pendingEvents];
      remainingPending.splice(eventIndex, 1);

      newState = {
        ...newState,
        events: {
          ...newState.events,
          pendingEvents: remainingPending,
          eventLog: [
            ...(newState.events.eventLog || []),
            { event, playerResponse: chosenResponse.label, resolved: true },
          ],
        },
        emergencyProgrammes: {
          ...newState.emergencyProgrammes,
          active: newEmergencyProgrammes,
        },
      };

      return newState;
    });
  }, []);

  // Hire adviser
  const hireAdviser = useCallback((adviserType: string) => {
    setGameState((prevState) => {
      const updatedAdviserSystem = hireAdviserHelper(
        prevState.advisers as any,
        adviserType as AdviserType,
        prevState.metadata.currentTurn
      );

      return {
        ...prevState,
        advisers: updatedAdviserSystem as any as AdviserSystem,
      };
    });
  }, []);

  // Fire adviser
  const fireAdviser = useCallback((adviserId: string) => {
    setGameState((prevState) => {
      const updatedAdviserSystem = fireAdviserHelper(
        prevState.advisers as any,
        adviserId as AdviserType
      );

      return {
        ...prevState,
        advisers: updatedAdviserSystem as any as AdviserSystem,
      };
    });
  }, []);

  // Respond to PM intervention
  const respondToPMIntervention = useCallback((choice: 'comply' | 'defy') => {
    setGameState((prevState) => {
      if (!prevState.political.pmInterventionsPending || prevState.political.pmInterventionsPending.length === 0) {
        return prevState;
      }

      const event = prevState.political.pmInterventionsPending[0];

      // Apply consequences
      let newState = { ...prevState };
      const remainingInterventions = (newState.political.pmInterventionsPending || []).slice(1);

      if (choice === 'comply') {
        const consequences = event.consequencesIfComply;
        let fiscal = {
          ...newState.fiscal,
          spending: { ...newState.fiscal.spending },
        };
        let services = { ...newState.services };
        let policyRiskModifiers = [...newState.policyRiskModifiers];
        let complianceNote = '';

        if (event.triggerReason === 'backbench_revolt') {
          const concession = 2 + Math.random() * 2;
          const baseline = createInitialFiscalState().spending;
          const welfareRatio = fiscal.spending.welfareCurrent / baseline.welfareCurrent;
          const publicServiceCandidates: Array<{ key: keyof typeof fiscal.spending; ratio: number }> = [
            { key: 'nhsCurrent', ratio: fiscal.spending.nhsCurrent / baseline.nhsCurrent },
            { key: 'educationCurrent', ratio: fiscal.spending.educationCurrent / baseline.educationCurrent },
            { key: 'defenceCurrent', ratio: fiscal.spending.defenceCurrent / baseline.defenceCurrent },
            { key: 'infrastructureCurrent', ratio: fiscal.spending.infrastructureCurrent / baseline.infrastructureCurrent },
            { key: 'policeCurrent', ratio: fiscal.spending.policeCurrent / baseline.policeCurrent },
            { key: 'justiceCurrent', ratio: fiscal.spending.justiceCurrent / baseline.justiceCurrent },
            { key: 'otherCurrent', ratio: fiscal.spending.otherCurrent / baseline.otherCurrent },
          ];
          const lowestPublic = publicServiceCandidates.sort((a, b) => a.ratio - b.ratio)[0];
          if (welfareRatio <= lowestPublic.ratio) {
            fiscal.spending.welfareCurrent += concession;
            fiscal.spending.welfare += concession;
            complianceNote = `PM concession: +£${concession.toFixed(1)}bn welfare spending.`;
          } else {
            fiscal.spending[lowestPublic.key] = (fiscal.spending[lowestPublic.key] as number) + concession;
            const map: Record<string, keyof typeof fiscal.spending> = {
              nhsCurrent: 'nhs',
              educationCurrent: 'education',
              defenceCurrent: 'defence',
              infrastructureCurrent: 'infrastructure',
              policeCurrent: 'police',
              justiceCurrent: 'justice',
              otherCurrent: 'other',
            };
            const aggregateKey = map[String(lowestPublic.key)];
            fiscal.spending[aggregateKey] = (fiscal.spending[aggregateKey] as number) + concession;
            complianceNote = `PM concession: +£${concession.toFixed(1)}bn to ${String(aggregateKey)} current spending.`;
          }
        } else if (event.triggerReason === 'manifesto_breach') {
          const recent = [...newState.manifesto.pledges]
            .filter((pledge) => pledge.violated)
            .sort((a, b) => (b.turnViolated || 0) - (a.turnViolated || 0))[0];
          if (recent) {
            if (recent.id.includes('income-tax')) {
              fiscal.incomeTaxBasicRate -= (fiscal.incomeTaxBasicRate - fiscal.startingTaxRates.incomeTaxBasic) * 0.5;
              fiscal.incomeTaxHigherRate -= (fiscal.incomeTaxHigherRate - fiscal.startingTaxRates.incomeTaxHigher) * 0.5;
              fiscal.incomeTaxAdditionalRate -= (fiscal.incomeTaxAdditionalRate - fiscal.startingTaxRates.incomeTaxAdditional) * 0.5;
              complianceNote = 'PM reversal: moved income tax rates halfway back to manifesto levels.';
            } else if (recent.id.includes('ni')) {
              fiscal.nationalInsuranceRate -= (fiscal.nationalInsuranceRate - fiscal.startingTaxRates.niEmployee) * 0.5;
              fiscal.employerNIRate -= (fiscal.employerNIRate - fiscal.startingTaxRates.niEmployer) * 0.5;
              complianceNote = 'PM reversal: moved National Insurance halfway back to manifesto levels.';
            } else if (recent.id.includes('vat')) {
              fiscal.vatRate -= (fiscal.vatRate - fiscal.startingTaxRates.vat) * 0.5;
              complianceNote = 'PM reversal: moved VAT halfway back to manifesto level.';
            } else if (recent.id.includes('corp')) {
              fiscal.corporationTaxRate -= (fiscal.corporationTaxRate - fiscal.startingTaxRates.corporationTax) * 0.5;
              complianceNote = 'PM reversal: moved corporation tax halfway back to manifesto level.';
            } else if (recent.targetDepartment === 'nhs') {
              const target = fiscal.fiscalYearStartSpending.nhs * 1.02;
              const delta = (target - fiscal.spending.nhs) * 0.5;
              fiscal.spending.nhsCurrent += delta;
              fiscal.spending.nhs += delta;
              complianceNote = `PM reversal: restored £${Math.abs(delta).toFixed(1)}bn towards NHS pledge path.`;
            } else if (recent.targetDepartment === 'education') {
              const target = fiscal.fiscalYearStartSpending.education * 1.02;
              const delta = (target - fiscal.spending.education) * 0.5;
              fiscal.spending.educationCurrent += delta;
              fiscal.spending.education += delta;
              complianceNote = `PM reversal: restored £${Math.abs(delta).toFixed(1)}bn towards education pledge path.`;
            }
          }
        } else if (event.triggerReason === 'approval_collapse') {
          fiscal.revenueAdjustment_bn = (fiscal.revenueAdjustment_bn || 0) - 0.5;
          complianceNote = 'PM directive: emergency communications package funded at £0.5bn this month.';
        } else if (event.triggerReason === 'economic_crisis') {
          const consolidation = 3 + Math.random() * 2;
          if (newState.fiscal.deficitPctGDP > 6) {
            if ((fiscal.revenueAdjustment_bn || 0) < 0) {
              fiscal.revenueAdjustment_bn = Math.min(0, (fiscal.revenueAdjustment_bn || 0) + consolidation);
            } else {
              const departmentalCut = consolidation / 5;
              fiscal.spending.defenceCurrent = Math.max(0, fiscal.spending.defenceCurrent - departmentalCut);
              fiscal.spending.infrastructureCurrent = Math.max(0, fiscal.spending.infrastructureCurrent - departmentalCut);
              fiscal.spending.policeCurrent = Math.max(0, fiscal.spending.policeCurrent - departmentalCut);
              fiscal.spending.justiceCurrent = Math.max(0, fiscal.spending.justiceCurrent - departmentalCut);
              fiscal.spending.otherCurrent = Math.max(0, fiscal.spending.otherCurrent - departmentalCut);
              fiscal.spending.defence = fiscal.spending.defenceCurrent + fiscal.spending.defenceCapital;
              fiscal.spending.infrastructure = fiscal.spending.infrastructureCurrent + fiscal.spending.infrastructureCapital;
              fiscal.spending.police = fiscal.spending.policeCurrent + fiscal.spending.policeCapital;
              fiscal.spending.justice = fiscal.spending.justiceCurrent + fiscal.spending.justiceCapital;
              fiscal.spending.other = fiscal.spending.otherCurrent + fiscal.spending.otherCapital;
            }
            complianceNote = `PM consolidation order: £${consolidation.toFixed(1)}bn tightening package enforced.`;
          }
          if (newState.fiscal.debtPctGDP > 110) {
            policyRiskModifiers.push({
              id: `pm_market_boost_${Date.now()}`,
              type: 'market_reaction_boost',
              turnsRemaining: 3,
              marketReactionScaleDelta: 0.15,
              description: 'Emergency market reaction premium after PM crisis intervention.',
            });
          }
        }

        fiscal.totalSpending_bn =
          fiscal.spending.nhs +
          fiscal.spending.education +
          fiscal.spending.defence +
          fiscal.spending.welfare +
          fiscal.spending.infrastructure +
          fiscal.spending.police +
          fiscal.spending.justice +
          fiscal.spending.other;

        newState.political = {
          ...newState.political,
          pmTrust: Math.max(0, Math.min(100, newState.political.pmTrust + (consequences.pmTrustChange || 0))),
          governmentApproval: Math.max(
            0,
            Math.min(
              100,
              newState.political.governmentApproval + (consequences.publicApprovalChange || 0) + (event.triggerReason === 'approval_collapse' ? 1.5 : 0)
            )
          ),
          backbenchSatisfaction: Math.max(0, Math.min(100, newState.political.backbenchSatisfaction + (consequences.backbenchSentimentChange || 0))),
          pmInterventionsPending: remainingInterventions,
        };
        newState.fiscal = fiscal;
        newState.services = services;
        newState.policyRiskModifiers = policyRiskModifiers;
        if (complianceNote) {
          newState.pmRelationship = {
            ...newState.pmRelationship,
            messages: [
              ...newState.pmRelationship.messages,
              {
                id: `pm_comply_${Date.now()}`,
                turn: newState.metadata.currentTurn,
                type: 'demand',
                subject: 'PM intervention implemented',
                content: complianceNote,
                tone: 'stern',
                read: false,
                timestamp: Date.now(),
              },
            ],
            unreadCount: (newState.pmRelationship.unreadCount || 0) + 1,
          };
        }
      } else {
        const consequences = event.consequencesIfDefy;
        newState.political = {
          ...newState.political,
          pmTrust: Math.max(0, Math.min(100, newState.political.pmTrust + (consequences.pmTrustChange || 0))),
          backbenchSatisfaction: Math.max(0, Math.min(100, newState.political.backbenchSatisfaction + (consequences.backbenchSentimentChange || 0))),
          pmInterventionsPending: remainingInterventions,
        };
        // Reshuffle risk: random chance of being sacked based on reshuffleRisk percentage
        if (consequences.reshuffleRisk && Math.random() * 100 < consequences.reshuffleRisk) {
          newState = {
            ...newState,
            metadata: {
              ...newState.metadata,
              gameOver: true,
              gameOverReason: 'You defied the Prime Minister one too many times. You have been reshuffled out of the Treasury.',
            },
          };
        }
      }

      return newState;
    });
  }, []);

  // Lobby MP
  const lobbyMP = useCallback(
    async (
      mpId: string,
      approach: LobbyingApproach,
      promiseCategory?: PromiseCategory,
      specificValue?: number
    ): Promise<{ success: boolean; message: string }> => {
      return new Promise((resolve) => {
        setGameState((prevState) => {
          const mp = prevState.mpSystem.allMPs.get(mpId);
          if (!mp) {
            resolve({ success: false, message: 'MP not found' });
            return prevState;
          }

          // Count broken promises for this MP
          const brokenPromisesCount = Array.from(prevState.mpSystem.promises.values()).filter(
            (p) => p.promisedToMPs.includes(mpId) && p.broken
          ).length;

          // Attempt lobbying
          const result = attemptLobbying(mp, approach, undefined, brokenPromisesCount);

          let newState = { ...prevState };

          if (result.success) {
            // If successful and promise was made, create the promise
            if (approach === 'promise' && promiseCategory) {
              const { createPromise } = require('./mp-system');
              const newPromise = createPromise(
                promiseCategory,
                [mpId],
                `Promise to ${mp.name} regarding ${promiseCategory}`,
                prevState.metadata.currentTurn,
                specificValue
              );
              const updatedPromises = new Map(prevState.mpSystem.promises);
              updatedPromises.set(newPromise.id, newPromise);

              newState.mpSystem = {
                ...newState.mpSystem,
                promises: updatedPromises,
              };

              // Save promise to IndexedDB
              savePromises(updatedPromises);
            }

            // Update MP stance to support
            const updatedStances = new Map(prevState.mpSystem.currentBudgetSupport);
            const currentStance = prevState.mpSystem.currentBudgetSupport.get(mpId);
            const detailedStance: DetailedMPStance = {
              stance: 'support',
              score: 80, // High support after successful lobbying
              reason: `Convinced by Chancellor via ${approach} approach.`,
              concerns: currentStance?.concerns || [],
              ideologicalAlignment: currentStance?.ideologicalAlignment || 0,
              constituencyImpact: currentStance?.constituencyImpact || 0,
              granularImpact: currentStance?.granularImpact || 0,
              brokenPromisesCount: brokenPromisesCount,
              isManualOverride: true,
              overrideTurn: prevState.metadata.currentTurn,
            };
            updatedStances.set(mpId, detailedStance);
            newState.mpSystem = {
              ...newState.mpSystem,
              currentBudgetSupport: updatedStances,
            };
          } else if (result.backfired) {
            // If backfired, reduce backbench satisfaction
            newState.political = {
              ...newState.political,
              backbenchSatisfaction: Math.max(
                0,
                newState.political.backbenchSatisfaction - 5
              ),
            };
          }

          resolve(result);
          return newState;
        });
      });
    },
    []
  );

  // Force PM Intervention (Nuclear Option)
  const forcePMIntervention = useCallback(() => {
    setGameState((prevState) => {
      // Apply severe political consequences
      const newPolitical = {
        ...prevState.political,
        pmTrust: Math.max(0, prevState.political.pmTrust - 20),
        backbenchSatisfaction: Math.max(0, prevState.political.backbenchSatisfaction - 15),
        governmentApproval: Math.max(0, prevState.political.governmentApproval - 8),
      };

      // Mark all Labour MPs as coerced (will affect future rebelliousness)
      const updatedMPs = new Map(prevState.mpSystem.allMPs);
      updatedMPs.forEach((mp, mpId) => {
        if (mp.party === 'labour') {
          // Increase rebelliousness for future votes
          const updatedMP = {
            ...mp,
            traits: {
              ...mp.traits,
              rebelliousness: Math.min(10, mp.traits.rebelliousness * 1.5),
            },
          };
          updatedMPs.set(mpId, updatedMP);
        }
      });

      return {
        ...prevState,
        political: newPolitical,
        mpSystem: {
          ...prevState.mpSystem,
          allMPs: updatedMPs,
        },
      };
    });
  }, []);

  // Update MP stances based on budget changes
  const updateMPStances = useCallback(
    (budgetChanges: BudgetChanges, manifestoViolations: string[]) => {
      setGameState((prevState) => {
        const newStances = calculateAllMPStances(
          prevState.mpSystem,
          budgetChanges,
          manifestoViolations,
          prevState.metadata.currentTurn,
          {
            whipStrength: prevState.parliamentary.whipStrength,
            taxDistribution: prevState.distributional.lastTaxChangeDistribution,
          }
        );

        // Generate concern profiles for all Labour MPs if not already generated
        const updatedConcernProfiles = new Map(prevState.mpSystem.concernProfiles);
        prevState.mpSystem.allMPs.forEach((mp, mpId) => {
          if (mp.party === 'labour' && !updatedConcernProfiles.has(mpId)) {
            updatedConcernProfiles.set(mpId, generateMPConcernProfile(mp));
          }
        });

        // Check if groups should be recalculated
        const shouldUpdateGroups = shouldRecalculateGroups(
          prevState.mpSystem.currentBudgetSupport,
          newStances,
          prevState.mpSystem.allMPs
        );

        let updatedGroups = prevState.mpSystem.activeGroups;
        if (shouldUpdateGroups || prevState.mpSystem.activeGroups.length === 0) {
          console.log('[MP System] Recalculating MP groups due to significant stance shifts');
          updatedGroups = identifyMPGroups(
            prevState.mpSystem.allMPs,
            newStances,
            updatedConcernProfiles,
            budgetChanges,
            prevState.metadata.currentMonth
          );
        }

        return {
          ...prevState,
          mpSystem: {
            ...prevState.mpSystem,
            currentBudgetSupport: newStances,
            concernProfiles: updatedConcernProfiles,
            activeGroups: updatedGroups,
          },
        };
      });
    },
    []
  );

  // Execute one-click manifesto pledge action
  const executeManifestoOneClick = useCallback((pledgeId: string) => {
    setGameState((prevState) => {
      // Find the pledge
      const pledge = prevState.manifesto.pledges.find((p) => p.id === pledgeId);
      if (!pledge) {
        console.error(`Pledge ${pledgeId} not found`);
        return prevState;
      }

      // Execute the one-click action
      const result = executeOneClickAction(
        pledge,
        {
          incomeTaxBasic: prevState.fiscal.incomeTaxBasicRate,
          incomeTaxHigher: prevState.fiscal.incomeTaxHigherRate,
          incomeTaxAdditional: prevState.fiscal.incomeTaxAdditionalRate,
          niEmployee: prevState.fiscal.nationalInsuranceRate,
          niEmployer: prevState.fiscal.employerNIRate,
          vat: prevState.fiscal.vatRate,
          corporationTax: prevState.fiscal.corporationTaxRate,
        },
        prevState.fiscal.startingTaxRates
      );

      if (!result.success || !result.budgetChanges) {
        // Show message to user (could be integrated with a toast system)
        console.log(result.message);
        return prevState;
      }

      // Apply the budget changes
      const changes = result.budgetChanges;

      // Apply tax changes
      let newFiscal = { ...prevState.fiscal };
      if (changes.incomeTaxBasicChange !== undefined) {
        newFiscal.incomeTaxBasicRate += changes.incomeTaxBasicChange;
      }
      if (changes.incomeTaxHigherChange !== undefined) {
        newFiscal.incomeTaxHigherRate += changes.incomeTaxHigherChange;
      }
      if (changes.incomeTaxAdditionalChange !== undefined) {
        newFiscal.incomeTaxAdditionalRate += changes.incomeTaxAdditionalChange;
      }
      if (changes.niEmployeeChange !== undefined) {
        newFiscal.nationalInsuranceRate += changes.niEmployeeChange;
      }
      if (changes.niEmployerChange !== undefined) {
        newFiscal.employerNIRate += changes.niEmployerChange;
      }
      if (changes.vatChange !== undefined) {
        newFiscal.vatRate += changes.vatChange;
      }
      if (changes.corporationTaxChange !== undefined) {
        newFiscal.corporationTaxRate += changes.corporationTaxChange;
      }

      // Apply spending changes to individual departments
      if (changes.nhsSpendingChange !== undefined) {
        newFiscal.spending.nhs += changes.nhsSpendingChange;
      }
      if (changes.educationSpendingChange !== undefined) {
        newFiscal.spending.education += changes.educationSpendingChange;
      }
      if (changes.defenceSpendingChange !== undefined) {
        newFiscal.spending.defence += changes.defenceSpendingChange;
      }
      if (changes.welfareSpendingChange !== undefined) {
        newFiscal.spending.welfare += changes.welfareSpendingChange;
      }
      if (changes.infrastructureSpendingChange !== undefined) {
        newFiscal.spending.infrastructure += changes.infrastructureSpendingChange;
      }
      if (changes.policeSpendingChange !== undefined) {
        newFiscal.spending.police += changes.policeSpendingChange;
      }
      if (changes.otherSpendingChange !== undefined) {
        newFiscal.spending.other += changes.otherSpendingChange;
      }

      // BUGFIX: Recalculate totalSpending_bn from individual departments (consistent with applyBudgetChanges)
      // This prevents accumulation errors from incremental += operations
      newFiscal.totalSpending_bn =
        newFiscal.spending.nhs +
        newFiscal.spending.education +
        newFiscal.spending.defence +
        newFiscal.spending.welfare +
        newFiscal.spending.infrastructure +
        newFiscal.spending.police +
        newFiscal.spending.justice +
        newFiscal.spending.other;

      // BUGFIX: Do NOT manually calculate deficit here.
      // The deficit should ONLY be calculated by the turn processor (turn-processor.tsx:436).
      // Manual calculation here causes inconsistency and may lead to incorrect values.
      // The turn processor will recalculate deficit, debtPctGDP, etc. on the next turn.
      // Removed lines:
      // newFiscal.deficit_bn = newFiscal.totalSpending_bn + newFiscal.debtInterest_bn - newFiscal.totalRevenue_bn;
      // newFiscal.deficitPctGDP = (newFiscal.deficit_bn / prevState.economic.gdpNominal_bn) * 100;

      console.log(result.message);

      // Update the manifesto pledge to mark one-click as executed and track progress
      const updatedPledges = prevState.manifesto.pledges.map((p) => {
        if (p.id === pledgeId) {
          return {
            ...p,
            oneClickExecuted: true,
            currentValue: p.targetValue || p.currentValue,
            violated: false,
          };
        }
        return p;
      });

      return {
        ...prevState,
        fiscal: newFiscal,
        manifesto: {
          ...prevState.manifesto,
          pledges: updatedPledges,
        },
      };
    });
  }, []);

  // Record high-volume budget votes in state and storage
  const recordBudgetVotes = useCallback((votes: Array<{ mpId: string; choice: 'aye' | 'noe' | 'abstain'; reasoning: string; coerced?: boolean }>) => {
    setGameState((prevState) => {
      const updatedVotingRecords = new Map(prevState.mpSystem.votingRecords);
      const budgetId = `budget_${prevState.metadata.currentTurn}`;
      const month = prevState.metadata.currentTurn;

      votes.forEach(vote => {
        let record = updatedVotingRecords.get(vote.mpId);
        if (!record) {
          record = {
            mpId: vote.mpId,
            budgetVotes: [],
            rebellionCount: 0,
            loyaltyScore: 100,
          };
        }

        const updatedBudgetVotes = [...record.budgetVotes, {
          budgetId,
          month,
          choice: vote.choice,
          reasoning: vote.reasoning,
          coerced: vote.coerced,
        }];

        // Keep last 20 votes
        const slicedVotes = updatedBudgetVotes.slice(-20);

        updatedVotingRecords.set(vote.mpId, {
          ...record,
          budgetVotes: slicedVotes,
        });
      });

      return {
        ...prevState,
        mpSystem: {
          ...prevState.mpSystem,
          votingRecords: updatedVotingRecords,
          // When a budget is submitted, we clear manual overrides for the NEXT budget
          currentBudgetSupport: new Map(
            Array.from(prevState.mpSystem.currentBudgetSupport.entries()).map(([id, stance]) => [
              id,
              { ...stance, isManualOverride: false }
            ])
          )
        }
      };
    });
  }, []);

  // Update promises status in state
  const updatePromises = useCallback((brokenPromiseIds: string[]) => {
    setGameState((prevState) => {
      const updatedPromises = new Map(prevState.mpSystem.promises);
      let changed = false;

      brokenPromiseIds.forEach(id => {
        const promise = updatedPromises.get(id);
        if (promise && !promise.broken) {
          updatedPromises.set(id, {
            ...promise,
            broken: true,
            brokenInMonth: prevState.metadata.currentTurn
          });
          changed = true;
        }
      });

      if (!changed) return prevState;

      return {
        ...prevState,
        mpSystem: {
          ...prevState.mpSystem,
          promises: updatedPromises
        }
      };
    });
  }, []);

  const changeFiscalFramework = useCallback((nextRule: FiscalRuleId) => {
    setGameState((prevState) => {
      if (prevState.political.chosenFiscalRule === nextRule) {
        return prevState;
      }

      const recomputed = calculateInitialFiscalRuleMetrics(
        prevState.fiscal,
        prevState.economic,
        nextRule,
      );

      return {
        ...prevState,
        fiscal: {
          ...prevState.fiscal,
          fiscalHeadroom_bn: recomputed.fiscalHeadroom_bn,
        },
        political: {
          ...prevState.political,
          chosenFiscalRule: nextRule,
          fiscalRuleChangedLastTurn: true,
          fiscalRuleChangeCount: (prevState.political.fiscalRuleChangeCount || 0) + 1,
          fiscalRuleCompliance: recomputed.fiscalRuleCompliance,
        },
      };
    });
  }, []);

  const recordSocialMediaTemplates = useCallback((templateIds: string[], turn: number) => {
    setGameState((prevState) => {
      if (!templateIds || templateIds.length === 0) return prevState;
      const encoded = templateIds.map((id) => `${turn}:${id}`);
      const merged = [...(prevState.socialMedia?.recentlyUsedPostIds || []), ...encoded];
      const deduped = Array.from(new Set(merged));
      const trimmed = deduped.slice(-15);

      if (
        trimmed.length === (prevState.socialMedia?.recentlyUsedPostIds || []).length &&
        trimmed.every((value, index) => value === (prevState.socialMedia?.recentlyUsedPostIds || [])[index])
      ) {
        return prevState;
      }

      return {
        ...prevState,
        socialMedia: {
          recentlyUsedPostIds: trimmed,
        },
      };
    });
  }, []);

  const setSpendingReviewPlans = useCallback((plans: SpendingReviewState['departments']) => {
    setGameState((prevState) => ({
      ...prevState,
      spendingReview: {
        ...prevState.spendingReview,
        departments: plans,
        inReview: false,
        srCredibilityBonus: 8,
        lastReviewTurn: prevState.metadata.currentTurn,
        nextReviewDueTurn: prevState.metadata.currentTurn < 37 ? 37 : Number.MAX_SAFE_INTEGER,
      },
    }));
  }, []);

  const updateSpendingReviewPlans = useCallback((plans: SpendingReviewState['departments']) => {
    setGameState((prevState) => ({
      ...prevState,
      spendingReview: {
        ...prevState.spendingReview,
        departments: plans,
      },
    }));
  }, []);

  const setDebtIssuanceStrategy = useCallback((strategy: DebtManagementState['issuanceStrategy']) => {
    setGameState((prevState) => ({
      ...prevState,
      debtManagement: {
        ...prevState.debtManagement,
        issuanceStrategy: strategy,
      },
    }));
  }, []);

  const actions: GameActions = {
    startNewGame,
    advanceTurn,
    saveGame,
    loadGame,
    applyBudgetChanges,
    respondToEvent,
    hireAdviser,
    fireAdviser,
    respondToPMIntervention,
    lobbyMP,
    forcePMIntervention,
    updateMPStances,
    executeManifestoOneClick,
    recordBudgetVotes,
    updatePromises,
    changeFiscalFramework,
    recordSocialMediaTemplates,
    setSpendingReviewPlans,
    updateSpendingReviewPlans,
    setDebtIssuanceStrategy,
  };

  return (
    <GameStateContext.Provider value={gameState}>
      <GameActionsContext.Provider value={actions}>
        {children}
      </GameActionsContext.Provider>
    </GameStateContext.Provider>
  );
};

// ===========================
// Hooks
// ===========================

export function useGameState(): GameState {
  const context = useContext(GameStateContext);
  if (context === undefined) {
    throw new Error('useGameState must be used within GameStateProvider');
  }
  return context;
}

export function useGameActions(): GameActions {
  const context = useContext(GameActionsContext);
  if (context === undefined) {
    throw new Error('useGameActions must be used within GameStateProvider');
  }
  return context;
}

// Convenience hooks for specific subsystems
export function useEconomicState(): EconomicState {
  return useGameState().economic;
}

export function useFiscalState(): FiscalState {
  return useGameState().fiscal;
}

export function usePoliticalState(): PoliticalState {
  return useGameState().political;
}

export function useManifestoState(): ManifestoState {
  return useGameState().manifesto;
}

export function useGameMetadata(): GameMetadata {
  return useGameState().metadata;
}

export function useMPSystem(): MPSystemState {
  return useGameState().mpSystem;
}
