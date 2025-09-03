// DatabaseService removed - using Supabase alternatives
import { UserNotification, BroadcastMessage, SystemAlert } from '../types';

// Additional types for extended notification functionality
export interface EmailTemplate {
  subject: string;
  body: string;
  variables?: Record<string, string>;
}

export interface PushNotification {
  title: string;
  body: string;
  data?: Record<string, any>;
  badge?: number;
}

export interface ScheduledEmail {
  id: string;
  to: string;
  subject: string;
  body: string;
  scheduledFor: string;
  status: 'pending' | 'sent' | 'failed';
}

export default class NotificationService {
    // Send notification to a single user
    static async sendNotificationToUser(
        userId: string,
        title: string,
        content: string,
        type: UserNotification['type'] = 'system',
        priority: UserNotification['priority'] = 'medium',
        expiresAt?: string
    ): Promise<string> {
        // DatabaseService removed
        return 'notif_' + Date.now();
    }

    static async sendNotificationToMultipleUsers(
        userIds: string[],
        title: string,
        content: string,
        type: UserNotification['type'] = 'broadcast',
        priority: UserNotification['priority'] = 'medium'
    ): Promise<string[]> {
        const notificationIds: string[] = [];
        
        for (const userId of userIds) {
            const id = await this.sendNotificationToUser(userId, title, content, type, priority);
            notificationIds.push(id);
        }
        
        return notificationIds;
    }

    static async getUserNotifications(userId: string, read?: boolean): Promise<UserNotification[]> {
        // DatabaseService removed
        return [];
    }

    static async markNotificationAsRead(notificationId: string): Promise<void> {
        // DatabaseService removed - no-op
    }

    static async markAllNotificationsAsRead(userId: string): Promise<void> {
        // DatabaseService removed - no-op
    }

    static async getUnreadNotificationCount(userId: string): Promise<number> {
        // DatabaseService removed
        return 0;
    }

    // Broadcast Messages
    static async createBroadcastMessage(
        title: string,
        content: string,
        messageType: BroadcastMessage['messageType'],
        priority: BroadcastMessage['priority'],
        targetAudience: string[],
        sentBy: string,
        scheduledFor?: string
    ): Promise<string> {
        // DatabaseService removed
        return 'broadcast_' + Date.now();
    }

    static async sendBroadcastMessage(
        title: string,
        content: string,
        messageType: BroadcastMessage['messageType'],
        priority: BroadcastMessage['priority'],
        targetAudience: string[],
        sentBy: string
    ): Promise<string> {
        // DatabaseService removed
        const messageId = 'bulk_' + Date.now();

        // Send notifications to all target users
        await this.sendNotificationToMultipleUsers(
            targetAudience,
            title,
            content,
            'broadcast',
            priority
        );

        return messageId;
    }

    static async getBroadcastMessages(status?: BroadcastMessage['status']): Promise<BroadcastMessage[]> {
        // DatabaseService removed
        return [];
    }

    static async updateBroadcastMessage(messageId: string, updates: Partial<BroadcastMessage>): Promise<void> {
        // DatabaseService removed - no-op
    }

    static async sendBroadcastNotification(message: Omit<BroadcastMessage, 'id'>): Promise<void> {
        // DatabaseService removed - no-op
    }

    static async sendUserNotification(userId: string, notification: Omit<UserNotification, 'id' | 'createdAt'>): Promise<void> {
        // DatabaseService removed - no-op
    }

    static async sendEmailToUsers(userIds: string[], email: EmailTemplate): Promise<void> {
        // DatabaseService removed - no-op
    }

    static async sendScheduledEmail(scheduledEmail: Omit<ScheduledEmail, 'id' | 'status'>): Promise<string> {
        // DatabaseService removed
        return 'scheduled_' + Date.now();
    }

    static async sendPushNotification(userIds: string[], notification: PushNotification): Promise<void> {
        // DatabaseService removed - no-op
    }

    // System Alerts
    static async createSystemAlert(
        type: SystemAlert['type'],
        title: string,
        description: string,
        severity: SystemAlert['severity'],
        component: string
    ): Promise<string> {
        // DatabaseService removed
        return 'alert_' + Date.now();
    }

    static async getSystemAlerts(status?: SystemAlert['status']): Promise<SystemAlert[]> {
        // DatabaseService removed
        return [];
    }

    static async acknowledgeSystemAlert(alertId: string, acknowledgedBy: string): Promise<void> {
        // DatabaseService removed - no-op
    }

