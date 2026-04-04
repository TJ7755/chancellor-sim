import type { GameState } from '../game-state';

export const SAVE_VERSION = '3';
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

function validateMetadata(state: any): string[] {
  const errors: string[] = [];
  const meta = state?.metadata;
  if (!meta || typeof meta !== 'object') {
    errors.push('metadata is missing or not an object');
    return errors;
  }
  if (typeof meta.currentTurn !== 'number' || meta.currentTurn < 0 || meta.currentTurn > 60) {
    errors.push('metadata.currentTurn must be a number between 0 and 60');
  }
  if (typeof meta.gameStarted !== 'boolean') {
    errors.push('metadata.gameStarted must be a boolean');
  }
  if (typeof meta.gameOver !== 'boolean') {
    errors.push('metadata.gameOver must be a boolean');
  }
  const validDifficulties = ['forgiving', 'standard', 'realistic'];
  if (meta.difficultyMode && !validDifficulties.includes(meta.difficultyMode)) {
    errors.push(`metadata.difficultyMode must be one of: ${validDifficulties.join(', ')}`);
  }
  return errors;
}

function validateEconomic(state: any): string[] {
  const errors: string[] = [];
  const eco = state?.economic;
  if (!eco || typeof eco !== 'object') {
    errors.push('economic is missing or not an object');
    return errors;
  }
  const numericFields = ['gdpNominal_bn', 'gdpGrowthAnnual', 'inflationCPI', 'unemploymentRate', 'wageGrowthAnnual'];
  for (const field of numericFields) {
    if (eco[field] !== undefined && typeof eco[field] !== 'number') {
      errors.push(`economic.${field} must be a number if present`);
    }
  }
  return errors;
}

function validateFiscal(state: any): string[] {
  const errors: string[] = [];
  const fiscal = state?.fiscal;
  if (!fiscal || typeof fiscal !== 'object') {
    errors.push('fiscal is missing or not an object');
    return errors;
  }
  const numericFields = ['deficitPctGDP', 'debtPctGDP', 'totalRevenue_bn', 'totalSpending_bn', 'fiscalHeadroom_bn'];
  for (const field of numericFields) {
    if (fiscal[field] !== undefined && typeof fiscal[field] !== 'number') {
      errors.push(`fiscal.${field} must be a number if present`);
    }
  }
  return errors;
}

function validatePolitical(state: any): string[] {
  const errors: string[] = [];
  const pol = state?.political;
  if (!pol || typeof pol !== 'object') {
    errors.push('political is missing or not an object');
    return errors;
  }
  const numericFields = [
    'governmentApproval',
    'chancellorApproval',
    'backbenchSatisfaction',
    'pmTrust',
    'credibilityIndex',
  ];
  for (const field of numericFields) {
    if (pol[field] !== undefined && typeof pol[field] !== 'number') {
      errors.push(`political.${field} must be a number if present`);
    }
  }
  return errors;
}

export function validateSaveSchema(state: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [
    ...validateMetadata(state),
    ...validateEconomic(state),
    ...validateFiscal(state),
    ...validatePolitical(state),
  ];
  return { valid: errors.length === 0, errors };
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

  let migratedState = envelope.state as any;
  const warnings: string[] = [];

  if (envelope.version === '1') {
    warnings.push('Save version 1 detected. Applied migration to the current save format.');
    if (migratedState && typeof migratedState === 'object') {
      if (!migratedState.political) migratedState.political = {};
      if (!migratedState.advisers)
        migratedState.advisers = {
          advisers: [],
          maxAdvisers: 3,
          hiredAdvisers: new Map(),
          availableAdvisers: new Set([
            'treasury_mandarin',
            'political_operator',
            'heterodox_economist',
            'fiscal_hawk',
            'social_democrat',
            'technocratic_centrist',
          ]),
        };
      if (!migratedState.events)
        migratedState.events = { activeEvents: [], eventHistory: [], pendingEvents: [], eventLog: [] };
      if (!migratedState.manifesto)
        migratedState.manifesto = { selectedTemplate: null, pledges: [], totalPledges: 0, totalViolations: 0 };
      if (!migratedState.mpSystem)
        migratedState.mpSystem = {
          allMPs: [],
          votingRecords: [],
          promises: [],
          concernProfiles: new Map(),
          activeGroups: [],
          selectedMPForDetail: null,
          filterSettings: {},
          currentBudgetSupport: new Map(),
        };
      if (!migratedState.simulation) migratedState.simulation = { monthlySnapshots: [], lastTurnDelta: {} };
    }
  }

  if (envelope.version === '2') {
    warnings.push('Save version 2 detected. Applied migration to the current save format.');
    if (migratedState && typeof migratedState === 'object') {
      if (migratedState.advisers?.availableAdvisers) {
        const oldIds = ['treasury', 'political', 'heterodox', 'fhawk', 'socdem', 'technocrat'];
        const newIds = [
          'treasury_mandarin',
          'political_operator',
          'heterodox_economist',
          'fiscal_hawk',
          'social_democrat',
          'technocratic_centrist',
        ];
        const available = migratedState.advisers.availableAdvisers;
        if (available instanceof Set) {
          const updated = new Set<string>();
          available.forEach((id: string) => {
            const idx = oldIds.indexOf(id);
            updated.add(idx >= 0 ? newIds[idx] : id);
          });
          migratedState.advisers.availableAdvisers = updated;
        }
      }
      if (migratedState.metadata?.manifestoId === 'standard_labour') {
        migratedState.metadata.manifestoId = 'cautious-centrist';
        warnings.push('Migrated invalid manifesto default from standard_labour to cautious-centrist.');
      }
    }
  }

  if (envelope.version === '1' || envelope.version === '2') {
    return {
      success: true,
      state: migratedState,
      warnings,
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
  const schemaResult = validateSaveSchema(migratedState);
  if (!schemaResult.valid) {
    return {
      success: false,
      warnings: migration.warnings,
      error: `Save schema validation failed: ${schemaResult.errors.join('; ')}`,
    };
  }

  return {
    success: true,
    state: migratedState,
    warnings: migration.warnings,
  };
}
