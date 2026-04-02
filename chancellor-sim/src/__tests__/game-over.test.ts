import { checkGameOverConditions, DIFFICULTY_THRESHOLDS } from '../domain/game/game-over';

describe('game over conditions', () => {
  it('returns null when all metrics are healthy', () => {
    const result = checkGameOverConditions(
      {
        pmTrust: 60,
        backbenchSatisfaction: 55,
        debtPctGDP: 85,
        giltYield10y: 4.2,
        approval: 45,
      },
      'standard'
    );
    expect(result).toBeNull();
  });

  it('triggers on PM trust below threshold', () => {
    const result = checkGameOverConditions(
      {
        pmTrust: 15,
        backbenchSatisfaction: 55,
        debtPctGDP: 85,
        giltYield10y: 4.2,
        approval: 45,
      },
      'standard'
    );
    expect(result).not.toBeNull();
    expect(result?.severity).toBe('critical');
    expect(result?.reason).toContain('Prime Minister');
  });

  it('triggers on backbench revolt', () => {
    const result = checkGameOverConditions(
      {
        pmTrust: 60,
        backbenchSatisfaction: 20,
        debtPctGDP: 85,
        giltYield10y: 4.2,
        approval: 45,
      },
      'standard'
    );
    expect(result).not.toBeNull();
    expect(result?.reason).toContain('revolt');
  });

  it('triggers on debt crisis', () => {
    const result = checkGameOverConditions(
      {
        pmTrust: 60,
        backbenchSatisfaction: 55,
        debtPctGDP: 105,
        giltYield10y: 4.2,
        approval: 45,
      },
      'standard'
    );
    expect(result).not.toBeNull();
    expect(result?.reason).toContain('Debt');
  });

  it('triggers on gilt yield spike', () => {
    const result = checkGameOverConditions(
      {
        pmTrust: 60,
        backbenchSatisfaction: 55,
        debtPctGDP: 85,
        giltYield10y: 7.0,
        approval: 45,
      },
      'standard'
    );
    expect(result).not.toBeNull();
    expect(result?.reason).toContain('Gilt');
  });

  it('triggers on collapsed approval', () => {
    const result = checkGameOverConditions(
      {
        pmTrust: 60,
        backbenchSatisfaction: 55,
        debtPctGDP: 85,
        giltYield10y: 4.2,
        approval: 25,
      },
      'standard'
    );
    expect(result).not.toBeNull();
    expect(result?.severity).toBe('warning');
    expect(result?.reason).toContain('approval');
  });

  it('triggers immediately on reshuffle', () => {
    const result = checkGameOverConditions(
      {
        pmTrust: 60,
        backbenchSatisfaction: 55,
        debtPctGDP: 85,
        giltYield10y: 4.2,
        approval: 45,
        reshuffleTriggered: true,
      },
      'standard'
    );
    expect(result).not.toBeNull();
    expect(result?.reason).toContain('reshuffle');
  });

  it('triggers immediately on confidence vote defeat', () => {
    const result = checkGameOverConditions(
      {
        pmTrust: 60,
        backbenchSatisfaction: 55,
        debtPctGDP: 85,
        giltYield10y: 4.2,
        approval: 45,
        confidenceVoteDefeated: true,
      },
      'standard'
    );
    expect(result).not.toBeNull();
    expect(result?.reason).toContain('confidence');
  });

  it('uses forgiving thresholds on forgiving difficulty', () => {
    const result = checkGameOverConditions(
      {
        pmTrust: 15,
        backbenchSatisfaction: 55,
        debtPctGDP: 85,
        giltYield10y: 4.2,
        approval: 45,
      },
      'forgiving'
    );
    expect(result).toBeNull();
  });

  it('uses realistic thresholds on realistic difficulty', () => {
    const result = checkGameOverConditions(
      {
        pmTrust: 22,
        backbenchSatisfaction: 55,
        debtPctGDP: 85,
        giltYield10y: 4.2,
        approval: 45,
      },
      'realistic'
    );
    expect(result).not.toBeNull();
  });
});
