# Copilot Instructions for Chancellor Simulator

## Economic Model Calibration (Updated Feb 2026)

### Wage Growth
- **Formula**: `wageGrowth = CPI * 1.0 + productivity + tightness * 0.8`
- **Rationale**: CPI coefficient set to 1.0. Real wage growth must track productivity at equilibrium.

### Gilt Yields
- **Calibration**: July 2024 baseline is ~4.15% (10y).
- **Formula**: `termPremium = -1.0 - (bankRate - 3.25) * 0.05`.
- **Target**: At Bank Rate 5.25%, termPremium should be ~-1.10.
- **Sensitivity**: Policy sensitivity kept low (0.05) to avoid conflating expectations with term premium.

### Corporation Tax
- **Elasticity**: 1.05 (was 1.3).
- **Rationale**: Matches OBR estimates. Avoid excessive revenue volatility.

### Political Mechanics
- **Backbench Drift**: Target is 55 (mild pro-incumbent). Setting it to 50 creates a hostile spiral.
- **Approval Ceiling**: 70%. Higher values break the political feedback loops (trust/backbench satisfaction).

## General
- Adhere to these calibrated values when suggesting code changes or explaining mechanics.
- Prioritize "Realistic" difficulty settings when discussing game balance.

## New Engine Notes (Feb 2026)

- Fiscal rule breaches are now tracked separately as `fiscal.fiscalRuleBreaches`; they must not increment manifesto violation counters.
- PM intervention `comply` choices now enforce concrete policy consequences by trigger reason; do not treat comply as purely reputational.
- `simulation.lastTurnDelta` captures post-turn explainers for approval, gilt yield, and deficit changes; keep contributor labels concise and numeric.
- `simulation.obrForecastSnapshot` and `simulation.lastObrComparison` are updated in April turns for forecast-vs-outturn credibility effects.
- Participation/inactivity are part of `economic` state (`participationRate`, `economicInactivity`) and are updated in the labour-market step.
- Active implementation risks are stored in `gameState.policyRiskModifiers` with `turnsRemaining`; turn processing decrements/removes them automatically.
- Sector industrial-action/revolt state is persisted in `services` cooldown and duration counters; avoid retrigger spam by respecting cooldowns.

## Phase 2 Invariants (Spending, Debt, Parliament, External, Housing, Devolution, Distribution)

- New Phase 2 top-level state slices are part of `GameState`: `spendingReview`, `debtManagement`, `parliamentary`, `externalSector`, `financialStability`, `devolution`, `distributional`.
- `createInitialGameState()` and `normalizeLoadedState()` must provide backward-compatible defaults for every new field (`??` fallback behaviour for old saves).
- Fiscal input buffering for Lords scrutiny uses `fiscal.pendingBudgetChange` and `fiscal.pendingBudgetApplyTurn`; delayed changes should not write directly to derived outputs.
- `deficit_bn` and `debtNominal_bn` remain write-once-per-turn in `calculateFiscalBalance()` only, even when adding AME growth, Barnett consequentials, FPC constraints, or debt-management effects.
- Automatic fiscal add-ons are treated as named TME contributors: welfare AME pressure, housing AME pressure, Barnett consequentials, and FPC constraint cost.
- Difficulty scaling must apply to new macro/external shock pathways via `getDifficultySettings()`; avoid hard-coded high-volatility branches that bypass mode scaling.
- Whip/distribution effects should flow through MP stance generation (`calculateAllMPStances`) rather than ad-hoc vote overrides.
- Spending Review credibility and committee inquiry effects are reputational/political modifiers; do not bypass existing trust/credibility channels with direct game-over writes.
- Keep state immutable: all updates via copied objects/arrays/maps, never in-place mutation.


UK Chancellor economic/political simulation game built with React 25, TypeScript, and Tailwind CSS.

## Commands

```bash
npm start        # Dev server at http://localhost:3000
npm run build    # Production build
npm test         # Run all tests (jest via react-scripts)
npm test -- --testPathPattern=<file>  # Run a single test file
```

No linter configured beyond the default `react-app` ESLint config included via react-scripts.

## Architecture

The game is a turn-based simulation where the player acts as UK Chancellor. All logic lives in `src/` as `.tsx` files (even non-UI modules).

