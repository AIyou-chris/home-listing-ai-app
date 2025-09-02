import DatabaseService from './databaseService';
import { UserNotification, BroadcastMessage, SystemAlert } from '../types';

// Additional types for extended notification functionality
export interface EmailTemplate {
  subject: string;
  body: string;
  htmlBody?: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
}

export interface ScheduledEmail {
  id: string;
  userIds: string[];
  template: EmailTemplate;
  scheduledFor: string; // ISO timestamp
  status: 'scheduled' | 'sent' | 'failed' | 'cancelled';
  sentAt?: string;
  errorMessage?: string;
}

export interface PushNotification {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  data?: {
    [key: string]: any;
  };
  actions?: {
    action: string;
    title: string;
    icon?: string;
  }[];
}

export class NotificationService {
    // User Notifications
    static async sendNotificationToUser(
        userId: string,
        title: string,
        content: string,
        type: UserNotification['type'] = 'system',
        priority: UserNotification['priority'] = 'medium',
        expiresAt?: string
    ): Promise<string> {
        return await DatabaseService.createUserNotification({
            userId,
            title,
            content,
            type,
            priority,
            expiresAt,
            read: false
        });
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
        return await DatabaseService.getUserNotifications(userId, read);
    }

    static async markNotificationAsRead(notificationId: string): Promise<void> {
        await DatabaseService.markNotificationAsRead(notificationId);
    }

    static async markAllNotificationsAsRead(userId: string): Promise<void> {
        await DatabaseService.markAllNotificationsAsRead(userId);
    }

    static async getUnreadNotificationCount(userId: string): Promise<number> {
        return await DatabaseService.getUnreadNotificationCount(userId);
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
        return await DatabaseService.createBroadcastMessage({
            title,
            content,
            messageType,
            priority,
            targetAudience,
            sentBy,
            scheduledFor,
            status: scheduledFor ? 'scheduled' : 'draft',
            sentAt: scheduledFor ? undefined : new Date().toISOString(),
            deliveryStats: { totalRecipients: targetAudience.length, delivered: 0, read: 0, failed: 0 }
        });
    }

    static async sendBroadcastMessage(
        title: string,
        content: string,
        messageType: BroadcastMessage['messageType'],
        priority: BroadcastMessage['priority'],
        targetAudience: string[],
        sentBy: string
    ): Promise<string> {
        const messageId = await DatabaseService.createBroadcastMessage({
            title,
            content,
            messageType,
            priority,
            targetAudience,
            sentBy,
            status: 'sent',
            sentAt: new Date().toISOString(),
            deliveryStats: { totalRecipients: targetAudience.length, delivered: 0, read: 0, failed: 0 }
        });

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
        return await DatabaseService.getBroadcastMessages(status);
    }

    static async updateBroadcastMessage(messageId: string, updates: Partial<BroadcastMessage>): Promise<void> {
        await DatabaseService.updateBroadcastMessage(messageId, updates);
    }

    // NEW: Broadcast notifications
    static async sendBroadcastNotification(message: Omit<BroadcastMessage, 'id'>): Promise<void> {
        await DatabaseService.createBroadcastMessage({
            ...message,
            sentAt: message.sentAt || new Date().toISOString(),
            deliveryStats: message.deliveryStats || {
                totalRecipients: message.targetAudience.length,
                delivered: 0,
                read: 0,
                failed: 0
            }
        });

        // Send notifications to all target users
        await this.sendNotificationToMultipleUsers(
            message.targetAudience,
            message.title,
            message.content,
            'broadcast',
            message.priority
        );
    }

    // NEW: Send user notification with full object
    static async sendUserNotification(userId: string, notification: Omit<UserNotification, 'id' | 'createdAt'>): Promise<void> {
        await DatabaseService.createUserNotification({
            ...notification,
            userId,
            read: false
        });
    }

    // NEW: Email notifications
    static async sendEmailToUsers(userIds: string[], email: EmailTemplate): Promise<void> {
        try {
            // Simulate email sending (replace with actual email service)
            console.log(`Sending email to ${userIds.length} users:`, {
                subject: email.subject,
                from: email.fromEmail || 'noreply@homelisting-ai.com',
                to: userIds.length + ' recipients'
            });

            // In a real implementation, you would:
            // 1. Get user email addresses from the database
            // 2. Send emails using a service like SendGrid, AWS SES, etc.
            // 3. Track email delivery status
            // 4. Handle bounces and failures

            // For now, we'll just log the action
            for (const userId of userIds) {
                console.log(`Email sent to user ${userId}: ${email.subject}`);
            }

            // Create notifications for email recipients
            await this.sendNotificationToMultipleUsers(
                userIds,
                'Email Sent',
                `An email has been sent to you: ${email.subject}`,
                'system',
                'low'
            );

        } catch (error) {
            console.error('Failed to send emails:', error);
            throw error;
        }
    }

