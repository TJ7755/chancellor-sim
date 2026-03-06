# Copilot Instructions for Chancellor

These instructions apply to the whole repository. The only application that matters is in `chancellor-sim/`. Root docs exist, but the real system is the React app under `chancellor-sim/src/`.

This file is intentionally detailed because Copilot has the attention span of a concussed goldfish. Treat it as the technical orientation document for the codebase.

## 1. Project Summary

- This is a turn-based UK Chancellor simulation game.
- The player controls taxes, departmental spending, fiscal rules, industrial policy, PM relations, and political management.
- One turn equals one month.
- The game starts in July 2024 and typically runs for 60 turns through June 2029.
- The tone is serious and policy-heavy, not arcade-like.
- The app mixes simulation code and UI code in `.tsx` files, including plenty of non-visual logic.

## 2. Tech Stack

- React 18
- TypeScript
- `react-scripts` 5
- Tailwind CSS
- Recharts for charts
- `date-fns` for date formatting
- `lucide-react` for some UI icons

There is no sophisticated build setup and no meaningful custom lint regime. Do not invent one in your head.

## 3. Repository Layout

- `README.md`
  - Broad project description at repo root
- `chancellor-sim/`
  - Actual game app
- `chancellor-sim/package.json`
  - Scripts and dependencies
- `chancellor-sim/src/`
  - All runtime code
- `chancellor-sim/src/data/`
  - Static content templates and flavour datasets
- `chancellor-sim/src/__tests__/`
  - Sparse Jest tests
- `chancellor-sim/.github/copilot-instructions.md`
  - Delegates back to this root file

## 4. Commands

Run these from `chancellor-sim/`.

```bash
npm start
npm run build
npm test
npm test -- --testPathPattern=budget-system.test.ts
npm test -- --testPathPattern=mp-system.test.ts
```

## 5. UI and Presentation

### 5.1 Overall Look

- The UI aims for “HM Treasury dashboard” more than “gamey fantasy sim”.
- Layout uses Tailwind utility classes heavily rather than a component design system.
- Visual language is mostly GOV.UK-adjacent:
  - heavy use of reds, blues, greys, whites
  - rectangular panels
  - dense information display
  - charts and metric cards

### 5.2 Fonts

There are no custom web fonts. The app uses the default system sans-serif stack in `src/index.css`:

```css
-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
sans-serif
```

Code uses a standard monospace fallback stack.

If you change typography, remember this codebase currently relies on default system fonts. Do not describe some fictional bespoke design system that does not exist.

### 5.3 Charts and Dashboard Style

- Charts are built with Recharts.
- The dashboard uses fixed semantic colours for economic metrics.
- `dashboard.tsx` defines a `COLORS` map with values such as:
  - Treasury blue
  - green for good metrics
  - orange for warnings
  - red for bad outcomes
  - distinct colours for GDP, inflation, unemployment, deficit, debt, yields

### 5.4 Start Screen and Major Screens

`ChancellorGame.tsx` contains the high-level flow for:

- manifesto selection
- fiscal rule selection
- difficulty selection
- main gameplay dashboard
- modals for tutorial, events, PM interventions, spending review, lobbying, and PM messages

The start flow is not abstracted into a separate app shell. It lives in the main file because apparently restraint was optional.

## 6. Runtime Architecture

The app is state-centric. Most systems read from and write to one large `GameState`.

### 6.1 Entry Point

- `src/index.tsx` mounts `ChancellorGame` inside `React.StrictMode`.

### 6.2 Top-Level Component

- `src/ChancellorGame.tsx`
  - top-level composition
  - start screens
  - modal orchestration
  - chart display for analysis views
  - high-level screen state

This file is large and already overloaded. If adding more logic, prefer extracting pure helpers or local child components rather than adding another slab of inline conditional soup.

### 6.3 State Container

- `src/game-state.tsx`
  - defines `GameState`
  - defines `GameMetadata`
  - exposes context hooks
  - manages persistence
  - exposes game actions
  - normalises old saved states

