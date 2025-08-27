import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();
const storage = admin.storage();

// Upload file to Firebase Storage and extract text
export const uploadFile = functions.https.onCall(async (data: any, context) => {
  try {
    // Skip auth check for now

    const { file, fileName, fileType, userId, propertyId } = data;
    
    if (!file || !fileName || !userId) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
    }

    // Create unique file path
    const timestamp = Date.now();
    const filePath = `uploads/${userId}/${timestamp}-${fileName}`;
    
    // Upload to Firebase Storage
    const bucket = storage.bucket();
    const fileBuffer = Buffer.from(file, 'base64');
    const fileRef = bucket.file(filePath);
    
    await fileRef.save(fileBuffer, {
      metadata: {
        contentType: fileType,
        metadata: {
          uploadedBy: userId,
          originalName: fileName,
          propertyId: propertyId || '',
          uploadedAt: new Date().toISOString()
        }
      }
    });

    // Get download URL
    const [downloadUrl] = await fileRef.getSignedUrl({
      action: 'read',
      expires: '03-01-2500'
    });

    // Enforce per-agent 1GB quota (1_073_741_824 bytes)
    const quota = 1073741824;
    try {
      const agentDoc = await db.collection('agents').doc(userId).get();
      const usage = (agentDoc.exists && (agentDoc.data() as any).storageUsageBytes) || 0;
      if (usage + fileBuffer.length > quota) {
        throw new functions.https.HttpsError('resource-exhausted', 'Storage quota exceeded');
      }
    } catch (e) {
      if (e instanceof functions.https.HttpsError) throw e;
    }

    // Store file metadata in Firestore
    const fileDoc = await db.collection('files').add({
      fileName,
      fileType,
      filePath,
      downloadUrl,
      uploadedBy: userId,
      propertyId: propertyId || null,
      uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'uploaded',
      size: fileBuffer.length
    });

    // Update usage
    await updateUsage(userId, fileBuffer.length);

    return {
      fileId: fileDoc.id,
      downloadUrl,
      status: 'success'
    };

  } catch (error) {
    console.error('Upload file error:', error);
    throw new functions.https.HttpsError('internal', 'Failed to upload file');
  }
});

// Process document to extract text content
export const processDocument = functions.https.onCall(async (data: any, context) => {
  try {
    // Skip auth check for now

    const { fileId, fileType } = data;
    
    if (!fileId) {
      throw new functions.https.HttpsError('invalid-argument', 'File ID is required');
    }

    // Get file metadata
    const fileDoc = await db.collection('files').doc(fileId).get();
    if (!fileDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'File not found');
    }

    const fileData = fileDoc.data()!;
    let extractedText = '';

    // Simple text extraction based on file type
    if (fileType === 'text/plain') {
      // For text files, download and read content
      const bucket = storage.bucket();
      const file = bucket.file(fileData.filePath);
      const [contents] = await file.download();
      extractedText = contents.toString('utf-8');
    } else if (fileType === 'application/pdf') {
      // For PDFs, we'd need a PDF processing library
      // For now, just set a placeholder
      extractedText = 'PDF content extraction not yet implemented';
    } else {
      extractedText = 'Text extraction not supported for this file type';
    }

    // Update file document with extracted text
    await db.collection('files').doc(fileId).update({
      extractedText,
      status: 'processed',
      processedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      fileId,
      extractedText,
      status: 'success'
    };

  } catch (error) {
    console.error('Process document error:', error);
    throw new functions.https.HttpsError('internal', 'Failed to process document');
  }
});

// Store processed content in knowledge base
export const storeKnowledgeBase = functions.https.onCall(async (data: any, context) => {
  try {
    // Skip auth check for now

    const { fileId, category, tags, userId } = data;
    
    if (!fileId || !category || !userId) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
    }

    // Get file data
    const fileDoc = await db.collection('files').doc(fileId).get();
    if (!fileDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'File not found');
    }

    const fileData = fileDoc.data()!;
    
    // Create knowledge base entry
    const knowledgeEntry = await db.collection('knowledgeBase').add({
      fileId,
      fileName: fileData.fileName,
      category,
      tags: tags || [],
      content: fileData.extractedText || '',
      userId,
      propertyId: fileData.propertyId || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastAccessed: admin.firestore.FieldValue.serverTimestamp(),
      accessCount: 0
    });

    // Update file document with knowledge base ID
    await db.collection('files').doc(fileId).update({
      knowledgeBaseId: knowledgeEntry.id,
      status: 'stored'
    });

    return {
      knowledgeId: knowledgeEntry.id,
      status: 'success'
    };

  } catch (error) {
    console.error('Store knowledge base error:', error);
    throw new functions.https.HttpsError('internal', 'Failed to store in knowledge base');
  }
});

// Search knowledge base
export const searchKnowledgeBase = functions.https.onCall(async (data: any, context) => {
  try {
    // Skip auth check for now

    const { query, userId, category, limit = 10 } = data;
    
    if (!query || !userId) {
      throw new functions.https.HttpsError('invalid-argument', 'Query and user ID are required');
    }

    // Build Firestore query
    let knowledgeQuery = db.collection('knowledgeBase')
      .where('userId', '==', userId);

    if (category) {
      knowledgeQuery = knowledgeQuery.where('category', '==', category);
    }

    knowledgeQuery = knowledgeQuery.limit(limit);

    const snapshot = await knowledgeQuery.get();
    const results: any[] = [];

    // Simple text search in content
    snapshot.forEach(doc => {
      const data = doc.data();
      const content = data.content?.toLowerCase() || '';
      const searchQuery = query.toLowerCase();
      
      if (content.includes(searchQuery)) {
        results.push({
          id: doc.id,
          ...data,
          relevanceScore: content.split(searchQuery).length - 1 // Simple relevance scoring
        });
      }
    });

    // Sort by relevance
    results.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return {
      results,
      total: results.length,
      status: 'success'
    };

  } catch (error) {
    console.error('Search knowledge base error:', error);
    throw new functions.https.HttpsError('internal', 'Failed to search knowledge base');
  }
});

