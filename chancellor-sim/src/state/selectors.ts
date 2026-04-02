import type { GameState, PMMessage } from '../game-state';

export interface DashboardHeadlineMetrics {
  gdpGrowth: number;
  inflation: number;
  unemployment: number;
  approval?: number;
}

export interface PoliticalOverview {
  pmTrust?: number;
  governmentApproval?: number;
  backbenchSatisfaction?: number;
}

export interface PMInboxViewModel {
  messages: PMMessage[];
  unreadCount: number;
  patience: number;
  reshuffleRisk: number;
  warningsIssued: number;
  demandsIssued: number;
  activeDemands: GameState['pmRelationship']['activeDemands'];
}

export function selectDashboardHeadlineMetrics(state: GameState): DashboardHeadlineMetrics {
  return {
    gdpGrowth: state.economic?.gdpGrowthAnnual ?? 0,
    inflation: state.economic?.inflationCPI ?? 0,
    unemployment: state.economic?.unemploymentRate ?? 0,
    approval: state.political?.governmentApproval,
  };
}

export function selectPoliticalOverview(state: GameState): PoliticalOverview {
  return {
    pmTrust: state.political?.pmTrust,
    governmentApproval: state.political?.governmentApproval,
    backbenchSatisfaction: state.political?.backbenchSatisfaction,
  };
}

export function selectPMInboxViewModel(state: GameState): PMInboxViewModel {
  return {
    messages: [...(state.pmRelationship?.messages || [])].sort((a, b) => b.turn - a.turn),
    unreadCount: state.pmRelationship?.unreadCount || 0,
    patience: state.pmRelationship?.patience || 0,
    reshuffleRisk: state.pmRelationship?.reshuffleRisk || 0,
    warningsIssued: state.pmRelationship?.warningsIssued || 0,
    demandsIssued: state.pmRelationship?.demandsIssued || 0,
    activeDemands: state.pmRelationship?.activeDemands || [],
  };
}
