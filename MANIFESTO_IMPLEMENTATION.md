# Manifesto Pledge One-Click Solutions & Progress Tracking

## Overview

I have implemented a comprehensive system for manifesto pledge management with one-click solutions, progress bars, and advisor recommendations. This implementation fulfils your requirements whilst respecting the constraint that some pledges (like fiscal rules) cannot have one-click solutions because they require careful ongoing fiscal management.

## What Has Been Implemented

### 1. Enhanced Manifesto Pledge Interface

Each manifesto pledge now includes:
- **One-click availability**: Whether the pledge can be fulfilled with a single click
- **One-click type**: Either 'lock-tax-rates' (reverts taxes to starting levels) or 'allocate-spending' (allocates required funding)
- **One-click cost**: Fiscal cost in £bn for spending pledges (£0 for tax locks)
- **One-click description**: Explanation of what the action does
- **Progress type**: 'compliance' (for tax locks), 'achievement' (for measurable targets), or 'outcome' (for long-term goals)
- **Target tracking**: For achievement-type pledges, tracks current vs target values

### 2. One-Click Solutions by Pledge Type

#### Tax Lock Pledges (Always Available)
- **Income tax lock**: Reverts all income tax rates to starting levels
- **National Insurance lock**: Reverts NI rates to starting levels
- **VAT lock**: Reverts VAT to starting level
- **Corporation tax lock**: Reverts corporation tax to starting level
- **Cost**: £0 (no fiscal cost, just policy reversion)

#### Spending & Service Pledges (Conditional Availability)
Examples across all manifestos:
- **NHS appointments** (40,000/week): £1.5bn one-click allocation
- **Teachers** (6,500 new): £525m
- **Police** (13,000 new): £650m
- **Green transition**: £28bn (social-democratic) or £15bn (prudent-progressive)
- **NHS investment**: £7bn for 3.5% real growth
- **Education investment**: £6bn to reach 5% of GDP
- **Housing**: £8bn for 300,000 homes/year
- **Skills training**: £2bn for 500,000 workers
- **Social care**: £10bn for free personal care
- **Child poverty**: £3bn to lift 500,000 children out of poverty

#### Fiscal Rules Pledges (NOT Available)
- **No one-click solution** for fiscal rules pledges
- These require careful ongoing fiscal management
- Cannot be solved in one click as they are outcome-based constraints
- Description explains: "This is an outcome-based pledge that requires careful fiscal management"

### 3. Progress Bars

Three types of progress tracking:

#### Compliance Progress (Tax Locks)
- **100%** (green): Currently keeping the pledge
- **0%** (red): Currently violating the pledge
- Real-time updates based on current tax rates vs starting rates

#### Achievement Progress (Measurable Targets)
- **Percentage**: Progress towards specific targets (e.g., 3,250 / 6,500 teachers = 50%)
- **Colour coding**:
  - Green: 100% achieved
  - Amber: 50-99% achieved
  - Red: 0-49% achieved
- Shows: "X / Y [unit]" (e.g., "3,250 / 6,500 teachers")

#### Outcome Progress (Long-term Goals)
- **Binary tracking**: Either achieved or not
- **Examples**: NHS spending growth pledges, education investment as % of GDP
- Based on violation status or specific outcome metrics

### 4. Advisor Recommendations

Four types of advisor feedback:

#### Warnings (High Priority)
- **Violated pledges**: Alerts when a pledge has been broken, shows political cost
- **At-risk pledges**: Warns when current policies violate a pledge before it's officially broken
- Includes one-click solution information where available

#### Recommendations (Medium/High Priority)
- **Low progress pledges**: Suggests allocating resources when achievement progress <50%
- **Actionable advice**: Provides specific cost information for one-click solutions

#### Trade-off Analysis (High Priority)
- **Automatic analysis** when budget changes would violate pledges
- Shows:
  - Which pledges would be violated
  - Political costs (approval & PM trust)
  - Fiscal benefits/impacts
  - Economic impacts
