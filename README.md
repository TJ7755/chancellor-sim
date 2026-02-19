# UK Chancellor Simulation Game

A hyper-realistic simulation of being the UK Chancellor of the Exchequer (finance minister) in a Labour government from July 2024 to June 2029.

## Overview

You are Rachel Reeves' successor as Chancellor after Labour's landslide 2024 victory. Your mission: survive the full five-year parliamentary term whilst managing the UK economy, public finances, and political pressures.

This is **brutally realistic**. Every policy has trade-offs. Breaking manifesto pledges has consequences. Economic relationships are based on real UK data from the Office for Budget Responsibility (OBR) and HM Treasury models.

## Features

### Complete Economic Model
- **GDP growth** influenced by fiscal policy, confidence, interest rates, exchange rates
- **Inflation** via Phillips Curve, VAT pass-through, imported inflation
- **Unemployment** following Okun's Law (GDP-unemployment relationship)
- **Bank of England** monetary policy via Taylor Rule
- **Financial markets** with gilt yields, sterling, mortgage rates
- **Fiscal dynamics** with automatic stabilisers and debt sustainability

### Political System
- **200 individual backbench MPs** with ideologies, constituencies, and survival instincts
- **Government approval** based on economic performance and public services
- **PM trust** tracking - get sacked if it falls too low
- **Backbench revolts** if satisfaction drops below critical thresholds

### Manifesto System
- **5 different Labour manifesto templates** representing different political approaches:
  - Cautious Centrist (Blairite fiscal prudence)
  - Social Democratic (larger state, higher spending)
  - Growth-Focused (public investment priority)
  - Blair-Style (self explanetory)
  - Prudent Progressive (balanced approach)
- **Breaking pledges** damages approval and PM trust permanently
- **Clear warnings** when policies violate manifesto commitments

### Public Services Quality
- **NHS** quality depends on real-terms funding growth
- **Education** quality affected by teacher numbers and funding
- **Infrastructure** quality improves with capital investment
- Service quality affects productivity and public approval

### Game Systems
- **Turn-based gameplay**: Each turn = one month
- **Auto-save system**: Progress saved automatically
- **Game over conditions**: PM sacking, backbench revolt, or surviving to 2029
- **Historical tracking**: Full economic history stored for analysis
- **Tutorial system**: A help button that gives out help

## Installation & Running

The complete game is in the `chancellor-sim` folder.

```bash
# Navigate to game directory
cd chancellor-sim

# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build
```

The game will open in your browser at http://localhost:3000

### Game Start

1. Choose your manifesto (or let the system choose randomly)
2. Each manifesto has different pledges and constraints
3. Read the tutorial (blue ? button) to understand game mechanics

### Each Turn

1. Review current economic and political situation
2. Click "Advance to Next Month"
3. Watch as economic calculations process
4. Check for any events or crises
5. Adjust policy if needed

### Key Goals

- **Survive 60 months** (July 2024 to June 2029)
- Keep **government approval** above 35%
- Keep **PM trust** above 30
- Keep **deficit** manageable (target: below 3% of GDP)
- Keep **debt** from rising too fast
- Maintain **public services** quality
- Honor **manifesto pledges** when possible

## Game Mechanics

### Economic Relationships

#### GDP Growth
- Base trend: 1.5% annually
- Influenced by: fiscal policy, confidence, rates, sterling
- Spending multipliers: Infrastructure (0.8), Current consumption (0.7)
- Tax multipliers: All negative (taxes reduce growth)

#### Inflation
- Target: 2.0% CPI
- Phillips Curve: Tight labour markets (unemployment < NAIRU) → inflation
- VAT pass-through: 50% of VAT increases flow to prices
- Imported inflation: Weaker sterling → higher inflation

#### Unemployment
- NAIRU (natural rate): 4.25%
- Okun's Law: 1% GDP growth → -0.4pp unemployment (lagged)

#### Bank of England
- Taylor Rule: Raises rates when inflation above 2% or growth strong
- Gradual adjustment (15% per month towards target)
- Affects: mortgage rates, house prices, consumption

#### Fiscal Position
- Revenue: Tax rates × (1 + GDP growth)^elasticity
- Spending: Policy choices + debt interest
- Deficit: Spending - Revenue
- Debt: Cumulative deficits

#### Financial Markets
- Gilt yields = Bank Rate + risk premium
- Risk premium increases with: high deficit, high debt, low credibility
- Sterling = Interest rate differential + confidence
- Mortgage rates = Gilt yields + bank margin

### Political Mechanics

#### Government Approval
- Economic performance: GDP, unemployment, inflation, real wages
- Public services: NHS quality matters most
- Fiscal responsibility: Markets and public both watch deficit
- Manifesto adherence: Breaking pledges damages trust
- Honeymoon bonus: First 12 months get approval boost

#### PM Trust
- Approval ratings (most important)
- Manifesto adherence (PM cares about party promises)
- Fiscal responsibility (PM wants credible government)
- Backbench satisfaction (PM needs parliamentary support)

#### Backbench Satisfaction
- Electability (approval ratings)
- Fiscal credibility (deficit and debt levels)
- Marginal MPs care most about survival

### Manifesto Violations

Breaking these pledges triggers approval/trust penalties:

