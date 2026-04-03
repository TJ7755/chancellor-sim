# Chancellor Sim — Codebase Audit

## 1. Codebase Identity

**Chancellor Sim** is a hyper-realistic, monthly-turn-based political economy simulation in which the player assumes the role of UK Chancellor of the Exchequer from July 2024 through June 2029, managing fiscal policy, parliamentary politics, and macroeconomic stability across 60 turns.

**Problem solved:** It provides an authentic, data-grounded simulation of UK fiscal governance for players interested in political economy, policy trade-offs, and Westminster mechanics.

**Maturity assessment:** **Active prototype / late alpha.** Justification: version 0.1.0, no production deployment beyond GitHub Pages, significant TODO comments remain, the Vite migration is documented but not executed, several subsystems have incomplete UI surfaces, and the test suite covers only narrow slices of the domain logic. The economic engine is remarkably complete, but the UI layer shows signs of rapid iteration with inconsistent patterns.

**Primary language/runtime:** TypeScript 4.9.5, React 18.2, running in the browser via Create React App (react-scripts 5.0.1). Node.js 24.x (per `.nvmrc`).

---

## 2. Repository Structure

The repository root contains two concentric layers: the outer project metadata and the inner `chancellor-sim/` React application.

### Root Level

- **`Frontend design.txt`** (659 lines) — A comprehensive design skill document prescribing aesthetic principles (cardless design, gradient ban, British English, keyboard-first, Tailwind preference). It serves as a style guide for frontend generation but is **not consumed by the application**. > COUPLED: This is a prompt-engineering artefact, not a design system the code actually implements.
- **`README.md`** (107 lines) — Project overview, gameplay description, run instructions, and architecture summary. Accurate and well-maintained.
- **`.gitignore`** (161 lines) — Standard Node.js/React exclusions plus game-save-specific patterns (`*.save`, `saves/`). Comprehensive.
- **`.github/`** — Contains `workflows/ci.yml` and `workflows/static.yml` for CI and GitHub Pages deployment, plus `copilot-instructions.md`.
- **`design/`** — Contains `architecture.md` (1774+ lines, the original blueprint) and `economic-model.md` (1238 lines, the economic specification). Both are design documents, not code. The architecture doc describes a planned structure that diverges in several places from the actual implementation.
- **`research/`** — JSON and markdown research inputs: `game-data-comprehensive.json`, `fiscal-data-july2024.json`, `spending-departments-2024.json`, `political-structure-2024.json`, `economic-parameters.json`, `monetary-policy-fiscal-rules.json`, `historical-precedents.md`, `mp-voting-records-2024.md`, `research-summary.md`. These are calibration inputs, not consumed at runtime. > INCOMPLETE: These files exist as references but are not loaded by the application; the actual initial values are hardcoded in `game-integration.ts`.

### `chancellor-sim/` (React Application)

- **`package.json`** — Dependencies: React 18, Recharts 3.7, date-fns 4.1, Lucide React 0.564, TypeScript 4.9. Dev: react-scripts 5, Tailwind 3, Prettier 3.
- **`tsconfig.json`** — Strict mode, ES2015 target, JSX react-jsx.
- **`tailwind.config.js`** — All colours, fonts, spacing, radii, and shadows mapped to CSS custom properties (design token pattern). Light/dark mode via `class` strategy.
- **`VITE_MIGRATION.md`** — Documents a planned migration from CRA to Vite. > INCOMPLETE: Migration is documented but not executed.
- **`.prettierrc`** — Standard Prettier config (singleQuote, trailingComma es5, printWidth 120).
- **`.nvmrc`** — Node 24.13.1.

### `chancellor-sim/src/` (Source)

**Root source files (14 files):**

| File | Purpose |
|------|---------|
| `index.tsx` | React entry point, renders `<ChancellorGame />` in StrictMode |
| `index.css` | 745-line HM Treasury design system — CSS variables, component classes, light/dark themes |
| `ChancellorGame.tsx` (~2039 lines) | App shell: start screen, navigation, view routing, modal orchestration, game over, keyboard shortcuts |
| `game-state.tsx` (~2800 lines) | React Context provider, all state types, save/load, budget application, MP lobbying, PM interventions |
| `game-integration.ts` (~1383 lines) | Type definitions, initial state factories, fiscal rules catalogue, headroom calculations |
| `turn-processor.ts` (~2400 lines) | 19-step monthly simulation engine — GDP, inflation, employment, markets, fiscal, services, events |
| `budget-system.tsx` (~1577 lines) | Budget UI: tax/spending controls, parliamentary vote simulation, PM intervention triggers |
| `dashboard.tsx` (289 lines) | Three-column dashboard with KPIs, political health, spending breakdown |
| `mp-system.tsx` (~3020 lines) | 650 MP simulation: lobbying, promises, voting, stance calculation, group formation, UI |
| `mp-data.ts` (1149 lines) | Constituency database and MP generation for all 650 seats |
| `mp-groups.ts` (380 lines) | MP group clustering algorithm by shared concerns |
| `mp-storage.tsx` (839 lines) | IndexedDB persistence layer for MP data with localStorage fallback |
| `pm-system.tsx` (551 lines) | PM message generation, relationship scoring, communications processing |
| `pm-messages-screen.tsx` (363 lines) | PM inbox UI |
| `political-system.tsx` (1496 lines) | Backbench simulation, PM interventions, polling, reshuffle events |
| `events-media.tsx` (~1941 lines) | Random event generation, newspaper headline generation with bias |
| `manifesto-system.tsx` (~1709 lines) | 5 manifesto templates, pledge tracking, one-click fulfilment |
| `adviser-system.tsx` (~1767 lines) | 6 adviser types, opinions, hire/fire, UI modals |
| `social-media-system.tsx` (359 lines) | Social media sentiment, trending hashtags, pulse strip |
| `projections-engine.ts` (565 lines) | Forward simulation engine for baseline vs pending budget projections |
| `laffer-analysis.ts` (121 lines) | Laffer curve analysis for 7 tax types |
| `SpendingReviewModal.tsx` (128 lines) | Three-year DEL planning modal |
| `tutorial-system.tsx` (231 lines) | Tutorial modal with 6 sections |

**`src/state/` (4 files):**
- `selectors.ts` — Memoised selectors for dashboard, political overview, PM inbox
- `save-game.ts` — Save envelope, checksum validation, version migration (v1→v3)
- `budget-draft.ts` — Budget draft persistence in localStorage with pub/sub events
- `full-export.ts` — Full game export/import combining localStorage + IndexedDB

**`src/domain/` (7 files):**
- `budget/submission.ts` — Budget submission validation and application
- `budget/policy-conflicts.ts` — Detects demand shock, innovation deterrent, strike accelerator conflicts
- `game/difficulty.ts` — Difficulty settings (forgiving/standard/realistic)
- `game/game-over.ts` — Game over condition checks with difficulty-adjusted thresholds
- `pm/communications-step.ts` — PM communications processing
- `parliament/parliamentary-mechanics.ts` — Lords delay, whip strength, select committees, confidence votes
- `fiscal/fiscal-event-cycle.ts` — Budget/Autumn Statement cycle tracking

**`src/data/` (8 files):**
- `social-media-posts.ts` (607 lines) — Social media post templates
- `pm-messages.ts` (521 lines) — PM message templates (6 types)
- `newspaper-headlines.ts` (1107 lines) — Headline templates with 6 bias variants each
- `adviser-opinions.ts` (481 lines) — Adviser opinion templates
- `mp-interactions.ts` (510 lines) — MP interaction response templates
- `industrial-interventions.ts` (59 lines) — Industrial intervention catalogue
- `sector-revolts.ts` (41 lines) — Sector revolt headline templates
- `dashboard-history.ts` (123 lines) — Historical baseline data (2014–2024)

**`src/ui/` (1 file):**
- `shell/ShortcutsHelpModal.tsx` (51 lines) — Keyboard shortcuts help modal

**`src/__tests__/` (14 files):**
- `turn-processor.test.ts`, `budget-integration.test.ts`, `save-roundtrip.test.ts`, `save-game.test.ts`, `game-over.test.ts`, `difficulty.test.ts`, `policy-conflicts.test.ts`, `budget-system.test.ts`, `pm-system.test.ts`, `pm-communications-step.test.ts`, `manifesto-system.test.ts`, `mp-system.test.ts`, `fiscal-event-cycle.test.ts`, `parliamentary-mechanics.test.ts`

> DEBT: The `public/` directory referenced in the architecture doc (`/public/data/*.json`) does not exist. All static data is hardcoded in TypeScript files. The architecture doc's planned file organisation (types/, state/, engine/, components/, utils/, hooks/) was never implemented — the actual structure is flat with a `domain/` and `state/` subdirectory added later.

---

## 3. Architecture Overview

**Pattern:** React Context API + useReducer-adjacent pattern (useState with setState callbacks acting as a pseudo-reducer). Pure domain logic is extracted into `domain/` and the turn processor, while UI components consume context via custom hooks (`useGameState`, `useGameActions`, `useBudgetDraft`, `useGameMetadata`).

**Data flow:**
1. User interacts with a UI component (e.g., BudgetSystem)
2. Component calls an action from `useGameActions()` (e.g., `applyBudgetChanges`)
3. Action updates state via `setGameState` in the Context provider
4. Player clicks "Advance Month" → `advanceTurn()` calls `processTurn()`
5. `processTurn()` clones state, runs 19 calculation steps, returns new state
6. Context updates, all subscribed components re-render

**Architectural seams:**
- **`game-integration.ts`** is the type system and factory layer — all state interfaces and initial state creators live here
- **`game-state.tsx`** is the orchestration layer — all actions, persistence, and normalisation
- **`turn-processor.ts`** is the pure simulation engine — no UI concerns
- **`domain/`** contains pure domain logic extracted from the main files
- **`data/`** contains static templates consumed by runtime generators

> COUPLED: `game-state.tsx` is a 2800-line God object that contains state types, normalisation functions, serialisation, save/load, budget application, event response, PM intervention handling, MP lobbying, and the Context provider. It violates SRP catastrophically.

> INCONSISTENT: The `domain/` directory was introduced as an architectural improvement, but only 7 files were moved there. The majority of domain logic remains embedded in `turn-processor.ts`, `budget-system.tsx`, `mp-system.tsx`, and `political-system.tsx`.

---

## 4. Entry Points and Execution Flow

### Entry Point 1: Application Bootstrap
- **Trigger:** Browser loads `index.html`
- **File:** `src/index.tsx`
- **Path:** `ReactDOM.createRoot` → renders `<ChancellorGame />` wrapped in `<React.StrictMode>`
- **StrictMode effect:** All effects run twice in development, which causes the MP IndexedDB load to fire twice

### Entry Point 2: ChancellorGame Component
- **File:** `ChancellorGame.tsx`
- **Wraps:** `<GameStateProvider>` → `<GameInner />`
- **GameInner checks:**
  1. `metadata.gameStarted === false` → render `GameStartScreen`
  2. `metadata.gameOver === true` → render `Dashboard` + `GameOverModal`
  3. Otherwise → render full game shell with `TurnPanel`, `NavigationBar`, and the active view

### Entry Point 3: GameStateProvider Initialisation
- **File:** `game-state.tsx`
- **Sequence:**
  1. `useState(createInitialGameState())` — creates blank state
  2. `useState(readBudgetDraft())` — loads any pending budget draft
  3. `useEffect` (autosave) — writes to `chancellor-autosave` key on every turn change
  4. `useEffect` (load autosave) — reads `chancellor-autosave`, validates, normalises, restores MP Maps from current state
  5. `useEffect` (load MP data) — loads from IndexedDB, generates 650 MPs if none exist, saves to IndexedDB
  6. `useEffect` (calculate stances) — calculates initial MP stances once MPs are loaded
- **Termination:** Browser tab close; state persists in localStorage and IndexedDB

### Entry Point 4: Turn Advancement
- **Trigger:** "Advance Month" button or Cmd/Ctrl+Enter
- **Path:** `handleAdvanceTurn()` → `actions.advanceTurn()` → `setGameState()` → `processTurn(prevState)` → returns new state → auto-save fires
- **Post-turn:** `setShowNewspaper(true)` after 100ms delay → newspaper modal appears

### Entry Point 5: Game Over
- **Trigger:** Turn 60 reached, or game-over condition triggered by `checkGameOver()` in turn processor
- **Path:** `metadata.gameOver` set to `true` → `GameInner` renders `GameOverModal` over the Dashboard
- **Restart:** "Start New Game" button → `actions.startNewGame()` → resets to initial state

---

## 5. Initialisation Chain

### `createInitialGameState()` (game-state.tsx:1093)

Creates a complete blank state with July 2024 baseline values:

