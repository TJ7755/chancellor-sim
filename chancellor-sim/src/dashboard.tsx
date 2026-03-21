import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
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

interface ServicesState {
  nhsQuality: number;
  educationQuality: number;
  infrastructureQuality: number;
  nhsWaitingList: number;
  nhsRealFundingGrowth: number;
  mentalHealthAccess?: number;
  primaryCareAccess?: number;
  socialCareQuality?: number;
  prisonSafety?: number;
  courtBacklogPerformance?: number;
  legalAidAccess?: number;
  policingEffectiveness?: number;
  borderSecurityPerformance?: number;
  railReliability?: number;
  affordableHousingDelivery?: number;
  floodResilience?: number;
  researchInnovationOutput?: number;
}

interface MarketState {
  giltYield10yr: number;
  mortgageRate2yr: number;
  housePriceIndex: number;
  sterlingIndex: number;
}

interface PoliticalState {
  pmTrust: number;
  publicApproval: number;
  backbenchSentiment: number;
}

interface SimulationState {
  currentMonth: number;
  currentDate: Date;
  economy: EconomicState;
  fiscal: FiscalState;
  services: ServicesState;
  markets: MarketState;
  history: HistoricalSnapshot[];
  political?: PoliticalState;
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

const COLORS = {
  treasuryBlue: '#1d70b8',
  govGrey: '#505a5f',
  good: '#00703c',
  warning: '#f47738',
  bad: '#d4351c',
  gdp: '#2563eb',
  inflation: '#dc2626',
  unemployment: '#ea580c',
  deficit: '#7c3aed',
  debt: '#0891b2',
  yields: '#1d70b8',
  bankRate: '#059669',
  neutral: '#6b7280',
  grid: '#e5e7eb',
};

// Mock political data (until political system implemented)
const MOCK_POLITICAL: PoliticalState = {
  pmTrust: 45,
  publicApproval: 42,
  backbenchSentiment: 65,
};

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
    const gdpGrowthMultiplier = 1 + (gdpGrowth / 100);
    const monthsElapsed = monthIndex;
    const gdpNominal = gdpBase * Math.pow(1 + (2.5 / 100 / 12), monthsElapsed); // Nominal growth
    const rpi = cpi + 1.0;
    const nairu = 4.5;
    const wageGrowthNominal = 2.5 + 0.4 * cpi - 0.45 * (unemployment - nairu);
    const giltYield = Math.max(0.5, 1.5 + cpi / 100 + 0.5 + (debtToGdp - 80) * 0.02);

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

  // 2014-2015: Stable post-crisis recovery (months 0-23)
  for (let i = 0; i < 24; i++) {
    const gdpGrowth = 2.5 - i * 0.01; // Slowing from 2.5% to 2.3%
    const cpi = 0.5 + i * 0.03; // Rising from 0.5% to 1.2%
    const unemployment = 6.0 - i * 0.05; // Falling from 6% to 4.8%
    const bankRate = 0.5;
    const deficitToGdp = 5.0 - i * 0.05; // Falling from 5% to 3.8%
    const debtToGdp = 85.0 + i * 0.05; // Rising slowly
    history.push(createSnapshot(i, gdpGrowth, cpi, unemployment, bankRate, deficitToGdp, debtToGdp));
  }

  // 2016: Brexit year (months 24-35)
  for (let i = 24; i < 36; i++) {
    const monthInYear = i - 24;
    const isPostBrexit = monthInYear >= 5; // June 2016 referendum
    const gdpGrowth = isPostBrexit ? 1.5 : 2.0;
    const cpi = isPostBrexit ? 2.0 + (monthInYear - 5) * 0.15 : 1.0; // Sterling crash effect
    const unemployment = 4.9;
    const bankRate = 0.5 - (isPostBrexit && monthInYear >= 7 ? 0.25 : 0); // Emergency cut
    const deficitToGdp = 3.5;
    const debtToGdp = 87.0;
    history.push(createSnapshot(i, gdpGrowth, cpi, unemployment, bankRate, deficitToGdp, debtToGdp));
  }

