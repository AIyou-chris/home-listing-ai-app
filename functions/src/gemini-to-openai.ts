import * as functions from 'firebase-functions';
import OpenAI from 'openai';

// Initialize OpenAI client
const getOpenAIClient = () => {
    if (!process.env.OPENAI_API_KEY) {
        throw new functions.https.HttpsError("failed-precondition", "OpenAI API key is not configured");
    }
    return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
};

// Generate property description using OpenAI
export const generatePropertyDescription = functions.https.onCall(async (data: any, context) => {
    try {
        const { property } = data;
        if (!property) {
            throw new functions.https.HttpsError("invalid-argument", "Property data is required");
        }

        const openai = getOpenAIClient();
        
        const prompt = `Generate a compelling property description for this listing:
        
Address: ${property.address}
Price: $${property.price?.toLocaleString()}
Bedrooms: ${property.bedrooms}
Bathrooms: ${property.bathrooms}
Square Feet: ${property.squareFeet?.toLocaleString()}
Property Type: ${property.propertyType}
Features: ${property.features?.join(', ')}

Create an engaging title and 2-3 descriptive paragraphs that highlight the property's best features and appeal to potential buyers. Format as JSON with "title" and "paragraphs" array.`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are a professional real estate copywriter. Generate compelling property descriptions in JSON format." },
                { role: "user", content: prompt }
            ],
            max_tokens: 1000,
            temperature: 0.7
        });

        const responseText = completion.choices[0]?.message?.content;
        if (!responseText) {
            throw new Error("Empty response from OpenAI");
        }

        try {
            const parsed = JSON.parse(responseText);
            if (parsed.title && Array.isArray(parsed.paragraphs)) {
                return parsed;
            }
        } catch {
            // Fallback if JSON parsing fails
            return {
                title: `Beautiful ${property.propertyType} in ${property.address.split(',')[0]}`,
                paragraphs: [responseText]
            };
        }

        return {
            title: `Beautiful ${property.propertyType} in ${property.address.split(',')[0]}`,
            paragraphs: [responseText]
        };
    } catch (error) {
        console.error("generatePropertyDescription error:", error);
        throw new functions.https.HttpsError("internal", "Failed to generate property description");
    }
});

// Get market analysis using OpenAI
export const getMarketAnalysis = functions.https.onCall(async (data: any, context) => {
    try {
        const { address } = data;
        if (!address) {
            throw new functions.https.HttpsError("invalid-argument", "Address is required");
        }

        const openai = getOpenAIClient();
        
        const prompt = `Provide a market analysis for the area around: ${address}

Generate realistic market data in JSON format with these fields:
- averagePrice (number)
- pricePerSqFt (number)
- monthsOfInventory (number)
- averageDaysOnMarket (number)
- priceGrowth (number, percentage)
- marketTrend (string: "up", "down", or "stable")
- demandLevel (string: "high", "medium", or "low")
- neighborhood (string)
- schoolRating (number 1-10)
- walkScore (number 1-100)`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are a real estate market analyst. Generate realistic market data in JSON format." },
                { role: "user", content: prompt }
            ],
            max_tokens: 800,
            temperature: 0.3
        });

        const responseText = completion.choices[0]?.message?.content;
        if (!responseText) {
            throw new Error("Empty response from OpenAI");
        }

        try {
            return JSON.parse(responseText);
        } catch {
            // Fallback data if JSON parsing fails
            return {
                averagePrice: 450000,
                pricePerSqFt: 250,
                monthsOfInventory: 3.2,
                averageDaysOnMarket: 28,
                priceGrowth: 5.2,
                marketTrend: "up",
                demandLevel: "medium",
                neighborhood: address.split(',')[1]?.trim() || "Local Area",
                schoolRating: 7,
                walkScore: 65
            };
        }
    } catch (error) {
        console.error("getMarketAnalysis error:", error);
        throw new functions.https.HttpsError("internal", "Failed to get market analysis");
    }
});

