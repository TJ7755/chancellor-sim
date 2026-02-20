import { GameState, PMMessage, PMMessageType, PMRelationshipState } from './game-state';
import { PM_MESSAGES, PMMessageTemplate } from './data/pm-messages';
import { getFiscalRuleById } from './game-integration';

// ============================================================================
// PM MESSAGE GENERATION SYSTEM
// ============================================================================

/**
 * Generate a unique message ID
 */
function generateMessageId(turn: number, type: PMMessageType): string {
  return `pm_${turn}_${type}_${Date.now()} `;
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

  // Fiscal headroom commentary
  if (gameState.fiscal.fiscalHeadroom_bn < 10 && gameState.metadata.currentTurn - pmRelationship.lastContactTurn >= 2) {
    return { shouldSend: true, messageType: 'concern', reason: 'tight_headroom' };
  }

  if (!gameState.political.fiscalRuleCompliance.overallCompliant && gameState.metadata.currentTurn - pmRelationship.lastContactTurn >= 2) {
    return { shouldSend: true, messageType: 'concern', reason: 'fiscal_rule_breach' };
  }

  if (gameState.services.nhsQuality < 50 || gameState.services.educationQuality < 55 || gameState.services.policingEffectiveness < 50) {
    if (gameState.metadata.currentTurn - pmRelationship.lastContactTurn >= 2) {
      return { shouldSend: true, messageType: 'concern', reason: 'service_deterioration' };
    }
  }

  // Demand: Deficit spiraling
  const hasActiveDeficitThreat = (pmRelationship.activeThreats || []).some(
    (t) => t.category === 'deficit' && !t.resolved && !t.breached
  );
  if (gameState.fiscal.deficit_bn > 80 && !hasActiveDeficitThreat) {
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

function calculateDeficitThreatTarget(gameState: GameState): {
  targetDeficit_bn: number;
  deadlineMonths: number;
} {
  const currentDeficit = Math.max(0, gameState.fiscal.deficit_bn);
  const rule = getFiscalRuleById(gameState.political.chosenFiscalRule);
  const limitFromRule = rule.rules.deficitCeiling
    ? (rule.rules.deficitCeiling / 100) * gameState.economic.gdpNominal_bn
    : undefined;

  const reductionShare = 0.15 + Math.random() * 0.1;
  const proportionalTarget = currentDeficit * (1 - reductionShare);
  const ruleConstrainedTarget = limitFromRule !== undefined
    ? Math.min(proportionalTarget, limitFromRule)
    : proportionalTarget;

  const deadlineMonths = 2 + Math.floor(Math.random() * 3);

  return {
    targetDeficit_bn: Math.max(5, ruleConstrainedTarget),
    deadlineMonths,
  };
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

  // 1. Filter messages by type
  const potentialMessages = PM_MESSAGES.filter(m => m.type === messageType);

  // 2. Find best match (first one that meets conditions)
  // We prioritize specific conditions over general ones implicitly by order in array?
  // Or we can sort by strictness.
  // Let's iterate and check.

  let selectedTemplate: PMMessageTemplate | undefined;
  let threatTargetDeficit_bn: number | undefined;
  let threatDeadlineTurn: number | undefined;
  let threatBaselineDeficit_bn: number | undefined;

  // Helper to check conditions
  const checkCondition = (template: PMMessageTemplate): boolean => {
    const c = template.conditions;
    if (c.minTrust !== undefined && political.pmTrust < c.minTrust) return false;
    if (c.maxTrust !== undefined && political.pmTrust > c.maxTrust) return false;
    if (c.minApproval !== undefined && political.governmentApproval < c.minApproval) return false;
    if (c.maxApproval !== undefined && political.governmentApproval > c.maxApproval) return false;
    if (c.minDeficit !== undefined && fiscal.deficit_bn < c.minDeficit) return false;
    if (c.maxDeficit !== undefined && fiscal.deficit_bn > c.maxDeficit) return false;
    if (c.minHeadroom !== undefined && fiscal.fiscalHeadroom_bn < c.minHeadroom) return false;
    if (c.maxHeadroom !== undefined && fiscal.fiscalHeadroom_bn > c.maxHeadroom) return false;
    if (c.fiscalRuleCompliant !== undefined && gameState.political.fiscalRuleCompliance.overallCompliant !== c.fiscalRuleCompliant) return false;
    if (c.reshuffleRisk !== undefined && pmRelationship.reshuffleRisk < c.reshuffleRisk) return false;
    if (c.minGrowth !== undefined && economic.gdpGrowthAnnual < c.minGrowth) return false;
    if (c.maxGrowth !== undefined && economic.gdpGrowthAnnual > c.maxGrowth) return false;
    if (c.serviceMetric) {
      const metricValue = (gameState.services as any)[c.serviceMetric];
      if (typeof metricValue !== 'number') return false;
      if (c.maxServiceQuality !== undefined && metricValue > c.maxServiceQuality) return false;
      if (c.minServiceQuality !== undefined && metricValue < c.minServiceQuality) return false;
    }

    // Reason-based flags & Heuristics
    // If template requires Manifesto Breach, reason must be 'manifesto_breach'
    if (c.isManifestoBreach === true && reason !== 'manifesto_breach') return false;
    if (c.isSupportWithdrawn === true && reason !== 'support_withdrawn') return false;
    if (c.isSupportWithdrawn === false && reason !== 'support_restored') return false;

    // Heuristics
    if (c.nhsCrisis) {
      if ((gameState.services.nhsQuality ?? 60) > 50) return false; // Crisis only if quality <= 50
    }

    if (c.taxRises) {
      // Assume tax rises if rates are elevated
      const isHighTax = fiscal.vatRate > 20 || fiscal.incomeTaxBasicRate > 20 || fiscal.corporationTaxRate > 25;
      if (!isHighTax && reason !== 'tax_anger') return false;
    }

    if (c.spendingCuts) {
      // Assume cuts if deficit is low and services struggling
      const isAusterity = fiscal.deficit_bn < 40 && (gameState.services.nhsQuality < 55);
      if (!isAusterity) return false;
    }

    return true;
  };

  selectedTemplate = potentialMessages.find(checkCondition);

  // Fallback if no specific condition met (shouldn't happen if data is complete, but safety net)
  if (!selectedTemplate && potentialMessages.length > 0) {
    // Pick the one with fewest conditions or default
    selectedTemplate = potentialMessages[potentialMessages.length - 1];
  }

  if (!selectedTemplate) {
    // Absolute fallback
    return {
      id: generateMessageId(turn, messageType),
      turn,
      type: messageType,
      subject: 'Update form Number 10',
      content: 'Chancellor, we need to speak about the economy.',
      tone: 'neutral',
      read: false,
      timestamp: Date.now()
    };
  }

  // 3. Inject variables
  const monthName = getMonthName(metadata.currentMonth);
  const fiscalRule = getFiscalRuleById(gameState.political.chosenFiscalRule);
  const headroom = fiscal.fiscalHeadroom_bn;
  const serviceEntries: Array<{ serviceName: string; qualityScore: number }> = [
    { serviceName: 'NHS quality', qualityScore: gameState.services.nhsQuality },
    { serviceName: 'education quality', qualityScore: gameState.services.educationQuality },
    { serviceName: 'infrastructure quality', qualityScore: gameState.services.infrastructureQuality },
    { serviceName: 'policing', qualityScore: gameState.services.policingEffectiveness },
    { serviceName: 'courts', qualityScore: gameState.services.courtBacklogPerformance },
    { serviceName: 'prisons', qualityScore: gameState.services.prisonSafety },
    { serviceName: 'mental health', qualityScore: gameState.services.mentalHealthAccess },
  ];
  const lowestService = [...serviceEntries].sort((a, b) => a.qualityScore - b.qualityScore)[0];
  if (messageType === 'demand' && reason === 'high_deficit') {
    const threatTarget = calculateDeficitThreatTarget(gameState);
    threatTargetDeficit_bn = threatTarget.targetDeficit_bn;
    threatDeadlineTurn = turn + threatTarget.deadlineMonths;
    threatBaselineDeficit_bn = fiscal.deficit_bn;
  }

  let content = selectedTemplate.content
    .replace('{trust}', Math.round(political.pmTrust).toString())
    .replace('{approval}', Math.round(political.governmentApproval).toString())
    .replace('{growth}', economic.gdpGrowthAnnual.toFixed(1))
    .replace('{unemployment}', economic.unemploymentRate.toFixed(1))
    .replace('{deficit}', Math.round(fiscal.deficit_bn).toString())
    .replace('{headroom}', headroom.toFixed(1))
    .replace('{ruleName}', fiscalRule.name)
    .replace('{serviceName}', lowestService.serviceName)
    .replace('{qualityScore}', lowestService.qualityScore.toFixed(0))
    .replace('{backbench}', Math.round(political.backbenchSatisfaction).toString())
    .replace('{month}', monthName)
    .replace('{targetDeficit}', Math.round(threatTargetDeficit_bn ?? 50).toString())
    .replace('{deadlineMonths}', String((threatDeadlineTurn ?? (turn + 3)) - turn))
    .replace('{deadlineTurn}', String(threatDeadlineTurn ?? (turn + 3)));

  let subject = selectedTemplate.subject.replace('{month}', monthName);

  return {
    id: generateMessageId(turn, messageType),
    turn,
    type: messageType,
    subject,
    content,
    tone: selectedTemplate.tone,
    demandCategory: selectedTemplate.demandCategory,
    demandDetails: selectedTemplate.demandDetails
      ?.replace('{targetDeficit}', Math.round(threatTargetDeficit_bn ?? 50).toString())
      ?.replace('{deadlineMonths}', String((threatDeadlineTurn ?? (turn + 3)) - turn))
      ?.replace('{deadlineTurn}', String(threatDeadlineTurn ?? (turn + 3))),
    consequenceWarning: selectedTemplate.consequenceWarning,
    threatTargetDeficit_bn,
    threatDeadlineTurn,
    threatBaselineDeficit_bn,
    read: false,
    timestamp: Date.now()
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

  // CRITICAL FIX: Add time-based patience decay (honeymoon fading)
  // PM patience naturally decreases over time - must actively maintain it
  // After first 12 months, patience decays by 0.5 per month unless performing well
  if (metadata.currentTurn > 12 && political.pmTrust < 65) {
    patienceChange -= 0.5; // Natural decay of goodwill
  }

  // CRITICAL FIX: Harsher penalties for mediocre performance
  // PM Trust impacts patience most
  if (political.pmTrust < 20) {
    patienceChange -= 8; // Crisis level
    updates.consecutivePoorPerformance = (pmRelationship.consecutivePoorPerformance || 0) + 1;
  } else if (political.pmTrust < 30) {
    patienceChange -= 5; // Very poor
    updates.consecutivePoorPerformance = (pmRelationship.consecutivePoorPerformance || 0) + 1;
  } else if (political.pmTrust < 45) {
    patienceChange -= 2; // Mediocre performance also drains patience
    updates.consecutivePoorPerformance = (pmRelationship.consecutivePoorPerformance || 0) + 1;
  } else if (political.pmTrust > 75) {
    patienceChange += 4; // Excellent performance
    updates.consecutivePoorPerformance = 0;
  } else if (political.pmTrust > 60) {
    patienceChange += 2; // Good performance
    updates.consecutivePoorPerformance = 0;
  } else {
    updates.consecutivePoorPerformance = 0;
  }

  // Government approval matters (electoral prospects)
  if (political.governmentApproval < 20) {
    patienceChange -= 5; // Electoral disaster
  } else if (political.governmentApproval < 30) {
    patienceChange -= 3; // Very concerning
  } else if (political.governmentApproval < 38) {
    patienceChange -= 1; // Below acceptable
  } else if (political.governmentApproval > 50) {
    patienceChange += 2;
  }

  // Fiscal responsibility (fiscal rules matter to PM credibility)
  if (fiscal.deficit_bn > 100) {
    patienceChange -= 4; // Completely out of control
  } else if (fiscal.deficit_bn > 80) {
    patienceChange -= 2; // Very concerning
  } else if (fiscal.deficit_bn < 30) {
    patienceChange += 1;
  }

  // CRITICAL FIX: Manifesto violations damage PM-Chancellor relationship
  // PM is judged by manifesto adherence - violations hurt them too
  const manifestoViolations = gameState.manifesto.totalViolations;
  if (manifestoViolations >= 3) {
    patienceChange -= 2; // Multiple broken promises
  } else if (manifestoViolations >= 1) {
    patienceChange -= 1; // Some broken promises
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
  const targetMatch = demand.description.match(/below £?(\d+(?:\.\d+)?)bn/i);
  const parsedTarget = targetMatch ? Number(targetMatch[1]) : 50;
  if (demand.category === 'deficit' && gameState.fiscal.deficit_bn <= parsedTarget) {
    return true;
  }

  // Add more demand checking logic as needed
  return false;
}
