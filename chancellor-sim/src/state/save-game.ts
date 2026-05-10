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

function validateServices(state: any): string[] {
  const errors: string[] = [];
  const slice = state?.services;
  if (slice === undefined) return errors;
  if (!slice || typeof slice !== 'object') {
    errors.push('services is present but not an object');
    return errors;
  }
  const numericFields = ['nhsQuality', 'educationQuality', 'consecutiveNHSCutMonths'];
  for (const field of numericFields) {
    if (slice[field] !== undefined && typeof slice[field] !== 'number') {
      errors.push(`services.${field} must be a number if present`);
    }
  }
  return errors;
}

function validateMarkets(state: any): string[] {
  const errors: string[] = [];
  const slice = state?.markets;
  if (slice === undefined) return errors;
  if (!slice || typeof slice !== 'object') {
    errors.push('markets is present but not an object');
    return errors;
  }
  const numericFields = ['bankRate', 'giltYield10y'];
  for (const field of numericFields) {
    if (slice[field] !== undefined && typeof slice[field] !== 'number') {
      errors.push(`markets.${field} must be a number if present`);
    }
  }
  if (slice.ldiPanicTriggered !== undefined && typeof slice.ldiPanicTriggered !== 'boolean') {
    errors.push('markets.ldiPanicTriggered must be a boolean if present');
  }
  return errors;
}

function validateMPSystem(state: any): string[] {
  const errors: string[] = [];
  const slice = state?.mpSystem;
  if (slice === undefined) return errors;
  if (!slice || typeof slice !== 'object') {
    errors.push('mpSystem is present but not an object');
    return errors;
  }
  if (slice.activeGroups !== undefined && !Array.isArray(slice.activeGroups)) {
    errors.push('mpSystem.activeGroups must be an array if present');
  }
  return errors;
}

function validateAdvisers(state: any): string[] {
  const errors: string[] = [];
  const slice = state?.advisers;
  if (slice === undefined) return errors;
  if (!slice || typeof slice !== 'object') {
    errors.push('advisers is present but not an object');
    return errors;
  }
  if (slice.maxAdvisers !== undefined && typeof slice.maxAdvisers !== 'number') {
    errors.push('advisers.maxAdvisers must be a number if present');
  }
  return errors;
}

function validateEvents(state: any): string[] {
  const errors: string[] = [];
  const slice = state?.events;
  if (slice === undefined) return errors;
  if (!slice || typeof slice !== 'object') {
    errors.push('events is present but not an object');
    return errors;
  }
  const arrayFields = ['activeEvents', 'eventHistory'];
  for (const field of arrayFields) {
    if (slice[field] !== undefined && !Array.isArray(slice[field])) {
      errors.push(`events.${field} must be an array if present`);
    }
  }
  return errors;
}

function validateManifesto(state: any): string[] {
  const errors: string[] = [];
  const slice = state?.manifesto;
  if (slice === undefined) return errors;
  if (!slice || typeof slice !== 'object') {
    errors.push('manifesto is present but not an object');
    return errors;
  }
  const numericFields = ['totalPledges', 'totalViolations', 'approvalCostFromViolations'];
  for (const field of numericFields) {
    if (slice[field] !== undefined && typeof slice[field] !== 'number') {
      errors.push(`manifesto.${field} must be a number if present`);
    }
  }
  return errors;
}

function validateSimulation(state: any): string[] {
  const errors: string[] = [];
  const slice = state?.simulation;
  if (slice === undefined) return errors;
  if (!slice || typeof slice !== 'object') {
    errors.push('simulation is present but not an object');
    return errors;
  }
  if (slice.monthlySnapshots !== undefined && !Array.isArray(slice.monthlySnapshots)) {
    errors.push('simulation.monthlySnapshots must be an array if present');
  }
  return errors;
}

