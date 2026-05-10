import React from 'react';

interface PendingChangesDisplayProps {
  pendingBudgetChange: Record<string, unknown> | null;
  pendingBudgetApplyTurn: number | null;
  currentTurn: number;
}

export const PendingChangesDisplay: React.FC<PendingChangesDisplayProps> = ({
  pendingBudgetChange,
  pendingBudgetApplyTurn,
  currentTurn,
}) => {
  if (!pendingBudgetChange || pendingBudgetApplyTurn === null) return null;

  const turnsUntilApply = pendingBudgetApplyTurn - currentTurn;

  return (
    <div className="bg-warning-subtle border border-warning p-4 mb-4">
      <div className="flex items-start gap-3">
        <svg
          className="w-5 h-5 text-warning flex-shrink-0 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div>
          <div className="text-sm font-bold text-warning">Pending Budget Changes</div>
          <div className="text-sm text-warning mt-1">
            Changes will be applied in {turnsUntilApply} turn{turnsUntilApply !== 1 ? 's' : ''} (turn {pendingBudgetApplyTurn}).
          </div>
          <div className="text-xs text-secondary mt-2">
            The Lords has delayed implementation. Your budget changes are queued and will take effect automatically.
          </div>
        </div>
      </div>
    </div>
  );
};
