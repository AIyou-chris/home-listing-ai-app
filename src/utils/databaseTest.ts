import DatabaseService from '../services/databaseService';
import NotificationService from '../services/notificationService';
import AdminService from '../services/adminService';

export const testDatabaseSetup = async () => {
    console.log('🧪 Testing Database Setup...');

    try {
        // Test 1: Create a test user
        console.log('1. Testing user creation...');
        const testUserId = await DatabaseService.createUser({
            name: 'Test User',
            email: 'test@example.com',
            status: 'Active',
            role: 'agent',
            plan: 'Solo Agent',
            propertiesCount: 0,
            leadsCount: 0,
            aiInteractions: 0,
            subscriptionStatus: 'trial',
            renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        });
        console.log('✅ Test user created:', testUserId);

        // Test 2: Create admin settings
        console.log('2. Testing admin settings creation...');
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
                maxFileUploadSize: 10 * 1024 * 1024, // 10MB
                sessionTimeout: 3600, // 1 hour
                maxConcurrentUsers: 1000,
                apiRateLimit: 100
            },
            maintenanceMode: false,
            autoUpdates: true
        });
        console.log('✅ Admin settings created:', settingsId);

        // Test 3: Create a system alert
        console.log('3. Testing system alert creation...');
        const alertId = await NotificationService.createSystemAlert(
            'info',
            'Database Test',
            'This is a test system alert to verify the database setup.',
            'low',
            'database'
        );
        console.log('✅ System alert created:', alertId);

        // Test 4: Create a user notification
        console.log('4. Testing user notification creation...');
        const notificationId = await NotificationService.sendNotificationToUser(
            testUserId,
            'Welcome to HomeListing AI!',
            'This is a test notification to verify the notification system is working.',
            'feature',
            'medium'
        );
        console.log('✅ User notification created:', notificationId);

        // Test 5: Create a broadcast message
        console.log('5. Testing broadcast message creation...');
        const broadcastId = await NotificationService.createBroadcastMessage(
            'Test Broadcast',
            'This is a test broadcast message to verify the broadcast system.',
            'General',
            'medium',
            [testUserId],
            'system'
        );
        console.log('✅ Broadcast message created:', broadcastId);

        // Test 6: Create a retention campaign
        console.log('6. Testing retention campaign creation...');
        const campaignId = await DatabaseService.createRetentionCampaign({
            name: 'Test Retention Campaign',
            trigger: 'pre-renewal',
            triggerDays: 7,
            channels: ['email'],
            messageTemplate: 'Your subscription is about to expire. Please renew to continue using our services.',
            successRate: 0,
            isActive: true
        });
        console.log('✅ Retention campaign created:', campaignId);

        // Test 7: Verify data retrieval
        console.log('7. Testing data retrieval...');
        const user = await DatabaseService.getUser(testUserId);
        const settings = await DatabaseService.getAdminSettings();
        const notifications = await NotificationService.getUserNotifications(testUserId);
        const alerts = await DatabaseService.getSystemAlerts();
        const broadcasts = await DatabaseService.getBroadcastMessages();
        const campaigns = await DatabaseService.getRetentionCampaigns();

        console.log('✅ Data retrieval successful:');
        console.log('   - User:', user ? 'Found' : 'Not found');
        console.log('   - Settings:', settings ? 'Found' : 'Not found');
        console.log('   - Notifications:', notifications.length);
        console.log('   - Alerts:', alerts.length);
        console.log('   - Broadcasts:', broadcasts.length);
        console.log('   - Campaigns:', campaigns.length);

        // Test 8: Test admin service
        console.log('8. Testing admin service...');
        const stats = await AdminService.getSystemStats();
        console.log('✅ System stats:', stats);

        console.log('🎉 All database tests passed!');
        return {
            success: true,
            testUserId,
            settingsId,
            alertId,
            notificationId,
            broadcastId,
            campaignId
        };

    } catch (error) {
        console.error('❌ Database test failed:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
};

export const cleanupTestData = async (testData: {
    testUserId: string;
    settingsId: string;
    alertId: string;
    notificationId: string;
    broadcastId: string;
    campaignId: string;
}) => {
    console.log('🧹 Cleaning up test data...');
    
    try {
        // Note: In a real application, you would implement delete methods
        // For now, we'll just log what would be deleted
        console.log('Would delete:');
        console.log('   - User:', testData.testUserId);
        console.log('   - Settings:', testData.settingsId);
        console.log('   - Alert:', testData.alertId);
        console.log('   - Notification:', testData.notificationId);
        console.log('   - Broadcast:', testData.broadcastId);
        console.log('   - Campaign:', testData.campaignId);
        
        console.log('✅ Cleanup simulation completed');
    } catch (error) {
        console.error('❌ Cleanup failed:', error);
    }
};
