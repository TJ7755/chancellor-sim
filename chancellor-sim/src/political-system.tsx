import React, { useState, useEffect } from 'react';

/**
 * UK CHANCELLOR SIMULATION - POLITICAL SYSTEM
 *
 * Comprehensive political simulation layer modelling:
 * - 200 individual backbench MPs with ideological positions
 * - PM trust dynamics and intervention events
 * - Regional opinion polling (England/Scotland/Wales/NI)
 * - Backbench revolts and rebellion risks
 * - Public approval with realistic honeymoon decay
 *
 * British English throughout.
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Individual backbencher MP
 * No names needed - just positions and constituency factors
 */
export interface BackbencherMP {
  id: number;

  // Ideology spectrum: -2.0 (hard left) to +2.0 (right/Blairite)
  ideologyPosition: number;

  // Constituency safety: 0 (ultra-marginal) to 100 (ultra-safe)
  constituencyMarginality: number;

  // Priority weighting: 0 (pure ideology) to 1 (pure constituency survival)
  constituencyPriorityWeight: number;

  // Current loyalty level: 0 (ready to rebel) to 100 (fully loyal)
  currentLoyalty: number;

  // Tracking rebellion history
  monthsSinceLastRebellion: number;

  // Regional location for polling effects
  region: 'england' | 'scotland' | 'wales' | 'ni';
}

/**
 * Aggregated backbench sentiment
 * Calculated from individual MPs each month
 */
export interface BackbenchSentiment {
  // Overall mood across all backbenchers
  overallMood: number; // 0-100

  // Factional breakdowns
  leftWingSentiment: number; // 0-100
  centristSentiment: number; // 0-100
  rightWingSentiment: number; // 0-100

  // Rebellion risk counts
  mpsReadyToRebel: number; // loyalty < 30
  mpsUneasy: number; // loyalty 30-60
  mpsLoyal: number; // loyalty > 60

  // Risk assessment
  rebellionRisk: 'none' | 'low' | 'moderate' | 'high' | 'critical';
  worstFaction: 'left' | 'centre' | 'right' | 'all';
}

/**
 * Prime Minister intervention event
 * Triggers when PM trust low and player proposes unpopular policy
 */
export interface PMInterventionEvent {
  id: string;
  triggered: boolean;

  // Why the PM is calling
  triggerReason: 'backbench_revolt' | 'manifesto_breach' | 'economic_crisis' | 'approval_collapse';

  // PM state at time of intervention
  pmTrust: number; // 0-100
  pmAnger: 'concerned' | 'angry' | 'furious';

  // The PM's demand
  demandTitle: string;
  demandDescription: string;
  complyPolicyDescription?: string;

  // Specific policy to reverse (optional)
  specificPolicyReversal?: {
    taxId?: string;
    spendingId?: string;
    revertToValue: number;
  };

  // Player choice
  playerChoice?: 'comply' | 'defy';

  // Consequences of compliance
  consequencesIfComply: {
    pmTrustChange: number;
    backbenchSentimentChange: number;
    publicApprovalChange: number;
  };

  // Consequences of defiance
  consequencesIfDefy: {
    pmTrustChange: number;
    backbenchSentimentChange: number;
    reshuffleRisk: number; // 0-100 probability
  };
}

/**
 * Reshuffle/sacking event
 * Game over scenario if PM trust collapses completely
 */
export interface ReshuffleEvent {
  triggered: boolean;
  outcome: 'survived' | 'sacked' | 'leadership_challenge';
  narrative: string;
}

/**
 * Opinion polling data
 * National and regional breakdowns
 */
export interface PollingData {
  // National aggregate
  nationalApproval: number; // 0-100

  // Regional breakdowns
  englandApproval: number;
  scotlandApproval: number;
  walesApproval: number;
  northernIrelandApproval: number;

  // Trend tracking
  monthlyChange: number;
  trendDirection: 'rising' | 'stable' | 'falling';

  // Special periods
  honeymoonDecayActive: boolean; // First 12 months
  postBudgetBounce: number; // Temporary +/- after budget
}

/**
 * Factors affecting public opinion
 */
export interface PublicOpinionFactors {
  economicPerformance: number; // -10 to +10
  serviceQuality: number; // -10 to +10
  manifestoBreaches: number; // -15 to 0
  mediaScrutiny: number; // -5 to +5
  randomEvents: number; // -3 to +3
}

/**
 * Political event log entry
 */
export interface PoliticalEvent {
  month: number;
  date: Date;
  type: 'rebellion' | 'pm_intervention' | 'manifesto_breach' | 'approval_change' | 'reshuffle';
  title: string;
  description: string;
  severity: 'minor' | 'major' | 'critical';
}

/**
 * Main political state structure
 */
export interface PoliticalState {
  // MP modelling
  backbenchers: BackbencherMP[];
  backbenchSentiment: BackbenchSentiment;

  // PM relationship
  pmTrust: number; // 0-100
  pmTrustHistory: number[]; // Last 24 months
  pmInterventionsPending: PMInterventionEvent[];
  reshuffleEvent?: ReshuffleEvent;

  // Public opinion
  polling: PollingData;
  opinionFactors: PublicOpinionFactors;

  // Manifesto tracking
  manifestoBreaches: {
    taxLocks: number;
    spendingPledges: number;
    fiscalRules: number;
  };

  // Events log
  significantEvents: PoliticalEvent[];
}

