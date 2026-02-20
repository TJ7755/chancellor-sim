// Tutorial System - Explains game mechanics to new players

import React, { useState } from 'react';

export interface TutorialSection {
  title: string;
  content: string[];
  keyPoints: string[];
}

export const TUTORIAL_SECTIONS: TutorialSection[] = [
  {
    title: 'Overview',
    content: [
      'You are the Chancellor of the Exchequer in a Labour government that took office in July 2024.',
      'Your goal is to survive the full five-year term until the 2029 election.',
      'You must balance economic growth, fiscal responsibility, public services, and political survival.',
      'The Prime Minister will sack you if you lose his trust. Backbenchers will revolt if you threaten their seats.',
    ],
    keyPoints: [
      'Game runs from July 2024 to June 2029 (60 months)',
      'Each turn = one month',
      'Breaking manifesto pledges has consequences',
      'Economic relationships are realistic and based on UK data',
    ],
  },
  {
    title: 'Key Metrics',
    content: [
      'GDP Growth: Target 1.5-2.5% annually. Too low = unemployment. Too high = inflation.',
      'Inflation: Target 2.0%. Bank of England will raise rates if inflation rises.',
      'Unemployment: NAIRU (natural rate) is 4.25%. Below this causes wage inflation.',
      'Deficit: Try to keep below 3% of GDP. Markets penalise fiscal irresponsibility.',
      'Debt: Try not to let it exceed 100% of GDP or rise too quickly.',
      'Approval: Keep government approval above 35%. Below 25% for 3 months = resignation.',
      'PM Trust: Keep above 30. PM will intervene if it falls too low.',
    ],
    keyPoints: [
      'Everything affects everything else',
      'There are time lags - policies take months to have full effect',
      'Markets react immediately to fiscal announcements',
      'Public opinion responds gradually to economic performance',
    ],
  },
  {
    title: 'Fiscal Policy',
    content: [
      'You control taxes and spending through the Budget system.',
      'Spring Budget (March) and Autumn Budget (October) are the main fiscal events.',
      'Tax increases hurt growth but improve the deficit.',
      'Spending increases boost growth but worsen the deficit.',
      'Infrastructure spending has the highest GDP multiplier (creates growth).',
      'NHS spending has the highest approval multiplier (popular with voters).',
    ],
    keyPoints: [
      'Breaking tax locks (income tax, NI, VAT, corp tax) violates manifesto',
      'Real terms cuts to NHS/education may violate manifesto',
      'Markets watch deficit and debt levels closely',
      'Fiscal irresponsibility can trigger a market crisis',
    ],
  },
  {
    title: 'Political Survival',
    content: [
      'Government approval depends on: economic performance, public services, manifesto adherence.',
      'PM trust depends on: approval ratings, manifesto adherence, fiscal responsibility, backbench satisfaction.',
      'Backbench satisfaction depends on: approval (electability) and fiscal responsibility.',
      'Breaking manifesto pledges damages approval and PM trust permanently.',
      'Low approval triggers negative media coverage which further reduces approval.',
    ],
    keyPoints: [
      'Honeymoon period: First 12 months are easier (approval bonus)',
      'Game over if PM trust falls below 20',
      'Game over if backbench satisfaction below 25 (revolt)',
      'Must reach June 2029 to win',
    ],
  },
  {
    title: 'Economic Relationships',
    content: [
      'GDP Growth affected by: fiscal policy, confidence, interest rates, sterling.',
      'Inflation affected by: unemployment gap, VAT, sterling, wage growth.',
      'Unemployment follows GDP with a 2-3 month lag (Okun\'s Law).',
      'Bank Rate follows inflation with a 3-6 month lag (Taylor Rule).',
      'Gilt yields affected by: Bank Rate, deficit, debt, credibility.',
      'Sterling affected by: gilt yields, confidence, approval.',
    ],
    keyPoints: [
      'Fiscal stimulus (spending up, taxes down) boosts growth but worsens deficit',
      'Fiscal tightening (spending down, taxes up) hurts growth but improves deficit',
      'High deficits → higher gilt yields → higher mortgages → lower house prices',
      'Market crises can be triggered by: unfunded spending, breaking fiscal rules',
    ],
  },
  {
    title: 'Strategy Tips',
    content: [
      'Start cautiously: You have a honeymoon period, don\'t waste it on risky policies.',
      'Build fiscal headroom: Keep deficit manageable so you have space for future shocks.',
      'Invest in infrastructure: High GDP multiplier, long-term growth benefits.',
      'Protect the NHS: Most politically sensitive - real terms cuts are dangerous.',
      'Watch the markets: Gilt yield spikes are an early warning of market concern.',
      'Monitor backbenchers: They care most about electability and not losing their seats.',
      'Break pledges carefully: If you must break a pledge, do it early and have a good reason.',
    ],
    keyPoints: [
      'There is no "perfect" strategy - all policies have trade-offs',
      'Events (recessions, crises) will test your fiscal space',
      'Long-term thinking beats short-term populism',
      'Credibility matters - keep your promises when possible',
    ],
  },
];

