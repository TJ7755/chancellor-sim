// Adviser Opinions Data Structure

import { AdviserType, OpinionSeverity, PolicyArea } from '../adviser-system';

export interface AdviserOpinionTemplate {
  id: string;
  adviserType: AdviserType;
  trigger: {
    metric:
      | 'deficit'
      | 'debt'
      | 'growth'
      | 'inflation'
      | 'unemployment'
      | 'approval'
      | 'nhsQuality'
      | 'giltYield'
      | 'fiscalRules'
      | 'taxChange'
      | 'spendingChange';
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
  variations?: { title?: string[]; description?: string[] }[];
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
    description:
      'The current deficit exceeds prudent levels. Treasury guidance suggests maintaining deficits below 2.5% in normal economic conditions.',
  },
  {
    id: 'mandarin_deficit_alert',
    adviserType: 'treasury_mandarin',
    trigger: { metric: 'deficit', operator: '>', value: 4.0 },
    category: 'deficit',
    itemType: 'warning',
    severity: 'critical',
    title: 'Urgent: Fiscal Consolidation Required',
    description:
      'The deficit is now well above prudent peacetime norms and risks eroding confidence in the fiscal anchor.',
    consequences: 'Without consolidation: credit rating downgrades, rising gilt yields, increased debt service costs.',
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
    description:
      'The OBR and markets are losing faith in our fiscal framework. Random policy announcements are damaging our reputation for stability.',
    consequences: 'A loss of credibility takes years to recover. We risk a structural increase in borrowing costs.',
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
    description:
      'Further cuts to departmental budgets will degrade operational capacity. We are approaching the point where statutory duties cannot be met.',
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
    description:
      'Inflation expectations are becoming unanchored. We must tighten fiscal policy to support the Bank of England.',
    consequences: 'Wage-price spiral, currency depreciation, and long-term economic scarring.',
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
    recommendationRationale: 'Growth is stagnant because we are strangling business. Unleash the private sector.',
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
    description:
      'Debt exceeding 100% of GDP is a psychological barrier for markets. We look like Italy without the sunshine.',
    consequences: 'Total loss of market access. IMF bailout program.',
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
    description:
      "Our focus groups in the North are brutal. They think we don't care. We are hemorrhaging support to Reform and Labour.",
    consequences: 'Projected loose of 40+ seats in the Midlands and North.',
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
    description:
      "We are polling at landslide levels. This gives us political capital to spend on difficult reforms. Don't waste it.",
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
    description:
      'The commuter belt is furious about the tax burden. We are creating a new generation of tax-hating voters.',
    consequences: 'Traditional Tory shires becoming marginal swing seats.',
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
    recommendationRationale: 'Solves three problems: growth, energy bills, and climate targets. It is a no-brainer.',
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
    description:
      'Doctors are reporting conditions worse than war zones. People are dying on trolleys. Whatever the cost, we must fix this.',
    consequences: 'Mass casualty events, complete loss of moral authority.',
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
    description:
      'We have unemployed workers and idle factories. The deficit is irrelevant; the constraints are real resources, and we have plenty spare.',
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
    description:
      'By running a government surplus, you are forcing the private sector into deficit. Household debt is becoming unsustainable.',
    consequences: 'Household insolvency crisis and banking instability.',
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
    description:
      'GDP is up, but is life getting better? We should measure wellbeing, not just output. Pollution and stress are also rising.',
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
    description:
      'UK productivity has flatlined since 2008. We need to fix the planning system and boost R&D tax credits.',
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
    recommendationRationale:
      'Employers cannot find the staff they need despite unemployment. The skills system is mismatched.',
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
    recommendationRationale:
      'We can save billions by modernising legacy IT systems rather than just cutting headcount.',
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
    description:
      'While current growth is impressive, we must be wary of "overheating". Rapid expansion often precedes a structural correction.',
  },
  {
    id: 'mandarin_pension_liability',
    adviserType: 'treasury_mandarin',
    trigger: { metric: 'debt', operator: '>', value: 90 },
    category: 'debt',
    itemType: 'warning',
    severity: 'warning',
    title: 'Unfunded Liabilities Assessment',
    description:
      'Our long-term fiscal gap is widening. The triple lock and demographic shifts are creating an unsustainable pension liability profile.',
  },
  {
    id: 'mandarin_gilt_saturation',
    adviserType: 'treasury_mandarin',
    trigger: { metric: 'deficit', operator: '>', value: 5.0 },
    category: 'deficit',
    itemType: 'warning',
    severity: 'critical',
    title: 'Gilt Market Saturation',
    description:
      'The market is struggling to absorb the current volume of Gilt issuance. Reconciling the borrowing requirement is becoming operationally difficult.',
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
    description:
      'The rising cost of workless households is a fiscal timebomb. We need stricter conditionality to boost labour participation.',
    recommendationAction: 'Implement stricter job-seeking requirements and cap total household benefits.',
  },
  {
    id: 'hawk_market_discipline',
    adviserType: 'fiscal_hawk',
    trigger: { metric: 'giltYield', operator: '>', value: 4.5 },
    category: 'deficit',
    itemType: 'warning',
    severity: 'critical',
    title: 'Market Discipline Imposed',
    description:
      'The "bond vigilantes" are not just a theory; they are here. The market is effectively demanding a fiscal U-turn.',
    consequences: 'Failure to signal a return to sound money will lead to a full-blown currency crisis.',
  },
  {
    id: 'hawk_corporate_tax_cap',
    adviserType: 'fiscal_hawk',
    trigger: { metric: 'taxChange', operator: '>', value: 1.0 },
    category: 'taxation',
    itemType: 'warning',
    severity: 'warning',
    title: 'Capital Flight Risk',
    description:
      'Raising corporate levies in a globalised economy is self-defeating. We are already seeing investment diverted to more competitive jurisdictions.',
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
    description:
      "Our internal polling suggests massive pushback among over-65s. They feel they are being asked to pay for everyone else's failures.",
  },
  {
    id: 'pol_manifesto_risk',
    adviserType: 'political_operator',
    trigger: { metric: 'taxChange', operator: '>', value: 3 },
    category: 'political',
    itemType: 'analysis',
    severity: 'critical',
    title: 'Trust Deficit Widening',
    description:
      'Voters don\'t care about the OBR; they care about their pay checks. We are breaking the "tax lock" and they won\'t forget it.',
  },
  {
    id: 'pol_opposition_momentum',
    adviserType: 'political_operator',
    trigger: { metric: 'approval', operator: '<', value: 30 },
    category: 'political',
    itemType: 'warning',
    severity: 'critical',
    title: 'Opposition Surge',
    description:
      'The opposition is now leading by 20 points in the polls. Every move you make is being successfully framed as either incompetent or cruel.',
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
    description:
      'Food bank use among families with children has doubled. We cannot call ourselves a civilised nation if we allow this to continue.',
  },
  {
    id: 'soc_local_gov_collapse',
    adviserType: 'social_democrat',
    trigger: { metric: 'spendingChange', operator: '<', value: -4 },
    category: 'services',
    itemType: 'analysis',
    severity: 'critical',
    title: 'Local Government Bankruptcy',
    description:
      'Section 114 notices are becoming common. Councils are cutting basic services like libraries and youth centers just to stay afloat.',
  },
  {
    id: 'soc_wealth_tax_recommendation',
    adviserType: 'social_democrat',
    trigger: { metric: 'deficit', operator: '>', value: 4.0 },
    category: 'taxation',
    itemType: 'recommendation',
    priority: 'consider',
    title: 'Equitable Revenue Generation',
    description:
      'Targeted levies on unearned wealth and property could plug the fiscal hole without hurting the most vulnerable.',
    recommendationAction: 'Introduce a temporary wealth tax on assets over £10m.',
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
    description:
      'Focusing on the fiscal deficit is a distraction. Our structural current account deficit is the real threat to long-term prosperity.',
  },
  {
    id: 'hetero_inflation_diagnosis',
    adviserType: 'heterodox_economist',
    trigger: { metric: 'inflation', operator: '>', value: 8.0 },
    category: 'growth',
    itemType: 'analysis',
    severity: 'caution',
    title: 'Supply-Side Inflation',
    description:
      'This is not an "overheating" problem. It\'s a supply chain and energy price problem. Raising rates or cutting spend won\'t fix it.',
  },
  {
    id: 'hetero_job_guarantee',
    adviserType: 'heterodox_economist',
    trigger: { metric: 'unemployment', operator: '>', value: 7.0 },
    category: 'services',
    itemType: 'recommendation',
    priority: 'important',
    title: 'Universal Job Guarantee',
    description:
      'Unemployment is a policy choice. We should provide a public option for employment to anchor the labor market.',
    recommendationAction: 'Fund a national Green Jobs Corps.',
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
    description:
      'Regulatory overlap is costing businesses 2% of turnover. We need a systematic review of post-Brexit compliance costs.',
    recommendationAction: 'Establish an independent Regulatory Oversight Body.',
  },
  {
    id: 'centrist_pension_pulp',
    adviserType: 'technocratic_centrist',
    trigger: { metric: 'debt', operator: '>', value: 100 },
    category: 'debt',
    itemType: 'analysis',
    severity: 'warning',
    title: 'Long-term Demographic Headwinds',
    description:
      'The dependency ratio is shifting rapidly. Without significant productivity gains from AI, the current welfare state is mathematically impossible.',
  },
  {
    id: 'centrist_rd_credits',
    adviserType: 'technocratic_centrist',
    trigger: { metric: 'growth', operator: '>', value: 0 },
    category: 'growth',
    itemType: 'recommendation',
    priority: 'consider',
    title: 'R&D Tax Credit Reform',
    description:
      'Current credits are too easy to game. We should pivot towards direct grants for deep-tech innovation.',
    recommendationAction: 'Modernise the R&D tax credit eligibility criteria.',
  },

