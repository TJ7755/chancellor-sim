import React, { useState } from 'react';
import { useGameState } from '../game-state';

interface NavigationSidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  adviserCount: number;
  manifestoViolations: number;
  pmUnreadCount: number;
  onSaveLoad: () => void;
  onAdvanceTurn: () => void;
}

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

const NavigationSidebar: React.FC<NavigationSidebarProps> = ({
  currentView,
  onViewChange,
  adviserCount,
  manifestoViolations,
  pmUnreadCount,
  onSaveLoad,
  onAdvanceTurn,
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
      {/* Header with Cabinet Control / Treasury Briefing at top */}
      <div className="border-b border-border-strong px-4 py-4 bg-bg-elevated">
        <div className="treasury-kicker text-[10px]">Cabinet Control</div>
        <div className="font-display text-lg font-semibold text-primary">Treasury Briefing</div>
      </div>

      {/* Key Metrics Panel */}
      <div className="border-b border-border-strong px-4 py-3 bg-bg-surface">
        <div className="treasury-kicker text-[10px] mb-2">Key Indicators</div>
        <div className="space-y-2">
          <div className="flex justify-between items-baseline">
            <span className="text-[11px] text-secondary">Gov Approval</span>
            <span className={`font-mono text-sm font-semibold ${gameState.political.governmentApproval > 50 ? 'text-good' : gameState.political.governmentApproval > 35 ? 'text-primary' : 'text-bad'}`}>
              {gameState.political.governmentApproval.toFixed(0)}%
            </span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-[11px] text-secondary">Fiscal Headroom</span>
            <span className={`font-mono text-sm font-semibold ${gameState.fiscal.fiscalHeadroom_bn > 10 ? 'text-good' : gameState.fiscal.fiscalHeadroom_bn > 0 ? 'text-warning' : 'text-bad'}`}>
              £{gameState.fiscal.fiscalHeadroom_bn.toFixed(1)}bn
            </span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-[11px] text-secondary">10Y Gilt</span>
            <span className={`font-mono text-sm font-semibold ${gameState.markets.giltYield10y < 4 ? 'text-good' : gameState.markets.giltYield10y < 6 ? 'text-primary' : 'text-bad'}`}>
              {gameState.markets.giltYield10y.toFixed(2)}%
            </span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-[11px] text-secondary">PM Trust</span>
            <span className={`font-mono text-sm font-semibold ${gameState.political.pmTrust > 50 ? 'text-good' : gameState.political.pmTrust > 30 ? 'text-primary' : 'text-bad'}`}>
              {gameState.political.pmTrust.toFixed(0)}
            </span>
          </div>
        </div>
      </div>

      {/* Date and Turn Info */}
      <div className="border-b border-border-subtle px-4 py-2 bg-bg-subdued">
        <div className="flex items-center justify-between">
          <span className="text-xs text-secondary">
            {new Date(
              gameState.metadata.currentYear,
              gameState.metadata.currentMonth - 1
            ).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
          </span>
          <span className="text-xs text-muted">Turn {gameState.metadata.currentTurn + 1}/60</span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-hidden">
        <div className="border-b border-border-subtle py-2">
          {tabs.map((tab) => {
            const shortcutKey = Object.entries(VIEW_SHORTCUTS).find(([, view]) => view === tab.id)?.[0];
            const isActive = currentView === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onViewChange(tab.id)}
                className={`w-full text-left px-4 py-2 flex items-center justify-between transition-colors ${
                  isActive ? 'bg-primary-subtle border-l-2 border-l-primary' : 'hover:bg-bg-subdued border-l-2 border-l-transparent'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center justify-center w-5 h-5 text-[10px] font-mono border ${
                    isActive ? 'border-primary bg-primary text-white' : 'border-border text-muted'
                  }`}>
                    {shortcutKey}
                  </span>
                  <span className={`text-sm ${isActive ? 'font-semibold text-primary' : 'text-secondary'}`}>
                    {tab.label}
                  </span>
                </div>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="treasury-badge">{tab.badge}</span>
                )}
              </button>
            );
          })}

          <button
            onClick={() => onViewChange('pm-messages')}
            className={`w-full text-left px-4 py-2 flex items-center justify-between transition-colors ${
              currentView === 'pm-messages' ? 'bg-primary-subtle border-l-2 border-l-primary' : 'hover:bg-bg-subdued border-l-2 border-l-transparent'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center justify-center w-5 h-5 text-[10px] font-mono border ${
                currentView === 'pm-messages' ? 'border-primary bg-primary text-white' : 'border-border text-muted'
              }`}>
                6
              </span>
              <span className={`text-sm ${currentView === 'pm-messages' ? 'font-semibold text-primary' : 'text-secondary'}`}>
                Prime Minister
              </span>
            </div>
            {pmUnreadCount > 0 && (
              <span className="treasury-badge">{pmUnreadCount}</span>
            )}
          </button>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="border-t border-border-strong px-4 py-3 bg-bg-elevated">
        <button
          onClick={onAdvanceTurn}
          className="w-full btn btn-primary mb-2 text-xs py-2"
        >
          Advance Month
        </button>
        <div className="flex gap-2">
          <button
            onClick={toggleDarkMode}
            className="btn btn-ghost flex-1 text-xs py-1.5"
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDarkMode ? 'Light' : 'Dark'}
          </button>
          <button onClick={onSaveLoad} className="btn btn-secondary flex-1 text-xs py-1.5">
            Save
          </button>
        </div>
      </div>
    </nav>
  );
};

export default NavigationSidebar;