### 6.4 Simulation Engine

- `src/turn-processor.tsx`
  - canonical monthly engine
  - applies macro, fiscal, political, PM, event, and market consequences
  - produces deltas and historical snapshots

### 6.5 Shared Domain Definitions

- `src/game-integration.tsx`
  - shared domain types
  - fiscal rule framework
  - initial-state factories
  - constants used across systems

## 7. Major Files and Responsibilities

### 7.1 `src/game-state.tsx`

Central state ownership. This file matters more than most of the UI.

Responsibilities:

- master `GameState` type
- metadata such as current turn, month, year, difficulty, game-over status
- state slices for economy, fiscal policy, services, politics, MPs, PM relationship, devolution, financial stability, distribution, OBR, and more
- context provider
- action methods that update player-controlled inputs
- persistence to `localStorage`
- load/save compatibility

Important principle:

- actions update controllable inputs
- the turn processor computes derived outputs

### 7.2 `src/turn-processor.tsx`

This is the core engine. If something changes monthly because time advanced, it probably belongs here.

Responsibilities:

- GDP and productivity dynamics
- inflation, wages, unemployment, labour-market updates
- tax revenue and spending totals
- deficit and debt accumulation
- fiscal-rule evaluation
- market reactions and gilt yields
- service quality evolution
- PM communication triggers
- event generation
- media and social reaction hooks
- historical snapshot recording
- game-over conditions

### 7.3 `src/game-integration.tsx`

This file is the bridge layer between raw type definitions and the unified game state.

Responsibilities:

- fiscal rule enum and metadata
- initial economic, fiscal, political, market, services, and auxiliary state creators
- domain interfaces shared between systems

### 7.4 `src/budget-system.tsx`

Responsibilities:

- budget UI and controls
- tax and spending input editing
- policy conflict detection
- parliamentary vote simulation for budgets
- headroom and rule display
- adviser warnings during budget changes
- spending review interactions

This file already contains both UI and non-trivial logic. If you touch it, keep related budget logic together instead of moving a few random helper fragments somewhere else for aesthetic reasons.

### 7.5 `src/mp-system.tsx`

Responsibilities:

- MP stance calculations
- lobbying probability and outcomes
- rebellion logic
- grouping and response to policy choices

### 7.6 `src/political-system.tsx`

Responsibilities:

- political event mechanics
- PM intervention modal content
- government stability interactions

### 7.7 `src/pm-system.tsx`

Responsibilities:

- determine when PM messages should fire
- choose matching PM message templates
- apply threat and warning framing
- use state-driven conditions such as trust, approval, headroom, gilt yields, and service quality

### 7.8 `src/events-media.tsx`

Responsibilities:

- random event generation
- event templates and response options
- newspaper article generation
- opposition quotes
- media bias and tone shaping

### 7.9 `src/dashboard.tsx`

Responsibilities:

- show metrics, charts, history, dashboard cards, and social feed
- present simulation state in different modes
- calculate chart-friendly display structures

This file should stay presentation-oriented. Do not dump core simulation rules into render branches.

### 7.10 `src/manifesto-system.tsx`

Responsibilities:

- manifesto templates
- pledge tracking
- policy breach detection
- one-click manifesto actions

### 7.11 `src/projections-engine.tsx`

Responsibilities:

- forward-looking projections
- OBR-style output summaries
- budget-draft projection helpers

### 7.12 `src/social-media-system.tsx`

Responsibilities:

- social sentiment
- social media post selection
- media impact calculations

### 7.13 `src/adviser-system.tsx`

Responsibilities:

- adviser definitions
- hiring and firing
- adviser UI
- adviser opinions and gameplay benefits

### 7.14 `src/data/*.ts`

These files are content datasets, not logic dumping grounds.

Examples:

