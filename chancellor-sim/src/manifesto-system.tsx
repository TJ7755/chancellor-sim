// Manifesto System for UK Chancellor Simulation
// Generates Labour manifesto pledges, tracks adherence, monitors violations

import React from 'react';

// ===========================
// Type Definitions
// ===========================

export interface ManifestoPledge {
  id: string;
  category: 'tax' | 'spending' | 'services' | 'fiscal-rules';
  description: string;
  detail: string;
  breakCost_approval: number; // Approval cost if broken
  breakCost_pmTrust: number; // PM trust cost if broken
  backbenchConcern: number; // How much backbenchers care (0-10)
  violated: boolean;
  turnViolated?: number;
  // One-click solution support
  oneClickAvailable: boolean; // Whether this pledge can be fulfilled with one click
  oneClickType?: 'lock-tax-rates' | 'allocate-spending' | 'none'; // Type of one-click action
  oneClickCost?: number; // Fiscal cost of one-click action (£bn)
  oneClickDescription?: string; // Description of what the one-click action does
  oneClickExecuted?: boolean; // Whether the one-click spending action has already been applied
  // Progress tracking
  progressType: 'compliance' | 'achievement' | 'outcome'; // Type of progress tracking
  targetValue?: number; // Target value for achievement-type progress
  currentValue?: number; // Current value for achievement-type progress
  targetUnit?: string; // Unit for target (e.g., 'teachers', 'appointments per week', '% of GDP')
  // Annual growth tracking (for pledges like "3.5% NHS growth per year")
  requiredAnnualGrowth?: number; // Required annual real growth percentage
  targetDepartment?: 'nhs' | 'education' | 'defence'; // Department to track for annual growth
}

export interface ManifestoTemplate {
  id: string;
  name: string;
  theme: string; // e.g. "Cautious centrism", "Social democratic", etc.
  pledges: Omit<ManifestoPledge, 'violated' | 'turnViolated' | 'currentValue' | 'oneClickExecuted'>[];
}

export interface ManifestoState {
  selectedTemplate: string;
  pledges: ManifestoPledge[];
  totalPledges: number;
  totalViolations: number;
  approvalCostFromViolations: number;
  pmTrustCostFromViolations: number;
}

// ===========================
// Manifesto Templates
// ===========================

