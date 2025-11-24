import AdminService from '../services/adminService';
import DatabaseService from '../services/databaseService';
import { BroadcastMessage } from '../types';

export const testAdminService = async () => {
    console.log('🧪 Testing AdminService...');

    try {
        // Test 1: User Management
        console.log('\n1. Testing User Management...');
        
        // Create test users first
        const testUser1Id = await DatabaseService.createUser({
            name: 'Test Agent 1',
            email: 'agent1@test.com',
            status: 'Active',
            role: 'agent',
            plan: 'Solo Agent',
            propertiesCount: 5,
            leadsCount: 12,
            aiInteractions: 25,
            subscriptionStatus: 'active',
            renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        });

        const testUser2Id = await DatabaseService.createUser({
            name: 'Test Agent 2',
            email: 'agent2@test.com',
            status: 'Active',
            role: 'agent',
            plan: 'Pro Team',
            propertiesCount: 15,
            leadsCount: 45,
            aiInteractions: 120,
            subscriptionStatus: 'trial',
            renewalDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        });

        // Test getAllUsers
        const allUsers = await AdminService.getAllUsers();
        console.log('✅ getAllUsers:', allUsers.length, 'users found');

        // Test getUserById
        const user1 = await AdminService.getUserById(testUser1Id);
        console.log('✅ getUserById:', user1.name);

        // Test getUserStats
        const userStats = await AdminService.getUserStats();
        console.log('✅ getUserStats:', {
            totalUsers: userStats.totalUsers,
            activeUsers: userStats.activeUsers,
            averagePropertiesPerUser: userStats.averagePropertiesPerUser.toFixed(2)
        });

        // Test 2: System Settings
        console.log('\n2. Testing System Settings...');
        
        // Create admin settings if they don't exist
        let settings = await DatabaseService.getAdminSettings();
        if (!settings) {
            const settingsId = await DatabaseService.createAdminSettings({
                platformName: 'HomeListing AI',
                platformUrl: 'https://homelisting-ai.com',
                supportEmail: 'support@homelisting-ai.com',
                timezone: 'UTC',
                featureToggles: {
                    aiContentGeneration: true,
                    voiceAssistant: true,
                    qrCodeSystem: true,
                    analyticsDashboard: true,
                    knowledgeBase: true
                },
                systemLimits: {
                    maxFileUploadSize: 10 * 1024 * 1024,
                    sessionTimeout: 3600,
                    maxConcurrentUsers: 1000,
                    apiRateLimit: 100
                },
                maintenanceMode: false,
                autoUpdates: true
            });
            console.log('✅ Created admin settings:', settingsId);
        }

        // Test getSystemSettings
        settings = await AdminService.getSystemSettings();
        console.log('✅ getSystemSettings:', settings.platformName);

        // Test updateSystemSettings
        await AdminService.updateSystemSettings({ platformName: 'HomeListing AI Pro' });
        const updatedSettings = await AdminService.getSystemSettings();
        console.log('✅ updateSystemSettings:', updatedSettings.platformName);

        // Test toggleFeature
        await AdminService.toggleFeature('aiContentGeneration', false);
        const toggledSettings = await AdminService.getSystemSettings();
        console.log('✅ toggleFeature:', 'aiContentGeneration:', toggledSettings.featureToggles.aiContentGeneration);

        // Test 3: Broadcast Messages
        console.log('\n3. Testing Broadcast Messages...');
        
        const broadcastMessage: Omit<BroadcastMessage, 'id' | 'sentAt' | 'deliveryStats'> = {
            title: 'Test Broadcast',
            content: 'This is a test broadcast message from AdminService',
            messageType: 'General',
            priority: 'medium',
            targetAudience: [testUser1Id, testUser2Id],
            sentBy: 'admin',
            status: 'sent'
        };

        // Test sendBroadcastMessage
        const messageId = await AdminService.sendBroadcastMessage(broadcastMessage);
        console.log('✅ sendBroadcastMessage:', messageId);

        // Test getBroadcastHistory
        const broadcastHistory = await AdminService.getBroadcastHistory();
        console.log('✅ getBroadcastHistory:', broadcastHistory.length, 'messages');

        // Test getMessageDeliveryStats
        const deliveryStats = await AdminService.getMessageDeliveryStats(messageId);
        console.log('✅ getMessageDeliveryStats:', {
            totalRecipients: deliveryStats.totalRecipients,
            deliveryRate: deliveryStats.deliveryRate.toFixed(1) + '%'
        });

        // Test 4: System Monitoring
        console.log('\n4. Testing System Monitoring...');
        
        // Test getSystemHealth
        const systemHealth = await AdminService.getSystemHealth();
        console.log('✅ getSystemHealth:', {
            overall: systemHealth.overall,
            database: systemHealth.database,
            api: systemHealth.api,
            issues: systemHealth.issues.length
        });

        // Test getActiveAlerts
        const activeAlerts = await AdminService.getActiveAlerts();
        console.log('✅ getActiveAlerts:', activeAlerts.length, 'alerts');

        // Test 5: Retention Management
        console.log('\n5. Testing Retention Management...');
        
        // Test getRetentionCampaigns
        const retentionCampaigns = await AdminService.getRetentionCampaigns();
        console.log('✅ getRetentionCampaigns:', retentionCampaigns.length, 'campaigns');

        // Test getRenewalData
        const renewalData = await AdminService.getRenewalData();
        console.log('✅ getRenewalData:', renewalData.length, 'users with renewal data');
        
        if (renewalData.length > 0) {
            const highRiskUsers = renewalData.filter(user => user.riskLevel === 'high');
            console.log('   - High risk users:', highRiskUsers.length);
            console.log('   - Next renewal:', renewalData[0].userName, 'in', renewalData[0].daysUntilRenewal, 'days');
        }

        // Test 6: Additional Methods
        console.log('\n6. Testing Additional Methods...');
        
        // Test getUsersByPlan
        const soloAgents = await AdminService.getUsersByPlan('Solo Agent');
        console.log('✅ getUsersByPlan (Solo Agent):', soloAgents.length, 'users');

        // Test getUsersBySubscriptionStatus
        const trialUsers = await AdminService.getUsersBySubscriptionStatus('trial');
        console.log('✅ getUsersBySubscriptionStatus (trial):', trialUsers.length, 'users');

        // Test updateUserStatus
        await AdminService.updateUserStatus(testUser1Id, 'Inactive');
        const updatedUser = await AdminService.getUserById(testUser1Id);
        console.log('✅ updateUserStatus:', updatedUser.status);

        // Test updateUserPlan
        await AdminService.updateUserPlan(testUser2Id, 'Brokerage');
        const planUpdatedUser = await AdminService.getUserById(testUser2Id);
        console.log('✅ updateUserPlan:', planUpdatedUser.plan);

        // Test getUserAnalytics
        const userAnalytics = await AdminService.getUserAnalytics(testUser2Id);
        console.log('✅ getUserAnalytics:', {
            userName: userAnalytics.user.name,
            propertiesAdded: userAnalytics.performanceMetrics.propertiesAdded,
            lastActive: userAnalytics.performanceMetrics.lastActive
        });

        // Test sendBulkNotification
        const notificationIds = await AdminService.sendBulkNotification(
            [testUser1Id, testUser2Id],
            'Bulk Test',
            'This is a bulk notification test',
            'system',
            'medium'
        );
        console.log('✅ sendBulkNotification:', notificationIds.length, 'notifications sent');

        // Test updateBulkUserStatus
        await AdminService.updateBulkUserStatus([testUser1Id, testUser2Id], 'Active');
        console.log('✅ updateBulkUserStatus: Updated 2 users to Active');

        // Test setMaintenanceMode
        await AdminService.setMaintenanceMode(true);
        const maintenanceSettings = await AdminService.getSystemSettings();
        console.log('✅ setMaintenanceMode:', maintenanceSettings.maintenanceMode);

        // Test createSystemAlert
        const alertId = await AdminService.createSystemAlert(
            'warning',
            'AdminService Test',
            'This is a test system alert from AdminService',
            'medium',
            'admin'
        );
        console.log('✅ createSystemAlert:', alertId);

        // Test acknowledgeAlert
        await AdminService.acknowledgeAlert(alertId);
        console.log('✅ acknowledgeAlert: Alert acknowledged');

        // Test resolveSystemAlert
        await AdminService.resolveSystemAlert(alertId);
        console.log('✅ resolveSystemAlert: Alert resolved');

        // Test createRetentionCampaign
        const campaignId = await AdminService.createRetentionCampaign(
            'Test Retention Campaign',
            'pre-renewal',
            7,
            ['email'],
            'Your subscription is about to expire. Please renew to continue using our services.'
        );
        console.log('✅ createRetentionCampaign:', campaignId);

        // Test toggleRetentionCampaign
        await AdminService.toggleRetentionCampaign(campaignId);
        console.log('✅ toggleRetentionCampaign: Campaign toggled');

        console.log('\n🎉 All AdminService tests passed!');
        
        return {
            success: true,
            testUser1Id,
            testUser2Id,
            messageId,
            alertId,
            campaignId,
            settings: updatedSettings
        };

    } catch (error) {
        console.error('❌ AdminService test failed:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
};

export const cleanupAdminTestData = async (testData: {
    testUser1Id: string;
    testUser2Id: string;
    messageId: string;
    alertId: string;
    campaignId: string;
}) => {
    console.log('🧹 Cleaning up AdminService test data...');
    
    try {
        // Note: In a real application, you would implement delete methods
        console.log('Would delete:');
        console.log('   - Test User 1:', testData.testUser1Id);
        console.log('   - Test User 2:', testData.testUser2Id);
        console.log('   - Broadcast Message:', testData.messageId);
        console.log('   - System Alert:', testData.alertId);
        console.log('   - Retention Campaign:', testData.campaignId);
        
        console.log('✅ AdminService cleanup simulation completed');
    } catch (error) {
        console.error('❌ AdminService cleanup failed:', error);
    }
};
