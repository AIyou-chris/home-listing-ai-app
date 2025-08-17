import { functions } from './firebase';
import { httpsCallable } from 'firebase/functions';

export interface FileUploadResponse {
  fileId: string;
  fileName: string;
  downloadUrl: string;
  status: string;
}

export interface ProcessDocumentResponse {
  fileId: string;
  extractedText: string;
  status: string;
}

export interface KnowledgeBaseResponse {
  knowledgeId: string;
  status: string;
}

export interface FileData {
  id: string;
  fileName: string;
  fileType: string;
  filePath: string;
  downloadUrl: string;
  uploadedBy: string;
  propertyId?: string;
  uploadedAt: any;
  status: string;
  size: number;
  extractedText?: string;
  knowledgeBaseId?: string;
}

export interface KnowledgeBaseEntry {
  id: string;
  fileName: string;
  category: string;
  tags: string[];
  content: string;
  createdBy: string;
  createdAt: any;
  lastAccessed: any;
  accessCount: number;
}

class FileUploadService {
  // Upload file to Firebase Storage
  async uploadFile(
    file: File,
    userId: string,
    propertyId?: string
  ): Promise<FileUploadResponse> {
    try {
      // Convert file to base64
      const base64 = await this.fileToBase64(file);
      
      const uploadFileFunction = httpsCallable(functions, 'uploadFile');
      const result = await uploadFileFunction({
        file: base64,
        fileName: file.name,
        fileType: file.type,
        userId,
        propertyId
      });

      return result.data as FileUploadResponse;
    } catch (error) {
      console.error('File upload error:', error);
      throw new Error('Failed to upload file');
    }
  }

  // Process document to extract text
  async processDocument(
    fileId: string,
    fileType: string
  ): Promise<ProcessDocumentResponse> {
    try {
      const processDocumentFunction = httpsCallable(functions, 'processDocument');
      const result = await processDocumentFunction({
        fileId,
        fileType
      });

      return result.data as ProcessDocumentResponse;
    } catch (error) {
      console.error('Document processing error:', error);
      throw new Error('Failed to process document');
    }
  }

  // Store processed content in knowledge base
  async storeKnowledgeBase(
    fileId: string,
    category: string,
    tags: string[],
    userId: string
  ): Promise<KnowledgeBaseResponse> {
    try {
      const storeKnowledgeBaseFunction = httpsCallable(functions, 'storeKnowledgeBase');
      const result = await storeKnowledgeBaseFunction({
        fileId,
        category,
        tags,
        userId
      });

      return result.data as KnowledgeBaseResponse;
    } catch (error) {
      console.error('Knowledge base storage error:', error);
      throw new Error('Failed to store in knowledge base');
    }
  }

  // Delete file and associated knowledge
  async deleteFile(fileId: string): Promise<{ status: string; message: string }> {
    try {
      const deleteFileFunction = httpsCallable(functions, 'deleteFile');
      const result = await deleteFileFunction({ fileId });

      return result.data as { status: string; message: string };
    } catch (error) {
      console.error('File deletion error:', error);
      throw new Error('Failed to delete file');
    }
  }

  // Get user's files
  async getUserFiles(userId: string, propertyId?: string): Promise<{ files: FileData[] }> {
    try {
      const getUserFilesFunction = httpsCallable(functions, 'getUserFiles');
      const result = await getUserFilesFunction({ userId, propertyId });

      return result.data as { files: FileData[] };
    } catch (error) {
      console.error('Get user files error:', error);
      throw new Error('Failed to get user files');
    }
  }

  // Search knowledge base
  async searchKnowledgeBase(
    query: string,
    userId: string,
    category?: string
  ): Promise<{ results: KnowledgeBaseEntry[] }> {
    try {
      const searchKnowledgeBaseFunction = httpsCallable(functions, 'searchKnowledgeBase');
      const result = await searchKnowledgeBaseFunction({
        query,
        userId,
        category
      });

      return result.data as { results: KnowledgeBaseEntry[] };
    } catch (error) {
      console.error('Knowledge base search error:', error);
      throw new Error('Failed to search knowledge base');
    }
  }

