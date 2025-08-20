import React, { useState, useEffect } from 'react';
import { continueConversation, generateSpeech } from '../services/openaiService';
import { ChatMessage } from '../types';

const OpenAITestPage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { sender: 'ai', text: 'Hello! I am your OpenAI-powered assistant. How can I help you today?' }
  ]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isGeneratingSpeech, setIsGeneratingSpeech] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'>('nova');

  const handleSendMessage = async () => {
    if (!userInput.trim() || isLoading) return;

    // Add user message to chat
    const newUserMessage: ChatMessage = { sender: 'user', text: userInput.trim() };
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setUserInput('');
    setIsLoading(true);
    setError(null);

    try {
      // Call OpenAI service
      const response = await continueConversation(updatedMessages);
      
      // Add AI response to chat
      setMessages(prev => [...prev, { sender: 'ai', text: response }]);
    } catch (err) {
      console.error('Error getting AI response:', err);
      setError(err instanceof Error ? err.message : 'Failed to get a response from the AI');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateSpeech = async (text: string) => {
    if (isGeneratingSpeech) return;
    
    setIsGeneratingSpeech(true);
    setError(null);
    
    try {
      const result = await generateSpeech(text, selectedVoice);
      setAudioUrl(result.audioUrl);
      
      // Auto-play the audio
      const audio = new Audio(result.audioUrl);
      audio.play();
    } catch (err) {
      console.error('Error generating speech:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate speech');
    } finally {
      setIsGeneratingSpeech(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">OpenAI Integration Test</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Chat with GPT-5</h2>
        
        <div className="border rounded-lg p-4 h-96 overflow-y-auto mb-4 bg-gray-50">
          {messages.map((message, index) => (
            <div 
              key={index} 
              className={`mb-3 p-3 rounded-lg ${
                message.sender === 'user' 
                  ? 'bg-blue-100 ml-12' 
                  : 'bg-gray-200 mr-12'
              }`}
            >
              <div className="font-semibold mb-1">
                {message.sender === 'user' ? 'You' : 'AI Assistant'}
              </div>
              <div className="whitespace-pre-wrap">{message.text}</div>
              
              {message.sender === 'ai' && (
                <button
                  onClick={() => handleGenerateSpeech(message.text)}
                  disabled={isGeneratingSpeech}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800 flex items-center"
                >
                  <span className="material-icons text-sm mr-1">volume_up</span>
                  {isGeneratingSpeech ? 'Generating...' : 'Speak this'}
                </button>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-center items-center p-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          )}
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <div className="flex">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type your message here..."
            className="flex-grow border rounded-l-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || !userInput.trim()}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-r-lg disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Text-to-Speech Test</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Voice
          </label>
          <select
            value={selectedVoice}
            onChange={(e) => setSelectedVoice(e.target.value as any)}
            className="w-full border rounded-lg p-2"
          >
            <option value="alloy">Alloy (Neutral)</option>
            <option value="echo">Echo (Male)</option>
            <option value="fable">Fable (Male, Warm)</option>
            <option value="onyx">Onyx (Male, Deep)</option>
            <option value="nova">Nova (Female)</option>
            <option value="shimmer">Shimmer (Female, Clear)</option>
          </select>
        </div>
        
        {audioUrl && (
          <div className="mb-4">
            <audio controls src={audioUrl} className="w-full" />
          </div>
        )}
        
        <div className="flex flex-col">
          <textarea
            id="speech-text"
            rows={4}
            placeholder="Enter text to convert to speech..."
            className="border rounded-lg p-2 mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          ></textarea>
          <button
            onClick={() => {
              const text = (document.getElementById('speech-text') as HTMLTextAreaElement).value;
              if (text.trim()) handleGenerateSpeech(text);
            }}
            disabled={isGeneratingSpeech}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
          >
            {isGeneratingSpeech ? 'Generating...' : 'Generate Speech'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OpenAITestPage;