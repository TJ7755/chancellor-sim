import { getDifficultySettings } from '../domain/game/difficulty';

describe('difficulty settings', () => {
  it('returns forgiving settings', () => {
    const settings = getDifficultySettings('forgiving');
    expect(settings.shockIntensity).toBe(0.6);
    expect(settings.taxAvoidanceMultiplier).toBe(0.5);
    expect(settings.spendingEfficiency).toBe(1.2);
    expect(settings.gameOverThresholds.pmTrustMinimum).toBe(15);
  });

  it('returns standard settings', () => {
    const settings = getDifficultySettings('standard');
    expect(settings.shockIntensity).toBe(1.0);
    expect(settings.taxAvoidanceMultiplier).toBe(1.0);
    expect(settings.spendingEfficiency).toBe(1.0);
    expect(settings.gameOverThresholds.pmTrustMinimum).toBe(20);
  });

  it('returns realistic settings', () => {
    const settings = getDifficultySettings('realistic');
    expect(settings.shockIntensity).toBe(1.4);
    expect(settings.taxAvoidanceMultiplier).toBe(1.5);
    expect(settings.spendingEfficiency).toBe(0.85);
    expect(settings.gameOverThresholds.pmTrustMinimum).toBe(24);
  });

  it('falls back to standard for unknown difficulty', () => {
    const settings = getDifficultySettings('unknown');
    expect(settings.shockIntensity).toBe(1.0);
  });
});
