/**
 * Social Media Simulation System
 *
 * Simulates social media reactions to the Chancellor's decisions
 * Includes:
 * - Trending hashtags
 * - Simulated posts/tweets
 * - Sentiment tracking (positive/negative/neutral)
 * - Influencer reactions (journalists, economists, commentators)
 */

import React, { useState, useEffect } from 'react';

// Minimum state interface required for social media simulation
// Works with both GameState and SimulationState (dashboard)
export interface MinimalStateForSocialMedia {
  political?: {
    publicApproval?: number;
    backbenchSatisfaction?: number;
    governmentApproval?: number;
  };
  economy?: {
    growthRate?: number;
    unemployment?: number;
    inflation?: number;
    taxRate?: number;
    gdpGrowthAnnual?: number;
    unemploymentRate?: number;
    inflationCPI?: number;
  };
  turn?: number;
}

// Social media post interface
export interface SocialMediaPost {
  id: string;
  author: string;
  authorType: 'citizen' | 'journalist' | 'economist' | 'politician' | 'activist';
  handle: string;
  content: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  likes: number;
  retweets: number;
  timestamp: Date;
  verified: boolean;
}

// Trending hashtag interface
export interface TrendingHashtag {
  tag: string;
  posts: number;
  sentiment: 'positive' | 'negative' | 'mixed';
  trending: 'rising' | 'stable' | 'falling';
}

// Social media sentiment state
export interface SocialMediaSentiment {
  positive: number;      // 0-100
  negative: number;      // 0-100
  neutral: number;       // 0-100
  trending: 'improving' | 'worsening' | 'stable';
  volume: number;        // How much people are talking about it (0-100)
}

// Social media state
export interface SocialMediaState {
  posts: SocialMediaPost[];
  hashtags: TrendingHashtag[];
  sentiment: SocialMediaSentiment;
  lastUpdate: Date;
}

// Influential commentators
const INFLUENCERS = {
  journalists: [
    { name: 'Laura Kuenssberg', handle: '@BBCLauraK', outlet: 'BBC' },
    { name: 'Robert Peston', handle: '@Peston', outlet: 'ITV' },
    { name: 'Paul Mason', handle: '@paulmasonnews', outlet: 'Novara' },
    { name: 'Isabel Oakeshott', handle: '@IsabelOakeshott', outlet: 'Talk TV' },
    { name: 'Beth Rigby', handle: '@BethRigby', outlet: 'Sky News' },
    { name: 'Pippa Crerar', handle: '@PippaCrerar', outlet: 'Guardian' },
  ],
  economists: [
    { name: 'Paul Johnson', handle: '@PJTheEconomist', outlet: 'IFS' },
    { name: 'Torsten Bell', handle: '@TorstenBell', outlet: 'Resolution Foundation' },
    { name: 'Frances Coppola', handle: '@Frances_Coppola', outlet: 'Independent' },
    { name: 'Grace Blakeley', handle: '@graceblakeley', outlet: 'Tribune' },
  ],
  politicians: [
    { name: 'Rishi Sunak', handle: '@RishiSunak', party: 'Conservative' },
    { name: 'Jeremy Hunt', handle: '@Jeremy_Hunt', party: 'Conservative' },
    { name: 'Ed Davey', handle: '@daisy_davey', party: 'Lib Dem' },
  ],
  activists: [
    { name: 'Owen Jones', handle: '@OwenJones84', leaning: 'left' },
    { name: 'Aaron Bastani', handle: '@AaronBastani', leaning: 'left' },
    { name: 'Nigel Farage', handle: '@Nigel_Farage', leaning: 'right' },
  ],
};

// Generate sentiment based on game state
export function calculateSocialMediaSentiment(state: MinimalStateForSocialMedia): SocialMediaSentiment {
  const approval = state.political?.publicApproval ?? state.political?.governmentApproval ?? 50;
  const growth = state.economy?.growthRate ?? state.economy?.gdpGrowthAnnual ?? 2;
  const unemployment = state.economy?.unemployment ?? state.economy?.unemploymentRate ?? 4;
  const inflation = state.economy?.inflation ?? state.economy?.inflationCPI ?? 2;

  // Base sentiment on approval rating
  let positive = approval * 0.6; // 0-60
  let negative = (100 - approval) * 0.5; // 0-50
  let neutral = 100 - positive - negative;

  // Adjust for economic factors
  if (growth > 2.5) positive += 10;
  if (growth < 1) negative += 15;
  if (unemployment > 5) negative += 10;
  if (inflation > 3) negative += 10;
  if (inflation < 2) positive += 5;

  // Normalise to 100
  const total = positive + negative + neutral;
  positive = (positive / total) * 100;
  negative = (negative / total) * 100;
  neutral = (neutral / total) * 100;

  // Determine trending direction
  let trending: 'improving' | 'worsening' | 'stable' = 'stable';
  if (positive > 50) trending = 'improving';
  else if (negative > 50) trending = 'worsening';

  // Volume based on how dramatic the decisions are
  const volume = Math.min(100, 50 + (Math.abs(50 - approval)) * 0.8);

  return {
    positive: Math.round(positive),
    negative: Math.round(negative),
    neutral: Math.round(neutral),
    trending,
    volume: Math.round(volume),
  };
}

