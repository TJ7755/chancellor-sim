import React, { useState } from 'react';
import { MANIFESTO_TEMPLATES } from '../manifesto-system';
import { FISCAL_RULES, FiscalRuleId } from '../game-integration';
import { DifficultyMode } from '../game-state';

interface GameStartScreenProps {
  onStart: (manifestoId: string, fiscalRuleId: FiscalRuleId, difficultyMode: DifficultyMode) => void;
}

const GameStartScreen: React.FC<GameStartScreenProps> = ({ onStart }) => {
  const [selectedManifesto, setSelectedManifesto] = useState<string>('random');
  const [selectedFiscalRule, setSelectedFiscalRule] = useState<FiscalRuleId>('starmer-reeves');
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyMode>('realistic');
  const [step, setStep] = useState<'manifesto' | 'fiscal-rules'>('manifesto');

  if (step === 'fiscal-rules') {
    return (
      <div className="min-h-screen bg-default flex items-center justify-center p-6">
        <div className="max-w-5xl w-full border border-border-strong bg-bg-surface">
          <div className="bg-primary text-white px-8 py-6 border-b border-border-strong">
            <div className="text-xs uppercase tracking-widest text-white/60 mb-1">HM Treasury</div>
            <h1 className="font-display text-3xl font-semibold">Choose Your Fiscal Framework</h1>
          </div>

          <div className="p-8">
            <p className="text-secondary leading-relaxed mb-2">
              Your first act as Chancellor is to set the fiscal rules that will govern your Chancellorship. Markets will
              react immediately. The rules you set will determine your room for manoeuvre for the entire parliament.
            </p>
            <p className="text-sm text-muted mb-8">
              Changing your fiscal rules later will be seen as weakness and severely damage market confidence.
            </p>

            <div className="space-y-0 border border-border-strong mb-8">
              {FISCAL_RULES.map((rule, idx) => {
                const isSelected = selectedFiscalRule === rule.id;
                const marketColor = rule.marketReaction.giltYieldBps <= 0 ? 'text-good' : 'text-bad';
                const politicalColor = rule.politicalReaction.backbenchChange >= 0 ? 'text-good' : 'text-bad';

                return (
                  <button
                    key={rule.id}
                    onClick={() => setSelectedFiscalRule(rule.id)}
                    className={`w-full text-left px-6 py-5 transition-all border-b border-border-subtle last:border-b-0 ${
                      isSelected
                        ? 'bg-primary-subtle border-l-4 border-l-primary'
                        : 'hover:bg-bg-subdued border-l-4 border-l-transparent'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-display text-lg font-semibold text-text-primary">{rule.name}</div>
                        <div className="text-sm text-secondary mt-1">{rule.shortDescription}</div>
                        {isSelected && (
                          <div className="mt-3">
                            <p className="text-sm text-secondary">{rule.detailedDescription}</p>
                            <p className="text-xs text-muted italic mt-2">{rule.historicalPrecedent}</p>
                          </div>
                        )}
                      </div>
                      <div className="ml-6 text-right flex-shrink-0 w-44">
                        <div className={`text-xs font-mono font-semibold ${marketColor}`}>
                          Gilt Yields: {rule.marketReaction.giltYieldBps > 0 ? '+' : ''}
                          {rule.marketReaction.giltYieldBps}bps
                        </div>
                        <div className={`text-xs font-mono ${marketColor}`}>
                          Sterling: {rule.marketReaction.sterlingPercent > 0 ? '+' : ''}
                          {rule.marketReaction.sterlingPercent}%
                        </div>
                        <div className={`text-xs font-mono ${politicalColor} mt-1`}>
                          Backbench: {rule.politicalReaction.backbenchChange > 0 ? '+' : ''}
                          {rule.politicalReaction.backbenchChange}
                        </div>
                        <div className="text-xs font-mono text-muted mt-1">
                          Credibility: {rule.marketReaction.credibilityChange > 0 ? '+' : ''}
                          {rule.marketReaction.credibilityChange}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mb-8">
              <div className="treasury-kicker mb-3">Simulation Difficulty</div>
              <div className="grid grid-cols-3 gap-0 border border-border-strong">
                {(['forgiving', 'standard', 'realistic'] as DifficultyMode[]).map((mode, idx) => {
                  const isSelected = selectedDifficulty === mode;
                  const modeColors = {
                    forgiving: { border: 'border-good', bg: 'bg-good-subtle', text: 'text-good', label: 'Forgiving' },
                    standard: {
                      border: 'border-secondary',
                      bg: 'bg-secondary-subtle',
                      text: 'text-financial',
                      label: 'Standard',
                    },
                    realistic: {
                      border: 'border-primary',
                      bg: 'bg-primary-subtle',
                      text: 'text-primary',
                      label: 'Realistic',
                    },
                  };
                  const colors = modeColors[mode];
                  return (
                    <button
                      key={mode}
                      onClick={() => setSelectedDifficulty(mode)}
                      className={`px-5 py-4 text-left border-r border-border-subtle last:border-r-0 transition-all ${
                        isSelected
                          ? `${colors.bg} border-l-4 border-l-${colors.border.replace('border-', '')}`
                          : 'border-l-4 border-l-transparent hover:bg-bg-subdued'
                      }`}
                    >
                      <div className={`font-semibold ${colors.text}`}>{colors.label}</div>
                      <div className="text-xs text-secondary mt-1">
                        {mode === 'forgiving'
                          ? 'Lower volatility, later crisis triggers'
                          : mode === 'standard'
                            ? 'Balanced realism and playability'
                            : 'Higher volatility, stricter discipline'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-4">
              <button onClick={() => setStep('manifesto')} className="btn btn-secondary">
                Back
              </button>
              <button
                onClick={() =>
                  onStart(
                    selectedManifesto === 'random' ? '' : selectedManifesto,
                    selectedFiscalRule,
                    selectedDifficulty
                  )
                }
                className="flex-1 btn btn-primary text-base"
              >
                Announce Fiscal Framework and Begin
              </button>
            </div>

            <div className="mt-4 px-4 py-3 bg-warning-subtle border border-warning text-warning text-xs">
              Markets will react in real time when you announce your fiscal framework. Gilt yields, sterling, and
              credibility will adjust immediately.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-default flex items-center justify-center p-6">
      <div className="max-w-4xl w-full border border-border-strong bg-bg-surface">
        <div className="bg-primary text-white px-8 py-6 border-b border-border-strong">
          <div className="text-xs uppercase tracking-widest text-white/60 mb-1">HM Treasury</div>
          <h1 className="font-display text-3xl font-semibold">Chancellor of the Exchequer</h1>
          <p className="text-sm text-white/70 mt-1">Simulation - July 2024 - June 2029</p>
        </div>

        <div className="p-8">
          <div className="mb-8">
            <h3 className="font-display text-2xl font-semibold text-text-primary mb-4">Welcome, Chancellor</h3>
            <p className="text-secondary leading-relaxed mb-3">
              It is July 2024. Labour has won a historic landslide with a majority of 174 seats. Your task is to manage
              the UK economy and public finances for the full five-year term.
            </p>
            <p className="text-secondary leading-relaxed mb-3">
              You must balance economic growth, sound public finances, quality public services, and political survival.
              The Prime Minister will not hesitate to sack you. Backbenchers will revolt. Markets will punish
              irresponsibility.
            </p>
            <p className="text-secondary leading-relaxed">
              <strong>This simulation is brutally realistic.</strong> Every policy has trade-offs. Breaking manifesto
              pledges has consequences.
            </p>
          </div>

          <div className="mb-8">
            <div className="treasury-kicker mb-3">Select Your Manifesto</div>

            <div className="space-y-0 border border-border-strong">
              <button
                onClick={() => setSelectedManifesto('random')}
                className={`w-full text-left px-6 py-4 transition-all border-b border-border-subtle ${
                  selectedManifesto === 'random'
                    ? 'bg-primary-subtle border-l-4 border-l-primary'
                    : 'hover:bg-bg-subdued border-l-4 border-l-transparent'
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
                  className={`w-full text-left px-6 py-4 transition-all border-b border-border-subtle last:border-b-0 ${
                    selectedManifesto === template.id
                      ? 'bg-primary-subtle border-l-4 border-l-primary'
                      : 'hover:bg-bg-subdued border-l-4 border-l-transparent'
                  }`}
                >
                  <div className="font-semibold text-text-primary">{template.name}</div>
                  <div className="text-sm text-secondary mt-1">{template.theme}</div>
                  <div className="text-xs text-muted mt-1 font-mono">{template.pledges.length} pledges</div>
                </button>
              ))}
            </div>
          </div>

          <button onClick={() => setStep('fiscal-rules')} className="w-full btn btn-primary text-base">
            Next: Choose Fiscal Framework
          </button>

          <div className="mt-6 px-4 py-3 bg-warning-subtle border border-warning text-warning text-sm">
            <strong>Difficulty: Realistic</strong> - Realistic UK fiscal constraints. Economic relationships are
            unforgiving but fair.
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameStartScreen;
