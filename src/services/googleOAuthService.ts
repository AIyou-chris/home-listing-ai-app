// Lightweight placeholder implementation for Google OAuth integration.
// The real Google OAuth flow is currently disabled in the app, but several services
// still import this module. To avoid runtime errors (and bundler warnings) we expose
// a minimal, no-op API surface that fulfils those expectations without doing anything.

type AuthScope = string[];

interface AuthResult {
  success: boolean;
  accessToken?: string | null;
  reason?: string;
}

class GoogleOAuthServiceStub {
  public readonly isAvailable = false;

  isAuthenticated(): boolean {
    return false;
  }

  async requestAccess(): Promise<boolean> {
    return false;
  }

  async authenticate(_scopes: AuthScope = []): Promise<AuthResult> {
    return {
      success: false,
      accessToken: null,
      reason: 'Google OAuth disabled'
    };
  }

  getAccessToken(): string | null {
    return null;
  }

  getUserEmail(): string | null {
    return null;
  }

  logout(): void {
    // No-op
  }

  async forceReAuth(): Promise<boolean> {
    return false;
  }

  refreshTokenLoading(): void {
    // No-op
  }
}

export const googleOAuthService = new GoogleOAuthServiceStub();

export default googleOAuthService;