// Generate trending hashtags based on recent events
export function generateTrendingHashtags(state: MinimalStateForSocialMedia, recentEvents?: string[]): TrendingHashtag[] {
  const hashtags: TrendingHashtag[] = [];
  const approval = state.political?.publicApproval ?? state.political?.governmentApproval ?? 50;
  const growth = state.economy?.growthRate ?? state.economy?.gdpGrowthAnnual ?? 2;
  const backbenchSatisfaction = state.political?.backbenchSatisfaction ?? 50;

  // Always include budget-related hashtag
  hashtags.push({
    tag: '#Budget2024',
    posts: Math.floor(15000 + Math.random() * 10000),
    sentiment: approval > 50 ? 'positive' : approval > 35 ? 'mixed' : 'negative',
    trending: 'rising',
  });

  // Add hashtags based on approval
  if (approval < 35) {
    hashtags.push({
      tag: '#ToriesInDisguise',
      posts: Math.floor(8000 + Math.random() * 5000),
      sentiment: 'negative',
      trending: 'rising',
    });
  }

  if (approval > 60) {
    hashtags.push({
      tag: '#LabourDelivering',
      posts: Math.floor(6000 + Math.random() * 4000),
      sentiment: 'positive',
      trending: 'rising',
    });
  }

  // Economic hashtags
  if (growth < 1) {
    hashtags.push({
      tag: '#RecessionUK',
      posts: Math.floor(12000 + Math.random() * 8000),
      sentiment: 'negative',
      trending: 'rising',
    });
  }

  if (growth > 2.5) {
    hashtags.push({
      tag: '#EconomicRecovery',
      posts: Math.floor(5000 + Math.random() * 3000),
      sentiment: 'positive',
      trending: 'stable',
    });
  }

  // Backbench rebellion hashtags
  if (backbenchSatisfaction < 40) {
    hashtags.push({
      tag: '#LabourCivilWar',
      posts: Math.floor(7000 + Math.random() * 4000),
      sentiment: 'negative',
      trending: 'rising',
    });
  }

  // Tax-related if there are tax increases (we'll need to detect this from state)
  if (state.economy?.taxRate && state.economy.taxRate > 35) {
    hashtags.push({
      tag: '#TaxBurden',
      posts: Math.floor(6000 + Math.random() * 3000),
      sentiment: 'negative',
      trending: 'stable',
    });
  }

  // Cost of living
  if (state.economy?.inflation && state.economy.inflation > 3) {
    hashtags.push({
      tag: '#CostOfLivingCrisis',
      posts: Math.floor(10000 + Math.random() * 5000),
      sentiment: 'negative',
      trending: 'rising',
    });
  }

  return hashtags.slice(0, 5); // Return top 5
}

