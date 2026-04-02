import React from 'react';
import { AdviserSystemState } from './adviser-system';
import { SocialMediaPulseStrip } from './social-media-system';
import { selectDashboardHeadlineMetrics, selectPoliticalOverview } from './state/selectors';

interface DashboardProps {
  state: any;
  mode?: 'normal' | 'budget' | 'crisis';
  onModeChange?: (mode: 'normal' | 'budget' | 'crisis') => void;
  adviserSystem: AdviserSystemState;
}

const formatPct = (n: number) => `${n.toFixed(1)}%`;
const formatBn = (n: number) => {
  if (Math.abs(n) >= 1000) return `£${(n / 1000).toFixed(2)}tn`;
  return `£${n.toFixed(1)}bn`;
};

const MetricCell: React.FC<{ label: string; value: string; status?: 'good' | 'neutral' | 'bad'; sub?: string }> = ({ label, value, status = 'neutral', sub }) => (
  <div className="py-1.5 border-b border-border-subtle last:border-b-0">
    <div className="flex items-baseline justify-between">
      <span className="text-label text-tertiary">{label}</span>
      <span className={`font-mono text-sm font-semibold ${status === 'good' ? 'text-good' : status === 'bad' ? 'text-bad' : 'text-primary'}`}>{value}</span>
    </div>
    {sub && <div className="text-[10px] text-muted mt-0.5">{sub}</div>}
  </div>
);

