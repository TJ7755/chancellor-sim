import type { GameState, PMMessage, PMRelationshipState } from '../../game-state';
import { processPMCommunications } from '../../pm-system';

export interface PMCommunicationsResult {
  newMessage: PMMessage | null;
  relationshipUpdates: Partial<PMRelationshipState>;
  reshuffleTriggered: boolean;
}

function buildThreatFollowUpMessage(state: GameState, targetDeficitBn: number, deadlineTurn: number): PMMessage {
  return {
    id: `pm_${state.metadata.currentTurn}_threat_followup_${Date.now()}`,
    turn: state.metadata.currentTurn,
    type: 'threat',
    subject: 'Deadline missed: PM confidence reduced',
    content:
      `Chancellor, the deadline to reduce the deficit below £${targetDeficitBn.toFixed(0)}bn has passed without delivery. ` +
      `You were given until turn ${deadlineTurn}. I now require an immediate corrective package.`,
    tone: 'angry',
    read: false,
    timestamp: Date.now(),
  };
}

export function processPMCommunicationsStep(
  state: GameState,
  runPMCommunications: (gameState: GameState) => PMCommunicationsResult = processPMCommunications
): GameState {
  if (!state.metadata.gameStarted || state.metadata.gameOver) {
    return state;
  }

  const breachedThreat = (state.pmRelationship.activeThreats || []).find(
    (threat) => threat.breached && !threat.followUpSent
  );

  if (breachedThreat) {
    const followUpMessage = buildThreatFollowUpMessage(
      state,
      breachedThreat.targetDeficit_bn,
      breachedThreat.deadlineTurn
    );

    return {
      ...state,
      pmRelationship: {
        ...state.pmRelationship,
        unreadCount: state.pmRelationship.unreadCount + 1,
        messages: [...state.pmRelationship.messages, followUpMessage],
        activeThreats: state.pmRelationship.activeThreats.map((threat) =>
          threat.id === breachedThreat.id ? { ...threat, followUpSent: true } : threat
        ),
      },
    };
  }

  const { newMessage, relationshipUpdates, reshuffleTriggered } = runPMCommunications(state);

  if (reshuffleTriggered) {
    return {
      ...state,
      metadata: {
        ...state.metadata,
        gameOver: true,
        gameOverReason:
          'You have been reshuffled out of the Treasury. The Prime Minister has lost confidence in your ability to manage the economy.',
      },
    };
  }

  let updatedPMRelationship = {
    ...state.pmRelationship,
    ...relationshipUpdates,
  };

  if (newMessage) {
    updatedPMRelationship = {
      ...state.pmRelationship,
      unreadCount: (state.pmRelationship.unreadCount || 0) + 1,
      ...relationshipUpdates,
      messages: [...updatedPMRelationship.messages, newMessage],
    };

    if (newMessage.type === 'demand' && newMessage.demandCategory && newMessage.demandDetails) {
      const targetDeficit = newMessage.threatTargetDeficit_bn ?? 50;
      const deadlineTurn = newMessage.threatDeadlineTurn ?? state.metadata.currentTurn + 3;
      updatedPMRelationship.activeDemands = [
        ...updatedPMRelationship.activeDemands,
        {
          category: newMessage.demandCategory,
          description: newMessage.demandDetails,
          deadline: deadlineTurn,
          met: false,
        },
      ];

      if (newMessage.demandCategory === 'deficit') {
        updatedPMRelationship.activeThreats = [
          ...(updatedPMRelationship.activeThreats || []),
          {
            id: `threat_${state.metadata.currentTurn}_${Date.now()}`,
            category: 'deficit',
            createdTurn: state.metadata.currentTurn,
            deadlineTurn,
            baselineDeficit_bn: newMessage.threatBaselineDeficit_bn ?? state.fiscal.deficit_bn,
            targetDeficit_bn: targetDeficit,
            breached: false,
            resolved: false,
            followUpSent: false,
          },
        ];
      }
    }
  }

  return {
    ...state,
    pmRelationship: updatedPMRelationship,
  };
}
