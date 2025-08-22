// Input validation utilities
export class ValidationUtils {
  // Email validation
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Phone validation
  static isValidPhone(phone: string): boolean {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone);
  }

  // URL validation
  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // Sanitize HTML input
  static sanitizeHtml(input: string): string {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  // Validate property data
  static validateProperty(property: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!property.title || property.title.trim().length < 5) {
      errors.push('Title must be at least 5 characters long');
    }

    if (!property.address || property.address.trim().length < 10) {
      errors.push('Address must be at least 10 characters long');
    }

    if (!property.price || property.price <= 0) {
      errors.push('Price must be greater than 0');
    }

    if (property.bedrooms < 0) {
      errors.push('Bedrooms cannot be negative');
    }

    if (property.bathrooms < 0) {
      errors.push('Bathrooms cannot be negative');
    }

    if (property.squareFeet && property.squareFeet <= 0) {
      errors.push('Square feet must be greater than 0');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validate lead data
  static validateLead(lead: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!lead.name || lead.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters long');
    }

    if (!lead.email || !this.isValidEmail(lead.email)) {
      errors.push('Valid email is required');
    }

    if (lead.phone && !this.isValidPhone(lead.phone)) {
      errors.push('Phone number format is invalid');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validate agent profile
  static validateAgentProfile(agent: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!agent.name || agent.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters long');
    }

    if (!agent.email || !this.isValidEmail(agent.email)) {
      errors.push('Valid email is required');
    }

    if (!agent.phone || !this.isValidPhone(agent.phone)) {
      errors.push('Valid phone number is required');
    }

    if (agent.website && !this.isValidUrl(agent.website)) {
      errors.push('Website URL is invalid');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Sanitize user input
  static sanitizeInput(input: string): string {
    if (typeof input !== 'string') return '';
    
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .substring(0, 1000); // Limit length
  }

  // Validate file upload
  static validateFile(file: File, allowedTypes: string[], maxSize: number): { isValid: boolean; error?: string } {
    if (!allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: `File type ${file.type} is not allowed`
      };
    }

    if (file.size > maxSize) {
      return {
        isValid: false,
        error: `File size ${file.size} exceeds maximum of ${maxSize} bytes`
      };
    }

    return { isValid: true };
  }

  // Rate limiting check
  static checkRateLimit(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const windowKey = `${key}_${Math.floor(now / windowMs)}`;
    
    const stored = localStorage.getItem(windowKey);
    const count = stored ? parseInt(stored) : 0;
    
    if (count >= limit) {
      return false;
    }
    
    localStorage.setItem(windowKey, (count + 1).toString());
    
    // Clean up old entries
    for (let i = 0; i < localStorage.length; i++) {
      const storageKey = localStorage.key(i);
      if (storageKey?.startsWith(key + '_')) {
        const timestamp = parseInt(storageKey.split('_')[1]);
        if (now - timestamp * windowMs > windowMs * 2) {
          localStorage.removeItem(storageKey);
        }
      }
    }
    
    return true;
  }
}