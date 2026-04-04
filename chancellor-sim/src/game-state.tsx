// Unified Game State Manager - Re-export layer
//
// This file was previously a 3153-line God Object. It has been split into:
//   - state/game-context.tsx    (Context provider, actions, hooks)
//   - state/normalisation.ts    (Map/object round-trip handling)
//   - state/persistence.ts      (Serialisation, save, load)
//   - types.ts                  (All state interfaces)
//   - domain/budget/apply-changes.ts (Budget application logic)
//   - domain/game/scoring.ts    (Performance scoring)
//   - utils/helpers.ts          (Turn metadata, clamp, month names)
//
// This file now re-exports everything for backwards compatibility.

export {
  GameStateProvider,
  useGameState,
  useGameActions,
  useBudgetDraft,
  useEconomicState,
  useFiscalState,
  usePoliticalState,
  useManifestoState,
  useGameMetadata,
  useMPSystem,
} from './state/game-context';

export type {
  GameState,
  GameMetadata,
  DifficultyMode,
  GameActions,
  BudgetChanges,
  EmergencyProgramme,
  EmergencyProgrammesState,
  PMMessageType,
  PMMessage,
  PMRelationshipState,
  SocialMediaGameState,
  DepartmentDEL,
  SpendingReviewState,
  GiltMaturityBucket,
  DebtManagementState,
  SelectCommittee,
  ParliamentaryState,
  ExternalSectorState,
  FinancialStabilityState,
  DevolvdNation,
  LocalGovState,
  DevolutionState,
  IncomeDecile,
  DistributionalState,
  ForecastRiskStatement,
  PolicyScoring,
  ObrForecast,
  ForecastError,
  ObrState,
  CapitalProject,
  CapitalDeliveryState,
  HousingState,
  IndustrialIntervention,
  IndustrialStrategyState,
  PipelineItem,
  LegislativePipelineState,
} from './types';

export type {
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
} from './game-integration';

export type { ManifestoState } from './manifesto-system';
export type { MPSystemState, LobbyingApproach, PromiseCategory } from './mp-system';
export type { BudgetDraft } from './state/budget-draft';

export {
  normalizeLoadedState,
  robustNormalizeMap,
  normalizeCurrentBudgetSupport,
  normalizeAdviserSystem,
} from './state/normalisation';
export { serialiseGameState, writeSave, readSave } from './state/persistence';
export { applyBudgetChangesToState } from './domain/budget/apply-changes';
export { calcScore, calculateGrade } from './domain/game/scoring';
export { clamp, getMonthName, calculateTurnMetadata } from './utils/helpers';
