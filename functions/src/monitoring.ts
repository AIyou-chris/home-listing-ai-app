import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();

// System health monitoring
export const checkSystemHealth = functions.scheduler.onSchedule('every 1 minutes', async (event) => {
  try {
    console.log('Starting system health check...');
    
    const healthChecks = {
      database: false,
      authentication: false,
      storage: false,
      functions: false,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    };

    // Check database connectivity
    try {
      await db.collection('healthCheck').doc('test').set({
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
      await db.collection('healthCheck').doc('test').delete();
      healthChecks.database = true;
    } catch (error) {
      console.error('Database health check failed:', error);
    }

    // Check authentication service
    try {
      await admin.auth().listUsers(1);
      healthChecks.authentication = true;
    } catch (error) {
      console.error('Authentication health check failed:', error);
    }

    // Check storage (if configured)
    try {
      const bucket = admin.storage().bucket();
      await bucket.exists();
      healthChecks.storage = true;
    } catch (error) {
      console.error('Storage health check failed:', error);
    }

    // Check functions (basic connectivity)
    try {
      // Simple function call test
      healthChecks.functions = true;
    } catch (error) {
      console.error('Functions health check failed:', error);
    }

    // Record health status
    await db.collection('systemHealth').add({
      ...healthChecks,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    // Check if any services are down
    const failedServices = Object.entries(healthChecks)
      .filter(([key, value]) => key !== 'timestamp' && !value)
      .map(([key]) => key);

    if (failedServices.length > 0) {
      // Create alert
      await db.collection('alerts').add({
        type: 'system_health',
        severity: 'high',
        message: `System health check failed for services: ${failedServices.join(', ')}`,
        services: failedServices,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        status: 'active'
      });

      // Send notification to admins
      const adminsSnapshot = await db.collection('admins').get();
      const adminNotifications = adminsSnapshot.docs.map(doc => 
        db.collection('notifications').add({
          userId: doc.id,
          type: 'system_alert',
          title: 'System Health Alert',
          message: `System health check failed for services: ${failedServices.join(', ')}`,
          severity: 'high',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          read: false
        })
      );

      await Promise.all(adminNotifications);
    }

    console.log('System health check completed');
  } catch (error) {
    console.error('System health check error:', error);
  }
});

// Retention campaign triggers
export const triggerRetentionCampaigns = functions.scheduler.onSchedule('every 1 hours', async (event) => {
  try {
    console.log('Starting retention campaign check...');
    
    const now = admin.firestore.Timestamp.now();
    const oneDayAgo = new Date(now.toDate().getTime() - 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.toDate().getTime() - 3 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.toDate().getTime() - 7 * 24 * 60 * 60 * 1000);

    // Find users who haven't been active
    const inactiveUsersSnapshot = await db.collection('users')
      .where('status', '==', 'active')
      .where('lastActivity', '<', admin.firestore.Timestamp.fromDate(threeDaysAgo))
      .get();

    const inactiveUsers = inactiveUsersSnapshot.docs;

    for (const userDoc of inactiveUsers) {
      const userData = userDoc.data();
      const lastActivity = userData.lastActivity?.toDate();
      const userId = userDoc.id;

      // Check if we've already sent a retention campaign recently
      const recentCampaigns = await db.collection('retentionCampaigns')
        .where('userId', '==', userId)
        .where('sentAt', '>', admin.firestore.Timestamp.fromDate(oneDayAgo))
        .get();

      if (!recentCampaigns.empty) {
        continue; // Skip if we sent a campaign recently
      }

      let campaignType = '';
      let message = '';

      if (lastActivity < sevenDaysAgo) {
        campaignType = 'high_priority';
        message = "We miss you! Come back and discover amazing properties waiting for you.";
      } else if (lastActivity < threeDaysAgo) {
        campaignType = 'medium_priority';
        message = "Don't miss out on the latest properties in your area!";
      }

      if (campaignType) {
        // Create retention campaign record
        const campaignRef = await db.collection('retentionCampaigns').add({
          userId,
          type: campaignType,
          message,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          status: 'sent'
        });

        // Send notification
        await db.collection('notifications').add({
          userId,
          type: 'retention',
          title: 'We Miss You!',
          message,
          campaignId: campaignRef.id,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          read: false
        });

        // Queue email
        await db.collection('emailQueue').add({
          to: userData.email,
          subject: 'We Miss You!',
          message,
          userId,
          campaignId: campaignRef.id,
          type: 'retention',
          status: 'pending',
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Queue push notification
        if (userData.pushToken) {
          await db.collection('pushQueue').add({
            userId,
            title: 'We Miss You!',
            message,
            campaignId: campaignRef.id,
            type: 'retention',
            status: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }

        // Update user's retention campaign count
        await userDoc.ref.update({
          retentionCampaignsSent: admin.firestore.FieldValue.increment(1),
          lastRetentionCampaign: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }

    // Check for users with high churn risk
    const highRiskUsers = await db.collection('users')
      .where('status', '==', 'active')
      .where('retentionCampaignsSent', '>', 3)
      .where('lastActivity', '<', admin.firestore.Timestamp.fromDate(sevenDaysAgo))
      .get();

    // Create high-risk user alerts
    for (const userDoc of highRiskUsers.docs) {
      const userData = userDoc.data();
      
      await db.collection('alerts').add({
        type: 'high_churn_risk',
        severity: 'medium',
        userId: userDoc.id,
        message: `User ${userData.email} shows high churn risk`,
        userEmail: userData.email,
        retentionCampaignsSent: userData.retentionCampaignsSent,
        lastActivity: userData.lastActivity,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        status: 'active'
      });
    }

    console.log('Retention campaign check completed');
  } catch (error) {
    console.error('Retention campaign error:', error);
  }
});

// Performance monitoring
export const monitorPerformance = functions.scheduler.onSchedule('every 5 minutes', async (event) => {
  try {
    console.log('Starting performance monitoring...');
    
    // Monitor function execution times
    const recentFunctions = await db.collection('functionLogs')
      .where('timestamp', '>', admin.firestore.Timestamp.fromDate(new Date(Date.now() - 5 * 60 * 1000)))
      .get();

    const functionStats: Record<string, any> = {};
    
    recentFunctions.docs.forEach(doc => {
      const data = doc.data();
      if (!functionStats[data.functionName]) {
        functionStats[data.functionName] = {
          count: 0,
          totalTime: 0,
          errors: 0
        };
      }
      
      functionStats[data.functionName].count++;
      functionStats[data.functionName].totalTime += data.executionTime || 0;
      if (data.error) {
        functionStats[data.functionName].errors++;
      }
    });

    // Record performance metrics
    await db.collection('performanceMetrics').add({
      functionStats,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      period: '5min'
    });

    // Check for performance issues
    Object.entries(functionStats).forEach(([functionName, stats]) => {
      const avgTime = stats.totalTime / stats.count;
      const errorRate = stats.errors / stats.count;

      if (avgTime > 5000) { // 5 seconds
        console.warn(`Function ${functionName} is slow: ${avgTime}ms average`);
      }

      if (errorRate > 0.1) { // 10% error rate
        console.warn(`Function ${functionName} has high error rate: ${errorRate * 100}%`);
      }
    });

    console.log('Performance monitoring completed');
  } catch (error) {
    console.error('Performance monitoring error:', error);
  }
});
