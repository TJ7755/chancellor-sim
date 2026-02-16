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
import { SOCIAL_MEDIA_POSTS, SocialPostTemplate, SocialPersona } from './data/social-media-posts';

// Minimum state interface required for social media simulation
// Works with both GameState and SimulationState (dashboard)
export interface MinimalStateForSocialMedia {
  political?: {
    publicApproval?: number;
    backbenchSatisfaction?: number;
    governmentApproval?: number;
    party?: string;
  };
  economy?: {
    growthRate?: number;
    unemployment?: number;
    inflation?: number;
    taxRate?: number;
    gdpGrowthAnnual?: number;
    unemploymentRate?: number;
    inflationCPI?: number;
    wageGrowthReal?: number;
  };
  services?: {
    nhsQuality?: number;
    educationQuality?: number;
    infrastructureQuality?: number;
    mentalHealthAccess?: number;
    prisonSafety?: number;
    courtBacklogPerformance?: number;
    policingEffectiveness?: number;
  };
  fiscal?: {
    vatRate?: number;
    corporationTaxRate?: number;
    detailedTaxes?: Array<{ id: string; currentRate: number }>;
    deficit_bn?: number;
    debtToGdpPercent?: number;
  };
  turn?: number;
}

// Social media post interface
export interface SocialMediaPost {
  id: string;
  author: string;
  authorType: 'citizen' | 'journalist' | 'economist' | 'politician' | 'activist' | 'business' | 'union';
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
    { name: 'Nigel Farage', handle: '@Nigel_Farage', party: 'Reform' },
    { name: 'Stephen Flynn', handle: '@StephenFlynnSNP', party: 'SNP' },
  ],
  activists: [
    { name: 'Owen Jones', handle: '@OwenJones84', leaning: 'left' },
    { name: 'Aaron Bastani', handle: '@AaronBastani', leaning: 'left' },
    { name: 'Nigel Farage', handle: '@Nigel_Farage', leaning: 'right' },
    { name: 'Ash Sarkar', handle: '@AyoCaesar', leaning: 'left' },
  ],
  business: [
    { name: 'Alison Rose', handle: '@AlisonRoseUK', organisation: 'UK Finance' },
    { name: 'Miles Celic', handle: '@Miles_Celic', organisation: 'TheCityUK' },
    { name: 'Emma Bridgewater', handle: '@BritishMakerCEO', organisation: 'SME Federation' },
  ],
  unions: [
    { name: 'Mick Lynch', handle: '@RMTunion', organisation: 'RMT' },
    { name: 'Sharon Graham', handle: '@UniteSharon', organisation: 'Unite' },
    { name: 'Paul Nowak', handle: '@nowak_paul', organisation: 'TUC' },
  ]
};

function getDetailedTaxRate(state: MinimalStateForSocialMedia, id: string, fallback: number): number {
  const taxes = state.fiscal?.detailedTaxes;
  if (!Array.isArray(taxes)) return fallback;
  const found = taxes.find((tax) => tax.id === id);
  return found?.currentRate ?? fallback;
}

// Check if conditions for a post are met
function checkSocialPostConditions(conditions: SocialPostTemplate['conditions'], state: MinimalStateForSocialMedia): boolean {
  if (!conditions) return true;

  const gdpGrowth = state.economy?.gdpGrowthAnnual ?? state.economy?.growthRate ?? 0;
  const inflation = state.economy?.inflationCPI ?? state.economy?.inflation ?? 2;
  const unemployment = state.economy?.unemploymentRate ?? state.economy?.unemployment ?? 4;
  const approval = state.political?.publicApproval ?? state.political?.governmentApproval ?? 50;
  const deficit = state.fiscal?.deficit_bn ?? 50;

  if (conditions.minGdpGrowth !== undefined && gdpGrowth < conditions.minGdpGrowth) return false;
  if (conditions.maxGdpGrowth !== undefined && gdpGrowth > conditions.maxGdpGrowth) return false;

  if (conditions.minInflation !== undefined && inflation < conditions.minInflation) return false;

  if (conditions.minUnemployment !== undefined && unemployment < conditions.minUnemployment) return false;

  if (conditions.minApproval !== undefined && approval < conditions.minApproval) return false;
  if (conditions.maxApproval !== undefined && approval > conditions.maxApproval) return false;

  if (conditions.minDeficit !== undefined && deficit < conditions.minDeficit) return false;
  if (conditions.maxDeficit !== undefined && deficit > conditions.maxDeficit) return false;

  // Helper to check specific tax existence
  const hasWealthTax = getDetailedTaxRate(state, 'wealthTax', 0) > 0;

  if (conditions.wealthTax && !hasWealthTax) return false;

  // Heuristic for spending cuts: Low deficit + Poor services
  // If deficit is low (< 20bn) AND NHS quality is poor (< 50), assume cuts are happening
  const isAusterity = (deficit < 30) && ((state.services?.nhsQuality ?? 60) < 55);
  if (conditions.spendingCuts && !isAusterity) return false;

  // Heuristic for pension cuts: very low approval among elderly? (Approximated by general low approval + low deficit)
  // or just random chance if approval is tanking
  if (conditions.pensionCuts) {
    if (approval > 30) return false; // Only trigger pension anger if things are already bad
  }

  // Tax rises heuristic
  const taxRate = state.economy?.taxRate ?? 20;
  // Assume tax rises if main rate > 22 OR VAT > 20
  const isHighTax = taxRate > 22 || (state.fiscal?.vatRate ?? 20) > 20;
  if (conditions.taxRises && !isHighTax) return false;

  return true;
}