// Generate blog post using OpenAI
export const generateBlogPost = functions.https.onCall(async (data: any, context) => {
    try {
        const { options } = data;
        if (!options || !options.topic) {
            throw new functions.https.HttpsError("invalid-argument", "Blog post options with topic are required");
        }

        const openai = getOpenAIClient();
        
        const prompt = `Create a blog post about: ${options.topic}
        
Keywords: ${options.keywords || 'real estate'}
Tone: ${options.tone || 'professional'}
Style: ${options.style || 'informative'}
Target Audience: ${options.audience || 'homebuyers'}
Call to Action: ${options.cta || 'Contact us for more information'}

Write a complete blog post with a compelling title and engaging content. Format as JSON with "title" and "body" fields.`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are a professional content writer specializing in real estate. Create engaging blog posts in JSON format." },
                { role: "user", content: prompt }
            ],
            max_tokens: 2000,
            temperature: 0.7
        });

        const responseText = completion.choices[0]?.message?.content;
        if (!responseText) {
            throw new Error("Empty response from OpenAI");
        }

        try {
            return JSON.parse(responseText);
        } catch {
            // Fallback if JSON parsing fails
            return {
                title: options.topic,
                body: responseText
            };
        }
    } catch (error) {
        console.error("generateBlogPost error:", error);
        throw new functions.https.HttpsError("internal", "Failed to generate blog post");
    }
});

// Generate video script using OpenAI
export const generateVideoScript = functions.https.onCall(async (data: any, context) => {
    try {
        const { property } = data;
        if (!property) {
            throw new functions.https.HttpsError("invalid-argument", "Property data is required");
        }

        const openai = getOpenAIClient();
        
        const prompt = `Create a video script for this property listing:
        
Address: ${property.address}
Price: $${property.price?.toLocaleString()}
Bedrooms: ${property.bedrooms}
Bathrooms: ${property.bathrooms}
Square Feet: ${property.squareFeet?.toLocaleString()}
Features: ${property.features?.join(', ')}

Write a 60-90 second video script that:
- Opens with an engaging hook
- Highlights key features and benefits
- Creates emotional connection
- Ends with clear call to action
- Uses conversational, enthusiastic tone`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are a professional video script writer for real estate marketing. Create engaging, conversational scripts." },
                { role: "user", content: prompt }
            ],
            max_tokens: 1000,
            temperature: 0.7
        });

        const responseText = completion.choices[0]?.message?.content;
        if (!responseText) {
            throw new Error("Empty response from OpenAI");
        }

        return { text: responseText };
    } catch (error) {
        console.error("generateVideoScript error:", error);
        throw new functions.https.HttpsError("internal", "Failed to generate video script");
    }
});

// Generate social media post text using OpenAI
export const generateSocialPostText = functions.https.onCall(async (data: any, context) => {
    try {
        const { property, platforms } = data;
        if (!property || !platforms) {
            throw new functions.https.HttpsError("invalid-argument", "Property data and platforms are required");
        }

        const openai = getOpenAIClient();
        
        const prompt = `Create social media post content for this property:
        
Address: ${property.address}
Price: $${property.price?.toLocaleString()}
Bedrooms: ${property.bedrooms}
Bathrooms: ${property.bathrooms}
Features: ${property.features?.slice(0, 3).join(', ')}

Platforms: ${platforms.join(', ')}

Create engaging social media post text that:
- Grabs attention immediately
- Highlights key selling points
- Uses appropriate hashtags
- Includes call to action
- Fits platform character limits`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are a social media marketing expert for real estate. Create engaging posts optimized for different platforms." },
                { role: "user", content: prompt }
            ],
            max_tokens: 500,
            temperature: 0.7
        });

        const responseText = completion.choices[0]?.message?.content;
        if (!responseText) {
            throw new Error("Empty response from OpenAI");
        }

        return { text: responseText };
    } catch (error) {
        console.error("generateSocialPostText error:", error);
        throw new functions.https.HttpsError("internal", "Failed to generate social post text");
    }
});

// Answer property questions using OpenAI
export const answerPropertyQuestion = functions.https.onCall(async (data: any, context) => {
    try {
        const { property, question } = data;
        if (!property || !question) {
            throw new functions.https.HttpsError("invalid-argument", "Property data and question are required");
        }

        const openai = getOpenAIClient();
        
        const prompt = `Answer this question about the property:
        
Property Details:
Address: ${property.address}
Price: $${property.price?.toLocaleString()}
Bedrooms: ${property.bedrooms}
Bathrooms: ${property.bathrooms}
Square Feet: ${property.squareFeet?.toLocaleString()}
Property Type: ${property.propertyType}
Features: ${property.features?.join(', ')}
Description: ${property.description?.paragraphs?.join(' ') || property.description}

Question: ${question}

Provide a helpful, accurate answer based on the property information. If the information isn't available, politely state that and suggest how they could get that information.`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are a knowledgeable real estate assistant. Answer questions about properties accurately and helpfully." },
                { role: "user", content: prompt }
            ],
            max_tokens: 500,
            temperature: 0.5
        });

        const responseText = completion.choices[0]?.message?.content;
        if (!responseText) {
            throw new Error("Empty response from OpenAI");
        }

        return { text: responseText };
    } catch (error) {
        console.error("answerPropertyQuestion error:", error);
        throw new functions.https.HttpsError("internal", "Failed to answer property question");
    }
});

