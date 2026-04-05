import React from 'react';
import { calculateDELPlanProjections, validateDELPlan, DELPlanInputs, FiscalEnvelopeConstraints } from '../../domain/budget/del-calculations';

interface DELPlanViewProps {
  departments: Record<string, {
    name: string;
    resourceDEL_bn: number;
    capitalDEL_bn: number;
    plannedResourceDEL_bn: number[];
    plannedCapitalDEL_bn: number[];
    backlog: number;
    deliveryCapacity: number;
  }>;
  spendingReviewPlanTotal: number;
  spendingReviewEnvelope: {
    prudenceMargin: number;
    amePressures: number;
    annualEnvelope: number;
    threeYearEnvelope: number;
  };
  inflationRate: number;
  gdpGrowthProjection: number;
  onPlanChange: (
    departmentKey: string,
    planType: 'resource' | 'capital',
    yearIdx: number,
    nextValue: number
  ) => void;
}

const DEPARTMENT_ORDER = ['nhs', 'education', 'defence', 'infrastructure', 'homeOffice', 'localGov', 'other'] as const;

export const DELPlanView: React.FC<DELPlanViewProps> = ({
  departments,
  spendingReviewPlanTotal,
  spendingReviewEnvelope,
  inflationRate,
  gdpGrowthProjection,
  onPlanChange,
}) => {
  const delInputs: DELPlanInputs = {
    departments,
    inflationRate,
    gdpGrowthProjection,
  };

  const fiscalEnvelope: FiscalEnvelopeConstraints = {
    annualEnvelope: spendingReviewEnvelope.annualEnvelope,
    threeYearEnvelope: spendingReviewEnvelope.threeYearEnvelope,
  };

  const projections = calculateDELPlanProjections(delInputs);
  const validation = validateDELPlan(delInputs, fiscalEnvelope);

  return (
    <div className="space-y-4">
      <div className="bg-bg-surface border border-border-strong p-6">
        <h2 className="text-xl font-bold text-primary">Departmental Expenditure Limits (3-Year Plan)</h2>
        <p className="text-sm text-secondary mt-1">
          Edit DEL plans at any time. Markets can react to out-year plans, but less than to current budgets
          and headroom.
        </p>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="border border-border-subtle p-3">
            <div className="text-secondary">Projected 3Y DEL total</div>
            <div className="text-2xl font-bold">£{spendingReviewPlanTotal.toFixed(1)}bn</div>
          </div>
          <div className="border border-border-subtle p-3">
            <div className="text-secondary">Headroom envelope (3Y)</div>
            <div className="text-2xl font-bold">£{spendingReviewEnvelope.threeYearEnvelope.toFixed(1)}bn</div>
          </div>
          <div
            className={`border p-3 ${spendingReviewPlanTotal > spendingReviewEnvelope.threeYearEnvelope ? 'border-warning bg-warning-subtle' : 'border-good bg-good-subtle'}`}
          >
            <div className="text-secondary">Envelope check</div>
            <div
              className={`text-2xl font-bold ${spendingReviewPlanTotal > spendingReviewEnvelope.threeYearEnvelope ? 'text-warning' : 'text-good'}`}
            >
              {spendingReviewPlanTotal > spendingReviewEnvelope.threeYearEnvelope
                ? 'Above envelope'
                : 'Below envelope'}
            </div>
          </div>
        </div>
        <div className="mt-3 text-xs text-secondary">
          Indicative envelope = headroom minus AME pressures (£
          {spendingReviewEnvelope.amePressures.toFixed(1)}bn) and prudence margin (£
          {spendingReviewEnvelope.prudenceMargin.toFixed(1)}bn).
        </div>
        <div className="mt-2 text-xs font-medium text-tertiary">
          Spending Review plans are indicative guidelines and may be revised.
        </div>
        {spendingReviewPlanTotal > spendingReviewEnvelope.threeYearEnvelope && (
          <div className="mt-4 text-sm text-warning bg-warning-subtle border border-warning px-3 py-2">
            DEL plan is £{(spendingReviewPlanTotal - spendingReviewEnvelope.threeYearEnvelope).toFixed(1)}bn
            above the 3-year envelope.
          </div>
        )}
        {validation.departmentBreaches.length > 0 && (
          <div className="mt-3 space-y-1">
            {validation.departmentBreaches.map((breach, idx) => (
              <div key={idx} className="text-xs text-warning">{breach}</div>
            ))}
          </div>
        )}
      </div>

      {DEPARTMENT_ORDER.map((key) => {
        const dept = departments[key];
        if (!dept) return null;

        return (
          <div key={key} className="bg-bg-surface border border-border-strong p-5">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="text-lg font-bold text-primary">{dept.name}</h3>
                <div className="text-xs text-secondary">
                  Service quality and backlog context from latest turn
                </div>
              </div>
              <div className="text-xs text-secondary">
                Backlog {dept.backlog.toFixed(0)} · Delivery capacity {dept.deliveryCapacity.toFixed(0)}
              </div>
            </div>
            {(() => {
              const deptTotal =
                (dept.plannedResourceDEL_bn || []).reduce((acc, value) => acc + value, 0) +
                (dept.plannedCapitalDEL_bn || []).reduce((acc, value) => acc + value, 0);
              const fairShare =
                spendingReviewPlanTotal > 0
                  ? spendingReviewEnvelope.threeYearEnvelope * (deptTotal / spendingReviewPlanTotal)
                  : 0;
              const breach = deptTotal - fairShare;
              return (
                <div className={`text-xs mb-3 ${breach > 0 ? 'text-warning' : 'text-good'}`}>
                  {breach > 0
                    ? `Department indicative envelope breach: +£${breach.toFixed(1)}bn`
                    : 'Department within indicative envelope share'}
                </div>
              );
            })()}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[0, 1, 2].map((yearIdx) => (
                <div key={`${key}_year_${yearIdx}`} className="border border-border-subtle p-3">
                  <div className="text-xs uppercase tracking-wide text-secondary mb-2">Year {yearIdx + 1}</div>
                  <label className="text-xs text-secondary block mb-1">Resource DEL (£bn)</label>
                  <input
                    type="number"
                    className="w-full border border-border-strong px-2 py-1 text-sm"
                    value={yearIdx === 0 ? dept.resourceDEL_bn : dept.plannedResourceDEL_bn[yearIdx] ?? 0}
                    disabled={yearIdx === 0}
                    onChange={(e) =>
                      onPlanChange(key, 'resource', yearIdx, Number(e.target.value))
                    }
                  />
                  <label className="text-xs text-secondary block mt-3 mb-1">Capital DEL (£bn)</label>
                  <input
                    type="number"
                    className="w-full border border-border-strong px-2 py-1 text-sm"
                    value={yearIdx === 0 ? dept.capitalDEL_bn : dept.plannedCapitalDEL_bn[yearIdx] ?? 0}
                    disabled={yearIdx === 0}
                    onChange={(e) =>
                      onPlanChange(key, 'capital', yearIdx, Number(e.target.value))
                    }
                  />
                  {yearIdx === 0 && (
                    <div className="text-[11px] text-muted mt-2">
                      Year 1 is synced to current budget values.
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