  // ===========================================================================
  // NEW: LOW LOYALTY WARNINGS
  // ===========================================================================

  // Treasury Mandarin — Low Loyalty
  {
    id: 'mandarin_low_loyalty',
    adviserType: 'treasury_mandarin',
    trigger: { metric: 'approval', operator: '>', value: 0 },
    category: 'political',
    itemType: 'warning',
    severity: 'warning',
    title: 'Adviser Confidence Waning',
    description: 'Sir Humphrey is becoming increasingly uneasy about the direction of fiscal policy. His confidence in the current strategy is eroding.',
  },

  // Political Operator — Low Loyalty
  {
    id: 'pol_low_loyalty',
    adviserType: 'political_operator',
    trigger: { metric: 'approval', operator: '>', value: 0 },
    category: 'political',
    itemType: 'warning',
    severity: 'warning',
    title: 'Chen Losing Faith',
    description: 'Sarah Chen is signalling that she no longer believes the current approach is politically sustainable.',
  },

  // Heterodox Economist — Low Loyalty
  {
    id: 'hetero_low_loyalty',
    adviserType: 'heterodox_economist',
    trigger: { metric: 'approval', operator: '>', value: 0 },
    category: 'political',
    itemType: 'warning',
    severity: 'warning',
    title: 'Okonkwo Growing Frustrated',
    description: 'Dr Okonkwo has expressed frustration that her analysis is not being reflected in policy decisions.',
  },

