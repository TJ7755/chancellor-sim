// Step 18.5: OBR Forecasting
import { GameState } from '../../types';

import { OBRForecastSnapshot, OBRForecastYear, OBRForecastComparison } from '../../game-integration';
import { round1 } from './shared-helpers';

export function processStepOBR(state: GameState, isFiscalEventMonth: boolean): GameState {
  const isFiscalEventTurn = state.metadata.currentMonth === 3 || state.metadata.currentMonth === 11;
  const isApril = state.metadata.currentMonth === 4;

  let nextState = { ...state };
  if (isFiscalEventTurn) {
    const latestForecast = buildObrForecastVintage(state);
    const nextSnapshot = buildOBRProjection(state);
    nextState = {
      ...nextState,
      obr: {
        ...nextState.obr,
        latestForecast,
        forecastVintages: [...(nextState.obr.forecastVintages || []), latestForecast],
        fiscalHeadroomForecast_bn: latestForecast.fiscalHeadroom_bn,
        forecastRiskStatement:
          latestForecast.fiscalHeadroom_bn < 0
            ? 'skewed_down'
            : latestForecast.fiscalHeadroom_bn < 10
              ? 'balanced'
              : 'skewed_up',
      },
      simulation: {
        ...nextState.simulation,
        obrForecastSnapshot: nextSnapshot,
      },
    };
  }

  if (!isApril || !nextState.obr.latestForecast) {
    return nextState;
  }

  const latest = nextState.obr.latestForecast;
  const gdpError = state.economic.gdpGrowthAnnual - latest.gdpGrowthPath[0];
  const deficitError = state.fiscal.deficit_bn - (latest.deficitPath[0] / 100) * state.economic.gdpNominal_bn;
  const errors = [
    {
      forecastTurn: latest.eventTurn,
      metric: 'gdpGrowth',
      forecastValue: latest.gdpGrowthPath[0],
      actualValue: state.economic.gdpGrowthAnnual,
      errorMagnitude: Math.abs(gdpError),
    },
    {
      forecastTurn: latest.eventTurn,
      metric: 'deficit_bn',
      forecastValue: (latest.deficitPath[0] / 100) * state.economic.gdpNominal_bn,
      actualValue: state.fiscal.deficit_bn,
      errorMagnitude: Math.abs(deficitError),
    },
  ];

  let obrCredibilityDelta = 0;
  let credibilityDelta = 0;
  if (gdpError < -0.5 || deficitError > 5) {
    obrCredibilityDelta = -(3 + Math.random() * 3);
    credibilityDelta = -(2 + Math.random() * 2);
  } else if (gdpError > 0.3 && deficitError < -3) {
    obrCredibilityDelta = 1 + Math.random() * 1.5;
    credibilityDelta = 0.8 + Math.random() * 1.2;
  }

  const comparison = compareLastFiscalYearToForecast(nextState);
  return {
    ...nextState,
    obr: {
      ...nextState.obr,
      cumulativeForecastErrors: [...(nextState.obr.cumulativeForecastErrors || []), ...errors],
      obrCredibilityScore: Math.max(0, Math.min(100, nextState.obr.obrCredibilityScore + obrCredibilityDelta)),
    },
    simulation: {
      ...nextState.simulation,
      lastObrComparison: comparison,
    },
    political: {
      ...nextState.political,
      credibilityIndex: Math.max(0, Math.min(100, nextState.political.credibilityIndex + credibilityDelta)),
    },
  };
}

function buildOBRProjection(state: GameState): OBRForecastSnapshot {
  const baseGrowth = state.economic.gdpGrowthAnnual;
  const baseDeficit = state.fiscal.deficitPctGDP;
  const baseDebt = state.fiscal.debtPctGDP;

  const horizonYears: OBRForecastYear[] = [];
  for (let yearAhead = 1; yearAhead <= 5; yearAhead++) {
    const growth = baseGrowth + (1.5 - baseGrowth) * Math.min(1, yearAhead / 3);
    const deficit = baseDeficit + (2.5 - baseDeficit) * Math.min(1, yearAhead / 4);
    const debt = baseDebt + (deficit - 2.0) * 0.35 * yearAhead;

    horizonYears.push({
      fiscalYearStartTurn: state.metadata.currentTurn + yearAhead * 12,
      projectedGDPGrowth: growth,
      projectedDeficitPctGDP: deficit,
      projectedDebtPctGDP: debt,
    });
  }

  return {
    createdTurn: state.metadata.currentTurn,
    createdFiscalYear: state.metadata.currentYear,
    horizonYears,
  };
}

