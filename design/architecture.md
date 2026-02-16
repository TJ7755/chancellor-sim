# UK Chancellor Simulation Game - Technical Architecture

**Version:** 1.0
**Last Updated:** 2026-02-15
**Status:** Blueprint for Implementation

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Core Data Structures](#1-core-data-structures)
3. [Game Loop Architecture](#2-game-loop-architecture)
4. [UI Component Structure](#3-ui-component-structure)
5. [File Organization](#4-file-organization)
6. [State Management Strategy](#5-state-management-strategy)
7. [Data Flow](#6-data-flow)
8. [Storage Schema](#7-storage-schema)
9. [Data Loading Strategy](#8-data-loading-strategy)
10. [Architectural Decisions](#9-architectural-decisions-and-trade-offs)
11. [Implementation Phases](#10-implementation-phases)
12. [Critical Files](#11-critical-files-for-implementation)

---

## Executive Summary

This specification defines the complete technical architecture for a hyper-realistic UK fiscal policy simulation game where the player assumes the role of Chancellor of the Exchequer in the July 2024 Labour government. The architecture prioritizes:

- **Realistic economic modeling** with 6-12 month lag structures
- **Monthly turn-based gameplay** from July 2024 to July 2029 (60 turns)
- **Complex interdependencies** between policy, GDP, revenue, debt, markets, and approval
- **Event-driven narrative** with market crises, strikes, downgrades, and backbench revolts
- **Persistent state** via localStorage with auto-save functionality

**Technology Stack:**
- React 19 + TypeScript
- Tailwind CSS for styling
- Recharts for data visualization
- math.js for economic calculations
- localStorage for persistence

---

## 1. Core Data Structures

### 1.1 Root Game State

```typescript
interface GameState {
  // Meta information
  version: string;
  gameId: string;
  lastSaved: Date;

  // Time tracking
  currentDate: Date; // Starting 2024-07-05
  turnNumber: number; // 1-60 (5 years × 12 months)
  quarterInYear: number; // 1-4 (for quarterly events)
  monthInYear: number; // 1-12

  // Core state domains
  economy: EconomicState;
  budget: BudgetState;
  political: PoliticalState;
  markets: MarketState;
  publicServices: PublicServicesState;

  // Historical data for charting and lag calculations
  history: HistoricalData;

  // Event and narrative systems
  activeEvents: GameEvent[];
  eventHistory: GameEvent[];
  newsItems: NewsItem[];

  // Advisers and UI state
  advisers: Adviser[];
  unlockedFeatures: string[];
  tutorialCompleted: boolean;
}
```

### 1.2 Economic State

```typescript
interface EconomicState {
  // GDP and growth
  gdpNominal: number; // £bn
  gdpReal: number; // £bn in constant prices
  gdpGrowthAnnual: number; // %
  gdpGrowthQuarterly: number; // %
  outputGap: number; // % (actual - potential)
  trendGrowth: number; // % per year

  // Inflation
  cpi: number; // % annual
  rpi: number; // % annual (for index-linked gilts)
  coreInflation: number; // % (excluding food/energy)
  servicesInflation: number; // % (key BoE metric)
  inflationExpectations: number; // % (anchored or deanchored)

  // Labour market
  unemploymentRate: number; // %
  nairu: number; // % (natural rate)
  employmentRate: number; // %
  economicInactivityRate: number; // %
  longTermSick: number; // millions
  wageGrowthNominal: number; // % annual
  wageGrowthReal: number; // % annual

  // Population
  population: number; // millions
  workingAgePopulation: number; // millions

  // External sector
  currentAccountBalance: number; // £bn
  tradeBalance: number; // £bn
  sterlingIndex: number; // Index, 100 = base
  gbpUsd: number; // Exchange rate
  gbpEur: number; // Exchange rate

  // Productivity
  outputPerHour: number; // Index, 100 = 2019 base
  productivityGrowth: number; // % annual

  // Confidence indices
  businessConfidence: number; // Index 0-100
  consumerConfidence: number; // Index 0-100
}
```

### 1.3 Budget State

```typescript
interface BudgetState {
  // Fiscal aggregates
  totalRevenue: number; // £bn annual
  totalSpending: number; // £bn annual
  deficit: number; // £bn (negative = surplus)
  deficitToGdp: number; // %

  // Debt
  debtNominal: number; // £bn
  debtToGdp: number; // %
  debtInterest: number; // £bn annual

  // Fiscal rules compliance
  currentBudgetBalance: number; // £bn (day-to-day balance)
  fiscalHeadroom: number; // £bn (buffer to meeting rules)
  debtFalling: boolean; // Required by investment rule

  // Tax rates and revenues
  taxes: TaxRates;
  taxRevenues: TaxRevenues;

  // Spending
  spending: SpendingAllocations;

  // Fiscal credibility
  credibilityIndex: number; // 0-100
  obrForecastPresent: boolean;
  fiscalRulesMet: boolean;
}

interface TaxRates {
  incomeTax: {
    basicRate: number; // % (currently 20)
    higherRate: number; // % (currently 40)
    additionalRate: number; // % (currently 45)
    personalAllowance: number; // £
    higherThreshold: number; // £
    additionalThreshold: number; // £
  };
  nationalInsurance: {
    employeeRate: number; // % (currently 8)
    employerRate: number; // % (currently 13.8)
    primaryThreshold: number; // £
  };
  vat: {
    standardRate: number; // % (currently 20)
  };
  corporationTax: {
    mainRate: number; // % (currently 25)
    smallProfitsRate: number; // % (currently 19)
  };
  capitalGainsTax: {
    basicRate: number; // % (currently 10)
    higherRate: number; // % (currently 20)
    propertyRate: number; // % (currently 28)
    annualExemption: number; // £
  };
  fuelDuty: {
    ratePerLitre: number; // pence (currently 52.95)
  };
  councilTax: {
    averageBandD: number; // £ per year
    allowedIncrease: number; // % (referendum threshold)
  };
  inheritanceTax: {
    rate: number; // % (currently 40)
    threshold: number; // £
  };
  stampDuty: {
    ratesSchedule: number[]; // Progressive rates
  };
  businessRates: {
    multiplier: number; // Pence per £ of rateable value
  };
}

interface TaxRevenues {
  incomeTax: number; // £bn
  nationalInsurance: number; // £bn
  vat: number; // £bn
  corporationTax: number; // £bn
  capitalGainsTax: number; // £bn
  fuelDuty: number; // £bn
  councilTax: number; // £bn
  stampDuty: number; // £bn
  inheritanceTax: number; // £bn
  businessRates: number; // £bn
  otherTaxes: number; // £bn (alcohol, tobacco, etc.)
}

interface SpendingAllocations {
  departments: {
    [key: string]: DepartmentSpending;
    // Key departments: dhsc, education, mod, homeOffice, justice,
    // transport, beis, defra, housing, culture, foreignOffice, etc.
  };
  ame: {
    statePension: number; // £bn
    universalCredit: number; // £bn
    disabilityBenefits: number; // £bn
    housingBenefit: number; // £bn
    childBenefit: number; // £bn
    otherBenefits: number; // £bn
    debtInterest: number; // £bn (from markets)
    publicServicePensions: number; // £bn
  };
  publicSectorPay: {
    averageSettlement: number; // % increase this year
    realTermsChange: number; // % after inflation
    cumulativeRealChange: number; // % since 2010 baseline
  };
}

interface DepartmentSpending {
  name: string;
  resourceDEL: number; // £bn (day-to-day spending)
  capitalDEL: number; // £bn (investment)
  totalDEL: number; // £bn
  realGrowth: number; // % change in real terms
  protected: boolean; // Hard-protected (NHS, ODA, etc.)
}
```

### 1.4 Political State

```typescript
interface PoliticalState {
  // Approval ratings
  governmentApproval: number; // % (0-100)
  chancellorApproval: number; // % (0-100)
  pmApproval: number; // % (0-100)
  backbenchSatisfaction: number; // 0-100 score

  // Parliamentary
  labourSeats: number;
  majority: number;
  rebelCount: number; // MPs currently in rebellion

  // Faction satisfaction (for backbench management)
  factionSatisfaction: {
    starmeriteCentre: number; // 0-100
    softLeft: number;
    socialistCampaignGroup: number;
    tradeUnionWing: number;
    blueLabour: number;
    newLabourRevivalists: number;
  };

  // Manifesto pledges
  manifestoPledgesBroken: string[]; // List of broken pledges

  // Political capital
  politicalCapital: number; // Abstract resource for forcing through unpopular measures

  // PM intervention risk
  monthsBelowApprovalThreshold: number; // Months with approval < 25%
  pmInterventionProbability: number; // % chance of forced resignation

  // Trade unions
  strikeRisk: number; // 0-100 probability score
  activeStrikes: ActiveStrike[];

  // Electoral cycle
  monthsUntilElection: number; // Countdown to 2029-07
  projectedSeatChange: number; // Estimated seats gained/lost if election now
}

interface ActiveStrike {
  sector: string; // "rail", "nhs", "teachers", etc.
  startMonth: number;
  duration: number; // months
  economicCost: number; // £bn per month
  approvalCost: number; // points per month
  resolutionCost: number; // £bn to settle
}
```

### 1.5 Market State

```typescript
interface MarketState {
  // Government bond yields
  giltYield2y: number; // %
  giltYield10y: number; // %
  giltYield30y: number; // %

  // Bank of England
  bankRate: number; // %
  qeStock: number; // £bn (APF holdings)
  qtPace: number; // £bn per year
  projectedRatePath: number[]; // Next 12 months

  // Mortgage market
  averageMortgageRate2y: number; // %
  mortgageProductsAvailable: number; // Count

  // Asset prices
  ftse100: number; // Index
  averageHousePrice: number; // £ thousands
  housePriceIndex: number; // Index 100 = base

  // Credit ratings
  moodysRating: string; // "Aa3", etc.
  spRating: string; // "AA", etc.
  fitchRating: string; // "AA-", etc.
  ratingOutlook: string; // "Stable", "Negative", "Positive"

  // Market stress indicators
  marketCrisisActive: boolean;
  marketStressIndex: number; // 0-100 (composite stress indicator)
  pensionFundStress: boolean; // LDI crisis trigger

  // FX reserves and interventions
  sterlingVolatility: number; // % (rolling 30-day)
  boeInterventionActive: boolean;
}
```

### 1.6 Public Services State

```typescript
interface PublicServicesState {
  // NHS
  nhs: {
    quality: number; // 0-100 index
    waitingList: number; // millions
    aePerformance: number; // % seen within 4 hours
    vacancies: number; // thousands
    capitalBacklog: number; // £bn maintenance backlog
    realFundingGrowth: number; // % per year
  };

  // Education
  education: {
    quality: number; // 0-100 index
    perPupilFunding: number; // £
    realFundingGrowth: number; // % per year
    teacherVacancies: number; // thousands
    sendDeficit: number; // £bn
  };

  // Infrastructure
  infrastructure: {
    quality: number; // 0-100 index
    maintenanceBacklog: number; // £bn
    capitalInvestment: number; // £bn per year
  };

  // Law and order
  lawOrder: {
    quality: number; // 0-100 index
    prisonPopulation: number; // thousands
    prisonCapacity: number; // thousands
    crownCourtBacklog: number; // thousands of cases
    policeOfficers: number; // thousands
  };

  // Aggregated service quality (affects GDP via productivity)
  overallQuality: number; // 0-100 composite index
}
```

### 1.7 Historical Data

```typescript
interface HistoricalData {
  // Each array stores last 60 months (5 years)
  monthlySnapshots: MonthlySnapshot[]; // Full state each month

  // Key time series for charting
  gdpGrowth: TimeSeriesData[];
  inflation: TimeSeriesData[];
  unemployment: TimeSeriesData[];
  deficit: TimeSeriesData[];
  debt: TimeSeriesData[];
  govApproval: TimeSeriesData[];
  giltYield: TimeSeriesData[];

  // Fiscal policy changes (for lag calculations)
  policyChanges: PolicyChange[]; // Track when policies implemented
}

interface MonthlySnapshot {
  month: number; // Turn number
  date: Date;
  economy: EconomicState;
  budget: Partial<BudgetState>; // Key fiscal vars
  political: Partial<PoliticalState>; // Key political vars
}

interface TimeSeriesData {
  date: Date;
  value: number;
  label?: string;
}

interface PolicyChange {
  month: number;
  date: Date;
  type: 'tax' | 'spending' | 'fiscal_rule';
  category: string; // "incomeTax", "nhsSpending", etc.
  change: number; // Magnitude (£bn or pp)
  description: string;
}
```

### 1.8 Event System

```typescript
interface GameEvent {
  id: string;
  type: EventType;
  title: string;
  description: string;

  // Timing
  triggerMonth: number;
  duration: number; // Months event lasts
  resolved: boolean;

  // Triggers and conditions
  triggerType: 'threshold' | 'random' | 'scripted';
  triggerCondition?: EventCondition;
  probability?: number; // For random events

  // Player choices
  choices?: EventChoice[];
  selectedChoice?: string;

  // Effects (applied either immediately or on choice selection)
  effects: EventEffects;

  // Narrative
  advisorRecommendations?: AdvisorRecommendation[];
  newsHeadlines?: string[]; // Headlines generated by this event
}

type EventType =
  | 'market_crisis'
  | 'credit_downgrade'
  | 'strike_wave'
  | 'backbench_revolt'
  | 'global_shock'
  | 'service_crisis'
  | 'election'
  | 'budget_event'
  | 'ifs_verdict'
  | 'scripted_narrative';

interface EventCondition {
  // Logical condition for triggering
  metric: string; // e.g., "debtToGdp"
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
  threshold: number;
  duration?: number; // Condition must persist for N months
}

interface EventChoice {
  id: string;
  label: string;
  description: string;
  effects: EventEffects;
  requirements?: EventCondition[]; // Prerequisites
  politicalCost?: number; // Approval cost
}

interface EventEffects {
  economic?: Partial<EconomicState>;
  budget?: Partial<BudgetState>;
  political?: Partial<PoliticalState>;
  markets?: Partial<MarketState>;
  services?: Partial<PublicServicesState>;
  narrative?: string; // Result text
}

interface AdvisorRecommendation {
  advisorId: string;
  choiceId: string;
  reasoning: string;
  confidence: 'low' | 'medium' | 'high';
}
```

### 1.9 Advisers

```typescript
interface Adviser {
  id: string;
  name: string;
  role: string;
  perspective: 'treasury_orthodox' | 'political' | 'progressive' | 'imf_technocrat';

  // Personality traits affect recommendations
  fiscalHawk: number; // 0-100 (how much they prioritize deficit reduction)
  growthFocus: number; // 0-100 (prioritize GDP vs fiscal balance)
  politicalAwareness: number; // 0-100 (factor in approval costs)

  // Track record
  recommendationsMade: number;
  recommendationsFollowed: number;
  outcomesSuccessful: number;
}
```

### 1.10 News System

```typescript
interface NewsItem {
  id: string;
  month: number;
  date: Date;
  headline: string;
  subheadline?: string;
  source: NewsSource;
  sentiment: 'positive' | 'neutral' | 'negative';
  category: 'economy' | 'politics' | 'markets' | 'services';

  // Generated from template + current state
  template: string;
  data: Record<string, any>; // Values used in template
}

type NewsSource =
  | 'bbc'
  | 'ft'
  | 'guardian'
  | 'telegraph'
  | 'dailyMail'
  | 'ifs'
  | 'obr'
  | 'boe'
  | 'imf';
```

---

## 2. Game Loop Architecture

### 2.1 Monthly Turn Cycle

```
Turn Start
    ↓
[1] Display Current State
    ↓
[2] Player Decision Phase
    - Adjust tax rates (if budget event)
    - Adjust department spending (if budget event)
    - Respond to events
    - View charts and projections
    ↓
[3] Commit Changes
    ↓
[4] Calculation Phase (see 2.2)
    ↓
[5] Event Generation
    - Check threshold triggers
    - Roll random events
    - Queue scripted events
    ↓
[6] News Generation
    - Economic data headlines
    - Political reaction headlines
    - Market commentary
    ↓
[7] Display Results
    - News ticker
    - Updated metrics
    - Event notifications
    ↓
[8] Auto-save to localStorage
    ↓
Turn End → Advance to next month
```

### 2.2 Calculation Order (Critical for Realism)

The calculation order matters because of interdependencies. Each month:

```typescript
function processTurn(state: GameState, actions: PlayerActions): GameState {
  let newState = cloneDeep(state);

  // 1. Apply player policy changes
  newState = applyPolicyChanges(newState, actions);

  // 2. Apply external shocks (global events, BoE rate changes)
  newState = applyExogenousFactors(newState);

  // 3. Calculate GDP and growth
  // Uses: fiscal multipliers (with lags), monetary policy (lagged),
  // confidence, productivity
  newState.economy = calculateGDP(newState);

  // 4. Calculate labour market
  // Uses: GDP growth (Okun's law), wage Phillips curve
  newState.economy = calculateLabourMarket(newState);

  // 5. Calculate inflation
  // Uses: output gap, wage growth, import prices, expectations
  newState.economy = calculateInflation(newState);

  // 6. Bank of England reaction
  // Uses: inflation, output gap (Taylor rule)
  newState.markets = calculateBoEResponse(newState);

  // 7. Tax revenues
  // Uses: GDP, employment, consumption, asset prices (all with appropriate lags)
  newState.budget.taxRevenues = calculateTaxRevenues(newState);
  newState.budget.totalRevenue = sumTaxRevenues(newState.budget.taxRevenues);

  // 8. Government spending execution
  // Uses: real growth adjustments, automatic stabilizers
  newState.budget.spending = calculateSpending(newState);
  newState.budget.totalSpending = sumSpending(newState.budget.spending);

  // 9. Fiscal aggregates
  newState.budget.deficit = newState.budget.totalSpending - newState.budget.totalRevenue;
  newState.budget.deficitToGdp = (newState.budget.deficit / newState.economy.gdpNominal) * 100;

  // 10. Debt dynamics
  // Uses: deficit, interest payments, debt-GDP ratio evolution
  newState.budget = calculateDebt(newState);

  // 11. Gilt market and interest rates
  // Uses: debt, deficit, credibility, BoE rate
  newState.markets = calculateGiltMarket(newState);

  // 12. Mortgage and housing market
  // Uses: gilt yields, bank rate
  newState.markets = calculateMortgageMarket(newState);

  // 13. Public service quality
  // Uses: funding levels (with lags), degradation rates
  newState.publicServices = calculateServiceQuality(newState);

  // 14. Productivity effects
  // Uses: service quality, infrastructure, R&D
  newState.economy.productivityGrowth = calculateProductivity(newState);

  // 15. Political approval
  // Uses: real wages, unemployment, NHS quality, manifesto breaches
  newState.political = calculateApproval(newState);

  // 16. Backbench satisfaction
  // Uses: approval, policy decisions, faction alignment
  newState.political = calculateBackbenchSatisfaction(newState);

  // 17. Strike risk
  // Uses: public sector pay, cumulative real cuts
  newState.political.strikeRisk = calculateStrikeRisk(newState);

  // 18. Fiscal credibility index
  // Uses: fiscal rules compliance, OBR presence, headroom, policy reversals
  newState.budget.credibilityIndex = calculateCredibility(newState);

  // 19. Update historical data
  newState.history = appendHistoricalSnapshot(newState);

  // 20. Advance time
  newState.turnNumber++;
  newState.currentDate = advanceMonth(newState.currentDate);

  return newState;
}
```

### 2.3 Budget Event Flow

Special turns (October, March) trigger budget events:

```
Budget Event Start
    ↓
[1] Budget Announcement Phase
    - Full UI for adjusting ALL taxes
    - Full UI for adjusting ALL departments
    - Real-time budget calculator showing:
      * Revenue impact
      * Spending total
      * Projected deficit
      * Compliance with fiscal rules
      * OBR-style forecast (5-year projection)
    ↓
[2] Adviser Panel
    - Each adviser gives recommendations
    - Color-coded by perspective
    - Shows trade-offs
    ↓
[3] Player finalizes budget
    ↓
[4] OBR Forecast Generation
    - 5-year projections generated
    - Credibility boost if forecast looks good
    ↓
[5] IFS Verdict (3 days later)
    - Generate IFS-style analysis
    - "Positive" → credibility +10, approval +3
    - "Negative" → credibility -15, approval -4
    ↓
[6] Market Reaction
    - Gilt yields adjust based on:
      * Deficit credibility
      * Debt trajectory
      * Growth impact
    ↓
[7] Political Reaction
    - Backbench satisfaction adjusts
    - Opposition attacks
    - Media headlines
    ↓
Resume normal monthly turns
```

### 2.4 Emergency Budget Flow

Player can trigger emergency budget mid-year:

```typescript
interface EmergencyBudgetCost {
  approvalCost: number; // -5 to -10 points
  credibilityCost: number; // -10 points (looks panicked)
  politicalCapitalCost: number; // Uses political capital

  justifications: string[]; // What circumstances justify it
  // e.g., "Market crisis", "Economic shock", "Major policy U-turn"
}
```

### 2.5 Event Trigger System

Each turn, check thresholds:

```typescript
function checkEventTriggers(state: GameState): GameEvent[] {
  const triggeredEvents: GameEvent[] = [];

  // Market crisis (Truss scenario)
  if (
    (state.budget.deficitToGdp > 8 && state.economy.outputGap > -1) ||
    (state.budget.debtToGdp > 110 && !state.budget.debtFalling) ||
    (!state.budget.obrForecastPresent &&
     state.budget.deficit > state.history.getLast().budget.deficit + 2)
  ) {
    triggeredEvents.push(createMarketCrisisEvent(state));
  }

  // Credit downgrade
  if (
    (state.budget.debtToGdp > 105 && !state.budget.debtFalling) ||
    (state.budget.deficitToGdp > 5 && monthsAbove(state, 'deficitToGdp', 5) >= 24)
  ) {
    triggeredEvents.push(createCreditDowngradeEvent(state));
  }

  // Strike wave
  if (state.political.strikeRisk > 70 && !state.political.activeStrikes.length) {
    if (Math.random() < state.political.strikeRisk / 100) {
      triggeredEvents.push(createStrikeEvent(state));
    }
  }

  // Backbench revolt
  if (state.political.backbenchSatisfaction < 40) {
    if (Math.random() < 0.6) {
      triggeredEvents.push(createBackbenchRevoltEvent(state));
    }
  }

  // PM intervention (sacking threat - game over potential)
  if (state.political.chancellorApproval < 25 &&
      state.political.monthsBelowApprovalThreshold >= 3) {
    if (Math.random() < 0.6) {
      triggeredEvents.push(createPMInterventionEvent(state));
    }
  }

  // Random events (global shocks, etc.)
  if (Math.random() < 0.10) { // 10% chance each month
    triggeredEvents.push(selectRandomEvent(state));
  }

  return triggeredEvents;
}
```

### 2.6 Save/Load System

```typescript
interface SavedGame {
  version: string;
  saveDate: Date;
  gameState: GameState;
  checksum: string; // Verify integrity
}

// Save to localStorage
function saveGame(state: GameState): void {
  const saved: SavedGame = {
    version: GAME_VERSION,
    saveDate: new Date(),
    gameState: state,
    checksum: calculateChecksum(state)
  };

  localStorage.setItem('chancellorGame_autosave', JSON.stringify(saved));
  localStorage.setItem(`chancellorGame_save_${state.gameId}`, JSON.stringify(saved));
}

// Auto-save: every turn end
// Manual save: player-triggered
// Multiple save slots: up to 5 named saves
```

---

## 3. UI Component Structure

### 3.1 Component Hierarchy

```
<App>
├── <GameProvider> (Context wrapper)
│   ├── <Header>
│   │   ├── <CurrentDate>
│   │   ├── <TurnNumber>
│   │   └── <AutoSaveIndicator>
│   │
│   ├── <MainLayout>
│   │   ├── <Sidebar>
│   │   │   ├── <KeyMetrics>
│   │   │   │   ├── <MetricCard label="GDP Growth" />
│   │   │   │   ├── <MetricCard label="Inflation" />
│   │   │   │   ├── <MetricCard label="Unemployment" />
│   │   │   │   ├── <MetricCard label="Deficit" />
│   │   │   │   ├── <MetricCard label="Debt" />
│   │   │   │   └── <MetricCard label="Approval" />
│   │   │   │
│   │   │   ├── <FiscalRulesStatus>
│   │   │   └── <QuickActions>
│   │   │
│   │   ├── <MainContent>
│   │   │   ├── <TabNavigation>
│   │   │   │   └── [Dashboard | Budget | Charts | Events | Advisers]
│   │   │   │
│   │   │   ├── <DashboardView> (default view)
│   │   │   │   ├── <EconomicOverview>
│   │   │   │   ├── <BudgetSummary>
│   │   │   │   ├── <PoliticalSummary>
│   │   │   │   ├── <NewsTicker>
│   │   │   │   └── <RecentEvents>
│   │   │   │
│   │   │   ├── <BudgetView> (budget event interface)
│   │   │   │   ├── <TaxControlPanel>
│   │   │   │   │   ├── <IncomeTaxControls>
│   │   │   │   │   ├── <NIControls>
│   │   │   │   │   ├── <VATControls>
│   │   │   │   │   ├── <CorporationTaxControls>
│   │   │   │   │   ├── <CGTControls>
│   │   │   │   │   └── <OtherTaxControls>
│   │   │   │   │
│   │   │   │   ├── <SpendingControlPanel>
│   │   │   │   │   ├── <DepartmentSlider dept="DHSC" />
│   │   │   │   │   ├── <DepartmentSlider dept="Education" />
│   │   │   │   │   ├── <DepartmentSlider dept="MOD" />
│   │   │   │   │   └── ... (all 14+ departments)
│   │   │   │   │
│   │   │   │   ├── <BudgetCalculator> (real-time)
│   │   │   │   │   ├── <RevenueProjection>
│   │   │   │   │   ├── <SpendingTotal>
│   │   │   │   │   ├── <DeficitProjection>
│   │   │   │   │   ├── <DebtProjection>
│   │   │   │   │   └── <RulesCompliance>
│   │   │   │   │
│   │   │   │   └── <FiveYearForecast> (OBR-style)
│   │   │   │
│   │   │   ├── <ChartsView>
│   │   │   │   ├── <ChartSelector>
│   │   │   │   └── <ChartDisplay> (Recharts)
│   │   │   │       ├── <GDPChart>
│   │   │   │       ├── <InflationChart>
│   │   │   │       ├── <UnemploymentChart>
│   │   │   │       ├── <DeficitDebtChart>
│   │   │   │       ├── <ApprovalChart>
│   │   │   │       └── <CompositeChart> (multiple metrics)
│   │   │   │
│   │   │   ├── <EventsView>
│   │   │   │   ├── <ActiveEvents>
│   │   │   │   └── <EventHistory>
│   │   │   │
│   │   │   └── <AdvisersView>
│   │   │       └── [List of advisers with their perspectives]
│   │   │
│   │   └── <ModalLayer>
│   │       ├── <EventModal> (event decisions)
│   │       ├── <BudgetConfirmModal>
│   │       ├── <AdvisorModal> (detailed advice)
│   │       └── <GameOverModal>
│   │
│   └── <Footer>
│       ├── <TurnAdvanceButton>
│       └── <SaveLoadControls>
│
└── <LoadingScreen>
```

### 3.2 Component Responsibilities

**GameProvider (Context)**
- Manages global game state
- Provides dispatch function for state updates
- Handles turn processing
- Manages save/load operations

**KeyMetrics Sidebar**
- Always visible
- Shows 6-8 critical metrics
- Color-coded (green/amber/red) based on thresholds
- Click to expand detailed view

**DashboardView**
- Default view each turn
- Summarizes current state across all domains
- Shows recent news
- Links to detailed views

**BudgetView**
- Only accessible during budget events
- Two-panel layout: Controls vs Calculator
- Real-time feedback on changes
- Advisor recommendations inline
- "Finalize Budget" button when ready

**ChartsView**
- Time series visualizations using Recharts
- 60-month rolling window (5 years)
- Multiple series overlays
- Annotations for key events (budgets, crises)
- Export data option

**EventModal**
- Appears when event triggers
- Presents narrative + choices
- Shows advisor recommendations
- Player selects choice
- Immediate or delayed effects

**NewsTicker**
- Scrolling headline feed
- Updates each turn
- Color-coded by sentiment
- Click to expand full article

---

## 4. File Organization

```
/chancellor-game
├── /public
│   ├── index.html
│   └── /data (static JSON loaded at startup)
│       ├── game-data-initial.json (from /research)
│       ├── economic-formulas.json (from /design)
│       ├── tax-parameters.json
│       ├── spending-parameters.json
│       ├── event-templates.json
│       └── news-templates.json
│
├── /src
│   ├── /types
│   │   ├── GameState.ts (all interfaces above)
│   │   ├── Economic.ts
│   │   ├── Budget.ts
│   │   ├── Political.ts
│   │   ├── Markets.ts
│   │   ├── Events.ts
│   │   └── index.ts (re-exports)
│   │
│   ├── /state
│   │   ├── GameContext.tsx (React Context provider)
│   │   ├── gameReducer.ts (reducer pattern for state updates)
│   │   ├── initialState.ts (load from JSON)
│   │   └── actions.ts (action creators)
│   │
│   ├── /engine (pure calculation functions)
│   │   ├── /core
│   │   │   ├── gdp.ts (calculateGDP)
│   │   │   ├── inflation.ts (calculateInflation)
│   │   │   ├── labourMarket.ts (calculateLabourMarket)
│   │   │   ├── fiscalMultipliers.ts (applyFiscalMultipliers)
│   │   │   └── productivity.ts
│   │   │
│   │   ├── /fiscal
│   │   │   ├── taxRevenue.ts (calculateTaxRevenues)
│   │   │   ├── spending.ts (calculateSpending)
│   │   │   ├── deficit.ts (calculateDeficit)
│   │   │   └── debt.ts (calculateDebt)
│   │   │
│   │   ├── /markets
│   │   │   ├── gilts.ts (calculateGiltMarket)
│   │   │   ├── bankOfEngland.ts (calculateBoEResponse)
│   │   │   ├── creditRatings.ts
│   │   │   └── mortgages.ts
│   │   │
│   │   ├── /political
│   │   │   ├── approval.ts (calculateApproval)
│   │   │   ├── backbench.ts (calculateBackbenchSatisfaction)
│   │   │   ├── strikes.ts (calculateStrikeRisk)
│   │   │   └── factions.ts
│   │   │
│   │   ├── /services
│   │   │   ├── nhs.ts (calculateNHSQuality)
│   │   │   ├── education.ts
│   │   │   ├── infrastructure.ts
│   │   │   └── lawOrder.ts
│   │   │
│   │   ├── /events
│   │   │   ├── eventTriggers.ts (checkEventTriggers)
│   │   │   ├── eventEffects.ts (applyEventEffects)
│   │   │   └── eventLibrary.ts (event definitions)
│   │   │
│   │   ├── /news
│   │   │   ├── newsGenerator.ts (generateNewsHeadlines)
│   │   │   └── newsTemplates.ts
│   │   │
│   │   └── turnProcessor.ts (orchestrates all calculations)
│   │
│   ├── /components
│   │   ├── /layout
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── MainLayout.tsx
│   │   │   └── Footer.tsx
│   │   │
│   │   ├── /dashboard
│   │   │   ├── DashboardView.tsx
│   │   │   ├── KeyMetrics.tsx
│   │   │   ├── MetricCard.tsx
│   │   │   ├── EconomicOverview.tsx
│   │   │   ├── BudgetSummary.tsx
│   │   │   └── PoliticalSummary.tsx
│   │   │
│   │   ├── /budget
│   │   │   ├── BudgetView.tsx
│   │   │   ├── TaxControlPanel.tsx
│   │   │   ├── IncomeTaxControls.tsx
│   │   │   ├── SpendingControlPanel.tsx
│   │   │   ├── DepartmentSlider.tsx
│   │   │   ├── BudgetCalculator.tsx
│   │   │   └── FiveYearForecast.tsx
│   │   │
│   │   ├── /charts
│   │   │   ├── ChartsView.tsx
│   │   │   ├── GDPChart.tsx
│   │   │   ├── InflationChart.tsx
│   │   │   ├── DeficitDebtChart.tsx
│   │   │   └── ApprovalChart.tsx
│   │   │
│   │   ├── /events
│   │   │   ├── EventsView.tsx
│   │   │   ├── EventModal.tsx
│   │   │   ├── EventCard.tsx
│   │   │   └── ActiveStrikeDisplay.tsx
│   │   │
│   │   ├── /advisers
│   │   │   ├── AdvisersView.tsx
│   │   │   ├── AdvisorCard.tsx
│   │   │   └── AdvisorRecommendation.tsx
│   │   │
│   │   ├── /news
│   │   │   ├── NewsTicker.tsx
│   │   │   └── NewsArticle.tsx
│   │   │
│   │   └── /common
│   │       ├── Button.tsx
│   │       ├── Slider.tsx
│   │       ├── Modal.tsx
│   │       └── Tooltip.tsx
│   │
│   ├── /utils
│   │   ├── calculations.ts (helper math functions)
│   │   ├── formatting.ts (number/date formatting)
│   │   ├── validation.ts (validate state consistency)
│   │   ├── localStorage.ts (save/load helpers)
│   │   └── constants.ts (magic numbers, thresholds)
│   │
│   ├── /hooks
│   │   ├── useGameState.ts (access context)
│   │   ├── useAutoSave.ts (auto-save on turn end)
│   │   ├── useCalculation.ts (run calculations)
│   │   └── useChartData.ts (prepare time series for Recharts)
│   │
│   ├── App.tsx
│   ├── index.tsx
│   └── index.css (Tailwind directives)
│
├── /design (reference only, not in build)
│   ├── economic-model.md
│   ├── economic-formulas.json
│   └── architecture.md (this file)
│
├── /research (reference only, not in build)
│   ├── game-data-comprehensive.json
│   ├── fiscal-data-july2024.json
│   ├── spending-departments-2024.json
│   ├── political-structure-2024.json
│   ├── monetary-policy-fiscal-rules.json
│   └── economic-parameters.json
│
├── package.json
├── tsconfig.json
├── craco.config.js
├── tailwind.config.js
└── README.md
```

### 4.1 Module Interactions

**Data Flow Between Modules:**

```
User Input (Components)
    ↓
Actions (state/actions.ts)
    ↓
Dispatcher (GameContext.tsx)
    ↓
Reducer (state/gameReducer.ts)
    ↓
Turn Processor (engine/turnProcessor.ts)
    ↓
Calculation Functions (engine/*/**.ts)
    ↓
New State
    ↓
Context Update
    ↓
Components Re-render
```

**Engine Module Interactions:**

```
turnProcessor.ts
    ↓ (orchestrates)
    ├── core/gdp.ts → uses fiscalMultipliers.ts
    ├── core/labourMarket.ts → uses GDP results
    ├── core/inflation.ts → uses labour market results
    ├── fiscal/taxRevenue.ts → uses economic state
    ├── fiscal/debt.ts → uses deficit results
    ├── markets/gilts.ts → uses debt results
    ├── political/approval.ts → uses all state
    └── events/eventTriggers.ts → uses all state
```

---

## 5. State Management Strategy

### 5.1 Approach: React Context API + useReducer

**Rationale:**
- Game state is relatively self-contained (single player)
- No need for Redux DevTools time-travel (we have our own turn history)
- Lighter weight than Redux or Zustand
- Calculation engine is separate (pure functions), so state updates are predictable

### 5.2 Architecture

```typescript
// GameContext.tsx
interface GameContextType {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  processTurn: () => void;
  saveGame: () => void;
  loadGame: (saveId: string) => void;
}

const GameContext = createContext<GameContextType>(undefined);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState, initializeGame);

  const processTurn = useCallback(() => {
    // Run turn calculations (in web worker for performance if needed)
    const newState = calculateNextTurn(state, pendingActions);
    dispatch({ type: 'SET_STATE', payload: newState });
  }, [state]);

  const saveGame = useCallback(() => {
    saveToLocalStorage(state);
  }, [state]);

  const loadGame = useCallback((saveId: string) => {
    const loaded = loadFromLocalStorage(saveId);
    dispatch({ type: 'SET_STATE', payload: loaded });
  }, []);

  return (
    <GameContext.Provider value={{ state, dispatch, processTurn, saveGame, loadGame }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGameState() {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGameState must be used within GameProvider');
  return context;
}
```

### 5.3 Reducer Pattern

```typescript
type GameAction =
  | { type: 'SET_STATE'; payload: GameState }
  | { type: 'UPDATE_TAX_RATE'; payload: { tax: string; rate: number } }
  | { type: 'UPDATE_DEPARTMENT_SPENDING'; payload: { dept: string; amount: number } }
  | { type: 'SELECT_EVENT_CHOICE'; payload: { eventId: string; choiceId: string } }
  | { type: 'ADVANCE_TURN' }
  | { type: 'LOAD_GAME'; payload: GameState };

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_STATE':
      return action.payload;

    case 'UPDATE_TAX_RATE':
      return {
        ...state,
        budget: {
          ...state.budget,
          taxes: updateTaxRate(state.budget.taxes, action.payload)
        }
      };

    case 'UPDATE_DEPARTMENT_SPENDING':
      return {
        ...state,
        budget: {
          ...state.budget,
          spending: updateDepartmentSpending(state.budget.spending, action.payload)
        }
      };

    case 'SELECT_EVENT_CHOICE':
      return resolveEventChoice(state, action.payload);

    case 'ADVANCE_TURN':
      // Handled by processTurn, not directly in reducer
      return state;

    default:
      return state;
  }
}
```

### 5.4 Calculation Engine Location

- All pure calculation functions in `/src/engine`
- Imported by `turnProcessor.ts`
- Called from `processTurn()` in GameProvider
- Returns new state (immutable)

### 5.5 Lag Structure Handling

- Keep last 12-24 months of historical snapshots in `state.history.monthlySnapshots`
- Calculation functions access historical data via helper:

```typescript
function getHistoricalValue(
  history: HistoricalData,
  metric: string,
  monthsAgo: number
): number {
  const snapshot = history.monthlySnapshots[
    history.monthlySnapshots.length - 1 - monthsAgo
  ];
  return get(snapshot, metric) ?? 0; // lodash.get for nested access
}
```

**Example:** Corporation tax revenue depends on GDP from 6 months ago:

```typescript
const gdp6MonthsAgo = getHistoricalValue(state.history, 'economy.gdpNominal', 6);
const corporationTaxRevenue = calculateCorpTax(gdp6MonthsAgo, currentRate);
```

---

## 6. Data Flow

### 6.1 Player Action Flow

```
Player adjusts income tax basic rate to 21%
    ↓
dispatch({
  type: 'UPDATE_TAX_RATE',
  payload: { tax: 'incomeTax.basicRate', rate: 21 }
})
    ↓
gameReducer updates state.budget.taxes.incomeTax.basicRate = 21
    ↓
BudgetCalculator component re-renders
    ↓
Calls calculateProjectedRevenue(state) [from engine]
    ↓
Shows: "+£7bn revenue (year 1), -0.05% GDP, -6 approval (manifesto breach)"
    ↓
Player finalizes budget
    ↓
processTurn() triggered
    ↓
turnProcessor.ts runs full 20-step calculation sequence
    ↓
New state returned
    ↓
dispatch({ type: 'SET_STATE', payload: newState })
    ↓
All components re-render with new state
    ↓
Auto-save to localStorage
```

### 6.2 Economic Calculation Propagation

**Example: Player increases NHS spending by £10bn**

```
Player increases NHS spending by £10bn
    ↓
state.budget.spending.departments.dhsc.resourceDEL += 10
    ↓
[Turn processed]
    ↓
calculateSpending() applies real-terms adjustment
    ↓
calculateGDP() applies NHS spending multiplier (0.8 year 1):
    GDP impact = £10bn * 0.8 * (1 / £2730bn GDP) = +0.29% GDP boost
    ↓
Boost distributed over 12 months with lag structure (60% in first 6 months)
    ↓
calculateLabourMarket() applies Okun's law:
    Unemployment falls by ~0.1pp (from GDP boost)
    ↓
calculateInflation() incorporates output gap effect:
    Inflation rises ~0.05pp from demand pressure
    ↓
calculateBoEResponse() reacts:
    BoE raises rates by 0.25pp over next 12 months (offsetting fiscal stimulus)
    ↓
calculateGiltMarket() adjusts:
    Gilt yields rise 5bp (fiscal loosening + expected BoE tightening)
    ↓
calculateTaxRevenues() [in future months]:
    Higher GDP → +£2bn tax revenues (with lag)
    ↓
calculateDeficit():
    Deficit worsens by £8bn net (£10bn spending - £2bn higher revenue)
    ↓
calculateDebt():
    Debt stock increases by £8bn
    Debt-to-GDP improves slightly (debt up £8bn, GDP up £8bn in nominal terms)
    ↓
calculateServiceQuality():
    NHS quality improves +2 points (with 6-month lag)
    ↓
calculateApproval():
    Approval rises +1.5 points (NHS improvement * approval factor)
    ↓
All propagated effects flow through to next turn
```

### 6.3 Chart Re-rendering

```
State updated
    ↓
useChartData() hook re-runs
    ↓
Extracts state.history.gdpGrowth (time series array)
    ↓
Formats for Recharts:
    data = state.history.gdpGrowth.map(point => ({
      date: format(point.date, 'MMM yy'),
      value: point.value,
      label: point.label
    }))
    ↓
<LineChart data={data}> re-renders
    ↓
Smooth transition animation (Recharts built-in)
```

### 6.4 Event Triggering and Display

```
calculateNextTurn() runs
    ↓
checkEventTriggers(state) detects: debt-to-GDP > 105% and rising
    ↓
Creates event: createCreditDowngradeEvent(state)
    ↓
Event added to state.activeEvents[]
    ↓
State updated
    ↓
EventModal component detects new active event
    ↓
Modal opens with:
    - Title: "Moody's Downgrades UK Credit Rating"
    - Description: "Moody's has downgraded UK sovereign debt from Aa3 to A1..."
    - Choices: [Accept (no action), Emergency budget, Respond with austerity]
    - Advisor recommendations shown
    ↓
Player selects choice
    ↓
dispatch({
  type: 'SELECT_EVENT_CHOICE',
  payload: { eventId, choiceId }
})
    ↓
resolveEventChoice() applies effects:
    - state.markets.moodysRating = "A1"
    - state.markets.giltYield10y += 0.15 (15bp increase)
    - state.budget.credibilityIndex -= 10
    - state.political.governmentApproval -= 3
    ↓
Event marked resolved
    ↓
Modal closes
    ↓
NewsGenerator creates headline:
    "UK Loses Moody's Aa3 Rating as Debt Concerns Mount"
    ↓
Appears in NewsTicker
```

---

## 7. Storage Schema

### 7.1 localStorage Keys

```typescript
// Auto-save (overwrites each turn)
localStorage.setItem('chancellorGame_autosave', JSON.stringify({
  version: '1.0.0',
  saveDate: '2026-02-15T10:30:00Z',
  gameState: { /* full GameState */ },
  checksum: 'abc123...'
}));

// Named saves (player-created, up to 5 slots)
localStorage.setItem('chancellorGame_save_1', JSON.stringify({ /* SavedGame */ }));
localStorage.setItem('chancellorGame_save_2', JSON.stringify({ /* SavedGame */ }));
// ... up to save_5

// Metadata index
localStorage.setItem('chancellorGame_saves_index', JSON.stringify({
  saves: [
    { id: '1', name: 'Austerity Run', date: '2026-02-10T...', turn: 15 },
    { id: '2', name: 'Big Spender', date: '2026-02-12T...', turn: 24 }
  ]
}));
```

### 7.2 Save Structure

```typescript
interface SavedGame {
  version: string; // For migration if schema changes
  saveDate: Date;
  gameState: GameState; // Full state snapshot
  checksum: string; // MD5 hash for integrity verification
  metadata: {
    playerName?: string;
    difficulty?: string;
    turnNumber: number;
    currentDate: Date;
    quickStats: {
      gdpGrowth: number;
      approval: number;
      deficit: number;
    };
  };
}
```

### 7.3 Storage Size Management

**Estimated sizes:**
- Single GameState: ~50-80KB (JSON serialized)
- 60-month history: ~3-5MB (60 snapshots)
- Total per save: ~5MB
- 5 save slots + autosave: ~30MB total
- localStorage limit: 5-10MB per domain (browser dependent)

**Optimization strategies:**
1. Compress history (only keep essential fields in snapshots)
2. Use IndexedDB instead of localStorage if exceeding 5MB
3. Offer export/import via JSON files for backups

---

## 8. Data Loading Strategy

### 8.1 App Startup Sequence

```typescript
async function initializeApp() {
  // 1. Load static data from /public/data/*.json
  const [
    gameDataInitial,
    economicFormulas,
    taxParameters,
    spendingParameters,
    eventTemplates,
    newsTemplates
  ] = await Promise.all([
    fetch('/data/game-data-initial.json').then(r => r.json()),
    fetch('/data/economic-formulas.json').then(r => r.json()),
    fetch('/data/tax-parameters.json').then(r => r.json()),
    fetch('/data/spending-parameters.json').then(r => r.json()),
    fetch('/data/event-templates.json').then(r => r.json()),
    fetch('/data/news-templates.json').then(r => r.json())
  ]);

  // 2. Store in global config (for calculation engine)
  setGlobalConfig({ economicFormulas, taxParameters, spendingParameters });

  // 3. Check for saves
  const autosave = loadFromLocalStorage('chancellorGame_autosave');
  const savesIndex = loadFromLocalStorage('chancellorGame_saves_index');

  // 4. Initialize game state
  let gameState: GameState;

  if (autosave && !autosave.corrupted) {
    // Offer to resume
    const resume = await promptUser('Resume previous game?');
    if (resume) {
      gameState = autosave.gameState;
    } else {
      gameState = createNewGame(gameDataInitial);
    }
  } else {
    gameState = createNewGame(gameDataInitial);
  }

  // 5. Validate state structure
  validateGameState(gameState);

  // 6. Render app
  renderApp(gameState);
}
```

### 8.2 Formula Hydration

Calculation engine imports formulas from loaded JSON:

```typescript
// engine/core/gdp.ts
import { getGlobalConfig } from '@/utils/config';

export function calculateGDP(state: GameState): EconomicState {
  const formulas = getGlobalConfig().economicFormulas;
  const multiplier = formulas.fiscalMultipliers.spending.NHS.year1;

  // Use multiplier in calculation
  const gdpImpact = state.budget.spending.departments.dhsc * multiplier;
  // ...
}
```

---

## 9. Architectural Decisions and Trade-offs

### 9.1 State Management: Context API vs Redux

**Decision: React Context API + useReducer**

| Aspect | Context API | Redux |
|--------|-------------|-------|
| Complexity | Lower | Higher |
| Boilerplate | Minimal | Significant |
| DevTools | No time-travel | Redux DevTools |
| Performance | Good for our use case | Slightly better |
| Learning curve | Easier | Steeper |

**Verdict:** Context API is sufficient for a single-player game with our own historical data system.

### 9.2 Calculation Engine: In-App vs Web Worker

**Decision: Start in-app, migrate to Web Worker if needed**

**Rationale:**
- Turn calculations may take 100-500ms (60+ functions)
- Initial implementation: synchronous in main thread
- If performance issues arise, move to Web Worker:

```typescript
const worker = new Worker('/calculationWorker.js');
worker.postMessage({ state, actions });
worker.onmessage = (e) => dispatch({ type: 'SET_STATE', payload: e.data });
```

### 9.3 Charts: Recharts vs D3 vs Victory

**Decision: Recharts**

| Library | Pros | Cons |
|---------|------|------|
| Recharts | React-native API, good defaults | Less flexible than D3 |
| D3 | Maximum flexibility | Steep learning curve |
| Victory | Similar to Recharts | Larger bundle size |

**Verdict:** Recharts provides the best balance of ease-of-use and capability for our needs.

### 9.4 Historical Data Storage: Full Snapshots vs Deltas

**Decision: Full snapshots (every month)**

**Rationale:**
- Simplifies lag lookback (just array index)
- Storage cost: ~60 snapshots × ~50KB each = ~3MB (acceptable in localStorage)
- Enables easy charting (direct array mapping)
- Trade-off: Memory usage vs simplicity (simplicity wins)

### 9.5 Event System: Scripted vs Procedural

**Decision: Hybrid (templates + procedural generation)**

**Rationale:**
- **Scripted events:** Budget events, PM interventions, credit downgrades (fixed narrative)
- **Procedural events:** News headlines, market reactions (generated from templates + current state)

**Example procedural generation:**

```typescript
template: "GDP growth {gdpGrowth}% {aboveBelow} trend as {sector} sector {upDown}"
data: {
  gdpGrowth: 1.8,
  aboveBelow: 'above',
  sector: 'services',
  upDown: 'accelerates'
}
→ "GDP growth 1.8% above trend as services sector accelerates"
```

### 9.6 Formula Storage: Hardcoded vs JSON

**Decision: JSON-driven with TypeScript wrappers**

**Rationale:**
- Formulas loaded from `economic-formulas.json` at startup
- Enables tweaking without recompiling
- TypeScript wrappers ensure type safety:

```typescript
import formulas from '@/data/economic-formulas.json';

function calculateGDP(state: GameState): number {
  const multiplier = formulas.fiscalMultipliers.spending.NHS.year1;
  // ... use multiplier
}
```

---

## 10. Implementation Phases

### Phase 1: Core Engine (Weeks 1-2)
- Set up TypeScript interfaces in `/src/types`
- Implement basic state structure
- Build calculation engine functions in `/src/engine`
- Test calculations in isolation (unit tests with Jest)

**Key deliverables:**
- All TypeScript interfaces defined
- Core calculation functions (`gdp.ts`, `taxRevenue.ts`, `debt.ts`)
- Unit tests for calculations

### Phase 2: Turn Processing (Week 3)
- Implement turn processor orchestration
- Build lag structure handling
- Test full turn cycles
- Validate against OBR data

**Key deliverables:**
- `turnProcessor.ts` complete
- Historical data system working
- Turn-by-turn validation against real data

### Phase 3: UI Foundation (Weeks 4-5)
- Set up React app with Context
- Build dashboard layout
- Implement key metrics display
- Create basic budget interface

**Key deliverables:**
- GameProvider and Context working
- MainLayout with Sidebar
- DashboardView showing economic summary

### Phase 4: Budget System (Week 6)
- Full tax controls (all 12+ taxes)
- Department spending controls (14+ departments)
- Real-time budget calculator
- Five-year forecast projection (OBR-style)

**Key deliverables:**
- BudgetView with full controls
- Real-time revenue/deficit projections
- Fiscal rules compliance checker

### Phase 5: Events and Narrative (Week 7)
- Event trigger system
- Event modal UI
- News generation (procedural headlines)
- Adviser recommendations

**Key deliverables:**
- Event system triggering correctly
- EventModal with choices
- NewsTicker showing generated headlines
- Adviser perspectives

### Phase 6: Charts and History (Week 8)
- Recharts integration
- Historical data charting (60-month windows)
- Time series annotations (budgets, crises)
- Export functionality

**Key deliverables:**
- ChartsView with all economic indicators
- Smooth animations
- Annotations for key events

### Phase 7: Save/Load and Polish (Week 9)
- localStorage integration
- Save/load UI
- Tutorial system
- Performance optimization

**Key deliverables:**
- Auto-save working
- Multiple save slots
- Loading screen
- Tutorial walkthrough

### Phase 8: Testing and Balancing (Week 10)
- Playtest full 5-year games
- Balance difficulty curves
- Fix edge cases
- Polish UX

**Key deliverables:**
- Fully playable game
- Balanced mechanics
- Bug-free experience

---

## 11. Critical Files for Implementation

Based on this architecture, here are the **5 most critical files** to implement first:

### 1. `/src/types/GameState.ts`

**Purpose:** Central type definitions

**Why Critical:** All other code depends on these interfaces. Getting the structure right upfront prevents massive refactoring later.

**Contents:**
- `GameState` (root interface)
- `EconomicState`, `BudgetState`, `PoliticalState`, `MarketState`, `PublicServicesState`
- All supporting interfaces (`TaxRates`, `SpendingAllocations`, etc.)

### 2. `/src/engine/turnProcessor.ts`

**Purpose:** Orchestrates all monthly calculations

**Why Critical:** This is the heart of the simulation. It defines the calculation order and ensures proper dependencies between subsystems.

**Key function:**
```typescript
export function processTurn(
  state: GameState,
  actions: PlayerActions
): GameState {
  // 20-step calculation sequence
}
```

### 3. `/src/engine/core/gdp.ts`

**Purpose:** GDP calculation with fiscal multipliers

**Why Critical:** GDP drives almost everything else (tax revenues, employment, inflation). Most complex calculation with lag structures.

**Key function:**
```typescript
export function calculateGDP(state: GameState): EconomicState {
  // Apply fiscal multipliers with lags
  // Calculate output gap
  // Update GDP growth
}
```

### 4. `/src/state/GameContext.tsx`

**Purpose:** React Context provider and game state management

**Why Critical:** All components access state through this. Defines the API that the entire UI uses.

**Key exports:**
- `GameProvider` component
- `useGameState()` hook
- `processTurn()` function

### 5. `/src/engine/fiscal/taxRevenue.ts`

**Purpose:** Calculate tax revenues from economic state + policy changes

**Why Critical:** This is where player actions (tax rate changes) translate into fiscal outcomes. Complex because each tax has different elasticities, lags, and behavioral responses.

**Key function:**
```typescript
export function calculateTaxRevenues(state: GameState): TaxRevenues {
  // Calculate revenue for each tax type
  // Apply elasticities
  // Apply lags
  // Apply behavioral responses
}
```

---

## Summary

This architecture provides:

[DONE] **Realistic simulation** with proper lag structures and feedback loops
[DONE] **Clear separation** between calculation engine (pure functions) and UI (React)
[DONE] **Maintainable structure** with well-organized files and clear responsibilities
[DONE] **Extensible system** for events, advisers, and news generation
[DONE] **Performance considerations** with potential Web Worker migration path
[DONE] **Data-driven formulas** loaded from JSON for tweakability

The design prioritizes **realism and educational value** while maintaining **playability**. The monthly turn structure with budget events creates natural decision points, and the event system provides narrative drama. The extensive historical data tracking enables both lag calculations and compelling visualizations of the player's fiscal journey.

---

**Next Steps:**

1. Review this architecture with stakeholders
2. Begin Phase 1 implementation (TypeScript interfaces)
3. Set up comprehensive unit tests for calculation engine
4. Build out UI components iteratively
5. Playtest early and often

**Questions or Clarifications:**

Contact the development team for any architectural questions or proposed modifications to this specification.

---

*Last updated: 2026-02-15*
*Version: 1.0*