export const MANIFESTO_TEMPLATES: ManifestoTemplate[] = [
  {
    id: 'cautious-centrist',
    name: 'Change with Economic Stability',
    theme: 'Cautious centrism - credibility-focused, minimal tax rises, targeted spending increases',
    pledges: [
      {
        id: 'income-tax-lock',
        category: 'tax',
        description: 'No increase in income tax rates',
        detail: 'Basic, higher, and additional rate income tax will not be increased during this parliament. Protects working people.',
        breakCost_approval: -7,
        breakCost_pmTrust: -8,
        backbenchConcern: 8,
        oneClickAvailable: true,
        oneClickType: 'lock-tax-rates',
        oneClickCost: 0,
        oneClickDescription: 'Revert all income tax rates to their starting levels',
        progressType: 'compliance',
      },
      {
        id: 'ni-lock',
        category: 'tax',
        description: 'No increase in National Insurance rates',
        detail: 'No increase in employee or employer National Insurance contributions. Working people will not pay more.',
        breakCost_approval: -7,
        breakCost_pmTrust: -8,
        backbenchConcern: 8,
        oneClickAvailable: true,
        oneClickType: 'lock-tax-rates',
        oneClickCost: 0,
        oneClickDescription: 'Revert National Insurance rates to their starting levels',
        progressType: 'compliance',
      },
      {
        id: 'vat-lock',
        category: 'tax',
        description: 'No increase in VAT',
        detail: 'VAT will remain at 20%. Will not increase the tax on everyday essentials.',
        breakCost_approval: -9,
        breakCost_pmTrust: -10,
        backbenchConcern: 9,
        oneClickAvailable: true,
        oneClickType: 'lock-tax-rates',
        oneClickCost: 0,
        oneClickDescription: 'Revert VAT to its starting level',
        progressType: 'compliance',
      },
      {
        id: 'corp-tax-lock',
        category: 'tax',
        description: 'No increase in corporation tax',
        detail: 'Corporation tax will not rise above 25%. Business certainty for growth.',
        breakCost_approval: -4,
        breakCost_pmTrust: -5,
        backbenchConcern: 5,
        oneClickAvailable: true,
        oneClickType: 'lock-tax-rates',
        oneClickCost: 0,
        oneClickDescription: 'Revert corporation tax to its starting level',
        progressType: 'compliance',
      },
      {
        id: 'fiscal-rules',
        category: 'fiscal-rules',
        description: 'Meet fiscal rules every year',
        detail: 'Balance current budget by end of forecast period. Debt must be falling as percentage of GDP.',
        breakCost_approval: -6,
        breakCost_pmTrust: -12,
        backbenchConcern: 7,
        oneClickAvailable: false,
        oneClickType: 'none',
        oneClickDescription: 'This is an outcome-based pledge that requires careful fiscal management',
        progressType: 'outcome',
      },
      {
        id: 'nhs-appointments',
        category: 'services',
        description: '40,000 more NHS appointments per week',
        detail: 'Funded by abolishing non-dom status and VAT on private schools. Reduce waiting times.',
        breakCost_approval: -5,
        breakCost_pmTrust: -6,
        backbenchConcern: 9,
        oneClickAvailable: true,
        oneClickType: 'allocate-spending',
        oneClickCost: 1.5,
        oneClickDescription: 'Allocate £1.5bn to NHS to fund additional appointments',
        progressType: 'achievement',
        targetValue: 40000,
        targetUnit: 'appointments per week',
      },
      {
        id: 'teachers',
        category: 'spending',
        description: '6,500 new teachers',
        detail: 'Recruit and retain excellent teachers. Funded by ending VAT exemption on private schools.',
        breakCost_approval: -3,
        breakCost_pmTrust: -4,
        backbenchConcern: 6,
        oneClickAvailable: true,
        oneClickType: 'allocate-spending',
        oneClickCost: 0.525,
        oneClickDescription: 'Allocate £525m to education for teacher recruitment',
        progressType: 'achievement',
        targetValue: 6500,
        targetUnit: 'teachers',
      },
      {
        id: 'police',
        category: 'spending',
        description: '13,000 more neighbourhood police',
        detail: 'Safer streets and quicker response times. Funded by closing tax loopholes.',
        breakCost_approval: -3,
        breakCost_pmTrust: -4,
        backbenchConcern: 5,
        oneClickAvailable: true,
        oneClickType: 'allocate-spending',
        oneClickCost: 0.65,
        oneClickDescription: 'Allocate £650m to policing for officer recruitment',
        progressType: 'achievement',
        targetValue: 13000,
        targetUnit: 'police officers',
      },
    ],
  },
  {
    id: 'social-democratic',
    name: 'Transformative Economic Change',
    theme: 'Social democratic - larger state, public investment focus, progressive taxation',
    pledges: [
      {
        id: 'income-tax-lock',
        category: 'tax',
        description: 'No increase in basic rate income tax',
        detail: 'The basic 20% rate will not increase. Higher and additional rates may be adjusted for fairness.',
        breakCost_approval: -5,
        breakCost_pmTrust: -6,
        backbenchConcern: 7,
        oneClickAvailable: true,
        oneClickType: 'lock-tax-rates',
        oneClickCost: 0,
        oneClickDescription: 'Revert basic rate income tax to its starting level',
        progressType: 'compliance',
      },
      {
        id: 'ni-employee-lock',
        category: 'tax',
        description: 'No increase in employee National Insurance',
        detail: 'Workers will not see NI rises. Employer contributions may be adjusted.',
        breakCost_approval: -6,
        breakCost_pmTrust: -7,
        backbenchConcern: 7,
        oneClickAvailable: true,
        oneClickType: 'lock-tax-rates',
        oneClickCost: 0,
        oneClickDescription: 'Revert employee National Insurance to its starting level',
        progressType: 'compliance',
      },
      {
        id: 'vat-lock',
        category: 'tax',
        description: 'No increase in VAT',
        detail: 'VAT will remain at 20%. Regressive taxes will not be increased.',
        breakCost_approval: -8,
        breakCost_pmTrust: -9,
        backbenchConcern: 8,
        oneClickAvailable: true,
        oneClickType: 'lock-tax-rates',
        oneClickCost: 0,
        oneClickDescription: 'Revert VAT to its starting level',
        progressType: 'compliance',
      },
      {
        id: 'fiscal-rules',
        category: 'fiscal-rules',
        description: 'Meet reformed fiscal rules',
        detail: 'Balance current budget. Investment excluded from borrowing rule. Debt on sustainable path.',
        breakCost_approval: -5,
        breakCost_pmTrust: -8,
        backbenchConcern: 6,
        oneClickAvailable: false,
        oneClickType: 'none',
        oneClickDescription: 'This is an outcome-based pledge that requires careful fiscal management',
        progressType: 'outcome',
      },
      {
        id: 'nhs-investment',
        category: 'services',
        description: 'Real terms NHS spending growth of 3.5% per year',
        detail: 'Transform the NHS with sustained investment. Clear waiting lists within 3 years.',
        breakCost_approval: -8,
        breakCost_pmTrust: -9,
        backbenchConcern: 10,
        oneClickAvailable: true,
        oneClickType: 'allocate-spending',
        oneClickCost: 7,
        oneClickDescription: 'Allocate £7bn to NHS for sustained investment and waiting list reduction',
        progressType: 'outcome',
        requiredAnnualGrowth: 3.5,
        targetDepartment: 'nhs',
      },
      {
        id: 'education-investment',
        category: 'services',
        description: 'Education spending above 5% of GDP',
        detail: 'World-class education system. 10,000 new teachers, crumbling schools rebuilt.',
        breakCost_approval: -4,
        breakCost_pmTrust: -5,
        backbenchConcern: 7,
        oneClickAvailable: true,
        oneClickType: 'allocate-spending',
        oneClickCost: 6,
        oneClickDescription: 'Allocate £6bn to education to achieve above 5% of GDP spending',
        progressType: 'outcome',
      },
      {
        id: 'green-transition',
        category: 'spending',
        description: 'Green investment of £28bn per year',
        detail: 'Transform economy for net zero. Create jobs, cut bills, energy security.',
        breakCost_approval: -6,
        breakCost_pmTrust: -8,
        backbenchConcern: 8,
        oneClickAvailable: true,
        oneClickType: 'allocate-spending',
        oneClickCost: 28,
        oneClickDescription: 'Allocate £28bn to green transition and net zero investment',
        progressType: 'achievement',
      },
      {
        id: 'social-care',
        category: 'services',
        description: 'Free personal care for elderly',
        detail: 'End the social care crisis. Dignity in old age. Funded by wealth taxation.',
        breakCost_approval: -5,
        breakCost_pmTrust: -6,
        backbenchConcern: 6,
        oneClickAvailable: true,
        oneClickType: 'allocate-spending',
        oneClickCost: 10,
        oneClickDescription: 'Allocate £10bn to social care for free personal care provision',
        progressType: 'outcome',
      },
    ],
  },
  {
    id: 'growth-focused',
    name: 'Growth and Opportunity',
    theme: 'Growth-focused - public investment emphasis, fiscal rules reform, selective tax increases',
    pledges: [
      {
        id: 'income-tax-lock',
        category: 'tax',
        description: 'No increase in basic or higher rate income tax',
        detail: 'Protect incomes up to £125,140. Additional rate may be adjusted.',
        breakCost_approval: -6,
        breakCost_pmTrust: -7,
        backbenchConcern: 7,
        oneClickAvailable: true,
        oneClickType: 'lock-tax-rates',
        oneClickCost: 0,
        oneClickDescription: 'Revert basic and higher rate income tax to their starting levels',
        progressType: 'compliance',
      },
      {
        id: 'ni-lock',
        category: 'tax',
        description: 'No increase in employee National Insurance',
        detail: 'Workers will not see NI rises. Reforms to employer contributions for fiscal space.',
        breakCost_approval: -6,
        breakCost_pmTrust: -7,
        backbenchConcern: 7,
        oneClickAvailable: true,
        oneClickType: 'lock-tax-rates',
        oneClickCost: 0,
        oneClickDescription: 'Revert National Insurance rates to their starting levels',
        progressType: 'compliance',
      },
      {
        id: 'vat-lock',
        category: 'tax',
        description: 'No increase in standard VAT rate',
        detail: 'VAT remains at 20%. Scope may be extended to currently exempt items.',
        breakCost_approval: -7,
        breakCost_pmTrust: -8,
        backbenchConcern: 8,
        oneClickAvailable: true,
        oneClickType: 'lock-tax-rates',
        oneClickCost: 0,
        oneClickDescription: 'Revert VAT to its starting level',
        progressType: 'compliance',
      },
      {
        id: 'fiscal-rules',
        category: 'fiscal-rules',
        description: 'Meet golden rule for investment',
        detail: 'Borrow for investment, not current spending. Debt falling in medium term.',
        breakCost_approval: -5,
        breakCost_pmTrust: -9,
        backbenchConcern: 6,
        oneClickAvailable: false,
        oneClickType: 'none',
        oneClickDescription: 'This is an outcome-based pledge that requires careful fiscal management',
        progressType: 'outcome',
      },
      {
        id: 'capital-investment',
        category: 'spending',
        description: 'Public investment above 3.5% of GDP',
        detail: 'Transform infrastructure. Roads, rail, broadband, green energy. Long-term growth.',
        breakCost_approval: -4,
        breakCost_pmTrust: -6,
        backbenchConcern: 7,
        oneClickAvailable: true,
        oneClickType: 'allocate-spending',
        oneClickCost: 8,
        oneClickDescription: 'Allocate £8bn to capital investment in roads, rail and broadband infrastructure',
        progressType: 'outcome',
      },
      {
        id: 'housing-revolution',
        category: 'spending',
        description: 'Build 300,000 homes per year',
        detail: 'Planning reform, public housebuilding, infrastructure investment. End housing crisis.',
        breakCost_approval: -5,
        breakCost_pmTrust: -6,
        backbenchConcern: 6,
        oneClickAvailable: true,
        oneClickType: 'allocate-spending',
        oneClickCost: 8,
        oneClickDescription: 'Allocate £8bn to house building for 300,000 new homes per year',
        progressType: 'achievement',
        targetValue: 300000,
        targetUnit: 'homes per year',
      },
      {
        id: 'skills-training',
        category: 'services',
        description: 'National skills programme for 500,000 workers',
        detail: 'Lifelong learning, apprenticeships, technical education. Skills for growing economy.',
        breakCost_approval: -3,
        breakCost_pmTrust: -4,
        backbenchConcern: 5,
        oneClickAvailable: true,
        oneClickType: 'allocate-spending',
        oneClickCost: 2,
        oneClickDescription: 'Allocate £2bn to national skills programme for 500,000 workers',
        progressType: 'achievement',
        targetValue: 500000,
        targetUnit: 'workers trained',
      },
      {
        id: 'nhs-reformed',
        category: 'services',
        description: 'NHS efficiency drive with 2.5% real growth',
        detail: 'Reform and invest. Technology, workforce planning, reduce waste. Sustainable NHS.',
        breakCost_approval: -4,
        breakCost_pmTrust: -5,
        backbenchConcern: 7,
        oneClickAvailable: true,
        oneClickType: 'allocate-spending',
        oneClickCost: 5,
        oneClickDescription: 'Allocate £5bn to NHS for efficiency improvements and real growth investment',
        progressType: 'outcome',
      },
    ],
  },
  {
    id: 'blair-style',
    name: 'Progressive Pragmatism',
    theme: 'New Labour style - fiscal caution, public service investment, business-friendly',
    pledges: [
      {
        id: 'income-tax-lock',
        category: 'tax',
        description: 'No increase in basic or higher rate income tax',
        detail: 'Tax rises only on those earning over £125,000. Aspiration rewarded.',
        breakCost_approval: -6,
        breakCost_pmTrust: -7,
        backbenchConcern: 7,
        oneClickAvailable: true,
        oneClickType: 'lock-tax-rates',
        oneClickCost: 0,
        oneClickDescription: 'Revert basic and higher rate income tax to their starting levels',
        progressType: 'compliance',
      },
      {
        id: 'ni-lock',
        category: 'tax',
        description: 'No increase in employee National Insurance',
        detail: 'Working people protected from tax rises. Employer contributions may be adjusted.',
        breakCost_approval: -6,
        breakCost_pmTrust: -7,
        backbenchConcern: 7,
        oneClickAvailable: true,
        oneClickType: 'lock-tax-rates',
        oneClickCost: 0,
        oneClickDescription: 'Revert National Insurance rates to their starting levels',
        progressType: 'compliance',
      },
      {
        id: 'vat-lock',
        category: 'tax',
        description: 'No increase in VAT',
        detail: 'VAT stays at 20%. Will not tax everyday essentials.',
        breakCost_approval: -8,
        breakCost_pmTrust: -9,
        backbenchConcern: 8,
        oneClickAvailable: true,
        oneClickType: 'lock-tax-rates',
        oneClickCost: 0,
        oneClickDescription: 'Revert VAT to its starting level',
        progressType: 'compliance',
      },
      {
        id: 'corp-tax-cap',
        category: 'tax',
        description: 'Corporation tax capped at current rate',
        detail: 'Business certainty. Tax will not rise above 25%. Competitive business environment.',
        breakCost_approval: -3,
        breakCost_pmTrust: -4,
        backbenchConcern: 4,
        oneClickAvailable: true,
        oneClickType: 'lock-tax-rates',
        oneClickCost: 0,
        oneClickDescription: 'Revert corporation tax to its starting level',
        progressType: 'compliance',
      },
      {
        id: 'fiscal-rules',
        category: 'fiscal-rules',
        description: 'Golden rule: borrow only to invest',
        detail: 'Current budget balanced. Investment borrowing allowed. Debt falling over cycle.',
        breakCost_approval: -5,
        breakCost_pmTrust: -10,
        backbenchConcern: 6,
        oneClickAvailable: false,
        oneClickType: 'none',
        oneClickDescription: 'This is an outcome-based pledge that requires careful fiscal management',
        progressType: 'outcome',
      },
      {
        id: 'education-education',
        category: 'services',
        description: 'Education as top spending priority',
        detail: 'Every child deserves excellent education. Class sizes cut, standards raised.',
        breakCost_approval: -6,
        breakCost_pmTrust: -7,
        backbenchConcern: 8,
        oneClickAvailable: true,
        oneClickType: 'allocate-spending',
        oneClickCost: 4,
        oneClickDescription: 'Allocate £4bn to education for class size reductions and standards improvement',
        progressType: 'outcome',
      },
      {
        id: 'nhs-investment-blairite',
        category: 'services',
        description: 'NHS investment with reform',
        detail: '3% real growth with modernisation. Targets, choice, efficiency. NHS fit for future.',
        breakCost_approval: -6,
        breakCost_pmTrust: -7,
        backbenchConcern: 9,
        oneClickAvailable: true,
        oneClickType: 'allocate-spending',
        oneClickCost: 5,
        oneClickDescription: 'Allocate £5bn to NHS for modernisation and 3% real growth investment',
        progressType: 'outcome',
        requiredAnnualGrowth: 3.0,
        targetDepartment: 'nhs',
      },
      {
        id: 'welfare-to-work',
        category: 'spending',
        description: 'Get 1 million people into work',
        detail: 'Active labour market policies. Support for jobseekers. Work is best route out of poverty.',
        breakCost_approval: -2,
        breakCost_pmTrust: -3,
        backbenchConcern: 5,
        oneClickAvailable: true,
        oneClickType: 'allocate-spending',
        oneClickCost: 1.5,
        oneClickDescription: 'Allocate £1.5bn to welfare-to-work programmes for 1 million into employment',
        progressType: 'achievement',
        targetValue: 1000000,
        targetUnit: 'people into work',
      },
    ],
  },
  {
    id: 'prudent-progressive',
    name: 'Responsible Reform',
    theme: 'Prudent progressive - balanced approach, fiscal discipline with social justice',
    pledges: [
      {
        id: 'income-tax-lock',
        category: 'tax',
        description: 'No increase in basic rate income tax',
        detail: 'Basic rate protected. Higher earners may contribute more for fairness.',
        breakCost_approval: -5,
        breakCost_pmTrust: -6,
        backbenchConcern: 6,
        oneClickAvailable: true,
        oneClickType: 'lock-tax-rates',
        oneClickCost: 0,
        oneClickDescription: 'Revert basic rate income tax to its starting level',
        progressType: 'compliance',
      },
      {
        id: 'ni-employee-lock',
        category: 'tax',
        description: 'No increase in employee National Insurance',
        detail: 'Workers protected. Employer contributions reformed to fund public services.',
        breakCost_approval: -6,
        breakCost_pmTrust: -7,
        backbenchConcern: 7,
        oneClickAvailable: true,
        oneClickType: 'lock-tax-rates',
        oneClickCost: 0,
        oneClickDescription: 'Revert employee National Insurance to its starting level',
        progressType: 'compliance',
      },
      {
        id: 'vat-lock',
        category: 'tax',
        description: 'No increase in VAT',
        detail: 'VAT stays at 20%. Regressive taxes will not be increased.',
        breakCost_approval: -8,
        breakCost_pmTrust: -9,
        backbenchConcern: 8,
        oneClickAvailable: true,
        oneClickType: 'lock-tax-rates',
        oneClickCost: 0,
        oneClickDescription: 'Revert VAT to its starting level',
        progressType: 'compliance',
      },
      {
        id: 'fiscal-rules-prudent',
        category: 'fiscal-rules',
        description: 'Strict fiscal rules with investment exemption',
        detail: 'Current budget balanced within 3 years. Investment borrowing allowed. Debt sustainable.',
        breakCost_approval: -6,
        breakCost_pmTrust: -10,
        backbenchConcern: 7,
        oneClickAvailable: false,
        oneClickType: 'none',
        oneClickDescription: 'This is an outcome-based pledge that requires careful fiscal management',
        progressType: 'outcome',
      },
      {
        id: 'nhs-waiting-times',
        category: 'services',
        description: 'Eliminate 2-year NHS waits',
        detail: 'Nobody waits more than 18 months for treatment. Funded by tax efficiency measures.',
        breakCost_approval: -6,
        breakCost_pmTrust: -7,
        backbenchConcern: 9,
        oneClickAvailable: true,
        oneClickType: 'allocate-spending',
        oneClickCost: 3.5,
        oneClickDescription: 'Allocate £3.5bn to NHS to eliminate 2-year waiting lists',
        progressType: 'outcome',
      },
      {
        id: 'education-standards',
        category: 'services',
        description: 'Raise education standards in every region',
        detail: 'Opportunity everywhere. 5,000 new teachers in underperforming areas.',
        breakCost_approval: -4,
        breakCost_pmTrust: -5,
        backbenchConcern: 6,
        oneClickAvailable: true,
        oneClickType: 'allocate-spending',
        oneClickCost: 2.5,
        oneClickDescription: 'Allocate £2.5bn to education to raise standards with 5,000 new teachers',
        progressType: 'achievement',
        targetValue: 5000,
        targetUnit: 'teachers in underperforming areas',
      },
      {
        id: 'climate-investment',
        category: 'spending',
        description: 'Green investment of £15bn per year',
        detail: 'Clean energy, insulation, public transport. Net zero with jobs and growth.',
        breakCost_approval: -4,
        breakCost_pmTrust: -5,
        backbenchConcern: 6,
        oneClickAvailable: true,
        oneClickType: 'allocate-spending',
        oneClickCost: 15,
        oneClickDescription: 'Allocate £15bn to green investment for net zero and job creation',
        progressType: 'achievement',
      },
      {
        id: 'child-poverty',
        category: 'spending',
        description: 'Lift 500,000 children out of poverty',
        detail: 'Targeted support for families. Every child deserves chance to succeed.',
        breakCost_approval: -3,
        breakCost_pmTrust: -4,
        backbenchConcern: 5,
        oneClickAvailable: true,
        oneClickType: 'allocate-spending',
        oneClickCost: 3,
        oneClickDescription: 'Allocate £3bn to lift 500,000 children out of poverty',
        progressType: 'achievement',
        targetValue: 500000,
        targetUnit: 'children out of poverty',
      },
    ],
  },
];

