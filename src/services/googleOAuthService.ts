// Google OAuth service using Google Identity Services
class GoogleOAuthService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiry: number | null = null;
  private googleAuth: any = null;
  private userEmail: string | null = null;
  public isAvailable: boolean = false;

  constructor() {
    this.loadTokensFromStorage();
    this.initializeGoogleAuth();
    console.log('🔧 GoogleOAuthService initialized');
    console.log('🔑 Access token loaded:', this.accessToken ? 'YES' : 'NO');
    console.log('🔄 Refresh token loaded:', this.refreshToken ? 'YES' : 'NO');
  }

  private loadTokensFromStorage(): void {
    try {
      this.accessToken = localStorage.getItem('google_access_token');
      this.refreshToken = localStorage.getItem('google_refresh_token');
      const expiry = localStorage.getItem('google_token_expiry');
      this.tokenExpiry = expiry ? parseInt(expiry) : null;
      this.userEmail = localStorage.getItem('google_user_email');
      
      console.log('📦 Tokens loaded from localStorage:', {
        hasAccessToken: !!this.accessToken,
        hasRefreshToken: !!this.refreshToken,
        expiry: this.tokenExpiry ? new Date(this.tokenExpiry).toISOString() : 'none'
      });
    } catch (error) {
      console.error('Error loading tokens from storage:', error);
    }
  }

  private saveTokensToStorage(): void {
    try {
      if (this.accessToken) {
        localStorage.setItem('google_access_token', this.accessToken);
      }
      if (this.refreshToken) {
        localStorage.setItem('google_refresh_token', this.refreshToken);
      }
      if (this.tokenExpiry) {
        localStorage.setItem('google_token_expiry', this.tokenExpiry.toString());
      }
      if (this.userEmail) {
        localStorage.setItem('google_user_email', this.userEmail);
      }
      console.log('💾 Tokens saved to localStorage');
    } catch (error) {
      console.error('Error saving tokens to storage:', error);
    }
  }

  private initializeGoogleAuth(): void {
    // Load Google Identity Services script
    if (!window.google) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        this.setupGoogleAuth();
      };
      document.head.appendChild(script);
    } else {
      this.setupGoogleAuth();
    }
  }

  private setupGoogleAuth(): void {
    try {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (!clientId) {
        console.warn('⚠️ Google Client ID is not configured. Google services will be disabled.');
        this.isAvailable = false;
        return;
      }
      console.log('🔧 Setting up Google Auth with client ID:', clientId.substring(0, 8) + '...');
      
      this.googleAuth = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.compose',
        callback: (response: any) => {
          console.log('✅ OAuth callback received:', response);
          if (response.access_token) {
            this.accessToken = response.access_token;
            this.tokenExpiry = Date.now() + (response.expires_in * 1000);
            this.saveTokensToStorage();
            console.log('✅ Access token saved successfully');
            this.fetchUserEmail().catch(() => {});
          }
        },
        error_callback: (error: any) => {
          console.error('❌ OAuth error:', error);
          // Handle COOP and other popup errors gracefully
          if (error.type === 'popup_closed_by_user') {
            console.log('User closed OAuth popup');
          }
        }
      });
      console.log('🔧 Google Auth client initialized');
      this.isAvailable = true;
    } catch (error) {
      console.error('❌ Error initializing Google Auth:', error);
      this.isAvailable = false;
    }
  }

  async requestAccess(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.googleAuth) {
        console.error('❌ Google Auth not initialized');
        resolve(false);
        return;
      }

      try {
        console.log('🔄 Requesting Google OAuth access...');
        this.googleAuth.requestAccessToken();
        
        // Set a timeout to check if we got the token
        setTimeout(() => {
          if (this.accessToken) {
            console.log('✅ OAuth successful, access token received');
            resolve(true);
          } else {
            console.log('❌ OAuth failed or was cancelled');
            resolve(false);
          }
        }, 5000);
      } catch (error) {
        console.error('❌ Error requesting access:', error);
        resolve(false);
      }
    });
  }

  async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) {
      console.error('No refresh token available');
      return false;
    }

    try {
      console.log('🔄 Refreshing access token...');
      
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
          client_secret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '',
          refresh_token: this.refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        console.error('❌ Token refresh failed:', response.statusText);
        return false;
      }

      const tokenData = await response.json();
      this.accessToken = tokenData.access_token;
      this.tokenExpiry = Date.now() + (tokenData.expires_in * 1000);
      
      this.saveTokensToStorage();
      console.log('✅ Access token refreshed successfully');
      return true;
    } catch (error) {
      console.error('❌ Error refreshing token:', error);
      return false;
    }
  }

  isAuthenticated(): boolean {
    if (!this.accessToken) {
      console.log('❌ No access token available');
      return false;
    }

    if (this.tokenExpiry && Date.now() > this.tokenExpiry) {
      console.log('⏰ Token expired, attempting refresh...');
      this.refreshAccessToken().then(success => {
        if (!success) {
          console.log('❌ Token refresh failed, logging out');
          this.logout();
        }
      });
      return false;
    }

    console.log('✅ User is authenticated');
    return true;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  getUserEmail(): string | null {
    return this.userEmail;
  }

  async fetchUserEmail(): Promise<string | null> {
    try {
      if (!this.accessToken) return null;
      const resp = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
        headers: { 'Authorization': `Bearer ${this.accessToken}` }
      });
      if (!resp.ok) return null;
      const data = await resp.json();
      this.userEmail = data.emailAddress || null;
      this.saveTokensToStorage();
      console.log('📧 Google user email:', this.userEmail || 'none');
      return this.userEmail;
    } catch (e) {
      return null;
    }
  }

  logout(): void {
    console.log('🚪 Logging out, clearing tokens...');
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
    this.userEmail = null;
    
    try {
      localStorage.removeItem('google_access_token');
      localStorage.removeItem('google_refresh_token');
      localStorage.removeItem('google_token_expiry');
      localStorage.removeItem('google_user_email');
      console.log('🧹 Tokens cleared from localStorage');
    } catch (error) {
      console.error('Error clearing tokens from storage:', error);
    }
  }

  // Force re-authentication
  async forceReAuth(): Promise<boolean> {
    console.log('🔄 Force re-authentication requested...');
    
    // Clear current tokens
    this.logout();
    
    // Request new access
    return await this.requestAccess();
  }

  // Manual token refresh for debugging
  refreshTokenLoading(): void {
    console.log('🔄 Manually refreshing token loading...');
    this.loadTokensFromStorage();
  }
}

// Add Google types to window
declare global {
  interface Window {
    google: any;
  }
}

export const googleOAuthService = new GoogleOAuthService();



