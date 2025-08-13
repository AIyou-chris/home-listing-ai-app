import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";

admin.initializeApp();

const geminiApiKey = functions.config().gemini?.key;
let ai: GoogleGenAI | undefined;
if (geminiApiKey) {
    ai = new GoogleGenAI({apiKey: geminiApiKey});
} else {
    console.error("Gemini API key not found. Set it with: firebase functions:config:set gemini.key=\"YOUR_API_KEY\"");
}

// --- Types (copied from client for self-containment) ---
interface Property {
    id: string;
    title: string;
    address: string;
    price: number;
    beds: number;
    baths: number;
    sqft: number;
    description: string | AIDescription;
    heroPhotos: string[];
    appFeatures: { [key: string]: boolean };
    agent: any;
    propertyType: string;
    features: string[];
    imageUrl: string;
}

interface AIDescription {
    title: string;
    paragraphs: string[];
}

interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
}

type SocialPlatform = 'facebook' | 'instagram' | 'twitter' | 'linkedin';

interface AIBlogPost {
    title: string;
    body: string;
}

function isAIDescription(description: any): description is AIDescription {
  return description && typeof description === 'object' && typeof description.title === 'string' && Array.isArray(description.paragraphs);
}


// --- Helper for creating callable functions ---
const onCall = <T, R>(handler: (data: T, aiInstance: GoogleGenAI) => Promise<R>) => {
    return functions.https.onCall(async (data, context) => {
        // We will allow unauthenticated access for the demo app, but this is where you'd enforce it.
        // if (!context.auth) {
        //     throw new functions.https.HttpsError("unauthenticated", "The function must be called while authenticated.");
        // }
        if (!ai) {
            throw new functions.https.HttpsError("failed-precondition", "The Gemini API client is not initialized on the server.");
        }
        try {
            return await handler(data as T, ai);
        } catch (error) {
            console.error("Error executing function:", error);
            throw new functions.https.HttpsError("internal", "An error occurred while calling the Gemini API.", error);
        }
    });
};

const generateDescriptionPrompt = (property: Property): string => `
Generate a captivating description for the following property.
- Emphasize the unique features and the lifestyle it offers.
- Use evocative and aspirational language.
- Create a compelling title and break the description into multiple paragraphs.

Property Details:
- Type: ${property.propertyType}
- Address: ${property.address}
- Price: $${property.price.toLocaleString()}
- Specs: ${property.beds} Bedrooms, ${property.baths} Bathrooms, ${property.sqft} sq. ft.
- Key Features: ${property.features.join(', ')}
`;

export const generatePropertyDescription = onCall<{ property: Property }, AIDescription>(async ({ property }, aiInstance) => {
    const response = await aiInstance.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: generateDescriptionPrompt(property),
        config: {
            systemInstruction: "You are a world-class real estate copywriter known for crafting compelling, luxurious, and SEO-optimized property descriptions. Return the response as a JSON object with a 'title' and 'paragraphs' array.",
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    paragraphs: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
            },
        },
    });
    return JSON.parse(response.text);
});

const answerQuestionPrompt = (property: Property, question: string): string => {
  const descriptionText = isAIDescription(property.description)
    ? `${property.description.title} ${property.description.paragraphs.join(' ')}`
    : property.description;

  return `
Based ONLY on the provided property data below, answer the user's question.

Property Data:
- Type: ${property.propertyType}
- Address: ${property.address}
- Price: $${property.price.toLocaleString()}
- Specs: ${property.beds} Bedrooms, ${property.baths} Bathrooms, ${property.sqft} sq. ft.
- Key Features: ${property.features.join(', ')}
- Full Description: ${descriptionText}

User's Question: "${question}"
`;
};

export const answerPropertyQuestion = onCall<{ property: Property; question: string }, { text: string }>(async ({ property, question }, aiInstance) => {
    const response = await aiInstance.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: answerQuestionPrompt(property, question),
        config: {
            systemInstruction: `You are a friendly, warm, and knowledgeable AI assistant for a specific property. Your goal is to answer questions from potential buyers accurately and concisely. If the information is not in the provided data, respond with: "I'm sorry, I don't have that specific information, but the listing agent can certainly help. Would you like to schedule a showing?" Keep answers brief.`
        }
    });
    return { text: response.text };
});

