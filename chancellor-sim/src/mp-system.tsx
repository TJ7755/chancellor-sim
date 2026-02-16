// MP System - Individual MP Simulation for Parliamentary Voting
// Handles 650 MPs with lobbying, promise tracking, and voting mechanics

import React, { useState, useMemo } from 'react';
import { BudgetChanges } from './game-state';
import { getInteractionResponse } from './data/mp-interactions';

// ===========================
// Type Definitions
// ===========================

export type PartyAffiliation = 'labour' | 'conservative' | 'liberal_democrat' | 'snp' | 'green' | 'reform_uk' | 'plaid_cymru' | 'dup' | 'sinn_fein' | 'independent';

export type LabourFaction = 'left' | 'soft_left' | 'centre_left' | 'blairite' | 'party_loyalist';

export type PromiseCategory =
  | 'tax_cuts'
  | 'tax_rises_avoid'
  | 'nhs_spending'
  | 'education_spending'
  | 'regional_investment'
  | 'welfare_protection'
  | 'defence_spending'
  | 'green_investment'
  | 'fiscal_discipline';

export type RegionUK =
  | 'london'
  | 'southeast'
  | 'southwest'
  | 'eastengland'
  | 'westmidlands'
  | 'eastmidlands'
  | 'yorkshire'
  | 'northwest'
  | 'northeast'
  | 'wales'
  | 'scotland'
  | 'northernireland';

export type AgeProfile = 'young' | 'mixed' | 'elderly';

export interface IdeologicalPosition {
  economicAxis: number;        // -10 (far left) to +10 (far right)
  socialAxis: number;           // -10 (libertarian) to +10 (authoritarian)
  fiscalConservatism: number;   // 0-10 (0 = MMT/expansive, 10 = austerity hawk)
}

export interface MPTraits {
  rebelliousness: number;       // 0-10 (0 = always loyal, 10 = serial rebel)
  ambition: number;             // 0-10 (affects desire for promotion)
  principled: number;           // 0-10 (how much ideology matters)
  careerist: number;            // 0-10 (how much career advancement matters)
  popularityFocused: number;    // 0-10 (local constituency vs party line)
}

export interface ConstituencyDemographics {
  medianIncome: number;         // £ per year
  unemploymentRate: number;     // Percentage
  publicSectorDependency: number; // Percentage of jobs in public sector
  ageProfile: AgeProfile;
}

export interface Constituency {
  id: string;
  name: string;
  region: RegionUK;
  marginality: number;          // 0-100 (0 = ultra-safe, 100 = knife-edge marginal)
  demographics: ConstituencyDemographics;
  previousMargin: number;       // % vote margin from last election
  swingRequired: number;        // % swing needed to lose seat
}

export interface MPProfile {
  id: string;
  name: string;
  party: PartyAffiliation;
  constituency: Constituency;
  faction?: LabourFaction;
  ideology: IdeologicalPosition;
  traits: MPTraits;
  background: string;
  enteredParliament: number;    // Year
  isMinister: boolean;
  ministerialRole?: string;
  committees: string[];
}

export interface MPPromise {
  id: string;
  promisedToMPs: string[];      // Array of MP IDs
  category: PromiseCategory;
  description: string;
  specificValue?: number;       // e.g., £2bn for NHS spending
  madeInMonth: number;
  fulfilled: boolean;
  broken: boolean;
  brokenInMonth?: number;
}

export interface BudgetVote {
  budgetId: string;
  month: number;
  choice: 'aye' | 'noe' | 'abstain';
  reasoning: string;
  coerced?: boolean;            // True if PM intervention forced vote
}

export interface VotingRecord {
  mpId: string;
  budgetVotes: BudgetVote[];
  rebellionCount: number;
  loyaltyScore: number;         // 0-100
}

export interface MPSystemState {
  allMPs: Map<string, MPProfile>;
  votingRecords: Map<string, VotingRecord>;
  promises: Map<string, MPPromise>;
  lobbyingInProgress: boolean;
  selectedMPForDetail: string | null;
  filterSettings: MPFilterSettings;
  currentBudgetSupport: Map<string, 'support' | 'oppose' | 'undecided'>;
}

export interface MPFilterSettings {
  party?: PartyAffiliation;
  faction?: LabourFaction;
  region?: RegionUK;
  stance?: 'support' | 'oppose' | 'undecided';
  searchQuery?: string;
}

export interface VoteResult {
  ayes: number;
  noes: number;
  abstentions: number;
  governmentMajority: number;
  passed: boolean;
  rebellCount: number;
  oppositionVotes: number;
  narrativeSummary: string;
  keyRebels: string[];
  whipAssessment: string;
  individualVotes: Map<string, 'aye' | 'noe' | 'abstain'>;
}

// ===========================
// MP Generation Utilities
// ===========================

/**
 * Generate ideological position based on party and faction
 */
export function generateIdeology(party: PartyAffiliation, faction?: LabourFaction): IdeologicalPosition {
  let economicAxis = 0;
  let socialAxis = 0;
  let fiscalConservatism = 5;

  switch (party) {
    case 'labour':
      switch (faction) {
        case 'left':
          economicAxis = -7 + Math.random() * 2; // -7 to -5
          socialAxis = -3 + Math.random() * 2;   // -3 to -1
          fiscalConservatism = 2 + Math.random() * 2; // 2-4
          break;
        case 'soft_left':
          economicAxis = -5 + Math.random() * 2; // -5 to -3
          socialAxis = -2 + Math.random() * 2;   // -2 to 0
          fiscalConservatism = 3 + Math.random() * 2; // 3-5
          break;
        case 'centre_left':
          economicAxis = -3 + Math.random() * 2; // -3 to -1
          socialAxis = -1 + Math.random() * 2;   // -1 to 1
          fiscalConservatism = 4 + Math.random() * 2; // 4-6
          break;
        case 'blairite':
          economicAxis = -1 + Math.random() * 2; // -1 to 1
          socialAxis = 0 + Math.random() * 2;    // 0 to 2
          fiscalConservatism = 6 + Math.random() * 2; // 6-8
          break;
        case 'party_loyalist':
          economicAxis = -2 + Math.random() * 2; // -2 to 0
          socialAxis = 0 + Math.random() * 2;    // 0 to 2
          fiscalConservatism = 5 + Math.random() * 2; // 5-7
          break;
      }
      break;
    case 'conservative':
      economicAxis = 4 + Math.random() * 4;      // 4 to 8
      socialAxis = 2 + Math.random() * 4;        // 2 to 6
      fiscalConservatism = 7 + Math.random() * 3; // 7-10
      break;
    case 'liberal_democrat':
      economicAxis = -1 + Math.random() * 2;     // -1 to 1
      socialAxis = -3 + Math.random() * 2;       // -3 to -1
      fiscalConservatism = 6 + Math.random() * 2; // 6-8
      break;
    case 'snp':
      economicAxis = -3 + Math.random() * 2;     // -3 to -1
      socialAxis = -2 + Math.random() * 2;       // -2 to 0
      fiscalConservatism = 4 + Math.random() * 2; // 4-6
      break;
    case 'green':
      economicAxis = -6 + Math.random() * 2;     // -6 to -4
      socialAxis = -4 + Math.random() * 2;       // -4 to -2
      fiscalConservatism = 3 + Math.random() * 2; // 3-5
      break;
    case 'reform_uk':
      economicAxis = 5 + Math.random() * 4;      // 5 to 9 (right-wing populist)
      socialAxis = 5 + Math.random() * 4;        // 5 to 9 (socially conservative)
      fiscalConservatism = 4 + Math.random() * 3; // 4-7 (anti-tax, but also anti-cuts)
      break;
    case 'plaid_cymru':
      economicAxis = -4 + Math.random() * 2;     // -4 to -2 (centre-left)
      socialAxis = -2 + Math.random() * 2;       // -2 to 0
      fiscalConservatism = 4 + Math.random() * 2; // 4-6
      break;
    case 'dup':
      economicAxis = 2 + Math.random() * 3;      // 2 to 5 (centre-right)
      socialAxis = 6 + Math.random() * 3;        // 6 to 9 (socially conservative)
      fiscalConservatism = 5 + Math.random() * 3; // 5-8
      break;
    case 'sinn_fein':
      economicAxis = -5 + Math.random() * 2;     // -5 to -3 (left)
      socialAxis = -1 + Math.random() * 2;       // -1 to 1
      fiscalConservatism = 3 + Math.random() * 2; // 3-5
      break;
    case 'independent':
      economicAxis = -5 + Math.random() * 10;    // -5 to 5
      socialAxis = -5 + Math.random() * 10;      // -5 to 5
      fiscalConservatism = 2 + Math.random() * 6; // 2-8
      break;
  }

  return { economicAxis, socialAxis, fiscalConservatism };
}

/**
 * Generate MP traits based on role and faction
 */
