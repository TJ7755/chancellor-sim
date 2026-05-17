import { createInitialGameState } from '../game-state';
import processTurn from '../turn-processor';
import { estimateTaxRevenueAtRate } from '../laffer-analysis';
import { generateNewspaper } from '../events-media';
import { generatePMMessage } from '../pm-system';

function withNextMonth(state: any): any {
  const currentMonth = state.metadata.currentMonth;
  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
  const nextYear = currentMonth === 12 ? state.metadata.currentYear + 1 : state.metadata.currentYear;
  return {
    ...state,
    metadata: {
      ...state.metadata,
      currentTurn: state.metadata.currentTurn + 1,
      currentMonth: nextMonth,
      currentYear: nextYear,
      gameStarted: true,
    },
  };
}

function advance(state: any, months = 1): any {
  let next = state;
  for (let i = 0; i < months; i += 1) {
    next = processTurn(withNextMonth(next));
  }
  return next;
}

function setDetailedTax(state: any, id: string, currentRate: number): any {
  return {
    ...state,
    fiscal: {
      ...state.fiscal,
      detailedTaxes: state.fiscal.detailedTaxes.map((tax: any) =>
        tax.id === id ? { ...tax, currentRate } : tax
      ),
    },
  };
}

describe('core Chancellor simulation loop', () => {
  let randomSpy: jest.SpyInstance;

  beforeEach(() => {
    randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    randomSpy.mockRestore();
  });

  it('can complete a stable full term without fabricating a nominal GDP jump', () => {
    let state: any = createInitialGameState();
    const startingGDP = state.economic.gdpNominal_bn;

    state = advance(state, 1);
    const monthOneChange = Math.abs(state.economic.gdpNominal_bn - startingGDP) / startingGDP;
    expect(monthOneChange).toBeLessThan(0.01);

    state = {
      ...state,
      fiscal: {
        ...state.fiscal,
        totalRevenue_bn: 1300,
        deficit_bn: 20,
        deficitPctGDP: 0.7,
        debtNominal_bn: 1900,
        debtPctGDP: 69,
        debtInterest_bn: 60,
      },
      markets: {
        ...state.markets,
        giltYield10y: 3.7,
      },
      political: {
        ...state.political,
        pmTrust: 80,
        governmentApproval: 55,
        backbenchSatisfaction: 72,
        credibilityIndex: 75,
      },
      services: {
        ...state.services,
        nhsQuality: 72,
        educationQuality: 72,
        infrastructureQuality: 68,
        policingEffectiveness: 68,
        courtBacklogPerformance: 62,
        prisonSafety: 60,
      },
    };

    state = advance(state, 59);
    expect(state.metadata.currentTurn).toBe(60);
    expect(state.metadata.gameOver).toBe(false);
    expect(state.simulation.monthlySnapshots.length).toBeGreaterThanOrEqual(60);
  });

  it('can fail the game through a debt crisis', () => {
    const state: any = {
      ...createInitialGameState(),
      fiscal: {
        ...createInitialGameState().fiscal,
        debtPctGDP: 121,
        debtNominal_bn: 3400,
      },
    };

    const result = advance(state);
    expect(result.metadata.gameOver).toBe(true);
    expect(result.metadata.gameOverReason).toContain('national debt');
  });

  it('applies Laffer behaviour instead of pretending 100% income tax raises infinite money', () => {
    const state = createInitialGameState();
    const baseline = estimateTaxRevenueAtRate('incomeTaxBasic', 20, state);
    const confiscatory = estimateTaxRevenueAtRate('incomeTaxBasic', 100, state);

    expect(confiscatory).toBeLessThan(baseline * 0.15);
  });

  it('moves Barnett consequentials and the deficit when comparable English spending rises', () => {
    const baseline = advance(createInitialGameState());
    const expanded: any = createInitialGameState();
    expanded.fiscal.spending.nhsCurrent += 10;
    expanded.fiscal.spending.nhs += 10;
    expanded.fiscal.totalSpending_bn += 10;

    const result = advance(expanded);

    expect(result.fiscal.barnettConsequentials_bn).toBeGreaterThan(0);
    expect(result.fiscal.deficit_bn).toBeGreaterThan(baseline.fiscal.deficit_bn);
  });

  it('makes stamp duty controls affect SDLT receipts and approval pressure', () => {
    const baseline = advance(createInitialGameState());
    const higherStampDuty = advance(setDetailedTax(createInitialGameState(), 'stampDuty', 8));

    expect(higherStampDuty.fiscal.stampDutyRevenue_bn).not.toBeCloseTo(baseline.fiscal.stampDutyRevenue_bn, 1);
    expect(higherStampDuty.political.governmentApproval).toBeLessThanOrEqual(baseline.political.governmentApproval);
  });

  it('charges welfare and labour market levers through AME instead of leaving top-line dials flat', () => {
    const baseline = advance(createInitialGameState());
    const reform: any = createInitialGameState();
    reform.fiscal.ucTaperRate = 50;
    reform.fiscal.workAllowanceMonthly = 444;
    reform.fiscal.childcareSupportRate = 40;

    const result = advance(reform);

    expect(result.fiscal.welfareAME_bn).toBeGreaterThan(baseline.fiscal.welfareAME_bn);
    expect(result.fiscal.deficit_bn).toBeGreaterThan(baseline.fiscal.deficit_bn);
  });

  it('prices industrial strategy programmes into the fiscal position', () => {
    const baseline = advance(createInitialGameState());
    const industrial: any = createInitialGameState();
    industrial.industrialStrategy.activeInterventions = [
      {
        id: 'clean_energy_zone',
        name: 'Clean energy investment zone',
        sector: 'clean_energy',
        annualCost_bn: 1.5,
        turnsToEffect: 12,
        turnsActive: 0,
        successProbability: 0.65,
        outcomeRevealed: false,
      },
    ];

    const result = advance(industrial);

    expect(result.industrialStrategy.totalAnnualCost_bn).toBeCloseTo(1.5, 1);
    expect(result.fiscal.deficit_bn).toBeGreaterThan(baseline.fiscal.deficit_bn);
  });

  it('makes debt issuance strategy visible in yields and rollover risk', () => {
    const short: any = createInitialGameState();
    short.debtManagement.issuanceStrategy = 'short';
    short.debtManagement.strategyYieldEffect_bps = -14;

    const long: any = createInitialGameState();
    long.debtManagement.issuanceStrategy = 'long';
    long.debtManagement.strategyYieldEffect_bps = 14;

    const shortResult = advance(short);
    const longResult = advance(long);

    expect(shortResult.debtManagement.strategyYieldEffect_bps).toBeLessThan(0);
    expect(longResult.debtManagement.strategyYieldEffect_bps).toBeGreaterThan(0);
    expect(longResult.markets.giltYield10y).toBeGreaterThan(shortResult.markets.giltYield10y);
  });

  it('uses local government funding levers to reduce council stress over time', () => {
    const baseline = advance(createInitialGameState(), 6);
    const funded: any = createInitialGameState();
    funded.devolution.localGov.centralGrant_bn += 8;
    funded.fiscal.totalSpending_bn += 8;

    const result = advance(funded, 6);

    expect(result.devolution.localGov.councilFundingStress).toBeLessThan(baseline.devolution.localGov.councilFundingStress);
    expect(result.devolution.localGov.localServicesQuality).toBeGreaterThanOrEqual(baseline.devolution.localGov.localServicesQuality);
  });

  it('does not send the old NHS warning when NHS quality is not in crisis', () => {
    const state: any = createInitialGameState();
    state.services.nhsQuality = 70;
    state.services.educationQuality = 70;
    state.services.policingEffectiveness = 70;
    state.services.courtBacklogPerformance = 70;
    state.services.prisonSafety = 70;
    state.services.mentalHealthAccess = 70;
    state.services.affordableHousingDelivery = 70;
    state.devolution.localGov.localServicesQuality = 60;
    state.fiscal.fiscalHeadroom_bn = 25;
    state.obr.fiscalHeadroomForecast_bn = 25;
    state.political.fiscalRuleCompliance.overallCompliant = true;

    const message = generatePMMessage(state, 'concern', 'manual_test');

    expect(message.content).not.toContain('A&E waiting times');
  });

  it('creates newspapers with institutional and general pages', () => {
    const article = generateNewspaper(createInitialGameState());

    expect(article.institutionalPageHeadlines?.length).toBeGreaterThan(0);
    expect(article.secondaryPageHeadlines?.length).toBeGreaterThan(0);
  });

  it('initialises distributional data with real effective tax rates', () => {
    const state = createInitialGameState();
    const effectiveTaxRates = state.distributional.deciles.map((decile) => decile.effectiveTaxRate);

    expect(effectiveTaxRates[0]).toBeGreaterThan(0);
    expect(effectiveTaxRates[9]).toBeGreaterThan(effectiveTaxRates[0]);
    expect(state.distributional.topDecileEffectiveTaxRate).toBeGreaterThan(0);
  });
});
