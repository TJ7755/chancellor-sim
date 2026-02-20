// MP System - Individual MP Simulation for Parliamentary Voting
// Handles 650 MPs with lobbying, promise tracking, and voting mechanics

import React, { useState, useMemo } from 'react';
import { BudgetChanges } from './game-state';
import { getInteractionResponse } from './data/mp-interactions';

export type { BudgetChanges };

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
  dealComplianceProbability?: number;
  ministerialRole?: string;
  committees: string[];
}

export interface MPPromise {
  id: string;
  promisedToMPs: string[];      // Array of MP IDs
  mpId?: string;
  category: PromiseCategory;
  description: string;
  specificValue?: number;       // e.g., £2bn for NHS spending
  turnMade?: number;
  madeInMonth: number;
  deadline?: number;
  fulfilled: boolean | null;
  broken: boolean;
  brokenBy?: 'player' | 'mp';
  brokenInMonth?: number;
}

export interface MPConcern {
  budgetParameter: string;          // e.g., 'nhsMentalHealth', 'corporationTaxMain'
  priority: number;                 // 0-10 (how much MP cares)
  direction: 'increase' | 'decrease' | 'maintain';
  reason: string;                   // e.g., 'Constituency has high elderly population'
  thresholdValue?: number;          // Optional: specific value MP wants
}

export interface MPConcernProfile {
  mpId: string;
  concerns: MPConcern[];            // Dynamic list based on ideology + constituency
  primaryIssues: string[];          // Top 3-5 concerns for this MP
}

export interface MPGroup {
  id: string;
  name: string;
  spokespersonId: string;                    // Leader MP ID
  memberIds: string[];                       // All member MP IDs
  commonConcerns: MPConcern[];              // Shared issues
  formationReason: string;                   // Why group formed
  cohesion: number;                          // 0-100 (how unified)
  votingPower: number;                       // Number of votes
  demandDescription: string;                 // What they want
  demandThreshold?: number;                  // Specific value needed
  isActive: boolean;                         // Currently pressing demands
  formedInMonth: number;
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
  concernProfiles: Map<string, MPConcernProfile>;  // Granular MP concerns
  activeGroups: MPGroup[];                         // MP groups with common concerns
  lobbyingInProgress: boolean;
  selectedMPForDetail: string | null;
  filterSettings: MPFilterSettings;
  currentBudgetSupport: Map<string, DetailedMPStance>;
}

export type MPStanceLabel = 'support' | 'oppose' | 'undecided';

