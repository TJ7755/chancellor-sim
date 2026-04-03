// Central type definitions extracted from game-state.tsx
// This file contains all state interfaces that were previously embedded in the God Object.

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
} from '../game-integration';
import { ManifestoState } from '../manifesto-system';
import { MPSystemState, LobbyingApproach, PromiseCategory } from '../mp-system';
import { BudgetDraft } from './budget-draft';

// ===========================
// Metadata
// ===========================

export type DifficultyMode = 'forgiving' | 'standard' | 'realistic';

export interface GameMetadata {
  currentTurn: number;
  currentMonth: number;
  currentYear: number;
  difficultyMode: DifficultyMode;
  gameStarted: boolean;
  gameOver: boolean;
  gameOverReason?: string;
  lastSaveTime?: number;
  playerName?: string;
}

// ===========================
// Emergency Programmes
// ===========================

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

// ===========================
// PM Relationship
// ===========================

export type PMMessageType =
  | 'regular_checkin'
  | 'warning'
  | 'threat'
  | 'demand'
  | 'support_change'
  | 'reshuffle_warning'
  | 'praise'
  | 'concern';

export interface PMMessage {
  id: string;
  turn: number;
  templateId?: string;
  type: PMMessageType;
  subject: string;
  content: string;
  tone: 'supportive' | 'neutral' | 'stern' | 'angry';
  read: boolean;
  timestamp: number;
  demandCategory?: 'tax' | 'spending' | 'deficit' | 'approval';
  demandDetails?: string;
  consequenceWarning?: string;
  threatTargetDeficit_bn?: number;
  threatDeadlineTurn?: number;
  threatBaselineDeficit_bn?: number;
}

export interface PMRelationshipState {
  patience: number;
  warningsIssued: number;
  demandsIssued: number;
  demandsMet: number;
  lastContactTurn: number;
  messages: PMMessage[];
  unreadCount: number;
  consecutivePoorPerformance: number;
  reshuffleRisk: number;
  supportWithdrawn: boolean;
  finalWarningGiven: boolean;
  activeDemands: {
    category: string;
    description: string;
    deadline: number;
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
  messageTemplateLastFiredTurn: Record<string, number>;
}

// ===========================
// Social Media
// ===========================

export interface SocialMediaGameState {
  recentlyUsedPostIds: string[];
}

// ===========================
// Spending Review
// ===========================

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

// ===========================
// Debt Management
// ===========================

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
  rolloverRiskPremium_bps?: number;
  strategyYieldEffect_bps?: number;
  projectedDebtInterestByStrategy_bn?: {
    short: number;
    balanced: number;
    long: number;
  };
}

// ===========================
// Parliamentary
// ===========================

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

// ===========================
// External Sector
// ===========================

export interface ExternalSectorState {
  currentAccountGDP: number;
  tradeBalanceGDP: number;
  energyImportPricePressure: number;
  tradeFrictionIndex: number;
  exportGrowth: number;
  importGrowth: number;
  externalShockActive: boolean;
  externalShockType: 'energy_spike' | 'trade_war' | 'partner_recession' | 'tariff_shock' | 'banking_sector_stress' | null;
  externalShockTurnsRemaining: number;
  externalShockMagnitude: number;
}

// ===========================
// Financial Stability
// ===========================

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

// ===========================
// Devolution
// ===========================

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
  coreSettlement_bn: number;
  adultSocialCarePressure_bn: number;
  councilFundingStress: number;
  section114Count: number;
  businessRatesRetention: number;
  councilTaxGrowthCap: number;
}

export interface DevolutionState {
  nations: { scotland: DevolvdNation; wales: DevolvdNation; northernIreland: DevolvdNation; };
  localGov: LocalGovState;
  barnettConsequentialMultiplier: number;
  section114Timer: number;
}

// ===========================
// Distributional
// ===========================

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
  decileImpacts: number[];
}

// ===========================
// OBR
// ===========================

export type ForecastRiskStatement = 'balanced' | 'skewed_down' | 'skewed_up';

export interface PolicyScoring {
  measureDescription: string;
  annualImpact_bn: number;
  certaintylevel: 'high' | 'medium' | 'low' | 'highly_uncertain';
}

export interface ObrForecast {
  eventTurn: number;
  eventType: 'budget' | 'autumn_statement';
  gdpGrowthPath: number[];
  inflationPath: number[];
  unemploymentPath: number[];
  deficitPath: number[];
  debtPath: number[];
  fiscalHeadroom_bn: number;
  policyScorings: PolicyScoring[];
}

export interface ForecastError {
  forecastTurn: number;
  metric: string;
  forecastValue: number;
  actualValue: number;
  errorMagnitude: number;
}

export interface ObrState {
  forecastVintages: ObrForecast[];
  latestForecast: ObrForecast | null;
  obrCredibilityScore: number;
  cumulativeForecastErrors: ForecastError[];
  fiscalHeadroomForecast_bn: number;
  forecastRiskStatement: ForecastRiskStatement;
}

// ===========================
// Capital Delivery
// ===========================

