import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  AdviserSystemState,
  generateAdviserOpinions,
  AdviserModal,
  AdviserType,
  SimulationState,
} from './adviser-system';
import { SpendingReviewState, useBudgetDraft, useGameActions, useGameState, writeSave } from './game-state';
import { simulateEnhancedParliamentaryVote, detectBrokenPromises } from './mp-system';
import { batchRecordBudgetVotes, markPromiseBroken } from './mp-storage';
import {
  FISCAL_RULES,
  FiscalRuleId,
  getFiscalRuleById,
  calculateRuleHeadroom,
  getRuleHeadroomLabel,
} from './game-integration';
import { calculateLafferPoint, getLafferTaxTypeForControlId } from './laffer-analysis';
import { INDUSTRIAL_INTERVENTION_CATALOGUE } from './data/industrial-interventions';
import type { BudgetDraft } from './state/budget-draft';
import { detectPolicyConflicts } from './domain/budget/policy-conflicts';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Debounce utility for delaying function execution until after a delay
 */
function debounce<T extends (...args: any[]) => void>(func: T, delay: number): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, delay);
  };
}

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

interface TaxChange {
  id: string;
  name: string;
  currentRate: number;
  proposedRate: number;
  currentRevenue: number;
  projectedRevenue: number;
  unit: string;
}

interface SpendingChange {
  id: string;
  department: string;
  programme?: string;
  currentBudget: number;
  proposedBudget: number;
  type: 'resource' | 'capital';
}

interface ManifestoConstraint {
  id: string;
  description: string;
  type: 'tax_lock' | 'spending_pledge' | 'fiscal_rule';
  violated: boolean;
  severity: 'critical' | 'major' | 'minor';
}

interface AdviserWarning {
  id: string;
  category: 'fiscal' | 'political' | 'economic' | 'market';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  impact?: string;
}

// ============================================================================
// PARLIAMENTARY VOTE SIMULATION
// ============================================================================

interface VoteResult {
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
  individualVotes?: Map<string, 'aye' | 'noe' | 'abstain'>;
}

function simulateParliamentaryVote(
  backbenchSatisfaction: number,
  manifestoViolations: number,
  deficitChange: number,
  fiscalRulesMet: boolean,
  taxIncreaseCount: number,
  spendingCutCount: number,
  pmTrust: number
): VoteResult {
  // Labour majority: 411 seats, Opposition: 232 voting seats (excl. 7 Sinn Fein who abstain + 1 Speaker)
  // Government needs 326 to pass (simple majority of 650)
  // So can afford 85 rebels before losing vote (411 - 326 = 85)
  const totalOppositionMPs = 232;

  // Calculate rebellion probability for each MP
  // Base loyalty depends on backbench satisfaction
  const baseLoyalty = backbenchSatisfaction / 100;

  // Manifesto violations make rebellion more likely
  const manifestoPenalty = manifestoViolations * 0.08;

  // Radical budgets (large deficit changes) increase rebellion
  const radicalismPenalty =
    Math.abs(deficitChange) > 20 ? 0.15 : Math.abs(deficitChange) > 10 ? 0.08 : Math.abs(deficitChange) > 5 ? 0.04 : 0;

  // Fiscal rules breach is toxic
  const fiscalRulesPenalty = fiscalRulesMet ? 0 : 0.12;

  // Tax increases anger different factions
  const taxPenalty = taxIncreaseCount * 0.03;

  // Spending cuts anger the left
  const spendingCutPenalty = spendingCutCount * 0.04;

  // PM backing helps whipping
  const pmBackingBonus = pmTrust > 60 ? 0.05 : pmTrust < 30 ? -0.08 : 0;

  // Calculate effective loyalty probability
  const effectiveLoyalty = Math.max(
    0.1,
    Math.min(
      0.98,
      baseLoyalty -
        manifestoPenalty -
        radicalismPenalty -
        fiscalRulesPenalty -
        taxPenalty -
        spendingCutPenalty +
        pmBackingBonus
    )
  );

  // Simulate 200 backbenchers + ~211 frontbench/payroll MPs
  // Frontbench always votes with government (convention)
  const payrollVote = 211; // Ministers, PPSs, whips

  let backbenchAyes = 0;
  let backbenchNoes = 0;
  let backbenchAbstentions = 0;

  // Simulate 200 backbenchers with individual rolls
  for (let i = 0; i < 200; i++) {
    const roll = Math.random();
    // Add individual variation (some MPs are more rebellious)
    const individualVariation = (Math.random() - 0.5) * 0.2;
    const mpLoyalty = effectiveLoyalty + individualVariation;

    if (roll < mpLoyalty) {
      backbenchAyes++;
    } else if (roll < mpLoyalty + 0.15) {
      // Some rebels abstain rather than voting against
      backbenchAbstentions++;
    } else {
      backbenchNoes++;
    }
  }

  const totalAyes = payrollVote + backbenchAyes;
  const rebellCount = backbenchNoes + backbenchAbstentions;

  // Opposition always votes against the budget
  const oppositionNoes = totalOppositionMPs;

  const totalNoes = oppositionNoes + backbenchNoes;
  const governmentMajority = totalAyes - totalNoes;
  const passed = governmentMajority > 0;

  // Generate key rebel descriptions
  const keyRebels: string[] = [];
  if (backbenchNoes > 30) {
    keyRebels.push('A large group of left-wing MPs voted against, citing broken manifesto commitments');
  }
  if (backbenchNoes > 15 && taxIncreaseCount > 0) {
    keyRebels.push('Several MPs in marginal seats rebelled over tax increases affecting their constituents');
  }
  if (backbenchAbstentions > 10) {
    keyRebels.push('A significant number of MPs abstained, signalling deep unease within the parliamentary party');
  }
  if (backbenchNoes > 0 && !fiscalRulesMet) {
    keyRebels.push(
      'Fiscal hawks within the party voted against after the OBR confirmed the budget breaches fiscal rules'
    );
  }

  const voteProfileIndex =
    (Math.abs(governmentMajority) + backbenchNoes + backbenchAbstentions + manifestoViolations) % 3;

  const pressurePoints: string[] = [];
  if (manifestoViolations > 0) {
    pressurePoints.push(`${manifestoViolations} manifesto pledge${manifestoViolations === 1 ? '' : 's'} broken`);
  }
  if (!fiscalRulesMet) {
    pressurePoints.push('fiscal framework credibility concerns');
  }
  if (taxIncreaseCount >= 2) {
    pressurePoints.push('broad-based tax rises');
  }
  if (spendingCutCount >= 2) {
    pressurePoints.push('visible spending restraint');
  }
  if (pmTrust < 35) {
    pressurePoints.push('weak PM authority in the PLP');
  }

  const pressureSummary = pressurePoints.length > 0 ? ` Key flashpoints: ${pressurePoints.join(', ')}.` : '';

  const abstentionSummary =
    backbenchAbstentions > 0
      ? ` ${backbenchAbstentions} Labour MP${backbenchAbstentions === 1 ? '' : 's'} abstained.`
      : '';

  const dissentWordSet = ['dissent', 'breakaway vote', 'internal split'];
  const dissentWord = dissentWordSet[voteProfileIndex];

  // Narrative summary - dynamic based on vote pattern and policy context
  let narrativeSummary: string;
  if (!passed) {
    const defeatLeads = [
      `The Budget falls by ${Math.abs(governmentMajority)} votes after a coordinated backbench revolt.`,
      `The government loses the division by ${Math.abs(governmentMajority)} votes, with the Treasury operation breaking down on the day.`,
      `The Commons rejects the Budget by ${Math.abs(governmentMajority)} votes, handing the Chancellor a major political setback.`,
    ];
    const defeatLead = defeatLeads[voteProfileIndex];
    narrativeSummary = `${defeatLead} ${backbenchNoes} Labour MP${backbenchNoes === 1 ? '' : 's'} voted against the government.${abstentionSummary}${pressureSummary} The Chancellor must now either revise the package immediately or seek direct intervention from No.10.`;
  } else if (governmentMajority < 20) {
    const narrowWinLeads = [
      `The Budget scrapes through by ${governmentMajority} votes.`,
      `The government survives by just ${governmentMajority} votes in a knife-edge division.`,
      `The Budget passes by a wafer-thin margin of ${governmentMajority}.`,
    ];
    narrativeSummary = `${narrowWinLeads[voteProfileIndex]} ${backbenchNoes} Labour MP${backbenchNoes === 1 ? '' : 's'} voted against.${abstentionSummary}${pressureSummary}`;
  } else if (backbenchNoes > 40) {
    const dissentLeads = [
      `The Budget passes, but ${backbenchNoes} Labour MPs vote against the whip in a major show of defiance.`,
      `The government wins the vote, yet the scale of Labour dissent (${backbenchNoes} MPs) dominates the political story.`,
      `The division is won, but ${backbenchNoes} Labour MPs break ranks, signalling a deep fracture.`,
    ];
    narrativeSummary = `${dissentLeads[voteProfileIndex]} Majority: ${governmentMajority}.${abstentionSummary}${pressureSummary}`;
  } else if (backbenchNoes > 15) {
    narrativeSummary = `The Budget passes with a majority of ${governmentMajority}, but dissent is clear: ${backbenchNoes} Labour MPs voted against.${abstentionSummary}${pressureSummary}`;
  } else if (backbenchNoes > 0 || backbenchAbstentions > 0) {
    narrativeSummary = `The Budget passes with a solid majority of ${governmentMajority}. ${dissentWord.charAt(0).toUpperCase() + dissentWord.slice(1)} is contained (${backbenchNoes} noes${backbenchAbstentions > 0 ? `, ${backbenchAbstentions} abstentions` : ''}), though warning signs remain on party management.${pressureSummary}`;
  } else {
    const unityLeads = [
      `The Budget passes with a commanding majority of ${governmentMajority} and full Labour unity.`,
      `The Commons approves the Budget by ${governmentMajority} votes with no Labour dissent.`,
      `A disciplined parliamentary operation delivers a majority of ${governmentMajority} with zero Labour defections.`,
    ];
    narrativeSummary = `${unityLeads[voteProfileIndex]}${pressureSummary}`;
  }

  // Whip assessment
  let whipAssessment: string;
  if (backbenchNoes === 0 && backbenchAbstentions <= 2) {
    whipAssessment =
      pmTrust >= 55
        ? 'Chief Whip: operation executed cleanly. PM authority is holding and discipline remains high.'
        : 'Chief Whip: despite wider tensions, the vote was held together effectively this time.';
  } else if (backbenchNoes <= 8) {
    whipAssessment = 'Chief Whip: low-level dissent, manageable with targeted engagement before the next fiscal vote.';
  } else if (backbenchNoes <= 25) {
    whipAssessment =
      'Chief Whip: medium-scale backbench resistance. Several caucuses now expect policy concessions to stay on side.';
  } else if (backbenchNoes <= 50) {
    whipAssessment =
      pmTrust < 35
        ? 'Chief Whip: serious revolt with clear leadership fragility. Whips cannot guarantee future votes without a reset.'
        : 'Chief Whip: serious revolt. Parliamentary discipline is weakening and requires immediate political repair.';
  } else {
    whipAssessment =
      'Chief Whip: full-spectrum breakdown in party discipline. The party machine is no longer containing dissent and your position is at acute risk.';
  }

  return {
    ayes: totalAyes,
    noes: totalNoes,
    abstentions: backbenchAbstentions,
    governmentMajority,
    passed,
    rebellCount,
    oppositionVotes: oppositionNoes,
    narrativeSummary,
    keyRebels,
    whipAssessment,
  };
}

