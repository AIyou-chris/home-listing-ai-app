import * as functions from 'firebase-functions';

// Simple test function for voice
export const testVoiceFunction = functions.https.onCall(async (data: any, context) => {
    try {
        console.log("testVoiceFunction: Function called");
        return { 
            success: true, 
            message: "Voice test function working!",
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error("testVoiceFunction error:", error);
        throw new functions.https.HttpsError("internal", "Test function failed");
    }
});
