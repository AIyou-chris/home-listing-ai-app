const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/home-listing-ai/us-central1/api';

/**
 * Continues a conversation using the local AI server
 * @param messages Array of chat messages to continue the conversation from
 * @returns A promise that resolves to the AI's response text
 */
export const continueConversation = async (
  messages: Array<{ sender: string; text: string }>,
  meta?: { role?: string; personalityId?: string; systemPrompt?: string }
): Promise<string> => {
  try {
    console.log("Calling local AI server with", messages.length, "messages");

    const response = await fetch(`${API_BASE_URL}/continue-conversation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages, ...meta }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const text = data.text || data.response || '';
    console.log("Received AI response:", text ? text.substring(0, 50) + "..." : "empty");
    return text;
  } catch (error) {
    console.error("Error calling local AI server:", error);
    throw error;
  }
};

/**
 * Generates speech from text using the local AI server
 * @param text The text to convert to speech
 * @param voice The voice to use (default: "nova")
 * @returns A promise that resolves to an object containing the audio URL and duration
 */
export const generateSpeech = async (
  text: string,
  voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' = 'nova'
): Promise<{ audioUrl: string; duration: number; success: boolean }> => {
  try {
    console.log("Calling local speech generation with text length:", text.length);

    const response = await fetch(`${API_BASE_URL}/generate-speech`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, voice }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Received speech response:", data);

    return {
      audioUrl: data.audioUrl,
      duration: data.duration,
      success: data.success
    };
  } catch (error) {
    console.error("Error calling local speech generation:", error);
    throw error;
  }
};
