

import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import { Property, AIDescription, ChatMessage, MarketData, SocialPlatform, AIBlogPost, isAIDescription, LocalInfoData } from '../types';

// Create callable function references
const generatePropertyDescriptionFunction = httpsCallable(functions, 'generatePropertyDescription');
const answerPropertyQuestionFunction = httpsCallable(functions, 'answerPropertyQuestion');
const continueConversationFunction = httpsCallable(functions, 'continueConversation');
const getMarketAnalysisFunction = httpsCallable(functions, 'getMarketAnalysis');
const generatePropertyReportFunction = httpsCallable(functions, 'generatePropertyReport');
const generateBlogPostFunction = httpsCallable(functions, 'generateBlogPost');
const generateVideoScriptFunction = httpsCallable(functions, 'generateVideoScript');
const generateSocialPostTextFunction = httpsCallable(functions, 'generateSocialPostText');
const getLocalInfoFunction = httpsCallable(functions, 'getLocalInfo');

/**
 * Creates a serializable version of a Property object, excluding fields that might contain non-serializable data like File objects.
 * @param property The original Property object.
 * @returns A new object that is safe to send to Firebase Cloud Functions.
 */
const createSerializableProperty = (property: Property) => {
    // Sanitize photo arrays to ensure they don't contain non-serializable File objects.
    const sanitizedHeroPhotos = (property.heroPhotos || []).map((p: string | File) =>
        typeof p === 'string' ? p : p.name
    );
    const sanitizedGalleryPhotos = (property.galleryPhotos || []).map((p: string | File) =>
        typeof p === 'string' ? p : p.name
    );

    // Defensively rebuild the agent object to ensure it is plain and serializable.
    const { name, title, company, phone, email, headshotUrl, socials, brandColor, logoUrl, website, bio } = property.agent;
    const sanitizedAgent = { name, title, company, phone, email, headshotUrl, socials, brandColor, logoUrl, website, bio };

    // Defensively rebuild the description object.
    const sanitizedDescription = isAIDescription(property.description)
        ? { title: property.description.title, paragraphs: property.description.paragraphs }
        : property.description;

    return {
        id: property.id,
        title: property.title,
        address: property.address,
        price: property.price,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        squareFeet: property.squareFeet,
        description: sanitizedDescription,
        heroPhotos: sanitizedHeroPhotos,
        galleryPhotos: sanitizedGalleryPhotos,
        appFeatures: property.appFeatures,
        agent: sanitizedAgent,
        propertyType: property.propertyType,
        features: property.features,
        imageUrl: property.imageUrl,
    };
};


export const generatePropertyDescription = async (property: Property): Promise<AIDescription | string> => {
  try {
    const serializableProperty = createSerializableProperty(property);
    const result = await generatePropertyDescriptionFunction({ property: serializableProperty });
    const description = result.data as AIDescription;
    if (isAIDescription(description)) {
        return description;
    }
    return "Failed to generate a valid description structure.";
  } catch (error) {
    console.error("Error generating property description:", error);
    return "We had trouble generating a description. Please try again.";
  }
};

export const answerPropertyQuestion = async (property: Property, question: string): Promise<string> => {
  if (!question.trim()) {
    return "Please ask a question.";
  }
  try {
    const serializableProperty = createSerializableProperty(property);
    const result = await answerPropertyQuestionFunction({ property: serializableProperty, question });
    return (result.data as { text: string }).text;
  } catch (error) {
    console.error("Error answering property question:", error);
    return "I'm having trouble connecting right now. Please try again in a moment.";
  }
};

export const continueConversation = async (messages: ChatMessage[]): Promise<string> => {
  try {
    const result = await continueConversationFunction({ messages });
    return (result.data as { text: string }).text;
  } catch (error) {
    console.error("Error continuing conversation:", error);
    return "I'm having trouble connecting right now. Please try again in a moment.";
  }
};


export const getMarketAnalysis = async (address: string): Promise<MarketData> => {
    if (!address.trim()) {
        throw new Error("Address cannot be empty.");
    }
    try {
        const result = await getMarketAnalysisFunction({ address });
        return result.data as MarketData;
    } catch (error) {
        console.error("Error getting market analysis:", error);
        throw new Error("Failed to retrieve market data. Please try again.");
    }
};

export const generatePropertyReport = async (
    property: Property,
    options: {
        marketAnalysis: boolean;
        comparableProperties: boolean;
        neighborhoodInfo: boolean;
    }
): Promise<string> => {
    try {
        const serializableProperty = createSerializableProperty(property);
        const result = await generatePropertyReportFunction({ property: serializableProperty, options });
        return (result.data as { text: string }).text;
    } catch (error) {
        console.error("Error generating property report:", error);
        return "An error occurred while generating the property report. Please try again.";
    }
};

export const generateBlogPost = async (options: {
    topic: string;
    keywords: string;
    tone: string;
    style: string;
    audience: string;
    cta: string;
}): Promise<AIBlogPost> => {
     try {
        const result = await generateBlogPostFunction({ options });
        return result.data as AIBlogPost;
    } catch (error) {
        console.error("Error generating blog post:", error);
        return {
            title: "Error Generating Post",
            body: "An error occurred while generating the blog post. Please check the console for details and try again."
        };
    }
};

export const generateVideoScript = async (property: Property): Promise<string> => {
  try {
    const serializableProperty = createSerializableProperty(property);
    const result = await generateVideoScriptFunction({ property: serializableProperty });
    return (result.data as { text: string }).text;
  } catch (error) {
    console.error("Error generating video script:", error);
    return `Welcome to ${property.address}. This beautiful ${property.propertyType} could be your next home. With ${property.bedrooms} bedrooms and ${property.bathrooms} bathrooms, there's plenty of space to relax. Key features include: ${property.features.slice(0, 3).join(', ')}. Contact us to schedule a tour today!`;
  }
};

export const generateSocialPostText = async (property: Property, platforms: SocialPlatform[]): Promise<string> => {
  try {
    const serializableProperty = createSerializableProperty(property);
    const result = await generateSocialPostTextFunction({ property: serializableProperty, platforms });
    return (result.data as { text: string }).text;
  } catch (error) {
    console.error("Error generating social post text:", error);
    return `Check out this amazing ${property.propertyType} at ${property.address}! Priced at $${property.price.toLocaleString()}, it's a fantastic opportunity. DM for details! #realestate #${property.address.split(',')[1]?.trim().replace(' ', '') || 'listing'}`;
  }
};

export const getLocalInfo = async (address: string, category: string): Promise<LocalInfoData> => {
    if (!address.trim()) {
        throw new Error("Address cannot be empty.");
    }
    try {
        const result = await getLocalInfoFunction({ address, category });
        return result.data as LocalInfoData;
    } catch (error) {
        console.error(`Error getting local info for ${category}:`, error);
        throw new Error(`Failed to retrieve local data for ${category}. Please try again.`);
    }
};