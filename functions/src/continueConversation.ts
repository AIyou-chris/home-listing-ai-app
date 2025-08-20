import * as functions from 'firebase-functions';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Continue conversation using Gemini
export const continueConversation = functions.https.onCall(async (data: any, context) => {
    try {
        console.log("continueConversation: Function started");
        
        // Validate data parameter
        if (!data) {
            console.error("continueConversation: No data provided");
            throw new functions.https.HttpsError("invalid-argument", "No data provided");
        }
        
        // Validate messages parameter
        if (!data.messages || !Array.isArray(data.messages) || data.messages.length === 0) {
            console.error("continueConversation: Invalid or missing messages array", data);
            throw new functions.https.HttpsError("invalid-argument", "Messages must be a non-empty array");
        }
        
        const { messages } = data;
        
        // Log first message for debugging (truncated to avoid huge logs)
        console.log("continueConversation: First message:", 
            messages[0] ? JSON.stringify(messages[0]).substring(0, 100) : "No first message");
        console.log("continueConversation: Messages count:", messages.length);
        
        // Check API key configuration
        console.log("continueConversation: API Key configured:", process.env.GEMINI_API_KEY ? "Yes" : "No");
        
        if (!process.env.GEMINI_API_KEY) {
            console.error("continueConversation: Gemini API key is not configured");
            throw new functions.https.HttpsError("failed-precondition", "AI service is not properly configured");
        }
        
        // Initialize Gemini directly with the API key from environment
        const directGenAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        
        console.log("continueConversation: Creating model");
        
        // Try different model names and formats
        // The model name might be different depending on the API version
        const modelNames = [
            "gemini-pro", 
            "models/gemini-pro",
            "models/gemini-1.0-pro",
            "models/gemini-1.5-pro"
        ];
        
        // Log the API version being used
        console.log("continueConversation: Using @google/generative-ai version:", 
            require('@google/generative-ai/package.json').version);
        
        // Log the API key format (first few characters)
        const apiKey = process.env.GEMINI_API_KEY || "";
        console.log("continueConversation: API key format check:", 
            apiKey.substring(0, 10) + "..." + apiKey.substring(apiKey.length - 5));
        
        // Validate each message has required properties
        for (const msg of messages) {
            if (!msg.sender || !msg.text || typeof msg.sender !== 'string' || typeof msg.text !== 'string') {
                console.error("continueConversation: Invalid message format", msg);
                throw new functions.https.HttpsError("invalid-argument", "Each message must have sender and text properties");
            }
        }
        
        // Create conversation history
        const conversationHistory = messages.map((msg: { sender: string; text: string }) => 
            `${msg.sender}: ${msg.text}`
        ).join('\n');
        
        console.log("continueConversation: Conversation history created, length:", conversationHistory.length);
        
        const prompt = `You are a helpful AI assistant for a real estate app. Continue this conversation naturally:

${conversationHistory}

Please provide a helpful response that continues the conversation:`;

        console.log("continueConversation: Prompt prepared, calling Gemini API");
        
        // Try each model name until one works
        let lastError = null;
        
        for (const currentModelName of modelNames) {
            try {
                console.log(`continueConversation: Trying model name: ${currentModelName}`);
                
                // Create a model with the current model name
                const currentModel = directGenAI.getGenerativeModel({ 
                    model: currentModelName,
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 1024,
                    }
                });
                
                console.log("continueConversation: Generating content");
                const result = await currentModel.generateContent(prompt);
                console.log("continueConversation: Content generated");
                
                const response = await result.response;
                console.log("continueConversation: Response received");
                
                const text = response.text();
                console.log("continueConversation: Text extracted, length:", text ? text.length : 0);
                
                if (!text) {
                    console.error("continueConversation: Empty response from Gemini API");
                    throw new Error("Empty response from Gemini API");
                }
                
                console.log("continueConversation: Returning successful response");
                return { text };
            } catch (aiError) {
                console.error(`continueConversation: Error with model ${currentModelName}:`, aiError);
                lastError = aiError;
                // Continue to the next model name
            }
        }
        
        // If we get here, all model names failed
        console.error("continueConversation: All model names failed");
        throw new functions.https.HttpsError(
            "internal", 
            "AI service failed to generate a response with any model name: " + 
            (lastError instanceof Error ? lastError.message : String(lastError))
        );
    } catch (error) {
        console.error("continueConversation: Conversation error:", error);
        throw new functions.https.HttpsError("internal", "Failed to continue conversation: " + (error instanceof Error ? error.message : String(error)));
    }
});