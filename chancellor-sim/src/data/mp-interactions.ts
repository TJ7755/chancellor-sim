
import { MPProfile } from '../mp-system';

export type InteractionApproach = 'promise' | 'persuade' | 'threaten';
export type InteractionOutcome = 'success' | 'failure' | 'backfire';

interface InteractionTemplate {
    id: string;
    approaches: InteractionApproach[];
    outcomes: InteractionOutcome[];
    minRebelliousness?: number;
    maxRebelliousness?: number;
    minAmbition?: number;
    maxAmbition?: number;
    party?: string;
    faction?: string;
    isMinister?: boolean;
    text: string;
}

const INTERACTION_TEMPLATES: InteractionTemplate[] = [
    // ===========================================================================
    // SUCCESS: PROMISE
    // ===========================================================================
    {
        id: 'promise_success_generic',
        approaches: ['promise'],
        outcomes: ['success'],
        text: '{name} appreciates the commitment and has agreed to back the budget.'
    },
    {
        id: 'promise_success_greedy',
        approaches: ['promise'],
        outcomes: ['success'],
        minAmbition: 7,
        text: '{name} smiles broadly. "That sounds like a sensible arrangement, Chancellor. You have my vote."'
    },
    {
        id: 'promise_success_reluctant',
        approaches: ['promise'],
        outcomes: ['success'],
        minRebelliousness: 6,
        text: '{name} nods slowly. "If you deliver on this, I\'ll support you. But I\'ll be watching closely."'
    },
    {
        id: 'promise_success_red_wall',
        approaches: ['promise'],
        outcomes: ['success'],
        faction: 'red_wall', // Hypothetical faction mapping or just trait based
        text: '"Finally, some investment for our town," says {name}. "This will go down well on the doorstep."'
    },

    // ===========================================================================
    // SUCCESS: PERSUADE
    // ===========================================================================
    {
        id: 'persuade_success_generic',
        approaches: ['persuade'],
        outcomes: ['success'],
        text: '{name} has been persuaded by your arguments and will support the budget.'
    },
    {
        id: 'persuade_success_loyalist',
        approaches: ['persuade'],
        outcomes: ['success'],
        maxRebelliousness: 3,
        text: '"You didn\'t need to convince me, Chancellor," says {name}. "I was always with you, but I appreciate the personal touch."'
    },
    {
        id: 'persuade_success_minister',
        approaches: ['persuade'],
        outcomes: ['success'],
        isMinister: true,
        text: '{name} agrees to toe the line. "Collective responsibility is paramount, after all."'
    },
    {
        id: 'persuade_success_snp',
        approaches: ['persuade'],
        outcomes: ['success'],
        party: 'snp',
        text: '{name} considers it. "It benefits Scotland, so we will support it. This time."'
    },

    // ===========================================================================
    // SUCCESS: THREATEN
    // ===========================================================================
    {
        id: 'threaten_success_generic',
        approaches: ['threaten'],
        outcomes: ['success'],
        text: '{name} has reluctantly agreed to support the budget after pressure from the whips.'
    },
    {
        id: 'threaten_success_careerist',
        approaches: ['threaten'],
        outcomes: ['success'],
        minAmbition: 7,
        text: '{name} looks pale but nods. "I understand the position. I won\'t cause trouble."'
    },
    {
        id: 'threaten_success_minister',
        approaches: ['threaten'],
        outcomes: ['success'],
        isMinister: true,
        text: '{name} sighs. "I like being a Minister, Chancellor. I\'ll vote with the government."'
    },

    // ===========================================================================
    // FAILURE: PROMISE
    // ===========================================================================
    {
        id: 'promise_failure_generic',
        approaches: ['promise'],
        outcomes: ['failure'],
        text: '{name} politely declines. "It\'s just not enough to offset the damage this budget does to my constituents."'
    },
    {
        id: 'promise_failure_principled',
        approaches: ['promise'],
        outcomes: ['failure'],
        minRebelliousness: 5,
        text: '{name} looks offended. "This isn\'t about trading favours, Chancellor. It\'s about doing what\'s right."'
    },
    {
        id: 'promise_failure_green',
        approaches: ['promise'],
        outcomes: ['failure'],
        party: 'green',
        text: '{name} shakes their head. "Unless you cancel all new oil licences, no amount of money will buy my vote."'
    },

    // ===========================================================================
    // FAILURE: PERSUADE
    // ===========================================================================
    {
        id: 'persuade_failure_generic',
        approaches: ['persuade'],
        outcomes: ['failure'],
        text: '{name} listens but remains unconvinced. "I\'m sorry, but I can\'t vote for this in good conscience."'
    },
    {
        id: 'persuade_failure_rebel',
        approaches: ['persuade'],
        outcomes: ['failure'],
        minRebelliousness: 7,
        text: '{name} shakes their head. "The party has lost its way. I won\'t be part of this."'
    },
    {
        id: 'persuade_failure_opposition',
        approaches: ['persuade'],
        outcomes: ['failure'],
        text: '"It\'s a bad budget, Chancellor," says {name}. "We will be voting against it."'
    },

    // ===========================================================================
    // FAILURE: THREATEN
    // ===========================================================================
    {
        id: 'threaten_failure_generic',
        approaches: ['threaten'],
        outcomes: ['failure'],
        text: '{name} refuses to be bullied. "Do your worst. I answer to my constituents, not the Whips\' Office."'
    },
    {
        id: 'threaten_failure_veteran',
        approaches: ['threaten'],
        outcomes: ['failure'],
        minRebelliousness: 4,
        text: '{name} laughs. "I was in this House before you were born. Your threats mean nothing to me."'
    },

    // ===========================================================================
    // ALL: BACKFIRE (THREATEN ONLY)
    // ===========================================================================
    {
        id: 'backfire_generic',
        approaches: ['threaten'],
        outcomes: ['backfire'],
        text: '{name} explodes with rage. "How dare you! I\'m going straight to the press with this."'
    },
    {
        id: 'backfire_rebel',
        approaches: ['threaten'],
        outcomes: ['backfire'],
        minRebelliousness: 6,
        text: '{name} sneers. "Is that the best you\'ve got? Watch me vote no, and watch me take twenty others with me."'
    },
    {
        id: 'backfire_minister',
        approaches: ['threaten'],
        outcomes: ['backfire'],
        isMinister: true,
        text: '{name} stands up. "You can have my resignation on your desk in the morning. I won\'t be spoken to like that."'
    },
    {
        id: 'promise_success_ambitious_peer',
        approaches: ['promise'],
        outcomes: ['success'],
        minAmbition: 8,
        text: '{name} leans in. "A junior role in the Treasury would be a fair trade, wouldn\'t you say? You have my support."'
    },
    {
        id: 'persuade_success_expert',
        approaches: ['persuade'],
        outcomes: ['success'],
        faction: 'technocrat', // Hypothetical
        text: '{name} nods. "The data you\'ve presented is compelling. It\'s a risky budget, but logically sound. I\'m in."'
    },
    {
        id: 'threaten_success_scared',
        approaches: ['threaten'],
        outcomes: ['success'],
        maxRebelliousness: 2,
        text: '{name} looks visibly shaken. "I... I didn\'t realize it was so serious. I\'ll vote as instructed."'
    },
    {
        id: 'promise_failure_unreliable',
        approaches: ['promise'],
        outcomes: ['failure'],
        minRebelliousness: 8,
        text: '{name} scoffs. "I\'ve heard it all before, Chancellor. Promises made, promises broken. My vote isn\'t for sale."'
    },
    {
        id: 'persuade_failure_partisan',
        approaches: ['persuade'],
        outcomes: ['failure'],
        party: 'labour',
        text: '{name} laughs. "You expect me to support a Conservative budget? You\'re more optimistic than you look."'
    },
    {
        id: 'backfire_principled_vet',
        approaches: ['threaten'],
        outcomes: ['backfire'],
        minRebelliousness: 7,
        maxAmbition: 3,
        text: '{name} rises to their full height. "Threatening a Member of Parliament? I shall be raising this with the Speaker immediately."'
    },
    {
        id: 'promise_success_local_hero',
        approaches: ['promise'],
        outcomes: ['success'],
        faction: 'regional',
        text: '"If that bypass actually gets built, Chancellor, you\'ll be a hero in my constituency. Deal."'
    },
    {
        id: 'persuade_success_economic_rationalist',
        approaches: ['persuade'],
        outcomes: ['success'],
        faction: 'city',
        text: '{name} checks their phone. "The markets seem to be pricing this in well. It\'s a solid piece of work. Count me in."'
    },
    {
        id: 'threaten_failure_doner_link',
        approaches: ['threaten'],
        outcomes: ['failure'],
        minAmbition: 6,
        text: '{name} smiles thinly. "My donors wouldn\'t like that, Chancellor. And you wouldn\'t like my donors getting unhappy."'
    },
    {
        id: 'promise_success_social_justice',
        approaches: ['promise'],
        outcomes: ['success'],
        faction: 'soft_left',
        text: '"The extra funding for social care is what I needed to hear. You have my support for the second reading."'
    },
    {
        id: 'persuade_failure_dogmatic',
        approaches: ['persuade'],
        outcomes: ['failure'],
        faction: 'hard_right',
        text: '"Any tax rise is a failure of Conservatism," says {name}. "No amount of logic will change my mind."'
    },

    // ===========================================================================
    // GRANULAR BUDGET CONCERN TEMPLATES - NHS & HEALTH
    // ===========================================================================
    {
        id: 'concern_nhs_mental_health_cut',
        approaches: ['persuade', 'promise'],
        outcomes: ['failure'],
        text: '{name} shakes their head firmly. "Mental health services are already at breaking point in {constituency}. Cutting further would be catastrophic. I cannot support this."'
    },
    {
        id: 'concern_nhs_primary_care_inadequate',
        approaches: ['persuade'],
        outcomes: ['failure'],
        text: '{name} responds: "My constituents wait weeks for GP appointments. This funding increase simply isn\'t enough. We need at least £5 billion more for primary care."'
    },
    {
        id: 'concern_social_care_crisis',
        approaches: ['promise', 'persuade'],
        outcomes: ['failure'],
        text: '{name} says firmly: "The social care system is in crisis. Care homes in {constituency} are going bankrupt. Without substantial investment, I cannot support this budget."'
    },

    // ===========================================================================
    // GRANULAR BUDGET CONCERN TEMPLATES - TAX
    // ===========================================================================
    {
        id: 'concern_corporation_tax_cut_left',
        approaches: ['promise', 'persuade'],
        outcomes: ['failure'],
        text: '{name} bristles. "Cutting corporation tax whilst cutting public services? This is exactly what we campaigned against. I\'m afraid this is a red line for me."'
    },
    {
        id: 'concern_energy_profits_levy_insufficient',
        approaches: ['promise', 'persuade'],
        outcomes: ['failure'],
        faction: 'left',
        text: '{name} responds: "Energy companies made £30 billion in windfall profits. This levy is woefully inadequate. It needs to be at least 75% to be credible to our voters."'
    },
    {
        id: 'concern_capital_gains_tax_low',
        approaches: ['persuade'],
        outcomes: ['failure'],
        text: '{name} argues: "Capital gains are taxed far less than income from work. This is fundamentally unfair. We should be equalising the rates, not maintaining this disparity."'
    },
    {
        id: 'concern_bank_surcharge_removed',
        approaches: ['promise', 'persuade'],
        outcomes: ['failure'],
        faction: 'left',
        text: '{name} looks angry. "Removing the bank surcharge after what they did in 2008? The banks should be paying more, not less. I cannot defend this to my constituents."'
    },

    // ===========================================================================
    // GRANULAR BUDGET CONCERN TEMPLATES - WELFARE
    // ===========================================================================
    {
        id: 'concern_universal_credit_cut',
        approaches: ['persuade', 'threaten'],
        outcomes: ['backfire'],
        text: '{name} looks furious. "Universal Credit keeps families afloat in {constituency}. Cut it and you\'ll face a revolt. Count me out."'
    },
    {
        id: 'concern_child_benefit_freeze',
        approaches: ['persuade'],
        outcomes: ['failure'],
        text: '{name} replies: "Child poverty is already shameful. Freezing child benefit when inflation is running hot is a real-terms cut. Families in {constituency} deserve better."'
    },
    {
        id: 'concern_housing_benefit_inadequate',
        approaches: ['promise'],
        outcomes: ['failure'],
        text: '{name} responds: "Housing benefit hasn\'t kept pace with rents in {constituency}. Families are being made homeless through no fault of their own. This increase doesn\'t touch the sides."'
    },
    {
        id: 'concern_pension_triple_lock',
        approaches: ['persuade', 'promise'],
        outcomes: ['failure'],
        text: '{name} says firmly: "Pensioners in {constituency} voted for us on the promise of the triple lock. Break this and we\'ll lose their trust forever. I cannot support this."'
    },

    // ===========================================================================
    // GRANULAR BUDGET CONCERN TEMPLATES - EDUCATION
    // ===========================================================================
    {
        id: 'concern_schools_funding_crisis',
        approaches: ['persuade'],
        outcomes: ['failure'],
        text: '{name} responds: "Schools in {constituency} are cutting teaching assistants and reducing hours. This funding simply maintains the crisis, it doesn\'t solve it."'
    },
    {
        id: 'concern_send_funding_inadequate',
        approaches: ['persuade', 'promise'],
        outcomes: ['failure'],
        text: '{name} says: "Special educational needs funding is in crisis. Local schools are going bankrupt trying to meet statutory duties. This increase doesn\'t address the problem."'
    },
    {
        id: 'concern_further_education_cuts',
        approaches: ['persuade'],
        outcomes: ['failure'],
        text: '{name} argues: "Further education colleges provide vital skills training. Cutting their funding undermines our economic growth ambitions. This makes no sense."'
    },

    // ===========================================================================
    // GRANULAR BUDGET CONCERN TEMPLATES - REGIONAL/CONSTITUENCY
    // ===========================================================================
    {
        id: 'concern_red_wall_levelling_up',
        approaches: ['promise', 'persuade'],
        outcomes: ['failure'],
        text: '{name} responds: "We won {constituency} on a promise of levelling up. Where\'s the investment in our infrastructure? My voters won\'t forgive us if we renege on that."'
    },
    {
        id: 'concern_local_government_cuts',
        approaches: ['persuade'],
        outcomes: ['failure'],
        text: '{name} says: "Local councils in {constituency} are cutting essential services. Libraries, youth clubs, bin collections - all at risk. This budget makes it worse."'
    },
    {
        id: 'concern_transport_infrastructure',
        approaches: ['promise'],
        outcomes: ['failure'],
        text: '{name} responds: "The North has been starved of transport investment for decades. London gets Crossrail, we get potholes. This budget perpetuates the imbalance."'
    },
    {
        id: 'concern_rural_fuel_duty',
        approaches: ['persuade'],
        outcomes: ['failure'],
        text: '{name} argues: "In rural {constituency}, there\'s no alternative to driving. Increasing fuel duty hits my constituents hardest. They have no public transport option."'
    },
    {
        id: 'concern_farm_subsidies_cut',
        approaches: ['promise', 'persuade'],
        outcomes: ['failure'],
        text: '{name} responds firmly: "Agriculture is the economic backbone of {constituency}. Cutting farm subsidies threatens livelihoods and food security. I cannot support this."'
    },

    // ===========================================================================
    // GRANULAR BUDGET CONCERN TEMPLATES - GROUP SPOKESPERSON
    // ===========================================================================
    {
        id: 'group_spokesperson_demands_nhs',
        approaches: ['promise'],
        outcomes: ['success'],
        text: '{name}, speaking for the group, says: "We represent considerable voting power. Commit to £10 billion for the NHS and we can deliver the votes. But this is non-negotiable."'
    },
    {
        id: 'group_spokesperson_rejection_insufficient',
        approaches: ['promise'],
        outcomes: ['failure'],
        text: '{name} responds on behalf of the group: "I\'ve consulted with our members. Your offer falls well short of what\'s needed. We\'re united in opposing this budget unless you meet our demands."'
    },
    {
        id: 'group_spokesperson_counter_offer',
        approaches: ['promise'],
        outcomes: ['failure'],
        text: '{name} says: "We appreciate the gesture, Chancellor, but our group needs at least £8 billion to address our constituents\' concerns. That\'s our bottom line."'
    },

    // ===========================================================================
    // GRANULAR BUDGET CONCERN TEMPLATES - SUCCESS WITH WARNINGS
    // ===========================================================================
    {
        id: 'promise_success_with_scepticism',
        approaches: ['promise'],
        outcomes: ['success'],
        text: '{name} nods cautiously. "You\'ve broken promises before. But I\'ll give you one more chance. If you break this one, I\'m done."'
    },
    {
        id: 'promise_success_marginal_seat',
        approaches: ['promise'],
        outcomes: ['success'],
        text: '{name} says: "My seat is on a knife-edge. This investment shows you take my constituency seriously. You have my support, but deliver on this or I\'ll pay the price."'
    },
    {
        id: 'persuade_success_reluctant',
        approaches: ['persuade'],
        outcomes: ['success'],
        text: '{name} sighs. "I\'m not happy about this, but I recognise the constraints. You have my vote, but don\'t make a habit of asking for favours like this."'
    }
];


