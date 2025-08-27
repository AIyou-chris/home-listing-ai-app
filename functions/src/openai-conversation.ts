import * as functions from 'firebase-functions';
import OpenAI from 'openai';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();
const propertiesCollection = db.collection('properties');

// Continue conversation using OpenAI
export const continueConversation = functions.https.onCall(async (data: any, context) => {
    try {
        console.log("continueConversation: Function started with OpenAI");
        // Normalize payload shape to tolerate SDK differences
        const payload = (data && typeof data === 'object')
            ? (('messages' in data) ? data
               : (data && (data as any).data && 'messages' in (data as any).data
                  ? (data as any).data
                  : {}))
            : {};
        // Safe logging
        try {
            console.log(
                "continueConversation: Payload keys:",
                Object.keys(payload as Record<string, unknown>)
            );
            const sample = Array.isArray((payload as any).messages)
                ? (payload as any).messages.slice(0,1)
                : [];
            console.log(
                "continueConversation: messages present:",
                Array.isArray((payload as any).messages),
                "len:", Array.isArray((payload as any).messages) ? (payload as any).messages.length : 0,
                "first:", JSON.stringify(sample)
            );
        } catch {}
        
        // Validate data parameter
        if (!payload) {
            console.error("continueConversation: No data provided");
            throw new functions.https.HttpsError("invalid-argument", "No data provided");
        }
        
        // Validate messages parameter
        if (!(payload as any).messages || !Array.isArray((payload as any).messages) || (payload as any).messages.length === 0) {
            console.error("continueConversation: Invalid or missing messages array");
            console.error("continueConversation: data.messages type:", typeof data.messages);
            console.error("continueConversation: data.messages value:", data.messages);
            throw new functions.https.HttpsError("invalid-argument", "Messages must be a non-empty array");
        }
        
        const { messages } = payload as { messages: Array<{ sender: string; text: string }> };
        
        // Log first message for debugging (truncated to avoid huge logs)
        console.log("continueConversation: First message:", 
            messages[0] ? JSON.stringify(messages[0]).substring(0, 100) : "No first message");
        console.log("continueConversation: Messages count:", messages.length);
        console.log("continueConversation: All messages structure:", messages.map((msg: any, index: number) => ({
            index,
            sender: msg.sender,
            textLength: msg.text ? msg.text.length : 0,
            textPreview: msg.text ? msg.text.substring(0, 50) : 'undefined'
        })));
        
        // Check API key configuration (allow emulator fallback)
        const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';
        if (!process.env.OPENAI_API_KEY) {
            if (isEmulator) {
                console.warn("continueConversation: No OPENAI_API_KEY in emulator — returning dev echo response");
                const lastUser = [...messages].reverse().find(m => m.sender === 'user');
                const echo = lastUser?.text || 'Hello! How can I help?';
                return { text: `Dev (echo): ${echo}` };
            }
            console.error("continueConversation: OpenAI API key is not configured");
            throw new functions.https.HttpsError("failed-precondition", "AI service is not properly configured");
        }
        
        // Initialize OpenAI client
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            organization: process.env.OPENAI_ORG || process.env.OPENAI_ORGANIZATION,
            project: process.env.OPENAI_PROJECT,
            baseURL: process.env.OPENAI_BASE_URL || undefined
        });
        
        console.log("continueConversation: OpenAI client initialized");
        
        // Validate each message has required properties
        for (const msg of messages) {
            if (!msg.sender || !msg.text || typeof msg.sender !== 'string' || typeof msg.text !== 'string') {
                console.error("continueConversation: Invalid message format", msg);
                throw new functions.https.HttpsError("invalid-argument", "Each message must have sender and text properties");
            }
        }
        
        // Resolve system prompt with fallback chain: persona > agent marketing > org marketing > sales > god > default
        let systemPrompt = 'You are an expert real estate AI assistant. Be concise, helpful, and action-oriented.';
        try {
            await db.collection('settings').doc('kbDefaults').get();
            const aiDoc = await db.collection('settings').doc('ai').get();
            const globalPrompt = aiDoc.exists ? (aiDoc.data() as any).systemPrompt : '';
            if (globalPrompt) systemPrompt = globalPrompt;
            // TODO: if personaId/agentId is provided in payload, load persona/agent prompts first
        } catch {}

        // Convert messages to OpenAI format
        const openaiMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
            { role: 'system', content: systemPrompt },
            // User conversation history
            ...messages.map((msg: { sender: string; text: string }) => {
                const role: 'user' | 'assistant' = msg.sender === 'user' ? 'user' : 'assistant';
                return { role, content: msg.text };
            })
        ];
        
        console.log("continueConversation: Messages formatted for OpenAI, count:", openaiMessages.length);
        
        try {
            console.log("continueConversation: Calling OpenAI API (gpt-5-mini)");
            const completion = await openai.chat.completions.create({
                model: "gpt-5-mini",
                messages: openaiMessages,
                max_completion_tokens: 1024,
                temperature: 0.7
            });
            const responseText = completion.choices[0]?.message?.content;
            if (!responseText) throw new Error("Empty response from gpt-5-mini");
            return { text: responseText };
        } catch (aiError) {
            console.error(
                "continueConversation: OpenAI API error:",
                aiError instanceof Error ? aiError.message : String(aiError)
            );
            
            // Fallbacks: gpt-5 → gpt-4-turbo → o1-mini → echo
            try {
                console.log("continueConversation: Trying fallback to gpt-5");
                const m5 = await openai.chat.completions.create({
                    model: "gpt-5",
                    messages: openaiMessages,
                    temperature: 0.7,
                    max_completion_tokens: 1024
                });
                const t5 = m5.choices[0]?.message?.content;
                if (t5) return { text: t5 };
                throw new Error("Empty response from gpt-5");
            } catch (e5) {
                try {
                    console.log("continueConversation: Trying fallback to gpt-4-turbo");
                    const m4t = await openai.chat.completions.create({
                        model: "gpt-4-turbo",
                        messages: openaiMessages,
                        temperature: 0.7,
                        max_tokens: 1024
                    });
                    const t4t = m4t.choices[0]?.message?.content;
                    if (t4t) return { text: t4t };
                    throw new Error("Empty response from gpt-4-turbo");
                } catch (e4t) {
                    try {
                        console.log("continueConversation: Trying fallback to o1-mini");
                        const m1m = await openai.chat.completions.create({
                            model: "o1-mini",
                            messages: openaiMessages,
                            temperature: 0.7,
                            max_tokens: 1024
                        });
                        const t1m = m1m.choices[0]?.message?.content;
                        if (t1m) return { text: t1m };
                        throw new Error("Empty response from o1-mini");
                    } catch (e1m) {
                        const lastUser = [...messages].reverse().find(m => m.sender === 'user');
                        const echo = lastUser?.text || 'Hello! How can I help?';
                        console.warn("continueConversation: All models unavailable, returning echo");
                        return { text: `Echo: ${echo}` };
                    }
                }
            }
        }
    } catch (error) {
        console.error(
            "continueConversation: Conversation error:",
            error instanceof Error ? error.message : String(error)
        );
        throw new functions.https.HttpsError(
            "internal", 
            "Failed to continue conversation: " + 
            (error instanceof Error ? error.message : String(error))
        );
    }
});

