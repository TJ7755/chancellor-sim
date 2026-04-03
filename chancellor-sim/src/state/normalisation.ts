// Normalisation functions for loading and migrating game state.
// Extracted from game-state.tsx to handle Map/object round-trip through JSON serialisation.

import {
  EconomicState,
  FiscalState,
  MarketState,
  ServicesState,
  PoliticalState,
  AdviserSystem,
  EventState,
  SimulationState,
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
} from '../game-integration';
import {
  GameState,
  GameMetadata,
  EmergencyProgrammesState,
  PMRelationshipState,
  SocialMediaGameState,
  SpendingReviewState,
  DebtManagementState,
  ParliamentaryState,
  ExternalSectorState,
  FinancialStabilityState,
  DevolutionState,
  DistributionalState,
  ObrState,
  CapitalDeliveryState,
  HousingState,
  IndustrialStrategyState,
  LegislativePipelineState,
  IndustrialIntervention,
  ObrForecast,
  ForecastError,
  CapitalProject,
  PipelineItem,
} from '../types';
import { createInitialMPSystem, DetailedMPStance, MPStanceLabel } from '../mp-system';

type MPStance = DetailedMPStance | MPStanceLabel;

function isMap(val: unknown): val is Map<unknown, unknown> {
  return val instanceof Map;
}

export function robustNormalizeMap<K, V>(raw: unknown): Map<K, V> {
  if (raw instanceof Map) return raw as Map<K, V>;
  const map = new Map<K, V>();
  if (!raw) return map;

  if (Array.isArray(raw)) {
    raw.forEach((entry) => {
      if (Array.isArray(entry) && entry.length === 2) {
        map.set(entry[0] as K, entry[1] as V);
      }
    });
  } else if (typeof raw === 'object') {
    Object.entries(raw).forEach(([k, v]) => {
      map.set(k as unknown as K, v as unknown as V);
    });
  }
  return map;
}

