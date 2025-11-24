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
  data?: Record<string, unknown>;
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

const notificationStore = new Map<string, UserNotification[]>();
const broadcastStore: BroadcastMessage[] = [];
const systemAlertStore: SystemAlert[] = [];
const scheduledEmailStore: ScheduledEmail[] = [];

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
        const id = `notif_${Date.now()}`;
        const notification: UserNotification = {
            id,
            userId,
            title,
            content,
            type,
            priority,
            read: false,
            createdAt: new Date().toISOString(),
            expiresAt
        };

        const existing = notificationStore.get(userId) ?? [];
        notificationStore.set(userId, [...existing, notification]);

        return id;
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
        const notifications = notificationStore.get(userId) ?? [];
        if (typeof read === 'boolean') {
            return notifications.filter(notification => notification.read === read);
        }
        return [...notifications];
    }

    static async markNotificationAsRead(notificationId: string): Promise<void> {
        for (const [userId, notifications] of notificationStore.entries()) {
            const updated = notifications.map(notification =>
                notification.id === notificationId
                    ? { ...notification, read: true, readAt: new Date().toISOString() }
                    : notification
            );
            notificationStore.set(userId, updated);
        }
    }

    static async markAllNotificationsAsRead(userId: string): Promise<void> {
        const notifications = notificationStore.get(userId);
        if (!notifications) return;

        notificationStore.set(
            userId,
            notifications.map(notification => ({
                ...notification,
                read: true,
                readAt: new Date().toISOString()
            }))
        );
    }

    static async getUnreadNotificationCount(userId: string): Promise<number> {
        const notifications = notificationStore.get(userId) ?? [];
        return notifications.filter(notification => !notification.read).length;
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
        const message: BroadcastMessage = {
            id: `broadcast_${Date.now()}`,
            title,
            content,
            messageType,
            priority,
            targetAudience,
            sentBy,
            sentAt: scheduledFor ?? new Date().toISOString(),
            scheduledFor,
            status: scheduledFor ? 'scheduled' : 'draft',
            deliveryStats: {
                totalRecipients: targetAudience.length,
                delivered: 0,
                read: 0,
                failed: 0
            }
        };

        broadcastStore.push(message);
        return message.id;
    }

    static async sendBroadcastMessage(
        title: string,
        content: string,
        messageType: BroadcastMessage['messageType'],
        priority: BroadcastMessage['priority'],
        targetAudience: string[],
        sentBy: string
    ): Promise<string> {
        const messageId = `broadcast_${Date.now()}`;
        const deliveryStats = {
            totalRecipients: targetAudience.length,
            delivered: targetAudience.length,
            read: 0,
            failed: 0
        };

        const message: BroadcastMessage = {
            id: messageId,
            title,
            content,
            messageType,
            priority,
            targetAudience,
            sentBy,
            sentAt: new Date().toISOString(),
            status: 'sent',
            deliveryStats
        };

        broadcastStore.push(message);

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
        if (status) {
            return broadcastStore.filter(message => message.status === status);
        }
        return [...broadcastStore];
    }

    static async updateBroadcastMessage(messageId: string, updates: Partial<BroadcastMessage>): Promise<void> {
        const index = broadcastStore.findIndex(message => message.id === messageId);
        if (index === -1) return;

        broadcastStore[index] = {
            ...broadcastStore[index],
            ...updates,
            deliveryStats: {
                ...broadcastStore[index].deliveryStats,
                ...(updates.deliveryStats ?? {})
            }
        };
    }

    static async sendBroadcastNotification(message: Omit<BroadcastMessage, 'id'>): Promise<void> {
        await this.sendBroadcastMessage(
            message.title,
            message.content,
            message.messageType,
            message.priority,
            message.targetAudience,
            message.sentBy
        );
    }

    static async sendUserNotification(userId: string, notification: Omit<UserNotification, 'id' | 'createdAt'>): Promise<void> {
        await this.sendNotificationToUser(
            userId,
            notification.title,
            notification.content,
            notification.type,
            notification.priority,
            notification.expiresAt
        );
    }

    static async sendEmailToUsers(userIds: string[], email: EmailTemplate): Promise<void> {
        for (const userId of userIds) {
            const sentEmail: ScheduledEmail = {
                id: `email_${Date.now()}_${Math.random().toString(36).slice(2)}`,
                to: userId,
                subject: email.subject,
                body: email.body,
                scheduledFor: new Date().toISOString(),
                status: 'sent'
            };
            scheduledEmailStore.push(sentEmail);
        }
    }

    static async sendScheduledEmail(scheduledEmail: Omit<ScheduledEmail, 'id' | 'status'>): Promise<string> {
        const email: ScheduledEmail = {
            ...scheduledEmail,
            id: `scheduled_${Date.now()}`,
            status: 'pending'
        };
        scheduledEmailStore.push(email);
        return email.id;
    }

    static async sendPushNotification(userIds: string[], notification: PushNotification): Promise<void> {
        for (const userId of userIds) {
            await this.sendNotificationToUser(
                userId,
                notification.title,
                notification.body,
                'system',
                'medium'
            );
        }
    }

    // System Alerts
    static async createSystemAlert(
        type: SystemAlert['type'],
        title: string,
        description: string,
        severity: SystemAlert['severity'],
        component: string
    ): Promise<string> {
        const alert: SystemAlert = {
            id: `alert_${Date.now()}`,
            type,
            title,
            description,
            severity,
            component,
            createdAt: new Date().toISOString(),
            status: 'active'
        };

        systemAlertStore.push(alert);
        return alert.id;
    }

    static async getSystemAlerts(status?: SystemAlert['status']): Promise<SystemAlert[]> {
        if (status) {
            return systemAlertStore.filter(alert => alert.status === status);
        }
        return [...systemAlertStore];
    }

    static async acknowledgeSystemAlert(alertId: string, acknowledgedBy: string): Promise<void> {
        const alert = systemAlertStore.find(item => item.id === alertId);
        if (!alert) return;

        alert.status = 'acknowledged';
        alert.acknowledgedBy = acknowledgedBy;
        alert.acknowledgedAt = new Date().toISOString();
    }

    static async resolveSystemAlert(alertId: string): Promise<void> {
        const alert = systemAlertStore.find(item => item.id === alertId);
        if (!alert) return;

        alert.status = 'resolved';
        alert.resolvedAt = new Date().toISOString();
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
        const userIds = Array.from(notificationStore.keys());
        
        const messageId = await this.createBroadcastMessage(
            title,
            content,
            'System',
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
        callback(notificationStore.get(userId) ?? []);
        return () => {};
    }

    static subscribeToSystemAlerts(callback: (alerts: SystemAlert[]) => void) {
        callback([...systemAlertStore]);
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
