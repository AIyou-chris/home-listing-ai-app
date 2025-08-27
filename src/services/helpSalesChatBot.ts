import { continueConversation } from './openaiService';
import { ChatMessage } from '../types';

export type ChatBotMode = 'help' | 'sales' | 'general';

export interface ChatBotResponse {
  message: string;
  suggestedActions: string[];
  mode: ChatBotMode;
  needsHumanHandoff: boolean;
  priority: 'low' | 'medium' | 'high';
  category: string;
  followUpQuestions: string[];
}

export interface ChatBotContext {
  userType: 'visitor' | 'prospect' | 'client' | 'agent';
  currentPage?: string;
  previousInteractions?: number;
  userInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
  };
}

const HELP_SYSTEM_PROMPT = `You are a helpful customer support assistant for a real estate AI platform. Your role is to:

HELP CAPABILITIES:
- Answer questions about platform features and functionality
- Guide users through common tasks and workflows
- Troubleshoot technical issues
- Explain pricing and subscription plans
- Provide onboarding assistance
- Direct users to appropriate resources

COMMUNICATION STYLE:
- Friendly, professional, and patient
- Use clear, jargon-free explanations
- Provide step-by-step guidance when needed
- Acknowledge user frustration with empathy
- Offer multiple solutions when possible

ESCALATION CRITERIA:
- Technical issues you cannot resolve
- Billing or account problems
- Feature requests or complex customizations
- User expresses strong dissatisfaction
- Legal or compliance questions

Always aim to resolve issues quickly while ensuring user satisfaction.`;

const SALES_SYSTEM_PROMPT = `You are a knowledgeable sales assistant for a real estate AI platform. Your role is to:

SALES CAPABILITIES:
- Qualify prospects and understand their needs
- Explain platform benefits and ROI
- Address objections and concerns
- Schedule demos and consultations
- Provide pricing information
- Guide prospects through the sales funnel

COMMUNICATION STYLE:
- Consultative, not pushy
- Focus on solving prospect's problems
- Ask discovery questions to understand needs
- Provide relevant case studies and examples
- Build trust through expertise
- Create urgency when appropriate

QUALIFICATION CRITERIA:
- Company size and type
- Current real estate tools/processes
- Pain points and challenges
- Budget and decision-making process
- Timeline for implementation
- Decision maker involvement

Always prioritize building relationships over making quick sales.`;

const GENERAL_SYSTEM_PROMPT = `You are an intelligent assistant for a real estate AI platform. You can help with both support questions and sales inquiries. 

CAPABILITIES:
- Answer general questions about real estate AI
- Provide platform information and benefits
- Help with technical support issues
- Qualify sales prospects
- Direct users to appropriate resources
- Schedule consultations or demos

COMMUNICATION STYLE:
- Professional yet approachable
- Adapt tone based on user's intent (help vs sales)
- Ask clarifying questions to understand needs
- Provide comprehensive but concise responses
- Offer next steps and clear calls-to-action

ROUTING LOGIC:
- Support questions: Focus on helping and problem-solving
- Sales inquiries: Focus on qualifying and demonstrating value
- Mixed intent: Address immediate need first, then explore opportunities

Always aim to provide maximum value in every interaction.`;

export class HelpSalesChatBot {
  private conversationHistory: ChatMessage[] = [];
  private context: ChatBotContext;
  private currentMode: ChatBotMode = 'general';

  constructor(context: ChatBotContext) {
    this.context = context;
  }

  async processMessage(userMessage: string, preferredMode?: ChatBotMode): Promise<ChatBotResponse> {
    // Add user message to history
    this.conversationHistory.push({
      sender: 'user',
      text: userMessage,
      timestamp: new Date()
    });

    // Determine chat bot mode
    const detectedMode = preferredMode || this.detectIntent(userMessage);
    this.currentMode = detectedMode;

    // Get appropriate system prompt
    const systemPrompt = this.getSystemPrompt(detectedMode);
    
    // Build context-aware prompt
    const contextPrompt = this.buildContextPrompt(userMessage);
    
    // Prepare messages for AI
    const messages = [
      { sender: 'system', text: systemPrompt },
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

      // Analyze response for additional metadata
      const analysis = await this.analyzeResponse(userMessage, aiResponse);

      return {
        message: aiResponse,
        suggestedActions: analysis.suggestedActions,
        mode: detectedMode,
        needsHumanHandoff: analysis.needsHumanHandoff,
        priority: analysis.priority,
        category: analysis.category,
        followUpQuestions: analysis.followUpQuestions
      };
    } catch (error) {
      console.error('Error in help/sales chat bot:', error);
      console.error('User message was:', userMessage);
      console.error('Detected mode:', detectedMode);
      
      // Fallback response
      return {
        message: "I apologize, but I'm having trouble processing your request right now. Please try again in a moment, or feel free to contact our support team directly for immediate assistance.",
        suggestedActions: ['Try again', 'Contact support', 'Schedule a call'],
        mode: detectedMode,
        needsHumanHandoff: true,
        priority: 'medium',
        category: 'technical_issue',
        followUpQuestions: []
      };
    }
  }