### State Management
- **`game-state.tsx`** — Defines the master `GameState` type (aggregates `EconomicState`, `FiscalState`, `MarketState`, `ServicesState`, `PoliticalState`, `AdviserSystem`, `MPSystemState`, etc.) and exposes a React Context (`GameStateContext`) + `GameActions`.
- State is **immutable**: all updates use spread operator and return new objects. Never mutate state directly.
- Persisted to `localStorage` on every change; MP data (650 MPs) is stored separately in IndexedDB.

### Turn Simulation
- **`turn-processor.tsx`** — `processTurn(state: GameState): GameState` is the core engine. It runs an 18-step monthly calculation sequence:
  1. Fiscal year rollover → productivity → GDP → employment → inflation → wages → Bank Rate → tax revenues → spending → fiscal balance → fiscal rule compliance → markets → service quality → public sector pay → approval → backbench satisfaction → MP stances → PM trust → PM intervention → PM communications → events → credit rating → historical snapshot → game-over check
- `processTurn` is the **only place** that writes `deficit_bn` / `debtNominal_bn` — do not update those fields anywhere else.
- `applyBudgetChanges()` (in `game-state.tsx`) updates only fiscal *inputs* (tax rates, spending amounts); `processTurn` derives all outputs.

### Module Responsibilities
| File | Role |
|---|---|
| `game-integration.tsx` | Initialization functions (`createInitialEconomicState()` etc.) and the `FISCAL_RULES` array / `FiscalRuleId` type |
| `budget-system.tsx` | Budget UI and all tax/spending controls (~3,969 lines) |
| `mp-system.tsx` | 650 MP simulation, voting, lobbying (~2,878 lines) |
| `political-system.tsx` | Approval ratings, party dynamics |
| `events-media.tsx` | Random event generation and newspaper headline logic |
| `adviser-system.tsx` | Adviser hire/fire, opinion generation |
| `manifesto-system.tsx` | Manifesto pledge tracking and violation checks |
| `projections-engine.tsx` | OBR-style forward projections |
| `social-media-system.tsx` | Public sentiment / social media feed |
| `pm-system.tsx` / `pm-messages-screen.tsx` | PM relationship and communications |
| `dashboard.tsx` | Main dashboard view |
| `ChancellorGame.tsx` | Top-level React component, wires everything together |

### Data Templates (`src/data/`)
Static arrays of templates consumed at runtime:
- `pm-messages.ts` — PM communication templates with metadata conditions
- `adviser-opinions.ts` — Adviser feedback triggered by economic metrics
- `newspaper-headlines.ts` — Headlines matched to game conditions
- `social-media-posts.ts` — Public sentiment posts
- `mp-interactions.ts` — MP response outcome templates

Templates use `{placeholder}` tokens (e.g., `{deficit}`, `{month}`) substituted at call time.

---

## Economic Engine — Formulas & Algorithms

All formulas are in `turn-processor.tsx`. Baseline values reflect July 2024 UK starting conditions.

### Productivity (Step 0.7)
```
productivityGrowth = 0.10 (baseline annual %)
  + (currentCapital / 141.4 - 1) × 0.06          // capital investment effect
  + tanh((nhsQuality - 62) / 18) × 0.25           // health supply-side
  + tanh((eduQuality - 68) / 18) × 0.30           // education human capital
  + tanh((innovationOutput - 55) / 20) × 0.35     // R&D effect
  + tanh((infraQuality - 58) / 22) × 0.18         // infrastructure
  + (25 - corpTaxRate) × 0.015 (or × 0.010 below 25%) // corp tax environment
  + (rdTaxCredit - 27) × 0.008                    // R&D credits
  + (annualInvestmentAllowance - 1,000,000) / 500,000 × 0.05

// Gradual adjustment: target = prev + (calculated - prev) × 0.08
// Clamped to [-0.5%, 2.5%]
```

