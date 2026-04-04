export interface GameOverCondition {
  triggered: boolean;
  reason: string;
  severity: 'warning' | 'critical';
}

export interface GameOverThresholds {
  pmTrustMinimum: number;
  backbenchSatisfactionMinimum: number;
  debtPctGDPMaximum: number;
  giltYieldMaximum: number;
  approvalMinimum: number;
}

export const DIFFICULTY_THRESHOLDS: Record<string, GameOverThresholds> = {
  forgiving: {
    pmTrustMinimum: 10,
    backbenchSatisfactionMinimum: 15,
    debtPctGDPMaximum: 120,
    giltYieldMaximum: 8,
    approvalMinimum: 20,
  },
  standard: {
    pmTrustMinimum: 20,
    backbenchSatisfactionMinimum: 25,
    debtPctGDPMaximum: 100,
    giltYieldMaximum: 6,
    approvalMinimum: 30,
  },
  realistic: {
    pmTrustMinimum: 25,
    backbenchSatisfactionMinimum: 30,
    debtPctGDPMaximum: 90,
    giltYieldMaximum: 5,
    approvalMinimum: 35,
  },
};

export function checkGameOverConditions(
  state: {
    pmTrust?: number;
    backbenchSatisfaction?: number;
    debtPctGDP?: number;
    giltYield10y?: number;
    approval?: number;
    confidenceVoteDefeated?: boolean;
    reshuffleTriggered?: boolean;
  },
  difficulty: string
): GameOverCondition | null {
  const thresholds = DIFFICULTY_THRESHOLDS[difficulty] || DIFFICULTY_THRESHOLDS.standard;

  if (state.reshuffleTriggered) {
    return { triggered: true, reason: 'The Prime Minister has reshuffled you out of office.', severity: 'critical' };
  }

  if (state.confidenceVoteDefeated) {
    return {
      triggered: true,
      reason: 'You have lost a vote of confidence in the House of Commons.',
      severity: 'critical',
    };
  }

  if (state.pmTrust !== undefined && state.pmTrust < thresholds.pmTrustMinimum) {
    return {
      triggered: true,
      reason: 'The Prime Minister has lost all confidence in your ability.',
      severity: 'critical',
    };
  }

  if (
    state.backbenchSatisfaction !== undefined &&
    state.backbenchSatisfaction < thresholds.backbenchSatisfactionMinimum
  ) {
    return {
      triggered: true,
      reason: 'The parliamentary party has revolted against your leadership.',
      severity: 'critical',
    };
  }

  if (state.debtPctGDP !== undefined && state.debtPctGDP > thresholds.debtPctGDPMaximum) {
    return { triggered: true, reason: 'Debt has spiralled beyond sustainable levels.', severity: 'critical' };
  }

  if (state.giltYield10y !== undefined && state.giltYield10y > thresholds.giltYieldMaximum) {
    return { triggered: true, reason: 'Gilt yields have spiked to crisis levels.', severity: 'critical' };
  }

  if (state.approval !== undefined && state.approval < thresholds.approvalMinimum) {
    return { triggered: true, reason: 'Public approval has collapsed beyond recovery.', severity: 'warning' };
  }

  return null;
}

export function getGameOverReason(state: any, difficulty: string): string | null {
  const condition = checkGameOverConditions(state, difficulty);
  return condition ? condition.reason : null;
}
