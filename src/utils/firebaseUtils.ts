/**
 * Utility functions for Firebase operations
 */

/**
 * Sanitizes data before saving to Firebase by removing undefined values
 * Firebase doesn't accept undefined values, but does accept null
 * 
 * @param data - The data to sanitize
 * @returns Sanitized data safe for Firebase
 */
export const sanitizeForFirebase = (data: any): any => {
  // Handle null or undefined
  if (data === null || data === undefined) {
    return null;
  }
  
  // Handle primitive values
  if (typeof data !== 'object' || data === null) {
    return data;
  }
  
  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => sanitizeForFirebase(item));
  }
  
  // Handle objects
  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    // Skip undefined values
    if (value !== undefined) {
      sanitized[key] = sanitizeForFirebase(value);
    }
  }
  
  return sanitized;
};

/**
 * Ensures that a persona object has all required fields with valid values
 * 
 * @param persona - The persona object to validate
 * @returns A validated persona object with default values for missing fields
 */
export const validatePersona = (persona: any): any => {
  if (!persona) return {};
  
  const validatedPersona = { ...persona } as any;
  
  // Ensure kbPersonas exists
  if (!validatedPersona.kbPersonas) {
    validatedPersona.kbPersonas = {};
  }
  
  // Ensure god persona exists
  if (!validatedPersona.kbPersonas.god) {
    validatedPersona.kbPersonas.god = {};
  }
  
  // Ensure voiceId has a default value if undefined
  if (validatedPersona.kbPersonas.god.voiceId === undefined) {
    validatedPersona.kbPersonas.god.voiceId = "alloy"; // Default voice from .env.local
  }
  
  return validatedPersona;
};