export function generateTraits(isMinister: boolean, faction?: LabourFaction): MPTraits {
  const baseRebellious = isMinister ? 0 + Math.random() * 2 : 2 + Math.random() * 6;
  const rebelliousness = faction === 'left' ? baseRebellious + 2 : baseRebellious;

  return {
    rebelliousness: Math.min(10, rebelliousness),
    ambition: Math.random() * 10,
    principled: faction === 'left' ? 7 + Math.random() * 3 : 3 + Math.random() * 6,
    careerist: isMinister ? 7 + Math.random() * 3 : 2 + Math.random() * 6,
    popularityFocused: 3 + Math.random() * 5,
  };
}

/**
 * Create initial MP system state
 */
export function createInitialMPSystem(): MPSystemState {
  return {
    allMPs: new Map(),
    votingRecords: new Map(),
    promises: new Map(),
    lobbyingInProgress: false,
    selectedMPForDetail: null,
    filterSettings: {},
    currentBudgetSupport: new Map(),
  };
}

/**
 * Get party display name
 */
export function getPartyName(party: PartyAffiliation): string {
  const names: Record<PartyAffiliation, string> = {
    labour: 'Labour',
    conservative: 'Conservative',
    liberal_democrat: 'Liberal Democrat',
    snp: 'SNP',
    green: 'Green',
    reform_uk: 'Reform UK',
    plaid_cymru: 'Plaid Cymru',
    dup: 'DUP',
    sinn_fein: 'Sinn Féin',
    independent: 'Independent',
  };
  return names[party];
}

/**
 * Get party color for UI
 */
export function getPartyColor(party: PartyAffiliation): string {
  const colors: Record<PartyAffiliation, string> = {
    labour: 'bg-red-600',
    conservative: 'bg-blue-600',
    liberal_democrat: 'bg-orange-500',
    snp: 'bg-yellow-500',
    green: 'bg-green-600',
    reform_uk: 'bg-cyan-600',
    plaid_cymru: 'bg-emerald-600',
    dup: 'bg-red-800',
    sinn_fein: 'bg-green-800',
    independent: 'bg-grey-600',
  };
  return colors[party];
}

/**
 * Get faction display name
 */
export function getFactionName(faction: LabourFaction): string {
  const names: Record<LabourFaction, string> = {
    left: 'Left (SCG)',
    soft_left: 'Soft Left',
    centre_left: 'Centre Left',
    blairite: 'Progress',
    party_loyalist: 'Party Loyalist',
  };
  return names[faction];
}

// ===========================
// MP Stance Calculation
// ===========================

/**
 * Calculate budget ideology from proposed changes
 */
export function calculateBudgetIdeology(budgetChanges: BudgetChanges): IdeologicalPosition {
  let economicAxis = 0;
  let fiscalConservatism = 5;

  const detailedTax = budgetChanges.detailedTaxRates || {};
  const basicTaxDelta = budgetChanges.incomeTaxBasicChange ?? detailedTax.incomeTaxBasic ?? 0;
  const higherTaxDelta = budgetChanges.incomeTaxHigherChange ?? detailedTax.incomeTaxHigher ?? 0;
  const additionalTaxDelta = budgetChanges.incomeTaxAdditionalChange ?? detailedTax.incomeTaxAdditional ?? 0;
  const corporationTaxDelta = budgetChanges.corporationTaxChange ?? detailedTax.corporationTax ?? 0;
  const vatDelta = budgetChanges.vatChange ?? detailedTax.vat ?? 0;

  // Tax increases → left-wing
  const taxIncreases = [
    basicTaxDelta,
    higherTaxDelta,
    additionalTaxDelta,
    corporationTaxDelta,
    budgetChanges.capitalGainsTaxChange,
  ].filter((change) => change && change > 0).length;

  economicAxis -= taxIncreases * 0.5; // Each tax increase shifts left

  // Magnitude matters: +1pp and +80pp should not be treated similarly.
  economicAxis -= Math.max(0, basicTaxDelta) * 0.08;
  economicAxis -= Math.max(0, higherTaxDelta) * 0.05;
  economicAxis -= Math.max(0, additionalTaxDelta) * 0.04;
  economicAxis -= Math.max(0, corporationTaxDelta) * 0.03;
  economicAxis -= Math.max(0, vatDelta) * 0.06;

  // Aggressive tax cuts pull right.
  economicAxis += Math.max(0, -basicTaxDelta) * 0.05;
  economicAxis += Math.max(0, -higherTaxDelta) * 0.03;
  economicAxis += Math.max(0, -additionalTaxDelta) * 0.02;
  economicAxis += Math.max(0, -corporationTaxDelta) * 0.03;
  economicAxis += Math.max(0, -vatDelta) * 0.04;

  // Spending increases → left-wing
  const spendingIncreases = [
    budgetChanges.nhsSpendingChange,
    budgetChanges.educationSpendingChange,
    budgetChanges.welfareSpendingChange,
  ].filter((change) => change && change > 0).length;

  economicAxis -= spendingIncreases * 0.3;

  // Deficit increase → less fiscally conservative
  const totalTaxChange = (budgetChanges.incomeTaxBasicChange || 0) * 7 +
    (budgetChanges.incomeTaxHigherChange || 0) * 3.5 +
    (budgetChanges.vatChange || 0) * 5;
  const totalSpendingChange = (budgetChanges.nhsSpendingChange || 0) +
    (budgetChanges.educationSpendingChange || 0) +
    (budgetChanges.welfareSpendingChange || 0);
  const deficitChange = totalSpendingChange - totalTaxChange;

  if (deficitChange > 10) fiscalConservatism -= 2;
  else if (deficitChange > 5) fiscalConservatism -= 1;
  else if (deficitChange < -10) fiscalConservatism += 2;
  else if (deficitChange < -5) fiscalConservatism += 1;

  return {
    economicAxis: Math.max(-10, Math.min(10, economicAxis)),
    socialAxis: 0, // Budgets don't typically have social policy
    fiscalConservatism: Math.max(0, Math.min(10, fiscalConservatism)),
  };
}

function getBudgetPlausibilityPenalty(budgetChanges: BudgetChanges): number {
  const detailedTax = budgetChanges.detailedTaxRates || {};
  const basicTaxDelta = budgetChanges.incomeTaxBasicChange ?? detailedTax.incomeTaxBasic ?? 0;
  const higherTaxDelta = budgetChanges.incomeTaxHigherChange ?? detailedTax.incomeTaxHigher ?? 0;
  const additionalTaxDelta = budgetChanges.incomeTaxAdditionalChange ?? detailedTax.incomeTaxAdditional ?? 0;
  const vatDelta = budgetChanges.vatChange ?? detailedTax.vat ?? 0;

  let penalty = 0;

  // Extreme headline rates are politically toxic regardless of loyalty.
  if (basicTaxDelta >= 70) penalty += 90; // e.g. 20% -> 90%+
  else if (basicTaxDelta >= 50) penalty += 70;
  else if (basicTaxDelta >= 30) penalty += 45;
  else if (basicTaxDelta >= 10) penalty += 20;

  // Regressive and incoherent structures should trigger broad discomfort.
  if (basicTaxDelta > 4 && higherTaxDelta < -15) penalty += 35;
  if (basicTaxDelta > 2 && additionalTaxDelta < -15) penalty += 30;
  if (higherTaxDelta < -25 || additionalTaxDelta < -25) penalty += 12;

  // Very large VAT rises are similarly difficult to sustain politically.
  if (vatDelta >= 10) penalty += 35;
  else if (vatDelta >= 5) penalty += 16;

  return Math.min(100, penalty);
}

/**
 * Calculate ideological distance between MP and budget
 */
export function calculateIdeologicalAlignment(
  mpIdeology: IdeologicalPosition,
  budgetIdeology: IdeologicalPosition
): number {
  const economicDistance = Math.abs(mpIdeology.economicAxis - budgetIdeology.economicAxis);
  const fiscalDistance = Math.abs(mpIdeology.fiscalConservatism - budgetIdeology.fiscalConservatism);

  // Average distance, inverted so closer = higher score
  const avgDistance = (economicDistance + fiscalDistance) / 2;
  return 10 - avgDistance; // 0 (totally opposed) to 10 (perfect alignment)
}

/**
 * Calculate how budget affects MP's constituency
 */
