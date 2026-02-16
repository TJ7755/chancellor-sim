# UK Chancellor Simulation - Economic Engine

This is the **core economic simulation engine** for the UK Chancellor game. It implements all the economic formulas and relationships from the design documents, with no political systems or events yet.

## What This Does

This economic engine simulates:

- **GDP growth** with fiscal multipliers, monetary policy effects, and productivity spillovers
- **Inflation** using a hybrid Phillips curve (persistence + expectations + domestic pressure + import prices)
- **Unemployment** via Okun's Law (-0.35 coefficient)
- **Wage growth** via the Phillips curve
- **Tax revenues** for all major UK taxes (Income Tax, NI, VAT, Corp Tax, CGT, Fuel Duty, Council Tax)
  - Each with proper elasticities and lag structures (1-6 months)
- **Debt dynamics** with non-linear market reactions
- **Gilt yields** responding to debt/GDP ratios and deficits
- **Bank of England** interest rate decisions via Taylor Rule
- **NHS service quality** degradation based on funding levels

## Key Features

✅ **Realistic lag structures**: Corporation tax responds to GDP from 6 months ago, income tax from 2 months ago, etc.

✅ **Feedback loops**: Higher spending → GDP boost → higher tax revenues (but also higher deficits → higher yields)

✅ **Non-linear effects**: Debt/GDP above 100% causes accelerating market concern

✅ **Service degradation**: NHS quality falls -0.4 to -1.5 per month if underfunded

## How to Run

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Development Server

```bash
npm start
```

The app will open at `http://localhost:3000`

## How to Use

### Controls

- **Income Tax Rate slider**: Change the basic rate from 15% to 30% (baseline: 20%)
- **VAT Rate slider**: Change VAT from 15% to 25% (baseline: 20%)
- **NHS Spending slider**: Adjust NHS budget from £150bn to £250bn (baseline: £180bn)

### Buttons

- **Advance 1 Month**: Process one month of simulation
- **Auto-Advance**: Run the simulation continuously (1 month per second)
- **Reset**: Return to July 2024 starting conditions

### What to Watch

1. **Economic Indicators** (top left): GDP growth, inflation, unemployment, wages
2. **Fiscal Position** (top middle): Revenue, spending, deficit, debt
3. **Tax Revenues** (top right): See how each tax responds to policy changes and economic conditions
4. **Markets** (bottom left): Bank Rate, gilt yields, mortgage rates
5. **Public Services** (bottom middle): NHS quality and waiting lists
6. **Historical Trends** (bottom): Simple bar charts showing GDP growth, inflation, and debt over time

## Testing Economic Relationships

### Experiment 1: Boost NHS Spending

1. Increase NHS spending to £220bn (+£40bn)
2. Advance several months
3. **Observe**:
   - Deficit increases immediately
   - GDP growth rises gradually (fiscal multiplier = 0.8)
   - Tax revenues increase slightly (lagged)
   - NHS quality improves (with 6-month lag)
   - Debt/GDP rises
   - Gilt yields rise (market concern about deficit)

### Experiment 2: Raise Income Tax

1. Increase basic rate to 22% (+2pp)
2. Advance several months
3. **Observe**:
   - Income tax revenue rises with 2-month lag
   - GDP growth slows (negative multiplier)
   - Unemployment rises slightly
   - Inflation falls a bit (weaker demand)
   - Deficit shrinks
   - Debt/GDP improves

### Experiment 3: Cut VAT

1. Reduce VAT to 17.5% (-2.5pp)
2. Advance several months
3. **Observe**:
   - VAT revenue falls immediately (no lag)
   - Inflation drops by ~1.25pp (50% pass-through)
   - GDP growth increases (consumption boost)
   - Deficit worsens significantly
   - Real wages improve (lower prices)

### Experiment 4: Let It Run