  // 2017-2019: Brexit uncertainty, slow growth (months 36-71)
  for (let i = 36; i < 72; i++) {
    const gdpGrowth = 1.5 + Math.sin(i / 6) * 0.3; // Volatile around 1.5%
    const cpi = 2.5 + Math.sin(i / 8) * 0.5; // Volatile 2-3%
    const unemployment = 4.0 + Math.sin(i / 12) * 0.3; // Around 4%
    const bankRate = 0.25 + (i - 36) * 0.015; // Gradual rises to 0.75%
    const deficitToGdp = 2.5 + Math.sin(i / 6) * 0.3;
    const debtToGdp = 86.0 - (i - 36) * 0.05; // Slowly falling
    history.push(createSnapshot(i, gdpGrowth, cpi, unemployment, bankRate, deficitToGdp, debtToGdp));
  }

  // 2020: COVID crash (months 72-83)
  for (let i = 72; i < 84; i++) {
    const monthInYear = i - 72;
    const isCrash = monthInYear >= 2 && monthInYear <= 4; // March-May 2020
    const isRecovery = monthInYear > 4;

    let gdpGrowth, cpi, unemployment, bankRate, deficitToGdp, debtToGdp;

    if (isCrash) {
      gdpGrowth = -20.0 + (monthInYear - 2) * 5; // -20%, -15%, -10%
      cpi = 0.5;
      unemployment = 4.0 + (monthInYear - 2) * 0.4; // Spike to 5.2%
      bankRate = 0.1; // Emergency cut to 0.1%
      deficitToGdp = 10.0 + (monthInYear - 2) * 2; // Exploding deficit
      debtToGdp = 85.0 + (monthInYear - 2) * 3;
    } else if (isRecovery) {
      gdpGrowth = -10.0 + (monthInYear - 4) * 2.5; // Recovering
      cpi = 0.5 + (monthInYear - 4) * 0.1;
      unemployment = 5.2 - (monthInYear - 4) * 0.1;
      bankRate = 0.1;
      deficitToGdp = 16.0 - (monthInYear - 4) * 0.3;
      debtToGdp = 94.0 + (monthInYear - 4) * 0.5;
    } else {
      gdpGrowth = 1.0;
      cpi = 1.5;
      unemployment = 4.0;
      bankRate = 0.75;
      deficitToGdp = 2.0;
      debtToGdp = 85.0;
    }

    history.push(createSnapshot(i, gdpGrowth, cpi, unemployment, bankRate, deficitToGdp, debtToGdp));
  }

  // 2021: Recovery year (months 84-95)
  for (let i = 84; i < 96; i++) {
    const monthInYear = i - 84;
    const gdpGrowth = 7.0 - monthInYear * 0.3; // Strong recovery fading
    const cpi = 1.5 + monthInYear * 0.15; // Inflation building
    const unemployment = 4.8 - monthInYear * 0.05; // Falling
    const bankRate = 0.1;
    const deficitToGdp = 12.0 - monthInYear * 0.6; // Deficit narrows
    const debtToGdp = 98.0 + monthInYear * 0.1;
    history.push(createSnapshot(i, gdpGrowth, cpi, unemployment, bankRate, deficitToGdp, debtToGdp));
  }

