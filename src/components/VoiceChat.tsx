// src/components/VoiceChat.tsx - Complete file to copy/paste
import React, { useState, useRef } from 'react';
import { AudioRecorder } from 'react-audio-voice-recorder';

interface VoiceChatProps {
  onClose: () => void;
}

const VoiceChat: React.FC<VoiceChatProps> = ({ onClose }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleAudioRecorded = async (blob: Blob) => {
    setIsLoading(true);
    try {
      // Convert blob to base64 for Firebase
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;
        
        // Call Firebase function for transcription
        const transcribeFunction = await import('firebase/functions').then(f => 
          f.httpsCallable(f.getFunctions(), 'transcribeVoice')
        );
        
        const result = await transcribeFunction({ audioData: base64Audio });
        const userText = result.data.text;
        setTranscription(userText);

        // Get AI response
        const chatFunction = await import('firebase/functions').then(f => 
          f.httpsCallable(f.getFunctions(), 'voiceChatResponse')
        );
        
        const aiResult = await chatFunction({ message: userText });
        const responseText = aiResult.data.text;
        setAiResponse(responseText);

        // Convert AI response to speech
        const speechFunction = await import('firebase/functions').then(f => 
          f.httpsCallable(f.getFunctions(), 'generateSpeech')
        );
        
        const speechResult = await speechFunction({ text: responseText });
        
        // Play the audio response
        if (audioRef.current && speechResult.data.audioUrl) {
          audioRef.current.src = speechResult.data.audioUrl;
          audioRef.current.play();
        }
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('Voice chat error:', error);
      setAiResponse('Sorry, I had trouble processing that. Please try again.');
    }
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-w-90vw">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-800">Voice Chat</h2>
          <button 
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Voice Recorder */}
        <div className="text-center mb-6">
          <div className="mb-4">
            <AudioRecorder 
              onRecordingComplete={handleAudioRecorded}
              audioTrackConstraints={{
                noiseSuppression: true,
                echoCancellation: true,
              }}
              downloadOnSavePress={false}
              downloadFileExtension="webm"
            />
          </div>
          <p className="text-sm text-slate-600">
            Click to start recording, click again to stop
          </p>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="text-center mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-slate-600">Processing your voice...</p>
          </div>
        )}

        {/* Transcription */}
        {transcription && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm font-semibold text-blue-800">You said:</p>
            <p className="text-blue-700">{transcription}</p>
          </div>
        )}

        {/* AI Response */}
        {aiResponse && (
          <div className="mb-4 p-3 bg-green-50 rounded-lg">
            <p className="text-sm font-semibold text-green-800">AI Response:</p>
            <p className="text-green-700">{aiResponse}</p>
          </div>
        )}

        {/* Hidden audio element for playing responses */}
        <audio ref={audioRef} style={{ display: 'none' }} />

        {/* Instructions */}
        <div className="text-xs text-slate-500 text-center">
          Speak naturally and wait for the AI to respond with voice!
        </div>
      </div>
    </div>
  );
};

export default VoiceChat;