  // Fiscal Hawk — Low Loyalty
  {
    id: 'hawk_low_loyalty',
    adviserType: 'fiscal_hawk',
    trigger: { metric: 'approval', operator: '>', value: 0 },
    category: 'political',
    itemType: 'warning',
    severity: 'warning',
    title: 'Braithwaite Deeply Concerned',
    description: 'Lord Braithwaite has privately indicated that he finds the current fiscal trajectory alarming.',
  },

  // Social Democrat — Low Loyalty
  {
    id: 'soc_low_loyalty',
    adviserType: 'social_democrat',
    trigger: { metric: 'approval', operator: '>', value: 0 },
    category: 'political',
    itemType: 'warning',
    severity: 'warning',
    title: 'Thornton Losing Patience',
    description: 'Rebecca Thornton is increasingly vocal about her concerns that social priorities are being sidelined.',
  },

  // Technocratic Centrist — Low Loyalty
  {
    id: 'centrist_low_loyalty',
    adviserType: 'technocratic_centrist',
    trigger: { metric: 'approval', operator: '>', value: 0 },
    category: 'political',
    itemType: 'warning',
    severity: 'warning',
    title: 'Ashworth Questioning Role',
    description: 'James Ashworth has hinted that he is not sure his advice is having the intended effect.',
  },