- **Income tax rises**: -6 approval, -8 PM trust
- **NI rises**: -6 approval, -8 PM trust
- **VAT rises**: -9 approval, -10 PM trust
- **Corporation tax rises**: -4 approval, -5 PM trust
- **NHS real-terms cuts**: -5 to -8 approval depending on manifesto
- **Education cuts**: -3 to -4 approval
- **Breaking fiscal rules**: -6 approval, -12 PM trust

### Game Over Conditions

You lose if:
- **PM trust < 20**: PM sacks you for losing confidence
- **Backbench satisfaction < 25**: Parliamentary revolt forces resignation
- **Major economic crisis**: Combination of market panic + political collapse

You win if:
- **Survive 60 months**: Make it to June 2029 election

## Strategy Tips

### Early Game (Months 1-12)
- You have a honeymoon period - use it wisely
- Build fiscal headroom for future shocks
- Avoid breaking major manifesto pledges early
- Invest in infrastructure (high long-term return)

### Mid Game (Months 13-36)
- Monitor economic indicators closely
- Adjust policy to keep approval stable
- Watch for market stress (rising gilt yields)
- Keep backbenchers satisfied with good poll numbers

### Late Game (Months 37-60)
- Focus on electability (economic performance)
- Build strong finish heading into election
- Don't panic - gradual adjustments beat sudden shifts
- Credibility accumulated over time pays off

### Economic Management
- **Stimulus**: Spending up + Taxes down → Growth up, Deficit up
- **Austerity**: Spending down + Taxes up → Growth down, Deficit down
- **Balanced path**: Modest growth + Modest deficit = Best survival odds
- **Infrastructure spending**: Highest GDP multiplier (0.8-1.0)
- **Tax rises**: Least harmful = Income tax on rich > Corp tax > NI > VAT

### Political Management
- **NHS is sacred**: Real-terms cuts are politically catastrophic
- **Keep promises**: Breaking pledges has permanent effects
- **Build credibility early**: Makes crises more survivable
- **Watch backbenchers**: They care about seats, not ideology
- **Market confidence matters**: Fiscal responsibility prevents crises

## Difficulty

**Challenging but fair.** About 40-50% of players survive if they:
- Understand economic trade-offs
- Keep manifesto pledges when possible
- Avoid market crises via fiscal responsibility
- Balance growth, deficit, and approval

Most failures come from:
- Breaking too many manifesto pledges
- Ignoring market warnings (rising gilt yields)
- Cutting NHS funding in real terms
- Losing backbench support via poor polls

## Technical Details

### Architecture
- **React 18** with TypeScript
- **React Context API** for state management
- **Tailwind CSS** for styling
- **Turn-based game loop** with 20-step calculation sequence

### Economic Model
Based on:
- OBR Economic and Fiscal Outlook (July 2024)
- HM Treasury fiscal models
- Academic research (Okun's Law, Phillips Curve, Taylor Rule)
- Historical UK fiscal data (2000-2024)

### Data Sources
- Office for Budget Responsibility
- Office for National Statistics
- Bank of England
- Institute for Fiscal Studies
- Historical precedents (1997-2024)

## Project Structure

```
Chancellor/
├── README.md                       # This file - game overview
├── INTEGRATION_COMPLETE.md         # Technical integration summary
├── .gitignore                      # Git ignore rules
├── chancellor-sim/                 # Main game application
│   ├── src/
│   │   ├── ChancellorGame.tsx          # Main game component
│   │   ├── game-state.tsx              # Unified game state (Context API)
│   │   ├── game-integration.tsx        # Type definitions and initialization
│   │   ├── turn-processor.tsx          # Monthly calculation engine
│   │   ├── manifesto-system.tsx        # Manifesto generation and tracking
│   │   ├── tutorial-system.tsx         # Tutorial and help system
│   │   ├── economic-engine.tsx         # Economic formulas (legacy)
│   │   ├── political-system.tsx        # Political simulation (legacy)
│   │   ├── adviser-system.tsx          # Adviser management (legacy)
│   │   ├── budget-system.tsx           # Budget interface (legacy)
│   │   ├── events-media.tsx            # Event generation (legacy)
│   │   └── dashboard.tsx               # Data visualisation (legacy)
│   ├── public/                         # Static assets
│   ├── build/                          # Production build (created by npm run build)
│   ├── package.json                    # Dependencies
│   └── tsconfig.json                   # TypeScript configuration
├── design/                         # Technical specifications
│   ├── architecture.md                 # Complete technical blueprint
│   ├── economic-model.md               # Formula specifications
│   ├── economic-formulas.json          # Parameter definitions
│   └── [other design docs]
└── research/                       # Research data
    ├── game-data-comprehensive.json    # Starting state and parameters
    ├── fiscal-data-july2024.json       # Real UK fiscal data
    ├── political-structure-2024.json   # MP data
    └── [other research files]
```

## Credits

**Game Design & Development**: TJ7755
**Economic Model**: Based on OBR/HM Treasury models
**Political System**: Based on UK parliamentary politics 1997-2024

## Disclaimer

This is a simulation for educational and entertainment purposes. It simplifies complex economic and political relationships. Real fiscal policy involves many more constraints and uncertainvties.

## Future Enhancements

Potential additions (not yet implemented):
- Budget event flow (Spring/Autumn budgets)
- Dynamic events (recessions, crises, scandals)
- Adviser opinions and recommendations
- Media coverage system
- More detailed tax and spending breakdowns
- Regions and devolution
- International shocks (trade wars, pandemics)

## Version

**Version 1.0** - Complete core game (January 2025)
