
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
            "Solidarity with the nurses. Time to shut it down.",
            "Real wages are falling while the City gets bonuses. The divide is unacceptable.",
            "We aren't just striking for pay; we're striking for the future of public services.",
            "Chancellor says there's no money, but there's always money for tax breaks for the rich.",
            "The mandate for strike action is overwhelming. Government, the ball is in your court."
        ]
    },

    // ===========================================================================
    // MP VOICES (Loyalists)
    // ===========================================================================
    {
        id: 'mp_loyal_praise',
        persona: 'mp_loyal',
        conditions: { minGdpGrowth: 1.0, maxDeficit: 60 },
        sentiment: 'positive',
        templates: [
            "Great to see the Chancellor delivering a budget for growth. Steady hands at the wheel.",
            "Constituents in my patch are seeing the benefits of this fiscal discipline. #Competence",
            "Stability, growth, and investment. That's what this government is all about.",
            "The opposition has no plan. We have a clear roadmap for Britain's future.",
            "Honoured to support the Chancellor today. A budget that works for working people.",
            "While others talk, we deliver. Proud of our economic record."
        ]
    },
    {
        id: 'mp_loyal_defense',
        persona: 'mp_loyal',
        conditions: { maxApproval: 30, spendingCuts: true },
        sentiment: 'neutral',
        templates: [
            "Tough choices today for a better tomorrow. We must be honest about the state of the finances.",
            "Nobody likes cutting spending, but we cannot continue to borrow from our children.",
            "The Chancellor is doing what is necessary, not what is popular. That's leadership.",
            "Critics forget the mess we inherited. Cleaning it up takes time and discipline.",
            "We are focusing resources where they are needed most. Efficiency is key.",
            "Let's ignore the noise and focus on the long-term plan. It's working."
        ]
    },

    // ===========================================================================
    // MP VOICES (Rebels)
    // ===========================================================================
    {
        id: 'mp_rebel_warning',
        persona: 'mp_rebel',
        conditions: { maxApproval: 35, taxRises: true },
        sentiment: 'negative',
        templates: [
            "I didn't get elected to raise taxes on my constituents. High-tax Conservatism is an oxymoron.",
            "The government is losing the dressing room. We need a change of direction, and fast.",
            "Letters are going in. This budget is the final straw for many on the backbenches.",
            "We are abandoning our base. If we don't fix this, the next election will be a wipeout.",
            "The Treasury is out of touch with real life. Someone needs to tell the Chancellor.",
            "I will be voting with my conscience, not the whips. Enough is enough."
        ]
    },

    // ===========================================================================
    // MP VOICES (Opposition)
    // ===========================================================================
    {
        id: 'mp_opp_attack',
        persona: 'mp_opposition',
        conditions: { minInflation: 5.0, minUnemployment: 5.0 },
        sentiment: 'negative',
        templates: [
            "Highest inflation in a generation, and the government's answer? More failure.",
            "The cost of living crisis is a direct result of 14 years of economic mismanagement.",
            "People are literally choosing between heating and eating. The Chancellor should be ashamed.",
            "Another budget, another set of broken promises. Britain deserves better than this.",
            "The government has run out of ideas and run out of road. Time for a General Election.",
            "While the rich get richer, my constituents are struggling to survive. A disgrace."
        ]
    },

    // ===========================================================================
    // PUBLIC VOICES (Worried/Neutral)
    // ===========================================================================
    {
        id: 'public_interest_rates_panic',
        persona: 'public_worried',
        conditions: { minInflation: 7.0 },
        sentiment: 'negative',
        templates: [
            "Just saw the new mortgage rates. I'm actually shaking. How are we supposed to live?",
            "Re-mortgaging in two months. Goodbye any hope of a holiday for the next decade.",
            "Everything is more expensive and the bank says interest rates are going up again. Help.",
            "Counting the pennies at the supermarket today. Never thought it would come to this.",
            "The news says the economy is 'resilient' but my bank account says otherwise.",
            "Is anyone in government actually living in the same country as me?"
        ]
    },
    {
        id: 'public_generic_neutral',
        persona: 'public_neutral',
        conditions: { minGdpGrowth: 0.5, maxGdpGrowth: 2.0 },
        sentiment: 'neutral',
        templates: [
            "Budget day again. Lots of shouting, not sure much actually change for me.",
            "Wait and see what the pay slip looks like next month, I guess.",
            "Economy seems 'meh' at the moment. Not great, not terrible.",
            "Just hope they don't mess with the bus fares again.",
            "Another day, another Chancellor. Can never keep track of who's who anymore.",
            "As long as I can still afford a pint on Friday, I'm happy enough."
        ]
    },

    // ===========================================================================
    // JOURNALISTS (Satire/Sarcastic)
    // ===========================================================================
    {
        id: 'journ_satire_deficit',
        persona: 'journalist_satire',
        conditions: { minDeficit: 80 },
        sentiment: 'negative',
        templates: [
            "Chancellor discovers 'Infinite Money Glitch' - otherwise known as borrowing £100bn.",
            "The Magic Money Tree has been found! It's currently being guarded by the OBR.",
            "Budget Recap: Spend money we don't have on things we don't want. Classic.",
            "Breaking: OBR forecast turns out to be 'just some numbers we made up in the pub'.",
            "The Chancellor's economic plan is like a toddler with a credit card. Exciting, then scary.",
            "Breaking News: Treasury running is now 'vibes-based finance'. Accuracy not required."
        ]
    },

    // ===========================================================================
    // ECONOMISTS (Academic - Theoretical)
    // ===========================================================================
    {
        id: 'econ_academic_productivity',
        persona: 'economist_academic',
        conditions: { maxGdpGrowth: 1.0 },
        sentiment: 'negative',
        templates: [
            "The productivity gap is now a canyon. Without radical supply-side reform, we are Japan without the tech.",
            "Fiscal policy is pushing on a string. The structural issues are far more profound.",
            "We are witnessing the slow-motion de-industrialisation of the UK. A tragedy of policy.",
            "Long-term hysteresis in the labour market is being ignored for short-term political gains.",
            "The multipliers on this spending are negligible. It's essentially consumption, not investment.",
            "A textbook case of time-inconsistency in monetary-fiscal coordination."
        ]
    },

    // ===========================================================================
    // ECONOMISTS (City - Market Focus)
    // ===========================================================================
    {
        id: 'econ_city_gilt_yields',
        persona: 'economist_city',
        conditions: { minDeficit: 70 },
        sentiment: 'negative',
        templates: [
            "Watch the 10-year gilt yields. If they pierce 4.5%, the Treasury is in real trouble.",
            "The risk premium on UK assets is sticky. Investors want to see more than just promises.",
            "Sterling's resilience is being tested. We're seeing some capital flight to the Eurozone.",
            "Markets haven't fully priced in the upcoming borrowing requirement. Expect volatility.",
            "The gilt auction was 'uncomfortably covered'. The Treasury needs to be careful.",
            "Institutional investors are rotating out of UK gilts. A clear signal of low confidence."
        ]
    },

    // ===========================================================================
    // SUCCESS SCENARIOS (High Growth / Low Inflation)
    // ===========================================================================
    {
        id: 'journ_growth_boom_praise',
        persona: 'journalist_serious',
        conditions: { minGdpGrowth: 3.5 },
        sentiment: 'positive',
        templates: [
            "Economic data is frankly stunning. Britain is outperforming every major forecast.",
            "Talk of a 'new golden age' beginning to surface in SW1. The turnaround is real.",
            "The Chancellor has pulled off the impossible: growth is back with a vengeance.",
            "International eyes are on London today as the UK economy defies global gravity.",
            "Rare consensus among analysts: the current strategy is delivering historic results.",
            "Investment is pouring in. This isn't just a bounce; it's a structural surge."
        ]
    },
    {
        id: 'public_growth_joy',
        persona: 'public_happy',
        conditions: { minGdpGrowth: 3.0, maxInflation: 3.0 },
        sentiment: 'positive',
        templates: [
            "Actually feeling optimistic for the first time in years. Business is booming!",
            "Got a bonus this year and prices are finally stable. Feels like we're back on track.",
            "Just got a new job offer with a 20% bump. The market is absolutely on fire right now.",
            "Noticeable change in the high street. New shops opening everywhere. Love to see it.",
            "Finally, some good news! Britain feels like it's winning again.",
            "Hard work is actually paying off. This is the country I want to live in."
        ]
    },
    {
        id: 'biz_expansion_mode',
        persona: 'business_leader',
        conditions: { minGdpGrowth: 2.5, taxRises: false },
        sentiment: 'positive',
        templates: [
            "We are moving from survival mode to expansion mode. The environment is perfect for QE.",
            "Confidence is at a 10-year high. We're doubling our R&D budget this quarter.",
            "The UK is now the most attractive destination for tech talent in Europe once again.",
            "Strong signals from the Treasury have empowered us to take long-term risks.",
            "Record hiring targets for next year. The British business engine is roaring.",
            "Finally, a government that speaks the language of enterprise and growth."
        ]
    },

    // ===========================================================================
    // LOW INFLATION / STABILITY
    // ===========================================================================
    {
        id: 'public_price_stability_relief',
        persona: 'public_happy',
        conditions: { maxInflation: 2.0, minGdpGrowth: 1.0 },
        sentiment: 'positive',
        templates: [
            "Went to the shops and my total was LOWER than last month? Is this real life?",
            "Noticeable relief at the petrol pump. Inflation being beaten is the best pay rise.",
            "Finally can start saving again. The constant price hikes seem to have stopped.",
            "Budgeting is so much easier when you know what things will cost next week.",
            "Good to see the 'Cost of Living' headlines finally disappearing. Huge relief.",
            "The pound is actually holding its value. About time we had some stability."
        ]
    },

    // ===========================================================================
    // INNOVATION / FUTURE FOCUS
    // ===========================================================================
    {
        id: 'tech_bro_optimism',
        persona: 'journalist_serious', // Using a placeholder as no tech persona
        conditions: { minGdpGrowth: 2.0 },
        sentiment: 'positive',
        templates: [
            "The AI cluster in London is now second only to Silicon Valley. Huge win for the UK.",
            "Quantum computing grants are a game changer. The Treasury is actually thinking 20 years ahead.",
            "Energy transition is creating a massive secondary market in the North. Solid strategy.",
            "Digital infrastructure spend is finally hitting the levels required for a top-tier economy.",
            "Fintech 2.0 is happening in the UK. The regulatory sandbox is world-class.",
            "Innovation isn't just a buzzword anymore; it's driving the GDP beat."
        ]
    }
];