    static async resolveSystemAlert(alertId: string): Promise<void> {
        // DatabaseService removed - no-op
    }

    // Helper methods for common notifications
    static async sendWelcomeNotification(userId: string, userName: string): Promise<string> {
        return await this.sendNotificationToUser(
            userId,
            'Welcome to Home Listing AI!',
            `Hi ${userName}! Welcome to our platform. Start by creating your first property listing.`,
            'system',
            'medium'
        );
    }

    static async sendSubscriptionExpiryNotification(userId: string, daysUntilExpiry: number): Promise<string> {
        const title = daysUntilExpiry === 0 
            ? 'Your subscription has expired'
            : `Your subscription expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}`;
        
        const content = daysUntilExpiry === 0
            ? 'Your subscription has expired. Please renew to continue using all features.'
            : `Your subscription will expire in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}. Please renew to avoid service interruption.`;

        return await this.sendNotificationToUser(
            userId,
            title,
            content,
            'billing',
            'high'
        );
    }

    static async sendMaintenanceNotification(
        title: string,
        content: string,
        priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'
    ): Promise<string> {
        // DatabaseService removed
        const users: any[] = [];
        const userIds = users.map(user => user.id);
        
        const messageId = await this.createBroadcastMessage(
            title,
            content,
            'system',
            priority,
            userIds,
            'system'
        );

        await this.sendNotificationToMultipleUsers(
            userIds,
            title,
            content,
            'system',
            priority
        );

        return messageId;
    }

    // Real-time subscriptions (no-op implementations)
    static subscribeToUserNotifications(userId: string, callback: (notifications: UserNotification[]) => void) {
        // DatabaseService removed
        return () => {};
    }

    static subscribeToSystemAlerts(callback: (alerts: SystemAlert[]) => void) {
        // DatabaseService removed
        return () => {};
    }

    // Email template helpers
    static createWelcomeEmailTemplate(userName: string): EmailTemplate {
        return {
            subject: 'Welcome to Home Listing AI!',
            body: `Hi ${userName}!\n\nWelcome to Home Listing AI. We're excited to help you create amazing property listings with the power of AI.\n\nHere's how to get started:\n1. Create your first property listing\n2. Use our AI tools to generate descriptions\n3. Set up automated follow-ups\n\nIf you have any questions, our support team is here to help.\n\nBest regards,\nThe Home Listing AI Team`,
            variables: {
                userName: userName
            }
        };
    }

    static createSubscriptionExpiryEmailTemplate(userName: string, daysUntilExpiry: number): EmailTemplate {
        const isExpired = daysUntilExpiry <= 0;
        const subject = isExpired 
            ? 'Your Home Listing AI subscription has expired'
            : `Your subscription expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}`;

        const body = isExpired
            ? `Hi ${userName},\n\nYour Home Listing AI subscription has expired. To continue using all features, please renew your subscription.\n\nRenew now to:\n- Keep creating AI-powered listings\n- Access all premium features\n- Maintain your data and settings\n\nRenew your subscription today!\n\nBest regards,\nThe Home Listing AI Team`
            : `Hi ${userName},\n\nYour Home Listing AI subscription will expire in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}.\n\nDon't miss out on:\n- AI-powered listing generation\n- Advanced analytics\n- Premium support\n\nRenew now to continue enjoying all features without interruption.\n\nBest regards,\nThe Home Listing AI Team`;

        return {
            subject,
            body,
            variables: {
                userName: userName,
                daysUntilExpiry: daysUntilExpiry.toString()
            }
        };
    }

    // Push notification helpers
    static createNewLeadPushNotification(leadName: string, propertyAddress?: string): PushNotification {
        return {
            title: 'New Lead Received!',
            body: propertyAddress 
                ? `${leadName} is interested in ${propertyAddress}`
                : `You have a new lead from ${leadName}`,
            data: {
                type: 'new_lead',
                leadName: leadName,
                propertyAddress: propertyAddress
            },
            badge: 1
        };
    }

    static createAppointmentReminderPushNotification(clientName: string, time: string, propertyAddress?: string): PushNotification {
        return {
            title: 'Appointment Reminder',
            body: propertyAddress
                ? `Meeting with ${clientName} at ${time} for ${propertyAddress}`
                : `Meeting with ${clientName} at ${time}`,
            data: {
                type: 'appointment_reminder',
                clientName: clientName,
                time: time,
                propertyAddress: propertyAddress
            }
        };
    }
}