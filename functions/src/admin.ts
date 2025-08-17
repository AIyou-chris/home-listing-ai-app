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
