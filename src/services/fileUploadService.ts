// Firebase removed; implement local no-op service

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
    // Local: create object URL and return mock response
    const blobUrl = URL.createObjectURL(file);
    return { fileId: `file_${Date.now()}`, fileName: file.name, downloadUrl: blobUrl, status: 'uploaded' };
  }

  // Process document to extract text
  async processDocument(
    fileId: string,
    fileType: string
  ): Promise<ProcessDocumentResponse> {
    return { fileId, extractedText: '', status: 'processed' };
  }

  // Store processed content in knowledge base
  async storeKnowledgeBase(
    fileId: string,
    category: string,
    tags: string[],
    userId: string
  ): Promise<KnowledgeBaseResponse> {
    return { knowledgeId: `kb_${Date.now()}`, status: 'stored' };
  }

  // Delete file and associated knowledge
  async deleteFile(fileId: string): Promise<{ status: string; message: string }> {
    return { status: 'deleted', message: 'Local delete' };
  }

  // Get user's files
  async getUserFiles(userId: string, propertyId?: string): Promise<{ files: FileData[] }> {
    return { files: [] };
  }

  // Search knowledge base
  async searchKnowledgeBase(
    query: string,
    userId: string,
    category?: string
  ): Promise<{ results: KnowledgeBaseEntry[] }> {
    return { results: [] };
  }

  // Process knowledge base content
  async processKnowledgeBase(
    fileId: string,
    userId: string,
    category: string,
    tags: string[]
  ): Promise<{ knowledgeId: string; status: string; analysis: any }> {
    return { knowledgeId: `kb_${Date.now()}`, status: 'processed', analysis: {} };
  }

  // Update AI context
  async updateAIContext(
    userId: string,
    category: string,
    personality: string
  ): Promise<{ contextId: string; status: string; context: any }> {
    return { contextId: `ctx_${Date.now()}`, status: 'updated', context: {} };
  }

  // Train AI personality
  async trainAIPersonality(
    userId: string,
    personalityType: string,
    trainingData: string,
    voiceSettings: any
  ): Promise<{ personalityId: string; status: string; profile: any }> {
    return { personalityId: `per_${Date.now()}`, status: 'trained', profile: {} };
  }

  // Get AI response with context
  async getAIResponseWithContext(
    message: string,
    userId: string,
    category: string,
    personalityType: string,
    chatHistory: any[]
  ): Promise<{ text: string }> {
    return { text: `AI: ${message}` };
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
    return { personalityId: `per_${Date.now()}`, status: 'created', profile: {} };
  }

  // Generate response using agent's style
  async generateResponse(
    userId: string,
    personalityId: string,
    message: string,
    context: string,
    responseType: string
  ): Promise<{ response: string; personalityName: string; confidence: number }> {
    return { response: `AI: ${message}`, personalityName: 'Local', confidence: 0.5 };
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
    return { templateId: `tpl_${Date.now()}`, status: 'saved', analysis: {} };
  }

  // Apply template with dynamic data
  async applyTemplate(
    templateId: string,
    variables: any,
    context: string
  ): Promise<{ originalContent: string; enhancedContent: string; templateName: string; templateType: string }> {
    return { originalContent: '', enhancedContent: '', templateName: 'Local', templateType: 'text' };
  }

  // Get user's templates
  async getUserTemplates(
    userId: string,
    templateType?: string,
    category?: string
  ): Promise<{ templates: any[] }> {
    return { templates: [] };
  }

  // Get user's AI personalities
  async getUserPersonalities(
    userId: string,
    personalityType?: string
  ): Promise<{ personalities: any[] }> {
    return { personalities: [] };
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
    return { emailId: `email_${Date.now()}`, status: 'queued', message: 'Local' };
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
    return { emailId: `email_${Date.now()}`, status: 'scheduled', scheduledAt: new Date(scheduledAt), message: 'Local' };
  }

  // Get email templates with AI suggestions
  async getEmailTemplates(
    userId: string,
    category?: string,
    templateType?: string
  ): Promise<{ templates: any[]; aiSuggestions: any[] }> {
    return { templates: [], aiSuggestions: [] };
  }

  // Track email metrics and analytics
  async trackEmailMetrics(
    emailId: string,
    event: string,
    recipientEmail: string,
    timestamp?: Date
  ): Promise<{ status: string }> {
    return { status: 'logged' };
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
    return { status: 'queued', totalRecipients: recipients.length, results: [] };
  }

  // Get email analytics and reports
  async getEmailAnalytics(
    userId: string,
    startDate?: string,
    endDate?: string,
    groupBy?: string
  ): Promise<{ metrics: any; recentEvents: any[]; emails: any[] }> {
    return { metrics: {}, recentEvents: [], emails: [] };
  }

  // Sync existing email conversations
  async syncEmail(
    userId: string,
    emailProvider: string,
    credentials: any,
    syncOptions: any
  ): Promise<{ syncId: string; status: string; importedCount: number; analysis: any; message: string }> {
    return { syncId: `sync_${Date.now()}`, status: 'ok', importedCount: 0, analysis: {}, message: 'Local' };
  }

  // Get synced email conversations
  async getSyncedEmails(
    userId: string,
    syncId?: string,
    threadId?: string,
    startDate?: string,
    endDate?: string
  ): Promise<{ emails: any[]; threads: any; totalEmails: number; totalThreads: number }> {
    return { emails: [], threads: {}, totalEmails: 0, totalThreads: 0 };
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
