import { continueConversation } from './openaiService';
import { ChatMessage } from '../types';

export interface LeadQualificationData {
  name?: string;
  email?: string;
  phone?: string;
  budget?: string;
  timeline?: string;
  propertyType?: string;
  location?: string;
  bedrooms?: number;
  bathrooms?: number;
  isFirstTimeBuyer?: boolean;
  hasPreApproval?: boolean;
  currentSituation?: 'buying' | 'selling' | 'both';
  qualificationScore?: number;
  notes?: string;
}

export interface QualificationResponse {
  message: string;
  extractedData: Partial<LeadQualificationData>;
  nextQuestions: string[];
  qualificationScore: number;
  isQualified: boolean;
  recommendedActions: string[];
}

const LEAD_QUALIFICATION_SYSTEM_PROMPT = `You are an expert real estate lead qualification assistant. Your goal is to naturally extract key information from potential clients while providing helpful, conversational responses.

QUALIFICATION CRITERIA:
- Budget range and financing status
- Timeline for buying/selling
- Property preferences (type, location, size)
- Current housing situation
- Contact information
- Motivation level

CONVERSATION STYLE:
- Be friendly, professional, and helpful
- Ask one question at a time to avoid overwhelming
- Provide value in each response (market insights, tips, etc.)
- Use natural conversation flow, not interrogation
- Show genuine interest in helping them achieve their goals

SCORING SYSTEM (0-100):
- Contact info provided: +20 points
- Budget/financing discussed: +25 points
- Timeline established: +20 points
- Property preferences clear: +15 points
- Motivation level high: +20 points

RESPONSE FORMAT:
Always respond with helpful information first, then naturally transition to gathering more details. Extract any new information mentioned and suggest next steps.`;

export class LeadQualificationAI {
  private conversationHistory: ChatMessage[] = [];
  private extractedData: Partial<LeadQualificationData> = {};

  constructor(initialData?: Partial<LeadQualificationData>) {
    if (initialData) {
      this.extractedData = { ...initialData };
    }
  }

  async processMessage(userMessage: string): Promise<QualificationResponse> {
    // Add user message to history
    this.conversationHistory.push({
      sender: 'user',
      text: userMessage,
      timestamp: new Date()
    });

    // Create context-aware prompt
    const contextPrompt = this.buildContextPrompt(userMessage);
    
    // Get AI response
    const messages = [
      { sender: 'system', text: LEAD_QUALIFICATION_SYSTEM_PROMPT },
      { sender: 'system', text: contextPrompt },
      ...this.conversationHistory.map(msg => ({
        sender: msg.sender,
        text: msg.text
      }))
    ];

    try {
      const aiResponse = await continueConversation(messages);
      
      // Add AI response to history
      this.conversationHistory.push({
        sender: 'assistant',
        text: aiResponse,
        timestamp: new Date()
      });

      // Extract new data from the conversation
      const newData = await this.extractDataFromMessage(userMessage);
      this.extractedData = { ...this.extractedData, ...newData };

      // Calculate qualification score
      const qualificationScore = this.calculateQualificationScore();
      
      // Generate next questions
      const nextQuestions = this.generateNextQuestions();
      
      // Determine if qualified
      const isQualified = qualificationScore >= 60;
      
      // Generate recommended actions
      const recommendedActions = this.generateRecommendedActions(qualificationScore);

      return {
        message: aiResponse,
        extractedData: this.extractedData,
        nextQuestions,
        qualificationScore,
        isQualified,
        recommendedActions
      };
    } catch (error) {
      console.error('Error in lead qualification AI:', error);
      throw new Error('Failed to process lead qualification message');
    }
  }

  private buildContextPrompt(userMessage: string): string {
    const dataContext = Object.keys(this.extractedData).length > 0 
      ? `Current lead data: ${JSON.stringify(this.extractedData, null, 2)}`
      : 'No lead data collected yet.';
    
    return `${dataContext}

User's latest message: "${userMessage}"

Based on the conversation so far, provide a helpful response that:
1. Addresses their message/question directly
2. Provides valuable real estate insights when relevant
3. Naturally asks for one piece of missing qualification information
4. Maintains a consultative, not sales-y tone`;
  }