// Generate property report using OpenAI
export const generatePropertyReport = functions.https.onCall(async (data: any, context) => {
    try {
        const { property, options } = data;
        if (!property || !options) {
            throw new functions.https.HttpsError("invalid-argument", "Property data and options are required");
        }

        const openai = getOpenAIClient();
        
        const prompt = `Generate a comprehensive property report:
        
Property Details:
Address: ${property.address}
Price: $${property.price?.toLocaleString()}
Bedrooms: ${property.bedrooms}
Bathrooms: ${property.bathrooms}
Square Feet: ${property.squareFeet?.toLocaleString()}
Property Type: ${property.propertyType}
Features: ${property.features?.join(', ')}

Include these sections if requested:
${options.marketAnalysis ? '- Market Analysis' : ''}
${options.comparableProperties ? '- Comparable Properties' : ''}
${options.neighborhoodInfo ? '- Neighborhood Information' : ''}

Create a professional report in markdown format with relevant analysis and insights.`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are a professional real estate analyst. Create comprehensive property reports in markdown format." },
                { role: "user", content: prompt }
            ],
            max_tokens: 2500,
            temperature: 0.5
        });

        const responseText = completion.choices[0]?.message?.content;
        if (!responseText) {
            throw new Error("Empty response from OpenAI");
        }

        return { text: responseText };
    } catch (error) {
        console.error("generatePropertyReport error:", error);
        throw new functions.https.HttpsError("internal", "Failed to generate property report");
    }
});

// Get local information using OpenAI
export const getLocalInfo = functions.https.onCall(async (data: any, context) => {
    try {
        const { address, category } = data;
        if (!address || !category) {
            throw new functions.https.HttpsError("invalid-argument", "Address and category are required");
        }

        const openai = getOpenAIClient();
        
        const prompt = `Provide local information for the area around: ${address}
        
Category: ${category}

Generate realistic local information in JSON format with an array of relevant locations/amenities including:
- name
- distance (in miles)
- rating (1-5)
- description
- address

Focus on ${category} in the local area.`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are a local area expert. Provide realistic information about neighborhoods and local amenities in JSON format." },
                { role: "user", content: prompt }
            ],
            max_tokens: 1000,
            temperature: 0.3
        });

        const responseText = completion.choices[0]?.message?.content;
        if (!responseText) {
            throw new Error("Empty response from OpenAI");
        }

        try {
            return JSON.parse(responseText);
        } catch {
            // Fallback data if JSON parsing fails
            return {
                category,
                locations: [
                    {
                        name: `Local ${category}`,
                        distance: 0.5,
                        rating: 4.2,
                        description: `Quality ${category} in the area`,
                        address: "Nearby location"
                    }
                ]
            };
        }
    } catch (error) {
        console.error("getLocalInfo error:", error);
        throw new functions.https.HttpsError("internal", "Failed to get local information");
    }
});

// Generate text using OpenAI (for knowledge base)
export const generateText = functions.https.onCall(async (data: any, context) => {
    try {
        const { prompt } = data;
        if (!prompt) {
            throw new functions.https.HttpsError("invalid-argument", "Prompt is required");
        }

        const openai = getOpenAIClient();
        
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are a helpful AI assistant. Provide accurate, helpful responses." },
                { role: "user", content: prompt }
            ],
            max_tokens: 1500,
            temperature: 0.7
        });

        const responseText = completion.choices[0]?.message?.content;
        if (!responseText) {
            throw new Error("Empty response from OpenAI");
        }

        return responseText;
    } catch (error) {
        console.error("generateText error:", error);
        throw new functions.https.HttpsError("internal", "Failed to generate text");
    }
});