export function calculateConstituencyImpact(
  constituency: Constituency,
  budgetChanges: BudgetChanges
): number {
  let impact = 0;
  const granularSpending = budgetChanges.detailedSpendingBudgets || {};
  const granularTax = budgetChanges.detailedTaxRates || {};

  // Lower income areas care more about welfare and NHS
  if (constituency.demographics.medianIncome < 30000) {
    if (budgetChanges.nhsSpendingChange && budgetChanges.nhsSpendingChange > 0) impact += 2;
    if (budgetChanges.welfareSpendingChange && budgetChanges.welfareSpendingChange > 0) impact += 2;
    if (budgetChanges.welfareSpendingChange && budgetChanges.welfareSpendingChange < 0) impact -= 3;
    if ((granularTax.vatDomesticEnergy || 0) > 0) impact -= 2;
    if ((budgetChanges.vatChange || 0) > 0) impact -= 2;
  }

  // High public sector dependency areas care about public spending
  if (constituency.demographics.publicSectorDependency > 30) {
    const totalSpendingChange = (budgetChanges.nhsSpendingChange || 0) +
      (budgetChanges.educationSpendingChange || 0) +
      (budgetChanges.policeSpendingChange || 0);
    if (totalSpendingChange > 0) impact += 1;
    if (totalSpendingChange < 0) impact -= 2;

    if ((granularSpending.nhsMentalHealth || 0) < 0) impact -= 1.5;
    if ((granularSpending.prisonsAndProbation || 0) < 0) impact -= 1.2;
    if ((granularSpending.policing || 0) < 0) impact -= 1.0;
  }

  // Elderly constituencies care about NHS and welfare
  if (constituency.demographics.ageProfile === 'elderly') {
    if (budgetChanges.nhsSpendingChange && budgetChanges.nhsSpendingChange > 0) impact += 1;
    if (budgetChanges.welfareSpendingChange && budgetChanges.welfareSpendingChange < 0) impact -= 1;
    if ((granularSpending.socialCare || 0) < 0) impact -= 1.5;
    if ((granularTax.insurancePremiumTax || 0) > 0) impact -= 0.8;
  }

  if ((granularSpending.courts || 0) < 0 || (granularSpending.legalAid || 0) < 0) {
    impact -= 0.9;
  }

  if ((granularSpending.nhsMentalHealth || 0) > 0 && constituency.demographics.unemploymentRate > 5.2) {
    impact += 1.1;
  }

  return impact; // -5 to +5 range
}

/**
 * Calculate MP's stance on current budget
 */
export function calculateMPStance(
  mp: MPProfile,
  budgetChanges: BudgetChanges,
  manifestoViolations: string[],
  promises: Map<string, MPPromise>
): 'support' | 'oppose' | 'undecided' {
  let supportScore = 50; // Start neutral
  const plausibilityPenalty = getBudgetPlausibilityPenalty(budgetChanges);

  // 1. Ideological alignment
  const budgetIdeology = calculateBudgetIdeology(budgetChanges);
  const ideologicalAlignment = calculateIdeologicalAlignment(mp.ideology, budgetIdeology);
  supportScore += ideologicalAlignment * 5; // -50 to +50

  // 2. Manifesto violations (Labour MPs care more)
  if (mp.party === 'labour' && manifestoViolations.length > 0) {
    supportScore -= manifestoViolations.length * 10;
  }

  // 3. Broken promises (MAJOR penalty)
  const brokenPromisesToMP = Array.from(promises.values()).filter(
    (p) => p.promisedToMPs.includes(mp.id) && p.broken
  );
  supportScore -= brokenPromisesToMP.length * 20;

  // 4. Active promises (positive boost if relevant)
  const activePromisesToMP = Array.from(promises.values()).filter(
    (p) => p.promisedToMPs.includes(mp.id) && !p.broken && !p.fulfilled
  );
  supportScore += activePromisesToMP.length * 10;

  // 5. Constituency impact
  const constituencyImpact = calculateConstituencyImpact(mp.constituency, budgetChanges);
  supportScore += constituencyImpact * 3;

  // 6. Trait modifiers
  if (mp.traits.rebelliousness > 7) supportScore -= 15;
  if (mp.isMinister) supportScore += 18; // Payroll vote, but not absolute under implausible proposals
  if (mp.traits.principled > 7 && ideologicalAlignment < 3) supportScore -= 10;

  // 6.5. Budget plausibility guardrail (caps support for absurd packages)
  if (plausibilityPenalty > 0) {
    const principledWeight = 0.7 + (mp.traits.principled / 20);
    supportScore -= plausibilityPenalty * principledWeight;

    if (mp.constituency.marginality > 70) {
      // Marginal-seat MPs are especially sensitive to electorally toxic tax mixes.
      supportScore -= plausibilityPenalty * 0.18;
    }
  }

  // 7. Marginal seat pressure (defensive voting)
  if (mp.constituency.marginality > 70) {
    // Very marginal - care more about local impact
    supportScore += constituencyImpact * 2;
  }

  // Determine final stance
  if (supportScore > 62) return 'support';
  if (supportScore < 42) return 'oppose';
  return 'undecided';
}

/**
 * Calculate all MPs' stances for current budget
 */
export function calculateAllMPStances(
  mpSystem: MPSystemState,
  budgetChanges: BudgetChanges,
  manifestoViolations: string[]
): Map<string, 'support' | 'oppose' | 'undecided'> {
  const stances = new Map<string, 'support' | 'oppose' | 'undecided'>();

  mpSystem.allMPs.forEach((mp, mpId) => {
    // Sinn Fein never take their seats - always undecided/abstain
    if (mp.party === 'sinn_fein') {
      stances.set(mpId, 'undecided');
    } else if (mp.party !== 'labour') {
      // All other opposition parties always oppose Labour budgets
      stances.set(mpId, 'oppose');
    } else {
      const stance = calculateMPStance(mp, budgetChanges, manifestoViolations, mpSystem.promises);
      stances.set(mpId, stance);
    }
  });

  return stances;
}

// ===========================
// Promise Management
// ===========================

/**
 * Create a new promise
 */
