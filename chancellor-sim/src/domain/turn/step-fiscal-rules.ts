// Step 8.5 & 8.6: Fiscal Rules Compliance & Golden Rule Enforcement

import { GameState } from '../../types';
import { AdviserBonuses, getAdviserBonuses } from './shared-helpers';
import { getFiscalRuleById, OBR_HEADROOM_CALIBRATION, BASELINE_DEFICIT_BN, BASELINE_TOTAL_CAPITAL_SPENDING_BN } from '../../game-integration';

export function processStepFiscalRules(state: GameState, adviserBonuses: AdviserBonuses): GameState {
  let s = evaluateFiscalRuleCompliance(state);
  s = checkGoldenRuleEnforcement(s);
  return s;
}

function evaluateFiscalRuleCompliance(state: GameState): GameState {
  const { fiscal, political } = state;
  const rule = getFiscalRuleById(political.chosenFiscalRule);
  const bonuses = getAdviserBonuses(state);

  const totalCapitalSpending =
    fiscal.spending.nhsCapital +
    fiscal.spending.educationCapital +
    fiscal.spending.defenceCapital +
    fiscal.spending.infrastructureCapital +
    fiscal.spending.policeCapital +
    fiscal.spending.justiceCapital +
    fiscal.spending.otherCapital;

  const currentBudgetBalance =
    fiscal.totalRevenue_bn - (fiscal.totalSpending_bn - totalCapitalSpending) - fiscal.debtInterest_bn;
  const currentBudgetMet = !rule.rules.currentBudgetBalance || currentBudgetBalance + OBR_HEADROOM_CALIBRATION >= -0.5;

  const overallBalance = fiscal.totalRevenue_bn - fiscal.totalSpending_bn - fiscal.debtInterest_bn;
  const overallBalanceMet = !rule.rules.overallBalance || overallBalance >= -0.5;

  const deficitCeilingMet =
    rule.rules.deficitCeiling === undefined || fiscal.deficitPctGDP <= rule.rules.deficitCeiling;

  const debtTargetMet = rule.rules.debtTarget === undefined || fiscal.debtPctGDP <= rule.rules.debtTarget;

  const snapshots = state.simulation.monthlySnapshots;
  let debtFallingMet = true;
  if (rule.rules.debtFalling) {
    if (rule.id === 'jeremy-hunt') {
      debtFallingMet = deficitCeilingMet;
    } else if (rule.rules.timeHorizon >= 4) {
      const cbBalanceForDebt =
        fiscal.totalRevenue_bn -
        (fiscal.totalSpending_bn -
          (fiscal.spending.nhsCapital +
            fiscal.spending.educationCapital +
            fiscal.spending.defenceCapital +
            fiscal.spending.infrastructureCapital +
            fiscal.spending.policeCapital +
            fiscal.spending.justiceCapital +
            fiscal.spending.otherCapital)) -
        fiscal.debtInterest_bn;
      debtFallingMet = cbBalanceForDebt + OBR_HEADROOM_CALIBRATION >= -0.5;
    } else {
      if (snapshots.length >= 12) {
        const twelveMonthsAgo = snapshots[snapshots.length - 12];
        debtFallingMet = fiscal.debtPctGDP < twelveMonthsAgo.debt;
      } else if (snapshots.length >= 6) {
        const sixMonthsAgo = snapshots[snapshots.length - 6];
        debtFallingMet = fiscal.debtPctGDP < sixMonthsAgo.debt;
      }
    }
  }

  const overallCompliant =
    currentBudgetMet && overallBalanceMet && deficitCeilingMet && debtTargetMet && debtFallingMet;

  const prevBreaches = political.fiscalRuleCompliance.consecutiveBreaches;
  const consecutiveBreaches = overallCompliant ? 0 : prevBreaches + 1;

  let credibilityChange = 0;
  if (!overallCompliant) {
    if (consecutiveBreaches >= 6) {
      credibilityChange = -2;
    } else if (consecutiveBreaches >= 3) {
      credibilityChange = -1;
    } else {
      credibilityChange = -0.5;
    }
  } else if (prevBreaches > 0) {
    credibilityChange = 1;
  }

  return {
    ...state,
    fiscal: {
      ...fiscal,
      fiscalRuleBreaches: !overallCompliant ? (fiscal.fiscalRuleBreaches || 0) + 1 : fiscal.fiscalRuleBreaches || 0,
    },
    political: {
      ...political,
      fiscalRuleCompliance: {
        currentBudgetMet,
        overallBalanceMet,
        deficitCeilingMet,
        debtTargetMet,
        debtFallingMet,
        overallCompliant,
        consecutiveBreaches,
        currentBudgetGap: Math.max(0, -currentBudgetBalance),
        capitalInvestment: totalCapitalSpending,
      },
      credibilityIndex: Math.max(
        0,
        Math.min(100, political.credibilityIndex + credibilityChange + bonuses.credibilityBonus)
      ),
    },
  };
}

function checkGoldenRuleEnforcement(state: GameState): GameState {
  const { fiscal, political } = state;
  const rule = getFiscalRuleById(political.chosenFiscalRule);

  if (!rule.rules.investmentExempt || rule.id === 'mmt-inspired') {
    return state;
  }

  const baselineDeficit = BASELINE_DEFICIT_BN;
  const baselineCapital = BASELINE_TOTAL_CAPITAL_SPENDING_BN;

  const deficitIncrease = fiscal.deficit_bn - baselineDeficit;

  const currentCapital =
    fiscal.spending.nhsCapital +
    fiscal.spending.educationCapital +
    fiscal.spending.defenceCapital +
    fiscal.spending.infrastructureCapital +
    fiscal.spending.policeCapital +
    fiscal.spending.justiceCapital +
    fiscal.spending.otherCapital;

  const capitalIncrease = currentCapital - baselineCapital;

  if (deficitIncrease > capitalIncrease + 1) {
    return {
      ...state,
      political: {
        ...political,
        credibilityIndex: Math.max(0, political.credibilityIndex - 2),
      },
    };
  }

  return state;
}
