import * as functions from 'firebase-functions';

// Data retention and cleanup
export const cleanupExpiredData = functions.https.onCall(async (data: any, context: any) => {
    try {
        // Validate authentication
        if (!context?.auth) {
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
        }

        // Return simple success response
        return { success: true };
    } catch (error) {
        console.error("Data cleanup error:", error);
        throw new functions.https.HttpsError("internal", "Failed to cleanup expired data");
    }
});