// Environment validation utilities
export class EnvValidation {
  private static requiredEnvVars = {
    development: [
      'VITE_FIREBASE_API_KEY',
      'VITE_FIREBASE_AUTH_DOMAIN',
      'VITE_FIREBASE_PROJECT_ID',
      'VITE_FIREBASE_STORAGE_BUCKET',
      'VITE_FIREBASE_MESSAGING_SENDER_ID',
      'VITE_FIREBASE_APP_ID'
    ],
    production: [
      'VITE_FIREBASE_API_KEY',
      'VITE_FIREBASE_AUTH_DOMAIN',
      'VITE_FIREBASE_PROJECT_ID',
      'VITE_FIREBASE_STORAGE_BUCKET',
      'VITE_FIREBASE_MESSAGING_SENDER_ID',
      'VITE_FIREBASE_APP_ID',
      'VITE_OPENAI_API_KEY',
      'VITE_GEMINI_API_KEY'
    ]
  };

  private static optionalEnvVars = [
    'VITE_DATAFINITI_API_KEY',
    'VITE_GOOGLE_CLIENT_ID',
    'VITE_SENTRY_DSN'
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

    // Validate Firebase configuration
    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID
    };

    if (firebaseConfig.authDomain && !firebaseConfig.authDomain.includes(firebaseConfig.projectId || '')) {
      warnings.push('Firebase auth domain may not match project ID');
    }

    // Validate API keys format
    if (import.meta.env.VITE_OPENAI_API_KEY && !import.meta.env.VITE_OPENAI_API_KEY.startsWith('sk-')) {
      errors.push('OpenAI API key format appears invalid');
    }

    if (import.meta.env.VITE_GEMINI_API_KEY && !import.meta.env.VITE_GEMINI_API_KEY.startsWith('AIza')) {
      errors.push('Gemini API key format appears invalid');
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
      hasFirebaseConfig: !!(
        import.meta.env.VITE_FIREBASE_API_KEY &&
        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN &&
        import.meta.env.VITE_FIREBASE_PROJECT_ID
      ),
      hasOpenAI: !!import.meta.env.VITE_OPENAI_API_KEY,
      hasGemini: !!import.meta.env.VITE_GEMINI_API_KEY,
      hasDatafiniti: !!import.meta.env.VITE_DATAFINITI_API_KEY
    };
  }
}