export function createPromise(
  category: PromiseCategory,
  mpIds: string[],
  description: string,
  currentMonth: number,
  specificValue?: number
): MPPromise {
  return {
    id: `promise_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    promisedToMPs: mpIds,
    category,
    description,
    specificValue,
    madeInMonth: currentMonth,
    fulfilled: false,
    broken: false,
  };
}

/**
 * Check if promise is fulfilled by budget
 */
export function checkPromiseFulfillment(
  promise: MPPromise,
  budgetChanges: BudgetChanges
): boolean {
  switch (promise.category) {
    case 'nhs_spending':
      if (promise.specificValue) {
        return (budgetChanges.nhsSpendingChange || 0) >= promise.specificValue;
      }
      return (budgetChanges.nhsSpendingChange || 0) > 0;

    case 'education_spending':
      if (promise.specificValue) {
        return (budgetChanges.educationSpendingChange || 0) >= promise.specificValue;
      }
      return (budgetChanges.educationSpendingChange || 0) > 0;

    case 'defence_spending':
      if (promise.specificValue) {
        return (budgetChanges.defenceSpendingChange || 0) >= promise.specificValue;
      }
      return (budgetChanges.defenceSpendingChange || 0) > 0;

    case 'welfare_protection':
      return (budgetChanges.welfareSpendingChange || 0) >= 0;

    case 'tax_rises_avoid':
      const taxIncreases = [
        budgetChanges.incomeTaxBasicChange,
        budgetChanges.incomeTaxHigherChange,
        budgetChanges.niEmployeeChange,
        budgetChanges.vatChange,
      ].filter((change) => change && change > 0).length;
      return taxIncreases === 0;

    case 'fiscal_discipline':
      // Check if deficit is reduced
      const totalTaxChange = (budgetChanges.incomeTaxBasicChange || 0) * 7 +
        (budgetChanges.vatChange || 0) * 5;
      const totalSpendingChange = (budgetChanges.nhsSpendingChange || 0) +
        (budgetChanges.educationSpendingChange || 0);
      const deficitChange = totalSpendingChange - totalTaxChange;
      return deficitChange < 0; // Deficit reduced

    default:
      return false; // Conservative default
  }
}

/**
 * Detect broken promises after budget submission
 */
export function detectBrokenPromises(
  promises: Map<string, MPPromise>,
  budgetChanges: BudgetChanges,
  currentMonth: number
): string[] {
  const brokenPromiseIds: string[] = [];

  promises.forEach((promise, promiseId) => {
    if (!promise.fulfilled && !promise.broken) {
      const isFulfilled = checkPromiseFulfillment(promise, budgetChanges);

      if (isFulfilled) {
        promise.fulfilled = true;
      } else {
        // Promise not fulfilled - mark as broken
        promise.broken = true;
        promise.brokenInMonth = currentMonth;
        brokenPromiseIds.push(promiseId);
      }
    }
  });

  return brokenPromiseIds;
}

// ===========================
// Lobbying Success Calculation
// ===========================

export type LobbyingApproach = 'promise' | 'persuade' | 'threaten';

export interface LobbyingResult {
  success: boolean;
  message: string;
  backfired?: boolean;
}

/**
 * Calculate lobbying success probability and execute
 */
export function attemptLobbying(
  mp: MPProfile,
  approach: LobbyingApproach,
  promise?: MPPromise,
  brokenPromisesCount: number = 0
): LobbyingResult {
  // Base success rates
  let successRate = 0;
  switch (approach) {
    case 'promise':
      successRate = 0.70; // 70% base
      break;
    case 'persuade':
      successRate = 0.40; // 40% base
      break;
    case 'threaten':
      successRate = 0.55; // 55% base
      break;
  }

  // Modifiers based on MP traits
  if (mp.traits.rebelliousness > 7) {
    successRate *= 0.6; // Rebels harder to convince
  }

  if (approach === 'threaten') {
    if (mp.traits.principled > 7) {
      successRate *= 0.5; // Principled MPs don't respond well to threats
    }
    if (mp.traits.careerist > 7) {
      successRate *= 1.4; // Careerists fold under pressure
    }
  }

  if (approach === 'promise' && promise) {
    // Promise relevance based on ideology
    // (Simplified - could be more sophisticated)
    successRate *= 1.1;
  }

  // Broken promises penalty (major)
  if (brokenPromisesCount > 0) {
    successRate *= Math.pow(0.8, brokenPromisesCount);
  }

  // Marginal seat MPs are more cautious
  if (mp.constituency.marginality > 70) {
    successRate *= 1.2; // Easier to convince (worried about seat)
  }

  // Determine success
  const roll = Math.random();
  const success = roll < successRate;

  // Check for backfire (only for threats)
  let backfired = false;
  if (approach === 'threaten' && !success) {
    const backfireChance = 0.3;
    backfired = Math.random() < backfireChance;
  }

  // Generate message using data-driven system
  const outcome = success ? 'success' : (backfired ? 'backfire' : 'failure');
  const message = getInteractionResponse(mp, approach, outcome);

  return { success, message, backfired };
}

// ===========================
// Export Helper Functions
// ===========================

/**
 * Get promise category display name
 */
export function getPromiseCategoryName(category: PromiseCategory): string {
  const names: Record<PromiseCategory, string> = {
    tax_cuts: 'Tax Cuts',
    tax_rises_avoid: 'Avoid Tax Rises',
    nhs_spending: 'NHS Spending Increase',
    education_spending: 'Education Spending Increase',
    regional_investment: 'Regional Investment',
    welfare_protection: 'Welfare Protection',
    defence_spending: 'Defence Spending Increase',
    green_investment: 'Green Investment',
    fiscal_discipline: 'Fiscal Discipline',
  };
  return names[category];
}

/**
 * Get count of MPs by stance
 */
type MPStance = 'support' | 'oppose' | 'undecided';

function normalizeStances(
  stances:
    | Map<string, MPStance>
    | Record<string, MPStance>
    | Array<[string, MPStance]>
    | null
    | undefined
): Map<string, MPStance> {
  if (stances instanceof Map) {
    return stances;
  }

  if (Array.isArray(stances)) {
    return new Map(
      stances.filter(
        (entry): entry is [string, MPStance] =>
          Array.isArray(entry) && typeof entry[0] === 'string'
      )
    );
  }

  if (stances && typeof stances === 'object') {
    return new Map(Object.entries(stances as Record<string, MPStance>));
  }

  return new Map();
}

export function getStanceCounts(
  stances:
    | Map<string, MPStance>
    | Record<string, MPStance>
    | Array<[string, MPStance]>
    | null
    | undefined
): {
  support: number;
  oppose: number;
  undecided: number;
} {
  let support = 0;
  let oppose = 0;
  let undecided = 0;

  const normalizedStances = normalizeStances(stances);
  normalizedStances.forEach((stance) => {
    if (stance === 'support') support++;
    else if (stance === 'oppose') oppose++;
    else undecided++;
  });

  return { support, oppose, undecided };
}

/**
 * Filter MPs based on filter settings
 */
export function filterMPs(
  allMPs: Map<string, MPProfile>,
  filterSettings: MPFilterSettings,
  currentStances?: Map<string, 'support' | 'oppose' | 'undecided'>
): MPProfile[] {
  let filtered = Array.from(allMPs.values());

  if (filterSettings.party) {
    filtered = filtered.filter((mp) => mp.party === filterSettings.party);
  }

  if (filterSettings.faction) {
    filtered = filtered.filter((mp) => mp.faction === filterSettings.faction);
  }

  if (filterSettings.region) {
    filtered = filtered.filter((mp) => mp.constituency.region === filterSettings.region);
  }

  if (filterSettings.stance && currentStances) {
    filtered = filtered.filter((mp) => currentStances.get(mp.id) === filterSettings.stance);
  }

  if (filterSettings.searchQuery) {
    const query = filterSettings.searchQuery.toLowerCase();
    filtered = filtered.filter(
      (mp) =>
        mp.name.toLowerCase().includes(query) ||
        mp.constituency.name.toLowerCase().includes(query)
    );
  }

  return filtered;
}

// ===========================
// React UI Components
// ===========================

/**
 * MP Card Component - Compact display for MP list
 */
export const MPCard: React.FC<{
  mp: MPProfile;
  stance?: 'support' | 'oppose' | 'undecided';
  votingRecord?: VotingRecord;
  brokenPromisesCount: number;
  onLobby?: (mpId: string) => void;
  onViewDetails?: (mpId: string) => void;
}> = ({ mp, stance, votingRecord, brokenPromisesCount, onLobby, onViewDetails }) => {
  const partyColor = getPartyColor(mp.party);
  const partyName = getPartyName(mp.party);

  const getStanceBadge = () => {
    if (!stance) return null;
    const colors = {
      support: 'bg-green-100 text-green-800',
      oppose: 'bg-red-100 text-red-800',
      undecided: 'bg-yellow-100 text-yellow-800',
    };
    const labels = {
      support: 'Support',
      oppose: 'Oppose',
      undecided: 'Undecided',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colors[stance]}`}>
        {labels[stance]}
      </span>
    );
  };

  return (
    <div className="bg-white border border-grey-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Name and Party */}
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-lg text-grey-900">{mp.name}</h3>
            <span className={`px-2 py-0.5 rounded text-xs text-white ${partyColor}`}>
              {partyName}
            </span>
            {mp.faction && (
              <span className="px-2 py-0.5 rounded text-xs bg-grey-100 text-grey-700">
                {getFactionName(mp.faction)}
              </span>
            )}
          </div>

          {/* Constituency */}
          <div className="text-sm text-grey-600 mb-2">
            {mp.constituency.name}
            {mp.constituency.marginality > 60 && (
              <span className="ml-2 text-orange-600 font-semibold">
                (Marginal {mp.constituency.marginality}%)
              </span>
            )}
          </div>

          {/* Stats Row */}
          <div className="flex items-center gap-4 text-xs text-grey-600">
            <span>Loyalty: {votingRecord?.loyaltyScore || 100}%</span>
            <span>Rebellions: {votingRecord?.rebellionCount || 0}</span>
            {brokenPromisesCount > 0 && (
              <span className="text-red-600 font-bold flex items-center gap-1">
                {brokenPromisesCount} broken {brokenPromisesCount === 1 ? 'promise' : 'promises'}
              </span>
            )}
          </div>
        </div>

        {/* Stance Badge and Actions */}
        <div className="flex flex-col items-end gap-2">
          {getStanceBadge()}
          <div className="flex gap-2">
            {onLobby && (
              <button
                onClick={() => onLobby(mp.id)}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded font-semibold"
              >
                Lobby
              </button>
            )}
            {onViewDetails && (
              <button
                onClick={() => onViewDetails(mp.id)}
                className="px-3 py-1 bg-grey-100 hover:bg-grey-200 text-grey-700 text-xs rounded font-semibold"
              >
                Details
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Minister Badge */}
      {mp.isMinister && (
        <div className="mt-2 pt-2 border-t border-grey-100">
          <span className="text-xs text-purple-700 font-semibold">{mp.ministerialRole}</span>
        </div>
      )}
    </div>
  );
};

/**
 * MP Management Screen - Main screen for viewing all MPs
 */
