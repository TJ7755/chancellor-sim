import { loadMPs, loadVotingRecords, loadPromises } from '../mp-storage';

export interface FullGameExport {
  version: string;
  exportedAt: number;
  gameSave: string | null;
  mpData: Array<{ id: string; data: any }>;
  votingRecords: Array<{ mpId: string; data: any }>;
  promises: Array<{ id: string; data: any }>;
}

export async function exportFullGame(gameSaveJson: string | null): Promise<FullGameExport> {
  const [mps, votingRecords, promises] = await Promise.all([loadMPs(), loadVotingRecords(), loadPromises()]);

  const mpArray = Array.from((mps || new Map()).entries()).map(([id, data]: [string, any]) => ({ id, data }));
  const votingArray = Array.from((votingRecords || new Map()).entries()).map(([mpId, data]: [string, any]) => ({
    mpId,
    data,
  }));
  const promisesArray = Array.from((promises || new Map()).entries()).map(([id, data]: [string, any]) => ({
    id,
    data,
  }));

  return {
    version: '1',
    exportedAt: Date.now(),
    gameSave: gameSaveJson,
    mpData: mpArray,
    votingRecords: votingArray,
    promises: promisesArray,
  };
}

export async function importFullGame(exportData: FullGameExport): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];

  if (!exportData || typeof exportData !== 'object') {
    return { success: false, errors: ['Invalid export data structure'] };
  }

  if (exportData.gameSave) {
    try {
      const parsed = JSON.parse(exportData.gameSave);
      if (!parsed?.metadata || !parsed?.economic) {
        errors.push('Game save is missing required fields');
      }
    } catch {
      errors.push('Game save JSON is corrupt');
    }
  }

  if (!Array.isArray(exportData.mpData)) {
    errors.push('MP data must be an array');
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return { success: true, errors: [] };
}
