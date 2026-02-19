
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
    category: 'economy' | 'politics' | 'social' | 'foreign' | 'growth' | 'deficit';
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
        conditions: { minGdpGrowth: 4.0 },
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
        conditions: { minGdpGrowth: 2.0, maxGdpGrowth: 3.9 },
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
    {
        id: 'net_zero_costs',
        conditions: { minInflation: 5.0, minDeficit: 60 },
        priority: 66,
        category: 'social',
        versions: {
            'left': {
                headline: 'Net Zero: A Green Industrial Revolution',
                subheading: 'Climate targets can drive growth if the government has the courage to invest.'
            },
            'centre-left': {
                headline: 'The Cost of Going Green',
                subheading: 'Britain leads on climate, but households feel the pinch in energy bills.'
            },
            'centre-right': {
                headline: 'Pragmatic Progress: The Realistic Path to Net Zero',
                subheading: 'Innovation and markets, not bans and taxes, will save the planet.'
            },
            'right': {
                headline: 'NET ZERO = NET POORER',
                subheading: 'Green zealotry is destroying our industry and heating our homes for nothing.'
            },
            'populist-right': {
                headline: 'THE CLIMATE SCAM IS COSTING YOU',
                subheading: 'Stop the eco-madness and bring back cheap energy now!'
            },
            'financial': {
                headline: 'Stranded Asset Risks Rise for UK Energy',
                subheading: 'Aggressive decarbonization targets force rapid industry repricing.'
            }
        }
    },

    // ===========================================================================
    // EXTREME SCENARIOS
    // ===========================================================================
    {
        id: 'economic_miracle',
        conditions: { minGdpGrowth: 5.0, maxInflation: 2.5, minApproval: 60 },
        priority: 99,
        category: 'growth',
        versions: {
            'left': {
                headline: 'The Great Revival: Prosperity for All?',
                subheading: 'Record growth must now be used to repair our broken social fabric.'
            },
            'centre-left': {
                headline: 'Britain\'s Economic Miracle',
                subheading: 'Unprecedented growth figures stun the world as UK takes the lead.'
            },
            'centre-right': {
                headline: 'The New Golden Age',
                subheading: 'Chancellor\'s strategy delivers the strongest economy in a century.'
            },
            'right': {
                headline: 'RULE BRITANNIA: THE BOOM IS HERE',
                subheading: 'High growth, low taxes, and a nation standing tall again.'
            },
            'populist-right': {
                headline: 'WE DID IT!',
                subheading: 'Finally, a government that actually knows how to make Britain great.'
            },
            'financial': {
                headline: 'UK Equities Rerated as Structural Growth Accelerates',
                subheading: 'London becomes the global capital of the post-pandemic recovery.'
            }
        }
    },
    {
        id: 'imf_bailout',
        conditions: { minDeficit: 120, maxApproval: 15, minGdpGrowth: -2.0 },
        priority: 100, // Absolute top priority
        category: 'deficit',
        versions: {
            'left': {
                headline: 'National Humiliation: The IMF Arrives',
                subheading: 'The final failure of a bankrupt ideology. We are now a ward of the international community.'
            },
            'centre-left': {
                headline: 'UK Forced into IMF Bailout',
                subheading: 'Sovereign insolvency triggers emergency rescue package and harsh conditions.'
            },
            'centre-right': {
                headline: 'The Day the Money Ran Out',
                subheading: 'Years of unsustainable borrowing end in catastrophic fiscal collapse.'
            },
            'right': {
                headline: 'BANKRUPT BRITAIN',
                subheading: 'They spent the lot. Now the IMF is coming for the furniture.'
            },
            'populist-right': {
                headline: 'SOLD OUT BY THE ELITES',
                subheading: 'Our country is now being run by faceless bureaucrats from Washington.'
            },
            'financial': {
                headline: 'IMF Intervention: Structural Adjustment Program Detailed',
                subheading: 'Gilt markets frozen as UK enters supervised fiscal consolidation.'
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
    },

    // ===========================================================================
    // STAGFLATION (High Inflation + Low Growth)
    // ===========================================================================
    {
        id: 'stagflation_severe',
        conditions: { minInflation: 8.0, maxGdpGrowth: 0.5 },
        priority: 98,
        category: 'economy',
        versions: {
            'left': {
                headline: 'The Winter of Discontent 2.0',
                subheading: 'Prices soar while wages freeze. The working class is being crushed by stagflation.'
            },
            'centre-left': {
                headline: 'Britain Gripped by Stagflation Nightmare',
                subheading: 'Toxic mix of high prices and zero growth creates the worst of all worlds.'
            },
            'centre-right': {
                headline: 'Economy Stalled in Inflationary Trap',
                subheading: 'Chancellor faces impossible choice: fight prices or save growth.'
            },
            'right': {
                headline: 'Returning to the 1970s',
                subheading: 'Economic misery returns as government loses control of the basics.'
            },
            'populist-right': {
                headline: 'SKINT AND BROKE!',
                subheading: 'Everything is more expensive and nobody has a job. Great job, Chancellor.'
            },
            'financial': {
                headline: 'Stagflation Risk Becomes Reality',
                subheading: 'Markets fear policy paralysis as CPI outpaces GDP expansion.'
            }
        }
    },

    // ===========================================================================
    // DEBT CRISIS
    // ===========================================================================
    {
        id: 'debt_over_100',
        conditions: { minDebt: 100.1 },
        priority: 92,
        category: 'economy',
        versions: {
            'left': {
                headline: 'Debt Mountain: The Cost of Inequality',
                subheading: 'Investment gap leads to borrowing binge as state struggles to keep up.'
            },
            'centre-left': {
                headline: 'National Debt Hits 100% of GDP',
                subheading: 'Historic milestone as Britain owes more than its total annual income.'
            },
            'centre-right': {
                headline: 'Britain in the Red: Debt Hits 100%',
                subheading: 'Fiscal responsibility abandoned as debt pile reaches record heights.'
            },
            'right': {
                headline: 'WE OWE A TRILLION!',
                subheading: 'Generations to come will pay for today\'s profligate spending.'
            },
            'populist-right': {
                headline: 'THE BANKRUPT ISLAND',
                subheading: 'Politicians have sold our future to foreign bankers.'
            },
            'financial': {
                headline: 'Debt-to-GDP Ratio Pierces 100% Ceiling',
                subheading: 'Long-term sustainability concerns mount as debt service costs rise.'
            }
        }
    },

    // ===========================================================================
    // DEFLATION / LOW INFLATION
    // ===========================================================================
    {
        id: 'eco_deflation',
        conditions: { maxInflation: 0.5 },
        priority: 75,
        category: 'economy',
        versions: {
            'left': {
                headline: 'Economy Cooling Too Fast?',
                subheading: 'Warning of deflationary spiral as consumer spending dries up.'
            },
            'centre-left': {
                headline: 'Inflation Vanishes: Recession Warning',
                subheading: 'Low prices sound alarm bells for economic health.'
            },
            'centre-right': {
                headline: 'Price Growth Flatlines',
                subheading: 'Treasury celebrates low inflation, but some fear stagnation.'
            },
            'right': {
                headline: 'Sound Money Returns',
                subheading: 'End of the inflationary era. Savings finally safe from erosion.'
            },
            'populist-right': {
                headline: 'PRICES FROZEN',
                subheading: 'Shop till you drop as price tags stay still.'
            },
            'financial': {
                headline: 'UK Edges Towards Deflationary Territory',
                subheading: 'Yield curve flattens as BoE faces pressure to cut rates.'
            }
        }
    },

    // ===========================================================================
    // LABOUR SPECIFIC HEADLINES
    // ===========================================================================
    {
        id: 'labour_high_tax',
        conditions: { partyInPower: 'Labour', minApproval: 0 }, // Generic check
        priority: 50,
        category: 'politics',
        versions: {
            'left': {
                headline: 'Common Sense Economics: Taxing the Few to Save the Many',
                subheading: 'Labour\'s redistribution agenda gains momentum.'
            },
            'centre-left': {
                headline: 'Labour\'s Tax Plan: Bold or Risky?',
                subheading: 'Investment in public services funded by higher corporation tax.'
            },
            'centre-right': {
                headline: 'Business Braced for Labour Tax Hike',
                subheading: 'Industry leaders warn of "chilling effect" on investment.'
            },
            'right': {
                headline: 'SOCIALIST TAX BOMBSHELL',
                subheading: 'Chancellor prepares to soak the rich and middle class alike.'
            },
            'populist-right': {
                headline: 'HANDS IN YOUR POCKETS!',
                subheading: 'Labour starts the spending spree with your money.'
            },
            'financial': {
                headline: 'Fiscal Drag Accelerates Under Labour',
                subheading: 'Corporate levies expected to Rise in upcoming Budget.'
            }
        }
    },

    // ===========================================================================
    // CONSERVATIVE SPECIFIC HEADLINES
    // ===========================================================================
    {
        id: 'tory_austerity',
        conditions: { partyInPower: 'Conservative', minDeficit: 60 },
        priority: 55,
        category: 'politics',
        versions: {
            'left': {
                headline: 'The Return of the Nasty Party',
                subheading: 'Conservatives plan brutal cuts to welfare to pay for tax breaks.'
            },
            'centre-left': {
                headline: 'Austerity 2.0: Deep Cuts Loom',
                subheading: 'Government pivots back to fiscal discipline at the cost of services.'
            },
            'centre-right': {
                headline: 'Sound Money: The Tough Choices Britain Needs',
                subheading: 'Chancellor focuses on eliminatng the deficit through efficiency.'
            },
            'right': {
                headline: 'PRUNING THE STATE',
                subheading: 'Sensible savings will unleash the Great British spirit.'
            },
            'populist-right': {
                headline: 'DRAIN THE SWAMP',
                subheading: 'Tories finally cutting the Whitehall waste. About time!'
            },
            'financial': {
                headline: 'Consolidation Plan Targets Primary Deficit',
                subheading: 'Equity markets rally on fiscal tightening signals.'
            }
        }
    },

    // ===========================================================================
    // HOUSING MARKET
    // ===========================================================================
    {
        id: 'housing_crash',
        conditions: { minInflation: 6.0, maxGdpGrowth: 1.0 }, // Proxy for housing stress
        priority: 82,
        category: 'social',
        versions: {
            'left': {
                headline: 'Generation Rent Abandoned',
                subheading: 'Housing market in chaos as mortgage rates become impossible.'
            },
            'centre-left': {
                headline: 'Housing Market Stalls',
                subheading: 'Price falls expected as cost of borrowing hits 15-year high.'
            },
            'centre-right': {
                headline: 'End of the Property Boom?',
                subheading: 'Market correction looms as interest rate pain intensifies.'
            },
            'right': {
                headline: 'MORTGAGE MISERY',
                subheading: 'Homeowners hammered by the price of state failure.'
            },
            'populist-right': {
                headline: 'YOU CAN\'T AFFORD A HOME',
                subheading: 'Market rigged for the big banks while you lose out.'
            },
            'financial': {
                headline: 'Property Sector Braced for Downturn',
                subheading: 'BTL investors fleeing the market as yields turn negative.'
            }
        }
    },

    // ===========================================================================
    // REGIONAL INEQUALITY
    // ===========================================================================
    {
        id: 'regional_divide',
        conditions: { minUnemployment: 6.0, maxApproval: 40 },
        priority: 65,
        category: 'social',
        versions: {
            'left': {
                headline: 'Two Britains: The Great Divide Widens',
                subheading: 'London booms while the North is left to rot by the Treasury.'
            },
            'centre-left': {
                headline: 'Levelling Up Hopes Fading',
                subheading: 'Regional data shows investment still concentrated in the South East.'
            },
            'centre-right': {
                headline: 'The Productivity Gap: A National Challenge',
                subheading: 'Regional disparities continue to dog the UK\'s growth potential.'
            },
            'right': {
                headline: 'FORGOTTEN TOWNS',
                subheading: 'High streets dying while Westminster focuses on the City.'
            },
            'populist-right': {
                headline: 'LEFT BEHIND AGAIN!',
                subheading: 'London elites enjoying the high life while your town crumbles.'
            },
            'financial': {
                headline: 'Regional GDP Disparity Clouds Macro Outlook',
                subheading: 'Lagging northern industrial productivity remains key headwind.'
            }
        }
    },

    // ===========================================================================
    // CURRENCY SHOCKS
    // ===========================================================================
    {
        id: 'sterling_collapse',
        conditions: { minDeficit: 90, minInflation: 7.0 },
        priority: 96,
        category: 'economy',
        versions: {
            'left': {
                headline: 'Sterling in Crisis: The Price of Incompetence',
                subheading: 'Pound tumbles as international markets lose all faith.'
            },
            'centre-left': {
                headline: 'Currency Freefall: Imports Set to Soar',
                subheading: 'Sterling hits historic lows against the dollar and euro.'
            },
            'centre-right': {
                headline: 'Pressure on the Pound',
                subheading: 'Chancellor must act to restore market confidence in the currency.'
            },
            'right': {
                headline: 'PUNISHED BY THE MARKETS',
                subheading: 'Spendthrift policies have turned the pound into a joke.'
            },
            'populist-right': {
                headline: 'OUR MONEY IS WORTHLESS',
                subheading: 'The pound in your pocket is shrinking by the minute.'
            },
            'financial': {
                headline: 'Sterling Plunges in G7 Sell-off',
                subheading: 'FX markets price in sovereign risk as fiscal credibility evaporates.'
            }
        }
    },

    // ===========================================================================
    // TAX CUTS (GOOD FOR GROWTH)
    // ===========================================================================
    {
        id: 'tax_cuts_growth',
        conditions: { minGdpGrowth: 2.5, maxDeficit: 40 },
        priority: 78,
        category: 'economy',
        versions: {
            'left': {
                headline: 'Giveaways for the Rich, Crumbs for the Rest',
                subheading: 'Growth surge used as excuse for more corporate tax breaks.'
            },
            'centre-left': {
                headline: 'Tax-Cutting Strategy Seems to Pay Off',
                subheading: 'Moderate cuts followed by unexpected growth bounce.'
            },
            'centre-right': {
                headline: 'Laffer Curve in Action: Lower Taxes, Higher Growth',
                subheading: 'Government\'s daring tax-cut gamble vindicated by data.'
            },
            'right': {
                headline: 'BOOMING BRITAIN: TAX CUTS WORK',
                subheading: 'Unleashing the private sector has triggered a new golden age.'
            },
            'populist-right': {
                headline: 'YOUR MONEY BACK IN YOUR POCKET',
                subheading: 'Finally, a Chancellor who doesn\'t want to rob you blind.'
            },
            'financial': {
                headline: 'Supply-side Tailwinds Drive GDP Beat',
                subheading: 'Lower corporate rates trigger capital expenditure surge.'
            }
        }
    },

    // ===========================================================================
    // HEALTHCARE CRISIS
    // ===========================================================================
    {
        id: 'nhs_meltdown',
        conditions: { maxApproval: 30, minInflation: 5.0 }, // Proxy for social stress
        priority: 88,
        category: 'social',
        versions: {
            'left': {
                headline: 'THE DEATH OF THE NHS',
                subheading: 'Systemic underfunding leads to total collapse of public health.'
            },
            'centre-left': {
                headline: 'Health Service at Breaking Point',
                subheading: 'Waiting lists hit 10 million as staff leave in record numbers.'
            },
            'centre-right': {
                headline: 'NHS Efficiency Crisis',
                subheading: 'Record funding failing to deliver results. Reform needed now.'
            },
            'right': {
                headline: 'BROKEN HEALTH SERVICE',
                subheading: 'Throwing good money after bad in the bottomless pit of NHS.'
            },
            'populist-right': {
                headline: 'YOU CAN\'T SEE A DOCTOR',
                subheading: 'System is broken. Time to start again from scratch.'
            },
            'financial': {
                headline: 'Healthcare Liability Risks Sovereign Stability',
                subheading: 'Long-term NHS cost projections threaten fiscal rules compliance.'
            }
        }
    },

    // ===========================================================================
    // MANUFACTURING / TRADE
    // ===========================================================================
    {
        id: 'trade_boom',
        conditions: { minGdpGrowth: 2.2, maxUnemployment: 4.0 },
        priority: 70,
        category: 'economy',
        versions: {
            'left': {
                headline: 'Export Surge: British Workers Compete with the Best',
                subheading: 'Manufacturing jobs return as global demand spikes.'
            },
            'centre-left': {
                headline: 'Trade Balance Improves Significantly',
                subheading: 'UK manufacturing sees strongest export growth in a decade.'
            },
            'centre-right': {
                headline: 'Global Britain Delivering Results',
                subheading: 'New trade links and competitive industry fuel export machine.'
            },
            'right': {
                headline: 'WE ARE MAKING THINGS AGAIN',
                subheading: 'British industry roars back to life on the global stage.'
            },
            'populist-right': {
                headline: 'BRITISH BEST TAKES ON THE WORLD',
                subheading: 'Made in Britain is back in fashion. Buy British!'
            },
            'financial': {
                headline: 'Current Account Deficit Narrows',
                subheading: 'Strong manufacturing PMIs suggest robust external demand.'
            }
        }
    },

    // ===========================================================================
    // ENERGY / TECHNOLOGY
    // ===========================================================================
    {
        id: 'tech_revolution',
        conditions: { minGdpGrowth: 2.8, minDeficit: 50 }, // High growth but investing
        priority: 68,
        category: 'social',
        versions: {
            'left': {
                headline: 'Green Revolution: Jobs for the Future',
                subheading: 'Investment in renewables creates thousands of high-tech roles.'
            },
            'centre-left': {
                headline: 'UK Leading the Global Tech Race',
                subheading: 'Innovation hubs flourishing as government backing pays off.'
            },
            'centre-right': {
                headline: 'Silicon Valleys of the East and West',
                subheading: 'British tech sector value hits new record. London is the capital of AI.'
            },
            'right': {
                headline: 'THE FUTURE IS BRITISH',
                subheading: 'Daring investment in fusion and AI puts us ahead of the pack.'
            },
            'populist-right': {
                headline: 'BRITISH BRAINS BEAT THE REST',
                subheading: 'Space, AI, Energy - We are winning the race to the future.'
            },
            'financial': {
                headline: 'Tech Sector Eclipses Finance as Growth Driver',
                subheading: 'VC investment into UK startups reaches unprecedented levels.'
            }
        }
    },

    // ===========================================================================
    // POLITICAL SCANDAL / WEAKNESS
    // ===========================================================================
    {
        id: 'cabinet_chaos',
        conditions: { maxApproval: 20 },
        priority: 94,
        category: 'politics',
        versions: {
            'left': {
                headline: 'CABINET REVOLT: A NATION IN CHAOS',
                subheading: 'Ministers plot as the PM loses all authority over the economy.'
            },
            'centre-left': {
                headline: 'Civil War in Downing Street',
                subheading: 'Resignations rumored as economic strategy falls apart.'
            },
            'centre-right': {
                headline: 'Government Struggles to Speak with One Voice',
                subheading: 'Policy confusion creates vacuum at the heart of power.'
            },
            'right': {
                headline: 'TIME TO GO!',
                subheading: 'This shambolic administration has run out of road.'
            },
            'populist-right': {
                headline: 'GET RID OF THE LOT OF THEM',
                subheading: 'Politicians playing games while the country burns.'
            },
            'financial': {
                headline: 'Governance Risk Discount Applied to UK Assets',
                subheading: 'Political instability triggers sell-off in domestic equities.'
            }
        }
    },
    {
        id: 'infra_collapse',
        conditions: { maxApproval: 35, minDeficit: 70 },
        priority: 72,
        category: 'social',
        versions: {
            'left': {
                headline: 'Nation Grinds to a Halt',
                subheading: 'Decades of neglect and "efficiency savings" leave rail and roads in tatters.'
            },
            'centre-left': {
                headline: 'Pothole Britain: Infrastructure in Decay',
                subheading: 'Commuters fume as transport networks buckle under lack of investment.'
            },
            'centre-right': {
                headline: 'The Cost of Congestion',
                subheading: 'Strained infrastructure is costing the economy billions in lost productivity.'
            },
            'right': {
                headline: 'TRAIN WRECK ECONOMY',
                subheading: 'High taxes but the trains still don\'t run. Where is the money going?'
            },
            'populist-right': {
                headline: 'STUCK IN THE MUD',
                subheading: 'Our roads are a joke and the trains are a rip-off. Sort it out!'
            },
            'financial': {
                headline: 'Logistic Bottlenecks Dampen Growth Outlook',
                subheading: 'Poor transport connectivity remains a structural drag on GDP.'
            }
        }
    },
    {
        id: 'skills_crisis',
        conditions: { minUnemployment: 5.0, maxGdpGrowth: 1.2 },
        priority: 64,
        category: 'social',
        versions: {
            'left': {
                headline: 'Education Underfunded, Futures Stolen',
                subheading: 'Class sizes balloon as schools struggle to keep the lights on.'
            },
            'centre-left': {
                headline: 'UK Facing Critical Skills Gap',
                subheading: 'Businesses warn they cannot find trained staff to fill vital roles.'
            },
            'centre-right': {
                headline: 'The Productivity Puzzle: It\'s the Skills, Stupid',
                subheading: 'Economic growth hampered by lack of vocational and technical expertise.'
            },
            'right': {
                headline: 'WOKERY IN SCHOOLS, IGNORANCE IN WORK',
                subheading: 'Curriculum failing to prepare young people for the real world.'
            },
            'populist-right': {
                headline: 'DUMBING DOWN BRITAIN',
                subheading: 'Our kids are falling behind while we waste money on nonsense.'
            },
            'financial': {
                headline: 'Labour Market Mismatch Persists',
                subheading: 'Inability to source skilled talent continues to cap corporate expansion.'
            }
        }
    },
    {
        id: 'crime_wave',
        conditions: { maxApproval: 30, minDeficit: 60 },
        priority: 74,
        category: 'social',
        versions: {
            'left': {
                headline: 'Social Decay: Crime Follows Poverty',
                subheading: 'Cuts to youth services and policing create a perfect storm on our streets.'
            },
            'centre-left': {
                headline: 'Law and Order in Crisis',
                subheading: 'Police numbers fail to keep pace with rising tide of anti-social behavior.'
            },
            'centre-right': {
                headline: 'Safety First: The Need for Robust Policing',
                subheading: 'Government must restore order to protect the economic high street.'
            },
            'right': {
                headline: 'LAWLESS BRITAIN',
                subheading: 'Soft-touch justice and invisible police have handed the streets to thugs.'
            },
            'populist-right': {
                headline: 'LOCK THEM UP!',
                subheading: 'People are scared in their own homes. We need more cells, not more reports.'
            },
            'financial': {
                headline: 'Retail Sector Theft Hits Margins',
                subheading: 'Rising crime levels in shopping districts dampen consumer sentiment.'
            }
        }
    },
    {
        id: 'welfare_reform',
        conditions: { minDeficit: 80 },
        priority: 76,
        category: 'politics',
        versions: {
            'left': {
                headline: 'War on the Poor: Benefit Cuts Hit Hardest',
                subheading: 'Chancellor targets the most vulnerable to balance the books.'
            },
            'centre-left': {
                headline: 'Controversial Welfare Overhaul Announced',
                subheading: 'New "back to work" rules spark fierce debate over social safety net.'
            },
            'centre-right': {
                headline: 'Making Work Pay: The Benefits of Reform',
                subheading: 'Government seeks to end welfare dependency and boost labour supply.'
            },
            'right': {
                headline: 'END THE SCROUNGE CULTURE',
                subheading: 'Radical plan to get Britain back to work and save billions.'
            },
            'populist-right': {
                headline: 'NO MORE FREE RIDES!',
                subheading: 'Finally, the hardworking taxpayer is being put first.'
            },
            'financial': {
                headline: 'Entitlement Spending Reductions Improve Fiscal Outlook',
                subheading: 'Long-term liabilities reduced by welfare sustainability package.'
            }
        }
    },
    {
        id: 'immigration_debate',
        conditions: { maxApproval: 40 },
        priority: 81,
        category: 'social',
        versions: {
            'left': {
                headline: ' scapegoating: The Truth About Migration',
                subheading: 'Migrants contribute billions, yet politicians use them as a shield for failure.'
            },
            'centre-left': {
                headline: 'Migration Numbers Hit Record Highs',
                subheading: 'Government struggles to balance economic needs with public concerns.'
            },
            'centre-right': {
                headline: 'Controlled Migration: The Skilled Worker Solution',
                subheading: 'New points-based system aims to attract the brightest talent.'
            },
            'right': {
                headline: 'OUT OF CONTROL',
                subheading: 'Broken borders and broken promises as migration numbers surge.'
            },
            'populist-right': {
                headline: 'STOP THE BOATS, CLOSE THE GATES',
                subheading: 'Our infrastructure is at breaking point. When is enough, enough?'
            },
            'financial': {
                headline: 'Labour Shortages Mitigated by Net Inflow',
                subheading: 'Service sector growth supported by robust immigration numbers.'
            }
        }
    }
];
