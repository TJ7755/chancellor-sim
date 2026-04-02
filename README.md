# Chancellor Sim

A five-year UK Chancellorship simulation. Manage fiscal policy, navigate Westminster politics, and survive a full parliamentary term from July 2024 to June 2029.

## Running the Game

```bash
cd chancellor-sim
npm install
npm start
```

The game opens at http://localhost:3000.

## Project Structure

```
chancellor-sim/                   # React application (the executable)
  src/
    ChancellorGame.tsx            # App shell, start flow, navigation, modal orchestration
    game-state.tsx                # React Context state management, persistence, actions
    game-integration.tsx          # Baseline state factories, fiscal rule catalogue, types
    turn-processor.tsx            # Monthly simulation engine (20-step cycle)
    budget-system.tsx             # Budget workstation UI and budgeting logic
    dashboard.tsx                 # Condensed dashboard view
    mp-system.tsx                 # MP data model, lobbying, stance calculation, vote simulation
    mp-data.tsx                   # Constituency database (650 MPs)
    mp-groups.tsx                 # MP faction grouping
    mp-storage.tsx                # IndexedDB persistence for MP data
    pm-system.tsx                 # PM relationship scoring and message generation
    pm-messages-screen.tsx        # PM inbox UI
    manifesto-system.tsx          # Manifesto templates, pledge tracking, one-click fulfilment
    adviser-system.tsx            # Adviser profiles, hire/fire mechanics, opinions
    events-media.tsx              # Random event generation, newspapers, event logging
    social-media-system.tsx       # Social pulse strip and sentiment calculations
    projections-engine.tsx        # Clone-and-project forward budget scenarios
    tutorial-system.tsx           # Instructional help system
    laffer-analysis.tsx           # Tax revenue curve estimates
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

Single-page React/TypeScript application. State lives in React Context, persistence splits between localStorage (game saves) and IndexedDB (MP roster). The monthly simulation runs in `turn-processor.tsx` through a 20-step cycle covering economics, fiscal arithmetic, parliamentary mechanics, service quality, politics, media, forecasts and game-over conditions.

## Build and Deploy

```bash
npm run build      # Production build to build/
npm run typecheck  # TypeScript type check
npm test           # Jest test suite
```

Deploys to GitHub Pages via `.github/workflows/static.yml` on push to main.

## Tech Stack

- React 18, TypeScript 4.9
- Tailwind CSS 3 with CSS variable design tokens
- Recharts for data visualisation
- Create React App (react-scripts 5)
- Jest for testing
