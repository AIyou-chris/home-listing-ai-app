import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import { ChatMessage } from '../types';

// Create callable function references
const continueConversationFunction = httpsCallable(functions, 'continueConversation');
const generateSpeechFunction = httpsCallable(functions, 'generateSpeech');

/**
 * Continues a conversation using OpenAI's GPT models
 * @param messages Array of chat messages to continue the conversation from
 * @returns A promise that resolves to the AI's response text
 */
export const continueConversation = async (messages: Array<{ sender: string; text: string }>): Promise<string> => {
  try {
    // Validate input
    if (!messages || messages.length === 0) {
      throw new Error("No messages provided for conversation");
    }
    
    // Add a timeout to the Firebase function call
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Request timed out")), 60000); // 60 seconds timeout
    });
    
    console.log("Calling OpenAI continueConversation function with", messages.length, "messages");
    console.log("Messages structure:", messages.map(m => ({ sender: m.sender, textLength: m.text?.length || 0 })));
    
    // Prepare the messages for the API - ensure they are properly formatted
    const validatedMessages = messages
      .filter(msg => msg && msg.sender && msg.text && msg.text.trim() !== '')
      .map(msg => ({
        sender: msg.sender,
        text: msg.text.trim()
      }));
    
    console.log("Validated messages count:", validatedMessages.length);
    
    if (validatedMessages.length === 0) {
      throw new Error("No valid messages after validation");
    }
    
    // Race between the actual function call and the timeout
    const result = await Promise.race([
      continueConversationFunction({ messages: validatedMessages }),
      timeoutPromise
    ]);
    
    console.log("Received response from OpenAI continueConversation function");
    
    // Check if we have a valid response
    if (result && result.data && typeof (result.data as { text: string }).text === 'string') {
      const responseText = (result.data as { text: string }).text;
      console.log("Valid OpenAI response received, length:", responseText.length);
      return responseText;
    } else {
      console.error("Invalid response format from OpenAI:", result);
      throw new Error("Invalid response format from AI service");
    }
  } catch (error) {
    console.error("Error continuing conversation with OpenAI:", error);
    
    // Check for specific error types and provide appropriate messages
    if (error instanceof Error) {
      const errorMsg = error.message;
      
      if (errorMsg.includes("timed out")) {
        throw new Error("The request took too long to process. Please try again with a shorter message.");
      } else if (errorMsg.includes("network") || errorMsg.includes("connection")) {
        throw new Error("Network connection issue. Please check your internet connection.");
      } else if (errorMsg.includes("not properly configured") || errorMsg.includes("AI service")) {
        throw new Error("The AI service is currently unavailable. Please try again later or contact support.");
      } else if (errorMsg.includes("permission") || errorMsg.includes("unauthorized")) {
        throw new Error("You don't have permission to use this feature. Please contact support.");
      } else if (errorMsg.includes("quota") || errorMsg.includes("limit")) {
        throw new Error("Usage limit reached. Please try again later.");
      } else if (errorMsg.includes("API key") || errorMsg.includes("invalid")) {
        throw new Error("There's an issue with the AI service configuration. Please contact support.");
      } else if (errorMsg.includes("model") || errorMsg.includes("not found")) {
        throw new Error("The AI model is currently unavailable. Please try again later or contact support.");
      } else if (errorMsg.includes("Messages must be a non-empty array")) {
        throw new Error("Message format error. Please try again.");
      }
    }
    
    // Provide a generic error message if we can't determine the specific issue
    throw new Error("Unable to get a response from the AI assistant. Please try again later.");
  }
};

/**
 * Generates speech from text using OpenAI's text-to-speech API
 * @param text The text to convert to speech
 * @param voice The voice to use (default: "alloy")
 * @returns A promise that resolves to an object containing the audio URL and duration
 */
export const generateSpeech = async (
  text: string, 
  voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' = 'nova'
): Promise<{ audioUrl: string; duration: number; fallback?: boolean }> => {
  try {
    // Validate input
    if (!text || text.trim() === '') {
      throw new Error("Text cannot be empty");
    }
    
    console.log("Calling OpenAI generateSpeech function with text length:", text.length);
    
    // Add a timeout to the Firebase function call
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Request timed out")), 60000); // 60 seconds timeout
    });
    
    // Race between the actual function call and the timeout
    const result = await Promise.race([
      generateSpeechFunction({ text, voice }),
      timeoutPromise
    ]);
    
    console.log("Received response from OpenAI generateSpeech function");
    
    // Check if we have a valid response
    if (result && result.data && typeof (result.data as any).audioUrl === 'string') {
      const response = result.data as { 
        success: boolean; 
        audioUrl: string; 
        duration: number;
        fallback?: boolean;
      };
      
      console.log("Valid OpenAI speech response received:", response);
      
      if (response.fallback) {
        console.log("Note: Using fallback TTS model instead of HD model");
      }
      
      return {
        audioUrl: response.audioUrl,
        duration: response.duration,
        fallback: response.fallback
      };
    } else {
      console.error("Invalid response format from OpenAI TTS:", result);
      throw new Error("Invalid response format from speech service");
    }
  } catch (error) {
    console.error("Error generating speech with OpenAI:", error);
    
    // Check for specific error types and provide appropriate messages
    if (error instanceof Error) {
      const errorMsg = error.message;
      
      if (errorMsg.includes("timed out")) {
        throw new Error("The speech generation request took too long. Please try with shorter text.");
      } else if (errorMsg.includes("network") || errorMsg.includes("connection")) {
        throw new Error("Network connection issue. Please check your internet connection.");
      } else if (errorMsg.includes("not properly configured") || errorMsg.includes("AI service")) {
        throw new Error("The speech service is currently unavailable. Please try again later.");
      } else if (errorMsg.includes("permission") || errorMsg.includes("unauthorized")) {
        throw new Error("You don't have permission to use this feature. Please contact support.");
      } else if (errorMsg.includes("quota") || errorMsg.includes("limit")) {
        throw new Error("Speech generation usage limit reached. Please try again later.");
      } else if (errorMsg.includes("API key") || errorMsg.includes("invalid")) {
        throw new Error("There's an issue with the speech service configuration. Please contact support.");
      }
    }
    
    // Provide a generic error message if we can't determine the specific issue
    throw new Error("Unable to generate speech. Please try again later.");
  }
};