1. Click "Auto-Advance"
2. Let it run for 24+ months
3. **Observe**:
   - GDP trend growth around 1.5%
   - NHS quality gradually deteriorating (baseline funding insufficient)
   - Debt/GDP slowly rising
   - Gilt yields creeping up
   - Waiting lists growing

## Key Economic Parameters

From `/design/economic-formulas.json`:

| Parameter | Value | Effect |
|-----------|-------|--------|
| **Trend GDP growth** | 1.5% annual | Base growth rate |
| **Okun coefficient** | -0.35 | 1% GDP above trend → 0.35pp lower unemployment |
| **Income tax GDP elasticity** | 1.10 | Income tax grows faster than GDP (progressive) |
| **VAT consumption elasticity** | 1.15 | VAT very sensitive to consumption |
| **Corp tax GDP elasticity** | 1.30 | Corporate profits highly cyclical |
| **NHS maintenance funding** | 2.5% real growth | Below this → quality degrades |
| **Debt sensitivity (yields)** | 3-9bp per pp | Non-linear above 100% debt/GDP |

## Formula Highlights

### GDP Growth (Monthly)
```
growth = base_trend
       + fiscal_impulse
       + monetary_impulse
       + productivity_effect
       + output_gap_convergence
```

### Inflation (CPI)
```
CPI = 0.40 × CPI[t-1]                    [persistence]
    + 0.35 × expectations                [forward-looking]
    + 0.15 × (output_gap + wages)        [demand pressure]
    + 0.10 × import_prices               [cost-push]
```

### Income Tax Revenue
```
IT[t] = base × (1 + rate_change)
             × (1 + GDP_growth[t-2])^1.10
```

### NHS Quality Degradation
```
degradation = -0.40 to -1.50 per month (if real growth < 2.5%)
```

## What's Missing (Intentionally)

This is JUST the economic engine. Not included:

- ❌ Political approval system
- ❌ Events (strikes, market crises, backbench revolts)
- ❌ Full Budget UI (only 3 controls for testing)
- ❌ News generation
- ❌ Advisors
- ❌ Win/lose conditions
- ❌ OBR forecasts
- ❌ IFS verdicts

These will be added in later phases once the core economic model is validated.

## Validation

The model should replicate realistic UK fiscal outcomes:

- **Starting position** (July 2024): 0.6% growth, 2% inflation, 4.2% unemployment, 4.1% deficit, 98% debt/GDP ✅
- **Trend growth**: ~1.5% annually if no major policy changes ✅
- **NHS degradation**: Quality falls if real growth < 2.5% ✅
- **Debt dynamics**: Rising debt → rising yields ✅
- **Tax elasticities**: Income tax most GDP-sensitive, VAT most consumption-sensitive ✅

## File Structure

```
chancellor-sim/
├── src/
│   ├── economic-engine.tsx   ← Main simulation engine (this file)
│   ├── index.tsx             ← React entry point
│   └── index.css             ← Tailwind styles
├── public/
│   └── index.html
├── package.json
├── tsconfig.json
└── tailwind.config.js
```

## Next Steps

Once the economic engine is validated:

1. ✅ Add full Budget UI (all 12+ taxes, all departments)
2. ✅ Add political approval calculations
3. ✅ Add event system (market crises, strikes, etc.)
4. ✅ Add OBR forecast generation
5. ✅ Add news headlines
6. ✅ Add save/load system
7. ✅ Add charts (proper time series with Recharts)

## Architecture Notes

- **Pure functions**: All calculation functions are pure (no side effects)
- **Immutable state**: State updates create new objects
- **Lag handling**: Historical snapshots stored for lag lookback (last 24 months)
- **Modular**: Each calculation function is independent and testable

## Questions?

Check the design documents:
- `/design/economic-model.md` - Complete formula specifications
- `/design/economic-formulas.json` - All parameters in executable format
- `/design/architecture.md` - Full technical architecture

---

**Have fun breaking the economy!** 🏛️💸📉