// Get AI response for voice chat using OpenAI GPT-5.0 with GPT-4.0 mini fallback
export const voiceChatResponse = functions.https.onCall(async (data: any, context) => {
    try {
        const { message, propertyId, chatHistory } = data;

        let propertyContext = '';
        if (propertyId) {
            const propertyDoc = await propertiesCollection.doc(propertyId).get();
            if (propertyDoc.exists) {
                const propertyData = propertyDoc.data();
                propertyContext = `The property is located at ${propertyData?.address}, has ${propertyData?.bedrooms} bedrooms, ${propertyData?.bathrooms} bathrooms, and is ${propertyData?.squareFeet} square feet. Its description is: ${propertyData?.description?.paragraphs?.join(' ') || propertyData?.description}. Key features include: ${propertyData?.features?.join(', ')}.`;
            }
        }

        // Check OpenAI API key
        if (!process.env.OPENAI_API_KEY) {
            console.error("voiceChatResponse: OpenAI API key is not configured");
            throw new functions.https.HttpsError("failed-precondition", "AI service is not properly configured");
        }

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });

        const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
            {
                role: "system",
                content: "You are a helpful AI assistant for a real estate app. Your goal is to answer questions about properties. Keep responses conversational and under 100 words. If the question is about a specific property, use the provided property context. If you don't know the answer, politely state that you don't have that information."
            },
            {
                role: "user",
                content: `Property Context: ${propertyContext}\n\nChat History: ${(chatHistory || []).map((msg: { sender: string; text: string }) => `${msg.sender}: ${msg.text}`).join('\n')}\n\nUser Question: ${message}`
            }
        ];

        console.log("voiceChatResponse: Calling OpenAI GPT-4");

        try {
            // Try GPT-4 first
            const completion = await openai.chat.completions.create({
                model: "gpt-4",
                messages: messages,
                max_tokens: 1024,
                temperature: 0.7
            });

            const responseText = completion.choices[0]?.message?.content;
            if (responseText) {
                console.log("voiceChatResponse: GPT-4 response successful");
                return { text: responseText };
            }
        } catch (gpt4Error) {
            console.log("voiceChatResponse: GPT-4 failed, trying GPT-4o-mini fallback");
            
            try {
                // Fallback to GPT-4.0 mini
                const fallbackCompletion = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: messages,
                    max_tokens: 1024,
                    temperature: 0.7
                });

                const fallbackResponseText = fallbackCompletion.choices[0]?.message?.content;
                if (fallbackResponseText) {
                    console.log("voiceChatResponse: GPT-4o-mini fallback successful");
                    return { text: fallbackResponseText };
                }
            } catch (fallbackError) {
                console.error("voiceChatResponse: Both GPT-4 and GPT-4o-mini failed");
                throw new functions.https.HttpsError("internal", "Failed to get AI response from both models");
            }
        }

        throw new functions.https.HttpsError("internal", "Failed to get AI response");
    } catch (error) {
        console.error("Chat error:", error);
        throw new functions.https.HttpsError("internal", "Failed to get AI response");
    }
});