  // ===========================================================================
  // NEW: ACTIVE SYNERGY DETECTED
  // ===========================================================================

  // Treasury Mandarin — Synergy (Institutional Orthodoxy)
  {
    id: 'mandarin_synergy_orthodoxy',
    adviserType: 'treasury_mandarin',
    trigger: { metric: 'growth', operator: '>', value: -10 },
    category: 'growth',
    itemType: 'analysis',
    severity: 'supportive',
    title: 'Reinforced Fiscal Discipline',
    description: 'Working alongside Lord Braithwaite, the combined effect on market credibility is significant. The orthodoxy we represent is reassuring investors.',
  },

  // Fiscal Hawk — Synergy (Institutional Orthodoxy)
  {
    id: 'hawk_synergy_orthodoxy',
    adviserType: 'fiscal_hawk',
    trigger: { metric: 'growth', operator: '>', value: -10 },
    category: 'growth',
    itemType: 'analysis',
    severity: 'supportive',
    title: 'Credibility Reinforced',
    description: 'Sir Humphrey and I are aligned on the fundamentals. The market is responding to our joint emphasis on discipline.',
  },

  // Political Operator — Synergy (Electoral Coalition)
  {
    id: 'pol_synergy_coalition',
    adviserType: 'political_operator',
    trigger: { metric: 'growth', operator: '>', value: -10 },
    category: 'political',
    itemType: 'analysis',
    severity: 'supportive',
    title: 'Coalition Management Working',
    description: 'Rebecca and I are covering both the policy and political bases. The coalition is holding together better than expected.',
  },

  // Social Democrat — Synergy (Electoral Coalition)
  {
    id: 'soc_synergy_coalition',
    adviserType: 'social_democrat',
    trigger: { metric: 'growth', operator: '>', value: -10 },
    category: 'political',
    itemType: 'analysis',
    severity: 'supportive',
    title: 'Coalition Voices Heard',
    description: 'Sarah and I are ensuring that the electoral coalition is not taken for granted. The messaging is landing.',
  },

  // Treasury Mandarin — Synergy (Economic Council)
  {
    id: 'mandarin_synergy_council',
    adviserType: 'treasury_mandarin',
    trigger: { metric: 'growth', operator: '>', value: -10 },
    category: 'growth',
    itemType: 'analysis',
    severity: 'supportive',
    title: 'Balanced Economic Advice',
    description: 'The three-way economic advisory arrangement is producing more nuanced analysis than any of us could generate alone.',
  },

  // Heterodox Economist — Synergy (Economic Council)
  {
    id: 'hetero_synergy_council',
    adviserType: 'heterodox_economist',
    trigger: { metric: 'growth', operator: '>', value: -10 },
    category: 'growth',
    itemType: 'analysis',
    severity: 'supportive',
    title: 'Emergent Economic Insight',
    description: 'The combination of orthodox and heterodox perspectives in this team is generating genuinely useful policy synthesis.',
  },

  // Technocratic Centrist — Synergy (Economic Council)
  {
    id: 'centrist_synergy_council',
    adviserType: 'technocratic_centrist',
    trigger: { metric: 'growth', operator: '>', value: -10 },
    category: 'growth',
    itemType: 'analysis',
    severity: 'supportive',
    title: 'Synthesis Working Well',
    description: 'The economic council dynamic is producing better-informed decisions. The balance of perspectives is valuable.',
  },

  // ===========================================================================
  // NEW: CONFLICT AFTERMATH
  // ===========================================================================

  // Treasury Mandarin — Lost Conflict
  {
    id: 'mandarin_conflict_loss',
    adviserType: 'treasury_mandarin',
    trigger: { metric: 'approval', operator: '>', value: 0 },
    category: 'political',
    itemType: 'warning',
    severity: 'warning',
    title: 'Institutional Voice Overruled',
    description: 'Sir Humphrey has noted with concern that his institutional perspective was not preferred in the recent policy debate.',
  },

  // Political Operator — Lost Conflict
  {
    id: 'pol_conflict_loss',
    adviserType: 'political_operator',
    trigger: { metric: 'approval', operator: '>', value: 0 },
    category: 'political',
    itemType: 'warning',
    severity: 'warning',
    title: 'Political Reality Ignored',
    description: 'Sarah Chen is frustrated that the political realities she identified were not given sufficient weight.',
  },