// ===========================
// Manifesto Functions
// ===========================

export function getRandomManifesto(): ManifestoTemplate {
  const randomIndex = Math.floor(Math.random() * MANIFESTO_TEMPLATES.length);
  return MANIFESTO_TEMPLATES[randomIndex];
}

export function getManifestoById(id: string): ManifestoTemplate | undefined {
  return MANIFESTO_TEMPLATES.find((template) => template.id === id);
}

export function initializeManifestoState(templateId?: string): ManifestoState {
  const template = templateId
    ? getManifestoById(templateId) || getRandomManifesto()
    : getRandomManifesto();

  const pledges: ManifestoPledge[] = template.pledges.map((pledge) => ({
    ...pledge,
    violated: false,
    currentValue: 0, // Initialize progress tracking
  }));

  return {
    selectedTemplate: template.id,
    pledges,
    totalPledges: pledges.length,
    totalViolations: 0,
    approvalCostFromViolations: 0,
    pmTrustCostFromViolations: 0,
  };
}

// ===========================
// One-Click Action Handlers
// ===========================

export interface OneClickActionResult {
  success: boolean;
  message: string;
  budgetChanges?: {
    // Tax changes (percentage point changes)
    incomeTaxBasicChange?: number;
    incomeTaxHigherChange?: number;
    incomeTaxAdditionalChange?: number;
    niEmployeeChange?: number;
    niEmployerChange?: number;
    vatChange?: number;
    corporationTaxChange?: number;
    // Spending changes (£bn changes)
    nhsSpendingChange?: number;
    educationSpendingChange?: number;
    defenceSpendingChange?: number;
    welfareSpendingChange?: number;
    infrastructureSpendingChange?: number;
    policeSpendingChange?: number;
    otherSpendingChange?: number;
  };
  costDescription?: string;
  pledgeId: string;
}