- `pm-messages.ts`
- `newspaper-headlines.ts`
- `social-media-posts.ts`
- `adviser-opinions.ts`
- `mp-interactions.ts`
- `sector-revolts.ts`
- `industrial-interventions.ts`

Keep them serialisable and template-driven. No closures, hidden state, or side effects.

## 8. State Shape Overview

`GameState` is broad. The point of this section is to stop Copilot from acting surprised when a change to one subsystem affects six others.

Main state areas include:

- `metadata`
  - current turn
  - month/year
  - difficulty
  - game start / game over flags

- `economic`
  - nominal GDP
  - growth rates
  - inflation
  - unemployment
  - wages
  - productivity
  - participation and inactivity
  - inflation expectations

- `fiscal`
  - tax rates
  - tax revenues
  - detailed spending and tax lists
  - total revenue and spending
  - deficit
  - debt stock
  - headroom
  - fiscal-event timing
  - pending announcements

- `markets`
  - Bank Rate
  - gilt yields
  - sterling
  - mortgage rates
  - APF/QT data
  - MPC voting details

- `services`
  - NHS quality
  - education quality
  - infrastructure quality
  - detailed service sub-metrics such as policing, courts, prisons, rail, housing, flood resilience, and innovation output

- `political`
  - government approval
  - PM trust
  - backbench satisfaction
  - fiscal-rule compliance
  - chosen fiscal rule

- `manifesto`
  - template
  - active pledges
  - violation counts

- `advisers`
  - hired advisers
  - adviser effects

- `pmRelationship`
  - messages
  - patience
  - warnings
  - active demands
  - active threats
  - unread count
  - reshuffle risk

- `spendingReview`
  - department DEL settlements
  - review timing
  - credibility effects

- `debtManagement`
  - maturity profile
  - issuance strategy
  - rollover risk

- `parliamentary`
  - whip strength
  - confidence vote state
  - select committees
  - Lords delay flags

- `externalSector`
  - trade balance
  - current account
  - external shocks

- `financialStability`
  - housing and banking stress indicators

- `devolution`
  - Barnett consequentials
  - local government stress
  - local service pressure

- `distributional`
  - decile impact data

- `obr`
  - forecast vintages
  - certified headroom
  - risk statements

- `simulation`
  - monthly snapshots
  - turn deltas
  - event history
  - newspapers

## 9. Persistence and Save Compatibility

Persistence is not optional. The game expects saves to survive state-shape changes.

- Core game state is persisted to `localStorage`.
- MP-related storage uses helpers in `mp-storage.tsx`.
- When adding new state fields:
  - update initial state factories
  - update normalisation for old saves
  - provide reasonable defaults
  - avoid assuming new fields always exist on loaded state

If you add state and forget save normalisation, old saves will break. That is not a subtle bug. It is just bad work.

## 10. Core Invariants

These invariants matter more than your refactoring preferences.

- `processTurn(state)` is the canonical monthly engine.
- Player actions set inputs. They do not directly set long-term derived outputs.
- `deficit_bn` and `debtNominal_bn` must only be written in the fiscal-balance path inside the turn engine.
- Budget UI changes must not directly fake market outcomes, GDP changes, or approval effects outside the proper processing path.
- New state fields must remain backward-compatible with old saves.
- Narrative systems should usually react to state, not mutate it, unless the feature explicitly exists to apply consequences.
- Static content belongs in `src/data/`.
- Keep IDs stable where history, storage, or message cooldowns depend on them.

## 11. Turn Flow

The turn processor is a monthly sequence. The exact code has evolved, but the rough order is:

1. handle timing and fiscal-year transitions
2. calculate productivity and supply-side changes
3. calculate GDP growth
4. update labour-market indicators
5. update inflation and inflation expectations
6. update wage growth
7. update Bank Rate / MPC-driven rate dynamics
8. calculate tax revenues
9. calculate spending totals and automatic pressures
10. calculate fiscal balance and debt accumulation
11. evaluate fiscal-rule compliance and headroom
12. update markets and gilt yields
13. evolve service-quality metrics
14. update approval, PM trust, and backbench reactions
15. update MPs and parliamentary risk
16. process PM communications and interventions
17. generate events, newspaper output, and social/media consequences
18. record turn deltas and historical snapshots
19. evaluate game-over conditions