- Helps you weigh breaking a pledge against the benefits

#### Progress Updates (Low Priority)
- **Positive reinforcement**: Reports when pledges are on track
- **Achievement updates**: Highlights good progress on measurable targets
- Optional (can be enabled/disabled via parameter)

### 5. UI Components

#### Enhanced ManifestoDisplay Component
New features:
- **Colour-coded pledge cards**: Green (keeping), amber (partial progress), red (violated/at risk)
- **Progress bars**: Visual representation of pledge fulfillment status
- **One-click action buttons**: Available for applicable pledges
  - "Quick Fix" (red) for violated pledges
  - "Fulfil Pledge" (blue) for active pledges
  - Shows cost in button text: "Allocate £X.Xbn" or "Revert tax rates"
- **Tooltip descriptions**: Hover over buttons to see what the action does

#### ManifestoWarnings Component
- Already existing, now integrated with new violation checking
- Shows warnings in budget interface when changes would violate pledges

## Integration with Game State

### Required Game State Additions

The game state needs to track:

```typescript
interface FiscalState {
  // ... existing fields ...

  // Starting tax rates (captured at game start)
  startingTaxRates: {
    incomeTaxBasic: number;
    incomeTaxHigher: number;
    incomeTaxAdditional: number;
    niEmployee: number;
    niEmployer: number;
    vat: number;
    corporationTax: number;
  };
}
```

### Using the One-Click System

In `ChancellorGame.tsx` or wherever ManifestoDisplay is rendered:

```typescript
<ManifestoDisplay
  manifestoState={gameState.manifesto}
  showViolationsOnly={false}
  gameState={{
    currentTaxRates: {
      incomeTaxBasic: gameState.fiscal.taxRates.incomeTaxBasic,
      incomeTaxHigher: gameState.fiscal.taxRates.incomeTaxHigher,
      incomeTaxAdditional: gameState.fiscal.taxRates.incomeTaxAdditional,
      niEmployee: gameState.fiscal.taxRates.niEmployee,
      niEmployer: gameState.fiscal.taxRates.niEmployer,
      vat: gameState.fiscal.taxRates.vat,
      corporationTax: gameState.fiscal.taxRates.corporationTax,
    },
    startingTaxRates: gameState.fiscal.startingTaxRates,
    fiscalRuleMet: gameState.fiscal.meetsCurrentFiscalRule,
  }}
  onExecuteOneClick={(result) => {
    if (result.success && result.budgetChanges) {
      // Apply the budget changes
      applyBudgetChanges(result.budgetChanges);
      // Show success message
      alert(result.message);
    } else {
      // Show error/info message
      alert(result.message);
    }
  }}
/>
```

### Using Advisor Recommendations

Generate advice each turn or on-demand:

```typescript
import { generateManifestoAdvice, generateManifestoPerformanceReport } from './manifesto-system';

// In turn processor or advisor panel
const manifestoAdvice = generateManifestoAdvice(
  gameState.manifesto,
  {
    currentTaxRates: { /* ... */ },
    startingTaxRates: { /* ... */ },
    fiscalRuleMet: gameState.fiscal.meetsCurrentFiscalRule,
  },
  true // Include progress updates
);

// Display the advice
manifestoAdvice.forEach(advice => {
  // Render as advisor messages based on type and priority
  console.log(`[${advice.priority.toUpperCase()}] ${advice.title}`);
  console.log(advice.message);
});

// Generate performance report for end-of-year summary
const performanceReport = generateManifestoPerformanceReport(
  gameState.manifesto,
  { currentTaxRates, startingTaxRates, fiscalRuleMet }
);
console.log(`Overall Score: ${performanceReport.overallScore}%`);
console.log(performanceReport.summary);
```

### Using Trade-off Analysis

In the budget interface, before applying changes:

