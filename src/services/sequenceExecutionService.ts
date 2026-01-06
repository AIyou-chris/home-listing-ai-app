import { FollowUpSequence, SequenceStep, Lead, Property, AgentProfile } from '../types';
import { EmailService } from './emailService';

export type SequenceTriggerType =
  | 'Lead Capture'
  | 'Appointment Scheduled'
  | 'Property Viewed'
  | 'Buyer Lead'
  | 'Seller Lead';
interface SequenceContext {
  lead: Lead;
  property?: Property;
  agent: AgentProfile;
  customData?: Record<string, unknown>;
}

interface ActiveSequence {
  id: string;
  leadId: string;
  sequenceId: string;
  currentStepIndex: number;
  nextExecutionTime: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  context: SequenceContext;
}

class SequenceExecutionService {
  private static instance: SequenceExecutionService;
  private emailService: EmailService;
  private activeSequences: Map<string, ActiveSequence> = new Map();

  private constructor() {
    this.emailService = EmailService.getInstance();
    this.startScheduler();
  }

  static getInstance(): SequenceExecutionService {
    if (!SequenceExecutionService.instance) {
      SequenceExecutionService.instance = new SequenceExecutionService();
    }
    return SequenceExecutionService.instance;
  }

  /**
   * Start a new sequence for a lead
   */
  async startSequence(
    sequence: FollowUpSequence,
    context: SequenceContext
  ): Promise<string> {
    const activeSequenceId = `seq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const activeSequence: ActiveSequence = {
      id: activeSequenceId,
      leadId: context.lead.id,
      sequenceId: sequence.id,
      currentStepIndex: 0,
      nextExecutionTime: new Date().toISOString(),
      status: 'active',
      context
    };

    this.activeSequences.set(activeSequenceId, activeSequence);

    console.log(`🚀 Started sequence "${sequence.name}" for lead ${context.lead.name}`);

    // Execute first step immediately if delay is 0
    const firstStep = sequence.steps[0];
    if (firstStep && this.getDelayInMs(firstStep.delay) === 0) {
      await this.executeStep(activeSequence, sequence, firstStep);
    }

    return activeSequenceId;
  }

  /**
   * Execute a single sequence step
   */
  private async executeStep(
    activeSequence: ActiveSequence,
    sequence: FollowUpSequence,
    step: SequenceStep
  ): Promise<void> {
    try {
      console.log(`📧 Executing step ${activeSequence.currentStepIndex + 1} of sequence "${sequence.name}"`);

      const stepType = step.type.toLowerCase();

      switch (stepType) {
        case 'email':
          await this.executeEmailStep(activeSequence, step);
          break;
        case 'ai-email':
          await this.executeAIEmailStep(activeSequence, step);
          break;
        case 'task':
          await this.executeTaskStep(activeSequence, step);
          break;
        case 'meeting':
          await this.executeMeetingStep(activeSequence, step);
          break;
        case 'call':
          await this.executeCallStep(activeSequence, step);
          break;
        case 'sms':
        case 'text':
          await this.executeSmsStep(activeSequence, step);
          break;
        default:
          console.warn(`Unknown step type: ${step.type}`);
      }

      // Move to next step
      activeSequence.currentStepIndex++;

      // Check if sequence is complete
      if (activeSequence.currentStepIndex >= sequence.steps.length) {
        activeSequence.status = 'completed';
        console.log(`✅ Sequence "${sequence.name}" completed for ${activeSequence.context.lead.name}`);
      } else {
        // Schedule next step
        const nextStep = sequence.steps[activeSequence.currentStepIndex];
        const delayMs = this.getDelayInMs(nextStep.delay);
        activeSequence.nextExecutionTime = new Date(Date.now() + delayMs).toISOString();
        console.log(`⏰ Next step scheduled for ${activeSequence.nextExecutionTime}`);
      }

    } catch (error) {
      console.error(`❌ Error executing step:`, error);
      activeSequence.status = 'paused';
    }
  }

  /**
   * Execute email step with variable substitution
   */
  private async executeEmailStep(activeSequence: ActiveSequence, step: SequenceStep): Promise<void> {
    const { lead, property, agent } = activeSequence.context;

    const subject = this.substituteVariables(step.subject || 'Follow-up', { lead, property, agent });
    const content = this.substituteVariables(step.content, { lead, property, agent });

    const htmlContent = this.convertToHtml(content) + `
      <div style="margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px; font-family: sans-serif;">
        <p style="font-size: 12px; color: #64748b; margin-bottom: 5px;">
          You are receiving this email because you requested information about a property or contacted ${agent.company || 'us'}.
        </p>
        <p style="font-size: 12px; color: #64748b;">
          <a href="https://homelistingai.com/unsubscribe?email=${encodeURIComponent(lead.email)}" style="color: #64748b; text-decoration: underline;">Unsubscribe</a> from future updates.
        </p>
      </div>
    `;

    const success = await this.emailService.sendEmail(
      lead.email,
      subject,
      htmlContent
    );

    if (success) {
      console.log(`✅ Email sent to ${lead.email}: "${subject}"`);
    } else {
      console.error(`❌ Failed to send email to ${lead.email}`);
      throw new Error('Email sending failed');
    }
  }

  /**
   * Execute AI-generated email step
   */
  private async executeAIEmailStep(activeSequence: ActiveSequence, step: SequenceStep): Promise<void> {
    // For now, treat as regular email - could integrate with AI service later
    console.log(`🤖 AI Email step: ${step.content}`);
    // This would generate personalized content using AI
    await this.executeEmailStep(activeSequence, {
      ...step,
      subject: 'Personalized Follow-up',
      content: step.content
    });
  }

  /**
   * Execute task step (creates a task for the agent)
   */
  private async executeTaskStep(activeSequence: ActiveSequence, step: SequenceStep): Promise<void> {
    const { lead, property, agent } = activeSequence.context;
    const taskContent = this.substituteVariables(step.content, { lead, property, agent });

    console.log(`📋 Task created: ${taskContent}`);

    // Could integrate with task management system
    // For now, just log the task
  }

  /**
   * Execute meeting step (schedules a meeting)
   */
  private async executeMeetingStep(_activeSequence: ActiveSequence, _step: SequenceStep): Promise<void> {
    // Could integrate with calendar scheduling
  }

  /**
   * Execute call step (triggers Vapi AI call)
   */
  private async executeCallStep(activeSequence: ActiveSequence, step: SequenceStep): Promise<void> {
    const { lead, property, agent } = activeSequence.context;

    // Convert template variables in script
    const script = this.substituteVariables(step.content, { lead, property, agent });

    console.log(`📞 Executing AI Call Step: Calling ${lead.name}...`);

    try {
      const response = await fetch('/api/vapi/call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leadId: lead.id,
          agentId: agent.id,
          propertyId: property?.id,
          script: script,
          leadName: lead.name,
          leadPhone: lead.phone,
          callType: step.callType // Pass 'sales' or 'agent'
        }),
      });

      if (!response.ok) {
        throw new Error(`Call API failed: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ AI Call Initiated successfully. Call ID: ${data.callId}`);

    } catch (error) {
      console.error('❌ Failed to execute AI call step:', error);
      throw error;
    }
  }

  /**
   * Execute SMS step
   */
  private async executeSmsStep(activeSequence: ActiveSequence, step: SequenceStep): Promise<void> {
    const { lead, property, agent } = activeSequence.context;

    // Substitute variables
    let message = this.substituteVariables(step.content, { lead, property, agent });

    // COMPLIANCE: Append STOP instruction if not present
    if (!message.toLowerCase().includes('stop')) {
      message += '\n\nReply STOP to unsubscribe';
    }

    console.log(`📱 Executing SMS Step: Sending to ${lead.phone}...`);

    try {
      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: lead.phone,
          message: message,
          userId: agent.id || 'system'
        }),
      });

      if (!response.ok) {
        throw new Error(`SMS API successful response not received: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ SMS Sent successfully`, data);

    } catch (error) {
      console.error('❌ Failed to execute SMS step:', error);
      throw error;
    }
  }

  /**
   * Substitute template variables with actual values
   */
  private substituteVariables(
    template: string,
    context: { lead: Lead; property?: Property; agent: AgentProfile }
  ): string {
    let result = template;

    // Lead variables
    result = result.replace(/\{\{lead\.name\}\}/g, context.lead.name || '');
    result = result.replace(/\{\{lead\.email\}\}/g, context.lead.email || '');
    result = result.replace(/\{\{lead\.phone\}\}/g, context.lead.phone || '');

    // Property variables
    if (context.property) {
      result = result.replace(/\{\{property\.address\}\}/g, context.property.address || '');
      result = result.replace(/\{\{property\.price\}\}/g, context.property.price?.toLocaleString() || '');
      result = result.replace(/\{\{property\.bedrooms\}\}/g, context.property.bedrooms?.toString() || '');
      result = result.replace(/\{\{property\.bathrooms\}\}/g, context.property.bathrooms?.toString() || '');
      result = result.replace(/\{\{property\.squareFeet\}\}/g, context.property.squareFeet?.toLocaleString() || '');
      result = result.replace(/\{\{property\.type\}\}/g, context.property.propertyType || '');
      result = result.replace(/\{\{property\.features\}\}/g, context.property.features?.join(', ') || '');
    }

    // Agent variables
    result = result.replace(/\{\{agent\.name\}\}/g, context.agent.name || '');
    result = result.replace(/\{\{agent\.title\}\}/g, context.agent.title || '');
    result = result.replace(/\{\{agent\.company\}\}/g, context.agent.company || '');
    result = result.replace(/\{\{agent\.phone\}\}/g, context.agent.phone || '');
    result = result.replace(/\{\{agent\.email\}\}/g, context.agent.email || '');

    return result;
  }

  /**
   * Convert plain text to HTML
   */
  private convertToHtml(text: string): string {
    return text
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');
  }

  /**
   * Convert delay to milliseconds
   */
  private getDelayInMs(delay: { value: number; unit: 'minutes' | 'hours' | 'days' }): number {
    const multipliers = {
      minutes: 60 * 1000,
      hours: 60 * 60 * 1000,
      days: 24 * 60 * 60 * 1000
    };
    return delay.value * multipliers[delay.unit];
  }

  /**
   * Background scheduler to process pending steps
   */
  private startScheduler(): void {
    setInterval(() => {
      this.processPendingSteps();
    }, 60000); // Check every minute
  }

  /**
   * Process all pending sequence steps
   */
  private async processPendingSteps(): Promise<void> {
    const now = new Date();

    for (const [id, activeSequence] of this.activeSequences) {
      if (
        activeSequence.status === 'active' &&
        new Date(activeSequence.nextExecutionTime) <= now
      ) {
        try {
          // Get the sequence data (would normally fetch from database)
          const sequence = await this.getSequenceById(activeSequence.sequenceId);
          if (sequence && activeSequence.currentStepIndex < sequence.steps.length) {
            const step = sequence.steps[activeSequence.currentStepIndex];
            await this.executeStep(activeSequence, sequence, step);
          }
        } catch (error) {
          console.error(`Error processing sequence ${id}:`, error);
        }
      }

      // Clean up completed sequences
      if (activeSequence.status === 'completed') {
        this.activeSequences.delete(id);
      }
    }
  }

  /**
   * Get sequence by ID from server
   */
  private async getSequenceById(sequenceId: string): Promise<FollowUpSequence | null> {
    try {
      const response = await fetch(`/api/admin/marketing/sequences/${sequenceId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.success ? data.sequence : null;
    } catch (error) {
      console.error('Error fetching sequence:', error);
      return null;
    }
  }

  /**
   * Trigger sequences based on events
   */
  async triggerSequences(
    triggerType: SequenceTriggerType,
    context: SequenceContext,
    availableSequences: FollowUpSequence[]
  ): Promise<void> {
    const matchingSequences = availableSequences.filter(
      seq => seq.triggerType === triggerType && seq.isActive
    );

    for (const sequence of matchingSequences) {
      await this.startSequence(sequence, context);
    }
  }

  /**
   * Get active sequences for a lead
   */
  getActiveSequencesForLead(leadId: string): ActiveSequence[] {
    return Array.from(this.activeSequences.values())
      .filter(seq => seq.leadId === leadId);
  }

  /**
   * Cancel a sequence
   */
  cancelSequence(sequenceId: string): void {
    const activeSequence = this.activeSequences.get(sequenceId);
    if (activeSequence) {
      activeSequence.status = 'cancelled';
      console.log(`❌ Cancelled sequence ${sequenceId}`);
    }
  }
}

export default SequenceExecutionService;
