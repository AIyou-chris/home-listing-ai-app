// Firebase removed; provide simple in-memory/local storage fallback
import { sanitizeForFirebase, validatePersona } from '../utils/firebaseUtils';

/**
 * Service for managing AI personas
 */
export const personaService = {
  /**
   * Save a persona to Firebase
   * 
   * @param userId - The user ID
   * @param persona - The persona data to save
   * @returns Promise that resolves when the save is complete
   */
  savePersona: async (userId: string, persona: any): Promise<void> => {
    try {
      // First validate the persona to ensure all required fields exist
      const validatedPersona = validatePersona(persona);
      
      // Then sanitize it to remove any undefined values
      const sanitizedPersona = sanitizeForFirebase(validatedPersona);
      
      // Save locally under a namespaced key
      const key = `persona_${userId}`;
      localStorage.setItem(key, JSON.stringify(sanitizedPersona));
      console.log("Persona saved successfully");
      return Promise.resolve();
    } catch (error) {
      console.error("Failed to save persona:", error);
      return Promise.reject(error);
    }
  },
  
  /**
   * Get a user's persona from Firebase
   * 
   * @param userId - The user ID
   * @returns Promise that resolves with the persona data
   */
  getPersona: async (userId: string): Promise<any> => {
    try {
      const key = `persona_${userId}`;
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : {};
    } catch (error) {
      console.error("Failed to get persona:", error);
      return Promise.reject(error);
    }
  }
};
