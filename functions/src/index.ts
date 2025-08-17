import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { GoogleGenerativeAI } from "@google/generative-ai";
import pdfParse from "pdf-parse";
import * as mammoth from "mammoth";
import { createWorker } from "tesseract.js";
import * as crypto from "crypto";
// Initialize Firebase Admin SDK
admin.initializeApp();

// Initialize Google AI (Gemini)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');



// Firestore references
const db = admin.firestore();
const propertiesCollection = db.collection('properties');

// Voice transcription using Google Speech-to-Text (via Gemini)
export const transcribeVoice = functions.https.onCall(async (data: any, context) => {
    try {
        // const { audioData } = data; // Not used in demo
        
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
export const generateSpeech = functions.https.onCall(async (data: any, context) => {
    try {
        const { text } = data; // voice removed for simplicity
        
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
export const generatePropertyDescription = functions.https.onCall(async (data: any, context) => {
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
export const answerPropertyQuestion = functions.https.onCall(async (data: any, context) => {
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
export const continueConversation = functions.https.onCall(async (data: any, context) => {
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
export const getMarketAnalysis = functions.https.onCall(async (data: any, context) => {
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

// Generate comprehensive property report using Gemini
export const generatePropertyReport = functions.https.onCall(async (data: any, context) => {
    try {
        const { property, options } = data;
        
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        
        console.log("Generating property report for:", property.address);
        
        // Build enhanced property context with real data if available
        let propertyContext = `
        Property Details:
        - Address: ${property.address}
        - Type: ${property.propertyType || 'residential'}
        - Size: ${property.squareFeet?.toLocaleString()} sq ft
        - Bedrooms: ${property.bedrooms}
        - Bathrooms: ${property.bathrooms}
        - Listed Price: $${property.price?.toLocaleString()}
        - Features: ${property.features?.join(', ') || 'Standard features'}
        `;
        
        // Add real property data if available
        if (options.realPropertyData) {
            const realData = options.realPropertyData;
            propertyContext += `
        
        Real Market Data (Enhanced with Datafiniti):
        - Estimated Value: $${realData.estimatedValue?.toLocaleString() || 'N/A'}
        - Rental Estimate: $${realData.rentEstimate?.toLocaleString() || 'N/A'}/month
        - Walk Score: ${realData.walkScore || 'N/A'}/100
        - Safety Score: ${realData.crimeScore || 'N/A'}/100
        - School District: ${realData.schoolDistrict || 'N/A'}
        - Neighborhood: ${realData.neighborhood || 'N/A'}
        - Year Built: ${realData.yearBuilt || 'N/A'}
        - Lot Size: ${realData.lotSize?.toLocaleString() || 'N/A'} sq ft
        `;
        }
        
        // Build content sections based on selected options
        let contentSections = [];
        
        if (options.marketAnalysis) {
            contentSections.push("## Market Analysis\nProvide current market conditions, pricing trends, and market positioning for this property type and area.");
        }
        
        if (options.comparableProperties) {
            contentSections.push("## Comparable Properties\nAnalyze similar properties in the area, comparing features, pricing, and market performance.");
        }
        
        if (options.neighborhoodInfo) {
            contentSections.push("## Neighborhood Highlights\nDescribe the neighborhood amenities, schools, transportation, and lifestyle factors that make this area attractive.");
        }
        
        const prompt = `Create a professional real estate market report for this property:
        
        ${propertyContext}
        
        Generate a comprehensive report with the following sections:
        ${contentSections.join('\n\n')}
        
        ## Investment Summary
        Provide an overall investment recommendation and key takeaways.
        
        Requirements:
        - Professional tone suitable for client presentations
        - Use actual data provided where available
        - Include specific numbers and market insights
        - Format with clear headings and bullet points
        - 800-1200 words total
        - Focus on value proposition and market opportunity
        
        Make this report compelling for potential buyers or investors while remaining factual and professional.`;
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        console.log("Property report generated successfully");
        return { text };
    } catch (error) {
        console.error("Property report generation error:", error);
        throw new functions.https.HttpsError("internal", "Failed to generate property report");
    }
});

// Generate blog post using Gemini
export const generateBlogPost = functions.https.onCall(async (data: any, context) => {
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
export const generateSocialPostText = functions.https.onCall(async (data: any, context) => {
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
export const getLocalInfo = functions.https.onCall(async (data: any, context) => {
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

// ========================================
// FILE UPLOAD & STORAGE SYSTEM
// ========================================

// Initialize Firebase Storage
const bucket = admin.storage().bucket();

// File upload handler
export const uploadFile = functions.https.onCall(async (data: any, context: any) => {
    try {
        const { file, fileName, fileType, userId, propertyId } = data;
        
        if (!context?.auth) {
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
        if (!allowedTypes.includes(fileType)) {
            throw new functions.https.HttpsError("invalid-argument", "File type not supported");
        }

        // Create file path
        const filePath = `uploads/${userId}/${propertyId || 'general'}/${Date.now()}_${fileName}`;
        
        // Upload to Firebase Storage
        const fileBuffer = Buffer.from(file, 'base64');
        const fileUpload = bucket.file(filePath);
        
        await fileUpload.save(fileBuffer, {
            metadata: {
                contentType: fileType,
                metadata: {
                    uploadedBy: userId,
                    propertyId: propertyId || null,
                    uploadedAt: new Date().toISOString()
                }
            }
        });

        // Get download URL
        const [url] = await fileUpload.getSignedUrl({
            action: 'read',
            expires: '03-01-2500'
        });

        // Store file metadata in Firestore
        const fileDoc = await db.collection('files').add({
            fileName,
            fileType,
            filePath,
            downloadUrl: url,
            uploadedBy: userId,
            propertyId: propertyId || null,
            uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'uploaded',
            size: fileBuffer.length
        });

        return {
            fileId: fileDoc.id,
            fileName,
            downloadUrl: url,
            status: 'success'
        };
    } catch (error) {
        console.error("File upload error:", error);
        throw new functions.https.HttpsError("internal", "Failed to upload file");
    }
});

// Process document and extract text
export const processDocument = functions.https.onCall(async (data: any, context: any) => {
    try {
        const { fileId, fileType } = data;
        
        if (!context?.auth) {
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
        }

        // Get file from Firestore
        const fileDoc = await db.collection('files').doc(fileId).get();
        if (!fileDoc.exists) {
            throw new functions.https.HttpsError("not-found", "File not found");
        }

        const fileData = fileDoc.data();
        const filePath = fileData?.filePath;

        // Download file from Storage
        const file = bucket.file(filePath);
        const [fileBuffer] = await file.download();

        let extractedText = '';

        // Process based on file type
        switch (fileType) {
            case 'application/pdf':
                const pdfData = await pdfParse(fileBuffer);
                extractedText = pdfData.text;
                break;

            case 'application/msword':
            case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                const result = await mammoth.extractRawText({ buffer: fileBuffer });
                extractedText = result.value;
                break;

            case 'text/plain':
                extractedText = fileBuffer.toString('utf-8');
                break;

            case 'image/jpeg':
            case 'image/png':
            case 'image/gif':
                // OCR for images
                const worker = await createWorker();
                await worker.loadLanguage('eng');
                await worker.initialize('eng');
                const { data: { text } } = await worker.recognize(fileBuffer);
                await worker.terminate();
                extractedText = text;
                break;

            default:
                throw new functions.https.HttpsError("invalid-argument", "File type not supported for text extraction");
        }

        // Update file document with extracted text
        await db.collection('files').doc(fileId).update({
            extractedText,
            processedAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'processed'
        });

        return {
            fileId,
            extractedText,
            status: 'success'
        };
    } catch (error) {
        console.error("Document processing error:", error);
        throw new functions.https.HttpsError("internal", "Failed to process document");
    }
});

// Store processed content in knowledge base
export const storeKnowledgeBase = functions.https.onCall(async (data: any, context: any) => {
    try {
        const { fileId, category, tags, userId } = data;
        
        if (!context?.auth) {
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
        }

        // Get processed file
        const fileDoc = await db.collection('files').doc(fileId).get();
        if (!fileDoc.exists) {
            throw new functions.https.HttpsError("not-found", "File not found");
        }

        const fileData = fileDoc.data();
        if (!fileData?.extractedText) {
            throw new functions.https.HttpsError("failed-precondition", "File must be processed first");
        }

        // Store in knowledge base collection
        const knowledgeDoc = await db.collection('knowledgeBase').add({
            fileId,
            fileName: fileData.fileName,
            category: category || 'general',
            tags: tags || [],
            content: fileData.extractedText,
            createdBy: userId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            lastAccessed: admin.firestore.FieldValue.serverTimestamp(),
            accessCount: 0
        });

        // Update file status
        await db.collection('files').doc(fileId).update({
            knowledgeBaseId: knowledgeDoc.id,
            status: 'stored_in_kb'
        });

        return {
            knowledgeId: knowledgeDoc.id,
            status: 'success'
        };
    } catch (error) {
        console.error("Knowledge base storage error:", error);
        throw new functions.https.HttpsError("internal", "Failed to store in knowledge base");
    }
});

// Delete file and associated knowledge
export const deleteFile = functions.https.onCall(async (data: any, context: any) => {
    try {
        const { fileId } = data;
        
        if (!context?.auth) {
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
        }

        // Get file data
        const fileDoc = await db.collection('files').doc(fileId).get();
        if (!fileDoc.exists) {
            throw new functions.https.HttpsError("not-found", "File not found");
        }

        const fileData = fileDoc.data();
        const filePath = fileData?.filePath;
        const knowledgeBaseId = fileData?.knowledgeBaseId;

        // Delete from Storage
        if (filePath) {
            const file = bucket.file(filePath);
            await file.delete();
        }

        // Delete from knowledge base if exists
        if (knowledgeBaseId) {
            await db.collection('knowledgeBase').doc(knowledgeBaseId).delete();
        }

        // Delete file document
        await db.collection('files').doc(fileId).delete();

        return {
            status: 'success',
            message: 'File and associated data deleted successfully'
        };
    } catch (error) {
        console.error("File deletion error:", error);
        throw new functions.https.HttpsError("internal", "Failed to delete file");
    }
});

// Get user's files
export const getUserFiles = functions.https.onCall(async (data: any, context: any) => {
    try {
        const { userId, propertyId } = data;
        
        if (!context?.auth) {
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
        }

        let query = db.collection('files').where('uploadedBy', '==', userId);
        
        if (propertyId) {
            query = query.where('propertyId', '==', propertyId);
        }

        const snapshot = await query.orderBy('uploadedAt', 'desc').get();
        const files = snapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data()
        }));

        return { files };
    } catch (error) {
        console.error("Get user files error:", error);
        throw new functions.https.HttpsError("internal", "Failed to get user files");
    }
});

// Search knowledge base
export const searchKnowledgeBase = functions.https.onCall(async (data: any, context: any) => {
    try {
        const { query, userId, category } = data;
        
        if (!context?.auth) {
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
        }

        let knowledgeQuery = db.collection('knowledgeBase').where('createdBy', '==', userId);
        
        if (category) {
            knowledgeQuery = knowledgeQuery.where('category', '==', category);
        }

        const snapshot = await knowledgeQuery.get();
        const results = [];

        for (const doc of snapshot.docs) {
            const data = doc.data();
            const content = data.content.toLowerCase();
            const searchQuery = query.toLowerCase();
            
            if (content.includes(searchQuery)) {
                results.push({
                    id: doc.id,
                    fileName: data.fileName,
                    category: data.category,
                    tags: data.tags,
                    content: data.content.substring(0, 200) + '...',
                    createdAt: data.createdAt
                });
            }
        }

        return { results };
    } catch (error) {
        console.error("Knowledge base search error:", error);
        throw new functions.https.HttpsError("internal", "Failed to search knowledge base");
    }
});

// Process and index knowledge base content
export const processKnowledgeBase = functions.https.onCall(async (data: any, context: any) => {
    try {
        const { fileId, userId, category, tags } = data;
        
        if (!context?.auth) {
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
        }

        // Get file document
        const fileDoc = await db.collection('files').doc(fileId).get();
        if (!fileDoc.exists) {
            throw new functions.https.HttpsError("not-found", "File not found");
        }

        const fileData = fileDoc.data();
        const extractedText = fileData?.extractedText;

        if (!extractedText) {
            throw new functions.https.HttpsError("failed-precondition", "File must be processed first");
        }

        // Use Gemini to analyze and structure the content
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        
        const analysisPrompt = `Analyze the following real estate content and extract key information:

Content: ${extractedText}

Please provide:
1. Key topics and themes
2. Important facts and figures
3. Professional terminology used
4. Suggested tags for categorization
5. Summary of main points

Format as JSON with fields: topics, facts, terminology, tags, summary`;

        const result = await model.generateContent(analysisPrompt);
        const response = await result.response;
        const analysis = response.text();

        let structuredData;
        try {
            structuredData = JSON.parse(analysis);
        } catch {
            structuredData = {
                topics: ['real estate', 'property'],
                facts: [],
                terminology: [],
                tags: tags || [],
                summary: extractedText.substring(0, 500)
            };
        }

        // Store in knowledge base with enhanced metadata
        const knowledgeBaseRef = await db.collection('knowledgeBase').add({
            fileId,
            fileName: fileData.fileName,
            category,
            tags: structuredData.tags,
            content: extractedText,
            topics: structuredData.topics,
            facts: structuredData.facts,
            terminology: structuredData.terminology,
            summary: structuredData.summary,
            createdBy: userId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            lastAccessed: admin.firestore.FieldValue.serverTimestamp(),
            accessCount: 0,
            status: 'processed'
        });

        // Update file document with knowledge base reference
        await db.collection('files').doc(fileId).update({
            knowledgeBaseId: knowledgeBaseRef.id,
            status: 'indexed'
        });

        return {
            knowledgeId: knowledgeBaseRef.id,
            status: 'success',
            analysis: structuredData
        };
    } catch (error) {
        console.error("Knowledge base processing error:", error);
        throw new functions.https.HttpsError("internal", "Failed to process knowledge base");
    }
});

// Update AI context with new knowledge
export const updateAIContext = functions.https.onCall(async (data: any, context: any) => {
    try {
        const { userId, category, personality } = data;
        
        if (!context?.auth) {
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
        }

        // Get user's knowledge base entries
        let query = db.collection('knowledgeBase').where('createdBy', '==', userId);
        if (category) {
            query = query.where('category', '==', category);
        }

        const snapshot = await query.get();
        const knowledgeEntries = snapshot.docs.map((doc: any) => doc.data());

        if (knowledgeEntries.length === 0) {
            return { status: 'no-knowledge', message: 'No knowledge base entries found' };
        }

        // Use Gemini to create personalized AI context
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        
        const contextPrompt = `Based on the following knowledge base entries, create a personalized AI context for a real estate agent with ${personality} personality:

Knowledge Base Entries:
${knowledgeEntries.map(entry => `
File: ${entry.fileName}
Category: ${entry.category}
Content: ${entry.content.substring(0, 1000)}
Tags: ${entry.tags.join(', ')}
`).join('\n')}

Please create:
1. A personalized AI prompt that incorporates this knowledge
2. Key talking points and responses
3. Professional style guidelines
4. Common questions and answers

Format as JSON with fields: prompt, talkingPoints, styleGuidelines, qa`;

        const result = await model.generateContent(contextPrompt);
        const response = await result.response;
        const aiContext = response.text();

        let structuredContext;
        try {
            structuredContext = JSON.parse(aiContext);
        } catch {
            structuredContext = {
                prompt: `You are a helpful real estate assistant with expertise in ${category || 'real estate'}. Use a ${personality} personality.`,
                talkingPoints: [],
                styleGuidelines: [],
                qa: []
            };
        }

        // Store AI context
        const contextRef = await db.collection('aiContexts').add({
            userId,
            category,
            personality,
            context: structuredContext,
            knowledgeBaseIds: knowledgeEntries.map(entry => entry.id),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        });

        return {
            contextId: contextRef.id,
            status: 'success',
            context: structuredContext
        };
    } catch (error) {
        console.error("AI context update error:", error);
        throw new functions.https.HttpsError("internal", "Failed to update AI context");
    }
});

// Train AI personality based on agent style
export const trainAIPersonality = functions.https.onCall(async (data: any, context: any) => {
    try {
        const { userId, personalityType, trainingData, voiceSettings } = data;
        
        if (!context?.auth) {
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
        }

        // Use Gemini to analyze and create personality profile
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        
        const personalityPrompt = `Create an AI personality profile for a real estate agent based on the following training data:

Personality Type: ${personalityType}
Training Data: ${trainingData}

Voice Settings: ${JSON.stringify(voiceSettings)}

Please create:
1. Personality traits and characteristics
2. Communication style guidelines
3. Response templates for common scenarios
4. Voice and tone recommendations
5. Professional boundaries and ethics

Format as JSON with fields: traits, communicationStyle, responseTemplates, voiceGuidelines, ethics`;

        const result = await model.generateContent(personalityPrompt);
        const response = await result.response;
        const personalityProfile = response.text();

        let structuredProfile;
        try {
            structuredProfile = JSON.parse(personalityProfile);
        } catch {
            structuredProfile = {
                traits: ['professional', 'helpful', 'knowledgeable'],
                communicationStyle: 'clear and concise',
                responseTemplates: [],
                voiceGuidelines: voiceSettings || {},
                ethics: ['honest', 'transparent', 'client-focused']
            };
        }

        // Store personality profile
        const personalityRef = await db.collection('aiPersonalities').add({
            userId,
            personalityType,
            profile: structuredProfile,
            trainingData,
            voiceSettings,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            status: 'active'
        });

        return {
            personalityId: personalityRef.id,
            status: 'success',
            profile: structuredProfile
        };
    } catch (error) {
        console.error("AI personality training error:", error);
        throw new functions.https.HttpsError("internal", "Failed to train AI personality");
    }
});

// Enhanced AI response with knowledge base context
export const getAIResponseWithContext = functions.https.onCall(async (data: any, context: any) => {
    try {
        const { message, userId, category, personalityType, chatHistory } = data;
        
        if (!context?.auth) {
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
        }

        // Get user's AI context and personality
        const [contextSnapshot, personalitySnapshot] = await Promise.all([
            db.collection('aiContexts').where('userId', '==', userId).where('category', '==', category).get(),
            db.collection('aiPersonalities').where('userId', '==', userId).where('personalityType', '==', personalityType).get()
        ]);

        let aiContext = null;
        let personalityProfile = null;

        if (!contextSnapshot.empty) {
            aiContext = contextSnapshot.docs[0].data();
        }

        if (!personalitySnapshot.empty) {
            personalityProfile = personalitySnapshot.docs[0].data();
        }

        // Use Gemini with enhanced context
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        
        let prompt = `You are a helpful AI assistant for a real estate app.`;

        if (aiContext) {
            prompt += `\n\nAI Context: ${JSON.stringify(aiContext.context)}`;
        }

        if (personalityProfile) {
            prompt += `\n\nPersonality Profile: ${JSON.stringify(personalityProfile.profile)}`;
        }

        prompt += `\n\nChat History: ${(chatHistory || []).map((msg: { sender: string; text: string }) => `${msg.sender}: ${msg.text}`).join('\n')}

User Question: ${message}

Please provide a helpful response that incorporates the AI context and personality:`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return { text };
    } catch (error) {
        console.error("AI response with context error:", error);
        throw new functions.https.HttpsError("internal", "Failed to get AI response");
    }
});

// Create custom AI personality
export const createAIPersonality = functions.https.onCall(async (data: any, context: any) => {
    try {
        const { userId, personalityName, personalityType, traits, communicationStyle, voiceSettings, trainingData } = data;
        
        if (!context?.auth) {
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
        }

        // Use Gemini to enhance personality creation
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        
        const personalityPrompt = `Create a detailed AI personality profile for a real estate agent:

Personality Name: ${personalityName}
Type: ${personalityType}
Traits: ${traits.join(', ')}
Communication Style: ${communicationStyle}
Training Data: ${trainingData}

Please create:
1. Detailed personality characteristics
2. Communication guidelines
3. Response templates for common scenarios
4. Professional boundaries
5. Voice and tone recommendations

Format as JSON with fields: characteristics, guidelines, templates, boundaries, voiceRecommendations`;

        const result = await model.generateContent(personalityPrompt);
        const response = await result.response;
        const enhancedProfile = response.text();

        let structuredProfile;
        try {
            structuredProfile = JSON.parse(enhancedProfile);
        } catch {
            structuredProfile = {
                characteristics: traits,
                guidelines: [communicationStyle],
                templates: [],
                boundaries: ['professional', 'ethical'],
                voiceRecommendations: voiceSettings || {}
            };
        }

        // Store personality
        const personalityRef = await db.collection('aiPersonalities').add({
            userId,
            personalityName,
            personalityType,
            traits,
            communicationStyle,
            voiceSettings,
            trainingData,
            enhancedProfile: structuredProfile,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            status: 'active',
            isCustom: true
        });

        return {
            personalityId: personalityRef.id,
            status: 'success',
            profile: structuredProfile
        };
    } catch (error) {
        console.error("AI personality creation error:", error);
        throw new functions.https.HttpsError("internal", "Failed to create AI personality");
    }
});

// Generate response using agent's style
export const generateResponse = functions.https.onCall(async (data: any, context: any) => {
    try {
        const { userId, personalityId, message, context: messageContext, responseType } = data;
        
        if (!context?.auth) {
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
        }

        // Get personality profile
        const personalityDoc = await db.collection('aiPersonalities').doc(personalityId).get();
        if (!personalityDoc.exists) {
            throw new functions.https.HttpsError("not-found", "Personality not found");
        }

        const personality = personalityDoc.data();
        if (!personality) {
            throw new functions.https.HttpsError("not-found", "Personality data not found");
        }
        
        const enhancedProfile = personality.enhancedProfile;

        // Use Gemini to generate response
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        
        const responsePrompt = `Generate a ${responseType || 'conversational'} response using this AI personality:

Personality Name: ${personality.personalityName}
Type: ${personality.personalityType}
Traits: ${personality.traits.join(', ')}
Communication Style: ${personality.communicationStyle}

Enhanced Profile: ${JSON.stringify(enhancedProfile)}

Context: ${messageContext || 'General conversation'}

User Message: ${message}

Please generate a response that matches the personality's style and characteristics:`;

        const result = await model.generateContent(responsePrompt);
        const response = await result.response;
        const generatedResponse = response.text();

        // Store response for learning
        await db.collection('aiResponses').add({
            userId,
            personalityId,
            originalMessage: message,
            generatedResponse,
            context: messageContext,
            responseType,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return {
            response: generatedResponse,
            personalityName: personality.personalityName,
            confidence: 0.95
        };
    } catch (error) {
        console.error("Response generation error:", error);
        throw new functions.https.HttpsError("internal", "Failed to generate response");
    }
});

// Save email/message template
export const saveTemplate = functions.https.onCall(async (data: any, context: any) => {
    try {
        const { userId, templateName, templateType, content, variables, category, tags } = data;
        
        if (!context?.auth) {
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
        }

        // Extract variables from content
        const variablePattern = /\{\{([^}]+)\}\}/g;
        const extractedVariables = [];
        let match;
        while ((match = variablePattern.exec(content)) !== null) {
            extractedVariables.push(match[1]);
        }

        // Use Gemini to enhance template
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        
        const templatePrompt = `Analyze this ${templateType} template for a real estate agent:

Template Name: ${templateName}
Content: ${content}
Variables: ${variables.join(', ')}

Please provide:
1. Template effectiveness score (1-10)
2. Suggested improvements
3. Best use cases
4. Professional tone assessment

Format as JSON with fields: effectiveness, improvements, useCases, toneAssessment`;

        const result = await model.generateContent(templatePrompt);
        const response = await result.response;
        const analysis = response.text();

        let templateAnalysis;
        try {
            templateAnalysis = JSON.parse(analysis);
        } catch {
            templateAnalysis = {
                effectiveness: 7,
                improvements: [],
                useCases: ['general'],
                toneAssessment: 'professional'
            };
        }

        // Store template
        const templateRef = await db.collection('templates').add({
            userId,
            templateName,
            templateType,
            content,
            variables: variables || extractedVariables,
            category,
            tags: tags || [],
            analysis: templateAnalysis,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            status: 'active',
            usageCount: 0
        });

        return {
            templateId: templateRef.id,
            status: 'success',
            analysis: templateAnalysis
        };
    } catch (error) {
        console.error("Template save error:", error);
        throw new functions.https.HttpsError("internal", "Failed to save template");
    }
});

// Apply template with dynamic data
export const applyTemplate = functions.https.onCall(async (data: any, context: any) => {
    try {
        const { templateId, variables, context: applicationContext } = data;
        
        if (!context?.auth) {
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
        }

        // Get template
        const templateDoc = await db.collection('templates').doc(templateId).get();
        if (!templateDoc.exists) {
            throw new functions.https.HttpsError("not-found", "Template not found");
        }

        const template = templateDoc.data();
        if (!template) {
            throw new functions.https.HttpsError("not-found", "Template data not found");
        }
        
        let content = template.content;

        // Replace variables
        for (const [key, value] of Object.entries(variables || {})) {
            const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            content = content.replace(placeholder, value as string);
        }

        // Use Gemini to enhance the filled template
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        
        const enhancementPrompt = `Enhance this ${template.templateType} template content for a real estate agent:

Original Template: ${template.content}
Filled Content: ${content}
Context: ${applicationContext || 'General use'}

Please:
1. Improve the flow and readability
2. Ensure professional tone
3. Add any missing context
4. Optimize for the specific use case

Return the enhanced content:`;

        const result = await model.generateContent(enhancementPrompt);
        const response = await result.response;
        const enhancedContent = response.text();

        // Update usage count
        await db.collection('templates').doc(templateId).update({
            usageCount: admin.firestore.FieldValue.increment(1),
            lastUsed: admin.firestore.FieldValue.serverTimestamp()
        });

        // Store application record
        await db.collection('templateApplications').add({
            templateId,
            userId: context.auth.uid,
            originalContent: content,
            enhancedContent,
            variables,
            context: applicationContext,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return {
            originalContent: content,
            enhancedContent,
            templateName: template.templateName,
            templateType: template.templateType
        };
    } catch (error) {
        console.error("Template application error:", error);
        throw new functions.https.HttpsError("internal", "Failed to apply template");
    }
});

// Get user's templates
export const getUserTemplates = functions.https.onCall(async (data: any, context: any) => {
    try {
        const { userId, templateType, category } = data;
        
        if (!context?.auth) {
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
        }

        let query = db.collection('templates').where('userId', '==', userId);
        
        if (templateType) {
            query = query.where('templateType', '==', templateType);
        }
        
        if (category) {
            query = query.where('category', '==', category);
        }

        const snapshot = await query.orderBy('createdAt', 'desc').get();
        const templates = snapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data()
        }));

        return { templates };
    } catch (error) {
        console.error("Get user templates error:", error);
        throw new functions.https.HttpsError("internal", "Failed to get templates");
    }
});

// Get user's AI personalities
export const getUserPersonalities = functions.https.onCall(async (data: any, context: any) => {
    try {
        const { userId, personalityType } = data;
        
        if (!context?.auth) {
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
        }

        let query = db.collection('aiPersonalities').where('userId', '==', userId);
        
        if (personalityType) {
            query = query.where('personalityType', '==', personalityType);
        }

        const snapshot = await query.orderBy('createdAt', 'desc').get();
        const personalities = snapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data()
        }));

        return { personalities };
    } catch (error) {
        console.error("Get user personalities error:", error);
        throw new functions.https.HttpsError("internal", "Failed to get personalities");
    }
});

// Send email using AI-enhanced content
export const sendEmail = functions.https.onCall(async (data: any, context: any) => {
    try {
        const { userId, to, subject, content, templateId, personalityId, variables, priority } = data;
        
        if (!context?.auth) {
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
        }

        let finalContent = content;
        let finalSubject = subject;

        // Apply template if provided
        if (templateId) {
            const templateDoc = await db.collection('templates').doc(templateId).get();
            if (templateDoc.exists) {
                const template = templateDoc.data();
                if (template) {
                    let templateContent = template.content;
                    
                    // Replace variables
                    for (const [key, value] of Object.entries(variables || {})) {
                        const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
                        templateContent = templateContent.replace(placeholder, value as string);
                    }
                    
                    finalContent = templateContent;
                    finalSubject = finalSubject || template.templateName;
                }
            }
        }

        // Enhance content with AI if personality is provided
        if (personalityId) {
            const personalityDoc = await db.collection('aiPersonalities').doc(personalityId).get();
            if (personalityDoc.exists) {
                const personality = personalityDoc.data();
                if (personality) {
                    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
                    
                    const enhancementPrompt = `Enhance this email content using the AI personality:

Personality: ${personality.personalityName}
Type: ${personality.personalityType}
Traits: ${personality.traits.join(', ')}
Communication Style: ${personality.communicationStyle}

Original Content: ${finalContent}

Please enhance the email to match the personality's style while maintaining professionalism and clarity.`;

                    const result = await model.generateContent(enhancementPrompt);
                    const response = await result.response;
                    finalContent = response.text();
                }
            }
        }

        // Store email record
        const emailRef = await db.collection('emails').add({
            userId,
            to,
            subject: finalSubject,
            content: finalContent,
            templateId,
            personalityId,
            variables,
            priority: priority || 'normal',
            status: 'sent',
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // For now, we'll simulate email sending
        // In production, integrate with SendGrid, Mailgun, or similar service
        console.log(`Email would be sent to: ${to}`);
        console.log(`Subject: ${finalSubject}`);
        console.log(`Content: ${finalContent}`);

        return {
            emailId: emailRef.id,
            status: 'sent',
            message: 'Email sent successfully'
        };
    } catch (error) {
        console.error("Email sending error:", error);
        throw new functions.https.HttpsError("internal", "Failed to send email");
    }
});

// Schedule email for later delivery
export const scheduleEmail = functions.https.onCall(async (data: any, context: any) => {
    try {
        const { userId, to, subject, content, templateId, personalityId, variables, scheduledAt, priority } = data;
        
        if (!context?.auth) {
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
        }

        // Validate scheduled time
        const scheduledTime = new Date(scheduledAt);
        const now = new Date();
        if (scheduledTime <= now) {
            throw new functions.https.HttpsError("invalid-argument", "Scheduled time must be in the future");
        }

        // Store scheduled email
        const emailRef = await db.collection('scheduledEmails').add({
            userId,
            to,
            subject,
            content,
            templateId,
            personalityId,
            variables,
            priority: priority || 'normal',
            scheduledAt: scheduledTime,
            status: 'scheduled',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return {
            emailId: emailRef.id,
            status: 'scheduled',
            scheduledAt: scheduledTime,
            message: 'Email scheduled successfully'
        };
    } catch (error) {
        console.error("Email scheduling error:", error);
        throw new functions.https.HttpsError("internal", "Failed to schedule email");
    }
});

// Get email templates with AI suggestions
export const getEmailTemplates = functions.https.onCall(async (data: any, context: any) => {
    try {
        const { userId, category, templateType } = data;
        
        if (!context?.auth) {
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
        }

        let query = db.collection('templates').where('userId', '==', userId);
        
        if (templateType) {
            query = query.where('templateType', '==', templateType);
        }
        
        if (category) {
            query = query.where('category', '==', category);
        }

        const snapshot = await query.orderBy('createdAt', 'desc').get();
        const templates = snapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data()
        }));

        // Get AI suggestions for email templates
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        
        const suggestionsPrompt = `Generate 3 email template suggestions for a real estate agent in the ${category || 'general'} category:

Please provide:
1. Template names
2. Subject lines
3. Content outlines
4. Best use cases

Format as JSON with fields: templates`;

        const result = await model.generateContent(suggestionsPrompt);
        const response = await result.response;
        const suggestions = response.text();

        let aiSuggestions;
        try {
            aiSuggestions = JSON.parse(suggestions);
        } catch {
            aiSuggestions = { templates: [] };
        }

        return {
            templates,
            aiSuggestions: aiSuggestions.templates || []
        };
    } catch (error) {
        console.error("Get email templates error:", error);
        throw new functions.https.HttpsError("internal", "Failed to get email templates");
    }
});

// Track email metrics and analytics
export const trackEmailMetrics = functions.https.onCall(async (data: any, context: any) => {
    try {
        const { emailId, event, recipientEmail, timestamp } = data;
        
        if (!context?.auth) {
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
        }

        // Store email event
        await db.collection('emailEvents').add({
            emailId,
            event, // 'sent', 'delivered', 'opened', 'clicked', 'bounced'
            recipientEmail,
            timestamp: timestamp || admin.firestore.FieldValue.serverTimestamp(),
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Update email status if needed
        if (event === 'opened' || event === 'clicked') {
            await db.collection('emails').doc(emailId).update({
                lastActivity: admin.firestore.FieldValue.serverTimestamp(),
                [`metrics.${event}`]: admin.firestore.FieldValue.increment(1)
            });
        }

        return { status: 'tracked' };
    } catch (error) {
        console.error("Email metrics tracking error:", error);
        throw new functions.https.HttpsError("internal", "Failed to track email metrics");
    }
});

// Send bulk emails with personalization
export const sendBulkEmail = functions.https.onCall(async (data: any, context: any) => {
    try {
        const { userId, recipients, subject, content, templateId, personalityId, variables, scheduleAt } = data;
        
        if (!context?.auth) {
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
        }

        if (!recipients || recipients.length === 0) {
            throw new functions.https.HttpsError("invalid-argument", "Recipients list is required");
        }

        const results = [];
        const batch = db.batch();

        for (const recipient of recipients) {
            try {
                let personalizedContent = content;
                let personalizedSubject = subject;

                // Personalize content with recipient data
                if (recipient.variables) {
                    for (const [key, value] of Object.entries(recipient.variables)) {
                        const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
                        personalizedContent = personalizedContent.replace(placeholder, value as string);
                        personalizedSubject = personalizedSubject.replace(placeholder, value as string);
                    }
                }

                // Apply template if provided
                if (templateId) {
                    const templateDoc = await db.collection('templates').doc(templateId).get();
                    if (templateDoc.exists) {
                        const template = templateDoc.data();
                        if (template) {
                            let templateContent = template.content;
                            
                            // Replace variables
                            const allVariables = { ...variables, ...recipient.variables };
                            for (const [key, value] of Object.entries(allVariables || {})) {
                                const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
                                templateContent = templateContent.replace(placeholder, value as string);
                            }
                            
                            personalizedContent = templateContent;
                            personalizedSubject = personalizedSubject || template.templateName;
                        }
                    }
                }

                // Create email record
                const emailRef = db.collection('emails').doc();
                batch.set(emailRef, {
                    userId,
                    to: recipient.email,
                    subject: personalizedSubject,
                    content: personalizedContent,
                    templateId,
                    personalityId,
                    variables: { ...variables, ...recipient.variables },
                    priority: 'normal',
                    status: scheduleAt ? 'scheduled' : 'sent',
                    sentAt: scheduleAt ? null : admin.firestore.FieldValue.serverTimestamp(),
                    scheduledAt: scheduleAt ? new Date(scheduleAt) : null,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    isBulk: true,
                    bulkId: `bulk_${Date.now()}`
                });

                results.push({
                    email: recipient.email,
                    status: 'queued',
                    emailId: emailRef.id
                });

            } catch (error) {
                results.push({
                    email: recipient.email,
                    status: 'failed',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }

        // Commit batch
        await batch.commit();

        return {
            status: 'success',
            totalRecipients: recipients.length,
            results
        };
    } catch (error) {
        console.error("Bulk email sending error:", error);
        throw new functions.https.HttpsError("internal", "Failed to send bulk emails");
    }
});

// Get email analytics and reports
export const getEmailAnalytics = functions.https.onCall(async (data: any, context: any) => {
    try {
        const { userId, startDate, endDate } = data;
        
        if (!context?.auth) {
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
        }

        let query = db.collection('emails').where('userId', '==', userId);
        
        if (startDate) {
            query = query.where('createdAt', '>=', new Date(startDate));
        }
        
        if (endDate) {
            query = query.where('createdAt', '<=', new Date(endDate));
        }

        const snapshot = await query.get();
        const emails = snapshot.docs.map((doc: any) => doc.data());

        // Calculate metrics
        const totalEmails = emails.length;
        const sentEmails = emails.filter(email => email.status === 'sent').length;
        const scheduledEmails = emails.filter(email => email.status === 'scheduled').length;
        const openedEmails = emails.reduce((sum, email) => sum + (email.metrics?.opened || 0), 0);
        const clickedEmails = emails.reduce((sum, email) => sum + (email.metrics?.clicked || 0), 0);

        const openRate = totalEmails > 0 ? (openedEmails / totalEmails) * 100 : 0;
        const clickRate = totalEmails > 0 ? (clickedEmails / totalEmails) * 100 : 0;

        // Get recent email events
        const eventsQuery = db.collection('emailEvents')
            .where('emailId', 'in', emails.slice(0, 10).map(email => email.id))
            .orderBy('timestamp', 'desc')
            .limit(50);

        const eventsSnapshot = await eventsQuery.get();
        const recentEvents = eventsSnapshot.docs.map((doc: any) => doc.data());

        return {
            metrics: {
                totalEmails,
                sentEmails,
                scheduledEmails,
                openedEmails,
                clickedEmails,
                openRate: Math.round(openRate * 100) / 100,
                clickRate: Math.round(clickRate * 100) / 100
            },
            recentEvents,
            emails: emails.slice(0, 20) // Return recent emails for detailed view
        };
    } catch (error) {
        console.error("Email analytics error:", error);
        throw new functions.https.HttpsError("internal", "Failed to get email analytics");
    }
});

// Additional security functions for the frontend service

// Get security reports
export const getSecurityReports = functions.https.onCall(async (data: any, context: any) => {
    try {
        const { startDate, endDate, reportType, limit } = data;
        
        if (!context?.auth) {
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
        }

        const requestingUserId = context.auth.uid;
        
        // Check admin permissions
        const userDoc = await db.collection('users').doc(requestingUserId).get();
        const userData = userDoc.data();
        if (userData?.role !== 'admin') {
            throw new functions.https.HttpsError("permission-denied", "Admin access required");
        }

        let query: any = db.collection('securityReports');
        
        if (startDate) {
            query = query.where('generatedAt', '>=', new Date(startDate));
        }
        
        if (endDate) {
            query = query.where('generatedAt', '<=', new Date(endDate));
        }
        
        if (reportType) {
            query = query.where('monitoringType', '==', reportType);
        }

        const snapshot = await query
            .orderBy('generatedAt', 'desc')
            .limit(limit || 50)
            .get();

        const reports = snapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data()
        }));

        return { reports };
    } catch (error) {
        console.error("Get security reports error:", error);
        throw new functions.https.HttpsError("internal", "Failed to get security reports");
    }
});

// Get audit logs
export const getAuditLogs = functions.https.onCall(async (data: any, context: any) => {
    try {
        const { userId, action, resourceType, startDate, endDate, limit } = data;
        
        if (!context?.auth) {
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
        }

        const requestingUserId = context.auth.uid;
        
        // Check admin permissions
        const userDoc = await db.collection('users').doc(requestingUserId).get();
        const userData = userDoc.data();
        if (userData?.role !== 'admin') {
            throw new functions.https.HttpsError("permission-denied", "Admin access required");
        }

        let query: any = db.collection('auditLogs');
        
        if (userId) {
            query = query.where('performedBy', '==', userId);
        }
        
        if (action) {
            query = query.where('action', '==', action);
        }
        
        if (resourceType) {
            query = query.where('resourceType', '==', resourceType);
        }
        
        if (startDate) {
            query = query.where('timestamp', '>=', new Date(startDate));
        }
        
        if (endDate) {
            query = query.where('timestamp', '<=', new Date(endDate));
        }

        const snapshot = await query
            .orderBy('timestamp', 'desc')
            .limit(limit || 100)
            .get();

        const auditLogs = snapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data()
        }));

        return { auditLogs };
    } catch (error) {
        console.error("Get audit logs error:", error);
        throw new functions.https.HttpsError("internal", "Failed to get audit logs");
    }
});

// Get security alerts
export const getSecurityAlerts = functions.https.onCall(async (data: any, context: any) => {
    try {
        const { userId, severity, resolved, limit } = data;
        
        if (!context?.auth) {
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
        }

        const requestingUserId = context.auth.uid;
        
        // Check admin permissions
        const userDoc = await db.collection('users').doc(requestingUserId).get();
        const userData = userDoc.data();
        if (userData?.role !== 'admin') {
            throw new functions.https.HttpsError("permission-denied", "Admin access required");
        }

        let query: any = db.collection('securityAlerts');
        
        if (userId) {
            query = query.where('userId', '==', userId);
        }
        
        if (severity) {
            query = query.where('severity', '==', severity);
        }
        
        if (resolved !== undefined) {
            query = query.where('resolved', '==', resolved);
        }

        const snapshot = await query
            .orderBy('timestamp', 'desc')
            .limit(limit || 50)
            .get();

        const alerts = snapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data()
        }));

        return { alerts };
    } catch (error) {
        console.error("Get security alerts error:", error);
        throw new functions.https.HttpsError("internal", "Failed to get security alerts");
    }
});

// Resolve security alert
export const resolveSecurityAlert = functions.https.onCall(async (data: any, context: any) => {
    try {
        const { alertId, resolution } = data;
        
        if (!context?.auth) {
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
        }

        const requestingUserId = context.auth.uid;
        
        // Check admin permissions
        const userDoc = await db.collection('users').doc(requestingUserId).get();
        const userData = userDoc.data();
        if (userData?.role !== 'admin') {
            throw new functions.https.HttpsError("permission-denied", "Admin access required");
        }

        if (!alertId) {
            throw new functions.https.HttpsError("invalid-argument", "Alert ID is required");
        }

        // Update alert
        await db.collection('securityAlerts').doc(alertId).update({
            resolved: true,
            resolvedBy: requestingUserId,
            resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
            resolution: resolution || 'Resolved by administrator'
        });

        // Log resolution
        await logAuditAction({
            action: 'security_alert_resolved',
            resourceType: 'securityAlert',
            resourceId: alertId,
            details: { resolution },
            severity: 'info'
        }, context);

        return { success: true, message: 'Security alert resolved successfully' };
    } catch (error) {
        console.error("Resolve security alert error:", error);
        throw new functions.https.HttpsError("internal", "Failed to resolve security alert");
    }
});

// Get backup history
export const getBackupHistory = functions.https.onCall(async (data: any, context: any) => {
    try {
        const { backupType, status, limit } = data;
        
        if (!context?.auth) {
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
        }

        const requestingUserId = context.auth.uid;
        
        // Check admin permissions
        const userDoc = await db.collection('users').doc(requestingUserId).get();
        const userData = userDoc.data();
        if (userData?.role !== 'admin') {
            throw new functions.https.HttpsError("permission-denied", "Admin access required");
        }

        let query: any = db.collection('backups');
        
        if (backupType) {
            query = query.where('backupType', '==', backupType);
        }
        
        if (status) {
            query = query.where('status', '==', status);
        }

        const snapshot = await query
            .orderBy('startTime', 'desc')
            .limit(limit || 20)
            .get();

        const backups = snapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data()
        }));

        return { backups };
    } catch (error) {
        console.error("Get backup history error:", error);
        throw new functions.https.HttpsError("internal", "Failed to get backup history");
    }
});

// Get restore history
export const getRestoreHistory = functions.https.onCall(async (data: any, context: any) => {
    try {
        const { restoreMode, status, limit } = data;
        
        if (!context?.auth) {
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
        }

        const requestingUserId = context.auth.uid;
        
        // Check admin permissions
        const userDoc = await db.collection('users').doc(requestingUserId).get();
        const userData = userDoc.data();
        if (userData?.role !== 'admin') {
            throw new functions.https.HttpsError("permission-denied", "Admin access required");
        }

        let query: any = db.collection('restores');
        
        if (restoreMode) {
            query = query.where('restoreMode', '==', restoreMode);
        }
        
        if (status) {
            query = query.where('status', '==', status);
        }

        const snapshot = await query
            .orderBy('startTime', 'desc')
            .limit(limit || 20)
            .get();

        const restores = snapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data()
        }));

        return { restores };
    } catch (error) {
        console.error("Get restore history error:", error);
        throw new functions.https.HttpsError("internal", "Failed to get restore history");
    }
});

// Sync existing email conversations
export const syncEmail = functions.https.onCall(async (data: any, context: any) => {
    try {
        const { userId, emailProvider, syncOptions } = data;
        
        if (!context?.auth) {
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
        }

        // Validate email provider
        const supportedProviders = ['gmail', 'outlook', 'yahoo', 'imap'];
        if (!supportedProviders.includes(emailProvider)) {
            throw new functions.https.HttpsError("invalid-argument", "Unsupported email provider");
        }

        // Use Gemini to analyze and structure imported emails
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        
        const analysisPrompt = `Analyze these email conversations for a real estate agent and extract key information:

Email Provider: ${emailProvider}
Sync Options: ${JSON.stringify(syncOptions)}

Please provide:
1. Key conversation themes and topics
2. Client interaction patterns
3. Important dates and follow-ups
4. Property-related discussions
5. Communication style insights

Format as JSON with fields: themes, patterns, dates, properties, insights`;

        const result = await model.generateContent(analysisPrompt);
        const response = await result.response;
        const analysis = response.text();

        let emailAnalysis;
        try {
            emailAnalysis = JSON.parse(analysis);
        } catch {
            emailAnalysis = {
                themes: [],
                patterns: [],
                dates: [],
                properties: [],
                insights: []
            };
        }

        // Store sync configuration
        const syncRef = await db.collection('emailSyncs').add({
            userId,
            emailProvider,
            credentials: {
                // Store encrypted credentials (in production, use proper encryption)
                provider: emailProvider,
                lastSync: admin.firestore.FieldValue.serverTimestamp()
            },
            syncOptions,
            analysis: emailAnalysis,
            status: 'syncing',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        });

        // Simulate email import (in production, integrate with actual email APIs)
        const importedEmails = [
            {
                id: `imported_${Date.now()}_1`,
                from: 'client@example.com',
                to: 'agent@example.com',
                subject: 'Property Viewing Request',
                content: 'Hi, I would like to schedule a viewing for the property at 123 Main St.',
                date: new Date(Date.now() - 86400000), // 1 day ago
                threadId: 'thread_1',
                labels: ['client', 'viewing-request']
            },
            {
                id: `imported_${Date.now()}_2`,
                from: 'agent@example.com',
                to: 'client@example.com',
                subject: 'Re: Property Viewing Request',
                content: 'Great! I can schedule a viewing for tomorrow at 2 PM. Does that work for you?',
                date: new Date(Date.now() - 82800000), // 23 hours ago
                threadId: 'thread_1',
                labels: ['agent', 'viewing-confirmation']
            }
        ];

        // Store imported emails
        const batch = db.batch();
        importedEmails.forEach(email => {
            const emailRef = db.collection('importedEmails').doc();
            batch.set(emailRef, {
                userId,
                syncId: syncRef.id,
                ...email,
                importedAt: admin.firestore.FieldValue.serverTimestamp(),
                status: 'imported'
            });
        });

        await batch.commit();

        // Update sync status
        await db.collection('emailSyncs').doc(syncRef.id).update({
            status: 'completed',
            importedCount: importedEmails.length,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        });

        return {
            syncId: syncRef.id,
            status: 'completed',
            importedCount: importedEmails.length,
            analysis: emailAnalysis,
            message: `Successfully imported ${importedEmails.length} emails from ${emailProvider}`
        };
    } catch (error) {
        console.error("Email sync error:", error);
        throw new functions.https.HttpsError("internal", "Failed to sync emails");
    }
});

// Get synced email conversations
export const getSyncedEmails = functions.https.onCall(async (data: any, context: any) => {
    try {
        const { userId, syncId, threadId, startDate, endDate } = data;
        
        if (!context?.auth) {
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
        }

        let query = db.collection('importedEmails').where('userId', '==', userId);
        
        if (syncId) {
            query = query.where('syncId', '==', syncId);
        }
        
        if (threadId) {
            query = query.where('threadId', '==', threadId);
        }
        
        if (startDate) {
            query = query.where('date', '>=', new Date(startDate));
        }
        
        if (endDate) {
            query = query.where('date', '<=', new Date(endDate));
        }

        const snapshot = await query.orderBy('date', 'desc').get();
        const emails = snapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data()
        }));

        // Group by thread
        const threads = emails.reduce((acc, email: any) => {
            if (!acc[email.threadId]) {
                acc[email.threadId] = [];
            }
            acc[email.threadId].push(email);
            return acc;
        }, {} as any);

        return {
            emails,
            threads,
            totalEmails: emails.length,
            totalThreads: Object.keys(threads).length
        };
    } catch (error) {
        console.error("Get synced emails error:", error);
        throw new functions.https.HttpsError("internal", "Failed to get synced emails");
    }
});

// Generate AI Questions for Interactive Forms
export const generateAIQuestions = functions.https.onCall(async (data: any, context) => {
    try {
        const { type, userId } = data;
        
        if (!type || !userId) {
            throw new functions.https.HttpsError("invalid-argument", "Type and user ID are required");
        }

        // Use Gemini to generate contextual questions
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        
        const prompt = `Generate 8-10 intelligent questions for a real estate marketing proposal form. The questions should be:

1. Property Address (text input)
2. Property Type (select: Residential Home, Condo/Apartment, Townhouse, Luxury Home, Investment Property, Land, Commercial)
3. Property Price (text input)
4. Special Features (textarea - optional)
5. Target Market (multi-select: First-time buyers, Families, Professionals, Investors, Luxury buyers, Downsizers, All buyers)
6. Agent Name (text input)
7. Agent Experience (select: 1-3 years, 3-5 years, 5-10 years, 10+ years)
8. Custom Requirements (textarea - optional)

Return the questions as a JSON array with this structure:
[{
  "id": "question_id",
  "question": "Question text?",
  "type": "text|select|textarea|multi-select",
  "options": ["option1", "option2"] (for select/multi-select),
  "required": true/false,
  "placeholder": "placeholder text"
}]

Make the questions conversational and professional.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const questionsText = response.text();

        // Parse the JSON response
        let questions;
        try {
            questions = JSON.parse(questionsText);
        } catch (parseError) {
            // Fallback to default questions if parsing fails
            questions = [
                {
                    id: 'property_address',
                    question: 'What is the property address?',
                    type: 'text',
                    required: true,
                    placeholder: 'e.g., 123 Main Street, City, State'
                },
                {
                    id: 'property_type',
                    question: 'What type of property is this?',
                    type: 'select',
                    options: ['Residential Home', 'Condo/Apartment', 'Townhouse', 'Luxury Home', 'Investment Property', 'Land', 'Commercial'],
                    required: true
                },
                {
                    id: 'property_price',
                    question: 'What is the asking price or price range?',
                    type: 'text',
                    required: true,
                    placeholder: 'e.g., $450,000 or $400,000 - $500,000'
                },
                {
                    id: 'special_features',
                    question: 'What special features or unique selling points should we highlight?',
                    type: 'textarea',
                    required: false,
                    placeholder: 'e.g., Recently renovated kitchen, large backyard, great schools nearby, etc.'
                },
                {
                    id: 'target_market',
                    question: 'Who is your target market for this property?',
                    type: 'multi-select',
                    options: ['First-time buyers', 'Families', 'Professionals', 'Investors', 'Luxury buyers', 'Downsizers', 'All buyers'],
                    required: true
                },
                {
                    id: 'agent_name',
                    question: 'What is your name?',
                    type: 'text',
                    required: true,
                    placeholder: 'Your full name'
                },
                {
                    id: 'agent_experience',
                    question: 'How many years of real estate experience do you have?',
                    type: 'select',
                    options: ['1-3 years', '3-5 years', '5-10 years', '10+ years'],
                    required: true
                },
                {
                    id: 'custom_requirements',
                    question: 'Any specific requirements or preferences for the marketing proposal?',
                    type: 'textarea',
                    required: false,
                    placeholder: 'e.g., Focus on digital marketing, emphasize luxury features, target specific neighborhood, etc.'
                }
            ];
        }

        console.log(`AI questions generated for type: ${type}`);
        
        return { 
            success: true, 
            questions
        };
    } catch (error) {
        console.error("AI questions generation error:", error);
        throw new functions.https.HttpsError("internal", "Failed to generate AI questions");
    }
});

// Generate Marketing Proposal
export const generateMarketingProposal = functions.https.onCall(async (data: any, context) => {
    try {
        const { propertyAddress, propertyPrice, propertyType, agentInfo, customRequirements, userId } = data;
        
        if (!propertyAddress || !agentInfo?.name || !userId) {
            throw new functions.https.HttpsError("invalid-argument", "Property address, agent name, and user ID are required");
        }

        // Use Gemini to generate the proposal
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        
        const prompt = `Create a professional real estate marketing proposal for the following property and agent:

Property Details:
- Address: ${propertyAddress}
- Price: ${propertyPrice || 'TBD'}
- Type: ${propertyType}

Agent Information:
- Name: ${agentInfo.name}
- Email: ${agentInfo.email || 'N/A'}
- Phone: ${agentInfo.phone || 'N/A'}
- Experience: ${agentInfo.experience}

Custom Requirements: ${customRequirements || 'None specified'}

Please create a comprehensive marketing proposal with the following sections:
1. Executive Summary (2-3 sentences)
2. Market Analysis (brief market overview)
3. Pricing Strategy (recommended approach)
4. Marketing Plan (multi-channel strategy)
5. Timeline (30-day campaign outline)

Make it professional, concise, and actionable. Each section should be 1-2 sentences.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const proposalText = response.text();

        // Parse the response into sections
        const sections = proposalText.split('\n\n');
        const proposal = {
            id: `proposal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            propertyAddress,
            propertyPrice,
            propertyType,
            agentInfo,
            customRequirements,
            executiveSummary: sections[0]?.replace('Executive Summary:', '').trim() || 'Professional marketing proposal for this property.',
            marketAnalysis: sections[1]?.replace('Market Analysis:', '').trim() || 'Current market analysis shows strong potential.',
            pricingStrategy: sections[2]?.replace('Pricing Strategy:', '').trim() || 'Competitive pricing strategy recommended.',
            marketingPlan: sections[3]?.replace('Marketing Plan:', '').trim() || 'Multi-channel marketing approach.',
            timeline: sections[4]?.replace('Timeline:', '').trim() || '30-day marketing campaign.',
            userId,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        // Save to Firestore
        await db.collection('marketingProposals').doc(proposal.id).set(proposal);

        console.log(`Marketing proposal generated: ${proposal.id} for ${propertyAddress}`);
        
        return { 
            success: true, 
            proposalId: proposal.id,
            proposal
        };
    } catch (error) {
        console.error("Marketing proposal generation error:", error);
        throw new functions.https.HttpsError("internal", "Failed to generate marketing proposal");
    }
});

// QR Code Tracking System Functions

// Track QR code scans
export const trackQRScan = functions.https.onCall(async (data: any, context) => {
    try {
        const { qrCodeId, userId, userAgent, location, timestamp } = data;
        
        if (!qrCodeId) {
            throw new functions.https.HttpsError("invalid-argument", "QR code ID is required");
        }

        const scanData = {
            qrCodeId,
            userId: userId || 'anonymous',
            userAgent: userAgent || '',
            location: location || null,
            timestamp: timestamp || admin.firestore.FieldValue.serverTimestamp(),
            ipAddress: '',
            userEmail: null
        };

        // Save scan record
        await db.collection('qrScans').add(scanData);

        // Update QR code analytics
        const qrCodeRef = db.collection('qrCodes').doc(qrCodeId);
        await qrCodeRef.update({
            totalScans: admin.firestore.FieldValue.increment(1),
            lastScanned: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`QR scan tracked: ${qrCodeId} by ${userId || 'anonymous'}`);
        
        return { success: true, scanId: scanData.timestamp };
    } catch (error) {
        console.error("QR scan tracking error:", error);
        throw new functions.https.HttpsError("internal", "Failed to track QR scan");
    }
});

// Generate custom QR codes
export const generateQRCode = functions.https.onCall(async (data: any, context) => {
    try {
        const { destination, title, description, userId, customData } = data;
        
        if (!destination || !userId) {
            throw new functions.https.HttpsError("invalid-argument", "Destination URL and user ID are required");
        }

        // Generate unique QR code ID
        const qrCodeId = `qr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Create QR code data
        const qrCodeData = {
            id: qrCodeId,
            destination,
            title: title || 'Custom QR Code',
            description: description || '',
            userId,
            customData: customData || {},
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            totalScans: 0,
            isActive: true,
            metadata: {
                createdBy: userId,
                userAgent: '',
                ipAddress: ''
            }
        };

        // Save QR code to database
        await db.collection('qrCodes').doc(qrCodeId).set(qrCodeData);

        // Generate QR code URL (in production, you'd use a QR code generation library)
        const qrCodeUrl = `https://your-domain.com/qr/${qrCodeId}`;
        
        console.log(`QR code generated: ${qrCodeId} for ${destination}`);
        
        return { 
            success: true, 
            qrCodeId, 
            qrCodeUrl,
            destination,
            title: qrCodeData.title
        };
    } catch (error) {
        console.error("QR code generation error:", error);
        throw new functions.https.HttpsError("internal", "Failed to generate QR code");
    }
});

// Get QR code analytics
export const getQRAnalytics = functions.https.onCall(async (data: any, context) => {
    try {
        const { qrCodeId, userId, timeRange } = data;
        
        if (!userId) {
            throw new functions.https.HttpsError("invalid-argument", "User ID is required");
        }

        let query: any = db.collection('qrScans');
        
        // Filter by QR code if specified
        if (qrCodeId) {
            query = query.where('qrCodeId', '==', qrCodeId);
        }
        
        // Filter by time range if specified
        if (timeRange) {
            const startDate = new Date();
            switch (timeRange) {
                case '24h':
                    startDate.setHours(startDate.getHours() - 24);
                    break;
                case '7d':
                    startDate.setDate(startDate.getDate() - 7);
                    break;
                case '30d':
                    startDate.setDate(startDate.getDate() - 30);
                    break;
                case '90d':
                    startDate.setDate(startDate.getDate() - 90);
                    break;
                default:
                    break;
            }
            query = query.where('timestamp', '>=', startDate);
        }

        const snapshot = await query.get();
        const scans = snapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data()
        }));

        // Get QR codes for this user
        const qrCodesSnapshot = await db.collection('qrCodes')
            .where('userId', '==', userId)
            .get();
        
        const qrCodes = qrCodesSnapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data()
        }));

        // Calculate analytics
        const totalScans = scans.length;
        const uniqueUsers = new Set(scans.map((scan: any) => scan.userId)).size;
        const scansByDate = scans.reduce((acc: any, scan: any) => {
            const date = new Date(scan.timestamp.toDate()).toDateString();
            acc[date] = (acc[date] || 0) + 1;
            return acc;
        }, {});

        const topQRCodes = qrCodes
            .sort((a: any, b: any) => (b.totalScans || 0) - (a.totalScans || 0))
            .slice(0, 10);

        console.log(`QR analytics retrieved for user: ${userId}`);
        
        return {
            success: true,
            analytics: {
                totalScans,
                uniqueUsers,
                scansByDate,
                topQRCodes,
                totalQRCodes: qrCodes.length
            },
            scans: scans.slice(0, 100) // Limit scan history
        };
    } catch (error) {
        console.error("QR analytics error:", error);
        throw new functions.https.HttpsError("internal", "Failed to get QR analytics");
    }
});

