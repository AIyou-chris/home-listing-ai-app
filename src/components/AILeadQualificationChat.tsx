import React, { useState, useRef, useEffect } from 'react';
import { LeadQualificationAI, QualificationResponse, LeadQualificationData } from '../services/leadQualificationAI';
import { ChatMessage } from '../types';

interface AILeadQualificationChatProps {
  onLeadQualified?: (leadData: Partial<LeadQualificationData>) => void;
  onScoreUpdate?: (score: number) => void;
  initialData?: Partial<LeadQualificationData>;
  className?: string;
}

export const AILeadQualificationChat: React.FC<AILeadQualificationChatProps> = ({
  onLeadQualified,
  onScoreUpdate,
  initialData,
  className = ''
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [qualificationAI] = useState(() => new LeadQualificationAI(initialData));
  const [currentScore, setCurrentScore] = useState(0);
  const [extractedData, setExtractedData] = useState<Partial<LeadQualificationData>>({});
  const [isQualified, setIsQualified] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Add welcome message
    const welcomeMessage: ChatMessage = {
      sender: 'assistant',
      text: "Hi! I'm here to help you find the perfect property. I'd love to learn more about what you're looking for so I can provide you with the most relevant options. What brings you to the market today?",
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    onScoreUpdate?.(currentScore);
    if (currentScore >= 60 && !isQualified) {
      setIsQualified(true);
      onLeadQualified?.(extractedData);
    }
  }, [currentScore, extractedData, isQualified, onLeadQualified, onScoreUpdate]);

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

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response: QualificationResponse = await qualificationAI.processMessage(inputValue);
      
      const aiMessage: ChatMessage = {
        sender: 'assistant',
        text: response.message,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
      setCurrentScore(response.qualificationScore);
      setExtractedData(response.extractedData);

    } catch (error) {
      console.error('Error processing message:', error);
      const errorMessage: ChatMessage = {
        sender: 'assistant',
        text: "I apologize, but I'm having trouble processing your message right now. Could you please try again?",
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

  const formatScore = (score: number) => {
    if (score >= 80) return { color: 'text-green-600', label: 'Highly Qualified' };
    if (score >= 60) return { color: 'text-blue-600', label: 'Qualified' };
    if (score >= 40) return { color: 'text-yellow-600', label: 'Potential' };
    return { color: 'text-gray-600', label: 'Qualifying' };
  };

  const scoreInfo = formatScore(currentScore);

  return (
    <div className={`flex flex-col h-full bg-white rounded-lg shadow-lg ${className}`}>
      {/* Header with qualification score */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <h3 className="text-lg font-semibold text-gray-800">AI Lead Qualification</h3>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Score:</span>
          <span className={`text-sm font-semibold ${scoreInfo.color}`}>
            {currentScore}/100
          </span>
          <span className={`text-xs px-2 py-1 rounded-full ${scoreInfo.color} bg-opacity-10`}>
            {scoreInfo.label}
          </span>
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
              <p className="text-sm">{message.text}</p>
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

      {/* Extracted data preview (for qualified leads) */}
      {currentScore >= 40 && Object.keys(extractedData).length > 0 && (
        <div className="px-4 py-2 bg-blue-50 border-t border-blue-200">
          <h4 className="text-sm font-semibold text-blue-800 mb-2">Lead Information:</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {extractedData.budget && (
              <div><span className="font-medium">Budget:</span> {extractedData.budget}</div>
            )}
            {extractedData.timeline && (
              <div><span className="font-medium">Timeline:</span> {extractedData.timeline}</div>
            )}
            {extractedData.location && (
              <div><span className="font-medium">Location:</span> {extractedData.location}</div>
            )}
            {extractedData.propertyType && (
              <div><span className="font-medium">Type:</span> {extractedData.propertyType}</div>
            )}
            {extractedData.email && (
              <div><span className="font-medium">Email:</span> {extractedData.email}</div>
            )}
            {extractedData.phone && (
              <div><span className="font-medium">Phone:</span> {extractedData.phone}</div>
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

export default AILeadQualificationChat;