/**
 * Executes the one-click action for a specific manifesto pledge
 * @param pledge The pledge to fulfil
 * @param currentTaxRates Current tax rates in the game
 * @param startingTaxRates Starting tax rates from game start
 * @returns Result with budget changes to apply
 */
export function executeOneClickAction(
  pledge: ManifestoPledge,
  currentTaxRates: {
    incomeTaxBasic: number;
    incomeTaxHigher: number;
    incomeTaxAdditional: number;
    niEmployee: number;
    niEmployer: number;
    vat: number;
    corporationTax: number;
  },
  startingTaxRates: {
    incomeTaxBasic: number;
    incomeTaxHigher: number;
    incomeTaxAdditional: number;
    niEmployee: number;
    niEmployer: number;
    vat: number;
    corporationTax: number;
  }
): OneClickActionResult {
  if (!pledge.oneClickAvailable) {
    return {
      success: false,
      message: `No one-click solution available for "${pledge.description}". ${pledge.oneClickDescription}`,
      pledgeId: pledge.id,
    };
  }

  // Prevent re-execution of spending pledges (they are strictly one-time)
  if (pledge.oneClickType === 'allocate-spending' && pledge.oneClickExecuted) {
    return {
      success: false,
      message: `"${pledge.description}" has already been fulfilled. The spending allocation has been applied.`,
      pledgeId: pledge.id,
    };
  }

  // Handle tax lock one-click actions
  if (pledge.oneClickType === 'lock-tax-rates') {
    const budgetChanges: any = {};
    let revertedTaxes: string[] = [];

    // Check which taxes need reverting based on pledge ID
    if (pledge.id === 'income-tax-lock') {
      if (currentTaxRates.incomeTaxBasic !== startingTaxRates.incomeTaxBasic) {
        budgetChanges.incomeTaxBasicChange = startingTaxRates.incomeTaxBasic - currentTaxRates.incomeTaxBasic;
        revertedTaxes.push('basic rate income tax');
      }
      if (currentTaxRates.incomeTaxHigher !== startingTaxRates.incomeTaxHigher) {
        budgetChanges.incomeTaxHigherChange = startingTaxRates.incomeTaxHigher - currentTaxRates.incomeTaxHigher;
        revertedTaxes.push('higher rate income tax');
      }
      if (currentTaxRates.incomeTaxAdditional !== startingTaxRates.incomeTaxAdditional) {
        budgetChanges.incomeTaxAdditionalChange = startingTaxRates.incomeTaxAdditional - currentTaxRates.incomeTaxAdditional;
        revertedTaxes.push('additional rate income tax');
      }
    } else if (pledge.id === 'ni-lock' || pledge.id === 'ni-employee-lock') {
      if (currentTaxRates.niEmployee !== startingTaxRates.niEmployee) {
        budgetChanges.niEmployeeChange = startingTaxRates.niEmployee - currentTaxRates.niEmployee;
        revertedTaxes.push('employee National Insurance');
      }
      if (pledge.id === 'ni-lock' && currentTaxRates.niEmployer !== startingTaxRates.niEmployer) {
        budgetChanges.niEmployerChange = startingTaxRates.niEmployer - currentTaxRates.niEmployer;
        revertedTaxes.push('employer National Insurance');
      }
    } else if (pledge.id === 'vat-lock') {
      if (currentTaxRates.vat !== startingTaxRates.vat) {
        budgetChanges.vatChange = startingTaxRates.vat - currentTaxRates.vat;
        revertedTaxes.push('VAT');
      }
    } else if (pledge.id === 'corp-tax-lock' || pledge.id === 'corp-tax-cap') {
      if (currentTaxRates.corporationTax !== startingTaxRates.corporationTax) {
        budgetChanges.corporationTaxChange = startingTaxRates.corporationTax - currentTaxRates.corporationTax;
        revertedTaxes.push('corporation tax');
      }
    }

    if (revertedTaxes.length === 0) {
      return {
        success: true,
        message: `"${pledge.description}" is already being kept. No tax changes needed.`,
        pledgeId: pledge.id,
      };
    }

    return {
      success: true,
      message: `Reverted ${revertedTaxes.join(', ')} to starting levels to fulfil "${pledge.description}".`,
      budgetChanges,
      pledgeId: pledge.id,
    };
  }

  // Handle spending allocation one-click actions
  if (pledge.oneClickType === 'allocate-spending') {
    const budgetChanges: any = {};
    const cost = pledge.oneClickCost || 0;

    // Map pledges to spending categories
    if (pledge.id.includes('nhs')) {
      budgetChanges.nhsSpendingChange = cost;
    } else if (pledge.id.includes('education') || pledge.id === 'teachers') {
      budgetChanges.educationSpendingChange = cost;
    } else if (pledge.id === 'police') {
      budgetChanges.policeSpendingChange = cost;
    } else if (pledge.id === 'welfare-to-work' || pledge.id === 'child-poverty') {
      budgetChanges.welfareSpendingChange = cost;
    } else if (pledge.id.includes('green') || pledge.id === 'climate-investment' || pledge.id === 'capital-investment' || pledge.id === 'housing-revolution') {
      budgetChanges.infrastructureSpendingChange = cost;
    } else if (pledge.id === 'skills-training' || pledge.id === 'social-care') {
      budgetChanges.otherSpendingChange = cost;
    }

    return {
      success: true,
      message: `Allocated £${cost}bn to fulfil "${pledge.description}". This will increase spending and may affect your fiscal position.`,
      budgetChanges,
      costDescription: `Fiscal impact: +£${cost}bn annual spending`,
      pledgeId: pledge.id,
    };
  }

  return {
    success: false,
    message: `Unable to execute one-click action for "${pledge.description}".`,
    pledgeId: pledge.id,
  };
}