1. **Economic state** — GDP £2750bn, growth 1.0%, inflation 2.2%, unemployment 4.2%, wage growth 5.4%
2. **Fiscal state** — All tax rates at current UK levels (IT basic 20%, NI employee 8%, employer 13.8%, VAT 20%, CT 25%), spending split into current/capital for 8 departments, total revenue £1090bn, total spending £1100bn, deficit £87bn (3.2% GDP), debt £2540bn (92.4% GDP), fiscal headroom £9.9bn
3. **Market state** — Bank rate 5.25%, 10Y gilt 4.10%, 2Y mortgage 5.10%, sterling index 100, 9 MPC members with stances
4. **Services state** — 15 quality indices (NHS 45, education 58, infrastructure 48, etc.), all starting degraded
5. **Political state** — Approval 45%, backbench satisfaction 70%, PM trust 75%, credibility 65%, fiscal rule 'starmer-reeves'
6. **Adviser system** — Empty, 6 types available, max 3 hired
7. **Event state** — Empty
8. **Simulation state** — Empty snapshots
9. **MP system** — Empty Maps (populated asynchronously from IndexedDB)
10. **PM relationship** — Patience 70, no messages, no demands
11. **Spending review** — 7 departments with 3-year DEL plans
12. **Debt management** — Maturity profile (20% short, 35% medium, 30% long, 15% index-linked), 14-year WAM
13. **Parliamentary** — Lords delay inactive, whip strength 70, 5 select committees
14. **External sector** — Current account -3.1% GDP, trade friction index 35
15. **Financial stability** — House price index 100, affordability 38
16. **Devolution** — Scotland (£41bn), Wales (£20bn), NI (£18bn), local gov stress 40
17. **Distributional** — 10 income deciles (£9k–£120k), Gini 0.35, poverty 17.5%
18. **OBR** — Empty forecast vintages, credibility score 62
19. **Capital delivery** — Pipeline capacity £80bn, delivery risk 0.9
20. **Housing** — 240k annual starts, planning bottleneck 65
21. **Industrial strategy** — No active interventions
22. **Legislative pipeline** — Empty queue, HMRC capacity 100

### `startNewGame()` (game-state.tsx:1368)

Parameters:
- `playerName` (optional, defaults to 'Chancellor')
- `manifestoId` (defaults to 'cautious-centrist', or empty string for random)
- `fiscalRuleId` (defaults to 'starmer-reeves')
- `difficultyMode` (defaults to 'realistic')

Order of operations:
1. Creates fresh `createInitialGameState()`
2. Calculates fiscal rule metrics for the chosen rule
3. Preserves existing MPs if available, otherwise generates 650
4. Sets `metadata.gameStarted = true`, `currentTurn = 0`, `difficultyMode`
5. Applies fiscal rule headroom and compliance to fiscal/political state
6. Initialises manifesto with `initializeManifestoState(manifestoId)`
7. Clears budget draft

> MISSING: The `playerName` parameter is accepted but the player name is never displayed anywhere in the UI. The TurnPanel always shows "Chancellor Reeves".

---

## 6. Module and Component Breakdown

### `turn-processor.ts` — Monthly Simulation Engine
**SRP:** Single responsibility — processes one month of simulation. **State:** Complete.
**Public interface:** `processTurn(state: GameState): GameState`
**Dependencies:** `game-integration.ts` (types, fiscal rules), `laffer-analysis.ts`, `domain/` modules, `events-media.tsx`, `pm-system.tsx`, `political-system.tsx`, `adviser-system.tsx`
**Steps (19):** Fiscal year rollover → Emergency programmes → Productivity → GDP growth → External sector → Employment → Inflation → Wage growth → MPC voting → Tax revenue → Fiscal balance → Debt dynamics → Gilt market → Mortgage/housing → Service quality → Political approval → Backbench/PM → Events/media → Game over check
**Non-obvious:** The turn processor handles fiscal year transitions (April), OBR forecast snapshots, and OBR-vs-actual comparisons. It also generates PM communications and checks for PM interventions.

### `game-state.tsx` — State Orchestration
**SRP:** Violated — contains 10+ responsibilities. **State:** Over-engineered.
**Public interface:** `GameStateProvider`, `useGameState()`, `useGameActions()`, `useBudgetDraft()`, `useGameMetadata()`
**Dependencies:** Every other module in the codebase
**Non-obvious:** Contains extensive normalisation logic (`normalizeLoadedState`, `normalizeCurrentBudgetSupport`, `normalizeAdviserSystem`) to handle the Map→object→Map round-trip through JSON serialisation.

### `budget-system.tsx` — Budget UI
**SRP:** Violated — combines UI, budget calculation, parliamentary vote simulation, and PM intervention logic. **State:** Complete but over-engineered.
**Public interface:** Default export `BudgetSystem` component
**Dependencies:** `game-state.tsx`, `game-integration.ts`, `laffer-analysis.ts`, `domain/budget/policy-conflicts.ts`, `projections-engine.ts`
**Non-obvious:** Contains its own parliamentary vote calculation that duplicates logic in `mp-system.tsx`.

### `mp-system.tsx` — MP Simulation
**SRP:** Violated — combines MP data model, stance calculation, lobbying, group formation, promise tracking, voting, and full UI. **State:** Complete but massive (3020 lines).
**Public interface:** `MPManagementScreen`, `LobbyingModal`, `MPDetailModal`, `calculateMPStance`, `attemptLobbying`
**Dependencies:** `mp-data.ts`, `mp-groups.ts`, `mp-storage.tsx`, `data/mp-interactions.ts`

### `pm-system.tsx` — PM Communications
**SRP:** Single responsibility. **State:** Complete.
**Public interface:** `generatePMMessage()`, `generatePMCommunication()`, `markMessageAsRead()`, `updatePMRelationship()`
**Dependencies:** `data/pm-messages.ts`, `domain/pm/communications-step.ts`

### `events-media.tsx` — Events and Media
**SRP:** Single responsibility. **State:** Complete.
**Public interface:** `generateEvents()`, `generateNewspaper()`, `EventModal`, `Newspaper` components
**Dependencies:** `data/newspaper-headlines.ts`, `data/sector-revolts.ts`

### `manifesto-system.tsx` — Manifesto Tracking
**SRP:** Single responsibility. **State:** Complete.
**Public interface:** `ManifestoDisplay`, `initializeManifestoState()`, `executeOneClickAction()`, `checkPolicyForViolations()`
**Dependencies:** None external

### `adviser-system.tsx` — Adviser System
**SRP:** Single responsibility. **State:** Complete.
**Public interface:** `AdviserManagementScreen`, `hireAdviser()`, `fireAdviser()`, `generateAdviserOpinions()`
**Dependencies:** `data/adviser-opinions.ts`

### `projections-engine.ts` — Forward Simulation
**SRP:** Single responsibility. **State:** Complete.
**Public interface:** `generateProjections()`, `summariseProjections()`
**Dependencies:** None external (pure functions)

### `social-media-system.tsx` — Social Media
**SRP:** Single responsibility. **State:** Complete.
**Public interface:** `SocialMediaPulseStrip`, `calculateSocialMediaSentiment()`
**Dependencies:** `data/social-media-posts.ts`

---

## 7. Data Layer

### In-Memory Store (React Context)
All game state lives in a single `GameState` object managed by React Context. This is the primary data store.

### localStorage
- **`chancellor-autosave`** — Auto-saved every turn. Contains the full game state serialised as JSON, wrapped in a `SaveEnvelope` (version, timestamp, checksum).
- **`chancellor-save-{slotName}`** — Named saves. Same envelope format.
- **`chancellor-budget-draft-v2`** — Current budget draft (tax and spending proposals). Cleared on turn advance.

### IndexedDB
- **`chancellor-mps`** — Store for 650 MP profiles. Keyed by MP ID.
- **`chancellor-voting-records`** — Store for MP voting history.
- **`chancellor-promises`** — Store for MP promises.

> COUPLED: The split between localStorage (game state) and IndexedDB (MP data) creates a dual-persistence model that requires careful synchronisation. The `normalizeLoadedState` function contains extensive defensive code to handle the case where MP Maps come back as plain objects after JSON round-trips.

### Schema — GameState

The `GameState` interface (game-state.ts:432) contains 23 top-level slices:
- `metadata` (GameMetadata) — Turn, month, year, difficulty, game state flags
- `economic` (EconomicState) — GDP, inflation, unemployment, wages, productivity, participation
- `fiscal` (FiscalState) — Tax rates, spending breakdown, revenues, deficit, debt, headroom
- `markets` (MarketState) — Bank rate, gilt yields, mortgage rates, sterling, MPC members
- `services` (ServicesState) — 15 quality indices, strike tracking, staffing capacity
- `political` (PoliticalState) — Approval, backbench satisfaction, PM trust, credibility, fiscal rule compliance
- `advisers` (AdviserSystem) — Hired advisers, available types, opinions
- `events` (EventState) — Pending events, event log, current newspaper
- `manifesto` (ManifestoState) — Pledges, violations
- `simulation` (SimulationState) — Monthly snapshots, turn deltas, OBR forecasts
- `policyRiskModifiers` — Active risk modifiers (macro shocks, productivity drags, etc.)
- `mpSystem` (MPSystemState) — 650 MPs, voting records, promises, concern profiles, stances
- `emergencyProgrammes` — Active emergency spending programmes
- `pmRelationship` (PMRelationshipState) — Patience, messages, demands, threats
- `socialMedia` — Recently used post IDs
- `spendingReview` — 3-year DEL plans for 7 departments
- `debtManagement` — Maturity profile, QE holdings, issuance strategy
- `parliamentary` — Lords delay, whip strength, select committees
- `externalSector` — Current account, trade, external shocks
- `financialStability` — House prices, mortgage approvals, bank stress
- `devolution` — Scotland/Wales/NI block grants, local government
- `distributional` — Income deciles, Gini, poverty rates
- `obr` — Forecast vintages, cumulative errors
- `capitalDelivery` — Pipeline capacity, project queue
- `housing` — Building starts, affordability, planning
- `industrialStrategy` — Active interventions, productivity boost
- `legislativePipeline` — Policy queue, HMRC capacity

---

## 8. Serialisation and Persistence

### Serialisation Format
JSON via `JSON.stringify`. The `serializeGameState()` function (game-state.ts:1011) converts all `Map` and `Set` objects to arrays before stringification:
- `mpSystem.allMPs` → `[]` (not saved to localStorage; lives in IndexedDB)
- `mpSystem.votingRecords` → `[]`
- `mpSystem.promises` → `[]`
- `mpSystem.concernProfiles` → `Array.from(entries())`
- `mpSystem.currentBudgetSupport` → `Array.from(entries())`
- `advisers.hiredAdvisers` → `Array.from(entries())`
- `advisers.availableAdvisers` → `Array.from()`
- `advisers.currentOpinions` → `Array.from(entries())`

### Save Envelope
`SaveEnvelope` (save-game.ts): `{ version: '3', savedAt: number, turnAtSave: number, checksum: string, state: unknown }`

### Checksum Validation
A simple multiplicative hash (`simpleChecksum`) is computed over the serialised state string. On load, the checksum is recomputed and compared. > DEBT: This is not a cryptographic hash — it detects accidental corruption but not tampering. Acceptable for a single-player game.

### Version Migration
Three versions supported:
- **v1 (legacy):** No envelope. Migration adds missing state slices (political, advisers, events, manifesto, mpSystem, simulation) with defaults.
- **v2:** Envelope exists. Migration updates adviser IDs from short names to full names, fixes invalid manifesto default.
- **v3 (current):** No migration needed.

### Deserialisation Validation
`validateSave()` performs: JSON parse → envelope structure check → checksum verification → migration → schema validation (metadata, economic, fiscal, political field types).

> MISSING: No validation of nested objects like `spending` breakdown, `detailedTaxes`, `detailedSpending`, or MP data on load. Only top-level numeric fields are validated.

### Size Constraints
`SAVE_SIZE_LIMIT = 4,800,000` bytes (4.8 MB). The envelope is checked against this limit before writing.

> DEBT: The 650 MPs are explicitly excluded from localStorage serialisation (`allMPs: []`) and stored in IndexedDB instead. This is correct but means a save file without the corresponding IndexedDB data will have an empty MP roster on load. The load path handles this by preserving the current state's MPs if the loaded state has none.

### Ephemeral State Stripped
During serialisation: `selectedMPForDetail`, `filterSettings`, `showDetailedView` are set to null/empty.

---

## 9. API and Interface Layer

This is a client-only application with no server-side API. The "interfaces" are the player-facing UI controls.

### Keyboard Shortcuts
- `1`–`7` — Switch views (Dashboard, Budget, Analysis, Advisers, MPs, PM Messages, Manifesto)
- `/` — Jump to Budget view
- `?` — Open shortcuts help modal
- `Escape` — Close modals (shortcuts, save/load, newspaper, lobbying, MP detail)
- `Cmd/Ctrl + Enter` — Advance month

### Save/Load Interface
- **Save:** Text input for slot name → "Save Game" button → writes to `chancellor-save-{name}`
- **Load:** Same slot name → "Load Game" button → reads, validates, normalises, restores
- **Autosave:** Automatic every turn to `chancellor-autosave`

> INCOMPLETE: No save slot browser — the player must remember and type slot names. No export/import UI despite `full-export.ts` existing.

---

## 10. Business Logic

### Core Domain Logic
The simulation models UK fiscal policy with realistic economic relationships:

**Tax Revenue Model:** Each of the 6 main taxes (income tax basic/higher/additional, NI employee/employer, VAT, corporation tax) has a revenue calculation based on rate changes, GDP elasticity, and behavioural responses. Revenue adjustments from 20+ granular taxes (CGT, IHT, SDLT, fuel duty, etc.) are applied as a lump sum `revenueAdjustment_bn`.

**Spending Model:** 8 departments (NHS, education, defence, welfare, infrastructure, police, justice, other) each split into current and capital spending. Changes affect service quality with lags, which feeds back into productivity and approval.

