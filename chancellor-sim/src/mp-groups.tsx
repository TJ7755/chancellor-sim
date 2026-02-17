// MP Group Formation and Management
// Automatically identifies MPs with common concerns and forms negotiation groups

import {
  MPProfile,
  MPConcern,
  MPConcernProfile,
  RegionUK,
  BudgetChanges,
  generateMPConcernProfile,
  DetailedMPStance,
  MPStanceLabel
} from './mp-system';

// ===========================
// Type Definitions
// ===========================

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
  demandThreshold?: number;                  // Specific value needed (e.g., £10bn)
  isActive: boolean;                         // Currently pressing demands
  formedInMonth: number;
}

// ===========================
// Helper Functions
// ===========================

/**
 * Find most common element in array
 */
function mostCommon<T>(arr: T[]): T {
  const counts = new Map<T, number>();
  arr.forEach(item => counts.set(item, (counts.get(item) || 0) + 1));
  let maxCount = 0;
  let mostCommonItem = arr[0];
  counts.forEach((count, item) => {
    if (count > maxCount) {
      maxCount = count;
      mostCommonItem = item;
    }
  });
  return mostCommonItem;
}

/**
 * Select group spokesperson based on traits
 * Priority: high principled trait, moderate rebelliousness (5-8), not overly ambitious
 */
function selectSpokesperson(members: MPProfile[]): MPProfile {
  return members.sort((a, b) => {
    const scoreA = a.traits.principled * 2 +
      (a.traits.rebelliousness >= 5 && a.traits.rebelliousness <= 8 ? 10 : 0) -
      a.traits.ambition +
      (a.isMinister ? -5 : 0); // Ministers less likely to lead rebellions
    const scoreB = b.traits.principled * 2 +
      (b.traits.rebelliousness >= 5 && b.traits.rebelliousness <= 8 ? 10 : 0) -
      b.traits.ambition +
      (b.isMinister ? -5 : 0);
    return scoreB - scoreA;
  })[0];
}

/**
 * Generate readable group name based on concerns and membership
 */
function generateGroupName(concerns: MPConcern[], members: MPProfile[]): string {
  if (concerns.length === 0) return 'Concerned Labour MPs';

  const topConcern = concerns[0];

  // Map budget parameters to readable group names
  const nameMap: Record<string, string> = {
    'nhsEngland': 'NHS Protection Group',
    'nhsPrimaryCare': 'Primary Care Defence Group',
    'nhsMentalHealth': 'Mental Health Campaign Group',
    'socialCare': 'Social Care Crisis Group',
    'universalCredit': 'Welfare Defence Coalition',
    'housingBenefit': 'Housing Support Group',
    'childBenefit': 'Family Support Group',
    'corporationTaxMain': 'Progressive Tax Group',
    'energyProfitsLevy': 'Windfall Tax Campaign',
    'bankSurcharge': 'Financial Sector Reform Group',
    'schools': 'Education First Group',
    'policing': 'Law & Order Group',
    'statePension': 'Pensioner Protection Group',
    'farmSubsidies': 'Rural Britain Group',
    'localGovernment': 'Local Services Coalition',
    'transport': 'Infrastructure Investment Group'
  };

  if (nameMap[topConcern.budgetParameter]) {
    return nameMap[topConcern.budgetParameter];
  }

  // Check if group is faction-based (>70% same faction)
  const leftMPs = members.filter(m => m.faction === 'left').length;
  if (leftMPs / members.length > 0.7) {
    return 'Socialist Campaign Group Coalition';
  }

  const softLeftMPs = members.filter(m => m.faction === 'soft_left').length;
  if (softLeftMPs / members.length > 0.7) {
    return 'Soft Left Group';
  }

  // Check if group is region-based (>60% same region)
  const regions = members.map(m => m.constituency.region);
  const dominantRegion = mostCommon(regions);
  const regionCount = regions.filter(r => r === dominantRegion).length;

  if (regionCount / regions.length > 0.6) {
    const regionNames: Record<RegionUK, string> = {
      'northeast': 'Red Wall MPs',
      'northwest': 'Northern Labour Group',
      'yorkshire': 'Yorkshire Labour Group',
      'eastmidlands': 'East Midlands Group',
      'westmidlands': 'West Midlands Group',
      'eastengland': 'East of England Group',
      'london': 'London Labour Group',
      'southeast': 'South East Group',
      'southwest': 'South West Group',
      'wales': 'Welsh Labour Group',
      'scotland': 'Scottish Labour Group',
      'northernireland': 'Northern Ireland Group'
    };
    return regionNames[dominantRegion] || 'Regional Labour Group';
  }

  return 'Concerned Labour MPs';
}

