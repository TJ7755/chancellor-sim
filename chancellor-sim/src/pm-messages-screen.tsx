import React, { useState } from 'react';
import { useGameState, PMMessage, PMRelationshipState } from './game-state';
import { markMessageAsRead } from './pm-system';

// ============================================================================
// PM MESSAGES SCREEN
// ============================================================================

export const PMMessagesScreen: React.FC = () => {
  const gameState = useGameState();
  const [selectedMessage, setSelectedMessage] = useState<PMMessage | null>(null);

  const { pmRelationship } = gameState;
  const { messages, patience, reshuffleRisk, warningsIssued, demandsIssued, activeDemands } = pmRelationship;

  // Sort messages by turn (most recent first)
  const sortedMessages = [...messages].sort((a, b) => b.turn - a.turn);

  const handleMessageClick = (message: PMMessage) => {
    setSelectedMessage(message);
    // Mark as read (we'll handle this through game actions later)
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Prime Minister's Office</h1>
          <p className="text-slate-600">Communications from Number 10 Downing Street</p>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Left Sidebar - Relationship Status */}
          <div className="col-span-3">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Relationship Status</h2>

              {/* PM Patience */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-slate-700">PM Patience</span>
                  <span className={`text-lg font-bold ${
                    patience >= 70 ? 'text-green-600' :
                    patience >= 40 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {patience}/100
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${
                      patience >= 70 ? 'bg-green-500' :
                      patience >= 40 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${patience}%` }}
                  />
                </div>
              </div>

              {/* Reshuffle Risk */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-slate-700">Reshuffle Risk</span>
                  <span className={`text-lg font-bold ${
                    reshuffleRisk < 30 ? 'text-green-600' :
                    reshuffleRisk < 60 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {reshuffleRisk}/100
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${
                      reshuffleRisk < 30 ? 'bg-green-500' :
                      reshuffleRisk < 60 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${reshuffleRisk}%` }}
                  />
                </div>
                {reshuffleRisk >= 80 && (
                  <p className="text-xs text-red-600 font-semibold mt-2">[CRITICAL] Reshuffle imminent!</p>
                )}
              </div>

              {/* Statistics */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Total Messages:</span>
                  <span className="text-sm font-semibold text-slate-900">{messages.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Unread:</span>
                  <span className="text-sm font-semibold text-blue-600">{pmRelationship.unreadCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Warnings Received:</span>
                  <span className="text-sm font-semibold text-orange-600">{warningsIssued}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Demands Issued:</span>
                  <span className="text-sm font-semibold text-red-600">{demandsIssued}</span>
                </div>
              </div>

              {/* Active Demands */}
              {activeDemands.length > 0 && (
                <div className="border-t mt-4 pt-4">
                  <h3 className="text-sm font-bold text-slate-900 mb-2">Active Demands</h3>
                  {activeDemands.map((demand, idx) => (
                    <div key={idx} className="mb-3 p-3 bg-red-50 rounded-lg border border-red-200">
                      <p className="text-xs font-semibold text-red-900 mb-1">{demand.category.toUpperCase()}</p>
                      <p className="text-xs text-red-700 mb-2">{demand.description}</p>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-red-600">Deadline: Turn {demand.deadline}</span>
                        {demand.met ? (
                          <span className="text-xs font-semibold text-green-600">[Met]</span>
                        ) : (
                          <span className="text-xs font-semibold text-red-600">[Pending]</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="col-span-9">
            {/* Message List */}
            {!selectedMessage && (
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-blue-900 to-blue-800 px-6 py-4">
                  <h2 className="text-2xl font-bold text-white">Messages from the Prime Minister</h2>
                  <p className="text-blue-200 text-sm mt-1">
                    {messages.length === 0 ? 'No messages yet' : `${messages.length} message${messages.length !== 1 ? 's' : ''}`}
                  </p>
                </div>

                {messages.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="text-sm text-gray-500 mb-2">●</div>
                    <p className="text-slate-600 text-lg">No messages from the PM yet.</p>
                    <p className="text-slate-500 text-sm mt-2">
                      The Prime Minister will be in touch as your chancellorship progresses.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {sortedMessages.map((message) => (
                      <div
                        key={message.id}
                        onClick={() => handleMessageClick(message)}
                        className={`p-6 cursor-pointer transition-colors hover:bg-slate-50 ${
                          !message.read ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-3">
                            {!message.read && (
                              <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                            )}
                            <div>
                              <h3 className="text-lg font-bold text-slate-900">{message.subject}</h3>
                              <div className="flex items-center gap-4 mt-1">
                                <span className="text-xs text-slate-500">
                                  Turn {message.turn} ({getMonthName(gameState.metadata.currentMonth)} {gameState.metadata.currentYear})
                                </span>
                                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${getMessageTypeBadgeColor(message.type)}`}>
                                  {getMessageTypeLabel(message.type)}
                                </span>
                                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${getToneBadgeColor(message.tone)}`}>
                                  {message.tone}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <p className="text-slate-700 text-sm line-clamp-2 mt-2">
                          {message.content.split('\n')[0]}
                        </p>
                        {message.consequenceWarning && (
                          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
                            <p className="text-xs text-red-700 font-semibold">[Warning] {message.consequenceWarning}</p>
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
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                {/* Message Header */}
                <div className={`px-6 py-4 ${getMessageHeaderColor(selectedMessage.tone)}`}>
                  <button
                    onClick={() => setSelectedMessage(null)}
                    className="text-sm text-white/80 hover:text-white mb-3 flex items-center gap-2"
                  >
                    ← Back to messages
                  </button>
                  <h2 className="text-2xl font-bold text-white mb-2">{selectedMessage.subject}</h2>
                  <div className="flex items-center gap-4">
                    <span className="text-white/90 text-sm">
                      Turn {selectedMessage.turn} • {getMonthName(gameState.metadata.currentMonth)} {gameState.metadata.currentYear}
                    </span>
                    <span className={`text-xs px-3 py-1 rounded-full font-semibold bg-white/20 text-white`}>
                      {getMessageTypeLabel(selectedMessage.type)}
                    </span>
                  </div>
                </div>

                {/* Message Body */}
                <div className="p-8">
                  <div className="prose max-w-none">
                    <div className="whitespace-pre-wrap text-slate-800 leading-relaxed">
                      {selectedMessage.content}
                    </div>
                  </div>

                  {/* Consequence Warning */}
                  {selectedMessage.consequenceWarning && (
                    <div className="mt-6 p-4 bg-red-50 border-l-4 border-red-500 rounded">
                      <p className="text-sm font-semibold text-red-900 mb-1">[Warning] Consequence Warning</p>
                      <p className="text-sm text-red-700">{selectedMessage.consequenceWarning}</p>
                    </div>
                  )}

                  {/* Demand Details */}
                  {selectedMessage.demandCategory && selectedMessage.demandDetails && (
                    <div className="mt-6 p-4 bg-amber-50 border-l-4 border-amber-500 rounded">
                      <p className="text-sm font-semibold text-amber-900 mb-1">[Demands] Demand Details</p>
                      <p className="text-sm text-amber-700 mb-2">{selectedMessage.demandDetails}</p>
                      <p className="text-xs text-amber-600">Category: {selectedMessage.demandCategory}</p>
                    </div>
                  )}

                  {/* Message Metadata */}
                  <div className="mt-6 pt-6 border-t border-slate-200">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Message Type</p>
                        <p className="text-sm font-semibold text-slate-900">{getMessageTypeLabel(selectedMessage.type)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Tone</p>
                        <p className="text-sm font-semibold text-slate-900 capitalize">{selectedMessage.tone}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Received</p>
                        <p className="text-sm font-semibold text-slate-900">
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
    regular_checkin: 'bg-blue-100 text-blue-800',
    warning: 'bg-orange-100 text-orange-800',
    threat: 'bg-red-100 text-red-800',
    demand: 'bg-red-100 text-red-800',
    support_change: 'bg-purple-100 text-purple-800',
    reshuffle_warning: 'bg-red-100 text-red-900',
    praise: 'bg-green-100 text-green-800',
    concern: 'bg-yellow-100 text-yellow-800',
  };
  return colors[type] || 'bg-slate-100 text-slate-800';
}

function getToneBadgeColor(tone: string): string {
  const colors: Record<string, string> = {
    supportive: 'bg-green-100 text-green-800',
    neutral: 'bg-slate-100 text-slate-800',
    stern: 'bg-orange-100 text-orange-800',
    angry: 'bg-red-100 text-red-800',
  };
  return colors[tone] || 'bg-slate-100 text-slate-800';
}

function getMessageHeaderColor(tone: string): string {
  const colors: Record<string, string> = {
    supportive: 'bg-gradient-to-r from-green-700 to-green-600',
    neutral: 'bg-gradient-to-r from-blue-900 to-blue-800',
    stern: 'bg-gradient-to-r from-orange-700 to-orange-600',
    angry: 'bg-gradient-to-r from-red-900 to-red-800',
  };
  return colors[tone] || 'bg-gradient-to-r from-slate-700 to-slate-600';
}
