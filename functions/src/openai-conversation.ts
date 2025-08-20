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
        console.log("continueConversation: Raw data received:", JSON.stringify(data, null, 2));
        
        // Validate data parameter
        if (!data) {
            console.error("continueConversation: No data provided");
            throw new functions.https.HttpsError("invalid-argument", "No data provided");
        }
        
        // Validate messages parameter
        if (!data.messages || !Array.isArray(data.messages) || data.messages.length === 0) {
            console.error("continueConversation: Invalid or missing messages array", data);
            console.error("continueConversation: data.messages type:", typeof data.messages);
            console.error("continueConversation: data.messages value:", data.messages);
            throw new functions.https.HttpsError("invalid-argument", "Messages must be a non-empty array");
        }
        
        const { messages } = data;
        
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
        
        // Check API key configuration
        if (!process.env.OPENAI_API_KEY) {
            console.error("continueConversation: OpenAI API key is not configured");
            throw new functions.https.HttpsError("failed-precondition", "AI service is not properly configured");
        }
        
        // Initialize OpenAI client
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        
        console.log("continueConversation: OpenAI client initialized");
        
        // Validate each message has required properties
        for (const msg of messages) {
            if (!msg.sender || !msg.text || typeof msg.sender !== 'string' || typeof msg.text !== 'string') {
                console.error("continueConversation: Invalid message format", msg);
                throw new functions.https.HttpsError("invalid-argument", "Each message must have sender and text properties");
            }
        }
        
        // Convert messages to OpenAI format
        const openaiMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
            // System message to set the context
            {
                role: "system",
                content: "You are a helpful AI assistant for a real estate app. Provide concise, accurate, and helpful responses about properties, real estate, and related topics."
            },
            // User conversation history
            ...messages.map((msg: { sender: string; text: string }) => ({
                role: msg.sender === 'user' ? 'user' : 'assistant' as const,
                content: msg.text
            }))
        ];
        
        console.log("continueConversation: Messages formatted for OpenAI, count:", openaiMessages.length);
        
        try {
            console.log("continueConversation: Calling OpenAI API");
            
            // Call OpenAI API with GPT-5
            const params: any = {
                model: "gpt-5", // Using GPT-5, can fallback to "gpt-4" or "gpt-3.5-turbo" if needed
                messages: openaiMessages,
                max_completion_tokens: 1024, // Use max_completion_tokens for GPT-5
                // GPT-5 only supports default temperature (1)
            };
            
            const completion = await openai.chat.completions.create(params);
            
            console.log("continueConversation: OpenAI response received");
            
            // Extract the response text
            const responseText = completion.choices[0]?.message?.content;
            
            if (!responseText) {
                console.error("continueConversation: Empty response from OpenAI API");
                throw new Error("Empty response from OpenAI API");
            }
            
            console.log("continueConversation: Response text length:", responseText.length);
            console.log("continueConversation: Returning successful response");
            
            return { text: responseText };
        } catch (aiError) {
            console.error("continueConversation: OpenAI API error:", aiError);
            
            // Try with GPT-4 as fallback if GPT-5 fails
            try {
                console.log("continueConversation: Trying fallback to GPT-4");
                
                const fallbackCompletion = await openai.chat.completions.create({
                    model: "gpt-4",
                    messages: openaiMessages,
                    temperature: 0.7,
                    max_tokens: 1024,
                });
                
                const fallbackResponseText = fallbackCompletion.choices[0]?.message?.content;
                
                if (!fallbackResponseText) {
                    throw new Error("Empty response from fallback OpenAI API");
                }
                
                console.log("continueConversation: Fallback to GPT-4 successful, response length:", fallbackResponseText.length);
                
                return { text: fallbackResponseText };
            } catch (fallbackError) {
                // Try with GPT-3.5 as a second fallback
                try {
                    console.log("continueConversation: Trying second fallback to GPT-3.5-turbo");
                    
                    const secondFallbackCompletion = await openai.chat.completions.create({
                        model: "gpt-3.5-turbo",
                        messages: openaiMessages,
                        temperature: 0.7,
                        max_tokens: 1024,
                    });
                    
                    const secondFallbackResponseText = secondFallbackCompletion.choices[0]?.message?.content;
                    
                    if (!secondFallbackResponseText) {
                        throw new Error("Empty response from second fallback OpenAI API");
                    }
                    
                    console.log("continueConversation: Second fallback successful, response length:", secondFallbackResponseText.length);
                    
                    return { text: secondFallbackResponseText };
                } catch (secondFallbackError) {
                    console.error("continueConversation: All fallbacks failed:", secondFallbackError);
                    throw new functions.https.HttpsError(
                        "internal", 
                        "AI service failed to generate a response with any model: " + 
                        (aiError instanceof Error ? aiError.message : String(aiError))
                    );
                }
            }
        }
    } catch (error) {
        console.error("continueConversation: Conversation error:", error);
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

        console.log("voiceChatResponse: Calling OpenAI GPT-5.0");

        try {
            // Try GPT-5.0 first
            const completion = await openai.chat.completions.create({
                model: "gpt-5",
                messages: messages,
                max_completion_tokens: 1024
            });

            const responseText = completion.choices[0]?.message?.content;
            if (responseText) {
                console.log("voiceChatResponse: GPT-5.0 response successful");
                return { text: responseText };
            }
        } catch (gpt5Error) {
            console.log("voiceChatResponse: GPT-5.0 failed, trying GPT-4.0 mini fallback");
            
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
                    console.log("voiceChatResponse: GPT-4.0 mini fallback successful");
                    return { text: fallbackResponseText };
                }
            } catch (fallbackError) {
                console.error("voiceChatResponse: Both GPT-5.0 and GPT-4.0 mini failed");
                throw new functions.https.HttpsError("internal", "Failed to get AI response from both models");
            }
        }

        throw new functions.https.HttpsError("internal", "Failed to get AI response");
    } catch (error) {
        console.error("Chat error:", error);
        throw new functions.https.HttpsError("internal", "Failed to get AI response");
    }
});