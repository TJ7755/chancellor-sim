import { buildSaveEnvelope, SAVE_VERSION, simpleChecksum, validateSave } from '../state/save-game';
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

function makeTestState(): any {
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
    metadata: { currentTurn: 0, currentMonth: 7, currentYear: 2024, difficultyMode: 'realistic', gameStarted: false, gameOver: false },
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
    pmRelationship: { patience: 70, warningsIssued: 0, demandsIssued: 0, demandsMet: 0, lastContactTurn: -1, messages: [], unreadCount: 0, consecutivePoorPerformance: 0, reshuffleRisk: 0, supportWithdrawn: false, finalWarningGiven: false, activeDemands: [], activeThreats: [], messageTemplateLastFiredTurn: {} },
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

describe('save round-trip', () => {
  it('serialises and deserialises a fresh game state', () => {
    const state = makeTestState();
    state.metadata.gameStarted = true;
    state.metadata.currentTurn = 5;
    state.metadata.playerName = 'Test Chancellor';

    const serialised = JSON.stringify(state);
    const raw = JSON.stringify(buildSaveEnvelope(state, serialised));

    const result = validateSave(raw);

    expect(result.success).toBe(true);
    expect(result.state).toBeDefined();
    expect((result.state as any).metadata.currentTurn).toBe(5);
    expect((result.state as any).metadata.playerName).toBe('Test Chancellor');
    expect((result.state as any).metadata.gameStarted).toBe(true);
  });

  it('preserves fiscal metrics through save/load cycle', () => {
    const state = makeTestState();
    state.metadata.gameStarted = true;
    state.fiscal.deficitPctGDP = 4.2;
    state.fiscal.debtPctGDP = 95.5;
    state.fiscal.fiscalHeadroom_bn = 5.3;
    state.economic.gdpNominal_bn = 2800;
    state.political.governmentApproval = 38;

    const serialised = JSON.stringify(state);
    const raw = JSON.stringify(buildSaveEnvelope(state, serialised));

    const result = validateSave(raw);

    expect(result.success).toBe(true);
    expect((result.state as any).fiscal.deficitPctGDP).toBe(4.2);
    expect((result.state as any).fiscal.debtPctGDP).toBe(95.5);
    expect((result.state as any).fiscal.fiscalHeadroom_bn).toBe(5.3);
    expect((result.state as any).economic.gdpNominal_bn).toBe(2800);
    expect((result.state as any).political.governmentApproval).toBe(38);
  });

  it('rejects a save with corrupted state fields', () => {
    const state = makeTestState();
    state.metadata.gameStarted = true;
    state.metadata.currentTurn = -5;

    const serialised = JSON.stringify(state);
    const raw = JSON.stringify(buildSaveEnvelope(state, serialised));

    const result = validateSave(raw);

    expect(result.success).toBe(false);
    expect(result.error).toContain('currentTurn');
  });

  it('handles the current save version correctly', () => {
    const state = makeTestState();
    state.metadata.gameStarted = true;
    state.metadata.currentTurn = 10;

    const serialised = JSON.stringify(state);
    const envelope = JSON.stringify(buildSaveEnvelope(state, serialised));
    const parsed = JSON.parse(envelope);

    expect(parsed.version).toBe(SAVE_VERSION);
    expect(parsed.turnAtSave).toBe(10);
    expect(typeof parsed.checksum).toBe('string');
  });
});
