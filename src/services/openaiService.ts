import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import { ChatMessage } from '../types';

// Create callable function references
const continueConversationFunction = httpsCallable(functions, 'continueConversation');
const generateSpeechFunction = httpsCallable(functions, 'generateSpeech');
const generateImageFunction = httpsCallable(functions, 'generateImage');

/**
 * Continues a conversation using OpenAI's GPT models
 * @param messages Array of chat messages to continue the conversation from
 * @returns A promise that resolves to the AI's response text
 */
export const continueConversation = async (messages: Array<{ sender: string; text: string }>): Promise<string> => {
  try {
    const result = await continueConversationFunction({ messages });
    const data = result.data as any;
    
    if (!data?.text) {
      throw new Error('No response text received from AI');
    }
    
    return data.text;
  } catch (error) {
    console.error('Error continuing conversation:', error);
    throw new Error('Failed to get AI response: ' + (error instanceof Error ? error.message : String(error)));
  }
};

/**
 * Generates speech from text using OpenAI's text-to-speech API
 * @param text The text to convert to speech
 * @param voice The voice to use (default: "alloy")
 * @returns A promise that resolves to an object containing the audio URL and duration
 */
export const generateSpeech = async (
  _text: string, 
  _voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' = 'nova'
): Promise<{ audioUrl: string; duration: number; fallback?: boolean }> => {
  // Speech disabled
  return {
    audioUrl: '',
    duration: 0,
    fallback: true
  };
};

export const generateImage = async (
  prompt: string,
  size: '1024x1024' | '512x512' | '256x256' = '1024x1024'
): Promise<{ url?: string; b64?: string }> => {
  if (!prompt.trim()) throw new Error('Prompt is required');
  try {
    const result = await generateImageFunction({ prompt, size });
    const data = result.data as any;
    if (!data?.url && !data?.b64) throw new Error('No image returned');
    return { url: data.url, b64: data.b64 };
  } catch (error) {
    console.error('Error generating image:', error);
    throw new Error('Failed to generate image');
  }
};