import { supabase } from './supabase';

export interface AdminUser {
  email: string;
  name: string;
  role: 'admin' | 'super-admin';
  permissions: string[];
}

class AdminAuthService {
  private static instance: AdminAuthService;
  private currentAdmin: AdminUser | null = null;

  private constructor() {
    // Check if session exists
    this.recoverSession();
  }

  static getInstance(): AdminAuthService {
    if (!AdminAuthService.instance) {
      AdminAuthService.instance = new AdminAuthService();
    }
    return AdminAuthService.instance;
  }

  private async recoverSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      // Check if user has admin role via RPC
      const { data: isAdmin } = await supabase.rpc('is_user_admin', { uid: session.user.id });

      if (isAdmin) {
        this.currentAdmin = {
          email: session.user.email || '',
          name: session.user.user_metadata?.full_name || 'Admin User',
          role: 'super-admin', // Temporary: assume all logged-in users are super-admins for now
          permissions: ['users', 'billing', 'analytics', 'system', 'support']
        };
      } else {
        // If session exists but not admin, clear it from this service's perspective
        this.currentAdmin = null;
      }
    }
  }

  async login(email: string, password: string): Promise<{ success: boolean; user?: AdminUser; error?: string }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      });

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      if (data.user) {
        // Check if user has admin role via RPC
        const { data: isAdmin, error: rpcError } = await supabase.rpc('is_user_admin', { uid: data.user.id });

        if (rpcError || !isAdmin) {
          console.warn('Login successful but user is not an admin', rpcError);
          await supabase.auth.signOut();
          return {
            success: false,
            error: 'Unauthorized: You do not have admin privileges.'
          };
        }

        this.currentAdmin = {
          email: data.user.email || '',
          name: data.user.user_metadata?.full_name || 'Admin User',
          role: 'super-admin',
          permissions: ['users', 'billing', 'analytics', 'system', 'support']
        };

        return {
          success: true,
          user: this.currentAdmin
        };
      }

      return {
        success: false,
        error: 'Login failed'
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
    try {
      // 1. Remove lock FIRST so listeners know we are intentionally logging out
      localStorage.removeItem('adminUser');
      this.currentAdmin = null;

      // 2. Then trigger the auth event
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // 3. Force navigation to signin to ensure fresh state
      window.location.href = '/signin';
    }
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
}

export const adminAuthService = AdminAuthService.getInstance();
