
// PM Messages Data Structure

import { PMMessageType } from '../game-state';

export interface PMMessageTemplate {
    id: string;
    type: PMMessageType;
    priority?: number; // Higher is filtered first
    conditions: {
        minTrust?: number;
        maxTrust?: number;
        minApproval?: number;
        maxApproval?: number;
        minDeficit?: number; // £bn
        maxDeficit?: number;
        minHeadroom?: number; // £bn
        maxHeadroom?: number; // £bn
        fiscalRuleCompliant?: boolean;
        minGrowth?: number;
        maxGrowth?: number;
        minInflation?: number; // %
        maxInflation?: number;
        minUnemployment?: number; // %
        serviceMetric?: string;
        minServiceQuality?: number;
        maxServiceQuality?: number;
        reshuffleRisk?: number; // Min risk

        // Specific flags (logic must provide these)
        isManifestoBreach?: boolean;
        isSupportWithdrawn?: boolean;
        hasRecentContact?: boolean; // For check-ins?
        taxRises?: boolean;
        spendingCuts?: boolean;
        nhsCrisis?: boolean;
    };
    subject: string;
    content: string; // Supports {trust}, {approval}, {deficit}, {growth}, {month}, {backbench}
    tone: 'supportive' | 'neutral' | 'stern' | 'angry';

    // Extras
    demandCategory?: 'tax' | 'spending' | 'deficit' | 'approval';
    demandDetails?: string;
    consequenceWarning?: string;
}

