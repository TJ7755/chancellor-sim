import React, { useCallback } from 'react';
import { calculateLafferPoint, getLafferTaxTypeForControlId } from '../../laffer-analysis';

interface TaxChange {
  id: string;
  name: string;
  currentRate: number;
  proposedRate: number;
  currentRevenue: number;
  projectedRevenue: number;
  unit: string;
}

interface TaxControlsProps {
  taxes: Map<string, TaxChange>;
  onTaxChange: (taxId: string, newRate: number) => void;
  welfareLevers: {
    ucTaperRate: number;
    workAllowanceMonthly: number;
    childcareSupportRate: number;
  };
  onWelfareLeversChange: (levers: TaxControlsProps['welfareLevers']) => void;
  fiscalState: {
    ucTaperRate: number;
    workAllowanceMonthly: number;
    childcareSupportRate: number;
    thresholdUprating: 'frozen' | 'cpi_linked' | 'earnings_linked' | 'custom';
    fullExpensing: boolean;
    antiAvoidanceInvestment_bn: number;
    hmrcSystemsInvestment_bn: number;
  };
  thresholdUprating: 'frozen' | 'cpi_linked' | 'earnings_linked' | 'custom';
  onThresholdUpratingChange: (value: 'frozen' | 'cpi_linked' | 'earnings_linked' | 'custom') => void;
  fullExpensing: boolean;
  onFullExpensingChange: (value: boolean) => void;
  antiAvoidanceInvestment: number;
  onAntiAvoidanceInvestmentChange: (value: number) => void;
  hmrcSystemsInvestment: number;
  onHmrcSystemsInvestmentChange: (value: number) => void;
  planningReformPackage: boolean;
  onPlanningReformPackageChange: (value: boolean) => void;
  infrastructureGuarantees: number;
  onInfrastructureGuaranteesChange: (value: number) => void;
  htbSupport: number;
  onHtbSupportChange: (value: number) => void;
  councilHousingGrant: number;
  onCouncilHousingGrantChange: (value: number) => void;
  selectedIndustrialInterventions: Set<string>;
  onSelectedIndustrialInterventionsChange: (ids: Set<string>) => void;
  industrialStrategy: {
    activeInterventions: Array<{ id: string }>;
    totalAnnualCost_bn: number;
    productivityBoostAccumulated: number;
    stateAidRisk: number;
  };
  housing: {
    planningReformPackage: boolean;
    infrastructureGuarantees_bn: number;
    htbAndSharedOwnership_bn: number;
    councilHouseBuildingGrant_bn: number;
  };
  gameState: any;
}

const THRESHOLD_TAX_IDS = new Set([
  'personalAllowance',
  'higherRateThreshold',
  'additionalRateThreshold',
  'marriageAllowance',
  'inheritanceTaxThreshold',
  'niPrimaryThreshold',
  'niUpperEarningsLimit',
  'niSecondaryThreshold',
  'employmentAllowance',
  'vatRegistrationThreshold',
  'annualInvestmentAllowance',
  'cgtAnnualExempt',
  'ihtResidenceNilRate',
  'sdltFirstTimeBuyerThreshold',
  'pensionAnnualAllowance',
  'isaAllowance',
  'dividendAllowance',
  'badrLifetimeLimit',
]);