function validatePMRelationship(state: any): string[] {
  const errors: string[] = [];
  const slice = state?.pmRelationship;
  if (slice === undefined) return errors;
  if (!slice || typeof slice !== 'object') {
    errors.push('pmRelationship is present but not an object');
    return errors;
  }
  const numericFields = ['patience', 'warningsIssued'];
  for (const field of numericFields) {
    if (slice[field] !== undefined && typeof slice[field] !== 'number') {
      errors.push(`pmRelationship.${field} must be a number if present`);
    }
  }
  if (slice.supportWithdrawn !== undefined && typeof slice.supportWithdrawn !== 'boolean') {
    errors.push('pmRelationship.supportWithdrawn must be a boolean if present');
  }
  return errors;
}

function validateSpendingReview(state: any): string[] {
  const errors: string[] = [];
  const slice = state?.spendingReview;
  if (slice === undefined) return errors;
  if (!slice || typeof slice !== 'object') {
    errors.push('spendingReview is present but not an object');
    return errors;
  }
  const numericFields = ['lastReviewTurn', 'nextReviewDueTurn'];
  for (const field of numericFields) {
    if (slice[field] !== undefined && typeof slice[field] !== 'number') {
      errors.push(`spendingReview.${field} must be a number if present`);
    }
  }
  if (slice.inReview !== undefined && typeof slice.inReview !== 'boolean') {
    errors.push('spendingReview.inReview must be a boolean if present');
  }
  return errors;
}

function validateDebtManagement(state: any): string[] {
  const errors: string[] = [];
  const slice = state?.debtManagement;
  if (slice === undefined) return errors;
  if (!slice || typeof slice !== 'object') {
    errors.push('debtManagement is present but not an object');
    return errors;
  }
  const numericFields = ['weightedAverageMaturity', 'refinancingRisk', 'qeHoldings_bn'];
  for (const field of numericFields) {
    if (slice[field] !== undefined && typeof slice[field] !== 'number') {
      errors.push(`debtManagement.${field} must be a number if present`);
    }
  }
  return errors;
}

function validateParliamentary(state: any): string[] {
  const errors: string[] = [];
  const slice = state?.parliamentary;
  if (slice === undefined) return errors;
  if (!slice || typeof slice !== 'object') {
    errors.push('parliamentary is present but not an object');
    return errors;
  }
  if (slice.whipStrength !== undefined && typeof slice.whipStrength !== 'number') {
    errors.push('parliamentary.whipStrength must be a number if present');
  }
  if (slice.lordsDelayActive !== undefined && typeof slice.lordsDelayActive !== 'boolean') {
    errors.push('parliamentary.lordsDelayActive must be a boolean if present');
  }
  if (slice.rebellionCount !== undefined && typeof slice.rebellionCount !== 'number') {
    errors.push('parliamentary.rebellionCount must be a number if present');
  }
  return errors;
}

function validateExternalSector(state: any): string[] {
  const errors: string[] = [];
  const slice = state?.externalSector;
  if (slice === undefined) return errors;
  if (!slice || typeof slice !== 'object') {
    errors.push('externalSector is present but not an object');
    return errors;
  }
  const numericFields = ['currentAccountGDP', 'tradeFrictionIndex'];
  for (const field of numericFields) {
    if (slice[field] !== undefined && typeof slice[field] !== 'number') {
      errors.push(`externalSector.${field} must be a number if present`);
    }
  }
  if (slice.externalShockActive !== undefined && typeof slice.externalShockActive !== 'boolean') {
    errors.push('externalSector.externalShockActive must be a boolean if present');
  }
  return errors;
}

function validateFinancialStability(state: any): string[] {
  const errors: string[] = [];
  const slice = state?.financialStability;
  if (slice === undefined) return errors;
  if (!slice || typeof slice !== 'object') {
    errors.push('financialStability is present but not an object');
    return errors;
  }
  const numericFields = ['housePriceIndex', 'bankStressIndex'];
  for (const field of numericFields) {
    if (slice[field] !== undefined && typeof slice[field] !== 'number') {
      errors.push(`financialStability.${field} must be a number if present`);
    }
  }
  if (slice.fpcInterventionActive !== undefined && typeof slice.fpcInterventionActive !== 'boolean') {
    errors.push('financialStability.fpcInterventionActive must be a boolean if present');
  }
  return errors;
}

