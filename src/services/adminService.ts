import DatabaseService from './databaseService';
import NotificationService from './notificationService';
import { User, AdminSettings, SystemAlert, RetentionCampaign, BroadcastMessage } from '../types';

// Additional types for the new service methods
export interface UserStats {
    totalUsers: number;
    activeUsers: number;
    trialUsers: number;
    expiredUsers: number;
    newUsersThisMonth: number;
    churnedUsersThisMonth: number;
    averagePropertiesPerUser: number;
    averageLeadsPerUser: number;
    averageAiInteractionsPerUser: number;
}

export interface DeliveryStats {
    messageId: string;
    totalRecipients: number;
    delivered: number;
    read: number;
    failed: number;
    deliveryRate: number;
    readRate: number;
    failedRate: number;
}

export interface SystemHealth {
    database: 'healthy' | 'warning' | 'error';
    api: 'healthy' | 'warning' | 'error';
    ai: 'healthy' | 'warning' | 'error';
    email: 'healthy' | 'warning' | 'error';
    storage: 'healthy' | 'warning' | 'error';
    overall: 'healthy' | 'warning' | 'error';
    lastChecked: string;
    issues: string[];
}

export interface RenewalData {
    userId: string;
    userName: string;
    userEmail: string;
    currentPlan: string;
    renewalDate: string;
    daysUntilRenewal: number;
    subscriptionStatus: string;
    lastActive: string;
    propertiesCount: number;
    leadsCount: number;
    aiInteractions: number;
    riskLevel: 'low' | 'medium' | 'high';
}

export class AdminService {
    // User Management
    static async getAllUsers(): Promise<User[]> {
        const users = await DatabaseService.getUsersByRole('agent');
        const admins = await DatabaseService.getUsersByRole('admin');
        return [...users, ...admins];
    }

    static async getUserById(userId: string): Promise<User> {
        const user = await DatabaseService.getUser(userId);
        if (!user) {
            throw new Error(`User with ID ${userId} not found`);
        }
        return user;
    }

    static async updateUserStatus(userId: string, status: User['status']): Promise<void> {
        await DatabaseService.updateUser(userId, { status });
        
        // Send notification to user about status change
        const user = await DatabaseService.getUser(userId);
        if (user) {
            const statusMessages = {
                'Active': 'Your account has been activated.',
                'Inactive': 'Your account has been deactivated.',
                'Suspended': 'Your account has been suspended. Please contact support.',
                'Pending': 'Your account is pending activation.'
            };
            
            await NotificationService.sendNotificationToUser(
                userId,
                `Account Status: ${status}`,
                statusMessages[status] || `Your account status has been changed to ${status}.`,
                'system',
                'high'
            );
        }
    }

    static async getUserStats(): Promise<UserStats> {
        const allUsers = await this.getAllUsers();
        const now = new Date();
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        const activeUsers = allUsers.filter(user => user.status === 'Active');
        const trialUsers = allUsers.filter(user => user.subscriptionStatus === 'trial');
        const expiredUsers = allUsers.filter(user => user.subscriptionStatus === 'expired');
        
        // Calculate new users this month (simplified - would need actual dateJoined tracking)
        const newUsersThisMonth = allUsers.filter(user => {
            const joinDate = new Date(user.dateJoined);
            return joinDate >= thisMonth;
        }).length;
        
        // Calculate churned users this month (simplified)
        const churnedUsersThisMonth = 0; // Would need actual churn tracking
        
        const totalProperties = allUsers.reduce((sum, user) => sum + user.propertiesCount, 0);
        const totalLeads = allUsers.reduce((sum, user) => sum + user.leadsCount, 0);
        const totalAiInteractions = allUsers.reduce((sum, user) => sum + user.aiInteractions, 0);
        
        return {
            totalUsers: allUsers.length,
            activeUsers: activeUsers.length,
            trialUsers: trialUsers.length,
            expiredUsers: expiredUsers.length,
            newUsersThisMonth,
            churnedUsersThisMonth,
            averagePropertiesPerUser: allUsers.length > 0 ? totalProperties / allUsers.length : 0,
            averageLeadsPerUser: allUsers.length > 0 ? totalLeads / allUsers.length : 0,
            averageAiInteractionsPerUser: allUsers.length > 0 ? totalAiInteractions / allUsers.length : 0
        };
    }

