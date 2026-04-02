import { buildSaveEnvelope, SAVE_VERSION, simpleChecksum, validateSave } from '../state/save-game';

const baseState: any = {
  metadata: { currentTurn: 4 },
  economic: { gdpNominal_bn: 2750 },
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
    expect(result.state).toEqual(baseState);
    expect(result.warnings[0]).toContain('migration');
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
});