/**
 * Calculate progress for a manifesto pledge
 * @param pledge The pledge to calculate progress for
 * @param gameState Current game state for checking compliance
 * @returns Progress percentage (0-100) and status message
 */
export function calculatePledgeProgress(
  pledge: ManifestoPledge,
  gameState: {
    currentTaxRates: {
      incomeTaxBasic: number;
      incomeTaxHigher: number;
      incomeTaxAdditional: number;
      niEmployee: number;
      niEmployer: number;
      vat: number;
      corporationTax: number;
    };
    startingTaxRates: {
      incomeTaxBasic: number;
      incomeTaxHigher: number;
      incomeTaxAdditional: number;
      niEmployee: number;
      niEmployer: number;
      vat: number;
      corporationTax: number;
    };
    fiscalRuleMet?: boolean;
  }
): { progress: number; status: string; statusColor: 'green' | 'amber' | 'red' } {
  // Compliance type: check if current policy complies with pledge
  if (pledge.progressType === 'compliance') {
    let isCompliant = true;

    if (pledge.id === 'income-tax-lock') {
      isCompliant = gameState.currentTaxRates.incomeTaxBasic <= gameState.startingTaxRates.incomeTaxBasic &&
                    gameState.currentTaxRates.incomeTaxHigher <= gameState.startingTaxRates.incomeTaxHigher &&
                    gameState.currentTaxRates.incomeTaxAdditional <= gameState.startingTaxRates.incomeTaxAdditional;
    } else if (pledge.id === 'ni-lock' || pledge.id === 'ni-employee-lock') {
      isCompliant = gameState.currentTaxRates.niEmployee <= gameState.startingTaxRates.niEmployee;
      if (pledge.id === 'ni-lock') {
        isCompliant = isCompliant && gameState.currentTaxRates.niEmployer <= gameState.startingTaxRates.niEmployer;
      }
    } else if (pledge.id === 'vat-lock') {
      isCompliant = gameState.currentTaxRates.vat <= gameState.startingTaxRates.vat;
    } else if (pledge.id === 'corp-tax-lock' || pledge.id === 'corp-tax-cap') {
      isCompliant = gameState.currentTaxRates.corporationTax <= gameState.startingTaxRates.corporationTax;
    }

    return {
      progress: isCompliant ? 100 : 0,
      status: isCompliant ? 'Keeping pledge' : 'Violating pledge',
      statusColor: isCompliant ? 'green' : 'red',
    };
  }

  // Achievement type: track progress towards a specific target
  if (pledge.progressType === 'achievement' && pledge.targetValue) {
    const current = pledge.currentValue || 0;
    const progress = Math.min(100, Math.round((current / pledge.targetValue) * 100));

    let statusColor: 'green' | 'amber' | 'red' = 'red';
    if (progress >= 100) statusColor = 'green';
    else if (progress >= 50) statusColor = 'amber';

    return {
      progress,
      status: `${current.toLocaleString()} / ${pledge.targetValue.toLocaleString()} ${pledge.targetUnit}`,
      statusColor,
    };
  }

  // Outcome type: binary based on whether violated
  if (pledge.progressType === 'outcome') {
    if (pledge.id.includes('fiscal-rule')) {
      const isMet = gameState.fiscalRuleMet ?? false;
      return {
        progress: isMet ? 100 : 0,
        status: isMet ? 'Meeting fiscal rules' : 'Not meeting fiscal rules',
        statusColor: isMet ? 'green' : 'red',
      };
    }

    // For other outcome pledges, use violation status
    return {
      progress: pledge.violated ? 0 : 100,
      status: pledge.violated ? 'Not achieved' : 'On track',
      statusColor: pledge.violated ? 'red' : 'green',
    };
  }

  return {
    progress: 0,
    status: 'Unknown',
    statusColor: 'red',
  };
}

// Check if a policy change violates manifesto pledges
export interface PolicyViolationCheck {
  violatedPledges: ManifestoPledge[];
  totalApprovalCost: number;
  totalPmTrustCost: number;
  warnings: string[];
}