// Get user files
export const getUserFiles = functions.https.onCall(async (data: any, context) => {
  try {
    // Skip auth check for now

    const { userId, propertyId } = data;
    
    if (!userId) {
      throw new functions.https.HttpsError('invalid-argument', 'User ID is required');
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

    return {
      files,
      total: files.length,
      status: 'success'
    };

  } catch (error) {
    console.error('Get user files error:', error);
    throw new functions.https.HttpsError('internal', 'Failed to get user files');
  }
});

// Delete file and associated knowledge
export const deleteFile = functions.https.onCall(async (data: any, context) => {
  try {
    // Skip auth check for now

    const { fileId } = data;
    
    if (!fileId) {
      throw new functions.https.HttpsError('invalid-argument', 'File ID is required');
    }

    // Get file data
    const fileDoc = await db.collection('files').doc(fileId).get();
    if (!fileDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'File not found');
    }

    const fileData = fileDoc.data()!;

    // Delete from storage
    try {
      const bucket = storage.bucket();
      const [meta] = await bucket.file(fileData.filePath).getMetadata();
      const size = Number(meta.size || fileData.size || 0);
      await bucket.file(fileData.filePath).delete();
      if (fileData.uploadedBy) {
        await updateUsage(fileData.uploadedBy, -size);
      }
    } catch (error) {
      console.warn('Failed to delete file from storage:', error);
    }

    // Delete knowledge base entry if exists
    if (fileData.knowledgeBaseId) {
      await db.collection('knowledgeBase').doc(fileData.knowledgeBaseId).delete();
    }

    // Delete file document
    await db.collection('files').doc(fileId).delete();

    return {
      status: 'success',
      message: 'File deleted successfully'
    };

  } catch (error) {
    console.error('Delete file error:', error);
    throw new functions.https.HttpsError('internal', 'Failed to delete file');
  }
});

// Get org/global KB defaults (ids or slugs)
export const getKbDefaults = functions.https.onCall(async (_data: any, _context) => {
  try {
    const doc = await db.collection('settings').doc('kbDefaults').get();
    const defaults = doc.exists ? doc.data() : {};
    return { defaults };
  } catch (error) {
    console.error('Get KB defaults error:', error);
    throw new functions.https.HttpsError('internal', 'Failed to get KB defaults');
  }
});

// Set org/global KB defaults
export const setKbDefaults = functions.https.onCall(async (data: any, context) => {
  try {
    if (!context || !(context as any).auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { godId, salesId, marketingId } = data || {};
    await db.collection('settings').doc('kbDefaults').set({ godId, salesId, marketingId }, { merge: true });
    return { status: 'success' };
  } catch (error) {
    console.error('Set KB defaults error:', error);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError('internal', 'Failed to set KB defaults');
  }
});

// Get agent overrides + usage
export const getAgentKbSettings = functions.https.onCall(async (data: any, context) => {
  try {
    const { agentId } = data || {};
    if (!agentId) throw new functions.https.HttpsError('invalid-argument', 'agentId required');
    const doc = await db.collection('agents').doc(agentId).get();
    const settings = doc.exists ? doc.data() : {};
    return { settings };
  } catch (error) {
    console.error('Get agent KB settings error:', error);
    throw new functions.https.HttpsError('internal', 'Failed to get agent KB settings');
  }
});

// Update storage usage (called after uploads/deletes)
async function updateUsage(agentId: string, deltaBytes: number) {
  const ref = db.collection('agents').doc(agentId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = (snap.exists && (snap.data() as any).storageUsageBytes) || 0;
    const next = Math.max(0, current + deltaBytes);
    tx.set(ref, { storageUsageBytes: next }, { merge: true });
  });
}

// Get system prompt (for AI conversation context)
export const getSystemPrompt = functions.https.onCall(async (_data: any, _context) => {
  try {
    const doc = await db.collection('settings').doc('ai').get();
    const defaultPrompt = 'You are an intelligent assistant for a real estate AI platform. Help with support and sales, be concise, and provide actionable next steps.';
    if (!doc.exists) {
      return { systemPrompt: defaultPrompt };
    }
    const data = doc.data() || {} as any;
    return { systemPrompt: data.systemPrompt || defaultPrompt };
  } catch (error) {
    console.error('Get system prompt error:', error);
    throw new functions.https.HttpsError('internal', 'Failed to get system prompt');
  }
});

// Set system prompt (restricted)
export const setSystemPrompt = functions.https.onCall(async (data: any, context) => {
  try {
    // Require authentication
    if (!context || !(context as any).auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { systemPrompt } = data || {};
    if (typeof systemPrompt !== 'string' || systemPrompt.trim().length === 0) {
      throw new functions.https.HttpsError('invalid-argument', 'systemPrompt is required');
    }

    // Simple admin check: user exists in 'admins' collection
    const adminUid = (context as any).auth.uid;
    const adminDoc = await db.collection('admins').doc(adminUid).get();
    if (!adminDoc.exists) {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    await db.collection('settings').doc('ai').set({
      systemPrompt: systemPrompt.trim(),
      updatedBy: adminUid,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    return { status: 'success' };
  } catch (error) {
    console.error('Set system prompt error:', error);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError('internal', 'Failed to set system prompt');
  }
});
