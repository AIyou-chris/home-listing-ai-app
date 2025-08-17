// Admin authentication service
// This is a simple admin authentication system
// In production, you'd want to use Firebase Auth with custom claims or a separate admin table

export interface AdminUser {
  email: string;
  name: string;
  role: 'admin' | 'super-admin';
  permissions: string[];
}

// Hardcoded admin credentials for demo purposes
// In production, these should be stored securely in Firebase or a separate admin database
const ADMIN_CREDENTIALS = [
  {
    email: 'us@homelistingai.com',
    password: 'Jake@2024', // In production, use hashed passwords
    user: {
      email: 'us@homelistingai.com',
      name: 'System Administrator',
      role: 'super-admin' as const,
      permissions: ['users', 'billing', 'analytics', 'system', 'support']
    }
  }
];

class AdminAuthService {
  private static instance: AdminAuthService;
  private currentAdmin: AdminUser | null = null;

  private constructor() {
    // Check if admin is already logged in from localStorage
    const savedAdmin = localStorage.getItem('adminUser');
    if (savedAdmin) {
      try {
        this.currentAdmin = JSON.parse(savedAdmin);
      } catch (error) {
        console.error('Error parsing saved admin user:', error);
        localStorage.removeItem('adminUser');
      }
    }
  }

  static getInstance(): AdminAuthService {
    if (!AdminAuthService.instance) {
      AdminAuthService.instance = new AdminAuthService();
    }
    return AdminAuthService.instance;
  }

  async login(email: string, password: string): Promise<{ success: boolean; user?: AdminUser; error?: string }> {
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      const adminCredential = ADMIN_CREDENTIALS.find(
        cred => cred.email.toLowerCase() === email.toLowerCase() && cred.password === password
      );

      if (!adminCredential) {
        return {
          success: false,
          error: 'Invalid email or password'
        };
      }

      this.currentAdmin = adminCredential.user;
      localStorage.setItem('adminUser', JSON.stringify(adminCredential.user));

      return {
        success: true,
        user: adminCredential.user
      };
    } catch (error) {
      console.error('Admin login error:', error);
      return {
        success: false,
        error: 'An error occurred during login'
      };
    }
  }

  async logout(): Promise<void> {
    this.currentAdmin = null;
    localStorage.removeItem('adminUser');
  }

  getCurrentAdmin(): AdminUser | null {
    return this.currentAdmin;
  }

  isAuthenticated(): boolean {
    return this.currentAdmin !== null;
  }

  hasPermission(permission: string): boolean {
    if (!this.currentAdmin) return false;
    return this.currentAdmin.permissions.includes(permission);
  }

  // Method to add new admin credentials (for development)
  addAdminCredential(email: string, password: string, user: AdminUser): void {
    ADMIN_CREDENTIALS.push({ email, password, user });
  }
}

export const adminAuthService = AdminAuthService.getInstance();