**GDP Model:** Base trend 1.5% annual, modified by fiscal impulse (spending/tax multipliers with lag distributions), monetary impulse (BoE rate changes, 18-month lag), external sector, confidence, and productivity effects.

**Inflation Model:** Hybrid Phillips curve — 40% persistence, 35% expectations, 15% domestic pressure, 10% import prices. Expectations de-anchor when credibility falls below 50.

**Debt Dynamics:** Debt stock accumulates monthly deficits. Debt servicing uses a 14-year average maturity (very slow adjustment). Gilt yields respond to debt/GDP ratio with non-linear escalation above 100%.

**Political Approval:** Driven by real wages, unemployment, NHS quality, manifesto breaches, and events. Loss aversion: negative events weighted 2× positive.

> INCONSISTENT: The economic model document (`design/economic-model.md`) specifies detailed formulas that are only partially implemented. For example, the model specifies CGT revenue with forestalling effects and asset price sensitivity, but the actual implementation uses a simplified lump-sum `revenueAdjustment_bn`. The model specifies a full Taylor rule for BoE response, but the implementation uses a simplified MPC voting system.

---

## 11. Dependencies

### Production Dependencies
| Package | Version | Purpose | Usage |
|---------|---------|---------|-------|
| `react` | ^18.2.0 | UI framework | Heavy — entire application |
| `react-dom` | ^18.2.0 | DOM rendering | Heavy |
| `typescript` | ^4.9.5 | Type system | Heavy |
| `recharts` | ^3.7.0 | Charting | Medium — Analysis tab, projections |
| `date-fns` | ^4.1.0 | Date manipulation | Light — fiscal year calculations |
| `lucide-react` | ^0.564.0 | Icon library | Light — UI icons |

### Development Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| `react-scripts` | 5.0.1 | CRA build tooling |
| `tailwindcss` | ^3.3.6 | CSS framework |
| `@tailwindcss/forms` | ^0.5.7 | Form styling plugin |
| `autoprefixer` | ^10.4.16 | CSS vendor prefixes |
| `postcss` | ^8.4.32 | CSS processing |
| `prettier` | ^3.8.1 | Code formatting |
| `@types/jest` | ^30.0.0 | Jest types |
| `@types/node` | ^25.3.0 | Node types |
| `@types/react` | ^18.2.0 | React types |
| `@types/react-dom` | ^18.2.0 | React DOM types |

> DEBT: `@types/jest@^30.0.0` and `@types/node@^25.3.0` are unusually high versions that may not be compatible with the rest of the toolchain. React 18.2 is two major versions behind current (React 19 was released in late 2024). TypeScript 4.9 is outdated (current is 5.x).

### Internal Dependencies
- `game-state.tsx` depends on **every** other module
- `turn-processor.ts` depends on `game-integration.ts`, `laffer-analysis.ts`, `events-media.tsx`, `pm-system.tsx`, `political-system.tsx`, `adviser-system.tsx`, and all `domain/` modules
- `budget-system.tsx` depends on `game-state.tsx`, `game-integration.ts`, `laffer-analysis.ts`, `projections-engine.ts`, `domain/budget/policy-conflicts.ts`

> DEBT: No circular dependencies detected, but the dependency graph is star-shaped with `game-state.tsx` at the centre. This makes it impossible to test or refactor any subsystem in isolation.

---

## 12. Configuration and Environment

### Configuration Surface
- **No environment variables** — the application is entirely client-side with no external API calls
- **No feature flags** — all features are always on
- **No CLI arguments** — configured via the start screen UI
- **Difficulty mode** — selected at game start (forgiving/standard/realistic), stored in `metadata.difficultyMode`

### Difficulty Settings (domain/game/difficulty.ts)
- **Forgiving:** Market reaction scale 0.6, approval decay 0.6, strike threshold multiplier 1.5, PM reshuffle threshold 15, PM threat threshold 25
- **Standard:** All multipliers at 1.0, reshuffle threshold 25, threat threshold 35
- **Realistic:** Market reaction scale 1.4, approval decay 1.4, strike threshold multiplier 0.7, reshuffle threshold 35, threat threshold 45

### Hardcoded Values
> DEBT: Extensive hardcoded values throughout:
- Tax revenue per pp (e.g., income tax basic +£7bn/pp) in `turn-processor.ts`
- Spending multipliers in `turn-processor.ts`
- Event probabilities in `events-media.tsx`
- MP generation parameters in `mp-data.ts`
- All initial state values in `game-integration.ts`

None of these are externalised to configuration files, despite the `research/` directory containing JSON files that appear designed for this purpose.

---

## 13. Testing

