
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
        minGrowth?: number;
        maxGrowth?: number;
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
        content: `Chancellor,\n\nThe overall deficit of £{deficit}bn is unsustainable. This is a direct threat to our fiscal credibility.\n\nI am formally requesting that you bring forward an emergency budget to bring the deficit under control. Target: reduce the overall deficit to below £50bn within 3 months.\n\nThis is not optional. You have 3 months to deliver.\n\nPrime Minister`,
        tone: 'stern',
        demandCategory: 'deficit',
        demandDetails: 'Reduce deficit below £50bn within 3 months'
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
    }
];
