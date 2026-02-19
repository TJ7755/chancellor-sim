// Main Game Component - Hyper-Realistic UK Chancellor Simulation
// Integrates all systems into a complete playable game

import React, { useMemo, useState } from 'react';
import {
  GameStateProvider,
  useGameState,
  useGameActions,
  useGameMetadata,
  useMPSystem,
  DifficultyMode,
} from './game-state';
import { ManifestoDisplay, MANIFESTO_TEMPLATES, OneClickActionResult } from './manifesto-system';
import { TutorialModal, HelpButton } from './tutorial-system';
import BudgetSystem from './budget-system';
import {
  AdviserManagementScreen,
  AdviserType,
} from './adviser-system';
import { MPManagementScreen, LobbyingModal } from './mp-system';
import { PMMessagesScreen } from './pm-messages-screen';
import { PMInterventionModal } from './political-system';
import { Newspaper, EventModal, EventLogPanel } from './events-media';
import { SocialMediaSidebar } from './social-media-system';
import type { NewsArticle, EventResponseOption } from './events-media';
import { FISCAL_RULES, FiscalRuleId, getFiscalRuleById } from './game-integration';
import { generateProjections, summariseProjections } from './projections-engine';

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
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyMode>('standard');
  const [step, setStep] = useState<'manifesto' | 'fiscal-rules'>('manifesto');

  if (step === 'fiscal-rules') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="max-w-5xl w-full bg-white shadow-2xl rounded-sm border-t-8 border-red-700">
          <div className="bg-red-700 text-white p-6">
            <h1 className="text-4xl font-bold">HM Treasury</h1>
            <h2 className="text-2xl mt-2">Choose Your Fiscal Framework</h2>
          </div>

          <div className="p-8">
            <div className="prose max-w-none mb-6">
              <p className="text-gray-700 leading-relaxed">
                Your first act as Chancellor is to set the fiscal rules that will govern
                your Chancellorship. This is perhaps the most important decision you will make.
                Markets will react immediately to your choice. The rules you set will determine
                your room for manoeuvre on spending and tax for the entire parliament.
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Choose carefully: once announced, changing your fiscal rules will be seen as
                a sign of weakness and severely damage market confidence.
              </p>
            </div>

            <div className="space-y-3 mb-8">
              {FISCAL_RULES.map((rule) => {
                const isSelected = selectedFiscalRule === rule.id;
                const marketColor = rule.marketReaction.giltYieldBps <= 0 ? 'text-green-700' : 'text-red-700';
                const politicalColor = rule.politicalReaction.backbenchChange >= 0 ? 'text-green-700' : 'text-red-700';

                return (
                  <button
                    key={rule.id}
                    onClick={() => setSelectedFiscalRule(rule.id)}
                    className={`w-full text-left p-5 border-2 rounded-sm transition-all ${
                      isSelected
                        ? 'border-red-700 bg-red-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-bold text-gray-900 text-lg">{rule.name}</div>
                        <div className="text-sm text-gray-700 mt-1">{rule.shortDescription}</div>
                        {isSelected && (
                          <div className="mt-3 space-y-2">
                            <p className="text-sm text-gray-600">{rule.detailedDescription}</p>
                            <p className="text-xs text-gray-500 italic">{rule.historicalPrecedent}</p>
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
                        <div className="text-xs text-gray-500 mt-1">
                          Credibility: {rule.marketReaction.credibilityChange > 0 ? '+' : ''}{rule.marketReaction.credibilityChange}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mb-8">
              <h4 className="text-xl font-bold text-gray-900 mb-3">Difficulty</h4>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setSelectedDifficulty('forgiving')}
                  className={`p-3 border-2 rounded-sm text-left transition-all ${
                    selectedDifficulty === 'forgiving'
                      ? 'border-green-700 bg-green-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="font-semibold text-green-800">Forgiving</div>
                  <div className="text-xs text-gray-600 mt-1">Lower volatility, later crisis triggers</div>
                </button>
                <button
                  onClick={() => setSelectedDifficulty('standard')}
                  className={`p-3 border-2 rounded-sm text-left transition-all ${
                    selectedDifficulty === 'standard'
                      ? 'border-blue-700 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="font-semibold text-blue-800">Standard</div>
                  <div className="text-xs text-gray-600 mt-1">Balanced realism and playability</div>
                </button>
                <button
                  onClick={() => setSelectedDifficulty('realistic')}
                  className={`p-3 border-2 rounded-sm text-left transition-all ${
                    selectedDifficulty === 'realistic'
                      ? 'border-red-700 bg-red-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="font-semibold text-red-800">Realistic</div>
                  <div className="text-xs text-gray-600 mt-1">Higher volatility, stricter political/market discipline</div>
                </button>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep('manifesto')}
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-sm hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => onStart(
                  selectedManifesto === 'random' ? '' : selectedManifesto,
                  selectedFiscalRule,
                  selectedDifficulty
                )}
                className="flex-1 bg-red-700 hover:bg-red-800 text-white font-bold py-3 px-6 rounded-sm transition-colors text-lg"
              >
                Announce Fiscal Framework and Begin
              </button>
            </div>

            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-sm">
              <p className="text-xs text-yellow-800">
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="max-w-4xl w-full bg-white shadow-2xl rounded-sm border-t-8 border-red-700">
        <div className="bg-red-700 text-white p-6">
          <h1 className="text-4xl font-bold">HM Treasury</h1>
          <h2 className="text-2xl mt-2">Chancellor of the Exchequer Simulation</h2>
        </div>

        <div className="p-8">
          <div className="prose max-w-none mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Welcome, Chancellor
            </h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              It is July 2024. Labour has just won a historic landslide victory with a
              majority of 174 seats. The public have high expectations. Your task is to
              manage the UK economy and public finances for the full five-year term until
              the next election in 2029.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              You must balance economic growth, sound public finances, quality public
              services, and political survival. The Prime Minister will not hesitate to
              sack you if you lose their confidence. Backbenchers will revolt if you
              threaten their seats. The markets will punish fiscal irresponsibility.
            </p>
            <p className="text-gray-700 leading-relaxed">
              <strong>This simulation is brutally realistic.</strong> Every policy has
              trade-offs. Breaking manifesto pledges has consequences. Economic
              relationships are based on real UK data and OBR forecasts.
            </p>
          </div>

          <div className="mb-8">
            <h4 className="text-xl font-bold text-gray-900 mb-4">
              Select Your Manifesto
            </h4>
            <p className="text-sm text-gray-600 mb-4">
              Different manifestos have different pledges and constraints. Choose
              carefully - breaking pledges damages trust and approval.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => setSelectedManifesto('random')}
                className={`w-full text-left p-4 border-2 rounded-sm transition-all ${
                  selectedManifesto === 'random'
                    ? 'border-red-700 bg-red-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="font-semibold text-gray-900">Random Manifesto</div>
                <div className="text-sm text-gray-600 mt-1">
                  System will randomly select one of the five manifesto templates
                </div>
              </button>

              {MANIFESTO_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedManifesto(template.id)}
                  className={`w-full text-left p-4 border-2 rounded-sm transition-all ${
                    selectedManifesto === template.id
                      ? 'border-red-700 bg-red-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="font-semibold text-gray-900">{template.name}</div>
                  <div className="text-sm text-gray-600 mt-1">{template.theme}</div>
                  <div className="text-xs text-gray-500 mt-2">
                    {template.pledges.length} pledges
                  </div>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setStep('fiscal-rules')}
            className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-4 px-6 rounded-sm transition-colors text-lg"
          >
            Next: Choose Fiscal Framework
          </button>

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-sm">
            <p className="text-sm text-yellow-800">
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
  const gradeColor = score >= 65 ? 'text-green-700' : score >= 45 ? 'text-yellow-700' : 'text-red-700';
  const borderColor = survived ? 'border-green-700' : 'border-red-700';
  const headerBg = survived ? 'bg-green-700' : 'bg-red-700';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-8 z-50">
      <div className={`max-w-2xl w-full bg-white shadow-2xl rounded-sm border-t-8 ${borderColor}`}>
        <div className={`${headerBg} text-white p-6`}>
          <h2 className="text-3xl font-bold">
            {survived ? 'Term Complete' : 'Chancellorship Ended'}
          </h2>
        </div>

        <div className="p-8">
          <div className="mb-6">
            <p className="text-xl text-gray-800 leading-relaxed">{reason}</p>
          </div>

          {/* Performance Grade */}
          <div className="mb-6 text-center bg-gray-50 p-6 rounded-sm">
            <div className="text-sm text-gray-500 uppercase tracking-wide mb-1">Performance Rating</div>
            <div className={`text-6xl font-black ${gradeColor}`}>{grade}</div>
            <div className={`text-lg font-semibold ${gradeColor}`}>{gradeLabel}</div>
            <div className="text-sm text-gray-500 mt-1">Score: {score}/100</div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-sm">
              <div className="text-sm text-gray-600">Months in Office</div>
              <div className="text-2xl font-bold text-gray-900">
                {metadata.currentTurn}
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-sm">
              <div className="text-sm text-gray-600">Term Progress</div>
              <div className="text-2xl font-bold text-gray-900">
                {Math.round((metadata.currentTurn / 60) * 100)}%
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-sm">
              <div className="text-sm text-gray-600">Final Approval</div>
              <div className="text-2xl font-bold text-gray-900">
                {Math.round(gameState.political.governmentApproval)}%
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-sm">
              <div className="text-sm text-gray-600">Final Deficit</div>
              <div className="text-2xl font-bold text-gray-900">
                {gameState.fiscal.deficitPctGDP.toFixed(1)}%
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Final Economic State</h3>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <span className="text-gray-600">GDP Growth:</span>{' '}
                <span className="font-semibold">
                  {gameState.economic.gdpGrowthAnnual.toFixed(1)}%
                </span>
              </div>
              <div>
                <span className="text-gray-600">Inflation:</span>{' '}
                <span className="font-semibold">
                  {gameState.economic.inflationCPI.toFixed(1)}%
                </span>
              </div>
              <div>
                <span className="text-gray-600">Unemployment:</span>{' '}
                <span className="font-semibold">
                  {gameState.economic.unemploymentRate.toFixed(1)}%
                </span>
              </div>
              <div>
                <span className="text-gray-600">Debt/GDP:</span>{' '}
                <span className="font-semibold">
                  {gameState.fiscal.debtPctGDP.toFixed(1)}%
                </span>
              </div>
              <div>
                <span className="text-gray-600">10Y Gilt:</span>{' '}
                <span className="font-semibold">
                  {gameState.markets.giltYield10y.toFixed(2)}%
                </span>
              </div>
              <div>
                <span className="text-gray-600">PM Trust:</span>{' '}
                <span className="font-semibold">
                  {Math.round(gameState.political.pmTrust)}
                </span>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Manifesto Adherence
            </h3>
            <p className="text-sm text-gray-700">
              {gameState.manifesto.totalViolations === 0
                ? 'You kept all manifesto pledges. Impressive.'
                : `You broke ${gameState.manifesto.totalViolations} manifesto pledge${
                    gameState.manifesto.totalViolations !== 1 ? 's' : ''
                  }.`}
            </p>
          </div>

          <button
            onClick={onRestart}
            className={`w-full ${headerBg} hover:opacity-90 text-white font-bold py-3 px-6 rounded-sm transition-colors`}
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

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  return (
    <div className="bg-red-700 text-white p-4 flex items-center justify-between shadow-lg">
      <div>
        <div className="text-sm opacity-90">HM Treasury</div>
        <div className="text-2xl font-bold">
          {monthNames[metadata.currentMonth - 1]} {metadata.currentYear}
        </div>
        <div className="text-sm opacity-75">
          Month {metadata.currentTurn + 1} of 60 • Term Progress:{' '}
          {Math.round((metadata.currentTurn / 60) * 100)}%
        </div>
      </div>

      <button
        onClick={onAdvanceTurn}
        className="bg-white text-red-700 font-bold py-3 px-8 rounded-sm hover:bg-gray-100 transition-colors text-lg"
      >
        Advance to Next Month →
      </button>
    </div>
  );
};

// ===========================
// Navigation Bar
// ===========================

type View = 'dashboard' | 'budget' | 'analysis' | 'advisers' | 'mps' | 'pm-messages';

interface NavigationBarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  adviserCount: number;
  onSaveLoad: () => void;
}

const NavigationBar: React.FC<NavigationBarProps> = ({
  currentView,
  onViewChange,
  adviserCount,
  onSaveLoad,
}) => {
  const gameState = useGameState();

  return (
    <nav className="bg-white border-b border-gray-300 shadow-sm">
      <div className="px-6 py-2 flex justify-between items-center">
        <div className="flex gap-2">
          <button
            onClick={() => onViewChange('dashboard')}
            className={`px-6 py-2 font-semibold rounded-sm transition-all ${
              currentView === 'dashboard'
                ? 'bg-red-700 text-white shadow-md'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Dashboard
          </button>

          <button
            onClick={() => onViewChange('budget')}
            className={`px-6 py-2 font-semibold rounded-sm transition-all ${
              currentView === 'budget'
                ? 'bg-red-700 text-white shadow-md'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Budget
          </button>

          <button
            onClick={() => onViewChange('analysis')}
            className={`px-6 py-2 font-semibold rounded-sm transition-all ${
              currentView === 'analysis'
                ? 'bg-red-700 text-white shadow-md'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Analysis
          </button>

          <button
            onClick={() => onViewChange('advisers')}
            className={`px-6 py-2 font-semibold rounded-sm transition-all ${
              currentView === 'advisers'
                ? 'bg-red-700 text-white shadow-md'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Advisers
            {adviserCount > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                {adviserCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onViewChange('mps')}
            className={`px-6 py-2 font-semibold rounded-sm transition-all ${
              currentView === 'mps'
                ? 'bg-red-700 text-white shadow-md'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            MPs
          </button>

          <button
            onClick={() => onViewChange('pm-messages')}
            className={`px-6 py-2 font-bold rounded-sm transition-all ${
              currentView === 'pm-messages'
                ? 'bg-blue-700 text-white shadow-md'
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
            }`}
          >
            PM
            {gameState?.pmRelationship?.unreadCount > 0 && (
              <span className="ml-2 bg-yellow-400 text-blue-900 text-xs font-bold rounded-full px-2 py-0.5">
                {gameState.pmRelationship.unreadCount}
              </span>
            )}
          </button>
        </div>

        <button
          onClick={onSaveLoad}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-sm transition-all"
        >
          Save / Load
        </button>
      </div>
    </nav>
  );
};

// ===========================
// Simple Dashboard Display
// ===========================

const SimpleDashboard: React.FC = () => {
  const gameState = useGameState();
  const gameActions = useGameActions();
  const [oneClickMessage, setOneClickMessage] = useState<{message: string, success: boolean} | null>(null);

  const handleOneClick = (result: OneClickActionResult) => {
    if (result.success && result.pledgeId) {
      gameActions.executeManifestoOneClick(result.pledgeId);
      setOneClickMessage({message: result.message, success: true});
    } else {
      setOneClickMessage({message: result.message, success: false});
    }
  };

  return (
    <div className="flex min-h-screen -m-6">
      {/* Social Media Sidebar - Left side */}
      <SocialMediaSidebar state={gameState} />

      {/* Main Dashboard Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 p-4 rounded-sm">
          <div className="text-sm text-gray-600">GDP Growth</div>
          <div className="text-3xl font-bold text-gray-900">
            {gameState.economic.gdpGrowthAnnual.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500 mt-1">Annual rate</div>
        </div>

        <div className="bg-white border border-gray-200 p-4 rounded-sm">
          <div className="text-sm text-gray-600">Inflation (CPI)</div>
          <div className="text-3xl font-bold text-gray-900">
            {gameState.economic.inflationCPI.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Target: 2.0%
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-4 rounded-sm">
          <div className="text-sm text-gray-600">Unemployment</div>
          <div className="text-3xl font-bold text-gray-900">
            {gameState.economic.unemploymentRate.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500 mt-1">
            NAIRU: 4.25%
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-4 rounded-sm">
          <div className="text-sm text-gray-600">Government Approval</div>
          <div className="text-3xl font-bold text-gray-900">
            {Math.round(gameState.political.governmentApproval)}%
          </div>
          <div className="text-xs text-gray-500 mt-1">
            PM Trust: {Math.round(gameState.political.pmTrust)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 p-4 rounded-sm">
          <div className="text-sm text-gray-600 mb-2">Fiscal Position</div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Deficit:</span>
              <span className="font-semibold">{gameState.fiscal.deficitPctGDP.toFixed(1)}% of GDP</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Debt:</span>
              <span className="font-semibold">{gameState.fiscal.debtPctGDP.toFixed(1)}% of GDP</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Headroom:</span>
              <span className="font-semibold">£{gameState.fiscal.fiscalHeadroom_bn.toFixed(1)}bn</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-4 rounded-sm">
          <div className="text-sm text-gray-600 mb-2">Markets</div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Bank Rate:</span>
              <span className="font-semibold">{gameState.markets.bankRate.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">10Y Gilt:</span>
              <span className="font-semibold">{gameState.markets.giltYield10y.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Sterling Index:</span>
              <span className="font-semibold">{gameState.markets.sterlingIndex.toFixed(1)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-4 rounded-sm">
          <div className="text-sm text-gray-600 mb-2">Public Services</div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">NHS Quality:</span>
              <span className="font-semibold">{Math.round(gameState.services.nhsQuality)}/100</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Education:</span>
              <span className="font-semibold">{Math.round(gameState.services.educationQuality)}/100</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Infrastructure:</span>
              <span className="font-semibold">{Math.round(gameState.services.infrastructureQuality)}/100</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 p-4 rounded-sm">
        <div className="text-sm text-gray-600 mb-2">Manifesto Adherence</div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold">
              <span className={gameState.manifesto.totalViolations === 0 ? 'text-green-600' : gameState.manifesto.totalViolations <= 2 ? 'text-amber-600' : 'text-red-600'}>
                {gameState.manifesto.totalPledges - gameState.manifesto.totalViolations}
              </span>
              <span className="text-gray-400">/{gameState.manifesto.totalPledges}</span>
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {gameState.manifesto.totalViolations === 0 ? 'All commitments met' :
               gameState.manifesto.totalViolations === 1 ? '1 commitment broken' :
               `${gameState.manifesto.totalViolations} commitments broken`}
            </div>
          </div>
          <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
            gameState.manifesto.totalViolations === 0 ? 'bg-green-100' :
            gameState.manifesto.totalViolations <= 2 ? 'bg-amber-100' :
            'bg-red-100'
          }`}>
            {gameState.manifesto.totalViolations === 0 ? (
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className={`w-8 h-8 ${gameState.manifesto.totalViolations <= 2 ? 'text-amber-600' : 'text-red-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
          </div>
        </div>
      </div>
        </div>
      </div>

      {/* One-Click Action Result Modal */}
      {oneClickMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="bg-white max-w-2xl w-full shadow-2xl rounded-lg">
            <div className={`${oneClickMessage.success ? 'bg-green-600' : 'bg-red-600'} text-white p-6`}>
              <div className="text-center">
                <h2 className="text-3xl font-bold">
                  {oneClickMessage.success ? 'Pledge Fulfilled' : 'Action Unavailable'}
                </h2>
              </div>
            </div>

            <div className="p-6">
              <div className={`${oneClickMessage.success ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'} border-2 rounded-lg p-4 mb-6`}>
                <div className="flex items-start gap-3">
                  <svg className={`w-6 h-6 ${oneClickMessage.success ? 'text-green-600' : 'text-red-600'} flex-shrink-0 mt-0.5`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {oneClickMessage.success ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    )}
                  </svg>
                  <div>
                    <p className={oneClickMessage.success ? 'text-green-900' : 'text-red-900'}>{oneClickMessage.message}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setOneClickMessage(null)}
                  className={`flex-1 px-6 py-3 ${oneClickMessage.success ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} text-white font-bold rounded-lg transition-colours`}
                >
                  Understood
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
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

  const projections = useMemo(() => generateProjections(gameState, projectionMonths, true), [gameState, projectionMonths]);
  const baseline = projections.baseline;
  const pending = projections.withPendingChanges;
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
          <MiniChart title="Average Service Quality Projection" data={withBands(baseline.map((p: any) => ({ label: formatDate(p.date), value: p.averageServiceQuality })), 0.5)} color="#059669" formatValue={(v: number) => `${v.toFixed(1)}/100`} />
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
    <div className="p-6 space-y-6">
      <div className="flex gap-3">
        <button
          onClick={() => setActiveView('data')}
          className={`px-6 py-3 font-bold rounded-sm transition-all ${
            activeView === 'data'
              ? 'bg-red-700 text-white shadow-md'
              : 'bg-white text-gray-700 border-2 border-gray-300 hover:bg-gray-50'
          }`}
        >
          Data
        </button>
        <button
          onClick={() => setActiveView('projections')}
          className={`px-6 py-3 font-bold rounded-sm transition-all ${
            activeView === 'projections'
              ? 'bg-red-700 text-white shadow-md'
              : 'bg-white text-gray-700 border-2 border-gray-300 hover:bg-gray-50'
          }`}
        >
          Projections
        </button>
      </div>

      {activeView === 'data' && (
        <>
      {/* Fiscal Rules Status */}
      <div className="bg-white border border-gray-200 p-5 rounded-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Fiscal Framework: {fiscalRule.name}</h3>
            <p className="text-sm text-gray-600">{fiscalRule.shortDescription}</p>
          </div>
          <div className={`px-4 py-2 rounded-sm text-sm font-bold ${
            compliance.overallCompliant
              ? 'bg-green-100 text-green-800 border border-green-300'
              : 'bg-red-100 text-red-800 border border-red-300'
          }`}>
            {compliance.overallCompliant ? 'COMPLIANT' : `NON-COMPLIANT (${compliance.consecutiveBreaches} months)`}
          </div>
        </div>
        <div className="grid grid-cols-5 gap-3 text-sm">
          {fiscalRule.rules.currentBudgetBalance && (
            <div className={`p-2 rounded-sm text-center ${compliance.currentBudgetMet ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              <div className="font-semibold">{compliance.currentBudgetMet ? 'Met' : 'Breached'}</div>
              <div className="text-xs">Current Budget Balance</div>
            </div>
          )}
          {fiscalRule.rules.overallBalance && (
            <div className={`p-2 rounded-sm text-center ${compliance.overallBalanceMet ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              <div className="font-semibold">{compliance.overallBalanceMet ? 'Met' : 'Breached'}</div>
              <div className="text-xs">Overall Balance</div>
            </div>
          )}
          {fiscalRule.rules.deficitCeiling !== undefined && (
            <div className={`p-2 rounded-sm text-center ${compliance.deficitCeilingMet ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              <div className="font-semibold">{compliance.deficitCeilingMet ? 'Met' : 'Breached'}</div>
              <div className="text-xs">Deficit &lt; {fiscalRule.rules.deficitCeiling}%</div>
            </div>
          )}
          {fiscalRule.rules.debtTarget !== undefined && (
            <div className={`p-2 rounded-sm text-center ${compliance.debtTargetMet ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              <div className="font-semibold">{compliance.debtTargetMet ? 'Met' : 'Breached'}</div>
              <div className="text-xs">Debt Target ({fiscalRule.rules.debtTarget}%)</div>
            </div>
          )}
          {fiscalRule.rules.debtFalling && (
            <div className={`p-2 rounded-sm text-center ${compliance.debtFallingMet ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              <div className="font-semibold">{compliance.debtFallingMet ? 'Met' : 'Breached'}</div>
              <div className="text-xs">Debt Falling</div>
            </div>
          )}
        </div>
      </div>

      {/* Chart category tabs */}
      <div className="flex gap-2">
        {chartTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveChart(tab.id)}
            className={`px-5 py-2 font-semibold rounded-sm transition-all ${
              activeChart === tab.id
                ? 'bg-red-700 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
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
            color="#2563eb"
            target={1.5}
            targetLabel="Trend: 1.5%"
            formatValue={(v) => `${v.toFixed(1)}%`}
          />
          <MiniChart
            title="CPI Inflation (%)"
            data={withBands(fullSnapshots.map(s => ({ label: formatDate(s.date), value: s.inflation })), 0.15)}
            color="#dc2626"
            target={2.0}
            targetLabel="Target: 2.0%"
            formatValue={(v) => `${v.toFixed(1)}%`}
          />
          <MiniChart
            title="Unemployment Rate (%)"
            data={withBands(fullSnapshots.map(s => ({ label: formatDate(s.date), value: s.unemployment })), 0.1)}
            color="#7c3aed"
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
            color="#059669"
            formatValue={(v) => `${v.toFixed(1)}%`}
          />
          <div className="col-span-2">
            <MiniChart
              title="Nominal GDP (£bn) — the base used for all deficit and debt ratios"
              data={withBands(fullSnapshots.map(s => ({ label: formatDate(s.date), value: (s as any).gdpNominal ?? 0 })), 5)}
              color="#6d28d9"
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
            color="#dc2626"
            target={fiscalRule.rules.deficitCeiling}
            targetLabel={fiscalRule.rules.deficitCeiling ? `Ceiling: ${fiscalRule.rules.deficitCeiling}%` : undefined}
            formatValue={(v) => `${v.toFixed(1)}%`}
          />
          <MiniChart
            title="Public Debt (% of GDP)"
            data={withBands(fullSnapshots.map(s => ({ label: formatDate(s.date), value: s.debt })), 0.3)}
            color="#b45309"
            target={fiscalRule.rules.debtTarget}
            targetLabel={fiscalRule.rules.debtTarget ? `Target: ${fiscalRule.rules.debtTarget}%` : undefined}
            formatValue={(v) => `${v.toFixed(1)}%`}
          />
          <div className="bg-white border border-gray-200 p-4 rounded-sm">
            <div className="text-sm font-semibold text-gray-700 mb-3">Revenue vs Spending (£bn)</div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Nominal GDP:</span>
                <span className="font-semibold text-purple-700">
                  {gameState.economic.gdpNominal_bn >= 1000
                    ? `£${(gameState.economic.gdpNominal_bn / 1000).toFixed(3)}tn`
                    : `£${Math.round(gameState.economic.gdpNominal_bn)}bn`}
                </span>
              </div>
              <hr className="my-1" />
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Revenue:</span>
                <span className="font-semibold text-green-700">£{gameState.fiscal.totalRevenue_bn.toFixed(1)}bn</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Spending:</span>
                <span className="font-semibold text-red-700">£{gameState.fiscal.totalSpending_bn.toFixed(1)}bn</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Debt Interest:</span>
                <span className="font-semibold text-orange-700">£{gameState.fiscal.debtInterest_bn.toFixed(1)}bn</span>
              </div>
              <hr className="my-1" />
              <div className="flex justify-between font-bold">
                <span className="text-sm">Net Deficit:</span>
                <span className={gameState.fiscal.deficit_bn > 0 ? 'text-red-700' : 'text-green-700'}>
                  £{Math.abs(gameState.fiscal.deficit_bn).toFixed(1)}bn {gameState.fiscal.deficit_bn > 0 ? 'deficit' : 'surplus'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Fiscal Headroom:</span>
                <span className="font-semibold">£{gameState.fiscal.fiscalHeadroom_bn.toFixed(1)}bn</span>
              </div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 p-4 rounded-sm">
            <div className="text-sm font-semibold text-gray-700 mb-3">Spending Breakdown (£bn)</div>
            <div className="space-y-1 text-sm">
              {Object.entries(gameState.fiscal.spending)
                .sort(([, a], [, b]) => b - a)
                .map(([dept, amount]) => (
                  <div key={dept} className="flex justify-between">
                    <span className="text-gray-600 capitalize">{dept}</span>
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
            color="#2563eb"
            target={38}
            targetLabel="Danger: 38%"
            formatValue={(v) => `${v.toFixed(0)}%`}
          />
          <div className="bg-white border border-gray-200 p-4 rounded-sm">
            <div className="text-sm font-semibold text-gray-700 mb-3">Political Health</div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">PM Trust</span>
                  <span className="font-semibold">{Math.round(gameState.political.pmTrust)}/100</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${gameState.political.pmTrust > 50 ? 'bg-green-500' : gameState.political.pmTrust > 30 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${gameState.political.pmTrust}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Backbench Satisfaction</span>
                  <span className="font-semibold">{Math.round(gameState.political.backbenchSatisfaction)}/100</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${gameState.political.backbenchSatisfaction > 50 ? 'bg-green-500' : gameState.political.backbenchSatisfaction > 30 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${gameState.political.backbenchSatisfaction}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Credibility Index</span>
                  <span className="font-semibold">{Math.round(gameState.political.credibilityIndex)}/100</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-blue-500"
                    style={{ width: `${gameState.political.credibilityIndex}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Strike Risk</span>
                  <span className="font-semibold">{Math.round(gameState.political.strikeRisk)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${gameState.political.strikeRisk < 30 ? 'bg-green-500' : gameState.political.strikeRisk < 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${gameState.political.strikeRisk}%` }}
                  />
                </div>
              </div>
              <div className="pt-2 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Credit Rating</span>
                  <span className="font-bold">{gameState.political.creditRating || 'AA-'} ({gameState.political.creditRatingOutlook || 'stable'})</span>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Manifesto Breaches</span>
                  <span className={`font-bold ${gameState.manifesto.totalViolations > 0 ? 'text-red-700' : 'text-green-700'}`}>
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
            color="#b45309"
            target={5.5}
            targetLabel="Danger: 5.5%"
            formatValue={(v) => `${v.toFixed(2)}%`}
          />
          <div className="bg-white border border-gray-200 p-4 rounded-sm">
            <div className="text-sm font-semibold text-gray-700 mb-3">Market Indicators</div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Bank Rate</span>
                <span className="font-bold">{gameState.markets.bankRate.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">2Y Gilt Yield</span>
                <span className="font-bold">{gameState.markets.giltYield2y.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">10Y Gilt Yield</span>
                <span className="font-bold">{gameState.markets.giltYield10y.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">30Y Gilt Yield</span>
                <span className="font-bold">{gameState.markets.giltYield30y.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">2Y Mortgage Rate</span>
                <span className="font-bold">{gameState.markets.mortgageRate2y.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Sterling Index</span>
                <span className={`font-bold ${gameState.markets.sterlingIndex >= 100 ? 'text-green-700' : 'text-red-700'}`}>
                  {gameState.markets.sterlingIndex.toFixed(1)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Service Quality */}
      <div className="bg-white border border-gray-200 p-4 rounded-sm">
        <div className="text-sm font-semibold text-gray-700 mb-3">Public Services Quality Indices</div>
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
                <span className="text-gray-600">{metric.label}</span>
                <span className="font-semibold">{Math.round(metric.value)}/100</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full ${metric.value > 60 ? 'bg-green-500' : metric.value > 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
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
  const [saveSlotName, setSaveSlotName] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lobbyingMPId, setLobbyingMPId] = useState<string | null>(null);

  // Game start screen
  if (!metadata.gameStarted) {
    return <GameStartScreen onStart={(manifestoId, fiscalRuleId, difficultyMode) => actions.startNewGame('', manifestoId, fiscalRuleId, difficultyMode)} />;
  }

  // Game over modal
  if (metadata.gameOver) {
    return (
      <>
        <SimpleDashboard />
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

  // Handle advancing turn and showing newspaper
  const handleAdvanceTurn = () => {
    actions.advanceTurn();
    // Show newspaper after a short delay so state updates first
    setTimeout(() => setShowNewspaper(true), 100);
  };

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
    <div className="min-h-screen bg-gray-50">
      <TurnPanel onAdvanceTurn={handleAdvanceTurn} />
      <NavigationBar
        currentView={currentView}
        onViewChange={setCurrentView}
        adviserCount={adviserCount}
        onSaveLoad={() => setShowSaveLoad(true)}
      />

      {/* Main content area */}
      <div className="relative">
        {currentView === 'dashboard' && (
          <div className="flex gap-6 p-6">
            <div className="flex-1">
              <SimpleDashboard />
            </div>
            {eventLog.length > 0 && (
              <div className="w-80 flex-shrink-0">
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
            onBack={() => setCurrentView('dashboard')}
          />
        )}

        {currentView === 'pm-messages' && <PMMessagesScreen />}
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

      {/* Save/Load Modal */}
      {showSaveLoad && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-8">
          <div className="bg-white rounded-sm shadow-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Save / Load Game</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Save Slot Name</label>
                <input
                  type="text"
                  value={saveSlotName}
                  onChange={(e) => {
                    setSaveSlotName(e.target.value);
                    setLoadError(null); // Clear error when typing
                  }}
                  placeholder="e.g. my-save-1"
                  className="w-full border border-gray-300 rounded-sm px-3 py-2 text-sm"
                />
                {loadError && (
                  <div className="mt-2 bg-red-50 border border-red-300 rounded-sm px-3 py-2 text-sm text-red-800">
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
                  className="flex-1 bg-red-700 text-white py-2 rounded-sm font-semibold hover:bg-red-800"
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
                  className="flex-1 bg-gray-700 text-white py-2 rounded-sm font-semibold hover:bg-gray-800"
                >
                  Load Game
                </button>
              </div>
              <button
                onClick={() => setShowSaveLoad(false)}
                className="w-full text-gray-600 py-2 text-sm hover:text-gray-800"
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