Do not create one-off “special case” writes that bypass this order unless there is a very good reason and the consequences are still routed back into the main state model.

## 12. Economic and Fiscal Algorithms

This section is deliberately dense. Copilot needs the formulas and relationships spelled out.

### 12.1 Productivity

`turn-processor.tsx` treats productivity as a gradual, policy-sensitive supply-side variable.

The rough structure is:

```text
productivityGrowthAnnual
  = baseline
  + capital investment effect
  + NHS quality effect
  + education quality effect
  + innovation / R&D effect
  + infrastructure effect
  + corporation tax environment effect
  + R&D credit effect
  + investment allowance effect
```

Characteristics:

- uses gradual adjustment rather than instant jumps
- is clamped to prevent absurd outputs
- feeds GDP growth and later macro dynamics

### 12.2 GDP Growth

GDP growth combines:

- trend growth
- fiscal demand effects
- supply-side service/productivity effects
- monetary drag from yields/rates
- sterling effects
- random macro shocks scaled by difficulty and policy risk

Important fiscal-demand logic:

- spending increases boost growth with department-specific multipliers
- higher taxes reduce demand
- some tax effects are stronger on demand, others on incentives or investment
- impact is scaled by slack and by overheating conditions

The monthly growth result is clamped to a narrow range to stop the simulation exploding.

### 12.3 Unemployment

Unemployment uses an Okun-style relationship:

- stronger growth pushes unemployment down
- weak growth pushes it up
- the rate also reverts toward an adjusted NAIRU

NAIRU is not fixed. It can worsen when:

- employer NI is very high
- corporation tax is very high
- effective marginal rates become punishing

### 12.4 Inflation

Inflation is a hybrid Phillips-curve style process with:

- persistence from prior inflation
- expectations anchoring
- labour-market slack / tightness
- sterling import-price pressure
- VAT pass-through
- wage-price effects
- random inflation shocks

There is also an inflation-expectations or anchor-health concept:

- high inflation damages the anchor
- better macro stability and sufficiently tight real rates can repair it

When the anchor deteriorates, inflation becomes harder to contain.

### 12.5 Wages

Wage growth depends on:

- CPI
- productivity
- labour-market tightness

It adjusts gradually and is clamped. This matters because wages feed back into inflation, approval, and real living standards.

### 12.6 Bank Rate

Bank Rate is updated with a Taylor-rule style response:

- neutral rate baseline
- inflation gap
- growth conditions
- gradual movement towards target
- discrete / rounded movement rather than infinite decimal twitching

The markets state also tracks richer institutional detail such as MPC members and quantitative tightening.

### 12.7 Tax Revenues

Tax revenues are functions of:

- baseline revenue
- policy-rate changes
- nominal GDP scaling
- elasticities by tax type
- avoidance or behavioural loss at punitive rates
- adviser bonuses

Examples:

- income tax grows faster than GDP due to progressivity
- VAT reacts more directly to consumption conditions
- corporation tax is more cyclical and more sensitive to high-rate behavioural drag

Do not model tax changes as flat additive cash bumps with no macro context unless the feature is explicitly a one-off administrative adjustment.

### 12.8 Fiscal Balance

The fiscal-balance section is critical.

Rough structure:

```text
TME = programme spending
    + debt interest
    + emergency rebuilding costs
    + other automatic pressures

deficit = TME - revenue
debt = previous debt + monthly share of deficit
debt/GDP = debt / nominal GDP
```

Important rule:

- `deficit_bn` and `debtNominal_bn` are write-once-per-turn derived outputs
- do not set them directly from UI code or random event handlers

### 12.9 Fiscal Rules and Headroom

