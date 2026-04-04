/**
 * Social Media Simulation System
 *
 * Simulates social media reactions to the Chancellor's decisions
 */

import React, { useState, useEffect, useCallback } from 'react';
import { SOCIAL_MEDIA_POSTS, SocialPostTemplate, SocialPersona } from './data/social-media-posts';

export interface MinimalStateForSocialMedia {
  metadata?: { currentTurn?: number };
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
  socialMedia?: { recentlyUsedPostIds?: string[] };
  turn?: number;
}

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

export interface TrendingHashtag {
  tag: string;
  posts: number;
  sentiment: 'positive' | 'negative' | 'mixed';
  trending: 'rising' | 'stable' | 'falling';
}

export interface SocialMediaSentiment {
  positive: number;
  negative: number;
  neutral: number;
  trending: 'improving' | 'worsening' | 'stable';
  volume: number;
}

export interface SocialMediaState {
  posts: SocialMediaPost[];
  hashtags: TrendingHashtag[];
  sentiment: SocialMediaSentiment;
  lastUpdate: Date;
}

const INFLUENCERS = {
  journalists: [
    { name: 'Laura Kuenssberg', handle: '@BBCLauraK' },
    { name: 'Robert Peston', handle: '@Peston' },
    { name: 'Paul Mason', handle: '@paulmasonnews' },
    { name: 'Isabel Oakeshott', handle: '@IsabelOakeshott' },
    { name: 'Beth Rigby', handle: '@BethRigby' },
  ],
  economists: [
    { name: 'Paul Johnson', handle: '@PJTheEconomist' },
    { name: 'Torsten Bell', handle: '@TorstenBell' },
    { name: 'Frances Coppola', handle: '@Frances_Coppola' },
  ],
  politicians: [
    { name: 'Rishi Sunak', handle: '@RishiSunak' },
    { name: 'Ed Davey', handle: '@daisy_davey' },
    { name: 'Nigel Farage', handle: '@Nigel_Farage' },
    { name: 'Stephen Flynn', handle: '@StephenFlynnSNP' },
  ],
};

function getDetailedTaxRate(state: MinimalStateForSocialMedia, id: string, fallback: number): number {
  const taxes = state.fiscal?.detailedTaxes;
  if (!Array.isArray(taxes)) return fallback;
  const found = taxes.find((tax) => tax.id === id);
  return found?.currentRate ?? fallback;
}

function checkSocialPostConditions(
  conditions: SocialPostTemplate['conditions'],
  state: MinimalStateForSocialMedia
): boolean {
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

  const hasWealthTax = getDetailedTaxRate(state, 'wealthTax', 0) > 0;
  if (conditions.wealthTax && !hasWealthTax) return false;

  const isAusterity = deficit < 30 && (state.services?.nhsQuality ?? 60) < 55;
  if (conditions.spendingCuts && !isAusterity) return false;
  if (conditions.pensionCuts && approval > 30) return false;

  const taxRate = state.economy?.taxRate ?? 20;
  const isHighTax = taxRate > 22 || (state.fiscal?.vatRate ?? 20) > 20;
  if (conditions.taxRises && !isHighTax) return false;

  return true;
}

export function calculateSocialMediaSentiment(state: MinimalStateForSocialMedia): SocialMediaSentiment {
  const approval = state.political?.publicApproval ?? state.political?.governmentApproval ?? 50;
  const growth = state.economy?.growthRate ?? state.economy?.gdpGrowthAnnual ?? 2;
  const unemployment = state.economy?.unemployment ?? state.economy?.unemploymentRate ?? 4;
  const inflation = state.economy?.inflation ?? state.economy?.inflationCPI ?? 2;

  let positive = approval * 0.6;
  let negative = (100 - approval) * 0.5;
  let neutral = 100 - positive - negative;

  if (growth > 2.5) positive += 10;
  if (growth < 1) negative += 15;
  if (unemployment > 5) negative += 10;
  if (inflation > 3) negative += 10;
  if (inflation < 2) positive += 5;

  const total = positive + negative + neutral;
  positive = (positive / total) * 100;
  negative = (negative / total) * 100;
  neutral = (neutral / total) * 100;

  let trending: 'improving' | 'worsening' | 'stable' = 'stable';
  if (positive > 50) trending = 'improving';
  else if (negative > 50) trending = 'worsening';

  const volume = Math.min(100, 50 + Math.abs(50 - approval) * 0.8);

  return {
    positive: Math.round(positive),
    negative: Math.round(negative),
    neutral: Math.round(neutral),
    trending,
    volume: Math.round(volume),
  };
}

