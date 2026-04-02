# Copilot Instructions for Chancellor Simulator

## Project Overview

A single-page React/TypeScript browser game simulating a five-year UK Chancellorship (July 2024 - June 2029). The player manages fiscal policy, navigates Westminster politics, and attempts to survive a full parliamentary term.

## Architecture

- **State**: React Context (`game-state.tsx`) owns the authoritative `GameState`
- **Simulation**: `turn-processor.ts` runs a 20-step monthly cycle (economics, fiscal, markets, politics, events, game-over)
- **Persistence**: localStorage for game saves, IndexedDB for MP roster (650 MPs)
- **Styling**: Tailwind CSS 3 with CSS variable design tokens in `src/index.css`
- **Build**: Create React App via `react-scripts` 5

## Key Files

| File | Purpose |
|------|---------|
| `ChancellorGame.tsx` | App shell, routing, modals, keyboard shortcuts |
| `game-state.tsx` | Context provider, persistence, action dispatch |
| `game-integration.ts` | State factories, fiscal rules, shared types |
| `turn-processor.ts` | Monthly simulation engine |
| `budget-system.tsx` | Budget workstation UI + logic |
| `mp-system.tsx` | MP model, lobbying, voting, UI |
| `adviser-system.tsx` | Adviser profiles, opinions, hire/fire |

## Conventions

- British English throughout (colour, behaviour, programme)
- No emojis in UI, comments, or documentation
- `.ts` extension for pure logic files, `.tsx` for files rendering JSX
- Design tokens defined as CSS custom properties in `src/index.css`, mapped in `tailwind.config.js`
- Zero border-radius design (architectural, sharp aesthetic)
- Fiscal rule IDs: `starmer-reeves`, `jeremy-hunt`, `golden-rule`, `maastricht`, `balanced-budget`, `debt-anchor`, `mmt-inspired`
- Adviser type IDs: `treasury_mandarin`, `political_operator`, `heterodox_economist`, `fiscal_hawk`, `social_democrat`, `technocratic_centrist`

## Commands

```bash
npm start          # Development server
npm run build      # Production build
npm run typecheck  # TypeScript check
npm test           # Jest tests
npm run format     # Prettier formatting
```
