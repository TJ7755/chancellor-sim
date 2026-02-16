import { GameState, PMMessage, PMMessageType, PMRelationshipState } from './game-state';

// ============================================================================
// PM MESSAGE GENERATION SYSTEM
// ============================================================================

/**
 * Generate a unique message ID
 */
function generateMessageId(turn: number, type: PMMessageType): string {
  return `pm_${turn}_${type}_${Date.now()}`;
}

/**
 * Determine if PM should send a scheduled check-in message
 */
export function shouldSendScheduledMessage(pmRelationship: PMRelationshipState, currentTurn: number): boolean {
  // Send first message after turn 2 (month 3)
  if (currentTurn === 3 && pmRelationship.lastContactTurn === -1) {
    return true;
  }

  // Then send every 6 turns (every 6 months) if no recent contact
  if (pmRelationship.lastContactTurn === -1 || currentTurn - pmRelationship.lastContactTurn >= 6) {
    return true;
  }

  return false;
}

/**
 * Determine if PM should send an event-triggered message based on current game state
 */
export function shouldSendEventTriggeredMessage(
  gameState: GameState
): { shouldSend: boolean; messageType: PMMessageType | null; reason: string } {
  const { political, pmRelationship } = gameState;

  // Critical: Reshuffle warning (final warning)
  if (pmRelationship.reshuffleRisk >= 80 && !pmRelationship.finalWarningGiven) {
    return { shouldSend: true, messageType: 'reshuffle_warning', reason: 'reshuffle_imminent' };
  }

  // High concern: PM Trust very low
  if (political.pmTrust < 30 && gameState.metadata.currentTurn - pmRelationship.lastContactTurn >= 2) {
    if (pmRelationship.warningsIssued === 0) {
      return { shouldSend: true, messageType: 'warning', reason: 'low_trust' };
    } else {
      return { shouldSend: true, messageType: 'threat', reason: 'continued_low_trust' };
    }
  }

  // Medium concern: Government approval tanking
  if (political.governmentApproval < 25 && gameState.metadata.currentTurn - pmRelationship.lastContactTurn >= 3) {
    return { shouldSend: true, messageType: 'concern', reason: 'low_approval' };
  }

  // Demand: Deficit spiraling
  if (gameState.fiscal.deficit_bn > 80 && !pmRelationship.activeDemands.find(d => d.category === 'deficit')) {
    return { shouldSend: true, messageType: 'demand', reason: 'high_deficit' };
  }

  // Positive: Praise for good performance
  if (political.pmTrust > 75 && political.governmentApproval > 50 &&
      gameState.metadata.currentTurn - pmRelationship.lastContactTurn >= 4 &&
      pmRelationship.consecutivePoorPerformance === 0) {
    return { shouldSend: true, messageType: 'praise', reason: 'good_performance' };
  }

  // Withdraw support
  if (pmRelationship.reshuffleRisk >= 60 && !pmRelationship.supportWithdrawn && pmRelationship.warningsIssued >= 2) {
    return { shouldSend: true, messageType: 'support_change', reason: 'support_withdrawn' };
  }

  return { shouldSend: false, messageType: null, reason: '' };
}

/**
 * Generate message content based on type and game state
 */