```typescript
import { checkPolicyForViolations, generateTradeOffAnalysis } from './manifesto-system';

// Check if proposed changes would violate pledges
const violationCheck = checkPolicyForViolations(
  gameState.manifesto,
  {
    incomeTaxBasicChange: proposedChanges.incomeTaxBasicChange,
    // ... other changes
  }
);

if (violationCheck.violatedPledges.length > 0) {
  // Generate trade-off analysis
  const tradeOff = generateTradeOffAnalysis(
    gameState.manifesto,
    {
      description: "Increase income tax basic rate by 2pp",
      revenueImpact: 15.2, // £bn
      economicImpact: "Minor negative impact on consumer spending",
    },
    violationCheck
  );

  if (tradeOff) {
    // Show trade-off analysis to user before confirming change
    // Present as advisor warning or confirmation dialogue
    showTradeOffWarning(tradeOff);
  }
}
```

## Testing Checklist

When testing the implementation:

1. **One-click tax locks**: Try raising income tax, then use the one-click button to revert
2. **One-click spending**: Use the quick action to allocate spending to NHS/education pledges
3. **Progress bars**: Watch them update as you change policies
4. **Violated pledges**: Break a pledge, check it shows red with "Quick Fix" button
5. **Fiscal rules**: Confirm they show "No one-click solution available"
6. **Advisor warnings**: Break a pledge and check warnings appear
7. **Trade-off analysis**: Propose a violating change and see the trade-off analysis
8. **Progress report**: Check the overall manifesto performance score
9. **Achievement tracking**: For pledges with targets, verify progress percentages
10. **Different manifestos**: Test with each of the 5 manifesto templates

## Files Modified

- `manifesto-system.tsx`: Complete overhaul with new interfaces, functions, and components
  - Added: `ManifestoPledge` fields for one-click support
  - Added: `executeOneClickAction()` function
  - Added: `calculatePledgeProgress()` function
  - Added: `generateManifestoAdvice()` function
  - Added: `generateTradeOffAnalysis()` function
  - Added: `generateManifestoPerformanceReport()` function
  - Updated: `ManifestoDisplay` component with progress bars and buttons
  - Updated: All 40 pledges across 5 manifesto templates with new fields

## Summary Statistics

- **Total pledges**: 40 across 5 manifestos (8 each)
- **One-click available**: 35 pledges (87.5%)
- **No one-click**: 5 pledges (fiscal rules only)
- **Tax lock pledges**: 20 (cost: £0 each)
- **Spending pledges**: 15 (cost: £0.525bn to £28bn)
- **Progress types**:
  - Compliance: 20 (all tax locks)
  - Achievement: 10 (with specific targets)
  - Outcome: 10 (long-term goals)

## Key Design Decisions

1. **No one-click for fiscal rules**: These are outcome-based constraints that require ongoing fiscal management, not instant fixes

2. **Zero cost for tax locks**: Reverting tax rates has no direct fiscal cost (though it may reduce revenue)

3. **Realistic spending costs**: Based on actual policy costs (e.g., £80k per teacher/year)

4. **Three progress types**: Recognises that different pledges need different tracking methods

5. **Colour-coded visual feedback**: Makes pledge status immediately clear at a glance

6. **Integrated advisor system**: Provides proactive warnings and recommendations

7. **Trade-off analysis**: Helps players make informed decisions about breaking pledges

8. **British English**: All text uses British spelling and terminology throughout

## Next Steps

To complete the integration:

1. **Add starting tax rates tracking** to game-state.tsx initialisation
2. **Connect one-click handler** in ChancellorGame.tsx
3. **Integrate advisor recommendations** into adviser panel UI
4. **Add trade-off warnings** to budget confirmation flow
5. **Test thoroughly** with all manifesto templates
6. **Update save/load** to handle new pledge fields (currentValue)

The core functionality is now complete and ready for integration!