  // Fiscal Hawk — Lost Conflict
  {
    id: 'hawk_conflict_loss',
    adviserType: 'fiscal_hawk',
    trigger: { metric: 'approval', operator: '>', value: 0 },
    category: 'political',
    itemType: 'warning',
    severity: 'warning',
    title: 'Market Warning Dismissed',
    description: 'Lord Braithwaite has expressed deep disappointment that his market-focused concerns were set aside.',
  },

  // Heterodox Economist — Lost Conflict
  {
    id: 'hetero_conflict_loss',
    adviserType: 'heterodox_economist',
    trigger: { metric: 'approval', operator: '>', value: 0 },
    category: 'political',
    itemType: 'warning',
    severity: 'warning',
    title: 'Unorthodox Analysis Rejected',
    description: 'Dr Okonkwo is disappointed that her alternative economic analysis was not given serious consideration.',
  },

  // Social Democrat — Lost Conflict
  {
    id: 'soc_conflict_loss',
    adviserType: 'social_democrat',
    trigger: { metric: 'approval', operator: '>', value: 0 },
    category: 'political',
    itemType: 'warning',
    severity: 'warning',
    title: 'Social Priorities Deprioritised',
    description: 'Rebecca Thornton has made clear her frustration that social priorities were overridden in the recent decision.',
  },

  // ===========================================================================
  // NEW: POSITIVE TRACK RECORD
  // ===========================================================================

  // Treasury Mandarin — Proven Track Record
  {
    id: 'mandarin_track_record',
    adviserType: 'treasury_mandarin',
    trigger: { metric: 'growth', operator: '>', value: -10 },
    category: 'growth',
    itemType: 'analysis',
    severity: 'supportive',
    title: 'Steady Hand Confirmed',
    description: 'Sir Humphrey notes that his consistent advice has produced measurable results. The Treasury approach is vindicated by the data.',
  },

  // Political Operator — Proven Track Record
  {
    id: 'pol_track_record',
    adviserType: 'political_operator',
    trigger: { metric: 'growth', operator: '>', value: -10 },
    category: 'political',
    itemType: 'analysis',
    severity: 'supportive',
    title: 'Political Instincts Vindicated',
    description: 'Sarah Chen points to a strong record of accurate political forecasting. Her instincts have repeatedly proven correct.',
  },

  // Heterodox Economist — Proven Track Record
  {
    id: 'hetero_track_record',
    adviserType: 'heterodox_economist',
    trigger: { metric: 'growth', operator: '>', value: -10 },
    category: 'growth',
    itemType: 'analysis',
    severity: 'supportive',
    title: 'Alternative Framework Validated',
    description: 'Dr Okonkwo notes that her unconventional approach has delivered results that orthodox models would have missed.',
  },

  // Fiscal Hawk — Proven Track Record
  {
    id: 'hawk_track_record',
    adviserType: 'fiscal_hawk',
    trigger: { metric: 'growth', operator: '>', value: -10 },
    category: 'growth',
    itemType: 'analysis',
    severity: 'supportive',
    title: 'Prudence Rewarded',
    description: 'Lord Braithwaite observes that the disciplined approach he has advocated is producing the stability he predicted.',
  },

  // Social Democrat — Proven Track Record
  {
    id: 'soc_track_record',
    adviserType: 'social_democrat',
    trigger: { metric: 'growth', operator: '>', value: -10 },
    category: 'growth',
    itemType: 'analysis',
    severity: 'supportive',
    title: 'Investment Case Strengthened',
    description: 'Rebecca Thornton notes that the evidence increasingly supports her argument that investment in people pays dividends.',
  },

  // Technocratic Centrist — Proven Track Record
  {
    id: 'centrist_track_record',
    adviserType: 'technocratic_centrist',
    trigger: { metric: 'growth', operator: '>', value: -10 },
    category: 'growth',
    itemType: 'analysis',
    severity: 'supportive',
    title: 'Evidence-Based Approach Confirmed',
    description: 'James Ashworth observes that the empirical, evidence-led approach he has championed continues to produce balanced outcomes.',
  },
];