### GDP Growth (Step 1)
```
trendGrowth = (productivityGrowthAnnual + 0.50 labourForceGrowth)
              + (1.5 - rawTrend) × 0.06   // pull toward 1.5% potential

slackMultiplier = clamp(1 + (unemploymentRate - 4.5) × 0.12, 0.9, 1.4)

// Spending demand impact (per £bn change from baseline / nominalGDP × 100 / 12):
//   NHS current: ×0.70, Education: ×0.65, Welfare: ×0.70
//   Defence: ×0.45, Other current: ×0.50, Capital: ×0.65
//   All × slackMultiplier; dampened when CPI > 3 or GDP above potential

// Tax demand effects:
//   Income tax: -(basicΔ×7×0.45 + higherΔ×2×0.18 + additionalΔ×0.2×0.12) / GDP × 100 × 0.35 × slack / 12
//   Employee NI: -(rateΔ×6×0.5) / GDP × 100 × 0.35 × slack / 12
//   Employer NI: -(rateΔ×8.5×0.25) / GDP × 100 × 0.20 × slack / 12
//   VAT: -(rateΔ×7.5×0.45) / GDP × 100 × 0.35 × slack / 12
//   Corp tax (supply-side): -(rateΔ×0.3×0.5×0.3) / GDP × 100 / 12
//   Corp tax > 30%: additional -(rate-30) × 0.008 / 12 penalty
//   Top rate > 50%: additional -(rate-50) × 0.003 / 12 penalty

// Supply-side:
//   NHS: (nhsQuality - 62) × 0.002 / 12
//   Education: (eduQuality - 68) × 0.003 / 12
//   Infrastructure: (infraQuality - 58) × 0.002 / 12

// Monetary: (giltYield10y - 4.15) × -0.015 / 12
// Sterling: (sterlingIndex - 100) × -0.0008 / 12
// Random shock: ±0.06 × macroShockScale

// Monthly growth clamped to [-0.25%, +0.25%]
// nominalGDPGrowth = realGrowth + CPI/12
```

### Unemployment (Step 2 — Okun's Law)
```
baseNAIRU = 4.25%
adjustedNAIRU = baseNAIRU
  + (employerNIRate > 15) × (rate - 15) × 0.02
  + (corpTaxRate > 30) × (rate - 30) × 0.015
  + (effectiveMarginalRate > 93) × (rate - 93) × 0.04
  // effectiveMarginalRate = basicRate + employeeNI + 63

unemploymentPressure = (gdpGrowthAnnual - 1.75) × -0.45 / 12  // Okun coeff = -0.45
newUnemployment += (adjustedNAIRU - newUnemployment) × 0.04   // NAIRU reversion
// Clamped [3.0%, 12.0%]
```

### Inflation (Step 3 — Hybrid Phillips Curve)
```
inflationAnchorHealth [0-100]:
  CPI > 8%: -4/month; CPI > 5%: -2/month; CPI > 3.5%: -0.5/month
  CPI < 3% and realRate > 1%: +1/month; CPI < 2.5%: +0.5/month

anchorWeight = anchorHealth / 100

CPI = CPI × 0.20                                        // persistence
    + (2.0 × anchorWeight + recentCPI × (1-anchorWeight)) × 0.55  // expectations
    + (2.0 + unemploymentGap × 0.5) × 0.15              // Phillips curve
    + (2.0 + sterlingChange × 8.0) × 0.10               // import prices
    + (vatRate - 20) × 0.04                              // VAT pass-through
    + max(0, realWageGap - 2.0) × 0.1                   // wage-price spiral
    + random ±0.25 × inflationShockScale
// If anchorHealth < 50, max CPI raised to 20%; otherwise 12%
```

### Wage Growth (Step 4)
```
wageGrowth = CPI × 0.6 + productivityGrowthAnnual + max(0, 4.25 - unemployment) × 0.8
// Gradual: prev + (target - prev) × 0.2; clamped [0%, 15%]
```

### Bank Rate (Step 5 — Taylor Rule)
```
neutralRate = 3.25%
inflationForecast = CPI × 0.7 + (2.0 + wagePressure × 0.15) × 0.3
taylorRate = 3.25 + 1.5 × (inflationForecast - 2.0) + 0.5 × (gdpGrowthAnnual - 1.0)
adjustment = (taylorRate - currentRate) × 0.08  // gradual, rounds to nearest 0.25%
// Clamped [0.1%, 8.0%]
```