### Framework
Jest via `react-scripts test` (CRA's built-in Jest). Tests run in watch mode by default.

### Test Coverage by File

| Test File | What It Tests | What It Asserts | What It Mocks |
|-----------|--------------|-----------------|---------------|
| `turn-processor.test.ts` | Full turn processing | GDP growth positive, inflation changes, deficit computed, debt increases, snapshots recorded | Nothing — integration test |
| `budget-integration.test.ts` | Budget application | Tax rates update, spending updates, aggregates recompute | Nothing |
| `save-roundtrip.test.ts` | Save serialisation/deserialisation | Round-trip preserves all state slices, Maps restored | Nothing |
| `save-game.test.ts` | Save envelope, checksum, migration | Checksum valid, v1→v3 migration works, corrupt save rejected | Nothing |
| `game-over.test.ts` | Game over conditions | Term completion, PM reshuffle, confidence vote, market collapse | Nothing |
| `difficulty.test.ts` | Difficulty settings | Forgiving has lower thresholds, realistic has higher | Nothing |
| `policy-conflicts.test.ts` | Policy conflict detection | Demand shock detected, no false positives | Nothing |
| `budget-system.test.ts` | Budget conflict detection | Single test: conflicts detected | Nothing |
| `pm-system.test.ts` | PM message read tracking | Mark as read works | Nothing |
| `pm-communications-step.test.ts` | PM communications | Communications generated, threats tracked | Nothing |
| `manifesto-system.test.ts` | Manifesto one-click actions | One-click fulfilment works | Nothing |
| `mp-system.test.ts` | MP lobbying | Lobbying probability calculated | Nothing |
| `fiscal-event-cycle.test.ts` | Fiscal event cycle | Next fiscal event turn calculated | Nothing |
| `parliamentary-mechanics.test.ts` | Lords delay | Lords delay applied, bill blocked | Nothing |

### Coverage Assessment
- **Well-tested:** Save/load pipeline, game over conditions, difficulty settings, policy conflicts
- **Untested:** Turn processor individual steps (GDP calculation, inflation, tax revenue, debt dynamics), MP stance calculation, event generation, newspaper generation, adviser opinions, projections engine, laffer analysis, social media system, dashboard rendering, budget UI rendering, MP UI rendering
- **Test quality:** Tests are integration-level, not unit-level. They test end-to-end behaviour but do not isolate individual calculation steps. No mocking is used anywhere, which means tests are slow and brittle.

> DEBT: 14 test files covering ~900 lines of test code, but the critical economic calculations (the heart of the simulation) have zero unit test coverage. The turn processor is tested only as a black box.

---

## 14. Build, Tooling, and CI/CD

### Build System
Create React App (react-scripts 5.0.1). No custom webpack config.

### Scripts
| Script | Command | Purpose |
|--------|---------|---------|
| `start` | `react-scripts start` | Development server on port 3000 |
| `build` | `react-scripts build` | Production build to `build/` |
| `typecheck` | `tsc --noEmit` | TypeScript type checking |
| `test` | `react-scripts test` | Jest test suite (watch mode) |
| `eject` | `react-scripts eject` | Eject from CRA (not recommended) |
| `format` | `prettier --write "src/**/*.{ts,tsx,js,jsx,json,css}"` | Format code |
| `format:check` | `prettier --check "src/**/*.{ts,tsx,js,jsx,json,css}"` | Check formatting |

### CI/CD
- **`.github/workflows/ci.yml`** — Runs on push/PR to main. Installs dependencies, runs `npm run typecheck`, `npm run format:check`, and `npm test` (with `CI=true` to disable watch mode).
- **`.github/workflows/static.yml`** — Deploys to GitHub Pages on push to main. Builds the app and uploads `build/` to `gh-pages` branch.

> DEBT: CRA is deprecated. The `VITE_MIGRATION.md` documents a planned migration to Vite but it has not been executed. CRA's build times are slow and the tooling is no longer actively developed.

---

## 15. Security

### Authentication
None — single-player, client-only application.

### Authorisation
None.

### Input Sanitisation
- Save/load uses `JSON.parse` with try/catch — safe from injection
- No user-generated content is rendered without sanitisation (all text comes from hardcoded templates)
- localStorage writes are size-limited (4.8 MB)

### Secrets
No secrets in the codebase. No API keys. No `.env` files.

### XSS Surface
> DEBT: Event descriptions, newspaper headlines, and PM messages are rendered with `{variable}` interpolation in JSX, which React auto-escapes. However, if any future feature allows user-generated content, the current codebase has no sanitisation layer.

---

## 16. Performance Characteristics

### Observable Bottlenecks
- **MP stance calculation:** `calculateAllMPStances()` iterates over 650 MPs, each running ideology alignment, constituency impact, granular impact, and promise checks. This runs on every budget change and every turn. > DEBT: O(n) per MP with no memoisation.
- **Turn processor:** 19 sequential steps, each touching the full state object. Estimated 100-500ms per turn.
- **Projections engine:** `generateProjections()` clones the entire state and simulates forward 12-48 months. Each month runs a simplified version of the turn processor.

### Caching
- `useMemo` used in `ChancellorGame.tsx` for historical baseline and projections
- `useCallback` used for all action handlers
- No HTTP caching (no network requests)
- Budget draft persisted to localStorage and read on mount

### N+1 Patterns
None — no database queries.

### Unbounded Operations
- `monthlySnapshots` array grows by 1 per turn (max 60 entries)
- `eventLog` array grows unbounded
- `pmRelationship.messages` array grows unbounded

> DEBT: No pruning of historical arrays. Over a long game session, these could grow large, though 60 turns is a hard cap.

---

## 17. Error Handling and Observability

### Error Handling Strategy
- **Save/load:** Try/catch with console.error logging. User-facing error messages for save failures.
- **MP loading:** Try/catch with emergency fallback generation. Extensive console logging.
- **Turn processing:** No error handling — if a calculation throws, the entire app crashes.
- **Budget application:** No error handling — changes are applied blindly.

### Logging
`console.log` and `console.error` used throughout, primarily in:
- MP system: Extensive logging of load/generation/stance calculation
- Save system: Logging of save/load failures
- No structured logging, no log levels, no log aggregation

> MISSING: No error boundaries in the React tree. A single component crash will white-screen the entire application.

> MISSING: No monitoring, metrics, or tracing. This is expected for a client-only game but means runtime errors in the wild are invisible to the developer.

### Silent Failures
- `writeBudgetDraft` and `clearBudgetDraft` silently ignore storage failures
- `readBudgetDraft` returns null on any parse error
- `readSave` returns null on any error, with only a console.warn

---

## 18. Code Quality and Consistency

### Coding Style
- TypeScript with strict mode
- Functional components with hooks
- CSS via Tailwind utility classes with CSS variable design tokens
- Prettier enforced (printWidth 120, single quotes, trailing commas)

### Naming Conventions
- **Inconsistent:** Mix of camelCase (`gdpGrowthAnnual`), snake_case in some data files, and kebab-case in CSS class names. Some fields use `_bn` suffix (`deficit_bn`), others don't.
- **British English:** Mostly followed in UI copy ("favour", "colour", "programme") but not consistently in code identifiers.

### Documentation
- `README.md` — Good overview, accurate
- `design/architecture.md` — Comprehensive blueprint but diverges from actual implementation in many places
- `design/economic-model.md` — Excellent economic specification, partially implemented
- Inline comments — Sparse in most files, extensive in `turn-processor.ts` and `game-state.tsx`
- JSDoc — Absent

### Dead Code and TODOs
- `ChancellorGame.tsx:1446` — `// TODO: Process full turn calculation sequence` (this is stale — the turn processor IS called immediately after)
- `ChancellorGame.tsx:1779` — `const _eventLog = gameState.events?.eventLog || []; void _eventLog;` — Dead variable
- `game-state.tsx:2473` — `console.assert(choice !== 'comply' || Object.keys(budgetChanges).length >= 0, ...)` — The assertion condition is always true (`>= 0`), making it a no-op
- `VITE_MIGRATION.md` — Documents an unexecuted migration

> DEBT: The `PoliticalSystemDemo` component in `political-system.tsx` is exported but never used. The `PoliticalPanel` component is also exported but never imported anywhere.

---

## 19. Technical Debt Register

### 1. God Object: game-state.tsx (2800+ lines)
**Where:** `game-state.tsx`
**Problem:** Contains state types, normalisation, serialisation, save/load, budget application, event response, PM intervention, MP lobbying, and Context provider. Impossible to test or refactor in isolation.
**Risk:** Critical — any change risks breaking multiple subsystems.
**Effort:** High
**Resolution:** Split into: `types.ts`, `normalisation.ts`, `persistence.ts`, `actions/budget.ts`, `actions/events.ts`, `actions/pm.ts`, `actions/mps.ts`, `GameContext.tsx`.

### 2. CRA Deprecation
**Where:** `package.json`, build pipeline
**Problem:** Create React App is no longer actively developed. Build times are slow. No support for modern features.
**Risk:** Medium — works now but will become harder to maintain.
**Effort:** Medium
**Resolution:** Execute the Vite migration documented in `VITE_MIGRATION.md`.

### 3. Missing Unit Tests for Economic Calculations
**Where:** `turn-processor.ts`
**Problem:** The core simulation engine has zero unit test coverage. Only one integration test exists.
**Risk:** High — economic bugs could go undetected.
**Effort:** High
**Resolution:** Extract each calculation step into a pure function with inputs/outputs, then write unit tests for each.

### 4. Dual Persistence Model Complexity
**Where:** `game-state.tsx`, `mp-storage.tsx`
**Problem:** Game state in localStorage, MP data in IndexedDB. Requires extensive normalisation code to handle Map→object→Map round-trips.
**Risk:** Medium — save/load bugs are subtle and hard to reproduce.
**Effort:** Medium
**Resolution:** Move everything to IndexedDB, or serialise Maps to plain objects consistently.

### 5. Hardcoded Economic Parameters
**Where:** `turn-processor.ts`, `game-integration.ts`
**Problem:** All tax elasticities, spending multipliers, and event probabilities are hardcoded. The `research/` JSON files are not consumed.
**Risk:** Medium — tuning the game requires code changes.
**Effort:** Medium
**Resolution:** Load parameters from JSON at startup, or at minimum, extract to a single `constants.ts` file.

### 6. Inconsistent UI Patterns
**Where:** `ChancellorGame.tsx`, `budget-system.tsx`, `dashboard.tsx`
**Problem:** Some views use the Treasury design system (CSS classes from `index.css`), others use raw Tailwind classes with generic colours (gray-200, gray-700, blue-50). The ProjectionsView and AnalysisTab use completely different styling from the rest of the app.
**Risk:** Medium — visual inconsistency degrades player experience.
**Effort:** Medium
**Resolution:** Audit all views against the design system in `index.css` and standardise.

### 7. Unused Player Name
**Where:** `game-state.tsx:startNewGame()`, `ChancellorGame.tsx:TurnPanel`
**Problem:** `playerName` is accepted as a parameter but never displayed. The TurnPanel always shows "Chancellor Reeves".
**Risk:** Low
**Effort:** Low
**Resolution:** Either use the player name in the UI or remove the parameter.

---

## 20. Game Overview and Player Experience

**Player role:** Chancellor of the Exchequer in the July 2024 Labour government, with a parliamentary majority of 174 seats.

**Objective:** Survive all 60 monthly turns (July 2024 – June 2029) without being sacked by the PM, losing a confidence vote, or triggering a market collapse.

**Constraints:**
- Fiscal rules must be met (chosen at game start)
- Manifesto pledges must be honoured (or face political consequences)
- Backbench MPs must be kept reasonably satisfied
- Markets must not panic (gilt yields, sterling, credibility)
- Public services must not collapse
- The Prime Minister will issue demands and threats

**A single turn consists of:**
1. Reviewing the dashboard (economic indicators, political health, service quality)
2. Optionally adjusting tax rates and spending in the Budget view
3. Optionally lobbying MPs, managing the manifesto, reading PM messages, consulting advisers
4. Responding to any triggered events (crises, strikes, scandals)
5. Clicking "Advance Month" to process the turn
6. Reading the newspaper summary of the month's events

**Win condition:** Survive all 60 turns to June 2029.

**Loss conditions:**
- PM reshuffle (defying a PM intervention when reshuffle risk triggers)
- Commons confidence vote defeat
- Market collapse (credibility index crashes, gilt yields spike)
- Backbench revolt (satisfaction collapses)

**Difficulty model:** Three modes (Forgiving, Standard, Realistic) that scale market reaction intensity, approval decay speed, strike probability, and PM intervention thresholds. The default is Realistic.

---

## 21. Game State — Complete Field Map

### metadata (GameMetadata)
| Field | Type | Meaning | Initial | Modified By |
|-------|------|---------|---------|-------------|
| `currentTurn` | number | 0-59, months since July 2024 | 0 | advanceTurn |
| `currentMonth` | number | 1-12, calendar month | 7 | advanceTurn |
| `currentYear` | number | 2024-2029 | 2024 | advanceTurn |
| `difficultyMode` | DifficultyMode | forgiving/standard/realistic | 'realistic' | startNewGame |
| `gameStarted` | boolean | Whether game has begun | false | startNewGame |
| `gameOver` | boolean | Whether game has ended | false | advanceTurn, respondToPMIntervention |
| `gameOverReason` | string? | Why the game ended | undefined | advanceTurn, respondToPMIntervention |
| `lastSaveTime` | number? | Timestamp of last manual save | undefined | saveGame |
| `playerName` | string? | Player's chosen name | undefined | startNewGame |

### economic (EconomicState)
| Field | Type | Meaning | Initial | Modified By |
|-------|------|---------|---------|-------------|
| `gdpNominal_bn` | number | Nominal GDP in £bn | 2750 | turn processor (GDP step) |
| `gdpGrowthMonthly` | number | Monthly GDP growth % | 0.083 | turn processor |
| `gdpGrowthAnnual` | number | Annual GDP growth % | 1.0 | turn processor |
| `inflationCPI` | number | CPI inflation % | 2.2 | turn processor (inflation step) |
| `inflationExpectations` | number | Expected inflation % | 2.2 | turn processor |
| `unemploymentRate` | number | Unemployment % | 4.2 | turn processor (employment step) |
| `wageGrowthAnnual` | number | Annual wage growth % | 5.4 | turn processor |
| `inflationAnchorHealth` | number | 0-100, how anchored expectations are | 72 | turn processor |
| `productivityGrowthAnnual` | number | Annual productivity growth % | 0.1 | turn processor |
| `productivityLevel` | number | Index, 100 = baseline | 100 | turn processor |
| `participationRate` | number | Labour force participation % | 63.0 | turn processor |
| `economicInactivity` | number | Economic inactivity % | 21.5 | turn processor |

### fiscal (FiscalState)
| Field | Type | Meaning | Initial | Modified By |
|-------|------|---------|---------|-------------|
| `incomeTaxBasicRate` | number | Basic rate % | 20 | applyBudgetChanges |
| `incomeTaxHigherRate` | number | Higher rate % | 40 | applyBudgetChanges |
| `incomeTaxAdditionalRate` | number | Additional rate % | 45 | applyBudgetChanges |
| `nationalInsuranceRate` | number | Employee NI % | 8 | applyBudgetChanges |
| `employerNIRate` | number | Employer NI % | 13.8 | applyBudgetChanges |
| `vatRate` | number | VAT % | 20 | applyBudgetChanges |
| `corporationTaxRate` | number | Corporation tax % | 25 | applyBudgetChanges |
| `personalAllowance` | number | £ | 12570 | applyBudgetChanges |
| `basicRateUpperThreshold` | number | £ | 50270 | applyBudgetChanges |
| `higherRateUpperThreshold` | number | £ | 125140 | applyBudgetChanges |
| `thresholdUprating` | enum | frozen/cpi_linked/earnings_linked/custom | 'frozen' | applyBudgetChanges |
| `thresholdFreezeMonths` | number | Months thresholds frozen | 36 | applyBudgetChanges |
| `fullExpensing` | boolean | Full expensing active | false | applyBudgetChanges |
| `antiAvoidanceInvestment_bn` | number | £bn anti-avoidance spend | 0.3 | applyBudgetChanges |
| `hmrcSystemsInvestment_bn` | number | £bn HMRC systems spend | 0.3 | applyBudgetChanges |
| `sdltAdditionalDwellingsSurcharge` | number | SDLT surcharge % | 3 | applyBudgetChanges |
| `startingTaxRates` | object | Tax rates at game start | {basic:20, higher:40, additional:45, niEmployee:8, niEmployer:13.8, vat:20, corpTax:25} | startNewGame (captured) |
| `revenueAdjustment_bn` | number | Other taxes revenue £bn | 0 | applyBudgetChanges |
| `totalRevenue_bn` | number | Total revenue £bn/year | 1090 | turn processor (fiscal balance) |
| `totalSpending_bn` | number | Total spending £bn/year | 1100 | applyBudgetChanges, turn processor |
| `spending` | SpendingBreakdown | Per-department current/capital/aggregate | See game-integration.ts | applyBudgetChanges |
| `deficit_bn` | number | Deficit £bn/year | 87 | turn processor |
| `deficitPctGDP` | number | Deficit % GDP | 3.2 | turn processor |
| `debtNominal_bn` | number | Debt stock £bn | 2540 | turn processor |
| `debtPctGDP` | number | Debt % GDP | 92.4 | turn processor |
| `debtInterest_bn` | number | Debt interest £bn/year | 95 | turn processor |
| `fiscalHeadroom_bn` | number | Headroom vs fiscal rule £bn | 9.9 | turn processor |
| `ucTaperRate` | number | UC taper rate % | 55 | applyBudgetChanges |
| `workAllowanceMonthly` | number | UC work allowance £/month | 344 | applyBudgetChanges |
| `childcareSupportRate` | number | Childcare support % | 30 | applyBudgetChanges |
| `pendingBudgetChange` | object? | Pending budget changes | null | applyBudgetChanges (when queued) |
| `pendingBudgetApplyTurn` | number? | Turn when pending budget applies | null | applyBudgetChanges |
| `nextFiscalEventTurn` | number | Next budget/autumn statement turn | 5 | applyBudgetChanges |
| `fiscalEventType` | enum? | budget/autumn_statement/emergency_budget | 'autumn_statement' | turn processor |
| `pendingAnnouncements` | array | Pre-announced tax packages | [] | applyBudgetChanges |
| `fiscalRuleBreaches` | number | Count of rule breaches | 0 | turn processor |
| `currentFiscalYear` | number | Current fiscal year | 2024 | turn processor (April rollover) |
| `fiscalYearStartTurn` | number | Turn when fiscal year started | 0 | turn processor |
| `fiscalYearStartSpending` | SpendingBreakdown | Spending at fiscal year start | Copy of initial spending | turn processor |

### markets (MarketState)
| Field | Type | Meaning | Initial | Modified By |
|-------|------|---------|---------|-------------|
| `bankRate` | number | BoE Bank Rate % | 5.25 | turn processor (MPC step) |
| `giltYield2y` | number | 2Y gilt yield % | 4.15 | turn processor |
| `giltYield10y` | number | 10Y gilt yield % | 4.10 | turn processor |
| `giltYield30y` | number | 30Y gilt yield % | 4.45 | turn processor |
| `mortgageRate2y` | number | 2Y mortgage rate % | 5.10 | turn processor |
| `sterlingIndex` | number | Sterling index (100 = base) | 100 | turn processor |
| `yieldChange10y` | number | 10Y yield change this turn | 0 | turn processor |
| `ldiPanicTriggered` | boolean | LDI crisis flag | false | turn processor |
| `mpcMembers` | array | 9 MPC members with stances | See game-integration.ts | turn processor |
| `lastMPCVoteBreakdown` | string | Last vote result | '9-0 to hold' | turn processor |
| `lastMPCDecision` | enum? | cut/hold/hold | 'hold' | turn processor |
| `assetPurchaseFacility_bn` | number | QE holdings £bn | 875 | turn processor |
| `qtPausedTurns` | number | QT paused turns | 0 | turn processor |

### services (ServicesState)
| Field | Type | Meaning | Initial | Modified By |
|-------|------|---------|---------|-------------|
| `nhsQuality` | number | 0-100 | 45 | turn processor |
| `educationQuality` | number | 0-100 | 58 | turn processor |
| `infrastructureQuality` | number | 0-100 | 48 | turn processor |
| `mentalHealthAccess` | number | 0-100 | 42 | turn processor |
| `primaryCareAccess` | number | 0-100 | 48 | turn processor |
| `socialCareQuality` | number | 0-100 | 38 | turn processor |
| `prisonSafety` | number | 0-100 | 40 | turn processor |
| `courtBacklogPerformance` | number | 0-100 | 32 | turn processor |
| `legalAidAccess` | number | 0-100 | 40 | turn processor |
| `policingEffectiveness` | number | 0-100 | 50 | turn processor |
| `borderSecurityPerformance` | number | 0-100 | 46 | turn processor |
| `railReliability` | number | 0-100 | 42 | turn processor |
| `affordableHousingDelivery` | number | 0-100 | 30 | turn processor |
| `floodResilience` | number | 0-100 | 53 | turn processor |
| `researchInnovationOutput` | number | 0-100 | 58 | turn processor |
| `consecutiveNHSCutMonths` | number | Months of NHS cuts | 0 | turn processor |
| `consecutiveEducationCutMonths` | number | Months of education cuts | 0 | turn processor |
| `consecutivePensionCutMonths` | number | Months of pension cuts | 0 | turn processor |
| `nhsStrikeMonthsRemaining` | number | Active NHS strike months | 0 | turn processor, event response |
| `educationStrikeMonthsRemaining` | number | Active education strike months | 0 | turn processor, event response |
| `staffingCapacity` | object | {nhs, education, policing, civilService, defence} | {62, 64, 61, 63, 66} | turn processor |

### political (PoliticalState)
| Field | Type | Meaning | Initial | Modified By |
|-------|------|---------|---------|-------------|
| `governmentApproval` | number | 0-100 | 45 | turn processor |
| `chancellorApproval` | number | 0-100 | 42 | turn processor |
| `backbenchSatisfaction` | number | 0-100 | 70 | turn processor |
| `pmTrust` | number | 0-100 | 75 | turn processor, PM interventions |
| `credibilityIndex` | number | 0-100 | 65 | turn processor |
| `strikeRisk` | number | 0-100 | 20 | turn processor |
| `chosenFiscalRule` | FiscalRuleId | Active fiscal rule | 'starmer-reeves' | startNewGame |
| `fiscalRuleCompliance` | object | Met/breached for each rule component | See game-integration.ts | turn processor |
| `pmInterventionsPending` | array | Pending PM intervention events | [] | turn processor |
| `creditRating` | string? | 'AA-' | 'AA-' | turn processor |
| `creditRatingOutlook` | string? | 'stable'/'negative'/'positive' | 'negative' | turn processor |

### manifesto (ManifestoState)
| Field | Type | Meaning | Initial | Modified By |
|-------|------|---------|---------|-------------|
| `selectedTemplate` | string? | Chosen manifesto template ID | Set by startNewGame | startNewGame |
| `pledges` | array | Individual pledges with progress | Generated from template | executeOneClickAction, checkPolicyForViolations |
| `totalPledges` | number | Total pledge count | From template | initialiseManifestoState |
| `totalViolations` | number | Count of broken pledges | 0 | applyManifestoViolations |

---

## 22. Turn Processing — Step-by-Step

The `processTurn()` function in `turn-processor.ts` executes the following steps in order:

### Step 1: Fiscal Year Rollover
- **Checks:** If current month is April (month 4), rolls over the fiscal year
- **Actions:** Updates `currentFiscalYear`, resets `fiscalYearStartTurn`, captures `fiscalYearStartSpending` snapshot, triggers OBR forecast snapshot, compares OBR forecast to actuals
- **Inputs:** `metadata.currentMonth`, `fiscal` state
- **Outputs:** Updated fiscal year tracking, OBR comparison

### Step 2: Emergency Programmes
- **Checks:** Any active emergency programmes (from event responses)
- **Actions:** Decrements `remainingMonths`, adds rebuilding costs to spending
- **Inputs:** `emergencyProgrammes.active`
- **Outputs:** Updated programme state, spending adjustments

### Step 3: Productivity Calculation
- **Formula:** Base trend + NHS quality effect + education quality effect + infrastructure quality effect + industrial strategy boost
- **Inputs:** Service quality indices, industrial strategy state
- **Outputs:** `productivityGrowthAnnual`, `productivityLevel`

### Step 4: GDP Growth
- **Formula:** Base trend (1.5% annual / 12 monthly) + fiscal impulse (spending/tax multipliers with lag distributions) + monetary impulse (BoE rate changes, 18-month lag) + external sector + confidence + productivity
- **Multiplier state-dependence:** Output gap modifies multiplier effectiveness (2.0× in deep recession, 0.5× in boom)
- **Inputs:** Spending changes, tax changes, BoE rate, external sector, confidence, productivity
- **Outputs:** `gdpGrowthMonthly`, `gdpGrowthAnnual`, `gdpNominal_bn`

### Step 5: External Sector
- **Checks:** Active external shocks (energy spike, trade war, partner recession, tariff shock, banking stress)
- **Actions:** Applies shock effects to GDP, inflation, trade balance
- **Inputs:** `externalSector` state
- **Outputs:** Updated external sector metrics

### Step 6: Employment/Unemployment
- **Formula:** Okun's Law — unemployment changes based on GDP growth deviation from trend, with 2-month lag
- **NAIRU:** 4.25%
- **Inputs:** GDP growth, previous unemployment
- **Outputs:** `unemploymentRate`, `participationRate`, `economicInactivity`

### Step 7: Inflation
- **Formula:** Hybrid Phillips curve — 40% persistence + 35% expectations + 15% domestic pressure + 10% import prices
- **Expectations:** De-anchor when credibility < 50 (partial) or < 30 (full adaptive)
- **Inputs:** Previous inflation, inflation expectations, output gap, wage growth, sterling, energy prices
- **Outputs:** `inflationCPI`, `inflationExpectations`, `inflationAnchorHealth`

### Step 8: Wage Growth
- **Formula:** Base + 0.40 × inflation expectations - 0.45 × (unemployment - NAIRU) + 0.30 × productivity
- **Inputs:** Inflation expectations, unemployment, productivity
- **Outputs:** `wageGrowthAnnual`

### Step 9: MPC Voting
- **Process:** Each of 9 MPC members votes based on their stance (hawkish/dovish/neutral) and current inflation vs target
- **Decision:** Majority vote determines rate change (cut/hold/hike)
- **Adjustment speed:** 30% per meeting (8 meetings/year)
- **Inputs:** Inflation, output gap, MPC member stances
- **Outputs:** `bankRate`, `lastMPCDecision`, `lastMPCVoteBreakdown`

### Step 10: Tax Revenue
- **Per tax:** Revenue = base × (1 + rate_change)^elasticity × (1 + GDP_growth)^gdpElasticity × behavioural_response
- **Behavioural responses:** Avoidance for top rates, Laffer effects, forestalling for CGT
- **Inputs:** Tax rates, GDP growth, employment, behavioural parameters
- **Outputs:** `totalRevenue_bn`, per-tax revenues

### Step 11: Fiscal Balance
- **Formula:** Deficit = totalSpending - totalRevenue
- **Spending:** Sum of all department current + capital spending + welfare AME + debt interest + emergency programme costs
- **Inputs:** Spending allocations, tax revenues, debt interest
- **Outputs:** `deficit_bn`, `deficitPctGDP`, `totalRevenue_bn`, `totalSpending_bn`

### Step 12: Debt Dynamics
- **Formula:** debt[t] = debt[t-1] + deficit/12 (monthly accumulation)
- **Debt interest:** Conventional gilts (58%) + index-linked (25%) + APF losses, with 14-year average maturity smoothing
- **Inputs:** Previous debt, deficit, gilt yields, inflation
- **Outputs:** `debtNominal_bn`, `debtPctGDP`, `debtInterest_bn`

### Step 13: Gilt Market
- **Formula:** 10Y yield = neutral rate + inflation expectations + term premium + fiscal risk premium
- **Fiscal risk premium:** Non-linear function of debt/GDP (escalates above 100%)
- **Inputs:** Debt/GDP, deficit/GDP, credibility index, inflation
- **Outputs:** `giltYield10y`, `giltYield2y`, `giltYield30y`, `yieldChange10y`

### Step 14: Mortgage/Housing
- **Formula:** Mortgage rate = expected BoE rate + bank margin
- **House prices:** Respond to mortgage affordability with 3-month lag
- **Inputs:** Bank rate, gilt yields
- **Outputs:** `mortgageRate2y`, `housePriceIndex`, `housePriceGrowthAnnual`

### Step 15: Service Quality
- **Per service:** Quality = previous + funding effect - degradation
- **Degradation:** Depends on real funding growth relative to maintenance threshold
- **NHS:** Needs 2.5% real growth to maintain; degrades -0.40/month if underfunded
- **Inputs:** Spending levels, inflation, previous quality
- **Outputs:** All 15 service quality indices

### Step 16: Political Approval
- **Formula:** Approval = previous + real wage effect + unemployment effect + NHS effect + event effects - natural decay
- **Loss aversion:** Negative events weighted 2×
- **Inputs:** Wage growth, unemployment, NHS quality, events
- **Outputs:** `governmentApproval`, `chancellorApproval`

### Step 17: Backbench/PM
- **Backbench satisfaction:** Drifts toward fiscal-rule-specific target, modified by policy decisions
- **PM trust:** Modified by approval, backbench satisfaction, fiscal rule compliance
- **PM communications:** Messages generated based on relationship state
- **PM interventions:** Checked for trigger conditions (backbench revolt, manifesto breach, economic crisis, approval collapse, fiscal rule breach)
- **Inputs:** Policy decisions, approval, fiscal rule compliance
- **Outputs:** `backbenchSatisfaction`, `pmTrust`, PM messages, PM interventions

### Step 18: Events/Media
- **Event generation:** Threshold-based and random events checked
- **Newspaper generation:** Headlines selected based on current state and newspaper bias
- **Inputs:** All state variables
- **Outputs:** `pendingEvents`, `currentNewspaper`, `eventLog`

### Step 19: Game Over Check
- **Checks:** Term complete (turn >= 60), PM reshuffle, confidence vote, market collapse
- **Inputs:** All state variables, difficulty settings
- **Outputs:** `gameOver`, `gameOverReason`

### Step 20: Snapshot Recording
- **Actions:** Records historical snapshot (GDP, inflation, unemployment, deficit, debt, approval, gilt yield, productivity)
- **Outputs:** `monthlySnapshots` array

---

## 23. Economic Model

### Macroeconomic Variables Tracked
| Variable | Unit | Meaning |
|----------|------|---------|
| GDP nominal | £bn | Total economic output at current prices |
| GDP growth | % annual | Rate of economic expansion |
| CPI inflation | % annual | Consumer price inflation |
| Unemployment | % | Labour force without work |
| Wage growth | % annual | Nominal wage increases |
| Productivity | Index (100=base) | Output per hour worked |
| Bank Rate | % | BoE policy rate |
| 10Y Gilt Yield | % | Long-term government borrowing cost |
| Mortgage Rate 2Y | % | Typical 2-year fixed mortgage |
| Sterling Index | Index (100=base) | GBP trade-weighted value |

### Causal Relationships
- **Spending increases → GDP growth** (via fiscal multipliers, 0.6-1.0× depending on type and economic state)
- **Tax increases → GDP growth** (via tax multipliers, -0.02% to -0.05% per pp)
- **GDP growth → Tax revenue** (via GDP elasticity, 0.6-1.3× depending on tax)
- **GDP growth → Unemployment** (via Okun's Law, -0.35 coefficient)
- **Unemployment → Wage growth** (via Phillips Curve, -0.45 coefficient)
- **Wage growth + Output gap → Inflation** (via Phillips Curve)
- **Inflation → BoE rate** (via Taylor rule)
- **BoE rate → Mortgage rates → Consumption** (via mortgage payment shock)
- **Debt/GDP → Gilt yields** (non-linear, escalating above 100%)
- **Gilt yields → Debt interest** (with 14-year lag)
- **Service quality → Productivity → GDP** (feedback loop)
- **Approval → Backbench satisfaction → PM trust → Reshuffle risk** (political cascade)

### Lag Structures
| Effect | Lag | Reason |
|--------|-----|--------|
| Income tax revenue | 2 months | PAYE payroll adjustment |
| Corporation tax revenue | 6 months | Self-assessment timing |
| Spending → GDP | Distributed (60% months 0-6, 30% months 7-12, 10% months 13-24) | Implementation delay |
| Capital investment → GDP | Back-loaded (20% months 0-6, 40% months 7-12, 40% months 13-36) | Project timelines |
| BoE rate → GDP | 18 months | Monetary transmission |
| NHS funding → quality | 6 months | Service delivery lag |
| Education funding → quality | 12 months | Academic year cycle |
| Debt yield adjustment | 14-year average maturity | DMO issuance profile |

### Fiscal Multipliers
- **Current spending:** 0.70 (Y1), 0.80 (Y2), 0.60 (LR)
- **Capital investment:** 1.00 (Y1), 1.30 (Y2), 1.50 (LR)
- **NHS:** 0.80 (Y1), 0.90 (Y2), 0.70 (LR)
- **State-dependent:** Multipliers double in recession (output gap < -3%), halve in boom (output gap > 1%)

### External Shocks
- Energy price spikes, trade wars, partner recessions, tariff shocks, banking sector stress
- Probability: 5-10% per year depending on type
- Magnitude: GDP impact -0.5% to -3.0%, inflation impact +0.5% to +3.0%

### Simplifications vs Reality
- No supply-side structural reforms modelled
- No housing market feedback into banking stability (beyond mortgage rates)
- No international capital flows
- No quantitative easing/QT effects beyond APF losses
- No devolved government fiscal autonomy (Barnett formula simplified)
- No behavioural microfoundations (all agents are aggregate)

### Internal Consistency
> DEBT: The deficit identity (spending - revenue = deficit) is correctly maintained. The debt accumulation (debt += deficit/12 monthly) is correct. However, the debt-to-GDP ratio is calculated as `debtNominal_bn / (gdpNominal_bn / 100)` which divides annual GDP by 100 to get a percentage — this is correct. The fiscal headroom calculation uses a hardcoded `OBR_HEADROOM_CALIBRATION = -14.8` which appears to be a calibration offset rather than a derived value. > UNCLEAR: The origin of -14.8 is not documented.

---

## 24. Budget and Fiscal System

### Tax Instruments
| Tax | Current Rate | Valid Range | Revenue per pp | Approval Cost |
|-----|-------------|-------------|---------------|---------------|
| Income Tax Basic | 20% | 0-50% | +£7.0bn | -6 pts |
| Income Tax Higher | 40% | 20-60% | +£2.0bn | -3 pts |
| Income Tax Additional | 45% | 40-70% | +£0.2bn | -1 pt |
| NI Employee | 8% | 0-20% | +£6.0bn | -5 pts |
| NI Employer | 13.8% | 0-25% | +£8.5bn | -3 pts |
| VAT | 20% | 0-30% | +£7.5bn | -8 pts |
| Corporation Tax | 25% | 10-40% | +£3.2bn | -2 pts |

### Granular Tax Controls (20 parameters)
SDLT additional dwellings surcharge (0-10%), pension annual allowance, ISA allowance, dividend allowance, insurance premium tax, soft drinks levy, VAT domestic energy (5%), VAT private schools (20%), VAT registration threshold, annual investment allowance, R&D tax credit rate (27%), bank surcharge (3%), energy profits levy (35%), patent box rate (10%), CGT annual exempt amount (£3,000), CGT residential surcharge (8%), BADR rate (10%), BADR lifetime limit (£1m), IHT residence nil rate band (£175,000).

### Revenue Calculation
Total revenue = sum of 6 main tax revenues (calculated via elasticity formulas) + `revenueAdjustment_bn` (lump sum from granular taxes). Each main tax revenue = base × (1 + rate_change)^elasticity × (1 + GDP_growth)^gdpElasticity × (1 - avoidance_response).

### Spending Categories
| Department | Current (£bn) | Capital (£bn) | Total (£bn) |
|-----------|--------------|--------------|-------------|
| NHS | 168.4 | 12.0 | 180.4 |
| Education | 104.0 | 12.0 | 116.0 |
| Defence | 39.0 | 16.6 | 55.6 |
| Welfare | 290.0 | 0 | 290.0 |
| Infrastructure | 20.0 | 80.0 | 100.0 |
| Police | 18.5 | 0.5 | 19.0 |
| Justice | 12.7 | 0.3 | 13.0 |
| Other | 306.0 | 20.0 | 326.0 |

### Spending Effectiveness
Spending affects service quality with a 6-month lag for NHS, 12 months for education. Quality affects productivity, which feeds back into GDP. NHS needs 2.5% real growth to maintain quality; education needs 1.5%.

### Deficit and Debt
- **Deficit:** totalSpending - totalRevenue (annualised)
- **Debt accumulation:** debt += deficit / 12 (monthly)
- **Debt interest:** Calculated from gilt yields with 14-year average maturity smoothing

### Borrowing Costs
- Conventional gilts (58% of debt): yield × debt stock
- Index-linked gilts (25%): yield × (1 + RPI/100) × debt stock
- APF losses: £1.2bn/month fixed
- Average yield adjusts slowly: 0.7% monthly rollover rate

### Budget Constraints
- No hard cap on spending or tax rates
- Fiscal rules act as soft constraints (breaches reduce credibility and trigger PM interventions)
- Lords delay: Major tax rises (>5pp) or spending cuts (>15% real) trigger 6-turn Lords scrutiny delay

### Policy Conflict Detection
Three conflicts detected:
1. **Demand shock:** Large simultaneous tax rises and spending cuts
2. **Innovation deterrent:** R&D credit cuts combined with corporation tax rises
3. **Strike accelerator:** Public sector pay below inflation combined with service cuts

---

## 25. Political System

### Political Variables
| Variable | Range | Initial | Meaning |
|----------|-------|---------|---------|
| Government Approval | 0-100 | 45 | Public support for the government |
| Chancellor Approval | 0-100 | 42 | Personal approval of the Chancellor |
| Backbench Satisfaction | 0-100 | 70 | Labour backbench contentment |
| PM Trust | 0-100 | 75 | PM's confidence in the Chancellor |
| Credibility Index | 0-100 | 65 | Market confidence in fiscal management |
| Strike Risk | 0-100 | 20 | Probability of industrial action |

### Approval Calculation
- **Real wage effect:** +0.20 per 1% real wage growth
- **Unemployment effect:** -0.50 per pp rise year-on-year
- **NHS effect:** -0.25 per point below 60 quality
- **Natural decay:** 0.50/month (honeymoon), 0.30/month (mid-term), 0.20/month (pre-election)
- **Loss aversion:** Negative events weighted 2× positive

### Election Mechanics
- No early election mechanic (the game runs for exactly 60 turns)
- Turn 60 = "Survived full term! Election time."
- No election outcome calculation — surviving to turn 60 is the win condition

### Parliamentary Dynamics
- **Whip strength:** Starts at 70, drifts based on backbench satisfaction
- **Lords delay:** 6 turns for major changes, extendable to 12
- **Select committees:** 5 committees (Treasury, Health, Education, Public Accounts, Home Affairs) with scrutiny pressure
- **Confidence vote:** Threshold 62 rebel MPs, formally tracked but not fully implemented

### Media and Press
- 6 newspaper sources: Guardian, Telegraph, Times, FT, Sun, Daily Mail
- Each has distinct bias (left/centre/right) affecting headline selection
- Headlines generated from templates based on current state
- Press sentiment affects approval and backbench satisfaction

### Political Events
- PM interventions (comply/defy choices)
- Backbench revolts
- Sector strikes (NHS, teachers, pensioners)
- Credit rating changes
- Market panic triggers

---

## 26. MP System

### What MPs Represent
650 individual Members of Parliament, each with distinct ideology, constituency demographics, traits, and faction affiliation. They determine whether the government's budget passes through parliamentary voting.

### Data Model (MPProfile)
| Field | Type | Range | Meaning |
|-------|------|-------|---------|
| `id` | string | — | Unique identifier |
| `name` | string | — | MP name |
| `party` | PartyAffiliation | 10 parties | Party affiliation |
| `constituency` | Constituency | — | Seat details (name, region, marginality, demographics) |
| `faction` | LabourFaction? | 5 factions | Labour faction (left, soft_left, centre_left, blairite, party_loyalist) |
| `ideology` | IdeologicalPosition | economicAxis: -10 to +10, socialAxis: -10 to +10, fiscalConservatism: 0-10 | Political positioning |
| `traits` | MPTraits | 0-10 each | rebelliousness, ambition, principled, careerist, popularityFocused |
| `background` | string | — | Professional background |
| `enteredParliament` | number | Year | Year first elected |
| `isMinister` | boolean | — | Whether in government |
| `committees` | string[] | — | Select committee memberships |

### MP Behaviour
Stance calculated via:
1. **Ideological alignment** (±50 points): Distance between MP ideology and budget ideology
2. **Manifesto violations** (-10 per violation for Labour MPs)
3. **Broken promises** (-20 per broken promise to that MP)
4. **Active promises** (+10 if MP complies, +2 if not)
5. **Constituency impact** (±15 points): Based on demographics and budget changes
6. **Granular impact** (±50 points): Evaluates all 88 budget parameters against MP concerns
7. **Trait modifiers:** Rebelliousness (-15 if >7), ministerial status (+18), principled (-10 if ideology misaligned)
8. **Plausibility penalty:** Extreme tax mixes penalised
9. **Whip operation:** Undecided MPs swayed by whip strength

### Lobbying Mechanics
- **Three approaches:** Promise (70% base), Persuade (40% base), Threaten (55% base)
- **Modifiers:** Rebelliousness (×0.6 if >7), principled (×0.5 for threats if >7), careerist (×1.4 for threats if >7), broken promises (×0.8^n), marginality (×1.2 if >70)
- **Backfire:** Threats have 30% backfire chance on failure
- **Success:** Sets manual override stance for the current budget

### Scale
650 MPs, each with ~15-20 concerns. Stance calculation runs on every budget change. Group formation clusters MPs by shared concerns (typically 5-15 groups).

> DEBT: The concern profile generation (`generateMPConcernProfile`) is called fresh for every MP on every stance calculation with no caching. For 650 MPs, this is thousands of object allocations per budget change.

---

## 27. Adviser System

### What Advisers Are
Six distinct adviser archetypes, each with a named persona, perspective, and mechanical effects. The player can hire up to 3 simultaneously.

### Adviser Types
| Type | Name | Perspective |
|------|------|-------------|
| `treasury_mandarin` | Sir Humphrey Cavendish | Fiscal orthodoxy, market stability |
| `political_operator` | Sarah Chen | Electoral strategy, public opinion |
| `heterodox_economist` | Dr Maya Okonkwo | Growth-first, MMT-adjacent |
| `fiscal_hawk` | Lord Braithwaite | Deficit reduction, austerity |
| `social_democrat` | Rebecca Thornton | Social justice, public services |
| `technocratic_centrist` | James Ashworth | Evidence-based, pragmatic |

### Hiring/Firing
- **Hire:** Select from available types, adds to `hiredAdvisers` Map
- **Fire:** Remove from `hiredAdvisers`, returns to `availableAdvisers` Set
- **Max:** 3 simultaneously
- **Cost:** None (purely informational/mechanical)

### Mechanical Effects
Advisers provide:
1. **Opinions:** Generated each turn based on state changes. Templates in `data/adviser-opinions.ts` trigger based on metric thresholds.
2. **Predictions:** Forward-looking statements about economic trajectory
3. **Warnings:** Alerts when metrics approach danger thresholds
4. **Relationship tracking:** Each adviser has a relationship score (0-100) that changes based on whether the player follows their advice
5. **Resignation:** If relationship drops below 20, adviser may resign (30% probability per turn)
6. **Accuracy tracking:** Predictions are compared to actual outcomes; accuracy score affects future opinion weight

> INCOMPLETE: The adviser system generates opinions and warnings but does not have direct mechanical effects on the simulation (no multipliers, no additive bonuses). The "mechanical bonuses" described in the README are not implemented — advisers are purely advisory.

---

## 28. Manifesto System

### What the Manifesto Represents
A set of campaign pledges chosen at game start that constrain the Chancellor's policy options. Breaking pledges costs approval and backbench satisfaction.

### Five Templates
1. **cautious-centrist** — Tax locks on income tax, NI, VAT; spending growth commitments
2. **social-democratic** — Strong spending pledges, tax rises on wealthy, no austerity
3. **growth-focused** — Investment pledges, corporation tax stability, infrastructure focus
4. **blair-style** — Fiscal discipline, public service reform, pro-business
5. **prudent-progressive** — Balanced approach, targeted spending, moderate tax changes

### Pledge Tracking
Each pledge has:
- `id`, `description`, `category` (tax_lock, spending_pledge, outcome_pledge)
- `targetDepartment` (if applicable)
- `violated` (boolean), `turnViolated` (when violated)
- Progress tracking for spend-based pledges

### Violation Detection
`checkPolicyForViolations()` compares proposed budget changes against manifesto locks:
- Tax lock violations: Any increase in locked tax rates
- Spending cut violations: Real-terms cuts to pledged departments
- Consequences: -6 approval per tax lock breach, -3 per spending breach

### One-Click Fulfilment
`executeOneClickAction()` allows the player to automatically reverse a violated pledge (e.g., restore income tax rates to manifesto levels). This costs political capital but restores credibility.

> INCOMPLETE: The one-click fulfilment reverses rates halfway, not fully. The player cannot fully honour a pledge without manually adjusting rates.

---

## 29. Events and Media System

### Event Generation
Two types:
1. **Threshold-triggered:** Events fire when metrics cross thresholds (e.g., approval < 25%, debt/GDP > 110%)
2. **Random:** Probability-based events (5-10% per month depending on type)

### Event Taxonomy
12 event categories:
- International crises (war, trade disputes)
- Domestic shocks (pandemic, natural disaster)
- Market panics (gilt crisis, sterling crash)
- Natural disasters (flooding, storms)
- Scandals (ministerial, party)
- Industrial action (strikes, protests)
- Economic data (GDP revisions, inflation surprises)
- Political crises (leadership challenges, resignations)
- Policy consequences (unintended effects)
- Sector-specific (NHS crisis, education crisis, pensioner revolt)
- Credit rating changes
- Fiscal rule breaches

### Event Data Model
| Field | Type | Meaning |
|-------|------|---------|
| `id` | string | Unique identifier |
| `type` | string | Event category |
| `title` | string | Headline |
| `description` | string | Narrative text |
| `responseOptions` | array | Player choices with economicImpact, fiscalCost, rebuildingMonths |
| `requiresResponse` | boolean | Whether player must choose |
| `economicImpact` | object | {gdpGrowth, inflation, unemployment, approvalRating, pmTrust, giltYieldBps, sterlingPercent} |

### Media Mechanics
- **Newspaper generation:** Each turn, a newspaper is generated with a lead story, secondary story, and 4-6 paragraphs
- **Bias:** 6 sources with distinct political leanings affect which events are covered and how
- **Opposition quotes:** Generated from templates based on current state
- **Social media:** Trending hashtags and posts generated from templates

### Event Chaining
> INCOMPLETE: Events do not chain or cascade. Each event is independent. The architecture doc describes event chaining but it is not implemented.

### Event Pool
Static templates in `data/` files, selected based on current state. No procedural generation beyond template selection and variable interpolation.

---

## 30. Static Content and Data

### Data Files

| File | Content | Structure | Consumed By | Status |
|------|---------|-----------|-------------|--------|
| `data/newspaper-headlines.ts` | 1107 lines of headline templates | Arrays of objects with 6 bias variants each | `events-media.tsx` | Complete |
| `data/pm-messages.ts` | 521 lines of PM message templates | Objects keyed by message type | `pm-system.tsx` | Complete |
| `data/social-media-posts.ts` | 607 lines of social media templates | Arrays of post objects by persona | `social-media-system.tsx` | Complete |
| `data/adviser-opinions.ts` | 481 lines of adviser opinion templates | Objects keyed by trigger condition | `adviser-system.tsx` | Complete |
| `data/mp-interactions.ts` | 510 lines of MP interaction responses | Objects keyed by approach/outcome | `mp-system.tsx` | Complete |
| `data/industrial-interventions.ts` | 59 lines of industrial policy catalogue | Array of intervention objects | `game-state.tsx` | Complete |
| `data/sector-revolts.ts` | 41 lines of revolt headlines | Array of headline strings | `events-media.tsx` | Complete |
| `data/dashboard-history.ts` | 123 lines of historical data (2014-2024) | Array of monthly snapshots | `ChancellorGame.tsx` | Complete |

### Research Files (Not Consumed at Runtime)
| File | Content | Status |
|------|---------|--------|
| `research/game-data-comprehensive.json` | Comprehensive UK fiscal/economic data | > INCOMPLETE: Not loaded by application |
| `research/fiscal-data-july2024.json` | July 2024 fiscal baseline | > INCOMPLETE: Not loaded by application |
| `research/spending-departments-2024.json` | Departmental spending breakdown | > INCOMPLETE: Not loaded by application |
| `research/political-structure-2024.json` | Political party/faction data | > INCOMPLETE: Not loaded by application |
| `research/economic-parameters.json` | Economic calibration parameters | > INCOMPLETE: Not loaded by application |
| `research/monetary-policy-fiscal-rules.json` | Monetary policy and fiscal rules | > INCOMPLETE: Not loaded by application |
| `research/historical-precedents.md` | Historical fiscal events | > INCOMPLETE: Not loaded by application |
| `research/mp-voting-records-2024.md` | MP voting records | > INCOMPLETE: Not loaded by application |
| `research/research-summary.md` | Summary of research inputs | > INCOMPLETE: Not loaded by application |

> MISSING: The `research/` directory contains extensive calibration data that should drive the simulation's initial values and parameters, but none of it is loaded at runtime. All values are hardcoded in `game-integration.ts`.

---

## 31. Domain Logic Correctness Assessment

### Directional Correctness
- **Tax → Revenue:** Correct direction (higher rates → more revenue, with diminishing returns via elasticity < 1)
- **Spending → GDP:** Correct direction (multipliers positive for spending, negative for taxes)
- **GDP → Unemployment:** Correct (Okun's Law, negative relationship)
- **Unemployment → Wages:** Correct (Phillips Curve, negative relationship)
- **Wages → Inflation:** Correct (wage-price spiral)
- **Inflation → BoE Rate:** Correct (Taylor rule)
- **BoE Rate → Mortgages → Consumption:** Correct
- **Debt → Gilt Yields:** Correct (non-linear escalation)
- **Service Quality → Productivity → GDP:** Correct feedback loop

### Magnitude Plausibility
- Tax revenue per pp figures are broadly consistent with HMRC/OBR estimates
- Spending multipliers are within IMF/OBR ranges
- Okun coefficient (-0.35) is UK-specific and reasonable
- Phillips curve slope (-0.45) is consistent with BoE estimates

### Feedback Loops
- **Missing:** No housing market → banking stability feedback. A housing crash should increase bank stress, which should tighten credit, which should reduce GDP.
- **Missing:** No debt → approval direct channel. High debt should directly affect approval beyond the gilt yield channel.
- **Present but weak:** Service quality → productivity → GDP → tax revenue → spending capacity → service quality. This loop exists but the productivity effect is small (0.005 × quality deviation).

### Exploitable Mechanics
> DEBT: The player can repeatedly raise and lower tax rates within a single turn (via budget changes) without penalty, as long as the net change is zero. The manifesto violation check only fires on net changes.

### Dead Variables
- `economicInactivity` is tracked but never affects any calculation
- `participationRate` is tracked but only modified, never consumed
- `mpSystem.lobbyingInProgress` is set but never read
- `political.backbenchers` is an empty array, never populated
- `political.polling`, `political.opinionFactors`, `political.significantEvents` are typed but never used

### Arbitrary Placeholders
- `OBR_HEADROOM_CALIBRATION = -14.8` — undocumented calibration constant
- `strikeTriggerThresholdMultiplier = 1` — no clear calibration basis
- Event probabilities (5-10% per month) — not calibrated to historical frequency

---

## 32. Application Shell and Navigation

### Top-Level Structure
`ChancellorGame` → `GameStateProvider` → `GameInner`

### GameInner Rendering Logic
1. `!metadata.gameStarted` → `GameStartScreen` (full-screen modal)
2. `metadata.gameOver` → `Dashboard` (background) + `GameOverModal` (overlay)
3. Normal play → `treasury-shell` layout:
   - `TurnPanel` (top masthead with month, progress bar, key metrics, "Advance Month" button)
   - `treasury-shell-grid` (CSS grid):
     - Left: `NavigationBar` (sidebar with view tabs, political risk indicators, dark mode toggle, save button)
     - Right: Active view content

### Navigation Model
Tab-based navigation via `NavigationBar` with 7 views + PM Messages:
- Dashboard (key `1`)
- Budget (key `2`)
- Analysis (key `3`)
- Advisers (key `4`)
- MPs (key `5`)
- Manifesto (key `7`)
- Prime Minister (key `6`, separate from tab list)

### Persistent UI Elements
- **TurnPanel:** Always visible at top. Shows month/year, turn progress (X of 60), progress bar, government approval, fiscal headroom, 10Y gilt yield, PM trust, "Advance Month" button
- **NavigationBar:** Always visible on left. Shows view tabs with keyboard shortcuts, political risk indicators (manifesto breaches, unread PM messages), dark mode toggle, save button
- **Modal layer:** Event modal, newspaper modal, PM intervention modal, save/load modal, lobbying modal, MP detail modal, tutorial modal, shortcuts help modal

### Loading/Initialisation Flow
1. Blank page → React mounts
2. `GameStateProvider` initialises state
3. Autosave loaded from localStorage (if exists)
4. MP data loaded from IndexedDB (async)
5. Initial MP stances calculated
6. If `gameStarted === false` → GameStartScreen
7. If `gameStarted === true` → Full game shell

### Game Over Handling
- Dashboard remains visible in background
- `GameOverModal` overlays with: reason, performance grade (A+ to F), score /100, months in office, term progress, final approval, final deficit, final economic state, manifesto adherence
- "Start New Game" button resets everything

---

## 33. Dashboard and Main Game View

### Layout
Three-column layout (from `dashboard.tsx`):
- **Column 1 (left):** Economy metrics, Fiscal metrics, Markets metrics
- **Column 2 (middle):** Political health, Public services
- **Column 3 (right):** Spending breakdown, Fiscal rules status
- **Far right edge:** `SocialMediaPulseStrip` (narrow vertical strip)

### Metrics Displayed

**Economy:**
- GDP Growth (annual %) — `economic.gdpGrowthAnnual`
- Inflation (CPI %) — `economic.inflationCPI`
- Unemployment (%) — `economic.unemploymentRate`
- Wage Growth (%) — `economic.wageGrowthAnnual`

**Fiscal:**
- Total Revenue (£bn) — `fiscal.totalRevenue_bn`
- Total Spending (£bn) — `fiscal.totalSpending_bn`
- Deficit (% GDP) — `fiscal.deficitPctGDP`
- Debt (% GDP) — `fiscal.debtPctGDP`
- Fiscal Headroom (£bn) — `fiscal.fiscalHeadroom_bn`

**Markets:**
- 10Y Gilt Yield (%) — `markets.giltYield10y`
- Bank Rate (%) — `markets.bankRate`
- Sterling Index — `markets.sterlingIndex`

**Political:**
- Government Approval (%) — `political.governmentApproval`
- PM Trust (/100) — `political.pmTrust`
- Backbench Satisfaction (/100) — `political.backbenchSatisfaction`
- Credibility Index (/100) — `political.credibilityIndex`
- Strike Risk (%) — `political.strikeRisk`

**Public Services:**
- 15 quality indices displayed as progress bars with colour coding (green >60, amber >40, red <40)

### Turn Advancement Control
"Advance Month" button in the TurnPanel (top masthead). No confirmation step. Keyboard shortcut: Cmd/Ctrl+Enter.

### Last-Turn Delta Display
The `simulation.lastTurnDelta` object tracks approval change, gilt yield change, deficit change, and their drivers. However, this is not displayed on the dashboard — it is only used internally. > MISSING: The turn delta is computed but not surfaced to the player.

### Colour Coding
- Green (`text-good` / `bg-status-good`): Positive indicators
- Amber (`text-warning` / `bg-warning`): Caution indicators
- Red (`text-bad` / `bg-status-bad`): Negative indicators
- Treasury Red (`text-primary`): Primary accent
- Ink Blue (`text-secondary`): Secondary text

---

## 34. Budget and Tax UI

### Structure
The `BudgetSystem` component (budget-system.tsx) is a full-screen view with:
- **Header:** Budget title, fiscal event indicator, pending changes warning
- **Tax section:** Scrollable list of tax controls
- **Spending section:** Scrollable list of spending controls
- **Summary panel:** Aggregate revenue, spending, deficit, headroom
- **Parliamentary support indicator:** Shows projected vote count
- **Submit button:** "Submit Budget" with confirmation

### Tax Controls
Each tax has:
- Label (e.g., "Income Tax (Basic Rate)")
- Current rate display
- Slider or stepper input for adjustment
- Real-time revenue impact display
- Manifesto lock indicator (if applicable)

### Spending Controls
Each department has:
- Department name
- Current budget display (£bn)
- Slider for adjustment
- Real-time impact on service quality

### Aggregate Summary
Updates in real-time as player adjusts controls:
- Total Revenue (£bn)
- Total Spending (£bn)
- Deficit (£bn and % GDP)
- Fiscal Headroom (£bn)

### Policy Conflict Warnings
Displayed as inline banners when conflicts detected:
- Demand Shock warning
- Innovation Deterrent warning
- Strike Accelerator warning

### Pending Budget Changes
When major changes are made outside a fiscal event window, they are queued for the next fiscal event. A warning banner shows the pending changes and their effective turn.

### Confirmation
"Submit Budget" button triggers parliamentary vote simulation. If the budget passes, changes are applied. If it fails, the player must revise.

> INCONSISTENT: The budget UI uses generic Tailwind classes (bg-white, border-gray-200, rounded-sm) rather than the Treasury design system classes used in the rest of the application.

---

## 35. MP and Parliamentary Panel

### Structure
`MPManagementScreen` is a full-screen view with:
- **Header:** MP count, group count
- **Filter bar:** Party, faction, region, stance filters + search input
- **MP list:** Scrollable list of MPs with key info
- **MP detail modal:** Full profile when an MP is selected
- **Lobbying modal:** Interaction interface when "Lobby" is clicked

### Filtering
- Party filter: 10 parties
- Faction filter: 5 Labour factions (only shown for Labour)
- Region filter: 12 UK regions
- Stance filter: support/oppose/undecided
- Search: Text search by name

### MP List View
Per MP:
- Name
- Party badge (colour-coded)
- Faction (if Labour)
- Constituency name
- Stance indicator (support/oppose/undecided)
- Marginality indicator

### MP Detail View
- Full profile: name, party, faction, constituency, background
- Ideology: economic axis, social axis, fiscal conservatism
- Traits: rebelliousness, ambition, principled, careerist, popularityFocused
- Concerns: Top 5 issues with priority
- Voting record: History of budget votes
- Current stance: Score and reasoning

### Lobbying Interface
- Three approach buttons: Promise, Persuade, Threaten
- Promise approach: Select category and value
- Result: Success/failure message with narrative text
- Success: MP stance set to support (manual override)
- Failure: No change (or backfire for threats)

### Budget Support Summary
Shows aggregate support count:
- Support: X MPs
- Undecided: X MPs
- Oppose: X MPs
- Government majority: X

> INCOMPLETE: The parliamentary vote simulation in `budget-system.tsx` duplicates the stance calculation logic from `mp-system.tsx`. The two implementations may diverge.

---

## 36. Events and Newspaper UI

### Pending Events
- Event modal appears when `pendingEvents` has entries
- Modal shows: event title, description, response options
- Each response option shows: label, description, economic impact
- Player selects a response → effects applied → event moved to log

### Event Response Interface
- Response options displayed as buttons
- Economic impact shown for each option (GDP, inflation, unemployment, approval, gilt yield, sterling)
- Fiscal cost shown if applicable
- Rebuilding timeline shown if applicable

### Newspaper Display
- Appears after each turn advance (100ms delay)
- Full-screen modal with newspaper layout
- Shows: lead story headline, secondary story, 4-6 paragraphs
- Source newspaper identified with bias indicator
- "Close" button to dismiss

### Social Media Display
- `SocialMediaPulseStrip` — narrow vertical strip on the right edge of the dashboard
- Shows: trending hashtags, recent posts from various personas
- Updates each turn

### Event Log
- Stored in `events.eventLog` array
- > MISSING: No UI for browsing the event log. It is computed but not displayed.

### Press Sentiment Indicator
> MISSING: No persistent press sentiment indicator. Each newspaper is generated independently with no running sentiment score.

---

## 37. PM Relationship and Messages UI

### PM Inbox
`PMMessagesScreen` is a full-screen view with:
- **Header:** Relationship status (patience, reshuffle risk)
- **Message list:** Chronological list of PM messages
- **Message detail:** Full message content when selected

### Message Display
Per message:
- Subject line
- Type indicator (check-in, warning, threat, demand, praise, concern, reshuffle warning)
- Tone indicator (supportive, neutral, stern, angry)
- Content body
- Timestamp (turn number)
- Read/unread indicator

### Active Demands
- Displayed in the PM inbox sidebar
- Shows: category, description, deadline (turn number), met/unmet status

### Threats and Deadlines
- Threat messages show: target deficit, deadline turn, baseline deficit
- Breached threats trigger PM interventions

### Reshuffle Warning
- Special message type: `reshuffle_warning`
- Triggers PM intervention modal with comply/defy choice
- Defying has a probability-based game over outcome

---

## 38. Adviser UI

### Available and Hired Advisers
`AdviserManagementScreen` shows:
- **Hired advisers:** Cards with name, type, relationship score, latest opinion
- **Available advisers:** Cards with name, type, perspective description
- **Hire/Fire buttons:** On each card

### Hire/Fire Interface
- "Hire" button on available adviser → adds to hired list (max 3)
- "Fire" button on hired adviser → removes, returns to available
- No confirmation step

### Adviser Opinions
- Generated each turn based on state changes
- Displayed as cards with headline, summary, prediction
- Colour-coded by adviser type
- Relationship score shown as progress bar

### Mechanical Bonuses Disclosure
> MISSING: The UI does not disclose that advisers currently have no mechanical effects on the simulation. Players may expect hiring advisers to provide bonuses, but they are purely informational.

---

## 39. Manifesto UI

### Structure
`ManifestoDisplay` is a full-panel view showing:
- **Header:** Manifesto name and theme
- **Pledge list:** Each pledge with description, category, progress
- **Violation indicators:** Broken pledges highlighted in red
- **One-click action buttons:** "Restore" buttons for violated pledges

### Pledge Display
Per pledge:
- Description
- Category badge (tax lock, spending pledge, outcome pledge)
- Progress bar (for spend-based pledges)
- Violation status (honoured/violated)
- If violated: turn violated, approval cost

### Progress Tracking
- Spend-based pledges show progress as a percentage of target
- Tax lock pledges show current rate vs locked rate
- Outcome pledges show current metric vs target

### Violation Display
- Violated pledges highlighted in red
- Total violation count shown in navigation badge
- Approval cost shown per violation

### One-Click Actions
- "Restore" button on violated pledges
- Reverses the violating policy change (partially — halfway back to original)
- No confirmation step
- > INCOMPLETE: Partial reversal only; player must manually complete the restoration.

---

## 40. Fiscal Framework and OBR UI

### Fiscal Rule Selection
- Presented on the GameStartScreen (second step after manifesto selection)
- 7 rules displayed as selectable cards
- Each shows: name, description, market reaction (gilt yields, sterling), political reaction (backbench, credibility)
- Selected rule highlighted with left border accent

### Fiscal Rule Compliance
- Displayed in the Analysis tab (Data view)
- Shows: rule name, compliance status (COMPLIANT/NON-COMPLIANT), individual rule component status
- Each component shown as a badge (Met/Breached)

### OBR Forecast Display
- Displayed in the Analysis tab (Projections view)
- Shows: forecast horizon (12/24/36/48 months), baseline vs pending budget comparison
- Charts: GDP growth, inflation, unemployment, deficit, debt, service quality
- OBR-style forecast vs outturn table (if comparison available)

### Debt Management Interface
- `debtManagement` state tracks maturity profile, issuance strategy
- > MISSING: No dedicated UI for debt management. The issuance strategy can be changed via `setDebtIssuanceStrategy` action but there is no UI component for it.

---

## 41. UI State and Ephemeral State

### Purely UI State
| State | Location | Purpose |
|-------|----------|---------|
| `currentView` | ChancellorGame.tsx | Active view tab |
| `showNewspaper` | ChancellorGame.tsx | Newspaper modal visibility |
| `showSaveLoad` | ChancellorGame.tsx | Save/load modal visibility |
| `showShortcuts` | ChancellorGame.tsx | Shortcuts modal visibility |
| `showTutorial` | ChancellorGame.tsx | Tutorial modal visibility |
| `lobbyingMPId` | ChancellorGame.tsx | Currently lobbying MP |
| `detailMPId` | ChancellorGame.tsx | Currently viewing MP detail |
| `saveSlotName` | ChancellorGame.tsx | Save slot text input |
| `loadError` | ChancellorGame.tsx | Load error message |
| `isDarkMode` | NavigationBar | Dark mode toggle state |
| `projectionMonths` | ProjectionsView | Forecast period selector |
| `activeChart` | AnalysisTab/ProjectionsView | Active chart category |
| `activeView` | AnalysisTab | Data vs Projections toggle |
| `selectedServiceMetric` | ProjectionsView | Selected service for chart |

### Where UI State Lives
- Most UI state is local component state (`useState`) in `ChancellorGame.tsx`
- Dark mode state is in `NavigationBar` component
- Chart state is in `AnalysisTab` and `ProjectionsView` components

### UI State Incorrectly Persisted
- `budgetDraft` is persisted to localStorage but is cleared on turn advance. This is correct behaviour.
- `mpSystem.filterSettings` and `mpSystem.selectedMPForDetail` are serialised to null/empty in `serializeGameState()` — correct.

### UI State in Main Application State
- `mpSystem.filterSettings` and `mpSystem.selectedMPForDetail` are stored in the main state but are purely UI concerns. > DEBT: These should be local component state in the MP panel.

---

## 42. Responsiveness, Accessibility, and Visual Design

### Responsiveness
- Tailwind responsive classes used sparingly (`md:`, `lg:` prefixes)
- Grid layouts adapt from 1 to 2 to 3 columns based on viewport
- No explicit mobile-optimised layout — the game is designed for desktop

### Accessibility
- **ARIA:** Minimal usage. No `aria-label` on most interactive elements.
- **Keyboard navigation:** Comprehensive shortcuts implemented (1-7, /, ?, Escape, Cmd+Enter)
- **Focus states:** CSS `:focus` styles defined in `index.css` but not consistently applied
- **Screen reader:** No `aria-live` regions for dynamic content updates
- **Colour contrast:** Treasury design system uses high-contrast colours but generic Tailwind colours (gray-200, gray-700) in some views may not meet WCAG AA

### Visual Design System
- **Design tokens:** CSS custom properties in `index.css` for all colours, fonts, spacing, radii, shadows
- **Typography:** Display font (serif via CSS variable), body font (system-ui), mono font (SF Mono/Consolas)
- **Colour palette:** Treasury Red primary, Ink Blue secondary, status colours (good/warning/bad/neutral)
- **Spacing:** 8px base grid (space-1 through space-24)
- **Border radius:** Zero-radius design (`radius-none` = 0, `radius-sm` = 2px) — "HM Treasury aesthetic"
- **Shadows:** Minimal — `shadow-none` by default

### Visual Consistency
> INCONSISTENT: The Treasury design system (CSS classes from `index.css`) is used in the main shell (TurnPanel, NavigationBar, modals) but the Analysis tab, Projections view, and Budget system use raw Tailwind classes with generic colours (gray-200, gray-700, blue-50, rounded-sm). This creates a jarring visual discontinuity when navigating between views.

### Loading States
- No skeleton screens
- No loading spinners
- MP data loads asynchronously but no loading indicator is shown

### Animations
- `transition-all` on navigation tabs and buttons
- Progress bar width transitions (`transition-all duration-300`)
- Modal overlay fade-in (via CSS `modal-overlay` class)
- No entrance animations or scroll-triggered effects

---

## 43. UI/Logic Coupling Assessment

### ChancellorGame.tsx
- **Business logic embedded:** `calcScore()` in GameOverModal (scoring algorithm), `generateResearchAlignedHistoricalBaseline()` (historical data generation), `clamp()` utility
- **Extraction candidates:**
  - `calcScore()` → `domain/game/scoring.ts`
  - `generateResearchAlignedHistoricalBaseline()` → `data/historical-baseline.ts`
  - `clamp()` → `utils/math.ts`

### budget-system.tsx
- **Business logic embedded:** Parliamentary vote calculation (duplicates `mp-system.tsx`), policy conflict detection (should use `domain/budget/policy-conflicts.ts`), revenue projection calculations
- **Extraction candidates:**
  - Parliamentary vote calculation → `domain/parliament/vote-simulation.ts`
  - Revenue projection → `domain/fiscal/revenue-projection.ts`

### game-state.tsx
- **Business logic embedded:** Budget change application, manifesto violation checking, PM intervention consequences, MP lobbying
- **Extraction candidates:**
  - Budget change application → `domain/budget/apply-changes.ts`
  - PM intervention consequences → `domain/pm/intervention-consequences.ts`
  - MP lobbying → `domain/mp/lobbying.ts`

### mp-system.tsx
- **Business logic embedded:** Ideology calculation, constituency impact, concern profile generation, lobbying probability, group formation
- **Extraction candidates:**
  - Ideology calculation → `domain/mp/ideology.ts`
  - Constituency impact → `domain/mp/constituency-impact.ts`
  - Concern profile generation → `domain/mp/concern-profiles.ts`

### turn-processor.ts
- **Business logic embedded:** All 19 calculation steps
- **Assessment:** This is the correct location for business logic. However, individual steps should be extracted into separate modules for testability.

---

## 44. Open Questions and Ambiguities

1. **OBR_HEADROOM_CALIBRATION = -14.8:** The origin and calibration basis of this constant are not documented. It appears to be a fudge factor to make the initial headroom match a target value.

2. **Player name parameter:** Accepted by `startNewGame()` but never displayed. Is this an unfinished feature or an oversight?

3. **Adviser mechanical effects:** The README states advisers provide "mechanical bonuses" but no such bonuses exist in the code. Were they planned and never implemented, or is the README inaccurate?

4. **Event chaining:** The architecture doc describes event chaining (one event triggering another) but this is not implemented. Was this deliberately deferred or abandoned?

5. **Confidence vote mechanics:** `formalConfidenceVotePending`, `confidenceVoteThreshold`, and `confidenceVoteTurn` are tracked in the parliamentary state but the actual vote mechanics are not implemented. > INCOMPLETE: The infrastructure exists but the feature is not functional.

6. **Research data files:** The `research/` directory contains extensive JSON data that is never loaded. Were these intended to be loaded at runtime, or are they purely reference material for developers?

7. **Vite migration:** `VITE_MIGRATION.md` documents a planned migration that has not been executed. Is this still planned, or has it been abandoned?

8. **Early election mechanic:** The game runs for exactly 60 turns with no early election option. The architecture doc mentions early elections but they are not implemented.

9. **`political.backbenchers` array:** Typed and initialised as empty but never populated. Is this a vestige of a previous design?

10. **Projections engine fuzz:** The `applyProjectionFuzz` function adds random noise to projections using a seeded random number generator. The noise parameters (0.1 for GDP, 0.25 for borrowing, etc.) appear arbitrary and are not calibrated.

11. **`console.assert` in PM comply:** The assertion condition `Object.keys(budgetChanges).length >= 0` is always true (array length is never negative). This is a bug — the assertion never fires.

---

## 45. Summary Assessment

### Overall Health: **Acceptable (3/5)**

**Justification:** The economic engine is remarkably sophisticated — the 19-step turn processor implements realistic UK fiscal relationships with proper lag structures, state-dependent multipliers, and non-linear crisis triggers. The MP system is ambitious and largely functional. However, the codebase suffers from severe architectural debt: a 2800-line God object (`game-state.tsx`), inconsistent UI patterns between views, zero unit test coverage for the core simulation, and a dual persistence model that requires extensive defensive code. The project is clearly moving in the right direction conceptually but is accumulating technical debt faster than it is being resolved.

### Three Most Important Things to Address

1. **Refactor `game-state.tsx`** — Split into focused modules (types, persistence, actions by domain). This is the single biggest risk to the codebase's maintainability. Without this, every change becomes riskier.

2. **Add unit tests for the turn processor** — Extract each calculation step into a pure, testable function. The economic model is the core value proposition of this game; it must be tested.

3. **Standardise the UI design system** — The Analysis tab, Projections view, and Budget system use generic Tailwind classes that clash with the Treasury design system. Audit and convert all views to use the CSS variable design tokens defined in `index.css`.

### Three Things the Codebase Does Well

1. **Economic model fidelity** — The turn processor implements realistic UK fiscal relationships with proper lag structures, state-dependent multipliers, and non-linear crisis triggers. This is genuinely impressive for a browser game.

2. **Save/load robustness** — The version migration system (v1→v3), checksum validation, and Map normalisation code show careful attention to data integrity across schema changes.

3. **MP system depth** — 650 individual MPs with ideology, constituency demographics, traits, concern profiles, and lobbying mechanics. This level of political simulation is rare in any game, let alone a browser-based one.

### Direction Assessment

**The codebase is accumulating problems faster than they are resolved.** The economic engine and MP system are world-class for their domain, but the surrounding architecture is not keeping pace. The God object pattern, inconsistent UI, lack of tests, and unused research data all point to a project that is feature-forward but architecture-light. The Vite migration plan is a good sign of maturity awareness, but it needs to be executed alongside a proper architectural refactor, not as a standalone task.