// Parliamentary Vote Modal Component
const ParliamentaryVoteModal: React.FC<{
  voteResult: VoteResult;
  onContinue: () => void;
  onWithdraw: () => void;
}> = ({ voteResult, onContinue, onWithdraw }) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-elevated max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-border-strong">
        {/* House of Commons header */}
        <div className="bg-primary text-white p-6">
          <div className="text-center">
            <div className="text-sm uppercase tracking-widest opacity-80 mb-1">House of Commons</div>
            <h2 className="text-3xl font-display">Budget Division</h2>
            <div className="text-sm mt-2 opacity-90">That the Financial Statement and Budget Report be approved</div>
          </div>
        </div>

        {/* Vote result banner */}
        <div className={`p-6 text-center ${voteResult.passed ? 'bg-good-subtle' : 'bg-bad-subtle'}`}>
          <div className={`text-4xl font-display ${voteResult.passed ? 'text-good' : 'text-bad'}`}>
            {voteResult.passed ? 'THE AYES HAVE IT' : 'THE NOES HAVE IT'}
          </div>
          <div className="text-lg text-secondary mt-2">
            Ayes: {voteResult.ayes} — Noes: {voteResult.noes}
          </div>
          <div className="text-sm text-tertiary mt-1">
            Government majority: {voteResult.governmentMajority > 0 ? '+' : ''}
            {voteResult.governmentMajority}
            {voteResult.abstentions > 0 && ` · ${voteResult.abstentions} abstentions`}
          </div>
        </div>

        {/* Division numbers */}
        <div className="p-6">
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="bg-good-subtle border border-good p-4 text-center">
              <div className="text-sm text-good font-semibold uppercase mb-1">Ayes Lobby</div>
              <div className="text-5xl font-display text-good">{voteResult.ayes}</div>
              <div className="text-xs text-good mt-2">Government frontbench + loyal backbenchers</div>
            </div>
            <div className="bg-bad-subtle border border-bad p-4 text-center">
              <div className="text-sm text-bad font-semibold uppercase mb-1">Noes Lobby</div>
              <div className="text-5xl font-display text-bad">{voteResult.noes}</div>
              <div className="text-xs text-bad mt-2">
                Opposition + {voteResult.rebellCount - voteResult.abstentions} government dissenting vote
                {voteResult.rebellCount - voteResult.abstentions !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          {/* Narrative */}
          <div className="bg-subdued border border-border-strong p-4 mb-4">
            <p className="text-primary leading-relaxed">{voteResult.narrativeSummary}</p>
          </div>

          {/* Whip assessment */}
          <div className="bg-warning-subtle border border-warning p-4 mb-4">
            <div className="text-xs font-bold text-warning uppercase mb-1">Chief Whip's Assessment</div>
            <p className="text-warning text-sm">{voteResult.whipAssessment}</p>
          </div>

          {/* Vote dynamics details */}
          {voteResult.keyRebels.length > 0 && (
            <div className="mb-4">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-sm text-secondary hover:text-primary font-semibold"
              >
                {showDetails ? 'Hide vote dynamics' : 'Show vote dynamics'}
              </button>
              {showDetails && (
                <div className="mt-2 space-y-2">
                  {voteResult.keyRebels.map((rebel, idx) => (
                    <div key={idx} className="bg-subdued border-l-4 border-bad pl-3 py-2 text-sm text-secondary">
                      {rebel}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-4 mt-6">
            {voteResult.passed ? (
              <button
                onClick={onContinue}
                className="flex-1 bg-primary hover:bg-primary-hover text-white font-bold py-3 px-6 transition-colors"
              >
                Budget Enacted — Continue
              </button>
            ) : (
              <>
                <button
                  onClick={onWithdraw}
                  className="flex-1 bg-bad hover:bg-bad-hover text-white font-bold py-3 px-6 transition-colors"
                >
                  Withdraw Budget and Revise
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// PM Intervention Modal Component
const PMInterventionModal: React.FC<{
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-elevated max-w-2xl w-full border border-border-strong">
        {/* Header */}
        <div className="bg-warning text-white p-6">
          <div className="text-center">
            <h2 className="text-3xl font-display">Force PM Intervention</h2>
            <div className="text-sm mt-2 opacity-90">Nuclear Option</div>
          </div>
        </div>

        {/* Warning Content */}
        <div className="p-6">
          <div className="bg-bad-subtle border border-bad p-4 mb-6">
            <div className="flex items-start gap-3">
              <span className="text-bad text-xl flex-shrink-0 mt-0.5">⚠</span>
              <div>
                <h3 className="font-bold text-bad text-lg mb-2">Severe Political Consequences</h3>
                <p className="text-bad text-sm">
                  The Prime Minister will personally intervene to force all 411 Labour MPs to vote for this budget. This
                  is an extreme measure that will have lasting political damage.
                </p>
              </div>
            </div>
          </div>

          {/* Consequences List */}
          <div className="space-y-3 mb-6">
            <h3 className="font-bold text-primary text-lg mb-3">Immediate Consequences:</h3>

            <div className="flex items-center gap-3 bg-bad-subtle border border-bad p-3">
              <div className="flex-1">
                <div className="font-semibold text-primary">PM Trust: -20 points</div>
                <div className="text-sm text-secondary">The Prime Minister's authority is severely undermined</div>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-bad-subtle border border-bad p-3">
              <div className="flex-1">
                <div className="font-semibold text-primary">Backbench Satisfaction: -15 points</div>
                <div className="text-sm text-secondary">MPs are furious at being coerced</div>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-bad-subtle border border-bad p-3">
              <div className="flex-1">
                <div className="font-semibold text-primary">Government Approval: -8 points</div>
                <div className="text-sm text-secondary">Public sees government as authoritarian and divided</div>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-warning-subtle border border-warning p-3">
              <div className="flex-1">
                <div className="font-semibold text-primary">WARNING: Future rebellion risk +50%</div>
                <div className="text-sm text-secondary">MPs will be much more likely to rebel on future votes</div>
              </div>
            </div>
          </div>

          {/* Guarantee */}
          <div className="bg-good-subtle border border-good p-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-good text-lg">✓</span>
              <div className="font-semibold text-good">
                Guarantee: Budget WILL pass with all 411 Labour MPs voting aye
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={onCancel}
              className="flex-1 px-6 py-3 bg-subdued hover:bg-bg-subdued text-primary font-semibold border border-border-strong transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-6 py-3 bg-bad hover:bg-bad-hover text-white font-bold transition-colors"
            >
              Confirm PM Intervention
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface FiscalImpact {
  currentDeficit: number;
  projectedDeficit: number;
  deficitChange: number;
  currentDebt: number;
  projectedDebt: number;
  debtGDPRatio: number;
  debtChange: number;
  fiscalRulesMet: boolean;
  headroom: number;
}

// ============================================================================
// INITIAL DATA
// ============================================================================

const INITIAL_TAXES = {
  incomeTaxBasic: {
    id: 'incomeTaxBasic',
    name: 'Income Tax - Basic Rate',
    currentRate: 20,
    proposedRate: 20,
    currentRevenue: 269,
    projectedRevenue: 269,
    unit: '%',
  },
  incomeTaxHigher: {
    id: 'incomeTaxHigher',
    name: 'Income Tax - Higher Rate',
    currentRate: 40,
    proposedRate: 40,
    currentRevenue: 0, // Included in total
    projectedRevenue: 0,
    unit: '%',
  },
  incomeTaxAdditional: {
    id: 'incomeTaxAdditional',
    name: 'Income Tax - Additional Rate',
    currentRate: 45,
    proposedRate: 45,
    currentRevenue: 0,
    projectedRevenue: 0,
    unit: '%',
  },
  personalAllowance: {
    id: 'personalAllowance',
    name: 'Personal Allowance',
    currentRate: 12570,
    proposedRate: 12570,
    currentRevenue: 0,
    projectedRevenue: 0,
    unit: '£',
  },
  employeeNI: {
    id: 'employeeNI',
    name: 'Employee National Insurance',
    currentRate: 8,
    proposedRate: 8,
    currentRevenue: 68,
    projectedRevenue: 68,
    unit: '%',
  },
  employerNI: {
    id: 'employerNI',
    name: 'Employer National Insurance',
    currentRate: 13.8,
    proposedRate: 13.8,
    currentRevenue: 96,
    projectedRevenue: 96,
    unit: '%',
  },
  vat: {
    id: 'vat',
    name: 'VAT Standard Rate',
    currentRate: 20,
    proposedRate: 20,
    currentRevenue: 171,
    projectedRevenue: 171,
    unit: '%',
  },
  corporationTax: {
    id: 'corporationTax',
    name: 'Corporation Tax - Main Rate',
    currentRate: 25,
    proposedRate: 25,
    currentRevenue: 88,
    projectedRevenue: 88,
    unit: '%',
  },
  corporationTaxSmall: {
    id: 'corporationTaxSmall',
    name: 'Corporation Tax - Small Profits Rate',
    currentRate: 19,
    proposedRate: 19,
    currentRevenue: 0,
    projectedRevenue: 0,
    unit: '%',
  },
  capitalGainsBasic: {
    id: 'capitalGainsBasic',
    name: 'Capital Gains Tax - Basic Rate',
    currentRate: 10,
    proposedRate: 10,
    currentRevenue: 15,
    projectedRevenue: 15,
    unit: '%',
  },
  capitalGainsHigher: {
    id: 'capitalGainsHigher',
    name: 'Capital Gains Tax - Higher Rate',
    currentRate: 20,
    proposedRate: 20,
    currentRevenue: 0,
    projectedRevenue: 0,
    unit: '%',
  },
  inheritanceTax: {
    id: 'inheritanceTax',
    name: 'Inheritance Tax Rate',
    currentRate: 40,
    proposedRate: 40,
    currentRevenue: 7.5,
    projectedRevenue: 7.5,
    unit: '%',
  },
  inheritanceTaxThreshold: {
    id: 'inheritanceTaxThreshold',
    name: 'Inheritance Tax Threshold',
    currentRate: 325000,
    proposedRate: 325000,
    currentRevenue: 0,
    projectedRevenue: 0,
    unit: '£',
  },
  stampDuty: {
    id: 'stampDuty',
    name: 'Stamp Duty Land Tax',
    currentRate: 0, // Variable rate structure
    proposedRate: 0,
    currentRevenue: 14,
    projectedRevenue: 14,
    unit: 'System',
  },
  fuelDuty: {
    id: 'fuelDuty',
    name: 'Fuel Duty',
    currentRate: 52.95,
    proposedRate: 52.95,
    currentRevenue: 25,
    projectedRevenue: 25,
    unit: 'p/litre',
  },
  councilTax: {
    id: 'councilTax',
    name: 'Council Tax (average Band D)',
    currentRate: 2171,
    proposedRate: 2171,
    currentRevenue: 46,
    projectedRevenue: 46,
    unit: '£',
  },
  businessRates: {
    id: 'businessRates',
    name: 'Business Rates Multiplier',
    currentRate: 54.6,
    proposedRate: 54.6,
    currentRevenue: 32,
    projectedRevenue: 32,
    unit: 'p/£',
  },
  alcoholDuty: {
    id: 'alcoholDuty',
    name: 'Alcohol Duties',
    currentRate: 100, // Index, 100 = current
    proposedRate: 100,
    currentRevenue: 13,
    projectedRevenue: 13,
    unit: 'Index',
  },
  tobaccoDuty: {
    id: 'tobaccoDuty',
    name: 'Tobacco Duty',
    currentRate: 100,
    proposedRate: 100,
    currentRevenue: 9,
    projectedRevenue: 9,
    unit: 'Index',
  },
  airPassengerDuty: {
    id: 'airPassengerDuty',
    name: 'Air Passenger Duty',
    currentRate: 100,
    proposedRate: 100,
    currentRevenue: 4,
    projectedRevenue: 4,
    unit: 'Index',
  },
  vehicleExciseDuty: {
    id: 'vehicleExciseDuty',
    name: 'Vehicle Excise Duty',
    currentRate: 180,
    proposedRate: 180,
    currentRevenue: 8,
    projectedRevenue: 8,
    unit: '£',
  },

  // ---- Income Tax Thresholds and Allowances ----
  higherRateThreshold: {
    id: 'higherRateThreshold',
    name: 'Higher Rate Threshold',
    currentRate: 50270,
    proposedRate: 50270,
    currentRevenue: 0,
    projectedRevenue: 0,
    unit: '£',
  },
  additionalRateThreshold: {
    id: 'additionalRateThreshold',
    name: 'Additional Rate Threshold',
    currentRate: 125140,
    proposedRate: 125140,
    currentRevenue: 0,
    projectedRevenue: 0,
    unit: '£',
  },
  marriageAllowance: {
    id: 'marriageAllowance',
    name: 'Marriage Allowance Transfer',
    currentRate: 1260,
    proposedRate: 1260,
    currentRevenue: 0,
    projectedRevenue: 0,
    unit: '£',
  },

  // ---- National Insurance Thresholds ----
  niPrimaryThreshold: {
    id: 'niPrimaryThreshold',
    name: 'NI Primary Threshold',
    currentRate: 12570,
    proposedRate: 12570,
    currentRevenue: 0,
    projectedRevenue: 0,
    unit: '£',
  },
  niUpperEarningsLimit: {
    id: 'niUpperEarningsLimit',
    name: 'NI Upper Earnings Limit',
    currentRate: 50270,
    proposedRate: 50270,
    currentRevenue: 0,
    projectedRevenue: 0,
    unit: '£',
  },
  niSecondaryThreshold: {
    id: 'niSecondaryThreshold',
    name: 'Employer NI Secondary Threshold',
    currentRate: 9100,
    proposedRate: 9100,
    currentRevenue: 0,
    projectedRevenue: 0,
    unit: '£',
  },
  employmentAllowance: {
    id: 'employmentAllowance',
    name: 'Employment Allowance',
    currentRate: 5000,
    proposedRate: 5000,
    currentRevenue: 0,
    projectedRevenue: 0,
    unit: '£',
  },

  // ---- VAT Exemptions and Reliefs ----
  vatDomesticEnergy: {
    id: 'vatDomesticEnergy',
    name: 'VAT on Domestic Energy',
    currentRate: 5,
    proposedRate: 5,
    currentRevenue: 5.5,
    projectedRevenue: 5.5,
    unit: '%',
  },
  vatPrivateSchools: {
    id: 'vatPrivateSchools',
    name: 'VAT on Private School Fees',
    currentRate: 20,
    proposedRate: 20,
    currentRevenue: 1.7,
    projectedRevenue: 1.7,
    unit: '%',
  },
  vatRegistrationThreshold: {
    id: 'vatRegistrationThreshold',
    name: 'VAT Registration Threshold',
    currentRate: 85000,
    proposedRate: 85000,
    currentRevenue: 0,
    projectedRevenue: 0,
    unit: '£',
  },

  // ---- Business Tax Reliefs ----
  annualInvestmentAllowance: {
    id: 'annualInvestmentAllowance',
    name: 'Annual Investment Allowance',
    currentRate: 1000000,
    proposedRate: 1000000,
    currentRevenue: 0,
    projectedRevenue: 0,
    unit: '£',
  },
  rdTaxCredit: {
    id: 'rdTaxCredit',
    name: 'R&D Tax Credit Enhanced Rate',
    currentRate: 27,
    proposedRate: 27,
    currentRevenue: 0,
    projectedRevenue: 0,
    unit: '%',
  },
  bankSurcharge: {
    id: 'bankSurcharge',
    name: 'Bank Corporation Tax Surcharge',
    currentRate: 3,
    proposedRate: 3,
    currentRevenue: 3.5,
    projectedRevenue: 3.5,
    unit: '%',
  },
  energyProfitsLevy: {
    id: 'energyProfitsLevy',
    name: 'Energy Profits Levy',
    currentRate: 35,
    proposedRate: 35,
    currentRevenue: 5.0,
    projectedRevenue: 5.0,
    unit: '%',
  },
  patentBoxRate: {
    id: 'patentBoxRate',
    name: 'Patent Box Rate',
    currentRate: 10,
    proposedRate: 10,
    currentRevenue: 1.2,
    projectedRevenue: 1.2,
    unit: '%',
  },

  // ---- Capital Gains Allowances ----
  cgtAnnualExempt: {
    id: 'cgtAnnualExempt',
    name: 'CGT Annual Exempt Amount',
    currentRate: 3000,
    proposedRate: 3000,
    currentRevenue: 0,
    projectedRevenue: 0,
    unit: '£',
  },
  cgtResidentialSurcharge: {
    id: 'cgtResidentialSurcharge',
    name: 'CGT Residential Property Surcharge',
    currentRate: 8,
    proposedRate: 8,
    currentRevenue: 2.5,
    projectedRevenue: 2.5,
    unit: '%',
  },
  badrRate: {
    id: 'badrRate',
    name: 'Business Asset Disposal Relief Rate',
    currentRate: 10,
    proposedRate: 10,
    currentRevenue: 0,
    projectedRevenue: 0,
    unit: '%',
  },
  badrLifetimeLimit: {
    id: 'badrLifetimeLimit',
    name: 'BADR Lifetime Limit',
    currentRate: 1000000,
    proposedRate: 1000000,
    currentRevenue: 0,
    projectedRevenue: 0,
    unit: '£',
  },

  // ---- Inheritance Tax Allowances ----
  ihtResidenceNilRate: {
    id: 'ihtResidenceNilRate',
    name: 'IHT Residence Nil Rate Band',
    currentRate: 175000,
    proposedRate: 175000,
    currentRevenue: 0,
    projectedRevenue: 0,
    unit: '£',
  },

  // ---- Property Transaction Taxes ----
  sdltAdditionalSurcharge: {
    id: 'sdltAdditionalSurcharge',
    name: 'SDLT Additional Property Surcharge',
    currentRate: 3,
    proposedRate: 3,
    currentRevenue: 2.0,
    projectedRevenue: 2.0,
    unit: '%',
  },
  sdltFirstTimeBuyerThreshold: {
    id: 'sdltFirstTimeBuyerThreshold',
    name: 'SDLT First-Time Buyer Threshold',
    currentRate: 425000,
    proposedRate: 425000,
    currentRevenue: 0,
    projectedRevenue: 0,
    unit: '£',
  },

  // ---- Savings and Investment Reliefs ----
  pensionAnnualAllowance: {
    id: 'pensionAnnualAllowance',
    name: 'Pension Annual Allowance',
    currentRate: 60000,
    proposedRate: 60000,
    currentRevenue: 0,
    projectedRevenue: 0,
    unit: '£',
  },
  isaAllowance: {
    id: 'isaAllowance',
    name: 'ISA Annual Allowance',
    currentRate: 20000,
    proposedRate: 20000,
    currentRevenue: 0,
    projectedRevenue: 0,
    unit: '£',
  },
  dividendAllowance: {
    id: 'dividendAllowance',
    name: 'Dividend Allowance',
    currentRate: 1000,
    proposedRate: 1000,
    currentRevenue: 0,
    projectedRevenue: 0,
    unit: '£',
  },

  // ---- Other Indirect Taxes ----
  insurancePremiumTax: {
    id: 'insurancePremiumTax',
    name: 'Insurance Premium Tax',
    currentRate: 12,
    proposedRate: 12,
    currentRevenue: 8,
    projectedRevenue: 8,
    unit: '%',
  },
  softDrinksLevy: {
    id: 'softDrinksLevy',
    name: 'Soft Drinks Industry Levy',
    currentRate: 100,
    proposedRate: 100,
    currentRevenue: 0.3,
    projectedRevenue: 0.3,
    unit: 'Index',
  },
};

// ============================================================================
// SPENDING RECONSTRUCTION FROM GAME STATE
// ============================================================================

/**
 * Reconstructs detailed budget item spending from current game state.
 * Scales INITIAL_SPENDING items proportionally based on how aggregate
 * departmental spending has changed in the game state.
 */
function reconstructSpendingFromGameState(gameState: any): Map<string, SpendingChange> {
  const detailedSpending = gameState?.fiscal?.detailedSpending;
  if (Array.isArray(detailedSpending) && detailedSpending.length > 0) {
    const spendingMap = new Map<string, SpendingChange>();

    Object.entries(INITIAL_SPENDING).forEach(([key, item]) => {
      spendingMap.set(key, { ...item });
    });

    detailedSpending.forEach((item: any) => {
      const existing = spendingMap.get(item.id);
      const inferredType: 'resource' | 'capital' =
        item.type === 'capital'
          ? 'capital'
          : item.type === 'resource'
            ? 'resource'
            : (item.capitalAllocation || 0) > 0 && (item.currentAllocation || 0) === 0
              ? 'capital'
              : 'resource';

      spendingMap.set(item.id, {
        id: item.id,
        department: item.department || existing?.department || 'Other',
        programme: item.programme || existing?.programme,
        currentBudget: typeof item.currentBudget === 'number' ? item.currentBudget : existing?.currentBudget || 0,
        proposedBudget: typeof item.currentBudget === 'number' ? item.currentBudget : existing?.currentBudget || 0,
        type: inferredType,
      });
    });

    return spendingMap;
  }

  // Get current game state spending (aggregates)
  const currentNHS = gameState.fiscal.spending.nhs;
  const currentEducation = gameState.fiscal.spending.education;
  const currentDefence = gameState.fiscal.spending.defence;
  const currentWelfare = gameState.fiscal.spending.welfare;
  const currentInfrastructure = gameState.fiscal.spending.infrastructure;
  const currentPolice = gameState.fiscal.spending.police;
  const currentJustice = gameState.fiscal.spending.justice;
  const currentOther = gameState.fiscal.spending.other;

  // Calculate baseline totals from INITIAL_SPENDING (category sums)
  const initialNHS = 221.9; // Health and Social Care total in INITIAL_SPENDING
  const initialEducation = 101.8; // Education total
  const initialDefence = 47.1; // Defence total
  const initialWelfare = 220.6; // Work and Pensions total
  const initialInfrastructure = 30.0; // Transport + Housing total
  const initialPolice = 17.2; // Home Office total
  const initialJustice = 10.2; // Justice total
  const initialOther = 26.0; // Environment + Science + Foreign Office (excluding debt interest)

  // Calculate scale factors (how much each department has grown/shrunk)
  const nhsScale = currentNHS / initialNHS;
  const educationScale = currentEducation / initialEducation;
  const defenceScale = currentDefence / initialDefence;
  const welfareScale = currentWelfare / initialWelfare;
  const infrastructureScale = currentInfrastructure / initialInfrastructure;
  const policeScale = currentPolice / initialPolice;
  const justiceScale = currentJustice / initialJustice;
  const otherScale = currentOther / initialOther;

  // Create new spending map by scaling each INITIAL_SPENDING item
  const spendingMap = new Map<string, SpendingChange>();

  Object.entries(INITIAL_SPENDING).forEach(([key, item]) => {
    let scaleFactor = 1.0;
    const dept = item.department.toLowerCase();

    // Determine which scale factor to use based on department
    if (dept.includes('health')) scaleFactor = nhsScale;
    else if (dept.includes('education')) scaleFactor = educationScale;
    else if (dept.includes('defence')) scaleFactor = defenceScale;
    else if (dept.includes('work') || dept.includes('pension')) scaleFactor = welfareScale;
    else if (dept.includes('transport') || dept.includes('housing')) scaleFactor = infrastructureScale;
    else if (dept.includes('home')) scaleFactor = policeScale;
    else if (dept.includes('justice')) scaleFactor = justiceScale;
    else if (!dept.includes('debt interest')) scaleFactor = otherScale;
    else scaleFactor = 1.0; // Debt interest handled separately by turn processor

    let scaledBudget = item.currentBudget * scaleFactor;

    // Use actual debt interest from game state instead of baseline
    if (item.id === 'debtInterest' && gameState.fiscal.debtInterest_bn !== undefined) {
      scaledBudget = gameState.fiscal.debtInterest_bn;
    }

    spendingMap.set(key, {
      id: item.id,
      department: item.department,
      programme: item.programme,
      currentBudget: scaledBudget,
      proposedBudget: scaledBudget,
      type: item.type,
    });
  });

  return spendingMap;
}

function reconstructTaxesFromGameState(gameState: any): Map<string, TaxChange> {
  const taxesMap = new Map<string, TaxChange>();

  Object.entries(INITIAL_TAXES).forEach(([key, tax]) => {
    taxesMap.set(key, { ...tax });
  });

  const fiscal = gameState?.fiscal;
  if (!fiscal) return taxesMap;

  const mainTaxMapping: Record<string, number | undefined> = {
    incomeTaxBasic: fiscal.incomeTaxBasicRate,
    incomeTaxHigher: fiscal.incomeTaxHigherRate,
    incomeTaxAdditional: fiscal.incomeTaxAdditionalRate,
    personalAllowance: fiscal.personalAllowance,
    higherRateThreshold: fiscal.basicRateUpperThreshold,
    additionalRateThreshold: fiscal.higherRateUpperThreshold,
    employeeNI: fiscal.nationalInsuranceRate,
    employerNI: fiscal.employerNIRate,
    vat: fiscal.vatRate,
    corporationTax: fiscal.corporationTaxRate,
    sdltAdditionalSurcharge: fiscal.sdltAdditionalDwellingsSurcharge,
  };

  Object.entries(mainTaxMapping).forEach(([id, rate]) => {
    const existing = taxesMap.get(id);
    if (existing && typeof rate === 'number') {
      taxesMap.set(id, {
        ...existing,
        currentRate: rate,
        proposedRate: rate,
      });
    }
  });

  if (Array.isArray(fiscal.detailedTaxes)) {
    fiscal.detailedTaxes.forEach((taxItem: any) => {
      const existing = taxesMap.get(taxItem.id);
      if (existing && typeof taxItem.currentRate === 'number') {
        taxesMap.set(taxItem.id, {
          ...existing,
          currentRate: taxItem.currentRate,
          proposedRate: taxItem.currentRate,
        });
      }
    });
  }

  return taxesMap;
}

const INITIAL_SPENDING = {
  // NHS and Health
  nhsEngland: {
    id: 'nhsEngland',
    department: 'Health and Social Care',
    programme: 'NHS England Revenue',
    currentBudget: 164.9,
    proposedBudget: 164.9,
    type: 'resource' as const,
  },
  nhsPrimaryCare: {
    id: 'nhsPrimaryCare',
    department: 'Health and Social Care',
    programme: 'Primary Care',
    currentBudget: 18.0,
    proposedBudget: 18.0,
    type: 'resource' as const,
  },
  nhsMentalHealth: {
    id: 'nhsMentalHealth',
    department: 'Health and Social Care',
    programme: 'Mental Health',
    currentBudget: 16.0,
    proposedBudget: 16.0,
    type: 'resource' as const,
  },
  publicHealth: {
    id: 'publicHealth',
    department: 'Health and Social Care',
    programme: 'Public Health',
    currentBudget: 3.5,
    proposedBudget: 3.5,
    type: 'resource' as const,
  },
  socialCare: {
    id: 'socialCare',
    department: 'Health and Social Care',
    programme: 'Social Care Grants',
    currentBudget: 7.5,
    proposedBudget: 7.5,
    type: 'resource' as const,
  },
  nhsCapital: {
    id: 'nhsCapital',
    department: 'Health and Social Care',
    programme: 'Capital Investment',
    currentBudget: 12.0,
    proposedBudget: 12.0,
    type: 'capital' as const,
  },

  // Education
  schools: {
    id: 'schools',
    department: 'Education',
    programme: 'Schools Core Funding',
    currentBudget: 59.4,
    proposedBudget: 59.4,
    type: 'resource' as const,
  },
  pupilPremium: {
    id: 'pupilPremium',
    department: 'Education',
    programme: 'Pupil Premium',
    currentBudget: 2.9,
    proposedBudget: 2.9,
    type: 'resource' as const,
  },
  furtherEducation: {
    id: 'furtherEducation',
    department: 'Education',
    programme: 'Further Education and Skills',
    currentBudget: 7.2,
    proposedBudget: 7.2,
    type: 'resource' as const,
  },
  higherEducation: {
    id: 'higherEducation',
    department: 'Education',
    programme: 'Higher Education',
    currentBudget: 1.8,
    proposedBudget: 1.8,
    type: 'resource' as const,
  },
  earlyYears: {
    id: 'earlyYears',
    department: 'Education',
    programme: 'Early Years',
    currentBudget: 8.0,
    proposedBudget: 8.0,
    type: 'resource' as const,
  },
  send: {
    id: 'send',
    department: 'Education',
    programme: 'SEND Support',
    currentBudget: 10.5,
    proposedBudget: 10.5,
    type: 'resource' as const,
  },
  schoolsCapital: {
    id: 'schoolsCapital',
    department: 'Education',
    programme: 'School Buildings and Infrastructure',
    currentBudget: 12.0,
    proposedBudget: 12.0,
    type: 'capital' as const,
  },

  // Defence
  armyRevenue: {
    id: 'armyRevenue',
    department: 'Defence',
    programme: 'Army',
    currentBudget: 11.0,
    proposedBudget: 11.0,
    type: 'resource' as const,
  },
  navyRevenue: {
    id: 'navyRevenue',
    department: 'Defence',
    programme: 'Royal Navy',
    currentBudget: 8.5,
    proposedBudget: 8.5,
    type: 'resource' as const,
  },
  rafRevenue: {
    id: 'rafRevenue',
    department: 'Defence',
    programme: 'Royal Air Force',
    currentBudget: 7.5,
    proposedBudget: 7.5,
    type: 'resource' as const,
  },
  nuclearDeterrent: {
    id: 'nuclearDeterrent',
    department: 'Defence',
    programme: 'Nuclear Deterrent',
    currentBudget: 3.5,
    proposedBudget: 3.5,
    type: 'resource' as const,
  },
  defenceEquipment: {
    id: 'defenceEquipment',
    department: 'Defence',
    programme: 'Equipment Plan',
    currentBudget: 16.6,
    proposedBudget: 16.6,
    type: 'capital' as const,
  },

  // Work and Pensions (AME - Annual Managed Expenditure)
  statePension: {
    id: 'statePension',
    department: 'Work and Pensions',
    programme: 'State Pension',
    currentBudget: 130.0,
    proposedBudget: 130.0,
    type: 'resource' as const,
  },
  universalCredit: {
    id: 'universalCredit',
    department: 'Work and Pensions',
    programme: 'Universal Credit',
    currentBudget: 38.0,
    proposedBudget: 38.0,
    type: 'resource' as const,
  },
  pip: {
    id: 'pip',
    department: 'Work and Pensions',
    programme: 'Personal Independence Payment',
    currentBudget: 22.0,
    proposedBudget: 22.0,
    type: 'resource' as const,
  },
  housingBenefit: {
    id: 'housingBenefit',
    department: 'Work and Pensions',
    programme: 'Housing Benefit',
    currentBudget: 18.0,
    proposedBudget: 18.0,
    type: 'resource' as const,
  },
  childBenefit: {
    id: 'childBenefit',
    department: 'Work and Pensions',
    programme: 'Child Benefit',
    currentBudget: 12.6,
    proposedBudget: 12.6,
    type: 'resource' as const,
  },

  // Justice
  prisonsAndProbation: {
    id: 'prisonsAndProbation',
    department: 'Justice',
    programme: 'Prisons and Probation',
    currentBudget: 5.5,
    proposedBudget: 5.5,
    type: 'resource' as const,
  },
  courts: {
    id: 'courts',
    department: 'Justice',
    programme: 'Courts and Tribunals',
    currentBudget: 2.8,
    proposedBudget: 2.8,
    type: 'resource' as const,
  },
  legalAid: {
    id: 'legalAid',
    department: 'Justice',
    programme: 'Legal Aid',
    currentBudget: 1.9,
    proposedBudget: 1.9,
    type: 'resource' as const,
  },

  // Home Office
  policing: {
    id: 'policing',
    department: 'Home Office',
    programme: 'Policing',
    currentBudget: 11.5,
    proposedBudget: 11.5,
    type: 'resource' as const,
  },
  immigration: {
    id: 'immigration',
    department: 'Home Office',
    programme: 'Immigration and Borders',
    currentBudget: 4.5,
    proposedBudget: 4.5,
    type: 'resource' as const,
  },
  counterTerrorism: {
    id: 'counterTerrorism',
    department: 'Home Office',
    programme: 'Counter-Terrorism',
    currentBudget: 1.2,
    proposedBudget: 1.2,
    type: 'resource' as const,
  },

  // Transport
  railSubsidy: {
    id: 'railSubsidy',
    department: 'Transport',
    programme: 'Rail Subsidy',
    currentBudget: 5.5,
    proposedBudget: 5.5,
    type: 'resource' as const,
  },
  nationalRoads: {
    id: 'nationalRoads',
    department: 'Transport',
    programme: 'National Roads',
    currentBudget: 7.0,
    proposedBudget: 7.0,
    type: 'capital' as const,
  },
  localRoads: {
    id: 'localRoads',
    department: 'Transport',
    programme: 'Local Roads',
    currentBudget: 3.5,
    proposedBudget: 3.5,
    type: 'capital' as const,
  },
  hs2: {
    id: 'hs2',
    department: 'Transport',
    programme: 'HS2 Phase 1',
    currentBudget: 6.0,
    proposedBudget: 6.0,
    type: 'capital' as const,
  },

  // Housing and Communities
  localGovernmentGrants: {
    id: 'localGovernmentGrants',
    department: 'Housing and Communities',
    programme: 'Local Government Grants',
    currentBudget: 5.5,
    proposedBudget: 5.5,
    type: 'resource' as const,
  },
  housingCapital: {
    id: 'housingCapital',
    department: 'Housing and Communities',
    programme: 'Affordable Housing',
    currentBudget: 2.5,
    proposedBudget: 2.5,
    type: 'capital' as const,
  },

  // Environment and Agriculture
  farmSubsidies: {
    id: 'farmSubsidies',
    department: 'Environment and Rural Affairs',
    programme: 'Farm Subsidies and ELM',
    currentBudget: 2.4,
    proposedBudget: 2.4,
    type: 'resource' as const,
  },
  floodDefences: {
    id: 'floodDefences',
    department: 'Environment and Rural Affairs',
    programme: 'Flood Defences',
    currentBudget: 1.2,
    proposedBudget: 1.2,
    type: 'capital' as const,
  },

  // Science and Technology
  ukri: {
    id: 'ukri',
    department: 'Science and Technology',
    programme: 'UK Research and Innovation',
    currentBudget: 7.3,
    proposedBudget: 7.3,
    type: 'resource' as const,
  },
  aiAndDigital: {
    id: 'aiAndDigital',
    department: 'Science and Technology',
    programme: 'AI and Digital Infrastructure',
    currentBudget: 1.5,
    proposedBudget: 1.5,
    type: 'capital' as const,
  },

  // Energy and Net Zero
  renewablesSupport: {
    id: 'renewablesSupport',
    department: 'Energy and Net Zero',
    programme: 'Renewables Support',
    currentBudget: 1.0,
    proposedBudget: 1.0,
    type: 'resource' as const,
  },
  homeInsulation: {
    id: 'homeInsulation',
    department: 'Energy and Net Zero',
    programme: 'Home Insulation',
    currentBudget: 1.2,
    proposedBudget: 1.2,
    type: 'resource' as const,
  },
  nuclearNewBuild: {
    id: 'nuclearNewBuild',
    department: 'Energy and Net Zero',
    programme: 'Nuclear New Build',
    currentBudget: 1.0,
    proposedBudget: 1.0,
    type: 'capital' as const,
  },

  // Foreign Office
  officialDevelopmentAssistance: {
    id: 'officialDevelopmentAssistance',
    department: 'Foreign Office',
    programme: 'Official Development Assistance',
    currentBudget: 11.4,
    proposedBudget: 11.4,
    type: 'resource' as const,
  },

  // Debt Interest (AME)
  debtInterest: {
    id: 'debtInterest',
    department: 'Debt Interest',
    programme: 'Central Government Debt Interest',
    currentBudget: 95.0,
    proposedBudget: 95.0,
    type: 'resource' as const,
  },
};

// ============================================================================
// TAX READY RECKONERS (Revenue impact per unit change)
// ============================================================================

const TAX_RECKONERS: Record<string, number> = {
  // ---- Rates (£bn per 1pp change) ----
  incomeTaxBasic: 7.0, // £7bn per 1pp
  incomeTaxHigher: 2.0, // £2bn per 1pp
  incomeTaxAdditional: 0.2, // £200m per 1pp
  employeeNI: 6.0, // £6bn per 1pp
  employerNI: 8.5, // £8.5bn per 1pp
  vat: 7.5, // £7.5bn per 1pp
  corporationTax: 3.2, // £3.2bn per 1pp
  stampDuty: 1.5, // £1.5bn per 1pp
  corporationTaxSmall: 0.4, // £400m per 1pp
  capitalGainsBasic: 0.5, // £500m per 1pp
  capitalGainsHigher: 0.7, // £700m per 1pp
  inheritanceTax: 0.19, // £190m per 1pp
  fuelDuty: 0.5, // £500m per 1p/litre
  councilTax: 0.46, // £460m per 1% increase
  businessRates: 0.58, // £580m per 1p change
  alcoholDuty: 0.13, // £130m per 1% index change
  tobaccoDuty: 0.09, // £90m per 1% index change
  airPassengerDuty: 0.04, // £40m per 1% index change
  vehicleExciseDuty: 0.044, // £44m per £1 change

  // ---- Thresholds (£bn per £1,000 change) ----
  // These entries use rateChange/1000 in the calculation
  personalAllowance: -6.2, // -£6.2bn per £1,000 increase (less revenue collected)
  higherRateThreshold: -0.8, // -£800m per £1,000 increase (fewer people at 40%)
  additionalRateThreshold: -0.05, // -£50m per £1,000 increase
  marriageAllowance: -0.25, // -£250m per £1,000 increase
  inheritanceTaxThreshold: -0.01, // -£10m per £1,000 increase
  niPrimaryThreshold: -4.5, // -£4.5bn per £1,000 increase
  niUpperEarningsLimit: -0.3, // -£300m per £1,000 increase
  niSecondaryThreshold: -5.0, // -£5bn per £1,000 increase (employer side)
  employmentAllowance: -0.5, // -£500m per £1,000 increase
  vatRegistrationThreshold: -0.01, // -£10m per £1,000 increase
  annualInvestmentAllowance: -0.002, // -£2m per £1,000 increase
  cgtAnnualExempt: -0.4, // -£400m per £1,000 increase
  ihtResidenceNilRate: -0.02, // -£20m per £1,000 increase
  sdltFirstTimeBuyerThreshold: -0.004, // -£4m per £1,000 increase
  pensionAnnualAllowance: -0.1, // -£100m per £1,000 increase (more relief given)
  isaAllowance: -0.02, // -£20m per £1,000 increase
  dividendAllowance: -0.9, // -£900m per £1,000 increase
  badrLifetimeLimit: -0.0005, // -£500k per £1,000 increase

  // ---- New percentage-based taxes (£bn per 1pp change) ----
  vatDomesticEnergy: 0.7, // £700m per 1pp (raising from 5% to 6%)
  vatPrivateSchools: 0.085, // £85m per 1pp
  rdTaxCredit: -0.2, // -£200m per 1pp increase (more relief = less net revenue)
  bankSurcharge: 1.0, // £1bn per 1pp
  energyProfitsLevy: 0.15, // £150m per 1pp
  patentBoxRate: -0.08, // -£80m per 1pp increase (bigger relief discount)
  cgtResidentialSurcharge: 0.3, // £300m per 1pp
  badrRate: 0.1, // £100m per 1pp increase
  sdltAdditionalSurcharge: 0.5, // £500m per 1pp
  insurancePremiumTax: 0.66, // £660m per 1pp
  softDrinksLevy: 0.003, // £3m per 1% index change
};

// Threshold-type taxes: use rateChange / 1000 for reckoner calculation
const THRESHOLD_TAX_IDS = new Set([
  'personalAllowance',
  'higherRateThreshold',
  'additionalRateThreshold',
  'marriageAllowance',
  'inheritanceTaxThreshold',
  'niPrimaryThreshold',
  'niUpperEarningsLimit',
  'niSecondaryThreshold',
  'employmentAllowance',
  'vatRegistrationThreshold',
  'annualInvestmentAllowance',
  'cgtAnnualExempt',
  'ihtResidenceNilRate',
  'sdltFirstTimeBuyerThreshold',
  'pensionAnnualAllowance',
  'isaAllowance',
  'dividendAllowance',
  'badrLifetimeLimit',
]);

function getTaxRateLimits(tax: TaxChange): { min: number; max: number } {
  if (tax.unit === '%' || tax.unit === 'Index' || tax.unit === 'p/£') {
    return { min: 0, max: 100 };
  }

  if (tax.unit === 'p/litre') {
    return { min: 0, max: 200 };
  }

  if (tax.unit === '£') {
    return { min: 0, max: Math.max(1000, tax.currentRate * 2) };
  }

  if (tax.unit === 'System') {
    return { min: 0, max: 100 };
  }

  return { min: 0, max: 1000000 };
}

function clampTaxRate(tax: TaxChange, newRate: number): number {
  const { min, max } = getTaxRateLimits(tax);
  return Math.min(max, Math.max(min, newRate));
}

const NHS_SPENDING_ITEM_IDS = [
  'nhsEngland',
  'nhsPrimaryCare',
  'nhsMentalHealth',
  'publicHealth',
  'socialCare',
  'nhsCapital',
];

const DEFENCE_SPENDING_ITEM_IDS = ['armyRevenue', 'navyRevenue', 'rafRevenue', 'nuclearDeterrent', 'defenceEquipment'];

const EDUCATION_SPENDING_ITEM_IDS = [
  'schools',
  'pupilPremium',
  'furtherEducation',
  'higherEducation',
  'earlyYears',
  'send',
  'schoolsCapital',
];

const WELFARE_SPENDING_ITEM_IDS = ['statePension', 'universalCredit', 'pip', 'housingBenefit', 'childBenefit'];

const SPENDING_REVIEW_DEPARTMENT_ORDER: Array<keyof SpendingReviewState['departments']> = [
  'nhs',
  'education',
  'defence',
  'infrastructure',
  'homeOffice',
  'localGov',
  'other',
];

// Budget-screen welfare lines are reconstructed proportionally from the welfare aggregate.
// Use a fixed baseline share to derive an annual state pension target from fiscal-year welfare baseline.
// Welfare baseline in the current fiscal model is £290bn, with state pension at £130bn.
const STATE_PENSION_SHARE_OF_WELFARE = 130.0 / 290.0;
const TRIPLE_LOCK_UPLIFT_RATE = 1.085;

function sumSpendingItems(
  spendingMap: Map<string, SpendingChange>,
  ids: string[],
  field: 'currentBudget' | 'proposedBudget'
): number {
  return ids.reduce((sum, id) => {
    const item = spendingMap.get(id);
    return sum + (item ? item[field] : 0);
  }, 0);
}

function calculateDepartmentDelta(spendingMap: Map<string, SpendingChange>, ids: string[]): number {
  const currentTotal = sumSpendingItems(spendingMap, ids, 'currentBudget');
  const proposedTotal = sumSpendingItems(spendingMap, ids, 'proposedBudget');
  return proposedTotal - currentTotal;
}

// ============================================================================
// MANIFESTO CONSTRAINTS
// ============================================================================

// Static constraints (tax locks and spending pledges)
const STATIC_MANIFESTO_CONSTRAINTS: ManifestoConstraint[] = [
  {
    id: 'income_tax_lock',
    description: 'No increase to income tax rates',
    type: 'tax_lock',
    violated: false,
    severity: 'critical',
  },
  {
    id: 'ni_lock',
    description: 'No increase to National Insurance rates',
    type: 'tax_lock',
    violated: false,
    severity: 'critical',
  },
  {
    id: 'vat_lock',
    description: 'No increase to VAT standard rate',
    type: 'tax_lock',
    violated: false,
    severity: 'critical',
  },
  {
    id: 'corporation_tax_lock',
    description: 'No increase to Corporation Tax rate',
    type: 'tax_lock',
    violated: false,
    severity: 'critical',
  },
  {
    id: 'nhs_pledge',
    description: 'Increase NHS funding in real terms each year',
    type: 'spending_pledge',
    violated: false,
    severity: 'major',
  },
  {
    id: 'defence_pledge',
    description: 'Maintain defence spending at minimum 2% of GDP',
    type: 'spending_pledge',
    violated: false,
    severity: 'major',
  },
  {
    id: 'triple_lock',
    description: 'Maintain state pension triple lock',
    type: 'spending_pledge',
    violated: false,
    severity: 'critical',
  },
];

// Generate fiscal rule constraints dynamically based on chosen framework
function generateFiscalRuleConstraints(chosenRuleId: string): ManifestoConstraint[] {
  const chosenRule = getFiscalRuleById(chosenRuleId as any);
  const constraints: ManifestoConstraint[] = [];

  // Generate constraints based on the rule's requirements
  if (chosenRule.rules.currentBudgetBalance) {
    constraints.push({
      id: 'current_budget_balance',
      description: `Current budget in balance by year ${chosenRule.rules.timeHorizon}`,
      type: 'fiscal_rule',
      violated: false,
      severity: 'critical',
    });
  }

  if (chosenRule.rules.overallBalance) {
    constraints.push({
      id: 'overall_balance',
      description: `Overall budget balanced every year`,
      type: 'fiscal_rule',
      violated: false,
      severity: 'critical',
    });
  }

  if (chosenRule.rules.deficitCeiling !== undefined) {
    constraints.push({
      id: 'deficit_ceiling',
      description: `Deficit below ${chosenRule.rules.deficitCeiling}% of GDP`,
      type: 'fiscal_rule',
      violated: false,
      severity: 'critical',
    });
  }

  if (chosenRule.rules.debtTarget !== undefined) {
    constraints.push({
      id: 'debt_target',
      description: `Debt below ${chosenRule.rules.debtTarget}% of GDP`,
      type: 'fiscal_rule',
      violated: false,
      severity: 'critical',
    });
  }

  if (chosenRule.rules.debtFalling) {
    constraints.push({
      id: 'debt_falling',
      description: `Debt falling as % of GDP by year ${chosenRule.rules.timeHorizon}`,
      type: 'fiscal_rule',
      violated: false,
      severity: 'critical',
    });
  }

  // If no formal rules (MMT), add a note
  if (constraints.length === 0) {
    constraints.push({
      id: 'no_formal_rules',
      description: `No formal deficit or debt targets (focus on inflation and employment)`,
      type: 'fiscal_rule',
      violated: false,
      severity: 'minor',
    });
  }

  return constraints;
}

// ============================================================================
// MAIN BUDGET SYSTEM COMPONENT
// ============================================================================

interface BudgetSystemProps {
  adviserSystem: AdviserSystemState;
}

export const BudgetSystem: React.FC<BudgetSystemProps> = ({ adviserSystem }) => {
  const gameActions = useGameActions();
  const gameState = useGameState();
  const budgetDraft = useBudgetDraft();
  const currentDraft = budgetDraft?.turn === gameState.metadata.currentTurn ? budgetDraft : null;
  const [taxes, setTaxes] = useState<Map<string, TaxChange>>(() => {
    return currentDraft ? new Map(currentDraft.taxes) : reconstructTaxesFromGameState(gameState);
  });
  const [spending, setSpending] = useState<Map<string, SpendingChange>>(() => {
    return currentDraft ? new Map(currentDraft.spending) : reconstructSpendingFromGameState(gameState);
  });
  const [budgetType, setBudgetType] = useState<'spring' | 'autumn' | 'emergency'>('spring');
  const [activeView, setActiveView] = useState<'taxes' | 'spending' | 'impact' | 'constraints' | 'debt' | 'del'>(
    'taxes'
  );
  const [expandedDepartments, setExpandedDepartments] = useState<Set<string>>(new Set());
  const [showAdviserDetail, setShowAdviserDetail] = useState<AdviserType | null>(null);
  const [voteResult, setVoteResult] = useState<VoteResult | null>(null);
  const [showPMInterventionModal, setShowPMInterventionModal] = useState(false);
  const [showFiscalRuleChangeModal, setShowFiscalRuleChangeModal] = useState(false);
  const [proposedFiscalRule, setProposedFiscalRule] = useState<FiscalRuleId>(gameState.political.chosenFiscalRule);
  const [pmInterventionTriggered, setPMInterventionTriggered] = useState(false);
  const [fiscalRuleMessage, setFiscalRuleMessage] = useState<string | null>(null);
  const [brokenPromisesAlert, setBrokenPromisesAlert] = useState<{ count: number; mpCount: number } | null>(null);
  const [pmInterventionSuccess, setPMInterventionSuccess] = useState(false);
  const [dismissedConflicts, setDismissedConflicts] = useState<Set<string>>(new Set());
  const lastTurnRef = useRef<number | null>(null);
  const [welfareLevers, setWelfareLevers] = useState({
    ucTaperRate: gameState.fiscal.ucTaperRate,
    workAllowanceMonthly: gameState.fiscal.workAllowanceMonthly,
    childcareSupportRate: gameState.fiscal.childcareSupportRate,
  });
  const [thresholdUprating, setThresholdUprating] = useState<'frozen' | 'cpi_linked' | 'earnings_linked' | 'custom'>(
    gameState.fiscal.thresholdUprating || 'frozen'
  );
  const [fullExpensing, setFullExpensing] = useState<boolean>(gameState.fiscal.fullExpensing || false);
  const [antiAvoidanceInvestment, setAntiAvoidanceInvestment] = useState<number>(
    gameState.fiscal.antiAvoidanceInvestment_bn || 0.3
  );
  const [hmrcSystemsInvestment, setHmrcSystemsInvestment] = useState<number>(
    gameState.fiscal.hmrcSystemsInvestment_bn || 0.3
  );
  const [planningReformPackage, setPlanningReformPackage] = useState<boolean>(
    gameState.housing.planningReformPackage || false
  );
  const [infrastructureGuarantees, setInfrastructureGuarantees] = useState<number>(
    gameState.housing.infrastructureGuarantees_bn || 2
  );
  const [htbSupport, setHtbSupport] = useState<number>(gameState.housing.htbAndSharedOwnership_bn || 1.5);
  const [councilHousingGrant, setCouncilHousingGrant] = useState<number>(
    gameState.housing.councilHouseBuildingGrant_bn || 0.6
  );
  const [localGovernmentGrantSettlement, setLocalGovernmentGrantSettlement] = useState<number>(
    gameState.devolution.localGov.centralGrant_bn || 30
  );
  const [councilTaxReferendumCap, setCouncilTaxReferendumCap] = useState<number>(
    gameState.devolution.localGov.councilTaxGrowthCap || 3
  );
  const [selectedIndustrialInterventions, setSelectedIndustrialInterventions] = useState<Set<string>>(new Set());
  const pmComplianceEventCount = useMemo(
    () =>
      (gameState.pmRelationship.messages || []).filter((msg) => msg.subject === 'PM intervention implemented').length,
    [gameState.pmRelationship.messages]
  );

  // Keep unsent draft persistent across navigation
  // This effect intentionally re-syncs local draft state only when the canonical budget inputs change.
  // Depending on the whole game state would wipe in-progress edits for unrelated turn updates.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const draft: BudgetDraft = {
      turn: gameState.metadata.currentTurn,
      taxes: Array.from(taxes.entries()),
      spending: Array.from(spending.entries()),
    };
    gameActions.setBudgetDraft(draft);
  }, [gameActions, gameState.metadata.currentTurn, taxes, spending]);

  // When the turn changes, clear old draft and initialise from the latest game state
  useEffect(() => {
    if (lastTurnRef.current === null) {
      lastTurnRef.current = gameState.metadata.currentTurn;
      return;
    }

    if (lastTurnRef.current === gameState.metadata.currentTurn) {
      return;
    }

    lastTurnRef.current = gameState.metadata.currentTurn;
    gameActions.clearBudgetDraft();
    setTaxes(reconstructTaxesFromGameState({ fiscal: gameState.fiscal }));
    setSpending(reconstructSpendingFromGameState({ fiscal: gameState.fiscal }));
  }, [gameActions, gameState]);

  useEffect(() => {
    setProposedFiscalRule(gameState.political.chosenFiscalRule);
  }, [gameState.political.chosenFiscalRule]);

  useEffect(() => {
    setTaxes(reconstructTaxesFromGameState({ fiscal: gameState.fiscal }));
    setSpending(reconstructSpendingFromGameState({ fiscal: gameState.fiscal }));
    setWelfareLevers({
      ucTaperRate: gameState.fiscal.ucTaperRate,
      workAllowanceMonthly: gameState.fiscal.workAllowanceMonthly,
      childcareSupportRate: gameState.fiscal.childcareSupportRate,
    });
    setThresholdUprating(gameState.fiscal.thresholdUprating || 'frozen');
    setFullExpensing(gameState.fiscal.fullExpensing || false);
    setAntiAvoidanceInvestment(gameState.fiscal.antiAvoidanceInvestment_bn || 0.3);
    setHmrcSystemsInvestment(gameState.fiscal.hmrcSystemsInvestment_bn || 0.3);
    setPlanningReformPackage(gameState.housing.planningReformPackage || false);
    setInfrastructureGuarantees(gameState.housing.infrastructureGuarantees_bn || 2);
    setHtbSupport(gameState.housing.htbAndSharedOwnership_bn || 1.5);
    setCouncilHousingGrant(gameState.housing.councilHouseBuildingGrant_bn || 0.6);
    setLocalGovernmentGrantSettlement(gameState.devolution.localGov.centralGrant_bn || 30);
    setCouncilTaxReferendumCap(gameState.devolution.localGov.councilTaxGrowthCap || 3);
    setSelectedIndustrialInterventions(new Set());
  }, [
    gameState.fiscal,
    gameState.metadata.currentTurn,
    pmComplianceEventCount,
    gameState.fiscal.ucTaperRate,
    gameState.fiscal.workAllowanceMonthly,
    gameState.fiscal.childcareSupportRate,
    gameState.fiscal.thresholdUprating,
    gameState.fiscal.fullExpensing,
    gameState.fiscal.antiAvoidanceInvestment_bn,
    gameState.fiscal.hmrcSystemsInvestment_bn,
    gameState.housing.planningReformPackage,
    gameState.housing.infrastructureGuarantees_bn,
    gameState.housing.htbAndSharedOwnership_bn,
    gameState.housing.councilHouseBuildingGrant_bn,
    gameState.devolution.localGov.centralGrant_bn,
    gameState.devolution.localGov.councilTaxGrowthCap,
  ]);

  // Force save after PM intervention to ensure changes persist
  // BUGFIX: Use setTimeout to ensure all async state updates complete before saving
  // The PM intervention triggers multiple async state updates:
  // 1. forcePMIntervention() updates political state
  // 2. applyBudgetChanges() updates fiscal state
  // 3. Local budget screen state updates (taxes, spending)
  // Without the delay, the save might occur with stale state.
  useEffect(() => {
    if (pmInterventionTriggered && gameState.metadata.gameStarted && !gameState.metadata.gameOver) {
      // Wait for next tick to ensure all state updates have propagated
      const timeoutId = setTimeout(() => {
        try {
          writeSave('chancellor-autosave', gameState);
          setPMInterventionTriggered(false);
        } catch (error) {
          console.error('Failed to save after PM intervention:', error);
        }
      }, 100); // 100ms delay to ensure state propagation

      // Cleanup timeout if component unmounts
      return () => clearTimeout(timeoutId);
    }
  }, [pmInterventionTriggered, gameState]);

  // Auto-reset budget type if out of season
  useEffect(() => {
    const month = gameState.metadata.currentMonth;
    const isSpring = month >= 3 && month <= 5; // March-May
    const isAutumn = month >= 9 && month <= 11; // September-November

    if ((budgetType === 'spring' && !isSpring) || (budgetType === 'autumn' && !isAutumn)) {
      setBudgetType('emergency');
    }
  }, [gameState.metadata.currentMonth, budgetType]);

  // Manifesto NHS pledge target should be annual (fixed to fiscal-year baseline), not compounding monthly.
  const nhsFiscalYearBaselineTotal = gameState.fiscal.fiscalYearStartSpending?.nhs ?? gameState.fiscal.spending.nhs;
  const nhsAnnualTargetTotal = nhsFiscalYearBaselineTotal * 1.02;
  // Triple lock should be annual (fixed to fiscal-year baseline), not compounding monthly.
  // Use fiscal year start spending as baseline and apply triple lock uplift, just like NHS.
  const statePensionFiscalYearBaseline = gameState.fiscal.fiscalYearStartSpending?.welfare
    ? gameState.fiscal.fiscalYearStartSpending.welfare * STATE_PENSION_SHARE_OF_WELFARE
    : gameState.fiscal.spending.welfare * STATE_PENSION_SHARE_OF_WELFARE;
  const statePensionAnnualTarget = statePensionFiscalYearBaseline * TRIPLE_LOCK_UPLIFT_RATE;
  const currentNHSTotal = useMemo(() => sumSpendingItems(spending, NHS_SPENDING_ITEM_IDS, 'currentBudget'), [spending]);

  // ============================================================================
  // CALCULATIONS
  // ============================================================================

  const fiscalImpact = useMemo((): FiscalImpact => {
    // Calculate total revenue change
    let totalRevenueChange = 0;
    taxes.forEach((tax) => {
      if (tax.currentRate !== tax.proposedRate) {
        const rateChange = tax.proposedRate - tax.currentRate;
        const reckoner = TAX_RECKONERS[tax.id as keyof typeof TAX_RECKONERS];
        if (reckoner) {
          if (THRESHOLD_TAX_IDS.has(tax.id)) {
            totalRevenueChange += reckoner * (rateChange / 1000);
          } else {
            totalRevenueChange += reckoner * rateChange;
          }
        }
      }
    });

    // Calculate total spending change
    let totalSpendingChange = 0;
    spending.forEach((item) => {
      totalSpendingChange += item.proposedBudget - item.currentBudget;
    });

    const welfareLeverSpendingDelta =
      Math.max(0, 55 - welfareLevers.ucTaperRate) * 0.7 +
      Math.max(0, (welfareLevers.workAllowanceMonthly - 344) / 50) * 0.4 +
      Math.max(0, (welfareLevers.childcareSupportRate - 30) / 10) * 1.2 -
      (Math.max(0, 55 - gameState.fiscal.ucTaperRate) * 0.7 +
        Math.max(0, (gameState.fiscal.workAllowanceMonthly - 344) / 50) * 0.4 +
        Math.max(0, (gameState.fiscal.childcareSupportRate - 30) / 10) * 1.2);

    const thresholdPolicyRevenueDelta =
      (thresholdUprating === 'frozen' ? 3.5 : thresholdUprating === 'earnings_linked' ? -1.5 : 0) -
      ((gameState.fiscal.thresholdUprating || 'frozen') === 'frozen'
        ? 3.5
        : (gameState.fiscal.thresholdUprating || 'frozen') === 'earnings_linked'
          ? -1.5
          : 0);
    const fullExpensingRevenueDelta = (fullExpensing ? -3.5 : 0) - (gameState.fiscal.fullExpensing ? -3.5 : 0);
    const antiAvoidanceRevenueDelta =
      (antiAvoidanceInvestment - 0.3) * 1.1 - ((gameState.fiscal.antiAvoidanceInvestment_bn || 0.3) - 0.3) * 1.1;
    const hmrcSystemsRevenueDelta =
      (hmrcSystemsInvestment - 0.3) * 0.6 - ((gameState.fiscal.hmrcSystemsInvestment_bn || 0.3) - 0.3) * 0.6;
    const selectedIndustrialCostDelta = Array.from(selectedIndustrialInterventions).reduce((sum, id) => {
      const intervention = INDUSTRIAL_INTERVENTION_CATALOGUE.find((item) => item.id === id);
      return sum + (intervention?.annualCost_bn || 0);
    }, 0);
    const localGovernmentGrantDelta =
      localGovernmentGrantSettlement - (gameState.devolution.localGov.centralGrant_bn || 30);

    // Baseline fiscal position (from game state - reflects any previous budget submissions)
    const currentDeficit = gameState.fiscal.deficit_bn; // Current deficit from game state
    const currentDebt = gameState.fiscal.debtNominal_bn; // Current debt from game state
    const nominalGDP = gameState.economic.gdpNominal_bn; // Current GDP from game state

    const projectedDeficit =
      currentDeficit +
      totalSpendingChange +
      welfareLeverSpendingDelta +
      selectedIndustrialCostDelta +
      localGovernmentGrantDelta -
      (totalRevenueChange +
        thresholdPolicyRevenueDelta +
        fullExpensingRevenueDelta +
        antiAvoidanceRevenueDelta +
        hmrcSystemsRevenueDelta);
    const projectedDebt = currentDebt + projectedDeficit;
    const debtGDPRatio = (projectedDebt / nominalGDP) * 100;

    // Check fiscal rules based on the chancellor's chosen framework
    const chosenRule = getFiscalRuleById(gameState.political.chosenFiscalRule);

    // Calculate what fiscal metrics would be AFTER the proposed changes
    // Use current gameState fiscal data + proposed changes
    const proposedTotalRevenue =
      gameState.fiscal.totalRevenue_bn +
      totalRevenueChange +
      thresholdPolicyRevenueDelta +
      fullExpensingRevenueDelta +
      antiAvoidanceRevenueDelta +
      hmrcSystemsRevenueDelta;
    const proposedTotalSpending =
      gameState.fiscal.totalSpending_bn +
      totalSpendingChange +
      welfareLeverSpendingDelta +
      selectedIndustrialCostDelta +
      localGovernmentGrantDelta;

    // Calculate actual capital spending change from spending items (not arbitrary 15%)
    let capitalSpendingChange = 0;
    spending.forEach((item) => {
      if (item.type === 'capital') {
        capitalSpendingChange += item.proposedBudget - item.currentBudget;
      }
    });

    // Calculate total capital spending (current + change)
    const currentTotalCapital =
      gameState.fiscal.spending.nhsCapital +
      gameState.fiscal.spending.educationCapital +
      gameState.fiscal.spending.defenceCapital +
      gameState.fiscal.spending.infrastructureCapital +
      gameState.fiscal.spending.policeCapital +
      gameState.fiscal.spending.justiceCapital +
      gameState.fiscal.spending.otherCapital;
    const proposedTotalCapital = currentTotalCapital + capitalSpendingChange;

    // Current budget balance: revenue - (spending excl. investment) - debt interest
    const proposedCurrentBudgetBalance =
      proposedTotalRevenue - (proposedTotalSpending - proposedTotalCapital) - gameState.fiscal.debtInterest_bn;

    // Deficit ceiling check (needed by Jeremy Hunt debtFalling test below)
    const proposedDeficitPctGDP = (projectedDeficit / nominalGDP) * 100;
    const deficitCeilingMet =
      chosenRule.rules.deficitCeiling === undefined || proposedDeficitPctGDP <= chosenRule.rules.deficitCeiling;

    // Rule-specific headroom: shows distance from the chosen rule's own threshold.
    // Uses calculateRuleHeadroom so the Budget tab and Dashboard display consistent figures.
    const calibratedHeadroom = calculateRuleHeadroom(
      chosenRule,
      proposedCurrentBudgetBalance,
      proposedDeficitPctGDP,
      nominalGDP,
      proposedTotalRevenue,
      proposedTotalSpending,
      gameState.fiscal.debtInterest_bn
    );
    const currentBudgetMet = !chosenRule.rules.currentBudgetBalance || calibratedHeadroom >= -0.5;

    // Overall balance: total revenue >= total spending + debt interest
    const proposedOverallBalance = proposedTotalRevenue - proposedTotalSpending - gameState.fiscal.debtInterest_bn;
    const overallBalanceMet = !chosenRule.rules.overallBalance || proposedOverallBalance >= -0.5;

    // Debt target check
    const debtTargetMet = chosenRule.rules.debtTarget === undefined || debtGDPRatio <= chosenRule.rules.debtTarget;

    // Debt falling check
    // Jeremy Hunt (no capex exemption): the deficit-ceiling test is the operationally correct
    //   proxy for debt/GDP falling over 5 years (debt falls when nominal deficit < ~3% GDP).
    // Other medium/long-horizon rules (timeHorizon >= 4): a balanced current budget guarantees
    //   debt/GDP falls — calibratedHeadroom >= -0.5 is the proxy.
    // Short-horizon rules: debt/GDP must be demonstrably falling right now.
    let debtFallingMet = true;
    if (chosenRule.rules.debtFalling) {
      if (chosenRule.id === 'jeremy-hunt') {
        debtFallingMet = deficitCeilingMet;
      } else if (chosenRule.rules.timeHorizon >= 4) {
        // Medium/long-horizon rule: current budget balance is the relevant test
        debtFallingMet = calibratedHeadroom >= -0.5;
      } else {
        // Short-horizon rule: debt/GDP must be falling right now
        debtFallingMet = debtGDPRatio <= gameState.fiscal.debtPctGDP;
      }
    }

    // Overall compliance: all applicable rules must be met
    const fiscalRulesMet =
      currentBudgetMet && overallBalanceMet && deficitCeilingMet && debtTargetMet && debtFallingMet;

    // Headroom is the calibrated current budget balance: positive = surplus above OBR threshold,
    // negative = breach depth.  Matches the value shown on the Dashboard.
    const headroom = calibratedHeadroom;

    return {
      currentDeficit,
      projectedDeficit,
      deficitChange: projectedDeficit - currentDeficit,
      currentDebt,
      projectedDebt,
      debtGDPRatio,
      debtChange: projectedDebt - currentDebt,
      fiscalRulesMet,
      headroom,
    };
  }, [
    taxes,
    spending,
    gameState.political.chosenFiscalRule,
    gameState.fiscal,
    gameState.economic,
    welfareLevers.ucTaperRate,
    welfareLevers.workAllowanceMonthly,
    welfareLevers.childcareSupportRate,
    thresholdUprating,
    fullExpensing,
    antiAvoidanceInvestment,
    hmrcSystemsInvestment,
    selectedIndustrialInterventions,
    localGovernmentGrantSettlement,
    gameState.devolution.localGov.centralGrant_bn,
  ]);

  const warnings = useMemo((): AdviserWarning[] => {
    const newWarnings: AdviserWarning[] = [];

    // Check deficit impact
    if (fiscalImpact.deficitChange > 20) {
      newWarnings.push({
        id: 'large_deficit_increase',
        category: 'fiscal',
        severity: 'critical',
        title: 'Large Deficit Increase',
        message: `Your proposals increase the deficit by £${fiscalImpact.deficitChange.toFixed(1)}bn. This will significantly increase borrowing costs and may trigger market concerns.`,
        impact: `Gilt yields could rise by 30-50 basis points, adding £${(fiscalImpact.deficitChange * 0.02).toFixed(1)}bn to annual debt interest.`,
      });
    } else if (fiscalImpact.deficitChange > 10) {
      newWarnings.push({
        id: 'moderate_deficit_increase',
        category: 'fiscal',
        severity: 'warning',
        title: 'Moderate Deficit Increase',
        message: `Your proposals increase the deficit by £${fiscalImpact.deficitChange.toFixed(1)}bn. Markets will scrutinise the OBR forecast carefully.`,
        impact: `Expected gilt yield increase of 10-20 basis points.`,
      });
    }

    // Check fiscal rules
    if (!fiscalImpact.fiscalRulesMet) {
      newWarnings.push({
        id: 'fiscal_rules_breach',
        category: 'fiscal',
        severity: 'critical',
        title: 'Fiscal Rules Breached',
        message: 'Your proposals breach one or both of the fiscal rules. This will severely damage credibility.',
        impact: 'Market reaction likely similar to Truss mini-budget. Sterling could fall 3-5% and gilt yields spike.',
      });
    } else if (fiscalImpact.fiscalRulesMet && fiscalImpact.headroom < 10) {
      newWarnings.push({
        id: 'thin_headroom',
        category: 'fiscal',
        severity: 'warning',
        title: 'Thin Fiscal Headroom',
        message: `You have only £${fiscalImpact.headroom.toFixed(1)}bn of headroom against fiscal rules. Any adverse shock will breach the rules.`,
        impact: 'OBR will flag this as a high-risk fiscal position.',
      });
    }

    // Check tax pledges
    const incomeTaxBasic = taxes.get('incomeTaxBasic');
    if (incomeTaxBasic && incomeTaxBasic.proposedRate > incomeTaxBasic.currentRate) {
      newWarnings.push({
        id: 'manifesto_income_tax',
        category: 'political',
        severity: 'critical',
        title: 'Manifesto Commitment Broken',
        message:
          'Increasing income tax rates directly violates your manifesto pledge. This will cause severe political damage.',
        impact: 'Public approval likely to fall by 10-15 points. Backbench rebellion likely.',
      });
    }

    const employeeNI = taxes.get('employeeNI');
    if (employeeNI && employeeNI.proposedRate > employeeNI.currentRate) {
      newWarnings.push({
        id: 'manifesto_ni',
        category: 'political',
        severity: 'critical',
        title: 'Manifesto Commitment Broken',
        message: 'Increasing National Insurance rates directly violates your manifesto pledge.',
        impact: 'Public approval likely to fall by 10-15 points.',
      });
    }

    const vat = taxes.get('vat');
    if (vat && vat.proposedRate > vat.currentRate) {
      newWarnings.push({
        id: 'manifesto_vat',
        category: 'political',
        severity: 'critical',
        title: 'Manifesto Commitment Broken',
        message: 'Increasing VAT directly violates your manifesto pledge and hits lower-income households hardest.',
        impact: 'Public approval likely to fall by 12-18 points. Regressive tax increase.',
      });
    }

    // Check NHS spending
    const nhsTotal = sumSpendingItems(spending, NHS_SPENDING_ITEM_IDS, 'proposedBudget');

    if (nhsTotal < nhsAnnualTargetTotal - 0.01) {
      newWarnings.push({
        id: 'nhs_real_terms_cut',
        category: 'political',
        severity: 'warning',
        title: 'NHS Real Terms Cut',
        message: 'NHS funding is below the annual manifesto target measured from the start of this fiscal year.',
        impact: 'Waiting lists will grow. Public approval on NHS handling will decline sharply.',
      });
    }

    // Check for large individual tax increases
    taxes.forEach((tax) => {
      if (tax.id === 'incomeTaxBasic' && tax.proposedRate > tax.currentRate + 2) {
        newWarnings.push({
          id: 'large_income_tax_rise',
          category: 'economic',
          severity: 'warning',
          title: 'Large Income Tax Increase',
          message: `Increasing basic rate by ${(tax.proposedRate - tax.currentRate).toFixed(1)}pp is a significant tax rise affecting 27 million people.`,
          impact: 'Consumer spending will fall, potentially triggering a recession. Bank of England may cut rates.',
        });
      }
    });

    // Check for spending cuts to protected departments
    const justice = spending.get('courts');
    if (justice && justice.proposedBudget < justice.currentBudget * 0.95) {
      newWarnings.push({
        id: 'justice_cuts',
        category: 'political',
        severity: 'warning',
        title: 'Justice System Cuts',
        message: 'Cutting justice spending will worsen the Crown Court backlog and prison overcrowding crisis.',
        impact: 'Lord Chancellor may resign. Court backlog could exceed 80,000 cases.',
      });
    }

    return newWarnings;
  }, [taxes, spending, fiscalImpact, nhsAnnualTargetTotal]);

  const policyConflicts = useMemo(
    () =>
      detectPolicyConflicts(taxes, spending, {
        nhsQuality: gameState.services.nhsQuality,
        educationQuality: gameState.services.educationQuality,
      }),
    [taxes, spending, gameState.services.educationQuality, gameState.services.nhsQuality]
  );
  const visiblePolicyConflicts = useMemo(
    () => policyConflicts.filter((conflict) => !dismissedConflicts.has(conflict.id)),
    [policyConflicts, dismissedConflicts]
  );

  useEffect(() => {
    setDismissedConflicts((prev) => {
      const next = new Set<string>();
      policyConflicts.forEach((conflict) => {
        if (prev.has(conflict.id)) next.add(conflict.id);
      });
      return next;
    });
  }, [policyConflicts]);

  const constraints = useMemo((): ManifestoConstraint[] => {
    // Combine static constraints with dynamic fiscal rule constraints
    const allConstraints = [
      ...STATIC_MANIFESTO_CONSTRAINTS,
      ...generateFiscalRuleConstraints(gameState.political.chosenFiscalRule),
    ];

    return allConstraints.map((constraint) => {
      let violated = false;

      switch (constraint.id) {
        case 'income_tax_lock':
          const incomeTaxBasic = taxes.get('incomeTaxBasic');
          const incomeTaxHigher = taxes.get('incomeTaxHigher');
          const incomeTaxAdditional = taxes.get('incomeTaxAdditional');
          violated = !!(
            (incomeTaxBasic && incomeTaxBasic.proposedRate > incomeTaxBasic.currentRate) ||
            (incomeTaxHigher && incomeTaxHigher.proposedRate > incomeTaxHigher.currentRate) ||
            (incomeTaxAdditional && incomeTaxAdditional.proposedRate > incomeTaxAdditional.currentRate)
          );
          break;

        case 'ni_lock':
          const employeeNI = taxes.get('employeeNI');
          const employerNI = taxes.get('employerNI');
          violated = !!(
            (employeeNI && employeeNI.proposedRate > employeeNI.currentRate) ||
            (employerNI && employerNI.proposedRate > employerNI.currentRate)
          );
          break;

        case 'vat_lock':
          const vat = taxes.get('vat');
          violated = !!(vat && vat.proposedRate > vat.currentRate);
          break;

        case 'corporation_tax_lock':
          const ct = taxes.get('corporationTax');
          violated = !!(ct && ct.proposedRate > ct.currentRate);
          break;

        case 'nhs_pledge':
          const nhsTotal = sumSpendingItems(spending, NHS_SPENDING_ITEM_IDS, 'proposedBudget');
          // Allow small tolerance (£10m) for floating point arithmetic
          violated = nhsTotal < nhsAnnualTargetTotal - 0.01;
          break;

        case 'defence_pledge':
          const defenceTotal = sumSpendingItems(spending, DEFENCE_SPENDING_ITEM_IDS, 'proposedBudget');
          // Allow small tolerance (£10m) for floating point arithmetic
          violated = defenceTotal < 54.6 - 0.01; // Minimum 2% of GDP (simplified)
          break;

        case 'triple_lock':
          const statePension = spending.get('statePension');
          // Triple lock target is annual (fiscal-year baseline), not re-uplifted each budget cycle.
          violated = !!(statePension && statePension.proposedBudget < statePensionAnnualTarget - 0.01);
          break;

        // All fiscal rule constraints check against fiscalRulesMet
        case 'current_budget_balance':
        case 'overall_balance':
        case 'deficit_ceiling':
        case 'debt_target':
        case 'debt_falling':
          violated = !fiscalImpact.fiscalRulesMet;
          break;

        case 'no_formal_rules':
          // MMT has no formal rules, so it's never violated
          violated = false;
          break;
      }

      return { ...constraint, violated };
    });
  }, [
    taxes,
    spending,
    fiscalImpact,
    gameState.political.chosenFiscalRule,
    nhsAnnualTargetTotal,
    statePensionAnnualTarget,
  ]);

  // Generate adviser opinions based on proposed budget
  const adviserOpinions = useMemo(() => {
    // Calculate revenue and spending changes
    let totalRevenueChange = 0;
    taxes.forEach((tax) => {
      if (tax.currentRate !== tax.proposedRate) {
        const rateChange = tax.proposedRate - tax.currentRate;
        const reckoner = TAX_RECKONERS[tax.id as keyof typeof TAX_RECKONERS];
        if (reckoner) {
          if (THRESHOLD_TAX_IDS.has(tax.id)) {
            totalRevenueChange += reckoner * (rateChange / 1000);
          } else {
            totalRevenueChange += reckoner * rateChange;
          }
        }
      }
    });

    let totalSpendingChange = 0;
    spending.forEach((item) => {
      totalSpendingChange += item.proposedBudget - item.currentBudget;
    });

    // Create mock simulation state for adviser opinions
    const mockSimulationState: SimulationState = {
      currentMonth: 0,
      currentDate: new Date(),
      economy: {
        gdpReal: 2300,
        gdpNominal: 2730,
        gdpGrowthQuarterly: 0.2,
        gdpGrowthAnnual: 0.8,
        cpi: 102.2,
        inflationRate: 2.2,
        unemploymentRate: 4.2,
        wageGrowthNominal: 4.5,
        bankRate: 5.0,
        outputGap: -1.2,
      },
      fiscal: {
        totalRevenue: 1050,
        totalSpending: 1137,
        deficit: fiscalImpact.currentDeficit,
        debtStock: fiscalImpact.currentDebt,
        debtToGdpPercent: fiscalImpact.debtGDPRatio,
        incomeTaxRevenue: 269,
        niRevenue: 177,
        vatRevenue: 176,
        corporationTaxRevenue: 108,
        stabilityRuleMet: fiscalImpact.fiscalRulesMet,
        investmentRuleMet: fiscalImpact.fiscalRulesMet,
      },
      services: {
        nhsQuality: 65,
        nhsWaitingList: 7800000,
        educationQuality: 70,
        defenceReadiness: 72,
        policePerformance: 60,
        justiceBacklog: 65000,
      },
      markets: {
        giltYield10yr: 4.2,
        giltYield10yrChange: 0.05,
        marketSentiment: 'cautious',
      },
      political: {
        publicApproval: 38,
        pmTrust: 42,
        backbenchSentiment: {
          averageBackbenchLoyalty: 65,
          mpsReadyToRebel: 18,
          leftFactionLoyalty: 70,
          centreFactionLoyalty: 68,
          rightFactionLoyalty: 58,
        },
        manifestoBreaches: constraints.filter((c) => c.violated).map((c) => c.id),
      },
    };

    return generateAdviserOpinions(mockSimulationState, adviserSystem, {
      revenueChange: totalRevenueChange,
      spendingChange: totalSpendingChange,
      projectedDeficit: fiscalImpact.projectedDeficit,
      fiscalRulesMet: fiscalImpact.fiscalRulesMet,
      manifestoBreaches: constraints.filter((c) => c.violated).map((c) => c.id),
    });
  }, [taxes, spending, fiscalImpact, constraints, adviserSystem]);

  // Debounced MP stance updater (300ms delay to prevent performance issues)
  const debouncedUpdateMPStances = useRef(
    debounce((budgetChanges: any, violations: string[]) => {
      gameActions.updateMPStances(budgetChanges, violations);
    }, 300)
  ).current;

  // Update MP stances whenever budget changes (with debouncing)
  useEffect(() => {
    if (gameState.mpSystem.allMPs.size === 0) return;

    // Build budget changes object
    const incomeTaxBasic = taxes.get('incomeTaxBasic');
    const incomeTaxHigher = taxes.get('incomeTaxHigher');
    const incomeTaxAdditional = taxes.get('incomeTaxAdditional');
    const niEmployee = taxes.get('employeeNI');
    const niEmployer = taxes.get('employerNI');
    const vat = taxes.get('vat');

    const nhsSpendingChange = calculateDepartmentDelta(spending, NHS_SPENDING_ITEM_IDS);
    const educationSpendingChange = calculateDepartmentDelta(spending, EDUCATION_SPENDING_ITEM_IDS);
    const defenceSpendingChange = calculateDepartmentDelta(spending, DEFENCE_SPENDING_ITEM_IDS);
    const welfareSpendingChange = calculateDepartmentDelta(spending, WELFARE_SPENDING_ITEM_IDS);

    // Convert detailed rates/budgets to Maps (required by granular calculation)
    const detailedTaxRatesMap = new Map(
      Array.from(taxes.values()).map((tax) => [tax.id, tax.proposedRate - tax.currentRate])
    );
    const detailedSpendingBudgetsMap = new Map(
      Array.from(spending.values()).map((item) => [item.id, item.proposedBudget - item.currentBudget])
    );

    const budgetChanges = {
      incomeTaxBasicChange: incomeTaxBasic ? incomeTaxBasic.proposedRate - incomeTaxBasic.currentRate : 0,
      incomeTaxHigherChange: incomeTaxHigher ? incomeTaxHigher.proposedRate - incomeTaxHigher.currentRate : 0,
      incomeTaxAdditionalChange: incomeTaxAdditional
        ? incomeTaxAdditional.proposedRate - incomeTaxAdditional.currentRate
        : 0,
      niEmployeeChange: niEmployee ? niEmployee.proposedRate - niEmployee.currentRate : 0,
      niEmployerChange: niEmployer ? niEmployer.proposedRate - niEmployer.currentRate : 0,
      vatChange: vat ? vat.proposedRate - vat.currentRate : 0,
      nhsSpendingChange,
      educationSpendingChange,
      defenceSpendingChange,
      welfareSpendingChange,
      detailedTaxRates: detailedTaxRatesMap,
      detailedSpendingBudgets: detailedSpendingBudgetsMap,
    };

    // Get manifesto violations
    const violationDescriptions = constraints.filter((c) => c.violated).map((c) => c.description);

    // Update MP stances (debounced to prevent performance issues with 650 MPs)
    debouncedUpdateMPStances(budgetChanges, violationDescriptions);
  }, [taxes, spending, constraints, gameState.mpSystem.allMPs.size, debouncedUpdateMPStances]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleTaxChange = useCallback((taxId: string, newRate: number) => {
    setTaxes((prev) => {
      const newTaxes = new Map(prev);
      const tax = newTaxes.get(taxId);
      if (tax) {
        newTaxes.set(taxId, { ...tax, proposedRate: clampTaxRate(tax, newRate) });
      }
      return newTaxes;
    });
  }, []);

  const handleSpendingChange = useCallback((spendingId: string, newBudget: number) => {
    if (spendingId === 'debtInterest') return; // Debt interest cannot be manually changed

    setSpending((prev) => {
      const newSpending = new Map(prev);
      const item = newSpending.get(spendingId);
      if (item) {
        newSpending.set(spendingId, { ...item, proposedBudget: newBudget });
      }
      return newSpending;
    });
  }, []);

  // Function to apply a manifesto commitment's required changes
  const applyManifestoCommitment = useCallback(
    (constraintId: string) => {
      switch (constraintId) {
        case 'nhs_pledge': {
          // Set NHS spending to the annual target measured from fiscal-year baseline.
          const currentTotal = sumSpendingItems(spending, NHS_SPENDING_ITEM_IDS, 'currentBudget');
          const targetTotal = nhsAnnualTargetTotal;

          if (currentTotal <= 0 || currentTotal >= targetTotal - 0.01) {
            break;
          }

          const scalingFactor = targetTotal / currentTotal;

          setSpending((prev) => {
            const newSpending = new Map(prev);
            NHS_SPENDING_ITEM_IDS.forEach((id) => {
              const item = newSpending.get(id);
              if (item) {
                newSpending.set(id, {
                  ...item,
                  proposedBudget: item.currentBudget * scalingFactor,
                });
              }
            });
            return newSpending;
          });
          break;
        }

        case 'defence_pledge': {
          // Set defence spending to minimum 2% GDP (54.6bn)
          const currentDefenceTotal = sumSpendingItems(spending, DEFENCE_SPENDING_ITEM_IDS, 'currentBudget');
          const targetTotal = 54.6;

          if (currentDefenceTotal > 0 && currentDefenceTotal < targetTotal) {
            const scalingFactor = targetTotal / currentDefenceTotal;

            setSpending((prev) => {
              const newSpending = new Map(prev);
              DEFENCE_SPENDING_ITEM_IDS.forEach((id) => {
                const item = newSpending.get(id);
                if (item) {
                  newSpending.set(id, {
                    ...item,
                    proposedBudget: item.currentBudget * scalingFactor,
                  });
                }
              });
              return newSpending;
            });
          }
          break;
        }

        case 'triple_lock': {
          // Set state pension to annual triple-lock target from fiscal-year baseline.
          const statePension = spending.get('statePension');
          if (statePension && statePension.proposedBudget < statePensionAnnualTarget - 0.01) {
            handleSpendingChange('statePension', statePensionAnnualTarget);
          }
          break;
        }

        case 'income_tax_lock':
        case 'ni_lock':
        case 'vat_lock':
        case 'corporation_tax_lock': {
          // Reset relevant tax rates to current (baseline)
          setTaxes((prev) => {
            const newTaxes = new Map(prev);

            if (constraintId === 'income_tax_lock') {
              ['incomeTaxBasic', 'incomeTaxHigher', 'incomeTaxAdditional'].forEach((id) => {
                const tax = newTaxes.get(id);
                if (tax && tax.proposedRate > tax.currentRate) {
                  newTaxes.set(id, { ...tax, proposedRate: tax.currentRate });
                }
              });
            } else if (constraintId === 'ni_lock') {
              ['employeeNI', 'employerNI'].forEach((id) => {
                const tax = newTaxes.get(id);
                if (tax && tax.proposedRate > tax.currentRate) {
                  newTaxes.set(id, { ...tax, proposedRate: tax.currentRate });
                }
              });
            } else if (constraintId === 'vat_lock') {
              const vat = newTaxes.get('vat');
              if (vat && vat.proposedRate > vat.currentRate) {
                newTaxes.set('vat', { ...vat, proposedRate: vat.currentRate });
              }
            } else if (constraintId === 'corporation_tax_lock') {
              const ct = newTaxes.get('corporationTax');
              if (ct && ct.proposedRate > ct.currentRate) {
                newTaxes.set('corporationTax', { ...ct, proposedRate: ct.currentRate });
              }
            }

            return newTaxes;
          });
          break;
        }

        default:
          // For fiscal rules, show a message that adjustments are complex
          setFiscalRuleMessage(
            `Fiscal rule commitments require complex adjustments to both taxes and spending. Use the input fields to manually adjust your budget to meet the ${constraintId.replace(/_/g, ' ')} requirement.`
          );
          break;
      }
    },
    [spending, handleSpendingChange, nhsAnnualTargetTotal, statePensionAnnualTarget]
  );

  const toggleDepartment = useCallback((department: string) => {
    setExpandedDepartments((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(department)) {
        newSet.delete(department);
      } else {
        newSet.add(department);
      }
      return newSet;
    });
  }, []);

  const resetBudget = useCallback(() => {
    setTaxes(reconstructTaxesFromGameState(gameState));
    setSpending(reconstructSpendingFromGameState(gameState));
    gameActions.clearBudgetDraft();
  }, [gameActions, gameState]);

  const submitBudget = useCallback(() => {
    // Count tax increases and spending cuts for vote simulation
    let taxIncreaseCount = 0;
    let spendingCutCount = 0;

    taxes.forEach((tax) => {
      if (
        tax.proposedRate > tax.currentRate &&
        [
          'incomeTaxBasic',
          'incomeTaxHigher',
          'incomeTaxAdditional',
          'employeeNI',
          'employerNI',
          'vat',
          'corporationTax',
        ].includes(tax.id)
      ) {
        taxIncreaseCount++;
      }
    });

    spending.forEach((item) => {
      if (item.proposedBudget < item.currentBudget * 0.98) {
        spendingCutCount++;
      }
    });

    // Count manifesto violations
    const manifestoViolationCount = constraints.filter((c) => c.violated).length;
    const violationDescriptions = constraints.filter((c) => c.violated).map((c) => c.description);

    // Build budget changes for MP stance calculation
    const incomeTaxBasic = taxes.get('incomeTaxBasic');
    const incomeTaxHigher = taxes.get('incomeTaxHigher');
    const incomeTaxAdditional = taxes.get('incomeTaxAdditional');
    const niEmployee = taxes.get('employeeNI');
    const niEmployer = taxes.get('employerNI');
    const vat = taxes.get('vat');

    const nhsSpendingChange = calculateDepartmentDelta(spending, NHS_SPENDING_ITEM_IDS);
    const educationSpendingChange = calculateDepartmentDelta(spending, EDUCATION_SPENDING_ITEM_IDS);
    const defenceSpendingChange = calculateDepartmentDelta(spending, DEFENCE_SPENDING_ITEM_IDS);
    const welfareSpendingChange = calculateDepartmentDelta(spending, WELFARE_SPENDING_ITEM_IDS);

    const budgetChanges = {
      incomeTaxBasicChange: incomeTaxBasic ? incomeTaxBasic.proposedRate - incomeTaxBasic.currentRate : 0,
      incomeTaxHigherChange: incomeTaxHigher ? incomeTaxHigher.proposedRate - incomeTaxHigher.currentRate : 0,
      incomeTaxAdditionalChange: incomeTaxAdditional
        ? incomeTaxAdditional.proposedRate - incomeTaxAdditional.currentRate
        : 0,
      niEmployeeChange: niEmployee ? niEmployee.proposedRate - niEmployee.currentRate : 0,
      niEmployerChange: niEmployer ? niEmployer.proposedRate - niEmployer.currentRate : 0,
      vatChange: vat ? vat.proposedRate - vat.currentRate : 0,
      nhsSpendingChange,
      educationSpendingChange,
      defenceSpendingChange,
      welfareSpendingChange,
      detailedTaxRates: Object.fromEntries(
        Array.from(taxes.values()).map((tax) => [tax.id, tax.proposedRate - tax.currentRate])
      ),
      detailedSpendingBudgets: Object.fromEntries(
        Array.from(spending.values()).map((item) => [item.id, item.proposedBudget - item.currentBudget])
      ),
    };

    // Simulate parliamentary vote with enhanced MP system
    const result =
      gameState.mpSystem.allMPs.size > 0
        ? simulateEnhancedParliamentaryVote(
            gameState.mpSystem,
            budgetChanges,
            violationDescriptions,
            gameState.metadata.currentTurn
          )
        : simulateParliamentaryVote(
            gameState.political.backbenchSatisfaction,
            manifestoViolationCount,
            fiscalImpact.deficitChange,
            fiscalImpact.fiscalRulesMet,
            taxIncreaseCount,
            spendingCutCount,
            gameState.political.pmTrust
          );

    setVoteResult(result);

    // Record vote results to IndexedDB
    if (result.individualVotes && gameState.mpSystem.allMPs.size > 0) {
      const granularTaxDelta = Object.fromEntries(
        Array.from(taxes.values()).map((tax) => [tax.id, tax.proposedRate - tax.currentRate])
      ) as Record<string, number>;
      const granularSpendingDelta = Object.fromEntries(
        Array.from(spending.values()).map((item) => [item.id, item.proposedBudget - item.currentBudget])
      ) as Record<string, number>;

      const buildVoteReasoning = (mpId: string, choice: 'aye' | 'noe' | 'abstain'): string => {
        const mp = gameState.mpSystem.allMPs.get(mpId);
        if (!mp) return `Voted ${choice} on ${budgetType} budget`;

        if (choice === 'noe') {
          if (
            (granularSpendingDelta.nhsMentalHealth || 0) < -0.3 &&
            mp.constituency.demographics.unemploymentRate > 5.2
          ) {
            return 'Opposed due to cuts to mental health provision in a high-need constituency.';
          }
          if ((granularSpendingDelta.prisonsAndProbation || 0) < -0.2) {
            return 'Opposed over prisons funding, citing overcrowding and public safety risks.';
          }
          if ((granularTaxDelta.vatDomesticEnergy || 0) > 0 || (granularTaxDelta.vat || 0) > 0) {
            return 'Opposed due to higher VAT pressures worsening local cost-of-living concerns.';
          }
          return 'Opposed on constituency impact and policy alignment grounds.';
        }

        if (choice === 'abstain') {
          if ((granularSpendingDelta.courts || 0) < -0.1 || (granularSpendingDelta.legalAid || 0) < -0.1) {
            return 'Abstained over concern about court delays and legal aid pressures.';
          }
          return 'Abstained, citing unresolved constituency concerns about the package.';
        }

        return 'Supported after balancing constituency impacts against party and fiscal priorities.';
      };

      const voteRecords = Array.from(result.individualVotes.entries()).map(([mpId, choice]) => ({
        mpId,
        budgetId: `budget_${gameState.metadata.currentTurn}`,
        month: gameState.metadata.currentTurn,
        choice,
        reasoning: buildVoteReasoning(mpId, choice),
      }));
      batchRecordBudgetVotes(voteRecords as any).catch((err) => console.error('Failed to record votes:', err));
      gameActions.recordBudgetVotes(voteRecords as any);
    }

    // Detect broken promises
    if (gameState.mpSystem.promises.size > 0) {
      const brokenPromiseIds = detectBrokenPromises(
        gameState.mpSystem.promises,
        budgetChanges,
        gameState.metadata.currentTurn
      );
      if (brokenPromiseIds.length > 0) {
        // Mark each promise as broken in IndexedDB
        brokenPromiseIds.forEach(async (promiseId) => {
          try {
            await markPromiseBroken(promiseId, gameState.metadata.currentTurn);
          } catch (err) {
            console.error(`Failed to mark promise ${promiseId} as broken:`, err);
          }
        });

        // Update state to sync UI
        gameActions.updatePromises(brokenPromiseIds);

        // Count affected MPs
        let affectedMPCount = 0;
        brokenPromiseIds.forEach((promiseId) => {
          const promise = gameState.mpSystem.promises.get(promiseId);
          if (promise) {
            affectedMPCount += promise.promisedToMPs.length;
          }
        });

        // Show warning to user
        setBrokenPromisesAlert({ count: brokenPromiseIds.length, mpCount: affectedMPCount });
      }
    }

    // If the vote passes, apply the budget changes (handled by onVoteContinue)
    // If it fails, allow withdrawal (handled by onVoteWithdraw)
  }, [
    budgetType,
    fiscalImpact,
    taxes,
    spending,
    constraints,
    gameState.political,
    gameState.mpSystem,
    gameState.metadata,
    gameActions,
  ]);

  const applyBudgetToGameState = useCallback(() => {
    // Build BudgetChanges from the tax and spending deltas
    const incomeTaxBasic = taxes.get('incomeTaxBasic');
    const incomeTaxHigher = taxes.get('incomeTaxHigher');
    const incomeTaxAdditional = taxes.get('incomeTaxAdditional');
    const niEmployee = taxes.get('employeeNI');
    const niEmployer = taxes.get('employerNI');
    const vat = taxes.get('vat');
    const corpTax = taxes.get('corporationTax');

    const changes: any = {};

    // Sync the 6 main tax rates that the turn processor models directly
    if (incomeTaxBasic && incomeTaxBasic.proposedRate !== incomeTaxBasic.currentRate) {
      changes.incomeTaxBasicChange = incomeTaxBasic.proposedRate - incomeTaxBasic.currentRate;
    }
    if (incomeTaxHigher && incomeTaxHigher.proposedRate !== incomeTaxHigher.currentRate) {
      changes.incomeTaxHigherChange = incomeTaxHigher.proposedRate - incomeTaxHigher.currentRate;
    }
    if (incomeTaxAdditional && incomeTaxAdditional.proposedRate !== incomeTaxAdditional.currentRate) {
      changes.incomeTaxAdditionalChange = incomeTaxAdditional.proposedRate - incomeTaxAdditional.currentRate;
    }
    if (niEmployee && niEmployee.proposedRate !== niEmployee.currentRate) {
      changes.niEmployeeChange = niEmployee.proposedRate - niEmployee.currentRate;
    }
    if (niEmployer && niEmployer.proposedRate !== niEmployer.currentRate) {
      changes.niEmployerChange = niEmployer.proposedRate - niEmployer.currentRate;
    }
    if (vat && vat.proposedRate !== vat.currentRate) {
      changes.vatChange = vat.proposedRate - vat.currentRate;
    }
    if (corpTax && corpTax.proposedRate !== corpTax.currentRate) {
      changes.corporationTaxChange = corpTax.proposedRate - corpTax.currentRate;
    }
    if (welfareLevers.ucTaperRate !== gameState.fiscal.ucTaperRate) {
      changes.ucTaperRateChange = welfareLevers.ucTaperRate - gameState.fiscal.ucTaperRate;
    }
    if (welfareLevers.workAllowanceMonthly !== gameState.fiscal.workAllowanceMonthly) {
      changes.workAllowanceMonthlyChange = welfareLevers.workAllowanceMonthly - gameState.fiscal.workAllowanceMonthly;
    }
    if (welfareLevers.childcareSupportRate !== gameState.fiscal.childcareSupportRate) {
      changes.childcareSupportRateChange = welfareLevers.childcareSupportRate - gameState.fiscal.childcareSupportRate;
    }
    const personalAllowance = taxes.get('personalAllowance');
    const higherRateThreshold = taxes.get('higherRateThreshold');
    const additionalRateThreshold = taxes.get('additionalRateThreshold');
    const sdltAdditionalSurcharge = taxes.get('sdltAdditionalSurcharge');
    if (personalAllowance && personalAllowance.proposedRate !== personalAllowance.currentRate) {
      changes.personalAllowanceChange = personalAllowance.proposedRate - personalAllowance.currentRate;
    }
    if (higherRateThreshold && higherRateThreshold.proposedRate !== higherRateThreshold.currentRate) {
      changes.basicRateUpperThresholdChange = higherRateThreshold.proposedRate - higherRateThreshold.currentRate;
    }
    if (additionalRateThreshold && additionalRateThreshold.proposedRate !== additionalRateThreshold.currentRate) {
      changes.higherRateUpperThresholdChange =
        additionalRateThreshold.proposedRate - additionalRateThreshold.currentRate;
    }
    if (sdltAdditionalSurcharge && sdltAdditionalSurcharge.proposedRate !== sdltAdditionalSurcharge.currentRate) {
      changes.sdltAdditionalDwellingsSurchargeChange =
        sdltAdditionalSurcharge.proposedRate - sdltAdditionalSurcharge.currentRate;
    }
    if (thresholdUprating !== gameState.fiscal.thresholdUprating) {
      changes.thresholdUprating = thresholdUprating;
    }
    if (fullExpensing !== gameState.fiscal.fullExpensing) {
      changes.fullExpensing = fullExpensing;
    }
    if (antiAvoidanceInvestment !== gameState.fiscal.antiAvoidanceInvestment_bn) {
      changes.antiAvoidanceInvestmentChange_bn = antiAvoidanceInvestment - gameState.fiscal.antiAvoidanceInvestment_bn;
    }
    if (hmrcSystemsInvestment !== gameState.fiscal.hmrcSystemsInvestment_bn) {
      changes.hmrcSystemsInvestmentChange_bn = hmrcSystemsInvestment - gameState.fiscal.hmrcSystemsInvestment_bn;
    }
    if (planningReformPackage !== gameState.housing.planningReformPackage) {
      changes.planningReformPackage = planningReformPackage;
    }
    if (infrastructureGuarantees !== gameState.housing.infrastructureGuarantees_bn) {
      changes.infrastructureGuaranteesChange_bn =
        infrastructureGuarantees - gameState.housing.infrastructureGuarantees_bn;
    }
    if (htbSupport !== gameState.housing.htbAndSharedOwnership_bn) {
      changes.htbAndSharedOwnershipChange_bn = htbSupport - gameState.housing.htbAndSharedOwnership_bn;
    }
    if (councilHousingGrant !== gameState.housing.councilHouseBuildingGrant_bn) {
      changes.councilHouseBuildingGrantChange_bn = councilHousingGrant - gameState.housing.councilHouseBuildingGrant_bn;
    }
    if (localGovernmentGrantSettlement !== (gameState.devolution.localGov.centralGrant_bn || 30)) {
      changes.localGovCentralGrantChange_bn =
        localGovernmentGrantSettlement - (gameState.devolution.localGov.centralGrant_bn || 30);
    }
    if (councilTaxReferendumCap !== (gameState.devolution.localGov.councilTaxGrowthCap || 3)) {
      changes.councilTaxGrowthCapChange =
        councilTaxReferendumCap - (gameState.devolution.localGov.councilTaxGrowthCap || 3);
    }
    if (selectedIndustrialInterventions.size > 0) {
      changes.industrialInterventionAddIds = Array.from(selectedIndustrialInterventions);
    }

    // Calculate revenue adjustment from all OTHER tax changes
    // (taxes beyond the 7 rates the turn processor models: income tax x3, NI x2, VAT, corp tax)
    const mainTaxIds = new Set([
      'incomeTaxBasic',
      'incomeTaxHigher',
      'incomeTaxAdditional',
      'employeeNI',
      'employerNI',
      'vat',
      'corporationTax',
    ]);
    let otherTaxRevenue = 0;
    taxes.forEach((tax) => {
      if (!mainTaxIds.has(tax.id) && tax.proposedRate !== tax.currentRate) {
        const rateChange = tax.proposedRate - tax.currentRate;
        const reckoner = TAX_RECKONERS[tax.id];
        if (reckoner) {
          if (THRESHOLD_TAX_IDS.has(tax.id)) {
            otherTaxRevenue += reckoner * (rateChange / 1000);
          } else {
            otherTaxRevenue += reckoner * rateChange;
          }
        }
      }
    });
    changes.revenueAdjustment = otherTaxRevenue;

    // Map spending changes: aggregate by department AND type (current vs capital)
    const deptTotals: Record<
      string,
      {
        currentCurrent: number;
        proposedCurrent: number;
        currentCapital: number;
        proposedCapital: number;
      }
    > = {};

    spending.forEach((item) => {
      const dept = item.department.toLowerCase();
      // Skip debt interest - handled separately by turn processor
      if (dept.includes('debt interest')) return;

      // Map departments to game state spending keys
      let key = '';
      if (dept.includes('health')) key = 'nhs';
      else if (dept.includes('education')) key = 'education';
      else if (dept.includes('defence')) key = 'defence';
      else if (dept.includes('work') || dept.includes('pension')) key = 'welfare';
      else if (dept.includes('transport') || dept.includes('energy') || dept.includes('housing'))
        key = 'infrastructure';
      else if (dept.includes('home')) key = 'police';
      else if (dept.includes('justice')) key = 'justice';
      else key = 'other'; // Environment, Science, Foreign Office, etc.

      if (!deptTotals[key]) {
        deptTotals[key] = {
          currentCurrent: 0,
          proposedCurrent: 0,
          currentCapital: 0,
          proposedCapital: 0,
        };
      }

      // Separate current (resource) and capital spending
      if (item.type === 'resource') {
        deptTotals[key].currentCurrent += item.currentBudget;
        deptTotals[key].proposedCurrent += item.proposedBudget;
      } else if (item.type === 'capital') {
        deptTotals[key].currentCapital += item.currentBudget;
        deptTotals[key].proposedCapital += item.proposedBudget;
      }
    });

    // Calculate changes for both current and capital spending
    for (const [dept, totals] of Object.entries(deptTotals)) {
      const currentDiff = totals.proposedCurrent - totals.currentCurrent;
      const capitalDiff = totals.proposedCapital - totals.currentCapital;

      if (Math.abs(currentDiff) > 0.01) {
        const key = `${dept}CurrentChange`;
        changes[key] = currentDiff;
      }

      if (Math.abs(capitalDiff) > 0.01) {
        const key = `${dept}CapitalChange`;
        changes[key] = capitalDiff;
      }
    }

    const detailedTaxRates: Record<string, number> = {};
    taxes.forEach((tax) => {
      detailedTaxRates[tax.id] = tax.proposedRate;
    });
    changes.detailedTaxRates = detailedTaxRates;

    const detailedSpendingBudgets: Record<string, number> = {};
    spending.forEach((item) => {
      detailedSpendingBudgets[item.id] = item.proposedBudget;
    });
    changes.detailedSpendingBudgets = detailedSpendingBudgets;
    changes.policyRiskModifiers = policyConflicts.flatMap((conflict) => conflict.modifiers);

    // Apply to game state
    gameActions.applyBudgetChanges(changes);

    // Reset proposed values to current after submit
    const updatedTaxes = new Map(taxes);
    updatedTaxes.forEach((tax, key) => {
      updatedTaxes.set(key, { ...tax, currentRate: tax.proposedRate });
    });
    setTaxes(updatedTaxes);

    const updatedSpending = new Map(spending);
    updatedSpending.forEach((item, key) => {
      updatedSpending.set(key, { ...item, currentBudget: item.proposedBudget });
    });
    setSpending(updatedSpending);
    gameActions.clearBudgetDraft();
  }, [
    taxes,
    spending,
    gameActions,
    policyConflicts,
    welfareLevers,
    thresholdUprating,
    fullExpensing,
    antiAvoidanceInvestment,
    hmrcSystemsInvestment,
    planningReformPackage,
    infrastructureGuarantees,
    htbSupport,
    councilHousingGrant,
    selectedIndustrialInterventions,
    localGovernmentGrantSettlement,
    councilTaxReferendumCap,
    gameState.fiscal.ucTaperRate,
    gameState.fiscal.workAllowanceMonthly,
    gameState.fiscal.childcareSupportRate,
    gameState.fiscal.thresholdUprating,
    gameState.fiscal.fullExpensing,
    gameState.fiscal.antiAvoidanceInvestment_bn,
    gameState.fiscal.hmrcSystemsInvestment_bn,
    gameState.housing.planningReformPackage,
    gameState.housing.infrastructureGuarantees_bn,
    gameState.housing.htbAndSharedOwnership_bn,
    gameState.housing.councilHouseBuildingGrant_bn,
    gameState.devolution.localGov.centralGrant_bn,
    gameState.devolution.localGov.councilTaxGrowthCap,
  ]);

  const handleVoteContinue = useCallback(() => {
    applyBudgetToGameState();
    setVoteResult(null);
  }, [applyBudgetToGameState]);

  const handleVoteWithdraw = useCallback(() => {
    // Budget defeated - don't apply changes, just close the modal
    setVoteResult(null);
  }, []);

  const handlePMIntervention = useCallback(() => {
    // Close the intervention modal
    setShowPMInterventionModal(false);

    // Call the game action which applies all consequences
    gameActions.forcePMIntervention();

    // Apply the budget changes
    applyBudgetToGameState();

    // Trigger save via useEffect once state updates complete
    setPMInterventionTriggered(true);

    // Show a success message
    setPMInterventionSuccess(true);
  }, [gameActions, applyBudgetToGameState]);

  const handleConfirmFiscalRuleChange = useCallback(() => {
    if (proposedFiscalRule === gameState.political.chosenFiscalRule) {
      setShowFiscalRuleChangeModal(false);
      return;
    }

    gameActions.changeFiscalFramework(proposedFiscalRule);
    setFiscalRuleMessage(
      `Fiscal framework changed to ${getFiscalRuleById(proposedFiscalRule).name}. Market and political consequences will apply next turn.`
    );
    setShowFiscalRuleChangeModal(false);
  }, [gameActions, proposedFiscalRule, gameState.political.chosenFiscalRule]);

  // ============================================================================
  // RENDER UTILITIES
  // ============================================================================

  const renderTaxControl = (tax: TaxChange) => {
    const change = tax.proposedRate - tax.currentRate;
    const changeColour = change > 0 ? 'text-status-bad' : change < 0 ? 'text-status-good' : 'text-tertiary';
    const { min: minRate, max: maxRate } = getTaxRateLimits(tax);

    // Determine input step based on tax type and magnitude
    const isThreshold = THRESHOLD_TAX_IDS.has(tax.id);
    let step: number;
    if (tax.unit === 'p/litre') {
      step = 0.01;
    } else if (isThreshold) {
      if (tax.currentRate >= 100000) step = 5000;
      else if (tax.currentRate >= 10000) step = 500;
      else step = 100;
    } else if (tax.unit === '£') {
      step = 1;
    } else {
      step = 0.1;
    }

    // Format display value
    const formatValue = (val: number): string => {
      if (isThreshold && tax.currentRate >= 100000) {
        return `£${(val / 1000).toFixed(0)}k`;
      }
      if (tax.unit === '£') return val.toFixed(0);
      if (tax.unit === 'p/litre') return val.toFixed(2);
      return val.toFixed(1);
    };

    // Revenue description for thresholds
    const revenueLabel =
      tax.currentRevenue > 0
        ? `Current revenue: £${tax.currentRevenue.toFixed(1)}bn`
        : isThreshold
          ? 'Threshold/Allowance'
          : '';
    const lafferTaxType = getLafferTaxTypeForControlId(tax.id);
    const lafferPeak = lafferTaxType ? calculateLafferPoint(lafferTaxType, gameState as any) : null;

    return (
      <div
        key={tax.id}
        className="bg-transparent border-b border-border-strong p-4 hover:border-accent transition-colors"
      >
        <div className="flex justify-between items-start mb-3">
          <div>
            <h4 className="font-semibold text-primary">{tax.name}</h4>
            {revenueLabel && <p className="text-sm text-tertiary">{revenueLabel}</p>}
          </div>
          <div className="text-right">
            <div className="text-xl font-mono font-semibold text-primary">
              {isThreshold && tax.currentRate >= 100000
                ? `£${(tax.proposedRate / 1000).toFixed(0)}k`
                : `${formatValue(tax.proposedRate)}`}
              {!(isThreshold && tax.currentRate >= 100000) && (
                <span className="text-sm font-normal text-tertiary ml-1">{tax.unit}</span>
              )}
            </div>
            {change !== 0 && (
              <div className={`text-sm font-semibold ${changeColour}`}>
                {change > 0 ? '+' : ''}
                {isThreshold && tax.currentRate >= 100000
                  ? `£${(change / 1000).toFixed(1)}k`
                  : `${formatValue(change)}${tax.unit}`}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-tertiary uppercase tracking-wide">Proposed value</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step={step}
              min={minRate}
              max={maxRate}
              value={Number.isFinite(tax.proposedRate) ? tax.proposedRate : ''}
              onChange={(e) => {
                const parsed = parseFloat(e.target.value);
                handleTaxChange(tax.id, Number.isFinite(parsed) ? parsed : tax.currentRate);
              }}
              className="w-full border-b border-border-strong bg-transparent px-3 py-2 text-primary"
            />
            <span className="text-sm text-tertiary min-w-[4rem]">{tax.unit}</span>
          </div>
          <div className="text-xs text-tertiary">
            Current:{' '}
            <span className="font-semibold text-secondary">
              {formatValue(tax.currentRate)}
              {isThreshold && tax.currentRate >= 100000 ? '' : tax.unit}
            </span>
          </div>
        </div>

        {change !== 0 && (
          <div className="mt-3 pt-3 border-t border-border-custom">
            <div className="text-sm text-secondary">
              Revenue impact:{' '}
              <span className={`font-semibold ${changeColour}`}>
                {calculateRevenueImpact(tax) >= 0 ? '+' : ''}£{calculateRevenueImpact(tax).toFixed(2)}bn
              </span>
            </div>
          </div>
        )}

        {lafferPeak !== null && (
          <div className="mt-3 text-xs text-secondary bg-transparent border-b border-border-strong p-2">
            Est. revenue peak: {lafferPeak.toFixed(1)}%
          </div>
        )}
      </div>
    );
  };

  const calculateRevenueImpact = (tax: TaxChange): number => {
    const rateChange = tax.proposedRate - tax.currentRate;
    const reckoner = TAX_RECKONERS[tax.id as keyof typeof TAX_RECKONERS];
    if (!reckoner) return 0;

    if (THRESHOLD_TAX_IDS.has(tax.id)) {
      return reckoner * (rateChange / 1000);
    } else {
      return reckoner * rateChange;
    }
  };

  const renderSpendingControl = (item: SpendingChange) => {
    const isDebtInterest = item.id === 'debtInterest';
    const change = item.proposedBudget - item.currentBudget;
    const changePct = item.currentBudget > 0 ? (change / item.currentBudget) * 100 : 0;
    const changeColour = change > 0 ? 'text-accent' : change < 0 ? 'text-status-bad' : 'text-tertiary';

    // Calculate target value for manifesto commitments
    let targetBudget: number | null = null;
    let targetLabel = '';

    if (
      NHS_SPENDING_ITEM_IDS.includes(item.id) &&
      currentNHSTotal > 0 &&
      currentNHSTotal < nhsAnnualTargetTotal - 0.01
    ) {
      // NHS annual pledge target is measured from fiscal-year start, then apportioned across NHS lines.
      const nhsShare = item.currentBudget / currentNHSTotal;
      targetBudget = nhsAnnualTargetTotal * nhsShare;
      targetLabel = 'NHS annual target';
    } else if (DEFENCE_SPENDING_ITEM_IDS.includes(item.id)) {
      // Defence items should scale proportionally to maintain 2% GDP
      const currentDefenceTotal = sumSpendingItems(spending, DEFENCE_SPENDING_ITEM_IDS, 'currentBudget');
      const targetDefenceTotal = 54.6;
      if (currentDefenceTotal > 0 && currentDefenceTotal < targetDefenceTotal) {
        const scalingFactor = targetDefenceTotal / currentDefenceTotal;
        targetBudget = item.currentBudget * scalingFactor;
        targetLabel = 'Defence pledge target';
      }
    } else if (item.id === 'statePension' && item.currentBudget < statePensionAnnualTarget - 0.01) {
      // Triple lock target is annual from fiscal-year baseline.
      targetBudget = statePensionAnnualTarget;
      targetLabel = 'Triple lock annual target';
    }

    return (
      <div
        key={item.id}
        className={`bg-transparent border p-4 ${
          isDebtInterest ? 'border-border-custom bg-transparent/50' : 'border-border-custom hover:border-accent'
        }`}
      >
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h4 className="font-semibold text-primary">{item.programme || item.department}</h4>
            <div className="flex flex-wrap gap-2 items-center mt-1">
              <span className="text-xs text-tertiary">{item.department}</span>
              <span
                className={`text-xs px-2 py-0.5 ${
                  item.type === 'capital'
                    ? 'bg-accent-subtle text-accent border border-accent'
                    : 'bg-secondary-subtle text-secondary border border-secondary'
                }`}
              >
                {item.type === 'capital' ? 'Capital' : 'Resource'}
              </span>
              {targetBudget && (
                <span className="text-xs px-2 py-0.5 bg-warning-subtle text-warning border border-warning">
                  {targetLabel}
                </span>
              )}
              {isDebtInterest && (
                <span className="text-xs px-2 py-0.5 bg-transparent text-muted border-b border-border-strong">
                  Non-Discretionary
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-mono font-semibold text-primary">
              £{item.proposedBudget.toFixed(1)}
              <span className="text-sm font-normal text-tertiary">bn</span>
            </div>
            {change !== 0 && (
              <div className={`text-sm font-semibold ${changeColour}`}>
                {change > 0 ? '+' : ''}£{change.toFixed(1)}bn ({changePct > 0 ? '+' : ''}
                {changePct.toFixed(1)}%)
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-tertiary uppercase tracking-wide">
            {isDebtInterest ? 'Current interest commitment' : 'Proposed budget'}
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-tertiary">£</span>
            <input
              type="number"
              min={0}
              step={0.1}
              value={Number.isFinite(item.proposedBudget) ? item.proposedBudget : ''}
              disabled={isDebtInterest}
              onChange={(e) => {
                if (isDebtInterest) return;
                const parsed = parseFloat(e.target.value);
                const nextValue = Number.isFinite(parsed) ? Math.max(0, parsed) : item.currentBudget;
                handleSpendingChange(item.id, nextValue);
              }}
              className={`w-full border px-3 py-2 text-primary ${
                isDebtInterest
                  ? 'bg-transparent border-border-custom text-muted cursor-not-allowed'
                  : 'bg-transparent border-border-custom'
              }`}
            />
            <span className="text-sm text-tertiary">bn</span>
          </div>
          <div className="flex justify-between text-xs text-tertiary">
            <span className="font-semibold text-secondary">Current: £{item.currentBudget.toFixed(1)}bn</span>
            {targetBudget && <span className="font-semibold text-warning">Target: £{targetBudget.toFixed(1)}bn</span>}
            {!isDebtInterest && <span>Minimum: £0.0bn</span>}
          </div>

          {isDebtInterest && (
            <div className="mt-2 p-3 bg-accent-subtle border border-accent text-xs text-accent leading-relaxed">
              <div className="flex gap-2">
                <span className="font-semibold">Note:</span>
                <span>
                  Interest payments are non-discretionary. To reduce interest costs, reduce the deficit and/or lower the
                  total debt stock.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Set to target button */}
        {targetBudget && Math.abs(item.proposedBudget - targetBudget) > 0.01 && (
          <div className="mt-3 pt-3 border-t border-border-custom">
            <button
              onClick={() => handleSpendingChange(item.id, targetBudget!)}
              className="w-full px-3 py-2 bg-warning-subtle hover:bg-warning-subtle/80 text-warning text-sm font-semibold border border-warning transition-colors"
            >
              Set to target (£{targetBudget.toFixed(1)}bn)
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderWarning = (warning: AdviserWarning) => {
    const bgColour =
      warning.severity === 'critical'
        ? 'bg-bad-subtle border-bad'
        : warning.severity === 'warning'
          ? 'bg-warning-subtle border-warning'
          : 'bg-secondary-subtle border-secondary';
    const titleColour =
      warning.severity === 'critical'
        ? 'text-bad'
        : warning.severity === 'warning'
          ? 'text-warning'
          : 'text-secondary';
    const messageColour =
      warning.severity === 'critical'
        ? 'text-bad'
        : warning.severity === 'warning'
          ? 'text-warning'
          : 'text-secondary';

    return (
      <div key={warning.id} className={`border p-4 ${bgColour}`}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            {warning.severity === 'critical' && (
              <span className="text-bad text-lg">⚠</span>
            )}
            {warning.severity === 'warning' && (
              <span className="text-warning text-lg">⚠</span>
            )}
            {warning.severity === 'info' && (
              <span className="text-secondary text-lg">ℹ</span>
            )}
          </div>
          <div className="flex-1">
            <h4 className={`font-semibold ${titleColour}`}>{warning.title}</h4>
            <p className={`text-sm mt-1 ${messageColour}`}>{warning.message}</p>
            {warning.impact && <p className={`text-sm mt-2 ${messageColour} font-medium`}>Impact: {warning.impact}</p>}
            <div className="mt-2 text-xs font-semibold text-tertiary uppercase">
              {warning.category} · {warning.severity}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderConstraint = (constraint: ManifestoConstraint) => {
    const statusColour = constraint.violated
      ? constraint.severity === 'critical'
        ? 'text-bad'
        : 'text-warning'
      : 'text-good';
    const bgColour = constraint.violated
      ? constraint.severity === 'critical'
        ? 'bg-bad-subtle border-bad'
        : 'bg-warning-subtle border-warning'
      : 'bg-good-subtle border-good';

    const canApply =
      constraint.violated &&
      [
        'nhs_pledge',
        'defence_pledge',
        'triple_lock',
        'income_tax_lock',
        'ni_lock',
        'vat_lock',
        'corporation_tax_lock',
      ].includes(constraint.id);

    return (
      <div key={constraint.id} className={`border p-4 ${bgColour}`}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {constraint.violated ? (
                <span className={`${statusColour} text-lg`}>✕</span>
              ) : (
                <span className={`${statusColour} text-lg`}>✓</span>
              )}
              <h4 className="font-semibold text-primary">{constraint.description}</h4>
            </div>
            <div className="mt-1 flex gap-2">
              <span
                className={`text-xs px-2 py-0.5 ${
                  constraint.type === 'fiscal_rule'
                    ? 'bg-secondary-subtle text-secondary'
                    : constraint.type === 'spending_pledge'
                      ? 'bg-warning-subtle text-warning'
                      : 'bg-bad-subtle text-bad'
                }`}
              >
                {constraint.type.replace('_', ' ')}
              </span>
              <span
                className={`text-xs px-2 py-0.5 ${
                  constraint.severity === 'critical'
                    ? 'bg-bad-subtle text-bad'
                    : constraint.severity === 'major'
                      ? 'bg-warning-subtle text-warning'
                      : 'bg-subdued text-tertiary'
                }`}
              >
                {constraint.severity}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {canApply && (
              <button
                onClick={() => applyManifestoCommitment(constraint.id)}
                className="px-4 py-2 bg-secondary hover:bg-secondary-hover text-white text-sm font-semibold transition-colors"
                title="Automatically adjust values to the minimum required to satisfy this commitment"
              >
                Apply
              </button>
            )}
            <div className={`text-right font-bold ${statusColour}`}>{constraint.violated ? 'VIOLATED' : 'MET'}</div>
          </div>
        </div>
      </div>
    );
  };

  // Group spending by department
  const spendingByDepartment = useMemo(() => {
    const grouped = new Map<string, SpendingChange[]>();
    spending.forEach((item) => {
      const dept = item.department;
      if (!grouped.has(dept)) {
        grouped.set(dept, []);
      }
      grouped.get(dept)!.push(item);
    });
    return grouped;
  }, [spending]);

  const spendingReviewPlanTotal = useMemo(() => {
    return SPENDING_REVIEW_DEPARTMENT_ORDER.reduce((sum, key) => {
      const dept = gameState.spendingReview.departments[key];
      const resourceTotal = (dept.plannedResourceDEL_bn || []).reduce((acc, value) => acc + value, 0);
      const capitalTotal = (dept.plannedCapitalDEL_bn || []).reduce((acc, value) => acc + value, 0);
      return sum + resourceTotal + capitalTotal;
    }, 0);
  }, [gameState.spendingReview.departments]);

  const spendingReviewEnvelope = useMemo(() => {
    const ruleRequiresPrudence = gameState.political.chosenFiscalRule !== 'mmt-inspired';
    const prudenceMargin = ruleRequiresPrudence ? Math.max(1.5, gameState.fiscal.fiscalHeadroom_bn * 0.15) : 0;
    const amePressures =
      Math.max(0, (gameState.fiscal.welfareAME_bn || 115) - 115) +
      Math.max(0, gameState.fiscal.housingAMEPressure_bn || 0) +
      Math.max(0, (gameState.fiscal.debtInterest_bn || 0) - 95);
    const baselineAnnualDEL = 1200;
    const annualEnvelope = Math.max(
      0,
      baselineAnnualDEL + gameState.fiscal.fiscalHeadroom_bn - amePressures - prudenceMargin
    );
    return {
      prudenceMargin,
      amePressures,
      annualEnvelope,
      threeYearEnvelope: annualEnvelope * 3,
    };
  }, [
    gameState.fiscal.fiscalHeadroom_bn,
    gameState.fiscal.welfareAME_bn,
    gameState.fiscal.housingAMEPressure_bn,
    gameState.fiscal.debtInterest_bn,
    gameState.political.chosenFiscalRule,
  ]);

  const handleSpendingReviewPlanChange = useCallback(
    (
      departmentKey: keyof SpendingReviewState['departments'],
      planType: 'resource' | 'capital',
      yearIdx: number,
      nextValue: number
    ) => {
      const normalized = Number.isFinite(nextValue) ? Math.max(0, nextValue) : 0;
      const nextDepartments = { ...gameState.spendingReview.departments };
      const nextDepartment = { ...nextDepartments[departmentKey] };

      if (planType === 'resource') {
        const updated = [...nextDepartment.plannedResourceDEL_bn];
        updated[yearIdx] = normalized;
        nextDepartment.plannedResourceDEL_bn = updated;
      } else {
        const updated = [...nextDepartment.plannedCapitalDEL_bn];
        updated[yearIdx] = normalized;
        nextDepartment.plannedCapitalDEL_bn = updated;
      }

      nextDepartments[departmentKey] = nextDepartment;
      gameActions.updateSpendingReviewPlans(nextDepartments);
    },
    [gameActions, gameState.spendingReview.departments]
  );

  const barnettPreview = useMemo(() => {
    const nhsCurrent =
      spending.get('nhsEngland')?.proposedBudget ??
      (gameState.fiscal.detailedSpending.find((item: { id: string; currentBudget: number }) => item.id === 'nhsEngland')?.currentBudget || 164.9);
    const educationCurrent =
      spending.get('schools')?.proposedBudget ??
      (gameState.fiscal.detailedSpending.find((item: { id: string; currentBudget: number }) => item.id === 'schools')?.currentBudget || 59.8);
    const transportHousing =
      (spending.get('railSubsidy')?.proposedBudget ?? 5.5) + (spending.get('housingCapital')?.proposedBudget ?? 2.5);
    const baselineTransportHousing = 5.5 + 2.5;
    const comparableChange =
      nhsCurrent - 164.9 + (educationCurrent - 59.8) + (transportHousing - baselineTransportHousing);
    const scotland = comparableChange * 0.0998;
    const wales = comparableChange * 0.0597;
    const northernIreland = comparableChange * 0.0348;
    return {
      scotland,
      wales,
      northernIreland,
      total: scotland + wales + northernIreland,
    };
  }, [spending, gameState.fiscal.detailedSpending]);

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-bg-surface">
      {/* Header */}
      <div className="bg-primary text-white border-b border-border-strong">
        <div className="px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs uppercase tracking-widest text-white/60 mb-1">HM Treasury</div>
              <h1 className="font-display text-2xl font-semibold">Budget Planning</h1>
            </div>
            <div className="flex items-center gap-1">
              {(() => {
                const month = gameState.metadata.currentMonth;
                const isSpring = month >= 3 && month <= 5;
                const isAutumn = month >= 9 && month <= 11;

                return (
                  <>
                    <button
                      onClick={() => isSpring && setBudgetType('spring')}
                      disabled={!isSpring}
                      className={`px-4 py-2 text-sm font-semibold uppercase tracking-wide transition-all ${
                        budgetType === 'spring'
                          ? 'bg-elevated text-primary'
                          : isSpring
                            ? 'bg-elevated/20 hover:bg-elevated/30'
                            : 'opacity-40 cursor-not-allowed'
                      }`}
                    >
                      Spring Budget
                    </button>

                    <button
                      onClick={() => isAutumn && setBudgetType('autumn')}
                      disabled={!isAutumn}
                      className={`px-4 py-2 text-sm font-semibold uppercase tracking-wide transition-all ${
                        budgetType === 'autumn'
                          ? 'bg-elevated text-primary'
                          : isAutumn
                            ? 'bg-elevated/20 hover:bg-elevated/30'
                            : 'opacity-40 cursor-not-allowed'
                      }`}
                    >
                      Autumn Statement
                    </button>

                    <button
                      onClick={() => setBudgetType('emergency')}
                      className={`px-4 py-2 text-sm font-semibold uppercase tracking-wide transition-all ${
                        budgetType === 'emergency' ? 'bg-elevated text-primary' : 'bg-elevated/20 hover:bg-elevated/30'
                      }`}
                    >
                      Emergency
                    </button>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Adviser Briefing Ribbon */}
      {(() => {
        const hiredAdvisers = adviserSystem?.hiredAdvisers;
        let advisersList: any[] = [];
        let hasAdvisers = false;
        if (hiredAdvisers instanceof Map) {
          hasAdvisers = hiredAdvisers.size > 0;
          advisersList = Array.from(hiredAdvisers.values());
        } else if (typeof hiredAdvisers === 'object' && hiredAdvisers !== null) {
          const keys = Object.keys(hiredAdvisers);
          hasAdvisers = keys.length > 0;
          advisersList = Object.values(hiredAdvisers);
        }

        if (!hasAdvisers) return null;

        const getOpinion = (type: string) => {
          if (adviserOpinions instanceof Map) {
            return adviserOpinions.get(type as AdviserType);
          } else if (typeof adviserOpinions === 'object' && adviserOpinions !== null) {
            return (adviserOpinions as any)[type];
          }
          return undefined;
        };

        const severityColour = (severity: string) => {
          switch (severity) {
            case 'critical':
              return 'bg-bad text-white';
            case 'warning':
              return 'bg-warning text-white';
            case 'caution':
              return 'bg-warning/60 text-white';
            case 'supportive':
              return 'bg-good text-white';
            default:
              return 'bg-border-strong text-secondary';
          }
        };

        return (
          <div className="border-b border-border-strong bg-bg-elevated/80">
            <div className="px-6 py-2.5 flex items-center gap-4">
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="w-1 h-4 bg-primary" />
                <span className="text-xs uppercase tracking-widest text-tertiary font-semibold">Adviser Briefing</span>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto">
                {advisersList.map((hired: any) => {
                  if (!hired?.profile) return null;
                  const opinion = getOpinion(hired.profile.type);
                  if (!opinion) return null;
                  return (
                    <button
                      key={hired.profile.type}
                      onClick={() => setShowAdviserDetail(hired.profile.type)}
                      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity ${severityColour(opinion.overallAssessment)}`}
                    >
                      <span>{hired.profile.name.split(' ').pop()}</span>
                      <span className="opacity-70">{opinion.warnings.length > 0 ? `(${opinion.warnings.length}!)` : ''}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Fiscal Impact Summary Bar */}
      <div className="border-b border-border-strong bg-bg-elevated sticky top-0 z-10">
        <div className="px-6 py-3">
          <div className="grid grid-cols-7 gap-4 text-sm">
            <div>
              <div className="text-label text-tertiary">Deficit Change</div>
              <div
                className={`text-lg font-mono font-semibold ${
                  fiscalImpact.deficitChange > 0
                    ? 'text-bad'
                    : fiscalImpact.deficitChange < 0
                      ? 'text-good'
                      : 'text-primary'
                }`}
              >
                {fiscalImpact.deficitChange > 0 ? '+' : ''}£{fiscalImpact.deficitChange.toFixed(1)}bn
              </div>
            </div>
            <div>
              <div className="text-label text-tertiary">Projected Deficit</div>
              <div className="text-lg font-mono font-semibold text-primary">
                £{fiscalImpact.projectedDeficit.toFixed(1)}bn
              </div>
            </div>
            <div>
              <div className="text-label text-tertiary">Debt-to-GDP</div>
              <div className="text-lg font-mono font-semibold text-primary">
                {fiscalImpact.debtGDPRatio.toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-label text-tertiary">Fiscal Rules</div>
              <div
                className={`text-lg font-mono font-semibold ${fiscalImpact.fiscalRulesMet ? 'text-good' : 'text-bad'}`}
              >
                {fiscalImpact.fiscalRulesMet ? 'MET' : 'BREACH'}
              </div>
            </div>
            <div
              className={`px-3 py-1 ${
                fiscalImpact.headroom > 10
                  ? 'bg-good-subtle'
                  : fiscalImpact.headroom > 0
                    ? 'bg-warning-subtle'
                    : 'bg-bad-subtle'
              }`}
            >
              <div className="text-label text-tertiary">
                {getRuleHeadroomLabel(getFiscalRuleById(gameState.political.chosenFiscalRule))}
              </div>
              <div
                className={`text-lg font-mono font-semibold ${
                  fiscalImpact.headroom > 10 ? 'text-good' : fiscalImpact.headroom > 0 ? 'text-warning' : 'text-bad'
                }`}
              >
                {fiscalImpact.headroom >= 0 ? '+' : ''}£{fiscalImpact.headroom.toFixed(1)}bn
              </div>
            </div>
            <div>
              <div className="text-label text-tertiary">Warnings</div>
              <div
                className={`text-lg font-mono font-semibold ${
                  warnings.filter((w) => w.severity === 'critical').length > 0
                    ? 'text-bad'
                    : warnings.length > 0
                      ? 'text-warning'
                      : 'text-good'
                }`}
              >
                {warnings.length}
              </div>
            </div>
            <div>
              <div className="text-label text-tertiary">Debt Strategy</div>
              <select
                value={gameState.debtManagement.issuanceStrategy}
                onChange={(e) => gameActions.setDebtIssuanceStrategy(e.target.value as 'short' | 'balanced' | 'long')}
                className="w-full border-b border-border-strong bg-transparent px-2 py-1 text-sm text-primary mt-1"
              >
                <option value="short">Short</option>
                <option value="balanced">Balanced</option>
                <option value="long">Long</option>
              </select>
            </div>
          </div>
          {Math.abs(gameState.fiscal.barnettConsequentials_bn || 0) > 0.01 && (
            <div className="mt-2 text-xs text-secondary bg-secondary-subtle border border-secondary px-3 py-1.5 inline-block">
              Barnett consequentials: +£{(gameState.fiscal.barnettConsequentials_bn || 0).toFixed(1)}bn
            </div>
          )}
        </div>
      </div>

      <div className="px-6 py-6">
        <div className="flex gap-6">
          {/* Main Content */}
          <div className="flex-1">
            {/* View Tabs */}
            <div className="border-b border-border-strong mb-6">
              <div className="flex">
                {(['taxes', 'spending', 'del', 'impact', 'constraints', 'debt'] as const).map((view) => (
                  <button
                    key={view}
                    onClick={() => setActiveView(view)}
                    className={`flex-1 px-6 py-3 font-semibold transition-colors border-b-2 ${
                      activeView === view
                        ? 'text-primary border-primary'
                        : 'text-tertiary border-transparent hover:text-primary'
                    }`}
                  >
                    {view === 'taxes' && 'Taxation'}
                    {view === 'spending' && 'Public Spending'}
                    {view === 'del' && 'DEL Plan (3Y)'}
                    {view === 'impact' && 'Fiscal Impact'}
                    {view === 'constraints' && 'Manifesto Commitments'}
                    {view === 'debt' && 'Debt Management'}
                  </button>
                ))}
              </div>
            </div>

            {activeView === 'del' && (
              <div className="space-y-4">
                <div className="bg-bg-surface border border-border-strong p-6">
                  <h2 className="text-xl font-bold text-primary">Departmental Expenditure Limits (3-Year Plan)</h2>
                  <p className="text-sm text-secondary mt-1">
                    Edit DEL plans at any time. Markets can react to out-year plans, but less than to current budgets
                    and headroom.
                  </p>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="border border-border-subtle p-3">
                      <div className="text-secondary">Projected 3Y DEL total</div>
                      <div className="text-2xl font-bold">£{spendingReviewPlanTotal.toFixed(1)}bn</div>
                    </div>
                    <div className="border border-border-subtle p-3">
                      <div className="text-secondary">Headroom envelope (3Y)</div>
                      <div className="text-2xl font-bold">£{spendingReviewEnvelope.threeYearEnvelope.toFixed(1)}bn</div>
                    </div>
                    <div
                      className={`border p-3 ${spendingReviewPlanTotal > spendingReviewEnvelope.threeYearEnvelope ? 'border-warning bg-warning-subtle' : 'border-good bg-good-subtle'}`}
                    >
                      <div className="text-secondary">Envelope check</div>
                      <div
                        className={`text-2xl font-bold ${spendingReviewPlanTotal > spendingReviewEnvelope.threeYearEnvelope ? 'text-warning' : 'text-good'}`}
                      >
                        {spendingReviewPlanTotal > spendingReviewEnvelope.threeYearEnvelope
                          ? 'Above envelope'
                          : 'Below envelope'}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-secondary">
                    Indicative envelope = headroom minus AME pressures (£
                    {spendingReviewEnvelope.amePressures.toFixed(1)}bn) and prudence margin (£
                    {spendingReviewEnvelope.prudenceMargin.toFixed(1)}bn).
                  </div>
                  <div className="mt-2 text-xs font-medium text-tertiary">
                    Spending Review plans are indicative guidelines and may be revised.
                  </div>
                  {spendingReviewPlanTotal > spendingReviewEnvelope.threeYearEnvelope && (
                    <div className="mt-4 text-sm text-warning bg-warning-subtle border border-warning px-3 py-2">
                      DEL plan is £{(spendingReviewPlanTotal - spendingReviewEnvelope.threeYearEnvelope).toFixed(1)}bn
                      above the 3-year envelope.
                    </div>
                  )}
                </div>

                {SPENDING_REVIEW_DEPARTMENT_ORDER.map((key) => {
                  const dept = gameState.spendingReview.departments[key];
                  return (
                    <div key={key} className="bg-bg-surface border border-border-strong p-5">
                      <div className="flex justify-between items-center mb-3">
                        <div>
                          <h3 className="text-lg font-bold text-primary">{dept.name}</h3>
                          <div className="text-xs text-secondary">
                            Service quality and backlog context from latest turn
                          </div>
                        </div>
                        <div className="text-xs text-secondary">
                          Backlog {dept.backlog.toFixed(0)} · Delivery capacity {dept.deliveryCapacity.toFixed(0)}
                        </div>
                      </div>
                      {(() => {
                        const deptTotal =
                          (dept.plannedResourceDEL_bn || []).reduce((acc, value) => acc + value, 0) +
                          (dept.plannedCapitalDEL_bn || []).reduce((acc, value) => acc + value, 0);
                        const fairShare =
                          spendingReviewPlanTotal > 0
                            ? spendingReviewEnvelope.threeYearEnvelope * (deptTotal / spendingReviewPlanTotal)
                            : 0;
                        const breach = deptTotal - fairShare;
                        return (
                          <div className={`text-xs mb-3 ${breach > 0 ? 'text-warning' : 'text-good'}`}>
                            {breach > 0
                              ? `Department indicative envelope breach: +£${breach.toFixed(1)}bn`
                              : 'Department within indicative envelope share'}
                          </div>
                        );
                      })()}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {[0, 1, 2].map((yearIdx) => (
                          <div key={`${key}_year_${yearIdx}`} className="border border-border-subtle p-3">
                            <div className="text-xs uppercase tracking-wide text-secondary mb-2">Year {yearIdx + 1}</div>
                            <label className="text-xs text-secondary block mb-1">Resource DEL (£bn)</label>
                            <input
                              type="number"
                              className="w-full border border-border-strong px-2 py-1 text-sm"
                              value={yearIdx === 0 ? dept.resourceDEL_bn : dept.plannedResourceDEL_bn[yearIdx]}
                              disabled={yearIdx === 0}
                              onChange={(e) =>
                                handleSpendingReviewPlanChange(key, 'resource', yearIdx, Number(e.target.value))
                              }
                            />
                            <label className="text-xs text-secondary block mt-3 mb-1">Capital DEL (£bn)</label>
                            <input
                              type="number"
                              className="w-full border border-border-strong px-2 py-1 text-sm"
                              value={yearIdx === 0 ? dept.capitalDEL_bn : dept.plannedCapitalDEL_bn[yearIdx]}
                              disabled={yearIdx === 0}
                              onChange={(e) =>
                                handleSpendingReviewPlanChange(key, 'capital', yearIdx, Number(e.target.value))
                              }
                            />
                            {yearIdx === 0 && (
                              <div className="text-[11px] text-muted mt-2">
                                Year 1 is synced to current budget values.
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeView === 'debt' && (
              <div className="bg-bg-surface border border-border-strong p-6 space-y-4">
                <h2 className="text-xl font-bold text-primary">Debt Management</h2>
                <p className="text-sm text-secondary">
                  Choose issuance strategy before advancing turn. Short lowers near-term cost but raises refinancing
                  risk.
                </p>
                <div className="text-sm text-secondary bg-secondary-subtle border border-secondary p-3">
                  Active strategy:{' '}
                  <span className="font-semibold capitalize">{gameState.debtManagement.issuanceStrategy}</span> · Yield
                  effect:{' '}
                  <span className="font-semibold">
                    {(gameState.debtManagement.strategyYieldEffect_bps || 0) >= 0 ? '+' : ''}
                    {(gameState.debtManagement.strategyYieldEffect_bps || 0).toFixed(0)} bps
                  </span>
                  {gameState.debtManagement.issuanceStrategy === 'short' && (
                    <span>
                      {' '}
                      · Rollover risk premium:{' '}
                      <span className="font-semibold">
                        +{(gameState.debtManagement.rolloverRiskPremium_bps || 0).toFixed(0)} bps
                      </span>
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="border border-border-subtle p-3">
                    <div className="text-secondary">Refinancing risk</div>
                    <div className="text-2xl font-bold">{gameState.debtManagement.refinancingRisk.toFixed(1)}</div>
                  </div>
                  <div className="border border-border-subtle p-3">
                    <div className="text-secondary">APF stock (QE/QT)</div>
                    <div className="text-2xl font-bold">
                      £{(gameState.markets.assetPurchaseFacility_bn || 0).toFixed(0)}bn
                    </div>
                  </div>
                  <div className="border border-border-subtle p-3">
                    <div className="text-secondary">Debt interest</div>
                    <div className="text-2xl font-bold">£{gameState.fiscal.debtInterest_bn.toFixed(1)}bn</div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="border border-border-subtle p-3">
                    <div className="text-secondary">Projected annual interest (Short)</div>
                    <div className="text-xl font-bold">
                      £
                      {(
                        gameState.debtManagement.projectedDebtInterestByStrategy_bn?.short ??
                        gameState.fiscal.debtInterest_bn
                      ).toFixed(1)}
                      bn
                    </div>
                  </div>
                  <div className="border border-border-subtle p-3">
                    <div className="text-secondary">Projected annual interest (Balanced)</div>
                    <div className="text-xl font-bold">
                      £
                      {(
                        gameState.debtManagement.projectedDebtInterestByStrategy_bn?.balanced ??
                        gameState.fiscal.debtInterest_bn
                      ).toFixed(1)}
                      bn
                    </div>
                  </div>
                  <div className="border border-border-subtle p-3">
                    <div className="text-secondary">Projected annual interest (Long)</div>
                    <div className="text-xl font-bold">
                      £
                      {(
                        gameState.debtManagement.projectedDebtInterestByStrategy_bn?.long ??
                        gameState.fiscal.debtInterest_bn
                      ).toFixed(1)}
                      bn
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Taxes View */}
            {activeView === 'taxes' && (
              <div className="space-y-6">
                {/* Income Tax Rates */}
                <div className="bg-bg-surface border border-border-strong p-6">
                  <h2 className="text-xl font-bold text-primary mb-2">Income Tax Rates</h2>
                  <p className="text-sm text-secondary mb-4">Revenue: £269bn · Affects 34 million taxpayers</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {renderTaxControl(taxes.get('incomeTaxBasic')!)}
                    {renderTaxControl(taxes.get('incomeTaxHigher')!)}
                    {renderTaxControl(taxes.get('incomeTaxAdditional')!)}
                  </div>
                </div>

                <div className="bg-bg-surface border border-border-strong p-6">
                  <h2 className="text-xl font-bold text-primary mb-2">Welfare and Labour Market Levers</h2>
                  <p className="text-sm text-secondary mb-4">
                    AME measures: reducing taper or increasing work allowances and childcare support can lower
                    structural unemployment over time, but increase welfare spending.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="border border-border-subtle p-3">
                      <label className="text-sm font-semibold text-tertiary">Universal Credit taper rate</label>
                      <input
                        type="number"
                        min={35}
                        max={75}
                        step={1}
                        value={welfareLevers.ucTaperRate}
                        onChange={(e) => setWelfareLevers((prev) => ({ ...prev, ucTaperRate: Number(e.target.value) }))}
                        className="w-full mt-2 border border-border-strong px-2 py-1 text-sm"
                      />
                      <div className="text-xs text-secondary mt-2">
                        Delta: {welfareLevers.ucTaperRate - gameState.fiscal.ucTaperRate >= 0 ? '+' : ''}
                        {(welfareLevers.ucTaperRate - gameState.fiscal.ucTaperRate).toFixed(0)}pp
                      </div>
                    </div>
                    <div className="border border-border-subtle p-3">
                      <label className="text-sm font-semibold text-tertiary">Work allowance</label>
                      <input
                        type="number"
                        min={200}
                        max={700}
                        step={10}
                        value={welfareLevers.workAllowanceMonthly}
                        onChange={(e) =>
                          setWelfareLevers((prev) => ({ ...prev, workAllowanceMonthly: Number(e.target.value) }))
                        }
                        className="w-full mt-2 border border-border-strong px-2 py-1 text-sm"
                      />
                      <div className="text-xs text-secondary mt-2">
                        Delta:{' '}
                        {welfareLevers.workAllowanceMonthly - gameState.fiscal.workAllowanceMonthly >= 0 ? '+' : ''}£
                        {(welfareLevers.workAllowanceMonthly - gameState.fiscal.workAllowanceMonthly).toFixed(0)}/month
                      </div>
                    </div>
                    <div className="border border-border-subtle p-3">
                      <label className="text-sm font-semibold text-tertiary">Childcare support rate</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        value={welfareLevers.childcareSupportRate}
                        onChange={(e) =>
                          setWelfareLevers((prev) => ({ ...prev, childcareSupportRate: Number(e.target.value) }))
                        }
                        className="w-full mt-2 border border-border-strong px-2 py-1 text-sm"
                      />
                      <div className="text-xs text-secondary mt-2">
                        Delta:{' '}
                        {welfareLevers.childcareSupportRate - gameState.fiscal.childcareSupportRate >= 0 ? '+' : ''}
                        {(welfareLevers.childcareSupportRate - gameState.fiscal.childcareSupportRate).toFixed(0)}pp
                      </div>
                    </div>
                  </div>
                </div>

                {/* Income Tax Thresholds & Allowances */}
                <div className="bg-bg-surface border border-border-strong p-6">
                  <h2 className="text-xl font-bold text-primary mb-2">Income Tax Thresholds and Allowances</h2>
                  <p className="text-sm text-secondary mb-4">
                    Frozen thresholds drag more earners into higher bands (fiscal drag). Moving thresholds has enormous
                    revenue impact.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {renderTaxControl(taxes.get('personalAllowance')!)}
                    {renderTaxControl(taxes.get('higherRateThreshold')!)}
                    {renderTaxControl(taxes.get('additionalRateThreshold')!)}
                    {renderTaxControl(taxes.get('marriageAllowance')!)}
                  </div>
                </div>

                <div className="bg-bg-surface border border-border-strong p-6">
                  <h2 className="text-xl font-bold text-primary mb-2">Threshold and Base Policy</h2>
                  <p className="text-sm text-secondary mb-4">
                    Choose uprating regime, anti-avoidance capacity, and housing-supply policy levers that influence
                    inflation, labour supply, and medium-term revenue.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div className="border border-border-subtle p-3">
                      <label className="text-sm font-semibold text-tertiary">Threshold uprating</label>
                      <select
                        value={thresholdUprating}
                        onChange={(e) => setThresholdUprating(e.target.value as typeof thresholdUprating)}
                        className="w-full mt-2 border border-border-strong px-2 py-1 text-sm"
                      >
                        <option value="frozen">Frozen</option>
                        <option value="cpi_linked">CPI-linked</option>
                        <option value="earnings_linked">Earnings-linked</option>
                        <option value="custom">Custom thresholds</option>
                      </select>
                      <div className="text-xs text-secondary mt-2">
                        {thresholdUprating === 'frozen' && 'Raises revenue through fiscal drag.'}
                        {thresholdUprating === 'cpi_linked' && 'Keeps thresholds moving with inflation.'}
                        {thresholdUprating === 'earnings_linked' &&
                          'Looser than inflation-linking, with a larger revenue cost.'}
                        {thresholdUprating === 'custom' && 'Use the threshold controls above for bespoke settings.'}
                      </div>
                    </div>
                    <div className="border border-border-subtle p-3">
                      <label className="text-sm font-semibold text-tertiary">Full expensing</label>
                      <select
                        value={fullExpensing ? 'enabled' : 'disabled'}
                        onChange={(e) => setFullExpensing(e.target.value === 'enabled')}
                        className="w-full mt-2 border border-border-strong px-2 py-1 text-sm"
                      >
                        <option value="disabled">Disabled</option>
                        <option value="enabled">Enabled</option>
                      </select>
                      <div className="text-xs text-secondary mt-2">
                        Corp tax cost ~£3.5bn/yr, higher investment quality.
                      </div>
                    </div>
                    <div className="border border-border-subtle p-3">
                      <label className="text-sm font-semibold text-tertiary">HMRC anti-avoidance spend</label>
                      <input
                        type="number"
                        min={0}
                        max={3}
                        step={0.1}
                        value={antiAvoidanceInvestment}
                        onChange={(e) => setAntiAvoidanceInvestment(Number(e.target.value))}
                        className="w-full mt-2 border border-border-strong px-2 py-1 text-sm"
                      />
                      <div className="text-sm text-tertiary mt-2">£{antiAvoidanceInvestment.toFixed(1)}bn</div>
                    </div>
                    <div className="border border-border-subtle p-3">
                      <label className="text-sm font-semibold text-tertiary">HMRC systems investment</label>
                      <input
                        type="number"
                        min={0.3}
                        max={1.5}
                        step={0.1}
                        value={hmrcSystemsInvestment}
                        onChange={(e) => setHmrcSystemsInvestment(Number(e.target.value))}
                        className="w-full mt-2 border border-border-strong px-2 py-1 text-sm"
                      />
                      <div className="text-sm text-tertiary mt-2">£{hmrcSystemsInvestment.toFixed(1)}bn</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="border border-border-subtle p-3">
                      <label className="text-sm font-semibold text-tertiary">Planning reform package</label>
                      <select
                        value={planningReformPackage ? 'active' : 'inactive'}
                        onChange={(e) => setPlanningReformPackage(e.target.value === 'active')}
                        className="w-full mt-2 border border-border-strong px-2 py-1 text-sm"
                      >
                        <option value="inactive">Inactive</option>
                        <option value="active">Active</option>
                      </select>
                    </div>
                    <div className="border border-border-subtle p-3">
                      <label className="text-sm font-semibold text-tertiary">Infrastructure guarantees</label>
                      <input
                        type="number"
                        min={0}
                        max={10}
                        step={0.5}
                        value={infrastructureGuarantees}
                        onChange={(e) => setInfrastructureGuarantees(Number(e.target.value))}
                        className="w-full mt-2 border border-border-strong px-2 py-1 text-sm"
                      />
                      <div className="text-sm text-tertiary mt-2">£{infrastructureGuarantees.toFixed(1)}bn</div>
                    </div>
                    <div className="border border-border-subtle p-3">
                      <label className="text-sm font-semibold text-tertiary">Demand-side support</label>
                      <input
                        type="number"
                        min={0}
                        max={5}
                        step={0.1}
                        value={htbSupport}
                        onChange={(e) => setHtbSupport(Number(e.target.value))}
                        className="w-full mt-2 border border-border-strong px-2 py-1 text-sm"
                      />
                      <div className="text-sm text-tertiary mt-2">£{htbSupport.toFixed(1)}bn</div>
                    </div>
                    <div className="border border-border-subtle p-3">
                      <label className="text-sm font-semibold text-tertiary">Council house building grant</label>
                      <input
                        type="number"
                        min={0}
                        max={3}
                        step={0.1}
                        value={councilHousingGrant}
                        onChange={(e) => setCouncilHousingGrant(Number(e.target.value))}
                        className="w-full mt-2 border border-border-strong px-2 py-1 text-sm"
                      />
                      <div className="text-sm text-tertiary mt-2">£{councilHousingGrant.toFixed(1)}bn</div>
                    </div>
                  </div>
                </div>

                <div className="bg-bg-surface border border-border-strong p-6">
                  <h2 className="text-xl font-bold text-primary mb-2">Industrial Strategy</h2>
                  <p className="text-sm text-secondary mb-4">
                    Select interventions to activate at this fiscal event. Outcomes are uncertain and revealed after
                    delivery lags.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {INDUSTRIAL_INTERVENTION_CATALOGUE.map((intervention) => {
                      const alreadyActive = (gameState.industrialStrategy.activeInterventions || []).some(
                        (item) => item.id === intervention.id
                      );
                      const selected = selectedIndustrialInterventions.has(intervention.id);
                      return (
                        <div key={intervention.id} className="border border-border-subtle p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-semibold text-primary">{intervention.name}</div>
                              <div className="text-xs text-secondary mt-1">
                                £{intervention.annualCost_bn.toFixed(1)}bn/yr · Lag {intervention.turnsToEffect} turns ·
                                Success {(intervention.successProbability * 100).toFixed(0)}%
                              </div>
                            </div>
                            <button
                              disabled={alreadyActive}
                              onClick={() => {
                                setSelectedIndustrialInterventions((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(intervention.id)) next.delete(intervention.id);
                                  else next.add(intervention.id);
                                  return next;
                                });
                              }}
                              className={`px-3 py-1  text-xs font-semibold ${alreadyActive ? 'bg-subdued text-muted cursor-not-allowed' : selected ? 'bg-secondary-subtle border border-secondary text-secondary' : 'bg-subdued border border-border-strong text-tertiary'}`}
                            >
                              {alreadyActive ? 'Active' : selected ? 'Selected' : 'Select'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 text-sm text-tertiary">
                    Active annual cost: £{(gameState.industrialStrategy.totalAnnualCost_bn || 0).toFixed(1)}bn ·
                    Productivity boost: +{(gameState.industrialStrategy.productivityBoostAccumulated || 0).toFixed(2)}pp
                    · State aid risk: {(gameState.industrialStrategy.stateAidRisk || 0).toFixed(0)}
                  </div>
                </div>

                {/* National Insurance */}
                <div className="bg-bg-surface border border-border-strong p-6">
                  <h2 className="text-xl font-bold text-primary mb-2">National Insurance</h2>
                  <p className="text-sm text-secondary mb-4">
                    Revenue: £164bn · Employee rate (Class 1) and employer contributions. Thresholds determine who pays.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {renderTaxControl(taxes.get('employeeNI')!)}
                    {renderTaxControl(taxes.get('employerNI')!)}
                    {renderTaxControl(taxes.get('niPrimaryThreshold')!)}
                    {renderTaxControl(taxes.get('niUpperEarningsLimit')!)}
                    {renderTaxControl(taxes.get('niSecondaryThreshold')!)}
                    {renderTaxControl(taxes.get('employmentAllowance')!)}
                  </div>
                </div>

                {/* VAT */}
                <div className="bg-bg-surface border border-border-strong p-6">
                  <h2 className="text-xl font-bold text-primary mb-2">VAT and Indirect Consumption Taxes</h2>
                  <p className="text-sm text-secondary mb-4">
                    Revenue: £171bn · Standard rate, reduced rates, and exemptions. VAT on energy and school fees are
                    politically charged.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {renderTaxControl(taxes.get('vat')!)}
                    {renderTaxControl(taxes.get('vatDomesticEnergy')!)}
                    {renderTaxControl(taxes.get('vatPrivateSchools')!)}
                    {renderTaxControl(taxes.get('vatRegistrationThreshold')!)}
                    {renderTaxControl(taxes.get('insurancePremiumTax')!)}
                  </div>
                </div>

                {/* Corporation Tax & Business */}
                <div className="bg-bg-surface border border-border-strong p-6">
                  <h2 className="text-xl font-bold text-primary mb-2">Corporation Tax and Business Taxes</h2>
                  <p className="text-sm text-secondary mb-4">
                    Revenue: £88bn · Main rate, small profits rate, and business reliefs. Investment incentives affect
                    business decisions.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {renderTaxControl(taxes.get('corporationTax')!)}
                    {renderTaxControl(taxes.get('corporationTaxSmall')!)}
                    {renderTaxControl(taxes.get('businessRates')!)}
                    {renderTaxControl(taxes.get('annualInvestmentAllowance')!)}
                    {renderTaxControl(taxes.get('rdTaxCredit')!)}
                    {renderTaxControl(taxes.get('patentBoxRate')!)}
                    {renderTaxControl(taxes.get('bankSurcharge')!)}
                    {renderTaxControl(taxes.get('energyProfitsLevy')!)}
                  </div>
                </div>

                {/* Capital Gains Tax */}
                <div className="bg-bg-surface border border-border-strong p-6">
                  <h2 className="text-xl font-bold text-primary mb-2">Capital Gains Tax</h2>
                  <p className="text-sm text-secondary mb-4">
                    Revenue: £15bn · Rates, annual exempt amount, and entrepreneur reliefs. Residential property has a
                    surcharge.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {renderTaxControl(taxes.get('capitalGainsBasic')!)}
                    {renderTaxControl(taxes.get('capitalGainsHigher')!)}
                    {renderTaxControl(taxes.get('cgtAnnualExempt')!)}
                    {renderTaxControl(taxes.get('cgtResidentialSurcharge')!)}
                    {renderTaxControl(taxes.get('badrRate')!)}
                    {renderTaxControl(taxes.get('badrLifetimeLimit')!)}
                  </div>
                </div>

                {/* Inheritance Tax */}
                <div className="bg-bg-surface border border-border-strong p-6">
                  <h2 className="text-xl font-bold text-primary mb-2">Inheritance Tax</h2>
                  <p className="text-sm text-secondary mb-4">
                    Revenue: £7.5bn · Rate, nil-rate band, and residence nil-rate band. Only ~4% of estates pay IHT.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {renderTaxControl(taxes.get('inheritanceTax')!)}
                    {renderTaxControl(taxes.get('inheritanceTaxThreshold')!)}
                    {renderTaxControl(taxes.get('ihtResidenceNilRate')!)}
                  </div>
                </div>

                {/* Property Taxes */}
                <div className="bg-bg-surface border border-border-strong p-6">
                  <h2 className="text-xl font-bold text-primary mb-2">Property Transaction Taxes</h2>
                  <p className="text-sm text-secondary mb-4">
                    Revenue: £14bn · Stamp duty rates, first-time buyer relief, and second-home surcharge.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {renderTaxControl(taxes.get('stampDuty')!)}
                    {renderTaxControl(taxes.get('sdltAdditionalSurcharge')!)}
                    {renderTaxControl(taxes.get('sdltFirstTimeBuyerThreshold')!)}
                    {renderTaxControl(taxes.get('councilTax')!)}
                  </div>
                </div>

                {/* Savings and Investment Reliefs */}
                <div className="bg-bg-surface border border-border-strong p-6">
                  <h2 className="text-xl font-bold text-primary mb-2">Savings and Investment Reliefs</h2>
                  <p className="text-sm text-secondary mb-4">
                    Allowances for pensions, ISAs, and dividends. Reducing these raises revenue but affects savings
                    incentives.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {renderTaxControl(taxes.get('pensionAnnualAllowance')!)}
                    {renderTaxControl(taxes.get('isaAllowance')!)}
                    {renderTaxControl(taxes.get('dividendAllowance')!)}
                  </div>
                </div>

                {/* Excise Duties */}
                <div className="bg-bg-surface border border-border-strong p-6">
                  <h2 className="text-xl font-bold text-primary mb-2">Excise Duties</h2>
                  <p className="text-sm text-secondary mb-4">
                    Revenue: £{(25 + 13 + 9 + 4 + 8).toFixed(0)}bn · Fuel, alcohol, tobacco, air travel, and vehicle
                    duties.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {renderTaxControl(taxes.get('fuelDuty')!)}
                    {renderTaxControl(taxes.get('alcoholDuty')!)}
                    {renderTaxControl(taxes.get('tobaccoDuty')!)}
                    {renderTaxControl(taxes.get('airPassengerDuty')!)}
                    {renderTaxControl(taxes.get('vehicleExciseDuty')!)}
                    {renderTaxControl(taxes.get('softDrinksLevy')!)}
                  </div>
                </div>
              </div>
            )}

            {/* Spending View */}
            {activeView === 'spending' && (
              <div className="space-y-4">
                <div className="bg-bg-surface border border-border-strong p-4">
                  <h3 className="text-lg font-bold text-primary">Local Government</h3>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="border border-border-subtle p-3">
                      <label className="text-sm font-semibold text-tertiary">
                        Local government grant settlement (£bn)
                      </label>
                      <input
                        type="number"
                        min={20}
                        max={60}
                        step={0.1}
                        value={localGovernmentGrantSettlement}
                        onChange={(e) => setLocalGovernmentGrantSettlement(Number(e.target.value))}
                        className="w-full mt-2 border border-border-strong px-2 py-1 text-sm"
                      />
                      <div className="text-xs text-secondary mt-2">
                        Delta:{' '}
                        {localGovernmentGrantSettlement - (gameState.devolution.localGov.centralGrant_bn || 30) >= 0
                          ? '+'
                          : ''}
                        £
                        {(
                          localGovernmentGrantSettlement - (gameState.devolution.localGov.centralGrant_bn || 30)
                        ).toFixed(1)}
                        bn
                      </div>
                    </div>
                    <div className="border border-border-subtle p-3">
                      <label className="text-sm font-semibold text-tertiary">Council tax referendum cap (%)</label>
                      <input
                        type="number"
                        min={3}
                        max={10}
                        step={0.1}
                        value={councilTaxReferendumCap}
                        onChange={(e) => setCouncilTaxReferendumCap(Number(e.target.value))}
                        className="w-full mt-2 border border-border-strong px-2 py-1 text-sm"
                      />
                      <div className="text-xs text-secondary mt-2">
                        Higher caps reduce central grant pressure but increase household tax pressure.
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div className="border border-border-subtle  p-2">
                      <div className="text-secondary">Core settlement</div>
                      <div className="text-xl font-bold">
                        £{(gameState.devolution.localGov.coreSettlement_bn || 0).toFixed(1)}bn
                      </div>
                    </div>
                    <div className="border border-border-subtle  p-2">
                      <div className="text-secondary">Adult social care pressure</div>
                      <div className="text-xl font-bold">
                        £{(gameState.devolution.localGov.adultSocialCarePressure_bn || 0).toFixed(1)}bn
                      </div>
                    </div>
                    <div className="border border-border-subtle  p-2">
                      <div className="text-secondary">Funding gap</div>
                      <div className="text-xl font-bold">
                        £
                        {Math.max(
                          0,
                          (gameState.devolution.localGov.adultSocialCarePressure_bn || 0) -
                            (gameState.devolution.localGov.coreSettlement_bn || 0)
                        ).toFixed(1)}
                        bn
                      </div>
                    </div>
                    <div className="border border-border-subtle  p-2">
                      <div className="text-secondary">Stress index</div>
                      <div className="text-xl font-bold">
                        {(
                          gameState.devolution.localGov.councilFundingStress ||
                          gameState.devolution.localGov.localGovStressIndex ||
                          0
                        ).toFixed(0)}
                      </div>
                    </div>
                  </div>
                  {(gameState.devolution.localGov.section114Count || 0) > 0 && (
                    <div className="mt-3 text-sm text-bad bg-bad-subtle border border-bad  px-3 py-2">
                      Section 114 notices this term: {gameState.devolution.localGov.section114Count}
                    </div>
                  )}
                </div>
                <div className="bg-bg-surface border border-border-strong p-4">
                  <h3 className="text-lg font-bold text-primary mb-2">Devolution and Barnett Consequentials</h3>
                  <p className="text-sm text-secondary mb-3">
                    Automatic consequential payments generated by England programme changes.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                    <div className="border border-border-subtle  p-2">
                      <div className="text-secondary">Scotland</div>
                      <div className="text-lg font-bold">£{barnettPreview.scotland.toFixed(1)}bn</div>
                    </div>
                    <div className="border border-border-subtle  p-2">
                      <div className="text-secondary">Wales</div>
                      <div className="text-lg font-bold">£{barnettPreview.wales.toFixed(1)}bn</div>
                    </div>
                    <div className="border border-border-subtle  p-2">
                      <div className="text-secondary">Northern Ireland</div>
                      <div className="text-lg font-bold">£{barnettPreview.northernIreland.toFixed(1)}bn</div>
                    </div>
                    <div className="border border-secondary bg-secondary-subtle  p-2">
                      <div className="text-secondary">Total Barnett</div>
                      <div className="text-lg font-bold">£{barnettPreview.total.toFixed(1)}bn</div>
                    </div>
                  </div>
                </div>
                {Array.from(spendingByDepartment.entries()).map(([department, items]) => {
                  const isExpanded = expandedDepartments.has(department);
                  const totalCurrent = items.reduce((sum, item) => sum + item.currentBudget, 0);
                  const totalProposed = items.reduce((sum, item) => sum + item.proposedBudget, 0);
                  const change = totalProposed - totalCurrent;

                  return (
                    <div key={department} className="bg-elevated border border-border-subtle">
                      <button
                        onClick={() => toggleDepartment(department)}
                        className="w-full px-6 py-4 flex justify-between items-center hover:bg-subdued transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <svg
                            className={`w-5 h-5 text-secondary transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          <div className="text-left">
                            <h3 className="text-lg font-bold text-primary">{department}</h3>
                            <p className="text-sm text-secondary">
                              {items.length} programme{items.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">£{totalProposed.toFixed(1)}bn</div>
                          {change !== 0 && (
                            <div className={`text-sm font-semibold ${change > 0 ? 'text-secondary' : 'text-bad'}`}>
                              {change > 0 ? '+' : ''}£{change.toFixed(1)}bn
                            </div>
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-6 pb-6 pt-2 border-t border-border-subtle">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {items.map((item) => renderSpendingControl(item))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Impact View */}
            {activeView === 'impact' && (
              <div className="space-y-6">
                <div className="bg-bg-surface border border-border-strong p-6">
                  <h2 className="text-xl font-bold text-primary mb-4">Fiscal Position</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="border border-border-subtle  p-4">
                      <div className="text-sm text-secondary uppercase tracking-wide mb-2">Current Deficit</div>
                      <div className="text-3xl font-bold text-primary">
                        £{fiscalImpact.currentDeficit.toFixed(1)}bn
                      </div>
                      <div className="text-sm text-secondary mt-1">OBR March 2024 forecast</div>
                    </div>
                    <div className="border border-border-subtle  p-4">
                      <div className="text-sm text-secondary uppercase tracking-wide mb-2">Projected Deficit</div>
                      <div
                        className={`text-3xl font-bold ${
                          fiscalImpact.projectedDeficit > fiscalImpact.currentDeficit
                            ? 'text-bad'
                            : fiscalImpact.projectedDeficit < fiscalImpact.currentDeficit
                              ? 'text-good'
                              : 'text-primary'
                        }`}
                      >
                        £{fiscalImpact.projectedDeficit.toFixed(1)}bn
                      </div>
                      <div
                        className={`text-sm font-semibold mt-1 ${
                          fiscalImpact.deficitChange > 0
                            ? 'text-bad'
                            : fiscalImpact.deficitChange < 0
                              ? 'text-good'
                              : 'text-secondary'
                        }`}
                      >
                        {fiscalImpact.deficitChange > 0 ? '+' : ''}£{fiscalImpact.deficitChange.toFixed(1)}bn change
                      </div>
                    </div>
                    <div className="border border-border-subtle  p-4">
                      <div className="text-sm text-secondary uppercase tracking-wide mb-2">Public Sector Net Debt</div>
                      <div className="text-3xl font-bold text-primary">£{fiscalImpact.projectedDebt.toFixed(0)}bn</div>
                      <div className="text-sm text-secondary mt-1">{fiscalImpact.debtGDPRatio.toFixed(1)}% of GDP</div>
                    </div>
                    <div className="border border-border-subtle  p-4">
                      <div className="text-sm text-secondary uppercase tracking-wide mb-2">Fiscal Rules Status</div>
                      <div
                        className={`text-3xl font-bold ${fiscalImpact.fiscalRulesMet ? 'text-good' : 'text-bad'}`}
                      >
                        {fiscalImpact.fiscalRulesMet ? 'MET' : 'BREACHED'}
                      </div>
                      <div
                        className={`text-sm font-semibold mt-1 ${
                          fiscalImpact.headroom > 10
                            ? 'text-good'
                            : fiscalImpact.headroom > 0
                              ? 'text-warning'
                              : 'text-bad'
                        }`}
                      >
                        {getRuleHeadroomLabel(getFiscalRuleById(gameState.political.chosenFiscalRule))}:{' '}
                        {fiscalImpact.headroom >= 0 ? '+' : ''}£{fiscalImpact.headroom.toFixed(1)}bn
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-bg-surface border border-border-strong p-6">
                  <h2 className="text-xl font-bold text-primary mb-2">Policy Pipeline</h2>
                  <p className="text-sm text-secondary mb-4">
                    Announced measures take time to clear legislation and systems delivery.
                  </p>
                  {(gameState.legislativePipeline.queue || []).length === 0 ? (
                    <div className="text-sm text-secondary">No measures in the pipeline.</div>
                  ) : (
                    <div className="space-y-2">
                      {(gameState.legislativePipeline.queue || [])
                        .slice(-8)
                        .reverse()
                        .map((item) => (
                          <div
                            key={item.measureId}
                            className="border border-border-subtle p-3 text-sm flex justify-between gap-3"
                          >
                            <div>
                              <div className="font-semibold text-primary">{item.description}</div>
                              <div className="text-secondary">
                                Effective turn {item.effectiveTurn} · Type {item.type.replace('_', ' ')}
                              </div>
                            </div>
                            <div
                              className={`font-semibold ${item.status === 'delayed' ? 'text-bad' : item.status === 'active' ? 'text-good' : 'text-warning'}`}
                            >
                              {item.status}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                <div className="bg-bg-surface border border-border-strong p-6">
                  <h2 className="text-xl font-bold text-primary mb-2">OBR Policy Costings</h2>
                  <p className="text-sm text-secondary mb-4">
                    Latest certified annual impacts from the independent forecast vintage.
                  </p>
                  {gameState.obr.latestForecast?.policyScorings?.length ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border-subtle text-secondary">
                            <th className="text-left py-2">Measure</th>
                            <th className="text-right py-2">Annual impact</th>
                            <th className="text-right py-2">Certainty</th>
                          </tr>
                        </thead>
                        <tbody>
                          {gameState.obr.latestForecast.policyScorings.map((row, idx) => (
                            <tr key={`${row.measureDescription}_${idx}`} className="border-b border-border-subtle">
                              <td className="py-2">{row.measureDescription}</td>
                              <td className="py-2 text-right font-semibold">
                                {row.annualImpact_bn >= 0 ? '+' : ''}£{row.annualImpact_bn.toFixed(1)}bn
                              </td>
                              <td className="py-2 text-right">{row.certaintylevel.replace('_', ' ')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-sm text-secondary">
                      No OBR costing table available until the next Budget or Autumn Statement.
                    </div>
                  )}
                </div>

                {warnings.length > 0 && (
                  <div className="bg-bg-surface border border-border-strong p-6">
                    <h2 className="text-xl font-bold text-primary mb-4">Adviser Warnings</h2>
                    <div className="space-y-3">{warnings.map((warning) => renderWarning(warning))}</div>
                  </div>
                )}

                {warnings.length === 0 && (
                  <div className="bg-good-subtle border border-good  p-6">
                    <div className="flex items-center gap-3 text-good">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <div>
                        <h3 className="font-bold">No Warnings</h3>
                        <p className="text-sm text-good">
                          Your budget proposals do not trigger any adviser warnings.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Constraints View */}
            {activeView === 'constraints' && (
              <div className="space-y-6">
                <div className="bg-bg-surface border border-border-strong p-6">
                  <h2 className="text-xl font-bold text-primary mb-2">Manifesto Commitments</h2>
                  <p className="text-sm text-secondary mb-4">
                    Your manifesto commitments and fiscal rules. Breaking these will have serious political
                    consequences.
                  </p>
                  <div className="space-y-3">{constraints.map((constraint) => renderConstraint(constraint))}</div>

                  <div className="mt-6 pt-6 border-t border-border-strong space-y-3">
                    <h3 className="text-lg font-bold text-primary">Change fiscal framework</h3>
                    <p className="text-sm text-secondary">
                      Changing the fiscal framework mid-term is a high-risk decision and will carry immediate
                      credibility and political costs on the next turn.
                    </p>
                    <div className="flex gap-3 items-center">
                      <select
                        value={proposedFiscalRule}
                        onChange={(e) => setProposedFiscalRule(e.target.value as FiscalRuleId)}
                        className="px-3 py-2 border border-border-strong text-sm"
                      >
                        {FISCAL_RULES.map((rule) => (
                          <option key={rule.id} value={rule.id}>
                            {rule.name}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => setShowFiscalRuleChangeModal(true)}
                        className="px-4 py-2 bg-primary hover:bg-primary-hover text-white font-semibold "
                        disabled={proposedFiscalRule === gameState.political.chosenFiscalRule}
                      >
                        Change fiscal framework
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-secondary-subtle border border-secondary  p-6">
                  <div className="flex items-start gap-3">
                    <svg
                      className="w-6 h-6 text-secondary flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div>
                      <h3 className="font-bold text-secondary mb-1">About Fiscal Rules</h3>
                      <p className="text-sm text-secondary mb-2">
                        The Stability Rule requires the current budget (day-to-day spending) to be in balance by the
                        fifth year of the forecast. The Investment Rule requires public sector net financial liabilities
                        to be falling as a share of GDP by the fifth year.
                      </p>
                      <p className="text-sm text-secondary">
                        These targets are verified by the Office for Budget Responsibility (OBR) and are legally binding
                        under the Charter for Budget Responsibility. Breaching fiscal rules will trigger severe market
                        reaction and political crisis.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {visiblePolicyConflicts.length > 0 && (
              <div className="mt-6 space-y-3">
                {visiblePolicyConflicts.map((conflict) => (
                  <div key={conflict.id} className="bg-warning-subtle border border-warning  p-4">
                    <div className="flex items-start gap-3">
                      <svg
                        className="w-5 h-5 text-warning flex-shrink-0 mt-0.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <div>
                        <div className="text-sm font-bold text-warning">{conflict.title}</div>
                        <div className="text-sm text-warning">{conflict.description}</div>
                      </div>
                      <button
                        onClick={() => setDismissedConflicts((prev) => new Set(prev).add(conflict.id))}
                        className="text-xs text-warning hover:text-warning font-semibold"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-8 flex gap-4 justify-end">
              <button
                onClick={resetBudget}
                className="px-6 py-3 border-2 border-border-strong text-tertiary font-semibold  hover:bg-bg transition-colors"
              >
                Reset to Baseline
              </button>
              <button
                onClick={() => setShowPMInterventionModal(true)}
                className="px-6 py-3 bg-warning hover:bg-warning-hover text-white font-bold  transition-colors "
              >
                Force PM Intervention
              </button>
              <button
                onClick={submitBudget}
                className="px-6 py-3 bg-primary text-white font-semibold  hover:bg-primary-hover transition-colors "
              >
                Submit Budget for Parliamentary Approval
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Adviser Detail Modal */}
      {(() => {
        const hiredAdvisers = adviserSystem?.hiredAdvisers;
        let hasAdviser = false;
        let adviser = null;

        if (showAdviserDetail) {
          if (hiredAdvisers instanceof Map) {
            hasAdviser = hiredAdvisers.has(showAdviserDetail);
            adviser = hiredAdvisers.get(showAdviserDetail);
          } else if (typeof hiredAdvisers === 'object' && hiredAdvisers !== null) {
            const advisersList = Object.values(hiredAdvisers) as any[];
            adviser = advisersList.find((h: any) => h.profile?.type === showAdviserDetail);
            hasAdviser = !!adviser;
          }
        }

        return hasAdviser && adviser && showAdviserDetail ? (
          <AdviserModal
            hired={adviser}
            opinion={adviserOpinions.get(showAdviserDetail)!}
            onClose={() => setShowAdviserDetail(null)}
          />
        ) : null;
      })()}

      {/* Parliamentary Vote Modal */}
      {voteResult && (
        <ParliamentaryVoteModal
          voteResult={voteResult}
          onContinue={handleVoteContinue}
          onWithdraw={handleVoteWithdraw}
        />
      )}

      {/* PM Intervention Modal */}
      {showPMInterventionModal && (
        <PMInterventionModal onConfirm={handlePMIntervention} onCancel={() => setShowPMInterventionModal(false)} />
      )}

      {showFiscalRuleChangeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="bg-elevated max-w-xl w-full border border-border-strong">
            <div className="bg-primary text-white p-5">
              <h2 className="text-2xl font-display">Confirm fiscal framework change</h2>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-secondary">
                You are changing from{' '}
                <span className="font-semibold">{getFiscalRuleById(gameState.political.chosenFiscalRule).name}</span> to{' '}
                <span className="font-semibold">{getFiscalRuleById(proposedFiscalRule).name}</span>.
              </p>
              <div className="bg-warning-subtle border border-warning p-3 text-sm text-warning">
                Consequences on next turn: credibility shock, one-off gilt yield shock with six-month decay, PM trust
                fall, and backbench dissatisfaction.
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowFiscalRuleChangeModal(false)}
                  className="flex-1 px-4 py-2 bg-subdued hover:bg-bg text-primary font-semibold border border-border-strong"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmFiscalRuleChange}
                  className="flex-1 px-4 py-2 bg-primary hover:bg-primary-hover text-white font-bold"
                >
                  Confirm change
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fiscal Rule Message Modal */}
      {fiscalRuleMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="bg-elevated max-w-2xl w-full border border-border-strong">
            <div className="bg-primary text-white p-6">
              <div className="text-center">
                <h2 className="text-3xl font-display">Fiscal Rule Commitment</h2>
                <div className="text-sm mt-2 opacity-90">Complex Adjustment Required</div>
              </div>
            </div>

            <div className="p-6">
              <div className="bg-secondary-subtle border border-secondary p-4 mb-6">
                <div className="flex items-start gap-3">
                  <span className="text-secondary text-xl flex-shrink-0 mt-0.5">ℹ</span>
                  <div>
                    <p className="text-secondary">{fiscalRuleMessage}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setFiscalRuleMessage(null)}
                  className="flex-1 px-6 py-3 bg-primary hover:bg-primary-hover text-white font-bold transition-colors"
                >
                  Understood
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Broken Promises Alert Modal */}
      {brokenPromisesAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="bg-elevated max-w-2xl w-full border border-border-strong">
            <div className="bg-primary text-white p-6">
              <div className="text-center">
                <h2 className="text-3xl font-display">Broken Promises Alert</h2>
                <div className="text-sm mt-2 opacity-90">MPs Will Remember This Betrayal</div>
              </div>
            </div>

            <div className="p-6">
              <div className="bg-bad-subtle border border-bad p-4 mb-6">
                <div className="flex items-start gap-3">
                  <span className="text-bad text-xl flex-shrink-0 mt-0.5">⚠</span>
                  <div>
                    <p className="text-bad font-semibold">
                      You have broken {brokenPromisesAlert.count} promise{brokenPromisesAlert.count > 1 ? 's' : ''}{' '}
                      affecting {brokenPromisesAlert.mpCount} MP{brokenPromisesAlert.mpCount !== 1 ? 's' : ''}.
                    </p>
                    <p className="text-bad mt-2">
                      These MPs will remember this betrayal and become much more hostile to future budgets. Trust has
                      been severely damaged.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setBrokenPromisesAlert(null)}
                  className="flex-1 px-6 py-3 bg-primary hover:bg-primary-hover text-white font-bold transition-colors"
                >
                  Understood
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PM Intervention Success Modal */}
      {pmInterventionSuccess && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="bg-elevated max-w-2xl w-full border border-border-strong">
            <div className="bg-primary text-white p-6">
              <div className="text-center">
                <h2 className="text-3xl font-display">PM Intervention Successful</h2>
                <div className="text-sm mt-2 opacity-90">Budget Forced Through Parliament</div>
              </div>
            </div>

            <div className="p-6">
              <div className="bg-good-subtle border border-good p-4 mb-6">
                <div className="flex items-start gap-3">
                  <span className="text-good text-xl flex-shrink-0 mt-0.5">✓</span>
                  <div>
                    <p className="text-good font-semibold">
                      Budget has been forced through Parliament. All 411 Labour MPs have been compelled to vote aye.
                    </p>
                    <p className="text-good mt-2">The political consequences are severe.</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setPMInterventionSuccess(false)}
                  className="flex-1 px-6 py-3 bg-primary hover:bg-primary-hover text-white font-bold transition-colors"
                >
                  Understood
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetSystem;