const TAX_RECKONERS: Record<string, number> = {
  incomeTaxBasic: 7.0,
  incomeTaxHigher: 2.0,
  incomeTaxAdditional: 0.2,
  employeeNI: 6.0,
  employerNI: 8.5,
  vat: 7.5,
  corporationTax: 3.2,
  stampDuty: 1.5,
  corporationTaxSmall: 0.4,
  capitalGainsBasic: 0.5,
  capitalGainsHigher: 0.7,
  inheritanceTax: 0.19,
  fuelDuty: 0.5,
  councilTax: 0.46,
  businessRates: 0.58,
  alcoholDuty: 0.13,
  tobaccoDuty: 0.09,
  airPassengerDuty: 0.04,
  vehicleExciseDuty: 0.044,
  personalAllowance: -6.2,
  higherRateThreshold: -0.8,
  additionalRateThreshold: -0.05,
  marriageAllowance: -0.25,
  inheritanceTaxThreshold: -0.01,
  niPrimaryThreshold: -4.5,
  niUpperEarningsLimit: -0.3,
  niSecondaryThreshold: -5.0,
  employmentAllowance: -0.5,
  vatRegistrationThreshold: -0.01,
  annualInvestmentAllowance: -0.002,
  cgtAnnualExempt: -0.4,
  ihtResidenceNilRate: -0.02,
  sdltFirstTimeBuyerThreshold: -0.004,
  pensionAnnualAllowance: -0.1,
  isaAllowance: -0.02,
  dividendAllowance: -0.9,
  badrLifetimeLimit: -0.0005,
  vatDomesticEnergy: 0.7,
  vatPrivateSchools: 0.085,
  rdTaxCredit: -0.2,
  bankSurcharge: 1.0,
  energyProfitsLevy: 0.15,
  patentBoxRate: -0.08,
  cgtResidentialSurcharge: 0.3,
  badrRate: 0.1,
  sdltAdditionalSurcharge: 0.5,
  insurancePremiumTax: 0.66,
  softDrinksLevy: 0.003,
};

function getTaxRateLimits(tax: TaxChange): { min: number; max: number } {
  if (tax.unit === '%' || tax.unit === 'Index' || tax.unit === 'p/£') {
    return { min: 0, max: 100 };
  }
  if (tax.unit === 'p/litre') {
    return { min: 0, max: 200 };
  }
  if (tax.unit === '£') {
    return { min: 0, max: Math.max(1000, tax.currentRate * 2) };
  }
  if (tax.unit === 'System') {
    return { min: 0, max: 100 };
  }
  return { min: 0, max: 1000000 };
}

function clampTaxRate(tax: TaxChange, newRate: number): number {
  const { min, max } = getTaxRateLimits(tax);
  return Math.min(max, Math.max(min, newRate));
}

function calculateRevenueImpact(tax: TaxChange): number {
  const rateChange = tax.proposedRate - tax.currentRate;
  const reckoner = TAX_RECKONERS[tax.id as keyof typeof TAX_RECKONERS];
  if (!reckoner) return 0;
  if (THRESHOLD_TAX_IDS.has(tax.id)) {
    return reckoner * (rateChange / 1000);
  }
  return reckoner * rateChange;
}

