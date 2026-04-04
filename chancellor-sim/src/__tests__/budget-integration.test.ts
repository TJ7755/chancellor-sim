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
  const debtManagement = createInitialDebtManagementState(
    fiscal.debtNominal_bn,
    markets.bankRate,
    economic.inflationCPI
  );
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
    },
    socialMedia: { recentlyUsedPostIds: [] },
    spendingReview,
    debtManagement,
    parliamentary,
    externalSector,
    financialStability,
    devolution,
    distributional,
    obr: {
      forecastVintages: [],
      latestForecast: null,
      obrCredibilityScore: 62,
      cumulativeForecastErrors: [],
      fiscalHeadroomForecast_bn: 9.9,
      forecastRiskStatement: 'balanced',
    },
    capitalDelivery: {
      pipelineCapacity_bn: 80,
      deliveryRiskMultiplier: 0.9,
      projectQueue: [],
      shovelReadyReserve_bn: 8,
      overCapacityTurns: 0,
      deferredCapital_bn: 0,
      procurementPrepCost_bn: 0.2,
    },
    housing: {
      houseBuilding_annualStarts: 240000,
      housingAffordabilityIndex: 45,
      rentInflation_pct: 6,
      planningBottleneck: 65,
      htbAndSharedOwnership_bn: 1.5,
      infrastructureGuarantees_bn: 2.0,
      planningReformPackage: false,
      councilHouseBuildingGrant_bn: 0.6,
    },
    industrialStrategy: {
      activeInterventions: [],
      totalAnnualCost_bn: 0,
      productivityBoostAccumulated: 0,
      failedInterventionCount: 0,
      stateAidRisk: 15,
      exportShockTurnsRemaining: 0,
    },
    legislativePipeline: { queue: [], hmrcSystemsCapacity: 100, consultationLoad: 25 },
  };
}

describe('budget application integration', () => {
  it('applies a tax increase and sees revenue change after processing', () => {
    const state = makeTestGameState();
    state.metadata.gameStarted = true;
    state.metadata.currentTurn = 0;
    state.metadata.currentMonth = 7;
    state.metadata.currentYear = 2024;

    const baselineRevenue = state.fiscal.totalRevenue_bn;

    state.fiscal.incomeTaxBasicRate += 1;
    state.fiscal.incomeTaxHigherRate += 1;
    state.fiscal.incomeTaxAdditionalRate += 1;

    const newState = processTurn(state);

    expect(newState.fiscal.totalRevenue_bn).toBeGreaterThan(baselineRevenue);
  });

  it('applies a spending increase and sees deficit widen', () => {
    const state = makeTestGameState();
    state.metadata.gameStarted = true;
    state.metadata.currentTurn = 0;
    state.metadata.currentMonth = 7;
    state.metadata.currentYear = 2024;

    const baselineDeficit = state.fiscal.deficit_bn;

    state.fiscal.spending.nhsCurrent += 10;
    state.fiscal.spending.educationCurrent += 5;
    state.fiscal.totalSpending_bn += 15;

    const newState = processTurn(state);

    expect(newState.fiscal.deficit_bn).toBeGreaterThan(baselineDeficit);
  });

  it('handles a comprehensive budget with tax and spending changes', () => {
    const state = makeTestGameState();
    state.metadata.gameStarted = true;
    state.metadata.currentTurn = 0;
    state.metadata.currentMonth = 7;
    state.metadata.currentYear = 2024;

    state.fiscal.incomeTaxBasicRate += 1;
    state.fiscal.vatRate += 2;
    state.fiscal.spending.nhsCurrent += 5;
    state.fiscal.spending.infrastructureCapital += 10;
    state.fiscal.revenueAdjustment_bn += 2;

    const newState = processTurn(state);

    expect(Number.isFinite(newState.fiscal.deficitPctGDP)).toBe(true);
    expect(Number.isFinite(newState.fiscal.debtPctGDP)).toBe(true);
    expect(newState.metadata.gameOver).toBe(false);
  });

  it('tracks fiscal rule compliance after policy changes', () => {
    const state = makeTestGameState();
    state.metadata.gameStarted = true;
    state.metadata.currentTurn = 0;
    state.metadata.currentMonth = 7;
    state.metadata.currentYear = 2024;

    const newState = processTurn(state);

    expect(newState.political.fiscalRuleCompliance).toBeDefined();
    expect(typeof newState.political.fiscalRuleCompliance.overallCompliant).toBe('boolean');
  });
});
