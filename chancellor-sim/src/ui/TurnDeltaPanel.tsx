import React from 'react';
import { TurnDelta } from '../game-integration';

interface TurnDeltaPanelProps {
  lastTurnDelta: TurnDelta | null;
}

const TurnDeltaPanel: React.FC<TurnDeltaPanelProps> = ({ lastTurnDelta }) => {
  if (!lastTurnDelta) {
    return null;
  }

  const formatSigned = (value: number): string => {
    return value > 0 ? `+${value.toFixed(1)}` : value.toFixed(1);
  };

  const approvalChangeClass = lastTurnDelta.approvalChange >= 0 ? 'text-good' : 'text-bad';
  const giltChangeClass = lastTurnDelta.giltYieldChange <= 0 ? 'text-good' : 'text-bad';
  const deficitChangeClass = lastTurnDelta.deficitChange <= 0 ? 'text-good' : 'text-bad';

  return (
    <div className="bg-bg-surface border border-border-strong">
      <div className="bg-bg-subdued px-4 py-3 border-b border-border-strong">
        <div className="treasury-kicker text-[10px]">Month-on-Month Changes</div>
      </div>

      <div className="p-4 space-y-4">
        {/* Approval Change */}
        <div>
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-xs text-secondary font-semibold uppercase tracking-wide">Approval</span>
            <span className={`font-mono text-sm font-semibold ${approvalChangeClass}`}>
              {formatSigned(lastTurnDelta.approvalChange)}pp
            </span>
          </div>
          {lastTurnDelta.approvalDriversPositive.length > 0 && (
            <div className="space-y-1 mb-1">
              {lastTurnDelta.approvalDriversPositive.map((driver, idx) => (
                <div key={`pos-${idx}`} className="flex justify-between text-xs">
                  <span className="text-muted">{driver.name}</span>
                  <span className="font-mono text-good">+{driver.value.toFixed(1)}</span>
                </div>
              ))}
            </div>
          )}
          {lastTurnDelta.approvalDriversNegative.length > 0 && (
            <div className="space-y-1">
              {lastTurnDelta.approvalDriversNegative.map((driver, idx) => (
                <div key={`neg-${idx}`} className="flex justify-between text-xs">
                  <span className="text-muted">{driver.name}</span>
                  <span className="font-mono text-bad">{driver.value.toFixed(1)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-border-subtle" />

        {/* Gilt Yield Change */}
        <div>
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-xs text-secondary font-semibold uppercase tracking-wide">10Y Gilt Yield</span>
            <span className={`font-mono text-sm font-semibold ${giltChangeClass}`}>
              {formatSigned(lastTurnDelta.giltYieldChange)}bps
            </span>
          </div>
          {lastTurnDelta.giltYieldDrivers.length > 0 && (
            <div className="space-y-1">
              {lastTurnDelta.giltYieldDrivers.map((driver, idx) => {
                const driverClass = driver.value <= 0 ? 'text-good' : 'text-bad';
                return (
                  <div key={`gilt-${idx}`} className="flex justify-between text-xs">
                    <span className="text-muted">{driver.name}</span>
                    <span className={`font-mono ${driverClass}`}>
                      {driver.value > 0 ? '+' : ''}{driver.value.toFixed(1)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-border-subtle" />

        {/* Deficit Change */}
        <div>
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-xs text-secondary font-semibold uppercase tracking-wide">Deficit</span>
            <span className={`font-mono text-sm font-semibold ${deficitChangeClass}`}>
              {formatSigned(lastTurnDelta.deficitChange)}pp GDP
            </span>
          </div>
          {lastTurnDelta.deficitDrivers.length > 0 && (
            <div className="space-y-1">
              {lastTurnDelta.deficitDrivers.map((driver, idx) => {
                const driverClass = driver.value <= 0 ? 'text-good' : 'text-bad';
                return (
                  <div key={`def-${idx}`} className="flex justify-between text-xs">
                    <span className="text-muted">{driver.name}</span>
                    <span className={`font-mono ${driverClass}`}>
                      {driver.value > 0 ? '+' : ''}{driver.value.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TurnDeltaPanel;