export const PM_MESSAGES: PMMessageTemplate[] = [
    // ===========================================================================
    // REGULAR CHECK-INS
    // ===========================================================================
    {
        id: 'pm_checkin_good',
        type: 'regular_checkin',
        conditions: { minTrust: 60, minApproval: 40 },
        subject: '{month} Check-in: Keep Up the Good Work',
        content: `Chancellor,\n\nI wanted to touch base this month. The economic figures are holding steady, and I'm pleased with the direction we're heading.\n\nPM Trust: {trust}/100\nGovernment Approval: {approval}%\nGDP Growth: {growth}%\n\nKeep the backbenchers onside and continue delivering on our manifesto. We need steady hands at the wheel.\n\nBest,\nThe Prime Minister`,
        tone: 'supportive'
    },
    {
        id: 'pm_checkin_avg',
        type: 'regular_checkin',
        conditions: { maxTrust: 59, minTrust: 40 },
        subject: '{month} Check-in: Room for Improvement',
        content: `Chancellor,\n\nWe need to talk about where we are. The numbers aren't terrible, but they're not where they need to be either.\n\nPM Trust: {trust}/100\nGovernment Approval: {approval}%\nDeficit: £{deficit}bn\n\nI need to see more decisive action. The backbenchers are getting restless, and we can't afford too many more missteps.\n\nLet's discuss strategy soon.\n\nPrime Minister`,
        tone: 'neutral'
    },
    {
        id: 'pm_checkin_bad',
        type: 'regular_checkin',
        conditions: { maxTrust: 39 },
        subject: '{month} Check-in: We Have a Problem',
        content: `Chancellor,\n\nI'll be blunt: things are not going well. The numbers speak for themselves, and they're causing serious concern across the party.\n\nPM Trust: {trust}/100\nGovernment Approval: {approval}%\nBackbench Satisfaction: {backbench}/100\n\nWe need to see significant improvement, and soon. My patience is not unlimited.\n\nRegards,\nPrime Minister`,
        tone: 'stern'
    },

    // ===========================================================================
    // PRAISE (Event Triggered)
    // ===========================================================================
    {
        id: 'pm_praise_hero',
        type: 'praise',
        conditions: { minTrust: 75, minApproval: 50 },
        subject: 'Excellent Work This Quarter',
        content: `Chancellor,\n\nI wanted to personally thank you for your outstanding work managing the economy. The numbers speak for themselves:\n\nPM Trust: {trust}/100\nGovernment Approval: {approval}%\nGDP Growth: {growth}%\nDeficit: £{deficit}bn\n\nThe party is happy, the markets are stable, and we're delivering for the British people. This is exactly the kind of steady, competent economic management we promised voters.\n\nKeep it up. You have my full confidence and support.\n\nBest regards,\nThe Prime Minister`,
        tone: 'supportive'
    },
    {
        id: 'pm_praise_growth',
        type: 'praise',
        conditions: { minGrowth: 3.0 },
        subject: 'Growth Figures',
        content: `Chancellor,\n\nDid you see the FT this morning? Fastest growth in the G7. Incredible work.\n\nThis is the story we need to be telling. "Britain is back."\n\nLet's make sure we sustain this momentum into the election.\n\nPM`,
        tone: 'supportive'
    },

    // ===========================================================================
    // CONCERN (Event Triggered)
    // ===========================================================================
    {
        id: 'pm_concern_approval',
        type: 'concern',
        conditions: { maxApproval: 25 },
        subject: 'Polling figures',
        content: `Chancellor,\n\nDid you see the YouGov tables? Government approval has dropped to {approval}%, which is dangerously low. We have zero economic credibility with C2DE voters. If this carries on, we are looking at a 1997-style wipeout.\n\nI need a political budget, not an accountant's one. Change the narrative.\n\nPM`,
        tone: 'neutral'
    },
    {
        id: 'pm_concern_deficit',
        type: 'concern',
        conditions: { minDeficit: 70 },
        subject: 'Deficit Trajectory',
        content: `Chancellor,\n\nThe deficit is rising toward unsustainable levels (£{deficit}bn). This is becoming a problem for our fiscal credibility.\n\nI'd like to see you address this issue proactively before the markets force our hand.\n\nPrime Minister`,
        tone: 'neutral'
    },
    {
        id: 'pm_concern_nhs',
        type: 'concern',
        conditions: { nhsCrisis: true },
        subject: 'NHS Situation',
        content: `Chancellor,\n\nThe headlines about A&E waiting times are killing us. I know money is tight, but we cannot go into winter with the NHS in this state.\n\nFind some money. I don't care where from. Fix it.\n\nPM`,
        tone: 'stern'
    },
    {
        id: 'pm_concern_tax',
        type: 'concern',
        conditions: { taxRises: true, maxApproval: 40 },
        subject: 'Tax Burden concerns',
        content: `Chancellor,\n\nI'm getting a lot of angry letters from MPs in the Shires. They say their constituents are furious about the tax rises.\n\nWe seem to be taxing like socialists but delivering services like libertarians. It's the worst of both worlds.\n\nReconsider your strategy.\n\nPrime Minister`,
        tone: 'neutral'
    },
    {
        id: 'pm_headroom_tight',
        type: 'concern',
        conditions: { maxHeadroom: 9.9 },
        subject: 'Fiscal Headroom Tightening',
        content: `Chancellor,\n\nOur fiscal headroom is now only £{headroom}bn. That leaves almost no room for error.\n\nI need decisions that protect headroom, not just the headline deficit.\n\nPrime Minister`,
        tone: 'stern'
    },
    {
        id: 'pm_headroom_comfortable',
        type: 'regular_checkin',
        conditions: { minHeadroom: 10, maxHeadroom: 30 },
        subject: 'Headroom Is Manageable',
        content: `Chancellor,\n\nHeadroom is sitting at £{headroom}bn. That is workable, but not comfortable enough for complacency.\n\nKeep delivery tight and avoid unnecessary shocks.\n\nPM`,
        tone: 'neutral'
    },
    {
        id: 'pm_headroom_ample',
        type: 'praise',
        conditions: { minHeadroom: 30 },
        subject: 'Strong Fiscal Space',
        content: `Chancellor,\n\nHeadroom at £{headroom}bn gives us genuine room to manoeuvre. Good work preserving fiscal space.\n\nUse it carefully and strategically.\n\nPrime Minister`,
        tone: 'supportive'
    },
    {
        id: 'pm_rule_offtrack',
        type: 'concern',
        conditions: { fiscalRuleCompliant: false },
        subject: 'Off Track Against Fiscal Rule',
        content: `Chancellor,\n\nWe are off track against the active rule: {ruleName}. Current headroom is £{headroom}bn.\n\nGet us back onto a compliant path quickly.\n\nPrime Minister`,
        tone: 'stern'
    },
    {
        id: 'pm_rule_ontrack',
        type: 'praise',
        conditions: { fiscalRuleCompliant: true, minHeadroom: 5 },
        subject: 'Fiscal Rule On Track',
        content: `Chancellor,\n\nWe are currently on track under {ruleName}, with £{headroom}bn headroom.\n\nKeep this discipline in place.\n\nPM`,
        tone: 'supportive'
    },
    {
        id: 'pm_service_nhs_down',
        type: 'concern',
        conditions: { serviceMetric: 'nhsQuality', maxServiceQuality: 54 },
        subject: 'NHS Deterioration',
        content: `Chancellor,\n\n{serviceName} has slipped to {qualityScore}/100. We cannot defend this trajectory publicly.\n\nFind a credible recovery plan.\n\nPrime Minister`,
        tone: 'stern'
    },
    {
        id: 'pm_service_nhs_up',
        type: 'praise',
        conditions: { serviceMetric: 'nhsQuality', minServiceQuality: 60 },
        subject: 'NHS Improvement',
        content: `Chancellor,\n\n{serviceName} has improved to {qualityScore}/100. This is politically valuable progress.\n\nKeep delivery pressure on.\n\nPM`,
        tone: 'supportive'
    },
    {
        id: 'pm_service_education_down',
        type: 'concern',
        conditions: { serviceMetric: 'educationQuality', maxServiceQuality: 58 },
        subject: 'Education Quality Slipping',
        content: `Chancellor,\n\n{serviceName} is down at {qualityScore}/100. This is becoming a strategic political risk.\n\nPrime Minister`,
        tone: 'neutral'
    },
    {
        id: 'pm_service_education_up',
        type: 'praise',
        conditions: { serviceMetric: 'educationQuality', minServiceQuality: 64 },
        subject: 'Education Recovery',
        content: `Chancellor,\n\n{serviceName} has improved to {qualityScore}/100. Keep that momentum.\n\nPM`,
        tone: 'supportive'
    },
    {
        id: 'pm_service_infra_down',
        type: 'concern',
        conditions: { serviceMetric: 'infrastructureQuality', maxServiceQuality: 50 },
        subject: 'Infrastructure Strain',
        content: `Chancellor,\n\n{serviceName} is deteriorating at {qualityScore}/100. Delivery failures are feeding media pressure.\n\nPrime Minister`,
        tone: 'neutral'
    },
    {
        id: 'pm_service_infra_up',
        type: 'praise',
        conditions: { serviceMetric: 'infrastructureQuality', minServiceQuality: 56 },
        subject: 'Infrastructure Progress',
        content: `Chancellor,\n\n{serviceName} has improved to {qualityScore}/100. That strengthens our growth story.\n\nPM`,
        tone: 'supportive'
    },
    {
        id: 'pm_service_policing_down',
        type: 'concern',
        conditions: { serviceMetric: 'policingEffectiveness', maxServiceQuality: 52 },
        subject: 'Policing Under Pressure',
        content: `Chancellor,\n\n{serviceName} sits at {qualityScore}/100. Constituency MPs are raising this repeatedly.\n\nPrime Minister`,
        tone: 'stern'
    },
    {
        id: 'pm_service_policing_up',
        type: 'praise',
        conditions: { serviceMetric: 'policingEffectiveness', minServiceQuality: 60 },
        subject: 'Policing Performance Improving',
        content: `Chancellor,\n\n{serviceName} is up to {qualityScore}/100. Keep this trend moving.\n\nPM`,
        tone: 'supportive'
    },
    {
        id: 'pm_service_courts_down',
        type: 'concern',
        conditions: { serviceMetric: 'courtBacklogPerformance', maxServiceQuality: 45 },
        subject: 'Courts Backlog Worsening',
        content: `Chancellor,\n\n{serviceName} is only {qualityScore}/100. This is creating wider confidence problems.\n\nPrime Minister`,
        tone: 'neutral'
    },
    {
        id: 'pm_service_courts_up',
        type: 'praise',
        conditions: { serviceMetric: 'courtBacklogPerformance', minServiceQuality: 55 },
        subject: 'Courts Performance Improving',
        content: `Chancellor,\n\n{serviceName} has reached {qualityScore}/100. This helps our law-and-order case.\n\nPM`,
        tone: 'supportive'
    },
    {
        id: 'pm_service_prisons_down',
        type: 'concern',
        conditions: { serviceMetric: 'prisonSafety', maxServiceQuality: 45 },
        subject: 'Prison Safety Decline',
        content: `Chancellor,\n\n{serviceName} is down to {qualityScore}/100. We need a safer trajectory quickly.\n\nPrime Minister`,
        tone: 'stern'
    },
    {
        id: 'pm_service_prisons_up',
        type: 'praise',
        conditions: { serviceMetric: 'prisonSafety', minServiceQuality: 52 },
        subject: 'Prison Safety Improvement',
        content: `Chancellor,\n\n{serviceName} has improved to {qualityScore}/100. Keep pressure on delivery.\n\nPM`,
        tone: 'supportive'
    },
    {
        id: 'pm_service_mental_down',
        type: 'concern',
        conditions: { serviceMetric: 'mentalHealthAccess', maxServiceQuality: 46 },
        subject: 'Mental Health Access Falling',
        content: `Chancellor,\n\n{serviceName} is now {qualityScore}/100. This is a major vulnerability for us.\n\nPrime Minister`,
        tone: 'neutral'
    },
    {
        id: 'pm_service_mental_up',
        type: 'praise',
        conditions: { serviceMetric: 'mentalHealthAccess', minServiceQuality: 52 },
        subject: 'Mental Health Access Improving',
        content: `Chancellor,\n\n{serviceName} has improved to {qualityScore}/100. This is the right direction.\n\nPM`,
        tone: 'supportive'
    },

    // ===========================================================================
    // WARNINGS (Event Triggered)
    // ===========================================================================
    {
        id: 'pm_warning_general',
        type: 'warning',
        conditions: { maxTrust: 30 },
        subject: 'Serious Concerns About Economic Performance',
        content: `Chancellor,\n\nI need to raise serious concerns about your stewardship of the economy. Your approval among our MPs is worryingly low (PM Trust: {trust}/100), and this is becoming a problem for the government as a whole.\n\nThis is your warning: things must improve. I expect to see concrete action to address these issues. We cannot continue on this trajectory.\n\nYou have my support for now, but it's not unconditional.\n\nPrime Minister`,
        tone: 'stern',
        consequenceWarning: 'Continued poor performance may result in further consequences'
    },

    // ===========================================================================
    // THREATS (Event Triggered)
    // ===========================================================================
    {
        id: 'pm_threat_trust',
        type: 'threat',
        conditions: { maxTrust: 20 },
        subject: 'Final Warning: Immediate Improvement Required',
        content: `Chancellor,\n\nI've tried to be patient, but the situation has not improved. In fact, it's gotten worse.\n\nCurrent state:\n- PM Trust: {trust}/100\n- Government Approval: {approval}%\n- Backbench Satisfaction: {backbench}/100\n- Deficit: £{deficit}bn\n\nThe Cabinet is asking questions. The backbenchers are in open revolt. The media is sensing blood in the water.\n\nI will not let one minister drag down this entire government. Turn things around immediately, or I will have no choice but to consider a reshuffle.\n\nThis is not a drill.\n\nPrime Minister`,
        tone: 'angry',
        consequenceWarning: 'You are at risk of being reshuffled out of the Treasury'
    },

    // ===========================================================================
    // RESHUFFLE WARNING (Critical)
    // ===========================================================================
    {
        id: 'pm_reshuffle_imminent',
        type: 'reshuffle_warning',
        conditions: { reshuffleRisk: 80 },
        subject: 'Final Notice: Reshuffle Imminent',
        content: `Chancellor,\n\nThis is your final notice.\n\nYour position as Chancellor of the Exchequer is untenable. The Cabinet has lost confidence. The backbenchers are in open revolt.\n\nReshuffle Risk: 80+/100\nPM Trust: {trust}/100\n\nYou have ONE opportunity to turn this around. Deliver a successful budget that passes Parliament with strong support and improves economic performance, OR I will have no choice but to replace you.\n\nThis is the last conversation we'll have on this matter before I make my decision.\n\nPrime Minister`,
        tone: 'angry',
        consequenceWarning: 'You will be reshuffled if performance does not improve immediately (GAME OVER)'
    },

    // ===========================================================================
    // DEMANDS
    // ===========================================================================
    {
        id: 'pm_demand_deficit',
        type: 'demand',
        conditions: { minDeficit: 80 },
        subject: 'Immediate Action Required: Deficit Control',
        content: `Chancellor,\n\nThe overall deficit of £{deficit}bn is unsustainable. This is a direct threat to our fiscal credibility.\n\nI am formally requesting that you bring forward an emergency budget to bring the deficit under control. Target: reduce the overall deficit to below £{targetDeficit}bn within {deadlineMonths} months.\n\nThis is not optional. You have until turn {deadlineTurn} to deliver.\n\nPrime Minister`,
        tone: 'stern',
        demandCategory: 'deficit',
        demandDetails: 'Reduce deficit below £{targetDeficit}bn within {deadlineMonths} months (deadline turn {deadlineTurn})'
    },
    {
        id: 'pm_demand_manifesto',
        type: 'demand',
        conditions: { isManifestoBreach: true },
        subject: 'Manifesto Compliance Demanded',
        content: `Chancellor,\n\nWe have a problem. You've broken manifesto pledges, and the party won't tolerate it. Our credibility is built on keeping our promises to voters.\n\nI need you to bring forward a corrective budget that addresses these violations. No excuses.\n\nDeadline: 2 months.\n\nPrime Minister`,
        tone: 'angry',
        demandCategory: 'tax',
        demandDetails: 'Correct manifesto violations within 2 months'
    },

    // ===========================================================================
    // SUPPORT CHANGE
    // ===========================================================================
    {
        id: 'pm_support_withdrawn',
        type: 'support_change',
        conditions: { isSupportWithdrawn: true },
        subject: 'Withdrawal of Political Support',
        content: `Chancellor,\n\nI regret to inform you that I am formally withdrawing my active political support for your chancellorship. You will continue in role, but you should not expect me to whip votes in your favour or provide cover for difficult decisions.\n\nThis is a direct consequence of persistently low PM Trust ({trust}/100) and multiple warnings ignored.\n\nYou can earn back my support through concrete action and tangible results. Until then, you're on your own.\n\nPrime Minister`,
        tone: 'angry',
        consequenceWarning: 'Budgets will be much harder to pass without PM support'
    },
    {
        id: 'pm_support_restored',
        type: 'support_change',
        conditions: { isSupportWithdrawn: false, minTrust: 50 }, // Logic handles the toggle
        subject: 'Support Restored',
        content: `Chancellor,\n\nI'm pleased to see the improvements you've made. Your recent performance has been significantly better, and I'm restoring my full political support.\n\nPM Trust: {trust}/100\nGovernment Approval: {approval}%\n\nKeep up the good work, and let's continue moving forward together.\n\nPrime Minister`,
        tone: 'supportive'
    },

    // ===========================================================================
    // ADDITIONAL CONCERNS
    // ===========================================================================
    {
        id: 'pm_concern_unemployment',
        type: 'concern',
        conditions: { minUnemployment: 6.0 },
        subject: 'Labour Market Softness',
        content: `Chancellor,\n\nThe latest unemployment figures are worrying. At {unemployment}%, we are starting to see real distress in the regions. This isn't just an economic metric; it's a political time bomb.\n\nI need to see a plan for job creation, particularly in our heartland seats. We cannot afford to be seen as the party of the dole queue.\n\nPrime Minister`,
        tone: 'stern'
    },
    {
        id: 'pm_concern_growth_stall',
        type: 'concern',
        conditions: { maxGrowth: 0.5, minGrowth: 0.0, minTrust: 40 },
        subject: 'Economic Stagnation',
        content: `Chancellor,\n\nGrowth has effectively flatlined. I know the global context is difficult, but 'technical stability' won't win us an election. We need momentum.\n\nAre there any supply-side levers we haven't pulled yet? Let's be bolder in the next quarter.\n\nPM`,
        tone: 'neutral'
    },
    {
        id: 'pm_concern_stagflation',
        type: 'concern',
        conditions: { minInflation: 7.0, maxGrowth: 0.5 },
        subject: 'The Stagflation Trap',
        content: `Chancellor,\n\nWe are looking at the worst of all worlds: high prices and zero growth. This is the 1970s all over again, and it destroyed the leadership of that era.\n\nI need a strategy that addresses both. If we just fight inflation by killing growth further, we are finished. Be creative.\n\nPrime Minister`,
        tone: 'angry'
    },
    {
        id: 'pm_concern_market_volatility',
        type: 'concern',
        conditions: { minDeficit: 80, maxApproval: 35 },
        subject: 'Market Sentiment',
        content: `Chancellor,\n\nThe City is nervous. I'm hearing reports of major funds reducing their exposure to UK Gilts. This 'risk premium' is going to eat our fiscal headroom if we don't calm the waters.\n\nNo more surprises for a while. Let's signal stability.\n\nPM`,
        tone: 'stern'
    },

    // ===========================================================================
    // ADDITIONAL PRAISE
    // ===========================================================================
    {
        id: 'pm_praise_inflation_beat',
        type: 'praise',
        conditions: { maxInflation: 2.1, minTrust: 50 },
        subject: 'Inflation Success',
        content: `Chancellor,\n\nCredit where it's due: you've broken the back of inflation. This is a huge win for the government and for every household in the country.\n\nLet's make sure we capitalised on this 'stability dividend' in the polls.\n\nExcellent work.\n\nPrime Minister`,
        tone: 'supportive'
    },
    {
        id: 'pm_praise_business_backing',
        type: 'praise',
        conditions: { minGrowth: 2.0, taxRises: false },
        subject: 'Business Confidence',
        content: `Chancellor,\n\nThe CBI and the Fed of Small Businesses are both singing your praises this morning. Keeping the tax burden steady while driving growth is a difficult needle to thread, but you're doing it.\n\nKeep this relationship strong. We need the private sector in our corner.\n\nBest,\nPM`,
        tone: 'supportive'
    },

    // ===========================================================================
    // MISC / FLAVOUR
    // ===========================================================================
    {
        id: 'pm_checkin_reshuffle_rumours',
        type: 'regular_checkin',
        conditions: { maxTrust: 45, reshuffleRisk: 40 },
        subject: 'Ignoring the Noise',
        content: `Chancellor,\n\nYou may have seen the papers speculating about a reshuffle. I want to be clear: I value your contribution, but these rumours exist because the current numbers aren't providing us with enough cover.\n\nSilence the critics with a strong performance this month. I'd rather keep the team together if I can.\n\nPrime Minister`,
        tone: 'neutral'
    },
    {
        id: 'pm_demand_spending_discipline',
        type: 'demand',
        conditions: { minDeficit: 90, spendingCuts: false },
        subject: 'Urgent: Departmental Spending Control',
        content: `Chancellor,\n\nDepartments are overspending and the Treasury seems to be saying 'yes' too often. I am demanding a temporary freeze on all non-essential capital projects until the deficit is back below £70bn.\n\nI will support you when the Ministers complain, but you MUST be the one to deliver the 'no'.\n\nPM`,
        tone: 'stern',
        demandCategory: 'spending',
        demandDetails: 'Freeze non-essential capital spend'
    }
];