/**
 * Find common concerns shared by group members
 */
function findCommonConcerns(
  members: MPProfile[],
  concernProfiles: Map<string, MPConcernProfile>
): MPConcern[] {
  // Count how many MPs share each concern
  const concernCounts = new Map<string, { count: number, concern: MPConcern }>();

  for (const mp of members) {
    const profile = concernProfiles.get(mp.id);
    if (!profile) continue;

    // Consider top 5 concerns per MP
    for (const concern of profile.concerns.slice(0, 5)) {
      const key = concern.budgetParameter;
      if (!concernCounts.has(key)) {
        concernCounts.set(key, { count: 0, concern });
      }
      const entry = concernCounts.get(key)!;
      entry.count++;
    }
  }

  // Return concerns shared by at least 60% of group
  const threshold = members.length * 0.6;
  return Array.from(concernCounts.values())
    .filter(({ count }) => count >= threshold)
    .sort((a, b) => b.count - a.count)
    .map(({ concern }) => concern)
    .slice(0, 3); // Top 3 common concerns
}

/**
 * Calculate group cohesion (0-100) based on how aligned members are
 */
function calculateCohesion(members: MPProfile[], commonConcerns: MPConcern[]): number {
  if (members.length === 0 || commonConcerns.length === 0) return 50;

  // Base cohesion on:
  // 1. Number of shared concerns (more = higher cohesion)
  // 2. Ideological similarity
  // 3. Regional clustering

  let cohesion = 40; // Base

  // Shared concerns boost
  cohesion += commonConcerns.length * 10;

  // Ideological similarity
  const avgEconomicAxis = members.reduce((sum, m) => sum + m.ideology.economicAxis, 0) / members.length;
  const economicVariance = members.reduce((sum, m) => sum + Math.abs(m.ideology.economicAxis - avgEconomicAxis), 0) / members.length;
  cohesion += Math.max(0, 20 - economicVariance * 2);

  // Regional clustering
  const regions = members.map(m => m.constituency.region);
  const dominantRegion = mostCommon(regions);
  const regionPercentage = regions.filter(r => r === dominantRegion).length / regions.length;
  if (regionPercentage > 0.7) cohesion += 10;

  return Math.min(100, Math.max(0, cohesion));
}

/**
 * Generate description of what the group demands
 */
function generateDemandDescription(concerns: MPConcern[]): string {
  if (concerns.length === 0) return 'Various policy changes';

  const topConcern = concerns[0];
  const actionWord = topConcern.direction === 'increase' ? 'increase' :
    topConcern.direction === 'decrease' ? 'reduce' : 'maintain';

  const concernNames: Record<string, string> = {
    'nhsEngland': 'NHS England funding',
    'nhsPrimaryCare': 'primary care funding',
    'nhsMentalHealth': 'mental health services funding',
    'socialCare': 'social care funding',
    'universalCredit': 'Universal Credit payments',
    'corporationTaxMain': 'corporation tax rate',
    'energyProfitsLevy': 'energy windfall tax',
    'schools': 'schools funding',
    'statePension': 'state pension',
    'policing': 'police funding',
    'transport': 'transport infrastructure investment'
  };

  const concernName = concernNames[topConcern.budgetParameter] || topConcern.budgetParameter;

  if (concerns.length === 1) {
    return `Demands to ${actionWord} ${concernName}`;
  } else if (concerns.length === 2) {
    const secondConcern = concerns[1];
    const secondName = concernNames[secondConcern.budgetParameter] || secondConcern.budgetParameter;
    const secondAction = secondConcern.direction === 'increase' ? 'increase' :
      secondConcern.direction === 'decrease' ? 'reduce' : 'maintain';
    return `Demands to ${actionWord} ${concernName} and ${secondAction} ${secondName}`;
  } else {
    return `Demands to ${actionWord} ${concernName} and address ${concerns.length - 1} other concerns`;
  }
}

/**
 * Generate formation reason explanation
 */
function generateFormationReason(concerns: MPConcern[]): string {
  if (concerns.length === 0) return 'Shared concerns about budget direction';

  const topConcern = concerns[0];
  return topConcern.reason;
}

// ===========================
// Main Group Formation Algorithm
// ===========================

/**
 * Identify and form MP groups based on shared concerns
 * Minimum 5 MPs required to form a group
 */