export interface DetailedMPStance {
  stance: MPStanceLabel;
  score: number;
  reason: string;
  concerns: string[];
  ideologicalAlignment: number;
  constituencyImpact: number;
  granularImpact: number;
  brokenPromisesCount: number;
  isManualOverride?: boolean;
  overrideTurn?: number;
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
    concernProfiles: new Map(),
    activeGroups: [],
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
    independent: 'bg-gray-600',
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
 * Evaluate how well a single budget parameter change aligns with an MP's concern
 */
function evaluateConcern(concern: MPConcern, changeAmount: number): number {
  // changeAmount is the difference from baseline (positive = increase, negative = decrease)

  if (changeAmount === 0) {
    // No change - neutral unless MP wants change
    return concern.direction === 'maintain' ? 1 : 0;
  }

  // Check if change aligns with MP's preferred direction
  if (changeAmount > 0) {
    // Budget parameter increased
    if (concern.direction === 'increase') {
      // MP wanted increase, got it - positive score scaled by magnitude
      return Math.min(5, changeAmount / 2); // Cap at +5
    } else if (concern.direction === 'decrease') {
      // MP wanted decrease, got opposite - negative score
      return Math.max(-5, -changeAmount / 2); // Cap at -5
    } else {
      // MP wanted maintain, got increase - slight negative
      return -0.5;
    }
  } else {
    // Budget parameter decreased (changeAmount < 0)
    const absChange = Math.abs(changeAmount);
    if (concern.direction === 'decrease') {
      // MP wanted decrease, got it - positive score
      return Math.min(5, absChange / 2);
    } else if (concern.direction === 'increase') {
      // MP wanted increase, got opposite - negative score
      return Math.max(-5, -absChange / 2);
    } else {
      // MP wanted maintain, got decrease - slight negative
      return -0.5;
    }
  }
}

/**
 * Calculate granular impact of all budget parameters on an MP's concerns
 */
export function calculateGranularBudgetImpact(
  mp: MPProfile,
  detailedTaxRates: Map<string, number>,      // 52 tax parameters with changes from baseline
  detailedSpendingBudgets: Map<string, number> // 36 spending parameters with changes from baseline
): number {
  let totalImpact = 0;
  let evaluatedConcerns = 0;

  // Generate MP concern profile (cached in future optimisation)
  const concernProfile = generateMPConcernProfile(mp);

  // Evaluate each tax parameter change
  detailedTaxRates.forEach((changeAmount, taxId) => {
    const concern = concernProfile.concerns.find(c => c.budgetParameter === taxId);
    if (concern) {
      const score = evaluateConcern(concern, changeAmount);
      totalImpact += score * concern.priority;
      evaluatedConcerns++;
    }
  });

  // Evaluate each spending parameter change
  detailedSpendingBudgets.forEach((changeAmount, spendingId) => {
    const concern = concernProfile.concerns.find(c => c.budgetParameter === spendingId);
    if (concern) {
      const score = evaluateConcern(concern, changeAmount);
      totalImpact += score * concern.priority;
      evaluatedConcerns++;
    }
  });

  // Normalise to -50 to +50 range (consistent with ideological alignment scoring)
  // Average impact per concern, weighted by priority, then scale
  if (evaluatedConcerns === 0) return 0;
  const averageImpact = totalImpact / evaluatedConcerns;
  return Math.max(-50, Math.min(50, averageImpact * 5)); // Scale and cap
}

/**
 * Generate comprehensive concern profile for an MP based on ideology and constituency
 */
export function generateMPConcernProfile(mp: MPProfile): MPConcernProfile {
  const concerns: MPConcern[] = [];

  // ========== IDEOLOGY-BASED CONCERNS ==========

  // LEFT-WING MPs (-7 to -3 economic axis)
  if (mp.ideology.economicAxis < -3) {
    concerns.push(
      {
        budgetParameter: 'corporationTaxMain', priority: 9, direction: 'increase',
        reason: 'Believes corporations should pay their fair share'
      },
      {
        budgetParameter: 'corporationTaxSmallProfits', priority: 7, direction: 'maintain',
        reason: 'Protects small businesses whilst raising revenue from large firms'
      },
      {
        budgetParameter: 'bankSurcharge', priority: 8, direction: 'increase',
        reason: 'Banks should contribute more after 2008 financial crisis'
      },
      {
        budgetParameter: 'incomeTaxAdditional', priority: 8, direction: 'increase',
        reason: 'The wealthy should pay progressively more'
      },
      {
        budgetParameter: 'capitalGainsBasic', priority: 7, direction: 'increase',
        reason: 'Capital income should be taxed like labour income'
      },
      {
        budgetParameter: 'capitalGainsHigher', priority: 7, direction: 'increase',
        reason: 'Higher earners benefit most from capital gains'
      },
      {
        budgetParameter: 'energyProfitsLevy', priority: 10, direction: 'increase',
        reason: 'Windfall tax on energy companies making excess profits'
      },
      {
        budgetParameter: 'nhsEngland', priority: 10, direction: 'increase',
        reason: 'Protect and expand the NHS'
      },
      {
        budgetParameter: 'socialCare', priority: 9, direction: 'increase',
        reason: 'Social care crisis requires urgent funding'
      },
      {
        budgetParameter: 'universalCredit', priority: 9, direction: 'increase',
        reason: 'Strengthen the social safety net'
      },
      {
        budgetParameter: 'housingBenefit', priority: 8, direction: 'increase',
        reason: 'Housing benefit caps hit vulnerable families'
      }
    );
  }

  // CENTRE-LEFT MPs (-3 to 0 economic axis)
  if (mp.ideology.economicAxis >= -3 && mp.ideology.economicAxis < 0) {
    concerns.push(
      {
        budgetParameter: 'corporationTaxMain', priority: 6, direction: 'maintain',
        reason: 'Balance competitiveness with revenue needs'
      },
      {
        budgetParameter: 'incomeTaxHigher', priority: 7, direction: 'increase',
        reason: 'High earners can afford to contribute more'
      },
      {
        budgetParameter: 'nhsEngland', priority: 9, direction: 'increase',
        reason: 'NHS wait times are unacceptable'
      },
      {
        budgetParameter: 'schools', priority: 8, direction: 'increase',
        reason: 'Education is an economic investment'
      },
      {
        budgetParameter: 'rdTaxCredit', priority: 7, direction: 'increase',
        reason: 'R&D investment drives productivity'
      }
    );
  }

  // BLAIRITE MPs (faction check takes precedence)
  if (mp.faction === 'blairite') {
    concerns.push(
      {
        budgetParameter: 'corporationTaxMain', priority: 8, direction: 'decrease',
        reason: 'Business-friendly environment attracts investment'
      },
      {
        budgetParameter: 'rdTaxCredit', priority: 9, direction: 'increase',
        reason: 'Innovation and R&D are key to growth'
      },
      {
        budgetParameter: 'pensionAllowance', priority: 7, direction: 'increase',
        reason: 'Incentivise private pension savings'
      },
      {
        budgetParameter: 'annualInvestmentAllowance', priority: 8, direction: 'increase',
        reason: 'Support business investment'
      },
      {
        budgetParameter: 'nhsEngland', priority: 7, direction: 'increase',
        reason: 'Modernise NHS delivery, not just more funding'
      }
    );
  }

  // FISCAL HAWKS (fiscalConservatism > 7)
  if (mp.ideology.fiscalConservatism > 7) {
    concerns.push(
      {
        budgetParameter: 'debtInterest', priority: 10, direction: 'decrease',
        reason: 'Debt servicing costs crowd out productive investment'
      },
      {
        budgetParameter: 'statePension', priority: 6, direction: 'decrease',
        reason: 'Spiralling pension costs require reform'
      },
      {
        budgetParameter: 'universalCredit', priority: 5, direction: 'decrease',
        reason: 'Welfare bill is unsustainable'
      },
      {
        budgetParameter: 'nhsEngland', priority: 5, direction: 'maintain',
        reason: 'NHS requires efficiency savings, not boundless increases'
      }
    );
    // Fiscal hawks care about all spending increases negatively
    const spendingIds = ['schools', 'nhsMentalHealth', 'defence', 'policing', 'transport'];
    spendingIds.forEach(id => {
      concerns.push({
        budgetParameter: id, priority: 6, direction: 'decrease',
        reason: 'Fiscal discipline requires spending restraint'
      });
    });
  }

  // ========== CONSTITUENCY-BASED CONCERNS ==========

  // Low income constituencies (< £30k median)
  if (mp.constituency.demographics.medianIncome < 30000) {
    concerns.push(
      {
        budgetParameter: 'universalCredit', priority: 10, direction: 'increase',
        reason: `Many constituents in ${mp.constituency.name} rely on Universal Credit`
      },
      {
        budgetParameter: 'housingBenefit', priority: 9, direction: 'increase',
        reason: 'High rent burden in constituency'
      },
      {
        budgetParameter: 'vatDomesticEnergy', priority: 9, direction: 'decrease',
        reason: 'Constituents struggle with energy bills'
      },
      {
        budgetParameter: 'vat', priority: 7, direction: 'decrease',
        reason: 'VAT increases hit low-income families hardest'
      },
      {
        budgetParameter: 'nhsEngland', priority: 9, direction: 'increase',
        reason: 'NHS is lifeline for constituents who cannot afford private care'
      },
      {
        budgetParameter: 'childBenefit', priority: 8, direction: 'increase',
        reason: 'Child poverty rates in constituency are concerning'
      }
    );
  }

  // High public sector employment (> 30%)
  if (mp.constituency.demographics.publicSectorDependency > 30) {
    concerns.push(
      {
        budgetParameter: 'policing', priority: 8, direction: 'increase',
        reason: 'Local police force is major employer in constituency'
      },
      {
        budgetParameter: 'schools', priority: 9, direction: 'increase',
        reason: 'Teachers and education staff are major local employers'
      },
      {
        budgetParameter: 'nhsEngland', priority: 8, direction: 'increase',
        reason: 'Hospital employs many constituents'
      },
      {
        budgetParameter: 'nhsPrimaryCare', priority: 7, direction: 'increase',
        reason: 'GP practices employ local staff'
      }
    );
  }

  // Elderly constituencies
  if (mp.constituency.demographics.ageProfile === 'elderly') {
    concerns.push(
      {
        budgetParameter: 'statePension', priority: 10, direction: 'increase',
        reason: 'Pensioners are core voters in constituency'
      },
      {
        budgetParameter: 'socialCare', priority: 10, direction: 'increase',
        reason: 'Care home crisis affects many families in constituency'
      },
      {
        budgetParameter: 'nhsPrimaryCare', priority: 9, direction: 'increase',
        reason: 'GP waiting times unacceptable for elderly constituents'
      },
      {
        budgetParameter: 'nhsEngland', priority: 9, direction: 'increase',
        reason: 'Older constituents rely heavily on NHS'
      },
      {
        budgetParameter: 'insurancePremiumTax', priority: 7, direction: 'decrease',
        reason: 'Older constituents hit hardest by insurance costs'
      }
    );
  }

  // Rural constituencies
  const ruralRegions: RegionUK[] = ['southwest', 'wales', 'scotland', 'northernireland'];
  if (ruralRegions.includes(mp.constituency.region)) {
    concerns.push(
      {
        budgetParameter: 'farmSubsidies', priority: 9, direction: 'increase',
        reason: 'Agriculture is economic backbone of constituency'
      },
      {
        budgetParameter: 'localRoads', priority: 8, direction: 'increase',
        reason: 'Rural roads in poor condition, vital for local economy'
      },
      {
        budgetParameter: 'fuelDuty', priority: 8, direction: 'decrease',
        reason: 'No public transport alternative for rural constituents'
      }
    );
  }

  // Red Wall seats (northeast, yorkshire, northwest Labour)
  if (mp.party === 'labour' && ['northeast', 'yorkshire', 'northwest'].includes(mp.constituency.region)) {
    concerns.push(
      {
        budgetParameter: 'localGovernment', priority: 9, direction: 'increase',
        reason: 'Levelling up requires investment in local services'
      },
      {
        budgetParameter: 'transport', priority: 8, direction: 'increase',
        reason: 'Northern transport infrastructure lagging behind London'
      },
      {
        budgetParameter: 'localRoads', priority: 7, direction: 'increase',
        reason: 'Local infrastructure investment key to levelling up promise'
      }
    );
  }

  // Scottish constituencies
  if (mp.constituency.region === 'scotland') {
    concerns.push(
      {
        budgetParameter: 'localGovernment', priority: 8, direction: 'increase',
        reason: 'Scottish local authorities facing funding crisis'
      }
    );
  }

  // London constituencies
  if (mp.constituency.region === 'london') {
    concerns.push(
      {
        budgetParameter: 'transport', priority: 8, direction: 'increase',
        reason: 'TfL funding and public transport investment needed'
      },
      {
        budgetParameter: 'housingAffordable', priority: 9, direction: 'increase',
        reason: 'Housing affordability crisis in London'
      }
    );
  }

  // Marginal constituencies (> 70 marginality) - double weighting on all concerns
  if (mp.constituency.marginality > 70) {
    concerns.forEach(c => {
      c.priority = Math.min(10, c.priority * 1.5); // Cap at 10
      c.reason += ' (Marginal seat - voters will punish broken promises)';
    });
  }

  // ========== MINISTER CONCERNS ==========

  // Ministers prioritise fiscal credibility and avoiding market panic
  if (mp.isMinister) {
    concerns.push(
      {
        budgetParameter: 'debtInterest', priority: 8, direction: 'decrease',
        reason: 'As a minister, worried about gilt market reaction'
      },
      {
        budgetParameter: 'incomeTaxBasic', priority: 7, direction: 'maintain',
        reason: 'Manifesto commitment weighs heavily on Cabinet'
      }
    );
  }

  // ========== FINALISE PROFILE ==========

  // Sort by priority (highest first) and deduplicate
  const uniqueConcerns = new Map<string, MPConcern>();
  concerns.forEach(concern => {
    const existing = uniqueConcerns.get(concern.budgetParameter);
    if (!existing || existing.priority < concern.priority) {
      uniqueConcerns.set(concern.budgetParameter, concern);
    }
  });

  const sortedConcerns = Array.from(uniqueConcerns.values())
    .sort((a, b) => b.priority - a.priority);

  const primaryIssues = sortedConcerns.slice(0, 5).map(c => c.budgetParameter);

  return { mpId: mp.id, concerns: sortedConcerns, primaryIssues };
}

/**
 * Calculate MP's stance on current budget
 */
/**
 * Calculate the stance of a single MP towards a budget
 */
export function calculateMPStance(
  mp: MPProfile,
  budgetChanges: BudgetChanges,
  manifestoViolations: string[],
  promises: Map<string, MPPromise>,
  currentMonth: number = 0,
  context?: { whipStrength?: number; taxDistribution?: 'regressive' | 'neutral' | 'progressive' | null },
): DetailedMPStance {
  let supportScore = 50; // Start neutral
  let reason = "Neutral starting point.";
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
    (p) => p.promisedToMPs.includes(mp.id) && !p.broken && p.fulfilled !== true
  );

