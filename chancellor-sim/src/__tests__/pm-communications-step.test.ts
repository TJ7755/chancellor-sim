import { processPMCommunicationsStep } from '../domain/pm/communications-step';

describe('PM communications step', () => {
  const createBaseState = (): any => ({
    metadata: {
      gameStarted: true,
      gameOver: false,
      currentTurn: 8,
    },
    fiscal: {
      deficit_bn: 82,
    },
    pmRelationship: {
      unreadCount: 0,
      messages: [],
      activeDemands: [],
      activeThreats: [],
    },
  });

  it('sends a follow-up message for breached unmet threats', () => {
    const state = createBaseState();
    state.pmRelationship.activeThreats = [
      {
        id: 'threat-1',
        category: 'deficit',
        createdTurn: 5,
        deadlineTurn: 7,
        baselineDeficit_bn: 90,
        targetDeficit_bn: 70,
        breached: true,
        resolved: false,
        followUpSent: false,
      },
    ];

    const updated = processPMCommunicationsStep(state);

    expect(updated.pmRelationship.unreadCount).toBe(1);
    expect(updated.pmRelationship.messages).toHaveLength(1);
    expect(updated.pmRelationship.messages[0].subject).toContain('Deadline missed');
    expect(updated.pmRelationship.activeThreats[0].followUpSent).toBe(true);
  });

  it('adds new PM demands and deficit threats from communication results', () => {
    const state = createBaseState();

    const updated = processPMCommunicationsStep(state, () => ({
      reshuffleTriggered: false,
      relationshipUpdates: {
        patience: 48,
      },
      newMessage: {
        id: 'msg-1',
        turn: 8,
        type: 'demand',
        subject: 'Reduce borrowing',
        content: 'Reduce the deficit.',
        tone: 'stern',
        read: false,
        timestamp: Date.now(),
        demandCategory: 'deficit',
        demandDetails: 'Bring borrowing below £65bn.',
        threatTargetDeficit_bn: 65,
        threatDeadlineTurn: 11,
        threatBaselineDeficit_bn: 82,
      },
    }));

    expect(updated.pmRelationship.patience).toBe(48);
    expect(updated.pmRelationship.unreadCount).toBe(1);
    expect(updated.pmRelationship.activeDemands).toHaveLength(1);
    expect(updated.pmRelationship.activeThreats).toHaveLength(1);
    expect(updated.pmRelationship.activeThreats[0].targetDeficit_bn).toBe(65);
  });

  it('ends the game when a reshuffle is triggered', () => {
    const state = createBaseState();

    const updated = processPMCommunicationsStep(state, () => ({
      reshuffleTriggered: true,
      relationshipUpdates: {},
      newMessage: null,
    }));

    expect(updated.metadata.gameOver).toBe(true);
    expect(updated.metadata.gameOverReason).toContain('reshuffled out of the Treasury');
  });
});
