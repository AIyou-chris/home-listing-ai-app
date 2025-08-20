import * as functions from 'firebase-functions';

// Simple test function that doesn't use any external APIs
export const testFunction = functions.https.onCall(async (data: any, context) => {
    try {
        console.log("testFunction: Function started");
        
        // Validate data parameter
        if (!data) {
            console.error("testFunction: No data provided");
            throw new functions.https.HttpsError("invalid-argument", "No data provided");
        }
        
        // Log the data for debugging
        console.log("testFunction: Data received:", JSON.stringify(data).substring(0, 200));
        
        // Return a simple response
        return { 
            text: "This is a test response from the Firebase function. It works!",
            receivedData: data
        };
    } catch (error) {
        console.error("testFunction: Error:", error);
        throw new functions.https.HttpsError("internal", "Test function failed: " + (error instanceof Error ? error.message : String(error)));
    }
});