
// Newspaper Headlines Data Structure
// Defines potential headlines based on game state conditions

export type NewspaperBias = 'left' | 'centre-left' | 'centre-right' | 'right' | 'populist-right' | 'financial';
export type HeadlinePriority = 'high' | 'medium' | 'low';

export interface HeadlineCondition {
    minGdpGrowth?: number;
    maxGdpGrowth?: number;
    minInflation?: number;
    maxInflation?: number;
    minUnemployment?: number;
    maxUnemployment?: number;
    minApproval?: number;
    maxApproval?: number;
    minDeficit?: number; // £bn
    maxDeficit?: number;
    minDebt?: number; // % GDP
    maxDebt?: number;
    partyInPower?: 'Labour' | 'Conservative';
}

export interface HeadlineEntry {
    id: string;
    conditions: HeadlineCondition;
    priority: number; // 1-100, higher is more important
    category: 'economy' | 'politics' | 'social' | 'foreign';
    versions: Record<NewspaperBias, {
        headline: string;
        subheading: string;
    }>;
}

export const NEWSPAPER_HEADLINES: HeadlineEntry[] = [
    // ===========================================================================
    // ECONOMIC BOOM / GROWTH
    // ===========================================================================
    {
        id: 'eco_growth_high',
        conditions: { minGdpGrowth: 3.0 },
        priority: 90,
        category: 'economy',
        versions: {
            'left': {
                headline: 'Economy Surges, But Who Benefits?',
                subheading: 'Growth figures beat expectations, yet campaigners warn wealth gap is widening rapidly.'
            },
            'centre-left': {
                headline: 'Britain Booms: Growth Hits 3%',
                subheading: 'Chancellor hailed as economy roars back to life, confounding grim forecasts.'
            },
            'centre-right': {
                headline: 'The British Tiger: Growth Surpasses All Rivals',
                subheading: 'Government policies vindicated as UK tops G7 growth leagues.'
            },
            'right': {
                headline: 'We Are Growing Again!',
                subheading: 'Tax cuts and deregulation fuel massive economic expansion.'
            },
            'populist-right': {
                headline: 'GREAT BRITISH COMEBACK!',
                subheading: 'Stick that in your pipe, doomsayers! Britain is flying high again.'
            },
            'financial': {
                headline: 'UK GDP Expands 3%, Beating Consensus',
                subheading: 'Unexpectedly strong data prompts repricing of interest rate expectations.'
            }
        }
    },
    {
        id: 'eco_growth_moderate',
        conditions: { minGdpGrowth: 1.5, maxGdpGrowth: 2.9 },
        priority: 60,
        category: 'economy',
        versions: {
            'left': {
                headline: 'Steady Growth Returns',
                subheading: 'Economy stabilises, but public services still waiting for investment.'
            },
            'centre-left': {
                headline: 'Economy on Firm Footing',
                subheading: 'Moderate growth signals return to normality after years of shock.'
            },
            'centre-right': {
                headline: 'Green Shoots Turn to Trees',
                subheading: 'Healthy economic signals show government plan is working.'
            },
            'right': {
                headline: 'Britain Back in Business',
                subheading: 'Steady expansion defies Project Fear predictions.'
            },
            'populist-right': {
                headline: 'BRITAIN ON THE UP',
                subheading: 'Jobs and wages rising as economy shakes off the blues.'
            },
            'financial': {
                headline: 'UK GDP Prints Moderate Expansion',
                subheading: 'Productivity puzzle remains despite headline growth figures.'
            }
        }
    },

    // ===========================================================================
    // RECESSION / CRASH
    // ===========================================================================
    {
        id: 'eco_crash_severe',
        conditions: { maxGdpGrowth: -2.0 },
        priority: 100,
        category: 'economy',
        versions: {
            'left': {
                headline: 'Capitalism in Crisis: Economy Collapses',
                subheading: 'Millions face ruin as failed austerity policies trigger depression.'
            },
            'centre-left': {
                headline: 'Economy in Freefall',
                subheading: 'Worst contraction in decades as Chancellor accused of losing control.'
            },
            'centre-right': {
                headline: 'Dark Days Ahead',
                subheading: 'Global headwinds and policy errors combine to crash economy.'
            },
            'right': {
                headline: 'Labour\'s Economic Catastrophe',
                subheading: 'Tax hikes strangle growth as Britain plunges into deep recession.'
            },
            'populist-right': {
                headline: 'BROKEN BRITAIN',
                subheading: 'We are all poorer. Send the clowns home!'
            },
            'financial': {
                headline: 'UK GDP Plunges 2% in Shock Contraction',
                subheading: 'Markets pricing in deep recession as confidence evaporates.'
            }
        }
    },
    {
        id: 'eco_recession_mild',
        conditions: { maxGdpGrowth: -0.1, minGdpGrowth: -1.9 },
        priority: 85,
        category: 'economy',
        versions: {
            'left': {
                headline: 'Recession Hits Working Families',
                subheading: 'Government incompetence drags Britain into negative growth.'
            },
            'centre-left': {
                headline: 'UK Tips Into Recession',
                subheading: 'Two quarters of negative growth confirm economic downturn.'
            },
            'centre-right': {
                headline: 'Economy Stalls into Reverse',
                subheading: 'Technical recession confirmed, pressure mounts on Treasury.'
            },
            'right': {
                headline: 'Red Tape Strangles Growth',
                subheading: 'Recession is the price of high taxes and heavy regulation.'
            },
            'populist-right': {
                headline: 'WE\'RE SKINT!',
                subheading: 'Britain officially in recession. Thanks for nothing, Chancellor.'
            },
            'financial': {
                headline: 'Technical Recession Confirmed',
                subheading: 'Soft landing hopes dashed as GDP contracts slightly.'
            }
        }
    },

    // ===========================================================================
    // INFLATION
    // ===========================================================================
    {
        id: 'inflation_hyper',
        conditions: { minInflation: 10.0 },
        priority: 95,
        category: 'economy',
        versions: {
            'left': {
                headline: 'Cost of Living Catastrophe',
                subheading: 'Double-digit inflation decimates wages. General Strike looms.'
            },
            'centre-left': {
                headline: 'Prices Spiral Out of Control',
                subheading: 'Inflation hits 10% - can the Bank of England stop the rot?'
            },
            'centre-right': {
                headline: 'Inflation Emergency',
                subheading: 'Savings wiped out as Chancellor struggles to grip price rises.'
            },
            'right': {
                headline: 'The 70s Are Back',
                subheading: 'Rampant inflation destroys wealth. Sound money abandoned.'
            },
            'populist-right': {
                headline: 'PRICES EXPLODE!',
                subheading: 'A loaf of bread costs HOW much? Value of pound destroyed.'
            },
            'financial': {
                headline: 'CPI Hits Double Digits',
                subheading: 'Unanchored expectations risk wage-price spiral. Aggressive hikes expected.'
            }
        }
    },
    {
        id: 'inflation_high',
        conditions: { minInflation: 5.0, maxInflation: 9.9 },
        priority: 80,
        category: 'economy',
        versions: {
            'left': {
                headline: 'The Squeeze Tightens',
                subheading: 'Food banks overwhelmed as prices rise faster than benefits.'
            },
            'centre-left': {
                headline: 'Inflation Stubbornly High',
                subheading: 'Hopes of quick fall dashed. Mortgage misery for millions.'
            },
            'centre-right': {
                headline: 'Inflation Nightmare',
                subheading: 'Middle-class families feel the pinch as bills soar.'
            },
            'right': {
                headline: 'Inflation Tax Theft',
                subheading: 'Stealth tax of inflation eroding your savings daily.'
            },
            'populist-right': {
                headline: 'RIP-OFF BRITAIN',
                subheading: 'Supermarkets and energy giants cash in while you suffer.'
            },
            'financial': {
                headline: 'Inflation Proves Sticky',
                subheading: 'Services inflation remains elevated causing BoE headache.'
            }
        }
    },

    // ===========================================================================
    // UNEMPLOYMENT
    // ===========================================================================
    {
        id: 'unemployment_crisis',
        conditions: { minUnemployment: 8.0 },
        priority: 95,
        category: 'economy',
        versions: {
            'left': {
                headline: 'Mass Unemployment Returns',
                subheading: 'Thatcherism 2.0: Communities devastated by job losses.'
            },
            'centre-left': {
                headline: 'Jobless Total Soars',
                subheading: 'Unemployment hits crisis levels. Is this the end of full employment?'
            },
            'centre-right': {
                headline: 'Dole Queues Grow',
                subheading: 'Economic mismanagement leads to labour market collapse.'
            },
            'right': {
                headline: 'The Idle Nation',
                subheading: 'Benefits culture plus job losses creates toxic mix.'
            },
            'populist-right': {
                headline: 'ON THE SCRAPHEAP',
                subheading: 'British workers thrown overboard. Close the borders now!'
            },
            'financial': {
                headline: 'Labour Market Cracks Wide Open',
                subheading: 'Unemployment spikes to 8% as recession bites hard.'
            }
        }
    },

    // ===========================================================================
    // DEFICIT & DEBT
    // ===========================================================================
    {
        id: 'deficit_crisis',
        conditions: { minDeficit: 100 }, // £100bn+
        priority: 85,
        category: 'economy',
        versions: {
            'left': {
                headline: 'Borrowing to Survive',
                subheading: 'Deficit balloons as state steps in to prevent collapse.'
            },
            'centre-left': {
                headline: 'Black Hole in Finances',
                subheading: '£100bn borrowing requirement shocks City. Tax rises inevitable.'
            },
            'centre-right': {
                headline: 'Magic Money Tree Wilts',
                subheading: 'Reckless spending binges leaves Britain drowning in debt.'
            },
            'right': {
                headline: 'Bankrupt Britain',
                subheading: 'Socialist spending spree leaves bill for our grandchildren.'
            },
            'populist-right': {
                headline: 'THEY ARE MAXING YOUR CREDIT CARD',
                subheading: ' politicians spending money we don\'t have.'
            },
            'financial': {
                headline: 'Gilt Vigilantes Circle as Deficit Widens',
                subheading: 'Fiscal credibility strained by £100bn+ borrow requirement.'
            }
        }
    },

    // ===========================================================================
    // APPROVAL RATINGS
    // ===========================================================================
    {
        id: 'approval_collapse',
        conditions: { maxApproval: 25 },
        priority: 90,
        category: 'politics',
        versions: {
            'left': {
                headline: 'Government on Brink of Collapse',
                subheading: 'Voters desert administration in droves. Mandate lost.'
            },
            'centre-left': {
                headline: 'Poll Slide Continues',
                subheading: 'Government popularity hits historic low. Backbenchers plotting.'
            },
            'centre-right': {
                headline: 'Tories Face Extinction Event', // Assuming Tory, logic needs to be dynamic or generic
                subheading: 'Voters turn back on chaotic administration.'
            },
            'right': {
                headline: 'Betrayal at the Ballot Box',
                subheading: 'Alienating base leads to polling catastrophe.'
            },
            'populist-right': {
                headline: 'GET THEM OUT!',
                subheading: 'The people have spoken: You are useless.'
            },
            'financial': {
                headline: 'Political Risk Premium Returns',
                subheading: 'Weak government unable to pass legislation. Snap election fears.'
            }
        }
    },
    {
        id: 'approval_high',
        conditions: { minApproval: 60 },
        priority: 80,
        category: 'politics',
        versions: {
            'left': {
                headline: 'A True People\'s Government',
                subheading: 'Radical agenda wins hearts and minds across the nation.'
            },
            'centre-left': {
                headline: 'Government Riding High',
                subheading: 'Competence pays off as poll lead extends to double digits.'
            },
            'centre-right': {
                headline: 'PM Unassailable',
                subheading: 'Steady ship wins voter trust. Opposition in disarray.'
            },
            'right': {
                headline: 'The Natural Party of Government',
                subheading: 'Voters reject opposition extremism for sound administration.'
            },
            'populist-right': {
                headline: 'HEROES OF THE HOUR',
                subheading: 'Finally, leaders who listen! Approval soars.'
            },
            'financial': {
                headline: 'Political Stability Boosts Sentiment',
                subheading: 'Strong mandate allows for long-term planning. Investment flows in.'
            }
        }
    }
];