export function getInteractionResponse(
    mp: MPProfile,
    approach: InteractionApproach,
    outcome: InteractionOutcome
): string {
    // Filter eligible templates
    const candidates = INTERACTION_TEMPLATES.filter(t => {
        if (!t.approaches.includes(approach)) return false;
        if (!t.outcomes.includes(outcome)) return false;

        // Check constraints
        if (t.minRebelliousness !== undefined && mp.traits.rebelliousness < t.minRebelliousness) return false;
        if (t.maxRebelliousness !== undefined && mp.traits.rebelliousness > t.maxRebelliousness) return false;
        if (t.minAmbition !== undefined && mp.traits.ambition < t.minAmbition) return false;
        if (t.maxAmbition !== undefined && mp.traits.ambition > t.maxAmbition) return false;
        if (t.isMinister !== undefined && mp.isMinister !== t.isMinister) return false;
        if (t.party !== undefined && mp.party !== t.party) return false;
        if (t.faction !== undefined && mp.faction !== t.faction) return false;

        return true;
    });

    // Pick the most specific one (most constraints) or random
    // Sort by specificity (number of defined constraints) descending
    candidates.sort((a, b) => {
        const scoreA = (a.minRebelliousness ? 1 : 0) + (a.maxRebelliousness ? 1 : 0) +
            (a.minAmbition ? 1 : 0) + (a.isMinister ? 1 : 0) + (a.party ? 1 : 0) + (a.faction ? 1 : 0);
        const scoreB = (b.minRebelliousness ? 1 : 0) + (b.maxRebelliousness ? 1 : 0) +
            (b.minAmbition ? 1 : 0) + (b.isMinister ? 1 : 0) + (b.party ? 1 : 0) + (b.faction ? 1 : 0);
        return scoreB - scoreA;
    });

    // Add a bit of randomness for equal scores
    const topScore = candidates.length > 0 ? (
        (candidates[0].minRebelliousness ? 1 : 0) + (candidates[0].maxRebelliousness ? 1 : 0) +
        (candidates[0].minAmbition ? 1 : 0) + (candidates[0].isMinister ? 1 : 0) +
        (candidates[0].party ? 1 : 0) + (candidates[0].faction ? 1 : 0)
    ) : 0;

    const topCandidates = candidates.filter(c => {
        const score = (c.minRebelliousness ? 1 : 0) + (c.maxRebelliousness ? 1 : 0) +
            (c.minAmbition ? 1 : 0) + (c.isMinister ? 1 : 0) +
            (c.party ? 1 : 0) + (c.faction ? 1 : 0);
        return score === topScore;
    });

    const selected = topCandidates.length > 0
        ? topCandidates[Math.floor(Math.random() * topCandidates.length)]
        : INTERACTION_TEMPLATES[0];

    if (!selected) return "Interaction completed."; // Safety fallback

    // Inject name
    return selected.text.replace('{name}', mp.name);
}