export function checkPolicyForViolations(
  manifestoState: ManifestoState,
  policyChange: {
    incomeTaxBasicChange?: number;
    incomeTaxHigherChange?: number;
    incomeTaxAdditionalChange?: number;
    niEmployeeChange?: number;
    niEmployerChange?: number;
    vatChange?: number;
    corporationTaxChange?: number;
    fiscalRuleBreached?: boolean;
    nhsSpendingCutReal?: boolean;
    educationSpendingCutReal?: boolean;
  }
): PolicyViolationCheck {
  const violatedPledges: ManifestoPledge[] = [];
  const warnings: string[] = [];

  manifestoState.pledges.forEach((pledge) => {
    if (pledge.violated) return; // Already violated

    let isViolated = false;

    // Check specific violations based on pledge IDs
    switch (pledge.id) {
      case 'income-tax-lock':
        if (
          policyChange.incomeTaxBasicChange! > 0 ||
          policyChange.incomeTaxHigherChange! > 0 ||
          policyChange.incomeTaxAdditionalChange! > 0
        ) {
          isViolated = true;
          warnings.push(
            `Increasing income tax violates manifesto pledge: "${pledge.description}"`
          );
        }
        break;

      case 'ni-lock':
      case 'ni-employee-lock':
        if (policyChange.niEmployeeChange! > 0 || policyChange.niEmployerChange! > 0) {
          isViolated = true;
          warnings.push(
            `Increasing National Insurance violates manifesto pledge: "${pledge.description}"`
          );
        }
        break;

      case 'vat-lock':
        if (policyChange.vatChange! > 0) {
          isViolated = true;
          warnings.push(`Increasing VAT violates manifesto pledge: "${pledge.description}"`);
        }
        break;

      case 'corp-tax-lock':
      case 'corp-tax-cap':
        if (policyChange.corporationTaxChange! > 0) {
          isViolated = true;
          warnings.push(
            `Increasing corporation tax violates manifesto pledge: "${pledge.description}"`
          );
        }
        break;

      case 'fiscal-rules':
      case 'fiscal-rules-prudent':
        // Fiscal-rule breaches are tracked separately from manifesto violations.
        // They still matter for gilt premia and credibility, but do not increment
        // manifesto violation counters or trigger manifesto penalty tiers.
        if (policyChange.fiscalRuleBreached) {
          warnings.push(`Fiscal rule breach detected: "${pledge.description}" is off track.`);
        }
        break;

      case 'nhs-appointments':
      case 'nhs-investment':
      case 'nhs-investment-blairite':
      case 'nhs-waiting-times':
        if (policyChange.nhsSpendingCutReal) {
          isViolated = true;
          warnings.push(
            `Real terms NHS spending cuts violate manifesto pledge: "${pledge.description}"`
          );
        }
        break;

      case 'teachers':
      case 'education-investment':
      case 'education-education':
      case 'education-standards':
        if (policyChange.educationSpendingCutReal) {
          isViolated = true;
          warnings.push(
            `Education spending cuts violate manifesto pledge: "${pledge.description}"`
          );
        }
        break;
    }

    if (isViolated) {
      violatedPledges.push(pledge);
    }
  });

  const totalApprovalCost = violatedPledges.reduce(
    (sum, p) => sum + p.breakCost_approval,
    0
  );
  const totalPmTrustCost = violatedPledges.reduce(
    (sum, p) => sum + p.breakCost_pmTrust,
    0
  );

  return {
    violatedPledges,
    totalApprovalCost,
    totalPmTrustCost,
    warnings,
  };
}

// Apply violations to manifesto state
export function applyManifestoViolations(
  manifestoState: ManifestoState,
  violatedPledges: ManifestoPledge[],
  currentTurn: number
): ManifestoState {
  const updatedPledges = manifestoState.pledges.map((pledge) => {
    const violation = violatedPledges.find((vp) => vp.id === pledge.id);
    if (violation && !pledge.violated) {
      return { ...pledge, violated: true, turnViolated: currentTurn };
    }
    return pledge;
  });

  const totalApprovalCost = violatedPledges.reduce(
    (sum, p) => sum + p.breakCost_approval,
    0
  );
  const totalPmTrustCost = violatedPledges.reduce(
    (sum, p) => sum + p.breakCost_pmTrust,
    0
  );

  return {
    ...manifestoState,
    pledges: updatedPledges,
    totalViolations: manifestoState.totalViolations + violatedPledges.length,
    approvalCostFromViolations:
      manifestoState.approvalCostFromViolations + totalApprovalCost,
    pmTrustCostFromViolations: manifestoState.pmTrustCostFromViolations + totalPmTrustCost,
  };
}

// ===========================
// Manifesto Display Components
// ===========================

