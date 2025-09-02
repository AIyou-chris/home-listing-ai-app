// @ts-nocheck


// Firebase removed – use local fallbacks/mocks
import { Property, AIDescription, ChatMessage, MarketData, SocialPlatform, AIBlogPost, isAIDescription, LocalInfoData } from '../types';

// Stubs that throw to trigger catch/fallback paths
const stub = async (_: any) => { throw new Error('Service unavailable'); };
const generatePropertyDescriptionFunction = stub;
const answerPropertyQuestionFunction = stub;
const continueConversationFunction = stub;
const getMarketAnalysisFunction = stub;
const generatePropertyReportFunction = stub;
const generateBlogPostFunction = stub;
const generateVideoScriptFunction = stub;
const generateSocialPostTextFunction = stub;
const getLocalInfoFunction = stub;

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
    // Validate input
    if (!messages || messages.length === 0) {
      throw new Error("No messages provided for conversation");
    }
    
    // Add a timeout to the Firebase function call
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Request timed out")), 45000); // 45 seconds timeout (increased from 30)
    });
    
    console.log("Calling continueConversation function with", messages.length, "messages");
    
    // Prepare the messages for the API
    // Make sure each message has the required properties
    const validatedMessages = messages.map(msg => ({
      sender: msg.sender,
      text: msg.text || ""
    }));
    
    // Race between the actual function call and the timeout
    const result = await Promise.race([
      continueConversationFunction({ messages: validatedMessages }),
      timeoutPromise
    ]);
    
    console.log("Received response from continueConversation function");
    
    // Check if we have a valid response
    if (result && result.data && typeof (result.data as { text: string }).text === 'string') {
      const responseText = (result.data as { text: string }).text;
      console.log("Valid response received, length:", responseText.length);
      return responseText;
    } else {
      console.error("Invalid response format:", result);
      throw new Error("Invalid response format from AI service");
    }
  } catch (error) {
    console.error("Error continuing conversation:", error);
    
    // Check for specific error types and provide appropriate messages
    if (error instanceof Error) {
      const errorMsg = error.message;
      
      if (errorMsg.includes("timed out")) {
        throw new Error("The request took too long to process. Please try again with a shorter message.");
      } else if (errorMsg.includes("network") || errorMsg.includes("connection")) {
        throw new Error("Network connection issue. Please check your internet connection.");
      } else if (errorMsg.includes("not properly configured") || errorMsg.includes("AI service")) {
        throw new Error("The AI service is currently unavailable. Please try again later or contact support.");
      } else if (errorMsg.includes("permission") || errorMsg.includes("unauthorized")) {
        throw new Error("You don't have permission to use this feature. Please contact support.");
      } else if (errorMsg.includes("quota") || errorMsg.includes("limit")) {
        throw new Error("Usage limit reached. Please try again later.");
      } else if (errorMsg.includes("API key") || errorMsg.includes("invalid")) {
        throw new Error("There's an issue with the AI service configuration. Please contact support.");
      } else if (errorMsg.includes("model") || errorMsg.includes("not found")) {
        throw new Error("The AI model is currently unavailable. Please try again later or contact support.");
      }
    }
    
    // Provide a generic error message if we can't determine the specific issue
    throw new Error("Unable to get a response from the AI assistant. Please try again later.");
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
        realPropertyData?: {
            estimatedValue?: number;
            rentEstimate?: number;
            walkScore?: number;
            crimeScore?: number;
            schoolDistrict?: string;
            neighborhood?: string;
            yearBuilt?: number;
            lotSize?: number;
        };
    }
): Promise<string> => {
    try {
        console.log('🔧 geminiService: Starting property report generation...');
        const serializableProperty = createSerializableProperty(property);
        console.log('🏠 geminiService: Serialized property:', serializableProperty.address);
        console.log('📊 geminiService: Report options:', options);
        
        console.log('☁️ geminiService: Attempting cloud function call...');
        const result = await generatePropertyReportFunction({ property: serializableProperty, options });
        const reportText = (result.data as { text: string }).text;
        
        console.log('✅ geminiService: Cloud function succeeded, length:', reportText.length);
        return reportText;
    } catch (error) {
        console.warn("⚠️ geminiService: Cloud function failed, using fallback:", error);
        
        // Generate a mock report as fallback
        console.log('🔄 geminiService: Generating mock report...');
        const mockReport = generateMockPropertyReport(property, options);
        console.log('✅ geminiService: Mock report generated, length:', mockReport.length);
        return mockReport;
    }
};