function validateDevolution(state: any): string[] {
  const errors: string[] = [];
  const slice = state?.devolution;
  if (slice === undefined) return errors;
  if (!slice || typeof slice !== 'object') {
    errors.push('devolution is present but not an object');
    return errors;
  }
  const numericFields = ['barnettConsequentialMultiplier', 'section114Timer'];
  for (const field of numericFields) {
    if (slice[field] !== undefined && typeof slice[field] !== 'number') {
      errors.push(`devolution.${field} must be a number if present`);
    }
  }
  return errors;
}

function validateDistributional(state: any): string[] {
  const errors: string[] = [];
  const slice = state?.distributional;
  if (slice === undefined) return errors;
  if (!slice || typeof slice !== 'object') {
    errors.push('distributional is present but not an object');
    return errors;
  }
  const numericFields = ['giniCoefficient', 'povertyRate', 'bottomQuintileRealIncomeGrowth'];
  for (const field of numericFields) {
    if (slice[field] !== undefined && typeof slice[field] !== 'number') {
      errors.push(`distributional.${field} must be a number if present`);
    }
  }
  return errors;
}

function validateOBR(state: any): string[] {
  const errors: string[] = [];
  const slice = state?.obr;
  if (slice === undefined) return errors;
  if (!slice || typeof slice !== 'object') {
    errors.push('obr is present but not an object');
    return errors;
  }
  const numericFields = ['obrCredibilityScore', 'fiscalHeadroomForecast_bn'];
  for (const field of numericFields) {
    if (slice[field] !== undefined && typeof slice[field] !== 'number') {
      errors.push(`obr.${field} must be a number if present`);
    }
  }
  if (slice.forecastVintages !== undefined && !Array.isArray(slice.forecastVintages)) {
    errors.push('obr.forecastVintages must be an array if present');
  }
  return errors;
}

function validateCapitalDelivery(state: any): string[] {
  const errors: string[] = [];
  const slice = state?.capitalDelivery;
  if (slice === undefined) return errors;
  if (!slice || typeof slice !== 'object') {
    errors.push('capitalDelivery is present but not an object');
    return errors;
  }
  const numericFields = ['pipelineCapacity_bn', 'deliveryRiskMultiplier', 'overCapacityTurns'];
  for (const field of numericFields) {
    if (slice[field] !== undefined && typeof slice[field] !== 'number') {
      errors.push(`capitalDelivery.${field} must be a number if present`);
    }
  }
  return errors;
}

function validateHousing(state: any): string[] {
  const errors: string[] = [];
  const slice = state?.housing;
  if (slice === undefined) return errors;
  if (!slice || typeof slice !== 'object') {
    errors.push('housing is present but not an object');
    return errors;
  }
  const numericFields = ['houseBuilding_annualStarts', 'housingAffordabilityIndex'];
  for (const field of numericFields) {
    if (slice[field] !== undefined && typeof slice[field] !== 'number') {
      errors.push(`housing.${field} must be a number if present`);
    }
  }
  if (slice.planningReformPackage !== undefined && typeof slice.planningReformPackage !== 'boolean') {
    errors.push('housing.planningReformPackage must be a boolean if present');
  }
  return errors;
}

function validateIndustrialStrategy(state: any): string[] {
  const errors: string[] = [];
  const slice = state?.industrialStrategy;
  if (slice === undefined) return errors;
  if (!slice || typeof slice !== 'object') {
    errors.push('industrialStrategy is present but not an object');
    return errors;
  }
  const numericFields = ['totalAnnualCost_bn', 'productivityBoostAccumulated', 'stateAidRisk'];
  for (const field of numericFields) {
    if (slice[field] !== undefined && typeof slice[field] !== 'number') {
      errors.push(`industrialStrategy.${field} must be a number if present`);
    }
  }
  return errors;
}

