export interface DifficultySettings {
  shockIntensity: number;
  taxAvoidanceMultiplier: number;
  spendingEfficiency: number;
  marketReactionScale: number;
  serviceDegradationRate: number;
  gameOverThresholds: {
    pmTrustMinimum: number;
    backbenchSatisfactionMinimum: number;
    debtPctGDPMaximum: number;
    giltYieldMaximum: number;
    approvalMinimum: number;
  };
}

const DIFFICULTY_SETTINGS: Record<string, DifficultySettings> = {
  forgiving: {
    shockIntensity: 0.6,
    taxAvoidanceMultiplier: 0.5,
    spendingEfficiency: 1.2,
    marketReactionScale: 0.7,
    serviceDegradationRate: 0.7,
    gameOverThresholds: {
      pmTrustMinimum: 10,
      backbenchSatisfactionMinimum: 15,
      debtPctGDPMaximum: 120,
      giltYieldMaximum: 8,
      approvalMinimum: 20,
    },
  },
  standard: {
    shockIntensity: 1.0,
    taxAvoidanceMultiplier: 1.0,
    spendingEfficiency: 1.0,
    marketReactionScale: 1.0,
    serviceDegradationRate: 1.0,
    gameOverThresholds: {
      pmTrustMinimum: 20,
      backbenchSatisfactionMinimum: 25,
      debtPctGDPMaximum: 100,
      giltYieldMaximum: 6,
      approvalMinimum: 30,
    },
  },
  realistic: {
    shockIntensity: 1.4,
    taxAvoidanceMultiplier: 1.5,
    spendingEfficiency: 0.85,
    marketReactionScale: 1.3,
    serviceDegradationRate: 1.3,
    gameOverThresholds: {
      pmTrustMinimum: 25,
      backbenchSatisfactionMinimum: 30,
      debtPctGDPMaximum: 90,
      giltYieldMaximum: 5,
      approvalMinimum: 35,
    },
  },
};

export function getDifficultySettings(difficulty: string): DifficultySettings {
  return DIFFICULTY_SETTINGS[difficulty] || DIFFICULTY_SETTINGS.standard;
}
