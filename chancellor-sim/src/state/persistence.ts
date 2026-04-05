// Persistence functions: serialisation, save, and load.
// Extracted from game-state.tsx.

import { GameState } from '../types';
import { buildSaveEnvelope, SAVE_SIZE_LIMIT, validateSave } from './save-game';

/**
 * Prepare game state for JSON serialisation.
 * Converts Map objects in mpSystem to arrays so JSON.stringify preserves them.
 */
export function serialiseGameState(state: GameState): unknown {
  return {
    ...state,
    mpSystem: {
      ...state.mpSystem,
      allMPs: [],
      votingRecords: [],
      promises: [],
      concernProfiles:
        state.mpSystem.concernProfiles instanceof Map
          ? Array.from(state.mpSystem.concernProfiles.entries())
          : state.mpSystem.concernProfiles,
      currentBudgetSupport:
        state.mpSystem.currentBudgetSupport instanceof Map
          ? Array.from(state.mpSystem.currentBudgetSupport.entries())
          : state.mpSystem.currentBudgetSupport,
    },
    advisers: {
      ...state.advisers,
      hiredAdvisers:
        state.advisers.hiredAdvisers instanceof Map
          ? Array.from(state.advisers.hiredAdvisers.entries())
          : state.advisers.hiredAdvisers,
      availableAdvisers:
        state.advisers.availableAdvisers instanceof Set
          ? Array.from(state.advisers.availableAdvisers)
          : state.advisers.availableAdvisers,
      currentOpinions:
        state.advisers.currentOpinions instanceof Map
          ? Array.from(state.advisers.currentOpinions.entries())
          : state.advisers.currentOpinions,
    },
  };
}

export function writeSave(key: string, state: GameState): { success: boolean; error?: string } {
  try {
    const serialised = JSON.stringify(serialiseGameState(state));
    const envelopeString = JSON.stringify(buildSaveEnvelope(state, serialised));
    if (envelopeString.length > SAVE_SIZE_LIMIT) {
      return {
        success: false,
        error: `Save data too large (${(envelopeString.length / 1_000_000).toFixed(1)} MB). Consider starting a new game.`,
      };
    }
    localStorage.setItem(key, envelopeString);
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(`[Save] Failed to write to localStorage key "${key}":`, message);
    return { success: false, error: message };
  }
}

export function readSave(key: string): { state: unknown; warnings: string[] } | null | { error: string } {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const validation = validateSave(raw);
    if (!validation.success || !validation.state) {
      return { error: validation.error || `Save at key "${key}" is invalid.` };
    }

    return { state: validation.state, warnings: validation.warnings };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { error: `Unexpected error reading save at key "${key}": ${message}` };
  }
}
