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