  const inferredCompliance = mp.dealComplianceProbability
    ?? Math.max(0.55, Math.min(0.9, 0.8 - (mp.traits.rebelliousness * 0.02) + (mp.constituency.marginality > 70 ? 0.05 : 0)));

  const deterministicRoll = (seed: string): number => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    }
    return (hash % 1000) / 1000;
  };

  activePromisesToMP.forEach((promise) => {
    const roll = deterministicRoll(`${mp.id}:${promise.id}:${currentMonth}`);
    if (roll <= inferredCompliance) {
      supportScore += 10;
    } else {
      supportScore += 2;
    }
  });

  // 5. Constituency impact
  const constituencyImpact = calculateConstituencyImpact(mp.constituency, budgetChanges);
  supportScore += constituencyImpact * 3;

  // 5.5. Granular budget dial impact (NEW: evaluates all 88 parameters individually)
  const taxRatesMap = budgetChanges.detailedTaxRates instanceof Map
    ? budgetChanges.detailedTaxRates
    : (budgetChanges.detailedTaxRates ? new Map(Object.entries(budgetChanges.detailedTaxRates)) : new Map());

  const spendingBudgetsMap = budgetChanges.detailedSpendingBudgets instanceof Map
    ? budgetChanges.detailedSpendingBudgets
    : (budgetChanges.detailedSpendingBudgets ? new Map(Object.entries(budgetChanges.detailedSpendingBudgets)) : new Map());

  const granularImpact = calculateGranularBudgetImpact(
    mp,
    taxRatesMap as Map<string, number>,
    spendingBudgetsMap as Map<string, number>
  );
  supportScore += granularImpact; // Already scaled to -50 to +50

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
  let adjustedScore = supportScore;
  if (context?.taxDistribution === 'regressive' && mp.party === 'labour' && (mp.faction === 'left' || mp.faction === 'soft_left' || mp.faction === 'centre_left')) {
    adjustedScore -= 2;
  } else if (context?.taxDistribution === 'progressive' && mp.party === 'labour' && (mp.faction === 'blairite' || mp.faction === 'party_loyalist')) {
    adjustedScore -= 2;
  }
  const stance: MPStanceLabel = adjustedScore > 62 ? 'support' : (adjustedScore < 42 ? 'oppose' : 'undecided');

  // Formulate reason
  if (stance === 'support') {
    reason = mp.party === 'labour'
      ? "Broadly supports the government's direction and local impact."
      : "A rare cross-party supporter, influenced by local benefits or specific policies.";
  } else if (stance === 'oppose') {
    reason = mp.party === 'labour'
      ? "Opposing the government due to ideological differences or negative constituency impact."
      : "Standard opposition to the government's fiscal plan.";
  } else {
    reason = "Hesitant and awaiting further concessions or clarity on key impacts.";
  }

  // Add specific concern-based details to concerns array in future if needed
  // For now we'll just return the score components

  return {
    stance,
    score: adjustedScore,
    reason,
    concerns: [], // Populated by granular impact analysis in future
    ideologicalAlignment,
    constituencyImpact,
    granularImpact,
    brokenPromisesCount: brokenPromisesToMP.length,
  };
}