export const MPManagementScreen: React.FC<{
  mpSystem: MPSystemState;
  onLobby?: (mpId: string) => void;
  onViewDetails?: (mpId: string) => void;
  onBack?: () => void;
}> = ({ mpSystem, onLobby, onViewDetails, onBack }) => {
  const [filterSettings, setFilterSettings] = useState<MPFilterSettings>({});
  const [searchQuery, setSearchQuery] = useState('');

  // Apply search query to filter settings
  const activeFilters: MPFilterSettings = {
    ...filterSettings,
    searchQuery: searchQuery || undefined,
  };

  const normalizedStances = useMemo(() => {
    return normalizeStances(mpSystem.currentBudgetSupport);
  }, [mpSystem.currentBudgetSupport]);

  // Filter MPs
  const filteredMPs = useMemo(() => {
    return filterMPs(mpSystem.allMPs, activeFilters, normalizedStances);
  }, [mpSystem.allMPs, activeFilters, normalizedStances]);

  // Calculate stance counts
  const stanceCounts = useMemo(() => {
    return getStanceCounts(normalizedStances);
  }, [normalizedStances]);

  // Count by party
  const partyCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    mpSystem.allMPs.forEach((mp) => {
      counts[mp.party] = (counts[mp.party] || 0) + 1;
    });
    return counts;
  }, [mpSystem.allMPs]);

  return (
    <div className="min-h-screen bg-grey-50">
      {/* Header */}
      <div className="bg-white border-b border-grey-200 p-6">
        <div className="max-w-7xl mx-auto">
          {onBack && (
            <button
              onClick={onBack}
              className="mb-4 text-red-900 hover:text-red-700 font-semibold flex items-center gap-2"
            >
              ← Back to Dashboard
            </button>
          )}
          <h1 className="text-3xl font-bold text-grey-900 mb-2">MPs & Parliament</h1>
          <p className="text-grey-600">
            650 MPs · {partyCounts['labour'] || 0} Labour · {Object.values(partyCounts).reduce((a, b) => a + b, 0) - (partyCounts['labour'] || 0)} Opposition
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {/* Party Filter */}
            <div>
              <label className="block text-sm font-semibold text-grey-700 mb-1">Party</label>
              <select
                value={filterSettings.party || ''}
                onChange={(e) =>
                  setFilterSettings({ ...filterSettings, party: e.target.value as PartyAffiliation || undefined })
                }
                className="w-full px-3 py-2 border border-grey-300 rounded-lg text-sm"
              >
                <option value="">All Parties</option>
                <option value="labour">Labour</option>
                <option value="conservative">Conservative</option>
                <option value="liberal_democrat">Liberal Democrat</option>
                <option value="snp">SNP</option>
                <option value="green">Green</option>
                <option value="independent">Independent</option>
              </select>
            </div>

            {/* Faction Filter (Labour only) */}
            {(filterSettings.party === 'labour' || !filterSettings.party) && (
              <div>
                <label className="block text-sm font-semibold text-grey-700 mb-1">Faction</label>
                <select
                  value={filterSettings.faction || ''}
                  onChange={(e) =>
                    setFilterSettings({ ...filterSettings, faction: e.target.value as LabourFaction || undefined })
                  }
                  className="w-full px-3 py-2 border border-grey-300 rounded-lg text-sm"
                >
                  <option value="">All Factions</option>
                  <option value="left">Left (SCG)</option>
                  <option value="soft_left">Soft Left</option>
                  <option value="centre_left">Centre Left</option>
                  <option value="blairite">Progress</option>
                  <option value="party_loyalist">Party Loyalist</option>
                </select>
              </div>
            )}

            {/* Stance Filter */}
            <div>
              <label className="block text-sm font-semibold text-grey-700 mb-1">Stance</label>
              <select
                value={filterSettings.stance || ''}
                onChange={(e) =>
                  setFilterSettings({ ...filterSettings, stance: e.target.value as 'support' | 'oppose' | 'undecided' || undefined })
                }
                className="w-full px-3 py-2 border border-grey-300 rounded-lg text-sm"
              >
                <option value="">All Stances</option>
                <option value="support">Support</option>
                <option value="oppose">Oppose</option>
                <option value="undecided">Undecided</option>
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-semibold text-grey-700 mb-1">Search</label>
              <input
                type="text"
                placeholder="MP name or constituency..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-grey-300 rounded-lg text-sm"
              />
            </div>
          </div>

          {/* Support Summary */}
          <div className="flex items-center gap-6 pt-4 border-t border-grey-200">
            <div className="text-sm">
              <span className="font-semibold text-grey-700">Current Budget Support:</span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 bg-green-500 rounded-full"></span>
                <span className="font-semibold">Support: {stanceCounts.support}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 bg-red-500 rounded-full"></span>
                <span className="font-semibold">Oppose: {stanceCounts.oppose}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 bg-yellow-500 rounded-full"></span>
                <span className="font-semibold">Undecided: {stanceCounts.undecided}</span>
              </span>
            </div>
          </div>
        </div>

        {/* MP List */}
        <div className="space-y-3">
          {filteredMPs.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center text-grey-600">
              No MPs found matching your filters.
            </div>
          ) : (
            filteredMPs.map((mp) => {
              const stance = normalizedStances.get(mp.id);
              const votingRecord = mpSystem.votingRecords.get(mp.id);
              const brokenPromisesCount = Array.from(mpSystem.promises.values()).filter(
                (p) => p.promisedToMPs.includes(mp.id) && p.broken
              ).length;

              return (
                <MPCard
                  key={mp.id}
                  mp={mp}
                  stance={stance}
                  votingRecord={votingRecord}
                  brokenPromisesCount={brokenPromisesCount}
                  onLobby={onLobby}
                  onViewDetails={onViewDetails}
                />
              );
            })
          )}
        </div>

        {/* Results count */}
        <div className="mt-4 text-center text-sm text-grey-600">
          Showing {filteredMPs.length} of {mpSystem.allMPs.size} MPs
        </div>
      </div>
    </div>
  );
};

// This file now contains ~1400 lines - UI components complete

// ===========================
// Lobbying Modal Component
// ===========================

/**
 * Lobbying Modal - Interactive dialog for lobbying MPs
 */
