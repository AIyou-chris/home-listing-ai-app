import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";

const db = admin.firestore();

// Email notifications
export const sendBroadcastEmail = functions.https.onCall(async (data: any, context: any) => {
  try {
    // Verify admin permissions
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const adminDoc = await db.collection('admins').doc(context.auth.uid).get();
    if (!adminDoc.exists) {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    const { subject, message, recipients, templateId } = data;

    if (!subject || !message || !recipients) {
      throw new functions.https.HttpsError('invalid-argument', 'Subject, message, and recipients are required');
    }

    // Get email template if specified
    let emailTemplate = null;
    if (templateId) {
      const templateDoc = await db.collection('emailTemplates').doc(templateId).get();
      if (templateDoc.exists) {
        emailTemplate = templateDoc.data();
      }
    }

    // Create email queue entries
    const emailPromises = recipients.map((recipient: any) => 
      db.collection('emailQueue').add({
        to: recipient.email,
        subject,
        message: emailTemplate ? emailTemplate.content.replace('{{message}}', message) : message,
        userId: recipient.id,
        templateId,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        sentBy: context.auth.uid
      })
    );

    await Promise.all(emailPromises);

    // Log admin action
    await db.collection('adminLogs').add({
      adminId: context.auth.uid,
      action: 'send_broadcast_email',
      subject,
      recipientCount: recipients.length,
      templateId,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return { 
      success: true, 
      queuedCount: recipients.length 
    };
  } catch (error) {
    console.error('sendBroadcastEmail error:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send broadcast email');
  }
});

// Push notifications
export const sendBroadcastPush = functions.https.onCall(async (data: any, context: any) => {
  try {
    // Verify admin permissions
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const adminDoc = await db.collection('admins').doc(context.auth.uid).get();
    if (!adminDoc.exists) {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    const { title, message, recipients, data: pushData } = data;

    if (!title || !message || !recipients) {
      throw new functions.https.HttpsError('invalid-argument', 'Title, message, and recipients are required');
    }

    // Create push notification queue entries
    const pushPromises = recipients.map((recipient: any) => 
      db.collection('pushQueue').add({
        userId: recipient.id,
        title,
        message,
        data: pushData || {},
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        sentBy: context.auth.uid
      })
    );

    await Promise.all(pushPromises);

    // Log admin action
    await db.collection('adminLogs').add({
      adminId: context.auth.uid,
      action: 'send_broadcast_push',
      title,
      recipientCount: recipients.length,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return { 
      success: true, 
      queuedCount: recipients.length 
    };
  } catch (error) {
    console.error('sendBroadcastPush error:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send broadcast push notification');
  }
});

// Process email queue
export const processEmailQueue = functions.scheduler.onSchedule('every 1 minutes', async (event) => {
  try {
    console.log('Processing email queue...');
    
    // Get pending emails
    const pendingEmails = await db.collection('emailQueue')
      .where('status', '==', 'pending')
      .limit(50) // Process in batches
      .get();

    if (pendingEmails.empty) {
      console.log('No pending emails to process');
      return;
    }

    // Configure email transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail', // or your email service
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    const emailPromises = pendingEmails.docs.map(async (emailDoc) => {
      const emailData = emailDoc.data();
      
      try {
        // Send email
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: emailData.to,
          subject: emailData.subject,
          html: emailData.message
        });

        // Update status to sent
        await emailDoc.ref.update({
          status: 'sent',
          sentAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Track delivery
        await db.collection('emailDeliveryLogs').add({
          emailId: emailDoc.id,
          userId: emailData.userId,
          to: emailData.to,
          subject: emailData.subject,
          status: 'delivered',
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`Email sent successfully to ${emailData.to}`);
      } catch (error: any) {
        console.error(`Failed to send email to ${emailData.to}:`, error);
        
        // Update status to failed
        await emailDoc.ref.update({
          status: 'failed',
          error: error.message,
          failedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Track failure
        await db.collection('emailDeliveryLogs').add({
          emailId: emailDoc.id,
          userId: emailData.userId,
          to: emailData.to,
          subject: emailData.subject,
          status: 'failed',
          error: error.message,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    });

    await Promise.all(emailPromises);
    console.log('Email queue processing completed');
  } catch (error) {
    console.error('Email queue processing error:', error);
  }
});

// Process push notification queue
export const processPushQueue = functions.scheduler.onSchedule('every 1 minutes', async (event) => {
  try {
    console.log('Processing push notification queue...');
    
    // Get pending push notifications
    const pendingPushes = await db.collection('pushQueue')
      .where('status', '==', 'pending')
      .limit(100) // Process in batches
      .get();

    if (pendingPushes.empty) {
      console.log('No pending push notifications to process');
      return;
    }

    const pushPromises = pendingPushes.docs.map(async (pushDoc) => {
      const pushData = pushDoc.data();
      
      try {
        // Get user's push token
        const userDoc = await db.collection('users').doc(pushData.userId).get();
        if (!userDoc.exists) {
          throw new Error('User not found');
        }

        const userData = userDoc.data();
        if (!userData?.pushToken) {
          throw new Error('No push token available');
        }

        // Send push notification
        const message = {
          token: userData.pushToken,
          notification: {
            title: pushData.title,
            body: pushData.message
          },
          data: pushData.data || {},
          android: {
            priority: 'high' as const
          },
          apns: {
            payload: {
              aps: {
                sound: 'default'
              }
            }
          }
        };

        const response = await admin.messaging().send(message);

        // Update status to sent
        await pushDoc.ref.update({
          status: 'sent',
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          messageId: response
        });

        // Track delivery
        await db.collection('pushDeliveryLogs').add({
          pushId: pushDoc.id,
          userId: pushData.userId,
          title: pushData.title,
          message: pushData.message,
          status: 'delivered',
          messageId: response,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`Push notification sent successfully to user ${pushData.userId}`);
      } catch (error: any) {
        console.error(`Failed to send push notification to user ${pushData.userId}:`, error);
        
        // Update status to failed
        await pushDoc.ref.update({
          status: 'failed',
          error: error.message,
          failedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Track failure
        await db.collection('pushDeliveryLogs').add({
          pushId: pushDoc.id,
          userId: pushData.userId,
          title: pushData.title,
          message: pushData.message,
          status: 'failed',
          error: error.message,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    });

    await Promise.all(pushPromises);
    console.log('Push notification queue processing completed');
  } catch (error) {
    console.error('Push notification queue processing error:', error);
  }
});