export const ManifestoDisplay: React.FC<{
  manifestoState: ManifestoState;
  showViolationsOnly?: boolean;
  gameState?: {
    currentTaxRates: {
      incomeTaxBasic: number;
      incomeTaxHigher: number;
      incomeTaxAdditional: number;
      niEmployee: number;
      niEmployer: number;
      vat: number;
      corporationTax: number;
    };
    startingTaxRates: {
      incomeTaxBasic: number;
      incomeTaxHigher: number;
      incomeTaxAdditional: number;
      niEmployee: number;
      niEmployer: number;
      vat: number;
      corporationTax: number;
    };
    fiscalRuleMet?: boolean;
  };
  onExecuteOneClick?: (result: OneClickActionResult) => void;
}> = ({ manifestoState, showViolationsOnly = false, gameState, onExecuteOneClick }) => {
  const template = getManifestoById(manifestoState.selectedTemplate);
  if (!template) return null;

  const displayPledges = showViolationsOnly
    ? manifestoState.pledges.filter((p) => p.violated)
    : manifestoState.pledges;

  const pledgesByCategory = {
    tax: displayPledges.filter((p) => p.category === 'tax'),
    'fiscal-rules': displayPledges.filter((p) => p.category === 'fiscal-rules'),
    spending: displayPledges.filter((p) => p.category === 'spending'),
    services: displayPledges.filter((p) => p.category === 'services'),
  };

  const handleOneClick = (pledge: ManifestoPledge) => {
    if (!gameState || !onExecuteOneClick) return;

    const result = executeOneClickAction(
      pledge,
      gameState.currentTaxRates,
      gameState.startingTaxRates
    );

    onExecuteOneClick(result);
  };

  return (
    <div className="bg-white border-2 border-red-700 p-6 rounded-sm">
      <div className="border-b-2 border-red-700 pb-3 mb-4">
        <h2 className="text-2xl font-bold text-gray-900">
          Labour Manifesto 2024
        </h2>
        <h3 className="text-lg font-semibold text-red-700 mt-1">
          {template.name}
        </h3>
        <p className="text-sm text-gray-600 mt-2">{template.theme}</p>
      </div>

      {manifestoState.totalViolations > 0 && (
        <div className="bg-red-50 border border-red-300 p-3 rounded-sm mb-4">
          <p className="text-sm font-semibold text-red-800">
            Manifesto Status: {manifestoState.totalViolations} pledge
            {manifestoState.totalViolations !== 1 ? 's' : ''} broken
          </p>
          <p className="text-xs text-red-700 mt-1">
            Total approval cost: {manifestoState.approvalCostFromViolations} points
          </p>
        </div>
      )}

      {Object.entries(pledgesByCategory).map(([category, pledges]) => {
        if (pledges.length === 0) return null;

        const categoryNames: Record<string, string> = {
          tax: 'Taxation',
          'fiscal-rules': 'Fiscal Rules',
          spending: 'Spending Commitments',
          services: 'Public Services',
        };

        return (
          <div key={category} className="mb-4">
            <h4 className="text-md font-semibold text-gray-800 mb-2 uppercase text-xs tracking-wide">
              {categoryNames[category]}
            </h4>
            <div className="space-y-3">
              {pledges.map((pledge) => {
                // Calculate progress if game state is available
                const progressData = gameState
                  ? calculatePledgeProgress(pledge, gameState)
                  : null;

                return (
                  <div
                    key={pledge.id}
                    className={`p-3 border-l-4 ${
                      pledge.violated
                        ? 'border-red-600 bg-red-50'
                        : progressData?.statusColor === 'green'
                        ? 'border-green-600 bg-green-50'
                        : progressData?.statusColor === 'amber'
                        ? 'border-amber-500 bg-amber-50'
                        : 'border-gray-300 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-900">
                              {pledge.violated && '[BROKEN] '}
                              {pledge.description}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">{pledge.detail}</p>
                          </div>
                          {pledge.violated && (
                            <div className="text-right flex-shrink-0">
                              <p className="text-xs text-red-700 font-semibold">
                                -{Math.abs(pledge.breakCost_approval)} approval
                              </p>
                              <p className="text-xs text-red-600">
                                -{Math.abs(pledge.breakCost_pmTrust)} PM trust
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Progress Bar */}
                        {progressData && (
                          <div className="mt-2">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-gray-700">
                                {progressData.status}
                              </span>
                              <span className="text-xs font-medium text-gray-700">
                                {progressData.progress}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  progressData.statusColor === 'green'
                                    ? 'bg-green-600'
                                    : progressData.statusColor === 'amber'
                                    ? 'bg-amber-500'
                                    : 'bg-red-600'
                                }`}
                                style={{ width: `${progressData.progress}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {pledge.violated && pledge.turnViolated && (
                          <p className="text-xs text-red-700 mt-2 font-medium">
                            Broken in month {pledge.turnViolated}
                          </p>
                        )}

                        {/* One-Click Action Button */}
                        {pledge.oneClickAvailable && gameState && onExecuteOneClick && (
                          <div className="mt-3 pt-2 border-t border-gray-200">
                            {pledge.oneClickType === 'allocate-spending' && pledge.oneClickExecuted ? (
                              <p className="text-xs text-green-700 font-medium">
                                Spending allocated -- pledge fulfilled
                              </p>
                            ) : (
                            <button
                              onClick={() => handleOneClick(pledge)}
                              className={`text-xs font-medium px-3 py-1.5 rounded ${
                                pledge.violated
                                  ? 'bg-red-600 hover:bg-red-700 text-white'
                                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                              } transition-colors`}
                              title={pledge.oneClickDescription}
                            >
                              {pledge.violated ? 'Quick Fix' : 'Fulfil Pledge'}
                              {pledge.oneClickCost && pledge.oneClickCost > 0
                                ? ` (£${pledge.oneClickCost}bn)`
                                : ''}
                            </button>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                              {pledge.oneClickDescription}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Compact warning component for budget screen
export const ManifestoWarnings: React.FC<{
  warnings: string[];
}> = ({ warnings }) => {
  if (warnings.length === 0) return null;

  return (
    <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded-sm">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <span className="text-xl font-bold text-red-800">!</span>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-bold text-red-800">
            Manifesto Violation Warning
          </h3>
          <ul className="mt-2 text-sm text-red-700 space-y-1">
            {warnings.map((warning, index) => (
              <li key={index}>• {warning}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

// ===========================
// Advisor Recommendation System
// ===========================

export interface ManifestoAdvice {
  type: 'recommendation' | 'warning' | 'trade-off' | 'progress-update';
  priority: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  pledgeId?: string;
  actionable: boolean;
  action?: {
    label: string;
    oneClickAvailable: boolean;
    cost?: number;
  };
}

/**
 * Generate advisor recommendations for manifesto pledges
 */
export function generateManifestoAdvice(
  manifestoState: ManifestoState,
  gameState: {
    currentTaxRates: {
      incomeTaxBasic: number;
      incomeTaxHigher: number;
      incomeTaxAdditional: number;
      niEmployee: number;
      niEmployer: number;
      vat: number;
      corporationTax: number;
    };
    startingTaxRates: {
      incomeTaxBasic: number;
      incomeTaxHigher: number;
      incomeTaxAdditional: number;
      niEmployee: number;
      niEmployer: number;
      vat: number;
      corporationTax: number;
    };
    fiscalRuleMet?: boolean;
    currentBudgetBalance?: number;
  },
  includeProgressUpdates: boolean = false
): ManifestoAdvice[] {
  const advice: ManifestoAdvice[] = [];

  // Check each pledge and generate appropriate advice
  manifestoState.pledges.forEach((pledge) => {
    const progress = calculatePledgeProgress(pledge, gameState);

    // Warning for violated pledges
    if (pledge.violated && pledge.oneClickAvailable) {
      advice.push({
        type: 'warning',
        priority: 'high',
        title: `Manifesto pledge broken: ${pledge.description}`,
        message: `You have broken your manifesto pledge on "${pledge.description}". This has cost you ${Math.abs(pledge.breakCost_approval)} approval points and ${Math.abs(pledge.breakCost_pmTrust)} PM trust points. ${pledge.oneClickAvailable ? 'A one-click solution is available to restore this pledge.' : 'This pledge requires careful policy adjustments to restore.'}`,
        pledgeId: pledge.id,
        actionable: pledge.oneClickAvailable,
        action: pledge.oneClickAvailable
          ? {
              label: pledge.oneClickCost && pledge.oneClickCost > 0 ? `Allocate £${pledge.oneClickCost}bn` : 'Revert tax rates',
              oneClickAvailable: true,
              cost: pledge.oneClickCost,
            }
          : undefined,
      });
    }

    // Warning for pledges at risk (compliance type showing red)
    if (!pledge.violated && progress.statusColor === 'red' && pledge.progressType === 'compliance') {
      advice.push({
        type: 'warning',
        priority: 'high',
        title: `Manifesto pledge at risk: ${pledge.description}`,
        message: `Your current policies are violating your manifesto pledge on "${pledge.description}". You should revert these changes before the next fiscal assessment to avoid political damage.`,
        pledgeId: pledge.id,
        actionable: pledge.oneClickAvailable,
        action: pledge.oneClickAvailable
          ? {
              label: 'Revert to starting levels',
              oneClickAvailable: true,
            }
          : undefined,
      });
    }

    // Recommendations for achievement-type pledges with low progress
    if (
      pledge.progressType === 'achievement' &&
      progress.progress < 50 &&
      !pledge.violated &&
      pledge.oneClickAvailable
    ) {
      advice.push({
        type: 'recommendation',
        priority: progress.progress < 25 ? 'high' : 'medium',
        title: `Low progress on manifesto pledge: ${pledge.description}`,
        message: `You have made ${progress.progress}% progress towards "${pledge.description}". Consider allocating additional resources to demonstrate progress on this manifesto commitment.`,
        pledgeId: pledge.id,
        actionable: true,
        action: {
          label: `Allocate £${pledge.oneClickCost}bn`,
          oneClickAvailable: true,
          cost: pledge.oneClickCost,
        },
      });
    }

    // Progress updates for pledges doing well
    if (includeProgressUpdates && progress.statusColor === 'green' && !pledge.violated) {
      advice.push({
        type: 'progress-update',
        priority: 'low',
        title: `On track: ${pledge.description}`,
        message: `You are successfully keeping your manifesto pledge on "${pledge.description}". ${progress.status}.`,
        pledgeId: pledge.id,
        actionable: false,
      });
    }

    // Progress updates for achievement-type pledges with good progress
    if (
      includeProgressUpdates &&
      pledge.progressType === 'achievement' &&
      progress.progress >= 50 &&
      progress.progress < 100
    ) {
      advice.push({
        type: 'progress-update',
        priority: 'low',
        title: `Good progress: ${pledge.description}`,
        message: `You have achieved ${progress.progress}% of your manifesto pledge on "${pledge.description}". Keep up the good work.`,
        pledgeId: pledge.id,
        actionable: false,
      });
    }
  });

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  advice.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return advice;
}

/**
 * Generate trade-off analysis for a potential policy change
 */
export function generateTradeOffAnalysis(
  manifestoState: ManifestoState,
  policyChange: {
    description: string;
    revenueImpact?: number; // £bn
    spendingImpact?: number; // £bn
    approvalImpact?: number;
    economicImpact?: string;
  },
  violationCheck: PolicyViolationCheck
): ManifestoAdvice | null {
  if (violationCheck.violatedPledges.length === 0) {
    return null;
  }

  const pledgeDescriptions = violationCheck.violatedPledges
    .map((p) => `"${p.description}"`)
    .join(', ');

  const totalPoliticalCost = Math.abs(violationCheck.totalApprovalCost) + Math.abs(violationCheck.totalPmTrustCost);

  let tradeOffMessage = `${policyChange.description} would violate ${violationCheck.violatedPledges.length} manifesto pledge${violationCheck.violatedPledges.length > 1 ? 's' : ''}: ${pledgeDescriptions}.\n\n`;

  tradeOffMessage += `Political cost: ${Math.abs(violationCheck.totalApprovalCost)} approval points and ${Math.abs(violationCheck.totalPmTrustCost)} PM trust points.\n\n`;

  if (policyChange.revenueImpact) {
    tradeOffMessage += `Fiscal benefit: ${policyChange.revenueImpact > 0 ? '+' : ''}£${policyChange.revenueImpact}bn revenue.\n\n`;
  }

  if (policyChange.spendingImpact) {
    tradeOffMessage += `Spending impact: ${policyChange.spendingImpact > 0 ? '+' : ''}£${policyChange.spendingImpact}bn.\n\n`;
  }

  if (policyChange.economicImpact) {
    tradeOffMessage += `Economic impact: ${policyChange.economicImpact}\n\n`;
  }

  tradeOffMessage += `Consider whether the ${policyChange.revenueImpact || policyChange.spendingImpact ? 'fiscal' : 'policy'} benefits outweigh the significant political costs of breaking your manifesto commitments.`;

  return {
    type: 'trade-off',
    priority: 'high',
    title: `Trade-off analysis: ${policyChange.description}`,
    message: tradeOffMessage,
    actionable: false,
  };
}

/**
 * Generate a summary report of manifesto performance
 */
export function generateManifestoPerformanceReport(
  manifestoState: ManifestoState,
  gameState: {
    currentTaxRates: {
      incomeTaxBasic: number;
      incomeTaxHigher: number;
      incomeTaxAdditional: number;
      niEmployee: number;
      niEmployer: number;
      vat: number;
      corporationTax: number;
    };
    startingTaxRates: {
      incomeTaxBasic: number;
      incomeTaxHigher: number;
      incomeTaxAdditional: number;
      niEmployee: number;
      niEmployer: number;
      vat: number;
      corporationTax: number;
    };
    fiscalRuleMet?: boolean;
  }
): {
  totalPledges: number;
  keepingPledges: number;
  violatedPledges: number;
  atRiskPledges: number;
  overallScore: number; // 0-100
  summary: string;
} {
  const totalPledges = manifestoState.pledges.length;
  let keepingPledges = 0;
  let atRiskPledges = 0;

  manifestoState.pledges.forEach((pledge) => {
    if (pledge.violated) {
      return; // Already counted in violatedPledges
    }

    const progress = calculatePledgeProgress(pledge, gameState);

    if (progress.statusColor === 'green') {
      keepingPledges++;
    } else if (progress.statusColor === 'red' && pledge.progressType === 'compliance') {
      atRiskPledges++;
    } else if (progress.progress >= 50) {
      keepingPledges++;
    }
  });

  const violatedPledges = manifestoState.totalViolations;
  const overallScore = Math.round((keepingPledges / totalPledges) * 100);

  let summary = '';
  if (overallScore >= 80) {
    summary = `Excellent manifesto performance. You are keeping ${keepingPledges} out of ${totalPledges} pledges.`;
  } else if (overallScore >= 60) {
    summary = `Good manifesto performance, but there is room for improvement. You are keeping ${keepingPledges} out of ${totalPledges} pledges.`;
  } else if (overallScore >= 40) {
    summary = `Mixed manifesto performance. You have broken ${violatedPledges} pledge${violatedPledges !== 1 ? 's' : ''} and are only keeping ${keepingPledges} out of ${totalPledges}.`;
  } else {
    summary = `Poor manifesto performance. You have broken ${violatedPledges} pledge${violatedPledges !== 1 ? 's' : ''}, causing significant political damage.`;
  }

  if (atRiskPledges > 0) {
    summary += ` ${atRiskPledges} pledge${atRiskPledges !== 1 ? 's are' : ' is'} currently at risk of violation.`;
  }

  return {
    totalPledges,
    keepingPledges,
    violatedPledges,
    atRiskPledges,
    overallScore,
    summary,
  };
}

/**
 * Check if annual spending growth targets are being met.
 * Called at fiscal year end only (April).
 * @param manifesto Manifesto state containing pledges
 * @param fiscal Fiscal state with current and baseline spending
 * @param inflationCPI Current inflation rate
 * @returns List of pledges violated by insufficient annual growth
 */
export function checkAnnualGrowthPledges(
  manifesto: ManifestoState,
  fiscal: any,
  inflationCPI: number
): ManifestoPledge[] {
  const violatedPledges: ManifestoPledge[] = [];

  manifesto.pledges.forEach((pledge) => {
    // Skip pledges without annual growth tracking
    if (!pledge.requiredAnnualGrowth || !pledge.targetDepartment) {
      return;
    }

    const dept = pledge.targetDepartment as 'nhs' | 'education' | 'defence';
    const startSpending = fiscal.fiscalYearStartSpending?.[dept];
    const endSpending = fiscal.spending?.[dept];

    if (
      typeof startSpending !== 'number' ||
      typeof endSpending !== 'number' ||
      !Number.isFinite(startSpending) ||
      !Number.isFinite(endSpending) ||
      startSpending <= 0
    ) {
      return;
    }

    // Calculate real growth over the fiscal year
    const nominalGrowth = ((endSpending - startSpending) / startSpending) * 100;
    const realGrowth = nominalGrowth - inflationCPI;

    // Check if growth target was met
    if (realGrowth < pledge.requiredAnnualGrowth - 0.1) {  // Allow 0.1% tolerance
      violatedPledges.push(pledge);
    }
  });

  return violatedPledges;
}

export default {
  getRandomManifesto,
  getManifestoById,
  initializeManifestoState,
  checkPolicyForViolations,
  applyManifestoViolations,
  executeOneClickAction,
  calculatePledgeProgress,
  generateManifestoAdvice,
  generateTradeOffAnalysis,
  generateManifestoPerformanceReport,
  MANIFESTO_TEMPLATES,
};