export const LobbyingModal: React.FC<{
  mp: MPProfile;
  brokenPromisesCount: number;
  onClose: () => void;
  onLobby: (approach: LobbyingApproach, promiseCategory?: PromiseCategory, specificValue?: number) => Promise<{ success: boolean; message: string }>;
}> = ({ mp, brokenPromisesCount, onClose, onLobby }) => {
  const [selectedApproach, setSelectedApproach] = useState<LobbyingApproach>('promise');
  const [selectedPromiseCategory, setSelectedPromiseCategory] = useState<PromiseCategory>('nhs_spending');
  const [promiseValue, setPromiseValue] = useState<number>(2);
  const [isLobbying, setIsLobbying] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleLobby = async () => {
    setIsLobbying(true);
    try {
      const lobbyResult = await onLobby(
        selectedApproach,
        selectedApproach === 'promise' ? selectedPromiseCategory : undefined,
        selectedApproach === 'promise' ? promiseValue : undefined
      );
      setResult(lobbyResult);
    } catch (error) {
      setResult({ success: false, message: 'Lobbying failed due to an error.' });
    } finally {
      setIsLobbying(false);
    }
  };

  // Calculate success rate for display
  const getSuccessRate = () => {
    let baseRate = 0;
    switch (selectedApproach) {
      case 'promise': baseRate = 70; break;
      case 'persuade': baseRate = 40; break;
      case 'threaten': baseRate = 55; break;
    }

    // Apply modifiers
    if (mp.traits.rebelliousness > 7) baseRate *= 0.6;
    if (selectedApproach === 'threaten' && mp.traits.principled > 7) baseRate *= 0.5;
    if (selectedApproach === 'threaten' && mp.traits.careerist > 7) baseRate *= 1.4;
    if (brokenPromisesCount > 0) baseRate *= Math.pow(0.8, brokenPromisesCount);
    if (mp.constituency.marginality > 70) baseRate *= 1.2;

    return Math.min(95, Math.max(5, Math.round(baseRate)));
  };

  if (result) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {result.success ? 'Lobbying Successful' : 'Lobbying Failed'}
          </h2>
          <p className={`text-lg mb-6 ${result.success ? 'text-green-700' : 'text-red-700'}`}>
            {result.message}
          </p>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-red-700 hover:bg-red-800 text-white font-semibold rounded-sm"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-red-700 text-white p-6">
          <h2 className="text-2xl font-bold">Lobby {mp.name}</h2>
          <p className="text-red-100 mt-1">
            {mp.constituency.name} · {getPartyName(mp.party)}
            {mp.faction && ` · ${getFactionName(mp.faction)}`}
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* MP Concerns */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-bold text-gray-900 mb-2">Current Concerns</h3>
            <ul className="space-y-1 text-sm text-gray-700">
              <li>• Rebelliousness: {mp.traits.rebelliousness.toFixed(1)}/10</li>
              {mp.traits.principled > 6 && <li>• Highly principled - difficult to pressure</li>}
              {mp.constituency.marginality > 60 && <li>• Marginal seat - worried about constituents</li>}
              {brokenPromisesCount > 0 && (
                <li className="text-red-600 font-bold">
                  • You have broken {brokenPromisesCount} {brokenPromisesCount === 1 ? 'promise' : 'promises'} to this MP
                </li>
              )}
            </ul>
          </div>

          {/* Approach Selection */}
          <div>
            <h3 className="font-bold text-gray-900 mb-3">Choose Your Approach</h3>
            <div className="space-y-3">
              {/* Promise Approach */}
              <button
                onClick={() => setSelectedApproach('promise')}
                className={`w-full text-left p-4 border-2 rounded-lg transition-all ${selectedApproach === 'promise'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                  }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-bold text-gray-900">Make a Promise</div>
                    <div className="text-sm text-gray-600 mt-1">
                      Commit to a specific policy action in the next budget
                    </div>
                    {selectedApproach === 'promise' && (
                      <div className="mt-3 space-y-2">
                        <select
                          value={selectedPromiseCategory}
                          onChange={(e) => setSelectedPromiseCategory(e.target.value as PromiseCategory)}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                        >
                          <option value="nhs_spending">NHS Spending Increase</option>
                          <option value="education_spending">Education Spending Increase</option>
                          <option value="defence_spending">Defence Spending Increase</option>
                          <option value="welfare_protection">Protect Welfare</option>
                          <option value="tax_rises_avoid">Avoid Tax Rises</option>
                          <option value="regional_investment">Regional Investment</option>
                          <option value="green_investment">Green Investment</option>
                          <option value="fiscal_discipline">Maintain Fiscal Discipline</option>
                        </select>
                        {selectedPromiseCategory.includes('spending') && (
                          <input
                            type="number"
                            value={promiseValue}
                            onChange={(e) => setPromiseValue(Number(e.target.value))}
                            min="0.5"
                            max="10"
                            step="0.5"
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                            placeholder="Amount (£bn)"
                          />
                        )}
                      </div>
                    )}
                  </div>
                  <div className="ml-4 text-right">
                    <div className="text-xs text-gray-500">Success Rate</div>
                    <div className="text-lg font-bold text-blue-600">
                      {selectedApproach === 'promise' ? getSuccessRate() : '70'}%
                    </div>
                  </div>
                </div>
              </button>

              {/* Persuade Approach */}
              <button
                onClick={() => setSelectedApproach('persuade')}
                className={`w-full text-left p-4 border-2 rounded-lg transition-all ${selectedApproach === 'persuade'
                    ? 'border-green-600 bg-green-50'
                    : 'border-gray-300 hover:border-gray-400'
                  }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-bold text-gray-900">Private Persuasion</div>
                    <div className="text-sm text-gray-600 mt-1">
                      Meet privately to discuss their concerns (no long-term consequences)
                    </div>
                  </div>
                  <div className="ml-4 text-right">
                    <div className="text-xs text-gray-500">Success Rate</div>
                    <div className="text-lg font-bold text-green-600">
                      {selectedApproach === 'persuade' ? getSuccessRate() : '40'}%
                    </div>
                  </div>
                </div>
              </button>

              {/* Threaten Approach */}
              <button
                onClick={() => setSelectedApproach('threaten')}
                className={`w-full text-left p-4 border-2 rounded-lg transition-all ${selectedApproach === 'threaten'
                    ? 'border-orange-600 bg-orange-50'
                    : 'border-gray-300 hover:border-gray-400'
                  }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-bold text-gray-900 flex items-center gap-2">
                      Use Whips (Threaten)
                      <span className="text-xs text-orange-600 font-normal">Risky</span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Apply pressure through party whips (may backfire and reduce backbench satisfaction)
                    </div>
                  </div>
                  <div className="ml-4 text-right">
                    <div className="text-xs text-gray-500">Success Rate</div>
                    <div className="text-lg font-bold text-orange-600">
                      {selectedApproach === 'threaten' ? getSuccessRate() : '55'}%
                    </div>
                    <div className="text-xs text-orange-600 mt-1">30% backfire risk</div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Consequences Warning */}
          {selectedApproach === 'promise' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">
                <strong>Warning:</strong> If you break this promise, this MP will become hostile and future
                lobbying will become much harder. All MPs who receive broken promises will remember.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleLobby}
              disabled={isLobbying}
              className={`flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-sm transition-all ${isLobbying ? 'opacity-50 cursor-not-allowed' : ''
                }`}
            >
              {isLobbying ? 'Lobbying...' : `Lobby MP (${getSuccessRate()}% chance)`}
            </button>
            <button
              onClick={onClose}
              disabled={isLobbying}
              className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ===========================
// MP Detail Modal Component
// ===========================

/**
 * MP Detail Modal - 5 tabs showing complete MP information
 */
export const MPDetailModal: React.FC<{
  mp: MPProfile;
  votingRecord?: VotingRecord;
  promises: Map<string, MPPromise>;
  stance?: 'support' | 'oppose' | 'undecided';
  onClose: () => void;
}> = ({ mp, votingRecord, promises, stance, onClose }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'ideology' | 'voting' | 'promises' | 'constituency'>('profile');

  const partyColor = getPartyColor(mp.party);
  const partyName = getPartyName(mp.party);

  // Filter promises for this MP
  const mpPromises = Array.from(promises.values()).filter(p => p.promisedToMPs.includes(mp.id));
  const activePromises = mpPromises.filter(p => !p.fulfilled && !p.broken);
  const fulfilledPromises = mpPromises.filter(p => p.fulfilled);
  const brokenPromises = mpPromises.filter(p => p.broken);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl rounded-lg">
        {/* Header */}
        <div className={`${partyColor} text-white p-6`}>
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-3xl font-bold">{mp.name}</h2>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-lg">{partyName}</span>
                {mp.faction && (
                  <>
                    <span>·</span>
                    <span className="text-lg">{getFactionName(mp.faction)}</span>
                  </>
                )}
              </div>
              <div className="text-sm opacity-90 mt-1">{mp.constituency.name}</div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          {/* Minister badge */}
          {mp.isMinister && (
            <div className="mt-3 inline-block bg-white bg-opacity-20 px-3 py-1 rounded text-sm">
              {mp.ministerialRole}
            </div>
          )}

          {/* Stance badge */}
          {stance && (
            <div className="mt-2">
              {(() => {
                const colors = {
                  support: 'bg-green-500',
                  oppose: 'bg-red-500',
                  undecided: 'bg-yellow-500',
                };
                const labels = {
                  support: 'Supporting Budget',
                  oppose: 'Opposing Budget',
                  undecided: 'Undecided on Budget',
                };
                return (
                  <span className={`inline-block ${colors[stance]} px-3 py-1 rounded-full text-sm font-semibold`}>
                    {labels[stance]}
                  </span>
                );
              })()}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50">
          {[
            { id: 'profile', label: 'Profile' },
            { id: 'ideology', label: 'Ideology' },
            { id: 'voting', label: 'Voting History' },
            { id: 'promises', label: `Promises (${mpPromises.length})` },
            { id: 'constituency', label: 'Constituency' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 px-4 py-3 font-semibold transition-colors ${activeTab === tab.id
                  ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-lg text-gray-900 mb-2">Background</h3>
                <p className="text-gray-700">{mp.background}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded p-3">
                  <div className="text-sm text-gray-600">Entered Parliament</div>
                  <div className="text-xl font-bold text-gray-900">{mp.enteredParliament}</div>
                </div>
                <div className="bg-gray-50 rounded p-3">
                  <div className="text-sm text-gray-600">Years in Office</div>
                  <div className="text-xl font-bold text-gray-900">{new Date().getFullYear() - mp.enteredParliament}</div>
                </div>
              </div>

              {mp.committees.length > 0 && (
                <div>
                  <h3 className="font-bold text-lg text-gray-900 mb-2">Committee Memberships</h3>
                  <div className="flex flex-wrap gap-2">
                    {mp.committees.map((committee, idx) => (
                      <span key={idx} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                        {committee}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="font-bold text-lg text-gray-900 mb-2">Traits</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Rebelliousness</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-red-500 h-2 rounded-full"
                          style={{ width: `${(mp.traits.rebelliousness / 10) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{mp.traits.rebelliousness.toFixed(1)}/10</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Principled</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${(mp.traits.principled / 10) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{mp.traits.principled.toFixed(1)}/10</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Ambition</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-purple-500 h-2 rounded-full"
                          style={{ width: `${(mp.traits.ambition / 10) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{mp.traits.ambition.toFixed(1)}/10</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Ideology Tab */}
          {activeTab === 'ideology' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-bold text-lg text-gray-900 mb-3">Political Compass</h3>
                <div className="bg-gray-50 p-6 rounded-lg">
                  <div className="relative w-full h-64 border-2 border-gray-300">
                    {/* Axes */}
                    <div className="absolute top-1/2 left-0 w-full h-px bg-gray-400"></div>
                    <div className="absolute top-0 left-1/2 w-px h-full bg-gray-400"></div>

                    {/* Labels */}
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 text-xs text-gray-600">Authoritarian</div>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-gray-600">Libertarian</div>
                    <div className="absolute top-1/2 -translate-y-1/2 left-2 text-xs text-gray-600">Left</div>
                    <div className="absolute top-1/2 -translate-y-1/2 right-2 text-xs text-gray-600">Right</div>

                    {/* MP Position */}
                    <div
                      className="absolute w-4 h-4 bg-red-600 rounded-full border-2 border-white shadow-lg -translate-x-1/2 -translate-y-1/2"
                      style={{
                        left: `${((mp.ideology.economicAxis + 10) / 20) * 100}%`,
                        top: `${((mp.ideology.socialAxis + 10) / 20) * 100}%`,
                      }}
                    ></div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Economic: </span>
                      <span className="font-semibold">{mp.ideology.economicAxis.toFixed(1)}</span>
                      <span className="text-gray-600"> ({mp.ideology.economicAxis < -2 ? 'Left-wing' : mp.ideology.economicAxis > 2 ? 'Right-wing' : 'Centrist'})</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Social: </span>
                      <span className="font-semibold">{mp.ideology.socialAxis.toFixed(1)}</span>
                      <span className="text-gray-600"> ({mp.ideology.socialAxis < -2 ? 'Libertarian' : mp.ideology.socialAxis > 2 ? 'Authoritarian' : 'Moderate'})</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-lg text-gray-900 mb-3">Fiscal Position</h3>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-200 rounded-full h-4">
                    <div
                      className="bg-amber-500 h-4 rounded-full"
                      style={{ width: `${(mp.ideology.fiscalConservatism / 10) * 100}%` }}
                    ></div>
                  </div>
                  <span className="font-bold text-gray-900">{mp.ideology.fiscalConservatism.toFixed(1)}/10</span>
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  {mp.ideology.fiscalConservatism > 7 ? 'Fiscal Hawk (Austerity advocate)' :
                    mp.ideology.fiscalConservatism > 4 ? 'Moderate (Cautious about deficit)' :
                      'Fiscal Dove (Supports borrowing for investment)'}
                </div>
              </div>
            </div>
          )}

          {/* Voting History Tab */}
          {activeTab === 'voting' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 border border-green-200 rounded p-4">
                  <div className="text-sm text-green-700">Loyalty Score</div>
                  <div className="text-3xl font-bold text-green-900">{votingRecord?.loyaltyScore || 100}%</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded p-4">
                  <div className="text-sm text-red-700">Rebellions</div>
                  <div className="text-3xl font-bold text-red-900">{votingRecord?.rebellionCount || 0}</div>
                </div>
              </div>

              {votingRecord && votingRecord.budgetVotes.length > 0 ? (
                <div>
                  <h3 className="font-bold text-lg text-gray-900 mb-3">Recent Budget Votes</h3>
                  <div className="space-y-2">
                    {votingRecord.budgetVotes.slice(-10).reverse().map((vote, idx) => (
                      <div key={idx} className="bg-gray-50 border border-gray-200 rounded p-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${vote.choice === 'aye' ? 'bg-green-100 text-green-800' :
                                  vote.choice === 'noe' ? 'bg-red-100 text-red-800' :
                                    'bg-yellow-100 text-yellow-800'
                                }`}>
                                {vote.choice.toUpperCase()}
                              </span>
                              {vote.coerced && (
                                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-800">
                                  COERCED
                                </span>
                              )}
                              <span className="text-xs text-gray-500">Month {vote.month}</span>
                            </div>
                            <div className="text-sm text-gray-700 mt-1">{vote.reasoning}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No voting history yet
                </div>
              )}
            </div>
          )}

          {/* Promises Tab */}
          {activeTab === 'promises' && (
            <div className="space-y-6">
              {brokenPromises.length > 0 && (
                <div>
                  <h3 className="font-bold text-lg text-red-900 mb-3 flex items-center gap-2">
                    <span>Broken Promises</span>
                    <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-full">{brokenPromises.length}</span>
                  </h3>
                  <div className="space-y-2">
                    {brokenPromises.map((promise) => (
                      <div key={promise.id} className="bg-red-50 border-2 border-red-300 rounded p-4">
                        <div className="flex items-start gap-3">
                          <div className="text-2xl font-bold text-red-900">X</div>
                          <div className="flex-1">
                            <div className="font-semibold text-red-900">{getPromiseCategoryName(promise.category)}</div>
                            <div className="text-sm text-red-700 mt-1">{promise.description}</div>
                            <div className="text-xs text-red-600 mt-2">
                              Made in month {promise.madeInMonth} · Broken in month {promise.brokenInMonth}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activePromises.length > 0 && (
                <div>
                  <h3 className="font-bold text-lg text-gray-900 mb-3">Active Promises</h3>
                  <div className="space-y-2">
                    {activePromises.map((promise) => (
                      <div key={promise.id} className="bg-yellow-50 border border-yellow-200 rounded p-4">
                        <div className="flex items-start gap-3">
                          <div className="text-2xl">⏳</div>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">{getPromiseCategoryName(promise.category)}</div>
                            <div className="text-sm text-gray-700 mt-1">{promise.description}</div>
                            <div className="text-xs text-gray-500 mt-2">Made in month {promise.madeInMonth}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {fulfilledPromises.length > 0 && (
                <div>
                  <h3 className="font-bold text-lg text-green-900 mb-3">Fulfilled Promises</h3>
                  <div className="space-y-2">
                    {fulfilledPromises.map((promise) => (
                      <div key={promise.id} className="bg-green-50 border border-green-200 rounded p-4">
                        <div className="flex items-start gap-3">
                          <div className="text-sm font-bold text-white bg-green-600 px-2 py-1 rounded">
                            KEPT
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-green-900">{getPromiseCategoryName(promise.category)}</div>
                            <div className="text-sm text-green-700 mt-1">{promise.description}</div>
                            <div className="text-xs text-green-600 mt-2">Made in month {promise.madeInMonth}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {mpPromises.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  No promises have been made to this MP yet
                </div>
              )}
            </div>
          )}

          {/* Constituency Tab */}
          {activeTab === 'constituency' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-lg text-gray-900 mb-3">{mp.constituency.name}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded p-3">
                    <div className="text-sm text-gray-600">Region</div>
                    <div className="text-lg font-bold text-gray-900 capitalize">{mp.constituency.region}</div>
                  </div>
                  <div className={`rounded p-3 ${mp.constituency.marginality > 70 ? 'bg-red-50' :
                      mp.constituency.marginality > 50 ? 'bg-amber-50' :
                        'bg-green-50'
                    }`}>
                    <div className="text-sm text-gray-600">Marginality</div>
                    <div className={`text-lg font-bold ${mp.constituency.marginality > 70 ? 'text-red-900' :
                        mp.constituency.marginality > 50 ? 'text-amber-900' :
                          'text-green-900'
                      }`}>
                      {mp.constituency.marginality.toFixed(0)}%
                      {mp.constituency.marginality > 70 ? ' (Highly Marginal)' :
                        mp.constituency.marginality > 50 ? ' (Marginal)' :
                          ' (Safe)'}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-lg text-gray-900 mb-3">Demographics</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Median Income</span>
                    <span className="font-semibold text-gray-900">
                      £{mp.constituency.demographics.medianIncome.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Unemployment Rate</span>
                    <span className="font-semibold text-gray-900">
                      {mp.constituency.demographics.unemploymentRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Public Sector Jobs</span>
                    <span className="font-semibold text-gray-900">
                      {mp.constituency.demographics.publicSectorDependency.toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Age Profile</span>
                    <span className="font-semibold text-gray-900 capitalize">
                      {mp.constituency.demographics.ageProfile}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-lg text-gray-900 mb-3">Electoral Position</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Previous Election Margin</span>
                    <span className="font-semibold text-gray-900">{mp.constituency.previousMargin.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Swing Required to Lose</span>
                    <span className="font-semibold text-gray-900">{mp.constituency.swingRequired.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ===========================
// Enhanced Parliamentary Voting
// ===========================

/**
 * Simulate parliamentary vote using individual MP decisions
 */
export function simulateEnhancedParliamentaryVote(
  mpSystem: MPSystemState,
  budgetChanges: BudgetChanges,
  manifestoViolations: string[],
  currentMonth: number
): VoteResult {
  let ayesCount = 0;
  let noesCount = 0;
  let abstentionsCount = 0;
  const voteChoices = new Map<string, 'aye' | 'noe' | 'abstain'>();
  const keyRebels: string[] = [];

  // Calculate stances for all MPs
  const stances = calculateAllMPStances(mpSystem, budgetChanges, manifestoViolations);

  // Simulate vote for each MP
  mpSystem.allMPs.forEach((mp, mpId) => {
    const stance = stances.get(mpId);

    if (mp.party === 'sinn_fein') {
      // Sinn Fein never take their seats at Westminster
      voteChoices.set(mpId, 'abstain');
      abstentionsCount++;
    } else if (mp.party !== 'labour') {
      // Opposition always votes against
      voteChoices.set(mpId, 'noe');
      noesCount++;
    } else {
      // Labour MPs: use stance calculation
      if (stance === 'support') {
        // Supporters almost always vote with the whip, with occasional tactical abstentions.
        const ayeChance = mp.isMinister ? 0.995 : (0.9 - mp.traits.rebelliousness * 0.01);
        if (Math.random() < ayeChance) {
          voteChoices.set(mpId, 'aye');
          ayesCount++;
        } else {
          voteChoices.set(mpId, 'abstain');
          abstentionsCount++;
        }
      } else if (stance === 'oppose') {
        // Opposing MPs usually vote against; abstention is the minority behaviour.
        const noVoteChance = mp.isMinister
          ? 0.55 + mp.traits.principled * 0.02
          : 0.72 + mp.traits.principled * 0.02 + mp.traits.rebelliousness * 0.01;
        if (Math.random() < Math.min(0.97, noVoteChance)) {
          voteChoices.set(mpId, 'noe');
          noesCount++;
          keyRebels.push(mp.name);
        } else {
          voteChoices.set(mpId, 'abstain');
          abstentionsCount++;
        }
      } else {
        // Undecided MPs split between loyalty, caution, and occasional rebellion.
        const roll = Math.random();
        const ayeThreshold = 0.55 - mp.traits.rebelliousness * 0.015 + (mp.isMinister ? 0.25 : 0);
        const abstainThreshold = ayeThreshold + 0.3;

        if (roll < Math.max(0.2, Math.min(0.92, ayeThreshold))) {
          voteChoices.set(mpId, 'aye');
          ayesCount++;
        } else if (roll < Math.max(0.45, Math.min(0.97, abstainThreshold))) {
          voteChoices.set(mpId, 'abstain');
          abstentionsCount++;
        } else {
          voteChoices.set(mpId, 'noe');
          noesCount++;
          keyRebels.push(mp.name);
        }
      }
    }
  });

  const governmentMajority = ayesCount - noesCount;
  const passed = governmentMajority > 0;

  // Count opposition votes (everyone non-Labour who isn't Sinn Fein)
  let oppositionVoteCount = 0;
  mpSystem.allMPs.forEach((mp) => {
    if (mp.party !== 'labour' && mp.party !== 'sinn_fein') {
      oppositionVoteCount++;
    }
  });
  const rebellCount = Math.max(0, noesCount + abstentionsCount - oppositionVoteCount - 7); // Subtract opposition and SF

  // Generate narrative summary
  let narrativeSummary: string;
  const labourNoes = Math.max(0, noesCount - oppositionVoteCount); // Labour rebels who voted against
  const profileIndex = (Math.abs(governmentMajority) + labourNoes + abstentionsCount + manifestoViolations.length) % 3;

  const taxPressureSignals = [
    budgetChanges.niEmployerChange ?? 0,
    budgetChanges.vatChange ?? 0,
    budgetChanges.detailedTaxRates?.vatDomesticEnergy ?? 0,
  ].filter((value) => value > 0).length;

  const spendingCutSignals = Object.values(budgetChanges.detailedSpendingBudgets || {})
    .filter((value) => typeof value === 'number' && value < -0.25).length;

  const pressurePoints: string[] = [];
  if (manifestoViolations.length > 0) {
    pressurePoints.push(`${manifestoViolations.length} manifesto breach${manifestoViolations.length === 1 ? '' : 'es'}`);
  }
  if (taxPressureSignals >= 2) {
    pressurePoints.push('tax package backlash');
  }
  if (spendingCutSignals >= 2) {
    pressurePoints.push('departmental cuts resistance');
  }
  if (abstentionsCount >= 20) {
    pressurePoints.push('soft dissent via abstentions');
  }

  const pressureSummary = pressurePoints.length > 0
    ? ` Pressure points: ${pressurePoints.join(', ')}.`
    : '';

  if (!passed) {
    const defeatLeads = [
      `The Budget is defeated by ${Math.abs(governmentMajority)} votes after support collapsed across Labour backbenches.`,
      `The Commons rejects the Budget by ${Math.abs(governmentMajority)} votes, exposing a failed whipping operation.`,
      `The government loses the division by ${Math.abs(governmentMajority)} votes in a major parliamentary reverse.`
    ];
    narrativeSummary = `${defeatLeads[profileIndex]} ${labourNoes} Labour MP${labourNoes === 1 ? '' : 's'} voted against${abstentionsCount > 0 ? ` and ${abstentionsCount} abstained` : ''}.${pressureSummary} No.10 now expects an immediate revised package.`;
  } else if (governmentMajority < 20) {
    const narrowWinLeads = [
      `The Budget scrapes through by ${governmentMajority} votes.`,
      `The government survives by only ${governmentMajority} votes.`,
      `The Budget passes on a thin margin of ${governmentMajority}.`
    ];
    narrativeSummary = `${narrowWinLeads[profileIndex]} ${labourNoes} Labour MP${labourNoes === 1 ? '' : 's'} voted against${abstentionsCount > 0 ? ` with ${abstentionsCount} abstentions` : ''}.${pressureSummary}`;
  } else if (labourNoes > 20) {
    const largeDissentLeads = [
      `The Budget passes with a majority of ${governmentMajority}, but a major backbench split (${labourNoes} Labour MPs) dominates the aftermath.`,
      `The division is won by ${governmentMajority}, yet ${labourNoes} Labour MPs break the whip in a major display of dissent.`,
      `The government carries the vote by ${governmentMajority}, but ${labourNoes} Labour noes point to a deep internal fracture.`
    ];
    narrativeSummary = `${largeDissentLeads[profileIndex]}${pressureSummary}`;
  } else if (labourNoes > 5 || abstentionsCount > 12) {
    narrativeSummary = `The Budget passes with a comfortable majority of ${governmentMajority}. Dissent is noticeable (${labourNoes} Labour noes${abstentionsCount > 0 ? `, ${abstentionsCount} abstentions` : ''}) and will require political follow-up.${pressureSummary}`;
  } else {
    const unityLeads = [
      `The Budget passes with a commanding majority of ${governmentMajority} and strong party discipline.`,
      `A majority of ${governmentMajority} delivers the Budget with only limited Labour defections.`,
      `The government secures a clear majority of ${governmentMajority}; the whips contain resistance effectively.`
    ];
    narrativeSummary = `${unityLeads[profileIndex]}${pressureSummary}`;
  }

  // Key rebels narrative
  const keyRebelsNarrative: string[] = [];
  if (labourNoes > 30) {
    keyRebelsNarrative.push('A large group of left-wing MPs voted against, citing broken manifesto commitments');
  }
  if (labourNoes > 15 && budgetChanges.niEmployerChange && budgetChanges.niEmployerChange > 0) {
    keyRebelsNarrative.push('Several MPs in marginal seats rebelled over tax increases affecting their constituents');
  }
  if (labourNoes > 8 && (budgetChanges.detailedSpendingBudgets?.nhsMentalHealth || 0) < -0.3) {
    keyRebelsNarrative.push('MPs from areas with high mental health caseloads rebelled over cuts to mental health budgets');
  }
  if (labourNoes > 8 && (budgetChanges.detailedSpendingBudgets?.prisonsAndProbation || 0) < -0.2) {
    keyRebelsNarrative.push('Justice-focused MPs warned that reducing prisons funding would worsen overcrowding and voted against');
  }
  if (labourNoes > 10 && ((budgetChanges.detailedTaxRates?.vatDomesticEnergy || 0) > 0 || (budgetChanges.vatChange || 0) > 0)) {
    keyRebelsNarrative.push('Cost-of-living MPs cited higher VAT burdens on household essentials and opposed the Budget');
  }
  if (abstentionsCount > 10) {
    keyRebelsNarrative.push('A significant number of MPs abstained, signalling deep unease within the parliamentary party');
  }
  if (manifestoViolations.length > 0) {
    keyRebelsNarrative.push('Fiscal hawks within the party voted against after manifesto violations');
  }

  // Whip assessment
  let whipAssessment: string;
  if (labourNoes === 0 && abstentionsCount <= 3) {
    whipAssessment = 'Chief Whip: clean operation. Discipline held and caucus management is currently stable.';
  } else if (labourNoes <= 8) {
    whipAssessment = 'Chief Whip: low-level dissent only. Manageable, but we should pre-negotiate with soft critics before the next vote.';
  } else if (labourNoes <= 25) {
    whipAssessment = 'Chief Whip: meaningful dissent. A concessions package is advisable to prevent further drift.';
  } else if (labourNoes <= 50) {
    whipAssessment = 'Chief Whip: serious discipline failure. Backbench blocs are coordinating and need direct political engagement.';
  } else {
    whipAssessment = 'Chief Whip: open revolt conditions. Without a strategic reset, future fiscal votes are unlikely to be secure.';
  }

  return {
    ayes: ayesCount,
    noes: noesCount,
    abstentions: abstentionsCount,
    governmentMajority,
    passed,
    rebellCount,
    oppositionVotes: oppositionVoteCount,
    narrativeSummary,
    keyRebels: keyRebelsNarrative,
    whipAssessment,
    individualVotes: voteChoices,
  };
}