function validateLegislativePipeline(state: any): string[] {
  const errors: string[] = [];
  const slice = state?.legislativePipeline;
  if (slice === undefined) return errors;
  if (!slice || typeof slice !== 'object') {
    errors.push('legislativePipeline is present but not an object');
    return errors;
  }
  const numericFields = ['hmrcSystemsCapacity', 'consultationLoad'];
  for (const field of numericFields) {
    if (slice[field] !== undefined && typeof slice[field] !== 'number') {
      errors.push(`legislativePipeline.${field} must be a number if present`);
    }
  }
  return errors;
}

function validateEmergencyProgrammes(state: any): string[] {
  const errors: string[] = [];
  const slice = state?.emergencyProgrammes;
  if (slice === undefined) return errors;
  if (!slice || typeof slice !== 'object') {
    errors.push('emergencyProgrammes is present but not an object');
    return errors;
  }
  if (slice.active !== undefined && !Array.isArray(slice.active)) {
    errors.push('emergencyProgrammes.active must be an array if present');
  }
  return errors;
}

function validateSocialMedia(state: any): string[] {
  const errors: string[] = [];
  const slice = state?.socialMedia;
  if (slice === undefined) return errors;
  if (!slice || typeof slice !== 'object') {
    errors.push('socialMedia is present but not an object');
    return errors;
  }
  if (slice.recentlyUsedPostIds !== undefined && !Array.isArray(slice.recentlyUsedPostIds)) {
    errors.push('socialMedia.recentlyUsedPostIds must be an array if present');
  }
  return errors;
}

function validatePolicyRiskModifiers(state: any): string[] {
  const errors: string[] = [];
  const slice = state?.policyRiskModifiers;
  if (slice === undefined) return errors;
  if (!Array.isArray(slice)) {
    errors.push('policyRiskModifiers must be an array if present');
  }
  return errors;
}

export function validateSaveSchema(state: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [
    ...validateMetadata(state),
    ...validateEconomic(state),
    ...validateFiscal(state),
    ...validatePolitical(state),
    ...validateServices(state),
    ...validateMarkets(state),
    ...validateMPSystem(state),
    ...validateAdvisers(state),
    ...validateEvents(state),
    ...validateManifesto(state),
    ...validateSimulation(state),
    ...validatePMRelationship(state),
    ...validateSpendingReview(state),
    ...validateDebtManagement(state),
    ...validateParliamentary(state),
    ...validateExternalSector(state),
    ...validateFinancialStability(state),
    ...validateDevolution(state),
    ...validateDistributional(state),
    ...validateOBR(state),
    ...validateCapitalDelivery(state),
    ...validateHousing(state),
    ...validateIndustrialStrategy(state),
    ...validateLegislativePipeline(state),
    ...validateEmergencyProgrammes(state),
    ...validateSocialMedia(state),
    ...validatePolicyRiskModifiers(state),
  ];
  return { valid: errors.length === 0, errors };
}

/*
 * SAVE MIGRATION GUIDE
 * Current version: SAVE_VERSION (see constant above)
 *
 * When adding a new top-level state slice or making a breaking change to an
 * existing slice:
 *   1. Increment SAVE_VERSION.
 *   2. Add a migration case below that handles the previous version.
 *   3. The migration must add sensible defaults for any new fields.
 *   4. Update the schema validation in validateSaveSchema() to cover the
 *      new slice.
 *   5. Update normaliseLoadedState() in normalisation.ts to provide defaults
 *      for the new slice.
 *
 * Versions:
 *   '1' -> '3': Added advisers, events, manifesto, mpSystem, simulation slices.
 *               Remapped adviser IDs (e.g. 'treasury' -> 'treasury_mandarin').
 *   '2' -> '3': Fixed invalid manifesto default (standard_labour -> cautious-centrist).
 *               Remapped adviser IDs using the old-to-new mapping.
 *   '3' -> '?': Next migration goes here.
 */
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
