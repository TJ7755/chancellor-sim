import React from 'react';
import { getFiscalRuleById, getRuleHeadroomLabel } from '../../game-integration';

interface ImpactViewProps {
  fiscalImpact: {
    currentDeficit: number;
    projectedDeficit: number;
    deficitChange: number;
    currentDebt: number;
    projectedDebt: number;
    debtGDPRatio: number;
    debtChange: number;
    fiscalRulesMet: boolean;
    headroom: number;
  };
  chosenFiscalRule: string;
  warnings: Array<{
    id: string;
    category: string;
    severity: string;
    title: string;
    message: string;
    impact?: string;
  }>;
  legislativePipeline: Array<{
    measureId: string;
    description: string;
    type: string;
    announcedTurn: number;
    effectiveTurn: number;
    turnsRemaining: number;
    fiscalImpactOnEffect_bn: number;
    status: string;
    delayRisk: number;
    capacityCost: number;
  }>;
  obrForecast: {
    policyScorings?: Array<{
      measureDescription: string;
      annualImpact_bn: number;
      certaintylevel: string;
    }>;
  } | null;
}

export const ImpactView: React.FC<ImpactViewProps> = ({
  fiscalImpact,
  chosenFiscalRule,
  warnings,
  legislativePipeline,
  obrForecast,
}) => {
  return (
    <div className="space-y-6">
      <div className="bg-bg-surface border border-border-strong p-6">
        <h2 className="text-xl font-bold text-primary mb-4">Fiscal Position</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-border-subtle p-4">
            <div className="text-sm text-secondary uppercase tracking-wide mb-2">Current Deficit</div>
            <div className="text-3xl font-bold text-primary">
              £{fiscalImpact.currentDeficit.toFixed(1)}bn
            </div>
            <div className="text-sm text-secondary mt-1">OBR March 2024 forecast</div>
          </div>
          <div className="border border-border-subtle p-4">
            <div className="text-sm text-secondary uppercase tracking-wide mb-2">Projected Deficit</div>
            <div
              className={`text-3xl font-bold ${
                fiscalImpact.projectedDeficit > fiscalImpact.currentDeficit
                  ? 'text-bad'
                  : fiscalImpact.projectedDeficit < fiscalImpact.currentDeficit
                    ? 'text-good'
                    : 'text-primary'
              }`}
            >
              £{fiscalImpact.projectedDeficit.toFixed(1)}bn
            </div>
            <div
              className={`text-sm font-semibold mt-1 ${
                fiscalImpact.deficitChange > 0
                  ? 'text-bad'
                  : fiscalImpact.deficitChange < 0
                    ? 'text-good'
                    : 'text-secondary'
              }`}
            >
              {fiscalImpact.deficitChange > 0 ? '+' : ''}£{fiscalImpact.deficitChange.toFixed(1)}bn change
            </div>
          </div>
          <div className="border border-border-subtle p-4">
            <div className="text-sm text-secondary uppercase tracking-wide mb-2">Public Sector Net Debt</div>
            <div className="text-3xl font-bold text-primary">£{fiscalImpact.projectedDebt.toFixed(0)}bn</div>
            <div className="text-sm text-secondary mt-1">{fiscalImpact.debtGDPRatio.toFixed(1)}% of GDP</div>
          </div>
          <div className="border border-border-subtle p-4">
            <div className="text-sm text-secondary uppercase tracking-wide mb-2">Fiscal Rules Status</div>
            <div
              className={`text-3xl font-bold ${fiscalImpact.fiscalRulesMet ? 'text-good' : 'text-bad'}`}
            >
              {fiscalImpact.fiscalRulesMet ? 'MET' : 'BREACHED'}
            </div>
            <div
              className={`text-sm font-semibold mt-1 ${
                fiscalImpact.headroom > 10
                  ? 'text-good'
                  : fiscalImpact.headroom > 0
                    ? 'text-warning'
                    : 'text-bad'
              }`}
            >
              {getRuleHeadroomLabel(getFiscalRuleById(chosenFiscalRule as any))}:{' '}
              {fiscalImpact.headroom >= 0 ? '+' : ''}£{fiscalImpact.headroom.toFixed(1)}bn
            </div>
          </div>
        </div>
      </div>

      <div className="bg-bg-surface border border-border-strong p-6">
        <h2 className="text-xl font-bold text-primary mb-2">Policy Pipeline</h2>
        <p className="text-sm text-secondary mb-4">
          Announced measures take time to clear legislation and systems delivery.
        </p>
        {(legislativePipeline || []).length === 0 ? (
          <div className="text-sm text-secondary">No measures in the pipeline.</div>
        ) : (
          <div className="space-y-2">
            {(legislativePipeline || [])
              .slice(-8)
              .reverse()
              .map((item) => (
                <div
                  key={item.measureId}
                  className="border border-border-subtle p-3 text-sm flex justify-between gap-3"
                >
                  <div>
                    <div className="font-semibold text-primary">{item.description}</div>
                    <div className="text-secondary">
                      Effective turn {item.effectiveTurn} · Type {item.type.replace('_', ' ')}
                    </div>
                  </div>
                  <div
                    className={`font-semibold ${item.status === 'delayed' ? 'text-bad' : item.status === 'active' ? 'text-good' : 'text-warning'}`}
                  >
                    {item.status}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      <div className="bg-bg-surface border border-border-strong p-6">
        <h2 className="text-xl font-bold text-primary mb-2">OBR Policy Costings</h2>
        <p className="text-sm text-secondary mb-4">
          Latest certified annual impacts from the independent forecast vintage.
        </p>
        {obrForecast?.policyScorings?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-secondary">
                  <th className="text-left py-2">Measure</th>
                  <th className="text-right py-2">Annual impact</th>
                  <th className="text-right py-2">Certainty</th>
                </tr>
              </thead>
              <tbody>
                {obrForecast.policyScorings.map((row, idx) => (
                  <tr key={`${row.measureDescription}_${idx}`} className="border-b border-border-subtle">
                    <td className="py-2">{row.measureDescription}</td>
                    <td className="py-2 text-right font-semibold">
                      {row.annualImpact_bn >= 0 ? '+' : ''}£{row.annualImpact_bn.toFixed(1)}bn
                    </td>
                    <td className="py-2 text-right">{row.certaintylevel.replace('_', ' ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-sm text-secondary">
            No OBR costing table available until the next Budget or Autumn Statement.
          </div>
        )}
      </div>

      {warnings.length > 0 && (
        <div className="bg-bg-surface border border-border-strong p-6">
          <h2 className="text-xl font-bold text-primary mb-4">Adviser Warnings</h2>
          <div className="space-y-3">
            {warnings.map((warning) => {
              const bgColour =
                warning.severity === 'critical'
                  ? 'bg-bad-subtle border-bad'
                  : warning.severity === 'warning'
                    ? 'bg-warning-subtle border-warning'
                    : 'bg-secondary-subtle border-secondary';
              const titleColour =
                warning.severity === 'critical'
                  ? 'text-bad'
                  : warning.severity === 'warning'
                    ? 'text-warning'
                    : 'text-secondary';
              return (
                <div key={warning.id} className={`border p-4 ${bgColour}`}>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {warning.severity === 'critical' && <span className="text-bad text-lg">⚠</span>}
                      {warning.severity === 'warning' && <span className="text-warning text-lg">⚠</span>}
                      {warning.severity === 'info' && <span className="text-secondary text-lg">ℹ</span>}
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-semibold ${titleColour}`}>{warning.title}</h4>
                      <p className={`text-sm mt-1 ${titleColour}`}>{warning.message}</p>
                      {warning.impact && <p className={`text-sm mt-2 ${titleColour} font-medium`}>Impact: {warning.impact}</p>}
                      <div className="mt-2 text-xs font-semibold text-tertiary uppercase">
                        {warning.category} · {warning.severity}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {warnings.length === 0 && (
        <div className="bg-good-subtle border border-good p-6">
          <div className="flex items-center gap-3 text-good">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <h3 className="font-bold">No Warnings</h3>
              <p className="text-sm text-good">
                Your budget proposals do not trigger any adviser warnings.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