  private detectIntent(message: string): ChatBotMode {
    const lowerMessage = message.toLowerCase();
    
    // Sales intent keywords
    const salesKeywords = [
      'price', 'pricing', 'cost', 'buy', 'purchase', 'demo', 'trial',
      'features', 'benefits', 'roi', 'value', 'compare', 'competition',
      'sales', 'interested', 'business', 'company', 'team', 'upgrade'
    ];
    
    // Help intent keywords
    const helpKeywords = [
      'help', 'support', 'problem', 'issue', 'error', 'bug', 'broken',
      'how to', 'tutorial', 'guide', 'setup', 'configure', 'troubleshoot',
      'account', 'login', 'password', 'billing', 'cancel', 'refund'
    ];

    const salesScore = salesKeywords.filter(keyword => lowerMessage.includes(keyword)).length;
    const helpScore = helpKeywords.filter(keyword => lowerMessage.includes(keyword)).length;

    if (salesScore > helpScore && salesScore > 0) return 'sales';
    if (helpScore > salesScore && helpScore > 0) return 'help';
    return 'general';
  }

  private getSystemPrompt(mode: ChatBotMode): string {
    switch (mode) {
      case 'help': return HELP_SYSTEM_PROMPT;
      case 'sales': return SALES_SYSTEM_PROMPT;
      default: return GENERAL_SYSTEM_PROMPT;
    }
  }

  private buildContextPrompt(userMessage: string): string {
    const contextInfo = [
      `User type: ${this.context.userType}`,
      `Current mode: ${this.currentMode}`,
      this.context.currentPage ? `Current page: ${this.context.currentPage}` : '',
      this.context.previousInteractions ? `Previous interactions: ${this.context.previousInteractions}` : '',
      this.context.userInfo?.name ? `User name: ${this.context.userInfo.name}` : '',
      this.context.userInfo?.company ? `Company: ${this.context.userInfo.company}` : ''
    ].filter(Boolean).join('\n');

    return `CONTEXT:
${contextInfo}

USER MESSAGE: "${userMessage}"

Based on the context and message, provide a helpful response that:
1. Addresses their specific question or need
2. Offers relevant next steps or actions
3. Maintains appropriate tone for the detected intent (${this.currentMode})
4. Includes any necessary follow-up questions`;
  }