// Generate social media posts based on game state
export function generateSocialMediaPosts(
  state: MinimalStateForSocialMedia,
  sentiment: SocialMediaSentiment,
  hashtags: TrendingHashtag[]
): SocialMediaPost[] {
  const posts: SocialMediaPost[] = [];
  const approval = state.political?.publicApproval ?? state.political?.governmentApproval ?? 50;
  const growth = state.economy?.growthRate ?? state.economy?.gdpGrowthAnnual ?? 2;
  const backbenchSatisfaction = state.political?.backbenchSatisfaction ?? 50;

  // Function to pick random influencer
  const pickInfluencer = <T extends keyof typeof INFLUENCERS>(type: T): typeof INFLUENCERS[T][number] => {
    const influencers = INFLUENCERS[type];
    return influencers[Math.floor(Math.random() * influencers.length)];
  };

  // Generate journalist posts
  if (approval < 40) {
    const journalist = pickInfluencer('journalists');
    posts.push({
      id: `post-${Date.now()}-1`,
      author: journalist.name,
      authorType: 'journalist',
      handle: journalist.handle,
      content: `BREAKING: Latest polling shows Chancellor's approval at ${Math.round(approval)}% - lowest since appointment. ${hashtags[0]?.tag || '#Budget2024'}`,
      sentiment: 'negative',
      likes: Math.floor(2000 + Math.random() * 5000),
      retweets: Math.floor(500 + Math.random() * 2000),
      timestamp: new Date(),
      verified: true,
    });
  }

  if (backbenchSatisfaction < 40) {
    const journalist = pickInfluencer('journalists');
    posts.push({
      id: `post-${Date.now()}-2`,
      author: journalist.name,
      authorType: 'journalist',
      handle: journalist.handle,
      content: `Sources in PLP say growing unease about Chancellor's direction. One senior backbencher: "This isn't what we campaigned on." ${hashtags.find(h => h.sentiment === 'negative')?.tag || '#Budget2024'}`,
      sentiment: 'negative',
      likes: Math.floor(1500 + Math.random() * 3000),
      retweets: Math.floor(400 + Math.random() * 1500),
      timestamp: new Date(Date.now() - 120000), // 2 minutes ago
      verified: true,
    });
  }

  // Generate economist posts
  const economist = pickInfluencer('economists');
  if (growth < 1) {
    posts.push({
      id: `post-${Date.now()}-3`,
      author: economist.name,
      authorType: 'economist',
      handle: economist.handle,
      content: `Growth forecast: ${growth.toFixed(1)}%. At this rate, we're looking at stagnation, possibly recession. The Chancellor's fiscal stance appears contractionary at precisely the wrong moment.`,
      sentiment: 'negative',
      likes: Math.floor(1000 + Math.random() * 2000),
      retweets: Math.floor(300 + Math.random() * 1000),
      timestamp: new Date(Date.now() - 300000), // 5 minutes ago
      verified: true,
    });
  } else if (growth > 2.5) {
    posts.push({
      id: `post-${Date.now()}-3`,
      author: economist.name,
      authorType: 'economist',
      handle: economist.handle,
      content: `Interesting Budget. Growth at ${growth.toFixed(1)}% suggests the fiscal multipliers are working. Still early days, but cautiously optimistic about trajectory. ${hashtags.find(h => h.sentiment === 'positive')?.tag || ''}`,
      sentiment: 'positive',
      likes: Math.floor(800 + Math.random() * 1500),
      retweets: Math.floor(200 + Math.random() * 800),
      timestamp: new Date(Date.now() - 300000),
      verified: true,
    });
  }

  // Generate opposition politician posts
  const oppositionMP = pickInfluencer('politicians');
  posts.push({
    id: `post-${Date.now()}-4`,
    author: oppositionMP.name,
    authorType: 'politician',
    handle: oppositionMP.handle,
    content: approval < 40
      ? `This Budget is an insult to working families. Labour promised change, but it's more of the same - higher taxes, broken promises. The British people deserve better.`
      : `The Chancellor seems to think throwing money at problems will solve everything. Where's the fiscal responsibility? Where's the plan for growth?`,
    sentiment: 'negative',
    likes: Math.floor(1200 + Math.random() * 3000),
    retweets: Math.floor(400 + Math.random() * 1200),
    timestamp: new Date(Date.now() - 600000), // 10 minutes ago
    verified: true,
  });

  // Generate activist posts
  const activist = pickInfluencer('activists');
  if (approval < 35 && activist.leaning === 'left') {
    posts.push({
      id: `post-${Date.now()}-5`,
      author: activist.name,
      authorType: 'activist',
      handle: activist.handle,
      content: `Starmer and Reeves betraying the 2024 manifesto. This is Tory-lite. Where's the wealth tax? Where's the Green New Deal? We didn't campaign for THIS. ${hashtags.find(h => h.tag.includes('Tories'))?.tag || ''}`,
      sentiment: 'negative',
      likes: Math.floor(3000 + Math.random() * 8000),
      retweets: Math.floor(1000 + Math.random() * 3000),
      timestamp: new Date(Date.now() - 900000), // 15 minutes ago
      verified: true,
    });
  }

  // Generate citizen posts
  const citizenPosts = generateCitizenPosts(state, sentiment, hashtags, 3);
  posts.push(...citizenPosts);

  return posts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

// Generate citizen posts (regular people)
function generateCitizenPosts(
  state: MinimalStateForSocialMedia,
  sentiment: SocialMediaSentiment,
  hashtags: TrendingHashtag[],
  count: number
): SocialMediaPost[] {
  const posts: SocialMediaPost[] = [];
  const approval = state.political?.publicApproval ?? state.political?.governmentApproval ?? 50;
  const inflation = state.economy?.inflation ?? state.economy?.inflationCPI ?? 2;

  const negativeTemplates = [
    `Can't believe Labour are doing this. This is exactly what the Tories would do. Disgusted. ${hashtags[0]?.tag || ''}`,
    `My taxes went UP and public services are still rubbish. What was the point of voting Labour? ${hashtags[0]?.tag || ''}`,
    `Yet another Budget that hammers working people. When will they learn? ${hashtags[0]?.tag || ''}`,
    `Inflation at ${inflation.toFixed(1)}%, wages stagnant, and they want MORE tax? Absolute joke.`,
    `Remember when Labour promised hope and change? Yeah, me neither anymore. ${hashtags[1]?.tag || ''}`,
  ];

  const positiveTemplates = [
    `Finally, a Budget that invests in our future. This is what we voted for. ${hashtags[0]?.tag || ''}`,
    `Say what you like about Labour, but this Budget is actually pretty sensible. Fair taxation, proper investment.`,
    `Really impressed with the Chancellor's approach. Tough choices, but necessary. ${hashtags.find(h => h.sentiment === 'positive')?.tag || ''}`,
    `This is what competent government looks like. Such a relief after 14 years of chaos.`,
  ];

  const neutralTemplates = [
    `Not sure how I feel about this Budget. Some good bits, some worrying bits. Time will tell. ${hashtags[0]?.tag || ''}`,
    `Interesting Budget. Not what I expected. Let's see how it plays out over the next year.`,
    `Mixed feelings about today. Some bold decisions, some missed opportunities.`,
  ];

  // Generate posts based on sentiment distribution
  for (let i = 0; i < count; i++) {
    const roll = Math.random() * 100;
    let postSentiment: 'positive' | 'negative' | 'neutral';
    let template: string;

    if (roll < sentiment.negative) {
      postSentiment = 'negative';
      template = negativeTemplates[Math.floor(Math.random() * negativeTemplates.length)];
    } else if (roll < sentiment.negative + sentiment.positive) {
      postSentiment = 'positive';
      template = positiveTemplates[Math.floor(Math.random() * positiveTemplates.length)];
    } else {
      postSentiment = 'neutral';
      template = neutralTemplates[Math.floor(Math.random() * neutralTemplates.length)];
    }

    const names = ['James', 'Sarah', 'Mohammed', 'Emma', 'David', 'Priya', 'Tom', 'Olivia', 'Jack', 'Zara'];
    const name = names[Math.floor(Math.random() * names.length)];
    const randomNum = Math.floor(Math.random() * 9999);

    posts.push({
      id: `post-${Date.now()}-citizen-${i}`,
      author: `${name} from ${['London', 'Manchester', 'Birmingham', 'Leeds', 'Liverpool'][Math.floor(Math.random() * 5)]}`,
      authorType: 'citizen',
      handle: `@${name.toLowerCase()}${randomNum}`,
      content: template,
      sentiment: postSentiment,
      likes: Math.floor(5 + Math.random() * 200),
      retweets: Math.floor(1 + Math.random() * 50),
      timestamp: new Date(Date.now() - (i * 180000)), // Stagger by 3 minutes
      verified: false,
    });
  }

  return posts;
}

// Calculate impact on approval (small modifier)
export function calculateSocialMediaImpact(sentiment: SocialMediaSentiment): number {
  // Social media should have a SMALL impact on approval
  // Range: -2 to +2 points per turn
  const baseImpact = (sentiment.positive - sentiment.negative) / 50; // -2 to +2
  const volumeMultiplier = sentiment.volume / 100; // 0 to 1

  return baseImpact * volumeMultiplier * 0.5; // Further reduce to ensure it's minor
}

// Social Media Sidebar Component
export const SocialMediaSidebar: React.FC<{
  state: MinimalStateForSocialMedia;
  onRefresh?: () => void;
}> = ({ state, onRefresh }) => {
  const [socialMedia, setSocialMedia] = useState<SocialMediaState | null>(null);

  // Generate initial social media state
  const refreshSocialMedia = React.useCallback(() => {
    const sentiment = calculateSocialMediaSentiment(state);
    const hashtags = generateTrendingHashtags(state);
    const posts = generateSocialMediaPosts(state, sentiment, hashtags);

    setSocialMedia({
      posts,
      hashtags,
      sentiment,
      lastUpdate: new Date(),
    });

    onRefresh?.();
  }, [state, onRefresh]);

  useEffect(() => {
    refreshSocialMedia();
  }, [refreshSocialMedia]);

  if (!socialMedia) return null;

  const getSentimentColor = (value: number, type: 'positive' | 'negative' | 'neutral') => {
    if (type === 'positive') return 'bg-green-500';
    if (type === 'negative') return 'bg-red-500';
    return 'bg-gray-400';
  };

  const getSentimentIcon = (sentiment: 'positive' | 'negative' | 'neutral') => {
    if (sentiment === 'positive') return '+';
    if (sentiment === 'negative') return '−';
    return '○';
  };

  return (
    <div className="bg-white border-r border-gray-200 h-full overflow-y-auto w-80 flex flex-col">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold">Social Media Pulse</h3>
          <button
            onClick={refreshSocialMedia}
            className="text-white hover:text-blue-200 text-sm"
            title="Refresh feed"
          >
            ↻
          </button>
        </div>
        <div className="text-xs opacity-90">
          {socialMedia.sentiment.volume}% of usual volume
        </div>
      </div>

      {/* Sentiment Meter */}
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <div className="text-xs font-bold text-gray-700 mb-2 uppercase">Public Sentiment</div>
        <div className="flex h-6 rounded-full overflow-hidden mb-2">
          <div
            className={getSentimentColor(socialMedia.sentiment.positive, 'positive')}
            style={{ width: `${socialMedia.sentiment.positive}%` }}
            title={`Positive: ${socialMedia.sentiment.positive}%`}
          />
          <div
            className={getSentimentColor(socialMedia.sentiment.neutral, 'neutral')}
            style={{ width: `${socialMedia.sentiment.neutral}%` }}
            title={`Neutral: ${socialMedia.sentiment.neutral}%`}
          />
          <div
            className={getSentimentColor(socialMedia.sentiment.negative, 'negative')}
            style={{ width: `${socialMedia.sentiment.negative}%` }}
            title={`Negative: ${socialMedia.sentiment.negative}%`}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-600">
          <span className="text-green-700">+ {socialMedia.sentiment.positive}%</span>
          <span className="text-gray-600">○ {socialMedia.sentiment.neutral}%</span>
          <span className="text-red-700">− {socialMedia.sentiment.negative}%</span>
        </div>
        <div className="mt-2 text-xs text-center">
          <span className={`font-semibold ${
            socialMedia.sentiment.trending === 'improving' ? 'text-green-700' :
            socialMedia.sentiment.trending === 'worsening' ? 'text-red-700' :
            'text-gray-600'
          }`}>
            {socialMedia.sentiment.trending === 'improving' ? '↑ Improving' :
             socialMedia.sentiment.trending === 'worsening' ? '↓ Worsening' :
             '→ Stable'}
          </span>
        </div>
      </div>

      {/* Trending Hashtags */}
      <div className="p-4 border-b border-gray-200">
        <div className="text-xs font-bold text-gray-700 mb-2 uppercase">Trending Now</div>
        <div className="space-y-2">
          {socialMedia.hashtags.map((hashtag, idx) => (
            <div key={idx} className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <span className="text-blue-600 font-semibold">{hashtag.tag}</span>
                {hashtag.trending === 'rising' && <span className="text-xs font-bold text-red-600">[RISING]</span>}
              </div>
              <div className="text-xs text-gray-500">
                {(hashtag.posts / 1000).toFixed(1)}K posts
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Posts Feed */}
      <div className="flex-1 overflow-y-auto">
        <div className="text-xs font-bold text-gray-700 p-4 pb-2 uppercase">Recent Posts</div>
        <div className="space-y-3 p-4 pt-2">
          {socialMedia.posts.map((post) => (
            <div key={post.id} className="border border-gray-200 rounded-lg p-3 bg-white hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center space-x-2">
                  <div className="font-semibold text-sm">{post.author}</div>
                  {post.verified && <span className="text-blue-500 text-xs">✓</span>}
                </div>
                <span className="text-lg">{getSentimentIcon(post.sentiment)}</span>
              </div>
              <div className="text-xs text-gray-600 mb-2">{post.handle}</div>
              <div className="text-sm text-gray-800 mb-2 leading-snug">{post.content}</div>
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                <span>Comments: {Math.floor(post.likes / 10)}</span>
                <span>Shares: {post.retweets}</span>
                <span>Likes: {post.likes}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SocialMediaSidebar;