export interface CapitalProject {
  name: string;
  totalCost_bn: number;
  plannedStartTurn: number;
  plannedDurationTurns: number;
  deliveredSoFar_bn: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface CapitalDeliveryState {
  pipelineCapacity_bn: number;
  deliveryRiskMultiplier: number;
  projectQueue: CapitalProject[];
  shovelReadyReserve_bn: number;
  overCapacityTurns: number;
  deferredCapital_bn: number;
  procurementPrepCost_bn: number;
}

// ===========================
// Housing
// ===========================

export interface HousingState {
  houseBuilding_annualStarts: number;
  housingAffordabilityIndex: number;
  rentInflation_pct: number;
  planningBottleneck: number;
  htbAndSharedOwnership_bn: number;
  infrastructureGuarantees_bn: number;
  planningReformPackage: boolean;
  councilHouseBuildingGrant_bn: number;
}

// ===========================
// Industrial Strategy
// ===========================

export interface IndustrialIntervention {
  id: string;
  name: string;
  sector: 'clean_energy' | 'advanced_manufacturing' | 'life_sciences' | 'digital' | 'defence' | 'construction';
  annualCost_bn: number;
  turnsActive: number;
  turnsToEffect: number;
  successProbability: number;
  outcomeRevealed: boolean;
  outcome: 'success' | 'failure' | 'partial' | null;
}

export interface IndustrialStrategyState {
  activeInterventions: IndustrialIntervention[];
  totalAnnualCost_bn: number;
  productivityBoostAccumulated: number;
  failedInterventionCount: number;
  stateAidRisk: number;
  exportShockTurnsRemaining: number;
}

// ===========================
// Legislative Pipeline
// ===========================

export interface PipelineItem {
  measureId: string;
  description: string;
  type: 'primary_legislation' | 'secondary_legislation' | 'hmrc_systems' | 'administrative';
  announcedTurn: number;
  effectiveTurn: number;
  turnsRemaining: number;
  fiscalImpactOnEffect_bn: number;
  status: 'queued' | 'in_progress' | 'active' | 'delayed';
  delayRisk: number;
  capacityCost: number;
}

export interface LegislativePipelineState {
  queue: PipelineItem[];
  hmrcSystemsCapacity: number;
  consultationLoad: number;
}

// ===========================
// Root GameState
// ===========================

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
  obr: ObrState;
  capitalDelivery: CapitalDeliveryState;
  housing: HousingState;
  industrialStrategy: IndustrialStrategyState;
  legislativePipeline: LegislativePipelineState;
}

// ===========================
// Actions Interface
// ===========================

export interface BudgetChanges {
  incomeTaxBasicChange?: number;
  incomeTaxHigherChange?: number;
  incomeTaxAdditionalChange?: number;
  niEmployeeChange?: number;
  niEmployerChange?: number;
  vatChange?: number;
  corporationTaxChange?: number;
  capitalGainsTaxChange?: number;
  fuelDutyChange?: number;
  revenueAdjustment?: number;
  nhsCurrentChange?: number;
  educationCurrentChange?: number;
  defenceCurrentChange?: number;
  welfareCurrentChange?: number;
  infrastructureCurrentChange?: number;
  policeCurrentChange?: number;
  justiceCurrentChange?: number;
  otherCurrentChange?: number;
  nhsCapitalChange?: number;
  educationCapitalChange?: number;
  defenceCapitalChange?: number;
  infrastructureCapitalChange?: number;
  policeCapitalChange?: number;
  justiceCapitalChange?: number;
  otherCapitalChange?: number;
  nhsSpendingChange?: number;
  educationSpendingChange?: number;
  defenceSpendingChange?: number;
  welfareSpendingChange?: number;
  infrastructureSpendingChange?: number;
  policeSpendingChange?: number;
  justiceSpendingChange?: number;
  otherSpendingChange?: number;
  detailedTaxRates?: Record<string, number>;
  detailedSpendingBudgets?: Record<string, number>;
  policyRiskModifiers?: PolicyRiskModifier[];
  ucTaperRateChange?: number;
  workAllowanceMonthlyChange?: number;
  childcareSupportRateChange?: number;
  personalAllowanceChange?: number;
  basicRateUpperThresholdChange?: number;
  higherRateUpperThresholdChange?: number;
  thresholdUprating?: 'frozen' | 'cpi_linked' | 'earnings_linked' | 'custom';
  fullExpensing?: boolean;
  antiAvoidanceInvestmentChange_bn?: number;
  hmrcSystemsInvestmentChange_bn?: number;
  sdltAdditionalDwellingsSurchargeChange?: number;
  planningReformPackage?: boolean;
  infrastructureGuaranteesChange_bn?: number;
  htbAndSharedOwnershipChange_bn?: number;
  councilHouseBuildingGrantChange_bn?: number;
  localGovCentralGrantChange_bn?: number;
  councilTaxGrowthCapChange?: number;
  industrialInterventionAddIds?: string[];
}

export interface GameActions {
  startNewGame: (
    playerName?: string,
    manifestoChoice?: string,
    fiscalRuleChoice?: FiscalRuleId,
    difficultyMode?: DifficultyMode
  ) => void;
  advanceTurn: () => void;
  saveGame: (slotName: string) => { success: boolean; error?: string };
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
  markPMMessageAsRead: (messageId: string) => void;
  setBudgetDraft: (draft: BudgetDraft | null) => void;
  clearBudgetDraft: () => void;
  recordSocialMediaTemplates: (templateIds: string[], turn: number) => void;
  setSpendingReviewPlans: (plans: SpendingReviewState['departments']) => void;
  updateSpendingReviewPlans: (plans: SpendingReviewState['departments']) => void;
  setDebtIssuanceStrategy: (strategy: DebtManagementState['issuanceStrategy']) => void;
}
