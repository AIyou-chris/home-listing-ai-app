import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK
admin.initializeApp();

// Export the API
export { api } from './api';

// Keep essential functions
export const addNewUser = functions.https.onCall(async (data: any, context: any) => {
    try {
        if (!context?.auth) {
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
        }

        const { name, email, role = 'agent', plan = 'Solo Agent' } = data;

        if (!name || !email) {
            throw new functions.https.HttpsError("invalid-argument", "Name and email are required");
        }

        const db = admin.firestore();
        const userRef = await db.collection('users').add({
            name,
            email,
            role,
            plan,
            status: 'Active',
            dateJoined: new Date().toISOString(),
            lastActive: new Date().toISOString(),
            propertiesCount: 0,
            leadsCount: 0,
            aiInteractions: 0,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return {
            success: true,
            userId: userRef.id,
            message: 'User created successfully'
        };
    } catch (error) {
        console.error("Add new user error:", error);
        throw new functions.https.HttpsError("internal", "Failed to add user");
    }
});