// Generate sentiment based on game state
export function calculateSocialMediaSentiment(state: MinimalStateForSocialMedia): SocialMediaSentiment {
  const approval = state.political?.publicApproval ?? state.political?.governmentApproval ?? 50;
  const growth = state.economy?.growthRate ?? state.economy?.gdpGrowthAnnual ?? 2;
  const unemployment = state.economy?.unemployment ?? state.economy?.unemploymentRate ?? 4;
  const inflation = state.economy?.inflation ?? state.economy?.inflationCPI ?? 2;
  const mentalHealthAccess = state.services?.mentalHealthAccess ?? 55;
  const prisonSafety = state.services?.prisonSafety ?? 50;
  const courtBacklogPerformance = state.services?.courtBacklogPerformance ?? 50;
  const vatRate = state.fiscal?.vatRate ?? state.economy?.taxRate ?? 20;
  const vatDomesticEnergy = getDetailedTaxRate(state, 'vatDomesticEnergy', 5);
  const energyProfitsLevy = getDetailedTaxRate(state, 'energyProfitsLevy', 35);

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
  if (mentalHealthAccess < 50) negative += 8;
  if (prisonSafety < 48) negative += 6;
  if (courtBacklogPerformance < 50) negative += 6;
  if (vatRate > 20) negative += (vatRate - 20) * 2.5;
  if (vatDomesticEnergy > 5) negative += (vatDomesticEnergy - 5) * 1.8;
  if (energyProfitsLevy > 40) positive += 2;

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
  const mentalHealthAccess = state.services?.mentalHealthAccess ?? 55;
  const prisonSafety = state.services?.prisonSafety ?? 50;
  const vatRate = state.fiscal?.vatRate ?? 20;
  const vatDomesticEnergy = getDetailedTaxRate(state, 'vatDomesticEnergy', 5);

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

  if (vatRate > 20 || vatDomesticEnergy > 5) {
    hashtags.push({
      tag: '#VATRise',
      posts: Math.floor(7000 + Math.random() * 5000),
      sentiment: 'negative',
      trending: 'rising',
    });
  }

  if (mentalHealthAccess < 50) {
    hashtags.push({
      tag: '#MentalHealthCrisis',
      posts: Math.floor(6500 + Math.random() * 4000),
      sentiment: 'negative',
      trending: 'rising',
    });
  }

  if (prisonSafety < 45) {
    hashtags.push({
      tag: '#PrisonOvercrowding',
      posts: Math.floor(4500 + Math.random() * 3000),
      sentiment: 'negative',
      trending: 'rising',
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

function resolveAuthor(persona: SocialPersona): { name: string; handle: string; type: SocialMediaPost['authorType']; verified: boolean } {
  const names = ['James', 'Sarah', 'Mohammed', 'Emma', 'David', 'Priya', 'Tom', 'Olivia', 'Jack', 'Zara', 'Fatima', 'Harry', 'Sophie'];
  const cities = ['London', 'Manchester', 'Birmingham', 'Leeds', 'Liverpool', 'Glasgow', 'Cardiff', 'Bristol', 'Newcastle'];

  switch (persona) {
    case 'journalist_serious':
    case 'journalist_tabloid': {
      const journalist = INFLUENCERS.journalists[Math.floor(Math.random() * INFLUENCERS.journalists.length)];
      return { name: journalist.name, handle: journalist.handle, type: 'journalist', verified: true };
    }
    case 'economist_academic':
    case 'economist_city': {
      const economist = INFLUENCERS.economists[Math.floor(Math.random() * INFLUENCERS.economists.length)];
      return { name: economist.name, handle: economist.handle, type: 'economist', verified: true };
    }
    case 'mp_loyal':
    case 'mp_rebel':
    case 'mp_opposition': {
      const politician = INFLUENCERS.politicians[Math.floor(Math.random() * INFLUENCERS.politicians.length)];
      return { name: politician.name, handle: politician.handle, type: 'politician', verified: true };
    }
    case 'business_leader': {
      const business = INFLUENCERS.business[Math.floor(Math.random() * INFLUENCERS.business.length)];
      return { name: business.name, handle: business.handle, type: 'business', verified: true };
    }
    case 'union_leader': {
      const union = INFLUENCERS.unions[Math.floor(Math.random() * INFLUENCERS.unions.length)];
      return { name: union.name, handle: union.handle, type: 'union', verified: true };
    }
    case 'activist_left':
    case 'activist_right': {
      const activist = INFLUENCERS.activists[Math.floor(Math.random() * INFLUENCERS.activists.length)];
      return { name: activist.name, handle: activist.handle, type: 'activist', verified: true };
    }
    case 'public_angry':
    case 'public_happy':
    case 'public_neutral':
    default: {
      const name = names[Math.floor(Math.random() * names.length)];
      return {
        name: `${name} from ${cities[Math.floor(Math.random() * cities.length)]}`,
        handle: `@${name.toLowerCase()}${Math.floor(Math.random() * 9999)}`,
        type: 'citizen',
        verified: false
      };
    }
  }
}

// Generate social media posts based on game state
export function generateSocialMediaPosts(
  state: MinimalStateForSocialMedia,
  sentiment: SocialMediaSentiment,
  hashtags: TrendingHashtag[]
): SocialMediaPost[] {
  // 1. Filter valid posts from data
  const validTemplates = SOCIAL_MEDIA_POSTS.filter(t => checkSocialPostConditions(t.conditions, state));

  if (validTemplates.length === 0) return []; // Should not happen given generic options

  const posts: SocialMediaPost[] = [];
  const count = 5 + Math.floor(Math.random() * 3); // 5-7 posts

  // 2. Select templates (weighted by relevance? random for now)
  for (let i = 0; i < count; i++) {
    const template = validTemplates[Math.floor(Math.random() * validTemplates.length)];
    const authorInfo = resolveAuthor(template.persona);
    const contentTemplate = template.templates[Math.floor(Math.random() * template.templates.length)];

    // Replace placeholders if any (none currently used in strict templates, but good practice)
    const content = contentTemplate
      .replace('{growth}', ((state.economy?.gdpGrowthAnnual ?? 0)).toFixed(1))
      .replace('{inflation}', ((state.economy?.inflationCPI ?? 0)).toFixed(1));

    posts.push({
      id: `post-${Date.now()}-${i}`,
      author: authorInfo.name,
      authorType: authorInfo.type,
      handle: authorInfo.handle,
      content: content,
      sentiment: template.sentiment,
      likes: Math.floor(Math.random() * 5000) + 10,
      retweets: Math.floor(Math.random() * 1000) + 1,
      timestamp: new Date(Date.now() - (i * 300000)), // Staggered
      verified: authorInfo.verified
    });
  }

  return posts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

// CRITICAL FIX: Social media impact amplified to be meaningful
// Modern politics: social media IS a major driver of public opinion
// Range: -8 to +8 points per turn (was -1 to +1, essentially pointless)
export function calculateSocialMediaImpact(sentiment: SocialMediaSentiment): number {
  const baseImpact = (sentiment.positive - sentiment.negative) / 50; // -2 to +2
  const volumeMultiplier = sentiment.volume / 100; // 0 to 1

  // Amplified: 4x multiplier instead of 0.5x
  // When social media is very negative (80% negative sentiment) + high volume (100%):
  // Impact = (-80-20)/50 * 1.0 * 4.0 = -2.0 * 4.0 = -8 points
  // When positive (70% positive) + high volume: +3 * 4.0 = +6 points
  return baseImpact * volumeMultiplier * 4.0;
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
          <span className={`font-semibold ${socialMedia.sentiment.trending === 'improving' ? 'text-green-700' :
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
