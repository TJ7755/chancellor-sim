// Step 16: Trigger Events & Newspaper

import { GameState } from '../../types';
import { DifficultySettings } from '../game/difficulty';
import { generateEvents, generateNewspaper, RandomEvent, NewsArticle } from '../../events-media';
import { renderSectorHeadline } from '../../data/sector-revolts';
import { getFiscalRuleById } from '../../game-integration';
import { getDetailedTaxRate } from './shared-helpers';

export function processStepEvents(state: GameState, difficultySettings: DifficultySettings, randomSeeds: number[]): GameState {
  let seedIdx = 0;
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  const monthLabel = monthNames[state.metadata.currentMonth - 1] || 'Unknown';
  const previousSnapshot = state.simulation.monthlySnapshots?.[state.simulation.monthlySnapshots.length - 1];
  const previousYield =
    typeof previousSnapshot?.giltYield === 'number' ? previousSnapshot.giltYield : state.markets.giltYield10y;
  const gdpGrowthMonthly =
    typeof state.economic.gdpGrowthMonthly === 'number'
      ? state.economic.gdpGrowthMonthly
      : state.economic.gdpGrowthAnnual / 12;
  const gdpGrowthQuarterly = (Math.pow(1 + gdpGrowthMonthly / 100, 3) - 1) * 100;
  const recentNewspapers = [
    ...(state.events.eventLog || []).map((entry: any) => entry?.newsArticle).filter((article: any) => !!article),
    ...(state.events.currentNewspaper ? [state.events.currentNewspaper] : []),
  ].slice(-18);

  const monthsElapsed = state.metadata.currentTurn;
  const inflationFactor = 1 + state.economic.inflationCPI / 100;
  const nhsBaselineReal = 168.4 * Math.pow(1 + 3.5 / 100, monthsElapsed / 12);
  const educationBaselineReal = 104.0 * Math.pow(1 + 2.0 / 100, monthsElapsed / 12);
  const nhsRealGrowth =
    ((state.fiscal.spending.nhsCurrent / inflationFactor - nhsBaselineReal) / nhsBaselineReal) * 100;
  const educationRealGrowth =
    ((state.fiscal.spending.educationCurrent / inflationFactor - educationBaselineReal) / educationBaselineReal) * 100;
  const welfareCut = state.fiscal.spending.welfare < 290 * 0.95;

  const strikeTriggerMultiplier = Math.max(0.5, state.services.strikeTriggerThresholdMultiplier || 1);
  const strikeCutThreshold = Math.max(1, Math.round(2 * strikeTriggerMultiplier));
  const nextServices = {
    ...state.services,
    consecutiveNHSCutMonths: nhsRealGrowth < -2 ? (state.services.consecutiveNHSCutMonths || 0) + 1 : 0,
    consecutiveEducationCutMonths:
      educationRealGrowth < -2 ? (state.services.consecutiveEducationCutMonths || 0) + 1 : 0,
    consecutivePensionCutMonths: welfareCut ? (state.services.consecutivePensionCutMonths || 0) + 1 : 0,
  };

  let sectorEvent: RandomEvent | null = null;
  const hasPendingSectorEvent = (state.events.pendingEvents || []).some((event: any) =>
    String(event?.id || '').startsWith('sector_')
  );

  if (!hasPendingSectorEvent) {
    if (nextServices.consecutivePensionCutMonths >= 2 && (nextServices.pensionerRevoltCooldown || 0) === 0) {
      const floor = Math.max(state.fiscal.pmPensionFloor_bn || 0, 130);
      sectorEvent = {
        id: `sector_pension_${state.metadata.currentTurn}`,
        type: 'political_crisis',
        severity: 'major',
        month: state.metadata.currentTurn,
        date: new Date(state.metadata.currentYear, state.metadata.currentMonth - 1, 1),
        title: 'Pensioner revolt',
        description:
          'Pensioner groups have mobilised against real-terms pension pressure and are demanding a guaranteed minimum pension commitment.',
        immediateImpact: { approvalRating: -3, pmTrust: -1 },
        requiresResponse: false,
      };
      nextServices.pensionerRevoltCooldown = 12;
      const pensionHit = 2 + randomSeeds[seedIdx++] * 2;
      const backbenchHit = 3;
      return {
        ...state,
        services: nextServices,
        fiscal: {
          ...state.fiscal,
          pmPensionFloor_bn: floor,
        },
        political: {
          ...state.political,
          governmentApproval: Math.max(10, state.political.governmentApproval - pensionHit),
          backbenchSatisfaction: Math.max(10, state.political.backbenchSatisfaction - backbenchHit),
        },
        events: {
          ...state.events,
          pendingEvents: [...(state.events.pendingEvents || []), sectorEvent],
        },
      };
    }

    if (
      nextServices.consecutiveNHSCutMonths >= strikeCutThreshold &&
      state.services.nhsQuality < 55 &&
      (nextServices.nhsStrikeCooldown || 0) === 0
    ) {
      const duration = 2 + Math.floor(randomSeeds[seedIdx++] * 3);
      nextServices.nhsStrikeMonthsRemaining = duration;
      nextServices.nhsStrikeCooldown = 12;
      sectorEvent = {
        id: `sector_nhs_${state.metadata.currentTurn}`,
        type: 'industrial_action',
        severity: 'major',
        month: state.metadata.currentTurn,
        date: new Date(state.metadata.currentYear, state.metadata.currentMonth - 1, 1),
        title: 'NHS strike action',
        description: 'Junior doctors and nursing staff have launched strike action over pay and workload pressure.',
        immediateImpact: { approvalRating: -1.5 },
        requiresResponse: true,
        responseOptions: [
          {
            label: 'Meet pay demands',
            description: 'Fund a settlement and end industrial action immediately.',
            politicalCost: 4,
            economicImpact: { approvalRating: 1.2 },
            fiscalCost: 3.0,
          },
          {
            label: 'Stall',
            description: 'Delay agreement and keep negotiations open while strikes continue.',
            politicalCost: 2,
            economicImpact: { approvalRating: -1.0 },
            fiscalCost: 0,
          },
          {
            label: 'Legislate against strike',
            description: 'Use emergency legislation to halt strike action at significant political cost.',
            politicalCost: 18,
            economicImpact: { approvalRating: -5, pmTrust: -8 },
            fiscalCost: 0,
          },
        ],
      };
    } else if (
      nextServices.consecutiveEducationCutMonths >= strikeCutThreshold &&
      state.services.educationQuality < 60 &&
      (nextServices.teacherStrikeCooldown || 0) === 0
    ) {
      const duration = 2 + Math.floor(randomSeeds[seedIdx++] * 3);
      nextServices.educationStrikeMonthsRemaining = duration;
      nextServices.teacherStrikeCooldown = 12;
      sectorEvent = {
        id: `sector_teacher_${state.metadata.currentTurn}`,
        type: 'industrial_action',
        severity: 'major',
        month: state.metadata.currentTurn,
        date: new Date(state.metadata.currentYear, state.metadata.currentMonth - 1, 1),
        title: 'Teacher strike action',
        description: 'Teacher unions have announced coordinated strike action over real-terms pay erosion.',
        immediateImpact: { approvalRating: -1.5 },
        requiresResponse: true,
        responseOptions: [
          {
            label: 'Meet pay demands',
            description: 'Fund a settlement and return schools to normal operation.',
            politicalCost: 4,
            economicImpact: { approvalRating: 1.2 },
            fiscalCost: 2.5,
          },
          {
            label: 'Stall',
            description: 'Delay settlement and continue talks while disruption persists.',
            politicalCost: 2,
            economicImpact: { approvalRating: -1.0 },
            fiscalCost: 0,
          },
          {
            label: 'Legislate against strike',
            description: 'Force a return to work and accept major political fallout.',
            politicalCost: 18,
            economicImpact: { approvalRating: -5, pmTrust: -8 },
            fiscalCost: 0,
          },
        ],
      };
    }
  }

  const eventsState = {
    currentMonth: state.metadata.currentTurn,
    currentDate: new Date(state.metadata.currentYear, state.metadata.currentMonth - 1, 1),
    economy: {
      gdpGrowthAnnual: state.economic.gdpGrowthAnnual,
      gdpGrowthQuarterly,
      gdpGrowthMonthly,
      gdpNominal: state.economic.gdpNominal_bn,
      inflationCPI: state.economic.inflationCPI,
      unemploymentRate: state.economic.unemploymentRate,
      wageGrowthReal: state.economic.wageGrowthAnnual - state.economic.inflationCPI,
    },
    fiscal: {
      deficit: state.fiscal.deficit_bn,
      debtToGdpPercent: state.fiscal.debtPctGDP,
      deficitPctGDP: state.fiscal.deficitPctGDP,
      totalSpending: state.fiscal.totalSpending_bn,
    },
    political: {
      publicApproval: state.political.governmentApproval,
      nationalApproval: state.political.governmentApproval,
      pmTrust: state.political.pmTrust,
      backbenchSentiment: {
        rebellionRisk:
          state.political.backbenchSatisfaction < 30
            ? 'high'
            : state.political.backbenchSatisfaction < 50
              ? 'medium'
              : 'low',
      },
    },
    markets: {
      giltYield10yr: state.markets.giltYield10y,
      giltYield10yrChange: state.markets.giltYield10y - previousYield,
      sterlingIndex: state.markets.sterlingIndex,
    },
    services: {
      nhsQuality: nextServices.nhsQuality,
      educationQuality: nextServices.educationQuality,
      infrastructureQuality: nextServices.infrastructureQuality,
      mentalHealthAccess: nextServices.mentalHealthAccess,
      primaryCareAccess: nextServices.primaryCareAccess,
      socialCareQuality: nextServices.socialCareQuality,
      prisonSafety: nextServices.prisonSafety,
      courtBacklogPerformance: nextServices.courtBacklogPerformance,
      legalAidAccess: nextServices.legalAidAccess,
      policingEffectiveness: nextServices.policingEffectiveness,
      borderSecurityPerformance: nextServices.borderSecurityPerformance,
      railReliability: nextServices.railReliability,
      affordableHousingDelivery: nextServices.affordableHousingDelivery,
      floodResilience: nextServices.floodResilience,
      researchInnovationOutput: nextServices.researchInnovationOutput,
    },
    externalSector: {
      shockActive: state.externalSector.externalShockActive,
      shockType: state.externalSector.externalShockType,
      tradeFrictionIndex: state.externalSector.tradeFrictionIndex,
      currentAccountGDP: state.externalSector.currentAccountGDP,
    },
    parliamentary: {
      activeInquiries: state.parliamentary.selectCommittees.filter((c) => c.isInquiryActive).map((c) => c.id),
      lordsDelayActive: state.parliamentary.lordsDelayActive,
    },
    devolution: state.devolution,
    taxation: {
      vatRate: state.fiscal.vatRate,
      corporationTaxRate: state.fiscal.corporationTaxRate,
      energyProfitsLevy: getDetailedTaxRate(state, 'energyProfitsLevy', 35),
      vatDomesticEnergy: getDetailedTaxRate(state, 'vatDomesticEnergy', 5),
      rdTaxCredit: getDetailedTaxRate(state, 'rdTaxCredit', 27),
      annualInvestmentAllowance: getDetailedTaxRate(state, 'annualInvestmentAllowance', 1000000),
      sdltAdditionalSurcharge: getDetailedTaxRate(state, 'sdltAdditionalSurcharge', 3),
    },
    emergencyProgrammes: state.emergencyProgrammes,
    recentNewspapers,
  };

  let newEvents: RandomEvent[] = [];
  try {
    newEvents = generateEvents(eventsState);
  } catch (e) {
    // Events system is optional - continue without if it errors
  }

  let updatedState = {
    ...state,
    services: nextServices,
  };
  for (const event of newEvents) {
    if (!event.requiresResponse && event.immediateImpact) {
      updatedState = applyEventImpact(updatedState, event.immediateImpact);
    }
  }

  let newspaper: NewsArticle | null = null;
  try {
    const significantEvent = newEvents.find((e) => e.severity === 'crisis' || e.severity === 'major') || newEvents[0];
    newspaper = generateNewspaper(eventsState, significantEvent);
  } catch (e) {
    // Newspaper generation is optional
  }

  const existingPendingEvents = updatedState.events.pendingEvents || [];
  const responseEvents = newEvents.filter((e) => e.requiresResponse);
  const resolvedEvents = newEvents.filter((e) => !e.requiresResponse);
  const resolvedEventEntries = resolvedEvents.map((event, idx) => ({
    event,
    resolved: true,
    newsArticle: idx === 0 ? newspaper || undefined : undefined,
  }));

  const newEventLog = [...(updatedState.events.eventLog || []), ...resolvedEventEntries];

  const allPendingEvents = sectorEvent
    ? [...existingPendingEvents, sectorEvent, ...responseEvents]
    : [...existingPendingEvents, ...responseEvents];

  let currentNewspaper = newspaper;
  if (sectorEvent) {
    const headlineTokens = sectorEvent.id.startsWith('sector_nhs_')
      ? { sector: 'NHS strike', payDemand: 'a fair NHS pay settlement', month: monthLabel }
      : sectorEvent.id.startsWith('sector_teacher_')
        ? { sector: 'Teacher strike', payDemand: 'an inflation-linked pay deal', month: monthLabel }
        : { sector: 'Pensioner', payDemand: 'a guaranteed pension floor', month: monthLabel };
    const revoltType = sectorEvent.id.startsWith('sector_nhs_')
      ? 'nhs_strike'
      : sectorEvent.id.startsWith('sector_teacher_')
        ? 'teacher_strike'
        : 'pensioner_revolt';
    const rendered = renderSectorHeadline(revoltType as any, headlineTokens);
    currentNewspaper = {
      newspaper: {
        name: 'The Times',
        bias: 'centre-right',
        style: 'broadsheet',
        priorities: ['stability', 'competence', 'establishment', 'credibility'],
      },
      headline: rendered.headline,
      subheading: rendered.subheading,
      paragraphs: [
        sectorEvent.description,
        'No.10 signalled that the Prime Minister expects a credible resolution and clear medium-term funding plan.',
      ],
      oppositionQuote: {
        speaker: 'Shadow Chancellor',
        quote: 'This disruption is the direct result of avoidable Treasury choices.',
        party: 'Conservative',
      },
      month: state.metadata.currentMonth,
      date: new Date(state.metadata.currentYear, state.metadata.currentMonth - 1, 1),
      isSpecialEdition: true,
    };
  }

  const mpcDecision = state.markets.lastMPCDecision || 'hold';
  const mpcQuote =
    mpcDecision === 'hike'
      ? 'We remain focused on returning inflation sustainably to target.'
      : mpcDecision === 'cut'
        ? 'Disinflation is progressing and policy can begin to normalise carefully.'
        : 'Policy must stay restrictive until inflation persistence eases further.';
  const mpcBrief = `Bank of England ${mpcDecision}s Bank Rate at ${state.markets.bankRate.toFixed(2)}% (${state.markets.lastMPCVoteBreakdown || 'vote pending'}). Andrew Bailey: "${mpcQuote}"`;
  if (currentNewspaper) {
    currentNewspaper = {
      ...currentNewspaper,
      paragraphs: [
        ...currentNewspaper.paragraphs,
        '--- Institutional Briefings ---',
        mpcBrief,
        `OBR monitoring note: certified fiscal headroom currently £${(state.obr.fiscalHeadroomForecast_bn ?? state.fiscal.fiscalHeadroom_bn).toFixed(1)}bn under ${getFiscalRuleById(state.political.chosenFiscalRule).name}.`,
      ],
      headline:
        mpcDecision === 'hold'
          ? currentNewspaper.headline
          : `MPC ${mpcDecision === 'hike' ? 'raises' : 'cuts'} Bank Rate`,
      subheading:
        mpcDecision === 'hold'
          ? currentNewspaper.subheading
          : `${state.markets.lastMPCVoteBreakdown || 'MPC vote recorded'} as markets reassess the UK policy mix.`,
      isSpecialEdition: mpcDecision === 'hold' ? currentNewspaper.isSpecialEdition : true,
    };
  }

  return {
    ...updatedState,
    events: {
      ...updatedState.events,
      pendingEvents: allPendingEvents,
      eventLog: newEventLog,
      currentNewspaper,
    },
  };
}