Fiscal rules come from `FISCAL_RULES` in `game-integration.tsx`.

Current rule set includes:

- Starmer-Reeves stability rule
- Jeremy Hunt-style mandate
- Brown-style golden rule
- Maastricht-style constraints
- balanced-budget rule
- debt-anchor framework
- MMT-inspired full-employment framework

Each rule defines:

- whether current budget must balance
- whether overall balance is required
- deficit ceiling
- debt target
- whether debt must be falling
- whether investment is exempt
- forecast horizon
- market reaction
- political reaction

Headroom can exist in both Chancellor-facing and OBR-certified forms. PM trust and market credibility can react to the OBR-certified version.

### 12.10 Markets and Gilt Yields

Market pricing depends on:

- Bank Rate and term premium
- debt level
- deficit level
- debt and deficit trend
- credibility
- credit-rating style premiums
- policy risk
- debt-management strategy
- quantitative tightening effects

There are also more severe market stress branches, such as LDI-style panic behaviour in harsher scenarios.

Debt-management strategy matters:

- short issuance can lower near-term yield but raises rollover risk faster
- long issuance reduces rollover risk but can cost more up front
- index-linked exposure can raise inflation-risk premium

### 12.11 Service Quality

Service quality evolves over time using a real-spending-vs-demand concept.

Generic pattern:

- compare programme budget to a demand-adjusted baseline
- account for inflation
- improve services when funding clearly exceeds pressure
- degrade services when real provision falls short
- clamp to 0-100 style scales

Different services feed different downstream outcomes:

- NHS and education affect productivity and approval
- policing, courts, and prisons affect service-crisis messaging and political risk
- infrastructure supports supply-side performance
- local-government stress affects devolution outcomes and service quality

### 12.12 Distributional Effects

Distributional modelling stores decile-level impacts, not just aggregate claims.

It can reflect:

- tax changes
- welfare changes
- labour-market levers
- regressivity/progressivity assumptions

These values are surfaced in the dashboard around a zero baseline.

## 13. Political and Institutional Algorithms

### 13.1 Approval, PM Trust, and Backbench Sentiment

These are tightly linked.

Approval reacts to:

- growth
- unemployment
- inflation
- real wages
- service quality
- manifesto adherence
- market stress

PM trust reacts to:

- approval
- fiscal credibility
- manifesto performance
- backbench satisfaction
- persistent underperformance

Backbench sentiment reacts to:

- electability
- policy pain
- fiscal stance
- political survival instinct

If you tweak one of these in isolation, you often wreck the feedback loop.

### 13.2 Manifesto System

Manifesto templates are defined in `manifesto-system.tsx`.

The system supports:

- multiple Labour manifesto variants
- pledge checks on taxes, spending, and fiscal rules
- explicit violation tracking
- penalties for breaking prominent promises

Manifesto violations are persistent political damage, not throwaway flavour text.

### 13.3 MP System

The MP layer models:

- individual and grouped backbench behaviour
- lobbying success
- rebellion risk
- voting outcomes

Lobbying is split into:

- probability calculation
- random resolution

Keep those separable for testing. There is already a test making sure display probability matches the actual RNG threshold.

### 13.4 Parliamentary Budget Voting

`budget-system.tsx` contains parliamentary vote simulation logic for budgets.

It uses factors such as:

- backbench satisfaction
- manifesto violations
- size of deficit change
- fiscal-rule compliance
- tax rise count
- spending cut count
- PM trust

Government payroll vote is treated as effectively loyal. Backbenchers are probabilistic. Rebels can vote against or abstain.

### 13.5 PM Communications

`pm-system.tsx` determines if messages should be sent because of:

- low PM trust
- reshuffle risk
- fiscal-rule breach
- market stress
- service crisis
- low approval
- tight headroom
- high deficit
- improving performance deserving praise

Messages come from static templates in `src/data/pm-messages.ts`.

Template selection uses:

- message type
- state-based conditions
- cooldown tracking
- priority ordering

