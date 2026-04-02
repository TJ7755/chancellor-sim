import processTurn from '../turn-processor';
import {
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
} from '../game-integration';
import { initializeManifestoState } from '../manifesto-system';
import { createInitialMPSystem } from '../mp-system';

function makeTestGameState(): any {
  const economic = createInitialEconomicState();
  const fiscal = createInitialFiscalState();
  const markets = createInitialMarketState();
  const services = createInitialServicesState();
  const political = createInitialPoliticalState();
  const advisers = createInitialAdviserSystem();
  const events = createInitialEventState();
  const spendingReview = createInitialSpendingReviewState();
  const debtManagement = createInitialDebtManagementState(fiscal.debtNominal_bn, markets.bankRate, economic.inflationCPI);
  const parliamentary = createInitialParliamentaryState();
  const externalSector = createInitialExternalSectorState();
  const financialStability = createInitialFinancialStabilityState();
  const devolution = createInitialDevolutionState();
  const distributional = createInitialDistributionalState();
  const manifesto = initializeManifestoState();
  const mpSystem = createInitialMPSystem();
  const initialRuleMetrics = calculateInitialFiscalRuleMetrics(fiscal, economic, political.chosenFiscalRule);

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
    fiscal: { ...fiscal, fiscalHeadroom_bn: initialRuleMetrics.fiscalHeadroom_bn },
    markets,
    services,
    political: { ...political, fiscalRuleCompliance: initialRuleMetrics.fiscalRuleCompliance },
    advisers,
    events,
    manifesto,
    simulation: { monthlySnapshots: [], lastTurnDelta: null, obrForecastSnapshot: null, lastObrComparison: null },
    policyRiskModifiers: [],
    mpSystem,
    emergencyProgrammes: { active: [] },
    pmRelationship: {
      patience: 70, warningsIssued: 0, demandsIssued: 0, demandsMet: 0, lastContactTurn: -1,
      messages: [], unreadCount: 0, consecutivePoorPerformance: 0, reshuffleRisk: 0,
      supportWithdrawn: false, finalWarningGiven: false, activeDemands: [], activeThreats: [],
      messageTemplateLastFiredTurn: {},
    },
    socialMedia: { recentlyUsedPostIds: [] },
    spendingReview,
    debtManagement,
    parliamentary,
    externalSector,
    financialStability,
    devolution,
    distributional,
    obr: { forecastVintages: [], latestForecast: null, obrCredibilityScore: 62, cumulativeForecastErrors: [], fiscalHeadroomForecast_bn: 9.9, forecastRiskStatement: 'balanced' },
    capitalDelivery: { pipelineCapacity_bn: 80, deliveryRiskMultiplier: 0.9, projectQueue: [], shovelReadyReserve_bn: 8, overCapacityTurns: 0, deferredCapital_bn: 0, procurementPrepCost_bn: 0.2 },
    housing: { houseBuilding_annualStarts: 240000, housingAffordabilityIndex: 45, rentInflation_pct: 6, planningBottleneck: 65, htbAndSharedOwnership_bn: 1.5, infrastructureGuarantees_bn: 2.0, planningReformPackage: false, councilHouseBuildingGrant_bn: 0.6 },
    industrialStrategy: { activeInterventions: [], totalAnnualCost_bn: 0, productivityBoostAccumulated: 0, failedInterventionCount: 0, stateAidRisk: 15, exportShockTurnsRemaining: 0 },
    legislativePipeline: { queue: [], hmrcSystemsCapacity: 100, consultationLoad: 25 },
  };
}

describe('turn processing integration', () => {
  it('processes a single turn without crashing from initial state', () => {
    const state = makeTestGameState();
    state.metadata.gameStarted = true;
    state.metadata.currentTurn = 0;
    state.metadata.currentMonth = 7;
    state.metadata.currentYear = 2024;

    const newState = processTurn(state);

    expect(newState.metadata.currentTurn).toBe(0);
    expect(newState.metadata.gameOver).toBe(false);
  });

  it('processes 12 consecutive turns without crashing', () => {
    let state = makeTestGameState();
    state.metadata.gameStarted = true;

    for (let i = 0; i < 12; i++) {
      const totalMonths = i + 6;
      state.metadata.currentTurn = i;
      state.metadata.currentMonth = (totalMonths % 12) + 1;
      state.metadata.currentYear = 2024 + Math.floor(totalMonths / 12);
      state = processTurn(state);
      expect(state.metadata.gameOver).toBe(false);
    }
  });

  it('produces finite numeric values for key fiscal metrics after processing', () => {
    let state = makeTestGameState();
    state.metadata.gameStarted = true;
    state.metadata.currentTurn = 0;
    state.metadata.currentMonth = 7;
    state.metadata.currentYear = 2024;

    state = processTurn(state);

    expect(Number.isFinite(state.economic.gdpNominal_bn)).toBe(true);
    expect(Number.isFinite(state.fiscal.deficitPctGDP)).toBe(true);
    expect(Number.isFinite(state.fiscal.debtPctGDP)).toBe(true);
    expect(Number.isFinite(state.fiscal.fiscalHeadroom_bn)).toBe(true);
    expect(Number.isFinite(state.markets.giltYield10y)).toBe(true);
    expect(Number.isFinite(state.political.governmentApproval)).toBe(true);
  });

  it('updates historical snapshots each turn', () => {
    let state = makeTestGameState();
    state.metadata.gameStarted = true;
    state.metadata.currentTurn = 0;
    state.metadata.currentMonth = 7;
    state.metadata.currentYear = 2024;

    state = processTurn(state);

    expect(state.simulation.monthlySnapshots.length).toBeGreaterThan(0);
  });
});
