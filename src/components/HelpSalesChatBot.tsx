import React, { useState, useRef, useEffect } from 'react';
import { HelpSalesChatBot, ChatBotResponse, ChatBotContext, ChatBotMode } from '../services/helpSalesChatBot';
import { ChatMessage } from '../types';

export interface LeadPayload {
  message: string;
  response: string;
  priority: ChatBotResponse['priority'];
  category: ChatBotResponse['category'];
  timestamp: Date;
}

export interface SupportTicketPayload {
  message: string;
  response: string;
  priority: ChatBotResponse['priority'];
  category: ChatBotResponse['category'];
  needsHandoff: boolean;
  timestamp: Date;
}

interface HelpSalesChatBotProps {
  context: ChatBotContext;
  onLeadGenerated?: (leadInfo: LeadPayload) => void;
  onSupportTicket?: (ticketInfo: SupportTicketPayload) => void;
  onUserMessage?: (message: string) => void;
  onAssistantMessage?: (message: string) => void;
  className?: string;
  initialMode?: ChatBotMode;
}

export const HelpSalesChatBotComponent: React.FC<HelpSalesChatBotProps> = ({
  context,
  onLeadGenerated,
  onSupportTicket,
  onUserMessage,
  onAssistantMessage,
  className = '',
  initialMode = 'general'
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatBot] = useState(() => new HelpSalesChatBot(context));
  const [currentMode, setCurrentMode] = useState<ChatBotMode>(initialMode);
  const [lastResponse, setLastResponse] = useState<ChatBotResponse | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Add welcome message based on context
    const welcomeMessage = getWelcomeMessage(context, initialMode);
    setMessages([welcomeMessage]);
    chatBot.setMode(initialMode);
  }, [chatBot, context, initialMode]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getWelcomeMessage = (ctx: ChatBotContext, mode: ChatBotMode): ChatMessage => {
    let text = '';
    
    switch (mode) {
      case 'sales':
        text = "Hi! I'm here to help you learn about our real estate AI platform. What would you like to know about our features and how they can benefit your business?";
        break;
      case 'help':
        text = "Hello! I'm your support assistant. I'm here to help you with any questions or issues you might have. How can I assist you today?";
        break;
      default:
        text = "Hi there! I'm here to help with any questions about our real estate AI platform. Whether you need support, want to learn about our features, or are interested in a demo, I'm here to assist. How can I help you today?";
    }

    return {
      sender: 'assistant',
      text,
      timestamp: new Date()
    };
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      sender: 'user',
      text: inputValue,
      timestamp: new Date()
    };
    onUserMessage?.(inputValue);

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response: ChatBotResponse = await chatBot.processMessage(inputValue, currentMode);
      
      const aiMessage: ChatMessage = {
        sender: 'assistant',
        text: response.message,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
      setCurrentMode(response.mode);
      setLastResponse(response);
      onAssistantMessage?.(response.message);

      // Handle callbacks based on response
      if (response.mode === 'sales' && response.priority === 'high') {
        onLeadGenerated?.({
          message: inputValue,
          response: response.message,
          priority: response.priority,
          category: response.category,
          timestamp: new Date()
        });
      }

      if (response.needsHumanHandoff) {
        onSupportTicket?.({
          message: inputValue,
          response: response.message,
          priority: response.priority,
          category: response.category,
          needsHandoff: true,
          timestamp: new Date()
        });
      }

    } catch (error) {
      console.error('Error processing message:', error);
      const errorMessage: ChatMessage = {
        sender: 'assistant',
        text: "I apologize, but I'm having trouble processing your message right now. Please try again or contact our support team directly.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSuggestedAction = (action: string) => {
    setInputValue(action);
    // Auto-send the suggested action
    setTimeout(() => handleSendMessage(), 100);
  };

  const handleModeSwitch = (newMode: ChatBotMode) => {
    setCurrentMode(newMode);
    chatBot.setMode(newMode);
    
    const modeMessage: ChatMessage = {
      sender: 'assistant',
      text: `I've switched to ${newMode} mode. ${getModeDescription(newMode)}`,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, modeMessage]);
  };

  const getModeDescription = (mode: ChatBotMode): string => {
    switch (mode) {
      case 'sales':
        return "I'm now focused on helping you understand our platform's value and how it can benefit your business.";
      case 'help':
        return "I'm now focused on providing technical support and helping you resolve any issues.";
      default:
        return "I can help with both sales questions and technical support.";
    }
  };

  const getModeColor = (mode: ChatBotMode): string => {
    switch (mode) {
      case 'sales': return 'bg-green-100 text-green-800';
      case 'help': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      default: return 'text-green-600';
    }
  };

  return (
    <div className={`flex flex-col h-full bg-white rounded-lg shadow-lg ${className}`}>
      {/* Header with mode indicator */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
          <h3 className="text-lg font-semibold text-gray-800">AI Assistant</h3>
          <span className={`text-xs px-2 py-1 rounded-full ${getModeColor(currentMode)}`}>
            {currentMode.charAt(0).toUpperCase() + currentMode.slice(1)} Mode
          </span>
        </div>
        
        {/* Mode switcher */}
        <div className="flex space-x-1">
          <button
            onClick={() => handleModeSwitch('help')}
            className={`text-xs px-2 py-1 rounded ${
              currentMode === 'help' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            Help
          </button>
          <button
            onClick={() => handleModeSwitch('sales')}
            className={`text-xs px-2 py-1 rounded ${
              currentMode === 'sales' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            Sales
          </button>
          <button
            onClick={() => handleModeSwitch('general')}
            className={`text-xs px-2 py-1 rounded ${
              currentMode === 'general' ? 'bg-gray-600 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            General
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.sender === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.text}</p>
              <p className="text-xs mt-1 opacity-70">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-sm">AI is thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested actions */}
      {lastResponse?.suggestedActions && lastResponse.suggestedActions.length > 0 && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
          <p className="text-xs text-gray-600 mb-2">Suggested actions:</p>
          <div className="flex flex-wrap gap-2">
            {lastResponse.suggestedActions.map((action, index) => (
              <button
                key={index}
                onClick={() => handleSuggestedAction(action)}
                className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Status indicators */}
      {lastResponse && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">Category: {lastResponse.category}</span>
              <span className={`font-medium ${getPriorityColor(lastResponse.priority)}`}>
                Priority: {lastResponse.priority}
              </span>
            </div>
            {lastResponse.needsHumanHandoff && (
              <span className="text-orange-600 font-medium">Human handoff requested</span>
            )}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || !inputValue.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default HelpSalesChatBotComponent;