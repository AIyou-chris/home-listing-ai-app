import { httpsCallable } from 'firebase/functions';
import { functions } from '../services/firebase';

/**
 * Calls a Firebase function with fallback to HTTP version if the callable version fails
 * 
 * @param functionName The name of the Firebase function to call
 * @param data The data to pass to the function
 * @returns The result of the function call
 */
export const callFunctionWithFallback = async (functionName: string, data: any) => {
  try {
    // First try the callable version
    console.log(`Calling ${functionName} function...`);
    const callableFunction = httpsCallable(functions, functionName);
    const result = await callableFunction(data);
    console.log(`${functionName} function called successfully:`, result.data);
    return { success: true, data: result.data };
  } catch (callableError) {
    console.error(`Failed to call ${functionName} via callable function:`, callableError);
    
    // Try the HTTP version as a fallback
    try {
      console.log(`Trying HTTP version of ${functionName}...`);
      const response = await fetch(`https://us-central1-home-listing-ai.cloudfunctions.net/${functionName}Http`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const responseData = await response.json();
      console.log(`${functionName} called successfully via HTTP:`, responseData);
      return { success: true, data: responseData };
    } catch (httpError) {
      console.error(`Failed to call ${functionName} via HTTP:`, httpError);
      return { 
        success: false, 
        error: httpError instanceof Error ? httpError.message : 'Unknown error',
        originalError: callableError
      };
    }
  }
};