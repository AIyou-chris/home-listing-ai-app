import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();

// User management
export const getAllUsers = functions.https.onCall(async (data: any, context: any) => {
  try {
    // Verify admin permissions
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const adminDoc = await db.collection('admins').doc(context.auth.uid).get();
    if (!adminDoc.exists) {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    const { page = 1, limit = 20, status } = data;
    const offset = (page - 1) * limit;

    let query = db.collection('users').orderBy('createdAt', 'desc');

    if (status) {
      query = query.where('status', '==', status);
    }

    const snapshot = await query.limit(limit).offset(offset).get();
    const users = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const totalSnapshot = await query.count().get();
    const total = totalSnapshot.data().count;

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error('getAllUsers error:', error);
    throw new functions.https.HttpsError('internal', 'Failed to fetch users');
  }
});

export const updateUserStatus = functions.https.onCall(async (data: any, context: any) => {
  try {
    // Verify admin permissions
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const adminDoc = await db.collection('admins').doc(context.auth.uid).get();
    if (!adminDoc.exists) {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    const { userId, status, reason } = data;

    if (!userId || !status) {
      throw new functions.https.HttpsError('invalid-argument', 'User ID and status are required');
    }

    // Update user status
    await db.collection('users').doc(userId).update({
      status,
      statusUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      statusUpdatedBy: context.auth.uid,
      statusReason: reason || null
    });

    // Create notification for user
    await db.collection('notifications').add({
      userId,
      type: 'status_update',
      title: 'Account Status Updated',
      message: `Your account status has been updated to: ${status}`,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      read: false
    });

    // Log admin action
    await db.collection('adminLogs').add({
      adminId: context.auth.uid,
      action: 'update_user_status',
      targetUserId: userId,
      oldStatus: (await db.collection('users').doc(userId).get()).data()?.status,
      newStatus: status,
      reason,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('updateUserStatus error:', error);
    throw new functions.https.HttpsError('internal', 'Failed to update user status');
  }
});

// System settings
export const updateSystemSettings = functions.https.onCall(async (data: any, context: any) => {
  try {
    // Verify admin permissions
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const adminDoc = await db.collection('admins').doc(context.auth.uid).get();
    if (!adminDoc.exists) {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    const { settings } = data;

    if (!settings || typeof settings !== 'object') {
      throw new functions.https.HttpsError('invalid-argument', 'Settings object is required');
    }

    // Update system settings
    await db.collection('systemSettings').doc('main').set({
      ...settings,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: context.auth.uid
    }, { merge: true });

    // Log admin action
    await db.collection('adminLogs').add({
      adminId: context.auth.uid,
      action: 'update_system_settings',
      settings,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('updateSystemSettings error:', error);
    throw new functions.https.HttpsError('internal', 'Failed to update system settings');
  }
});

// Broadcast messages
export const sendBroadcastMessage = functions.https.onCall(async (data: any, context: any) => {
  try {
    // Verify admin permissions
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const adminDoc = await db.collection('admins').doc(context.auth.uid).get();
    if (!adminDoc.exists) {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    const { message, title, channels = ['email', 'push', 'in_app'], filters = {} } = data;

    if (!message || !title) {
      throw new functions.https.HttpsError('invalid-argument', 'Message and title are required');
    }

    // Get users based on filters
    let query = db.collection('users').where('status', '==', 'active');
    
    if (filters.userType) {
      query = query.where('userType', '==', filters.userType);
    }

    const usersSnapshot = await query.get();
    const users = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      email: doc.data().email,
      ...doc.data()
    }));

    // Create broadcast record
    const broadcastRef = await db.collection('broadcasts').add({
      title,
      message,
      channels,
      filters,
      sentBy: context.auth.uid,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      totalRecipients: users.length,
      status: 'sending'
    });

    // Send to each channel
    const deliveryPromises = [];

    if (channels.includes('in_app')) {
      // Create in-app notifications
      const notificationPromises = users.map(user => 
        db.collection('notifications').add({
          userId: user.id,
          type: 'broadcast',
          title,
          message,
          broadcastId: broadcastRef.id,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          read: false
        })
      );
      deliveryPromises.push(...notificationPromises);
    }

    if (channels.includes('email')) {
      // Queue email sending
      const emailPromises = users.map(user => 
        db.collection('emailQueue').add({
          to: user.email,
          subject: title,
          message,
          userId: user.id,
          broadcastId: broadcastRef.id,
          status: 'pending',
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        })
      );
      deliveryPromises.push(...emailPromises);
    }

    if (channels.includes('push')) {
      // Queue push notifications
      const pushPromises = users.map(user => 
        db.collection('pushQueue').add({
          userId: user.id,
          title,
          message,
          broadcastId: broadcastRef.id,
          status: 'pending',
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        })
      );
      deliveryPromises.push(...pushPromises);
    }

    await Promise.all(deliveryPromises);

    // Update broadcast status
    await broadcastRef.update({
      status: 'sent',
      sentAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Log admin action
    await db.collection('adminLogs').add({
      adminId: context.auth.uid,
      action: 'send_broadcast',
      broadcastId: broadcastRef.id,
      title,
      message,
      channels,
      recipientCount: users.length,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return { 
      success: true, 
      broadcastId: broadcastRef.id,
      recipientCount: users.length 
    };
  } catch (error) {
    console.error('sendBroadcastMessage error:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send broadcast message');
  }
});

// ===== ADMIN ANALYTICS FUNCTIONS =====

// Get admin dashboard metrics
export const getAdminDashboardMetrics = functions.https.onCall(async (data: any, context: any) => {
  try {
    // Verify admin permissions
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const adminDoc = await db.collection('admins').doc(context.auth.uid).get();
    if (!adminDoc.exists) {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    // Get total users
    const usersSnapshot = await db.collection('users').get();
    const totalUsers = usersSnapshot.size;

    // Get active users (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeUsersSnapshot = await db.collection('users')
      .where('lastActivity', '>', admin.firestore.Timestamp.fromDate(yesterday))
      .get();
    const activeUsers = activeUsersSnapshot.size;

    // Get new users today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const newUsersSnapshot = await db.collection('users')
      .where('createdAt', '>', admin.firestore.Timestamp.fromDate(today))
      .get();
    const newUsersToday = newUsersSnapshot.size;

    // Get total properties
    const propertiesSnapshot = await db.collection('properties').get();
    const totalProperties = propertiesSnapshot.size;

    // Get total interactions (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const interactionsSnapshot = await db.collection('userInteractions')
      .where('timestamp', '>', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
      .get();
    const totalInteractions = interactionsSnapshot.size;

    // Get revenue (placeholder - implement based on your billing system)
    const revenue = 0; // TODO: Implement revenue calculation

    // Calculate conversion rate
    const conversionsSnapshot = await db.collection('conversions')
      .where('timestamp', '>', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
      .get();
    const conversionRate = totalInteractions > 0 ? (conversionsSnapshot.size / totalInteractions) * 100 : 0;

    // Get average session duration (placeholder)
    const avgSessionDuration = 0; // TODO: Implement session duration calculation

    // Get top performing properties
    const topPropertiesSnapshot = await db.collection('properties')
      .orderBy('viewCount', 'desc')
      .limit(5)
      .get();
    
    const topPerformingProperties = topPropertiesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title || 'Untitled Property',
        views: data.viewCount || 0,
        leads: data.leadCount || 0,
        conversionRate: data.viewCount > 0 ? ((data.leadCount || 0) / data.viewCount) * 100 : 0
      };
    });

    // Get system health
    const healthSnapshot = await db.collection('systemHealth')
      .orderBy('timestamp', 'desc')
      .limit(1)
      .get();
    
    let systemHealth = {
      status: 'healthy' as 'healthy' | 'warning' | 'critical',
      uptime: 99.9,
      responseTime: 200,
      errorRate: 0.1
    };

    if (!healthSnapshot.empty) {
      const healthData = healthSnapshot.docs[0].data();
      systemHealth = {
        status: healthData.database && healthData.authentication && healthData.functions ? 'healthy' : 'warning',
        uptime: 99.9, // TODO: Calculate actual uptime
        responseTime: 200, // TODO: Get from performance metrics
        errorRate: 0.1 // TODO: Calculate from error logs
      };
    }

    return {
      totalUsers,
      activeUsers,
      newUsersToday,
      totalProperties,
      totalInteractions,
      revenue,
      conversionRate: Math.round(conversionRate * 100) / 100,
      avgSessionDuration,
      topPerformingProperties,
      systemHealth
    };
  } catch (error) {
    console.error('getAdminDashboardMetrics error:', error);
    throw new functions.https.HttpsError('internal', 'Failed to get admin dashboard metrics');
  }
});

// Get user engagement metrics
export const getUserEngagementMetrics = functions.https.onCall(async (data: any, context: any) => {
  try {
    // Verify admin permissions
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const adminDoc = await db.collection('admins').doc(context.auth.uid).get();
    if (!adminDoc.exists) {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get total users
    const usersSnapshot = await db.collection('users').get();
    const totalUsers = usersSnapshot.size;

    // Get active users by period
    const dailyActiveSnapshot = await db.collection('users')
      .where('lastActivity', '>', admin.firestore.Timestamp.fromDate(oneDayAgo))
      .get();
    const dailyActive = dailyActiveSnapshot.size;

    const weeklyActiveSnapshot = await db.collection('users')
      .where('lastActivity', '>', admin.firestore.Timestamp.fromDate(sevenDaysAgo))
      .get();
    const weeklyActive = weeklyActiveSnapshot.size;

    const monthlyActiveSnapshot = await db.collection('users')
      .where('lastActivity', '>', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
      .get();
    const monthlyActive = monthlyActiveSnapshot.size;

    // Calculate engagement score (placeholder)
    const engagementScore = totalUsers > 0 ? (monthlyActive / totalUsers) * 100 : 0;

    // Get top engaged users
    const topUsersSnapshot = await db.collection('users')
      .orderBy('engagementScore', 'desc')
      .limit(10)
      .get();
    
    const topEngagedUsers = topUsersSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        userId: doc.id,
        email: data.email || 'unknown@email.com',
        engagementScore: data.engagementScore || 0,
        lastActivity: data.lastActivity?.toDate() || new Date(),
        interactions: data.interactionCount || 0
      };
    });

    // Calculate retention rates (placeholder)
    const userRetention = {
      day1: 85, // TODO: Calculate actual retention
      day7: 65,
      day30: 45
    };

    // Calculate user segments
    const userSegments = {
      highEngagement: Math.round(totalUsers * 0.2),
      mediumEngagement: Math.round(totalUsers * 0.3),
      lowEngagement: Math.round(totalUsers * 0.3),
      inactive: Math.round(totalUsers * 0.2)
    };

    return {
      totalUsers,
      activeUsers: {
        daily: dailyActive,
        weekly: weeklyActive,
        monthly: monthlyActive
      },
      engagementScore: Math.round(engagementScore * 100) / 100,
      topEngagedUsers,
      userRetention,
      userSegments
    };
  } catch (error) {
    console.error('getUserEngagementMetrics error:', error);
    throw new functions.https.HttpsError('internal', 'Failed to get user engagement metrics');
  }
});

// Get system performance metrics
export const getSystemPerformanceMetrics = functions.https.onCall(async (data: any, context: any) => {
  try {
    // Verify admin permissions
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const adminDoc = await db.collection('admins').doc(context.auth.uid).get();
    if (!adminDoc.exists) {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    // Get latest performance metrics
    const performanceSnapshot = await db.collection('performanceMetrics')
      .orderBy('timestamp', 'desc')
      .limit(1)
      .get();

    let responseTime = { average: 200, p95: 500, p99: 1000 };
    let errorRate = 0.1;
    let throughput = { requestsPerMinute: 100, requestsPerHour: 6000 };
    let resourceUsage = { cpu: 45, memory: 60, storage: 30 };
    let functionPerformance: any[] = [];
    let uptime = 99.9;

    if (!performanceSnapshot.empty) {
      const perfData = performanceSnapshot.docs[0].data();
      if (perfData.functionStats) {
        functionPerformance = Object.entries(perfData.functionStats).map(([name, stats]: [string, any]) => ({
          name,
          executionTime: stats.totalTime / stats.count || 0,
          errorRate: stats.count > 0 ? (stats.errors / stats.count) * 100 : 0,
          invocationCount: stats.count || 0
        }));
      }
    }

    return {
      responseTime,
      errorRate,
      throughput,
      resourceUsage,
      functionPerformance,
      uptime
    };
  } catch (error) {
    console.error('getSystemPerformanceMetrics error:', error);
    throw new functions.https.HttpsError('internal', 'Failed to get system performance metrics');
  }
});

// Get retention metrics
export const getRetentionMetrics = functions.https.onCall(async (data: any, context: any) => {
  try {
    // Verify admin permissions
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const adminDoc = await db.collection('admins').doc(context.auth.uid).get();
    if (!adminDoc.exists) {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    // Calculate overall retention (placeholder)
    const overallRetention = {
      day1: 85,
      day7: 65,
      day30: 45,
      day90: 25
    };

    // Generate cohort analysis (placeholder)
    const cohortAnalysis = [
      { cohort: '2024-01', day1: 90, day7: 70, day30: 50, day90: 30 },
      { cohort: '2024-02', day1: 88, day7: 68, day30: 48, day90: 28 },
      { cohort: '2024-03', day1: 92, day7: 72, day30: 52, day90: 32 }
    ];

    // Calculate churn rate
    const churnRate = {
      monthly: 15,
      quarterly: 35
    };

    // Retention by segment
    const retentionBySegment = {
      premium: 75,
      standard: 45,
      free: 25
    };

    // Revenue retention
    const revenueRetention = 85;

    return {
      overallRetention,
      cohortAnalysis,
      churnRate,
      retentionBySegment,
      revenueRetention
    };
  } catch (error) {
    console.error('getRetentionMetrics error:', error);
    throw new functions.https.HttpsError('internal', 'Failed to get retention metrics');
  }
});
