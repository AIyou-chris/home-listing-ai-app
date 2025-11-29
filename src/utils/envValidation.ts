// Environment validation utilities
import { getBooleanEnvValue, getEnvObject, getEnvValue, isDevEnv } from '../lib/env'

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
    const isDevelopment = isDevEnv();
    const environment = isDevelopment ? 'development' : 'production';

    // Check required environment variables
    const requiredVars = this.requiredEnvVars[environment];
    
    for (const envVar of requiredVars) {
      const value = getEnvValue(envVar);
      
      if (!value) {
        errors.push(`Missing required environment variable: ${envVar}`);
      } else if (value.includes('your-') || value.includes('example')) {
        errors.push(`Environment variable ${envVar} contains placeholder value`);
      }
    }

    // Check optional environment variables
    for (const envVar of this.optionalEnvVars) {
      const value = getEnvValue(envVar);
      
      if (!value) {
        warnings.push(`Optional environment variable not set: ${envVar}`);
      } else if (value.includes('your-') || value.includes('example')) {
        warnings.push(`Environment variable ${envVar} contains placeholder value`);
      }
    }

    // Validate API keys format when provided
    const openAiKey = getEnvValue('VITE_OPENAI_API_KEY');
    if (openAiKey && !openAiKey.startsWith('sk-')) {
      warnings.push('OpenAI API key format appears invalid');
    }

    const geminiKey = getEnvValue('VITE_GEMINI_API_KEY');
    if (geminiKey && !geminiKey.startsWith('AIza')) {
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

  static getEnvironmentInfo(): Record<string, boolean | string> {
    const env = getEnvObject()
    return {
      mode: (env.MODE as string) ?? '',
      dev: getBooleanEnvValue('DEV') ?? false,
      prod: getBooleanEnvValue('PROD') ?? false,
      ssr: getBooleanEnvValue('SSR') ?? false,
      baseUrl: (env.BASE_URL as string) ?? '',
      hasOpenAI: !!getEnvValue('VITE_OPENAI_API_KEY'),
      hasGemini: !!getEnvValue('VITE_GEMINI_API_KEY'),
      hasDatafiniti: !!getEnvValue('VITE_DATAFINITI_API_KEY')
    };
  }
}
