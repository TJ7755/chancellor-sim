
// Social Media Posts Data Structure

export type SocialPersona =
    | 'journalist_serious'
    | 'journalist_tabloid'
    | 'journalist_satire'
    | 'economist_academic'
    | 'economist_city'
    | 'mp_loyal'
    | 'mp_rebel'
    | 'mp_opposition'
    | 'public_angry'
    | 'public_happy'
    | 'public_neutral'
    | 'public_worried'
    | 'business_leader'
    | 'union_leader'
    | 'activist_left'
    | 'activist_right'
    | 'viral_meme';

export interface SocialPostTemplate {
    id: string;
    persona: SocialPersona;
    conditions: {
        minGdpGrowth?: number;
        maxGdpGrowth?: number;
        minInflation?: number; // %
        maxInflation?: number;
        minUnemployment?: number; // %
        minApproval?: number;
        maxApproval?: number;
        minDeficit?: number; // £bn
        maxDeficit?: number;
        taxRises?: boolean;
        spendingCuts?: boolean;
        nhsCrisis?: boolean;
        wealthTax?: boolean;
        pensionCuts?: boolean;
    };
    templates: string[]; // Variations of the tweet
    sentiment: 'positive' | 'negative' | 'neutral';
}

export const SOCIAL_MEDIA_POSTS: SocialPostTemplate[] = [
    // ===========================================================================
    // JOURNALISTS (Serious)
    // ===========================================================================
    {
        id: 'journ_low_approval_critical',
        persona: 'journalist_serious',
        conditions: { maxApproval: 25 },
        sentiment: 'negative',
        templates: [
            "Sources in No10 tell me the mood is 'apocalyptic'. Chancellor's position looking increasingly shaky.",
            "New polling is devastating. Only 24% trust the government on the economy. Hard to see a way back.",
            "Backbenchers openly discussing letters of no confidence. The Chancellor has lost the dressing room.",
            "Cabinet Ministers privately admitting the economic strategy has failed. Expect resignations."
        ]
    },
    {
        id: 'journ_high_approval_praise',
        persona: 'journalist_serious',
        conditions: { minApproval: 55 },
        sentiment: 'positive',
        templates: [
            "Remarkable turnaround in the polls. The Chancellor's gamble seems to be paying off.",
            "Government riding high. Economic competence ratings at their highest level in a decade.",
            "There's a sense of calm in Whitehall today. The strategy is working.",
            "Voters rewarding stability. The Chancellor is now the government's biggest asset."
        ]
    },
    {
        id: 'journ_deficit_concern',
        persona: 'journalist_serious',
        conditions: { minDeficit: 60 },
        sentiment: 'neutral',
        templates: [
            "Treasury officials nervous about the borrowing figures. The 'fiscal headroom' has vanished.",
            "City analysts warned me this morning: 'The UK is starting to look like an emerging market again.'",
            "The OBR forecast is going to be brutal. Chancellor has nowhere to hide.",
            "Rising gilt yields suggest the markets are testing the Chancellor's resolve."
        ]
    },

    // ===========================================================================
    // JOURNALISTS (Tabloid)
    // ===========================================================================
    {
        id: 'journ_tabloid_inflation_rage',
        persona: 'journalist_tabloid',
        conditions: { minInflation: 5.0 },
        sentiment: 'negative',
        templates: [
            "PRICES OUT OF CONTROL: Families forced to choose between heating and eating.",
            "RIP-OFF BRITAIN: Your weekly shop is up £20. Absolute disgrace.",
            "COST OF LIVING NIGHTMARE: Chancellor asleep at the wheel while bills soar.",
            "WHITEHALL WASTER: Ministers dine on fine wine while you pay the price."
        ]
    },
    {
        id: 'journ_tabloid_tax_fury',
        persona: 'journalist_tabloid',
        conditions: { taxRises: true },
        sentiment: 'negative',
        templates: [
            "TAX BOMBSHELL: Middle England hammered by Treasury grab.",
            "READ MY LIPS: They promised no tax rises. They lied.",
            "SQUEEZED DRY: Hardworking families punished for government incompetence.",
            "HANDS OFF OUR PAY PACKETS: Sun headline screams at Chancellor."
        ]
    },
    {
        id: 'journ_tabloid_hero',
        persona: 'journalist_tabloid',
        conditions: { taxRises: false, minGdpGrowth: 2.0, minApproval: 50 },
        sentiment: 'positive',
        templates: [
            "BOOM TIME: Britain back in business thanks to daring budget.",
            "YOU NEVER HAD IT SO GOOD: Wages up, taxes down. Cheers Chancellor!",
            "BRITAIN BOUNCING BACK: Doomsayers proved wrong as economy roars."
        ]
    },

    // ===========================================================================
    // SATIRE / MEME
    // ===========================================================================
    {
        id: 'meme_deficit_high',
        persona: 'viral_meme',
        conditions: { minDeficit: 80 },
        sentiment: 'neutral',
        templates: [
            "Magic Money Tree found in Downing Street garden. #Budget",
            "Chancellor paying the national debt with IOUs written on napkins. [chart declining]",
            "Live scenes from the Treasury: [everything is on fire]",
            "Me looking at the national debt like... [nervous laughter]"
        ]
    },
    {
        id: 'meme_inflation',
        persona: 'viral_meme',
        conditions: { minInflation: 6.0 },
        sentiment: 'negative',
        templates: [
            "Freddo prices up again. The economy is officially broken.",
            "Just took out a mortgage to buy a pint of milk. #CostOfLiving",
            "My bank account seeing the energy bill: [screaming internally]",
            "Chancellor to solving inflation: 'Have you tried skipping meals?'"
        ]
    },

    // ===========================================================================
    // ECONOMISTS (City)
    // ===========================================================================
    {
        id: 'econ_city_growth_good',
        persona: 'economist_city',
        conditions: { minGdpGrowth: 2.0 },
        sentiment: 'positive',
        templates: [
            "Impressive GDP print. UK outperforming G7 peers. Markets liking the stability.",
            "Growth figures surprise to the upside. Recession risk receding. Sterling rallies.",
            "Credit where it's due: the supply-side reforms are biting. Global capital returning to London.",
            "Goldman Sachs upgrades UK outlook. 'The risk premium has evaporated.'"
        ]
    },
    {
        id: 'econ_city_deficit_panic',
        persona: 'economist_city',
        conditions: { minDeficit: 90 },
        sentiment: 'negative',
        templates: [
            "Bond vigilantes are waking up. 10y yields spiking. This is unsustainable.",
            "The risk premium on UK debt is widening. International investors are voting with their feet.",
            "This isn't just a deficit; it's a structural chasm. Sterling vulnerability increasing.",
            "Markets are pricing in a high probability of a credit rating downgrade."
        ]
    },

    // ===========================================================================
    // ECONOMISTS (Academic)
    // ===========================================================================
    {
        id: 'econ_academic_inequality',
        persona: 'economist_academic',
        conditions: { spendingCuts: true },
        sentiment: 'negative',
        templates: [
            "Efficiency savings is a euphemism for decaying public infrastructure. Short-term gain, long-term pain.",
            "Cutting capital budgets to fund tax cuts is economic illiteracy. We are eating our seed corn.",
            "The distributional impact of these cuts will be regressive. Gini coefficient set to rise.",
            "Austerity didn't work in 2010, and it won't work now. The multiplier effect is real."
        ]
    },
    {
        id: 'econ_academic_wealth_tax',
        persona: 'economist_academic',
        conditions: { wealthTax: true },
        sentiment: 'positive',
        templates: [
            "Finally, a move towards taxing assets rather than income. A rational modernisation.",
            "Evidence suggests wealth taxes are less distortionary than income taxes. Good policy.",
            "Addressing wealth inequality is essential for aggregate demand. Bold move.",
            "Thomas Piketty would approve. A step towards rigorous fiscal justice."
        ]
    },

    // ===========================================================================
    // PUBLIC VOICES (Angry)
    // ===========================================================================
    {
        id: 'public_tax_anger',
        persona: 'public_angry',
        conditions: { taxRises: true },
        sentiment: 'negative',
        templates: [
            "My pay slip is depressing. More tax, less service. What is the point?",
            "Thanks Chancellor, there goes my holiday fund. Taxed to death in this country.",
            "Work hard, get taxed more. The stripper has become the stripped.",
            "Why do I bother working overtime? The government takes half of it anyway."
        ]
    },
    {
        id: 'public_nhs_anger',
        persona: 'public_angry',
        conditions: { nhsCrisis: true },
        sentiment: 'negative',
        templates: [
            "Waited 14 hours in A&E with my mum. Promoting tax cuts while the NHS collapses is criminal.",
            "Cannot get a GP appointment for 3 weeks. What am I paying taxes for?",
            "The NHS is broken. My surgery doesn't even answer the phone anymore.",
            "Ambulance took 4 hours. This government has blood on its hands."
        ]
    },
    {
        id: 'public_pension_anger',
        persona: 'public_worried',
        conditions: { pensionCuts: true },
        sentiment: 'negative',
        templates: [
            "Worked for 45 years and now they come for my pension. Betrayal.",
            "My heating bill is up, and now my pension is frozen. I don't know how I'll cope.",
            "Granny freezing in her flat so the Chancellor can cut corporation tax. Disgusting.",
            "The triple lock was a promise. Liars."
        ]
    },

    // ===========================================================================
    // PUBLIC VOICES (Happy)
    // ===========================================================================
    {
        id: 'public_nhs_happy',
        persona: 'public_happy',
        conditions: { nhsCrisis: false, spendingCuts: false, minApproval: 50 },
        sentiment: 'positive',
        templates: [
            "Actually got a GP appointment today! Feels like things are finally working again.",
            "Nice to see the government investing in our future for a change.",
            "New hospital wing opened locally. Finally some progress.",
            "Nurses getting a pay rise. About time!"
        ]
    },
    {
        id: 'public_growth_happy',
        persona: 'public_happy',
        conditions: { minGdpGrowth: 2.0, minUnemployment: 0, maxGdpGrowth: 5.0 }, // Basic prosperity
        sentiment: 'positive',
        templates: [
            "Building site down the road is busy again. Good to see jobs being created.",
            "Got a raise this year that actually beats inflation. Finally!",
            "High street seems busier lately. Maybe the doom-mongers were wrong.",
            "optimistic about the future for the first time in ages."
        ]
    },

    // ===========================================================================
    // ACTIVISTS
    // ===========================================================================
    {
        id: 'activist_left_poverty',
        persona: 'activist_left',
        conditions: { spendingCuts: true },
        sentiment: 'negative',
        templates: [
            "Austerity kills. These cuts will destroy communities. #GeneralStrikeNow",
            "The rich get tax cuts, the poor get service cuts. Class war, pure and simple.",
            "Defend our NHS! Hands off our public services!",
            "14 million in poverty and the Chancellor cuts welfare. Sociopathic."
        ]
    },
    {
        id: 'activist_right_liberty',
        persona: 'activist_right',
        conditions: { taxRises: true },
        sentiment: 'negative',
        templates: [
            "Tax burden at 70-year high. Enterprise is being strangled. Socialist nightmare.",
            "Government is too big and costs too much. We need radical deregulation immediately.",
            "Another tax grab by the socialists in the Treasury. When will they learn?",
            "Stop punishing success. Low taxes = High Growth. It's basic economics."
        ]
    },

    // ===========================================================================
    // BUSINESS & UNIONS
    // ===========================================================================
    {
        id: 'biz_confidence',
        persona: 'business_leader',
        conditions: { minGdpGrowth: 1.5, taxRises: false },
        sentiment: 'positive',
        templates: [
            "CBI survey shows confidence returning. Stability is key for investment.",
            "Finally a budget that understands business needs. We are ready to hire.",
            "Tech sector booming. Britain is open for business.",
            "Relief that corporation tax was held steady. Allows us to plan for the long term."
        ]
    },
    {
        id: 'union_strike',
        persona: 'union_leader',
        conditions: { minInflation: 4.0, spendingCuts: true },
        sentiment: 'negative',
        templates: [
            "Our members cannot accept another real-terms pay cut. We are balloting for action.",
            "Public sector workers are at breaking point. The clap won't pay the bills.",
            "If the government won't listen to reason, they will listen to strikes.",
            "Solidarity with the nurses. Time to shut it down."
        ]
    }
];
