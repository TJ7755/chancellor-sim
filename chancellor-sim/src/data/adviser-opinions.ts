
// Adviser Opinions Data Structure

import { AdviserType, OpinionSeverity, PolicyArea } from '../adviser-system';

export interface AdviserOpinionTemplate {
    id: string;
    adviserType: AdviserType;
    trigger: {
        metric: 'deficit' | 'debt' | 'growth' | 'inflation' | 'unemployment' | 'approval' | 'nhsQuality' | 'giltYield' | 'fiscalRules' | 'taxChange' | 'spendingChange';
        operator: '>' | '<';
        value: number; // For boolean checks like fiscalRules, 1=true, 0=false
    };
    category: PolicyArea;
    itemType: 'analysis' | 'warning' | 'recommendation';

    // For analysis/warning
    severity?: OpinionSeverity;

    // For recommendations
    priority?: 'immediate' | 'important' | 'consider';

    title: string;
    description: string;
    // Specific fields
    consequences?: string; // For warnings
    recommendationAction?: string; // For recommendations
    recommendationRationale?: string; // For recommendations
    // For randomization
    variations?: { title?: string[]; description?: string[]; }[];
}

export const ADVISER_OPINIONS: AdviserOpinionTemplate[] = [
    // ===========================================================================
    // TREASURY MANDARIN (Sir Humphrey)
    // ===========================================================================
    // Deficit > 2.5%
    {
        id: 'mandarin_deficit_warning',
        adviserType: 'treasury_mandarin',
        trigger: { metric: 'deficit', operator: '>', value: 2.5 },
        category: 'deficit',
        itemType: 'analysis',
        severity: 'warning',
        title: 'Fiscal Position Assessment',
        description: 'The current deficit exceeds prudent levels. Treasury guidance suggests maintaining deficits below 2.5% in normal economic conditions.'
    },
    {
        id: 'mandarin_deficit_alert',
        adviserType: 'treasury_mandarin',
        trigger: { metric: 'deficit', operator: '>', value: 4.0 },
        category: 'deficit',
        itemType: 'warning',
        severity: 'critical',
        title: 'Urgent: Fiscal Consolidation Required',
        description: 'The deficit is now well above prudent peacetime norms and risks eroding confidence in the fiscal anchor.',
        consequences: 'Without consolidation: credit rating downgrades, rising gilt yields, increased debt service costs.'
    },
    // Institutional Credibility
    {
        id: 'mandarin_credibility_risk',
        adviserType: 'treasury_mandarin',
        trigger: { metric: 'giltYield', operator: '>', value: 4.2 },
        category: 'deficit',
        itemType: 'warning',
        severity: 'critical',
        title: 'Institutional Credibility At Risk',
        description: 'The OBR and markets are losing faith in our fiscal framework. Random policy announcements are damaging our reputation for stability.',
        consequences: 'A loss of credibility takes years to recover. We risk a structural increase in borrowing costs.'
    },
    // Civil Service Morale (Proxy for Spending Cuts)
    {
        id: 'mandarin_service_cuts',
        adviserType: 'treasury_mandarin',
        trigger: { metric: 'spendingChange', operator: '<', value: -5 },
        category: 'services',
        itemType: 'analysis',
        severity: 'caution',
        title: 'Departmental Capacity',
        description: 'Further cuts to departmental budgets will degrade operational capacity. We are approaching the point where statutory duties cannot be met.'
    },

    // ===========================================================================
    // FISCAL HAWK (Lord Braithwaite)
    // ===========================================================================
    // Inflation > 4%
    {
        id: 'hawk_inflation_warning',
        adviserType: 'fiscal_hawk',
        trigger: { metric: 'inflation', operator: '>', value: 4.0 },
        category: 'growth',
        itemType: 'warning',
        severity: 'critical',
        title: 'Inflationary Spiral Risk',
        description: 'Inflation expectations are becoming unanchored. We must tighten fiscal policy to support the Bank of England.',
        consequences: 'Wage-price spiral, currency depreciation, and long-term economic scarring.'
    },
    {
        id: 'hawk_supply_side',
        adviserType: 'fiscal_hawk',
        trigger: { metric: 'growth', operator: '<', value: 1.0 },
        category: 'growth',
        itemType: 'recommendation',
        priority: 'important',
        title: 'Supply-Side Reform',
        description: '',
        recommendationAction: 'Cut corporate taxes and deregulate labour markets',
        recommendationRationale: 'Growth is stagnant because we are strangling business. Unleash the private sector.'
    },
    // Debt > 100%
    {
        id: 'hawk_debt_critical',
        adviserType: 'fiscal_hawk',
        trigger: { metric: 'debt', operator: '>', value: 100 },
        category: 'debt',
        itemType: 'warning',
        severity: 'critical',
        title: 'Sovereign Debt Crisis Imminent',
        description: 'Debt exceeding 100% of GDP is a psychological barrier for markets. We look like Italy without the sunshine.',
        consequences: 'Total loss of market access. IMF bailout program.'
    },

    // ===========================================================================
    // POLITICAL OPERATOR (Sarah Chen)
    // ===========================================================================
    // Approval < 40% (Red Wall)
    {
        id: 'pol_red_wall_panic',
        adviserType: 'political_operator',
        trigger: { metric: 'approval', operator: '<', value: 40 },
        category: 'political',
        itemType: 'warning',
        severity: 'critical',
        title: 'Red Wall Collapse',
        description: 'Our focus groups in the North are brutal. They think we don\'t care. We are hemorrhaging support to Reform and Labour.',
        consequences: 'Projected loose of 40+ seats in the Midlands and North.'
    },
    // Approval > 55% (Complacency)
    {
        id: 'pol_complacency_check',
        adviserType: 'political_operator',
        trigger: { metric: 'approval', operator: '>', value: 55 },
        category: 'political',
        itemType: 'analysis',
        severity: 'supportive',
        title: 'Electoral Dominance',
        description: 'We are polling at landslide levels. This gives us political capital to spend on difficult reforms. Don\'t waste it.',
    },
    // Tax Rises (Middle Class)
    {
        id: 'pol_tax_middle_class',
        adviserType: 'political_operator',
        trigger: { metric: 'taxChange', operator: '>', value: 2 }, // Net tax rise
        category: 'taxation',
        itemType: 'warning',
        severity: 'warning',
        title: 'Middle Class Revolt',
        description: 'The commuter belt is furious about the tax burden. We are creating a new generation of tax-hating voters.',
        consequences: 'Traditional Tory shires becoming marginal swing seats.'
    },

    // ===========================================================================
    // SOCIAL DEMOCRAT (Rebecca Thornton)
    // ===========================================================================

    // Green Investment
    {
        id: 'soc_green_investment',
        adviserType: 'social_democrat',
        trigger: { metric: 'growth', operator: '<', value: 1.5 },
        category: 'growth',
        itemType: 'recommendation',
        priority: 'important',
        title: 'Green New Deal',
        description: '',
        recommendationAction: 'Massive investment in renewable energy and insulation',
        recommendationRationale: 'Solves three problems: growth, energy bills, and climate targets. It is a no-brainer.'
    },
    // NHS Crisis
    {
        id: 'soc_nhs_emergency',
        adviserType: 'social_democrat',
        trigger: { metric: 'nhsQuality', operator: '<', value: 45 },
        category: 'services',
        itemType: 'warning',
        severity: 'critical',
        title: 'Humanitarian Crisis in NHS',
        description: 'Doctors are reporting conditions worse than war zones. People are dying on trolleys. Whatever the cost, we must fix this.',
        consequences: 'Mass casualty events, complete loss of moral authority.'
    },

    // ===========================================================================
    // HETERODOX ECONOMIST (Dr Okonkwo)
    // ===========================================================================
    // Real Resources
    {
        id: 'hetero_real_resources',
        adviserType: 'heterodox_economist',
        trigger: { metric: 'inflation', operator: '<', value: 2.0 },
        category: 'growth',
        itemType: 'analysis',
        severity: 'caution',
        title: 'Slack in the Economy',
        description: 'We have unemployed workers and idle factories. The deficit is irrelevant; the constraints are real resources, and we have plenty spare.'
    },
    // Private Debt
    {
        id: 'hetero_private_debt',
        adviserType: 'heterodox_economist',
        trigger: { metric: 'deficit', operator: '<', value: 1.0 },
        category: 'debt',
        itemType: 'warning',
        severity: 'warning',
        title: 'Private Sector Fragility',
        description: 'By running a government surplus, you are forcing the private sector into deficit. Household debt is becoming unsustainable.',
        consequences: 'Household insolvency crisis and banking instability.'
    },
    // Wellbeing
    {
        id: 'hetero_wellbeing',
        adviserType: 'heterodox_economist',
        trigger: { metric: 'growth', operator: '>', value: 3.0 }, // High growth
        category: 'growth',
        itemType: 'analysis',
        severity: 'neutral',
        title: 'Quality of Growth',
        description: 'GDP is up, but is life getting better? We should measure wellbeing, not just output. Pollution and stress are also rising.'
    },

    // ===========================================================================
    // TECHNOCRATIC CENTRIST (James Ashworth)
    // ===========================================================================
    // Productivity
    {
        id: 'centrist_productivity_puzzle',
        adviserType: 'technocratic_centrist',
        trigger: { metric: 'growth', operator: '<', value: 1.5 },
        category: 'growth',
        itemType: 'analysis',
        severity: 'caution',
        title: 'The Productivity Puzzle',
        description: 'UK productivity has flatlined since 2008. We need to fix the planning system and boost R&D tax credits.'
    },
    // Skills
    {
        id: 'centrist_skills_gap',
        adviserType: 'technocratic_centrist',
        trigger: { metric: 'unemployment', operator: '>', value: 5.0 }, // Fictional metric trigger
        category: 'growth',
        itemType: 'recommendation',
        priority: 'important',
        title: 'Skills Revolution',
        description: '',
        recommendationAction: 'Devolve skills funding to Metro Mayors and reform apprenticeships',
        recommendationRationale: 'Employers cannot find the staff they need despite unemployment. The skills system is mismatched.'
    },
    // Efficiency
    {
        id: 'centrist_efficiency',
        adviserType: 'technocratic_centrist',
        trigger: { metric: 'deficit', operator: '>', value: 3.0 },
        category: 'deficit',
        itemType: 'recommendation',
        priority: 'consider',
        title: 'Public Sector Reform',
        description: '',
        recommendationAction: 'Digital transformation of public services',
        recommendationRationale: 'We can save billions by modernising legacy IT systems rather than just cutting headcount.'
    },

    // ===========================================================================
    // ADDITIONAL TREASURY MANDARIN (Sir Humphrey)
    // ===========================================================================
    {
        id: 'mandarin_growth_caution',
        adviserType: 'treasury_mandarin',
        trigger: { metric: 'growth', operator: '>', value: 4.0 },
        category: 'growth',
        itemType: 'analysis',
        severity: 'caution',
        title: 'Overheating Concerns',
        description: 'While current growth is impressive, we must be wary of "overheating". Rapid expansion often precedes a structural correction.'
    },
    {
        id: 'mandarin_pension_liability',
        adviserType: 'treasury_mandarin',
        trigger: { metric: 'debt', operator: '>', value: 90 },
        category: 'debt',
        itemType: 'warning',
        severity: 'warning',
        title: 'Unfunded Liabilities Assessment',
        description: 'Our long-term fiscal gap is widening. The triple lock and demographic shifts are creating an unsustainable pension liability profile.'
    },
    {
        id: 'mandarin_gilt_saturation',
        adviserType: 'treasury_mandarin',
        trigger: { metric: 'deficit', operator: '>', value: 5.0 },
        category: 'deficit',
        itemType: 'warning',
        severity: 'critical',
        title: 'Gilt Market Saturation',
        description: 'The market is struggling to absorb the current volume of Gilt issuance. Reconciling the borrowing requirement is becoming operationally difficult.'
    },

    // ===========================================================================
    // ADDITIONAL FISCAL HAWK (Lord Braithwaite)
    // ===========================================================================
    {
        id: 'hawk_welfare_dependency',
        adviserType: 'fiscal_hawk',
        trigger: { metric: 'unemployment', operator: '>', value: 6.0 },
        category: 'services',
        itemType: 'recommendation',
        priority: 'important',
        title: 'Benefit Reform Urgency',
        description: 'The rising cost of workless households is a fiscal timebomb. We need stricter conditionality to boost labour participation.',
        recommendationAction: 'Implement stricter job-seeking requirements and cap total household benefits.'
    },
    {
        id: 'hawk_market_discipline',
        adviserType: 'fiscal_hawk',
        trigger: { metric: 'giltYield', operator: '>', value: 4.5 },
        category: 'deficit',
        itemType: 'warning',
        severity: 'critical',
        title: 'Market Discipline Imposed',
        description: 'The "bond vigilantes" are not just a theory; they are here. The market is effectively demanding a fiscal U-turn.',
        consequences: 'Failure to signal a return to sound money will lead to a full-blown currency crisis.'
    },
    {
        id: 'hawk_corporate_tax_cap',
        adviserType: 'fiscal_hawk',
        trigger: { metric: 'taxChange', operator: '>', value: 1.0 },
        category: 'taxation',
        itemType: 'warning',
        severity: 'warning',
        title: 'Capital Flight Risk',
        description: 'Raising corporate levies in a globalised economy is self-defeating. We are already seeing investment diverted to more competitive jurisdictions.'
    },

    // ===========================================================================
    // ADDITIONAL POLITICAL OPERATOR (Sarah Chen)
    // ===========================================================================
    {
        id: 'pol_pensioner_anger',
        adviserType: 'political_operator',
        trigger: { metric: 'spendingChange', operator: '<', value: -2 },
        category: 'political',
        itemType: 'warning',
        severity: 'warning',
        title: 'Grey Vote Volatility',
        description: 'Our internal polling suggests massive pushback among over-65s. They feel they are being asked to pay for everyone else\'s failures.'
    },
    {
        id: 'pol_manifesto_risk',
        adviserType: 'political_operator',
        trigger: { metric: 'taxChange', operator: '>', value: 3 },
        category: 'political',
        itemType: 'analysis',
        severity: 'critical',
        title: 'Trust Deficit Widening',
        description: 'Voters don\'t care about the OBR; they care about their pay checks. We are breaking the "tax lock" and they won\'t forget it.'
    },
    {
        id: 'pol_opposition_momentum',
        adviserType: 'political_operator',
        trigger: { metric: 'approval', operator: '<', value: 30 },
        category: 'political',
        itemType: 'warning',
        severity: 'critical',
        title: 'Opposition Surge',
        description: 'The opposition is now leading by 20 points in the polls. Every move you make is being successfully framed as either incompetent or cruel.'
    },

    // ===========================================================================
    // ADDITIONAL SOCIAL DEMOCRAT (Rebecca Thornton)
    // ===========================================================================
    {
        id: 'soc_child_poverty',
        adviserType: 'social_democrat',
        trigger: { metric: 'inflation', operator: '>', value: 6.0 },
        category: 'services',
        itemType: 'warning',
        severity: 'warning',
        title: 'Child Poverty Crisis',
        description: 'Food bank use among families with children has doubled. We cannot call ourselves a civilised nation if we allow this to continue.'
    },
    {
        id: 'soc_local_gov_collapse',
        adviserType: 'social_democrat',
        trigger: { metric: 'spendingChange', operator: '<', value: -4 },
        category: 'services',
        itemType: 'analysis',
        severity: 'critical',
        title: 'Local Government Bankruptcy',
        description: 'Section 114 notices are becoming common. Councils are cutting basic services like libraries and youth centers just to stay afloat.'
    },
    {
        id: 'soc_wealth_tax_recommendation',
        adviserType: 'social_democrat',
        trigger: { metric: 'deficit', operator: '>', value: 4.0 },
        category: 'taxation',
        itemType: 'recommendation',
        priority: 'consider',
        title: 'Equitable Revenue Generation',
        description: 'Targeted levies on unearned wealth and property could plug the fiscal hole without hurting the most vulnerable.',
        recommendationAction: 'Introduce a temporary wealth tax on assets over £10m.'
    },

    // ===========================================================================
    // ADDITIONAL HETERODOX ECONOMIST (Dr Okonkwo)
    // ===========================================================================
    {
        id: 'hetero_trade_assessment',
        adviserType: 'heterodox_economist',
        trigger: { metric: 'growth', operator: '<', value: 1.0 },
        category: 'growth',
        itemType: 'analysis',
        severity: 'neutral',
        title: 'The Real Deficit is Trade',
        description: 'Focusing on the fiscal deficit is a distraction. Our structural current account deficit is the real threat to long-term prosperity.'
    },
    {
        id: 'hetero_inflation_diagnosis',
        adviserType: 'heterodox_economist',
        trigger: { metric: 'inflation', operator: '>', value: 8.0 },
        category: 'growth',
        itemType: 'analysis',
        severity: 'caution',
        title: 'Supply-Side Inflation',
        description: 'This is not an "overheating" problem. It\'s a supply chain and energy price problem. Raising rates or cutting spend won\'t fix it.'
    },
    {
        id: 'hetero_job_guarantee',
        adviserType: 'heterodox_economist',
        trigger: { metric: 'unemployment', operator: '>', value: 7.0 },
        category: 'services',
        itemType: 'recommendation',
        priority: 'important',
        title: 'Universal Job Guarantee',
        description: 'Unemployment is a policy choice. We should provide a public option for employment to anchor the labor market.',
        recommendationAction: 'Fund a national Green Jobs Corps.'
    },

    // ===========================================================================
    // ADDITIONAL TECHNOCRATIC CENTRIST (James Ashworth)
    // ===========================================================================
    {
        id: 'centrist_regulatory_reform',
        adviserType: 'technocratic_centrist',
        trigger: { metric: 'growth', operator: '<', value: 2.0 },
        category: 'growth',
        itemType: 'recommendation',
        priority: 'important',
        title: 'Regulatory Clearing House',
        description: 'Regulatory overlap is costing businesses 2% of turnover. We need a systematic review of post-Brexit compliance costs.',
        recommendationAction: 'Establish an independent Regulatory Oversight Body.'
    },
    {
        id: 'centrist_pension_pulp',
        adviserType: 'technocratic_centrist',
        trigger: { metric: 'debt', operator: '>', value: 100 },
        category: 'debt',
        itemType: 'analysis',
        severity: 'warning',
        title: 'Long-term Demographic Headwinds',
        description: 'The dependency ratio is shifting rapidly. Without significant productivity gains from AI, the current welfare state is mathematically impossible.'
    },
    {
        id: 'centrist_rd_credits',
        adviserType: 'technocratic_centrist',
        trigger: { metric: 'growth', operator: '>', value: 0 },
        category: 'growth',
        itemType: 'recommendation',
        priority: 'consider',
        title: 'R&D Tax Credit Reform',
        description: 'Current credits are too easy to game. We should pivot towards direct grants for deep-tech innovation.',
        recommendationAction: 'Modernise the R&D tax credit eligibility criteria.'
    }
];