  private async extractDataFromMessage(message: string): Promise<Partial<LeadQualificationData>> {
    const extractionPrompt = `Extract any real estate lead qualification data from this message: "${message}"

Look for:
- Name, email, phone number
- Budget or price range
- Timeline (when they want to buy/sell)
- Property type preferences
- Location preferences
- Number of bedrooms/bathrooms needed
- First-time buyer status
- Pre-approval status
- Current situation (buying, selling, or both)

Return only the data found, in JSON format. If no relevant data is found, return an empty object.`;

    try {
      const extractionResponse = await continueConversation([
        { sender: 'system', text: extractionPrompt },
        { sender: 'user', text: message }
      ]);

      // Try to parse JSON response
      try {
        return JSON.parse(extractionResponse);
      } catch {
        // If not valid JSON, return empty object
        return {};
      }
    } catch (error) {
      console.error('Error extracting data:', error);
      return {};
    }
  }

  private calculateQualificationScore(): number {
    let score = 0;
    
    // Contact information (20 points)
    if (this.extractedData.email || this.extractedData.phone) score += 20;
    
    // Budget/financing (25 points)
    if (this.extractedData.budget || this.extractedData.hasPreApproval) score += 25;
    
    // Timeline (20 points)
    if (this.extractedData.timeline) score += 20;
    
    // Property preferences (15 points)
    if (this.extractedData.propertyType || this.extractedData.location || 
        this.extractedData.bedrooms || this.extractedData.bathrooms) score += 15;
    
    // Current situation clarity (20 points)
    if (this.extractedData.currentSituation) score += 20;

    return Math.min(score, 100);
  }

  private generateNextQuestions(): string[] {
    const questions: string[] = [];
    
    if (!this.extractedData.budget) {
      questions.push("What's your budget range for this purchase?");
    }
    
    if (!this.extractedData.timeline) {
      questions.push("When are you looking to make a move?");
    }
    
    if (!this.extractedData.location) {
      questions.push("Which areas or neighborhoods are you considering?");
    }
    
    if (!this.extractedData.propertyType) {
      questions.push("What type of property are you looking for?");
    }
    
    if (!this.extractedData.email && !this.extractedData.phone) {
      questions.push("How would you prefer I follow up with you?");
    }

    return questions.slice(0, 3); // Return max 3 questions
  }

  private generateRecommendedActions(score: number): string[] {
    const actions: string[] = [];
    
    if (score >= 80) {
      actions.push("Schedule property viewing appointment");
      actions.push("Send personalized property recommendations");
      actions.push("Connect with mortgage specialist");
    } else if (score >= 60) {
      actions.push("Send market analysis for their area of interest");
      actions.push("Schedule consultation call");
      actions.push("Add to nurture email sequence");
    } else if (score >= 40) {
      actions.push("Send educational content about home buying process");
      actions.push("Add to general newsletter list");
      actions.push("Follow up in 1 week");
    } else {
      actions.push("Continue qualification conversation");
      actions.push("Provide general market information");
      actions.push("Schedule follow-up in 2 weeks");
    }
    
    return actions;
  }

  // Getters for current state
  getExtractedData(): Partial<LeadQualificationData> {
    return { ...this.extractedData };
  }

  getConversationHistory(): ChatMessage[] {
    return [...this.conversationHistory];
  }

  getCurrentScore(): number {
    return this.calculateQualificationScore();
  }

  // Reset conversation
  reset(): void {
    this.conversationHistory = [];
    this.extractedData = {};
  }
}

// Factory function for easy instantiation
export const createLeadQualificationAI = (initialData?: Partial<LeadQualificationData>) => {
  return new LeadQualificationAI(initialData);
};