### 13.6 PM Threats and Demands

PM threats can define:

- category
- baseline deficit
- target deficit
- deadline turn
- breach/resolution status

This is not just narrative varnish. Threats affect PM relationship dynamics and can escalate towards support withdrawal or reshuffle risk.

### 13.7 Events and Media

`events-media.tsx` models:

- random crises
- domestic shocks
- market panic
- scandals
- industrial action
- economic-data moments
- policy consequences
- political crises

Each event can have:

- severity
- immediate economic/political impact
- response options
- fiscal cost
- political cost
- rebuilding duration

Newspaper generation is not generic filler. It includes:

- source-specific media bias
- broadsheet vs tabloid style
- opposition quotes
- context-aware headline selection
- some anti-repetition logic for recent news text

## 14. Difficulty Modes

Difficulty modes are:

- `forgiving`
- `standard`
- `realistic`

`realistic` is the balancing reference point.

Difficulty affects values such as:

- macro-shock scale
- inflation-shock scale
- PM trust sensitivity
- intervention thresholds
- game-over thresholds
- tax avoidance scale
- spending efficiency scale
- market reaction scale
- service degradation scale

When adding new shock pathways, wire them through difficulty settings. Do not bolt on an unscaled chaos branch and pretend that is balance.

## 15. Data Content Rules

All static flavour content should be put in the appropriate `src/data/` file.

Guidelines:

- keep entries serialisable
- use placeholder tokens rather than hard-coding values into logic
- keep tone consistent with British politics/media
- maintain publication/personality differences between papers or actors
- avoid repetition where the existing system already tries to diversify output

## 16. Testing Expectations

Test coverage is thin. That is not an excuse to add more untested complexity.

Existing tests include at least:

- budget conflict detection
- lobbying probability consistency

Add tests when changing:

- fiscal-balance logic
- revenue formulas
- manifesto breach behaviour
- PM message trigger rules
- market-reaction conditions
- MP probability logic
- any pure helper you can sensibly isolate

Testing guidance:

- prefer deterministic helper tests
- mock `Math.random` when needed
- separate probability calculation from probabilistic execution where possible

## 17. Code Style Guidance

- Use explicit TypeScript types.
- Avoid `any` unless the surrounding file already paints you into that corner and you are making a minimal surgical change.
- Keep naming direct and domain-specific.
- Prefer small pure helpers for calculations.
- Avoid deeply nested anonymous logic blocks in components.
- Add comments only where logic is genuinely non-obvious.
- Keep British English in user-facing text.

## 18. Refactoring Guidance

This codebase already has very large files. The fix is not to invent a labyrinth of abstractions.

Good refactors:

- extract reusable pure helpers
- extract testable calculation blocks
- extract child components from giant render functions
- centralise duplicated formulas

Bad refactors:

- splitting one coherent algorithm across five files because “separation of concerns”
- moving stateful simulation logic into UI components
- introducing a fake architecture layer that just forwards arguments around
- renaming everything while changing behaviour at the same time

## 19. Feature-Addition Checklist

When adding a new fiscal lever or player-facing mechanic:

1. Add the state field.
2. Add default initial values.
3. Normalise old saves.
4. Expose UI controls if needed.
5. Feed the lever into the turn engine.
6. Update projections if relevant.
7. Update manifesto checks if relevant.
8. Update media, PM, or adviser systems if they react to it.
9. Add tests.

If you only add the control and not the consequences, you built a decorative lie.

## 20. Pre-Completion Checks

Before considering a change finished, check:

- Does it preserve save compatibility?
- Does it update the correct state slice?
- Does it route downstream consequences through `processTurn` where appropriate?
- Does it avoid directly writing derived fiscal totals outside the engine?
- Does it keep static content in `src/data/`?
- Does it include tests for important behavioural changes?
- Does it preserve British English and the serious policy tone?
- Does it avoid making already-large files even more chaotic without reason?

If not, the change is incomplete.
