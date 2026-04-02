import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  Area,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { format } from 'date-fns';
import { AdviserSystemState } from './adviser-system';
import { SocialMediaSidebar } from './social-media-system';
import { createDashboardHistoricalBaseline } from './data/dashboard-history';
import { selectDashboardHeadlineMetrics, selectPoliticalOverview } from './state/selectors';

/**
 * HM TREASURY DASHBOARD
 *
 * Comprehensive Chancellor simulation dashboard with:
 * - 10 years of historical context (2014-2024)
 * - OBR-style professional charts
 * - Multi-mode support (normal, budget, crisis)
 * - Real-time economic indicators
 * - British English conventions throughout
 */

// ============================================================================
// TYPE DEFINITIONS (from economic-engine.tsx)
// ============================================================================

interface EconomicState {
  gdpNominal: number;
  gdpReal: number;
  gdpGrowthAnnual: number;
  gdpGrowthMonthly: number;
  outputGap: number;
  potentialGdp: number;
  trendGrowth: number;
  cpi: number;
  rpi: number;
  inflationExpectations: number;
  unemploymentRate: number;
  nairu: number;
  wageGrowthNominal: number;
  wageGrowthReal: number;
  bankRate: number;
}

interface FiscalState {
  incomeTaxRevenue: number;
  niRevenue: number;
  vatRevenue: number;
  corporationTaxRevenue: number;
  cgtRevenue: number;
  fuelDutyRevenue: number;
  councilTaxRevenue: number;
  otherTaxRevenue: number;
  totalRevenue: number;
  incomeTaxBasicRate: number;
  incomeTaxHigherRate: number;
  niEmployeeRate: number;
  niEmployerRate: number;
  vatRate: number;
  corporationTaxRate: number;
  nhsSpending: number;
  educationSpending: number;
  defenceSpending: number;
  otherSpending: number;
  totalSpending: number;
  deficit: number;
  deficitToGdp: number;
  debtStock: number;
  debtToGdp: number;
  debtInterest: number;
}

interface HistoricalSnapshot {
  month: number;
  date: Date;
  economy: EconomicState;
  fiscal: Partial<FiscalState>;
}

// ============================================================================
// DASHBOARD SPECIFIC TYPES
// ============================================================================

type DashboardMode = 'normal' | 'budget' | 'crisis';

interface DashboardProps {
  state: any;
  mode?: DashboardMode;
  onModeChange?: (mode: DashboardMode) => void;
  adviserSystem: AdviserSystemState;
}

// ============================================================================
// CONSTANTS
// ============================================================================

// ============================================================================
// HISTORICAL BASELINE GENERATION (2014-2024)
// ============================================================================

/**
 * Generate 10 years of realistic UK economic history (2014-2024)
 *
 * Key events modelled:
 * - 2014-2015: Stable growth, low inflation
 * - 2016: Brexit referendum - sterling crash, inflation spike
 * - 2017-2019: Slow growth, inflation above target
 * - 2020: COVID crash - GDP collapse, unemployment spike, deficit explosion
 * - 2021: Recovery - GDP rebound
 * - 2022-2023: Inflation crisis - CPI spike to 11%, bank rate rises
 * - 2024: Stabilisation - inflation falling, growth weak, high debt
 */
