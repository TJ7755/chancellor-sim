import { buildSaveEnvelope, SAVE_VERSION, simpleChecksum, validateSave } from '../state/save-game';

const baseState: any = {
  metadata: { currentTurn: 4, gameStarted: true, gameOver: false, difficultyMode: 'standard' },
  economic: {
    gdpNominal_bn: 2750,
    gdpGrowthAnnual: 1.5,
    inflationCPI: 2.0,
    unemploymentRate: 4.25,
    wageGrowthAnnual: 5.0,
  },
  fiscal: { deficitPctGDP: 3.0, debtPctGDP: 95, totalRevenue_bn: 1100, totalSpending_bn: 1150, fiscalHeadroom_bn: 10 },
  political: {
    governmentApproval: 45,
    chancellorApproval: 50,
    backbenchSatisfaction: 60,
    pmTrust: 65,
    credibilityIndex: 55,
  },
};

describe('save validation', () => {
  it('accepts a valid current-version save', () => {
    const serialisedState = JSON.stringify(baseState);
    const raw = JSON.stringify(buildSaveEnvelope(baseState, serialisedState));

    const result = validateSave(raw);

    expect(result.success).toBe(true);
    expect(result.state).toEqual(baseState);
    expect(result.warnings).toEqual([]);
  });

  it('rejects a save with an invalid checksum', () => {
    const raw = JSON.stringify({
      version: SAVE_VERSION,
      savedAt: Date.now(),
      turnAtSave: 4,
      checksum: 'deadbeef',
      state: baseState,
    });

    const result = validateSave(raw);

    expect(result.success).toBe(false);
    expect(result.error).toContain('integrity check failed');
  });

  it('migrates version 1 saves to the current format', () => {
    const raw = JSON.stringify({
      version: '1',
      savedAt: Date.now(),
      turnAtSave: 4,
      checksum: simpleChecksum(JSON.stringify(baseState)),
      state: baseState,
    });

    const result = validateSave(raw);

    expect(result.success).toBe(true);
    expect(result.state).toMatchObject(baseState);
    expect(result.warnings[0]).toContain('migration');
    expect((result.state as any).advisers).toBeDefined();
    expect((result.state as any).events).toBeDefined();
    expect((result.state as any).manifesto).toBeDefined();
  });

  it('migrates version 2 saves and fixes adviser IDs', () => {
    const stateWithOldAdviserIds = {
      ...baseState,
      advisers: {
        availableAdvisers: new Set(['treasury', 'political', 'heterodox', 'fhawk', 'socdem', 'technocrat']),
      },
    };
    const raw = JSON.stringify({
      version: '2',
      savedAt: Date.now(),
      turnAtSave: 4,
      checksum: simpleChecksum(JSON.stringify(stateWithOldAdviserIds)),
      state: stateWithOldAdviserIds,
    });

    const result = validateSave(raw);

    expect(result.success).toBe(true);
    expect(result.warnings.some((w: string) => w.includes('migration'))).toBe(true);
  });

  it('rejects unsupported save versions', () => {
    const raw = JSON.stringify({
      version: '99',
      savedAt: Date.now(),
      turnAtSave: 4,
      checksum: simpleChecksum(JSON.stringify(baseState)),
      state: baseState,
    });

    const result = validateSave(raw);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Unsupported save version');
  });

  it('rejects saves with invalid metadata', () => {
    const badState = {
      ...baseState,
      metadata: { currentTurn: -1, gameStarted: true, gameOver: false },
    };
    const serialisedState = JSON.stringify(badState);
    const raw = JSON.stringify(buildSaveEnvelope(badState, serialisedState));

    const result = validateSave(raw);

    expect(result.success).toBe(false);
    expect(result.error).toContain('currentTurn');
  });
});
