import type { GameState } from '../game-state';

export const SAVE_VERSION = '2';
export const SAVE_SIZE_LIMIT = 4_800_000;

export interface SaveEnvelope {
  version: string;
  savedAt: number;
  turnAtSave: number;
  checksum: string;
  state: unknown;
}

export interface SaveMigrationResult {
  success: boolean;
  state?: unknown;
  warnings: string[];
  error?: string;
}

export interface SaveValidationResult {
  success: boolean;
  state?: unknown;
  warnings: string[];
  error?: string;
}

export function simpleChecksum(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = (Math.imul(31, hash) + data.charCodeAt(i)) | 0;
  }
  return hash.toString(16);
}

export function buildSaveEnvelope(state: GameState, serialisedState: string): SaveEnvelope {
  return {
    version: SAVE_VERSION,
    savedAt: Date.now(),
    turnAtSave: state.metadata.currentTurn,
    checksum: simpleChecksum(serialisedState),
    state: JSON.parse(serialisedState),
  };
}

export function migrateSave(parsed: unknown): SaveMigrationResult {
  if (!parsed || typeof parsed !== 'object') {
    return {
      success: false,
      warnings: [],
      error: 'Save payload has invalid structure.',
    };
  }

  if (!('version' in parsed)) {
    return {
      success: true,
      state: parsed,
      warnings: ['Legacy save format detected. Applied compatibility migration to the current save format.'],
    };
  }

  const envelope = parsed as Partial<SaveEnvelope>;

  if (envelope.version === SAVE_VERSION) {
    return {
      success: true,
      state: envelope.state,
      warnings: [],
    };
  }

  if (envelope.version === '1') {
    return {
      success: true,
      state: envelope.state,
      warnings: ['Save version 1 detected. Applied migration to the current save format.'],
    };
  }

  return {
    success: false,
    warnings: [],
    error: `Unsupported save version "${String(envelope.version)}".`,
  };
}

export function validateSave(raw: string): SaveValidationResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      success: false,
      warnings: [],
      error: 'Save JSON is corrupt.',
    };
  }

  if (!parsed || typeof parsed !== 'object') {
    return {
      success: false,
      warnings: [],
      error: 'Save payload has invalid structure.',
    };
  }

  if ('version' in parsed) {
    const envelope = parsed as Partial<SaveEnvelope>;
    if (!envelope.state) {
      return {
        success: false,
        warnings: [],
        error: 'Save payload is missing state.',
      };
    }

    if (typeof envelope.checksum !== 'string') {
      return {
        success: false,
        warnings: [],
        error: 'Save payload is missing a checksum.',
      };
    }

    const reserialised = JSON.stringify(envelope.state);
    const expectedChecksum = simpleChecksum(reserialised);
    if (envelope.checksum !== expectedChecksum) {
      return {
        success: false,
        warnings: [],
        error: 'Save integrity check failed. The save file appears to be corrupted.',
      };
    }
  }

  const migration = migrateSave(parsed);
  if (!migration.success) {
    return {
      success: false,
      warnings: migration.warnings,
      error: migration.error,
    };
  }

  const migratedState = migration.state as any;
  if (!migratedState?.metadata || !migratedState?.economic) {
    return {
      success: false,
      warnings: migration.warnings,
      error: 'Save payload is missing required game state fields.',
    };
  }

  return {
    success: true,
    state: migratedState,
    warnings: migration.warnings,
  };
}
