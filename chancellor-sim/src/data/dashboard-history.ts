export interface HistoricalBaselinePoint {
  monthIndex: number;
  gdpGrowth: number;
  cpi: number;
  unemployment: number;
  bankRate: number;
  deficitToGdp: number;
  debtToGdp: number;
}

export function createDashboardHistoricalBaseline(): HistoricalBaselinePoint[] {
  const history: HistoricalBaselinePoint[] = [];

  for (let i = 0; i < 24; i++) {
    history.push({
      monthIndex: i,
      gdpGrowth: 2.5 - i * 0.01,
      cpi: 0.5 + i * 0.03,
      unemployment: 6.0 - i * 0.05,
      bankRate: 0.5,
      deficitToGdp: 5.0 - i * 0.05,
      debtToGdp: 85.0 + i * 0.05,
    });
  }

  for (let i = 24; i < 36; i++) {
    const monthInYear = i - 24;
    const isPostBrexit = monthInYear >= 5;
    history.push({
      monthIndex: i,
      gdpGrowth: isPostBrexit ? 1.5 : 2.0,
      cpi: isPostBrexit ? 2.0 + (monthInYear - 5) * 0.15 : 1.0,
      unemployment: 4.9,
      bankRate: 0.5 - (isPostBrexit && monthInYear >= 7 ? 0.25 : 0),
      deficitToGdp: 3.5,
      debtToGdp: 87.0,
    });
  }

  for (let i = 36; i < 72; i++) {
    history.push({
      monthIndex: i,
      gdpGrowth: 1.5 + Math.sin(i / 6) * 0.3,
      cpi: 2.5 + Math.sin(i / 8) * 0.5,
      unemployment: 4.0 + Math.sin(i / 12) * 0.3,
      bankRate: 0.25 + (i - 36) * 0.015,
      deficitToGdp: 2.5 + Math.sin(i / 6) * 0.3,
      debtToGdp: 86.0 - (i - 36) * 0.05,
    });
  }

  for (let i = 72; i < 84; i++) {
    const monthInYear = i - 72;
    const isCrash = monthInYear >= 2 && monthInYear <= 4;
    const isRecovery = monthInYear > 4;

    if (isCrash) {
      history.push({
        monthIndex: i,
        gdpGrowth: -20.0 + (monthInYear - 2) * 5,
        cpi: 0.5,
        unemployment: 4.0 + (monthInYear - 2) * 0.4,
        bankRate: 0.1,
        deficitToGdp: 10.0 + (monthInYear - 2) * 2,
        debtToGdp: 85.0 + (monthInYear - 2) * 3,
      });
      continue;
    }

    if (isRecovery) {
      history.push({
        monthIndex: i,
        gdpGrowth: -10.0 + (monthInYear - 4) * 2.5,
        cpi: 0.5 + (monthInYear - 4) * 0.1,
        unemployment: 5.2 - (monthInYear - 4) * 0.1,
        bankRate: 0.1,
        deficitToGdp: 16.0 - (monthInYear - 4) * 0.3,
        debtToGdp: 94.0 + (monthInYear - 4) * 0.5,
      });
      continue;
    }

    history.push({
      monthIndex: i,
      gdpGrowth: 1.0,
      cpi: 1.5,
      unemployment: 4.0,
      bankRate: 0.75,
      deficitToGdp: 2.0,
      debtToGdp: 85.0,
    });
  }

  for (let i = 84; i < 96; i++) {
    const monthInYear = i - 84;
    history.push({
      monthIndex: i,
      gdpGrowth: 7.0 - monthInYear * 0.3,
      cpi: 1.5 + monthInYear * 0.15,
      unemployment: 4.8 - monthInYear * 0.05,
      bankRate: 0.1,
      deficitToGdp: 12.0 - monthInYear * 0.6,
      debtToGdp: 98.0 + monthInYear * 0.1,
    });
  }

  for (let i = 96; i < 120; i++) {
    const monthInYear = (i - 96) % 12;
    const yearOffset = Math.floor((i - 96) / 12);

    history.push({
      monthIndex: i,
      gdpGrowth: yearOffset === 0 ? 3.0 - monthInYear * 0.3 : 0.1 + monthInYear * 0.05,
      cpi: yearOffset === 0 ? 5.0 + monthInYear * 0.5 : 11.0 - monthInYear * 0.75,
      unemployment: 3.7 + yearOffset * 0.3,
      bankRate: yearOffset === 0 ? 0.1 + monthInYear * 0.35 : 4.25 + (monthInYear < 6 ? monthInYear * 0.17 : 0),
      deficitToGdp: 5.0 - yearOffset * 0.5,
      debtToGdp: 100.0 - (1 - yearOffset) * 1.0,
    });
  }

  return history;
}
