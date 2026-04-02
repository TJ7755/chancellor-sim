# Chancellor Sim

A five-year UK Chancellorship simulation. Manage fiscal policy, navigate Westminster politics, and survive a full parliamentary term from July 2024 to June 2029.

## Running the Game

```bash
cd chancellor-sim
npm install
npm start
```

The game opens at http://localhost:3000.

## Gameplay

You are the Chancellor of the Exchequer. The objective is to manage the UK economy, public finances, and political coalition for a full parliamentary term without being sacked or collapsing the system.

- **60 monthly turns** from July 2024 to June 2029
- **Choose your fiscal framework**: Starmer-Reeves Stability Rule, Jeremy Hunt's Consolidated Mandate, Brown's Golden Rule, Maastricht Criteria, Balanced Budget, Debt Anchor, or Full Employment (MMT-inspired)
- **Set tax rates**: Income tax (basic/higher/additional), employee and employer National Insurance, VAT, corporation tax, plus granular levers (SDLT, CGT, IHT, R&D credits, bank surcharge, and more)
- **Allocate spending**: Current and capital budgets across NHS, education, defence, welfare, infrastructure, police, justice, and other departments
- **Manage welfare**: Universal Credit taper rate, work allowance, childcare support
- **Navigate Parliament**: 650 individual MPs with distinct ideologies, factions, and constituency pressures. Lobby, persuade, and manage backbench rebellions
- **Handle the Prime Minister**: Maintain PM trust, respond to demands, survive reshuffle threats
- **Fulfil manifesto pledges**: Randomly assigned manifesto with tax locks, spending commitments, and outcome pledges
- **Appoint advisers**: Six distinct adviser types (Treasury Mandarin, Political Operator, Heterodox Economist, Fiscal Hawk, Social Democrat, Technocratic Centrist) each providing unique analysis and mechanical bonuses
- **Respond to events**: International crises, market panics, natural disasters, scandals, industrial action, and policy consequences
- **Read the press**: Newspaper coverage from papers with distinct biases and editorial styles

### Win/Loss Conditions

- **Win**: Survive all 60 months to June 2029
- **Lose**: PM reshuffle (sacking), Commons confidence vote defeat, or other game-over conditions tied to market collapse, backbench revolt, or fiscal crisis

### Difficulty Modes

- **Forgiving**: Gentler market reactions, higher tolerance for policy errors
- **Standard**: Balanced challenge
- **Realistic**: Full market discipline, tight political constraints (default)

## Project Structure

```
chancellor-sim/                   # React application (the executable)
  src/
    ChancellorGame.tsx            # App shell, start flow, navigation, modal orchestration
    game-state.tsx                # React Context state management, persistence, actions
    game-integration.ts           # Baseline state factories, fiscal rule catalogue, types
    turn-processor.ts             # Monthly simulation engine (20-step cycle)
    budget-system.tsx             # Budget workstation UI and budgeting logic
    dashboard.tsx                 # Condensed dashboard view
    mp-system.tsx                 # MP data model, lobbying, stance calculation, vote simulation
    mp-data.ts                    # Constituency database (650 MPs)
    mp-groups.ts                  # MP faction grouping
    mp-storage.tsx                # IndexedDB persistence for MP data
    pm-system.tsx                 # PM relationship scoring and message generation
    pm-messages-screen.tsx        # PM inbox UI
    manifesto-system.tsx          # Manifesto templates, pledge tracking, one-click fulfilment
    adviser-system.tsx            # Adviser profiles, hire/fire mechanics, opinions
    events-media.tsx              # Random event generation, newspapers, event logging
    social-media-system.tsx       # Social pulse strip and sentiment calculations
    projections-engine.ts         # Clone-and-project forward budget scenarios
    tutorial-system.tsx           # Instructional help system
    laffer-analysis.ts            # Tax revenue curve estimates
    SpendingReviewModal.tsx       # Spending review planning UI
    state/                        # Selectors, budget draft persistence, save/load
    domain/                       # Pure domain logic (parliament, fiscal, PM, budget)
    data/                         # Static content templates (messages, headlines, posts)
    ui/shell/                     # Reusable UI components
    __tests__/                    # Jest test suite
design/                           # Architectural and economic design documents
research/                         # Research inputs and calibration data
```

## Architecture

Single-page React/TypeScript application. State lives in React Context, persistence splits between localStorage (game saves) and IndexedDB (MP roster). The monthly simulation runs in `turn-processor.ts` through a 20-step cycle covering:

1. Economic fundamentals (GDP, employment, inflation, wages)
2. Fiscal arithmetic (tax revenues, spending, deficit, debt)
3. Market dynamics (gilt yields, sterling, mortgage rates, MPC voting)
4. Service quality evolution (NHS, education, infrastructure, justice)
5. Parliamentary mechanics (Lords delay, whip strength, confidence votes)
6. Political consequences (approval, backbench satisfaction, PM trust)
7. Event generation and newspaper output
8. OBR forecast snapshots and game-over conditions

## Build and Deploy

```bash
npm run build      # Production build to build/
npm run typecheck  # TypeScript type check
npm test           # Jest test suite
npm run format     # Format code with Prettier
```

Deploys to GitHub Pages via `.github/workflows/static.yml` on push to main.

## Tech Stack

- React 18, TypeScript 4.9
- Tailwind CSS 3 with CSS variable design tokens (zero-radius, Treasury aesthetic)
- Recharts for data visualisation
- Create React App (react-scripts 5)
- Jest for testing
- Lucide React for icons