export function identifyMPGroups(
  allMPs: Map<string, MPProfile>,
  currentBudgetSupport: Map<string, DetailedMPStance>,
  concernProfiles: Map<string, MPConcernProfile>,
  budgetChanges: BudgetChanges,
  currentMonth: number
): MPGroup[] {
  const groups: MPGroup[] = [];
  const assignedMPs = new Set<string>();

  // Only consider Labour MPs who oppose or are undecided
  const concernedLabourMPs = Array.from(allMPs.values()).filter(mp =>
    mp.party === 'labour' &&
    (currentBudgetSupport.get(mp.id)?.stance === 'oppose' ||
      currentBudgetSupport.get(mp.id)?.stance === 'undecided') &&
    !assignedMPs.has(mp.id)
  );

  console.log(`[MP Groups] Identifying groups from ${concernedLabourMPs.length} concerned Labour MPs`);

  // Clustering by shared primary concerns
  const concernClusters = new Map<string, string[]>(); // concern key -> MP IDs

  for (const mp of concernedLabourMPs) {
    const profile = concernProfiles.get(mp.id);
    if (!profile || profile.primaryIssues.length === 0) {
      // Generate profile if missing
      const newProfile = generateMPConcernProfile(mp);
      concernProfiles.set(mp.id, newProfile);
      if (newProfile.primaryIssues.length === 0) continue;
    }

    const profile2 = concernProfiles.get(mp.id)!;
    // Use top 2 primary issues for clustering, sorted for consistent grouping
    const topConcerns = profile2.primaryIssues.slice(0, 2).sort().join('|');

    if (!concernClusters.has(topConcerns)) {
      concernClusters.set(topConcerns, []);
    }
    concernClusters.get(topConcerns)!.push(mp.id);
  }

  console.log(`[MP Groups] Found ${concernClusters.size} potential concern clusters`);

  // Convert clusters to groups (minimum 5 MPs to form group)
  concernClusters.forEach((mpIds, concernKey) => {
    if (mpIds.length >= 5) {
      const members = mpIds.map((id: string) => allMPs.get(id)!).filter(Boolean);

      if (members.length < 5) return; // return acts as continue in forEach

      const spokesperson = selectSpokesperson(members);
      const commonConcerns = findCommonConcerns(members, concernProfiles);

      if (commonConcerns.length === 0) return; // Skip if no common concerns

      const group: MPGroup = {
        id: `group_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        name: generateGroupName(commonConcerns, members),
        spokespersonId: spokesperson.id,
        memberIds: mpIds,
        commonConcerns,
        formationReason: generateFormationReason(commonConcerns),
        cohesion: calculateCohesion(members, commonConcerns),
        votingPower: mpIds.length,
        demandDescription: generateDemandDescription(commonConcerns),
        demandThreshold: undefined, // Set by specific concern logic if needed
        isActive: true,
        formedInMonth: currentMonth
      };

      console.log(`[MP Groups] Formed "${group.name}" with ${group.memberIds.length} members, spokesperson: ${spokesperson.name}`);
      groups.push(group);
      mpIds.forEach((id: string) => assignedMPs.add(id));
    }
  });

  // Sort groups by voting power (largest first)
  groups.sort((a, b) => b.votingPower - a.votingPower);

  // Limit to top 8 groups to prevent UI clutter
  const limitedGroups = groups.slice(0, 8);

  console.log(`[MP Groups] Returning ${limitedGroups.length} active groups (${assignedMPs.size} MPs grouped)`);

  return limitedGroups;
}

/**
 * Check if groups should be recalculated based on significant MP stance shifts
 */
export function shouldRecalculateGroups(
  previousSupport: Map<string, DetailedMPStance>,
  currentSupport: Map<string, DetailedMPStance>,
  allMPs: Map<string, MPProfile>
): boolean {
  // Count Labour MPs who changed from support to oppose/undecided or vice versa
  let significantShifts = 0;

  currentSupport.forEach((currentStance, mpId) => {
    const mp = allMPs.get(mpId);
    if (!mp || mp.party !== 'labour') return;

    const current = currentSupport.get(mpId)?.stance;
    const previous = previousSupport.get(mpId)?.stance;
    if (!previous || !current) return;

    // Significant shift: support -> oppose/undecided OR oppose/undecided -> support
    if (
      (previous === 'support' && current !== 'support') ||
      (previous !== 'support' && current === 'support')
    ) {
      significantShifts++;
    }
  });

  // Recalculate if more than 10 MPs shifted
  return significantShifts > 10;
}