export function generatePMMessage(
  gameState: GameState,
  messageType: PMMessageType,
  reason: string
): PMMessage {
  const { political, economic, fiscal, pmRelationship, metadata } = gameState;
  const turn = metadata.currentTurn;

  let subject = '';
  let content = '';
  let tone: 'supportive' | 'neutral' | 'stern' | 'angry' = 'neutral';
  let demandCategory: 'tax' | 'spending' | 'deficit' | 'approval' | undefined;
  let demandDetails: string | undefined;
  let consequenceWarning: string | undefined;

  switch (messageType) {
    case 'regular_checkin':
      const monthName = getMonthName(metadata.currentMonth);
      if (political.pmTrust >= 60 && political.governmentApproval >= 40) {
        subject = `${monthName} Check-in: Keep Up the Good Work`;
        content = `Chancellor,\n\nI wanted to touch base this month. The economic figures are holding steady, and I'm pleased with the direction we're heading.\n\nPM Trust: ${political.pmTrust}/100\nGovernment Approval: ${political.governmentApproval}%\nGDP Growth: ${economic.gdpGrowthAnnual.toFixed(1)}%\n\nKeep the backbenchers onside and continue delivering on our manifesto. We need steady hands ​​at the wheel.\n\nBest,\nThe Prime Minister`;
        tone = 'supportive';
      } else if (political.pmTrust >= 40) {
        subject = `${monthName} Check-in: Room for Improvement`;
        content = `Chancellor,\n\nWe need to talk about where we are. The numbers aren't terrible, but they're not where they need to be either.\n\nPM Trust: ${political.pmTrust}/100\nGovernment Approval: ${political.governmentApproval}%\nDeficit: £${fiscal.deficit_bn.toFixed(1)}bn\n\nI need to see more decisive action. The backbenchers are getting restless, and we can't afford too many more missteps.\n\nLet's discuss strategy soon.\n\nPrime Minister`;
        tone = 'neutral';
      } else {
        subject = `${monthName} Check-in: We Have a Problem`;
        content = `Chancellor,\n\nI'll be blunt: things are not going well. The numbers speak for themselves, and they're causing serious concern across the party.\n\nPM Trust: ${political.pmTrust}/100\nGovernment Approval: ${political.governmentApproval}%\nBackbench Satisfaction: ${political.backbenchSatisfaction}/100\n\nWe need to see significant improvement, and soon. My patience is not unlimited.\n\nRegards,\nPrime Minister`;
        tone = 'stern';
      }
      break;

    case 'warning':
      // Calculate current budget balance (excl. investment spending)
      const currentBudgetWarning = fiscal.totalRevenue_bn -
        (fiscal.totalSpending_bn - fiscal.spending.infrastructure) -
        fiscal.debtInterest_bn;

      subject = 'Serious Concerns About Economic Performance';
      content = `Chancellor,\n\nI need to raise serious concerns about your stewardship of the economy. Your approval among our MPs is worryingly low (PM Trust: ${political.pmTrust}/100), and this is becoming a problem for the government as a whole.\n\n`;

      if (fiscal.deficit_bn > 60) {
        content += `The overall deficit is £${fiscal.deficit_bn.toFixed(1)}bn. `;
        if (currentBudgetWarning < -10) {
          content += `More concerning, the current budget (excluding investment) shows a £${Math.abs(currentBudgetWarning).toFixed(1)}bn deficit — this means day-to-day spending exceeds revenues. `;
        }
      }
      if (political.governmentApproval < 35) {
        content += `Government approval has fallen to ${political.governmentApproval}%, which is unacceptable. `;
      }
      if (political.backbenchSatisfaction < 40) {
        content += `The backbenchers are openly expressing frustration. `;
      }

      content += `\n\nThis is your warning: things must improve. I expect to see concrete action to address these issues. We cannot continue on this trajectory.\n\nYou have my support for now, but it's not unconditional.\n\nPrime Minister`;
      tone = 'stern';
      consequenceWarning = 'Continued poor performance may result in further consequences';
      break;

    case 'threat':
      subject = 'Final Warning: Immediate Improvement Required';
      content = `Chancellor,\n\nI've tried to be patient, but the situation has not improved. In fact, it's gotten worse.\n\nCurrent state:\n- PM Trust: ${political.pmTrust}/100\n- Government Approval: ${political.governmentApproval}%\n- Backbench Satisfaction: ${political.backbenchSatisfaction}/100\n- Deficit: £${fiscal.deficit_bn.toFixed(1)}bn\n\nThe Cabinet is asking questions. The backbenchers are in open revolt. The media is sensing blood in the water.\n\nI will not let one minister drag down this entire government. Turn things around immediately, or I will have no choice but to consider a reshuffle.\n\nThis is not a drill.\n\nPrime Minister`;
      tone = 'angry';
      consequenceWarning = 'You are at risk of being reshuffled out of the Treasury';
      break;

    case 'demand':
      if (reason === 'high_deficit') {
        // Calculate current budget balance (excl. investment spending)
        const currentBudgetDemand = fiscal.totalRevenue_bn -
          (fiscal.totalSpending_bn - fiscal.spending.infrastructure) -
          fiscal.debtInterest_bn;
        const investmentSpending = fiscal.spending.infrastructure;

        subject = 'Immediate Action Required: Deficit Control';

        // Provide context about whether deficit is from investment or day-to-day spending
        const deficitContext = currentBudgetDemand >= 0
          ? `The overall deficit of £${fiscal.deficit_bn.toFixed(1)}bn is primarily driven by investment spending (£${investmentSpending.toFixed(1)}bn). While investment is important, the scale is unsustainable at current debt levels.`
          : `The overall deficit has reached £${fiscal.deficit_bn.toFixed(1)}bn. The current budget (excluding investment) shows a £${Math.abs(currentBudgetDemand).toFixed(1)}bn deficit, meaning day-to-day spending exceeds revenues — this is completely unsustainable.`;

        content = `Chancellor,\n\n${deficitContext}\n\nThis is a direct threat to our fiscal credibility and our manifesto commitments.\n\nI am formally requesting that you bring forward an emergency budget to bring the deficit under control. Target: reduce the overall deficit to below £50bn within 3 months.\n\nThis is not optional. Our fiscal rules exist for a reason, and we cannot abandon them without destroying our economic credibility.\n\nYou have 3 months to deliver.\n\nPrime Minister`;
        demandCategory = 'deficit';
        demandDetails = 'Reduce deficit below £50bn within 3 months';
        tone = 'stern';
      } else if (reason === 'manifesto_breach') {
        subject = 'Manifesto Compliance Demanded';
        content = `Chancellor,\n\nWe have a problem. You've broken manifesto pledges, and the party won't tolerate it. Our credibility is built on keeping our promises to voters.\n\nI need you to bring forward a corrective budget that addresses these violations. No excuses.\n\nDeadline: 2 months.\n\nPrime Minister`;
        demandCategory = 'tax';
        demandDetails = 'Correct manifesto violations within 2 months';
        tone = 'angry';
      }
      break;

    case 'support_change':
      if (reason === 'support_withdrawn') {
        subject = 'Withdrawal of Political Support';
        content = `Chancellor,\n\nI regret to inform you that I am formally withdrawing my active political support for your chancellorship. You will continue in role, but you should not expect me to whip votes in your favor or provide cover for difficult decisions.\n\nThis is a direct consequence of:\n- Persistently low PM Trust (${political.pmTrust}/100)\n- Multiple warnings ignored\n- Failure to deliver promised improvements\n\nYou can earn back my support through concrete action and tangible results. Until then, you're on your own.\n\nPrime Minister`;
        tone = 'angry';
        consequenceWarning = 'Budgets will be much harder to pass without PM support';
      } else {
        subject = 'Support Restored';
        content = `Chancellor,\n\nI'm pleased to see the improvements you've made. Your recent performance has been significantly better, and I'm restoring my full political support.\n\nPM Trust: ${political.pmTrust}/100\nGovernment Approval: ${political.governmentApproval}%\n\nKeep up the good work, and let's continue moving forward together.\n\nPrime Minister`;
        tone = 'supportive';
      }
      break;

    case 'reshuffle_warning':
      subject = 'Final Notice: Reshuffle Imminent';
      content = `Chancellor,\n\nThis is your final notice.\n\nYour position as Chancellor of the Exchequer is untenable. The Cabinet has lost confidence. The backbenchers are in open revolt. The party is demanding action.\n\nReshuffle Risk: ${pmRelationship.reshuffleRisk}/100\nPM Trust: ${political.pmTrust}/100\n\nYou have ONE opportunity to turn this around. Deliver a successful budget that passes Parliament with strong support and improves economic performance, OR I will have no choice but to replace you.\n\nThis is the last conversation we'll have on this matter before I make my decision.\n\nPrime Minister`;
      tone = 'angry';
      consequenceWarning = 'You will be reshuffled if performance does not improve immediately (GAME OVER)';
      break;

    case 'praise':
      subject = 'Excellent Work This Quarter';
      content = `Chancellor,\n\nI wanted to personally thank you for your outstanding work managing the economy. The numbers speak for themselves:\n\nPM Trust: ${political.pmTrust}/100\nGovernment Approval: ${political.governmentApproval}%\nGDP Growth: ${economic.gdpGrowthAnnual.toFixed(1)}%\nDeficit: £${fiscal.deficit_bn.toFixed(1)}bn\n\nThe party is happy, the markets are stable, and we're delivering for the British people. This is exactly the kind of steady, competent economic management we promised voters.\n\nKeep it up. You have my full confidence and support.\n\nBest regards,\nThe Prime Minister`;
      tone = 'supportive';
      break;

    case 'concern':
      subject = 'Growing Concerns';
      content = `Chancellor,\n\nI wanted to flag some concerning trends I'm seeing in the numbers:\n\n`;

      if (political.governmentApproval < 30) {
        content += `- Government approval has dropped to ${political.governmentApproval}%, which is dangerously low\n`;
      }
      if (economic.gdpGrowthAnnual < 0.5) {
        content += `- GDP growth is anemic at ${economic.gdpGrowthAnnual.toFixed(1)}%\n`;
      }
      if (fiscal.deficit_bn > 70) {
        content += `- The deficit is rising toward unsustainable levels (£${fiscal.deficit_bn.toFixed(1)}bn)\n`;
      }

      content += `\nThese aren't critical yet, but they're heading in the wrong direction. I'd like to see you address these issues proactively before they become real problems.\n\nLet's stay ahead of this.\n\nPrime Minister`;
      tone = 'neutral';
      break;
  }

  return {
    id: generateMessageId(turn, messageType),
    turn,
    type: messageType,
    subject,
    content,
    tone,
    read: false,
    timestamp: Date.now(),
    demandCategory,
    demandDetails,
    consequenceWarning,
  };
}