  // Process knowledge base content
  async processKnowledgeBase(
    fileId: string,
    userId: string,
    category: string,
    tags: string[]
  ): Promise<{ knowledgeId: string; status: string; analysis: any }> {
    try {
      const processKnowledgeBaseFunction = httpsCallable(functions, 'processKnowledgeBase');
      const result = await processKnowledgeBaseFunction({
        fileId,
        userId,
        category,
        tags
      });

      return result.data as { knowledgeId: string; status: string; analysis: any };
    } catch (error) {
      console.error('Knowledge base processing error:', error);
      throw new Error('Failed to process knowledge base');
    }
  }

  // Update AI context
  async updateAIContext(
    userId: string,
    category: string,
    personality: string
  ): Promise<{ contextId: string; status: string; context: any }> {
    try {
      const updateAIContextFunction = httpsCallable(functions, 'updateAIContext');
      const result = await updateAIContextFunction({
        userId,
        category,
        personality
      });

      return result.data as { contextId: string; status: string; context: any };
    } catch (error) {
      console.error('AI context update error:', error);
      throw new Error('Failed to update AI context');
    }
  }

  // Train AI personality
  async trainAIPersonality(
    userId: string,
    personalityType: string,
    trainingData: string,
    voiceSettings: any
  ): Promise<{ personalityId: string; status: string; profile: any }> {
    try {
      const trainAIPersonalityFunction = httpsCallable(functions, 'trainAIPersonality');
      const result = await trainAIPersonalityFunction({
        userId,
        personalityType,
        trainingData,
        voiceSettings
      });

      return result.data as { personalityId: string; status: string; profile: any };
    } catch (error) {
      console.error('AI personality training error:', error);
      throw new Error('Failed to train AI personality');
    }
  }

  // Get AI response with context
  async getAIResponseWithContext(
    message: string,
    userId: string,
    category: string,
    personalityType: string,
    chatHistory: any[]
  ): Promise<{ text: string }> {
    try {
      const getAIResponseWithContextFunction = httpsCallable(functions, 'getAIResponseWithContext');
      const result = await getAIResponseWithContextFunction({
        message,
        userId,
        category,
        personalityType,
        chatHistory
      });

      return result.data as { text: string };
    } catch (error) {
      console.error('AI response with context error:', error);
      throw new Error('Failed to get AI response');
    }
  }

  // Create custom AI personality
  async createAIPersonality(
    userId: string,
    personalityName: string,
    personalityType: string,
    traits: string[],
    communicationStyle: string,
    voiceSettings: any,
    trainingData: string
  ): Promise<{ personalityId: string; status: string; profile: any }> {
    try {
      const createAIPersonalityFunction = httpsCallable(functions, 'createAIPersonality');
      const result = await createAIPersonalityFunction({
        userId,
        personalityName,
        personalityType,
        traits,
        communicationStyle,
        voiceSettings,
        trainingData
      });

      return result.data as { personalityId: string; status: string; profile: any };
    } catch (error) {
      console.error('AI personality creation error:', error);
      throw new Error('Failed to create AI personality');
    }
  }

  // Generate response using agent's style
  async generateResponse(
    userId: string,
    personalityId: string,
    message: string,
    context: string,
    responseType: string
  ): Promise<{ response: string; personalityName: string; confidence: number }> {
    try {
      const generateResponseFunction = httpsCallable(functions, 'generateResponse');
      const result = await generateResponseFunction({
        userId,
        personalityId,
        message,
        context,
        responseType
      });

      return result.data as { response: string; personalityName: string; confidence: number };
    } catch (error) {
      console.error('Response generation error:', error);
      throw new Error('Failed to generate response');
    }
  }

