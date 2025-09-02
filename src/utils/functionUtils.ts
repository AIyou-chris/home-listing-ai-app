// Firebase removed; provide local fallback util that returns failure (caller handles)

/**
 * Calls a Firebase function with fallback to HTTP version if the callable version fails
 * 
 * @param functionName The name of the Firebase function to call
 * @param data The data to pass to the function
 * @returns The result of the function call
 */
export const callFunctionWithFallback = async (_functionName: string, _data: any) => {
  return { success: false };
};