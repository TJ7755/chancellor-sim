import React from 'react';
import type { PolicyConflict } from '../../domain/budget/policy-conflicts';

interface PolicyConflictWarningsProps {
  conflicts: PolicyConflict[];
  onDismiss: (conflictId: string) => void;
}

export const PolicyConflictWarnings: React.FC<PolicyConflictWarningsProps> = ({ conflicts, onDismiss }) => {
  if (conflicts.length === 0) return null;

  return (
    <div className="mt-6 space-y-3">
      {conflicts.map((conflict) => (
        <div key={conflict.id} className="bg-warning-subtle border border-warning p-4">
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
                d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <div className="text-sm font-bold text-warning">{conflict.title}</div>
              <div className="text-sm text-warning">{conflict.description}</div>
            </div>
            <button
              onClick={() => onDismiss(conflict.id)}
              className="text-warning hover:text-warning-hover text-sm ml-auto"
            >
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