/**
 * Calculate all MPs' stances for current budget
 */
export function calculateAllMPStances(
  mpSystem: MPSystemState,
  budgetChanges: BudgetChanges,
  manifestoViolations: string[],
  currentMonth?: number,
  context?: { whipStrength?: number; taxDistribution?: 'regressive' | 'neutral' | 'progressive' | null }
): Map<string, DetailedMPStance> {
  const stances = new Map<string, DetailedMPStance>();

  const allMPsRaw: any = (mpSystem as any)?.allMPs;

  const applyForMP = (mp: MPProfile, mpId: string) => {
    // Sinn Fein never take their seats - always undecided/abstain
    if (mp.party === 'sinn_fein') {
      stances.set(mpId, {
        stance: 'undecided',
        score: 50,
        reason: 'Sinn Fein MPs do not take their seats in Westminster.',
        concerns: [],
        ideologicalAlignment: 0,
        constituencyImpact: 0,
        granularImpact: 0,
        brokenPromisesCount: 0,
      });
    } else if (mp.party !== 'labour') {
      // All other opposition parties always oppose Labour budgets
      stances.set(mpId, {
        stance: 'oppose',
        score: 20,
        reason: 'Opposition party MP - voting against the government budget by default.',
        concerns: [],
        ideologicalAlignment: 0,
        constituencyImpact: 0,
        granularImpact: 0,
        brokenPromisesCount: 0,
      });
    } else {
      // Check for manual override (lobbying/persuasion)
      // This ensures that successfully lobbied MPs stay supportive during the drafting phase
      // Overrides only last until the next budget submission OR next month
      const existingStance = mpSystem.currentBudgetSupport.get(mpId);
      const isStillValid = existingStance?.isManualOverride && (currentMonth === undefined || existingStance.overrideTurn === currentMonth);

      if (isStillValid) {
        stances.set(mpId, existingStance!);
      } else {
        const stance = calculateMPStance(
          mp,
          budgetChanges,
          manifestoViolations,
          mpSystem.promises,
          currentMonth ?? 0,
          context,
        );
        let finalStance = stance;
        const whipStrength = context?.whipStrength;
        if (mp.party === 'labour' && whipStrength !== undefined) {
          if (finalStance.stance === 'undecided') {
            const supportProb = Math.max(0, Math.min(1, whipStrength / 100));
            if (Math.random() < supportProb) {
              finalStance = { ...finalStance, stance: 'support', score: Math.max(finalStance.score, 63), reason: 'Persuaded by the whip operation to support the government.' };
            }
          } else if (whipStrength < 40 && finalStance.stance === 'support' && Math.random() < 0.15) {
            finalStance = { ...finalStance, stance: 'undecided', score: 52, reason: 'With weak whipping, this MP abstains despite nominal support.' };
          }
        }
        stances.set(mpId, finalStance);
      }
    }
  };

  // Runtime robustness: projections/serialization can temporarily turn Maps into objects/arrays.
  // We accept Map, array-of-[id, mp] entries, or a plain object record.
  if (allMPsRaw instanceof Map) {
    allMPsRaw.forEach((mp: MPProfile, mpId: string) => applyForMP(mp, mpId));
  } else if (Array.isArray(allMPsRaw)) {
    allMPsRaw.forEach((entry: any) => {
      if (Array.isArray(entry) && entry.length === 2) {
        const [mpId, mp] = entry as [string, MPProfile];
        if (typeof mpId === 'string' && mp) applyForMP(mp, mpId);
      }
    });
  } else if (allMPsRaw && typeof allMPsRaw === 'object') {
    Object.entries(allMPsRaw).forEach(([mpId, mp]) => {
      if (typeof mpId === 'string' && mp) applyForMP(mp as MPProfile, mpId);
    });
  }

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
    mpId: mpIds[0],
    category,
    description,
    specificValue,
    turnMade: currentMonth,
    madeInMonth: currentMonth,
    deadline: currentMonth + 3,
    fulfilled: null,
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
    if (promise.fulfilled !== true && !promise.broken) {
      const isFulfilled = checkPromiseFulfillment(promise, budgetChanges);

      if (isFulfilled) {
        promise.fulfilled = true;
      } else if (promise.deadline !== undefined && currentMonth > promise.deadline) {
        // Promise not fulfilled - mark as broken
        promise.broken = true;
        promise.fulfilled = false;
        promise.brokenBy = 'player';
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

export function calculateLobbyingSuccessProbability(
  mp: MPProfile,
  approach: LobbyingApproach,
  promise?: MPPromise,
  brokenPromisesCount: number = 0
): number {
  let successProbability = 0;
  switch (approach) {
    case 'promise':
      successProbability = 0.70;
      break;
    case 'persuade':
      successProbability = 0.40;
      break;
    case 'threaten':
      successProbability = 0.55;
      break;
  }

  if (mp.traits.rebelliousness > 7) {
    successProbability *= 0.6;
  }

  if (approach === 'threaten') {
    if (mp.traits.principled > 7) {
      successProbability *= 0.5;
    }
    if (mp.traits.careerist > 7) {
      successProbability *= 1.4;
    }
  }

  if (approach === 'promise' && promise) {
    successProbability *= 1.1;
  }

  if (brokenPromisesCount > 0) {
    successProbability *= Math.pow(0.8, brokenPromisesCount);
  }

  if (mp.constituency.marginality > 70) {
    successProbability *= 1.2;
  }

  return Math.max(0.05, Math.min(0.95, successProbability));
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
  const successProbability = calculateLobbyingSuccessProbability(mp, approach, promise, brokenPromisesCount);

  // Determine success
  const success = Math.random() < successProbability;

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
// Group Lobbying
// ===========================

export interface GroupLobbyingResult {
  success: boolean;
  promise?: MPPromise;
  spokespersonResponse: string;
  bindingMembers: number;
  counterDemand?: {
    category: PromiseCategory;
    minimumValue: number;
    reason: string;
  };
}

/**
 * Lobby an entire MP group through their spokesperson
 */
export function lobbyGroup(
  group: MPGroup,
  allMPs: Map<string, MPProfile>,
  promiseCategory: PromiseCategory,
  specificValue: number,
  currentMonth: number
): GroupLobbyingResult {
  const spokesperson = allMPs.get(group.spokespersonId)!;

  // Check if promise category matches group's primary concern
  const demandsMet = checkGroupDemandsSatisfied(group, promiseCategory, specificValue);

  if (demandsMet) {
    // Success: All group members get the promise
    const promise = createPromise(
      promiseCategory,
      group.memberIds,
      `Group promise to ${group.name}: ${getPromiseCategoryName(promiseCategory)} £${specificValue}bn`,
      currentMonth,
      specificValue
    );

    const response = generateGroupSuccessResponse(spokesperson, group, specificValue, promiseCategory);

    return {
      success: true,
      promise,
      spokespersonResponse: response,
      bindingMembers: group.memberIds.length
    };
  } else {
    // Failure: Spokesperson rejects on behalf of group
    const counterDemand = calculateCounterDemand(group, specificValue);
    const response = generateGroupRejectionResponse(spokesperson, group, specificValue, promiseCategory, counterDemand);

    return {
      success: false,
      spokespersonResponse: response,
      bindingMembers: 0,
      counterDemand
    };
  }
}

/**
 * Check if promise category and value meet group demands
 */
function checkGroupDemandsSatisfied(
  group: MPGroup,
  promiseCategory: PromiseCategory,
  specificValue: number
): boolean {
  // Map budget parameter concerns to promise categories
  const concernToCategory: Record<string, PromiseCategory> = {
    'nhsEngland': 'nhs_spending',
    'nhsPrimaryCare': 'nhs_spending',
    'nhsMentalHealth': 'nhs_spending',
    'socialCare': 'nhs_spending',
    'schools': 'education_spending',
    'pupilPremium': 'education_spending',
    'universalCredit': 'welfare_protection',
    'housingBenefit': 'welfare_protection',
    'childBenefit': 'welfare_protection',
    'statePension': 'welfare_protection',
    'corporationTaxMain': 'tax_rises_avoid', // Left wants corp tax raised, not cut
    'energyProfitsLevy': 'fiscal_discipline', // Windfall tax = fiscal responsibility
    'defence': 'defence_spending',
    'transport': 'regional_investment',
    'localGovernment': 'regional_investment',
    'farmSubsidies': 'regional_investment',
  };

  if (group.commonConcerns.length === 0) return false;

  const topConcern = group.commonConcerns[0];
  const requiredCategory = concernToCategory[topConcern.budgetParameter];

  // Category must match
  if (requiredCategory !== promiseCategory) return false;

  // Value must meet minimum threshold (£5bn for major spending, £10bn for NHS groups)
  const minimumThreshold = topConcern.budgetParameter.includes('nhs') ? 10 : 5;
  if (specificValue < minimumThreshold) return false;

  // Cohesion matters - higher cohesion groups are harder to satisfy
  const cohesionMultiplier = 1 + (group.cohesion / 200); // 1.0 to 1.5x
  return specificValue >= minimumThreshold * cohesionMultiplier;
}

/**
 * Calculate what the group actually demands as counter-offer
 */
function calculateCounterDemand(
  group: MPGroup,
  offeredValue: number
): { category: PromiseCategory; minimumValue: number; reason: string } {
  if (group.commonConcerns.length === 0) {
    return {
      category: 'nhs_spending',
      minimumValue: 10,
      reason: 'We need substantial investment to address our concerns'
    };
  }

  const topConcern = group.commonConcerns[0];

  // Map to category
  const concernToCategory: Record<string, PromiseCategory> = {
    'nhsEngland': 'nhs_spending',
    'schools': 'education_spending',
    'universalCredit': 'welfare_protection',
    'policing': 'regional_investment',
    'transport': 'regional_investment',
  };

  const category = concernToCategory[topConcern.budgetParameter] || 'nhs_spending';
  const baseMinimum = topConcern.budgetParameter.includes('nhs') ? 10 : 5;
  const cohesionMultiplier = 1 + (group.cohesion / 200);
  const minimumValue = Math.ceil(baseMinimum * cohesionMultiplier);

  return {
    category,
    minimumValue,
    reason: topConcern.reason
  };
}

/**
 * Generate success response from group spokesperson
 */
function generateGroupSuccessResponse(
  spokesperson: MPProfile,
  group: MPGroup,
  value: number,
  category: PromiseCategory
): string {
  const categoryName = getPromiseCategoryName(category);
  return `${spokesperson.name}, speaking for the ${group.name}, responds: "Chancellor, we represent ${group.memberIds.length} Labour MPs. Your commitment of £${value}bn for ${categoryName} addresses our concerns. You have our support, but we'll be watching closely to ensure you deliver."`;
}

/**
 * Generate rejection response from group spokesperson
 */
function generateGroupRejectionResponse(
  spokesperson: MPProfile,
  group: MPGroup,
  offeredValue: number,
  category: PromiseCategory,
  counterDemand: { minimumValue: number; reason: string }
): string {
  const categoryName = getPromiseCategoryName(category);
  return `${spokesperson.name} responds on behalf of the ${group.name}: "I've consulted with our ${group.memberIds.length} members. Whilst we appreciate the offer of £${offeredValue}bn for ${categoryName}, it falls well short of what's needed. ${counterDemand.reason}. We need at least £${counterDemand.minimumValue}bn to secure our support."`;
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

function normalizeStances(
  stances:
    | Map<string, DetailedMPStance | MPStanceLabel>
    | Record<string, DetailedMPStance | MPStanceLabel>
    | Array<[string, DetailedMPStance | MPStanceLabel]>
    | null
    | undefined
): Map<string, DetailedMPStance | MPStanceLabel> {
  if (stances instanceof Map) {
    return stances;
  }

  const result = new Map<string, DetailedMPStance | MPStanceLabel>();
  if (!stances) return result;

  if (Array.isArray(stances)) {
    stances.forEach((entry) => {
      if (Array.isArray(entry) && entry.length === 2 && typeof entry[0] === 'string') {
        result.set(entry[0], entry[1]);
      }
    });
    return result;
  }

  if (typeof stances === 'object') {
    Object.entries(stances).forEach(([key, value]) => {
      result.set(key, value as DetailedMPStance | MPStanceLabel);
    });
    return result;
  }

  return result;
}

export function getStanceCounts(
  stances:
    | Map<string, DetailedMPStance | MPStanceLabel>
    | Record<string, DetailedMPStance | MPStanceLabel>
    | Array<[string, DetailedMPStance | MPStanceLabel]>
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
  normalizedStances.forEach((detailedStance) => {
    const stance = typeof detailedStance === 'string' ? detailedStance : detailedStance.stance;
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
  currentStances?: Map<string, DetailedMPStance | MPStanceLabel>
): MPProfile[] {
  let filtered = Array.from(allMPs.values());
  // ... (rest should be updated to handle DetailedMPStance)


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
    filtered = filtered.filter((mp) => {
      const mpStance = currentStances.get(mp.id);
      const stanceLabel = typeof mpStance === 'string' ? mpStance : mpStance?.stance;
      return stanceLabel === filterSettings.stance;
    });
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
  stance?: DetailedMPStance | MPStanceLabel;
  votingRecord?: VotingRecord;
  brokenPromisesCount: number;
  onLobby?: (mpId: string) => void;
  onViewDetails?: (mpId: string) => void;
}> = ({ mp, stance, votingRecord, brokenPromisesCount, onLobby, onViewDetails }) => {
  const partyColor = getPartyColor(mp.party);
  const partyName = getPartyName(mp.party);

  const detailedStance = typeof stance === 'string' ? null : stance;
  const stanceLabel = typeof stance === 'string' ? stance : stance?.stance;

  const getStanceBadge = () => {
    if (!stanceLabel) return null;
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
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colors[stanceLabel]}`}>
        {labels[stanceLabel]}
      </span>
    );
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Name and Party */}
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-lg text-gray-900">{mp.name}</h3>
            <span className={`px-2 py-0.5 rounded text-xs text-white ${partyColor}`}>
              {partyName}
            </span>
            {mp.faction && (
              <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                {getFactionName(mp.faction)}
              </span>
            )}
          </div>

          {/* Constituency */}
          <div className="text-sm text-gray-600 mb-2">
            {mp.constituency.name}
            {mp.constituency.marginality > 60 && (
              <span className="ml-2 text-orange-600 font-semibold">
                (Marginal {mp.constituency.marginality}%)
              </span>
            )}
          </div>

          {/* Stats Row */}
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <span>Loyalty: {votingRecord?.loyaltyScore || 100}%</span>
            <span>Rebellions: {votingRecord?.rebellionCount || 0}</span>
            {brokenPromisesCount > 0 && (
              <span className="text-red-600 font-bold flex items-center gap-1">
                {brokenPromisesCount} broken {brokenPromisesCount === 1 ? 'promise' : 'promises'}
              </span>
            )}
          </div>

          {/* Stance Reason (New) */}
          {detailedStance && (
            <div className="mt-2 text-xs text-gray-500 italic">
              &quot;{detailedStance.reason}&quot;
            </div>
          )}
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
                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded font-semibold"
              >
                Details
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Minister Badge */}
      {mp.isMinister && (
        <div className="mt-2 pt-2 border-t border-gray-100">
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

  const activeFilters = useMemo<MPFilterSettings>(() => ({
    ...filterSettings,
    searchQuery: searchQuery || undefined,
  }), [filterSettings, searchQuery]);

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

  const promiseRows = useMemo(() => {
    return Array.from(mpSystem.promises.values())
      .sort((a, b) => (b.madeInMonth || 0) - (a.madeInMonth || 0))
      .slice(0, 8)
      .map((promise) => {
        const sampleMP = promise.promisedToMPs.length > 0 ? mpSystem.allMPs.get(promise.promisedToMPs[0]) : undefined;
        let status = 'pending';
        if (promise.broken) {
          status = promise.brokenBy === 'mp' ? 'broken by MP' : 'broken by player';
        } else if (promise.fulfilled === true) {
          status = 'fulfilled';
        }

        return {
          id: promise.id,
          mpName: sampleMP?.name || `${promise.promisedToMPs.length} MP${promise.promisedToMPs.length === 1 ? '' : 's'}`,
          description: promise.description,
          deadline: promise.deadline,
          status,
        };
      });
  }, [mpSystem.promises, mpSystem.allMPs]);

  const narrativeRows = useMemo(() => {
    return Array.from(normalizedStances.entries())
      .map(([mpId, stance]) => {
        if (typeof stance === 'string') return null;
        const mp = mpSystem.allMPs.get(mpId);
        if (!mp || mp.party !== 'labour') return null;
        return {
          mp,
          stance,
          swing: Math.abs((stance.score ?? 50) - 50),
        };
      })
      .filter((entry): entry is { mp: MPProfile; stance: DetailedMPStance; swing: number } => !!entry)
      .sort((a, b) => a.swing - b.swing)
      .slice(0, 5)
      .map(({ mp, stance }) => `${mp.name} (${getPartyName(mp.party)}, ${mp.constituency.name}) — ${stance.stance === 'support' ? 'Supporting' : stance.stance === 'oppose' ? 'Opposing' : 'Undecided'}: ${stance.reason}`);
  }, [normalizedStances, mpSystem.allMPs]);

  // Count by party
  const partyCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    mpSystem.allMPs.forEach((mp) => {
      counts[mp.party] = (counts[mp.party] || 0) + 1;
    });
    return counts;
  }, [mpSystem.allMPs]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="max-w-7xl mx-auto">
          {onBack && (
            <button
              onClick={onBack}
              className="mb-4 text-red-900 hover:text-red-700 font-semibold flex items-center gap-2"
            >
              ← Back to Dashboard
            </button>
          )}
          <h1 className="text-3xl font-bold text-gray-900 mb-2">MPs & Parliament</h1>
          <p className="text-gray-600">
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
              <label className="block text-sm font-semibold text-gray-700 mb-1">Party</label>
              <select
                value={filterSettings.party || ''}
                onChange={(e) =>
                  setFilterSettings({ ...filterSettings, party: e.target.value as PartyAffiliation || undefined })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
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
                <label className="block text-sm font-semibold text-gray-700 mb-1">Faction</label>
                <select
                  value={filterSettings.faction || ''}
                  onChange={(e) =>
                    setFilterSettings({ ...filterSettings, faction: e.target.value as LabourFaction || undefined })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
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
              <label className="block text-sm font-semibold text-gray-700 mb-1">Stance</label>
              <select
                value={filterSettings.stance || ''}
                onChange={(e) =>
                  setFilterSettings({ ...filterSettings, stance: e.target.value as 'support' | 'oppose' | 'undecided' || undefined })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">All Stances</option>
                <option value="support">Support</option>
                <option value="oppose">Oppose</option>
                <option value="undecided">Undecided</option>
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Search</label>
              <input
                type="text"
                placeholder="MP name or constituency..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>

          {/* Support Summary */}
          <div className="flex items-center gap-6 pt-4 border-t border-gray-200">
            <div className="text-sm">
              <span className="font-semibold text-gray-700">Current Budget Support:</span>
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

          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Active deals and promises</h3>
              <div className="space-y-2">
                {promiseRows.length === 0 ? (
                  <div className="text-xs text-gray-500">No active or recent deals recorded.</div>
                ) : promiseRows.map((row) => (
                  <div key={row.id} className="border border-gray-200 rounded-sm p-2 text-xs">
                    <div className="font-semibold text-gray-800">{row.mpName}</div>
                    <div className="text-gray-600">{row.description}</div>
                    <div className="text-gray-500 mt-1">Status: {row.status}{row.deadline !== undefined ? ` · Deadline turn ${row.deadline}` : ''}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Parliamentary narrative summary</h3>
              <div className="space-y-2">
                {narrativeRows.length === 0 ? (
                  <div className="text-xs text-gray-500">Narrative updates appear after stance calculations complete.</div>
                ) : narrativeRows.map((row, index) => (
                  <div key={`${index}-${row}`} className="border border-gray-200 rounded-sm p-2 text-xs text-gray-700">
                    {row}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* MP List */}
        <div className="space-y-3">
          {filteredMPs.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-600">
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
        <div className="mt-4 text-center text-sm text-gray-600">
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
  const successProbability = calculateLobbyingSuccessProbability(mp, selectedApproach, undefined, brokenPromisesCount);
  const displayedSuccessRate = Math.round(successProbability * 100);

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
                      {displayedSuccessRate}%
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
                      {displayedSuccessRate}%
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
                      {displayedSuccessRate}%
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
              {isLobbying ? 'Lobbying...' : `Lobby MP (${displayedSuccessRate}% chance)`}
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
  stance?: DetailedMPStance | MPStanceLabel;
  onClose: () => void;
}> = ({ mp, votingRecord, promises, stance, onClose }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'ideology' | 'voting' | 'promises' | 'constituency'>('profile');

  const detailedStance = typeof stance === 'string' ? null : stance;
  const stanceLabel = typeof stance === 'string' ? stance : stance?.stance;

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
          {stanceLabel && (
            <div className="mt-2 flex items-center gap-3">
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
                  <span className={`inline-block ${colors[stanceLabel]} px-3 py-1 rounded-full text-sm font-semibold shadow-sm`}>
                    {labels[stanceLabel]}
                  </span>
                );
              })()}

              {detailedStance && (
                <div className="text-xs bg-white bg-opacity-10 px-2 py-1 rounded">
                  Support Score: {detailedStance.score.toFixed(1)}
                </div>
              )}
            </div>
          )}

          {detailedStance && (
            <div className="mt-3 text-sm italic opacity-90 border-l-2 border-white pl-3">
              &quot;{detailedStance.reason}&quot;
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
  const namedNarratives: string[] = [];

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
      const mpStanceLabel = typeof stance === 'string' ? stance : stance?.stance;

      if (mpStanceLabel === 'support') {
        // Supporters almost always vote with the whip, with occasional tactical abstentions.
        const hasDeal = Array.from(mpSystem.promises.values()).some(
          (promise) => promise.promisedToMPs.includes(mpId) && !promise.broken
        );
        const dealComplianceProbability = mp.dealComplianceProbability
          ?? Math.max(0.55, Math.min(0.9, 0.8 - (mp.traits.rebelliousness * 0.02) + (mp.constituency.marginality > 70 ? 0.05 : 0)));

        const ayeChance = hasDeal
          ? dealComplianceProbability
          : (mp.isMinister ? 0.995 : (0.9 - mp.traits.rebelliousness * 0.01));
        if (Math.random() < ayeChance) {
          voteChoices.set(mpId, 'aye');
          ayesCount++;
        } else {
          if (hasDeal && Math.random() < 0.45) {
            voteChoices.set(mpId, 'noe');
            noesCount++;
            keyRebels.push(mp.name);
          } else {
            voteChoices.set(mpId, 'abstain');
            abstentionsCount++;
          }
        }
      } else if (mpStanceLabel === 'oppose') {
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

  const candidateNarratives = Array.from(mpSystem.allMPs.values())
    .filter((mp) => mp.party === 'labour')
    .map((mp) => {
      const stance = stances.get(mp.id);
      if (!stance || typeof stance === 'string') return null;
      return {
        mp,
        stance,
        swingScore: Math.abs((stance.score ?? 50) - 50),
      };
    })
    .filter((entry): entry is { mp: MPProfile; stance: DetailedMPStance; swingScore: number } => !!entry)
    .sort((a, b) => a.swingScore - b.swingScore)
    .slice(0, 5);

  candidateNarratives.forEach(({ mp, stance }) => {
    const stanceText = stance.stance === 'support' ? 'Supporting' : stance.stance === 'oppose' ? 'Opposing' : 'Undecided';
    namedNarratives.push(`${mp.name} (${getPartyName(mp.party)}, ${mp.constituency.name}) — ${stanceText}: ${stance.reason}`);
  });

  keyRebelsNarrative.push(...namedNarratives);

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
