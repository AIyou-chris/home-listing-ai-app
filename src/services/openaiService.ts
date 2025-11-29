// Firebase functions removed; keep service API signatures intact

/**
 * Continues a conversation using OpenAI's GPT models
 * @param messages Array of chat messages to continue the conversation from
 * @param sidekick Optional sidekick type for training context
 * @returns A promise that resolves to the AI's response text
 */
import {
  buildLanguageInstruction,
  detectAndUpdateLanguage,
  getPreferredLanguage
} from './languagePreferenceService'
import { buildApiUrl, getApiBaseUrl } from '../lib/api'
import { getEnvValue } from '../lib/env'

interface ContinueConversationOptions {
  language?: string
}

export const continueConversation = async (
  messages: Array<{ sender: string; text: string }>, 
  sidekick?: string,
  options?: ContinueConversationOptions
): Promise<string> => {
  try {
    let overrideLanguage = options?.language
    if (!overrideLanguage) {
      const lastUserMessage = [...messages].reverse().find((m) => m.sender === 'user')?.text
      if (lastUserMessage) {
        const detected = await detectAndUpdateLanguage(lastUserMessage)
        if (detected) {
          overrideLanguage = detected
        }
      }
    }

    const preferredLanguage = getPreferredLanguage(overrideLanguage)
    const languageInstruction = buildLanguageInstruction(preferredLanguage)
    const existingSystemPrompt = messages.find(m => m.sender === 'system')?.text
    const combinedSystemPrompt = [existingSystemPrompt, languageInstruction]
      .filter((text): text is string => Boolean(text && text.trim().length > 0))
      .join('\n\n') || undefined
    const finalMessages = messages.filter(m => m.sender !== 'system')

    const response = await fetch(buildApiUrl('/api/continue-conversation'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: finalMessages,
        sidekick,
        role: 'agent',
        preferredLanguage,
        systemPrompt: combinedSystemPrompt
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.response || data.message || 'No response received';
  } catch (error) {
    console.error('Error continuing conversation:', error);
    // Fallback response
    const last = messages[messages.length - 1]?.text || '';
    return `I apologize, but I'm having trouble connecting right now. You asked about: "${last.substring(0, 100)}${last.length > 100 ? '...' : ''}"`;
  }
};

/**
 * Generates speech from text using OpenAI's text-to-speech API via local server
 * @param text The text to convert to speech
 * @param voice The voice to use (default: "alloy")
 * @returns A promise that resolves to an object containing the audio URL and duration
 */
export const generateSpeech = async (
  text: string, 
  voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' = 'nova'
): Promise<{ audioUrl: string; duration: number; fallback?: boolean }> => {
  try {
    console.log("🎤 Generating speech with OpenAI:", { text: text.substring(0, 50) + '...', voice });
    
    const apiBase = getApiBaseUrl() || getEnvValue('VITE_API_URL') || 'https://ailisitnghome-43boqi59o-ai-you.vercel.app'
    const response = await fetch(`${apiBase}/api/generate-speech`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, voice }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("❌ OpenAI speech error:", errorData);
      
      // Fallback to browser speech synthesis
      return {
        audioUrl: '',
        duration: 0,
        fallback: true
      };
    }

    // Create audio blob from response
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    
    // Estimate duration (rough calculation: ~150 words per minute)
    const wordCount = text.split(' ').length;
    const estimatedDuration = (wordCount / 150) * 60;
    
    console.log("✅ OpenAI speech generated successfully");
    
    return {
      audioUrl,
      duration: estimatedDuration,
      fallback: false
    };
  } catch (error) {
    console.error("❌ Error generating OpenAI speech:", error);
    
    // Fallback to browser speech synthesis
    return {
      audioUrl: '',
      duration: 0,
      fallback: true
    };
  }
};

export const generateImage = async (
  prompt: string,
  size: '1024x1024' | '512x512' | '256x256' = '1024x1024'
): Promise<{ url?: string; b64?: string }> => {
  if (!prompt.trim()) throw new Error('Prompt is required');
  try {
    // Return placeholder data in local mode
    console.info('generateImage invoked (placeholder)', { prompt, size });
    return { url: undefined, b64: '' };
  } catch (error) {
    console.error('Error generating image:', error);
    throw new Error('Failed to generate image');
  }
};