export const continueConversation = onCall<{ messages: ChatMessage[] }, { text: string }>(async ({ messages }, aiInstance) => {
    const history = messages.map((msg) => ({
        role: msg.sender === "user" ? "user" : "model",
        parts: [{ text: msg.text }],
    }));
    const userPrompt = history.pop();
    if (!userPrompt) {
        throw new functions.https.HttpsError("invalid-argument", "No user prompt provided.");
    }
    const chat = aiInstance.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: "You are HomeListingAI, a helpful and creative AI assistant for real estate agents. Your goal is to help agents with marketing, communication, property analysis, and administrative tasks. Be professional, insightful, and ready to assist with a wide range of real estate needs.",
      },
      history: history,
    });
    const response: GenerateContentResponse = await chat.sendMessage({ message: userPrompt.parts[0].text });
    return { text: response.text };
});

export const getMarketAnalysis = onCall<{ address: string }, { analysisText: string; sources: { uri: string; title: string }[] }>(async ({ address }, aiInstance) => {
    const prompt = `Provide a comprehensive property market analysis for the address: "${address}". Include sections like Comparable Sales, Market Trends, and Neighborhood Data.`;
    const response = await aiInstance.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] },
    });
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    const sources = groundingMetadata?.groundingChunks?.map((chunk: any) => chunk.web).filter(Boolean) || [];
    return {
        analysisText: response.text,
        sources: sources.map((source: any) => ({ uri: source.uri, title: source.title || source.uri })),
    };
});

export const generatePropertyReport = onCall<{ property: Property, options: any }, { text: string }>(async ({ property, options }, aiInstance) => {
    const promptParts = [`Generate a compelling market analysis report for the property at ${property.address}.`];
    if (options.marketAnalysis) promptParts.push("Include current market trends.");
    if (options.comparableProperties) promptParts.push("Include 2-3 recent comparable property sales.");
    if (options.neighborhoodInfo) promptParts.push("Include neighborhood highlights.");
    const useSearch = options.comparableProperties || options.marketAnalysis;
    const response = await aiInstance.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: promptParts.join('\n'),
        config: {
            systemInstruction: "You are a real estate market analyst AI. Your reports are professional and easy for a client to understand.",
            ...(useSearch && { tools: [{ googleSearch: {} }] })
        }
    });
    return { text: response.text };
});

export const generateBlogPost = onCall<{ options: any }, AIBlogPost>(async ({ options }, aiInstance) => {
    const { topic, keywords, tone, style, audience, cta } = options;
    const prompt = `Write an engaging blog post (400-600 words) on: "${topic}". Keywords: ${keywords}. Tone: ${tone}. Style: ${style}. Audience: ${audience}. CTA: "${cta}". Format as HTML in a JSON object with 'title' and 'body'.`;
    const response = await aiInstance.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction: "You are a professional content writer and SEO specialist for the real estate industry. Your output must be a JSON object.",
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: { title: { type: Type.STRING }, body: { type: Type.STRING } }
            }
        }
    });
    return JSON.parse(response.text);
});

export const generateVideoScript = onCall<{ property: Property }, { text: string }>(async ({ property }, aiInstance) => {
    const prompt = `Generate a short, punchy video script for a social media reel for this property: ${property.address}, a ${property.beds} bed, ${property.baths} bath ${property.propertyType}. Features: ${property.features.join(", ")}.`;
    const response = await aiInstance.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction: "You are a creative director specializing in viral real estate video content."
        }
    });
    return { text: response.text };
});

export const generateSocialPostText = onCall<{ property: Property, platforms: SocialPlatform[] }, { text: string }>(async ({ property, platforms }, aiInstance) => {
    const prompt = `Generate a social media post for ${property.address} for platforms: ${platforms.join(", ")}. Be engaging and include hashtags.`;
    const response = await aiInstance.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction: "You are a savvy social media manager for a top real estate agency."
        }
    });
    return { text: response.text };
});