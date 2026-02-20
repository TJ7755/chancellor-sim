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
