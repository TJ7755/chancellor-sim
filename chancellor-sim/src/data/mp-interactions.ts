
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