  // Save email/message template
  async saveTemplate(
    userId: string,
    templateName: string,
    templateType: string,
    content: string,
    variables: string[],
    category: string,
    tags: string[]
  ): Promise<{ templateId: string; status: string; analysis: any }> {
    try {
      const saveTemplateFunction = httpsCallable(functions, 'saveTemplate');
      const result = await saveTemplateFunction({
        userId,
        templateName,
        templateType,
        content,
        variables,
        category,
        tags
      });

      return result.data as { templateId: string; status: string; analysis: any };
    } catch (error) {
      console.error('Template save error:', error);
      throw new Error('Failed to save template');
    }
  }

  // Apply template with dynamic data
  async applyTemplate(
    templateId: string,
    variables: any,
    context: string
  ): Promise<{ originalContent: string; enhancedContent: string; templateName: string; templateType: string }> {
    try {
      const applyTemplateFunction = httpsCallable(functions, 'applyTemplate');
      const result = await applyTemplateFunction({
        templateId,
        variables,
        context
      });

      return result.data as { originalContent: string; enhancedContent: string; templateName: string; templateType: string };
    } catch (error) {
      console.error('Template application error:', error);
      throw new Error('Failed to apply template');
    }
  }

  // Get user's templates
  async getUserTemplates(
    userId: string,
    templateType?: string,
    category?: string
  ): Promise<{ templates: any[] }> {
    try {
      const getUserTemplatesFunction = httpsCallable(functions, 'getUserTemplates');
      const result = await getUserTemplatesFunction({
        userId,
        templateType,
        category
      });

      return result.data as { templates: any[] };
    } catch (error) {
      console.error('Get user templates error:', error);
      throw new Error('Failed to get templates');
    }
  }

  // Get user's AI personalities
  async getUserPersonalities(
    userId: string,
    personalityType?: string
  ): Promise<{ personalities: any[] }> {
    try {
      const getUserPersonalitiesFunction = httpsCallable(functions, 'getUserPersonalities');
      const result = await getUserPersonalitiesFunction({
        userId,
        personalityType
      });

      return result.data as { personalities: any[] };
    } catch (error) {
      console.error('Get user personalities error:', error);
      throw new Error('Failed to get personalities');
    }
  }

  // Send email using AI-enhanced content
  async sendEmail(
    userId: string,
    to: string,
    subject: string,
    content: string,
    templateId?: string,
    personalityId?: string,
    variables?: any,
    priority?: string
  ): Promise<{ emailId: string; status: string; message: string }> {
    try {
      const sendEmailFunction = httpsCallable(functions, 'sendEmail');
      const result = await sendEmailFunction({
        userId,
        to,
        subject,
        content,
        templateId,
        personalityId,
        variables,
        priority
      });

      return result.data as { emailId: string; status: string; message: string };
    } catch (error) {
      console.error('Email sending error:', error);
      throw new Error('Failed to send email');
    }
  }

  // Schedule email for later delivery
  async scheduleEmail(
    userId: string,
    to: string,
    subject: string,
    content: string,
    scheduledAt: string,
    templateId?: string,
    personalityId?: string,
    variables?: any,
    priority?: string
  ): Promise<{ emailId: string; status: string; scheduledAt: Date; message: string }> {
    try {
      const scheduleEmailFunction = httpsCallable(functions, 'scheduleEmail');
      const result = await scheduleEmailFunction({
        userId,
        to,
        subject,
        content,
        scheduledAt,
        templateId,
        personalityId,
        variables,
        priority
      });

      return result.data as { emailId: string; status: string; scheduledAt: Date; message: string };
    } catch (error) {
      console.error('Email scheduling error:', error);
      throw new Error('Failed to schedule email');
    }
  }

  // Get email templates with AI suggestions
  async getEmailTemplates(
    userId: string,
    category?: string,
    templateType?: string
  ): Promise<{ templates: any[]; aiSuggestions: any[] }> {
    try {
      const getEmailTemplatesFunction = httpsCallable(functions, 'getEmailTemplates');
      const result = await getEmailTemplatesFunction({
        userId,
        category,
        templateType
      });

      return result.data as { templates: any[]; aiSuggestions: any[] };
    } catch (error) {
      console.error('Get email templates error:', error);
      throw new Error('Failed to get email templates');
    }
  }