/**
 * Simplified economic state interface
 * (For type safety when integrating with economic engine)
 */
interface EconomicState {
  gdpGrowthAnnual: number;
  cpi: number;
  unemploymentRate: number;
}

/**
 * Simplified fiscal state interface
 */
interface FiscalState {
  totalSpending: number;
  deficit: number;
  debtToGdp: number;
  incomeTaxBasicRate: number;
  vatRate: number;
  niEmployeeRate: number;
}

/**
 * Simplified services state interface
 */
interface ServicesState {
  nhsQuality: number;
  educationQuality: number;
  infrastructureQuality: number;
}

/**
 * Simplified markets state interface
 */
interface MarketState {
  giltYield10yr: number;
}

/**
 * Simulation state interface for political integration
 */
export interface SimulationState {
  currentMonth: number;
  currentDate: Date;
  economy: EconomicState;
  fiscal: FiscalState;
  services: ServicesState;
  markets: MarketState;
  political: PoliticalState;
  paused?: boolean;
  pauseReason?: 'pm_intervention' | 'reshuffle_outcome';
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Baseline spending for comparison (£bn)
 */
const BASELINE_SPENDING = 1189;

/**
 * Baseline tax rates for manifesto breach detection
 */
const BASELINE_TAX_RATES = {
  incomeTaxBasicRate: 20,
  vatRate: 20,
  niEmployeeRate: 8,
};

// ===============================================================================
// INITIAL STATE GENERATION
// ============================================================================

/**
 * Generate initial political state
 * Post-2024 election honeymoon scenario
 */
export function generateInitialPoliticalState(): PoliticalState {
  const backbenchers: BackbencherMP[] = [];

  // Generate 200 backbench MPs
  for (let i = 0; i < 200; i++) {
    // Ideology distribution:
    // - 20% left wing (-1.5 to -0.7)
    // - 50% centrist (-0.3 to +0.3)
    // - 30% right/Blairite (+0.5 to +1.2)
    const roll = Math.random();
    let ideologyPosition: number;

    if (roll < 0.20) {
      // Left wing (Corbynites and left)
      ideologyPosition = -1.5 + Math.random() * 0.8;
    } else if (roll < 0.70) {
      // Centrist mainstream
      ideologyPosition = -0.3 + Math.random() * 0.6;
    } else {
      // Right wing / Blairite
      ideologyPosition = 0.5 + Math.random() * 0.7;
    }

    // Constituency marginality: 70% safe, 30% marginal
    const isMarginal = Math.random() < 0.30;
    const constituencyMarginality = isMarginal
      ? 20 + Math.random() * 30 // Marginal: 20-50
      : 60 + Math.random() * 40; // Safe: 60-100

    // Priority weighting: marginal MPs care more about constituency
    const constituencyPriorityWeight = isMarginal
      ? 0.6 + Math.random() * 0.3 // 0.6-0.9 for marginal
      : 0.2 + Math.random() * 0.4; // 0.2-0.6 for safe

    // Regional distribution (roughly proportional to UK population)
    const regionRoll = Math.random();
    let region: BackbencherMP['region'];
    if (regionRoll < 0.84) region = 'england';
    else if (regionRoll < 0.89) region = 'scotland';
    else if (regionRoll < 0.94) region = 'wales';
    else region = 'ni';

    backbenchers.push({
      id: i,
      ideologyPosition,
      constituencyMarginality,
      constituencyPriorityWeight,
      currentLoyalty: 85, // Post-election high
      monthsSinceLastRebellion: 999,
      region,
    });
  }

  // Calculate initial sentiment
  const initialSentiment = calculateBackbenchSentiment(backbenchers);

  return {
    backbenchers,
    backbenchSentiment: initialSentiment,
    pmTrust: 75,
    pmTrustHistory: [75],
    pmInterventionsPending: [],
    polling: {
      nationalApproval: 45,
      englandApproval: 46,
      scotlandApproval: 38,
      walesApproval: 44,
      northernIrelandApproval: 42,
      monthlyChange: 0,
      trendDirection: 'stable',
      honeymoonDecayActive: true,
      postBudgetBounce: 0,
    },
    opinionFactors: {
      economicPerformance: 0,
      serviceQuality: 0,
      manifestoBreaches: 0,
      mediaScrutiny: 0,
      randomEvents: 0,
    },
    manifestoBreaches: {
      taxLocks: 0,
      spendingPledges: 0,
      fiscalRules: 0,
    },
    significantEvents: [],
  };
}

// ===================================================================== =======
// CORE CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate aggregate backbench sentiment from individual MPs
 */
function calculateBackbenchSentiment(backbenchers: BackbencherMP[]): BackbenchSentiment {
  // Sort MPs into factions by ideology
  const leftWing = backbenchers.filter((mp) => mp.ideologyPosition < -0.5);
  const centrists = backbenchers.filter(
    (mp) => mp.ideologyPosition >= -0.5 && mp.ideologyPosition <= 0.5
  );
  const rightWing = backbenchers.filter((mp) => mp.ideologyPosition > 0.5);

  // Calculate factional sentiments (average loyalty)
  const leftWingSentiment = calculateAverageLoyalty(leftWing);
  const centristSentiment = calculateAverageLoyalty(centrists);
  const rightWingSentiment = calculateAverageLoyalty(rightWing);

  // Overall mood (weighted by faction size)
  const overallMood =
    (leftWingSentiment * leftWing.length +
      centristSentiment * centrists.length +
      rightWingSentiment * rightWing.length) /
    backbenchers.length;

  // Count rebellion risks
  const mpsReadyToRebel = backbenchers.filter((mp) => mp.currentLoyalty < 30).length;
  const mpsUneasy = backbenchers.filter(
    (mp) => mp.currentLoyalty >= 30 && mp.currentLoyalty < 60
  ).length;
  const mpsLoyal = backbenchers.filter((mp) => mp.currentLoyalty >= 60).length;

  // Determine rebellion risk level
  let rebellionRisk: BackbenchSentiment['rebellionRisk'] = 'none';
  if (mpsReadyToRebel > 50) rebellionRisk = 'critical';
  else if (mpsReadyToRebel > 30) rebellionRisk = 'high';
  else if (mpsReadyToRebel > 15) rebellionRisk = 'moderate';
  else if (mpsReadyToRebel > 5) rebellionRisk = 'low';

  // Identify worst faction
  const factionSentiments = [
    { faction: 'left' as const, sentiment: leftWingSentiment },
    { faction: 'centre' as const, sentiment: centristSentiment },
    { faction: 'right' as const, sentiment: rightWingSentiment },
  ];
  const worstFaction =
    overallMood < 40
      ? ('all' as const)
      : factionSentiments.sort((a, b) => a.sentiment - b.sentiment)[0].faction;

  return {
    overallMood,
    leftWingSentiment,
    centristSentiment,
    rightWingSentiment,
    mpsReadyToRebel,
    mpsUneasy,
    mpsLoyal,
    rebellionRisk,
    worstFaction,
  };
}

/**
 * Calculate average loyalty across a group of MPs
 */
function calculateAverageLoyalty(mps: BackbencherMP[]): number {
  if (mps.length === 0) return 60; // Default baseline
  return mps.reduce((sum, mp) => sum + mp.currentLoyalty, 0) / mps.length;
}

/**
 * Get regional polling value for a specific region
 */
function getRegionalPolling(state: SimulationState, region: BackbencherMP['region']): number {
  switch (region) {
    case 'england':
      return state.political.polling.englandApproval;
    case 'scotland':
      return state.political.polling.scotlandApproval;
    case 'wales':
      return state.political.polling.walesApproval;
    case 'ni':
      return state.political.polling.northernIrelandApproval;
  }
}

/**
 * Calculate ideological fit between MP and current fiscal policy
 * Returns: -10 to +10 (negative = policy contradicts MP ideology)
 */
function calculateIdeologicalFit(mp: BackbencherMP, state: SimulationState): number {
  let fit = 0;

  // Spending changes from baseline
  const spendingChange = state.fiscal.totalSpending - BASELINE_SPENDING;

  if (mp.ideologyPosition < -0.5) {
    // Left-wing MP: likes spending increases, hates cuts
    fit += spendingChange * 0.05;
  } else if (mp.ideologyPosition > 0.5) {
    // Right-wing MP: likes spending restraint, dislikes increases
    fit -= spendingChange * 0.03;
  }

  // Tax changes (manifesto-breaking tax rises anger ALL MPs)
  const taxIncreases =
    Math.max(0, state.fiscal.incomeTaxBasicRate - BASELINE_TAX_RATES.incomeTaxBasicRate) +
    Math.max(0, state.fiscal.vatRate - BASELINE_TAX_RATES.vatRate) +
    Math.max(0, state.fiscal.niEmployeeRate - BASELINE_TAX_RATES.niEmployeeRate);

  if (taxIncreases > 0) {
    fit -= taxIncreases * 2; // All MPs hate manifesto-breaking tax rises
  }

  // Debt crisis (right-wing MPs especially hate high debt)
  if (state.fiscal.debtToGdp > 100 && mp.ideologyPosition > 0.5) {
    fit -= (state.fiscal.debtToGdp - 100) * 0.2;
  }

  return Math.max(-10, Math.min(10, fit));
}

/**
 * Update loyalty for each MP based on multiple factors
 */
function updateBackbencherLoyalty(
  mp: BackbencherMP,
  state: SimulationState
): BackbencherMP {
  let loyaltyChange = 0;

  // 1. Ideological fit with fiscal policy
  const ideologicalEffect = calculateIdeologicalFit(mp, state);
  loyaltyChange += ideologicalEffect * (1 - mp.constituencyPriorityWeight);

  // 2. Constituency polling effect
  const constituencyPolling = getRegionalPolling(state, mp.region);
  const constituencyEffect = (constituencyPolling - 40) * 0.1; // -4 to +6
  const marginPenalty = (100 - mp.constituencyMarginality) / 20; // 0 to 5x multiplier
  loyaltyChange +=
    constituencyEffect * marginPenalty * mp.constituencyPriorityWeight;

  // 3. Manifesto breach penalty
  const totalBreaches =
    state.political.manifestoBreaches.taxLocks +
    state.political.manifestoBreaches.spendingPledges +
    state.political.manifestoBreaches.fiscalRules;
  loyaltyChange -= totalBreaches * 2;

  // 4. Economic crisis penalty (all MPs hate recession)
  if (state.economy.gdpGrowthAnnual < 0) {
    loyaltyChange -= Math.abs(state.economy.gdpGrowthAnnual) * 2;
  }
  if (state.economy.unemploymentRate > 7.0) {
    loyaltyChange -= (state.economy.unemploymentRate - 7.0) * 3;
  }

  // 5. Natural drift back to baseline (60) over time
  const driftToBaseline = (60 - mp.currentLoyalty) * 0.05;
  loyaltyChange += driftToBaseline;

  // Apply change with bounds
  const newLoyalty = Math.max(0, Math.min(100, mp.currentLoyalty + loyaltyChange));

  return {
    ...mp,
    currentLoyalty: newLoyalty,
    monthsSinceLastRebellion: mp.currentLoyalty < 30 ? 0 : mp.monthsSinceLastRebellion + 1,
  };
}

/**
 * Calculate opinion factors from economic/fiscal/services state
 */
function calculateOpinionFactors(state: SimulationState): PublicOpinionFactors {
  // Economic performance effect (-10 to +10)
  let economicPerformance = 0;
  economicPerformance += state.economy.gdpGrowthAnnual * 1.5; // Growth matters
  economicPerformance -= Math.max(0, state.economy.unemploymentRate - 5.0) * 2; // Unemployment hurts
  economicPerformance -= Math.max(0, state.economy.cpi - 3.0) * 1.5; // High inflation hurts
  economicPerformance = Math.max(-10, Math.min(10, economicPerformance / 3));

  // Service quality effect (-10 to +10)
  const avgServiceQuality =
    (state.services.nhsQuality * 2 + // NHS weighted double
      state.services.educationQuality +
      state.services.infrastructureQuality) /
    4;
  let serviceQuality = (avgServiceQuality - 65) * 0.15;
  serviceQuality = Math.max(-10, Math.min(10, serviceQuality));

  // Manifesto breaches (-15 to 0)
  const totalBreaches =
    state.political.manifestoBreaches.taxLocks +
    state.political.manifestoBreaches.spendingPledges +
    state.political.manifestoBreaches.fiscalRules;
  const manifestoBreaches = Math.max(-15, -totalBreaches * 3);

  // Media scrutiny (random -5 to +5, generally negative)
  const mediaScrutiny = (Math.random() - 0.6) * 10;

  // Random events (-3 to +3)
  const randomEvents = (Math.random() - 0.5) * 6;

  return {
    economicPerformance,
    serviceQuality,
    manifestoBreaches,
    mediaScrutiny,
    randomEvents,
  };
}

/**
 * Calculate public approval with regional variations
 */
function calculatePublicApproval(state: SimulationState): PollingData {
  const prevPolling = state.political.polling;

  // Calculate national factors
  const factors = calculateOpinionFactors(state);
  const totalEffect = Object.values(factors).reduce((sum, val) => sum + val, 0);

  // Apply honeymoon decay (first 12 months: gradual decline from 45% to 38%)
  let honeymoonAdjustment = 0;
  if (state.currentMonth < 12) {
    honeymoonAdjustment = -0.6; // -7pp over 12 months = -0.6pp/month
  }

  // Calculate new national approval
  const nationalChange = totalEffect + honeymoonAdjustment + factors.randomEvents;
  const newNationalApproval = Math.max(
    15,
    Math.min(70, prevPolling.nationalApproval + nationalChange)
  );

  // Regional variations
  const englandApproval = Math.max(
    15,
    Math.min(70, newNationalApproval + (Math.random() - 0.5) * 2)
  ); // Close to national
  const scotlandApproval = Math.max(
    15,
    Math.min(70, newNationalApproval - 8 + (Math.random() - 0.5) * 3)
  ); // Labour weaker in Scotland
  const walesApproval = Math.max(
    15,
    Math.min(70, newNationalApproval - 2 + (Math.random() - 0.5) * 2)
  ); // Slightly lower
  const northernIrelandApproval = Math.max(
    15,
    Math.min(70, 40 + (Math.random() - 0.5) * 5)
  ); // Separate dynamics

  // Trend direction
  let trendDirection: PollingData['trendDirection'] = 'stable';
  if (nationalChange > 0.5) trendDirection = 'rising';
  else if (nationalChange < -0.5) trendDirection = 'falling';

  return {
    nationalApproval: newNationalApproval,
    englandApproval,
    scotlandApproval,
    walesApproval,
    northernIrelandApproval,
    monthlyChange: nationalChange,
    trendDirection,
    honeymoonDecayActive: state.currentMonth < 12,
    postBudgetBounce: prevPolling.postBudgetBounce * 0.5, // Decays by half each month
  };
}

/**
 * Calculate PM trust level (0-100)
 */
function calculatePMTrust(state: SimulationState): number {
  let trustChange = 0;

  // 1. Backbench sentiment effect (-5 to +5 per month)
  const backbenchEffect =
    (state.political.backbenchSentiment.overallMood - 60) * 0.08;
  trustChange += backbenchEffect;

  // 2. Public approval effect (-3 to +3 per month)
  const approvalEffect = (state.political.polling.nationalApproval - 40) * 0.05;
  trustChange += approvalEffect;

  // 3. Economic crisis penalty
  if (state.economy.unemploymentRate > 8.0) trustChange -= 2;
  if (state.fiscal.debtToGdp > 110) trustChange -= 2;
  if (state.markets.giltYield10yr > 6.0) trustChange -= 2;

  // 4. Service quality penalty (NHS cuts especially damaging)
  if (state.services.nhsQuality < 60) trustChange -= 1;

  // Apply change with bounds
  return Math.max(0, Math.min(100, state.political.pmTrust + trustChange));
}

/**
 * Create a PM intervention event
 */
function createPMIntervention(
  state: SimulationState,
  reason: PMInterventionEvent['triggerReason'],
  anger: PMInterventionEvent['pmAnger']
): PMInterventionEvent {
  let demandTitle = '';
  let demandDescription = '';

  switch (reason) {
    case 'backbench_revolt':
      demandTitle = 'Backbench Rebellion Brewing';
      demandDescription =
        'The backbenches are in open revolt. You need to change course immediately or this government will collapse. I cannot protect you if you continue down this path.';
      break;
    case 'manifesto_breach':
      demandTitle = 'Manifesto Commitment Broken';
      demandDescription =
        'We made clear promises to the electorate. Breaking them destroys trust in this government and makes us all look like liars. This policy cannot stand.';
      break;
    case 'approval_collapse':
      demandTitle = 'Public Confidence Collapsing';
      demandDescription =
        'The polling is catastrophic. We are heading for electoral annihilation if we do not change direction. The party will not tolerate being led into the wilderness.';
      break;
    case 'economic_crisis':
      demandTitle = 'Economic Crisis Deepening';
      demandDescription =
        'The economic situation is spiralling out of control. The markets are losing confidence. We need to demonstrate fiscal responsibility before it is too late.';
      break;
  }

  return {
    id: `intervention_${Date.now()}`,
    triggered: true,
    triggerReason: reason,
    pmTrust: state.political.pmTrust,
    pmAnger: anger,
    demandTitle,
    demandDescription,
    consequencesIfComply: {
      pmTrustChange: 10,
      backbenchSentimentChange: 15,
      publicApprovalChange: 2,
    },
    consequencesIfDefy: {
      pmTrustChange: -15,
      backbenchSentimentChange: -10,
      reshuffleRisk: state.political.pmTrust < 30 ? 60 : 30,
    },
  };
}

/**
 * Check if PM intervention should trigger
 */
function checkPMInterventionTrigger(
  state: SimulationState
): PMInterventionEvent | null {
  const { pmTrust, backbenchSentiment, manifestoBreaches, polling } =
    state.political;

  // PM only intervenes if trust is low
  if (pmTrust > 40) return null;

  // Don't trigger multiple interventions
  if (state.political.pmInterventionsPending.length > 0) return null;

  // Trigger conditions (in priority order)

  // 1. Major backbench rebellion brewing
  if (backbenchSentiment.mpsReadyToRebel > 30) {
    return createPMIntervention(state, 'backbench_revolt', 'furious');
  }

  // 2. Major manifesto breach (check if new breach in recent history)
  const totalBreaches =
    manifestoBreaches.taxLocks +
    manifestoBreaches.spendingPledges +
    manifestoBreaches.fiscalRules;
  if (totalBreaches > 0 && state.currentMonth > 0) {
    // Would ideally check if breach is "new" - simplified here
    const shouldTrigger = Math.random() < 0.3; // 30% chance per month if breaches exist
    if (shouldTrigger) {
      return createPMIntervention(state, 'manifesto_breach', 'angry');
    }
  }

  // 3. Approval collapse
  if (polling.nationalApproval < 30 && polling.trendDirection === 'falling') {
    return createPMIntervention(state, 'approval_collapse', 'concerned');
  }

  // 4. Economic crisis
  if (state.economy.unemploymentRate > 8.0 || state.fiscal.debtToGdp > 110) {
    return createPMIntervention(state, 'economic_crisis', 'concerned');
  }

  return null;
}

/**
 * Main political processing function
 * Called each month after economic calculations
 */
export function processPolitics(state: SimulationState): SimulationState {
  let newState = { ...state };

  // 1. Update individual MP loyalty levels
  newState.political = {
    ...newState.political,
    backbenchers: newState.political.backbenchers.map((mp) =>
      updateBackbencherLoyalty(mp, newState)
    ),
  };

  // 2. Calculate backbench sentiment from updated MPs
  newState.political = {
    ...newState.political,
    backbenchSentiment: calculateBackbenchSentiment(
      newState.political.backbenchers
    ),
  };

  // 3. Calculate public opinion changes
  const newPolling = calculatePublicApproval(newState);
  newState.political = {
    ...newState.political,
    polling: newPolling,
    opinionFactors: calculateOpinionFactors(newState),
  };

  // 4. Update PM trust
  newState.political = {
    ...newState.political,
    pmTrust: calculatePMTrust(newState),
  };

  // 5. Check for PM intervention triggers
  const interventionEvent = checkPMInterventionTrigger(newState);
  if (interventionEvent) {
    newState.political.pmInterventionsPending = [
      ...newState.political.pmInterventionsPending,
      interventionEvent,
    ];
    newState.paused = true;
    newState.pauseReason = 'pm_intervention';
  }

  // 6. Check for reshuffle/sacking
  if (newState.political.pmTrust < 15 && !newState.political.reshuffleEvent) {
    newState.political.reshuffleEvent = {
      triggered: true,
      outcome: 'sacked',
      narrative:
        'The Prime Minister has lost all confidence in your ability to manage the economy. You have been removed from office. The government has fallen.',
    };
    newState.paused = true;
    newState.pauseReason = 'reshuffle_outcome';
  }

  // 7. Add to PM trust history
  newState.political.pmTrustHistory = [
    ...newState.political.pmTrustHistory,
    newState.political.pmTrust,
  ].slice(-24);

  return newState;
}

// ============================================================================
// PM INTERVENTION MODAL COMPONENT
// ============================================================================

interface PMInterventionModalProps {
  event: PMInterventionEvent;
  onComply: () => void;
  onDefy: () => void;
}

/**
 * PM Phone Call Dialogue Modal
 * Pauses game and forces player choice
 */
export const PMInterventionModal: React.FC<PMInterventionModalProps> = ({
  event,
  onComply,
  onDefy,
}) => {
  const getTrustColour = (trust: number): string => {
    if (trust > 50) return 'text-green-600';
    if (trust > 30) return 'text-orange-600';
    return 'text-red-600';
  };

  const getTrustBgColour = (trust: number): string => {
    if (trust > 50) return 'bg-green-600';
    if (trust > 30) return 'bg-orange-600';
    return 'bg-red-600';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full p-8">
        {/* Phone Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center animate-pulse">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-2">
          The Prime Minister is calling...
        </h2>
        <p className="text-center text-gray-600 mb-6 text-lg">
          {event.pmAnger === 'furious' &&
            'The PM is furious about recent policy decisions'}
          {event.pmAnger === 'angry' &&
            'The PM is not pleased with the current situation'}
          {event.pmAnger === 'concerned' &&
            'The PM has concerns about the direction of policy'}
        </p>

        {/* PM Trust Indicator */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              PM Trust Level
            </span>
            <span className={`font-bold text-lg ${getTrustColour(event.pmTrust)}`}>
              {Math.round(event.pmTrust)}/100
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full ${getTrustBgColour(event.pmTrust)}`}
              style={{ width: `${event.pmTrust}%` }}
            />
          </div>
        </div>

        {/* PM's Demand */}
        <div className="mb-6 p-6 border-2 border-red-300 bg-red-50 rounded-lg">
          <h3 className="font-bold text-red-900 mb-3 text-xl">
            {event.demandTitle}
          </h3>
          <p className="text-red-800 leading-relaxed">{event.demandDescription}</p>
          {event.complyPolicyDescription && (
            <p className="text-sm text-red-900 mt-3 font-semibold">
              {event.complyPolicyDescription}
            </p>
          )}
        </div>

        {/* Choice Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Comply */}
          <button
            onClick={onComply}
            className="p-5 border-2 border-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-all transform hover:scale-105"
          >
            <div className="font-bold text-green-900 mb-3 text-lg">
              COMPLY WITH PM
            </div>
            <div className="text-sm text-green-800 space-y-1 text-left">
              <div>• PM Trust: +{event.consequencesIfComply.pmTrustChange}</div>
              <div>
                • Backbenchers: +
                {event.consequencesIfComply.backbenchSentimentChange}
              </div>
              <div>
                • Public Approval: +{event.consequencesIfComply.publicApprovalChange}
                pp
              </div>
            </div>
          </button>

          {/* Defy */}
          <button
            onClick={onDefy}
            className="p-5 border-2 border-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-all transform hover:scale-105"
          >
            <div className="font-bold text-red-900 mb-3 text-lg">DEFY PM</div>
            <div className="text-sm text-red-800 space-y-1 text-left">
              <div>• PM Trust: {event.consequencesIfDefy.pmTrustChange}</div>
              <div>
                • Backbenchers: {event.consequencesIfDefy.backbenchSentimentChange}
              </div>
              <div>• Reshuffle risk: {event.consequencesIfDefy.reshuffleRisk}%</div>
            </div>
          </button>
        </div>

        {/* Warning */}
        <div className="text-xs text-center text-gray-500 italic">
          This choice will have permanent consequences
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// POLITICAL PANEL COMPONENT
// ============================================================================

interface PoliticalPanelProps {
  state: SimulationState;
}

/**
 * Political metrics panel for dashboard
 */
export const PoliticalPanel: React.FC<PoliticalPanelProps> = ({ state }) => {
  const { political } = state;

  const getStatusColour = (value: number, thresholds: [number, number]) => {
    if (value > thresholds[0]) return 'text-green-600';
    if (value > thresholds[1]) return 'text-orange-600';
    return 'text-red-600';
  };

  const getRiskColour = (risk: BackbenchSentiment['rebellionRisk']) => {
    switch (risk) {
      case 'none':
        return 'bg-green-100 border-green-300 text-green-900';
      case 'low':
        return 'bg-yellow-100 border-yellow-300 text-yellow-900';
      case 'moderate':
        return 'bg-orange-100 border-orange-300 text-orange-900';
      case 'high':
        return 'bg-red-100 border-red-300 text-red-900';
      case 'critical':
        return 'bg-red-200 border-red-400 text-red-950';
    }
  };

  const getTrendArrow = (direction: PollingData['trendDirection']) => {
    switch (direction) {
      case 'rising':
        return '↗';
      case 'falling':
        return '↘';
      case 'stable':
        return '→';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">
        Political Capital
      </h2>

      {/* Key Metrics */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {/* PM Trust */}
        <div className="bg-gray-50 rounded p-3">
          <div className="text-xs text-gray-600 mb-1">PM Trust</div>
          <div
            className={`text-2xl font-bold ${getStatusColour(political.pmTrust, [50, 35])}`}
          >
            {Math.round(political.pmTrust)}
          </div>
          {political.pmTrust < 40 && (
            <div className="text-xs text-red-600 mt-1">At risk</div>
          )}
        </div>

        {/* Public Approval */}
        <div className="bg-gray-50 rounded p-3">
          <div className="text-xs text-gray-600 mb-1">Public Approval</div>
          <div
            className={`text-2xl font-bold ${getStatusColour(political.polling.nationalApproval, [45, 35])}`}
          >
            {Math.round(political.polling.nationalApproval)}%
          </div>
          <div className="text-xs text-gray-600 mt-1">
            {getTrendArrow(political.polling.trendDirection)}{' '}
            {political.polling.trendDirection}
          </div>
        </div>

        {/* Backbench Mood */}
        <div className="bg-gray-50 rounded p-3">
          <div className="text-xs text-gray-600 mb-1">Backbench Mood</div>
          <div
            className={`text-2xl font-bold ${getStatusColour(political.backbenchSentiment.overallMood, [60, 40])}`}
          >
            {Math.round(political.backbenchSentiment.overallMood)}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            {political.backbenchSentiment.mpsReadyToRebel} ready to rebel
          </div>
        </div>
      </div>

      {/* Rebellion Warning */}
      {political.backbenchSentiment.rebellionRisk !== 'none' && (
        <div
          className={`p-3 rounded-lg mb-4 border-2 ${getRiskColour(political.backbenchSentiment.rebellionRisk)}`}
        >
          <div className="font-semibold text-sm">
            ⚠ Rebellion Risk:{' '}
            {political.backbenchSentiment.rebellionRisk.toUpperCase()}
          </div>
          <div className="text-xs mt-1">
            {political.backbenchSentiment.mpsReadyToRebel} MPs ready to rebel •
            Worst faction: {political.backbenchSentiment.worstFaction}
          </div>
        </div>
      )}

      {/* Regional Polling */}
      <div className="border-t pt-4">
        <div className="text-sm font-semibold text-gray-700 mb-2">
          Regional Polling
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-600">England:</span>
            <span className="font-semibold">
              {political.polling.englandApproval.toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Scotland:</span>
            <span className="font-semibold">
              {political.polling.scotlandApproval.toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Wales:</span>
            <span className="font-semibold">
              {political.polling.walesApproval.toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">N. Ireland:</span>
            <span className="font-semibold">
              {political.polling.northernIrelandApproval.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Honeymoon indicator */}
      {political.polling.honeymoonDecayActive && (
        <div className="mt-4 text-xs text-gray-500 italic">
          Honeymoon period active (decays until month 12)
        </div>
      )}
    </div>
  );
};

// ============================================================================
// DEMO COMPONENT
// ============================================================================

/**
 * Standalone demo component for testing political system
 */
export const PoliticalSystemDemo: React.FC = () => {
  // Mock economic/fiscal/services state for demo
  const mockEconomicState: EconomicState = {
    gdpGrowthAnnual: 0.8,
    cpi: 2.2,
    unemploymentRate: 4.3,
  };

  const mockFiscalState: FiscalState = {
    totalSpending: 1189,
    deficit: 111,
    debtToGdp: 98,
    incomeTaxBasicRate: 20,
    vatRate: 20,
    niEmployeeRate: 8,
  };

  const mockServicesState: ServicesState = {
    nhsQuality: 70,
    educationQuality: 68,
    infrastructureQuality: 65,
  };

  const mockMarketState: MarketState = {
    giltYield10yr: 4.2,
  };

  // Initialize state
  const [state, setState] = useState<SimulationState>({
    currentMonth: 0,
    currentDate: new Date('2024-07-05'),
    economy: mockEconomicState,
    fiscal: mockFiscalState,
    services: mockServicesState,
    markets: mockMarketState,
    political: generateInitialPoliticalState(),
  });

  const [autoAdvance, setAutoAdvance] = useState(false);

  // Auto-advance simulation
  useEffect(() => {
    if (!autoAdvance || state.paused) return;

    const interval = setInterval(() => {
      setState((prev) => {
        const newState = processPolitics({
          ...prev,
          currentMonth: prev.currentMonth + 1,
          currentDate: new Date(prev.currentDate.getTime() + 30 * 24 * 60 * 60 * 1000),
        });
        return newState;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoAdvance, state.paused]);

  // Manual advance
  const handleAdvanceMonth = () => {
    setState((prev) => {
      const newState = processPolitics({
        ...prev,
        currentMonth: prev.currentMonth + 1,
        currentDate: new Date(prev.currentDate.getTime() + 30 * 24 * 60 * 60 * 1000),
      });
      return newState;
    });
  };

  // Handle PM intervention response
  const handlePMResponse = (choice: 'comply' | 'defy') => {
    setState((prev) => {
      const event = prev.political.pmInterventionsPending[0];

      let newState = { ...prev };

      // Apply consequences based on choice
      if (choice === 'comply') {
        const consequences = event.consequencesIfComply;
        newState.political = {
          ...newState.political,
          pmTrust: Math.max(
            0,
            Math.min(100, newState.political.pmTrust + consequences.pmTrustChange)
          ),
          backbenchSentiment: {
            ...newState.political.backbenchSentiment,
            overallMood: Math.max(
              0,
              Math.min(
                100,
                newState.political.backbenchSentiment.overallMood +
                  consequences.backbenchSentimentChange
              )
            ),
          },
          polling: {
            ...newState.political.polling,
            nationalApproval: Math.max(
              15,
              Math.min(
                70,
                newState.political.polling.nationalApproval +
                  consequences.publicApprovalChange
              )
            ),
          },
          pmInterventionsPending: newState.political.pmInterventionsPending.slice(1),
        };
      } else {
        const consequences = event.consequencesIfDefy;
        newState.political = {
          ...newState.political,
          pmTrust: Math.max(
            0,
            Math.min(100, newState.political.pmTrust + consequences.pmTrustChange)
          ),
          backbenchSentiment: {
            ...newState.political.backbenchSentiment,
            overallMood: Math.max(
              0,
              Math.min(
                100,
                newState.political.backbenchSentiment.overallMood +
                  consequences.backbenchSentimentChange
              )
            ),
          },
          pmInterventionsPending: newState.political.pmInterventionsPending.slice(1),
        };
      }

      newState.paused =
        newState.political.pmInterventionsPending.length > 0 ||
        !!newState.political.reshuffleEvent;

      return newState;
    });
  };

  // Simulate tax increase (to test backbench reaction)
  const handleSimulateTaxRise = () => {
    setState((prev) => ({
      ...prev,
      fiscal: {
        ...prev.fiscal,
        incomeTaxBasicRate: 25, // Manifesto-breaking increase
      },
      political: {
        ...prev.political,
        manifestoBreaches: {
          ...prev.political.manifestoBreaches,
          taxLocks: 1,
        },
      },
    }));
  };

  // Simulate NHS cuts (to test severe reaction)
  const handleSimulateNHSCuts = () => {
    setState((prev) => ({
      ...prev,
      services: {
        ...prev.services,
        nhsQuality: 50, // Severe decline
      },
    }));
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Political System Demo
        </h1>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Simulation Controls</h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleAdvanceMonth}
              disabled={state.paused}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              Advance Month
            </button>
            <button
              onClick={() => setAutoAdvance(!autoAdvance)}
              disabled={state.paused}
              className={`px-6 py-2 rounded text-white ${
                autoAdvance ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
              } disabled:bg-gray-400`}
            >
              {autoAdvance ? 'Stop Auto-Advance' : 'Start Auto-Advance'}
            </button>
            <button
              onClick={handleSimulateTaxRise}
              className="px-6 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
            >
              Simulate Tax Rise
            </button>
            <button
              onClick={handleSimulateNHSCuts}
              className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Simulate NHS Cuts
            </button>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            Current Month: {state.currentMonth} (
            {state.currentDate.toLocaleDateString('en-GB', {
              month: 'long',
              year: 'numeric',
            })}
            )
          </div>
        </div>

        {/* Political Panel */}
        <div className="mb-6">
          <PoliticalPanel state={state} />
        </div>

        {/* Detailed Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Backbench Breakdown */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">Backbench Breakdown</h2>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-gray-600">Left Wing</div>
                <div className="text-lg font-semibold">
                  {Math.round(state.political.backbenchSentiment.leftWingSentiment)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Centrist</div>
                <div className="text-lg font-semibold">
                  {Math.round(state.political.backbenchSentiment.centristSentiment)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Right/Blairite</div>
                <div className="text-lg font-semibold">
                  {Math.round(state.political.backbenchSentiment.rightWingSentiment)}
                </div>
              </div>
              <div className="border-t pt-3 mt-3">
                <div className="text-sm text-gray-600">Loyal MPs</div>
                <div className="text-lg font-semibold text-green-600">
                  {state.political.backbenchSentiment.mpsLoyal}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Uneasy MPs</div>
                <div className="text-lg font-semibold text-orange-600">
                  {state.political.backbenchSentiment.mpsUneasy}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Ready to Rebel</div>
                <div className="text-lg font-semibold text-red-600">
                  {state.political.backbenchSentiment.mpsReadyToRebel}
                </div>
              </div>
            </div>
          </div>

          {/* Opinion Factors */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">Opinion Factors</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Economic Performance:</span>
                <span className="font-semibold">
                  {state.political.opinionFactors.economicPerformance > 0 ? '+' : ''}
                  {state.political.opinionFactors.economicPerformance.toFixed(1)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Service Quality:</span>
                <span className="font-semibold">
                  {state.political.opinionFactors.serviceQuality > 0 ? '+' : ''}
                  {state.political.opinionFactors.serviceQuality.toFixed(1)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Manifesto Breaches:</span>
                <span className="font-semibold text-red-600">
                  {state.political.opinionFactors.manifestoBreaches.toFixed(1)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Media Scrutiny:</span>
                <span className="font-semibold">
                  {state.political.opinionFactors.mediaScrutiny > 0 ? '+' : ''}
                  {state.political.opinionFactors.mediaScrutiny.toFixed(1)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* PM Intervention Modal */}
        {state.political.pmInterventionsPending.length > 0 && (
          <PMInterventionModal
            event={state.political.pmInterventionsPending[0]}
            onComply={() => handlePMResponse('comply')}
            onDefy={() => handlePMResponse('defy')}
          />
        )}

        {/* Reshuffle Event */}
        {state.political.reshuffleEvent && (
          <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full p-8">
              <h2 className="text-3xl font-bold text-center text-red-900 mb-4">
                GAME OVER
              </h2>
              <p className="text-gray-800 text-center mb-6">
                {state.political.reshuffleEvent.narrative}
              </p>
              <button
                onClick={() =>
                  setState({
                    ...state,
                    political: generateInitialPoliticalState(),
                    currentMonth: 0,
                    paused: false,
                  })
                }
                className="w-full px-6 py-3 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Restart Simulation
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// EXPORTS
// ============================================================================

export default PoliticalSystemDemo;