### Tax Revenues (Step 6)
```
nominalGDPRatio = gdpNominal_bn / 2750  // 2750 = July 2024 baseline

incomeTax = (285 + basicΔ×7 + higherΔ×2 + additionalΔ×0.2 - avoidanceLoss) × nominalGDPRatio^1.1
  // additionalRate > 50%: avoidanceLoss = 54 × (1.016^excess - 1) × taxAvoidanceScale

NI = (175 + employeeΔ×6 + employerΔ×8.5 - avoidanceLoss) × nominalGDPRatio^1.0
  // employeeNI > 12%: exponential avoidance @ ~2%/pp
  // employerNI > 15%: exponential avoidance @ ~2.5%/pp

VAT = (192 + rateΔ×7.5 - behavioralLoss) × nominalGDPRatio^1.0
  // vatRate > 20%: consumptionReduction = (1.02^excess - 1) × taxAvoidanceScale

corpTax = (94 + rateΔ×3.2 - avoidanceLoss) × nominalGDPRatio^1.3
  // corpTaxRate > 30%: avoidanceLoss uses 1.035^excess factor

otherRevenue = 323 × nominalGDPRatio^0.8
totalRevenue = (sum + revenueAdjustment_bn) × adviserBonuses.taxRevenueMultiplier
```

### Fiscal Balance (Step 8)
```
TME = totalSpending_bn + debtInterest_bn + emergencyRebuildingCosts
deficit_bn = TME - totalRevenue_bn
debtNominal_bn += deficit_bn / 12     // monthly debt accumulation
debtPctGDP = debtNominal_bn / gdpNominal_bn × 100
fiscalHeadroom_bn = max(0, revenue - (currentSpending - capitalSpending) - debtInterest - emergencyCosts)
```
> **Critical**: Never write to `deficit_bn` or `debtNominal_bn` outside `calculateFiscalBalance()`.

### Gilt Yields & Markets (Step 9)
```
termPremium = clamp(-0.18 - (bankRate - 3.25) × 0.06, -0.35, 0.6)
baseYield = bankRate + termPremium

debtPremium:
  debt > 80%: (debt - 80) × 0.02 × marketReactionScale
  debt > 100%: additional (debt - 100) × 0.05 × marketReactionScale
deficitPremium = max(0, (deficit% - 3) × 0.15 × marketReactionScale)
trendPremium = (debtTrend × 0.4 + deficitTrend × 0.3) × marketReactionScale  // clamped ±0.6
vigilantePremium = (deficitTrend - 0.8) × 0.5 × marketReactionScale  // if deficitTrend > 0.8
credibilityDiscount = (credibilityIndex - 50) × -0.008
creditRatingPremium: AAA=-0.2, AA+=-0.1, AA=0, AA-=-0.1→+0.1, A+=+0.3, A=+0.5

// LDI panic (realistic mode only): if yield spike > 50bps in one month,
//   triggers feedback loop (+150% of excess); persists until -20bps/month reversal

giltYield10y = baseYield + all premiums  (smoothed: prev + Δ × 0.3, or ×1.0 in LDI panic)
giltYield2y = 10y + spread2y   (spread2y ≈ 0.10 - curveSlope × 0.35)
giltYield30y = 10y + spread30y (spread30y ≈ 0.55 + curveSlope × 0.25)
mortgageRate = (bankRate + giltYield2y) / 2 + 1.6

sterlingIndex = 100 + bankRateDiff×1.5 - fiscalRiskPremium×2.0
              + (approval-40)×0.15 + (credibility-50)×0.1 - vigilantePremium×4.0
```

### Service Quality (Step 10)
```
// General service metric evolution (evolveServiceMetric):
realRatio = (programmeBudget / CPI-deflated) / demandAdjustedBaseline
  realRatio > 1.08 → +0.55/month
  1.01–1.08      → +0.22/month
  0.95–1.01      → -0.08/month
  0.88–0.95      → -0.35/month
  < 0.88         → -0.75/month

// NHS-specific (demand grows 3.5%/yr; baseline £180.4bn):
nhsQualityChange:
  realGrowth > 10% → +0.5 + log(realGrowth/10+1)×0.15 (logarithmic)
  0–10%           → +0.5
  -1.5 to 0%      → +0.1
  -3.5 to -1.5%   → -0.3
  < -3.5%         → -0.8
// Lag coefficient: improvements 0.30/month, cuts 0.50/month
// Diminishing returns above quality 75 (×0.4) and 85 (×0.2)

// Education similar structure; demand grows 2%/yr; baseline £116bn
// Infrastructure: demand + 2%/yr inflation-indexed; natural decay -0.05/month
// All affected by: difficulty.spendingEfficiencyScale, adviserBonuses.spendingEfficiencyMultiplier
```