  // 2022-2023: Inflation crisis (months 96-119)
  for (let i = 96; i < 120; i++) {
    const monthInYear = (i - 96) % 12;
    const yearOffset = Math.floor((i - 96) / 12); // 0 for 2022, 1 for 2023

    let gdpGrowth, cpi, bankRate;

    if (yearOffset === 0) {
      // 2022: Inflation spike
      gdpGrowth = 3.0 - monthInYear * 0.3; // Slowing through year
      cpi = 5.0 + monthInYear * 0.5; // Rising to 11%
      bankRate = 0.1 + monthInYear * 0.35; // Rapid hiking
    } else {
      // 2023: Inflation falling
      gdpGrowth = 0.1 + monthInYear * 0.05; // Weak growth
      cpi = 11.0 - monthInYear * 0.75; // Falling from 11% to 2%
      bankRate = 4.25 + (monthInYear < 6 ? monthInYear * 0.17 : 0); // Peak at 5.25%
    }

    const unemployment = 3.7 + yearOffset * 0.3; // Rising slightly
    const deficitToGdp = 5.0 - yearOffset * 0.5;
    const debtToGdp = 100.0 - (1 - yearOffset) * 1.0; // Falling slightly in 2023
    history.push(createSnapshot(i, gdpGrowth, cpi, unemployment, bankRate, deficitToGdp, debtToGdp));
  }

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

const formatCurrency = (num: number): string => {
  const n = Number(num);
  return !isNaN(n) ? `£${n.toFixed(1)}bn` : '£0.0bn';
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
const formatDateFull = (date: Date): string => format(date, 'MMMM yyyy');
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

/**
 * Get status color for a metric
 */
function getStatusColor(metric: string, value: number): string {
  switch (metric) {
    case 'gdpGrowth':
      return value > 2.0 ? COLORS.good : value > 0.5 ? COLORS.neutral : COLORS.bad;
    case 'inflation':
      return Math.abs(value - 2.0) < 0.5 ? COLORS.good : Math.abs(value - 2.0) < 1.5 ? COLORS.warning : COLORS.bad;
    case 'unemployment':
      return value < 4.5 ? COLORS.good : value < 6.0 ? COLORS.warning : COLORS.bad;
    case 'deficit':
      return value < 0 ? COLORS.good : value < 3.0 ? COLORS.warning : COLORS.bad;
    case 'debt':
      return value < 60 ? COLORS.good : value < 90 ? COLORS.warning : COLORS.bad;
    case 'giltYield':
      return value < 4.0 ? COLORS.good : value < 6.0 ? COLORS.warning : COLORS.bad;
    case 'nhsQuality':
      return value > 70 ? COLORS.good : value > 55 ? COLORS.warning : COLORS.bad;
    case 'political':
      return value > 50 ? COLORS.good : value > 35 ? COLORS.warning : COLORS.bad;
    default:
      return COLORS.neutral;
  }
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
    good: 'text-green-700',
    neutral: 'text-gray-800',
    bad: 'text-red-700',
  };

  return (
    <div className="flex flex-col gap-0.5">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide leading-tight">
        {label}
      </div>
      <div className={`text-lg font-bold leading-snug break-all ${statusColors[status]}`}>
        {value}
      </div>
      {target && (
        <div className="text-xs text-gray-400">
          Target: {target}
        </div>
      )}
      {sublabel && (
        <div className="text-xs text-gray-500">
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
    <div className="bg-white rounded-sm shadow-sm border border-gray-100 p-5">
      <h2 className="text-lg font-bold text-gray-900 mb-4 border-b-2 border-gray-200 pb-2">Economic Indicators</h2>
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
    <div className="bg-white rounded-sm shadow-sm border border-gray-100 p-5">
      <h2 className="text-lg font-bold text-gray-900 mb-4 border-b-2 border-gray-200 pb-2">
        {mode === 'budget' ? 'Fiscal Position (Budget Mode)' : 'Fiscal Position'}
      </h2>
      <div className="grid grid-cols-2 gap-x-4 gap-y-5">
        <MetricCard
          label="Total Revenue"
          value={formatCurrency(state.fiscal?.totalRevenue_bn ?? 0)}
          status="neutral"
        />
        <MetricCard
          label="Total Spending"
          value={formatCurrency(state.fiscal?.totalSpending_bn ?? 0)}
          status="neutral"
        />
        <MetricCard
          label="Public Sector Net Borrowing"
          value={formatCurrency(state.fiscal?.deficit_bn ?? 0)}
          status={(state.fiscal?.deficit_bn ?? 0) < 0 ? 'good' : (state.fiscal?.deficitPctGDP ?? 0) < 3.0 ? 'neutral' : 'bad'}
          sublabel={`${formatPercent(state.fiscal?.deficitPctGDP ?? 0)} of GDP`}
        />
        <MetricCard
          label="Debt Stock"
          value={formatCurrency(state.fiscal?.debtNominal_bn ?? 0)}
          status={(state.fiscal?.debtPctGDP ?? 0) < 60 ? 'good' : (state.fiscal?.debtPctGDP ?? 0) < 90 ? 'neutral' : 'bad'}
          sublabel={`${formatPercent(state.fiscal?.debtPctGDP ?? 0)} of GDP`}
        />
        {isExpanded && (
          <>
            <MetricCard
              label="Debt Interest"
              value={formatCurrency(state.fiscal?.debtInterest_bn ?? 0)}
              status="neutral"
            />
            <MetricCard
              label="Primary Balance"
              value={formatCurrency((state.fiscal?.deficit_bn ?? 0) - (state.fiscal?.debtInterest_bn ?? 0))}
              status={((state.fiscal?.deficit_bn ?? 0) - (state.fiscal?.debtInterest_bn ?? 0)) < 0 ? 'good' : 'bad'}
            />
          </>
        )}
      </div>
    </div>
  );
};

/**
 * Political Metrics Panel (using mock data)
 */
const PoliticalPanel: React.FC<{ state: any }> = ({ state }) => {
  const pmTrust = state.political?.pmTrust ?? MOCK_POLITICAL.pmTrust;
  const governmentApproval = state.political?.governmentApproval ?? MOCK_POLITICAL.publicApproval;
  const backbenchSatisfaction = state.political?.backbenchSatisfaction ?? MOCK_POLITICAL.backbenchSentiment;
  return (
    <div className="bg-white rounded-sm shadow-sm border border-gray-100 p-5">
      <h2 className="text-lg font-bold text-gray-900 mb-4 border-b-2 border-gray-200 pb-2">Political Capital</h2>
      <div className="grid grid-cols-3 gap-4">
        <MetricCard
          label="PM Trust"
          value={formatNumber(pmTrust, 0)}
          status={pmTrust > 50 ? 'good' : pmTrust > 35 ? 'neutral' : 'bad'}
        />
        <MetricCard
          label="Public Approval"
          value={formatNumber(governmentApproval, 0)}
          status={governmentApproval > 50 ? 'good' : governmentApproval > 35 ? 'neutral' : 'bad'}
        />
        <MetricCard
          label="Backbench Support"
          value={formatNumber(backbenchSatisfaction, 0)}
          status={backbenchSatisfaction > 60 ? 'good' : backbenchSatisfaction > 40 ? 'neutral' : 'bad'}
        />
      </div>
    </div>
  );
};

/**
 * Services Metrics Panel
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

  return (
    <div className="bg-white rounded-sm shadow-sm border border-gray-100 p-5">
      <h2 className="text-lg font-bold text-gray-900 mb-4 border-b-2 border-gray-200 pb-2">Public Services</h2>
      <div className="grid grid-cols-2 gap-x-4 gap-y-4">
        {/* Headline metrics */}
        <MetricCard
          label="NHS Quality Index"
          value={`${formatNumber(state.services?.nhsQuality ?? 50, 0)}/100`}
          status={(state.services?.nhsQuality ?? 50) > 70 ? 'good' : (state.services?.nhsQuality ?? 50) > 55 ? 'neutral' : 'bad'}
        />
        <MetricCard
          label="Education Quality"
          value={`${formatNumber(state.services?.educationQuality ?? 50, 0)}/100`}
          status={(state.services?.educationQuality ?? 50) > 70 ? 'good' : (state.services?.educationQuality ?? 50) > 55 ? 'neutral' : 'bad'}
        />
        <MetricCard
          label="Infrastructure Quality"
          value={`${formatNumber(state.services?.infrastructureQuality ?? 50, 0)}/100`}
          status={(state.services?.infrastructureQuality ?? 50) > 65 ? 'good' : (state.services?.infrastructureQuality ?? 50) > 50 ? 'neutral' : 'bad'}
        />

        {/* Divider */}
        <div className="col-span-2 border-t border-gray-100 my-1" />

        {/* Expanded metrics */}
        {expandedMetrics.map((metric) => (
          <MetricCard
            key={metric.label}
            label={metric.label}
            value={`${formatNumber(state.services?.[metric.key] ?? 50, 0)}/100`}
            status={(state.services?.[metric.key] ?? 50) > 65 ? 'good' : (state.services?.[metric.key] ?? 50) > 50 ? 'neutral' : 'bad'}
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
    <div className="bg-white rounded-sm shadow-sm border border-gray-100 p-5">
      <h2 className="text-lg font-bold text-gray-900 mb-4 border-b-2 border-gray-200 pb-2">Markets & Rates</h2>
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
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Economic Overview (2014-Present)</h3>
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={chartData} margin={{ top: 20, right: 60, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
          <XAxis
            dataKey="date"
            angle={-45}
            textAnchor="end"
            height={80}
            style={{ fontSize: '11px' }}
          />
          <YAxis
            yAxisId="left"
            label={{ value: 'GDP Growth & Unemployment (%)', angle: -90, position: 'insideLeft', style: { fontSize: '12px' } }}
            style={{ fontSize: '11px' }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            label={{ value: 'Inflation (%)', angle: 90, position: 'insideRight', style: { fontSize: '12px' } }}
            style={{ fontSize: '11px' }}
          />
          <Tooltip
            contentStyle={{ backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '4px' }}
          />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
          />
          <ReferenceLine yAxisId="left" y={0} stroke={COLORS.neutral} strokeDasharray="3 3" />
          <ReferenceLine yAxisId="right" y={2} stroke={COLORS.bad} strokeDasharray="3 3" label="Target" />
          <ReferenceLine yAxisId="left" x="Jul 24" stroke={COLORS.treasuryBlue} strokeWidth={2} label="Your takeover" />

          <Line
            yAxisId="left"
            type="monotone"
            dataKey="gdpGrowth"
            stroke={COLORS.gdp}
            strokeWidth={2}
            dot={false}
            name="GDP Growth"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="inflation"
            stroke={COLORS.inflation}
            strokeWidth={2}
            dot={false}
            name="CPI Inflation"
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="unemployment"
            stroke={COLORS.unemployment}
            strokeWidth={2}
            dot={false}
            name="Unemployment"
          />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="text-xs text-gray-500 mt-2 text-center">
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
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Fiscal Position (2014-Present)</h3>
      <ResponsiveContainer width="100%" height={350}>
        <ComposedChart data={chartData} margin={{ top: 20, right: 60, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
          <XAxis
            dataKey="date"
            angle={-45}
            textAnchor="end"
            height={80}
            style={{ fontSize: '11px' }}
          />
          <YAxis
            yAxisId="left"
            label={{ value: 'Deficit (£bn)', angle: -90, position: 'insideLeft', style: { fontSize: '12px' } }}
            style={{ fontSize: '11px' }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            label={{ value: 'Debt/GDP (%)', angle: 90, position: 'insideRight', style: { fontSize: '12px' } }}
            style={{ fontSize: '11px' }}
          />
          <Tooltip
            contentStyle={{ backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '4px' }}
          />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />

          <ReferenceLine yAxisId="right" y={60} stroke={COLORS.good} strokeDasharray="3 3" label="Maastricht" />
          <ReferenceLine yAxisId="right" y={100} stroke={COLORS.bad} strokeDasharray="3 3" label="100%" />
          <ReferenceLine yAxisId="left" x="Jul 24" stroke={COLORS.treasuryBlue} strokeWidth={2} />

          <Area
            yAxisId="left"
            type="monotone"
            dataKey="deficit"
            fill={COLORS.deficit}
            fillOpacity={0.3}
            stroke={COLORS.deficit}
            strokeWidth={2}
            name="Deficit (£bn)"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="debtToGdp"
            stroke={COLORS.debt}
            strokeWidth={3}
            dot={false}
            name="Debt/GDP (%)"
          />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="text-xs text-gray-500 mt-2 text-center">
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
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Interest Rates (2014-Present)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
          <XAxis
            dataKey="date"
            angle={-45}
            textAnchor="end"
            height={80}
            style={{ fontSize: '11px' }}
          />
          <YAxis
            label={{ value: 'Interest Rate (%)', angle: -90, position: 'insideLeft', style: { fontSize: '12px' } }}
            style={{ fontSize: '11px' }}
          />
          <Tooltip
            contentStyle={{ backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '4px' }}
          />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />

          <ReferenceLine x="Jul 24" stroke={COLORS.treasuryBlue} strokeWidth={2} />

          <Line
            type="monotone"
            dataKey="bankRate"
            stroke={COLORS.bankRate}
            strokeWidth={2}
            dot={false}
            name="Bank Rate"
          />
          <Line
            type="monotone"
            dataKey="giltYield"
            stroke={COLORS.yields}
            strokeWidth={2}
            dot={false}
            name="10yr Gilt Yield (est.)"
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="text-xs text-gray-500 mt-2 text-center">
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

  const modeBgColors = {
    normal: 'bg-blue-50',
    budget: 'bg-purple-50',
    crisis: 'bg-red-50',
  };

  const modeTextColors = {
    normal: 'text-blue-900',
    budget: 'text-purple-900',
    crisis: 'text-red-900',
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Social Media Sidebar - Left side only on dashboard */}
      <SocialMediaSidebar state={state} />

      {/* Main Dashboard Content */}
      <div className="flex-1 p-4 md:p-8 overflow-x-hidden">
      <div className="max-w-[1800px] mx-auto">
        {/* Header */}
        <div className={`rounded-lg shadow-md p-6 mb-6 ${modeBgColors[currentMode]}`}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className={`text-3xl font-bold ${modeTextColors[currentMode]} mb-2`}>
                HM Treasury Dashboard
              </h1>
              <p className="text-gray-700">
                {`${new Date(state?.metadata?.currentYear ?? 2024, (state?.metadata?.currentMonth ?? 1) - 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`} • Month {(state?.metadata?.currentTurn ?? 0) + 1} of 60
              </p>
            </div>
            <div className="mt-4 md:mt-0">
              <div className={`inline-block px-3 py-1 rounded text-sm font-semibold ${
                currentMode === 'crisis' ? 'bg-red-600 text-white' :
                currentMode === 'budget' ? 'bg-purple-600 text-white' :
                'bg-blue-600 text-white'
              }`}>
                {modeLabels[currentMode]}
              </div>
            </div>
          </div>
        </div>

        {/* Crisis Alert Banner */}
        {currentMode === 'crisis' && (
          <div className="bg-red-100 border-l-4 border-red-600 p-4 mb-6 rounded">
            <div className="flex items-center">
              <div className="text-red-700 font-bold text-lg">
                ECONOMIC CRISIS DETECTED
              </div>
            </div>
            <div className="text-red-600 text-sm mt-1">
               Critical thresholds breached. Immediate policy action required.
            </div>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
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
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>HM Treasury Economic Simulation • Chancellor Dashboard v1.0</p>
          <p className="mt-1">Historical baseline (2014-2024) based on ONS/OBR data</p>
        </div>
      </div>
      </div>
    </div>
  );
};

export default Dashboard;