export function normalizeCurrentBudgetSupport(
  raw: unknown
): Map<string, DetailedMPStance> {
  const finalMap = new Map<string, DetailedMPStance>();

  if (!raw) return finalMap;

  let sourceEntries: Array<[string, MPStance]> = [];

  if (isMap(raw)) {
    sourceEntries = Array.from(raw.entries()) as Array<[string, MPStance]>;
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

export function normalizeAdviserSystem(system: AdviserSystem): AdviserSystem {
  if (!system) return { advisers: [], maxAdvisers: 3, hiredAdvisers: new Map(), availableAdvisers: new Set(), currentOpinions: new Map() };

  const hiredAdvisersInner = system.hiredAdvisers as unknown;
  const availableAdvisersInner = system.availableAdvisers as unknown;
  const currentOpinionsInner = system.currentOpinions as unknown;

  let normalisedHired = new Map<string, unknown>();
  if (isMap(hiredAdvisersInner)) {
    (hiredAdvisersInner as Map<string, unknown>).forEach((v, k) => normalisedHired.set(k, v));
  } else if (Array.isArray(hiredAdvisersInner)) {
    (hiredAdvisersInner as unknown[]).forEach((entry: unknown) => {
      if (Array.isArray(entry) && entry.length === 2) normalisedHired.set(entry[0] as string, entry[1]);
    });
  } else if (hiredAdvisersInner && typeof hiredAdvisersInner === 'object') {
    Object.entries(hiredAdvisersInner as Record<string, unknown>).forEach(([k, v]) => normalisedHired.set(k, v));
  }

  let normalisedAvailable = new Set<string>();
  if (availableAdvisersInner instanceof Set || (availableAdvisersInner && typeof (availableAdvisersInner as Set<string>).has === 'function')) {
    (availableAdvisersInner as Set<string>).forEach((item: string) => normalisedAvailable.add(item));
  } else if (Array.isArray(availableAdvisersInner)) {
    (availableAdvisersInner as unknown[]).forEach((item: unknown) => normalisedAvailable.add(String(item)));
  } else {
    normalisedAvailable = new Set(['treasury_mandarin', 'political_operator', 'heterodox_economist', 'fiscal_hawk', 'social_democrat', 'technocratic_centrist']);
  }

  let normalisedOpinions = new Map<string, unknown>();
  if (isMap(currentOpinionsInner)) {
    (currentOpinionsInner as Map<string, unknown>).forEach((v, k) => normalisedOpinions.set(k, v));
  } else if (Array.isArray(currentOpinionsInner)) {
    (currentOpinionsInner as unknown[]).forEach((entry: unknown) => {
      if (Array.isArray(entry) && entry.length === 2) normalisedOpinions.set(entry[0] as string, entry[1]);
    });
  } else if (currentOpinionsInner && typeof currentOpinionsInner === 'object') {
    Object.entries(currentOpinionsInner as Record<string, unknown>).forEach(([k, v]) => normalisedOpinions.set(k, v));
  }

  return {
    ...system,
    hiredAdvisers: normalisedHired,
    availableAdvisers: normalisedAvailable,
    currentOpinions: normalisedOpinions,
  };
}

function createInitialObrState(): ObrState {
  return {
    forecastVintages: [],
    latestForecast: null,
    obrCredibilityScore: 62,
    cumulativeForecastErrors: [],
    fiscalHeadroomForecast_bn: 9.9,
    forecastRiskStatement: 'balanced',
  };
}

function createInitialCapitalDeliveryState(): CapitalDeliveryState {
  return {
    pipelineCapacity_bn: 80,
    deliveryRiskMultiplier: 0.9,
    projectQueue: [],
    shovelReadyReserve_bn: 8,
    overCapacityTurns: 0,
    deferredCapital_bn: 0,
    procurementPrepCost_bn: 0.2,
  };
}

function createInitialHousingState(): HousingState {
  return {
    houseBuilding_annualStarts: 240000,
    housingAffordabilityIndex: 45,
    rentInflation_pct: 6,
    planningBottleneck: 65,
    htbAndSharedOwnership_bn: 1.5,
    infrastructureGuarantees_bn: 2.0,
    planningReformPackage: false,
    councilHouseBuildingGrant_bn: 0.6,
  };
}

function createInitialIndustrialStrategyState(): IndustrialStrategyState {
  return {
    activeInterventions: [],
    totalAnnualCost_bn: 0,
    productivityBoostAccumulated: 0,
    failedInterventionCount: 0,
    stateAidRisk: 15,
    exportShockTurnsRemaining: 0,
  };
}

function createInitialLegislativePipelineState(): LegislativePipelineState {
  return {
    queue: [],
    hmrcSystemsCapacity: 100,
    consultationLoad: 25,
  };
}

export function normalizeLoadedState(state: GameState): GameState {
  const mpSystem = state.mpSystem ?? createInitialMPSystem();
  const emergencyProgrammes = state.emergencyProgrammes ?? { active: [] };
  const advisers = state.advisers ?? createInitialAdviserSystem();
  const metadata: GameMetadata = {
    ...state.metadata,
    difficultyMode: ((state.metadata as Record<string, unknown>)?.difficultyMode as string) || 'realistic',
  };
  const pmRelationship: PMRelationshipState = state.pmRelationship ?? {
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
    messageTemplateLastFiredTurn: {},
  };
  const socialMedia: SocialMediaGameState = state.socialMedia ?? {
    recentlyUsedPostIds: [],
  };
  const spendingReview: SpendingReviewState = {
    ...createInitialSpendingReviewState(),
    ...((state as unknown as Record<string, unknown>).spendingReview as Record<string, unknown> || {}),
  } as SpendingReviewState;
  const debtManagement: DebtManagementState = {
    ...createInitialDebtManagementState(
      state?.fiscal?.debtNominal_bn ?? createInitialFiscalState().debtNominal_bn,
      state?.markets?.bankRate ?? createInitialMarketState().bankRate,
      state?.economic?.inflationCPI ?? createInitialEconomicState().inflationCPI
    ),
    ...((state as unknown as Record<string, unknown>).debtManagement as Record<string, unknown> || {}),
  } as DebtManagementState;
  const parliamentary: ParliamentaryState = {
    ...createInitialParliamentaryState(),
    ...((state as unknown as Record<string, unknown>).parliamentary as Record<string, unknown> || {}),
  } as ParliamentaryState;
  const externalSector: ExternalSectorState = {
    ...createInitialExternalSectorState(),
    ...((state as unknown as Record<string, unknown>).externalSector as Record<string, unknown> || {}),
  };
  const financialStability: FinancialStabilityState = {
    ...createInitialFinancialStabilityState(),
    ...((state as unknown as Record<string, unknown>).financialStability as Record<string, unknown> || {}),
  };
  const initialDevolution = createInitialDevolutionState() as DevolutionState;
  const loadedDevolution = ((state as unknown as Record<string, unknown>).devolution || {}) as Partial<DevolutionState>;
  const devolution: DevolutionState = {
    ...initialDevolution,
    ...loadedDevolution,
    nations: {
      ...initialDevolution.nations,
      ...(loadedDevolution.nations || {}),
    },
    localGov: {
      ...initialDevolution.localGov,
      ...((loadedDevolution as Record<string, unknown>).localGov as Record<string, unknown> || {}),
    },
  } as DevolutionState;
  const distributional: DistributionalState = {
    ...createInitialDistributionalState(),
    ...((state as unknown as Record<string, unknown>).distributional as Record<string, unknown> || {}),
  };
  const obr: ObrState = {
    ...createInitialObrState(),
    ...((state as unknown as Record<string, unknown>).obr as Record<string, unknown> || {}),
    forecastVintages: ((state as unknown as Record<string, unknown>).obr?.forecastVintages || []) as ObrForecast[],
    cumulativeForecastErrors: ((state as unknown as Record<string, unknown>).obr?.cumulativeForecastErrors || []) as ForecastError[],
    latestForecast: (state as unknown as Record<string, unknown>).obr?.latestForecast ?? null,
  };
  const capitalDelivery: CapitalDeliveryState = {
    ...createInitialCapitalDeliveryState(),
    ...((state as unknown as Record<string, unknown>).capitalDelivery as Record<string, unknown> || {}),
    projectQueue: ((state as unknown as Record<string, unknown>).capitalDelivery?.projectQueue || []) as CapitalProject[],
  };
  const housing: HousingState = {
    ...createInitialHousingState(),
    ...((state as unknown as Record<string, unknown>).housing as Record<string, unknown> || {}),
  };
  const industrialStrategy: IndustrialStrategyState = {
    ...createInitialIndustrialStrategyState(),
    ...((state as unknown as Record<string, unknown>).industrialStrategy as Record<string, unknown> || {}),
    activeInterventions: ((state as unknown as Record<string, unknown>).industrialStrategy?.activeInterventions || []) as IndustrialIntervention[],
  };
  const legislativePipeline: LegislativePipelineState = {
    ...createInitialLegislativePipelineState(),
    ...((state as unknown as Record<string, unknown>).legislativePipeline as Record<string, unknown> || {}),
    queue: ((state as unknown as Record<string, unknown>).legislativePipeline?.queue || []) as PipelineItem[],
  };

  const economic: EconomicState = {
    ...createInitialEconomicState(),
    ...(state.economic || {}),
  };
  const fiscal: FiscalState = state.fiscal ? {
    ...createInitialFiscalState(),
    ...state.fiscal,
  } : createInitialFiscalState();
  fiscal.personalAllowance = state.fiscal?.personalAllowance ?? createInitialFiscalState().personalAllowance;
  fiscal.basicRateUpperThreshold = state.fiscal?.basicRateUpperThreshold ?? createInitialFiscalState().basicRateUpperThreshold;
  fiscal.higherRateUpperThreshold = state.fiscal?.higherRateUpperThreshold ?? createInitialFiscalState().higherRateUpperThreshold;
  fiscal.thresholdUprating = state.fiscal?.thresholdUprating ?? createInitialFiscalState().thresholdUprating;
  fiscal.thresholdFreezeMonths = state.fiscal?.thresholdFreezeMonths ?? createInitialFiscalState().thresholdFreezeMonths;
  fiscal.fullExpensing = state.fiscal?.fullExpensing ?? createInitialFiscalState().fullExpensing;
  fiscal.antiAvoidanceInvestment_bn = state.fiscal?.antiAvoidanceInvestment_bn ?? createInitialFiscalState().antiAvoidanceInvestment_bn;
  fiscal.hmrcSystemsInvestment_bn = state.fiscal?.hmrcSystemsInvestment_bn ?? createInitialFiscalState().hmrcSystemsInvestment_bn;
  fiscal.sdltAdditionalDwellingsSurcharge = state.fiscal?.sdltAdditionalDwellingsSurcharge ?? createInitialFiscalState().sdltAdditionalDwellingsSurcharge;
  const markets: MarketState = {
    ...createInitialMarketState(),
    ...(state.markets || {}),
  };
  const political: PoliticalState = {
    ...createInitialPoliticalState(),
    ...(state.political || {}),
  };
  const services: ServicesState = {
    ...createInitialServicesState(),
    ...(state.services || {}),
  };
  const events: EventState = {
    ...createInitialEventState(),
    ...(state.events || {}),
  };
  const simulation: SimulationState = {
    monthlySnapshots: state.simulation?.monthlySnapshots || [],
    lastTurnDelta: state.simulation?.lastTurnDelta || null,
    obrForecastSnapshot: state.simulation?.obrForecastSnapshot || null,
    lastObrComparison: state.simulation?.lastObrComparison || null,
  };
  const policyRiskModifiers = Array.isArray((state as unknown as Record<string, unknown>).policyRiskModifiers)
    ? (state as unknown as Record<string, unknown>).policyRiskModifiers
    : [];

  // Migrate old save games to new capital/current spending structure
  if (fiscal && fiscal.spending && !(fiscal.spending as Record<string, unknown>).nhsCurrent) {
    const capitalRatios = {
      nhs: 12.0 / 180.4,
      education: 12.0 / 116,
      defence: 16.6 / 55.6,
      infrastructure: 80.0 / 100,
      police: 0.5 / 19,
      justice: 0.3 / 13,
      other: 20.0 / 326.0,
    };

    fiscal.spending = {
      ...fiscal.spending,
      nhsCurrent: fiscal.spending.nhs * (1 - capitalRatios.nhs),
      educationCurrent: fiscal.spending.education * (1 - capitalRatios.education),
      defenceCurrent: fiscal.spending.defence * (1 - capitalRatios.defence),
      welfareCurrent: fiscal.spending.welfare,
      infrastructureCurrent: fiscal.spending.infrastructure * (1 - capitalRatios.infrastructure),
      policeCurrent: fiscal.spending.police * (1 - capitalRatios.police),
      justiceCurrent: fiscal.spending.justice * (1 - capitalRatios.justice),
      otherCurrent: fiscal.spending.other * (1 - capitalRatios.other),
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
        mpSystem.currentBudgetSupport
      ),
    },
    advisers: normalizeAdviserSystem(advisers),
    emergencyProgrammes: {
      ...emergencyProgrammes,
      active: Array.isArray(emergencyProgrammes.active) ? emergencyProgrammes.active : [],
    },
    pmRelationship: {
      ...pmRelationship,
      activeThreats: Array.isArray((pmRelationship as unknown as Record<string, unknown>).activeThreats)
        ? (pmRelationship as unknown as Record<string, unknown>).activeThreats
        : [],
      messageTemplateLastFiredTurn:
        (pmRelationship as unknown as Record<string, unknown>).messageTemplateLastFiredTurn && typeof (pmRelationship as unknown as Record<string, unknown>).messageTemplateLastFiredTurn === 'object'
          ? (pmRelationship as unknown as Record<string, unknown>).messageTemplateLastFiredTurn
          : {},
    },
    socialMedia,
    spendingReview,
    debtManagement,
    parliamentary,
    externalSector,
    financialStability,
    devolution,
    distributional,
    obr,
    capitalDelivery,
    housing,
    industrialStrategy,
    legislativePipeline,
  };
}