/**
 * Update PM relationship state based on game performance
 */
export function updatePMRelationship(gameState: GameState): Partial<PMRelationshipState> {
  const { political, fiscal, pmRelationship, metadata } = gameState;
  const updates: Partial<PMRelationshipState> = {};

  // Update patience based on performance
  let patienceChange = 0;

  // PM Trust impacts patience most
  if (political.pmTrust < 30) {
    patienceChange -= 5;
    updates.consecutivePoorPerformance = (pmRelationship.consecutivePoorPerformance || 0) + 1;
  } else if (political.pmTrust > 70) {
    patienceChange += 3;
    updates.consecutivePoorPerformance = 0;
  } else {
    updates.consecutivePoorPerformance = 0;
  }

  // Government approval matters
  if (political.governmentApproval < 25) {
    patienceChange -= 3;
  } else if (political.governmentApproval > 50) {
    patienceChange += 2;
  }

  // Fiscal responsibility
  if (fiscal.deficit_bn > 80) {
    patienceChange -= 2;
  } else if (fiscal.deficit_bn < 30) {
    patienceChange += 1;
  }

  // Update patience (bounded 0-100)
  const newPatience = Math.max(0, Math.min(100, (pmRelationship.patience || 70) + patienceChange));
  updates.patience = newPatience;

  // Calculate reshuffle risk based on multiple factors
  let reshuffleRisk = 0;

  // Primary driver: low patience
  if (newPatience < 20) {
    reshuffleRisk += 50;
  } else if (newPatience < 40) {
    reshuffleRisk += 25;
  }

  // Consecutive poor performance
  const poorPerfTurns = updates.consecutivePoorPerformance ?? pmRelationship.consecutivePoorPerformance;
  if (poorPerfTurns >= 6) {
    reshuffleRisk += 30;
  } else if (poorPerfTurns >= 3) {
    reshuffleRisk += 15;
  }

  // Multiple warnings
  if (pmRelationship.warningsIssued >= 3) {
    reshuffleRisk += 20;
  } else if (pmRelationship.warningsIssued >= 2) {
    reshuffleRisk += 10;
  }

  // Unmet demands
  const unmetDemands = pmRelationship.activeDemands.filter(d => !d.met && metadata.currentTurn > d.deadline).length;
  reshuffleRisk += unmetDemands * 15;

  updates.reshuffleRisk = Math.min(100, reshuffleRisk);

  return updates;
}

