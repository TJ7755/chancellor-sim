import type { GameState } from '../../game-state';

export function processFiscalEventCycle(state: GameState): GameState {
  const month = state.metadata.currentMonth;
  const isBudgetTurn = month === 3;
  const isAutumnStatementTurn = month === 11;
  if (!isBudgetTurn && !isAutumnStatementTurn) return state;

  const pendingAnnouncements = (state.fiscal.pendingAnnouncements || []).map((announcement) => ({ ...announcement }));
  let revenueAdjustmentDelta = 0;
  pendingAnnouncements.forEach((announcement) => {
    if (!announcement.implemented && announcement.effectiveTurn <= state.metadata.currentTurn) {
      announcement.implemented = true;
      revenueAdjustmentDelta += announcement.fiscalImpact_bn;
    }
  });
  const nextFiscalEventTurn = state.metadata.currentTurn + (isBudgetTurn ? 8 : 4);

  return {
    ...state,
    fiscal: {
      ...state.fiscal,
      revenueAdjustment_bn: (state.fiscal.revenueAdjustment_bn || 0) + revenueAdjustmentDelta,
      pendingAnnouncements,
      fiscalEventType: isBudgetTurn ? 'budget' : 'autumn_statement',
      nextFiscalEventTurn,
    },
    simulation: {
      ...state.simulation,
      lastTurnDelta: state.simulation.lastTurnDelta
        ? {
          ...state.simulation.lastTurnDelta,
          deficitDrivers: [
            ...(state.simulation.lastTurnDelta.deficitDrivers || []),
            { name: `Fiscal event: ${(isBudgetTurn ? 'Budget' : 'Autumn Statement')}`, value: 0 },
          ],
        }
        : state.simulation.lastTurnDelta,
    },
  };
}
