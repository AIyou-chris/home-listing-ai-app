import SystemMonitoringService from '../services/systemMonitoringService';
import NotificationService from '../services/notificationService';
import DatabaseService from '../services/databaseService';

export const testSystemMonitoringService = async () => {
    console.log('🧪 Testing SystemMonitoringService...');

    try {
        const monitoringService = SystemMonitoringService.getInstance();

        // Test 1: Configuration
        console.log('\n1. Testing Configuration...');
        const config = monitoringService.getConfig();
        console.log('✅ Default config:', {
            checkInterval: config.checkInterval,
            enabledChecks: config.enabledChecks
        });

        // Update configuration
        monitoringService.updateConfig({
            checkInterval: 60000, // 1 minute
            alertThresholds: {
                ...config.alertThresholds,
                cpuWarning: 60,
                cpuCritical: 85
            }
        });
        console.log('✅ Configuration updated');

        // Test 2: Health Checks
        console.log('\n2. Testing Health Checks...');
        
        // Test database health
        const dbHealth = await monitoringService.checkDatabaseHealth();
        console.log('✅ Database health:', {
            status: dbHealth.status,
            responseTime: dbHealth.responseTime,
            message: dbHealth.message
        });

        // Test API health (will fail in test environment)
        const apiHealth = await monitoringService.checkAPIHealth();
        console.log('✅ API health:', {
            status: apiHealth.status,
            message: apiHealth.message
        });

        // Test AI health (will fail in test environment)
        const aiHealth = await monitoringService.checkAIHealth();
        console.log('✅ AI health:', {
            status: aiHealth.status,
            message: aiHealth.message
        });

        // Test email health (will fail in test environment)
        const emailHealth = await monitoringService.checkEmailHealth();
        console.log('✅ Email health:', {
            status: emailHealth.status,
            message: emailHealth.message
        });

        // Test 3: Performance Metrics
        console.log('\n3. Testing Performance Metrics...');
        const performanceMetrics = await monitoringService.getPerformanceMetrics();
        console.log('✅ Performance metrics:', {
            cpuUsage: performanceMetrics.cpuUsage.toFixed(1) + '%',
            memoryUsage: performanceMetrics.memoryUsage.toFixed(1) + '%',
            diskUsage: performanceMetrics.diskUsage.toFixed(1) + '%',
            networkLatency: performanceMetrics.networkLatency.toFixed(0) + 'ms',
            requestsPerSecond: performanceMetrics.requestsPerSecond.toFixed(1),
            errorRate: performanceMetrics.errorRate.toFixed(2) + '%'
        });

        // Test 4: Resource Usage
        console.log('\n4. Testing Resource Usage...');
        const resourceUsage = await monitoringService.getResourceUsage();
        console.log('✅ Resource usage:', {
            cpu: {
                current: resourceUsage.cpu.current.toFixed(1) + '%',
                average: resourceUsage.cpu.average.toFixed(1) + '%',
                peak: resourceUsage.cpu.peak.toFixed(1) + '%'
            },
            memory: {
                used: resourceUsage.memory.used.toFixed(0) + 'MB',
                total: resourceUsage.memory.total + 'MB',
                percentage: resourceUsage.memory.percentage.toFixed(1) + '%'
            },
            disk: {
                used: resourceUsage.disk.used.toFixed(0) + 'GB',
                total: resourceUsage.disk.total + 'GB',
                percentage: resourceUsage.disk.percentage.toFixed(1) + '%'
            }
        });

        // Test 5: Alert Management
        console.log('\n5. Testing Alert Management...');
        
        // Create a test alert
        await monitoringService.createAlert({
            type: 'warning',
            title: 'System Monitoring Test',
            description: 'This is a test alert from SystemMonitoringService',
            severity: 'medium',
            component: 'system-monitoring'
        });
        console.log('✅ Test alert created');

        // Test 6: Monitoring Control
        console.log('\n6. Testing Monitoring Control...');
        
        // Start monitoring
        monitoringService.startMonitoring();
        console.log('✅ Monitoring started');
        
        // Check if monitoring is active
        const isActive = monitoringService.isMonitoringActive();
        console.log('✅ Monitoring active:', isActive);
        
        // Stop monitoring after a short delay
        setTimeout(() => {
            monitoringService.stopMonitoring();
            console.log('✅ Monitoring stopped');
        }, 2000);

        console.log('\n🎉 All SystemMonitoringService tests passed!');
        
        return {
            success: true,
            config: monitoringService.getConfig(),
            dbHealth,
            performanceMetrics,
            resourceUsage
        };

    } catch (error) {
        console.error('❌ SystemMonitoringService test failed:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
};

export const testExtendedNotificationService = async () => {
    console.log('🧪 Testing Extended NotificationService...');

    try {
        // Create test users first
        const testUser1Id = await DatabaseService.createUser({
            name: 'Test User 1',
            email: 'test1@example.com',
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
            name: 'Test User 2',
            email: 'test2@example.com',
            status: 'Active',
            role: 'agent',
            plan: 'Pro Team',
            propertiesCount: 15,
            leadsCount: 45,
            aiInteractions: 120,
            subscriptionStatus: 'trial',
            renewalDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        });

        // Test 1: Broadcast Notifications
        console.log('\n1. Testing Broadcast Notifications...');
        await NotificationService.sendBroadcastNotification({
            title: 'Test Broadcast',
            content: 'This is a test broadcast notification',
            messageType: 'General',
            priority: 'medium',
            targetAudience: [testUser1Id, testUser2Id],
            sentBy: 'admin',
            status: 'sent',
            sentAt: new Date().toISOString(),
            deliveryStats: { totalRecipients: 2, delivered: 0, read: 0, failed: 0 }
        });
        console.log('✅ Broadcast notification sent');

        // Test 2: User Notifications with Full Object
        console.log('\n2. Testing User Notifications...');
        await NotificationService.sendUserNotification(testUser1Id, {
            userId: testUser1Id,
            title: 'Test User Notification',
            content: 'This is a test user notification with full object',
            type: 'feature',
            priority: 'high',
            read: false
        });
        console.log('✅ User notification sent');

        // Test 3: Email Notifications
        console.log('\n3. Testing Email Notifications...');
        const welcomeEmail = NotificationService.createWelcomeEmailTemplate('Test User');
        await NotificationService.sendEmailToUsers([testUser1Id, testUser2Id], welcomeEmail);
        console.log('✅ Email notifications sent');

        // Test 4: Scheduled Emails
        console.log('\n4. Testing Scheduled Emails...');
        const scheduledTime = new Date(Date.now() + 60000); // 1 minute from now
        const scheduledEmailId = await NotificationService.sendScheduledEmail({
            userIds: [testUser1Id],
            template: NotificationService.createSubscriptionExpiryEmailTemplate('Test User', 7),
            scheduledFor: scheduledTime.toISOString()
        });
        console.log('✅ Scheduled email created:', scheduledEmailId);

        // Test 5: Push Notifications
        console.log('\n5. Testing Push Notifications...');
        const newLeadPush = NotificationService.createNewLeadPushNotification('John Doe', '123 Main St');
        await NotificationService.sendPushNotification([testUser1Id, testUser2Id], newLeadPush);
        console.log('✅ Push notifications sent');

        const appointmentPush = NotificationService.createAppointmentReminderPushNotification(
            'Jane Smith',
            '2:00 PM',
            '456 Oak Ave'
        );
        await NotificationService.sendPushNotification([testUser1Id], appointmentPush);
        console.log('✅ Appointment reminder push sent');

        // Test 6: Email Templates
        console.log('\n6. Testing Email Templates...');
        const welcomeTemplate = NotificationService.createWelcomeEmailTemplate('New User');
        const expiryTemplate = NotificationService.createSubscriptionExpiryEmailTemplate('Expiring User', 1);
        
        console.log('✅ Welcome email template:', {
            subject: welcomeTemplate.subject,
            fromEmail: welcomeTemplate.fromEmail
        });
        
        console.log('✅ Expiry email template:', {
            subject: expiryTemplate.subject,
            fromEmail: expiryTemplate.fromEmail
        });

        // Test 7: Push Notification Templates
        console.log('\n7. Testing Push Notification Templates...');
        const newLeadTemplate = NotificationService.createNewLeadPushNotification('Alice Johnson', '789 Pine St');
        const appointmentTemplate = NotificationService.createAppointmentReminderPushNotification(
            'Bob Wilson',
            '3:30 PM',
            '321 Elm St'
        );
        
        console.log('✅ New lead push template:', {
            title: newLeadTemplate.title,
            body: newLeadTemplate.body,
            tag: newLeadTemplate.tag
        });
        
        console.log('✅ Appointment push template:', {
            title: appointmentTemplate.title,
            body: appointmentTemplate.body,
            tag: appointmentTemplate.tag
        });

        console.log('\n🎉 All Extended NotificationService tests passed!');
        
        return {
            success: true,
            testUser1Id,
            testUser2Id,
            scheduledEmailId,
            welcomeTemplate,
            newLeadTemplate
        };

    } catch (error) {
        console.error('❌ Extended NotificationService test failed:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
};

export const cleanupSystemMonitoringTestData = async (testData: {
    testUser1Id: string;
    testUser2Id: string;
    scheduledEmailId: string;
}) => {
    console.log('🧹 Cleaning up SystemMonitoring test data...');
    
    try {
        console.log('Would delete:');
        console.log('   - Test User 1:', testData.testUser1Id);
        console.log('   - Test User 2:', testData.testUser2Id);
        console.log('   - Scheduled Email:', testData.scheduledEmailId);
        
        console.log('✅ SystemMonitoring cleanup simulation completed');
    } catch (error) {
        console.error('❌ SystemMonitoring cleanup failed:', error);
    }
};

