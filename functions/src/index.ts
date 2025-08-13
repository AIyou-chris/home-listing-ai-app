import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { GoogleGenerativeAI } from "@google/genai";

// Initialize Firebase Admin SDK
admin.initializeApp();

// Initialize Google AI (Gemini)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Firestore references
const db = admin.firestore();
const propertiesCollection = db.collection('properties');

// Voice transcription using Google Speech-to-Text (via Gemini)
export const transcribeVoice = functions.https.onCall(async (data, context) => {
    try {
        const { audioData } = data;
        
        // For now, we'll use a placeholder since Google Speech-to-Text requires additional setup
        // In production, you'd use Google Cloud Speech-to-Text API
        console.log("Audio transcription requested");
        
        // Placeholder response - in production, implement Google Speech-to-Text
        return { text: "Voice transcription will be implemented with Google Speech-to-Text" };
    } catch (error) {
        console.error("Transcription error:", error);
        throw new functions.https.HttpsError("internal", "Failed to transcribe audio");
    }
});

// Get AI response for voice chat using Gemini
export const voiceChatResponse = functions.https.onCall(async (data, context) => {
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

        // Use Gemini for chat response
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        
        const prompt = `You are a helpful AI assistant for a real estate app. Your goal is to answer questions about properties. Keep responses conversational and under 100 words. If the question is about a specific property, use the provided property context. If you don't know the answer, politely state that you don't have that information.

Property Context: ${propertyContext}

Chat History: ${(chatHistory || []).map((msg: { sender: string; text: string }) => `${msg.sender}: ${msg.text}`).join('\n')}

User Question: ${message}

Please provide a helpful response:`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return { text };
    } catch (error) {
        console.error("Chat error:", error);
        throw new functions.https.HttpsError("internal", "Failed to get AI response");
    }
});

// Convert text to speech using Google Text-to-Speech
export const generateSpeech = functions.https.onCall(async (data, context) => {
    try {
        const { text, voice = 'en-US-Neural2-A' } = data;
        
        // For now, we'll use a placeholder since Google Text-to-Speech requires additional setup
        // In production, you'd use Google Cloud Text-to-Speech API
        console.log("Speech generation requested for text:", text);
        
        // Placeholder response - in production, implement Google Text-to-Speech
        return { audioUrl: "Speech generation will be implemented with Google Text-to-Speech" };
    } catch (error) {
        console.error("Speech generation error:", error);
        throw new functions.https.HttpsError("internal", "Failed to generate speech");
    }
});

// Generate property description using Gemini
export const generatePropertyDescription = functions.https.onCall(async (data, context) => {
    try {
        const { property } = data;
        
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        
        const prompt = `Create a compelling property description for a real estate listing. The property details are:

Title: ${property.title}
Address: ${property.address}
Price: $${property.price?.toLocaleString()}
Bedrooms: ${property.bedrooms}
Bathrooms: ${property.bathrooms}
Square Feet: ${property.squareFeet?.toLocaleString()}
Property Type: ${property.propertyType}
Features: ${property.features?.join(', ')}

Please create a structured description with:
1. A catchy title
2. 3-4 engaging paragraphs highlighting the property's best features
3. Focus on what makes this property special
4. Use persuasive but honest language
5. Include details about the neighborhood if relevant

Format the response as JSON with "title" and "paragraphs" fields.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        // Try to parse as JSON, fallback to plain text
        try {
            return JSON.parse(text);
        } catch {
            return {
                title: "Property Description",
                paragraphs: [text]
            };
        }
    } catch (error) {
        console.error("Property description generation error:", error);
        throw new functions.https.HttpsError("internal", "Failed to generate property description");
    }
});

// Answer property questions using Gemini
export const answerPropertyQuestion = functions.https.onCall(async (data, context) => {
    try {
        const { property, question } = data;
        
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        
        const prompt = `You are a helpful real estate assistant. Answer the following question about this property:

Property Details:
- Title: ${property.title}
- Address: ${property.address}
- Price: $${property.price?.toLocaleString()}
- Bedrooms: ${property.bedrooms}
- Bathrooms: ${property.bathrooms}
- Square Feet: ${property.squareFeet?.toLocaleString()}
- Property Type: ${property.propertyType}
- Features: ${property.features?.join(', ')}
- Description: ${property.description?.paragraphs?.join(' ') || property.description}

Question: ${question}

Please provide a helpful, accurate answer based on the property information. Keep it conversational and under 100 words.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return { text };
    } catch (error) {
        console.error("Property question error:", error);
        throw new functions.https.HttpsError("internal", "Failed to answer property question");
    }
});

