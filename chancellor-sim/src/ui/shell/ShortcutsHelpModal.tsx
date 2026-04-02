import React from 'react';

interface ShortcutItem {
  keys: string;
  description: string;
}

interface ShortcutsHelpModalProps {
  onClose: () => void;
}

const SHORTCUTS: ShortcutItem[] = [
  { keys: '1', description: 'Open dashboard' },
  { keys: '2', description: 'Open budget' },
  { keys: '3', description: 'Open analysis' },
  { keys: '4', description: 'Open advisers' },
  { keys: '5', description: 'Open MPs' },
  { keys: '6', description: 'Open PM inbox' },
  { keys: '7', description: 'Open manifesto' },
  { keys: '/', description: 'Jump to budget' },
  { keys: 'Ctrl/Cmd + Enter', description: 'Advance to next month' },
  { keys: '?', description: 'Open keyboard shortcuts' },
  { keys: 'Esc', description: 'Close overlays and panels' },
  { keys: 'Arrow keys', description: 'Navigate PM inbox list' },
];

export const ShortcutsHelpModal: React.FC<ShortcutsHelpModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6" role="dialog" aria-modal="true" aria-labelledby="shortcuts-title">
      <div className="w-full max-w-2xl border-b border-border-strong bg-transparent ">
        <div className="flex items-center justify-between border-b border-border-custom px-6 py-4">
          <div>
            <h2 id="shortcuts-title" className="font-display text-2xl font-semibold text-primary">Keyboard Shortcuts</h2>
            <p className="mt-1 text-sm text-secondary">Use the shell without dragging your hands back to the mouse every five seconds.</p>
          </div>
          <button onClick={onClose} className="btn btn-ghost text-sm" aria-label="Close keyboard shortcuts">
            Close
          </button>
        </div>
        <div className="grid gap-3 px-6 py-5 md:grid-cols-2">
          {SHORTCUTS.map((shortcut) => (
            <div key={shortcut.keys} className="flex items-start justify-between gap-4 border-b border-border-subtle bg-transparent px-4 py-3">
              <span className="font-mono text-sm font-semibold text-primary">{shortcut.keys}</span>
              <span className="text-sm text-secondary">{shortcut.description}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
