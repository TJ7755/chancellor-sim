import React from 'react';
import { FISCAL_RULES, FiscalRuleId, getFiscalRuleById } from '../../game-integration';

interface ManifestoConstraint {
  id: string;
  description: string;
  type: 'tax_lock' | 'spending_pledge' | 'fiscal_rule';
  violated: boolean;
  severity: 'critical' | 'major' | 'minor';
}

interface ConstraintsViewProps {
  constraints: ManifestoConstraint[];
  chosenFiscalRule: FiscalRuleId;
  proposedFiscalRule: FiscalRuleId;
  onProposedFiscalRuleChange: (rule: FiscalRuleId) => void;
  onConfirmFiscalRuleChange: () => void;
  onApplyManifestoCommitment: (constraintId: string) => void;
  barnettPreview: {
    scotland: number;
    wales: number;
    northernIreland: number;
    total: number;
  };
}

export const ConstraintsView: React.FC<ConstraintsViewProps> = ({
  constraints,
  chosenFiscalRule,
  proposedFiscalRule,
  onProposedFiscalRuleChange,
  onConfirmFiscalRuleChange,
  onApplyManifestoCommitment,
  barnettPreview,
}) => {
  const renderConstraint = (constraint: ManifestoConstraint) => {
    const statusColour = constraint.violated
      ? constraint.severity === 'critical'
        ? 'text-bad'
        : 'text-warning'
      : 'text-good';
    const bgColour = constraint.violated
      ? constraint.severity === 'critical'
        ? 'bg-bad-subtle border-bad'
        : 'bg-warning-subtle border-warning'
      : 'bg-good-subtle border-good';

    const canApply =
      constraint.violated &&
      [
        'nhs_pledge',
        'defence_pledge',
        'triple_lock',
        'income_tax_lock',
        'ni_lock',
        'vat_lock',
        'corporation_tax_lock',
      ].includes(constraint.id);

    return (
      <div key={constraint.id} className={`border p-4 ${bgColour}`}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {constraint.violated ? (
                <span className={`${statusColour} text-lg`}>✕</span>
              ) : (
                <span className={`${statusColour} text-lg`}>✓</span>
              )}
              <h4 className="font-semibold text-primary">{constraint.description}</h4>
            </div>
            <div className="mt-1 flex gap-2">
              <span
                className={`text-xs px-2 py-0.5 ${
                  constraint.type === 'fiscal_rule'
                    ? 'bg-secondary-subtle text-secondary'
                    : constraint.type === 'spending_pledge'
                      ? 'bg-warning-subtle text-warning'
                      : 'bg-bad-subtle text-bad'
                }`}
              >
                {constraint.type.replace('_', ' ')}
              </span>
              <span
                className={`text-xs px-2 py-0.5 ${
                  constraint.severity === 'critical'
                    ? 'bg-bad-subtle text-bad'
                    : constraint.severity === 'major'
                      ? 'bg-warning-subtle text-warning'
                      : 'bg-subdued text-tertiary'
                }`}
              >
                {constraint.severity}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {canApply && (
              <button
                onClick={() => onApplyManifestoCommitment(constraint.id)}
                className="px-4 py-2 bg-secondary hover:bg-secondary-hover text-white text-sm font-semibold transition-colors"
                title="Automatically adjust values to the minimum required to satisfy this commitment"
              >
                Apply
              </button>
            )}
            <div className={`text-right font-bold ${statusColour}`}>{constraint.violated ? 'VIOLATED' : 'MET'}</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-bg-surface border border-border-strong p-6">
        <h2 className="text-xl font-bold text-primary mb-2">Manifesto Commitments</h2>
        <p className="text-sm text-secondary mb-4">
          Your manifesto commitments and fiscal rules. Breaking these will have serious political
          consequences.
        </p>
        <div className="space-y-3">{constraints.map((constraint) => renderConstraint(constraint))}</div>

        <div className="mt-6 pt-6 border-t border-border-strong space-y-3">
          <h3 className="text-lg font-bold text-primary">Change fiscal framework</h3>
          <p className="text-sm text-secondary">
            Changing the fiscal framework mid-term is a high-risk decision and will carry immediate
            credibility and political costs on the next turn.
          </p>
          <div className="flex gap-3 items-center">
            <select
              value={proposedFiscalRule}
              onChange={(e) => onProposedFiscalRuleChange(e.target.value as FiscalRuleId)}
              className="px-3 py-2 border border-border-strong text-sm"
            >
              {FISCAL_RULES.map((rule) => (
                <option key={rule.id} value={rule.id}>
                  {rule.name}
                </option>
              ))}
            </select>
            <button
              onClick={onConfirmFiscalRuleChange}
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-white font-semibold"
              disabled={proposedFiscalRule === chosenFiscalRule}
            >
              Change fiscal framework
            </button>
          </div>
        </div>
      </div>

      <div className="bg-secondary-subtle border border-secondary p-6">
        <div className="flex items-start gap-3">
          <svg
            className="w-6 h-6 text-secondary flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <h3 className="font-bold text-secondary mb-1">About Fiscal Rules</h3>
            <p className="text-sm text-secondary mb-2">
              The Stability Rule requires the current budget (day-to-day spending) to be in balance by the
              fifth year of the forecast. The Investment Rule requires public sector net financial liabilities
              to be falling as a share of GDP by the fifth year.
            </p>
            <p className="text-sm text-secondary">
              These targets are verified by the Office for Budget Responsibility (OBR) and are legally binding
              under the Charter for Budget Responsibility. Breaching fiscal rules will trigger severe market
              reaction and political crisis.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-bg-surface border border-border-strong p-4">
        <h3 className="text-lg font-bold text-primary mb-2">Barnett Consequentials Preview</h3>
        <p className="text-sm text-secondary mb-3">
          Automatic consequential payments generated by England programme changes.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
          <div className="border border-border-subtle p-2">
            <div className="text-secondary">Scotland</div>
            <div className="text-lg font-bold">£{barnettPreview.scotland.toFixed(1)}bn</div>
          </div>
          <div className="border border-border-subtle p-2">
            <div className="text-secondary">Wales</div>
            <div className="text-lg font-bold">£{barnettPreview.wales.toFixed(1)}bn</div>
          </div>
          <div className="border border-border-subtle p-2">
            <div className="text-secondary">Northern Ireland</div>
            <div className="text-lg font-bold">£{barnettPreview.northernIreland.toFixed(1)}bn</div>
          </div>
          <div className="border border-secondary bg-secondary-subtle p-2">
            <div className="text-secondary">Total Barnett</div>
            <div className="text-lg font-bold">£{barnettPreview.total.toFixed(1)}bn</div>
          </div>
        </div>
      </div>
    </div>
  );
};