export const TaxControls: React.FC<TaxControlsProps> = ({
  taxes,
  onTaxChange,
  welfareLevers,
  onWelfareLeversChange,
  fiscalState,
  thresholdUprating,
  onThresholdUpratingChange,
  fullExpensing,
  onFullExpensingChange,
  antiAvoidanceInvestment,
  onAntiAvoidanceInvestmentChange,
  hmrcSystemsInvestment,
  onHmrcSystemsInvestmentChange,
  planningReformPackage,
  onPlanningReformPackageChange,
  infrastructureGuarantees,
  onInfrastructureGuaranteesChange,
  htbSupport,
  onHtbSupportChange,
  councilHousingGrant,
  onCouncilHousingGrantChange,
  selectedIndustrialInterventions,
  onSelectedIndustrialInterventionsChange,
  industrialStrategy,
  housing,
  gameState,
}) => {
  const handleTaxInput = useCallback(
    (taxId: string, newRate: number) => {
      const tax = taxes.get(taxId);
      if (tax) {
        onTaxChange(taxId, clampTaxRate(tax, newRate));
      }
    },
    [taxes, onTaxChange]
  );

  const renderTaxControl = (tax: TaxChange) => {
    const change = tax.proposedRate - tax.currentRate;
    const changeColour = change > 0 ? 'text-status-bad' : change < 0 ? 'text-status-good' : 'text-tertiary';
    const { min: minRate, max: maxRate } = getTaxRateLimits(tax);

    const isThreshold = THRESHOLD_TAX_IDS.has(tax.id);
    let step: number;
    if (tax.unit === 'p/litre') {
      step = 0.01;
    } else if (isThreshold) {
      if (tax.currentRate >= 100000) step = 5000;
      else if (tax.currentRate >= 10000) step = 500;
      else step = 100;
    } else if (tax.unit === '£') {
      step = 1;
    } else {
      step = 0.1;
    }

    const formatValue = (val: number): string => {
      if (isThreshold && tax.currentRate >= 100000) {
        return `£${(val / 1000).toFixed(0)}k`;
      }
      if (tax.unit === '£') return val.toFixed(0);
      if (tax.unit === 'p/litre') return val.toFixed(2);
      return val.toFixed(1);
    };

    const revenueLabel =
      tax.currentRevenue > 0
        ? `Current revenue: £${tax.currentRevenue.toFixed(1)}bn`
        : isThreshold
          ? 'Threshold/Allowance'
          : '';
    const lafferTaxType = getLafferTaxTypeForControlId(tax.id);
    const lafferPeak = lafferTaxType ? calculateLafferPoint(lafferTaxType, gameState as any) : null;

    return (
      <div
        key={tax.id}
        className="bg-transparent border-b border-border-strong p-4 hover:border-accent transition-colors"
      >
        <div className="flex justify-between items-start mb-3">
          <div>
            <h4 className="font-semibold text-primary">{tax.name}</h4>
            {revenueLabel && <p className="text-sm text-tertiary">{revenueLabel}</p>}
          </div>
          <div className="text-right">
            <div className="text-xl font-mono font-semibold text-primary">
              {isThreshold && tax.currentRate >= 100000
                ? `£${(tax.proposedRate / 1000).toFixed(0)}k`
                : `${formatValue(tax.proposedRate)}`}
              {!(isThreshold && tax.currentRate >= 100000) && (
                <span className="text-sm font-normal text-tertiary ml-1">{tax.unit}</span>
              )}
            </div>
            {change !== 0 && (
              <div className={`text-sm font-semibold ${changeColour}`}>
                {change > 0 ? '+' : ''}
                {isThreshold && tax.currentRate >= 100000
                  ? `£${(change / 1000).toFixed(1)}k`
                  : `${formatValue(change)}${tax.unit}`}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-tertiary uppercase tracking-wide">Proposed value</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step={step}
              min={minRate}
              max={maxRate}
              value={Number.isFinite(tax.proposedRate) ? tax.proposedRate : ''}
              onChange={(e) => {
                const parsed = parseFloat(e.target.value);
                handleTaxInput(tax.id, Number.isFinite(parsed) ? parsed : tax.currentRate);
              }}
              className="w-full border-b border-border-strong bg-transparent px-3 py-2 text-primary"
            />
            <span className="text-sm text-tertiary min-w-[4rem]">{tax.unit}</span>
          </div>
          <div className="text-xs text-tertiary">
            Current:{' '}
            <span className="font-semibold text-secondary">
              {formatValue(tax.currentRate)}
              {isThreshold && tax.currentRate >= 100000 ? '' : tax.unit}
            </span>
          </div>
        </div>

        {change !== 0 && (
          <div className="mt-3 pt-3 border-t border-border-custom">
            <div className="text-sm text-secondary">
              Revenue impact:{' '}
              <span className={`font-semibold ${changeColour}`}>
                {calculateRevenueImpact(tax) >= 0 ? '+' : ''}£{calculateRevenueImpact(tax).toFixed(2)}bn
              </span>
            </div>
          </div>
        )}

        {lafferPeak !== null && (
          <div className="mt-3 text-xs text-secondary bg-transparent border-b border-border-strong p-2">
            Est. revenue peak: {lafferPeak.toFixed(1)}%
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-bg-surface border border-border-strong p-6">
        <h2 className="text-xl font-bold text-primary mb-2">Income Tax Rates</h2>
        <p className="text-sm text-secondary mb-4">Revenue: £269bn · Affects 34 million taxpayers</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {renderTaxControl(taxes.get('incomeTaxBasic')!)}
          {renderTaxControl(taxes.get('incomeTaxHigher')!)}
          {renderTaxControl(taxes.get('incomeTaxAdditional')!)}
        </div>
      </div>

      <div className="bg-bg-surface border border-border-strong p-6">
        <h2 className="text-xl font-bold text-primary mb-2">Welfare and Labour Market Levers</h2>
        <p className="text-sm text-secondary mb-4">
          AME measures: reducing taper or increasing work allowances and childcare support can lower
          structural unemployment over time, but increase welfare spending.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-border-subtle p-3">
            <label className="text-sm font-semibold text-tertiary">Universal Credit taper rate</label>
            <input
              type="number"
              min={35}
              max={75}
              step={1}
              value={welfareLevers.ucTaperRate}
              onChange={(e) => onWelfareLeversChange({ ...welfareLevers, ucTaperRate: Number(e.target.value) })}
              className="w-full mt-2 border border-border-strong px-2 py-1 text-sm"
            />
            <div className="text-xs text-secondary mt-2">
              Delta: {welfareLevers.ucTaperRate - fiscalState.ucTaperRate >= 0 ? '+' : ''}
              {(welfareLevers.ucTaperRate - fiscalState.ucTaperRate).toFixed(0)}pp
            </div>
          </div>
          <div className="border border-border-subtle p-3">
            <label className="text-sm font-semibold text-tertiary">Work allowance</label>
            <input
              type="number"
              min={200}
              max={700}
              step={10}
              value={welfareLevers.workAllowanceMonthly}
              onChange={(e) =>
                onWelfareLeversChange({ ...welfareLevers, workAllowanceMonthly: Number(e.target.value) })
              }
              className="w-full mt-2 border border-border-strong px-2 py-1 text-sm"
            />
            <div className="text-xs text-secondary mt-2">
              Delta:{' '}
              {welfareLevers.workAllowanceMonthly - fiscalState.workAllowanceMonthly >= 0 ? '+' : ''}£
              {(welfareLevers.workAllowanceMonthly - fiscalState.workAllowanceMonthly).toFixed(0)}/month
            </div>
          </div>
          <div className="border border-border-subtle p-3">
            <label className="text-sm font-semibold text-tertiary">Childcare support rate</label>
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={welfareLevers.childcareSupportRate}
              onChange={(e) =>
                onWelfareLeversChange({ ...welfareLevers, childcareSupportRate: Number(e.target.value) })
              }
              className="w-full mt-2 border border-border-strong px-2 py-1 text-sm"
            />
            <div className="text-xs text-secondary mt-2">
              Delta:{' '}
              {welfareLevers.childcareSupportRate - fiscalState.childcareSupportRate >= 0 ? '+' : ''}
              {(welfareLevers.childcareSupportRate - fiscalState.childcareSupportRate).toFixed(0)}pp
            </div>
          </div>
        </div>
      </div>

      <div className="bg-bg-surface border border-border-strong p-6">
        <h2 className="text-xl font-bold text-primary mb-2">Income Tax Thresholds and Allowances</h2>
        <p className="text-sm text-secondary mb-4">
          Frozen thresholds drag more earners into higher bands (fiscal drag). Moving thresholds has enormous
          revenue impact.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {renderTaxControl(taxes.get('personalAllowance')!)}
          {renderTaxControl(taxes.get('higherRateThreshold')!)}
          {renderTaxControl(taxes.get('additionalRateThreshold')!)}
          {renderTaxControl(taxes.get('marriageAllowance')!)}
        </div>
      </div>

      <div className="bg-bg-surface border border-border-strong p-6">
        <h2 className="text-xl font-bold text-primary mb-2">Threshold and Base Policy</h2>
        <p className="text-sm text-secondary mb-4">
          Choose uprating regime, anti-avoidance capacity, and housing-supply policy levers that influence
          inflation, labour supply, and medium-term revenue.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="border border-border-subtle p-3">
            <label className="text-sm font-semibold text-tertiary">Threshold uprating</label>
            <select
              value={thresholdUprating}
              onChange={(e) => onThresholdUpratingChange(e.target.value as typeof thresholdUprating)}
              className="w-full mt-2 border border-border-strong px-2 py-1 text-sm"
            >
              <option value="frozen">Frozen</option>
              <option value="cpi_linked">CPI-linked</option>
              <option value="earnings_linked">Earnings-linked</option>
              <option value="custom">Custom thresholds</option>
            </select>
            <div className="text-xs text-secondary mt-2">
              {thresholdUprating === 'frozen' && 'Raises revenue through fiscal drag.'}
              {thresholdUprating === 'cpi_linked' && 'Keeps thresholds moving with inflation.'}
              {thresholdUprating === 'earnings_linked' &&
                'Looser than inflation-linking, with a larger revenue cost.'}
              {thresholdUprating === 'custom' && 'Use the threshold controls above for bespoke settings.'}
            </div>
          </div>
          <div className="border border-border-subtle p-3">
            <label className="text-sm font-semibold text-tertiary">Full expensing</label>
            <select
              value={fullExpensing ? 'enabled' : 'disabled'}
              onChange={(e) => onFullExpensingChange(e.target.value === 'enabled')}
              className="w-full mt-2 border border-border-strong px-2 py-1 text-sm"
            >
              <option value="disabled">Disabled</option>
              <option value="enabled">Enabled</option>
            </select>
            <div className="text-xs text-secondary mt-2">
              Corp tax cost ~£3.5bn/yr, higher investment quality.
            </div>
          </div>
          <div className="border border-border-subtle p-3">
            <label className="text-sm font-semibold text-tertiary">HMRC anti-avoidance spend</label>
            <input
              type="number"
              min={0}
              max={3}
              step={0.1}
              value={antiAvoidanceInvestment}
              onChange={(e) => onAntiAvoidanceInvestmentChange(Number(e.target.value))}
              className="w-full mt-2 border border-border-strong px-2 py-1 text-sm"
            />
            <div className="text-sm text-tertiary mt-2">£{antiAvoidanceInvestment.toFixed(1)}bn</div>
          </div>
          <div className="border border-border-subtle p-3">
            <label className="text-sm font-semibold text-tertiary">HMRC systems investment</label>
            <input
              type="number"
              min={0.3}
              max={1.5}
              step={0.1}
              value={hmrcSystemsInvestment}
              onChange={(e) => onHmrcSystemsInvestmentChange(Number(e.target.value))}
              className="w-full mt-2 border border-border-strong px-2 py-1 text-sm"
            />
            <div className="text-sm text-tertiary mt-2">£{hmrcSystemsInvestment.toFixed(1)}bn</div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="border border-border-subtle p-3">
            <label className="text-sm font-semibold text-tertiary">Planning reform package</label>
            <select
              value={planningReformPackage ? 'active' : 'inactive'}
              onChange={(e) => onPlanningReformPackageChange(e.target.value === 'active')}
              className="w-full mt-2 border border-border-strong px-2 py-1 text-sm"
            >
              <option value="inactive">Inactive</option>
              <option value="active">Active</option>
            </select>
          </div>
          <div className="border border-border-subtle p-3">
            <label className="text-sm font-semibold text-tertiary">Infrastructure guarantees</label>
            <input
              type="number"
              min={0}
              max={10}
              step={0.5}
              value={infrastructureGuarantees}
              onChange={(e) => onInfrastructureGuaranteesChange(Number(e.target.value))}
              className="w-full mt-2 border border-border-strong px-2 py-1 text-sm"
            />
            <div className="text-sm text-tertiary mt-2">£{infrastructureGuarantees.toFixed(1)}bn</div>
          </div>
          <div className="border border-border-subtle p-3">
            <label className="text-sm font-semibold text-tertiary">Demand-side support</label>
            <input
              type="number"
              min={0}
              max={5}
              step={0.1}
              value={htbSupport}
              onChange={(e) => onHtbSupportChange(Number(e.target.value))}
              className="w-full mt-2 border border-border-strong px-2 py-1 text-sm"
            />
            <div className="text-sm text-tertiary mt-2">£{htbSupport.toFixed(1)}bn</div>
          </div>
          <div className="border border-border-subtle p-3">
            <label className="text-sm font-semibold text-tertiary">Council house building grant</label>
            <input
              type="number"
              min={0}
              max={3}
              step={0.1}
              value={councilHousingGrant}
              onChange={(e) => onCouncilHousingGrantChange(Number(e.target.value))}
              className="w-full mt-2 border border-border-strong px-2 py-1 text-sm"
            />
            <div className="text-sm text-tertiary mt-2">£{councilHousingGrant.toFixed(1)}bn</div>
          </div>
        </div>
      </div>

      <div className="bg-bg-surface border border-border-strong p-6">
        <h2 className="text-xl font-bold text-primary mb-2">Industrial Strategy</h2>
        <p className="text-sm text-secondary mb-4">
          Select interventions to activate at this fiscal event. Outcomes are uncertain and revealed after
          delivery lags.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(gameState?.industrialInterventionCatalogue || []).map((intervention: any) => {
            const alreadyActive = (industrialStrategy.activeInterventions || []).some(
              (item: any) => item.id === intervention.id
            );
            const selected = selectedIndustrialInterventions.has(intervention.id);
            return (
              <div key={intervention.id} className="border border-border-subtle p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-primary">{intervention.name}</div>
                    <div className="text-xs text-secondary mt-1">
                      £{intervention.annualCost_bn.toFixed(1)}bn/yr · Lag {intervention.turnsToEffect} turns ·
                      Success {(intervention.successProbability * 100).toFixed(0)}%
                    </div>
                  </div>
                  <button
                    disabled={alreadyActive}
                    onClick={() => {
                      const next = new Set(selectedIndustrialInterventions);
                      if (next.has(intervention.id)) next.delete(intervention.id);
                      else next.add(intervention.id);
                      onSelectedIndustrialInterventionsChange(next);
                    }}
                    className={`px-3 py-1 text-xs font-semibold ${alreadyActive ? 'bg-subdued text-muted cursor-not-allowed' : selected ? 'bg-secondary-subtle border border-secondary text-secondary' : 'bg-subdued border border-border-strong text-tertiary'}`}
                  >
                    {alreadyActive ? 'Active' : selected ? 'Selected' : 'Select'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 text-sm text-tertiary">
          Active annual cost: £{(industrialStrategy.totalAnnualCost_bn || 0).toFixed(1)}bn ·
          Productivity boost: +{(industrialStrategy.productivityBoostAccumulated || 0).toFixed(2)}pp
          · State aid risk: {(industrialStrategy.stateAidRisk || 0).toFixed(0)}
        </div>
      </div>

      <div className="bg-bg-surface border border-border-strong p-6">
        <h2 className="text-xl font-bold text-primary mb-2">National Insurance</h2>
        <p className="text-sm text-secondary mb-4">
          Revenue: £164bn · Employee rate (Class 1) and employer contributions. Thresholds determine who pays.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {renderTaxControl(taxes.get('employeeNI')!)}
          {renderTaxControl(taxes.get('employerNI')!)}
          {renderTaxControl(taxes.get('niPrimaryThreshold')!)}
          {renderTaxControl(taxes.get('niUpperEarningsLimit')!)}
          {renderTaxControl(taxes.get('niSecondaryThreshold')!)}
          {renderTaxControl(taxes.get('employmentAllowance')!)}
        </div>
      </div>

      <div className="bg-bg-surface border border-border-strong p-6">
        <h2 className="text-xl font-bold text-primary mb-2">VAT and Indirect Consumption Taxes</h2>
        <p className="text-sm text-secondary mb-4">
          Revenue: £171bn · Standard rate, reduced rates, and exemptions. VAT on energy and school fees are
          politically charged.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {renderTaxControl(taxes.get('vat')!)}
          {renderTaxControl(taxes.get('vatDomesticEnergy')!)}
          {renderTaxControl(taxes.get('vatPrivateSchools')!)}
          {renderTaxControl(taxes.get('vatRegistrationThreshold')!)}
          {renderTaxControl(taxes.get('insurancePremiumTax')!)}
        </div>
      </div>

      <div className="bg-bg-surface border border-border-strong p-6">
        <h2 className="text-xl font-bold text-primary mb-2">Corporation Tax and Business Taxes</h2>
        <p className="text-sm text-secondary mb-4">
          Revenue: £88bn · Main rate, small profits rate, and business reliefs. Investment incentives affect
          business decisions.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {renderTaxControl(taxes.get('corporationTax')!)}
          {renderTaxControl(taxes.get('corporationTaxSmall')!)}
          {renderTaxControl(taxes.get('businessRates')!)}
          {renderTaxControl(taxes.get('annualInvestmentAllowance')!)}
          {renderTaxControl(taxes.get('rdTaxCredit')!)}
          {renderTaxControl(taxes.get('patentBoxRate')!)}
          {renderTaxControl(taxes.get('bankSurcharge')!)}
          {renderTaxControl(taxes.get('energyProfitsLevy')!)}
        </div>
      </div>

      <div className="bg-bg-surface border border-border-strong p-6">
        <h2 className="text-xl font-bold text-primary mb-2">Capital Gains Tax</h2>
        <p className="text-sm text-secondary mb-4">
          Revenue: £15bn · Rates, annual exempt amount, and entrepreneur reliefs. Residential property has a
          surcharge.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {renderTaxControl(taxes.get('capitalGainsBasic')!)}
          {renderTaxControl(taxes.get('capitalGainsHigher')!)}
          {renderTaxControl(taxes.get('cgtAnnualExempt')!)}
          {renderTaxControl(taxes.get('cgtResidentialSurcharge')!)}
          {renderTaxControl(taxes.get('badrRate')!)}
          {renderTaxControl(taxes.get('badrLifetimeLimit')!)}
        </div>
      </div>

      <div className="bg-bg-surface border border-border-strong p-6">
        <h2 className="text-xl font-bold text-primary mb-2">Inheritance Tax</h2>
        <p className="text-sm text-secondary mb-4">
          Revenue: £7.5bn · Rate, nil-rate band, and residence nil-rate band. Only ~4% of estates pay IHT.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {renderTaxControl(taxes.get('inheritanceTax')!)}
          {renderTaxControl(taxes.get('inheritanceTaxThreshold')!)}
          {renderTaxControl(taxes.get('ihtResidenceNilRate')!)}
        </div>
      </div>

      <div className="bg-bg-surface border border-border-strong p-6">
        <h2 className="text-xl font-bold text-primary mb-2">Property Transaction Taxes</h2>
        <p className="text-sm text-secondary mb-4">
          Revenue: £14bn · Stamp duty rates, first-time buyer relief, and second-home surcharge.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {renderTaxControl(taxes.get('stampDuty')!)}
          {renderTaxControl(taxes.get('sdltAdditionalSurcharge')!)}
          {renderTaxControl(taxes.get('sdltFirstTimeBuyerThreshold')!)}
          {renderTaxControl(taxes.get('councilTax')!)}
        </div>
      </div>

      <div className="bg-bg-surface border border-border-strong p-6">
        <h2 className="text-xl font-bold text-primary mb-2">Savings and Investment Reliefs</h2>
        <p className="text-sm text-secondary mb-4">
          Allowances for pensions, ISAs, and dividends. Reducing these raises revenue but affects savings
          incentives.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {renderTaxControl(taxes.get('pensionAnnualAllowance')!)}
          {renderTaxControl(taxes.get('isaAllowance')!)}
          {renderTaxControl(taxes.get('dividendAllowance')!)}
        </div>
      </div>

      <div className="bg-bg-surface border border-border-strong p-6">
        <h2 className="text-xl font-bold text-primary mb-2">Excise Duties</h2>
        <p className="text-sm text-secondary mb-4">
          Revenue: £59bn · Fuel, alcohol, tobacco, air travel, and vehicle duties.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {renderTaxControl(taxes.get('fuelDuty')!)}
          {renderTaxControl(taxes.get('alcoholDuty')!)}
          {renderTaxControl(taxes.get('tobaccoDuty')!)}
          {renderTaxControl(taxes.get('airPassengerDuty')!)}
          {renderTaxControl(taxes.get('vehicleExciseDuty')!)}
          {renderTaxControl(taxes.get('softDrinksLevy')!)}
        </div>
      </div>
    </div>
  );
};
