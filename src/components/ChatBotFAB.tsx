import React, { useState, useEffect } from 'react';
import HelpSalesChatBotComponent, { type LeadPayload, type SupportTicketPayload } from './HelpSalesChatBot';
import { VoiceBubble } from './voice/VoiceBubble';
import { ChatBotContext } from '../services/helpSalesChatBot';

interface ChatBotFABProps {
  context: ChatBotContext;
  onLeadGenerated?: (leadInfo: LeadPayload) => void;
  onSupportTicket?: (ticketInfo: SupportTicketPayload) => void;
  position?: 'bottom-right' | 'bottom-left';
  className?: string;
  showWelcomeMessage?: boolean;
  initialOpen?: boolean;
  isOpen?: boolean;
  onToggle?: () => void;
}

export const ChatBotFAB: React.FC<ChatBotFABProps> = ({
  context,
  onLeadGenerated,
  onSupportTicket,
  position = 'bottom-right',
  className = '',
  showWelcomeMessage = true,
  initialOpen = false,
  isOpen: controlledIsOpen,
  onToggle
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(initialOpen);

  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isVoiceView, setIsVoiceView] = useState(context.userType === 'visitor');

  // Sync internal state if initialOpen changes (only if uncontrolled)
  useEffect(() => {
    if (!isControlled && initialOpen) {
      setInternalIsOpen(true);
      setHasNewMessage(false);
      setUnreadCount(0);
    }
  }, [initialOpen, isControlled]);

  // Auto-show welcome message after a delay for new visitors
  useEffect(() => {
    if (showWelcomeMessage && context.userType === 'visitor' && !context.previousInteractions) {
      const timer = setTimeout(() => {
        setHasNewMessage(true);
        setUnreadCount(1);
      }, 3000); // Show after 3 seconds for new visitors

      return () => clearTimeout(timer);
    }
  }, [context, showWelcomeMessage]);

  const handleToggleChat = () => {
    if (isOpen) {
      setIsVoiceView(false);
    }

    if (isControlled && onToggle) {
      onToggle();
    } else {
      setInternalIsOpen((prev) => {
        const next = !prev;
        if (next) {
          setHasNewMessage(false);
          setUnreadCount(0);
        }
        return next;
      });
    }

    if (!isOpen) {
      // We are opening it (conceptually, though state update is async)
      setHasNewMessage(false);
      setUnreadCount(0);
    }
  };

  const handleLeadGenerated = (leadInfo: LeadPayload) => {
    onLeadGenerated?.(leadInfo);
    // Could show a success notification here
  };

  const handleSupportTicket = (ticketInfo: SupportTicketPayload) => {
    onSupportTicket?.(ticketInfo);
    // Could show a ticket created notification here
  };

  const positionClasses = {
    'bottom-right': 'bottom-4 right-4 sm:bottom-6 sm:right-6',
    'bottom-left': 'bottom-4 left-4 sm:bottom-6 sm:left-6'
  };

  return (
    <>
      {/* Chat Window */}
      {isOpen && (
        <div className={`fixed ${positionClasses[position]} z-50 max-w-[95vw] ${className}`}>
          <div className="bg-white rounded-lg shadow-2xl border border-gray-200 w-[min(90vw,420px)] h-[min(80vh,640px)] sm:w-[380px] sm:h-[560px] flex flex-col pb-[env(safe-area-inset-bottom)]">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-blue-600 text-white rounded-t-lg">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-sm">AI Assistant</h3>
                  <p className="text-xs opacity-90">Here to help!</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsVoiceView((prev) => !prev)}
                  className="flex items-center justify-center h-8 w-8 rounded-full bg-white/15 hover:bg-white/25 transition-colors"
                  aria-label={isVoiceView ? 'Back to chat view' : 'Flip to voice assistant'}
                >
                  <span className="material-symbols-outlined text-lg">
                    {isVoiceView ? 'chat' : 'mic'}
                  </span>
                </button>
                <button
                  onClick={handleToggleChat}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-1 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Chat Component */}
            <div className="flex-1 min-h-0 relative">
              <div className="relative h-full w-full" style={{ perspective: '2000px' }}>
                <div
                  className="absolute inset-0 transition-transform duration-500"
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: isVoiceView ? 'rotateY(180deg)' : 'rotateY(0deg)'
                  }}
                >
                  <div
                    className="absolute inset-0 bg-white"
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    <HelpSalesChatBotComponent
                      context={context}
                      onLeadGenerated={handleLeadGenerated}
                      onSupportTicket={handleSupportTicket}
                      onToggleVoice={() => setIsVoiceView((prev) => !prev)}
                      className="h-full rounded-none border-none shadow-none"
                    />
                  </div>
                  <div
                    className="absolute inset-0"
                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                  >
                    <VoiceBubble
                      assistantName="AI Voice Concierge"
                      sidekickId="demo-sales-sidekick"
                      systemPrompt="Always guide the conversation toward demonstrating how HomeListingAI grows an agent's pipeline, and close with a clear next step."
                      autoConnect={isVoiceView}
                      showHeader={false}
                      className="rounded-lg"
                      onClose={() => setIsVoiceView(false)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <div className={`fixed ${positionClasses[position]} z-40`}>
        <button
          onClick={handleToggleChat}
          className={`relative bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 ${isOpen ? 'scale-0' : 'scale-100'
            }`}
        >
          {/* Chat Icon */}
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
          </svg>

          {/* Notification Badge */}
          {(hasNewMessage || unreadCount > 0) && (
            <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
              {unreadCount > 0 ? unreadCount : '!'}
            </div>
          )}

          {/* Pulse Animation for New Messages */}
          {hasNewMessage && (
            <div className="absolute inset-0 bg-blue-600 rounded-full animate-ping opacity-75"></div>
          )}
        </button>
      </div>

      {/* Welcome Message Tooltip */}
      {hasNewMessage && !isOpen && (
        <div className={`fixed ${position === 'bottom-right' ? 'bottom-20 right-20' : 'bottom-20 left-20'} z-30`}>
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3 max-w-xs animate-bounce">
            <div className="flex items-start space-x-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">Hi there! 👋</p>
                <p className="text-xs text-gray-600 mt-1">
                  Need help or have questions? I'm here to assist!
                </p>
              </div>
              <button
                onClick={() => setHasNewMessage(false)}
                className="text-gray-400 hover:text-gray-600 ml-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Arrow pointing to FAB */}
            <div className={`absolute top-full ${position === 'bottom-right' ? 'right-8' : 'left-8'} w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white`}></div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBotFAB;