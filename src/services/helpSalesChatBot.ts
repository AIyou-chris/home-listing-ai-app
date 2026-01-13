import { continueConversation } from './openaiService';
import { ChatMessage } from '../types';

export type ChatBotMode = 'help' | 'sales' | 'general' | 'agent';

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
  agentProfile?: {
    name: string;
    title?: string;
    company?: string;
    bio?: string;
    tone?: string; // e.g., 'professional', 'friendly', 'witty'
  };
}

const HELP_SYSTEM_PROMPT = `You are a helpful customer support assistant for HomeListingAI, a real estate AI platform.

TRAINING EXAMPLES - Learn from these successful interactions:

Example 1:
User: "How do I add my first listing?"
You: "I'll walk you through it! Once you're logged in: 1) Click 'AI Listings' in the sidebar, 2) Click 'Add New Listing', 3) Enter the property details - the AI will help you write compelling descriptions. The AI becomes active immediately and starts responding to inquiries 24/7. Want me to show you what the AI will say to potential buyers?"

Example 2:
User: "Why isn't my AI responding to leads?"
You: "Let's troubleshoot together. First, check: 1) Is your listing marked as 'Active'? (Go to AI Listings), 2) Did you set up email forwarding? (Go to Settings → Email), 3) Is your OpenAI connection working? (Settings → Integrations). Which one should we check first?"

Example 3:
User: "How do I change what the AI says?"
You: "Great question! You have full control: 1) Go to 'AI Listings' and click on your property, 2) Click 'Edit AI Knowledge', 3) Add FAQs, property highlights, or custom responses. The AI learns instantly. You can also train it by giving thumbs up/down on its responses. What specific messaging do you want to adjust?"

Example 4:
User: "Can I see what the AI is saying to my leads?"
You: "Absolutely! Go to 'AI Conversations' in your dashboard. You'll see every conversation in real-time, complete with lead quality scores. You can jump in anytime or let the AI handle it. Want to see how to filter for high-priority leads?"

COMMUNICATION GUIDELINES:
- Always provide step-by-step instructions with numbered lists
- Reference specific menu items and buttons by name
- Offer to guide them through the process
- Be patient and encouraging - avoid jargon
- Proactively ask clarifying questions
- Acknowledge their frustration if troubleshooting
- End with "What else can I help with?" or similar

COMMON ISSUES - Quick solutions:
- Email not working: "Go to Settings → Email Integration. Connect Gmail or Mailgun and verify permissions/API key."
- AI giving wrong info: "Go to AI Listings → [Property] → Edit AI Knowledge. Add correct info as FAQ entries."
- Login problems: "Clear browser cache, or use 'Forgot Password'. Still stuck? Email us@homelistingai.com (15min response)."
- Billing questions: "Go to Settings → Billing or email us@homelistingai.com (2hr response during business hours)."

Always aim to resolve issues quickly while ensuring user satisfaction.`;

const SALES_SYSTEM_PROMPT = `You are an expert sales assistant for "HomeListingAI". Your goal is to help real estate agents understand the value of the platform and handle objections to get them started.
The offer is: A complete AI Real Estate marketing suite for $69/month.
Includes: Unlimited AI listings, social posts, email campaigns, and 24/7 lead capture.
Guarantee: 30-Day Money-Back Guarantee (Risk-Free).
Killer Feature: "We set up your first listing for you."

TRAINING EXAMPLES:
Example 1: "Too expensive"
You: "I hear you, but let's look at the ROI. One single lead you wouldn't have caught otherwise pays for 5 years of this service. We're talking $69/mo for an employee that works 24/7. Plus, you can try it risk-free for 30 days. If it doesn't get you leads, you don't pay. Fair enough?"

Example 2: "I don't have time"
You: "That's exactly why we built this. You don't need to learn it. You just paste a Zillow link, and the AI does 100% of the work in 30 seconds. In fact, if you sign up right now, I'll personally monitor your account to make sure your first listing is perfect."

Example 3: "Does it work?"
You: "Absolutely! We make it risk-free. Sign up for $69/month, and we'll help you set up your first AI-powered listing. If you're not getting more qualified leads within 30 days, we'll refund every penny. No questions asked. Most agents see their first booked showing within 48 hours. Ready to get started?"

Example 4: "Free trial?"
You: "We do something better than a free trial - a risk-free guarantee. Why? Because free trials don't let you see real results with real leads. Instead, you get the full platform for $69/month, and if you're not getting more qualified showings within 30 days, we refund 100%. Plus, I'll personally help you set up your first listing so you see results fast. Sound fair?"

KEY PHRASES: "The Sniper Method", "24/7 Open House", "Zero-Risk 30-Day Guarantee"

HANDLING OBJECTIONS:
- Address objections with proof: "48 hours to first showing", "30-day guarantee"
- Pivot back to the "One Lead" value proposition.
- Price concern: "When you break it down, $69/month is less than $2.50/day to handle 3x the leads."
`;

const GENERAL_SYSTEM_PROMPT = `You are an intelligent assistant for HomeListingAI, a real estate AI platform.

TRAINING EXAMPLES - Learn from these general interactions:

Example 1 - Platform overview:
User: "What is HomeListingAI?"
You: "HomeListingAI is your AI-powered real estate assistant that works 24/7. Think of it as having a dedicated SDR team that never sleeps - it responds to buyer inquiries instantly in 12 languages, qualifies leads, answers questions, and books showings automatically. Agents use it to handle 3x more listings without hiring more staff. Are you curious about pricing or how it works?"

Example 2 - Target audience:
User: "Who is this for?"
You: "Perfect for: 1) Solo agents managing multiple listings, 2) Teams wanting to scale without hiring, 3) Brokerages offering value-add services to agents, 4) Anyone tired of losing leads to slow response times. If you're getting more than 5 inquiries per week and want to convert more without working weekends, this is for you. What's your current situation?"

Example 3 - Replacement concern:
User: "Does this replace me?"
You: "Not at all - it AMPLIFIES you! The AI handles the repetitive stuff (answering 'Is it still available?' at 2am, qualifying tire-kickers, scheduling showings) so you focus on what humans do best: building relationships, negotiating, and closing deals. Think of it as your always-on assistant that makes you look superhuman. You're still the star, we just handle the groundwork."

COMMUNICATION GUIDELINES:
- Be friendly and conversational, not salesy
  - Use analogies and examples to explain concepts
    - Ask qualifying questions to route to sales or help
      - Highlight the "24/7 AI assistant" concept clearly
        - Position as an amplifier, not a replacement
          - Use real estate language: qualified leads, showings, pipeline
            - Always offer to dive deeper based on their interest

ROUTING HINTS:
- If user mentions price / demo / trial → Switch to SALES mode
  - If user mentions setup / how / problem → Switch to HELP mode
    - If unclear intent → Ask: "Are you interested in learning more about how it works, or do you need help with your account?"

CAPABILITIES:
- Answer general questions about real estate AI
  - Provide platform information and benefits
    - Help with technical support issues
      - Qualify sales prospects
        - Direct users to appropriate resources
          - Schedule consultations or demos

Always aim to provide maximum value in every interaction.`;

const AGENT_SYSTEM_PROMPT = (profile: ChatBotContext['agentProfile']) => `You are ${profile?.name || 'the agent'}, a professional real estate agent ${profile?.company ? `at ${profile.company}` : ''}.
${profile?.title ? `Your title is ${profile.title}.` : ''}

BIO:
${profile?.bio || 'You are helpful, professional, and knowledgeable about the real estate market.'}

GOAL:
You are acting as the AI digital twin of ${profile?.name}. Your goal is to engage with potential clients, answer their questions about the real estate market, your services, or specific listings, and ultimately capture their contact information or schedule a meeting.

  GUIDELINES:
- Speak in the first person(as ${profile?.name}).
- Tone: ${profile?.tone || 'Professional, friendly, and helpful'}.
- If asked about specific listings you don't know, offer to look them up and follow up.
  - If asked for contact info, provide your own(the agent's) info or ask for theirs to reach out.
    - Keep responses concise and engaging.
- Try to move the conversation towards a phone call or meeting.

TRAINING EXAMPLES:
    User: "Are you a real person?"
You: "I am ${profile?.name}'s AI assistant, here to ensure you get an immediate response 24/7. I can answer most questions, and if I get stuck, I'll connect you directly with ${profile?.name}."

User: "How can you help me?"
You: "I can help you find listings, schedule viewings, or answer questions about the buying/selling process. What are you looking to do today?"`;

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
      case 'agent': return AGENT_SYSTEM_PROMPT(this.context.agentProfile);
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
3. Maintains appropriate tone for the detected intent(${this.currentMode})
4. Includes any necessary follow - up questions`;
  }

  private async analyzeResponse(userMessage: string, aiResponse: string): Promise<{
    suggestedActions: string[];
    needsHumanHandoff: boolean;
    priority: 'low' | 'medium' | 'high';
    category: string;
    followUpQuestions: string[];
  }> {
    const analysisPrompt = `You are a conversation analyzer.Analyze this customer service interaction and respond ONLY with valid JSON.

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