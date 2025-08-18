import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
}

// Setup initial admin user (HTTP function with NO Firestore usage)
export const setupInitialAdminHttp = functions.https.onRequest(async (req, res) => {
    // Set CORS headers for all origins (including localhost)
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            res.status(400).json({ error: 'Email and password are required' });
            return;
        }

        console.log('Setting up admin user:', email);

        // Check if user already exists using Firebase Auth only
        try {
            const existingUser = await admin.auth().getUserByEmail(email);
            if (existingUser) {
                res.status(409).json({ error: 'User already exists with this email' });
                return;
            }
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                // User doesn't exist, which is what we want
                console.log('User does not exist, proceeding with creation');
            } else {
                console.error('Error checking existing user:', error);
                res.status(500).json({ error: `Firebase Auth error: ${error.message}` });
                return;
            }
        }

        // Create the admin user using Firebase Auth only
        const userRecord = await admin.auth().createUser({
            email: email,
            password: password,
            displayName: 'System Administrator',
            emailVerified: true
        });

        console.log('Created Firebase user:', userRecord.uid);

        // Set custom claims for admin role
        await admin.auth().setCustomUserClaims(userRecord.uid, {
            role: 'admin',
            permissions: ['users', 'billing', 'analytics', 'system', 'support']
        });

        console.log('Set admin claims for user:', userRecord.uid);

        res.status(200).json({
            success: true,
            message: `Admin user created successfully: ${email}`,
            userId: userRecord.uid
        });
    } catch (error: any) {
        console.error('Setup admin error:', error);
        res.status(500).json({ 
            error: `Failed to setup admin: ${error.message || error}`,
            details: error
        });
    }
});

// Keep the callable function for backward compatibility (also without Firestore)
export const setupInitialAdmin = functions.https.onCall(async (data: any, context: any) => {
    try {
        const { email, password } = data;
        
        if (!email || !password) {
            throw new functions.https.HttpsError('invalid-argument', 'Email and password are required');
        }

        // Check if user already exists using Firebase Auth only
        try {
            const existingUser = await admin.auth().getUserByEmail(email);
            if (existingUser) {
                throw new functions.https.HttpsError('already-exists', 'User already exists with this email');
            }
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                // User doesn't exist, which is what we want
                console.log('User does not exist, proceeding with creation');
            } else {
                throw new functions.https.HttpsError('internal', `Firebase Auth error: ${error.message}`);
            }
        }

        // Create the admin user using Firebase Auth only
        const userRecord = await admin.auth().createUser({
            email: email,
            password: password,
            displayName: 'System Administrator',
            emailVerified: true
        });

        // Set custom claims for admin role
        await admin.auth().setCustomUserClaims(userRecord.uid, {
            role: 'admin',
            permissions: ['users', 'billing', 'analytics', 'system', 'support']
        });

        return {
            success: true,
            message: `Admin user created successfully: ${email}`,
            userId: userRecord.uid
        };
    } catch (error: any) {
        console.error('Setup admin error:', error);
        throw new functions.https.HttpsError('internal', `Failed to setup admin: ${error.message || error}`);
    }
});