// Tutorial Modal Component
export const TutorialModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const [currentSection, setCurrentSection] = useState(0);

  if (!isOpen) return null;

  const section = TUTORIAL_SECTIONS[currentSection];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
      <div className="max-w-3xl w-full bg-white shadow-2xl rounded-sm border-t-4 border-blue-600 max-h-[90vh] overflow-y-auto">
        <div className="bg-blue-600 text-white p-4 flex items-center justify-between sticky top-0">
          <div>
            <h2 className="text-2xl font-bold">How to Play</h2>
            <div className="text-sm opacity-90 mt-1">
              Section {currentSection + 1} of {TUTORIAL_SECTIONS.length}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-blue-700 px-3 py-1 rounded-sm text-xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">{section.title}</h3>

          <div className="space-y-3 mb-6">
            {section.content.map((paragraph, index) => (
              <p key={index} className="text-gray-700 leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded-sm">
            <h4 className="font-bold text-blue-900 mb-2">Key Points</h4>
            <ul className="space-y-1">
              {section.keyPoints.map((point, index) => (
                <li key={index} className="text-sm text-blue-800">
                  • {point}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-200 p-4 flex items-center justify-between bg-gray-50 sticky bottom-0">
          <button
            onClick={() => setCurrentSection(Math.max(0, currentSection - 1))}
            disabled={currentSection === 0}
            className={`px-4 py-2 rounded-sm font-semibold ${
              currentSection === 0
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-gray-300 text-gray-800 hover:bg-gray-400'
            }`}
          >
            ← Previous
          </button>

          <div className="flex space-x-1">
            {TUTORIAL_SECTIONS.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSection(index)}
                className={`w-3 h-3 rounded-full ${
                  index === currentSection ? 'bg-blue-600' : 'bg-gray-300'
                }`}
                aria-label={`Go to section ${index + 1}`}
              />
            ))}
          </div>

          <button
            onClick={() => {
              if (currentSection < TUTORIAL_SECTIONS.length - 1) {
                setCurrentSection(currentSection + 1);
              } else {
                onClose();
              }
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-sm hover:bg-blue-700 font-semibold"
          >
            {currentSection < TUTORIAL_SECTIONS.length - 1 ? 'Next →' : 'Start Playing'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Quick help button component
export const HelpButton: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 bg-blue-600 text-white w-14 h-14 rounded-full shadow-lg hover:bg-blue-700 transition-colors flex items-center justify-center text-2xl font-bold z-40"
      aria-label="Help"
      title="How to play"
    >
      ?
    </button>
  );
};

export default {
  TutorialModal,
  HelpButton,
  TUTORIAL_SECTIONS,
};