    // System Settings
    static async getSystemSettings(): Promise<AdminSettings> {
        const settings = await DatabaseService.getAdminSettings();
        if (!settings) {
            throw new Error('System settings not found. Please initialize admin settings first.');
        }
        return settings;
    }

    static async updateSystemSettings(settings: Partial<AdminSettings>): Promise<void> {
        const currentSettings = await this.getSystemSettings();
        await DatabaseService.updateAdminSettings(currentSettings.id, settings);
    }

    static async toggleFeature(feature: string, enabled: boolean): Promise<void> {
        const settings = await this.getSystemSettings();
        const featureToggles = settings.featureToggles as any;
        
        if (!(feature in featureToggles)) {
            throw new Error(`Feature '${feature}' not found in system settings`);
        }
        
        await this.updateSystemSettings({
            featureToggles: {
                ...featureToggles,
                [feature]: enabled
            }
        });
    }

    // Broadcast Messages
    static async sendBroadcastMessage(message: Omit<BroadcastMessage, 'id' | 'sentAt' | 'deliveryStats'>): Promise<string> {
        const messageId = await DatabaseService.createBroadcastMessage({
            ...message,
            sentAt: new Date().toISOString(),
            deliveryStats: {
                totalRecipients: message.targetAudience.length,
                delivered: 0,
                read: 0,
                failed: 0
            }
        });

        // Send notifications to all target users
        await NotificationService.sendNotificationToMultipleUsers(
            message.targetAudience,
            message.title,
            message.content,
            'broadcast',
            message.priority
        );

        return messageId;
    }

    static async getBroadcastHistory(): Promise<BroadcastMessage[]> {
        return await DatabaseService.getBroadcastMessages();
    }

    static async getMessageDeliveryStats(messageId: string): Promise<DeliveryStats> {
        const messages = await DatabaseService.getBroadcastMessages();
        const message = messages.find(m => m.id === messageId);
        
        if (!message) {
            throw new Error(`Broadcast message with ID ${messageId} not found`);
        }

        const { deliveryStats } = message;
        const totalRecipients = deliveryStats.totalRecipients;
        
        return {
            messageId,
            totalRecipients,
            delivered: deliveryStats.delivered,
            read: deliveryStats.read,
            failed: deliveryStats.failed,
            deliveryRate: totalRecipients > 0 ? (deliveryStats.delivered / totalRecipients) * 100 : 0,
            readRate: totalRecipients > 0 ? (deliveryStats.read / totalRecipients) * 100 : 0,
            failedRate: totalRecipients > 0 ? (deliveryStats.failed / totalRecipients) * 100 : 0
        };
    }

    // System Monitoring
    static async getSystemHealth(): Promise<SystemHealth> {
        const health = await this.performSystemHealthCheck();
        const issues = health.issues;
        
        // Determine overall health based on individual components
        const components = [health.database, health.api, health.ai, health.email, health.storage];
        const hasError = components.includes('error');
        const hasWarning = components.includes('warning');
        
        let overall: 'healthy' | 'warning' | 'error' = 'healthy';
        if (hasError) {
            overall = 'error';
        } else if (hasWarning) {
            overall = 'warning';
        }

        return {
            ...health,
            overall,
            lastChecked: new Date().toISOString(),
            issues
        };
    }

    static async getActiveAlerts(): Promise<SystemAlert[]> {
        return await DatabaseService.getSystemAlerts('active');
    }

    static async acknowledgeAlert(alertId: string): Promise<void> {
        // Note: This would need the admin's user ID in a real implementation
        await DatabaseService.acknowledgeSystemAlert(alertId, 'admin');
    }

    // Retention Management
    static async getRetentionCampaigns(): Promise<RetentionCampaign[]> {
        return await DatabaseService.getRetentionCampaigns();
    }

    static async updateRetentionCampaign(campaign: RetentionCampaign): Promise<void> {
        await DatabaseService.updateRetentionCampaign(campaign.id, campaign);
    }

    static async getRenewalData(): Promise<RenewalData[]> {
        const allUsers = await this.getAllUsers();
        const now = new Date();
        
        return allUsers
            .filter(user => user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trial')
            .map(user => {
                const renewalDate = new Date(user.renewalDate);
                const daysUntilRenewal = Math.ceil((renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                
                // Calculate risk level based on usage and activity
                let riskLevel: 'low' | 'medium' | 'high' = 'low';
                const lastActiveDate = new Date(user.lastActive);
                const daysSinceLastActive = Math.floor((now.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24));
                
                if (daysSinceLastActive > 30 || user.propertiesCount === 0) {
                    riskLevel = 'high';
                } else if (daysSinceLastActive > 7 || user.aiInteractions < 5) {
                    riskLevel = 'medium';
                }

                return {
                    userId: user.id,
                    userName: user.name,
                    userEmail: user.email,
                    currentPlan: user.plan,
                    renewalDate: user.renewalDate,
                    daysUntilRenewal,
                    subscriptionStatus: user.subscriptionStatus,
                    lastActive: user.lastActive,
                    propertiesCount: user.propertiesCount,
                    leadsCount: user.leadsCount,
                    aiInteractions: user.aiInteractions,
                    riskLevel
                };
            })
            .sort((a, b) => a.daysUntilRenewal - b.daysUntilRenewal);
    }

    // Additional helper methods (keeping existing ones)
    static async getUsersByPlan(plan: User['plan']): Promise<User[]> {
        const allUsers = await this.getAllUsers();
        return allUsers.filter(user => user.plan === plan);
    }

    static async getUsersBySubscriptionStatus(status: User['subscriptionStatus']): Promise<User[]> {
        const allUsers = await this.getAllUsers();
        return allUsers.filter(user => user.subscriptionStatus === status);
    }

    static async updateUserPlan(userId: string, plan: User['plan']): Promise<void> {
        await DatabaseService.updateUser(userId, { plan });
        
        const user = await DatabaseService.getUser(userId);
        if (user) {
            await NotificationService.sendNotificationToUser(
                userId,
                'Plan Updated',
                `Your plan has been updated to ${plan}.`,
                'billing',
                'medium'
            );
        }
    }

    static async getSystemStats(): Promise<{
        totalUsers: number;
        activeUsers: number;
        trialUsers: number;
        expiredUsers: number;
        totalProperties: number;
        totalLeads: number;
        totalAiInteractions: number;
    }> {
        const allUsers = await this.getAllUsers();
        const activeUsers = allUsers.filter(user => user.status === 'Active');
        const trialUsers = allUsers.filter(user => user.subscriptionStatus === 'trial');
        const expiredUsers = allUsers.filter(user => user.subscriptionStatus === 'expired');
        
        const totalProperties = allUsers.reduce((sum, user) => sum + user.propertiesCount, 0);
        const totalLeads = allUsers.reduce((sum, user) => sum + user.leadsCount, 0);
        const totalAiInteractions = allUsers.reduce((sum, user) => sum + user.aiInteractions, 0);
        
        return {
            totalUsers: allUsers.length,
            activeUsers: activeUsers.length,
            trialUsers: trialUsers.length,
            expiredUsers: expiredUsers.length,
            totalProperties,
            totalLeads,
            totalAiInteractions
        };
    }

    static async setMaintenanceMode(enabled: boolean): Promise<void> {
        const settings = await this.getSystemSettings();
        await this.updateSystemSettings({ maintenanceMode: enabled });
        
        if (enabled) {
            await NotificationService.sendMaintenanceNotification(
                'System Maintenance',
                'The system is currently under maintenance. Some features may be temporarily unavailable.',
                'high'
            );
        }
    }

    static async createSystemAlert(
        type: SystemAlert['type'],
        title: string,
        description: string,
        severity: SystemAlert['severity'],
        component: string
    ): Promise<string> {
        return await NotificationService.createSystemAlert(type, title, description, severity, component);
    }

    static async resolveSystemAlert(alertId: string): Promise<void> {
        await DatabaseService.resolveSystemAlert(alertId);
    }

    static async createRetentionCampaign(
        name: string,
        trigger: RetentionCampaign['trigger'],
        triggerDays: number,
        channels: string[],
        messageTemplate: string
    ): Promise<string> {
        return await DatabaseService.createRetentionCampaign({
            name,
            trigger,
            triggerDays,
            channels,
            messageTemplate,
            successRate: 0,
            isActive: true
        });
    }

    static async toggleRetentionCampaign(campaignId: string): Promise<void> {
        const campaigns = await this.getRetentionCampaigns();
        const campaign = campaigns.find(c => c.id === campaignId);
        if (campaign) {
            await this.updateRetentionCampaign({ ...campaign, isActive: !campaign.isActive });
        }
    }

    static async getUserAnalytics(userId: string): Promise<{
        user: User;
        recentActivity: any[];
        performanceMetrics: {
            propertiesAdded: number;
            leadsGenerated: number;
            aiInteractions: number;
            lastActive: string;
        };
    }> {
        const user = await DatabaseService.getUser(userId);
        if (!user) {
            throw new Error('User not found');
        }

        const lastActiveDate = new Date(user.lastActive);
        const now = new Date();
        const daysSinceLastActive = Math.floor((now.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24));

        return {
            user,
            recentActivity: [], // TODO: Implement activity tracking
            performanceMetrics: {
                propertiesAdded: user.propertiesCount,
                leadsGenerated: user.leadsCount,
                aiInteractions: user.aiInteractions,
                lastActive: `${daysSinceLastActive} days ago`
            }
        };
    }

    static async sendBulkNotification(
        userIds: string[],
        title: string,
        content: string,
        type: 'broadcast' | 'system' | 'billing' | 'feature' = 'broadcast',
        priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'
    ): Promise<string[]> {
        return await NotificationService.sendNotificationToMultipleUsers(
            userIds,
            title,
            content,
            type,
            priority
        );
    }

    static async updateBulkUserStatus(userIds: string[], status: User['status']): Promise<void> {
        for (const userId of userIds) {
            await this.updateUserStatus(userId, status);
        }
    }

    static async performSystemHealthCheck(): Promise<{
        database: 'healthy' | 'warning' | 'error';
        api: 'healthy' | 'warning' | 'error';
        ai: 'healthy' | 'warning' | 'error';
        email: 'healthy' | 'warning' | 'error';
        storage: 'healthy' | 'warning' | 'error';
        issues: string[];
    }> {
        const issues: string[] = [];
        const health: any = {};

        try {
            await DatabaseService.getAdminSettings();
            health.database = 'healthy';
        } catch (error) {
            health.database = 'error';
            issues.push('Database connectivity issue');
        }

        try {
            health.api = 'healthy';
        } catch (error) {
            health.api = 'error';
            issues.push('API connectivity issue');
        }

        try {
            health.ai = 'healthy';
        } catch (error) {
            health.ai = 'error';
            issues.push('AI service issue');
        }

        try {
            health.email = 'healthy';
        } catch (error) {
            health.email = 'error';
            issues.push('Email service issue');
        }

        try {
            health.storage = 'healthy';
        } catch (error) {
            health.storage = 'error';
            issues.push('Storage service issue');
        }

        return { ...health, issues };
    }
}

export default AdminService;
