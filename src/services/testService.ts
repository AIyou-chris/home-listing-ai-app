import { httpsCallable } from 'firebase/functions';
import { functions } from '../services/firebase';

// Create a callable reference to the test function
const testFunctionCallable = httpsCallable(functions, 'testFunction');

// Function to call the test function
export const callTestFunction = async (data: any): Promise<string> => {
  try {
    console.log("Calling testFunction with data:", data);
    
    // Call the Firebase function
    const result = await testFunctionCallable(data);
    
    console.log("Received response from testFunction:", result);
    
    // Check if we have a valid response
    if (result && result.data && typeof (result.data as { text: string }).text === 'string') {
      const responseText = (result.data as { text: string }).text;
      console.log("Valid response received:", responseText);
      return responseText;
    } else {
      console.error("Invalid response format:", result);
      throw new Error("Invalid response format from test function");
    }
  } catch (error) {
    console.error("Error calling test function:", error);
    throw error;
  }
};