import React from 'react';

interface DebtViewProps {
  issuanceStrategy: 'short' | 'balanced' | 'long';
  onStrategyChange: (strategy: 'short' | 'balanced' | 'long') => void;
  debtManagement: {
    refinancingRisk: number;
    strategyYieldEffect_bps?: number;
    rolloverRiskPremium_bps?: number;
    projectedDebtInterestByStrategy_bn?: {
      short: number;
      balanced: number;
      long: number;
    };
  };
  debtInterest_bn: number;
  assetPurchaseFacility_bn: number;
}

export const DebtView: React.FC<DebtViewProps> = ({
  issuanceStrategy,
  onStrategyChange,
  debtManagement,
  debtInterest_bn,
  assetPurchaseFacility_bn,
}) => {
  return (
    <div className="bg-bg-surface border border-border-strong p-6 space-y-4">
      <h2 className="text-xl font-bold text-primary">Debt Management</h2>
      <p className="text-sm text-secondary">
        Choose issuance strategy before advancing turn. Short lowers near-term cost but raises refinancing
        risk.
      </p>
      <div className="text-sm text-secondary bg-secondary-subtle border border-secondary p-3">
        Active strategy:{' '}
        <span className="font-semibold capitalize">{issuanceStrategy}</span> · Yield
        effect:{' '}
        <span className="font-semibold">
          {(debtManagement.strategyYieldEffect_bps || 0) >= 0 ? '+' : ''}
          {(debtManagement.strategyYieldEffect_bps || 0).toFixed(0)} bps
        </span>
        {issuanceStrategy === 'short' && (
          <span>
            {' '}
            · Rollover risk premium:{' '}
            <span className="font-semibold">
              +{(debtManagement.rolloverRiskPremium_bps || 0).toFixed(0)} bps
            </span>
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div className="border border-border-subtle p-3">
          <div className="text-secondary">Refinancing risk</div>
          <div className="text-2xl font-bold">{debtManagement.refinancingRisk.toFixed(1)}</div>
        </div>
        <div className="border border-border-subtle p-3">
          <div className="text-secondary">APF stock (QE/QT)</div>
          <div className="text-2xl font-bold">
            £{(assetPurchaseFacility_bn || 0).toFixed(0)}bn
          </div>
        </div>
        <div className="border border-border-subtle p-3">
          <div className="text-secondary">Debt interest</div>
          <div className="text-2xl font-bold">£{debtInterest_bn.toFixed(1)}bn</div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div className="border border-border-subtle p-3">
          <div className="text-secondary">Projected annual interest (Short)</div>
          <div className="text-xl font-bold">
            £
            {(
              debtManagement.projectedDebtInterestByStrategy_bn?.short ??
              debtInterest_bn
            ).toFixed(1)}
            bn
          </div>
        </div>
        <div className="border border-border-subtle p-3">
          <div className="text-secondary">Projected annual interest (Balanced)</div>
          <div className="text-xl font-bold">
            £
            {(
              debtManagement.projectedDebtInterestByStrategy_bn?.balanced ??
              debtInterest_bn
            ).toFixed(1)}
            bn
          </div>
        </div>
        <div className="border border-border-subtle p-3">
          <div className="text-secondary">Projected annual interest (Long)</div>
          <div className="text-xl font-bold">
            £
            {(
              debtManagement.projectedDebtInterestByStrategy_bn?.long ??
              debtInterest_bn
            ).toFixed(1)}
            bn
          </div>
        </div>
      </div>
      <div className="mt-4">
        <label className="text-sm font-semibold text-tertiary">Issuance strategy</label>
        <select
          value={issuanceStrategy}
          onChange={(e) => onStrategyChange(e.target.value as 'short' | 'balanced' | 'long')}
          className="w-full mt-2 border border-border-strong px-3 py-2 text-sm"
        >
          <option value="short">Short (lower near-term cost, higher rollover risk)</option>
          <option value="balanced">Balanced</option>
          <option value="long">Long (higher near-term cost, lower rollover risk)</option>
        </select>
      </div>
    </div>
  );
};
