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

interface ContinueConversationOptions {
  language?: string;
  metadata?: Record<string, unknown>;
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
        systemPrompt: combinedSystemPrompt,
        metadata: options?.metadata
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

    const apiBase = getApiBaseUrl() || import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL
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

// --- Added Methods to Replace GeminiService ---

import { Property, SocialPlatform, AIBlogPost } from '../types';

export const generateVideoScript = async (property: Property): Promise<string> => {
  const prompt = `Write a compelling 30-60 second video script for a real estate listing video.
  
  Property Details:
  Address: ${property.address}
  Bedrooms: ${property.bedrooms}
  Bathrooms: ${property.bathrooms}
  Square Feet: ${property.squareFeet}
  Features: ${property.features.join(', ')}
  
  Tone: Professional, inviting, and energetic.
  Format: separate Visual and Audio cues.`;

  return await continueConversation([{ sender: 'user', text: prompt }]);
};

export const generatePropertyDescription = async (property: Property): Promise<string> => {
  const prompt = `Write a captivating real estate listing description for the following property.
  
  Address: ${property.address}
  Specs: ${property.bedrooms} beds, ${property.bathrooms} baths, ${property.squareFeet} sqft
  Price: $${property.price.toLocaleString()}
  Key Features: ${property.features.join(', ')}
  
  The description should be engaging, highlighting the best features, and clear.`;

  return await continueConversation([{ sender: 'user', text: prompt }]);
};

export const generateSocialPostText = async (property: Property, platforms: SocialPlatform[]): Promise<string> => {
  const platformNames = platforms.join(', ');
  const prompt = `Write a social media post for ${platformNames} for this property:
  ${property.address}
  ${property.bedrooms} Bed / ${property.bathrooms} Bath
  ${property.features.slice(0, 3).join(', ')}
  
  Include relevant hashtags and emojis. Keep it punchy.`;

  return await continueConversation([{ sender: 'user', text: prompt }]);
};

export const answerPropertyQuestion = async (property: Property, question: string, history: { sender: string; text: string }[] = []): Promise<string> => {
  const systemContext = `You are a helpful real estate assistant answering questions about a specific property at ${property.address}.
  Property Details:
  Price: $${property.price}
  Size: ${property.squareFeet} sqft
  Beds/Baths: ${property.bedrooms}/${property.bathrooms}
  Features: ${property.features.join(', ')}
  
  Answer the user's question accurately based on this data. If you don't know, say so.`;

  const messages = [
    { sender: 'system', text: systemContext },
    ...history,
    { sender: 'user', text: question }
  ];

  return await continueConversation(messages);
};

export const generateBlogPost = async (options: {
  topic: string;
  keywords: string;
  tone: string;
  style: string;
  audience: string;
  cta: string;
}): Promise<AIBlogPost> => {
  const prompt = `Write a blog post about "${options.topic}".
  Keywords: ${options.keywords}
  Tone: ${options.tone}
  Target Audience: ${options.audience}
  Call to Action: ${options.cta}
  
  Return the response as a JSON object with "title" and "body" fields.`;

  const response = await continueConversation([{ sender: 'user', text: prompt }]);

  try {
    // Attempt to parse JSON if the model returns it
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        title: parsed.title || `Blog Post: ${options.topic}`,
        body: parsed.body || response,
        topic: options.topic
      } as AIBlogPost;
    }
  } catch (e) {
    console.warn('Failed to parse blog post JSON, returning raw text');
  }

  return {
    title: `Blog: ${options.topic}`,
    body: response,
    topic: options.topic
  } as AIBlogPost;
};

export const continueAgentConversation = async (
  messages: Array<{ sender: string; text: string }>,
  agentProfile: Record<string, unknown>
): Promise<string> => {
  try {
    const response = await fetch(buildApiUrl('/api/ai/agent-chat'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        agentProfile
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.response || data.text || 'No response received';
  } catch (error) {
    console.error('Error continuing agent conversation:', error);
    return "I'm having trouble connecting right now. Please try again later.";
  }
};