function applyEventImpact(state: GameState, impact: any): GameState {
  let newState = { ...state };

  if (impact.gdpGrowth) {
    const currentMonthly =
      typeof newState.economic.gdpGrowthMonthly === 'number'
        ? newState.economic.gdpGrowthMonthly
        : newState.economic.gdpGrowthAnnual / 12;
    const newMonthly = currentMonthly + impact.gdpGrowth;
    const newAnnual = (Math.pow(1 + newMonthly / 100, 12) - 1) * 100;
    newState = {
      ...newState,
      economic: {
        ...newState.economic,
        gdpGrowthMonthly: newMonthly,
        gdpGrowthAnnual: newAnnual,
      },
    };
  }
  if (impact.inflation) {
    newState = {
      ...newState,
      economic: {
        ...newState.economic,
        inflationCPI: newState.economic.inflationCPI + impact.inflation,
      },
    };
  }
  if (impact.unemployment) {
    newState = {
      ...newState,
      economic: {
        ...newState.economic,
        unemploymentRate: newState.economic.unemploymentRate + impact.unemployment,
      },
    };
  }
  if (impact.approvalRating) {
    newState = {
      ...newState,
      political: {
        ...newState.political,
        governmentApproval: Math.max(10, Math.min(80, newState.political.governmentApproval + impact.approvalRating)),
      },
    };
  }
  if (impact.pmTrust) {
    newState = {
      ...newState,
      political: {
        ...newState.political,
        pmTrust: Math.max(0, Math.min(100, newState.political.pmTrust + impact.pmTrust)),
      },
    };
  }
  if (impact.giltYieldBps) {
    newState = {
      ...newState,
      markets: {
        ...newState.markets,
        giltYield10y: newState.markets.giltYield10y + impact.giltYieldBps / 100,
      },
    };
  }
  if (impact.sterlingPercent) {
    newState = {
      ...newState,
      markets: {
        ...newState.markets,
        sterlingIndex: newState.markets.sterlingIndex * (1 + impact.sterlingPercent / 100),
      },
    };
  }

  return newState;
}