### Credit Rating (Step 17, every 6 months)
```
score:
  debt < 85%: +2; < 95%: +1; < 105%: 0; else: -1
  deficit < 2%: +2; < 3%: +1; < 5%: 0; else: -1
  yield < 4.5%: +1; < 5.5%: 0; else: -1
  credibility > 60: +1; > 40: 0; else: -1
// Upgrade if score ≥ 4; downgrade if score ≤ -2 (scale: A → A+ → AA- → AA → AA+ → AAA)
```

---

## Political System

### Government Approval (Step 12)
```
monthlyChange = (
    (gdpGrowthAnnual - 1.5) × 0.5         // GDP above trend
  + (4.2 - unemployment) × 0.6            // unemployment gap
  + (2.5 - CPI) × 0.5                     // inflation gap
  + (wageGrowth - CPI) × 0.4             // real wage growth
  + (nhsQuality - 62) × 0.12             // NHS (dominant service)
  + (eduQuality - 68) × 0.05
  + (granularServicesAvg - 55) × 0.06     // 12-metric average
  - householdTaxPressure                  // VAT, IPT, SDLT surcharge
  - businessTaxPressure × 0.5            // corp tax, energy levy
  + deficitEffect                         // < 3%: +0.5; > 6%: -1.5
  - manifestoViolations × tieredPenalty  // 1st: -0.8; 2nd: -2.0; 3rd+: -2.0 - (n-2)×1.2
  + honeymoonBoost                        // decays from +1.8 over first 12 months
  + socialMediaEffect                     // minor
  + random ±0.375
) × 0.25

// Recovery bonuses: < 30% approval → +50% on positive changes
// Momentum bonus: +0.5 if GDP/inflation/unemployment improved meaningfully vs last month
// Clamped [10, 70]
```

### Backbench Satisfaction (Step 13)
```
monthlyChange = (
    (approval - 38) × 0.2
  + deficitEffect                        // > 6%: -1.0; < 3%: +0.2
  - manifestoViolations × 1.5
  + (pmTrust - 50) × 0.06
  + strikeRisk > 60 → -0.6; > 50 → -0.3
  - granularServiceStress × 0.04        // policing, courts, prisons, mental health
  + socialMediaEffect × 0.7
) × 0.2

// Weak drift to 55 at rate ×0.008
// Political Operator adviser: +3 flat
// Game-over threshold (standard): < 30 with 30–60% random revolt probability
```

### PM Trust (Step 14)
```
monthlyChange = (
    (approval - 40) × 0.15
  - manifestoViolations × 1.5
  + fiscalEffect                         // > 6%: -1.5; < 3%: +0.3
  + marketEffect                         // yield > 6%: -2.5; > 5%: -0.8
  + (backbenchSatisfaction - 50) × 0.1
) × 0.3 × pmTrustSensitivity

// Weak drift to 50 at ×0.005; Political Operator: +2 flat
// Game-over threshold (standard): < 20
```

### PM Interventions (Step 15)
Triggered when `pmTrust < threshold` (standard: 40). Trigger reasons in priority order:
1. `backbench_revolt` — backbenchSatisfaction < 35, p=0.4
2. `manifesto_breach` — totalViolations > 0, p=0.25
3. `approval_collapse` — approval < 30, p=0.3
4. `economic_crisis` — giltYield > 6 or debt > 110%, p=0.35

Player choices: **comply** (trust +8–12, backbench +10–15) or **defy** (trust −10–20, reshuffle risk 25–70%).

### 650 MP System
- Each `MPProfile` has ideology, constituency marginality, party, faction, concern weighting
- Stances (support/oppose/undecided) recalculated each turn in Step 13.5 via `calculateAllMPStances()`
- Input: delta from July 2024 baseline (`BudgetChanges`) + manifesto violations
- Stored as `Map<string, MPProfile>` in `state.mpSystem.allMPs`; voting records in `state.mpSystem.votingRecords`

### Game-Over Conditions (Standard difficulty)
| Trigger | Threshold |
|---|---|
| PM trust | < 20 |
| Backbench revolt | < 30 satisfaction, p=30–60% |
| Gilt market crisis | yield > 7.5% |
| Debt spiral | debt/GDP > 120% |
| Full term | turn ≥ 60 (win) |

---

## Save / Load System

