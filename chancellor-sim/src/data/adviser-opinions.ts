
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
    }
];
