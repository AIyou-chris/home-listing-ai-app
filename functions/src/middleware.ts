import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import cors from 'cors';

const db = admin.firestore();

// Create a CORS middleware instance
export const corsHandler = cors({
  origin: true, // Allow requests from any origin in development
  // For production, you might want to restrict to specific origins:
  // origin: ['https://home-listing-ai.web.app', 'https://home-listing-ai.firebaseapp.com']
});

// Apply CORS middleware to an HTTP function
export const applyCors = (req: any, res: any) => {
  return new Promise((resolve, reject) => {
    corsHandler(req, res, () => {
      resolve(true);
    });
  });
};

// Admin middleware for Cloud Functions
export const requireAdmin = (context: any) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  // Check if user exists in admins collection
  const adminDoc = db.collection('admins').doc(context.auth.uid);
  if (!adminDoc) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required');
  }
};

// Require specific admin permission
export const requireAdminPermission = (permission: string) => {
  return async (context: any) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    try {
      const adminDoc = await db.collection('admins').doc(context.auth.uid).get();
      if (!adminDoc.exists) {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required');
      }

      const adminData = adminDoc.data();
      if (!adminData?.isActive) {
        throw new functions.https.HttpsError('permission-denied', 'Admin account is inactive');
      }

      if (!adminData?.permissions?.[permission]) {
        throw new functions.https.HttpsError('permission-denied', `Permission '${permission}' required`);
      }
    } catch (error) {
      console.error('Admin permission check error:', error);
      throw new functions.https.HttpsError('permission-denied', 'Admin permission verification failed');
    }
  };
};

// Require super admin role
export const requireSuperAdmin = async (context: any) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  try {
    const adminDoc = await db.collection('admins').doc(context.auth.uid).get();
    if (!adminDoc.exists) {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    const adminData = adminDoc.data();
    if (!adminData?.isActive) {
      throw new functions.https.HttpsError('permission-denied', 'Admin account is inactive');
    }

    if (adminData?.role !== 'super_admin') {
      throw new functions.https.HttpsError('permission-denied', 'Super admin access required');
    }
  } catch (error) {
    console.error('Super admin check error:', error);
    throw new functions.https.HttpsError('permission-denied', 'Super admin verification failed');
  }
};

// Require specific admin role
export const requireAdminRole = (role: 'super_admin' | 'admin' | 'moderator') => {
  return async (context: any) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    try {
      const adminDoc = await db.collection('admins').doc(context.auth.uid).get();
      if (!adminDoc.exists) {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required');
      }

      const adminData = adminDoc.data();
      if (!adminData?.isActive) {
        throw new functions.https.HttpsError('permission-denied', 'Admin account is inactive');
      }

      if (adminData?.role !== role) {
        throw new functions.https.HttpsError('permission-denied', `${role} access required`);
      }
    } catch (error) {
      console.error('Admin role check error:', error);
      throw new functions.https.HttpsError('permission-denied', 'Admin role verification failed');
    }
  };
};

// Get admin user data from context
export const getAdminUser = async (context: any) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  try {
    const adminDoc = await db.collection('admins').doc(context.auth.uid).get();
    if (!adminDoc.exists) {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    const adminData = adminDoc.data();
    if (!adminData?.isActive) {
      throw new functions.https.HttpsError('permission-denied', 'Admin account is inactive');
    }

    return {
      id: context.auth.uid,
      email: context.auth.token.email || '',
      name: adminData.name || 'Admin User',
      role: adminData.role || 'admin',
      permissions: adminData.permissions || {},
      isActive: adminData.isActive,
      lastLogin: adminData.lastLogin,
      createdAt: adminData.createdAt,
      updatedAt: adminData.updatedAt
    };
  } catch (error) {
    console.error('Get admin user error:', error);
    throw new functions.https.HttpsError('permission-denied', 'Admin user verification failed');
  }
};

// Check if user has specific permission
export const hasPermission = (permission: string) => {
  return async (context: any) => {
    const adminUser = await getAdminUser(context);
    return adminUser.permissions[permission] || false;
  };
};

// Log admin action
export const logAdminAction = async (adminId: string, action: string, details?: any) => {
  try {
    await db.collection('adminLogs').add({
      adminId,
      action,
      details,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      ipAddress: 'unknown', // Could be extracted from request context
      userAgent: 'unknown'  // Could be extracted from request context
    });
  } catch (error) {
    console.error('Error logging admin action:', error);
    // Don't throw error as logging should not break the main function
  }
};