function buildObrForecastVintage(state: GameState): NonNullable<GameState['obr']['latestForecast']> {
  const eventType = state.metadata.currentMonth === 3 ? 'budget' : 'autumn_statement';
  const obrCaution = 0.85 + Math.random() * 0.05;
  const annualGrowthBase = state.economic.gdpGrowthAnnual;
  const annualInflationBase = state.economic.inflationCPI;
  const annualUnemploymentBase = state.economic.unemploymentRate;
  const spendingDrivenBoost = Math.max(
    0,
    state.fiscal.spending.nhsCurrent +
      state.fiscal.spending.educationCurrent +
      state.fiscal.spending.infrastructureCapital -
      (168.4 + 104.0 + 80)
  );

  const gdpGrowthPath = Array.from({ length: 5 }, (_, idx) => {
    const horizonDampen = 1 - idx * 0.04;
    const cautionAdjusted = annualGrowthBase - (spendingDrivenBoost / 100) * (1 - obrCaution) * 0.25;
    const noise = (Math.random() - 0.5) * 0.4;
    return round1(cautionAdjusted * horizonDampen + noise);
  });

  const inflationPath = Array.from({ length: 5 }, (_, idx) => {
    const reversion = annualInflationBase + (2.0 - annualInflationBase) * ((idx + 1) / 5);
    const noise = (Math.random() - 0.5) * 0.3;
    return round1(reversion + noise);
  });

  const unemploymentPath = Array.from({ length: 5 }, (_, idx) => {
    const reversion = annualUnemploymentBase + (4.4 - annualUnemploymentBase) * ((idx + 1) / 5);
    return round1(Math.max(3, Math.min(10, reversion)));
  });

  const deficitPath = Array.from({ length: 5 }, (_, idx) => {
    const improvement = state.fiscal.deficitPctGDP + (2.8 - state.fiscal.deficitPctGDP) * ((idx + 1) / 5);
    return round1(improvement);
  });
  const debtPath = Array.from({ length: 5 }, (_, idx) => {
    const next = state.fiscal.debtPctGDP + (deficitPath[idx] - 2.0) * 0.4 * (idx + 1);
    return round1(next);
  });

  const latestHeadroom = round1(state.fiscal.fiscalHeadroom_bn - spendingDrivenBoost * (1 - obrCaution) * 0.2);
  const policyScorings = [
    {
      measureDescription: 'Income tax package',
      annualImpact_bn: round1(
        ((state.fiscal.incomeTaxBasicRate - 20) * 7 + (state.fiscal.incomeTaxHigherRate - 40) * 2) * obrCaution
      ),
      certaintylevel: 'medium' as const,
    },
    {
      measureDescription: 'Departmental spending envelope',
      annualImpact_bn: round1((state.fiscal.totalSpending_bn - 1100) * -1),
      certaintylevel: 'high' as const,
    },
    {
      measureDescription: 'Anti-avoidance compliance package',
      annualImpact_bn: round1((state.fiscal.antiAvoidanceInvestment_bn - 0.3) * -1),
      certaintylevel: 'low' as const,
    },
  ];

  return {
    eventTurn: state.metadata.currentTurn,
    eventType,
    gdpGrowthPath,
    inflationPath,
    unemploymentPath,
    deficitPath,
    debtPath,
    fiscalHeadroom_bn: latestHeadroom,
    policyScorings,
  };
}

function compareLastFiscalYearToForecast(state: GameState): OBRForecastComparison | null {
  const snapshot = state.simulation.obrForecastSnapshot;
  if (!snapshot || snapshot.horizonYears.length === 0) return null;

  const startTurn = state.metadata.currentTurn - 12;
  const fiscalYearData = state.simulation.monthlySnapshots.filter(
    (row: { turn: number; gdpGrowth: number; deficit: number; debt: number }) => row.turn >= startTurn && row.turn < state.metadata.currentTurn
  );
  if (fiscalYearData.length === 0) return null;

  const actualGDPGrowth = fiscalYearData.reduce((sum: number, row: { gdpGrowth: number }) => sum + row.gdpGrowth, 0) / fiscalYearData.length;
  const actualDeficit = fiscalYearData.reduce((sum: number, row: { deficit: number }) => sum + row.deficit, 0) / fiscalYearData.length;
  const actualDebt = fiscalYearData[fiscalYearData.length - 1].debt;

  const baseProjection = snapshot.horizonYears[0];
  const rows: OBRForecastComparison['rows'] = [
    {
      metric: 'gdpGrowth',
      projected: baseProjection.projectedGDPGrowth,
      actual: actualGDPGrowth,
      delta: actualGDPGrowth - baseProjection.projectedGDPGrowth,
    },
    {
      metric: 'deficitPctGDP',
      projected: baseProjection.projectedDeficitPctGDP,
      actual: actualDeficit,
      delta: actualDeficit - baseProjection.projectedDeficitPctGDP,
    },
    {
      metric: 'debtPctGDP',
      projected: baseProjection.projectedDebtPctGDP,
      actual: actualDebt,
      delta: actualDebt - baseProjection.projectedDebtPctGDP,
    },
  ];

  return {
    fiscalYear: state.metadata.currentYear - 1,
    rows,
  };
}