    static async sendScheduledEmail(scheduledEmail: Omit<ScheduledEmail, 'id' | 'status'>): Promise<string> {
        try {
            const emailId = `scheduled_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            console.log(`Scheduled email created:`, {
                id: emailId,
                scheduledFor: scheduledEmail.scheduledFor,
                recipients: scheduledEmail.userIds.length,
                subject: scheduledEmail.template.subject
            });

            const scheduledTime = new Date(scheduledEmail.scheduledFor);
            const now = new Date();
            const delay = scheduledTime.getTime() - now.getTime();

            if (delay > 0) {
                setTimeout(async () => {
                    try {
                        await this.sendEmailToUsers(scheduledEmail.userIds, scheduledEmail.template);
                        console.log(`Scheduled email ${emailId} sent successfully`);
                    } catch (error) {
                        console.error(`Failed to send scheduled email ${emailId}:`, error);
                    }
                }, delay);
            } else {
                await this.sendEmailToUsers(scheduledEmail.userIds, scheduledEmail.template);
            }

            return emailId;
        } catch (error) {
            console.error('Failed to schedule email:', error);
            throw error;
        }
    }

    // NEW: Push notifications
    static async sendPushNotification(userIds: string[], notification: PushNotification): Promise<void> {
        try {
            console.log(`Sending push notification to ${userIds.length} users:`, {
                title: notification.title,
                body: notification.body,
                tag: notification.tag
            });

            await this.sendNotificationToMultipleUsers(
                userIds,
                notification.title,
                notification.body,
                'system',
                'medium'
            );

            for (const userId of userIds) {
                console.log(`Push notification sent to user ${userId}: ${notification.title}`);
            }

        } catch (error) {
            console.error('Failed to send push notifications:', error);
            throw error;
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
        return await DatabaseService.createSystemAlert({
            type,
            title,
            description,
            severity,
            component,
            status: 'active',
            // createdAt handled by DatabaseService
        });
    }

    static async getSystemAlerts(status?: SystemAlert['status']): Promise<SystemAlert[]> {
        return await DatabaseService.getSystemAlerts(status);
    }

    static async acknowledgeSystemAlert(alertId: string, acknowledgedBy: string): Promise<void> {
        await DatabaseService.acknowledgeSystemAlert(alertId, acknowledgedBy);
    }

    static async resolveSystemAlert(alertId: string): Promise<void> {
        await DatabaseService.resolveSystemAlert(alertId);
    }

    // Utility Methods
    static async sendWelcomeNotification(userId: string, userName: string): Promise<string> {
        return await this.sendNotificationToUser(
            userId,
            'Welcome to HomeListing AI!',
            `Hi ${userName}, welcome to HomeListing AI! We're excited to help you streamline your real estate business with AI-powered tools.`,
            'feature',
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
            daysUntilExpiry <= 1 ? 'high' : 'medium'
        );
    }

    static async sendMaintenanceNotification(
        title: string,
        content: string,
        priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'
    ): Promise<string> {
        const users = await DatabaseService.getUsersByStatus('Active');
        const userIds = users.map(user => user.id);

        const messageId = await this.createBroadcastMessage(
            title,
            content,
            'Maintenance',
            priority,
            userIds,
            'system',
            undefined
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

    // Real-time subscriptions
    static subscribeToUserNotifications(userId: string, callback: (notifications: UserNotification[]) => void) {
        return DatabaseService.subscribeToUserNotifications(userId, callback);
    }

    static subscribeToSystemAlerts(callback: (alerts: SystemAlert[]) => void) {
        return DatabaseService.subscribeToSystemAlerts(callback);
    }

    // NEW: Utility methods for email templates
    static createWelcomeEmailTemplate(userName: string): EmailTemplate {
        return {
            subject: 'Welcome to HomeListing AI!',
            body: `Hi ${userName},\n\nWelcome to HomeListing AI! We're excited to help you streamline your real estate business with AI-powered tools.\n\nBest regards,\nThe HomeListing AI Team`,
            htmlBody: `
                <h2>Welcome to HomeListing AI!</h2>
                <p>Hi ${userName},</p>
                <p>Welcome to HomeListing AI! We're excited to help you streamline your real estate business with AI-powered tools.</p>
                <p>Best regards,<br>The HomeListing AI Team</p>
            `,
            fromName: 'HomeListing AI',
            fromEmail: 'welcome@homelisting-ai.com'
        };
    }

    static createSubscriptionExpiryEmailTemplate(userName: string, daysUntilExpiry: number): EmailTemplate {
        const subject = daysUntilExpiry === 0 
            ? 'Your subscription has expired' 
            : `Your subscription expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}`;

        const body = daysUntilExpiry === 0
            ? `Hi ${userName},\n\nYour subscription has expired. Please renew to continue using all features.\n\nBest regards,\nThe HomeListing AI Team`
            : `Hi ${userName},\n\nYour subscription will expire in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}. Please renew to avoid service interruption.\n\nBest regards,\nThe HomeListing AI Team`;

        return {
            subject,
            body,
            htmlBody: `
                <h2>${subject}</h2>
                <p>Hi ${userName},</p>
                <p>${body.split('\n\n')[1]}</p>
                <p>Best regards,<br>The HomeListing AI Team</p>
            `,
            fromName: 'HomeListing AI',
            fromEmail: 'billing@homelisting-ai.com'
        };
    }

    // NEW: Utility methods for push notifications
    static createNewLeadPushNotification(leadName: string, propertyAddress?: string): PushNotification {
        return {
            title: '🔥 New Lead!',
            body: `${leadName}${propertyAddress ? ` is interested in ${propertyAddress}` : ' has submitted an inquiry'}`,
            tag: 'new-lead',
            requireInteraction: true,
            data: {
                type: 'new-lead',
                leadName,
                propertyAddress
            }
        };
    }

    static createAppointmentReminderPushNotification(clientName: string, time: string, propertyAddress?: string): PushNotification {
        return {
            title: '📅 Appointment Reminder',
            body: `Meeting with ${clientName} at ${time}${propertyAddress ? ` - ${propertyAddress}` : ''}`,
            tag: 'appointment-reminder',
            requireInteraction: true,
            data: {
                type: 'appointment-reminder',
                clientName,
                time,
                propertyAddress
            }
        };
    }
}

export default NotificationService;