export function generateTrendingHashtags(state: MinimalStateForSocialMedia): TrendingHashtag[] {
  const hashtags: TrendingHashtag[] = [];
  const approval = state.political?.publicApproval ?? state.political?.governmentApproval ?? 50;
  const growth = state.economy?.growthRate ?? state.economy?.gdpGrowthAnnual ?? 2;
  const backbenchSatisfaction = state.political?.backbenchSatisfaction ?? 50;

  hashtags.push({
    tag: '#Budget',
    posts: Math.floor(15000 + Math.random() * 10000),
    sentiment: approval > 50 ? 'positive' : approval > 35 ? 'mixed' : 'negative',
    trending: 'stable',
  });

  if (approval < 35)
    hashtags.push({
      tag: '#ToriesInDisguise',
      posts: Math.floor(8000 + Math.random() * 5000),
      sentiment: 'negative',
      trending: 'rising',
    });
  if (approval > 60)
    hashtags.push({
      tag: '#LabourDelivering',
      posts: Math.floor(6000 + Math.random() * 4000),
      sentiment: 'positive',
      trending: 'stable',
    });
  if (growth < 1)
    hashtags.push({
      tag: '#RecessionUK',
      posts: Math.floor(12000 + Math.random() * 8000),
      sentiment: 'negative',
      trending: 'rising',
    });
  if (growth > 2.5)
    hashtags.push({
      tag: '#EconomicRecovery',
      posts: Math.floor(5000 + Math.random() * 3000),
      sentiment: 'positive',
      trending: 'stable',
    });
  if (backbenchSatisfaction < 40)
    hashtags.push({
      tag: '#LabourCivilWar',
      posts: Math.floor(7000 + Math.random() * 4000),
      sentiment: 'negative',
      trending: 'rising',
    });
  if (state.economy?.inflation && state.economy.inflation > 3)
    hashtags.push({
      tag: '#CostOfLiving',
      posts: Math.floor(10000 + Math.random() * 5000),
      sentiment: 'negative',
      trending: 'rising',
    });

  return hashtags.slice(0, 4);
}

function resolveAuthor(persona: SocialPersona): {
  name: string;
  handle: string;
  type: SocialMediaPost['authorType'];
  verified: boolean;
} {
  switch (persona) {
    case 'journalist_serious':
    case 'journalist_tabloid': {
      const j = INFLUENCERS.journalists[Math.floor(Math.random() * INFLUENCERS.journalists.length)];
      return { name: j.name, handle: j.handle, type: 'journalist', verified: true };
    }
    case 'economist_academic':
    case 'economist_city': {
      const e = INFLUENCERS.economists[Math.floor(Math.random() * INFLUENCERS.economists.length)];
      return { name: e.name, handle: e.handle, type: 'economist', verified: true };
    }
    case 'mp_loyal':
    case 'mp_rebel':
    case 'mp_opposition': {
      const p = INFLUENCERS.politicians[Math.floor(Math.random() * INFLUENCERS.politicians.length)];
      return { name: p.name, handle: p.handle, type: 'politician', verified: true };
    }
    default: {
      const names = ['James', 'Sarah', 'Mohammed', 'Emma', 'Priya', 'Tom', 'Olivia', 'Fatima', 'Daniel', 'Nadia'];
      const cities = ['London', 'Manchester', 'Birmingham', 'Leeds', 'Glasgow', 'Cardiff', 'Bristol'];
      const name = names[Math.floor(Math.random() * names.length)];
      return {
        name: `${name} from ${cities[Math.floor(Math.random() * cities.length)]}`,
        handle: `@${name.toLowerCase()}${Math.floor(Math.random() * 9999)}`,
        type: 'citizen',
        verified: false,
      };
    }
  }
}