  // Track email metrics and analytics
  async trackEmailMetrics(
    emailId: string,
    event: string,
    recipientEmail: string,
    timestamp?: Date
  ): Promise<{ status: string }> {
    try {
      const trackEmailMetricsFunction = httpsCallable(functions, 'trackEmailMetrics');
      const result = await trackEmailMetricsFunction({
        emailId,
        event,
        recipientEmail,
        timestamp
      });

      return result.data as { status: string };
    } catch (error) {
      console.error('Email metrics tracking error:', error);
      throw new Error('Failed to track email metrics');
    }
  }

  // Send bulk emails with personalization
  async sendBulkEmail(
    userId: string,
    recipients: any[],
    subject: string,
    content: string,
    templateId?: string,
    personalityId?: string,
    variables?: any,
    scheduleAt?: string
  ): Promise<{ status: string; totalRecipients: number; results: any[] }> {
    try {
      const sendBulkEmailFunction = httpsCallable(functions, 'sendBulkEmail');
      const result = await sendBulkEmailFunction({
        userId,
        recipients,
        subject,
        content,
        templateId,
        personalityId,
        variables,
        scheduleAt
      });

      return result.data as { status: string; totalRecipients: number; results: any[] };
    } catch (error) {
      console.error('Bulk email sending error:', error);
      throw new Error('Failed to send bulk emails');
    }
  }

  // Get email analytics and reports
  async getEmailAnalytics(
    userId: string,
    startDate?: string,
    endDate?: string,
    groupBy?: string
  ): Promise<{ metrics: any; recentEvents: any[]; emails: any[] }> {
    try {
      const getEmailAnalyticsFunction = httpsCallable(functions, 'getEmailAnalytics');
      const result = await getEmailAnalyticsFunction({
        userId,
        startDate,
        endDate,
        groupBy
      });

      return result.data as { metrics: any; recentEvents: any[]; emails: any[] };
    } catch (error) {
      console.error('Email analytics error:', error);
      throw new Error('Failed to get email analytics');
    }
  }

  // Sync existing email conversations
  async syncEmail(
    userId: string,
    emailProvider: string,
    credentials: any,
    syncOptions: any
  ): Promise<{ syncId: string; status: string; importedCount: number; analysis: any; message: string }> {
    try {
      const syncEmailFunction = httpsCallable(functions, 'syncEmail');
      const result = await syncEmailFunction({
        userId,
        emailProvider,
        credentials,
        syncOptions
      });

      return result.data as { syncId: string; status: string; importedCount: number; analysis: any; message: string };
    } catch (error) {
      console.error('Email sync error:', error);
      throw new Error('Failed to sync emails');
    }
  }

  // Get synced email conversations
  async getSyncedEmails(
    userId: string,
    syncId?: string,
    threadId?: string,
    startDate?: string,
    endDate?: string
  ): Promise<{ emails: any[]; threads: any; totalEmails: number; totalThreads: number }> {
    try {
      const getSyncedEmailsFunction = httpsCallable(functions, 'getSyncedEmails');
      const result = await getSyncedEmailsFunction({
        userId,
        syncId,
        threadId,
        startDate,
        endDate
      });

      return result.data as { emails: any[]; threads: any; totalEmails: number; totalThreads: number };
    } catch (error) {
      console.error('Get synced emails error:', error);
      throw new Error('Failed to get synced emails');
    }
  }

  // Helper function to convert file to base64
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result as string;
        // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = error => reject(error);
    });
  }

  // Get file extension from MIME type
  getFileExtension(mimeType: string): string {
    const extensions: { [key: string]: string } = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'application/pdf': 'pdf',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'text/plain': 'txt'
    };
    return extensions[mimeType] || 'unknown';
  }

  // Format file size
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Validate file type
  isValidFileType(file: File): boolean {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    return allowedTypes.includes(file.type);
  }

  // Validate file size (max 10MB)
  isValidFileSize(file: File): boolean {
    const maxSize = 10 * 1024 * 1024; // 10MB
    return file.size <= maxSize;
  }
}

export const fileUploadService = new FileUploadService();
