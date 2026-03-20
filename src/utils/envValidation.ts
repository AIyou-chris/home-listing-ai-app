// Environment validation utilities
export class EnvValidation {
  static validateEnvironment(): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

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
    return {
      mode: import.meta.env.MODE,
      dev: import.meta.env.DEV,
      prod: import.meta.env.PROD,
      ssr: import.meta.env.SSR,
      baseUrl: import.meta.env.BASE_URL,
      hasDatafiniti: !!import.meta.env.VITE_DATAFINITI_API_KEY
    };
  }
}
