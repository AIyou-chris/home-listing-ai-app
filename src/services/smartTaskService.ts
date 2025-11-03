import { AgentTask, Lead, Appointment, Property, TaskPriority } from '../types';

type SmartTaskSource = Lead | Appointment | Property;

export interface SmartTaskConditions {
  leadStatus?: string[];
  daysSinceLastContact?: number;
  appointmentType?: string[];
  propertyAge?: number;
  leadValue?: 'high' | 'medium' | 'low';
}

export type SmartTaskRuleTarget = 'lead' | 'appointment' | 'property';

export interface SmartTaskRule<T extends SmartTaskSource = SmartTaskSource> {
  id: string;
  name: string;
  description: string;
  category: 'follow-up' | 'preparation' | 'marketing' | 'maintenance' | 'analysis';
  priority: TaskPriority;
  conditions: SmartTaskConditions;
  target: SmartTaskRuleTarget;
  generateTask: (data: T) => AgentTask;
}

type SmartTaskRuleConfig =
  | (SmartTaskRule<Lead> & { target: 'lead' })
  | (SmartTaskRule<Appointment> & { target: 'appointment' })
  | (SmartTaskRule<Property> & { target: 'property' });

export class SmartTaskService {
  private static rules: SmartTaskRuleConfig[] = [
    // Follow-up Tasks
    {
      id: 'new-lead-followup',
      name: 'New Lead Follow-up',
      description: 'Follow up with new leads within 24 hours',
      category: 'follow-up',
      priority: 'High',
      conditions: {
        leadStatus: ['New'],
        daysSinceLastContact: 1
      },
      target: 'lead',
      generateTask: (lead: Lead) => ({
        id: `task-${Date.now()}-${Math.random()}`,
        text: `Follow up with ${lead.name} about their interest in ${lead.lastMessage?.includes('property') ? 'the property' : 'real estate'}`,
        isCompleted: false,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        priority: 'High'
      })
    },
    {
      id: 'qualified-lead-nurture',
      name: 'Qualified Lead Nurturing',
      description: 'Nurture qualified leads with personalized content',
      category: 'follow-up',
      priority: 'Medium',
      conditions: {
        leadStatus: ['Qualified'],
        daysSinceLastContact: 3
      },
      target: 'lead',
      generateTask: (lead: Lead) => ({
        id: `task-${Date.now()}-${Math.random()}`,
        text: `Send personalized market update to ${lead.name} based on their interests`,
        isCompleted: false,
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        priority: 'Medium'
      })
    },
    {
      id: 'showing-preparation',
      name: 'Showing Preparation',
      description: 'Prepare for upcoming property showings',
      category: 'preparation',
      priority: 'High',
      conditions: {
        appointmentType: ['showing', 'viewing']
      },
      target: 'appointment',
      generateTask: (appointment: Appointment) => ({
        id: `task-${Date.now()}-${Math.random()}`,
        text: `Prepare showing materials for ${appointment.leadName} at ${appointment.propertyAddress}`,
        isCompleted: false,
        dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 hours before
        priority: 'High'
      })
    },
    {
      id: 'listing-photo-update',
      name: 'Listing Photo Update',
      description: 'Update photos for older listings',
      category: 'maintenance',
      priority: 'Medium',
      conditions: {
        propertyAge: 30 // 30 days
      },
      target: 'property',
      generateTask: (property: Property) => ({
        id: `task-${Date.now()}-${Math.random()}`,
        text: `Update photos for ${property.address} - listing is getting stale`,
        isCompleted: false,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        priority: 'Medium'
      })
    },
    {
      id: 'high-value-lead-priority',
      name: 'High-Value Lead Priority',
      description: 'Prioritize high-value leads with premium service',
      category: 'follow-up',
      priority: 'High',
      conditions: {
        leadValue: 'high'
      },
      target: 'lead',
      generateTask: (lead: Lead) => ({
        id: `task-${Date.now()}-${Math.random()}`,
        text: `VIP follow-up: Schedule personal consultation with ${lead.name} (High-value lead)`,
        isCompleted: false,
        dueDate: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString().split('T')[0], // 12 hours
        priority: 'High'
      })
    },
    {
      id: 'market-analysis',
      name: 'Market Analysis',
      description: 'Generate market analysis for active listings',
      category: 'analysis',
      priority: 'Medium',
      conditions: {
        propertyAge: 14 // 14 days
      },
      target: 'property',
      generateTask: (property: Property) => ({
        id: `task-${Date.now()}-${Math.random()}`,
        text: `Generate market analysis for ${property.address} - adjust pricing if needed`,
        isCompleted: false,
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        priority: 'Medium'
      })
    }
  ];

