import React, { useState, useEffect } from 'react';
import HelpSalesChatBotComponent from './HelpSalesChatBot';
import { ChatBotContext } from '../services/helpSalesChatBot';

interface ChatBotFABProps {
  context: ChatBotContext;
  onLeadGenerated?: (leadInfo: any) => void;
  onSupportTicket?: (ticketInfo: any) => void;
  position?: 'bottom-right' | 'bottom-left';
  className?: string;
}

export const ChatBotFAB: React.FC<ChatBotFABProps> = ({
  context,
  onLeadGenerated,
  onSupportTicket,
  position = 'bottom-right',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Auto-show welcome message after a delay for new visitors
  useEffect(() => {
    if (context.userType === 'visitor' && !context.previousInteractions) {
      const timer = setTimeout(() => {
        setHasNewMessage(true);
        setUnreadCount(1);
      }, 3000); // Show after 3 seconds for new visitors

      return () => clearTimeout(timer);
    }
  }, [context]);

  const handleToggleChat = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setHasNewMessage(false);
      setUnreadCount(0);
    }
  };

  const handleLeadGenerated = (leadInfo: any) => {
    onLeadGenerated?.(leadInfo);
    // Could show a success notification here
  };

  const handleSupportTicket = (ticketInfo: any) => {
    onSupportTicket?.(ticketInfo);
    // Could show a ticket created notification here
  };

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6'
  };

  return (
    <>
      {/* Chat Window */}
      {isOpen && (
        <div className={`fixed ${positionClasses[position]} z-50 ${className}`}>
          <div className="bg-white rounded-lg shadow-2xl border border-gray-200 w-96 h-[500px] flex flex-col">
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
              <button
                onClick={handleToggleChat}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-1 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Chat Component */}
            <div className="flex-1">
              <HelpSalesChatBotComponent
                context={context}
                onLeadGenerated={handleLeadGenerated}
                onSupportTicket={handleSupportTicket}
                className="h-full rounded-none border-none shadow-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <div className={`fixed ${positionClasses[position]} z-40`}>
        <button
          onClick={handleToggleChat}
          className={`relative bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 ${
            isOpen ? 'scale-0' : 'scale-100'
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