
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onUserCreated } from "firebase-functions/v2/auth";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { INITIAL_USER_PROPERTIES_DATA, SAMPLE_AGENT_DEFAULTS } from "./constants";

admin.initializeApp();

const geminiApiKey = process.env.API_KEY;
let ai: GoogleGenAI | undefined;
if (geminiApiKey) {
    ai = new GoogleGenAI({apiKey: geminiApiKey});
} else {
    logger.error("Gemini API key (API_KEY secret) not found. Please set it in your Firebase environment.");
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

interface LocalInfoData {
    text: string;
    sources: { uri: string; title: string }[];
}


function isAIDescription(description: any): description is AIDescription {
  return description && typeof description === 'object' && typeof description.title === 'string' && Array.isArray(description.paragraphs);
}


// --- Helper for creating callable functions ---
const createCallable = <T, R>(handler: (data: T, aiInstance: GoogleGenAI) => Promise<R>) => {
    return onCall(async (request) => {
        // We will allow unauthenticated access for the demo app, but this is where you'd enforce it.
        // if (!request.auth) {
        //     throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
        // }
        if (!ai) {
            throw new HttpsError("failed-precondition", "The Gemini API client is not initialized on the server.");
        }
        try {
            return await handler(request.data as T, ai);
        } catch (error) {
            logger.error("Error executing function:", error);
            if (error instanceof HttpsError) {
                throw error;
            }
            throw new HttpsError("internal", "An error occurred while calling the Gemini API.", error);
        }
    });
};

/**
 * Triggered on new user creation to set up their initial data.
 */
export const onCreateUser = onUserCreated(async (event) => {
    const user = event.data;
    logger.info(`New user created: ${user.uid}, ${user.email}`);

    const newAgentProfile = {
        name: user.displayName ?? "New Agent",
        email: user.email ?? "",
        headshotUrl: user.photoURL ?? `https://i.pravatar.cc/150?u=${user.uid}`,
        ...SAMPLE_AGENT_DEFAULTS,
    };

    const propertiesCollection = admin.firestore().collection("properties");
    const batch = admin.firestore().batch();

    INITIAL_USER_PROPERTIES_DATA.forEach((prop) => {
        const docRef = propertiesCollection.doc(); // Auto-generate ID
        const newProp = {
            ...prop,
            agent: newAgentProfile,
            userId: user.uid,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        // remove the irrelevant demo id
        delete (newProp as any).id;
        batch.set(docRef, newProp);
    });

    try {
        await batch.commit();
        logger.info(`Successfully created initial properties for user ${user.uid}`);
    } catch (error) {
        logger.error(`Failed to create initial properties for user ${user.uid}`, error);
    }
});


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

export const generatePropertyDescription = createCallable<{ property: Property }, AIDescription>(async ({ property }, aiInstance) => {
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
    const text = response.text;
    if (!text) {
        throw new HttpsError("internal", "Received an empty response from the AI.");
    }
    return JSON.parse(text);
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

export const answerPropertyQuestion = createCallable<{ property: Property; question: string }, { text: string }>(async ({ property, question }, aiInstance) => {
    const response = await aiInstance.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: answerQuestionPrompt(property, question),
        config: {
            systemInstruction: "You are a friendly, warm, and knowledgeable AI assistant for a specific property. Your goal is to answer questions from potential buyers accurately and concisely. If the information is not in the provided data, respond with: \"I'm sorry, I don't have that specific information, but the listing agent can certainly help. Would you like to schedule a showing?\" Keep answers brief."
        }
    });
    return { text: response.text ?? '' };
});

export const continueConversation = createCallable<{ messages: ChatMessage[] }, { text: string }>(async ({ messages }, aiInstance) => {
    const history = messages.map((msg) => ({
        role: msg.sender === "user" ? "user" : "model",
        parts: [{ text: msg.text }],
    }));
    const userPrompt = history.pop();
    if (!userPrompt) {
        throw new HttpsError("invalid-argument", "No user prompt provided.");
    }
    const chat = aiInstance.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: "You are HomeListingAI, a helpful and creative AI assistant for real estate agents. Your goal is to help agents with marketing, communication, property analysis, and administrative tasks. Be professional, insightful, and ready to assist with a wide range of real estate needs.",
      },
      history: history,
    });
    const response: GenerateContentResponse = await chat.sendMessage({ message: userPrompt.parts[0].text });
    return { text: response.text ?? '' };
});

