import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import OpenAI from 'openai';

// Initialize Firebase Admin SDK
admin.initializeApp();

// Initialize OpenAI
const openaiApiKey = functions.config().openai?.key;
let openai: OpenAI | undefined;

if (openaiApiKey) {
    openai = new OpenAI({ apiKey: openaiApiKey });
} else {
    console.error("OpenAI API key not found");
}

// Firestore references
const db = admin.firestore();
const propertiesCollection = db.collection('properties');

// Voice transcription using OpenAI Whisper
export const transcribeVoice = functions.https.onCall(async (data, context) => {
    if (!openai) {
        throw new functions.https.HttpsError("failed-precondition", "OpenAI is not initialized");
    }

    try {
        const { audioData } = data;
        
        // Convert base64 to buffer
        const buffer = Buffer.from(audioData.split(',')[1], 'base64');
        
        const transcription = await openai.audio.transcriptions.create({
            file: new File([buffer], 'audio.webm', { type: 'audio/webm' }),
            model: 'whisper-1',
        });

        return { text: transcription.text };
    } catch (error) {
        console.error("Transcription error:", error);
        throw new functions.https.HttpsError("internal", "Failed to transcribe audio");
    }
});

// TODO: Refactor this to use the Gemini service for consistency
// Get AI response for voice chat
export const voiceChatResponse = functions.https.onCall(async (data, context) => {
    if (!openai) {
        throw new functions.https.HttpsError("failed-precondition", "OpenAI is not initialized");
    }

    try {
        const { message } = data;
        const { propertyId, chatHistory } = data; // Assuming propertyId and chatHistory are passed

        let propertyContext = '';
        if (propertyId) {
            const propertyDoc = await propertiesCollection.doc(propertyId).get();
            if (propertyDoc.exists) {
                const propertyData = propertyDoc.data();
                // Construct a concise property context string
                propertyContext = `The property is located at ${propertyData?.address}, has ${propertyData?.beds} beds, ${propertyData?.baths} baths, and is ${propertyData?.sqft} sqft. Its description is: ${propertyData?.description?.paragraphs?.join(' ') || propertyData?.description}. Key features include: ${propertyData?.features?.join(', ')}.`;
            }
        }

        const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
            {
                role: 'system',
                content: `You are a helpful AI assistant for a real estate app. Your goal is to answer questions about properties. Keep responses conversational and under 100 words. If the question is about a specific property, use the provided property context. If you don't know the answer, politely state that you don't have that information.
                ${propertyContext}`
            },
            ...(chatHistory || []).map((msg: { sender: string; text: string }) => ({
                role: msg.sender === 'user' ? 'user' : 'assistant',
                content: msg.text
            })),
            { role: 'user', content: message }
        ];
        const completion = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: messages,
            max_tokens: 150,
        });

        return { text: completion.choices[0].message.content };
    } catch (error) {
        console.error("Chat error:", error);
        throw new functions.https.HttpsError("internal", "Failed to get AI response");
    }
});

// Convert text to speech using OpenAI
export const generateSpeech = functions.https.onCall(async (data, context) => {
    if (!openai) {
        throw new functions.https.HttpsError("failed-precondition", "OpenAI is not initialized");
    }

    try {
        const { text, voice = 'alloy' } = data;
        
        const mp3 = await openai.audio.speech.create({
            model: 'tts-1',
            voice: voice as any,
            input: text,
        });

        const buffer = Buffer.from(await mp3.arrayBuffer());
        const base64Audio = buffer.toString('base64');
        const audioUrl = `data:audio/mp3;base64,${base64Audio}`;

        return { audioUrl };
    } catch (error) {
        console.error("Speech generation error:", error);
        throw new functions.https.HttpsError("internal", "Failed to generate speech");
    }
});