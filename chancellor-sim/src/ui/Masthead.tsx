import React from 'react';
import { useGameMetadata, useGameState } from '../game-state';

interface MastheadProps {
  onAdvanceTurn: () => void;
}

const Masthead: React.FC<MastheadProps> = ({ onAdvanceTurn }) => {
  const metadata = useGameMetadata();
  const gameState = useGameState();

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
              Chancellor {metadata.playerName || 'Reeves'} is navigating fiscal rules, market nerves and the Prime
              Minister's patience.
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
            <div className="treasury-kicker text-white/70">Government Approval</div>
            <div className="mt-2 font-mono text-2xl font-semibold text-white">
              {gameState.political.governmentApproval.toFixed(0)}
            </div>
          </div>
          <div className="treasury-data-cell">
            <div className="treasury-kicker text-white/70">Fiscal Headroom</div>
            <div className="mt-2 font-mono text-2xl font-semibold text-white">
              £{gameState.fiscal.fiscalHeadroom_bn.toFixed(1)}bn
            </div>
          </div>
          <div className="treasury-data-cell">
            <div className="treasury-kicker text-white/70">10Y Gilt</div>
            <div className="mt-2 font-mono text-2xl font-semibold text-white">
              {gameState.markets.giltYield10y.toFixed(2)}%
            </div>
          </div>
          <div className="treasury-data-cell">
            <div className="treasury-kicker text-white/70">PM Trust</div>
            <div className="mt-2 font-mono text-2xl font-semibold text-white">
              {gameState.political.pmTrust.toFixed(0)}
            </div>
          </div>
        </div>
      </div>
      <div className="h-1.5 bg-black/25">
        <div className="h-full bg-white/65 transition-all duration-300" style={{ width: `${termProgress}%` }} />
      </div>
    </div>
  );
};

export default Masthead;
