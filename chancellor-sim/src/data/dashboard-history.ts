export interface HistoricalBaselinePoint {
  monthIndex: number;
  gdpGrowth: number;
  cpi: number;
  unemployment: number;
  bankRate: number;
  deficitToGdp: number;
  debtToGdp: number;
}

export interface AnalysisHistoricalSnapshot {
  turn: number;
  date: string;
  gdpGrowth: number;
  gdpNominal: number;
  inflation: number;
  unemployment: number;
  deficit: number;
  debt: number;
  approval: number;
  giltYield: number;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function createMonthString(year: number, month: number): string {
  const monthString = month.toString().padStart(2, '0');
  return `${year}-${monthString}`;
}

export function generateResearchAlignedHistoricalBaseline(): AnalysisHistoricalSnapshot[] {
  const history: AnalysisHistoricalSnapshot[] = [];
  const startYear = 2014;
  const startMonth = 7;
  const totalMonths = 120;

  let nominalGDP = 1750;

  const pushSnapshot = (
    monthIndex: number,
    gdpGrowth: number,
    inflation: number,
    unemployment: number,
    deficit: number,
    debt: number,
    approval: number
  ) => {
    const absoluteMonth = startMonth - 1 + monthIndex;
    const year = startYear + Math.floor(absoluteMonth / 12);
    const month = (absoluteMonth % 12) + 1;
    const riskPremium = Math.max(0, debt - 85) * 0.025;
    const inflationPremium = Math.max(0, inflation - 2) * 0.18;
    const giltYield = clamp(1.2 + inflation * 0.45 + riskPremium + inflationPremium, 0.6, 6.8);

    nominalGDP *= 1 + gdpGrowth / 1200;

    history.push({
      turn: monthIndex - totalMonths,
      date: createMonthString(year, month),
      gdpGrowth,
      gdpNominal: Math.round(nominalGDP),
      inflation,
      unemployment,
      deficit,
      debt,
      approval,
      giltYield,
    });
  };

  for (let i = 0; i < totalMonths; i++) {
    let gdpGrowth = 1.4;
    let inflation = 2.0;
    let unemployment = 4.5;
    let deficit = 3.2;
    let debt = 90;
    let approval = 42;

    if (i < 24) {
      const progress = i / 24;
      gdpGrowth = 2.5 - progress * 0.3;
      inflation = 0.6 + progress * 0.7;
      unemployment = 6.0 - progress * 1.1;
      deficit = 4.8 - progress * 1.0;
      debt = 83.5 + progress * 2.0;
      approval = 41 + Math.sin(i / 5) * 1.8;
    } else if (i < 36) {
      const progress = (i - 24) / 12;
      gdpGrowth = 2.0 - progress * 0.7;
      inflation = 1.2 + progress * 1.9;
      unemployment = 4.9 + progress * 0.2;
      deficit = 3.6 - progress * 0.2;
      debt = 86.0 + progress * 1.2;
      approval = 39 - progress * 2.5;
    } else if (i < 72) {
      const progress = (i - 36) / 36;
      gdpGrowth = 1.6 + Math.sin(i / 7) * 0.25 - progress * 0.2;
      inflation = 2.4 + Math.sin(i / 6) * 0.35;
      unemployment = 4.4 - progress * 0.5 + Math.sin(i / 9) * 0.1;
      deficit = 2.7 - progress * 0.4;
      debt = 87.2 - progress * 2.1;
      approval = 36 + Math.sin(i / 5) * 1.2;
    } else if (i < 84) {
      const progress = (i - 72) / 12;
      gdpGrowth = -10.5 + progress * 17.5;
      inflation = 0.9 + progress * 1.2;
      unemployment = 4.0 + progress * 1.4;
      deficit = 12.0 + Math.sin(i / 2) * 2.0;
      debt = 86.0 + progress * 12.0;
      approval = 34 - progress * 3.5;
    } else if (i < 96) {
      const progress = (i - 84) / 12;
      gdpGrowth = 6.8 - progress * 4.8;
      inflation = 2.1 + progress * 2.2;
      unemployment = 5.2 - progress * 0.9;
      deficit = 10.5 - progress * 4.5;
      debt = 98.0 + progress * 1.0;
      approval = 31 + progress * 3.0;
    } else {
      const progress = (i - 96) / 24;
      gdpGrowth = 1.4 - progress * 0.7 + Math.sin(i / 8) * 0.25;
      inflation = 10.2 - progress * 8.2 + Math.sin(i / 5) * 0.25;
      unemployment = 4.2 - progress * 0.05 + Math.sin(i / 10) * 0.08;
      deficit = 5.0 - progress * 1.8;
      debt = 99.0 + progress * 0.5;
      approval = 33 + Math.sin(i / 4) * 1.5;
    }

    if (i >= 99 && i <= 101) {
      approval -= 4.5;
      inflation += 0.5;
      deficit += 0.6;
    }

    pushSnapshot(i, gdpGrowth, inflation, unemployment, deficit, debt, clamp(approval, 25, 52));
  }

  return history;
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