export const getMarketAnalysis = createCallable<{ address: string }, { analysisText: string; sources: { uri: string; title: string }[] }>(async ({ address }, aiInstance) => {
    const prompt = `Provide a comprehensive property market analysis for the address: "${address}". Include sections like Comparable Sales, Market Trends, and Neighborhood Data.`;
    const response = await aiInstance.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] },
    });
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    const sources = groundingMetadata?.groundingChunks?.map((chunk: any) => chunk.web).filter(Boolean) || [];
    return {
        analysisText: response.text ?? '',
        sources: sources.map((source: any) => ({ uri: source.uri, title: source.title || source.uri })),
    };
});

export const generatePropertyReport = createCallable<{ property: Property, options: any }, { text: string }>(async ({ property, options }, aiInstance) => {
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
    return { text: response.text ?? '' };
});

export const generateBlogPost = createCallable<{ options: any }, AIBlogPost>(async ({ options }, aiInstance) => {
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
    const text = response.text;
    if (!text) {
        throw new HttpsError("internal", "Received an empty response from the AI.");
    }
    return JSON.parse(text);
});

export const generateVideoScript = createCallable<{ property: Property }, { text: string }>(async ({ property }, aiInstance) => {
    const prompt = `Generate a short, punchy video script for a social media reel for this property: ${property.address}, a ${property.beds} bed, ${property.baths} bath ${property.propertyType}. Features: ${property.features.join(", ")}.`;
    const response = await aiInstance.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction: "You are a creative director specializing in viral real estate video content."
        }
    });
    return { text: response.text ?? '' };
});

export const generateSocialPostText = createCallable<{ property: Property, platforms: SocialPlatform[] }, { text: string }>(async ({ property, platforms }, aiInstance) => {
    const prompt = `Generate a social media post for ${property.address} for platforms: ${platforms.join(", ")}. Be engaging and include hashtags.`;
    const response = await aiInstance.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction: "You are a savvy social media manager for a top real estate agency."
        }
    });
    return { text: response.text ?? '' };
});


const getLocalInfoPrompt = (address: string, category: string): string => {
    switch (category) {
        case 'schools':
            return `Provide a summary of the top-rated schools (public and private, including elementary, middle, and high schools) within a 5-mile radius of ${address}. Include their ratings (e.g., from GreatSchools) and distance from the address if available. Format the output nicely.`;
        case 'neighborhood':
            return `Describe the neighborhood and lifestyle around ${address}. Mention parks, community atmosphere, typical resident demographics, safety, and walkability. Provide a general overview for someone considering moving to the area.`;
        case 'amenities':
            return `List a variety of popular and highly-rated local amenities within a 5-mile radius of ${address}. Include categories like restaurants, cafes, grocery stores, and gyms.`;
        default:
            throw new HttpsError('invalid-argument', 'Invalid category provided.');
    }
};

export const getLocalInfo = createCallable<{ address: string, category: string }, LocalInfoData>(async ({ address, category }, aiInstance) => {
    const prompt = getLocalInfoPrompt(address, category);
    const response = await aiInstance.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            systemInstruction: "You are a helpful local guide AI. Your goal is to provide accurate, comprehensive, and up-to-date information based on Google Search results. Present the information in a clear, easy-to-read format. Always be helpful and informative.",
            tools: [{ googleSearch: {} }],
        },
    });

    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    const sources = groundingMetadata?.groundingChunks?.map((chunk: any) => chunk.web).filter(Boolean) || [];

    return {
        text: response.text ?? 'No information found.',
        sources: sources.map((source: any) => ({ uri: source.uri, title: source.title || source.uri })),
    };
});