// Rate limiting middleware
export const rateLimit = (maxRequests: number, windowMs: number) => {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (context: any) => {
    const userId = context.auth?.uid || 'anonymous';
    const now = Date.now();
    const userRequests = requests.get(userId);

    if (!userRequests || now > userRequests.resetTime) {
      requests.set(userId, { count: 1, resetTime: now + windowMs });
    } else {
      userRequests.count++;
      if (userRequests.count > maxRequests) {
        throw new functions.https.HttpsError('resource-exhausted', 'Rate limit exceeded');
      }
    }
  };
};

// Input validation middleware
export const validateInput = (schema: any) => {
  return (data: any) => {
    try {
      // Basic validation - in production, use a proper validation library like Joi or Zod
      if (!data || typeof data !== 'object') {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid input data');
      }

      // Check required fields
      for (const [field, rules] of Object.entries(schema)) {
        const ruleSet = rules as any;
        if (ruleSet.required && !data[field]) {
          throw new functions.https.HttpsError('invalid-argument', `Field '${field}' is required`);
        }

        if (data[field] && ruleSet.type && typeof data[field] !== ruleSet.type) {
          throw new functions.https.HttpsError('invalid-argument', `Field '${field}' must be of type ${ruleSet.type}`);
        }

        if (data[field] && ruleSet.minLength && data[field].length < ruleSet.minLength) {
          throw new functions.https.HttpsError('invalid-argument', `Field '${field}' must be at least ${ruleSet.minLength} characters`);
        }

        if (data[field] && ruleSet.maxLength && data[field].length > ruleSet.maxLength) {
          throw new functions.https.HttpsError('invalid-argument', `Field '${field}' must be at most ${ruleSet.maxLength} characters`);
        }
      }
    } catch (error) {
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError('invalid-argument', 'Input validation failed');
    }
  };
};

// Audit trail middleware
export const auditTrail = (action: string) => {
  return async (context: any, data: any, result: any) => {
    try {
      const adminUser = await getAdminUser(context);
      
      await db.collection('auditTrail').add({
        adminId: adminUser.id,
        adminEmail: adminUser.email,
        action,
        data,
        result,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        ipAddress: 'unknown',
        userAgent: 'unknown'
      });
    } catch (error) {
      console.error('Error creating audit trail:', error);
      // Don't throw error as audit trail should not break the main function
    }
  };
};

// Error handling middleware
export const handleErrors = (handler: Function) => {
  return async (data: any, context: any) => {
    try {
      return await handler(data, context);
    } catch (error) {
      console.error('Function error:', error);
      
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      
      // Log error for debugging
      await db.collection('errorLogs').add({
        error: (error as any).message,
        stack: (error as any).stack,
        functionName: handler.name,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        userId: context.auth?.uid || 'anonymous'
      });
      
      throw new functions.https.HttpsError('internal', 'An unexpected error occurred');
    }
  };
};

// Combine multiple middleware functions
export const combineMiddleware = (...middlewares: Function[]) => {
  return (handler: Function) => {
    return async (data: any, context: any) => {
      // Apply all middleware
      for (const middleware of middlewares) {
        await middleware(context, data);
      }
      
      // Execute handler
      return await handler(data, context);
    };
  };
};

// Example usage patterns:
/*
// Basic admin check
export const myAdminFunction = functions.https.onCall(
  combineMiddleware(requireAdmin)(
    async (data, context) => {
      // Function logic here
    }
  )
);

// Admin with specific permission
export const myPermissionFunction = functions.https.onCall(
  combineMiddleware(requireAdminPermission('userManagement'))(
    async (data, context) => {
      // Function logic here
    }
  )
);

// Super admin only
export const mySuperAdminFunction = functions.https.onCall(
  combineMiddleware(requireSuperAdmin)(
    async (data, context) => {
      // Function logic here
    }
  )
);

// With input validation and audit trail
export const myValidatedFunction = functions.https.onCall(
  combineMiddleware(
    requireAdmin,
    validateInput({
      userId: { required: true, type: 'string' },
      action: { required: true, type: 'string' }
    })
  )(
    async (data, context) => {
      const result = await someOperation(data);
      await auditTrail('user_action')(context, data, result);
      return result;
    }
  )
);
*/
