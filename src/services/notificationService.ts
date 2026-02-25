// DatabaseService removed - using Supabase alternatives
import { UserNotification, BroadcastMessage, SystemAlert } from '../types';
import { supabase } from './supabase';

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
    // In-memory store for demo users and subscribers
    static demoSubscribers = new Map<string, ((notifications: UserNotification[]) => void)[]>();

    // Database - Supabase Integration
    static async sendNotificationToUser(
        userId: string,
        title: string,
        content: string,
        type: UserNotification['type'] = 'system',
        priority: UserNotification['priority'] = 'medium',
        expiresAt?: string
    ): Promise<string> {
        // Handle Demo Users
        if (userId.startsWith('demo-') || userId === 'blueprint-agent') {
            const newNotification: UserNotification = {
                id: `demo_notif_${Date.now()}`,
                userId,
                title,
                content,
                type,
                priority,
                read: false,
                createdAt: new Date().toISOString(),
                expiresAt,
            };

            const userNotifs = notificationStore.get(userId) || [];
            userNotifs.unshift(newNotification);
            notificationStore.set(userId, userNotifs);

            // Notify subscribers
            const subscribers = this.demoSubscribers.get(userId) || [];
            subscribers.forEach(cb => cb([...userNotifs]));

            return newNotification.id;
        }

        const { data, error } = await supabase
            .from('notifications')
            .insert({
                user_id: userId,
                title,
                content,
                type,
                priority,
                expires_at: expiresAt,
                is_read: false
            })
            .select()
            .single();

        if (error) {
            console.error('Error sending notification:', error);
            throw error;
        }

        return data.id;
    }

    static async sendNotificationToMultipleUsers(
        userIds: string[],
        title: string,
        content: string,
        type: UserNotification['type'] = 'broadcast',
        priority: UserNotification['priority'] = 'medium'
    ): Promise<string[]> {
        // Handle mixed or demo users request - split them if needed, but for now simplistic approach
        // If any user is demo, handle all as demo logic isn't easily compatible with batch insert return types nicely without complex logic.
        // For simplicity, iterate.
        const results: string[] = [];
        const realUserIds: string[] = [];

        for (const userId of userIds) {
            if (userId.startsWith('demo-') || userId === 'blueprint-agent') {
                results.push(await this.sendNotificationToUser(userId, title, content, type, priority));
            } else {
                realUserIds.push(userId);
            }
        }

        if (realUserIds.length > 0) {
            const notifications = realUserIds.map(userId => ({
                user_id: userId,
                title,
                content,
                type,
                priority,
                is_read: false
            }));

            const { data, error } = await supabase
                .from('notifications')
                .insert(notifications)
                .select();

            if (error) {
                console.error('Error sending multiple notifications:', error);
                throw error;
            }
            results.push(...data.map((n: { id: string }) => n.id));
        }

        return results;
    }

    static async getUserNotifications(userId: string, read?: boolean): Promise<UserNotification[]> {
        if (userId.startsWith('demo-') || userId === 'blueprint-agent') {
            let notifs = notificationStore.get(userId) || [];
            if (typeof read === 'boolean') {
                notifs = notifs.filter(n => n.read === read);
            }
            return notifs;
        }

        let query = supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (typeof read === 'boolean') {
            query = query.eq('is_read', read ? true : false);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching notifications:', error);
            return [];
        }

        return data.map((n: Record<string, unknown>): UserNotification => {
            const type = n.type;
            const priority = n.priority;
            return {
                id: String(n.id ?? ''),
                userId: String(n.user_id ?? userId),
                title: String(n.title ?? ''),
                content: String(n.content ?? ''),
                type: (type === 'broadcast' || type === 'system' || type === 'billing' || type === 'feature') ? type : 'system',
                priority: (priority === 'low' || priority === 'medium' || priority === 'high' || priority === 'urgent') ? priority : 'medium',
                read: Boolean(n.is_read),
                createdAt: String(n.created_at ?? new Date().toISOString()),
                expiresAt: typeof n.expires_at === 'string' ? n.expires_at : undefined
            };
        });
    }

    static async markNotificationAsRead(notificationId: string): Promise<void> {
        // Simple heuristic for demo IDs
        if (notificationId.startsWith('demo_notif_')) {
            // Since we don't look up by ID across all users deeply efficiently here, iterate store?
            // Or assume modifying the object in the array in memory works if references are kept.
            // But Map stores array of objects.
            for (const [userId, notifs] of notificationStore.entries()) {
                const notif = notifs.find(n => n.id === notificationId);
                if (notif) {
                    notif.read = true;
                    // trigger update
                    const subscribers = this.demoSubscribers.get(userId) || [];
                    subscribers.forEach(cb => cb([...notifs]));
                    return;
                }
            }
            return;
        }

        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId);

        if (error) {
            console.error('Error marking notification as read:', error);
        }
    }

    static async markAllNotificationsAsRead(userId: string): Promise<void> {
        if (userId.startsWith('demo-') || userId === 'blueprint-agent') {
            const notifs = notificationStore.get(userId) || [];
            notifs.forEach(n => n.read = true);
            notificationStore.set(userId, [...notifs]); // Trigger re-render if needed by forcing new array ref
            // Notify subscribers
            const subscribers = this.demoSubscribers.get(userId) || [];
            subscribers.forEach(cb => cb([...notifs]));
            return;
        }

        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (error) {
            console.error('Error marking all notifications as read:', error);
        }
    }

    static async getUnreadNotificationCount(userId: string): Promise<number> {
        if (userId.startsWith('demo-') || userId === 'blueprint-agent') {
            const notifs = notificationStore.get(userId) || [];
            return notifs.filter(n => !n.read).length;
        }

        // Use count aggregation for performance
        const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (error) {
            console.error('Error counting unread notifications:', error);
            return 0;
        }

        return count || 0;
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

    // Real-time subscriptions
    static subscribeToUserNotifications(userId: string, callback: (notifications: UserNotification[]) => void) {
        // Handle Demo Users
        if (userId.startsWith('demo-') || userId === 'blueprint-agent') {
            // Initial load
            const initialNotifs = notificationStore.get(userId) || [];
            callback(initialNotifs);

            // Add to subscribers
            const userSubscribers = this.demoSubscribers.get(userId) || [];
            userSubscribers.push(callback);
            this.demoSubscribers.set(userId, userSubscribers);

            return () => {
                const subs = this.demoSubscribers.get(userId) || [];
                this.demoSubscribers.set(userId, subs.filter(cb => cb !== callback));
            };
        }

        // Initial load
        this.getUserNotifications(userId).then(callback);

        // Subscribe to changes
        const subscription = supabase
            .channel(`public:notifications:user_id=eq.${userId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`
                },
                async () => {
                    // Reload all notifications on any change for simplicity
                    const notifications = await this.getUserNotifications(userId);
                    callback(notifications);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }

    static subscribeToSystemAlerts(callback: (alerts: SystemAlert[]) => void) {
        callback([...systemAlertStore]);
        return () => { };
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