export function generateSocialMediaPosts(
  state: MinimalStateForSocialMedia,
  sentiment: SocialMediaSentiment,
  hashtags: TrendingHashtag[]
): { posts: SocialMediaPost[]; usedTemplateIds: string[] } {
  const currentTurn = state.metadata?.currentTurn ?? state.turn ?? 0;
  const recent = state.socialMedia?.recentlyUsedPostIds || [];
  const blockedWithinWindow = new Set(
    recent
      .map((entry) => {
        const [turnRaw, templateId] = String(entry).split(':');
        const turn = Number(turnRaw);
        return Number.isFinite(turn) && currentTurn - turn <= 2 ? templateId : null;
      })
      .filter((value): value is string => !!value)
  );

  const validTemplates = SOCIAL_MEDIA_POSTS.filter((t) => checkSocialPostConditions(t.conditions, state));
  if (validTemplates.length === 0) return { posts: [], usedTemplateIds: [] };

  const eligibleTemplates = validTemplates.filter((template) => !blockedWithinWindow.has(template.id));
  const selectionPool = eligibleTemplates.length > 0 ? eligibleTemplates : validTemplates;

  const posts: SocialMediaPost[] = [];
  const usedTemplateIds: string[] = [];
  const count = 5 + Math.floor(Math.random() * 3);

  for (let i = 0; i < count; i++) {
    const template = selectionPool[Math.floor(Math.random() * selectionPool.length)];
    const authorInfo = resolveAuthor(template.persona);
    const contentTemplate = template.templates[Math.floor(Math.random() * template.templates.length)];
    usedTemplateIds.push(template.id);

    const content = contentTemplate
      .replace('{growth}', (state.economy?.gdpGrowthAnnual ?? 0).toFixed(1))
      .replace('{inflation}', (state.economy?.inflationCPI ?? 0).toFixed(1));

    posts.push({
      id: `post-${Date.now()}-${i}`,
      author: authorInfo.name,
      authorType: authorInfo.type,
      handle: authorInfo.handle,
      content,
      sentiment: template.sentiment,
      likes: Math.floor(Math.random() * 5000) + 10,
      retweets: Math.floor(Math.random() * 1000) + 1,
      timestamp: new Date(Date.now() - i * 300000),
      verified: authorInfo.verified,
    });
  }

  return {
    posts: posts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
    usedTemplateIds: Array.from(new Set(usedTemplateIds)),
  };
}

export function calculateSocialMediaImpact(sentiment: SocialMediaSentiment): number {
  const baseImpact = (sentiment.positive - sentiment.negative) / 50;
  const volumeMultiplier = sentiment.volume / 100;
  return baseImpact * volumeMultiplier * 4.0;
}

// ============================================================================
// COMPACT PULSE STRIP — replaces the old full sidebar
// ============================================================================

export const SocialMediaPulseStrip: React.FC<{ state: MinimalStateForSocialMedia }> = ({ state }) => {
  const [socialMedia, setSocialMedia] = useState<SocialMediaState | null>(null);

  const refresh = useCallback(() => {
    const sentiment = calculateSocialMediaSentiment(state);
    const hashtags = generateTrendingHashtags(state);
    const generated = generateSocialMediaPosts(state, sentiment, hashtags);
    setSocialMedia({ posts: generated.posts, hashtags, sentiment, lastUpdate: new Date() });
  }, [state]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!socialMedia) return null;

  const { sentiment, hashtags, posts } = socialMedia;

  return (
    <div className="border-l border-border-strong bg-bg-surface flex flex-col h-full" style={{ width: 220 }}>
      {/* Sentiment bar */}
      <div className="px-4 pt-4 pb-3 border-b border-border-subtle">
        <div className="treasury-kicker mb-2">Public Sentiment</div>
        <div className="flex h-2 overflow-hidden mb-1.5">
          <div className="bg-good" style={{ width: `${sentiment.positive}%` }} />
          <div className="bg-neutral" style={{ width: `${sentiment.neutral}%` }} />
          <div className="bg-bad" style={{ width: `${sentiment.negative}%` }} />
        </div>
        <div className="flex justify-between text-xs font-mono">
          <span className="text-good">+{sentiment.positive}</span>
          <span className="text-muted">{sentiment.neutral}</span>
          <span className="text-bad">−{sentiment.negative}</span>
        </div>
        <div className="mt-1 text-xs text-muted">
          {sentiment.trending === 'improving'
            ? 'Improving'
            : sentiment.trending === 'worsening'
              ? 'Worsening'
              : 'Stable'}
          {sentiment.volume > 70 ? ' · High volume' : ''}
        </div>
      </div>

      {/* Trending */}
      <div className="px-4 py-3 border-b border-border-subtle">
        <div className="treasury-kicker mb-2">Trending</div>
        <div className="space-y-1">
          {hashtags.slice(0, 3).map((h, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="font-mono text-primary">{h.tag}</span>
              {h.trending === 'rising' && <span className="text-bad text-[10px] uppercase">rising</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Latest post */}
      {posts.length > 0 && (
        <div className="px-4 py-3 flex-1 overflow-y-auto">
          <div className="treasury-kicker mb-2">Latest</div>
          <div className="text-xs text-secondary leading-snug mb-1">{posts[0].content}</div>
          <div className="text-[10px] text-muted font-mono">{posts[0].handle}</div>
        </div>
      )}
    </div>
  );
};

// Legacy export — kept for compatibility, now just renders the pulse strip
export const SocialMediaSidebar: React.FC<{ state: MinimalStateForSocialMedia }> = ({ state }) => {
  return <SocialMediaPulseStrip state={state} />;
};

export default SocialMediaSidebar;