  private async analyzeResponse(userMessage: string, aiResponse: string): Promise<{
    suggestedActions: string[];
    needsHumanHandoff: boolean;
    priority: 'low' | 'medium' | 'high';
    category: string;
    followUpQuestions: string[];
  }> {
    const analysisPrompt = `You are a conversation analyzer. Analyze this customer service interaction and respond ONLY with valid JSON.

USER: "${userMessage}"
BOT: "${aiResponse}"

Return ONLY this JSON structure with no additional text:
{
  "suggestedActions": ["action1", "action2", "action3"],
  "needsHumanHandoff": false,
  "priority": "medium",
  "category": "general_question",
  "followUpQuestions": ["question1", "question2"]
}

Categories: technical_support, billing, sales_inquiry, feature_request, general_question, complaint, onboarding

Priority levels:
- high: urgent issues, complaints, complex sales opportunities
- medium: standard support, qualified prospects
- low: general questions, basic information requests

IMPORTANT: Respond with ONLY the JSON object, no explanations or additional text.`;

    try {
      const analysisResponse = await continueConversation([
        { sender: 'system', text: analysisPrompt },
        { sender: 'user', text: 'Analyze the interaction above and return only JSON.' }
      ]);

      // Clean the response to extract JSON if there's extra text
      let cleanedResponse = analysisResponse.trim();
      
      // Remove any potential prefix text (like "Echo:" or other unwanted text)
      if (cleanedResponse.includes('{')) {
        cleanedResponse = cleanedResponse.substring(cleanedResponse.indexOf('{'));
      }
      
      // Try to find the complete JSON object
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        cleanedResponse = jsonMatch[0];
      }
      
      // If still no valid JSON structure, throw an error to use fallback
      if (!cleanedResponse.startsWith('{') || !cleanedResponse.endsWith('}')) {
        throw new Error('Response does not contain valid JSON structure');
      }

      const analysis = JSON.parse(cleanedResponse);
      
      // Validate the parsed JSON has required fields
      return {
        suggestedActions: Array.isArray(analysis.suggestedActions) ? analysis.suggestedActions : [],
        needsHumanHandoff: typeof analysis.needsHumanHandoff === 'boolean' ? analysis.needsHumanHandoff : false,
        priority: ['low', 'medium', 'high'].includes(analysis.priority) ? analysis.priority : 'medium',
        category: typeof analysis.category === 'string' ? analysis.category : 'general_question',
        followUpQuestions: Array.isArray(analysis.followUpQuestions) ? analysis.followUpQuestions : []
      };
    } catch (error) {
      console.error('Error analyzing response:', error);
      console.error('User message was:', userMessage);
      console.error('AI response was:', aiResponse);
      
      // Fallback analysis based on simple heuristics
      const fallbackAnalysis = this.createFallbackAnalysis(userMessage, aiResponse);
      return fallbackAnalysis;
    }
  }

  private createFallbackAnalysis(userMessage: string, aiResponse: string): {
    suggestedActions: string[];
    needsHumanHandoff: boolean;
    priority: 'low' | 'medium' | 'high';
    category: string;
    followUpQuestions: string[];
  } {
    const lowerUserMessage = userMessage.toLowerCase();
    const lowerAiResponse = aiResponse.toLowerCase();
    
    // Determine category based on keywords
    let category = 'general_question';
    if (lowerUserMessage.includes('price') || lowerUserMessage.includes('cost') || lowerUserMessage.includes('demo')) {
      category = 'sales_inquiry';
    } else if (lowerUserMessage.includes('help') || lowerUserMessage.includes('problem') || lowerUserMessage.includes('error')) {
      category = 'technical_support';
    } else if (lowerUserMessage.includes('billing') || lowerUserMessage.includes('account') || lowerUserMessage.includes('payment')) {
      category = 'billing';
    }
    
    // Determine priority
    let priority: 'low' | 'medium' | 'high' = 'medium';
    if (lowerUserMessage.includes('urgent') || lowerUserMessage.includes('asap') || lowerUserMessage.includes('immediately')) {
      priority = 'high';
    } else if (lowerUserMessage.includes('when you can') || lowerUserMessage.includes('no rush')) {
      priority = 'low';
    }
    
    // Determine if human handoff is needed
    const needsHumanHandoff = lowerUserMessage.includes('speak to human') || 
                             lowerUserMessage.includes('talk to person') ||
                             lowerAiResponse.includes('contact support') ||
                             lowerAiResponse.includes('escalate');
    
    return {
      suggestedActions: this.getFallbackActions(),
      needsHumanHandoff,
      priority,
      category,
      followUpQuestions: []
    };
  }

  private getFallbackActions(): string[] {
    switch (this.currentMode) {
      case 'sales':
        return ['Schedule demo', 'View pricing', 'Contact sales'];
      case 'help':
        return ['View documentation', 'Contact support', 'Try again'];
      default:
        return ['Learn more', 'Get help', 'Contact us'];
    }
  }

  // Public methods for managing conversation
  getConversationHistory(): ChatMessage[] {
    return [...this.conversationHistory];
  }

  getCurrentMode(): ChatBotMode {
    return this.currentMode;
  }

  setMode(mode: ChatBotMode): void {
    this.currentMode = mode;
  }

  updateContext(newContext: Partial<ChatBotContext>): void {
    this.context = { ...this.context, ...newContext };
  }

  reset(): void {
    this.conversationHistory = [];
    this.currentMode = 'general';
  }
}

// Factory function
export const createHelpSalesChatBot = (context: ChatBotContext) => {
  return new HelpSalesChatBot(context);
};