function generateHistoricalBaseline(): HistoricalSnapshot[] {
  const history: HistoricalSnapshot[] = [];
  const startDate = new Date('2014-07-01');

  // Helper to create economic snapshots for different periods
  const createSnapshot = (
    monthIndex: number,
    gdpGrowth: number,
    cpi: number,
    unemployment: number,
    bankRate: number,
    deficitToGdp: number,
    debtToGdp: number
  ): HistoricalSnapshot => {
    const date = new Date(startDate);
    date.setMonth(startDate.getMonth() + monthIndex);

    // Calculate derived values
    const gdpBase = 2200; // £2.2tn in 2014
    const monthsElapsed = monthIndex;
    const gdpNominal = gdpBase * Math.pow(1 + (2.5 / 100 / 12), monthsElapsed); // Nominal growth
    const rpi = cpi + 1.0;
    const nairu = 4.5;
    const wageGrowthNominal = 2.5 + 0.4 * cpi - 0.45 * (unemployment - nairu);

    return {
      month: monthIndex - 120, // Relative to July 2024 (month 0)
      date,
      economy: {
        gdpNominal,
        gdpReal: gdpNominal / (1 + cpi / 100),
        gdpGrowthAnnual: gdpGrowth,
        gdpGrowthMonthly: gdpGrowth / 12,
        outputGap: (gdpGrowth - 1.5) * 0.5, // Simplified
        potentialGdp: gdpNominal * 1.01,
        trendGrowth: 1.5,
        cpi,
        rpi,
        inflationExpectations: 2.0,
        unemploymentRate: unemployment,
        nairu,
        wageGrowthNominal,
        wageGrowthReal: wageGrowthNominal - cpi,
        bankRate,
      },
      fiscal: {
        totalRevenue: gdpNominal * 0.37, // 37% of GDP
        deficit: gdpNominal * (deficitToGdp / 100),
        debtToGdp,
      },
    };
  };

  createDashboardHistoricalBaseline().forEach((point) => {
    history.push(createSnapshot(
      point.monthIndex,
      point.gdpGrowth,
      point.cpi,
      point.unemployment,
      point.bankRate,
      point.deficitToGdp,
      point.debtToGdp
    ));
  });

  return history;
}

/**
 * Maps a canonical monthly snapshot (from state.simulation.monthlySnapshots)
 * to the local HistoricalSnapshot shape used by the dashboard charts.
 */
function mapCanonicalSnapshot(snap: any): HistoricalSnapshot {
  const date = typeof snap.date === 'string'
    ? new Date(snap.date.replace('-', '/') + '/01')
    : (snap.date instanceof Date ? snap.date : new Date());

  return {
    month: snap.turn ?? 0,
    date,
    economy: {
      gdpNominal: snap.gdpNominal ?? 2750,
      gdpReal: snap.gdpNominal ?? 2750,
      gdpGrowthAnnual: snap.gdpGrowth ?? 0,
      gdpGrowthMonthly: (snap.gdpGrowth ?? 0) / 12,
      outputGap: 0,
      potentialGdp: snap.gdpNominal ?? 2750,
      trendGrowth: 1.5,
      cpi: snap.inflation ?? 2.0,
      rpi: (snap.inflation ?? 2.0) + 1.0,
      inflationExpectations: 2.0,
      unemploymentRate: snap.unemployment ?? 4.5,
      nairu: 4.25,
      wageGrowthNominal: (snap.inflation ?? 2.0) + 1.0,
      wageGrowthReal: 1.0,
      bankRate: Math.max(0, (snap.giltYield ?? 4.5) - 1.0),
    },
    fiscal: {
      deficit: snap.deficit ?? 0,
      debtToGdp: snap.debt ?? 90,
    },
  };
}

// ============================================================================
// FORMATTING UTILITIES
// ============================================================================

