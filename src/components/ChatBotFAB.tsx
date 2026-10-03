import React, { useState, useEffect } from 'react';
import HelpSalesChatBotComponent, { type LeadPayload, type SupportTicketPayload } from './HelpSalesChatBot';
import { VoiceBubble } from './voice/VoiceBubble';
import { ChatBotContext, ChatBotMode } from '../services/helpSalesChatBot';

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
  initialMode?: ChatBotMode;
  /** 'headshot' = a friendly photo bubble that bobs to get noticed (landing page). */
  launcher?: 'default' | 'headshot';
  launcherImage?: string;
  launcherLabel?: string;
  guideName?: string;
  /** Tailwind gradient classes for the circle behind the picture. */
  launcherBg?: string;
  /** Short line under the name in the chat header. */
  guideTagline?: string;
  /** Line art on white: blend it into the colored circle instead of showing a white box. */
  launcherBlend?: boolean;
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
  onToggle,
  initialMode,
  launcher = 'default',
  launcherImage = '/sales-guide.jpg',
  launcherLabel = 'Welcome, ask me anything',
  guideName = 'HomeListingAI Assistant',
  launcherBg = 'bg-gradient-to-b from-slate-100 to-sky-200',
  guideTagline = 'AI guide · ask me anything',
  launcherBlend = false
}) => {
  const isHeadshot = launcher === 'headshot';
  const [labelHidden, setLabelHidden] = useState(false);
  // Once someone has opened the guide, stop bobbing for the rest of the visit.
  const [guideSeen, setGuideSeen] = useState(() => { try { return sessionStorage.getItem('hl_guide_seen') === '1'; } catch { return false; } });
  const [internalIsOpen, setInternalIsOpen] = useState(initialOpen);

  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  // The landing-page guide opens as a normal text chat; voice is one tap away on the mic button.
  const [isVoiceView, setIsVoiceView] = useState(context.userType === 'visitor' && !isHeadshot);

  // Sync internal state if initialOpen changes (only if uncontrolled)
  useEffect(() => {
    if (!isControlled && initialOpen) {
      setInternalIsOpen(true);
      setHasNewMessage(false);
      setUnreadCount(0);
    }
  }, [initialOpen, isControlled]);

  useEffect(() => {
    const handleOpenChat = () => {
      if (!isOpen) {
        if (isControlled && onToggle) {
          onToggle();
        } else {
          setInternalIsOpen(true);
          setHasNewMessage(false);
          setUnreadCount(0);
        }
      }
      setIsVoiceView(false);
    };

    window.addEventListener('open-chat', handleOpenChat);
    return () => window.removeEventListener('open-chat', handleOpenChat);
  }, [isOpen, isControlled, onToggle]);

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
    if (!isOpen && isHeadshot) {
      setGuideSeen(true);
      try { sessionStorage.setItem('hl_guide_seen', '1'); } catch { /* private mode */ }
    }
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
            <div className={`flex items-center justify-between p-4 border-b border-gray-200 text-white rounded-t-lg ${isHeadshot ? 'bg-gradient-to-r from-slate-900 via-slate-900 to-sky-900' : 'bg-blue-600'}`}>
              <div className="flex items-center space-x-2">
                {isHeadshot ? (
                  <div className="relative">
                    <span className={`block h-10 w-10 overflow-hidden rounded-full border-2 border-cyan-300 ${launcherBg}`}>
                      <img src={launcherImage} alt="" className={`h-full w-full object-cover ${launcherBlend ? 'mix-blend-multiply' : ''}`} />
                    </span>
                    <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-900 bg-emerald-400" aria-hidden="true" />
                  </div>
                ) : (
                  <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-sm">{isHeadshot ? guideName : 'AI Assistant'}</h3>
                  <p className="text-xs opacity-90">{isHeadshot ? guideTagline : 'Here to help!'}</p>
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
                  aria-label="Close AI assistant"
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
                      initialMode={initialMode}
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

      {/* Headshot launcher: a friendly face that bobs up and down to get noticed */}
      {isHeadshot && (
        <div className={`fixed ${positionClasses[position]} z-40 flex items-center gap-3 transition-opacity duration-300 ${isOpen ? 'pointer-events-none opacity-0' : 'opacity-100'}`}>
          {!labelHidden && (
            <button
              type="button"
              onClick={handleToggleChat}
              className="hl-guide-label relative block max-w-[150px] rounded-2xl bg-white px-3 py-2 text-left text-xs font-bold leading-snug text-slate-900 shadow-xl ring-1 ring-slate-200 sm:max-w-[210px] sm:px-4 sm:py-2.5 sm:text-sm"
              style={{ animationDelay: '1.2s' }}
              aria-label={launcherLabel}
            >
              {launcherLabel}
              <span
                role="button"
                tabIndex={0}
                aria-label="Hide this message"
                onClick={(e) => { e.stopPropagation(); setLabelHidden(true); }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); setLabelHidden(true); } }}
                className="absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs text-white shadow"
              >×</span>
              <span className="absolute -right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 bg-white ring-1 ring-slate-200" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 0)' }} aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            onClick={handleToggleChat}
            aria-label={`Chat with the ${guideName}`}
            className={`${guideSeen ? '' : 'hl-guide'} group relative rounded-full focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-300`}
          >
            <span className="hl-guide-ring block rounded-full bg-gradient-to-br from-cyan-300 via-sky-500 to-indigo-600 p-[3px]">
              <span className={`block rounded-full p-[3px] ${launcherBg}`}>
                <img
                  src={launcherImage}
                  alt=""
                  width={72}
                  height={72}
                  className={`h-[68px] w-[68px] rounded-full object-cover sm:h-[76px] sm:w-[76px] ${launcherBlend ? 'mix-blend-multiply' : ''}`}
                />
              </span>
            </span>
            <span className="absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-white bg-emerald-400" aria-hidden="true" />
            {(hasNewMessage || unreadCount > 0) && (
              <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-xs font-bold text-white">1</span>
            )}
          </button>
        </div>
      )}

      {/* Floating Action Button */}
      <div className={`fixed ${positionClasses[position]} z-40 ${isHeadshot ? 'hidden' : ''}`}>
        <button
          onClick={handleToggleChat}
          aria-label={isOpen ? 'Hide AI assistant' : 'Open AI assistant'}
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
      {hasNewMessage && !isOpen && !isHeadshot && (
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
                aria-label="Dismiss welcome message"
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