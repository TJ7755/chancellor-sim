import React, { useEffect, useMemo, useState } from 'react';
import { useGameActions, useGameState, PMMessage } from './game-state';
import { selectPMInboxViewModel } from './state/selectors';

// ============================================================================
// PM MESSAGES SCREEN
// ============================================================================

export const PMMessagesScreen: React.FC = () => {
  const gameState = useGameState();
  const gameActions = useGameActions();
  const [selectedMessage, setSelectedMessage] = useState<PMMessage | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inbox = useMemo(() => selectPMInboxViewModel(gameState), [gameState]);
  const { patience, reshuffleRisk, warningsIssued, demandsIssued, activeDemands } = inbox;
  const sortedMessages = inbox.messages;

  useEffect(() => {
    if (sortedMessages.length === 0) {
      setHighlightedIndex(0);
      return;
    }

    setHighlightedIndex((current) => Math.min(current, sortedMessages.length - 1));
  }, [sortedMessages]);

  const handleMessageClick = (message: PMMessage) => {
    setSelectedMessage(message);
    if (!message.read) {
      gameActions.markPMMessageAsRead(message.id);
    }
  };

  const handleListKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (sortedMessages.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedIndex((current) => Math.min(current + 1, sortedMessages.length - 1));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      handleMessageClick(sortedMessages[highlightedIndex]);
    }
  };

  return (
    <div className="treasury-stage p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="treasury-card-strong mb-6 px-6 py-6">
          <div className="treasury-kicker">Number 10</div>
          <h1 className="mt-2 font-display text-4xl font-semibold text-primary">Prime Minister&apos;s Office</h1>
          <p className="mt-2 max-w-3xl text-secondary">Communications, demands and warnings from Downing Street, arranged as if someone actually cared how this inbox feels to use.</p>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Left Sidebar - Relationship Status */}
          <div className="col-span-12 xl:col-span-4">
            <div className="treasury-card-strong sticky top-6 p-6">
              <div className="treasury-panel-title">
                <h2 className="font-display text-xl font-semibold text-primary">Relationship Status</h2>
                <span className="treasury-kicker">Live</span>
              </div>

              {/* PM Patience */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-secondary">PM Patience</span>
                  <span className={`font-mono text-lg font-semibold ${
                    patience >= 70 ? 'text-good' :
                    patience >= 40 ? 'text-warning' :
                    'text-bad'
                  }`}>
                    {patience}/100
                  </span>
                </div>
                <div className="progress-bar">
                  <div
                    className={`progress-bar-fill ${
                      patience >= 70 ? 'bg-good' :
                      patience >= 40 ? 'bg-warning' :
                      'bg-bad'
                    }`}
                    style={{ width: `${patience}%` }}
                  />
                </div>
              </div>

              {/* Reshuffle Risk */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-secondary">Reshuffle Risk</span>
                  <span className={`font-mono text-lg font-semibold ${
                    reshuffleRisk < 30 ? 'text-good' :
                    reshuffleRisk < 60 ? 'text-warning' :
                    'text-bad'
                  }`}>
                    {reshuffleRisk}/100
                  </span>
                </div>
                <div className="progress-bar">
                  <div
                    className={`progress-bar-fill ${
                      reshuffleRisk < 30 ? 'bg-good' :
                      reshuffleRisk < 60 ? 'bg-warning' :
                      'bg-bad'
                    }`}
                    style={{ width: `${reshuffleRisk}%` }}
                  />
                </div>
                {reshuffleRisk >= 80 && (
                  <p className="text-xs text-bad font-semibold mt-2">[CRITICAL] Reshuffle imminent!</p>
                )}
              </div>

              {/* Statistics */}
              <div className="border-t border-border-custom pt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-secondary">Total Messages:</span>
                  <span className="font-mono text-sm font-semibold text-primary">{sortedMessages.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-secondary">Unread:</span>
                  <span className="font-mono text-sm font-semibold text-secondary">{inbox.unreadCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-secondary">Warnings Received:</span>
                  <span className="font-mono text-sm font-semibold text-warning">{warningsIssued}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-secondary">Demands Issued:</span>
                  <span className="font-mono text-sm font-semibold text-bad">{demandsIssued}</span>
                </div>
              </div>

              {/* Active Demands */}
              {activeDemands.length > 0 && (
                <div className="border-t border-border-custom mt-4 pt-4">
                  <h3 className="text-sm font-semibold text-primary mb-2">Active Demands</h3>
                  {activeDemands.map((demand, idx) => (
                    <div key={idx} className="mb-3 p-3 bg-bad-subtle border border-bad">
                      <p className="text-xs font-semibold text-bad mb-1">{demand.category.toUpperCase()}</p>
                      <p className="text-xs text-bad mb-2">{demand.description}</p>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-bad">Deadline: Turn {demand.deadline}</span>
                        {demand.met ? (
                          <span className="text-xs font-semibold text-good">[Met]</span>
                        ) : (
                          <span className="text-xs font-semibold text-bad">[Pending]</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="col-span-12 xl:col-span-8">
            {/* Message List */}
            {!selectedMessage && (
              <div className="treasury-card-strong overflow-hidden">
                <div className="border-b border-border-subtle bg-primary px-6 py-5">
                  <div className="treasury-kicker text-white/60">Inbox</div>
                  <h2 className="mt-1 font-display text-2xl font-semibold text-white">Messages from the Prime Minister</h2>
                  <p className="mt-1 text-sm text-white/80">
                    {sortedMessages.length === 0 ? 'No messages yet' : `${sortedMessages.length} message${sortedMessages.length !== 1 ? 's' : ''}`}
                  </p>
                </div>

                {sortedMessages.length === 0 ? (
                  <div className="p-12 text-center">
                    <p className="text-secondary text-lg">No messages from the PM yet.</p>
                    <p className="text-muted text-sm mt-2">
                      The Prime Minister will be in touch as your chancellorship progresses.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border-subtle" tabIndex={0} onKeyDown={handleListKeyDown} aria-label="PM message list">
                    {sortedMessages.map((message, index) => (
                      <div
                        key={message.id}
                        onClick={() => handleMessageClick(message)}
                        className={`p-6 cursor-pointer transition-colors hover:bg-bg-surface focus:outline-none focus:ring-2 focus:ring-primary ${
                          index === highlightedIndex ? 'ring-2 ring-primary ring-inset' : ''
                        } ${
                          !message.read ? 'bg-secondary-subtle' : ''
                        }`}
                        tabIndex={-1}
                        role="button"
                        aria-pressed={index === highlightedIndex}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-3">
                            {!message.read && (
                              <span className="w-2 h-2 bg-primary rounded-full"></span>
                            )}
                            <div>
                              <h3 className="text-lg font-semibold text-primary">{message.subject}</h3>
                              <div className="flex items-center gap-4 mt-1">
                                <span className="text-xs text-muted">
                                  Turn {message.turn} ({getMonthName(gameState.metadata.currentMonth)} {gameState.metadata.currentYear})
                                </span>
                                <span className={`text-xs px-2 py-0.5 font-semibold ${getMessageTypeBadgeColor(message.type)}`}>
                                  {getMessageTypeLabel(message.type)}
                                </span>
                                <span className={`text-xs px-2 py-0.5 font-semibold ${getToneBadgeColor(message.tone)}`}>
                                  {message.tone}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <p className="text-secondary text-sm line-clamp-2 mt-2">
                          {message.content.split('\n')[0]}
                        </p>
                        {message.consequenceWarning && (
                          <div className="mt-3 p-2 bg-bad-subtle border border-bad">
                            <p className="text-xs text-bad font-semibold">[Warning] {message.consequenceWarning}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Message Detail View */}
            {selectedMessage && (
              <div className="treasury-card-strong overflow-hidden">
                {/* Message Header */}
                <div className={`px-6 py-4 ${getMessageHeaderColor(selectedMessage.tone)}`}>
                  <button
                    onClick={() => setSelectedMessage(null)}
                    className="text-sm text-white/80 hover:text-white mb-3 flex items-center gap-2"
                  >
                    Back to messages
                  </button>
                  <h2 className="font-display text-2xl font-semibold text-white mb-2">{selectedMessage.subject}</h2>
                  <div className="flex items-center gap-4">
                    <span className="text-white/90 text-sm">
                      Turn {selectedMessage.turn} • {getMonthName(gameState.metadata.currentMonth)} {gameState.metadata.currentYear}
                    </span>
                    <span className="text-xs px-3 py-1 font-semibold bg-white/20 text-white">
                      {getMessageTypeLabel(selectedMessage.type)}
                    </span>
                  </div>
                </div>

                {/* Message Body */}
                <div className="p-8">
                  <div className="prose max-w-none">
                    <div className="whitespace-pre-wrap text-primary leading-relaxed font-body">
                      {selectedMessage.content}
                    </div>
                  </div>

                  {/* Consequence Warning */}
                  {selectedMessage.consequenceWarning && (
                    <div className="mt-6 p-4 bg-bad-subtle border-l-4 border-bad">
                      <p className="text-sm font-semibold text-bad mb-1">[Warning] Consequence Warning</p>
                      <p className="text-sm text-bad">{selectedMessage.consequenceWarning}</p>
                    </div>
                  )}

                  {/* Demand Details */}
                  {selectedMessage.demandCategory && selectedMessage.demandDetails && (
                    <div className="mt-6 p-4 bg-warning-subtle border-l-4 border-warning">
                      <p className="text-sm font-semibold text-warning mb-1">[Demands] Demand Details</p>
                      <p className="text-sm text-warning mb-2">{selectedMessage.demandDetails}</p>
                      <p className="text-xs text-warning">Category: {selectedMessage.demandCategory}</p>
                    </div>
                  )}

                  {/* Message Metadata */}
                  <div className="mt-6 pt-6 border-t border-border-custom">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-xs text-muted mb-1">Message Type</p>
                        <p className="text-sm font-semibold text-primary">{getMessageTypeLabel(selectedMessage.type)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted mb-1">Tone</p>
                        <p className="text-sm font-semibold text-primary capitalize">{selectedMessage.tone}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted mb-1">Received</p>
                        <p className="text-sm font-semibold text-primary">
                          Turn {selectedMessage.turn}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper functions

function getMonthName(month: number): string {
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
  return months[month - 1] || 'Unknown';
}

function getMessageTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    regular_checkin: 'Check-in',
    warning: 'Warning',
    threat: 'Threat',
    demand: 'Demand',
    support_change: 'Support Change',
    reshuffle_warning: 'Reshuffle Warning',
    praise: 'Praise',
    concern: 'Concern',
  };
  return labels[type] || type;
}

function getMessageTypeBadgeColor(type: string): string {
  const colors: Record<string, string> = {
    regular_checkin: 'bg-secondary-subtle text-secondary',
    warning: 'bg-warning-subtle text-warning',
    threat: 'bg-bad-subtle text-bad',
    demand: 'bg-bad-subtle text-bad',
    support_change: 'bg-primary-subtle text-primary',
    reshuffle_warning: 'bg-bad-subtle text-bad',
    praise: 'bg-good-subtle text-good',
    concern: 'bg-warning-subtle text-warning',
  };
  return colors[type] || 'bg-neutral-subtle text-neutral';
}

function getToneBadgeColor(tone: string): string {
  const colors: Record<string, string> = {
    supportive: 'bg-good-subtle text-good',
    neutral: 'bg-neutral-subtle text-neutral',
    stern: 'bg-warning-subtle text-warning',
    angry: 'bg-bad-subtle text-bad',
  };
  return colors[tone] || 'bg-neutral-subtle text-neutral';
}

function getMessageHeaderColor(tone: string): string {
  const colors: Record<string, string> = {
    supportive: 'bg-good',
    neutral: 'bg-secondary',
    stern: 'bg-warning',
    angry: 'bg-bad',
  };
  return colors[tone] || 'bg-secondary';
}