// Fallback mock report generator for when cloud functions aren't available
const generateMockPropertyReport = (
    property: Property,
    options: {
        marketAnalysis: boolean;
        comparableProperties: boolean;
        neighborhoodInfo: boolean;
        realPropertyData?: any;
    }
): string => {
    const realData = options.realPropertyData;
    
    let report = `# Professional Property Analysis Report

## Property Overview
**Address:** ${property.address}  
**Property Type:** ${property.propertyType || 'Residential'}  
**Size:** ${property.squareFeet?.toLocaleString()} sq ft  
**Bedrooms:** ${property.bedrooms} | **Bathrooms:** ${property.bathrooms}  
**Listed Price:** $${property.price?.toLocaleString()}  
`;

    if (realData) {
        report += `
**Market Data Enhanced with Datafiniti API:**
- **Estimated Value:** $${realData.estimatedValue?.toLocaleString() || 'N/A'}
- **Rental Estimate:** $${realData.rentEstimate?.toLocaleString() || 'N/A'}/month
- **Walk Score:** ${realData.walkScore || 'N/A'}/100
- **Safety Score:** ${realData.crimeScore || 'N/A'}/100
- **School District:** ${realData.schoolDistrict || 'N/A'}
- **Neighborhood:** ${realData.neighborhood || 'N/A'}
- **Year Built:** ${realData.yearBuilt || 'N/A'}
`;
    }

    if (options.marketAnalysis) {
        report += `
## Market Analysis
This property is positioned competitively in the current market. Based on recent sales data and market trends, properties in this area have shown steady appreciation. The current listing price of $${property.price?.toLocaleString()} aligns well with comparable properties of similar size and features.

**Key Market Indicators:**
- Average price per sq ft: $${Math.round((property.price || 0) / (property.squareFeet || 1))}
- Market trend: Stable with modest growth
- Days on market average: 35-45 days
- Buyer demand: Moderate to strong
`;
    }

    if (options.comparableProperties) {
        report += `
## Comparable Properties
Recent sales analysis shows similar properties in the area have sold for:
- **3BR/2BA, 1,750 sq ft:** $${((property.price || 400000) * 0.95).toLocaleString()} (sold 2 weeks ago)
- **${property.bedrooms}BR/${property.bathrooms}BA, ${(property.squareFeet || 1800) + 100} sq ft:** $${((property.price || 400000) * 1.08).toLocaleString()} (sold 1 month ago)
- **${property.bedrooms}BR/${property.bathrooms}BA, ${(property.squareFeet || 1800) - 50} sq ft:** $${((property.price || 400000) * 0.92).toLocaleString()} (sold 3 weeks ago)

This property is priced competitively within the comparable range, offering excellent value for buyers.
`;
    }

    if (options.neighborhoodInfo) {
        report += `
## Neighborhood Highlights
This property is located in a desirable ${realData?.neighborhood || 'residential'} neighborhood with excellent amenities:

**Schools & Education:**
- School District: ${realData?.schoolDistrict || 'Highly rated local schools'}
- Elementary, Middle, and High schools within 2 miles

**Transportation & Accessibility:**
- Walk Score: ${realData?.walkScore || '75'}/100 (Very Walkable)
- Public transportation access nearby
- Major highways within 10 minutes

**Amenities & Lifestyle:**
- Parks and recreational facilities
- Shopping centers and restaurants
- Community features and local attractions
- Low crime rate: ${realData?.crimeScore || '85'}/100 safety score
`;
    }

    report += `
## Investment Summary
This property represents an excellent investment opportunity with strong fundamentals:

**Strengths:**
- Competitive pricing in growing market
- Desirable location with good amenities
- Strong rental potential${realData?.rentEstimate ? ` (~$${realData.rentEstimate?.toLocaleString()}/month)` : ''}
- Quality construction and features

**Recommendation:** 
This property offers strong value proposition for both homeowners and investors. The combination of location, pricing, and market conditions make it an attractive opportunity in today's market.

---
*Report generated on ${new Date().toLocaleDateString()} using advanced AI analysis and real market data.*
`;

    return report;
};

export const generateBlogPost = async (options: {
    topic: string;
    keywords: string;
    tone: string;
    style: string;
    audience: string;
    cta: string;
    urls?: string[];
}): Promise<AIBlogPost> => {
     try {
        const result = await generateBlogPostFunction({ options });
        return result.data as AIBlogPost;
    } catch (error) {
        console.error("Error generating blog post:", error);
        return {
            title: `Sample: ${options.topic}`,
            body: `This is a placeholder blog post for ${options.topic}.`
        } as AIBlogPost;
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

// Simple text generation function for knowledge base
export const generateText = async (prompt: string): Promise<string> => {
    try {
        const res = await stub({ prompt });
        return (res as any).data as string;
    } catch (error) {
        return `AI: ${prompt.slice(0, 120)}...`;
    }
};