### Persistence Architecture (two-tier)
| Data | Storage | Format |
|---|---|---|
| All game state except MPs | `localStorage` key `chancellor-autosave` | JSON via `serializeGameState()` |
| Named saves | `localStorage` key `chancellor-save-{slotName}` | Same format |
| 650 MP profiles (`allMPs`) | IndexedDB db `chancellor-game-db` v1, store `mps` | Indexed by party, faction, region |
| Voting records | IndexedDB store `votingRecords` | Keyed by `mpId` |
| MP promises | IndexedDB store `promises` | Indexed by category, broken flag |

### Serialization Rules
`serializeGameState()` in `game-state.tsx` converts all `Map`/`Set` instances to arrays before `JSON.stringify`:
- `mpSystem.allMPs` → `[]` (omitted — lives in IndexedDB only)
- `mpSystem.votingRecords` → `[]` (omitted)
- `mpSystem.promises` → `[]` (omitted)
- `mpSystem.concernProfiles` → `Array.from(map.entries())`
- `mpSystem.currentBudgetSupport` → `Array.from(map.entries())`
- `advisers.hiredAdvisers` → `Array.from(map.entries())`
- `advisers.availableAdvisers` → `Array.from(set)`
- `advisers.currentOpinions` → `Array.from(map.entries())`

### Loading & Normalization
`normalizeLoadedState()` in `game-state.tsx` handles backward compatibility:
- Merges each sub-state with its `createInitialXState()` defaults (missing fields on old saves get defaults)
- Migrates old saves lacking `nhsCurrent`/`nhsCapital` split by applying baseline capital ratios (NHS ~6.7%, Education ~10.3%, Defence ~29.9%, Infrastructure 80%, etc.)
- Re-hydrates all serialized arrays back to `Map`/`Set` via `robustNormalizeMap()`
- On load, MP data from IndexedDB takes precedence over anything in the JSON (`allMPs`, `votingRecords`, `promises`)

### Auto-save Trigger
`useEffect` in `GameStateProvider` fires on every `currentTurn` change (i.e., after every `advanceTurn()` call) as long as the game is started and not over.

---

## Key Conventions

- **File extension**: All source files use `.tsx` regardless of whether they render JSX. Non-UI modules (e.g., `turn-processor`, `game-state`) are still `.tsx`.
- **Function naming**: verb-first camelCase for actions (`processTurn`, `applyBudgetChanges`, `calculateInflation`); PascalCase for types and interfaces.
- **Pure calculation functions**: Each `calculateX()` step in `turn-processor.tsx` takes `state: GameState` and returns `GameState` — no side effects.
- **Adviser bonuses**: Always call `getAdviserBonuses(state)` in `turn-processor.tsx` to apply hired-adviser multipliers to calculations; don't hardcode multipliers.
- **Fiscal rules**: The active rule is stored in `state.political.chosenFiscalRule` as a `FiscalRuleId`. Use `getFiscalRuleById()` from `game-integration.tsx` to get rule details. Six rules available: `starmer-reeves`, `golden-rule`, `maastricht`, `balanced-budget`, `debt-anchor`, `mmt-inspired`.
- **Difficulty scaling**: Economic shocks must be scaled via `getDifficultySettings(state)` — never use raw shock values. Scales: `macroShockScale`, `inflationShockScale`, `taxAvoidanceScale`, `spendingEfficiencyScale`, `marketReactionScale`, `serviceDegradationScale`.
- **MP data**: Stored as `Map<string, MPProfile>` in state; use helpers in `mp-storage.tsx` (`loadMPs`, `saveMPs`, `loadVotingRecords`, `batchRecordBudgetVotes`) for IndexedDB access.
- **Historical snapshots**: `state.simulation.monthlySnapshots` accumulates one snapshot per turn. Lag lookbacks (e.g., checking debt trend over 6 months) read `snapshots[snapshots.length - N]`. Each snapshot records: `turn`, `date`, `gdpGrowth`, `inflation`, `unemployment`, `deficit`, `debt`, `approval`, `giltYield`, `productivity`.
- **Emergency programmes**: Event responses create `EmergencyProgramme` objects with `rebuildingCostPerMonth_bn`. These costs feed into `calculateFiscalBalance()` via `emergencyRebuildingCosts`. Never manually add to `deficit_bn`/`debtNominal_bn` in event handlers (causes double-counting — see bug comments in `game-state.tsx:1200`).
- **No test files exist yet** — the test command runs but finds nothing.
