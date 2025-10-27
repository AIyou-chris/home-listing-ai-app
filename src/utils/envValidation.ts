// Environment validation utilities
export class EnvValidation {
  private static requiredEnvVars = {
    development: [] as string[],
    production: [
      'VITE_OPENAI_API_KEY',
      'VITE_GEMINI_API_KEY'
    ]
  };

  private static optionalEnvVars = [
    'VITE_DATAFINITI_API_KEY'
  ];

  static validateEnvironment(): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const isDevelopment = import.meta.env.DEV;
    const environment = isDevelopment ? 'development' : 'production';

    // Check required environment variables
    const requiredVars = this.requiredEnvVars[environment];
    
    for (const envVar of requiredVars) {
      const value = import.meta.env[envVar];
      
      if (!value) {
        errors.push(`Missing required environment variable: ${envVar}`);
      } else if (value.includes('your-') || value.includes('example')) {
        errors.push(`Environment variable ${envVar} contains placeholder value`);
      }
    }

    // Check optional environment variables
    for (const envVar of this.optionalEnvVars) {
      const value = import.meta.env[envVar];
      
      if (!value) {
        warnings.push(`Optional environment variable not set: ${envVar}`);
      } else if (value.includes('your-') || value.includes('example')) {
        warnings.push(`Environment variable ${envVar} contains placeholder value`);
      }
    }

    // Validate API keys format when provided
    if (import.meta.env.VITE_OPENAI_API_KEY && !import.meta.env.VITE_OPENAI_API_KEY.startsWith('sk-')) {
      warnings.push('OpenAI API key format appears invalid');
    }

    if (import.meta.env.VITE_GEMINI_API_KEY && !import.meta.env.VITE_GEMINI_API_KEY.startsWith('AIza')) {
      warnings.push('Gemini API key format appears invalid');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  static logValidationResults(): void {
    const result = this.validateEnvironment();
    
    if (result.errors.length > 0) {
      console.error('❌ Environment validation failed:');
      result.errors.forEach(error => console.error(`  - ${error}`));
    }

    if (result.warnings.length > 0) {
      console.warn('⚠️ Environment validation warnings:');
      result.warnings.forEach(warning => console.warn(`  - ${warning}`));
    }

    if (result.isValid && result.warnings.length === 0) {
      console.log('✅ Environment validation passed');
    }
  }

  static getEnvironmentInfo(): Record<string, any> {
    return {
      mode: import.meta.env.MODE,
      dev: import.meta.env.DEV,
      prod: import.meta.env.PROD,
      ssr: import.meta.env.SSR,
      baseUrl: import.meta.env.BASE_URL,
      hasOpenAI: !!import.meta.env.VITE_OPENAI_API_KEY,
      hasGemini: !!import.meta.env.VITE_GEMINI_API_KEY,
      hasDatafiniti: !!import.meta.env.VITE_DATAFINITI_API_KEY
    };
  }
}
