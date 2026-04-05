import React, { useMemo } from 'react';

interface SpendingChange {
  id: string;
  department: string;
  programme?: string;
  currentBudget: number;
  proposedBudget: number;
  type: 'resource' | 'capital';
}

interface SpendingControlsProps {
  spending: Map<string, SpendingChange>;
  onSpendingChange: (spendingId: string, newBudget: number) => void;
  localGovernmentGrantSettlement: number;
  onLocalGovernmentGrantSettlementChange: (value: number) => void;
  councilTaxReferendumCap: number;
  onCouncilTaxReferendumCapChange: (value: number) => void;
  devolution: {
    localGov: {
      centralGrant_bn: number;
      coreSettlement_bn: number;
      adultSocialCarePressure_bn: number;
      councilFundingStress: number;
      localGovStressIndex: number;
      section114Count: number;
    };
    nations: {
      scotland: { blockGrant_bn: number; barnettBaseline_bn: number; politicalTension: number };
      wales: { blockGrant_bn: number; barnettBaseline_bn: number; politicalTension: number };
      northernIreland: { blockGrant_bn: number; barnettBaseline_bn: number; politicalTension: number };
    };
    barnettConsequentialMultiplier: number;
  };
  barnettPreview: {
    scotland: number;
    wales: number;
    northernIreland: number;
    total: number;
  };
  fiscalImpact: {
    deficitChange: number;
    projectedDeficit: number;
    fiscalRulesMet: boolean;
    headroom: number;
  };
  nhsAnnualTargetTotal: number;
  statePensionAnnualTarget: number;
  currentNHSTotal: number;
  expandedDepartments: Set<string>;
  onToggleDepartment: (department: string) => void;
}

