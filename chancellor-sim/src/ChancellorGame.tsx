// Main Game Component - Hyper-Realistic UK Chancellor Simulation
// Integrates all systems into a complete playable game

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  useBudgetDraft,
  GameStateProvider,
  useGameState,
  useGameActions,
  useGameMetadata,
  DifficultyMode,
} from './game-state';
import { MANIFESTO_TEMPLATES, ManifestoDisplay, OneClickActionResult } from './manifesto-system';
import { TutorialModal, HelpButton } from './tutorial-system';
import BudgetSystem from './budget-system';
import {
  AdviserManagementScreen,
  AdviserType,
} from './adviser-system';
import { MPManagementScreen, LobbyingModal, MPDetailModal } from './mp-system';
import { PMMessagesScreen } from './pm-messages-screen';
import { PMInterventionModal } from './political-system';
import { Newspaper, EventModal, EventLogPanel } from './events-media';
import { SpendingReviewModal } from './SpendingReviewModal';
import { Dashboard } from './dashboard';
import type { NewsArticle, EventResponseOption } from './events-media';
import { FISCAL_RULES, FiscalRuleId, getFiscalRuleById } from './game-integration';
import { generateProjections, summariseProjections, ProjectionBudgetDraft } from './projections-engine';
import { ShortcutsHelpModal } from './ui/shell/ShortcutsHelpModal';

interface AnalysisHistoricalSnapshot {
  turn: number;
  date: string;
  gdpGrowth: number;
  gdpNominal: number;   // Nominal GDP in £bn
  inflation: number;
  unemployment: number;
  deficit: number;
  debt: number;
  approval: number;
  giltYield: number;
}

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const createMonthString = (year: number, month: number): string => {
  const monthString = month.toString().padStart(2, '0');
  return `${year}-${monthString}`;
};

const generateResearchAlignedHistoricalBaseline = (): AnalysisHistoricalSnapshot[] => {
  const history: AnalysisHistoricalSnapshot[] = [];
  const startYear = 2014;
  const startMonth = 7;
  const totalMonths = 120;

  // UK nominal GDP Jul 2014 ≈ £1,750bn; compounded monthly by actual annual growth rates.
  let nominalGDP = 1750;

  const pushSnapshot = (
    monthIndex: number,
    gdpGrowth: number,
    inflation: number,
    unemployment: number,
    deficit: number,
    debt: number,
    approval: number
  ) => {
    const absoluteMonth = (startMonth - 1) + monthIndex;
    const year = startYear + Math.floor(absoluteMonth / 12);
    const month = (absoluteMonth % 12) + 1;
    const riskPremium = Math.max(0, debt - 85) * 0.025;
    const inflationPremium = Math.max(0, inflation - 2) * 0.18;
    const giltYield = clamp(1.2 + inflation * 0.45 + riskPremium + inflationPremium, 0.6, 6.8);

    // Advance nominal GDP by this month's share of the annual growth rate
    nominalGDP *= (1 + gdpGrowth / 1200);

    history.push({
      turn: monthIndex - totalMonths,
      date: createMonthString(year, month),
      gdpGrowth,
      gdpNominal: Math.round(nominalGDP),
      inflation,
      unemployment,
      deficit,
      debt,
      approval,
      giltYield,
    });
  };

  for (let i = 0; i < totalMonths; i++) {
    let gdpGrowth = 1.4;
    let inflation = 2.0;
    let unemployment = 4.5;
    let deficit = 3.2;
    let debt = 90;
    let approval = 42;

    if (i < 24) {
      const progress = i / 24;
      gdpGrowth = 2.5 - progress * 0.3;
      inflation = 0.6 + progress * 0.7;
      unemployment = 6.0 - progress * 1.1;
      deficit = 4.8 - progress * 1.0;
      debt = 83.5 + progress * 2.0;
      approval = 41 + Math.sin(i / 5) * 1.8;
    } else if (i < 36) {
      const progress = (i - 24) / 12;
      gdpGrowth = 2.0 - progress * 0.7;
      inflation = 1.2 + progress * 1.9;
      unemployment = 4.9 + progress * 0.2;
      deficit = 3.6 - progress * 0.2;
      debt = 86.0 + progress * 1.2;
      approval = 39 - progress * 2.5;
    } else if (i < 72) {
      const progress = (i - 36) / 36;
      gdpGrowth = 1.6 + Math.sin(i / 7) * 0.25 - progress * 0.2;
      inflation = 2.4 + Math.sin(i / 6) * 0.35;
      unemployment = 4.4 - progress * 0.5 + Math.sin(i / 9) * 0.1;
      deficit = 2.7 - progress * 0.4;
      debt = 87.2 - progress * 2.1;
      approval = 36 + Math.sin(i / 5) * 1.2;
    } else if (i < 84) {
      const progress = (i - 72) / 12;
      gdpGrowth = -10.5 + progress * 17.5;
      inflation = 0.9 + progress * 1.2;
      unemployment = 4.0 + progress * 1.4;
      deficit = 12.0 + Math.sin(i / 2) * 2.0;
      debt = 86.0 + progress * 12.0;
      approval = 34 - progress * 3.5;
    } else if (i < 96) {
      const progress = (i - 84) / 12;
      gdpGrowth = 6.8 - progress * 4.8;
      inflation = 2.1 + progress * 2.2;
      unemployment = 5.2 - progress * 0.9;
      deficit = 10.5 - progress * 4.5;
      debt = 98.0 + progress * 1.0;
      approval = 31 + progress * 3.0;
    } else {
      const progress = (i - 96) / 24;
      gdpGrowth = 1.4 - progress * 0.7 + Math.sin(i / 8) * 0.25;
      inflation = 10.2 - progress * 8.2 + Math.sin(i / 5) * 0.25;
      unemployment = 4.2 - progress * 0.05 + Math.sin(i / 10) * 0.08;
      deficit = 5.0 - progress * 1.8;
      debt = 99.0 + progress * 0.5;
      approval = 33 + Math.sin(i / 4) * 1.5;
    }

    if (i >= 99 && i <= 101) {
      approval -= 4.5;
      inflation += 0.5;
      deficit += 0.6;
    }

    pushSnapshot(
      i,
      gdpGrowth,
      inflation,
      unemployment,
      deficit,
      debt,
      clamp(approval, 25, 52)
    );
  }

  return history;
};

const ANALYSIS_HISTORICAL_BASELINE = generateResearchAlignedHistoricalBaseline();

// ===========================
// Game Start Screen
// ===========================

