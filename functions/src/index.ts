import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { GoogleGenerativeAI } from "@google/generative-ai";
import pdfParse from "pdf-parse";
import * as mammoth from "mammoth";
import { createWorker } from "tesseract.js";

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
        const files = snapshot.docs.map(doc => ({
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
        const knowledgeEntries = snapshot.docs.map(doc => doc.data());

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
        const templates = snapshot.docs.map(doc => ({
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
        const personalities = snapshot.docs.map(doc => ({
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
        const templates = snapshot.docs.map(doc => ({
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
        const emails = snapshot.docs.map(doc => doc.data());

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
        const recentEvents = eventsSnapshot.docs.map(doc => doc.data());

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
        const emails = snapshot.docs.map(doc => ({
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
        
        const qrCodes = qrCodesSnapshot.docs.map(doc => ({
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
