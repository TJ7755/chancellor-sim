import { processFiscalEventCycle } from '../domain/fiscal/fiscal-event-cycle';

describe('fiscal event cycle', () => {
  it('implements pending announcements on a budget turn', () => {
    const state: any = {
      metadata: { currentMonth: 3, currentTurn: 10 },
      fiscal: {
        revenueAdjustment_bn: 2,
        pendingAnnouncements: [
          { implemented: false, effectiveTurn: 10, fiscalImpact_bn: 4.5 },
          { implemented: false, effectiveTurn: 12, fiscalImpact_bn: 1.5 },
        ],
      },
      simulation: {
        lastTurnDelta: {
          deficitDrivers: [],
        },
      },
    };

    const updated = processFiscalEventCycle(state);

    expect(updated.fiscal.revenueAdjustment_bn).toBe(6.5);
    expect(updated.fiscal.pendingAnnouncements[0].implemented).toBe(true);
    expect(updated.fiscal.fiscalEventType).toBe('budget');
    expect(updated.fiscal.nextFiscalEventTurn).toBe(18);
  });
});