const GameStartScreen: React.FC<{ onStart: (manifestoId: string, fiscalRuleId: FiscalRuleId, difficultyMode: DifficultyMode) => void }> = ({
  onStart,
}) => {
  const [selectedManifesto, setSelectedManifesto] = useState<string>('random');
  const [selectedFiscalRule, setSelectedFiscalRule] = useState<FiscalRuleId>('starmer-reeves');
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyMode>('realistic');
  const [step, setStep] = useState<'manifesto' | 'fiscal-rules'>('manifesto');

  if (step === 'fiscal-rules') {
    return (
      <div className="min-h-screen bg-default flex items-center justify-center p-8">
        <div className="max-w-5xl w-full bg-bg-elevated border border-border-custom shadow-lg">
          <div className="bg-primary text-white p-6">
            <h1 className="font-display text-4xl font-semibold">HM Treasury</h1>
            <h2 className="font-display text-2xl mt-2 opacity-90">Choose Your Fiscal Framework</h2>
          </div>

          <div className="p-8">
            <div className="prose max-w-none mb-6">
              <p className="text-secondary leading-relaxed">
                Your first act as Chancellor is to set the fiscal rules that will govern
                your Chancellorship. This is perhaps the most important decision you will make.
                Markets will react immediately to your choice. The rules you set will determine
                your room for manoeuvre on spending and tax for the entire parliament.
              </p>
              <p className="text-sm text-muted mt-2">
                Choose carefully: once announced, changing your fiscal rules will be seen as
                a sign of weakness and severely damage market confidence.
              </p>
            </div>

            <div className="space-y-3 mb-8">
              {FISCAL_RULES.map((rule) => {
                const isSelected = selectedFiscalRule === rule.id;
                const marketColor = rule.marketReaction.giltYieldBps <= 0 ? 'text-good' : 'text-bad';
                const politicalColor = rule.politicalReaction.backbenchChange >= 0 ? 'text-good' : 'text-bad';

                return (
                  <button
                    key={rule.id}
                    onClick={() => setSelectedFiscalRule(rule.id)}
                    className={`w-full text-left p-5 border transition-all ${
                      isSelected
                        ? 'border-primary bg-primary-subtle'
                        : 'border-border-custom hover:border-border-strong'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-semibold text-text-primary text-lg">{rule.name}</div>
                        <div className="text-sm text-secondary mt-1">{rule.shortDescription}</div>
                        {isSelected && (
                          <div className="mt-3 space-y-2">
                            <p className="text-sm text-secondary">{rule.detailedDescription}</p>
                            <p className="text-xs text-muted italic">{rule.historicalPrecedent}</p>
                          </div>
                        )}
                      </div>
                      <div className="ml-4 text-right flex-shrink-0 w-48">
                        <div className={`text-xs font-semibold ${marketColor}`}>
                          Gilt Yields: {rule.marketReaction.giltYieldBps > 0 ? '+' : ''}{rule.marketReaction.giltYieldBps}bps
                        </div>
                        <div className={`text-xs ${marketColor}`}>
                          Sterling: {rule.marketReaction.sterlingPercent > 0 ? '+' : ''}{rule.marketReaction.sterlingPercent}%
                        </div>
                        <div className={`text-xs ${politicalColor} mt-1`}>
                          Backbench: {rule.politicalReaction.backbenchChange > 0 ? '+' : ''}{rule.politicalReaction.backbenchChange}
                        </div>
                        <div className="text-xs text-muted mt-1">
                          Credibility: {rule.marketReaction.credibilityChange > 0 ? '+' : ''}{rule.marketReaction.credibilityChange}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mb-8">
              <h4 className="font-display text-xl font-semibold text-text-primary mb-3">Difficulty</h4>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setSelectedDifficulty('forgiving')}
                  className={`p-3 border text-left transition-all ${
                    selectedDifficulty === 'forgiving'
                      ? 'border-good bg-good-subtle'
                      : 'border-border-custom hover:border-border-strong'
                  }`}
                >
                  <div className="font-semibold text-good">Forgiving</div>
                  <div className="text-xs text-secondary mt-1">Lower volatility, later crisis triggers</div>
                </button>
                <button
                  onClick={() => setSelectedDifficulty('standard')}
                  className={`p-3 border text-left transition-all ${
                    selectedDifficulty === 'standard'
                      ? 'border-secondary bg-secondary-subtle'
                      : 'border-border-custom hover:border-border-strong'
                  }`}
                >
                  <div className="font-semibold text-financial">Standard</div>
                  <div className="text-xs text-secondary mt-1">Balanced realism and playability</div>
                </button>
                <button
                  onClick={() => setSelectedDifficulty('realistic')}
                  className={`p-3 border text-left transition-all ${
                    selectedDifficulty === 'realistic'
                      ? 'border-primary bg-primary-subtle'
                      : 'border-border-custom hover:border-border-strong'
                  }`}
                >
                  <div className="font-semibold text-primary">Realistic</div>
                  <div className="text-xs text-secondary mt-1">Higher volatility, stricter political/market discipline</div>
                </button>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep('manifesto')}
                className="btn btn-secondary"
              >
                Back
              </button>
              <button
                onClick={() => onStart(
                  selectedManifesto === 'random' ? '' : selectedManifesto,
                  selectedFiscalRule,
                  selectedDifficulty
                )}
                className="flex-1 btn btn-primary text-lg"
              >
                Announce Fiscal Framework and Begin
              </button>
            </div>

            <div className="mt-4 p-3 bg-warning-subtle border border-warning text-warning text-xs">
              <p>
                Markets will react in real time when you announce your fiscal framework.
                Gilt yields, sterling, and credibility will adjust immediately.
                The Stability Rule (Starmer-Reeves) is the expected baseline - deviations will surprise markets.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-default flex items-center justify-center p-8">
      <div className="max-w-4xl w-full bg-bg-elevated border border-border-custom shadow-lg">
        <div className="bg-primary text-white p-6">
          <h1 className="font-display text-4xl font-semibold">HM Treasury</h1>
          <h2 className="font-display text-2xl mt-2 opacity-90">Chancellor of the Exchequer Simulation</h2>
        </div>

        <div className="p-8">
          <div className="prose max-w-none mb-8">
            <h3 className="font-display text-2xl font-semibold text-text-primary mb-4">
              Welcome, Chancellor
            </h3>
            <p className="text-secondary leading-relaxed mb-4">
              It is July 2024. Labour has just won a historic landslide victory with a
              majority of 174 seats. The public have high expectations. Your task is to
              manage the UK economy and public finances for the full five-year term until
              the next election in 2029.
            </p>
            <p className="text-secondary leading-relaxed mb-4">
              You must balance economic growth, sound public finances, quality public
              services, and political survival. The Prime Minister will not hesitate to
              sack you if you lose their confidence. Backbenchers will revolt if you
              threaten their seats. The markets will punish fiscal irresponsibility.
            </p>
            <p className="text-secondary leading-relaxed">
              <strong>This simulation is brutally realistic.</strong> Every policy has
              trade-offs. Breaking manifesto pledges has consequences. Economic
              relationships are based on real UK data and OBR forecasts.
            </p>
          </div>

          <div className="mb-8">
            <h4 className="font-display text-xl font-semibold text-text-primary mb-4">
              Select Your Manifesto
            </h4>
            <p className="text-sm text-secondary mb-4">
              Different manifestos have different pledges and constraints. Choose
              carefully - breaking pledges damages trust and approval.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => setSelectedManifesto('random')}
                className={`w-full text-left p-4 border transition-all ${
                  selectedManifesto === 'random'
                    ? 'border-primary bg-primary-subtle'
                    : 'border-border-custom hover:border-border-strong'
                }`}
              >
                <div className="font-semibold text-text-primary">Random Manifesto</div>
                <div className="text-sm text-secondary mt-1">
                  System will randomly select one of the five manifesto templates
                </div>
              </button>

              {MANIFESTO_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedManifesto(template.id)}
                  className={`w-full text-left p-4 border transition-all ${
                    selectedManifesto === template.id
                      ? 'border-primary bg-primary-subtle'
                      : 'border-border-custom hover:border-border-strong'
                  }`}
                >
                  <div className="font-semibold text-text-primary">{template.name}</div>
                  <div className="text-sm text-secondary mt-1">{template.theme}</div>
                  <div className="text-xs text-muted mt-2">
                    {template.pledges.length} pledges
                  </div>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setStep('fiscal-rules')}
            className="w-full btn btn-primary text-lg"
          >
            Next: Choose Fiscal Framework
          </button>

          <div className="mt-6 p-4 bg-warning-subtle border border-warning text-warning">
            <p className="text-sm">
              <strong>Difficulty: Challenging</strong> - Realistic UK fiscal constraints.
              About 40-50% of players survive if they play carefully. Economic
              relationships are unforgiving but fair.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ===========================
// Game Over Modal
// ===========================

const GameOverModal: React.FC<{ reason: string; onRestart: () => void }> = ({
  reason,
  onRestart,
}) => {
  const gameState = useGameState();
  const metadata = gameState.metadata;

  const survived = metadata.currentTurn >= 60;

  // Calculate performance score (0-100)
  const calcScore = () => {
    let score = 0;

    // Survival bonus (max 20 points)
    score += Math.min(20, (metadata.currentTurn / 60) * 20);

    // Economic management (max 30 points)
    const gdp = gameState.economic.gdpGrowthAnnual;
    const inflation = gameState.economic.inflationCPI;
    const unemployment = gameState.economic.unemploymentRate;
    // GDP: 0-10 points (best at 2-3%)
    score += Math.max(0, 10 - Math.abs(gdp - 2.5) * 3);
    // Inflation: 0-10 points (best near 2%)
    score += Math.max(0, 10 - Math.abs(inflation - 2.0) * 3);
    // Unemployment: 0-10 points (best below 4.5%)
    score += Math.max(0, 10 - Math.max(0, unemployment - 3.5) * 3);

    // Fiscal responsibility (max 20 points)
    const deficit = gameState.fiscal.deficitPctGDP;
    const debt = gameState.fiscal.debtPctGDP;
    // Deficit: 0-10 points (best below 2%)
    score += Math.max(0, 10 - Math.max(0, deficit - 1) * 2.5);
    // Debt: 0-10 points (best below 90%)
    score += Math.max(0, 10 - Math.max(0, debt - 80) * 0.3);

    // Political standing (max 15 points)
    score += Math.min(10, gameState.political.governmentApproval / 6);
    score += Math.min(5, gameState.political.pmTrust / 15);

    // Manifesto adherence (max 10 points)
    score += Math.max(0, 10 - gameState.manifesto.totalViolations * 3);

    // Public services (max 5 points)
    const serviceValues = [
      gameState.services.nhsQuality,
      gameState.services.educationQuality,
      gameState.services.infrastructureQuality,
      gameState.services.mentalHealthAccess,
      gameState.services.primaryCareAccess,
      gameState.services.socialCareQuality,
      gameState.services.prisonSafety,
      gameState.services.courtBacklogPerformance,
      gameState.services.legalAidAccess,
      gameState.services.policingEffectiveness,
      gameState.services.borderSecurityPerformance,
      gameState.services.railReliability,
      gameState.services.affordableHousingDelivery,
      gameState.services.floodResilience,
      gameState.services.researchInnovationOutput,
    ];
    const avgService = serviceValues.reduce((sum, value) => sum + value, 0) / serviceValues.length;
    score += Math.min(5, (avgService / 100) * 5);

    return Math.round(Math.max(0, Math.min(100, score)));
  };

  const score = calcScore();
  const grade = score >= 85 ? 'A+' : score >= 75 ? 'A' : score >= 65 ? 'B' :
                score >= 55 ? 'C' : score >= 45 ? 'D' : score >= 30 ? 'E' : 'F';
  const gradeLabel = score >= 85 ? 'Outstanding Chancellor' : score >= 75 ? 'Highly Competent' :
                     score >= 65 ? 'Capable Manager' : score >= 55 ? 'Adequate' :
                     score >= 45 ? 'Below Expectations' : score >= 30 ? 'Poor Performance' : 'Catastrophic';
  const gradeColor = score >= 65 ? 'text-good' : score >= 45 ? 'text-warning' : 'text-bad';
  const borderColor = survived ? 'border-good' : 'border-bad';
  const headerBg = survived ? 'bg-good' : 'bg-bad';

  return (
    <div className="fixed inset-0 modal-overlay flex items-center justify-center p-8 z-50">
      <div className={`max-w-2xl w-full bg-bg-elevated border-t-4 ${borderColor} shadow-lg`}>
        <div className={`${headerBg} text-white p-6`}>
          <h2 className="font-display text-3xl font-semibold">
            {survived ? 'Term Complete' : 'Chancellorship Ended'}
          </h2>
        </div>

        <div className="p-8">
          <div className="mb-6">
            <p className="text-xl text-text-primary leading-relaxed">{reason}</p>
          </div>

          {/* Performance Grade */}
          <div className="mb-6 text-center bg-bg-surface p-6 border border-border-custom">
            <div className="text-label text-tertiary mb-1">Performance Rating</div>
            <div className={`font-display text-6xl font-bold ${gradeColor}`}>{grade}</div>
            <div className={`text-lg font-semibold ${gradeColor}`}>{gradeLabel}</div>
            <div className="text-sm text-muted mt-1">Score: {score}/100</div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-bg-surface p-4 border border-border-subtle">
              <div className="text-sm text-secondary">Months in Office</div>
              <div className="font-mono text-2xl font-semibold text-text-primary">
                {metadata.currentTurn}
              </div>
            </div>
            <div className="bg-bg-surface p-4 border border-border-subtle">
              <div className="text-sm text-secondary">Term Progress</div>
              <div className="font-mono text-2xl font-semibold text-text-primary">
                {Math.round((metadata.currentTurn / 60) * 100)}%
              </div>
            </div>
            <div className="bg-bg-surface p-4 border border-border-subtle">
              <div className="text-sm text-secondary">Final Approval</div>
              <div className="font-mono text-2xl font-semibold text-text-primary">
                {Math.round(gameState.political.governmentApproval)}%
              </div>
            </div>
            <div className="bg-bg-surface p-4 border border-border-subtle">
              <div className="text-sm text-secondary">Final Deficit</div>
              <div className="font-mono text-2xl font-semibold text-text-primary">
                {gameState.fiscal.deficitPctGDP.toFixed(1)}%
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-display text-lg font-semibold text-text-primary mb-2">Final Economic State</h3>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <span className="text-secondary">GDP Growth:</span>{' '}
                <span className="font-mono font-semibold">
                  {gameState.economic.gdpGrowthAnnual.toFixed(1)}%
                </span>
              </div>
              <div>
                <span className="text-secondary">Inflation:</span>{' '}
                <span className="font-mono font-semibold">
                  {gameState.economic.inflationCPI.toFixed(1)}%
                </span>
              </div>
              <div>
                <span className="text-secondary">Unemployment:</span>{' '}
                <span className="font-mono font-semibold">
                  {gameState.economic.unemploymentRate.toFixed(1)}%
                </span>
              </div>
              <div>
                <span className="text-secondary">Debt/GDP:</span>{' '}
                <span className="font-mono font-semibold">
                  {gameState.fiscal.debtPctGDP.toFixed(1)}%
                </span>
              </div>
              <div>
                <span className="text-secondary">10Y Gilt:</span>{' '}
                <span className="font-mono font-semibold">
                  {gameState.markets.giltYield10y.toFixed(2)}%
                </span>
              </div>
              <div>
                <span className="text-secondary">PM Trust:</span>{' '}
                <span className="font-mono font-semibold">
                  {Math.round(gameState.political.pmTrust)}
                </span>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-display text-lg font-semibold text-text-primary mb-2">
              Manifesto Adherence
            </h3>
            <p className="text-sm text-secondary">
              {gameState.manifesto.totalViolations === 0
                ? 'You kept all manifesto pledges. Impressive.'
                : `You broke ${gameState.manifesto.totalViolations} manifesto pledge${
                    gameState.manifesto.totalViolations !== 1 ? 's' : ''
                  }.`}
            </p>
          </div>

          <button
            onClick={onRestart}
            className={`w-full btn ${survived ? 'btn-primary bg-good hover:bg-good' : 'btn-primary'}`}
          >
            Start New Game
          </button>
        </div>
      </div>
    </div>
  );
};

// ===========================
// Turn Advancement Panel
// ===========================

const TurnPanel: React.FC<{ onAdvanceTurn: () => void }> = ({ onAdvanceTurn }) => {
  const metadata = useGameMetadata();
  const gameState = useGameState();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const termProgress = Math.round((metadata.currentTurn / 60) * 100);

  return (
    <div className="treasury-masthead">
      <div className="relative px-6 py-6 md:px-8">
        <div className="treasury-toolbar">
          <div className="max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-white/65">HM Treasury</div>
            <div className="mt-2 flex flex-wrap items-end gap-x-4 gap-y-1">
              <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">
                {monthNames[metadata.currentMonth - 1]} {metadata.currentYear}
              </h1>
              <div className="pb-1 text-sm uppercase tracking-[0.22em] text-white/70">
                Month {metadata.currentTurn + 1} of 60
              </div>
            </div>
            <p className="mt-3 max-w-2xl text-sm text-white/78 md:text-base">
              Chancellor {metadata.playerName || 'Reeves'} is navigating fiscal rules, market nerves and the Prime Minister’s patience.
            </p>
          </div>

          <button
            onClick={onAdvanceTurn}
            className="btn rounded-none border border-white/25 bg-white/10 px-6 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white backdrop-blur hover:bg-white/20"
          >
            Advance Month
          </button>
        </div>

        <div className="treasury-data-strip mt-6">
          <div className="treasury-data-cell">
            <div className="treasury-kicker text-white/55">Government Approval</div>
            <div className="mt-2 font-mono text-2xl font-semibold text-white">{gameState.political.governmentApproval.toFixed(0)}</div>
          </div>
          <div className="treasury-data-cell">
            <div className="treasury-kicker text-white/55">Fiscal Headroom</div>
            <div className="mt-2 font-mono text-2xl font-semibold text-white">£{gameState.fiscal.fiscalHeadroom_bn.toFixed(1)}bn</div>
          </div>
          <div className="treasury-data-cell">
            <div className="treasury-kicker text-white/55">10Y Gilt</div>
            <div className="mt-2 font-mono text-2xl font-semibold text-white">{gameState.markets.giltYield10y.toFixed(2)}%</div>
          </div>
          <div className="treasury-data-cell">
            <div className="treasury-kicker text-white/55">PM Trust</div>
            <div className="mt-2 font-mono text-2xl font-semibold text-white">{gameState.political.pmTrust.toFixed(0)}</div>
          </div>
        </div>
      </div>
      <div className="h-1.5 bg-black/25">
        <div
          className="h-full bg-white/65 transition-all duration-300"
          style={{ width: `${termProgress}%` }}
        />
      </div>
    </div>
  );
};

// ===========================
// Navigation Bar
// ===========================

type View = 'dashboard' | 'budget' | 'analysis' | 'advisers' | 'mps' | 'pm-messages' | 'manifesto';

const VIEW_SHORTCUTS: Record<string, View> = {
  '1': 'dashboard',
  '2': 'budget',
  '3': 'analysis',
  '4': 'advisers',
  '5': 'mps',
  '6': 'pm-messages',
  '7': 'manifesto',
};

interface NavigationBarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  adviserCount: number;
  manifestoViolations: number;
  onSaveLoad: () => void;
}

const NavigationBar: React.FC<NavigationBarProps> = ({
  currentView,
  onViewChange,
  adviserCount,
  manifestoViolations,
  onSaveLoad,
}) => {
  const gameState = useGameState();
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const tabs: { id: View; label: string; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'budget', label: 'Budget' },
    { id: 'analysis', label: 'Analysis' },
    { id: 'advisers', label: 'Advisers', badge: adviserCount > 0 ? adviserCount : undefined },
    { id: 'mps', label: 'MPs' },
    { id: 'manifesto', label: 'Manifesto', badge: manifestoViolations > 0 ? manifestoViolations : undefined },
  ];

  return (
    <nav className="treasury-rail overflow-hidden">
      <div className="border-b border-border-subtle px-5 py-5">
        <div className="treasury-kicker">Cabinet Control</div>
        <div className="mt-2 font-display text-3xl font-semibold text-primary">Treasury Briefing</div>
        <p className="mt-2 text-sm text-secondary">
          A live working brief, not a strip of tabs pretending to be an interface.
        </p>
      </div>

      <div className="border-b border-border-subtle px-3 py-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onViewChange(tab.id)}
            className={`treasury-nav-link ${currentView === tab.id ? 'treasury-nav-link-active' : ''}`}
          >
            <span>
              <span className="mr-3 font-mono text-xs text-muted">{Object.entries(VIEW_SHORTCUTS).find(([, view]) => view === tab.id)?.[0]}</span>
              {tab.label}
            </span>
            {tab.badge !== undefined && tab.badge > 0 && <span className="treasury-badge">{tab.badge}</span>}
          </button>
        ))}

        <button
          onClick={() => onViewChange('pm-messages')}
          className={`treasury-nav-link ${currentView === 'pm-messages' ? 'treasury-nav-link-active' : ''}`}
        >
          <span>
            <span className="mr-3 font-mono text-xs text-muted">6</span>
            Prime Minister
          </span>
          {gameState?.pmRelationship?.unreadCount > 0 && <span className="treasury-badge">{gameState.pmRelationship.unreadCount}</span>}
        </button>
      </div>

      <div className="space-y-3 px-5 py-5">
        <div className="treasury-card px-4 py-4">
          <div className="treasury-kicker">Political Risk</div>
          <div className="mt-3 flex items-end justify-between">
            <div>
              <div className="text-sm text-secondary">Manifesto breaches</div>
              <div className="mt-1 font-mono text-2xl font-semibold text-primary">{manifestoViolations}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-secondary">Unread PM</div>
              <div className="mt-1 font-mono text-2xl font-semibold text-primary">{gameState.pmRelationship.unreadCount}</div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={toggleDarkMode}
            className="btn btn-ghost flex-1 rounded-none border border-border-subtle text-xs uppercase tracking-[0.18em]"
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDarkMode ? 'Light' : 'Dark'}
          </button>
          <button
            onClick={onSaveLoad}
            className="btn btn-secondary flex-1 rounded-none text-xs uppercase tracking-[0.18em]"
          >
            Save
          </button>
        </div>
      </div>
    </nav>
  );
};

interface ProjectionsViewProps {
  gameState: any;
  formatDate: (dateStr: string) => string;
  MiniChart: any;
  withBands: (rawData: { label: string; value: number }[], floor: number) => { label: string; value: number; band?: number }[];
}

const ProjectionsView: React.FC<ProjectionsViewProps> = ({ gameState, formatDate, MiniChart, withBands }) => {
  const [projectionMonths, setProjectionMonths] = useState(24);
  const [activeChart, setActiveChart] = useState<'economic' | 'fiscal' | 'markets' | 'services'>('economic');
  const [selectedServiceMetric, setSelectedServiceMetric] = useState<string>('nhsQuality');
  const pendingDraft = useBudgetDraft() as ProjectionBudgetDraft | null;

  const projections = useMemo(
    () => generateProjections(gameState, projectionMonths, true, pendingDraft),
    [gameState, projectionMonths, pendingDraft]
  );
  const baselineRaw = projections.baseline;
  const pendingRaw = projections.withPendingChanges;

  const seededRandom = useCallback((seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }, []);

  const gaussianFromSeed = useCallback((seed: number) => {
    const u1 = Math.max(1e-9, seededRandom(seed));
    const u2 = Math.max(1e-9, seededRandom(seed + 1.618));
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }, [seededRandom]);

  const applyProjectionFuzz = useCallback((points: any[] | undefined) => {
    if (!points) return points;
    const turnSeed = gameState.metadata.currentTurn * 1000 + projectionMonths;
    return points.map((point, index) => {
      const horizon = index + 1;
      const horizonScale = horizon <= 2 ? 0.35 : horizon <= 12 ? 0.8 : 1.35;
      const heavyTailMix = seededRandom(turnSeed + index * 13.7) < 0.1 ? 2.4 : 1.0;
      const gdpShock = gaussianFromSeed(turnSeed + index * 17.3) * 0.1 * horizonScale * heavyTailMix;
      const borrowingShock = gaussianFromSeed(turnSeed + index * 19.1) * 0.25 * horizonScale * heavyTailMix;
      const inflationShock = gaussianFromSeed(turnSeed + index * 11.2) * 0.12 * horizonScale;
      const unemploymentShock = gaussianFromSeed(turnSeed + index * 7.4) * 0.08 * horizonScale;
      const debtShock = gaussianFromSeed(turnSeed + index * 5.9) * 0.4 * horizonScale;
      const revenueShock = gaussianFromSeed(turnSeed + index * 3.3) * 1.5 * horizonScale;
      const spendingShock = gaussianFromSeed(turnSeed + index * 2.2) * 1.8 * horizonScale;

      const fuzzedServices = Object.fromEntries(
        Object.entries(point.services || {}).map(([serviceKey, value]) => {
          const serviceShock = gaussianFromSeed(turnSeed + index * 23.7 + serviceKey.length) * 0.9 * horizonScale;
          return [serviceKey, Math.max(0, Math.min(100, Number(value) + serviceShock))];
        })
      );

      return {
        ...point,
        gdpGrowth: point.gdpGrowth + gdpShock,
        deficit: point.deficit + borrowingShock,
        inflation: point.inflation + inflationShock,
        unemployment: Math.max(2.5, point.unemployment + unemploymentShock),
        debt: Math.max(0, point.debt + debtShock),
        totalRevenue: Math.max(0, point.totalRevenue + revenueShock),
        totalSpending: Math.max(0, point.totalSpending + spendingShock),
        services: fuzzedServices,
      };
    });
  }, [gameState.metadata.currentTurn, projectionMonths, gaussianFromSeed, seededRandom]);

  const baseline = useMemo(() => applyProjectionFuzz(baselineRaw) ?? baselineRaw ?? [], [baselineRaw, applyProjectionFuzz]);
  const pending = useMemo(() => {
    if (!pendingRaw) return null;
    return applyProjectionFuzz(pendingRaw) ?? pendingRaw;
  }, [pendingRaw, applyProjectionFuzz]);
  const baselineSummary = useMemo(() => summariseProjections(baseline), [baseline]);
  const pendingSummary = useMemo(() => (pending ? summariseProjections(pending) : null), [pending]);
  const baselineFinal = baseline[baseline.length - 1];
  const pendingFinal = pending?.[pending.length - 1];

  const adviserLens: Record<AdviserType, string> = {
    treasury_mandarin: 'Fiscal discipline lens',
    political_operator: 'Household pressure lens',
    heterodox_economist: 'Growth lens',
    fiscal_hawk: 'Debt sustainability lens',
    social_democrat: 'Service outcomes lens',
    technocratic_centrist: 'Productivity lens',
  };

  const hiredAdvisers = useMemo(() => {
    const raw = gameState?.advisers?.hiredAdvisers;
    const valid = new Set<AdviserType>(['treasury_mandarin', 'political_operator', 'heterodox_economist', 'fiscal_hawk', 'social_democrat', 'technocratic_centrist']);
    if (!raw) return [] as AdviserType[];
    if (raw instanceof Map) return Array.from(raw.keys()).filter((v): v is AdviserType => valid.has(v));
    if (Array.isArray(raw)) return raw.map((entry: any) => Array.isArray(entry) ? entry[0] : entry?.profile?.type).filter((v: any): v is AdviserType => valid.has(v));
    return Object.values(raw as Record<string, any>).map((entry: any) => entry?.profile?.type).filter((v: any): v is AdviserType => valid.has(v));
  }, [gameState]);

  const serviceMetrics = [
    { key: 'nhsQuality', label: 'NHS Quality' },
    { key: 'educationQuality', label: 'Education Quality' },
    { key: 'infrastructureQuality', label: 'Infrastructure Quality' },
    { key: 'mentalHealthAccess', label: 'Mental Health Access' },
    { key: 'primaryCareAccess', label: 'Primary Care Access' },
    { key: 'socialCareQuality', label: 'Social Care Quality' },
    { key: 'prisonSafety', label: 'Prison Safety' },
    { key: 'courtBacklogPerformance', label: 'Court Performance' },
    { key: 'legalAidAccess', label: 'Legal Aid Access' },
    { key: 'policingEffectiveness', label: 'Policing Effectiveness' },
    { key: 'borderSecurityPerformance', label: 'Border Performance' },
    { key: 'railReliability', label: 'Rail Reliability' },
    { key: 'affordableHousingDelivery', label: 'Affordable Housing Delivery' },
    { key: 'floodResilience', label: 'Flood Resilience' },
    { key: 'researchInnovationOutput', label: 'Innovation Output' },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 p-5 rounded-sm">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Projections</h3>
            <p className="text-sm text-gray-600 mt-1">Forward simulation of all non-political indicators, including public service quality.</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-gray-700">Forecast period:</label>
            <select value={projectionMonths} onChange={(e) => setProjectionMonths(Number(e.target.value))} className="px-3 py-2 border border-gray-300 rounded-sm text-sm">
              <option value={12}>12 months</option>
              <option value={24}>24 months</option>
              <option value={36}>36 months</option>
              <option value={48}>48 months</option>
            </select>
          </div>
        </div>
        {projections.metadata.hasPendingChanges && (
          <div className="mt-3 text-xs bg-yellow-50 border border-yellow-200 text-yellow-900 rounded-sm p-3">
            Pending budget changes are included as an alternative projection path.
          </div>
        )}
        <div className="mt-3 text-xs bg-gray-50 border border-gray-200 text-gray-700 rounded-sm p-3">
          Projections include modelled forecast uncertainty. Actual outcomes may differ.
        </div>
        {gameState.simulation.lastObrComparison && (
          <div className="mt-3 border border-gray-200 rounded-sm overflow-hidden">
            <div className="bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700">
              OBR-style forecast vs outturn ({gameState.simulation.lastObrComparison.fiscalYear}/{String(gameState.simulation.lastObrComparison.fiscalYear + 1).slice(2)})
            </div>
            <table className="w-full text-xs">
              <thead className="bg-white">
                <tr className="text-left text-gray-600">
                  <th className="px-3 py-2">Metric</th>
                  <th className="px-3 py-2">Projected</th>
                  <th className="px-3 py-2">Actual</th>
                  <th className="px-3 py-2">Delta</th>
                </tr>
              </thead>
              <tbody>
                {gameState.simulation.lastObrComparison.rows.map((row: any) => (
                  <tr key={row.metric} className="border-t border-gray-100">
                    <td className="px-3 py-2 text-gray-800">
                      {row.metric === 'gdpGrowth' ? 'GDP growth' : row.metric === 'deficitPctGDP' ? 'Deficit (% GDP)' : 'Debt (% GDP)'}
                    </td>
                    <td className="px-3 py-2">{row.projected.toFixed(1)}</td>
                    <td className="px-3 py-2">{row.actual.toFixed(1)}</td>
                    <td className={`px-3 py-2 ${row.delta >= 0 ? 'text-red-700' : 'text-green-700'}`}>
                      {row.delta >= 0 ? '+' : ''}{row.delta.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className={`grid gap-4 ${pendingSummary ? 'grid-cols-2' : 'grid-cols-1'}`}>
        <div className="bg-white border border-gray-200 p-4 rounded-sm text-sm">
          <div className="font-semibold text-gray-700 mb-2">Baseline forecast</div>
          <div className="flex justify-between"><span className="text-gray-600">Avg GDP growth</span><span className="font-semibold">{baselineSummary.averageGDPGrowth.toFixed(1)}%</span></div>
          <div className="flex justify-between"><span className="text-gray-600">Avg inflation</span><span className="font-semibold">{baselineSummary.averageInflation.toFixed(1)}%</span></div>
          <div className="flex justify-between"><span className="text-gray-600">Avg unemployment</span><span className="font-semibold">{baselineSummary.averageUnemployment.toFixed(1)}%</span></div>
          <div className="flex justify-between"><span className="text-gray-600">Avg service quality</span><span className="font-semibold">{baselineSummary.averageServiceQuality.toFixed(1)}/100</span></div>
        </div>
        {pendingSummary && (
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-sm text-sm">
            <div className="font-semibold text-blue-900 mb-2">With pending budget changes</div>
            <div className="flex justify-between"><span className="text-gray-700">Avg GDP growth</span><span className="font-semibold">{pendingSummary.averageGDPGrowth.toFixed(1)}%</span></div>
            <div className="flex justify-between"><span className="text-gray-700">Avg inflation</span><span className="font-semibold">{pendingSummary.averageInflation.toFixed(1)}%</span></div>
            <div className="flex justify-between"><span className="text-gray-700">Avg unemployment</span><span className="font-semibold">{pendingSummary.averageUnemployment.toFixed(1)}%</span></div>
            <div className="flex justify-between"><span className="text-gray-700">Avg service quality</span><span className="font-semibold">{pendingSummary.averageServiceQuality.toFixed(1)}/100</span></div>
          </div>
        )}
      </div>

      {hiredAdvisers.length > 0 && (
        <div className="bg-white border border-gray-200 p-4 rounded-sm">
          <div className="text-sm font-semibold text-gray-700 mb-3">Adviser-specific view</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
            {hiredAdvisers.map((adviser) => (
              <div key={adviser} className="border border-gray-200 rounded-sm p-2">
                <div className="text-xs uppercase tracking-wide text-gray-500 font-semibold">{adviser.replaceAll('_', ' ')}</div>
                <div className="text-gray-800">{adviserLens[adviser]}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {[
          { id: 'economic' as const, label: 'Economic' },
          { id: 'fiscal' as const, label: 'Fiscal' },
          { id: 'markets' as const, label: 'Markets' },
          { id: 'services' as const, label: 'Services' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveChart(tab.id)}
            className={`px-5 py-2 font-semibold rounded-sm transition-all ${activeChart === tab.id ? 'bg-red-700 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeChart === 'economic' && (
        <div className="grid grid-cols-2 gap-4">
          <MiniChart title="GDP Growth Projection (Annual %)" data={withBands(baseline.map((p: any) => ({ label: formatDate(p.date), value: p.gdpGrowth })), 0.2)} color="#2563eb" formatValue={(v: number) => `${v.toFixed(1)}%`} />
          <MiniChart title="CPI Inflation Projection (%)" data={withBands(baseline.map((p: any) => ({ label: formatDate(p.date), value: p.inflation })), 0.15)} color="#dc2626" formatValue={(v: number) => `${v.toFixed(1)}%`} />
          <MiniChart title="Unemployment Projection (%)" data={withBands(baseline.map((p: any) => ({ label: formatDate(p.date), value: p.unemployment })), 0.1)} color="#7c3aed" formatValue={(v: number) => `${v.toFixed(1)}%`} />
          <MiniChart title="Productivity Projection (%)" data={withBands(baseline.map((p: any) => ({ label: formatDate(p.date), value: p.productivity })), 0.1)} color="#f59e0b" formatValue={(v: number) => `${v.toFixed(1)}%`} />
          <MiniChart title="Wage Growth Projection (%)" data={withBands(baseline.map((p: any) => ({ label: formatDate(p.date), value: p.wageGrowth })), 0.2)} color="#059669" formatValue={(v: number) => `${v.toFixed(1)}%`} />
        </div>
      )}

      {activeChart === 'fiscal' && (
        <div className="grid grid-cols-2 gap-4">
          <MiniChart title="Budget Deficit Projection (% of GDP)" data={withBands(baseline.map((p: any) => ({ label: formatDate(p.date), value: p.deficit })), 0.15)} color="#dc2626" formatValue={(v: number) => `${v.toFixed(1)}%`} />
          <MiniChart title="Public Debt Projection (% of GDP)" data={withBands(baseline.map((p: any) => ({ label: formatDate(p.date), value: p.debt })), 0.2)} color="#b45309" formatValue={(v: number) => `${v.toFixed(1)}%`} />
          <div className="bg-white border border-gray-200 p-4 rounded-sm text-sm">
            <div className="font-semibold text-gray-700 mb-3">Revenue and spending at horizon (£bn)</div>
            <div className="space-y-2">
              <div className="flex justify-between"><span className="text-gray-600">Revenue</span><span className="font-semibold">£{(baselineFinal?.totalRevenue || 0).toFixed(1)}bn</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Spending</span><span className="font-semibold">£{(baselineFinal?.totalSpending || 0).toFixed(1)}bn</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Debt interest</span><span className="font-semibold">£{(baselineFinal?.debtInterest || 0).toFixed(1)}bn</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Fiscal headroom</span><span className="font-semibold">£{(baselineFinal?.fiscalHeadroom || 0).toFixed(1)}bn</span></div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 p-4 rounded-sm text-sm">
            <div className="font-semibold text-gray-700 mb-3">Projected spending breakdown (£bn)</div>
            <div className="space-y-1">
              {['nhs', 'education', 'defence', 'welfare', 'infrastructure', 'police', 'justice', 'other'].map((dept) => (
                <div key={dept} className="flex justify-between">
                  <span className="text-gray-600 capitalize">{dept}</span>
                  <span className="font-semibold">£{(((baselineFinal?.spendingBreakdown as any)?.[dept]) || 0).toFixed(1)}bn</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeChart === 'markets' && (
        <div className="grid grid-cols-2 gap-4">
          <MiniChart title="10-Year Gilt Projection (%)" data={withBands(baseline.map((p: any) => ({ label: formatDate(p.date), value: p.giltYield10y })), 0.08)} color="#b45309" formatValue={(v: number) => `${v.toFixed(2)}%`} />
          <MiniChart title="Bank Rate Projection (%)" data={withBands(baseline.map((p: any) => ({ label: formatDate(p.date), value: p.bankRate })), 0.05)} color="#7c3aed" formatValue={(v: number) => `${v.toFixed(2)}%`} />
          <MiniChart title="Sterling Index Projection" data={withBands(baseline.map((p: any) => ({ label: formatDate(p.date), value: p.sterlingIndex })), 0.4)} color="#2563eb" formatValue={(v: number) => v.toFixed(1)} />
          <div className="bg-white border border-gray-200 p-4 rounded-sm text-sm space-y-2">
            <div className="font-semibold text-gray-700 mb-3">Market indicators at horizon</div>
            <div className="flex justify-between"><span className="text-gray-600">Bank Rate</span><span className="font-semibold">{(baselineFinal?.bankRate || 0).toFixed(2)}%</span></div>
            <div className="flex justify-between"><span className="text-gray-600">2Y Gilt Yield</span><span className="font-semibold">{(baselineFinal?.giltYield2y || 0).toFixed(2)}%</span></div>
            <div className="flex justify-between"><span className="text-gray-600">10Y Gilt Yield</span><span className="font-semibold">{(baselineFinal?.giltYield10y || 0).toFixed(2)}%</span></div>
            <div className="flex justify-between"><span className="text-gray-600">30Y Gilt Yield</span><span className="font-semibold">{(baselineFinal?.giltYield30y || 0).toFixed(2)}%</span></div>
            <div className="flex justify-between"><span className="text-gray-600">2Y Mortgage Rate</span><span className="font-semibold">{(baselineFinal?.mortgageRate2y || 0).toFixed(2)}%</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Sterling Index</span><span className="font-semibold">{(baselineFinal?.sterlingIndex || 0).toFixed(1)}</span></div>
          </div>
        </div>
      )}

      {activeChart === 'services' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {serviceMetrics.map((metric) => (
              <button
                key={metric.key}
                onClick={() => setSelectedServiceMetric(metric.key)}
                className={`px-3 py-2 rounded-sm text-sm font-semibold transition-all ${selectedServiceMetric === metric.key ? 'bg-red-700 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}
              >
                {metric.label}
              </button>
            ))}
          </div>
          <MiniChart
            title={`${serviceMetrics.find((m) => m.key === selectedServiceMetric)?.label || 'Service'} Projection`}
            data={withBands(baseline.map((p: any) => ({ label: formatDate(p.date), value: (p.services as any)?.[selectedServiceMetric] ?? 0 })), 0.6)}
            color="#059669"
            formatValue={(v: number) => `${v.toFixed(1)}/100`}
          />
          <div className="bg-white border border-gray-200 p-4 rounded-sm">
            <div className="text-sm font-semibold text-gray-700 mb-3">Projected public service quality indices</div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {serviceMetrics.map((metric) => {
                const baseValue = (baselineFinal?.services as any)?.[metric.key] || 0;
                const pendingValue = (pendingFinal?.services as any)?.[metric.key];
                return (
                  <div key={metric.key}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{metric.label}</span>
                      <span className="font-semibold">{Math.round(baseValue)}/100 {pendingValue !== undefined && <span className="text-xs text-blue-700">→ {Math.round(pendingValue)}</span>}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div className={`h-3 rounded-full ${baseValue > 60 ? 'bg-green-500' : baseValue > 40 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${Math.max(0, Math.min(100, baseValue))}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ===========================
// Analysis Tab - Charts and Trends
// ===========================

const AnalysisTab: React.FC = () => {
  const gameState = useGameState();
  const snapshots = gameState.simulation.monthlySnapshots;
  const [activeView, setActiveView] = useState<'data' | 'projections'>('data');
  const [activeChart, setActiveChart] = useState<'economic' | 'fiscal' | 'political' | 'markets'>('economic');

  const fullSnapshots = useMemo(() => {
    if (!snapshots || snapshots.length === 0) {
      return ANALYSIS_HISTORICAL_BASELINE;
    }

    const firstGameDate = snapshots[0].date;
    const baselineBeforeGame = ANALYSIS_HISTORICAL_BASELINE.filter((snapshot) => snapshot.date < firstGameDate);
    return [...baselineBeforeGame, ...snapshots];
  }, [snapshots]);

  const fiscalRule = getFiscalRuleById(gameState.political.chosenFiscalRule);
  const compliance = gameState.political.fiscalRuleCompliance || {
    overallCompliant: true,
    consecutiveBreaches: 0,
    currentBudgetMet: true,
    overallBalanceMet: true,
    deficitCeilingMet: true,
    debtTargetMet: true,
    debtFallingMet: true,
  };

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  const formatDate = (dateStr: string) => {
    const [year, month] = dateStr.split('-');
    return `${monthNames[parseInt(month) - 1]} ${year.slice(2)}`;
  };

  const chartTabs = [
    { id: 'economic' as const, label: 'Economic' },
    { id: 'fiscal' as const, label: 'Fiscal' },
    { id: 'political' as const, label: 'Political' },
    { id: 'markets' as const, label: 'Markets' },
  ];

  const buildUncertaintyBands = (values: number[], floor: number): number[] => {
    return values.map((_, index) => {
      const start = Math.max(0, index - 11);
      const sample = values.slice(start, index + 1);
      if (sample.length < 3) return floor;
      const mean = sample.reduce((sum, value) => sum + value, 0) / sample.length;
      const variance = sample.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / sample.length;
      return Math.max(floor, Math.sqrt(variance));
    });
  };

  const withBands = (rawData: { label: string; value: number }[], floor: number) => {
    const bands = buildUncertaintyBands(rawData.map((entry) => entry.value), floor);
    return rawData.map((entry, index) => ({ ...entry, band: bands[index] }));
  };

  // Helper to render a simple line chart using SVG
  const MiniChart: React.FC<{
    data: { label: string; value: number; band?: number }[];
    color: string;
    height?: number;
    target?: number;
    targetLabel?: string;
    formatValue?: (v: number) => string;
    title: string;
  }> = ({ data, color, height = 200, target, targetLabel, formatValue = (v) => v.toFixed(1), title }) => {
    if (data.length < 2) {
      return (
        <div className="bg-white border border-gray-200 p-4 rounded-sm">
          <div className="text-sm font-semibold text-gray-700 mb-2">{title}</div>
          <div className="text-xs text-gray-500 italic">Not enough data yet. Advance a few months.</div>
        </div>
      );
    }

    const values = data.map(d => d.value);
    const upperValues = data.map(d => d.value + (d.band || 0));
    const lowerValues = data.map(d => d.value - (d.band || 0));
    let min = Math.min(...values);
    let max = Math.max(...values);
    min = Math.min(min, ...lowerValues);
    max = Math.max(max, ...upperValues);
    if (target !== undefined) {
      min = Math.min(min, target);
      max = Math.max(max, target);
    }
    const range = max - min || 1;
    const padding = range * 0.1;
    const yMin = min - padding;
    const yMax = max + padding;
    const yRange = yMax - yMin;

    const width = 600;
    const chartHeight = height;
    const xStep = width / (data.length - 1);

    const points = data.map((d, i) => ({
      x: i * xStep,
      y: chartHeight - ((d.value - yMin) / yRange) * chartHeight,
    }));

    const upperPoints = data.map((d, i) => ({
      x: i * xStep,
      y: chartHeight - (((d.value + (d.band || 0)) - yMin) / yRange) * chartHeight,
    }));

    const lowerPoints = data.map((d, i) => ({
      x: i * xStep,
      y: chartHeight - (((d.value - (d.band || 0)) - yMin) / yRange) * chartHeight,
    }));

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const bandPathD =
      upperPoints.length > 1
        ? `${upperPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')} ` +
          `${lowerPoints
            .slice()
            .reverse()
            .map((p, i) => `${i === 0 ? 'L' : 'L'} ${p.x} ${p.y}`)
            .join(' ')} Z`
        : '';

    const latestValue = data[data.length - 1]?.value;
    const previousValue = data.length > 1 ? data[data.length - 2]?.value : latestValue;
    const change = latestValue - previousValue;

    const xLabelStep = data.length > 72 ? 12 : 6;

    return (
      <div className="bg-white border border-gray-200 p-4 rounded-sm">
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="text-sm font-semibold text-gray-700">{title}</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold" style={{ color }}>{formatValue(latestValue)}</div>
            <div className={`text-xs ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change >= 0 ? '+' : ''}{formatValue(change)} this month
            </div>
          </div>
        </div>
        <svg viewBox={`-10 -10 ${width + 20} ${chartHeight + 36}`} className="w-full" style={{ height: `${chartHeight + 24}px` }}>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map(frac => {
            const y = frac * chartHeight;
            const val = yMax - frac * yRange;
            return (
              <g key={frac}>
                <line x1={0} y1={y} x2={width} y2={y} stroke="#e5e7eb" strokeWidth={1} />
                <text x={-5} y={y + 3} textAnchor="end" fill="#9ca3af" fontSize={10}>
                  {formatValue(val)}
                </text>
              </g>
            );
          })}
          {/* Target line */}
          {target !== undefined && (
            <>
              <line
                x1={0}
                y1={chartHeight - ((target - yMin) / yRange) * chartHeight}
                x2={width}
                y2={chartHeight - ((target - yMin) / yRange) * chartHeight}
                stroke="#ef4444"
                strokeWidth={1.5}
                strokeDasharray="6,3"
              />
              <text
                x={width + 5}
                y={chartHeight - ((target - yMin) / yRange) * chartHeight + 3}
                fill="#ef4444"
                fontSize={10}
              >
                {targetLabel || `Target: ${formatValue(target)}`}
              </text>
            </>
          )}
          {/* Uncertainty band (rolling 12-month 1σ) */}
          {bandPathD && (
            <path d={bandPathD} fill={color} fillOpacity={0.12} stroke="none" />
          )}
          {/* Data line */}
          <path d={pathD} fill="none" stroke={color} strokeWidth={2.5} />
          {/* Data points */}
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={i === points.length - 1 ? 4 : 2} fill={color} />
          ))}
          {/* X-axis baseline */}
          <line x1={0} y1={chartHeight} x2={width} y2={chartHeight} stroke="#9ca3af" strokeWidth={1} />
          {/* X-axis labels */}
          {data.map((d, i) => {
            if (i % xLabelStep === 0 || i === data.length - 1) {
              return (
                <g key={i}>
                  <line
                    x1={i * xStep}
                    y1={chartHeight}
                    x2={i * xStep}
                    y2={chartHeight + 5}
                    stroke="#9ca3af"
                    strokeWidth={1}
                  />
                  <text
                    x={i * xStep}
                    y={chartHeight + 18}
                    textAnchor="middle"
                    fill="#4b5563"
                    fontSize={10}
                    fontWeight={500}
                  >
                    {d.label}
                  </text>
                </g>
              );
            }
            return null;
          })}
        </svg>
        <div className="text-xs text-gray-500 mt-1">Shaded band: rolling 12-month uncertainty (1σ)</div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6 bg-bg-default min-h-screen">
      {/* Main View Tabs - Underline Style */}
      <div className="border-b border-border-custom">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveView('data')}
            className={`px-4 py-3 font-semibold transition-colors border-b-2 ${
              activeView === 'data'
                ? 'text-accent border-accent'
                : 'text-tertiary border-transparent hover:text-primary'
            }`}
          >
            Data
          </button>
          <button
            onClick={() => setActiveView('projections')}
            className={`px-4 py-3 font-semibold transition-colors border-b-2 ${
              activeView === 'projections'
                ? 'text-accent border-accent'
                : 'text-tertiary border-transparent hover:text-primary'
            }`}
          >
            Projections
          </button>
        </div>
      </div>

      {activeView === 'data' && (
        <>
          {/* Fiscal Rules Status */}
          <div className="bg-bg-surface border border-border-custom p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-display text-lg font-semibold text-primary">Fiscal Framework: {fiscalRule.name}</h3>
                <p className="text-sm text-secondary">{fiscalRule.shortDescription}</p>
              </div>
              <div className={`px-4 py-2 text-sm font-semibold border ${
                compliance.overallCompliant
                  ? 'bg-status-good-subtle text-status-good border-status-good'
                  : 'bg-status-bad-subtle text-status-bad border-status-bad'
              }`}>
                {compliance.overallCompliant ? 'COMPLIANT' : `NON-COMPLIANT (${compliance.consecutiveBreaches} months)`}
              </div>
            </div>
            <div className="grid grid-cols-5 gap-3 text-sm">
              {fiscalRule.rules.currentBudgetBalance && (
                <div className={`p-2 text-center border ${compliance.currentBudgetMet ? 'bg-status-good-subtle text-status-good border-status-good' : 'bg-status-bad-subtle text-status-bad border-status-bad'}`}>
                  <div className="font-semibold">{compliance.currentBudgetMet ? 'Met' : 'Breached'}</div>
                  <div className="text-xs">Current Budget Balance</div>
                </div>
              )}
              {fiscalRule.rules.overallBalance && (
                <div className={`p-2 text-center border ${compliance.overallBalanceMet ? 'bg-status-good-subtle text-status-good border-status-good' : 'bg-status-bad-subtle text-status-bad border-status-bad'}`}>
                  <div className="font-semibold">{compliance.overallBalanceMet ? 'Met' : 'Breached'}</div>
                  <div className="text-xs">Overall Balance</div>
                </div>
              )}
              {fiscalRule.rules.deficitCeiling !== undefined && (
                <div className={`p-2 text-center border ${compliance.deficitCeilingMet ? 'bg-status-good-subtle text-status-good border-status-good' : 'bg-status-bad-subtle text-status-bad border-status-bad'}`}>
                  <div className="font-semibold">{compliance.deficitCeilingMet ? 'Met' : 'Breached'}</div>
                  <div className="text-xs">Deficit &lt; {fiscalRule.rules.deficitCeiling}%</div>
                </div>
              )}
              {fiscalRule.rules.debtTarget !== undefined && (
                <div className={`p-2 text-center border ${compliance.debtTargetMet ? 'bg-status-good-subtle text-status-good border-status-good' : 'bg-status-bad-subtle text-status-bad border-status-bad'}`}>
                  <div className="font-semibold">{compliance.debtTargetMet ? 'Met' : 'Breached'}</div>
                  <div className="text-xs">Debt Target ({fiscalRule.rules.debtTarget}%)</div>
                </div>
              )}
              {fiscalRule.rules.debtFalling && (
                <div className={`p-2 text-center border ${compliance.debtFallingMet ? 'bg-status-good-subtle text-status-good border-status-good' : 'bg-status-bad-subtle text-status-bad border-status-bad'}`}>
                  <div className="font-semibold">{compliance.debtFallingMet ? 'Met' : 'Breached'}</div>
                  <div className="text-xs">Debt Falling</div>
                </div>
              )}
            </div>
          </div>

          {/* Chart category tabs - Underline style */}
          <div className="flex gap-2 border-b border-border-custom">
            {chartTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveChart(tab.id)}
                className={`px-5 py-2 font-semibold transition-colors border-b-2 ${
                  activeChart === tab.id
                    ? 'text-accent border-accent'
                    : 'text-tertiary border-transparent hover:text-primary'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

      {/* Charts */}
          {activeChart === 'economic' && (
            <div className="grid grid-cols-2 gap-4">
              <MiniChart
                title="GDP Growth (Annual %)"
                data={withBands(fullSnapshots.map(s => ({ label: formatDate(s.date), value: s.gdpGrowth })), 0.2)}
                color="var(--color-accent)"
                target={1.5}
                targetLabel="Trend: 1.5%"
                formatValue={(v) => `${v.toFixed(1)}%`}
              />
              <MiniChart
                title="CPI Inflation (%)"
                data={withBands(fullSnapshots.map(s => ({ label: formatDate(s.date), value: s.inflation })), 0.15)}
                color="var(--color-status-bad)"
                target={2.0}
                targetLabel="Target: 2.0%"
                formatValue={(v) => `${v.toFixed(1)}%`}
              />
              <MiniChart
                title="Unemployment Rate (%)"
                data={withBands(fullSnapshots.map(s => ({ label: formatDate(s.date), value: s.unemployment })), 0.1)}
                color="var(--color-secondary)"
                target={4.25}
                targetLabel="NAIRU: 4.25%"
                formatValue={(v) => `${v.toFixed(1)}%`}
              />
              <MiniChart
                title="Wage Growth (Annual %)"
                data={withBands(fullSnapshots.map(s => ({
                  label: formatDate(s.date),
                  value: clamp(1.4 + (s.inflation * 0.65) - ((s.unemployment - 4.25) * 0.45), -1.5, 9.5),
                })), 0.25)}
                color="var(--color-status-good)"
                formatValue={(v) => `${v.toFixed(1)}%`}
              />
              <div className="col-span-2">
                <MiniChart
                  title="Nominal GDP (£bn) — the base used for all deficit and debt ratios"
                  data={withBands(fullSnapshots.map(s => ({ label: formatDate(s.date), value: (s as any).gdpNominal ?? 0 })), 5)}
                  color="var(--color-accent)"
                  formatValue={(v) => {
                    if (v >= 1000) return `£${(v / 1000).toFixed(2)}tn`;
                    return `£${Math.round(v)}bn`;
                  }}
                />
              </div>
            </div>
          )}

          {activeChart === 'fiscal' && (
            <div className="grid grid-cols-2 gap-4">
              <MiniChart
                title="Budget Deficit (% of GDP)"
                data={withBands(fullSnapshots.map(s => ({ label: formatDate(s.date), value: s.deficit })), 0.15)}
                color="var(--color-status-bad)"
                target={fiscalRule.rules.deficitCeiling}
                targetLabel={fiscalRule.rules.deficitCeiling ? `Ceiling: ${fiscalRule.rules.deficitCeiling}%` : undefined}
                formatValue={(v) => `${v.toFixed(1)}%`}
              />
              <MiniChart
                title="Public Debt (% of GDP)"
                data={withBands(fullSnapshots.map(s => ({ label: formatDate(s.date), value: s.debt })), 0.3)}
                color="var(--color-warning)"
                target={fiscalRule.rules.debtTarget}
                targetLabel={fiscalRule.rules.debtTarget ? `Target: ${fiscalRule.rules.debtTarget}%` : undefined}
                formatValue={(v) => `${v.toFixed(1)}%`}
              />
              <div className="bg-bg-surface border border-border-custom p-4">
                <div className="text-sm font-semibold text-primary mb-3">Revenue vs Spending (£bn)</div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-secondary">Nominal GDP:</span>
                    <span className="font-semibold text-accent">
                      {gameState.economic.gdpNominal_bn >= 1000
                        ? `£${(gameState.economic.gdpNominal_bn / 1000).toFixed(3)}tn`
                        : `£${Math.round(gameState.economic.gdpNominal_bn)}bn`}
                    </span>
                  </div>
                  <hr className="my-1 border-border-custom" />
                  <div className="flex justify-between">
                    <span className="text-sm text-secondary">Total Revenue:</span>
                    <span className="font-semibold text-status-good">£{gameState.fiscal.totalRevenue_bn.toFixed(1)}bn</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-secondary">Total Spending:</span>
                    <span className="font-semibold text-status-bad">£{gameState.fiscal.totalSpending_bn.toFixed(1)}bn</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-secondary">Debt Interest:</span>
                    <span className="font-semibold text-warning">£{gameState.fiscal.debtInterest_bn.toFixed(1)}bn</span>
                  </div>
                  <hr className="my-1 border-border-custom" />
                  <div className="flex justify-between font-bold">
                    <span className="text-sm">Net Deficit:</span>
                    <span className={gameState.fiscal.deficit_bn > 0 ? 'text-status-bad' : 'text-status-good'}>
                      £{Math.abs(gameState.fiscal.deficit_bn).toFixed(1)}bn {gameState.fiscal.deficit_bn > 0 ? 'deficit' : 'surplus'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-secondary">Fiscal Headroom:</span>
                    <span className="font-semibold">£{gameState.fiscal.fiscalHeadroom_bn.toFixed(1)}bn</span>
                  </div>
                </div>
              </div>
              <div className="bg-bg-surface border border-border-custom p-4">
                <div className="text-sm font-semibold text-primary mb-3">Spending Breakdown (£bn)</div>
                <div className="space-y-1 text-sm">
                  {Object.entries(gameState.fiscal.spending)
                    .sort(([, a], [, b]) => b - a)
                    .map(([dept, amount]) => (
                      <div key={dept} className="flex justify-between">
                        <span className="text-secondary capitalize">{dept}</span>
                        <span className="font-semibold">£{amount.toFixed(1)}bn</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {activeChart === 'political' && (
            <div className="grid grid-cols-2 gap-4">
              <MiniChart
                title="Government Approval (%)"
                data={withBands(fullSnapshots.map(s => ({ label: formatDate(s.date), value: s.approval })), 1.0)}
                color="var(--color-accent)"
                target={38}
                targetLabel="Danger: 38%"
                formatValue={(v) => `${v.toFixed(0)}%`}
              />
              <div className="bg-bg-surface border border-border-custom p-4">
                <div className="text-sm font-semibold text-primary mb-3">Political Health</div>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-secondary">PM Trust</span>
                      <span className="font-semibold">{Math.round(gameState.political.pmTrust)}/100</span>
                    </div>
                    <div className="w-full bg-bg-elevated h-2">
                      <div
                        className={`h-2 ${gameState.political.pmTrust > 50 ? 'bg-status-good' : gameState.political.pmTrust > 30 ? 'bg-warning' : 'bg-status-bad'}`}
                        style={{ width: `${gameState.political.pmTrust}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-secondary">Backbench Satisfaction</span>
                      <span className="font-semibold">{Math.round(gameState.political.backbenchSatisfaction)}/100</span>
                    </div>
                    <div className="w-full bg-bg-elevated h-2">
                      <div
                        className={`h-2 ${gameState.political.backbenchSatisfaction > 50 ? 'bg-status-good' : gameState.political.backbenchSatisfaction > 30 ? 'bg-warning' : 'bg-status-bad'}`}
                        style={{ width: `${gameState.political.backbenchSatisfaction}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-secondary">Credibility Index</span>
                      <span className="font-semibold">{Math.round(gameState.political.credibilityIndex)}/100</span>
                    </div>
                    <div className="w-full bg-bg-elevated h-2">
                      <div
                        className="h-2 bg-accent"
                        style={{ width: `${gameState.political.credibilityIndex}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-secondary">Strike Risk</span>
                      <span className="font-semibold">{Math.round(gameState.political.strikeRisk)}%</span>
                    </div>
                    <div className="w-full bg-bg-elevated h-2">
                      <div
                        className={`h-2 ${gameState.political.strikeRisk < 30 ? 'bg-status-good' : gameState.political.strikeRisk < 60 ? 'bg-warning' : 'bg-status-bad'}`}
                        style={{ width: `${gameState.political.strikeRisk}%` }}
                      />
                    </div>
                  </div>
                  <div className="pt-2 border-t border-border-custom">
                    <div className="flex justify-between text-sm">
                      <span className="text-secondary">Credit Rating</span>
                      <span className="font-bold">{gameState.political.creditRating || 'AA-'} ({gameState.political.creditRatingOutlook || 'stable'})</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm">
                      <span className="text-secondary">Manifesto Breaches</span>
                      <span className={`font-bold ${gameState.manifesto.totalViolations > 0 ? 'text-status-bad' : 'text-status-good'}`}>
                        {gameState.manifesto.totalViolations}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeChart === 'markets' && (
            <div className="grid grid-cols-2 gap-4">
              <MiniChart
                title="10-Year Gilt Yield (%)"
                data={withBands(fullSnapshots.map(s => ({ label: formatDate(s.date), value: s.giltYield })), 0.08)}
                color="var(--color-warning)"
                target={5.5}
                targetLabel="Danger: 5.5%"
                formatValue={(v) => `${v.toFixed(2)}%`}
              />
              <div className="bg-bg-surface border border-border-custom p-4">
                <div className="text-sm font-semibold text-primary mb-3">Market Indicators</div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary">Bank Rate</span>
                    <span className="font-bold">{gameState.markets.bankRate.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary">2Y Gilt Yield</span>
                    <span className="font-bold">{gameState.markets.giltYield2y.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary">10Y Gilt Yield</span>
                    <span className="font-bold">{gameState.markets.giltYield10y.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary">30Y Gilt Yield</span>
                    <span className="font-bold">{gameState.markets.giltYield30y.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary">2Y Mortgage Rate</span>
                    <span className="font-bold">{gameState.markets.mortgageRate2y.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary">Sterling Index</span>
                    <span className={`font-bold ${gameState.markets.sterlingIndex >= 100 ? 'text-status-good' : 'text-status-bad'}`}>
                      {gameState.markets.sterlingIndex.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Service Quality */}
          <div className="bg-bg-surface border border-border-custom p-4">
            <div className="text-sm font-semibold text-primary mb-3">Public Services Quality Indices</div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { label: 'NHS Quality', value: gameState.services.nhsQuality },
                { label: 'Education Quality', value: gameState.services.educationQuality },
                { label: 'Infrastructure Quality', value: gameState.services.infrastructureQuality },
                { label: 'Mental Health Access', value: gameState.services.mentalHealthAccess },
                { label: 'Primary Care Access', value: gameState.services.primaryCareAccess },
                { label: 'Social Care Quality', value: gameState.services.socialCareQuality },
                { label: 'Prison Safety', value: gameState.services.prisonSafety },
                { label: 'Court Performance', value: gameState.services.courtBacklogPerformance },
                { label: 'Legal Aid Access', value: gameState.services.legalAidAccess },
                { label: 'Policing Effectiveness', value: gameState.services.policingEffectiveness },
                { label: 'Border Performance', value: gameState.services.borderSecurityPerformance },
                { label: 'Rail Reliability', value: gameState.services.railReliability },
                { label: 'Affordable Housing Delivery', value: gameState.services.affordableHousingDelivery },
                { label: 'Flood Resilience', value: gameState.services.floodResilience },
                { label: 'Innovation Output', value: gameState.services.researchInnovationOutput },
              ].map((metric) => (
                <div key={metric.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-secondary">{metric.label}</span>
                    <span className="font-semibold">{Math.round(metric.value)}/100</span>
                  </div>
                  <div className="w-full bg-bg-elevated h-2">
                    <div
                      className={`h-2 ${metric.value > 60 ? 'bg-status-good' : metric.value > 40 ? 'bg-warning' : 'bg-status-bad'}`}
                      style={{ width: `${metric.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {activeView === 'projections' && (
        <ProjectionsView
          gameState={gameState}
          formatDate={formatDate}
          MiniChart={MiniChart}
          withBands={withBands}
        />
      )}
    </div>
  );
};

// ===========================
// Main Game Component
// ===========================

const GameInner: React.FC = () => {
  const gameState = useGameState();
  const actions = useGameActions();
  const metadata = gameState.metadata;
  const [showTutorial, setShowTutorial] = useState(false);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [showNewspaper, setShowNewspaper] = useState(false);
  const [showSaveLoad, setShowSaveLoad] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [saveSlotName, setSaveSlotName] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lobbyingMPId, setLobbyingMPId] = useState<string | null>(null);
  const [detailMPId, setDetailMPId] = useState<string | null>(null);

  const handleAdvanceTurn = useCallback(() => {
    actions.advanceTurn();
    setTimeout(() => setShowNewspaper(true), 100);
  }, [actions]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName;
      const isEditable = !!target && (
        target.isContentEditable ||
        tagName === 'INPUT' ||
        tagName === 'TEXTAREA' ||
        tagName === 'SELECT'
      );

      if (event.key === 'Escape') {
        if (showShortcuts) {
          setShowShortcuts(false);
          return;
        }
        if (showSaveLoad) {
          setShowSaveLoad(false);
          return;
        }
        if (showNewspaper) {
          setShowNewspaper(false);
          return;
        }
        if (lobbyingMPId) {
          setLobbyingMPId(null);
          return;
        }
        if (detailMPId) {
          setDetailMPId(null);
        }
        return;
      }

      if (isEditable) {
        return;
      }

      if (event.key === '?') {
        event.preventDefault();
        setShowShortcuts(true);
        return;
      }

      if (event.key === '/') {
        event.preventDefault();
        setCurrentView('budget');
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        handleAdvanceTurn();
        return;
      }

      const shortcutView = VIEW_SHORTCUTS[event.key];
      if (shortcutView) {
        event.preventDefault();
        setCurrentView(shortcutView);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [detailMPId, handleAdvanceTurn, lobbyingMPId, showNewspaper, showSaveLoad, showShortcuts]);

  // Game start screen
  if (!metadata.gameStarted) {
    return <GameStartScreen onStart={(manifestoId, fiscalRuleId, difficultyMode) => actions.startNewGame(undefined, manifestoId, fiscalRuleId, difficultyMode)} />;
  }

  // Game over modal
  if (metadata.gameOver) {
    return (
      <>
        <Dashboard
          state={gameState}
          adviserSystem={gameState.advisers as any}
        />
        <GameOverModal
          reason={metadata.gameOverReason || 'Game over'}
          onRestart={() => actions.startNewGame()}
        />
      </>
    );
  }

  // Check for active PM intervention
  const activePMIntervention = gameState.political.pmInterventionsPending?.[0];

  // Check for pending events that need response
  const pendingEvents = gameState.events?.pendingEvents || [];
  const activeEvent = pendingEvents[0];

  // Get current newspaper
  const currentNewspaper = (gameState.events as any)?.currentNewspaper as NewsArticle | null;

  // Count hired advisers - handle both Map (runtime) and plain object (after JSON parse)
  const hiredAdvisers = (gameState.advisers as any)?.hiredAdvisers;
  const adviserCount = hiredAdvisers instanceof Map
    ? hiredAdvisers.size
    : (typeof hiredAdvisers === 'object' && hiredAdvisers !== null
      ? Object.keys(hiredAdvisers).length
      : 0);

  // Event log entries
  const eventLog = gameState.events?.eventLog || [];

  // Handle event response
  const handleEventResponse = (response: EventResponseOption) => {
    if (activeEvent) {
      const responseIndex = activeEvent.responseOptions?.indexOf(response) ?? -1;
      if (responseIndex >= 0) {
        actions.respondToEvent(activeEvent.id, responseIndex);
      }
    }
  };

  // Main game
  return (
    <div className="treasury-shell">
      <TurnPanel onAdvanceTurn={handleAdvanceTurn} />

      {showShortcuts && <ShortcutsHelpModal onClose={() => setShowShortcuts(false)} />}

      {gameState.parliamentary.lordsDelayActive && (
        <div className="bg-warning-subtle border-y border-warning px-6 py-2 text-warning text-sm">
          Lords Scrutiny: {gameState.parliamentary.lordsDelayTurnsRemaining} turns remaining. Delayed bill type: {gameState.parliamentary.lordsDelayBillType || 'budget package'}.
        </div>
      )}

      <div className="treasury-shell-grid">
        <NavigationBar
          currentView={currentView}
          onViewChange={setCurrentView}
          adviserCount={adviserCount}
          manifestoViolations={gameState.manifesto.totalViolations}
          onSaveLoad={() => setShowSaveLoad(true)}
        />

        <div className="relative min-w-0">
        {currentView === 'dashboard' && (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="flex-1">
              <Dashboard
                state={gameState}
                adviserSystem={gameState.advisers as any}
              />
            </div>
            {eventLog.length > 0 && (
              <div className="treasury-card-strong w-full flex-shrink-0">
                <EventLogPanel events={eventLog} />
              </div>
            )}
          </div>
        )}

        {currentView === 'budget' && (
          <BudgetSystem
            adviserSystem={gameState.advisers as any}
          />
        )}

        {currentView === 'analysis' && (
          <AnalysisTab />
        )}

        {currentView === 'advisers' && (
          <AdviserManagementScreen
            currentMonth={metadata.currentTurn}
            adviserSystem={gameState.advisers as any}
            onHire={(type) => actions.hireAdviser(type)}
            onFire={(type) => actions.fireAdviser(type)}
            onBack={() => setCurrentView('dashboard')}
          />
        )}

        {currentView === 'mps' && (
          <MPManagementScreen
            mpSystem={gameState.mpSystem}
            onLobby={(mpId) => setLobbyingMPId(mpId)}
            onViewDetails={(mpId) => setDetailMPId(mpId)}
            onBack={() => setCurrentView('dashboard')}
          />
        )}

        {currentView === 'pm-messages' && <PMMessagesScreen />}

        {currentView === 'manifesto' && (
          <div className="treasury-card-strong p-6">
            <ManifestoDisplay
              manifestoState={gameState.manifesto}
              gameState={{
                currentTaxRates: {
                  incomeTaxBasic: gameState.fiscal.incomeTaxBasicRate,
                  incomeTaxHigher: gameState.fiscal.incomeTaxHigherRate,
                  incomeTaxAdditional: gameState.fiscal.incomeTaxAdditionalRate,
                  niEmployee: gameState.fiscal.nationalInsuranceRate,
                  niEmployer: gameState.fiscal.employerNIRate,
                  vat: gameState.fiscal.vatRate,
                  corporationTax: gameState.fiscal.corporationTaxRate,
                },
                startingTaxRates: gameState.fiscal.startingTaxRates,
                fiscalRuleMet: gameState.political.fiscalRuleCompliance?.overallCompliant ?? true,
              }}
              onExecuteOneClick={(result: OneClickActionResult) => {
                actions.executeManifestoOneClick(result.pledgeId);
              }}
            />
          </div>
        )}
        </div>
      </div>

      {/* Lobbying Modal */}
      {lobbyingMPId && (() => {
        const mp = gameState.mpSystem.allMPs.get(lobbyingMPId);
        if (!mp) return null;

        const brokenPromisesCount = Array.from(gameState.mpSystem.promises.values()).filter(
          (p) => p.promisedToMPs.includes(lobbyingMPId) && p.broken
        ).length;

        return (
          <LobbyingModal
            mp={mp}
            brokenPromisesCount={brokenPromisesCount}
            onClose={() => setLobbyingMPId(null)}
            onLobby={async (approach, promiseCategory, specificValue) => {
              const result = await actions.lobbyMP(lobbyingMPId, approach, promiseCategory, specificValue);
              return result;
            }}
          />
        );
      })()}

      {/* MP Detail Modal */}
      {detailMPId && (() => {
        const mp = gameState.mpSystem.allMPs.get(detailMPId);
        if (!mp) return null;

        const stance = gameState.mpSystem.currentBudgetSupport.get(detailMPId);
        const votingRecord = gameState.mpSystem.votingRecords.get(detailMPId);

        return (
          <MPDetailModal
            mp={mp}
            votingRecord={votingRecord}
            promises={gameState.mpSystem.promises}
            stance={stance}
            onClose={() => setDetailMPId(null)}
          />
        );
      })()}

      {/* Newspaper Modal - shown after each turn */}
      {showNewspaper && currentNewspaper && (
        <Newspaper
          article={currentNewspaper}
          onClose={() => setShowNewspaper(false)}
        />
      )}

      {/* Event Response Modal - shown when major events need player response */}
      {activeEvent && activeEvent.requiresResponse && !showNewspaper && (
        <EventModal
          event={activeEvent}
          onRespond={handleEventResponse}
          onDismiss={() => {
            // For events without response options, just dismiss
            actions.respondToEvent(activeEvent.id, 0);
          }}
        />
      )}

      {/* PM Intervention Modal */}
      {activePMIntervention && !showNewspaper && !activeEvent?.requiresResponse && (
        <PMInterventionModal
          event={activePMIntervention}
          onComply={() => actions.respondToPMIntervention('comply')}
          onDefy={() => actions.respondToPMIntervention('defy')}
        />
      )}

      {gameState.spendingReview?.inReview && !showNewspaper && (
        <SpendingReviewModal
          spendingReview={gameState.spendingReview}
          fiscalHeadroom_bn={gameState.fiscal.fiscalHeadroom_bn}
          onConfirm={(plans) => actions.setSpendingReviewPlans(plans)}
        />
      )}

      {/* Save/Load Modal */}
      {showSaveLoad && (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 p-8">
          <div className="bg-bg-elevated border border-border-custom shadow-lg max-w-md w-full p-6">
            <h2 className="font-display text-xl font-semibold text-text-primary mb-4">Save / Load Game</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">Save Slot Name</label>
                <input
                  type="text"
                  value={saveSlotName}
                  onChange={(e) => {
                    setSaveSlotName(e.target.value);
                    setLoadError(null);
                  }}
                  placeholder="e.g. my-save-1"
                  className="input w-full"
                />
                {loadError && (
                  <div className="mt-2 bg-bad-subtle border border-bad px-3 py-2 text-sm text-bad">
                    {loadError}
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (saveSlotName.trim()) {
                      actions.saveGame(saveSlotName.trim());
                      setShowSaveLoad(false);
                    }
                  }}
                  className="flex-1 btn btn-primary"
                >
                  Save Game
                </button>
                <button
                  onClick={() => {
                    if (saveSlotName.trim()) {
                      const loaded = actions.loadGame(saveSlotName.trim());
                      if (!loaded) {
                        setLoadError('No save found with that name.');
                      } else {
                        setShowSaveLoad(false);
                        setLoadError(null);
                      }
                    }
                  }}
                  className="flex-1 btn btn-secondary"
                >
                  Load Game
                </button>
              </div>
              <button
                onClick={() => setShowSaveLoad(false)}
                className="w-full btn btn-ghost"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <HelpButton onClick={() => setShowTutorial(true)} />
      <TutorialModal isOpen={showTutorial} onClose={() => setShowTutorial(false)} />
    </div>
  );
};

// ===========================
// App with Provider
// ===========================

const ChancellorGame: React.FC = () => {
  return (
    <GameStateProvider>
      <GameInner />
    </GameStateProvider>
  );
};

export default ChancellorGame;