/**
 * Process PM communications for the current turn
 */
export function processPMCommunications(gameState: GameState): {
  newMessage: PMMessage | null;
  relationshipUpdates: Partial<PMRelationshipState>;
  reshuffleTriggered: boolean;
} {
  const relationshipUpdates = updatePMRelationship(gameState);
  let newMessage: PMMessage | null = null;
  let reshuffleTriggered = false;

  // Check if reshuffle should be triggered (game over)
  if (relationshipUpdates.reshuffleRisk && relationshipUpdates.reshuffleRisk >= 95) {
    reshuffleTriggered = true;
  }

  // Check for event-triggered messages first (higher priority)
  const eventCheck = shouldSendEventTriggeredMessage(gameState);
  if (eventCheck.shouldSend && eventCheck.messageType) {
    newMessage = generatePMMessage(gameState, eventCheck.messageType, eventCheck.reason);

    // Update tracking based on message type
    if (eventCheck.messageType === 'warning') {
      relationshipUpdates.warningsIssued = (gameState.pmRelationship.warningsIssued || 0) + 1;
    } else if (eventCheck.messageType === 'demand') {
      relationshipUpdates.demandsIssued = (gameState.pmRelationship.demandsIssued || 0) + 1;
    } else if (eventCheck.messageType === 'reshuffle_warning') {
      relationshipUpdates.finalWarningGiven = true;
    } else if (eventCheck.messageType === 'support_change' && eventCheck.reason === 'support_withdrawn') {
      relationshipUpdates.supportWithdrawn = true;
    }
  }
  // Check for scheduled messages if no event-triggered message
  else if (shouldSendScheduledMessage(gameState.pmRelationship, gameState.metadata.currentTurn)) {
    newMessage = generatePMMessage(gameState, 'regular_checkin', 'scheduled');
  }

  if (newMessage) {
    relationshipUpdates.lastContactTurn = gameState.metadata.currentTurn;
  }

  return {
    newMessage,
    relationshipUpdates,
    reshuffleTriggered,
  };
}

/**
 * Helper function to get month name
 */
function getMonthName(month: number): string {
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
  return months[month - 1] || 'Unknown';
}

/**
 * Mark a message as read
 */
export function markMessageAsRead(pmRelationship: PMRelationshipState, messageId: string): PMRelationshipState {
  const updatedMessages = pmRelationship.messages.map(msg =>
    msg.id === messageId ? { ...msg, read: true } : msg
  );

  const unreadCount = updatedMessages.filter(msg => !msg.read).length;

  return {
    ...pmRelationship,
    messages: updatedMessages,
    unreadCount,
  };
}

/**
 * Check if a demand has been met
 */
export function checkDemandFulfillment(
  demand: { category: string; description: string; deadline: number; met: boolean },
  gameState: GameState
): boolean {
  // Check if demand conditions are satisfied
  if (demand.category === 'deficit' && gameState.fiscal.deficit_bn < 50) {
    return true;
  }

  // Add more demand checking logic as needed
  return false;
}