const BarRow: React.FC<{ label: string; value: number; max?: number }> = ({ label, value, max = 100 }) => {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const color = value < 35 ? 'var(--color-bad)' : value < 50 ? 'var(--color-warning)' : 'var(--color-good)';
  return (
    <div className="flex items-center gap-2 py-1 border-b border-border-subtle last:border-b-0">
      <span className="text-label text-tertiary w-20 shrink-0">{label}</span>
      <span className="font-mono text-xs font-semibold w-8 text-right" style={{ color }}>{Math.round(value)}</span>
      <div className="flex-1 h-1 bg-border-subtle">
        <div className="h-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
};

const Section: React.FC<{ kicker: string; title: string; children: React.ReactNode }> = ({ kicker, title, children }) => (
  <div className="treasury-panel py-3 px-4">
    <div className="treasury-panel-title mb-2">
      <div>
        <div className="treasury-kicker">{kicker}</div>
        <h2 className="font-display text-sm font-semibold text-primary">{title}</h2>
      </div>
    </div>
    {children}
  </div>
);

export const Dashboard: React.FC<DashboardProps> = ({ state, adviserSystem }) => {
  const { gdpGrowth, inflation, unemployment, approval } = selectDashboardHeadlineMetrics(state);
  const political = selectPoliticalOverview(state);

  const dateString = new Date(state?.metadata?.currentYear ?? 2024, (state?.metadata?.currentMonth ?? 1) - 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const currentTurn = (state?.metadata?.currentTurn ?? 0) + 1;

  const status = (value: number, good: [number, number], bad: [number, number]): 'good' | 'neutral' | 'bad' => {
    if (value >= good[0] && value <= good[1]) return 'good';
    if (value >= bad[0] && value <= bad[1]) return 'bad';
    return 'neutral';
  };

  const debtRatio = state?.fiscal?.debtPctGDP ?? 0;
  const headroom = state?.fiscal?.fiscalHeadroom_bn ?? 0;
  const pmTrust = political.pmTrust;
  const deficitBn = state?.fiscal?.deficit_bn ?? 0;
  const deficitPct = state?.fiscal?.deficitPctGDP ?? 0;
  const debtNominal = state?.fiscal?.debtNominal_bn ?? 0;
  const revenue = state?.fiscal?.totalRevenue_bn ?? 0;
  const spending = state?.fiscal?.totalSpending_bn ?? 0;
  const debtInterest = state?.fiscal?.debtInterest_bn ?? 0;
  const bankRate = state?.markets?.bankRate ?? 0;
  const gilt10y = state?.markets?.giltYield10y ?? 0;
  const sterling = state?.markets?.sterlingIndex ?? 100;
  const mortgage2y = state?.markets?.mortgageRate2y ?? 0;
  const participation = state?.economic?.participationRate ?? 63;
  const inactivity = state?.economic?.economicInactivity ?? 21.5;
  const wageGrowth = state?.economic?.wageGrowthAnnual ?? 0;
  const realWages = wageGrowth - (state?.economic?.inflationCPI ?? 0);
  const nhs = state?.services?.nhsQuality ?? 50;
  const edu = state?.services?.educationQuality ?? 50;
  const infra = state?.services?.infrastructureQuality ?? 50;
  const mental = state?.services?.mentalHealthAccess ?? 50;
  const prison = state?.services?.prisonSafety ?? 50;
  const police = state?.services?.policingEffectiveness ?? 50;
  const rail = state?.services?.railReliability ?? 50;
  const court = state?.services?.courtBacklogPerformance ?? 50;
  const housing = state?.services?.affordableHousingDelivery ?? 50;

  const compliance = state?.political?.fiscalRuleCompliance;
  const ruleName = state?.political?.chosenFiscalRule ? (
    { 'starmer-reeves': 'Starmer-Reeves', 'labour-2024': 'Labour 2024', 'osborne': 'Osborne', 'brown': 'Brown' } as Record<string, string>
  )[state.political.chosenFiscalRule] ?? 'Custom' : 'None';

  return (
    <div className="treasury-stage" style={{ height: 'calc(100vh - 80px)', overflow: 'hidden' }}>
      <div className="flex h-full">
        {/* Main content — fills all available space */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Header strip */}
          <div className="treasury-panel px-5 py-3 flex items-end justify-between shrink-0">
            <div>
              <div className="treasury-kicker">{dateString} · Month {currentTurn} of 60</div>
              <h1 className="font-display text-xl font-semibold text-primary leading-tight">HM Treasury Dashboard</h1>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="treasury-kicker">Fiscal Rule</div>
                <div className="text-sm font-semibold text-primary">{ruleName}</div>
              </div>
              <div className="text-right">
                <div className="treasury-kicker">Compliance</div>
                <div className={`text-sm font-semibold ${compliance?.overallCompliant ? 'text-good' : 'text-bad'}`}>
                  {compliance?.overallCompliant ? 'COMPLIANT' : `BREACH (${compliance?.consecutiveBreaches})`}
                </div>
              </div>
            </div>
          </div>

          {/* KPI strip — 6 cells */}
          <div className="treasury-data-strip shrink-0">
            <div className="treasury-data-cell py-2">
              <div className="treasury-kicker">GDP Growth</div>
              <div className={`font-mono text-lg font-semibold ${status(gdpGrowth, [1.5, 10], [-10, 0]) === 'good' ? 'text-good' : status(gdpGrowth, [1.5, 10], [-10, 0]) === 'bad' ? 'text-bad' : 'text-primary'}`}>
                {typeof gdpGrowth === 'number' ? `${gdpGrowth.toFixed(1)}%` : '—'}
              </div>
            </div>
            <div className="treasury-data-cell py-2">
              <div className="treasury-kicker">CPI Inflation</div>
              <div className={`font-mono text-lg font-semibold ${Math.abs(inflation - 2.0) < 0.5 ? 'text-good' : Math.abs(inflation - 2.0) < 1.5 ? 'text-primary' : 'text-bad'}`}>
                {typeof inflation === 'number' ? `${inflation.toFixed(1)}%` : '—'}
              </div>
            </div>
            <div className="treasury-data-cell py-2">
              <div className="treasury-kicker">Unemployment</div>
              <div className={`font-mono text-lg font-semibold ${unemployment < 4.5 ? 'text-good' : unemployment < 6.0 ? 'text-primary' : 'text-bad'}`}>
                {typeof unemployment === 'number' ? `${unemployment.toFixed(1)}%` : '—'}
              </div>
            </div>
            <div className="treasury-data-cell py-2">
              <div className="treasury-kicker">Gov Approval</div>
              <div className={`font-mono text-lg font-semibold ${(approval ?? 0) > 50 ? 'text-good' : (approval ?? 0) > 35 ? 'text-primary' : 'text-bad'}`}>
                {typeof approval === 'number' ? `${approval.toFixed(0)}%` : '—'}
              </div>
            </div>
            <div className="treasury-data-cell py-2">
              <div className="treasury-kicker">Debt Ratio</div>
              <div className={`font-mono text-lg font-semibold ${debtRatio < 90 ? 'text-primary' : 'text-bad'}`}>
                {debtRatio.toFixed(1)}%
              </div>
            </div>
            <div className="treasury-data-cell py-2">
              <div className="treasury-kicker">Headroom</div>
              <div className={`font-mono text-lg font-semibold ${headroom > 10 ? 'text-good' : headroom > 0 ? 'text-warning' : 'text-bad'}`}>
                £{headroom.toFixed(1)}bn
              </div>
            </div>
          </div>

          {/* Three-column metric grid */}
          <div className="grid grid-cols-3 gap-0 flex-1 overflow-hidden">
            {/* Column 1: Economy + Fiscal */}
            <div className="overflow-y-auto border-r border-border-strong">
              <Section kicker="Economy" title="Macroeconomic Indicators">
                <div className="grid grid-cols-2 gap-x-4">
                  <MetricCell label="Participation" value={formatPct(participation)} status={participation > 63 ? 'good' : 'neutral'} />
                  <MetricCell label="Inactivity" value={formatPct(inactivity)} status={inactivity < 22 ? 'good' : 'neutral'} />
                  <MetricCell label="Nominal Wages" value={formatPct(wageGrowth)} />
                  <MetricCell label="Real Wages" value={formatPct(realWages)} status={realWages > 0 ? 'good' : 'bad'} />
                </div>
              </Section>

              <Section kicker="Public Finances" title="Revenue, Spending & Debt">
                <div className="grid grid-cols-2 gap-x-4">
                  <MetricCell label="Revenue" value={formatBn(revenue)} />
                  <MetricCell label="Spending" value={formatBn(spending)} />
                  <MetricCell label="Net Borrowing" value={formatBn(deficitBn)} sub={`${formatPct(deficitPct)} of GDP`} status={deficitPct < 3 ? 'neutral' : 'bad'} />
                  <MetricCell label="Debt Stock" value={formatBn(debtNominal)} sub={`${formatPct(debtRatio)} of GDP`} status={debtRatio < 90 ? 'neutral' : 'bad'} />
                  <MetricCell label="Debt Interest" value={formatBn(debtInterest)} />
                </div>
              </Section>

              <Section kicker="City" title="Markets & Rates">
                <div className="grid grid-cols-2 gap-x-4">
                  <MetricCell label="Bank Rate" value={formatPct(bankRate)} />
                  <MetricCell label="10Y Gilt" value={formatPct(gilt10y)} status={gilt10y < 4 ? 'good' : gilt10y < 6 ? 'neutral' : 'bad'} />
                  <MetricCell label="2Y Mortgage" value={formatPct(mortgage2y)} status={mortgage2y < 5 ? 'good' : 'neutral'} />
                  <MetricCell label="Sterling" value={sterling.toFixed(1)} status={sterling > 100 ? 'good' : sterling > 95 ? 'neutral' : 'bad'} />
                </div>
              </Section>
            </div>

            {/* Column 2: Political + Services */}
            <div className="overflow-y-auto border-r border-border-strong">
              <Section kicker="Westminster" title="Political Capital">
                <BarRow label="PM Trust" value={pmTrust ?? 0} />
                <BarRow label="Approval" value={political.governmentApproval ?? 0} />
                <BarRow label="Backbench" value={political.backbenchSatisfaction ?? 0} />
                <BarRow label="Credibility" value={state?.political?.credibilityIndex ?? 65} />
                <BarRow label="Strike Risk" value={state?.political?.strikeRisk ?? 20} />
                <div className="flex justify-between items-center py-1 mt-1">
                  <span className="text-label text-tertiary">Credit Rating</span>
                  <span className="font-mono text-xs font-semibold text-primary">{state?.political?.creditRating ?? 'AA-'} ({state?.political?.creditRatingOutlook ?? 'negative'})</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-label text-tertiary">Manifesto Breaches</span>
                  <span className={`font-mono text-xs font-semibold ${state?.manifesto?.totalViolations > 0 ? 'text-bad' : 'text-good'}`}>{state?.manifesto?.totalViolations ?? 0}</span>
                </div>
              </Section>

              <Section kicker="Delivery" title="Public Services">
                <BarRow label="NHS" value={nhs} />
                <BarRow label="Education" value={edu} />
                <BarRow label="Infrastructure" value={infra} />
                <BarRow label="Mental Health" value={mental} />
                <BarRow label="Prisons" value={prison} />
                <BarRow label="Policing" value={police} />
                <BarRow label="Courts" value={court} />
                <BarRow label="Rail" value={rail} />
                <BarRow label="Housing" value={housing} />
              </Section>
            </div>

            {/* Column 3: Spending breakdown + Fiscal rules detail */}
            <div className="overflow-y-auto">
              <Section kicker="Spending" title="Departmental Breakdown (£bn)">
                <div className="space-y-0">
                  {Object.entries(state?.fiscal?.spending ?? {})
                    .sort(([, a], [, b]) => (b as number) - (a as number))
                    .map(([dept, amount]) => (
                      <div key={dept} className="flex items-baseline justify-between py-1 border-b border-border-subtle last:border-b-0">
                        <span className="text-label text-tertiary capitalize">{dept}</span>
                        <span className="font-mono text-sm font-semibold text-primary">£{(amount as number).toFixed(1)}bn</span>
                      </div>
                    ))}
                </div>
              </Section>

              <Section kicker="Fiscal Rules" title="Rule Compliance">
                <div className="space-y-1">
                  {compliance?.currentBudgetMet !== undefined && (
                    <div className="flex items-center justify-between py-1">
                      <span className="text-xs text-secondary">Current Budget</span>
                      <span className={`text-xs font-semibold font-mono ${compliance.currentBudgetMet ? 'text-good' : 'text-bad'}`}>{compliance.currentBudgetMet ? 'MET' : 'BREACHED'}</span>
                    </div>
                  )}
                  {compliance?.overallBalanceMet !== undefined && (
                    <div className="flex items-center justify-between py-1">
                      <span className="text-xs text-secondary">Overall Balance</span>
                      <span className={`text-xs font-semibold font-mono ${compliance.overallBalanceMet ? 'text-good' : 'text-bad'}`}>{compliance.overallBalanceMet ? 'MET' : 'BREACHED'}</span>
                    </div>
                  )}
                  {compliance?.debtTargetMet !== undefined && (
                    <div className="flex items-center justify-between py-1">
                      <span className="text-xs text-secondary">Debt Target</span>
                      <span className={`text-xs font-semibold font-mono ${compliance.debtTargetMet ? 'text-good' : 'text-bad'}`}>{compliance.debtTargetMet ? 'MET' : 'BREACHED'}</span>
                    </div>
                  )}
                  {compliance?.debtFallingMet !== undefined && (
                    <div className="flex items-center justify-between py-1">
                      <span className="text-xs text-secondary">Debt Falling</span>
                      <span className={`text-xs font-semibold font-mono ${compliance.debtFallingMet ? 'text-good' : 'text-bad'}`}>{compliance.debtFallingMet ? 'MET' : 'BREACHED'}</span>
                    </div>
                  )}
                  {compliance?.deficitCeilingMet !== undefined && (
                    <div className="flex items-center justify-between py-1">
                      <span className="text-xs text-secondary">Deficit Ceiling</span>
                      <span className={`text-xs font-semibold font-mono ${compliance.deficitCeilingMet ? 'text-good' : 'text-bad'}`}>{compliance.deficitCeilingMet ? 'MET' : 'BREACHED'}</span>
                    </div>
                  )}
                </div>
              </Section>
            </div>
          </div>
        </div>

        {/* Social media pulse strip — right edge */}
        <SocialMediaPulseStrip state={state} />
      </div>
    </div>
  );
};

export default Dashboard;