// Continue conversation using Gemini
export const continueConversation = functions.https.onCall(async (data, context) => {
    try {
        const { messages } = data;
        
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        
        const conversationHistory = messages.map((msg: { sender: string; text: string }) => 
            `${msg.sender}: ${msg.text}`
        ).join('\n');
        
        const prompt = `You are a helpful AI assistant for a real estate app. Continue this conversation naturally:

${conversationHistory}

Please provide a helpful response that continues the conversation:`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return { text };
    } catch (error) {
        console.error("Conversation error:", error);
        throw new functions.https.HttpsError("internal", "Failed to continue conversation");
    }
});

// Generate market analysis using Gemini
export const getMarketAnalysis = functions.https.onCall(async (data, context) => {
    try {
        const { address } = data;
        
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        
        const prompt = `Provide a brief market analysis for the area around ${address}. Include:
1. General market trends
2. Average property values
3. Key selling points of the neighborhood
4. Any notable amenities or attractions

Keep it concise and informative for potential buyers.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return { 
            analysisText: text,
            sources: [
                { uri: "https://www.google.com/maps", title: "Google Maps" },
                { uri: "https://www.zillow.com", title: "Zillow Market Data" }
            ]
        };
    } catch (error) {
        console.error("Market analysis error:", error);
        throw new functions.https.HttpsError("internal", "Failed to generate market analysis");
    }
});

// Generate blog post using Gemini
export const generateBlogPost = functions.https.onCall(async (data, context) => {
    try {
        const { topic, tone, length } = data;
        
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        
        const prompt = `Write a ${tone} blog post about ${topic} for a real estate website. The post should be approximately ${length} words long. Make it engaging, informative, and valuable for potential homebuyers or sellers.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return { 
            title: `Real Estate Insights: ${topic}`,
            body: text
        };
    } catch (error) {
        console.error("Blog post generation error:", error);
        throw new functions.https.HttpsError("internal", "Failed to generate blog post");
    }
});

// Generate social media post using Gemini
export const generateSocialPostText = functions.https.onCall(async (data, context) => {
    try {
        const { property, platform, tone } = data;
        
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        
        const prompt = `Create a ${tone} social media post for ${platform} about this property:

Property: ${property.title}
Address: ${property.address}
Price: $${property.price?.toLocaleString()}
Key Features: ${property.features?.slice(0, 3).join(', ')}

Make it engaging, include relevant hashtags, and encourage engagement. Keep it appropriate for ${platform}.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return { text };
    } catch (error) {
        console.error("Social post generation error:", error);
        throw new functions.https.HttpsError("internal", "Failed to generate social post");
    }
});

// Get local information using Gemini
export const getLocalInfo = functions.https.onCall(async (data, context) => {
    try {
        const { address, category } = data;
        
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        
        const prompt = `Provide information about ${category} near ${address}. Include:
1. A brief summary of the area
2. Key highlights about ${category}
3. Notable features or attractions
4. Any relevant local insights

Focus on information that would be valuable for potential homebuyers.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return {
            summary: text,
            category: category,
            highlights: text.split('. ').slice(0, 3),
            sources: [
                { uri: `https://www.google.com/maps/search/${encodeURIComponent(category + ' ' + address)}`, title: "Google Maps" }
            ],
            lastUpdated: new Date().toISOString()
        };
    } catch (error) {
        console.error("Local info error:", error);
        throw new functions.https.HttpsError("internal", "Failed to get local information");
    }
});