  static generateSmartTasks(
    leads: Lead[],
    appointments: Appointment[],
    properties: Property[]
  ): AgentTask[] {
    const tasks: AgentTask[] = [];

    this.rules.forEach(rule => {
      switch (rule.target) {
        case 'lead':
          leads.forEach(lead => {
            if (this.matchesConditions(lead, rule.conditions)) {
              tasks.push(rule.generateTask(lead));
            }
          });
          break;
        case 'appointment':
          appointments.forEach(appointment => {
            if (this.matchesConditions(appointment, rule.conditions)) {
              tasks.push(rule.generateTask(appointment));
            }
          });
          break;
        case 'property':
          properties.forEach(property => {
            if (this.matchesConditions(property, rule.conditions)) {
              tasks.push(rule.generateTask(property));
            }
          });
          break;
      }
    });

    return tasks;
  }

  private static matchesConditions(data: SmartTaskSource, conditions: SmartTaskConditions): boolean {
    // Check lead status
    if (conditions.leadStatus) {
      if (!('status' in data) || typeof data.status !== 'string') {
        return false;
      }
      if (!conditions.leadStatus.includes(data.status)) {
        return false;
      }
    }

    // Check days since last contact
    if (conditions.daysSinceLastContact) {
      if (!('lastContactDate' in data) || !data.lastContactDate) {
        return false;
      }
      const daysSince = Math.floor((Date.now() - new Date(data.lastContactDate).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince < conditions.daysSinceLastContact) {
        return false;
      }
    }

    // Check appointment type
    if (conditions.appointmentType) {
      if (!('type' in data) || typeof data.type !== 'string') {
        return false;
      }
      if (!conditions.appointmentType.includes(data.type)) {
        return false;
      }
    }

    // Check property age
    if (conditions.propertyAge) {
      if (!('listedDate' in data) || !data.listedDate) {
        return false;
      }
      const daysListed = Math.floor((Date.now() - new Date(data.listedDate).getTime()) / (1000 * 60 * 60 * 24));
      if (daysListed < conditions.propertyAge) {
        return false;
      }
    }

    // Check lead value
    if (conditions.leadValue) {
      if (!('value' in data) || data.value !== conditions.leadValue) {
        return false;
      }
    }

    return true;
  }

  static getTaskCategories(): { id: string; name: string; color: string }[] {
    return [
      { id: 'follow-up', name: 'Follow-up', color: 'bg-blue-100 text-blue-700' },
      { id: 'preparation', name: 'Preparation', color: 'bg-green-100 text-green-700' },
      { id: 'marketing', name: 'Marketing', color: 'bg-purple-100 text-purple-700' },
      { id: 'maintenance', name: 'Maintenance', color: 'bg-orange-100 text-orange-700' },
      { id: 'analysis', name: 'Analysis', color: 'bg-indigo-100 text-indigo-700' }
    ];
  }

  static getTaskStats(tasks: AgentTask[]) {
    const stats = {
      total: tasks.length,
      completed: tasks.filter(t => t.isCompleted).length,
      pending: tasks.filter(t => !t.isCompleted).length,
      highPriority: tasks.filter(t => t.priority === 'High' && !t.isCompleted).length,
      overdue: tasks.filter(t => {
        if (t.isCompleted) return false;
        const dueDate = new Date(t.dueDate);
        return dueDate < new Date();
      }).length
    };

    return {
      ...stats,
      completionRate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
    };
  }
}
