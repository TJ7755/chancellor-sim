import React from 'react';
import { useGameState } from '../game-state';
import { calcScore, calculateGrade } from '../domain/game/scoring';

interface GameOverModalProps {
  reason: string;
  onRestart: () => void;
}

const GameOverModal: React.FC<GameOverModalProps> = ({ reason, onRestart }) => {
  const gameState = useGameState();
  const metadata = gameState.metadata;

  const survived = metadata.currentTurn >= 60;

  const score = calcScore(gameState);
  const { grade, gradeLabel, gradeColor } = calculateGrade(score);
  const borderColor = survived ? 'border-good' : 'border-bad';
  const headerBg = survived ? 'bg-good' : 'bg-bad';

  return (
    <div className="fixed inset-0 modal-overlay flex items-center justify-center p-6 z-50">
      <div className={`max-w-2xl w-full border-t-4 ${borderColor} bg-bg-surface`}>
        <div className={`${headerBg} text-white px-8 py-6`}>
          <h2 className="font-display text-3xl font-semibold">{survived ? 'Term Complete' : 'Chancellorship Ended'}</h2>
        </div>

        <div className="p-8">
          <p className="text-lg text-text-primary leading-relaxed mb-6">{reason}</p>

          <div className="text-center border-y border-border-strong py-6 mb-6">
            <div className="text-label text-tertiary mb-2">Performance Rating</div>
            <div className={`font-display text-6xl font-bold ${gradeColor}`}>{grade}</div>
            <div className={`text-base font-semibold ${gradeColor} mt-1`}>{gradeLabel}</div>
            <div className="text-sm text-muted mt-1 font-mono">Score: {score}/100</div>
          </div>

          <div className="grid grid-cols-2 gap-0 border border-border-strong mb-6">
            <div className="px-6 py-4 border-b border-r border-border-subtle">
              <div className="text-sm text-secondary">Months in Office</div>
              <div className="font-mono text-2xl font-semibold text-text-primary">{metadata.currentTurn}</div>
            </div>
            <div className="px-6 py-4 border-b border-border-subtle">
              <div className="text-sm text-secondary">Term Progress</div>
              <div className="font-mono text-2xl font-semibold text-text-primary">
                {Math.round((metadata.currentTurn / 60) * 100)}%
              </div>
            </div>
            <div className="px-6 py-4 border-r border-border-subtle">
              <div className="text-sm text-secondary">Final Approval</div>
              <div className="font-mono text-2xl font-semibold text-text-primary">
                {Math.round(gameState.political.governmentApproval)}%
              </div>
            </div>
            <div className="px-6 py-4">
              <div className="text-sm text-secondary">Final Deficit</div>
              <div className="font-mono text-2xl font-semibold text-text-primary">
                {gameState.fiscal.deficitPctGDP.toFixed(1)}%
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-display text-base font-semibold text-text-primary mb-3">Final Economic State</h3>
            <div className="grid grid-cols-3 gap-x-6 gap-y-2 text-sm">
              <div>
                <span className="text-secondary">GDP Growth:</span>{' '}
                <span className="font-mono font-semibold">{gameState.economic.gdpGrowthAnnual.toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-secondary">Inflation:</span>{' '}
                <span className="font-mono font-semibold">{gameState.economic.inflationCPI.toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-secondary">Unemployment:</span>{' '}
                <span className="font-mono font-semibold">{gameState.economic.unemploymentRate.toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-secondary">Debt/GDP:</span>{' '}
                <span className="font-mono font-semibold">{gameState.fiscal.debtPctGDP.toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-secondary">10Y Gilt:</span>{' '}
                <span className="font-mono font-semibold">{gameState.markets.giltYield10y.toFixed(2)}%</span>
              </div>
              <div>
                <span className="text-secondary">PM Trust:</span>{' '}
                <span className="font-mono font-semibold">{Math.round(gameState.political.pmTrust)}</span>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-display text-base font-semibold text-text-primary mb-2">Manifesto Adherence</h3>
            <p className="text-sm text-secondary">
              {gameState.manifesto.totalViolations === 0
                ? 'You kept all manifesto pledges. Impressive.'
                : `You broke ${gameState.manifesto.totalViolations} manifesto pledge${gameState.manifesto.totalViolations !== 1 ? 's' : ''}.`}
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

export default GameOverModal;