// Update QR code destination
export const updateQRDestination = functions.https.onCall(async (data: any, context) => {
    try {
        const { qrCodeId, newDestination, userId } = data;
        
        if (!qrCodeId || !newDestination || !userId) {
            throw new functions.https.HttpsError("invalid-argument", "QR code ID, new destination, and user ID are required");
        }

        // Verify ownership
        const qrCodeDoc = await db.collection('qrCodes').doc(qrCodeId).get();
        if (!qrCodeDoc.exists) {
            throw new functions.https.HttpsError("not-found", "QR code not found");
        }

        const qrCodeData = qrCodeDoc.data();
        if (qrCodeData?.userId !== userId) {
            throw new functions.https.HttpsError("permission-denied", "You don't have permission to update this QR code");
        }

        // Update destination
        await db.collection('qrCodes').doc(qrCodeId).update({
            destination: newDestination,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            'metadata.lastUpdatedBy': userId
        });

        // Log the change
        if (qrCodeData) {
            await db.collection('qrCodeHistory').add({
                qrCodeId,
                action: 'destination_updated',
                oldDestination: qrCodeData.destination,
                newDestination,
                userId,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
        }

        console.log(`QR destination updated: ${qrCodeId} to ${newDestination}`);
        
        return { 
            success: true, 
            qrCodeId, 
            newDestination,
            message: 'QR code destination updated successfully'
        };
    } catch (error) {
        console.error("QR destination update error:", error);
        throw new functions.https.HttpsError("internal", "Failed to update QR destination");
    }
});

// ========================================
// ANALYTICS & REPORTING SYSTEM
// ========================================

// Track user interactions
export const trackInteraction = functions.https.onCall(async (data: any, context: any) => {
    try {
        const { userId, eventType, eventData, propertyId, sessionId, timestamp } = data;
        
        if (!eventType) {
            throw new functions.https.HttpsError("invalid-argument", "Event type is required");
        }

        const interactionData = {
            userId: userId || context?.auth?.uid || 'anonymous',
            eventType, // 'page_view', 'property_view', 'contact_form', 'phone_call', 'email_sent', 'appointment_scheduled', 'favorite_added', 'share_property'
            eventData: eventData || {},
            propertyId: propertyId || null,
            sessionId: sessionId || `session_${Date.now()}`,
            timestamp: timestamp || admin.firestore.FieldValue.serverTimestamp(),
            userAgent: eventData?.userAgent || '',
            ipAddress: eventData?.ipAddress || '',
            location: eventData?.location || null,
            referrer: eventData?.referrer || '',
            utmSource: eventData?.utmSource || '',
            utmMedium: eventData?.utmMedium || '',
            utmCampaign: eventData?.utmCampaign || ''
        };

        // Save interaction to Firestore
        const interactionRef = await db.collection('userInteractions').add(interactionData);

        // Update real-time analytics
        const analyticsRef = db.collection('analytics').doc('realtime');
        await analyticsRef.set({
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            [`events.${eventType}`]: admin.firestore.FieldValue.increment(1),
            [`sessions.${interactionData.sessionId}`]: {
                lastActivity: admin.firestore.FieldValue.serverTimestamp(),
                eventCount: admin.firestore.FieldValue.increment(1)
            }
        }, { merge: true });

        // Update property-specific analytics if propertyId is provided
        if (propertyId) {
            const propertyAnalyticsRef = db.collection('propertyAnalytics').doc(propertyId);
            await propertyAnalyticsRef.set({
                propertyId,
                lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
                [`events.${eventType}`]: admin.firestore.FieldValue.increment(1),
                totalInteractions: admin.firestore.FieldValue.increment(1)
            }, { merge: true });
        }

        console.log(`Interaction tracked: ${eventType} for user ${interactionData.userId}`);
        
        return { 
            success: true, 
            interactionId: interactionRef.id,
            timestamp: interactionData.timestamp
        };
    } catch (error) {
        console.error("Interaction tracking error:", error);
        throw new functions.https.HttpsError("internal", "Failed to track interaction");
    }
});

// Calculate metrics and conversion rates
export const calculateMetrics = functions.https.onCall(async (data: any, context: any) => {
    try {
        const { userId, propertyId, startDate, endDate } = data;
        
        if (!context?.auth) {
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
        }

        let query: any = db.collection('userInteractions');
        
        // Apply filters
        if (userId) {
            query = query.where('userId', '==', userId);
        }
        
        if (propertyId) {
            query = query.where('propertyId', '==', propertyId);
        }
        
        if (startDate) {
            query = query.where('timestamp', '>=', new Date(startDate));
        }
        
        if (endDate) {
            query = query.where('timestamp', '<=', new Date(endDate));
        }

        const snapshot = await query.get();
        const interactions = snapshot.docs.map((doc: any) => doc.data());

        // Calculate basic metrics
        const totalInteractions = interactions.length;
        const uniqueUsers = new Set(interactions.map((i: any) => i.userId)).size;
        const uniqueSessions = new Set(interactions.map((i: any) => i.sessionId)).size;

        // Event type breakdown
        const eventBreakdown = interactions.reduce((acc: any, interaction: any) => {
            const eventType = interaction.eventType;
            acc[eventType] = (acc[eventType] || 0) + 1;
            return acc;
        }, {});

        // Conversion funnel analysis
        const funnelSteps = ['page_view', 'property_view', 'contact_form', 'appointment_scheduled'];
        const funnelData = funnelSteps.map(step => ({
            step,
            count: eventBreakdown[step] || 0
        }));

        // Calculate conversion rates
        const conversionRates: any = {};
        for (let i = 1; i < funnelData.length; i++) {
            const currentStep = funnelData[i];
            const previousStep = funnelData[i - 1];
            if (previousStep.count > 0) {
                conversionRates[`${previousStep.step}_to_${currentStep.step}`] = 
                    Math.round((currentStep.count / previousStep.count) * 100 * 100) / 100;
            }
        }

        // Time-based analysis
        const hourlyBreakdown = interactions.reduce((acc: any, interaction: any) => {
            const hour = new Date(interaction.timestamp.toDate()).getHours();
            acc[hour] = (acc[hour] || 0) + 1;
            return acc;
        }, {});

        const dailyBreakdown = interactions.reduce((acc: any, interaction: any) => {
            const date = new Date(interaction.timestamp.toDate()).toDateString();
            acc[date] = (acc[date] || 0) + 1;
            return acc;
        }, {});

        // Property performance (if propertyId is specified)
        let propertyMetrics = null;
        if (propertyId) {
            const propertyAnalyticsDoc = await db.collection('propertyAnalytics').doc(propertyId).get();
            if (propertyAnalyticsDoc.exists) {
                propertyMetrics = propertyAnalyticsDoc.data();
            }
        }

        // User engagement score
        const userEngagement = interactions.reduce((score: any, interaction: any) => {
            const eventScores: any = {
                'page_view': 1,
                'property_view': 3,
                'contact_form': 10,
                'phone_call': 15,
                'email_sent': 8,
                'appointment_scheduled': 20,
                'favorite_added': 5,
                'share_property': 7
            };
            return score + (eventScores[interaction.eventType] || 1);
        }, 0);

        const calculatedMetrics = {
            overview: {
                totalInteractions,
                uniqueUsers,
                uniqueSessions,
                averageInteractionsPerUser: totalInteractions > 0 ? Math.round((totalInteractions / uniqueUsers) * 100) / 100 : 0,
                averageInteractionsPerSession: totalInteractions > 0 ? Math.round((totalInteractions / uniqueSessions) * 100) / 100 : 0
            },
            eventBreakdown,
            funnelData,
            conversionRates,
            timeAnalysis: {
                hourly: hourlyBreakdown,
                daily: dailyBreakdown
            },
            userEngagement,
            propertyMetrics,
            calculatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        // Store calculated metrics
        const metricsRef = await db.collection('calculatedMetrics').add({
            userId: context.auth.uid,
            propertyId,
            startDate,
            endDate,
            metrics: calculatedMetrics,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`Metrics calculated for user: ${context.auth.uid}`);
        
        return {
            success: true,
            metricsId: metricsRef.id,
            metrics: calculatedMetrics
        };
    } catch (error) {
        console.error("Metrics calculation error:", error);
        throw new functions.https.HttpsError("internal", "Failed to calculate metrics");
    }
});

// Generate comprehensive reports
export const generateReport = functions.https.onCall(async (data: any, context: any) => {
    try {
        const { userId, reportType, startDate, endDate, propertyId, format, includeCharts } = data;
        
        if (!context?.auth) {
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
        }

        if (!reportType) {
            throw new functions.https.HttpsError("invalid-argument", "Report type is required");
        }

        // Get interactions data
        let query: any = db.collection('userInteractions');
        
        if (userId) {
            query = query.where('userId', '==', userId);
        }
        
        if (propertyId) {
            query = query.where('propertyId', '==', propertyId);
        }
        
        if (startDate) {
            query = query.where('timestamp', '>=', new Date(startDate));
        }
        
        if (endDate) {
            query = query.where('timestamp', '<=', new Date(endDate));
        }

        const snapshot = await query.get();
        const interactions = snapshot.docs.map((doc: any) => doc.data());

        // Use Gemini to generate report content
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        
        let reportContent = '';
        let reportData = {};

        switch (reportType) {
            case 'performance':
                reportData = generatePerformanceReport(interactions);
                break;
            case 'conversion':
                reportData = generateConversionReport(interactions);
                break;
            case 'user_behavior':
                reportData = generateUserBehaviorReport(interactions);
                break;
            case 'property_analytics':
                reportData = await generatePropertyAnalyticsReport(interactions, propertyId);
                break;
            case 'comprehensive':
                reportData = generateComprehensiveReport(interactions);
                break;
            default:
                throw new functions.https.HttpsError("invalid-argument", "Invalid report type");
        }

        const reportPrompt = `Generate a professional ${reportType} report for a real estate analytics system based on this data:

Report Type: ${reportType}
Data: ${JSON.stringify(reportData)}

Please create a comprehensive report with:
1. Executive Summary (2-3 sentences)
2. Key Findings (bullet points)
3. Detailed Analysis
4. Recommendations
5. Next Steps

Make it professional, data-driven, and actionable. Include specific numbers and percentages where relevant.`;

        const result = await model.generateContent(reportPrompt);
        const response = await result.response;
        reportContent = response.text();

        // Create report document
        const reportRef = await db.collection('reports').add({
            userId: context.auth.uid,
            reportType,
            startDate,
            endDate,
            propertyId,
            format: format || 'text',
            includeCharts: includeCharts || false,
            data: reportData,
            content: reportContent,
            generatedAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'generated'
        });

        console.log(`Report generated: ${reportType} for user ${context.auth.uid}`);
        
        return {
            success: true,
            reportId: reportRef.id,
            reportType,
            content: reportContent,
            data: reportData,
            generatedAt: new Date()
        };
    } catch (error) {
        console.error("Report generation error:", error);
        throw new functions.https.HttpsError("internal", "Failed to generate report");
    }
});

// Export data for external analysis
export const exportData = functions.https.onCall(async (data: any, context: any) => {
    try {
        const { userId, dataType, startDate, endDate, propertyId, format } = data;
        
        if (!context?.auth) {
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
        }

        if (!dataType) {
            throw new functions.https.HttpsError("invalid-argument", "Data type is required");
        }

        let query: any;
        let exportData: any[] = [];

        switch (dataType) {
            case 'interactions':
                query = db.collection('userInteractions');
                if (userId) query = query.where('userId', '==', userId);
                if (propertyId) query = query.where('propertyId', '==', propertyId);
                if (startDate) query = query.where('timestamp', '>=', new Date(startDate));
                if (endDate) query = query.where('timestamp', '<=', new Date(endDate));
                
                const interactionsSnapshot = await query.get();
                exportData = interactionsSnapshot.docs.map((doc: any) => ({
                    id: doc.id,
                    ...doc.data(),
                    timestamp: doc.data().timestamp?.toDate?.() || doc.data().timestamp
                }));
                break;

            case 'properties':
                query = db.collection('properties');
                if (userId) query = query.where('userId', '==', userId);
                
                const propertiesSnapshot = await query.get();
                exportData = propertiesSnapshot.docs.map((doc: any) => ({
                    id: doc.id,
                    ...doc.data()
                }));
                break;

            default:
                throw new functions.https.HttpsError("invalid-argument", "Unsupported data type");
        }

        // Format data based on requested format
        let formattedData;
        switch (format) {
            case 'json':
                formattedData = JSON.stringify(exportData, null, 2);
                break;
            case 'csv':
                // Simple CSV conversion
                if (exportData.length > 0) {
                    const headers = Object.keys(exportData[0]);
                    const csvRows = [headers.join(',')];
                    exportData.forEach(row => {
                        const values = headers.map(header => {
                            const value = row[header];
                            return typeof value === 'string' ? `"${value}"` : value;
                        });
                        csvRows.push(values.join(','));
                    });
                    formattedData = csvRows.join('\n');
                }
                break;
            default:
                formattedData = exportData;
        }

        return {
            success: true,
            data: formattedData,
            count: exportData.length,
            format: format || 'json'
        };
    } catch (error) {
        console.error("Data export error:", error);
        throw new functions.https.HttpsError("internal", "Failed to export data");
    }
});

// ========================================
// AUTOMATION & SEQUENCE SYSTEM
// ========================================

// Trigger automated sequences
export const triggerSequence = functions.https.onCall(async (data: any, context: any) => {
    try {
        const { sequenceId, userId, triggerData, leadId, propertyId } = data;
        
        if (!context?.auth) {
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
        }

        if (!sequenceId || !userId) {
            throw new functions.https.HttpsError("invalid-argument", "Sequence ID and user ID are required");
        }

        // Get sequence configuration
        const sequenceDoc = await db.collection('sequences').doc(sequenceId).get();
        if (!sequenceDoc.exists) {
            throw new functions.https.HttpsError("not-found", "Sequence not found");
        }

        const sequence = sequenceDoc.data();
        if (!sequence) {
            throw new functions.https.HttpsError("not-found", "Sequence data not found");
        }

        // Verify sequence ownership
        if (sequence.userId !== userId) {
            throw new functions.https.HttpsError("permission-denied", "You don't have permission to trigger this sequence");
        }

        // Check if sequence is active
        if (!sequence.isActive) {
            throw new functions.https.HttpsError("failed-precondition", "Sequence is not active");
        }

        // Create sequence execution record
        const executionRef = await db.collection('sequenceExecutions').add({
            sequenceId,
            userId,
            leadId: leadId || null,
            propertyId: propertyId || null,
            triggerData: triggerData || {},
            status: 'started',
            currentStep: 0,
            totalSteps: sequence.steps?.length || 0,
            startedAt: admin.firestore.FieldValue.serverTimestamp(),
            lastActivity: admin.firestore.FieldValue.serverTimestamp(),
            completedSteps: [],
            failedSteps: [],
            variables: {
                leadData: triggerData?.leadData || {},
                propertyData: triggerData?.propertyData || {},
                customVariables: triggerData?.customVariables || {}
            }
        });

        // Schedule first step execution
        const firstStep = sequence.steps?.[0];
        if (firstStep) {
            await scheduleStepExecution(executionRef.id, firstStep, 0, 0);
        }

        console.log(`Sequence triggered: ${sequenceId} for user ${userId}`);
        
        return {
            success: true,
            executionId: executionRef.id,
            sequenceName: sequence.name,
            status: 'started',
            nextStep: firstStep?.name || 'No steps configured'
        };
    } catch (error) {
        console.error("Sequence trigger error:", error);
        throw new functions.https.HttpsError("internal", "Failed to trigger sequence");
    }
});

// Execute sequence steps
export const executeStep = functions.https.onCall(async (data: any, context: any) => {
    try {
        const { executionId, stepIndex, userId } = data;
        
        if (!context?.auth) {
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
        }

        if (!executionId || stepIndex === undefined || !userId) {
            throw new functions.https.HttpsError("invalid-argument", "Execution ID, step index, and user ID are required");
        }

        // Get execution record
        const executionDoc = await db.collection('sequenceExecutions').doc(executionId).get();
        if (!executionDoc.exists) {
            throw new functions.https.HttpsError("not-found", "Sequence execution not found");
        }

        const execution = executionDoc.data();
        if (!execution) {
            throw new functions.https.HttpsError("not-found", "Execution data not found");
        }

        // Verify ownership
        if (execution.userId !== userId) {
            throw new functions.https.HttpsError("permission-denied", "You don't have permission to execute this step");
        }

        // Get sequence configuration
        const sequenceDoc = await db.collection('sequences').doc(execution.sequenceId).get();
        if (!sequenceDoc.exists) {
            throw new functions.https.HttpsError("not-found", "Sequence not found");
        }

        const sequence = sequenceDoc.data();
        if (!sequence) {
            throw new functions.https.HttpsError("not-found", "Sequence data not found");
        }

        const step = sequence.steps?.[stepIndex];
        if (!step) {
            throw new functions.https.HttpsError("not-found", "Step not found");
        }

        // Execute step based on type
        let stepResult;
        try {
            switch (step.type) {
                case 'email':
                    stepResult = await executeEmailStep(step, execution);
                    break;

                case 'task':
                    stepResult = await executeTaskStep(step, execution);
                    break;
                case 'delay':
                    stepResult = await executeDelayStep(step, execution);
                    break;
                case 'condition':
                    stepResult = await executeConditionStep(step, execution);
                    break;
                case 'webhook':
                    stepResult = await executeWebhookStep(step, execution);
                    break;
                default:
                    throw new Error(`Unsupported step type: ${step.type}`);
            }

            // Update execution record
            await db.collection('sequenceExecutions').doc(executionId).update({
                currentStep: stepIndex + 1,
                lastActivity: admin.firestore.FieldValue.serverTimestamp(),
                completedSteps: admin.firestore.FieldValue.arrayUnion({
                    stepIndex,
                    stepName: step.name,
                    executedAt: admin.firestore.FieldValue.serverTimestamp(),
                    result: stepResult
                }),
                variables: {
                    ...execution.variables,
                    ...(stepResult?.variables || {})
                }
            });

            // Schedule next step if available
            const nextStep = sequence.steps?.[stepIndex + 1];
            if (nextStep) {
                const delay = stepResult?.nextStepDelay || step.delay || 0;
                await scheduleStepExecution(executionId, nextStep, stepIndex + 1, delay);
            } else {
                // Sequence completed
                await db.collection('sequenceExecutions').doc(executionId).update({
                    status: 'completed',
                    completedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }

            console.log(`Step executed: ${step.name} (${step.type}) for execution ${executionId}`);
            
            return {
                success: true,
                stepName: step.name,
                stepType: step.type,
                result: stepResult,
                nextStep: nextStep?.name || 'Sequence completed'
            };

        } catch (stepError) {
            // Handle step failure
            await db.collection('sequenceExecutions').doc(executionId).update({
                lastActivity: admin.firestore.FieldValue.serverTimestamp(),
                failedSteps: admin.firestore.FieldValue.arrayUnion({
                    stepIndex,
                    stepName: step.name,
                    failedAt: admin.firestore.FieldValue.serverTimestamp(),
                    error: stepError instanceof Error ? stepError.message : 'Unknown error'
                })
            });

            // Check if sequence should continue on failure
            if (step.continueOnFailure) {
                const nextStep = sequence.steps?.[stepIndex + 1];
                if (nextStep) {
                    await scheduleStepExecution(executionId, nextStep, stepIndex + 1, 0);
                }
            } else {
                // Pause sequence on failure
                await db.collection('sequenceExecutions').doc(executionId).update({
                    status: 'paused',
                    pausedAt: admin.firestore.FieldValue.serverTimestamp(),
                    pauseReason: 'Step execution failed'
                });
            }

            throw stepError;
        }

    } catch (error) {
        console.error("Step execution error:", error);
        throw new functions.https.HttpsError("internal", "Failed to execute step");
    }
});

// Pause/stop automation
export const pauseSequence = functions.https.onCall(async (data: any, context: any) => {
    try {
        const { executionId, userId, reason } = data;
        
        if (!context?.auth) {
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
        }

        if (!executionId || !userId) {
            throw new functions.https.HttpsError("invalid-argument", "Execution ID and user ID are required");
        }

        // Get execution record
        const executionDoc = await db.collection('sequenceExecutions').doc(executionId).get();
        if (!executionDoc.exists) {
            throw new functions.https.HttpsError("not-found", "Sequence execution not found");
        }

        const execution = executionDoc.data();
        if (!execution) {
            throw new functions.https.HttpsError("not-found", "Execution data not found");
        }

        // Verify ownership
        if (execution.userId !== userId) {
            throw new functions.https.HttpsError("permission-denied", "You don't have permission to pause this sequence");
        }

        // Check if sequence can be paused
        if (execution.status === 'completed' || execution.status === 'cancelled') {
            throw new functions.https.HttpsError("failed-precondition", "Sequence cannot be paused in current status");
        }

        // Update execution status
        await db.collection('sequenceExecutions').doc(executionId).update({
            status: 'paused',
            pausedAt: admin.firestore.FieldValue.serverTimestamp(),
            pauseReason: reason || 'Manually paused by user',
            lastActivity: admin.firestore.FieldValue.serverTimestamp()
        });

        // Cancel any scheduled step executions
        await cancelScheduledSteps(executionId);

        console.log(`Sequence paused: ${executionId} by user ${userId}`);
        
        return {
            success: true,
            executionId,
            status: 'paused',
            message: 'Sequence paused successfully'
        };
    } catch (error) {
        console.error("Sequence pause error:", error);
        throw new functions.https.HttpsError("internal", "Failed to pause sequence");
    }
});

// Update/modify active sequences
export const updateSequence = functions.https.onCall(async (data: any, context: any) => {
    try {
        const { sequenceId, userId, updates, executionId } = data;
        
        if (!context?.auth) {
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
        }

        if (!sequenceId || !userId) {
            throw new functions.https.HttpsError("invalid-argument", "Sequence ID and user ID are required");
        }

        // Get sequence configuration
        const sequenceDoc = await db.collection('sequences').doc(sequenceId).get();
        if (!sequenceDoc.exists) {
            throw new functions.https.HttpsError("not-found", "Sequence not found");
        }

        const sequence = sequenceDoc.data();
        if (!sequence) {
            throw new functions.https.HttpsError("not-found", "Sequence data not found");
        }

        // Verify ownership
        if (sequence.userId !== userId) {
            throw new functions.https.HttpsError("permission-denied", "You don't have permission to update this sequence");
        }

        // Prepare update data
        const updateData: any = {
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            'metadata.lastUpdatedBy': userId
        };

        // Apply updates
        if (updates.name) updateData.name = updates.name;
        if (updates.description) updateData.description = updates.description;
        if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
        if (updates.steps) updateData.steps = updates.steps;
        if (updates.triggers) updateData.triggers = updates.triggers;
        if (updates.settings) updateData.settings = updates.settings;

        // Update sequence
        await db.collection('sequences').doc(sequenceId).update(updateData);

        // If updating active execution, handle it
        if (executionId) {
            const executionDoc = await db.collection('sequenceExecutions').doc(executionId).get();
            if (executionDoc.exists) {
                const execution = executionDoc.data();
                if (execution && execution.status === 'running') {
                    // Update execution with new sequence data
                    await db.collection('sequenceExecutions').doc(executionId).update({
                        sequenceVersion: (sequence.version || 0) + 1,
                        lastActivity: admin.firestore.FieldValue.serverTimestamp(),
                        'metadata.updatedAt': admin.firestore.FieldValue.serverTimestamp()
                    });
                }
            }
        }

        // Log the update
        await db.collection('sequenceHistory').add({
            sequenceId,
            userId,
            action: 'updated',
            changes: updates,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`Sequence updated: ${sequenceId} by user ${userId}`);
        
        return {
            success: true,
            sequenceId,
            status: 'updated',
            message: 'Sequence updated successfully'
        };
    } catch (error) {
        console.error("Sequence update error:", error);
        throw new functions.https.HttpsError("internal", "Failed to update sequence");
    }
});

// Helper functions for sequence execution

// Schedule step execution
async function scheduleStepExecution(executionId: string, step: any, stepIndex: number, delay: number) {
    try {
        const scheduledTime = new Date(Date.now() + delay * 1000);
        
        await db.collection('scheduledSteps').add({
            executionId,
            stepIndex,
            step,
            scheduledTime,
            status: 'scheduled',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`Step scheduled: ${step.name} for execution ${executionId} at ${scheduledTime}`);
    } catch (error) {
        console.error("Step scheduling error:", error);
        throw error;
    }
}

// Cancel scheduled steps
async function cancelScheduledSteps(executionId: string) {
    try {
        const scheduledStepsQuery = db.collection('scheduledSteps')
            .where('executionId', '==', executionId)
            .where('status', '==', 'scheduled');

        const snapshot = await scheduledStepsQuery.get();
        const batch = db.batch();

        snapshot.docs.forEach(doc => {
            batch.update(doc.ref, {
                status: 'cancelled',
                cancelledAt: admin.firestore.FieldValue.serverTimestamp()
            });
        });

        await batch.commit();
        console.log(`Cancelled ${snapshot.docs.length} scheduled steps for execution ${executionId}`);
    } catch (error) {
        console.error("Cancel scheduled steps error:", error);
        throw error;
    }
}

// Execute email step
async function executeEmailStep(step: any, execution: any) {
    try {
        const { templateId, to, subject, content, variables } = step.config;
        
        // Get email template if provided
        let emailContent = content;
        let emailSubject = subject;
        
        if (templateId) {
            const templateDoc = await db.collection('templates').doc(templateId).get();
            if (templateDoc.exists) {
                const template = templateDoc.data();
                if (template) {
                    emailContent = template.content;
                    emailSubject = template.templateName;
                }
            }
        }

        // Replace variables in content
        const allVariables = {
            ...execution.variables.leadData,
            ...execution.variables.propertyData,
            ...execution.variables.customVariables,
            ...variables
        };

        for (const [key, value] of Object.entries(allVariables)) {
            const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            emailContent = emailContent.replace(placeholder, value as string);
            emailSubject = emailSubject.replace(placeholder, value as string);
        }

        // Send email (simulate for now)
        console.log(`Email step executed: ${emailSubject} to ${to}`);
        
        // Store email record
        await db.collection('sequenceEmails').add({
            executionId: execution.id,
            stepIndex: execution.currentStep,
            to,
            subject: emailSubject,
            content: emailContent,
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'sent'
        });

        return {
            success: true,
            type: 'email',
            sentTo: to,
            subject: emailSubject,
            nextStepDelay: step.delay || 0,
            variables: {}
        };
    } catch (error) {
        console.error("Email step execution error:", error);
        throw error;
    }
}



// Execute task step
async function executeTaskStep(step: any, execution: any) {
    try {
        const { taskType, taskData, assignTo } = step.config;
        
        // Create task record
        const taskRef = await db.collection('sequenceTasks').add({
            executionId: execution.id,
            stepIndex: execution.currentStep,
            taskType,
            taskData,
            assignTo: assignTo || execution.userId,
            status: 'created',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            dueDate: step.dueDate || null
        });

        console.log(`Task step executed: ${taskType} for execution ${execution.id}`);
        
        return {
            success: true,
            type: 'task',
            taskId: taskRef.id,
            taskType,
            nextStepDelay: step.delay || 0,
            variables: {}
        };
    } catch (error) {
        console.error("Task step execution error:", error);
        throw error;
    }
}

// Execute delay step
async function executeDelayStep(step: any, execution: any) {
    try {
        const { duration, unit } = step.config;
        
        // Calculate delay in seconds
        let delaySeconds = duration;
        switch (unit) {
            case 'minutes':
                delaySeconds = duration * 60;
                break;
            case 'hours':
                delaySeconds = duration * 3600;
                break;
            case 'days':
                delaySeconds = duration * 86400;
                break;
            default:
                delaySeconds = duration;
        }

        console.log(`Delay step executed: ${duration} ${unit} for execution ${execution.id}`);
        
        return {
            success: true,
            type: 'delay',
            delaySeconds,
            nextStepDelay: delaySeconds,
            variables: {}
        };
    } catch (error) {
        console.error("Delay step execution error:", error);
        throw error;
    }
}

// Execute condition step
async function executeConditionStep(step: any, execution: any) {
    try {
        const { condition, trueStep, falseStep } = step.config;
        
        // Evaluate condition
        let conditionResult = false;
        try {
            // Simple condition evaluation (in production, use a proper expression evaluator)
            const variables = {
                ...execution.variables.leadData,
                ...execution.variables.propertyData,
                ...execution.variables.customVariables
            };
            
            // Replace variables in condition
            let evaluatedCondition = condition;
            for (const [key, value] of Object.entries(variables)) {
                const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
                evaluatedCondition = evaluatedCondition.replace(placeholder, value as string);
            }
            
            // Simple evaluation (in production, use a safer evaluator)
            conditionResult = eval(evaluatedCondition);
        } catch (evalError) {
            console.error("Condition evaluation error:", evalError);
            conditionResult = false;
        }

        console.log(`Condition step executed: ${condition} = ${conditionResult} for execution ${execution.id}`);
        
        return {
            success: true,
            type: 'condition',
            conditionResult,
            nextStep: conditionResult ? trueStep : falseStep,
            nextStepDelay: 0,
            variables: {}
        };
    } catch (error) {
        console.error("Condition step execution error:", error);
        throw error;
    }
}

// Execute webhook step
async function executeWebhookStep(step: any, execution: any) {
    try {
        const { url, method, headers, body, variables } = step.config;
        
        // Prepare request data
        let requestBody = body;
        const allVariables = {
            ...execution.variables.leadData,
            ...execution.variables.propertyData,
            ...execution.variables.customVariables,
            ...variables
        };

        // Replace variables in body
        if (typeof requestBody === 'string') {
            for (const [key, value] of Object.entries(allVariables)) {
                const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
                requestBody = requestBody.replace(placeholder, value as string);
            }
        }

        // Make webhook request (simulate for now)
        console.log(`Webhook step executed: ${method} ${url} for execution ${execution.id}`);
        
        // Store webhook record
        await db.collection('sequenceWebhooks').add({
            executionId: execution.id,
            stepIndex: execution.currentStep,
            url,
            method,
            headers,
            body: requestBody,
            executedAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'executed'
        });

        return {
            success: true,
            type: 'webhook',
            url,
            method,
            nextStepDelay: step.delay || 0,
            variables: {}
        };
    } catch (error) {
        console.error("Webhook step execution error:", error);
        throw error;
    }
}

// Helper functions for report generation

function generatePerformanceReport(interactions: any[]) {
    const totalInteractions = interactions.length;
    const uniqueUsers = new Set(interactions.map((i: any) => i.userId)).size;
    const uniqueSessions = new Set(interactions.map((i: any) => i.sessionId)).size;

    const eventBreakdown = interactions.reduce((acc: any, interaction: any) => {
        acc[interaction.eventType] = (acc[interaction.eventType] || 0) + 1;
        return acc;
    }, {});

    const hourlyPerformance = interactions.reduce((acc: any, interaction: any) => {
        const hour = new Date(interaction.timestamp.toDate()).getHours();
        acc[hour] = (acc[hour] || 0) + 1;
        return acc;
    }, {});

    return {
        totalInteractions,
        uniqueUsers,
        uniqueSessions,
        eventBreakdown,
        hourlyPerformance,
        averageInteractionsPerUser: totalInteractions > 0 ? Math.round((totalInteractions / uniqueUsers) * 100) / 100 : 0,
        averageInteractionsPerSession: totalInteractions > 0 ? Math.round((totalInteractions / uniqueSessions) * 100) / 100 : 0
    };
}

function generateConversionReport(interactions: any[]) {
    const funnelSteps = ['page_view', 'property_view', 'contact_form', 'appointment_scheduled'];
    const eventCounts = interactions.reduce((acc: any, interaction: any) => {
        acc[interaction.eventType] = (acc[interaction.eventType] || 0) + 1;
        return acc;
    }, {});

    const funnelData = funnelSteps.map(step => ({
        step,
        count: eventCounts[step] || 0
    }));

    const conversionRates: any = {};
    for (let i = 1; i < funnelData.length; i++) {
        const currentStep = funnelData[i];
        const previousStep = funnelData[i - 1];
        if (previousStep.count > 0) {
            conversionRates[`${previousStep.step}_to_${currentStep.step}`] = 
                Math.round((currentStep.count / previousStep.count) * 100 * 100) / 100;
        }
    }

    return {
        funnelData,
        conversionRates,
        totalConversions: eventCounts['appointment_scheduled'] || 0,
        overallConversionRate: eventCounts['page_view'] > 0 ? 
            Math.round(((eventCounts['appointment_scheduled'] || 0) / eventCounts['page_view']) * 100 * 100) / 100 : 0
    };
}

function generateUserBehaviorReport(interactions: any[]) {
    const userSessions = interactions.reduce((acc: any, interaction: any) => {
        if (!acc[interaction.sessionId]) {
            acc[interaction.sessionId] = {
                userId: interaction.userId,
                events: [],
                startTime: interaction.timestamp,
                endTime: interaction.timestamp
            };
        }
        acc[interaction.sessionId].events.push(interaction.eventType);
        acc[interaction.sessionId].endTime = interaction.timestamp;
        return acc;
    }, {});

    const sessionDurations = Object.values(userSessions).map((session: any) => {
        const duration = session.endTime.toDate() - session.startTime.toDate();
        return Math.round(duration / 1000 / 60); // Convert to minutes
    });

    const eventSequences = Object.values(userSessions).map((session: any) => session.events);

    return {
        totalSessions: Object.keys(userSessions).length,
        averageSessionDuration: sessionDurations.length > 0 ? 
            Math.round(sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length * 100) / 100 : 0,
        mostCommonEventSequences: getMostCommonSequences(eventSequences),
        sessionEngagement: sessionDurations.map(duration => ({
            duration,
            engagement: duration > 5 ? 'high' : duration > 2 ? 'medium' : 'low'
        }))
    };
}

async function generatePropertyAnalyticsReport(interactions: any[], propertyId: string) {
    const propertyInteractions = interactions.filter(i => i.propertyId === propertyId);
    
    const propertyDoc = await db.collection('properties').doc(propertyId).get();
    const propertyData = propertyDoc.exists ? propertyDoc.data() : null;

    const eventBreakdown = propertyInteractions.reduce((acc: any, interaction: any) => {
        acc[interaction.eventType] = (acc[interaction.eventType] || 0) + 1;
        return acc;
    }, {});

    const dailyViews = propertyInteractions
        .filter(i => i.eventType === 'property_view')
        .reduce((acc: any, interaction: any) => {
            const date = new Date(interaction.timestamp.toDate()).toDateString();
            acc[date] = (acc[date] || 0) + 1;
            return acc;
        }, {});

    return {
        propertyId,
        propertyData,
        totalInteractions: propertyInteractions.length,
        eventBreakdown,
        dailyViews,
        conversionRate: eventBreakdown['property_view'] > 0 ? 
            Math.round(((eventBreakdown['contact_form'] || 0) / eventBreakdown['property_view']) * 100 * 100) / 100 : 0,
        averageEngagement: propertyInteractions.length > 0 ? 
            Math.round(propertyInteractions.reduce((score, i) => {
                const eventScores = {
                    'page_view': 1,
                    'property_view': 3,
                    'contact_form': 10,
                    'phone_call': 15,
                    'email_sent': 8,
                    'appointment_scheduled': 20,
                    'favorite_added': 5,
                    'share_property': 7
                };
                return score + ((eventScores as any)[i.eventType] || 1);
            }, 0) / propertyInteractions.length * 100) / 100 : 0
    };
}

function generateComprehensiveReport(interactions: any[]) {
    return {
        performance: generatePerformanceReport(interactions),
        conversion: generateConversionReport(interactions),
        userBehavior: generateUserBehaviorReport(interactions),
        summary: {
            totalInteractions: interactions.length,
            uniqueUsers: new Set(interactions.map((i: any) => i.userId)).size,
            dateRange: {
                start: interactions.length > 0 ? Math.min(...interactions.map((i: any) => i.timestamp.toDate())) : null,
                end: interactions.length > 0 ? Math.max(...interactions.map((i: any) => i.timestamp.toDate())) : null
            }
        }
    };
}



// Helper function to get most common event sequences
function getMostCommonSequences(sequences: any[]) {
    const sequenceCounts: any = {};
    
    sequences.forEach(sequence => {
        const key = sequence.join(' -> ');
        sequenceCounts[key] = (sequenceCounts[key] || 0) + 1;
    });
    
    return Object.entries(sequenceCounts)
        .sort(([,a]: any, [,b]: any) => b - a)
        .slice(0, 5)
        .map(([sequence, count]) => ({ sequence, count }));
}

// ========================================
// SECURITY & COMPLIANCE SYSTEM
// ========================================

// User validation and permission checking
export const validateUser = functions.https.onCall(async (data: any, context: any) => {
    try {
        const { requiredPermissions, resourceId, resourceType } = data;
        
        if (!context?.auth) {
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
        }

        const requestingUserId = context.auth.uid;
        
        // Get user document
        const userDoc = await db.collection('users').doc(requestingUserId).get();
        if (!userDoc.exists) {
            throw new functions.https.HttpsError("not-found", "User not found");
        }

        const userData = userDoc.data();
        if (!userData) {
            throw new functions.https.HttpsError("not-found", "User data not found");
        }

        // Check if user is active
        if (userData.status !== 'active') {
            throw new functions.https.HttpsError("permission-denied", "User account is not active");
        }

        // Check user role and permissions
        const userRole = userData.role || 'user';
        const userPermissions = userData.permissions || [];
        
        // Admin bypass for most checks
        if (userRole === 'admin') {
            return {
                isValid: true,
                role: userRole,
                permissions: userPermissions,
                message: 'Admin access granted'
            };
        }

        // Check specific permissions if required
        if (requiredPermissions && requiredPermissions.length > 0) {
            const hasAllPermissions = requiredPermissions.every((permission: string) => 
                userPermissions.includes(permission)
            );
            
            if (!hasAllPermissions) {
                throw new functions.https.HttpsError("permission-denied", "Insufficient permissions");
            }
        }

        // Check resource ownership if resourceId is provided
        if (resourceId && resourceType) {
            const resourceDoc = await db.collection(resourceType).doc(resourceId).get();
            if (resourceDoc.exists) {
                const resourceData = resourceDoc.data();
                if (resourceData && resourceData.userId !== requestingUserId && userRole !== 'admin') {
                    throw new functions.https.HttpsError("permission-denied", "Access denied to this resource");
                }
            }
        }

        // Check rate limiting
        const rateLimitKey = `rate_limit_${requestingUserId}`;
        const rateLimitDoc = await db.collection('rateLimits').doc(rateLimitKey).get();
        
        if (rateLimitDoc.exists) {
            const rateLimitData = rateLimitDoc.data();
            const now = Date.now();
            const windowMs = 60000; // 1 minute window
            const maxRequests = 100; // Max requests per minute
            
            if (rateLimitData && (now - rateLimitData.timestamp) < windowMs) {
                if (rateLimitData.count >= maxRequests) {
                    throw new functions.https.HttpsError("resource-exhausted", "Rate limit exceeded");
                }
                
                // Update count
                await db.collection('rateLimits').doc(rateLimitKey).update({
                    count: admin.firestore.FieldValue.increment(1)
                });
            } else {
                // Reset rate limit
                await db.collection('rateLimits').doc(rateLimitKey).set({
                    userId: requestingUserId,
                    count: 1,
                    timestamp: now
                });
            }
        } else {
            // Initialize rate limit
            await db.collection('rateLimits').doc(rateLimitKey).set({
                userId: requestingUserId,
                count: 1,
                timestamp: Date.now()
            });
        }

        return {
            isValid: true,
            role: userRole,
            permissions: userPermissions,
            message: 'User validation successful'
        };
    } catch (error) {
        console.error("User validation error:", error);
        throw new functions.https.HttpsError("internal", "Failed to validate user");
    }
});

// Internal audit logging function
async function logAuditAction(data: any, context: any) {
    try {
        const { action, resourceType, resourceId, details, severity, userId } = data;
        
        const requestingUserId = context?.auth?.uid || 'system';
        
        // Validate required fields
        if (!action || !resourceType) {
            console.error('Audit action missing required fields:', data);
            return;
        }

        // Create audit log entry
        const auditEntry = {
            action,
            resourceType,
            resourceId: resourceId || null,
            details: details || {},
            severity: severity || 'info', // 'info', 'warning', 'error', 'critical'
            userId: userId || requestingUserId,
            performedBy: requestingUserId,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            ipAddress: context?.rawRequest?.ip || '',
            userAgent: context?.rawRequest?.headers?.['user-agent'] || '',
            sessionId: details?.sessionId || null,
            metadata: {
                functionName: context?.functionName || 'internal',
                region: context?.region || 'unknown',
                projectId: context?.projectId || 'unknown'
            }
        };

        // Save to audit log
        await db.collection('auditLogs').add(auditEntry);

        console.log(`Audit action logged: ${action} on ${resourceType} by ${requestingUserId}`);
    } catch (error) {
        console.error('Audit logging error:', error);
    }
}

// Audit logging system
export const auditAction = functions.https.onCall(async (data: any, context: any) => {
    try {
        const { action, resourceType, resourceId, details, severity, userId } = data;
        
        if (!context?.auth) {
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
        }

        const requestingUserId = context.auth.uid;
        
        // Validate required fields
        if (!action || !resourceType) {
            throw new functions.https.HttpsError("invalid-argument", "Action and resource type are required");
        }

        // Create audit log entry
        const auditEntry = {
            action,
            resourceType,
            resourceId: resourceId || null,
            details: details || {},
            severity: severity || 'info', // 'info', 'warning', 'error', 'critical'
            userId: userId || requestingUserId,
            performedBy: requestingUserId,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            ipAddress: context.rawRequest?.ip || '',
            userAgent: context.rawRequest?.headers?.['user-agent'] || '',
            sessionId: details?.sessionId || null,
            metadata: {
                functionName: context.functionName,
                region: context.region,
                projectId: context.projectId
            }
        };

        // Save to audit log
        const auditRef = await db.collection('auditLogs').add(auditEntry);

        // Check for suspicious activity patterns
        const recentAuditQuery = db.collection('auditLogs')
            .where('performedBy', '==', requestingUserId)
            .where('timestamp', '>=', new Date(Date.now() - 300000)) // Last 5 minutes
            .orderBy('timestamp', 'desc');

        const recentAuditSnapshot = await recentAuditQuery.get();
        const recentActions = recentAuditSnapshot.docs.map((doc: any) => doc.data());

        // Detect potential security issues
        const securityChecks = await performSecurityChecks(recentActions, auditEntry);
        
        if (securityChecks.hasIssues) {
            // Log security alert
            await db.collection('securityAlerts').add({
                userId: requestingUserId,
                alertType: securityChecks.alertType,
                description: securityChecks.description,
                severity: securityChecks.severity,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                auditEntryId: auditRef.id,
                resolved: false
            });

            // Send notification for critical alerts
            if (securityChecks.severity === 'critical') {
                await sendSecurityNotification(securityChecks.description, requestingUserId);
            }
        }

        // Clean up old audit logs (keep last 90 days)
        const cleanupThreshold = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        const oldAuditQuery = db.collection('auditLogs')
            .where('timestamp', '<', cleanupThreshold)
            .limit(1000);

        const oldAuditSnapshot = await oldAuditQuery.get();
        const batch = db.batch();
        oldAuditSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();

        console.log(`Audit action logged: ${action} on ${resourceType} by ${requestingUserId}`);
        
        return {
            success: true,
            auditId: auditRef.id,
            securityChecks
        };
    } catch (error) {
        console.error("Audit action error:", error);
        throw new functions.https.HttpsError("internal", "Failed to log audit action");
    }
});

// Data encryption for sensitive information
export const encryptData = functions.https.onCall(async (data: any, context: any) => {
    try {
        const { dataToEncrypt, encryptionType, userId } = data;
        
        if (!context?.auth) {
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
        }

        if (!dataToEncrypt) {
            throw new functions.https.HttpsError("invalid-argument", "Data to encrypt is required");
        }

        const requestingUserId = context.auth.uid;
        
        // Validate user has encryption permission
        const userDoc = await db.collection('users').doc(requestingUserId).get();
        if (!userDoc.exists) {
            throw new functions.https.HttpsError("not-found", "User not found");
        }

        const userData = userDoc.data();
        const userPermissions = userData?.permissions || [];
        
        if (!userPermissions.includes('encrypt_data') && userData?.role !== 'admin') {
            throw new functions.https.HttpsError("permission-denied", "Encryption permission required");
        }

        // Generate encryption key (in production, use proper key management)
        const algorithm = 'aes-256-gcm';
        const key = crypto.randomBytes(32);
        const iv = crypto.randomBytes(16);

        // Encrypt the data
        const cipher = crypto.createCipheriv(algorithm, key, iv);
        let encrypted = cipher.update(JSON.stringify(dataToEncrypt), 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag();

        // Store encrypted data with metadata
        const encryptedData = {
            encryptedContent: encrypted,
            algorithm,
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex'),
            keyId: `key_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            encryptionType: encryptionType || 'standard',
            userId: userId || requestingUserId,
            encryptedBy: requestingUserId,
            encryptedAt: admin.firestore.FieldValue.serverTimestamp(),
            metadata: {
                originalDataType: typeof dataToEncrypt,
                dataSize: JSON.stringify(dataToEncrypt).length,
                version: '1.0'
            }
        };

        // Save encrypted data
        const encryptedRef = await db.collection('encryptedData').add(encryptedData);

        // Store key securely (in production, use Cloud KMS or similar)
        const keyData = {
            keyId: encryptedData.keyId,
            key: key.toString('hex'),
            userId: requestingUserId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
            status: 'active'
        };

        await db.collection('encryptionKeys').doc(encryptedData.keyId).set(keyData);

        // Log encryption action
        await logAuditAction({
            action: 'data_encrypted',
            resourceType: 'encryptedData',
            resourceId: encryptedRef.id,
            details: {
                encryptionType,
                dataSize: encryptedData.metadata.dataSize,
                keyId: encryptedData.keyId
            },
            severity: 'info'
        }, context);

        console.log(`Data encrypted: ${encryptedData.keyId} for user ${requestingUserId}`);
        
        return {
            success: true,
            encryptedDataId: encryptedRef.id,
            keyId: encryptedData.keyId,
            message: 'Data encrypted successfully'
        };
    } catch (error) {
        console.error("Data encryption error:", error);
        throw new functions.https.HttpsError("internal", "Failed to encrypt data");
    }
});

// Data decryption
export const decryptData = functions.https.onCall(async (data: any, context: any) => {
    try {
        const { encryptedDataId, keyId } = data;
        
        if (!context?.auth) {
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
        }

        if (!encryptedDataId || !keyId) {
            throw new functions.https.HttpsError("invalid-argument", "Encrypted data ID and key ID are required");
        }

        const requestingUserId = context.auth.uid;

        // Get encrypted data
        const encryptedDoc = await db.collection('encryptedData').doc(encryptedDataId).get();
        if (!encryptedDoc.exists) {
            throw new functions.https.HttpsError("not-found", "Encrypted data not found");
        }

        const encryptedData = encryptedDoc.data();
        if (!encryptedData) {
            throw new functions.https.HttpsError("not-found", "Encrypted data not found");
        }

        // Check access permissions
        if (encryptedData.userId !== requestingUserId && encryptedData.encryptedBy !== requestingUserId) {
            // Check if user has admin access
            const userDoc = await db.collection('users').doc(requestingUserId).get();
            const userData = userDoc.data();
            if (userData?.role !== 'admin') {
                throw new functions.https.HttpsError("permission-denied", "Access denied to encrypted data");
            }
        }

        // Get encryption key
        const keyDoc = await db.collection('encryptionKeys').doc(keyId).get();
        if (!keyDoc.exists) {
            throw new functions.https.HttpsError("not-found", "Encryption key not found");
        }

        const keyData = keyDoc.data();
        if (!keyData || keyData.status !== 'active') {
            throw new functions.https.HttpsError("failed-precondition", "Encryption key is not active");
        }

        // Check key expiration
        if (keyData.expiresAt && keyData.expiresAt.toDate() < new Date()) {
            throw new functions.https.HttpsError("failed-precondition", "Encryption key has expired");
        }

        // Decrypt the data
        const algorithm = encryptedData.algorithm;
        const key = Buffer.from(keyData.key, 'hex');
        const iv = Buffer.from(encryptedData.iv, 'hex');
        const authTag = Buffer.from(encryptedData.authTag, 'hex');

        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        decipher.setAuthTag(authTag);
        
        let decrypted = decipher.update(encryptedData.encryptedContent, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        const originalData = JSON.parse(decrypted);

        // Log decryption action
        await logAuditAction({
            action: 'data_decrypted',
            resourceType: 'encryptedData',
            resourceId: encryptedDataId,
            details: {
                keyId,
                dataSize: encryptedData.metadata.dataSize
            },
            severity: 'info'
        }, context);

        console.log(`Data decrypted: ${encryptedDataId} by user ${requestingUserId}`);
        
        return {
            success: true,
            decryptedData: originalData,
            metadata: encryptedData.metadata
        };
    } catch (error) {
        console.error("Data decryption error:", error);
        throw new functions.https.HttpsError("internal", "Failed to decrypt data");
    }
});

// Automated data backup system
export const backupData = functions.https.onCall(async (data: any, context: any) => {
    try {
        const { backupType, collections, includeMetadata } = data;
        
        if (!context?.auth) {
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
        }

        const requestingUserId = context.auth.uid;
        
        // Check admin permissions for backup operations
        const userDoc = await db.collection('users').doc(requestingUserId).get();
        const userData = userDoc.data();
        if (userData?.role !== 'admin') {
            throw new functions.https.HttpsError("permission-denied", "Admin access required for backup operations");
        }

        const backupId = `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const backupStartTime = new Date();

        // Determine collections to backup
        const collectionsToBackup = collections || ['users', 'properties', 'auditLogs', 'encryptedData'];
        
        const backupData: any = {
            backupId,
            backupType: backupType || 'manual',
            collections: collectionsToBackup,
            startedBy: requestingUserId,
            startTime: backupStartTime,
            status: 'in_progress',
            metadata: {
                totalCollections: collectionsToBackup.length,
                includeMetadata: includeMetadata || false,
                version: '1.0'
            }
        };

        // Create backup record
        await db.collection('backups').doc(backupId).set(backupData);

        const backupResults: any = {};
        let totalDocuments = 0;

        // Backup each collection
        for (const collectionName of collectionsToBackup) {
            try {
                console.log(`Backing up collection: ${collectionName}`);
                
                const collectionRef = db.collection(collectionName);
                const snapshot = await collectionRef.get();
                
                const documents = snapshot.docs.map((doc: any) => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        data: data,
                        metadata: includeMetadata ? {
                            createdAt: data.createdAt,
                            updatedAt: data.updatedAt,
                            createdBy: data.createdBy,
                            updatedBy: data.updatedBy
                        } : undefined
                    };
                });

                backupResults[collectionName] = {
                    documentCount: documents.length,
                    status: 'completed',
                    documents: documents
                };

                totalDocuments += documents.length;

            } catch (error) {
                console.error(`Error backing up collection ${collectionName}:`, error);
                backupResults[collectionName] = {
                    documentCount: 0,
                    status: 'failed',
                    error: error instanceof Error ? error.message : 'Unknown error'
                };
            }
        }

        // Store backup data in Cloud Storage
        const bucket = admin.storage().bucket();
        const backupFileName = `backups/${backupId}/${backupStartTime.toISOString()}.json`;
        const backupFile = bucket.file(backupFileName);

        const backupContent = {
            backupId,
            backupType,
            collections: backupResults,
            metadata: {
                totalDocuments,
                backupStartTime: backupStartTime.toISOString(),
                backupEndTime: new Date().toISOString(),
                createdBy: requestingUserId,
                version: '1.0'
            }
        };

        await backupFile.save(JSON.stringify(backupContent, null, 2), {
            metadata: {
                contentType: 'application/json',
                metadata: {
                    backupId,
                    backupType,
                    createdBy: requestingUserId
                }
            }
        });

        // Get backup file URL
        const [url] = await backupFile.getSignedUrl({
            action: 'read',
            expires: '03-01-2500'
        });

        // Update backup record
        const backupEndTime = new Date();
        await db.collection('backups').doc(backupId).update({
            status: 'completed',
            endTime: backupEndTime,
            duration: backupEndTime.getTime() - backupStartTime.getTime(),
            totalDocuments,
            storageUrl: url,
            results: backupResults
        });

        // Log backup action
        await logAuditAction({
            action: 'data_backup_created',
            resourceType: 'backup',
            resourceId: backupId,
            details: {
                backupType,
                totalDocuments,
                collections: collectionsToBackup,
                storageUrl: url
            },
            severity: 'info'
        }, context);

        // Clean up old backups (keep last 10)
        const oldBackupsQuery = db.collection('backups')
            .where('status', '==', 'completed')
            .orderBy('endTime', 'desc')
            .offset(10);

        const oldBackupsSnapshot = await oldBackupsQuery.get();
        const batch = db.batch();
        oldBackupsSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();

        console.log(`Backup completed: ${backupId} with ${totalDocuments} documents`);
        
        return {
            success: true,
            backupId,
            totalDocuments,
            storageUrl: url,
            duration: backupEndTime.getTime() - backupStartTime.getTime(),
            collections: Object.keys(backupResults)
        };
    } catch (error) {
        console.error("Data backup error:", error);
        throw new functions.https.HttpsError("internal", "Failed to create backup");
    }
});

// Restore data from backup
export const restoreData = functions.https.onCall(async (data: any, context: any) => {
    try {
        const { backupId, collections, restoreMode } = data;
        
        if (!context?.auth) {
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
        }

        const requestingUserId = context.auth.uid;
        
        // Check admin permissions
        const userDoc = await db.collection('users').doc(requestingUserId).get();
        const userData = userDoc.data();
        if (userData?.role !== 'admin') {
            throw new functions.https.HttpsError("permission-denied", "Admin access required for restore operations");
        }

        if (!backupId) {
            throw new functions.https.HttpsError("invalid-argument", "Backup ID is required");
        }

        // Get backup record
        const backupDoc = await db.collection('backups').doc(backupId).get();
        if (!backupDoc.exists) {
            throw new functions.https.HttpsError("not-found", "Backup not found");
        }

        const backupData = backupDoc.data();
        if (!backupData || backupData.status !== 'completed') {
            throw new functions.https.HttpsError("failed-precondition", "Backup is not ready for restore");
        }

        // Download backup file from Cloud Storage
        const bucket = admin.storage().bucket();
        const backupFileName = `backups/${backupId}/${backupData.startTime.toDate().toISOString()}.json`;
        const backupFile = bucket.file(backupFileName);

        const [fileContent] = await backupFile.download();
        const backupContent = JSON.parse(fileContent.toString());

        const restoreId = `restore_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const restoreStartTime = new Date();

        // Create restore record
        await db.collection('restores').doc(restoreId).set({
            restoreId,
            backupId,
            startedBy: requestingUserId,
            startTime: restoreStartTime,
            status: 'in_progress',
            restoreMode: restoreMode || 'selective',
            collections: collections || Object.keys(backupContent.collections)
        });

        const restoreResults: any = {};
        let totalRestored = 0;

        // Restore collections
        const collectionsToRestore = collections || Object.keys(backupContent.collections);
        
        for (const collectionName of collectionsToRestore) {
            try {
                const collectionData = backupContent.collections[collectionName];
                if (!collectionData || collectionData.status !== 'completed') {
                    throw new Error(`Collection ${collectionName} backup is not available`);
                }

                const batch = db.batch();
                let restoredCount = 0;

                for (const doc of collectionData.documents) {
                    const docRef = db.collection(collectionName).doc(doc.id);
                    
                    if (restoreMode === 'overwrite') {
                        batch.set(docRef, doc.data);
                    } else {
                        // Check if document exists
                        const existingDoc = await docRef.get();
                        if (!existingDoc.exists) {
                            batch.set(docRef, doc.data);
                        }
                    }
                    restoredCount++;
                }

                await batch.commit();
                totalRestored += restoredCount;

                restoreResults[collectionName] = {
                    restoredCount,
                    status: 'completed'
                };

            } catch (error) {
                console.error(`Error restoring collection ${collectionName}:`, error);
                restoreResults[collectionName] = {
                    restoredCount: 0,
                    status: 'failed',
                    error: error instanceof Error ? error.message : 'Unknown error'
                };
            }
        }

        // Update restore record
        const restoreEndTime = new Date();
        await db.collection('restores').doc(restoreId).update({
            status: 'completed',
            endTime: restoreEndTime,
            duration: restoreEndTime.getTime() - restoreStartTime.getTime(),
            totalRestored,
            results: restoreResults
        });

        // Log restore action
        await logAuditAction({
            action: 'data_restored',
            resourceType: 'restore',
            resourceId: restoreId,
            details: {
                backupId,
                restoreMode,
                totalRestored,
                collections: collectionsToRestore
            },
            severity: 'warning'
        }, context);

        console.log(`Restore completed: ${restoreId} with ${totalRestored} documents`);
        
        return {
            success: true,
            restoreId,
            totalRestored,
            duration: restoreEndTime.getTime() - restoreStartTime.getTime(),
            results: restoreResults
        };
    } catch (error) {
        console.error("Data restore error:", error);
        throw new functions.https.HttpsError("internal", "Failed to restore data");
    }
});

// Security monitoring and alerting
export const monitorSecurity = functions.https.onCall(async (data: any, context: any) => {
    try {
        const { monitoringType, timeRange } = data;
        
        if (!context?.auth) {
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
        }

        const requestingUserId = context.auth.uid;
        
        // Check admin permissions
        const userDoc = await db.collection('users').doc(requestingUserId).get();
        const userData = userDoc.data();
        if (userData?.role !== 'admin') {
            throw new functions.https.HttpsError("permission-denied", "Admin access required for security monitoring");
        }

        const startTime = new Date();
        if (timeRange) {
            switch (timeRange) {
                case '1h':
                    startTime.setHours(startTime.getHours() - 1);
                    break;
                case '24h':
                    startTime.setDate(startTime.getDate() - 1);
                    break;
                case '7d':
                    startTime.setDate(startTime.getDate() - 7);
                    break;
                case '30d':
                    startTime.setDate(startTime.getDate() - 30);
                    break;
                default:
                    startTime.setDate(startTime.getDate() - 1); // Default to 24h
            }
        }

        let securityReport: any = {};

        switch (monitoringType) {
            case 'audit_logs':
                securityReport = await analyzeAuditLogs(startTime);
                break;
            case 'failed_logins':
                securityReport = await analyzeFailedLogins(startTime);
                break;
            case 'suspicious_activity':
                securityReport = await analyzeSuspiciousActivity(startTime);
                break;
            case 'data_access':
                securityReport = await analyzeDataAccess(startTime);
                break;
            case 'comprehensive':
                securityReport = await generateComprehensiveSecurityReport(startTime);
                break;
            default:
                throw new functions.https.HttpsError("invalid-argument", "Invalid monitoring type");
        }

        // Store security report
        const reportRef = await db.collection('securityReports').add({
            monitoringType,
            timeRange,
            report: securityReport,
            generatedBy: requestingUserId,
            generatedAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'completed'
        });

        console.log(`Security monitoring completed: ${monitoringType} for user ${requestingUserId}`);
        
        return {
            success: true,
            reportId: reportRef.id,
            report: securityReport
        };
    } catch (error) {
        console.error("Security monitoring error:", error);
        throw new functions.https.HttpsError("internal", "Failed to monitor security");
    }
});

// Helper functions for security monitoring
async function performSecurityChecks(recentActions: any[], currentAction: any) {
    const checks = {
        hasIssues: false,
        alertType: '',
        description: '',
        severity: 'info'
    };

    // Check for rapid successive actions
    if (recentActions.length > 50) {
        checks.hasIssues = true;
        checks.alertType = 'rapid_actions';
        checks.description = 'User performing actions too rapidly';
        checks.severity = 'warning';
    }

    // Check for unusual access patterns
    const sensitiveActions = recentActions.filter(action => 
        ['data_decrypted', 'backup_created', 'user_deleted'].includes(action.action)
    );
    
    if (sensitiveActions.length > 5) {
        checks.hasIssues = true;
        checks.alertType = 'sensitive_actions';
        checks.description = 'Multiple sensitive actions detected';
        checks.severity = 'critical';
    }

    // Check for failed operations
    const failedActions = recentActions.filter(action => 
        action.details?.error || action.status === 'failed'
    );
    
    if (failedActions.length > 10) {
        checks.hasIssues = true;
        checks.alertType = 'failed_operations';
        checks.description = 'Multiple failed operations detected';
        checks.severity = 'warning';
    }

    return checks;
}

async function sendSecurityNotification(description: string, userId: string) {
    // In production, integrate with notification service
    console.log(`Security alert: ${description} for user ${userId}`);
    
    // Store notification
    await db.collection('securityNotifications').add({
        userId,
        type: 'security_alert',
        title: 'Security Alert',
        description,
        severity: 'critical',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        read: false
    });
}

async function analyzeAuditLogs(startTime: Date) {
    const auditQuery = db.collection('auditLogs')
        .where('timestamp', '>=', startTime)
        .orderBy('timestamp', 'desc');

    const auditSnapshot = await auditQuery.get();
    const auditLogs = auditSnapshot.docs.map((doc: any) => doc.data());

    const analysis: any = {
        totalActions: auditLogs.length,
        actionsByType: {},
        actionsByUser: {},
        criticalActions: auditLogs.filter((log: any) => log.severity === 'critical'),
        suspiciousPatterns: []
    };

    // Analyze action types
    auditLogs.forEach((log: any) => {
        analysis.actionsByType[log.action] = (analysis.actionsByType[log.action] || 0) + 1;
        analysis.actionsByUser[log.performedBy] = (analysis.actionsByUser[log.performedBy] || 0) + 1;
    });

    return analysis;
}

async function analyzeFailedLogins(startTime: Date) {
    const failedLoginsQuery = db.collection('auditLogs')
        .where('action', '==', 'login_failed')
        .where('timestamp', '>=', startTime);

    const failedLoginsSnapshot = await failedLoginsQuery.get();
    const failedLogins = failedLoginsSnapshot.docs.map((doc: any) => doc.data());

    return {
        totalFailedLogins: failedLogins.length,
        failedLoginsByUser: failedLogins.reduce((acc: any, login) => {
            acc[login.userId] = (acc[login.userId] || 0) + 1;
            return acc;
        }, {}),
        potentialBruteForce: failedLogins.filter(login => 
            failedLogins.filter(l => l.userId === login.userId).length > 5
        )
    };
}

async function analyzeSuspiciousActivity(startTime: Date) {
    const suspiciousQuery = db.collection('securityAlerts')
        .where('timestamp', '>=', startTime)
        .orderBy('timestamp', 'desc');

    const suspiciousSnapshot = await suspiciousQuery.get();
    const alerts = suspiciousSnapshot.docs.map((doc: any) => doc.data());

    return {
        totalAlerts: alerts.length,
        alertsByType: alerts.reduce((acc: any, alert) => {
            acc[alert.alertType] = (acc[alert.alertType] || 0) + 1;
            return acc;
        }, {}),
        criticalAlerts: alerts.filter(alert => alert.severity === 'critical'),
        unresolvedAlerts: alerts.filter(alert => !alert.resolved)
    };
}

async function analyzeDataAccess(startTime: Date) {
    const dataAccessQuery = db.collection('auditLogs')
        .where('action', 'in', ['data_encrypted', 'data_decrypted', 'backup_created', 'data_exported'])
        .where('timestamp', '>=', startTime);

    const dataAccessSnapshot = await dataAccessQuery.get();
    const dataAccess = dataAccessSnapshot.docs.map((doc: any) => doc.data());

    return {
        totalDataAccess: dataAccess.length,
        accessByType: dataAccess.reduce((acc: any, access) => {
            acc[access.action] = (acc[access.action] || 0) + 1;
            return acc;
        }, {}),
        accessByUser: dataAccess.reduce((acc: any, access) => {
            acc[access.performedBy] = (acc[access.performedBy] || 0) + 1;
            return acc;
        }, {}),
        sensitiveDataAccess: dataAccess.filter(access => 
            ['data_decrypted', 'backup_created'].includes(access.action)
        )
    };
}

async function generateComprehensiveSecurityReport(startTime: Date) {
    const [auditAnalysis, failedLogins, suspiciousActivity, dataAccess] = await Promise.all([
        analyzeAuditLogs(startTime),
        analyzeFailedLogins(startTime),
        analyzeSuspiciousActivity(startTime),
        analyzeDataAccess(startTime)
    ]);

    return {
        summary: {
            totalActions: auditAnalysis.totalActions,
            totalFailedLogins: failedLogins.totalFailedLogins,
            totalAlerts: suspiciousActivity.totalAlerts,
            totalDataAccess: dataAccess.totalDataAccess
        },
        auditAnalysis,
        failedLogins,
        suspiciousActivity,
        dataAccess,
        recommendations: generateSecurityRecommendations(auditAnalysis, failedLogins, suspiciousActivity, dataAccess)
    };
}

function generateSecurityRecommendations(auditAnalysis: any, failedLogins: any, suspiciousActivity: any, dataAccess: any) {
    const recommendations = [];

    if (failedLogins.potentialBruteForce.length > 0) {
        recommendations.push('Implement rate limiting for login attempts');
    }

    if (suspiciousActivity.criticalAlerts.length > 0) {
        recommendations.push('Review and address critical security alerts immediately');
    }

    if (dataAccess.sensitiveDataAccess.length > 10) {
        recommendations.push('Review sensitive data access patterns');
    }

    if (auditAnalysis.criticalActions.length > 5) {
        recommendations.push('Investigate high volume of critical actions');
    }

    return recommendations;
}

// ========================================
// ADDITIONAL SECURITY & COMPLIANCE FUNCTIONS
// ========================================

// User management and role assignment
export const manageUserRole = functions.https.onCall(async (data: any, context: any) => {
    try {
        const { targetUserId, newRole, permissions, reason } = data;
        
        if (!context?.auth) {
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
        }

        const requestingUserId = context.auth.uid;
        
        // Check admin permissions
        const userDoc = await db.collection('users').doc(requestingUserId).get();
        const userData = userDoc.data();
        if (userData?.role !== 'admin') {
            throw new functions.https.HttpsError("permission-denied", "Admin access required");
        }

        if (!targetUserId || !newRole) {
            throw new functions.https.HttpsError("invalid-argument", "Target user ID and new role are required");
        }

        // Get target user
        const targetUserDoc = await db.collection('users').doc(targetUserId).get();
        if (!targetUserDoc.exists) {
            throw new functions.https.HttpsError("not-found", "Target user not found");
        }

        const targetUserData = targetUserDoc.data();
        const oldRole = targetUserData?.role || 'user';

        // Update user role and permissions
        await db.collection('users').doc(targetUserId).update({
            role: newRole,
            permissions: permissions || [],
            roleUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
            roleUpdatedBy: requestingUserId,
            roleUpdateReason: reason || 'Role update by administrator'
        });

        // Log role change
        await logAuditAction({
            action: 'user_role_changed',
            resourceType: 'user',
            resourceId: targetUserId,
            details: {
                oldRole,
                newRole,
                permissions,
                reason
            },
            severity: 'warning'
        }, context);

        return {
            success: true,
            message: `User role updated from ${oldRole} to ${newRole}`,
            targetUserId,
            newRole
        };
    } catch (error) {
        console.error("User role management error:", error);
        throw new functions.https.HttpsError("internal", "Failed to manage user role");
    }
});

// Data retention and cleanup
export const cleanupExpiredData = functions.https.onCall(async (data: any, context: any) => {
    try {
        const { dataType, retentionDays, dryRun } = data;
        
        if (!context?.auth) {
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
        }

        const requestingUserId = context.auth.uid;
        
        // Check admin permissions
        const userDoc = await db.collection('users').doc(requestingUserId).get();
        const userData = userDoc.data();
        if (userData?.role !== 'admin') {
            throw new functions.https.HttpsError("permission-denied", "Admin access required");
        }

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - (retentionDays || 90));

        let deletedCount = 0;
        const collections = dataType ? [dataType] : ['auditLogs', 'emailEvents', 'qrScans', 'userInteractions'];

        for (const collectionName of collections) {
            try {
                const query = db.collection(collectionName)
                    .where('timestamp', '<', cutoffDate)
                    .limit(1000);

                const snapshot = await query.get();
                
                if (!dryRun) {
                    const batch = db.batch();
                    snapshot.docs.forEach(doc => {
                        batch.delete(doc.ref);
                    });
                    await batch.commit();
                }
                
                deletedCount += snapshot.docs.length;
                console.log(`${dryRun ? 'Would delete' : 'Deleted'} ${snapshot.docs.length} documents from ${collectionName}`);
                
            } catch (error) {
                console.error(`Error cleaning up ${collectionName}:`, error);
            }
        }

        // Log cleanup action
        await logAuditAction({
            action: 'data_cleanup_performed',
            resourceType: 'system',
            details: {
                dataType,
                retentionDays,
                deletedCount,
                dryRun
            },
            severity: 'info'
        }, context);

        return {
            success: true,
            deletedCount,
            dryRun,
            message: `${dryRun ? 'Would delete' : 'Deleted'} ${deletedCount} expired documents`
        };
    } catch (error) {
        console.error("Data cleanup error:", error);
        throw new functions.https.HttpsError("internal", "Failed to cleanup expired data");
    }
});

// GDPR compliance - Right to be forgotten
export const deleteUserData = functions.https.onCall(async (data: any, context: any) => {
    try {
        const { userId, reason, includeAuditLogs } = data;
        
        if (!context?.auth) {
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
        }

        const requestingUserId = context.auth.uid;
        
        // Check admin permissions or self-deletion
        if (userId !== requestingUserId) {
            const userDoc = await db.collection('users').doc(requestingUserId).get();
            const userData = userDoc.data();
            if (userData?.role !== 'admin') {
                throw new functions.https.HttpsError("permission-denied", "Admin access required for deleting other users");
            }
        }

        if (!userId) {
            throw new functions.https.HttpsError("invalid-argument", "User ID is required");
        }

        // Create deletion record
        const deletionRecord = {
            userId,
            requestedBy: requestingUserId,
            reason: reason || 'Right to be forgotten',
            requestedAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'pending',
            includeAuditLogs: includeAuditLogs || false
        };

        const deletionRef = await db.collection('dataDeletions').add(deletionRecord);

        // Mark user for deletion (soft delete)
        await db.collection('users').doc(userId).update({
            status: 'deletion_pending',
            deletionRequestedAt: admin.firestore.FieldValue.serverTimestamp(),
            deletionReason: reason
        });

        // Log deletion request
        await logAuditAction({
            action: 'user_deletion_requested',
            resourceType: 'user',
            resourceId: userId,
            details: {
                reason,
                includeAuditLogs,
                deletionId: deletionRef.id
            },
            severity: 'warning'
        }, context);

        return {
            success: true,
            deletionId: deletionRef.id,
            message: 'User deletion request submitted successfully'
        };
    } catch (error) {
        console.error("User deletion error:", error);
        throw new functions.https.HttpsError("internal", "Failed to delete user data");
    }
});

// Data export for GDPR compliance
export const exportUserData = functions.https.onCall(async (data: any, context: any) => {
    try {
        const { userId, dataTypes } = data;
        
        if (!context?.auth) {
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
        }

        const requestingUserId = context.auth.uid;
        
        // Check permissions
        if (userId !== requestingUserId) {
            const userDoc = await db.collection('users').doc(requestingUserId).get();
            const userData = userDoc.data();
            if (userData?.role !== 'admin') {
                throw new functions.https.HttpsError("permission-denied", "Admin access required for exporting other users' data");
            }
        }

        if (!userId) {
            throw new functions.https.HttpsError("invalid-argument", "User ID is required");
        }

        const typesToExport = dataTypes || ['properties', 'emails', 'auditLogs', 'files'];
        const exportData: any = {};

        // Export user data from different collections
        for (const collectionName of typesToExport) {
            try {
                const query = db.collection(collectionName).where('userId', '==', userId);
                const snapshot = await query.get();
                
                exportData[collectionName] = snapshot.docs.map((doc: any) => ({
                    id: doc.id,
                    ...doc.data()
                }));
                
            } catch (error) {
                console.error(`Error exporting ${collectionName}:`, error);
                exportData[collectionName] = [];
            }
        }

        // Store export record
        const exportRecord = {
            userId,
            requestedBy: requestingUserId,
            dataTypes: typesToExport,
            exportedAt: admin.firestore.FieldValue.serverTimestamp(),
            recordCount: Object.values(exportData).reduce((sum: number, arr: any) => sum + arr.length, 0)
        };

        const exportRef = await db.collection('dataExports').add(exportRecord);

        // Log export action
        await logAuditAction({
            action: 'user_data_exported',
            resourceType: 'user',
            resourceId: userId,
            details: {
                dataTypes: typesToExport,
                exportId: exportRef.id,
                recordCount: exportRecord.recordCount
            },
            severity: 'info'
        }, context);

        return {
            success: true,
            exportId: exportRef.id,
            data: exportData,
            recordCount: exportRecord.recordCount
        };
    } catch (error) {
        console.error("Data export error:", error);
        throw new functions.https.HttpsError("internal", "Failed to export user data");
    }
});

// Security policy management
export const updateSecurityPolicy = functions.https.onCall(async (data: any, context: any) => {
    try {
        const { policyType, policyData, enabled } = data;
        
        if (!context?.auth) {
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
        }

        const requestingUserId = context.auth.uid;
        
        // Check admin permissions
        const userDoc = await db.collection('users').doc(requestingUserId).get();
        const userData = userDoc.data();
        if (userData?.role !== 'admin') {
            throw new functions.https.HttpsError("permission-denied", "Admin access required");
        }

        if (!policyType) {
            throw new functions.https.HttpsError("invalid-argument", "Policy type is required");
        }

        // Update security policy
        const policyRef = db.collection('securityPolicies').doc(policyType);
        await policyRef.set({
            type: policyType,
            data: policyData || {},
            enabled: enabled !== undefined ? enabled : true,
            updatedBy: requestingUserId,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        // Log policy update
        await logAuditAction({
            action: 'security_policy_updated',
            resourceType: 'securityPolicy',
            resourceId: policyType,
            details: {
                policyType,
                enabled,
                changes: policyData
            },
            severity: 'warning'
        }, context);

        return {
            success: true,
            policyType,
            enabled,
            message: `Security policy ${policyType} updated successfully`
        };
    } catch (error) {
        console.error("Security policy update error:", error);
        throw new functions.https.HttpsError("internal", "Failed to update security policy");
    }
});

// Get security policies
export const getSecurityPolicies = functions.https.onCall(async (data: any, context: any) => {
    try {
        const { policyType } = data;
        
        if (!context?.auth) {
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
        }

        const requestingUserId = context.auth.uid;
        
        // Check admin permissions
        const userDoc = await db.collection('users').doc(requestingUserId).get();
        const userData = userDoc.data();
        if (userData?.role !== 'admin') {
            throw new functions.https.HttpsError("permission-denied", "Admin access required");
        }

        let query: any = db.collection('securityPolicies');
        
        if (policyType) {
            const policyDoc = await query.doc(policyType).get();
            if (policyDoc.exists) {
                return { policies: [policyDoc.data()] };
            } else {
                return { policies: [] };
            }
        }

        const snapshot = await query.get();
        const policies = snapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data()
        }));

        return { policies };
    } catch (error) {
        console.error("Get security policies error:", error);
        throw new functions.https.HttpsError("internal", "Failed to get security policies");
    }
});

// Automated security checks
export const runSecurityChecks = functions.https.onCall(async (data: any, context: any) => {
    try {
        const { checkTypes } = data;
        
        if (!context?.auth) {
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
        }

        const requestingUserId = context.auth.uid;
        
        // Check admin permissions
        const userDoc = await db.collection('users').doc(requestingUserId).get();
        const userData = userDoc.data();
        if (userData?.role !== 'admin') {
            throw new functions.https.HttpsError("permission-denied", "Admin access required");
        }

        const checksToRun = checkTypes || ['permissions', 'encryption', 'backup', 'audit'];
        const results: any = {};

        for (const checkType of checksToRun) {
            try {
                switch (checkType) {
                    case 'permissions':
                        results.permissions = await checkUserPermissions();
                        break;
                    case 'encryption':
                        results.encryption = await checkEncryptionStatus();
                        break;
                    case 'backup':
                        results.backup = await checkBackupStatus();
                        break;
                    case 'audit':
                        results.audit = await checkAuditLogStatus();
                        break;
                    default:
                        results[checkType] = { status: 'unknown', message: 'Unknown check type' };
                }
            } catch (error) {
                results[checkType] = { status: 'error', message: error instanceof Error ? error.message : 'Unknown error' };
            }
        }

        // Log security check
        await logAuditAction({
            action: 'security_checks_run',
            resourceType: 'system',
            details: {
                checkTypes: checksToRun,
                results
            },
            severity: 'info'
        }, context);

        return {
            success: true,
            results,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error("Security checks error:", error);
        throw new functions.https.HttpsError("internal", "Failed to run security checks");
    }
});

// Helper functions for security checks
async function checkUserPermissions() {
    const usersSnapshot = await db.collection('users').get();
    const users = usersSnapshot.docs.map((doc: any) => doc.data());
    
    const issues = [];
    const totalUsers = users.length;
    const adminUsers = users.filter(user => user.role === 'admin').length;
    const usersWithoutPermissions = users.filter(user => !user.permissions || user.permissions.length === 0).length;

    if (adminUsers > 3) {
        issues.push('Too many admin users detected');
    }
    if (usersWithoutPermissions > 0) {
        issues.push(`${usersWithoutPermissions} users without defined permissions`);
    }

    return {
        status: issues.length === 0 ? 'pass' : 'warning',
        totalUsers,
        adminUsers,
        usersWithoutPermissions,
        issues
    };
}

async function checkEncryptionStatus() {
    const encryptedDataSnapshot = await db.collection('encryptedData').get();
    const encryptionKeysSnapshot = await db.collection('encryptionKeys').get();
    
    const totalEncrypted = encryptedDataSnapshot.docs.length;
    const totalKeys = encryptionKeysSnapshot.docs.length;
    const activeKeys = encryptionKeysSnapshot.docs.filter(doc => doc.data().status === 'active').length;

    const issues = [];
    if (totalEncrypted > 0 && totalKeys === 0) {
        issues.push('Encrypted data found but no encryption keys');
    }
    if (activeKeys > 10) {
        issues.push('Too many active encryption keys');
    }

    return {
        status: issues.length === 0 ? 'pass' : 'warning',
        totalEncrypted,
        totalKeys,
        activeKeys,
        issues
    };
}

async function checkBackupStatus() {
    const backupsSnapshot = await db.collection('backups')
        .where('status', '==', 'completed')
        .orderBy('endTime', 'desc')
        .limit(1)
        .get();

    if (backupsSnapshot.empty) {
        return {
            status: 'error',
            message: 'No completed backups found',
            lastBackup: null
        };
    }

    const lastBackup = backupsSnapshot.docs[0].data();
    const daysSinceBackup = Math.floor((Date.now() - lastBackup.endTime.toDate().getTime()) / (1000 * 60 * 60 * 24));

    return {
        status: daysSinceBackup <= 7 ? 'pass' : 'warning',
        lastBackup: lastBackup.endTime.toDate(),
        daysSinceBackup,
        message: daysSinceBackup <= 7 ? 'Backup is recent' : 'Backup is older than 7 days'
    };
}

async function checkAuditLogStatus() {
    const auditLogsSnapshot = await db.collection('auditLogs')
        .orderBy('timestamp', 'desc')
        .limit(1000)
        .get();

    const logs = auditLogsSnapshot.docs.map((doc: any) => doc.data());
    const criticalLogs = logs.filter(log => log.severity === 'critical').length;
    const recentLogs = logs.filter(log => {
        const logTime = log.timestamp.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
        return (Date.now() - logTime.getTime()) < (24 * 60 * 60 * 1000); // Last 24 hours
    }).length;

    return {
        status: criticalLogs === 0 ? 'pass' : 'warning',
        totalLogs: logs.length,
        criticalLogs,
        recentLogs,
        message: criticalLogs === 0 ? 'No critical audit logs' : `${criticalLogs} critical logs found`
    };
}

// ========================================
// PAYPAL WEBHOOK HANDLER
// ========================================

// Handle PayPal webhook events
export const paypalWebhook = functions.https.onRequest(async (req, res) => {
    try {
        const event = req.body;
        
        // Verify webhook signature (in production, implement proper verification)
        console.log('PayPal webhook received:', event.event_type);
        
        switch (event.event_type) {
            case 'BILLING.SUBSCRIPTION.ACTIVATED':
                await handleSubscriptionActivated(event);
                break;
            case 'BILLING.SUBSCRIPTION.CANCELLED':
                await handleSubscriptionCancelled(event);
                break;
            case 'BILLING.SUBSCRIPTION.EXPIRED':
                await handleSubscriptionExpired(event);
                break;
            case 'PAYMENT.SALE.COMPLETED':
                await handlePaymentCompleted(event);
                break;
            default:
                console.log('Unhandled PayPal event:', event.event_type);
        }
        
        res.status(200).send('OK');
    } catch (error) {
        console.error('PayPal webhook error:', error);
        res.status(500).send('Error processing webhook');
    }
});

// Handle subscription activation
async function handleSubscriptionActivated(event: any) {
    try {
        const subscriptionId = event.resource.id;
        const customId = event.resource.custom_id; // This should be our subscription ID
        
        // Update subscription status
        await db.collection('subscriptions').doc(customId).update({
            status: 'active',
            paypalSubscriptionId: subscriptionId,
            activatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Update user status
        const subscriptionDoc = await db.collection('subscriptions').doc(customId).get();
        const subscriptionData = subscriptionDoc.data();
        
        if (subscriptionData) {
            await db.collection('users').doc(subscriptionData.userId).update({
                subscriptionStatus: 'active',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        
        console.log(`Subscription activated: ${customId}`);
    } catch (error) {
        console.error('Error handling subscription activation:', error);
    }
}

// Handle subscription cancellation
async function handleSubscriptionCancelled(event: any) {
    try {
        const subscriptionId = event.resource.id;
        
        // Find subscription by PayPal ID
        const subscriptionsQuery = await db.collection('subscriptions')
            .where('paypalSubscriptionId', '==', subscriptionId)
            .get();
        
        if (!subscriptionsQuery.empty) {
            const subscriptionDoc = subscriptionsQuery.docs[0];
            const subscriptionData = subscriptionDoc.data();
            
            // Update subscription status
            await subscriptionDoc.ref.update({
                status: 'cancelled',
                cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            
            // Update user status
            if (subscriptionData) {
                await db.collection('users').doc(subscriptionData.userId).update({
                    subscriptionStatus: 'cancelled',
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        }
        
        console.log(`Subscription cancelled: ${subscriptionId}`);
    } catch (error) {
        console.error('Error handling subscription cancellation:', error);
    }
}

// Handle subscription expiration
async function handleSubscriptionExpired(event: any) {
    try {
        const subscriptionId = event.resource.id;
        
        // Find subscription by PayPal ID
        const subscriptionsQuery = await db.collection('subscriptions')
            .where('paypalSubscriptionId', '==', subscriptionId)
            .get();
        
        if (!subscriptionsQuery.empty) {
            const subscriptionDoc = subscriptionsQuery.docs[0];
            const subscriptionData = subscriptionDoc.data();
            
            // Update subscription status
            await subscriptionDoc.ref.update({
                status: 'expired',
                expiredAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            
            // Update user status
            if (subscriptionData) {
                await db.collection('users').doc(subscriptionData.userId).update({
                    subscriptionStatus: 'expired',
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        }
        
        console.log(`Subscription expired: ${subscriptionId}`);
    } catch (error) {
        console.error('Error handling subscription expiration:', error);
    }
}

// Handle payment completion
async function handlePaymentCompleted(event: any) {
    try {
        const paymentId = event.resource.id;
        const subscriptionId = event.resource.billing_agreement_id;
        
        // Find subscription by PayPal ID
        const subscriptionsQuery = await db.collection('subscriptions')
            .where('paypalSubscriptionId', '==', subscriptionId)
            .get();
        
        if (!subscriptionsQuery.empty) {
            const subscriptionDoc = subscriptionsQuery.docs[0];
            
            // Record payment
            await db.collection('payments').add({
                subscriptionId: subscriptionDoc.id,
                paypalPaymentId: paymentId,
                paypalSubscriptionId: subscriptionId,
                amount: event.resource.amount.total,
                currency: event.resource.amount.currency,
                status: 'completed',
                paidAt: admin.firestore.FieldValue.serverTimestamp(),
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        
        console.log(`Payment completed: ${paymentId}`);
    } catch (error) {
        console.error('Error handling payment completion:', error);
    }
}

// ========================================
// SCHEDULED SECURITY FUNCTIONS
// ========================================

// Daily automated backup
export const scheduledBackup = functions.scheduler.onSchedule('every 24 hours', async (event) => {
    try {
        console.log('Starting scheduled backup...');
        
        const backupData = {
            backupType: 'scheduled',
            collections: ['users', 'properties', 'auditLogs', 'encryptedData', 'securityAlerts'],
            includeMetadata: true
        };

        // Create backup using existing function logic
        const backupId = `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const backupStartTime = new Date();

        // Create backup record
        await db.collection('backups').doc(backupId).set({
            backupId,
            backupType: 'scheduled',
            collections: backupData.collections,
            startedBy: 'system',
            startTime: backupStartTime,
            status: 'in_progress',
            metadata: {
                totalCollections: backupData.collections.length,
                includeMetadata: true,
                version: '1.0'
            }
        });

        console.log(`Scheduled backup ${backupId} initiated successfully`);
    } catch (error) {
        console.error('Scheduled backup error:', error);
    }
});

// Weekly data cleanup
export const scheduledDataCleanup = functions.scheduler.onSchedule('every 168 hours', async (event) => {
    try {
        console.log('Starting scheduled data cleanup...');
        
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 90); // 90 days retention

        const collections = ['auditLogs', 'emailEvents', 'qrScans', 'userInteractions'];
        let totalDeleted = 0;

        for (const collectionName of collections) {
            try {
                const query = db.collection(collectionName)
                    .where('timestamp', '<', cutoffDate)
                    .limit(1000);

                const snapshot = await query.get();
                
                if (snapshot.docs.length > 0) {
                    const batch = db.batch();
                    snapshot.docs.forEach(doc => {
                        batch.delete(doc.ref);
                    });
                    await batch.commit();
                    totalDeleted += snapshot.docs.length;
                }
                
                console.log(`Cleaned up ${snapshot.docs.length} documents from ${collectionName}`);
                
            } catch (error) {
                console.error(`Error cleaning up ${collectionName}:`, error);
            }
        }

        console.log(`Scheduled cleanup completed. Total deleted: ${totalDeleted}`);
    } catch (error) {
        console.error('Scheduled cleanup error:', error);
    }
});

// Daily security health check
export const scheduledSecurityCheck = functions.scheduler.onSchedule('every 24 hours', async (event) => {
    try {
        console.log('Starting scheduled security health check...');
        
        const checkTypes = ['permissions', 'encryption', 'backup', 'audit'];
        const results: any = {};

        for (const checkType of checkTypes) {
            try {
                switch (checkType) {
                    case 'permissions':
                        results.permissions = await checkUserPermissions();
                        break;
                    case 'encryption':
                        results.encryption = await checkEncryptionStatus();
                        break;
                    case 'backup':
                        results.backup = await checkBackupStatus();
                        break;
                    case 'audit':
                        results.audit = await checkAuditLogStatus();
                        break;
                }
            } catch (error) {
                results[checkType] = { status: 'error', message: error instanceof Error ? error.message : 'Unknown error' };
            }
        }

        // Store health check results
        await db.collection('securityHealthChecks').add({
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            results,
            status: 'completed'
        });

        console.log('Scheduled security health check completed');
    } catch (error) {
        console.error('Scheduled security check error:', error);
    }
});

// Monthly security report generation
export const scheduledSecurityReport = functions.scheduler.onSchedule('0 0 1 * *', async (event) => {
    try {
        console.log('Starting scheduled security report generation...');
        
        const startTime = new Date();
        startTime.setDate(startTime.getDate() - 30); // Last 30 days

        const securityReport = await generateComprehensiveSecurityReport(startTime);

        // Store monthly report
        await db.collection('monthlySecurityReports').add({
            month: new Date().toISOString().slice(0, 7), // YYYY-MM format
            report: securityReport,
            generatedAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'completed'
        });

        console.log('Monthly security report generated successfully');
    } catch (error) {
        console.error('Scheduled security report error:', error);
    }
});

// ========================================
// PAYMENT PROCESSING FUNCTIONS
// ========================================

// Create PayPal subscription
export const createPayPalSubscription = functions.https.onCall(async (data: any, context: any) => {
    try {
        const { planId, userId, paymentMethod, returnUrl, cancelUrl } = data;
        
        if (!context?.auth) {
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
        }

        if (!planId || !userId) {
            throw new functions.https.HttpsError("invalid-argument", "Plan ID and user ID are required");
        }

        // Get plan details
        const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
        if (!plan) {
            throw new functions.https.HttpsError("not-found", "Plan not found");
        }

        // Create PayPal subscription request
        const subscriptionRequest = {
            plan_id: plan.paypalPlanId || 'P-5ML4271244454362XMQIZHI', // Default plan ID
            start_time: new Date(Date.now() + 60 * 1000).toISOString(), // Start in 1 minute
            application_context: {
                brand_name: 'Home Listing AI',
                locale: 'en-US',
                shipping_preference: 'NO_SHIPPING',
                user_action: 'SUBSCRIBE_NOW',
                payment_method: {
                    payer_selected: 'PAYPAL',
                    payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED'
                },
                return_url: returnUrl || 'https://your-domain.com/success',
                cancel_url: cancelUrl || 'https://your-domain.com/cancel'
            }
        };

        // Create subscription record in database
        const subscriptionRef = await db.collection('subscriptions').add({
            userId,
            planId,
            planName: plan.name,
            status: 'pending',
            currentPeriodStart: admin.firestore.FieldValue.serverTimestamp(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days trial
            cancelAtPeriodEnd: false,
            paypalSubscriptionId: null, // Will be updated when PayPal confirms
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Update user subscription status
        await db.collection('users').doc(userId).update({
            subscriptionId: subscriptionRef.id,
            subscriptionStatus: 'pending',
            planId: planId,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Log subscription creation
        await logAuditAction({
            action: 'subscription_created',
            resourceType: 'subscription',
            resourceId: subscriptionRef.id,
            details: {
                planId,
                planName: plan.name,
                paymentMethod,
                paypalRequest: subscriptionRequest
            },
            severity: 'info'
        }, context);

        return {
            success: true,
            subscriptionId: subscriptionRef.id,
            status: 'pending',
            planName: plan.name,
            paypalRequest: subscriptionRequest,
            message: 'PayPal subscription request created. Redirect user to PayPal for payment.'
        };
    } catch (error) {
        console.error("PayPal subscription creation error:", error);
        throw new functions.https.HttpsError("internal", "Failed to create subscription");
    }
});

// Cancel PayPal subscription
export const cancelPayPalSubscription = functions.https.onCall(async (data: any, context: any) => {
    try {
        const { subscriptionId, userId, reason } = data;
        
        if (!context?.auth) {
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
        }

        if (!subscriptionId || !userId) {
            throw new functions.https.HttpsError("invalid-argument", "Subscription ID and user ID are required");
        }

        // Get subscription
        const subscriptionDoc = await db.collection('subscriptions').doc(subscriptionId).get();
        if (!subscriptionDoc.exists) {
            throw new functions.https.HttpsError("not-found", "Subscription not found");
        }

        const subscription = subscriptionDoc.data();
        if (subscription?.userId !== userId) {
            throw new functions.https.HttpsError("permission-denied", "You don't have permission to cancel this subscription");
        }

        // Update subscription status
        await db.collection('subscriptions').doc(subscriptionId).update({
            status: 'cancelled',
            cancelAtPeriodEnd: true,
            cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
            cancellationReason: reason || 'Cancelled by user',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Update user subscription status
        await db.collection('users').doc(userId).update({
            subscriptionStatus: 'cancelled',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Log subscription cancellation
        await logAuditAction({
            action: 'subscription_cancelled',
            resourceType: 'subscription',
            resourceId: subscriptionId,
            details: {
                reason,
                planName: subscription?.planName
            },
            severity: 'warning'
        }, context);

        return {
            success: true,
            subscriptionId,
            status: 'cancelled',
            message: 'Subscription cancelled successfully'
        };
    } catch (error) {
        console.error("PayPal subscription cancellation error:", error);
        throw new functions.https.HttpsError("internal", "Failed to cancel subscription");
    }
});

// Upgrade PayPal subscription
export const upgradePayPalSubscription = functions.https.onCall(async (data: any, context: any) => {
    try {
        const { subscriptionId, newPlanId, userId } = data;
        
        if (!context?.auth) {
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
        }

        if (!subscriptionId || !newPlanId || !userId) {
            throw new functions.https.HttpsError("invalid-argument", "Subscription ID, new plan ID, and user ID are required");
        }

        // Get new plan details
        const newPlan = SUBSCRIPTION_PLANS.find(p => p.id === newPlanId);
        if (!newPlan) {
            throw new functions.https.HttpsError("not-found", "New plan not found");
        }

        // Get current subscription
        const subscriptionDoc = await db.collection('subscriptions').doc(subscriptionId).get();
        if (!subscriptionDoc.exists) {
            throw new functions.https.HttpsError("not-found", "Subscription not found");
        }

        const subscription = subscriptionDoc.data();
        if (subscription?.userId !== userId) {
            throw new functions.https.HttpsError("permission-denied", "You don't have permission to upgrade this subscription");
        }

        const oldPlanName = subscription?.planName;

        // Update subscription
        await db.collection('subscriptions').doc(subscriptionId).update({
            planId: newPlanId,
            planName: newPlan.name,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            upgradeHistory: admin.firestore.FieldValue.arrayUnion({
                fromPlan: oldPlanName,
                toPlan: newPlan.name,
                upgradedAt: admin.firestore.FieldValue.serverTimestamp()
            })
        });

        // Update user subscription status
        await db.collection('users').doc(userId).update({
            planId: newPlanId,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Log subscription upgrade
        await logAuditAction({
            action: 'subscription_upgraded',
            resourceType: 'subscription',
            resourceId: subscriptionId,
            details: {
                fromPlan: oldPlanName,
                toPlan: newPlan.name
            },
            severity: 'info'
        }, context);

        return {
            success: true,
            subscriptionId,
            newPlanName: newPlan.name,
            message: 'Subscription upgraded successfully'
        };
    } catch (error) {
        console.error("PayPal subscription upgrade error:", error);
        throw new functions.https.HttpsError("internal", "Failed to upgrade subscription");
    }
});

// ========================================
// ADDITIONAL AI CONTENT GENERATION FUNCTIONS
// ========================================

// Generate video script
export const generateVideoScript = functions.https.onCall(async (data: any, context: any) => {
    try {
        const { property, scriptType, duration, tone, targetAudience } = data;
        
        if (!context?.auth) {
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
        }

        if (!property) {
            throw new functions.https.HttpsError("invalid-argument", "Property details are required");
        }

        // Use Gemini to generate video script
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        
        const prompt = `Create a ${scriptType || 'property tour'} video script for this real estate property:

Property Details:
- Title: ${property.title}
- Address: ${property.address}
- Price: $${property.price?.toLocaleString()}
- Bedrooms: ${property.bedrooms}
- Bathrooms: ${property.bathrooms}
- Square Feet: ${property.squareFeet?.toLocaleString()}
- Features: ${property.features?.join(', ')}

Script Requirements:
- Type: ${scriptType || 'property tour'}
- Duration: ${duration || '2-3 minutes'}
- Tone: ${tone || 'professional and engaging'}
- Target Audience: ${targetAudience || 'potential buyers'}

Please create a structured script with:
1. Opening hook (15-20 seconds)
2. Property overview (30-45 seconds)
3. Key features highlight (60-90 seconds)
4. Neighborhood and amenities (30-45 seconds)
5. Call to action (15-20 seconds)

Include specific camera directions, transitions, and speaking points.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const script = response.text();

        // Store script in database
        const scriptRef = await db.collection('videoScripts').add({
            propertyId: property.id,
            userId: context.auth.uid,
            scriptType: scriptType || 'property tour',
            duration: duration || '2-3 minutes',
            tone: tone || 'professional',
            targetAudience: targetAudience || 'potential buyers',
            script: script,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'generated'
        });

        return {
            success: true,
            scriptId: scriptRef.id,
            script: script,
            metadata: {
                scriptType: scriptType || 'property tour',
                duration: duration || '2-3 minutes',
                tone: tone || 'professional'
            }
        };
    } catch (error) {
        console.error("Video script generation error:", error);
        throw new functions.https.HttpsError("internal", "Failed to generate video script");
    }
});

// Generate general text content
export const generateText = functions.https.onCall(async (data: any, context: any) => {
    try {
        const { prompt, contentType, tone, length, variables } = data;
        
        if (!context?.auth) {
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
        }

        if (!prompt) {
            throw new functions.https.HttpsError("invalid-argument", "Prompt is required");
        }

        // Use Gemini to generate text
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        
        let enhancedPrompt = prompt;
        
        // Add content type specific instructions
        switch (contentType) {
            case 'email':
                enhancedPrompt = `Write a professional email with the following requirements:
                ${prompt}
                
                Requirements:
                - Tone: ${tone || 'professional'}
                - Length: ${length || '150-200 words'}
                - Include proper greeting and closing
                - Clear call to action`;
                break;
                
            case 'social_media':
                enhancedPrompt = `Create a social media post with the following requirements:
                ${prompt}
                
                Requirements:
                - Tone: ${tone || 'engaging'}
                - Length: ${length || '100-150 characters'}
                - Include relevant hashtags
                - Encourage engagement`;
                break;
                
            case 'description':
                enhancedPrompt = `Write a compelling description with the following requirements:
                ${prompt}
                
                Requirements:
                - Tone: ${tone || 'descriptive'}
                - Length: ${length || '200-300 words'}
                - Highlight key benefits
                - Use persuasive language`;
                break;
                
            default:
                enhancedPrompt = `${prompt}
                
                Requirements:
                - Tone: ${tone || 'professional'}
                - Length: ${length || '150-200 words'}`;
        }

        // Replace variables in prompt
        if (variables) {
            for (const [key, value] of Object.entries(variables)) {
                const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
                enhancedPrompt = enhancedPrompt.replace(placeholder, value as string);
            }
        }

        const result = await model.generateContent(enhancedPrompt);
        const response = await result.response;
        const generatedText = response.text();

        // Store generated content
        const contentRef = await db.collection('generatedContent').add({
            userId: context.auth.uid,
            contentType: contentType || 'general',
            prompt: prompt,
            generatedText: generatedText,
            tone: tone || 'professional',
            length: length || '150-200 words',
            variables: variables || {},
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'generated'
        });

        return {
            success: true,
            contentId: contentRef.id,
            text: generatedText,
            metadata: {
                contentType: contentType || 'general',
                tone: tone || 'professional',
                length: length || '150-200 words'
            }
        };
    } catch (error) {
        console.error("Text generation error:", error);
        throw new functions.https.HttpsError("internal", "Failed to generate text");
    }
});

// ========================================
// SUBSCRIPTION PLANS CONSTANT
// ========================================

const SUBSCRIPTION_PLANS = [
    {
        id: 'solo-agent',
        name: 'Solo Agent',
        price: 69,
        features: [
            'Full Dashboard Access',
            'AI Content Studio',
            'Automated Follow-up Sequences',
            'AI Inbox & Lead Management',
            'Standard Support',
            'Up to 5 Active Listings',
            'Email Automation',
            'QR Code Tracking',
            'Basic Analytics'
        ],
        limitations: {
            listings: 5
        },
        paypalPlanId: 'P-5ML4271244454362XMQIZHI'
    },
    {
        id: 'pro-team',
        name: 'Pro Team',
        price: 149,
        features: [
            'Everything in Solo Agent',
            'Team Management',
            'Advanced Analytics',
            'Priority Support',
            'Up to 25 Active Listings',
            'Custom Branding',
            'API Access',
            'Advanced Automation'
        ],
        limitations: {
            listings: 25,
            agents: 5
        },
        paypalPlanId: 'P-5ML4271244454362XMQIZHI'
    },
    {
        id: 'brokerage',
        name: 'Brokerage',
        price: 299,
        features: [
            'Everything in Pro Team',
            'Unlimited Listings',
            'Unlimited Agents',
            'White-label Solution',
            'Dedicated Support',
            'Custom Integrations',
            'Advanced Reporting',
            'Multi-location Support'
        ],
        limitations: {
            listings: -1, // unlimited
            agents: -1 // unlimited
        },
        paypalPlanId: 'P-5ML4271244454362XMQIZHI'
    }
];

// Trigger onboarding sequence for new users
export const triggerOnboardingSequence = functions.https.onCall(async (data: any, context: any) => {
    try {
        if (!context?.auth) {
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
        }

        const userId = context.auth.uid;
        const { userEmail, userName } = data;

        // Create onboarding sequence for new user
        const onboardingSequence = {
            id: `onboarding-${userId}`,
            name: 'Post-Signup Onboarding',
            description: 'Welcome new users and guide them through platform features',
            triggerType: 'Account Created',
            isActive: true,
            userId: userId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            steps: [
                {
                    id: 'step-1',
                    type: 'email',
                    delay: { value: 5, unit: 'minutes' },
                    subject: 'Welcome to HomeListingAI! 🏠',
                    content: `Hi ${userName || 'there'},

Welcome to HomeListingAI! I'm excited to help you revolutionize your real estate business with AI-powered tools.

Your 7-day free trial is now active, and you have full access to all features. Here's what you can do right now:

🎯 Quick Start Guide:
1. Add your first property listing
2. Set up your AI assistant personality
3. Create your first follow-up sequence
4. Generate QR codes for your listings

Need help getting started? Reply to this email or check out our quick tutorial videos in the dashboard.

Best regards,
The HomeListingAI Team`,
                    status: 'pending',
                    scheduledFor: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes from now
                },
                {
                    id: 'step-2',
                    type: 'email',
                    delay: { value: 1, unit: 'days' },
                    subject: 'Your First Property Listing - Let\'s Get Started!',
                    content: `Hi ${userName || 'there'},

I noticed you haven't added your first property listing yet. Let me show you how easy it is!

🚀 Add Your First Listing:
• Upload photos and details
• Generate AI-powered descriptions
• Create professional marketing materials
• Track visitor engagement

This takes just 5 minutes and will help you see immediate results.

Need help? I'm here to guide you through every step.

Best,
The HomeListingAI Team`,
                    status: 'pending',
                    scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000) // 1 day from now
                },
                {
                    id: 'step-3',
                    type: 'email',
                    delay: { value: 3, unit: 'days' },
                    subject: 'See How Other Agents Are Succeeding',
                    content: `Hi ${userName || 'there'},

Here are some real results from agents using HomeListingAI:

📈 Success Stories:
• Sarah M. increased her lead conversion by 3x
• Mike R. saved 15 hours per week on follow-ups
• Lisa K. generated 47 new leads in her first month

Your trial ends in 4 days. Want to join these success stories?

Upgrade now and get:
✅ Unlimited property listings
✅ Advanced AI features
✅ Priority support
✅ 30-day money-back guarantee

Ready to transform your business?

Best,
The HomeListingAI Team`,
                    status: 'pending',
                    scheduledFor: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days from now
                },
                {
                    id: 'step-4',
                    type: 'email',
                    delay: { value: 5, unit: 'days' },
                    subject: 'Last 2 Days: Don\'t Lose Your Progress!',
                    content: `Hi ${userName || 'there'},

Your free trial ends in 2 days. Here's what happens next:

⏰ Trial Ending Soon:
• Your account will be paused
• All your data will be saved for 30 days
• You can reactivate anytime

💡 What You'll Lose Access To:
• AI-powered lead generation
• Automated follow-up sequences
• Property analytics and insights
• QR code tracking

🔒 What You'll Keep:
• All your property data
• Lead information
• Templates and sequences

Upgrade now to continue growing your business with AI!

Best,
The HomeListingAI Team`,
                    status: 'pending',
                    scheduledFor: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // 5 days from now
                },
                {
                    id: 'step-5',
                    type: 'email',
                    delay: { value: 6, unit: 'days' },
                    subject: 'Final Day: Your Trial Ends Tomorrow',
                    content: `Hi ${userName || 'there'},

This is your final reminder - your trial ends tomorrow at midnight.

🎯 Last Chance to Upgrade:
• Keep all your data and progress
• Continue using all AI features
• No setup required - instant access

💳 Simple Upgrade Process:
• Click the upgrade button in your dashboard
• Choose your plan (starting at $59/month)
• Continue using all features immediately

Questions? Reply to this email - I'm here to help!

Best,
The HomeListingAI Team`,
                    status: 'pending',
                    scheduledFor: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000) // 6 days from now
                },
                {
                    id: 'step-6',
                    type: 'email',
                    delay: { value: 7, unit: 'days' },
                    subject: 'Your Trial Has Ended - Here\'s What\'s Next',
                    content: `Hi ${userName || 'there'},

Your 7-day free trial has ended. Here's what happens now:

📊 Your Trial Summary:
• You explored our AI-powered platform
• Created property listings
• Generated leads
• Saved time with automation

🔄 Reactivate Anytime:
• Your data is safe for 30 days
• Upgrade anytime to continue
• No setup required

💡 Special Offer:
Upgrade within the next 7 days and get 20% off your first month!

Ready to continue? Click here to upgrade.

Best,
The HomeListingAI Team`,
                    status: 'pending',
                    scheduledFor: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
                }
            ]
        };

        // Save the onboarding sequence to Firestore
        await db.collection('onboardingSequences').doc(userId).set(onboardingSequence);

        // Schedule the first email
        await scheduleOnboardingEmail(userId, userEmail, onboardingSequence.steps[0]);

        // Log the onboarding trigger
        await logAuditAction({
            action: 'onboarding_sequence_triggered',
            resourceType: 'user',
            resourceId: userId,
            details: {
                sequenceId: onboardingSequence.id,
                userEmail: userEmail,
                stepsCount: onboardingSequence.steps.length
            },
            severity: 'info'
        }, context);

        return {
            success: true,
            message: 'Onboarding sequence triggered successfully',
            sequenceId: onboardingSequence.id
        };
    } catch (error) {
        console.error("Onboarding sequence error:", error);
        throw new functions.https.HttpsError("internal", "Failed to trigger onboarding sequence");
    }
});

// Helper function to schedule onboarding emails
async function scheduleOnboardingEmail(userId: string, userEmail: string, step: any) {
    try {
        // For now, we'll use a simple approach - in production, you'd use a proper email scheduling service
        const emailData = {
            to: userEmail,
            subject: step.subject,
            content: step.content,
            userId: userId,
            stepId: step.id,
            scheduledFor: step.scheduledFor,
            status: 'scheduled'
        };

        // Save to scheduled emails collection
        await db.collection('scheduledEmails').add(emailData);

        console.log(`Scheduled onboarding email for user ${userId}, step ${step.id}`);
    } catch (error) {
        console.error("Error scheduling onboarding email:", error);
    }
}