export const SpendingControls: React.FC<SpendingControlsProps> = ({
  spending,
  onSpendingChange,
  localGovernmentGrantSettlement,
  onLocalGovernmentGrantSettlementChange,
  councilTaxReferendumCap,
  onCouncilTaxReferendumCapChange,
  devolution,
  barnettPreview,
  fiscalImpact,
  nhsAnnualTargetTotal,
  statePensionAnnualTarget,
  currentNHSTotal,
  expandedDepartments,
  onToggleDepartment,
}) => {
  const spendingByDepartment = useMemo(() => {
    const grouped = new Map<string, SpendingChange[]>();
    spending.forEach((item) => {
      const dept = item.department;
      if (!grouped.has(dept)) {
        grouped.set(dept, []);
      }
      grouped.get(dept)!.push(item);
    });
    return grouped;
  }, [spending]);

  const renderSpendingControl = (item: SpendingChange) => {
    const isDebtInterest = item.id === 'debtInterest';
    const change = item.proposedBudget - item.currentBudget;
    const changePct = item.currentBudget > 0 ? (change / item.currentBudget) * 100 : 0;
    const changeColour = change > 0 ? 'text-accent' : change < 0 ? 'text-status-bad' : 'text-tertiary';

    let targetBudget: number | null = null;
    let targetLabel = '';

    if (
      ['nhsEngland', 'nhsPrimaryCare', 'nhsMentalHealth', 'publicHealth', 'socialCare', 'nhsCapital'].includes(item.id) &&
      currentNHSTotal > 0 &&
      currentNHSTotal < nhsAnnualTargetTotal - 0.01
    ) {
      const nhsShare = item.currentBudget / currentNHSTotal;
      targetBudget = nhsAnnualTargetTotal * nhsShare;
      targetLabel = 'NHS annual target';
    } else if (item.id === 'statePension' && item.currentBudget < statePensionAnnualTarget - 0.01) {
      targetBudget = statePensionAnnualTarget;
      targetLabel = 'Triple lock annual target';
    }

    return (
      <div
        key={item.id}
        className={`bg-transparent border p-4 ${
          isDebtInterest ? 'border-border-custom bg-transparent/50' : 'border-border-custom hover:border-accent'
        }`}
      >
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h4 className="font-semibold text-primary">{item.programme || item.department}</h4>
            <div className="flex flex-wrap gap-2 items-center mt-1">
              <span className="text-xs text-tertiary">{item.department}</span>
              <span
                className={`text-xs px-2 py-0.5 ${
                  item.type === 'capital'
                    ? 'bg-accent-subtle text-accent border border-accent'
                    : 'bg-secondary-subtle text-secondary border border-secondary'
                }`}
              >
                {item.type === 'capital' ? 'Capital' : 'Resource'}
              </span>
              {targetBudget && (
                <span className="text-xs px-2 py-0.5 bg-warning-subtle text-warning border border-warning">
                  {targetLabel}
                </span>
              )}
              {isDebtInterest && (
                <span className="text-xs px-2 py-0.5 bg-transparent text-muted border-b border-border-strong">
                  Non-Discretionary
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-mono font-semibold text-primary">
              £{item.proposedBudget.toFixed(1)}
              <span className="text-sm font-normal text-tertiary">bn</span>
            </div>
            {change !== 0 && (
              <div className={`text-sm font-semibold ${changeColour}`}>
                {change > 0 ? '+' : ''}£{change.toFixed(1)}bn ({changePct > 0 ? '+' : ''}
                {changePct.toFixed(1)}%)
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-tertiary uppercase tracking-wide">
            {isDebtInterest ? 'Current interest commitment' : 'Proposed budget'}
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-tertiary">£</span>
            <input
              type="number"
              min={0}
              step={0.1}
              value={Number.isFinite(item.proposedBudget) ? item.proposedBudget : ''}
              disabled={isDebtInterest}
              onChange={(e) => {
                if (isDebtInterest) return;
                const parsed = parseFloat(e.target.value);
                const nextValue = Number.isFinite(parsed) ? Math.max(0, parsed) : item.currentBudget;
                onSpendingChange(item.id, nextValue);
              }}
              className={`w-full border px-3 py-2 text-primary ${
                isDebtInterest
                  ? 'bg-transparent border-border-custom text-muted cursor-not-allowed'
                  : 'bg-transparent border-border-custom'
              }`}
            />
            <span className="text-sm text-tertiary">bn</span>
          </div>
          <div className="flex justify-between text-xs text-tertiary">
            <span className="font-semibold text-secondary">Current: £{item.currentBudget.toFixed(1)}bn</span>
            {targetBudget && <span className="font-semibold text-warning">Target: £{targetBudget.toFixed(1)}bn</span>}
            {!isDebtInterest && <span>Minimum: £0.0bn</span>}
          </div>

          {isDebtInterest && (
            <div className="mt-2 p-3 bg-accent-subtle border border-accent text-xs text-accent leading-relaxed">
              <div className="flex gap-2">
                <span className="font-semibold">Note:</span>
                <span>
                  Interest payments are non-discretionary. To reduce interest costs, reduce the deficit and/or lower the
                  total debt stock.
                </span>
              </div>
            </div>
          )}
        </div>

        {targetBudget && Math.abs(item.proposedBudget - targetBudget) > 0.01 && (
          <div className="mt-3 pt-3 border-t border-border-custom">
            <button
              onClick={() => onSpendingChange(item.id, targetBudget!)}
              className="w-full px-3 py-2 bg-warning-subtle hover:bg-warning-subtle/80 text-warning text-sm font-semibold border border-warning transition-colors"
            >
              Set to target (£{targetBudget.toFixed(1)}bn)
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="bg-bg-surface border border-border-strong p-4">
        <h3 className="text-lg font-bold text-primary">Local Government</h3>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="border border-border-subtle p-3">
            <label className="text-sm font-semibold text-tertiary">
              Local government grant settlement (£bn)
            </label>
            <input
              type="number"
              min={20}
              max={60}
              step={0.1}
              value={localGovernmentGrantSettlement}
              onChange={(e) => onLocalGovernmentGrantSettlementChange(Number(e.target.value))}
              className="w-full mt-2 border border-border-strong px-2 py-1 text-sm"
            />
            <div className="text-xs text-secondary mt-2">
              Delta:{' '}
              {localGovernmentGrantSettlement - (devolution.localGov.centralGrant_bn || 30) >= 0
                ? '+'
                : ''}
              £
              {(
                localGovernmentGrantSettlement - (devolution.localGov.centralGrant_bn || 30)
              ).toFixed(1)}
              bn
            </div>
          </div>
          <div className="border border-border-subtle p-3">
            <label className="text-sm font-semibold text-tertiary">Council tax referendum cap (%)</label>
            <input
              type="number"
              min={3}
              max={10}
              step={0.1}
              value={councilTaxReferendumCap}
              onChange={(e) => onCouncilTaxReferendumCapChange(Number(e.target.value))}
              className="w-full mt-2 border border-border-strong px-2 py-1 text-sm"
            />
            <div className="text-xs text-secondary mt-2">
              Higher caps reduce central grant pressure but increase household tax pressure.
            </div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="border border-border-subtle p-2">
            <div className="text-secondary">Core settlement</div>
            <div className="text-xl font-bold">
              £{(devolution.localGov.coreSettlement_bn || 0).toFixed(1)}bn
            </div>
          </div>
          <div className="border border-border-subtle p-2">
            <div className="text-secondary">Adult social care pressure</div>
            <div className="text-xl font-bold">
              £{(devolution.localGov.adultSocialCarePressure_bn || 0).toFixed(1)}bn
            </div>
          </div>
          <div className="border border-border-subtle p-2">
            <div className="text-secondary">Funding gap</div>
            <div className="text-xl font-bold">
              £
              {Math.max(
                0,
                (devolution.localGov.adultSocialCarePressure_bn || 0) -
                  (devolution.localGov.coreSettlement_bn || 0)
              ).toFixed(1)}
              bn
            </div>
          </div>
          <div className="border border-border-subtle p-2">
            <div className="text-secondary">Stress index</div>
            <div className="text-xl font-bold">
              {(
                devolution.localGov.councilFundingStress ||
                devolution.localGov.localGovStressIndex ||
                0
              ).toFixed(0)}
            </div>
          </div>
        </div>
        {(devolution.localGov.section114Count || 0) > 0 && (
          <div className="mt-3 text-sm text-bad bg-bad-subtle border border-bad px-3 py-2">
            Section 114 notices this term: {devolution.localGov.section114Count}
          </div>
        )}
      </div>

      <div className="bg-bg-surface border border-border-strong p-4">
        <h3 className="text-lg font-bold text-primary mb-2">Devolution and Barnett Consequentials</h3>
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

      {Array.from(spendingByDepartment.entries()).map(([department, items]) => {
        const isExpanded = expandedDepartments.has(department);
        const totalCurrent = items.reduce((sum, item) => sum + item.currentBudget, 0);
        const totalProposed = items.reduce((sum, item) => sum + item.proposedBudget, 0);
        const change = totalProposed - totalCurrent;

        return (
          <div key={department} className="bg-elevated border border-border-subtle">
            <button
              onClick={() => onToggleDepartment(department)}
              className="w-full px-6 py-4 flex justify-between items-center hover:bg-subdued transition-colors"
            >
              <div className="flex items-center gap-3">
                <svg
                  className={`w-5 h-5 text-secondary transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <div className="text-left">
                  <h3 className="text-lg font-bold text-primary">{department}</h3>
                  <p className="text-sm text-secondary">
                    {items.length} programme{items.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">£{totalProposed.toFixed(1)}bn</div>
                {change !== 0 && (
                  <div className={`text-sm font-semibold ${change > 0 ? 'text-secondary' : 'text-bad'}`}>
                    {change > 0 ? '+' : ''}£{change.toFixed(1)}bn
                  </div>
                )}
              </div>
            </button>

            {isExpanded && (
              <div className="px-6 pb-6 pt-2 border-t border-border-subtle">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {items.map((item) => renderSpendingControl(item))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