const formatCurrencyCompact = (num: number): string => {
  const n = Number(num);
  if (isNaN(n)) return '£0bn';
  if (Math.abs(n) >= 1000) return `£${(n / 1000).toFixed(2)}tn`;
  return `£${n.toFixed(1)}bn`;
};
const formatPercent = (num: number): string => {
  const n = Number(num);
  return !isNaN(n) ? `${n.toFixed(1)}%` : '0.0%';
};
const formatNumber = (num: number, decimals = 1): string => {
  const n = Number(num);
  return !isNaN(n) ? n.toFixed(decimals) : '0';
};
const formatDate = (date: Date): string => format(date, 'MMM yy');
const formatIndex = (num: number): string => {
  const n = Number(num);
  return !isNaN(n) ? n.toFixed(1) : '0.0';
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Determine dashboard mode based on economic conditions
 */
function determineDashboardMode(state: any): DashboardMode {
  if (
    (state?.fiscal?.debtPctGDP ?? 0) > 110 ||
    (state?.fiscal?.deficitPctGDP ?? 0) > 8 ||
    (state?.economic?.unemploymentRate ?? 0) > 8 ||
    (state?.markets?.giltYield10y ?? 0) > 8
  ) {
    return 'crisis';
  }

  const month = state?.metadata?.currentMonth ?? 1;
  if (month === 3 || month === 10) {
    return 'budget';
  }

  return 'normal';
}

/**
 * Merge historical baseline with game history
 */
function mergeHistoricalData(
  baseline: HistoricalSnapshot[],
  gameHistory: HistoricalSnapshot[]
): HistoricalSnapshot[] {
  return [...baseline, ...gameHistory];
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Metric Card - Reusable component for displaying a single metric
 */
interface MetricCardProps {
  label: string;
  value: string;
  status?: 'good' | 'neutral' | 'bad';
  target?: string;
  sublabel?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, status = 'neutral', target, sublabel }) => {
  const statusColors = {
    good: 'text-good',
    neutral: 'text-primary',
    bad: 'text-bad',
  };

  return (
    <div className="flex flex-col gap-0.5">
      <div className="text-label text-tertiary">
        {label}
      </div>
      <div className={`font-mono text-base font-semibold ${statusColors[status]}`}>
        {value}
      </div>
      {target && (
        <div className="text-xs text-muted">
          Target: {target}
        </div>
      )}
      {sublabel && (
        <div className="text-xs text-secondary">
          {sublabel}
        </div>
      )}
    </div>
  );
};

/**
 * Economic Metrics Panel
 */
const EconomicPanel: React.FC<{ state: any }> = ({ state }) => {
  return (
    <div className="bg-bg-elevated border border-border-custom p-5">
      <h2 className="font-display text-lg font-semibold text-primary mb-4 border-b border-border-custom pb-2">Economic Indicators</h2>
      <div className="grid grid-cols-2 gap-4">
        <MetricCard
          label="GDP Growth"
          value={formatPercent(state.economic?.gdpGrowthAnnual ?? 0)}
          status={(state.economic?.gdpGrowthAnnual ?? 0) > 2.0 ? 'good' : (state.economic?.gdpGrowthAnnual ?? 0) > 0.5 ? 'neutral' : 'bad'}
          target="1.5%"
        />
        <MetricCard
          label="CPI Inflation"
          value={formatPercent(state.economic?.inflationCPI ?? 0)}
          status={Math.abs((state.economic?.inflationCPI ?? 0) - 2.0) < 0.5 ? 'good' : Math.abs((state.economic?.inflationCPI ?? 0) - 2.0) < 1.5 ? 'neutral' : 'bad'}
          target="2.0%"
        />
        <MetricCard
          label="Unemployment"
          value={formatPercent(state.economic?.unemploymentRate ?? 0)}
          status={
            (state.economic?.unemploymentRate ?? 0) < 4.5 ? 'good' :
            (state.economic?.unemploymentRate ?? 0) < 6.0 ? 'neutral' : 'bad'
          }
          sublabel={`NAIRU: 4.25%`}
        />
        <MetricCard
          label="Participation"
          value={formatPercent(state.economic?.participationRate ?? 63)}
          status={(state.economic?.participationRate ?? 63) > 63 ? 'good' : 'neutral'}
        />
        <MetricCard
          label="Inactivity"
          value={formatPercent(state.economic?.economicInactivity ?? 21.5)}
          status={(state.economic?.economicInactivity ?? 21.5) < 22 ? 'good' : 'neutral'}
        />
        <MetricCard
          label="Output Gap"
          value={formatPercent(0)}
          status={Math.abs(0) < 1.0 ? 'good' : 'neutral'}
        />
        <MetricCard
          label="Nominal Wages"
          value={formatPercent(state.economic?.wageGrowthAnnual ?? 0)}
          status="neutral"
        />
        <MetricCard
          label="Real Wages"
          value={formatPercent((state.economic?.wageGrowthAnnual ?? 0) - (state.economic?.inflationCPI ?? 0))}
          status={((state.economic?.wageGrowthAnnual ?? 0) - (state.economic?.inflationCPI ?? 0)) > 0 ? 'good' : 'bad'}
        />
      </div>
    </div>
  );
};

/**
 * Fiscal Metrics Panel
 */
const FiscalPanel: React.FC<{ state: any; mode: DashboardMode }> = ({ state, mode }) => {
  const isExpanded = mode === 'budget';

  return (
    <div className="bg-bg-elevated border border-border-custom p-5">
      <h2 className="font-display text-lg font-semibold text-primary mb-4 border-b border-border-custom pb-2">
        {mode === 'budget' ? 'Fiscal Position (Budget Mode)' : 'Fiscal Position'}
      </h2>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-x-6">
          <MetricCard
            label="Total Revenue"
            value={formatCurrencyCompact(state.fiscal?.totalRevenue_bn ?? 0)}
            status="neutral"
          />
          <MetricCard
            label="Total Spending"
            value={formatCurrencyCompact(state.fiscal?.totalSpending_bn ?? 0)}
            status="neutral"
          />
        </div>
        <hr className="border-border-subtle" />
        <div className="grid grid-cols-2 gap-x-6">
          <MetricCard
            label="Net Borrowing"
            value={formatCurrencyCompact(state.fiscal?.deficit_bn ?? 0)}
            status={(state.fiscal?.deficitPctGDP ?? 0) < 3.0 ? 'neutral' : 'bad'}
            sublabel={`${formatPercent(state.fiscal?.deficitPctGDP ?? 0)} of GDP`}
          />
          <MetricCard
            label="Debt Stock"
            value={formatCurrencyCompact(state.fiscal?.debtNominal_bn ?? 0)}
            status={(state.fiscal?.debtPctGDP ?? 0) < 90 ? 'neutral' : 'bad'}
            sublabel={`${formatPercent(state.fiscal?.debtPctGDP ?? 0)} of GDP`}
          />
        </div>
        {isExpanded && (
          <>
            <hr className="border-border-subtle" />
            <div className="grid grid-cols-2 gap-x-6">
              <MetricCard
                label="Debt Interest"
                value={formatCurrencyCompact(state.fiscal?.debtInterest_bn ?? 0)}
                status="neutral"
              />
              <MetricCard
                label="Primary Balance"
                value={formatCurrencyCompact((state.fiscal?.deficit_bn ?? 0) - (state.fiscal?.debtInterest_bn ?? 0))}
                status={((state.fiscal?.deficit_bn ?? 0) - (state.fiscal?.debtInterest_bn ?? 0)) < 0 ? 'good' : 'bad'}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

/**
 * Political Metrics Panel with Gauge Rows
 */
const PoliticalPanel: React.FC<{ state: any }> = ({ state }) => {
  const politicalOverview = selectPoliticalOverview(state);
  const pmTrust = politicalOverview.pmTrust;
  const governmentApproval = politicalOverview.governmentApproval;
  const backbenchSatisfaction = politicalOverview.backbenchSatisfaction;

  const GaugeRow: React.FC<{ label: string; value?: number; max?: number }> = ({ label, value, max = 100 }) => {
    if (typeof value !== 'number') {
      return (
        <div className="flex items-center gap-3 py-2">
          <div className="text-xs uppercase tracking-wide text-tertiary w-24">{label}</div>
          <div className="text-xs text-muted">Unavailable</div>
        </div>
      );
    }

    const percentage = Math.min(100, Math.max(0, (value / max) * 100));
    const getBarColor = () => {
      if (label === 'PM Trust') return 'var(--color-accent)';
      if (value < 35) return 'var(--color-status-bad)';
      return 'var(--color-status-neutral)';
    };

    return (
      <div className="flex items-center gap-3 py-2">
        <div className="text-xs uppercase tracking-wide text-tertiary w-24">{label}</div>
        <div className="font-mono text-sm font-semibold text-primary w-12 text-right">{Math.round(value)}</div>
        <div className="flex-1 h-2 bg-bg-elevated">
          <div
            className="h-full"
            style={{ width: `${percentage}%`, backgroundColor: getBarColor() }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="bg-bg-elevated border border-border-custom p-5 h-fit">
      <h2 className="font-display text-lg font-semibold text-primary mb-4 border-b border-border-custom pb-2">Political Capital</h2>
      <div className="space-y-1">
        <GaugeRow label="PM Trust" value={pmTrust} />
        <GaugeRow label="Public Approval" value={governmentApproval} />
        <GaugeRow label="Backbench Support" value={backbenchSatisfaction} />
      </div>
    </div>
  );
};

/**
 * Services Metrics Panel with Horizontal Rows
 */
const ServicesPanel: React.FC<{ state: any }> = ({ state }) => {
  const expandedMetrics = [
    { key: 'mentalHealthAccess', label: 'Mental Health Access' },
    { key: 'primaryCareAccess', label: 'Primary Care Access' },
    { key: 'socialCareQuality', label: 'Social Care Quality' },
    { key: 'prisonSafety', label: 'Prison Safety' },
    { key: 'courtBacklogPerformance', label: 'Court Performance' },
    { key: 'legalAidAccess', label: 'Legal Aid Access' },
    { key: 'policingEffectiveness', label: 'Policing Effectiveness' },
    { key: 'borderSecurityPerformance', label: 'Border Security' },
    { key: 'railReliability', label: 'Rail Reliability' },
    { key: 'affordableHousingDelivery', label: 'Affordable Housing Delivery' },
    { key: 'floodResilience', label: 'Flood Resilience' },
    { key: 'researchInnovationOutput', label: 'Innovation Output' },
  ];

  const ServiceRow: React.FC<{ label: string; value: number }> = ({ label, value }) => {
    const getStatusColor = (val: number) => {
      if (val > 65) return 'var(--color-status-good)';
      if (val > 50) return 'var(--color-status-neutral)';
      return 'var(--color-status-bad)';
    };

    return (
      <div className="flex items-center gap-3 py-2 border-b border-border-subtle last:border-b-0">
        <div className="text-xs uppercase tracking-wide text-tertiary flex-1">{label}</div>
        <div className="font-mono text-sm font-semibold" style={{ color: getStatusColor(value) }}>
          {formatNumber(value, 0)}/100
        </div>
        <div className="w-24 h-1 bg-bg-elevated">
          <div
            className="h-full"
            style={{ width: `${value}%`, backgroundColor: getStatusColor(value) }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="bg-bg-elevated border border-border-custom p-5">
      <h2 className="font-display text-lg font-semibold text-primary mb-4 border-b border-border-custom pb-2">Public Services</h2>
      <div className="space-y-1">
        {/* Headline metrics */}
        <ServiceRow label="NHS Quality Index" value={state.services?.nhsQuality ?? 50} />
        <ServiceRow label="Education Quality" value={state.services?.educationQuality ?? 50} />
        <ServiceRow label="Infrastructure Quality" value={state.services?.infrastructureQuality ?? 50} />

        {/* Divider */}
        <div className="border-t border-border-subtle my-2" />

        {/* Expanded metrics */}
        {expandedMetrics.map((metric) => (
          <ServiceRow
            key={metric.label}
            label={metric.label}
            value={state.services?.[metric.key] ?? 50}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * Markets Panel
 */
const MarketsPanel: React.FC<{ state: any }> = ({ state }) => {
  return (
    <div className="bg-bg-elevated border border-border-custom p-5">
      <h2 className="font-display text-lg font-semibold text-primary mb-4 border-b border-border-custom pb-2">Markets & Rates</h2>
      <div className="grid grid-cols-2 gap-4">
        <MetricCard
          label="Bank Rate"
          value={formatPercent(state.markets?.bankRate ?? 0)}
          status="neutral"
        />
        <MetricCard
          label="10yr Gilt Yield"
          value={formatPercent(state.markets?.giltYield10y ?? 0)}
          status={(state.markets?.giltYield10y ?? 0) < 4.0 ? 'good' : (state.markets?.giltYield10y ?? 0) < 6.0 ? 'neutral' : 'bad'}
        />
        <MetricCard
          label="2yr Mortgage Rate"
          value={formatPercent(state.markets?.mortgageRate2y ?? 0)}
          status={(state.markets?.mortgageRate2y ?? 0) < 5.0 ? 'good' : 'neutral'}
        />
        <MetricCard
          label="Sterling Index"
          value={formatIndex(state.markets?.sterlingIndex ?? 100)}
          status={(state.markets?.sterlingIndex ?? 100) > 100 ? 'good' : (state.markets?.sterlingIndex ?? 100) > 95 ? 'neutral' : 'bad'}
        />
      </div>
    </div>
  );
};

/**
 * Economic Overview Chart (GDP, Inflation, Unemployment)
 */
const EconomicChart: React.FC<{ history: HistoricalSnapshot[] }> = ({ history }) => {
  const chartData = useMemo(() => {
    return history.map((snap) => ({
      date: formatDate(snap.date),
      gdpGrowth: snap.economy.gdpGrowthAnnual,
      inflation: snap.economy.cpi,
      unemployment: snap.economy.unemploymentRate,
      month: snap.month,
    }));
  }, [history]);

  return (
    <div className="bg-bg-elevated border border-border-custom p-6">
      <h3 className="font-display text-lg font-semibold text-primary mb-4">Economic Overview (2014-Present)</h3>
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={chartData} margin={{ top: 20, right: 60, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis
            dataKey="date"
            angle={-45}
            textAnchor="end"
            height={80}
            style={{ fontSize: '11px', fill: 'var(--color-text-secondary)' }}
          />
          <YAxis
            yAxisId="left"
            label={{ value: 'GDP Growth & Unemployment (%)', angle: -90, position: 'insideLeft', style: { fontSize: '12px', fill: 'var(--color-text-secondary)' } }}
            style={{ fontSize: '11px', fill: 'var(--color-text-secondary)' }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            label={{ value: 'Inflation (%)', angle: 90, position: 'insideRight', style: { fontSize: '12px', fill: 'var(--color-text-secondary)' } }}
            style={{ fontSize: '11px', fill: 'var(--color-text-secondary)' }}
          />
          <Tooltip
            contentStyle={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '4px' }}
          />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
          />
          <ReferenceLine yAxisId="left" y={0} stroke="var(--color-neutral)" strokeDasharray="3 3" />
          <ReferenceLine yAxisId="right" y={2} stroke="var(--color-bad)" strokeDasharray="3 3" label="Target" />
          <ReferenceLine yAxisId="left" x="Jul 24" stroke="var(--color-secondary)" strokeWidth={2} label="Your takeover" />

          <Line
            yAxisId="left"
            type="monotone"
            dataKey="gdpGrowth"
            stroke="var(--color-chart-2)"
            strokeWidth={2}
            dot={false}
            name="GDP Growth"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="inflation"
            stroke="var(--color-chart-1)"
            strokeWidth={2}
            dot={false}
            name="CPI Inflation"
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="unemployment"
            stroke="var(--color-chart-4)"
            strokeWidth={2}
            dot={false}
            name="Unemployment"
          />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="text-xs text-muted mt-2 text-center">
        Source: HM Treasury Economic Simulation (Historical baseline: ONS/OBR data)
      </div>
    </div>
  );
};

/**
 * Fiscal Chart (Deficit and Debt)
 */
const FiscalChart: React.FC<{ history: HistoricalSnapshot[] }> = ({ history }) => {
  const chartData = useMemo(() => {
    return history.map((snap) => ({
      date: formatDate(snap.date),
      deficit: snap.fiscal.deficit || 0,
      debtToGdp: snap.fiscal.debtToGdp || 0,
    }));
  }, [history]);

  return (
    <div className="bg-bg-elevated border border-border-custom p-6">
      <h3 className="font-display text-lg font-semibold text-primary mb-4">Fiscal Position (2014-Present)</h3>
      <ResponsiveContainer width="100%" height={350}>
        <ComposedChart data={chartData} margin={{ top: 20, right: 60, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis
            dataKey="date"
            angle={-45}
            textAnchor="end"
            height={80}
            style={{ fontSize: '11px', fill: 'var(--color-text-secondary)' }}
          />
          <YAxis
            yAxisId="left"
            label={{ value: 'Deficit (£bn)', angle: -90, position: 'insideLeft', style: { fontSize: '12px', fill: 'var(--color-text-secondary)' } }}
            style={{ fontSize: '11px', fill: 'var(--color-text-secondary)' }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            label={{ value: 'Debt/GDP (%)', angle: 90, position: 'insideRight', style: { fontSize: '12px', fill: 'var(--color-text-secondary)' } }}
            style={{ fontSize: '11px', fill: 'var(--color-text-secondary)' }}
          />
          <Tooltip
            contentStyle={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '4px' }}
          />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />

          <ReferenceLine yAxisId="right" y={60} stroke="var(--color-good)" strokeDasharray="3 3" label="Maastricht" />
          <ReferenceLine yAxisId="right" y={100} stroke="var(--color-bad)" strokeDasharray="3 3" label="100%" />
          <ReferenceLine yAxisId="left" x="Jul 24" stroke="var(--color-secondary)" strokeWidth={2} />

          <Area
            yAxisId="left"
            type="monotone"
            dataKey="deficit"
            fill="var(--color-chart-5)"
            fillOpacity={0.3}
            stroke="var(--color-chart-5)"
            strokeWidth={2}
            name="Deficit (£bn)"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="debtToGdp"
            stroke="var(--color-chart-2)"
            strokeWidth={3}
            dot={false}
            name="Debt/GDP (%)"
          />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="text-xs text-muted mt-2 text-center">
        Note: COVID-19 fiscal expansion visible 2020-2021
      </div>
    </div>
  );
};

/**
 * Markets Chart (Yields and Rates)
 */
const MarketsChart: React.FC<{ history: HistoricalSnapshot[] }> = ({ history }) => {
  const chartData = useMemo(() => {
    return history.map((snap) => ({
      date: formatDate(snap.date),
      bankRate: snap.economy.bankRate,
      giltYield: (snap.fiscal.debtToGdp || 90) * 0.04, // Approximation for historical yields
    }));
  }, [history]);

  return (
    <div className="bg-bg-elevated border border-border-custom p-6">
      <h3 className="font-display text-lg font-semibold text-primary mb-4">Interest Rates (2014-Present)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis
            dataKey="date"
            angle={-45}
            textAnchor="end"
            height={80}
            style={{ fontSize: '11px', fill: 'var(--color-text-secondary)' }}
          />
          <YAxis
            label={{ value: 'Interest Rate (%)', angle: -90, position: 'insideLeft', style: { fontSize: '12px', fill: 'var(--color-text-secondary)' } }}
            style={{ fontSize: '11px', fill: 'var(--color-text-secondary)' }}
          />
          <Tooltip
            contentStyle={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '4px' }}
          />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />

          <ReferenceLine x="Jul 24" stroke="var(--color-secondary)" strokeWidth={2} />

          <Line
            type="monotone"
            dataKey="bankRate"
            stroke="var(--color-chart-3)"
            strokeWidth={2}
            dot={false}
            name="Bank Rate"
          />
          <Line
            type="monotone"
            dataKey="giltYield"
            stroke="var(--color-yield)"
            strokeWidth={2}
            dot={false}
            name="10yr Gilt Yield (est.)"
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="text-xs text-muted mt-2 text-center">
        BOE hiking cycle 2022-2023 visible
      </div>
    </div>
  );
};

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================

export const Dashboard: React.FC<DashboardProps> = ({ state, mode: propMode, onModeChange, adviserSystem }) => {
  // Generate historical baseline (memoized)
  const historicalBaseline = useMemo(() => generateHistoricalBaseline(), []);

  // Merge historical baseline with game history
  const fullHistory = useMemo(() => {
    const canonicalSnapshots: HistoricalSnapshot[] = Array.isArray(state?.simulation?.monthlySnapshots)
      ? state.simulation.monthlySnapshots.map(mapCanonicalSnapshot)
      : [];
    return mergeHistoricalData(historicalBaseline, canonicalSnapshots);
  }, [historicalBaseline, state?.simulation?.monthlySnapshots]);

  // Determine current mode
  const autoMode = determineDashboardMode(state);
  const currentMode = propMode || autoMode;

  // Mode indicator
  const modeLabels = {
    normal: 'Normal Operations',
    budget: 'Budget Mode',
    crisis: 'CRISIS MODE',
  };

  // Mode indicator styles for border
  const modeBorderClasses = {
    normal: 'border-border',
    budget: 'border-accent',
    crisis: 'border-status-bad',
  };

  // Headline KPIs
  const HeadlineKPI: React.FC<{ label: string; value?: number; unit: string; target: string; status: 'good' | 'neutral' | 'bad' }> = ({ label, value, unit, target, status }) => {
    const statusColors = {
      good: 'text-status-good',
      neutral: 'text-primary',
      bad: 'text-status-bad',
    };

    return (
      <div className="treasury-card-strong p-4">
        <div className="treasury-kicker mb-1">{label}</div>
        <div className={`font-mono text-3xl font-semibold ${statusColors[status]}`}>
          {typeof value === 'number' ? `${value.toFixed(1)}${unit}` : 'Unavailable'}
        </div>
        <div className="text-xs text-muted mt-1">{target}</div>
      </div>
    );
  };

  const dateString = new Date(state?.metadata?.currentYear ?? 2024, (state?.metadata?.currentMonth ?? 1) - 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const currentTurn = (state?.metadata?.currentTurn ?? 0) + 1;

  // KPI data
  const { gdpGrowth, inflation, unemployment, approval } = selectDashboardHeadlineMetrics(state);

  return (
    <div className="treasury-stage flex min-h-screen">
      {/* Social Media Sidebar - Left side only on dashboard */}
      <SocialMediaSidebar state={state} />

      {/* Main Dashboard Content */}
      <div className="flex-1 p-4 md:p-8 overflow-x-hidden">
      <div className="max-w-[1800px] mx-auto">
        <div className="treasury-card-strong mb-6 px-6 py-6">
          <div className="treasury-toolbar">
            <div>
              <div className="treasury-kicker">Overview</div>
              <h1 className="mt-2 font-display text-3xl text-primary md:text-4xl">HM Treasury Dashboard</h1>
              <p className="mt-2 max-w-3xl text-secondary">
                A working summary of the state, not a graveyard of interchangeable cards.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted font-mono">
                {dateString} · Month {currentTurn} of 60
              </span>
              <span className={`text-xs font-sans uppercase tracking-widest px-3 py-1 border ${modeBorderClasses[currentMode]}`}>
                {modeLabels[currentMode]}
              </span>
            </div>
          </div>

          <div className="treasury-data-strip mt-5">
            <div className="treasury-data-cell">
              <div className="treasury-kicker">Debt Ratio</div>
              <div className="mt-2 font-mono text-xl font-semibold text-primary">{(state?.fiscal?.debtPctGDP ?? 0).toFixed(1)}%</div>
            </div>
            <div className="treasury-data-cell">
              <div className="treasury-kicker">Headroom</div>
              <div className="mt-2 font-mono text-xl font-semibold text-primary">£{(state?.fiscal?.fiscalHeadroom_bn ?? 0).toFixed(1)}bn</div>
            </div>
            <div className="treasury-data-cell">
              <div className="treasury-kicker">PM Trust</div>
              <div className="mt-2 font-mono text-xl font-semibold text-primary">{(state?.political?.pmTrust ?? 0).toFixed(0)}</div>
            </div>
          </div>
        </div>

        {/* Crisis Alert Banner */}
        {currentMode === 'crisis' && (
          <div className="treasury-card mb-6 border-l-4 border-bad bg-bad-subtle p-4">
            <div className="flex items-center">
              <div className="text-bad font-bold text-lg">
                ECONOMIC CRISIS DETECTED
              </div>
            </div>
            <div className="text-bad text-sm mt-1">
               Critical thresholds breached. Immediate policy action required.
            </div>
          </div>
        )}

        {/* Headline KPI Strip */}
        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <HeadlineKPI
            label="GDP Growth"
            value={gdpGrowth}
            unit="%"
            target="Target: 1.5%"
            status={gdpGrowth > 2.0 ? 'good' : gdpGrowth > 0.5 ? 'neutral' : 'bad'}
          />
          <HeadlineKPI
            label="CPI Inflation"
            value={inflation}
            unit="%"
            target="Target: 2.0%"
            status={Math.abs(inflation - 2.0) < 0.5 ? 'good' : Math.abs(inflation - 2.0) < 1.5 ? 'neutral' : 'bad'}
          />
          <HeadlineKPI
            label="Unemployment"
            value={unemployment}
            unit="%"
            target="Target: below 4.5%"
            status={unemployment < 4.5 ? 'good' : unemployment < 6.0 ? 'neutral' : 'bad'}
          />
          <HeadlineKPI
            label="Government Approval"
            value={approval}
            unit="%"
            target="Danger: below 35%"
            status={typeof approval !== 'number' ? 'neutral' : approval > 50 ? 'good' : approval > 35 ? 'neutral' : 'bad'}
          />
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
          <EconomicPanel state={state} />
          <FiscalPanel state={state} mode={currentMode} />
          <PoliticalPanel state={state} />
          <ServicesPanel state={state} />
          <MarketsPanel state={state} />
        </div>

        {/* Charts Section */}
        <div className="space-y-6">
          {/* Economic Chart - Always visible */}
          <EconomicChart history={fullHistory} />

          {/* Fiscal Chart - Prominent in budget mode */}
          {(currentMode === 'budget' || currentMode === 'normal' || currentMode === 'crisis') && (
            <FiscalChart history={fullHistory} />
          )}

          {/* Markets Chart - Visible in normal/crisis modes */}
          {(currentMode === 'normal' || currentMode === 'crisis') && (
            <MarketsChart history={fullHistory} />
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-muted">
          <p>HM Treasury Economic Simulation • Chancellor Dashboard v1.0</p>
          <p className="mt-1">Historical baseline (2014-2024) based on ONS/OBR data</p>
        </div>
      </div>
      </div>
    </div>
  );
};

export default Dashboard;
