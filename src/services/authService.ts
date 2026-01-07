import { supabase } from './supabase';

// Firebase removed. Provide lightweight local auth stubs to keep UI working.
type User = { uid: string; email?: string; displayName?: string; getIdToken?: () => Promise<string> };

type AuthStateChangeCallback = (user: User | null) => void;

const auth = {
    currentUser: null as User | null,
    onAuthStateChanged: (callback: AuthStateChangeCallback): (() => void) => {
        callback(auth.currentUser);
        return () => { };
    }
};

export interface AgentProfile {
    id: string;
    name: string;
    email: string;
    company?: string;
    phone?: string;
    website?: string;
    yearsExperience?: number;
    targetMarkets?: string[];
    averagePropertyPrice?: string;
    bio?: string;
    communicationStyle?: 'professional' | 'friendly' | 'casual' | 'formal';
    tone?: 'enthusiastic' | 'calm' | 'confident' | 'helpful';
    expertise?: string;
    specialties?: string[];
    commonQuestions?: string[];
    uniqueSellingPoints?: string[];
    isOnboardingComplete: boolean;
    subscriptionStatus: 'trial' | 'active' | 'expired' | 'cancelled';
    trialEndDate?: Date;
    features: {
        aiChat: boolean;
        fileUpload: boolean;
        emailAutomation: boolean;
        qrTracking: boolean;
        analytics: boolean;
        sequences: boolean;
    };
    createdAt: Date;
    updatedAt: Date;
}

export interface AdminUser {
    id: string;
    email: string;
    name: string;
    role: 'super_admin' | 'admin' | 'moderator';
    permissions: {
        userManagement: boolean;
        systemSettings: boolean;
        analytics: boolean;
        contentModeration: boolean;
        billing: boolean;
        security: boolean;
    };
    isActive: boolean;
    lastLogin?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface AuthState {
    user: User | null;
    agentProfile: AgentProfile | null;
    adminUser: AdminUser | null;
    isLoading: boolean;
    isOnboardingComplete: boolean;
    isTrialActive: boolean;
    isAdmin: boolean;
}

const getApiBaseUrl = (): string | null => {
    // FORCE LOCALHOST IN DEV (Because .env points to production)
    if (import.meta.env.DEV) {
        return 'http://localhost:3002';
    }

    const raw = (import.meta as unknown as { env?: Record<string, unknown> })?.env?.VITE_API_BASE_URL
    if (typeof raw !== 'string') {
        return null
    }

    const trimmed = raw.trim()
    if (!trimmed) {
        return null
    }

    return trimmed.replace(/\/+$/, '')
}

const API_BASE_URL = getApiBaseUrl()

const isAbsoluteUrl = (url: string) => /^https?:\/\//i.test(url)

const resolveApiUrl = (input: string): string => {
    if (!input) {
        return input
    }

    if (isAbsoluteUrl(input)) {
        return input
    }

    const sanitizedPath = input.startsWith('/') ? input.slice(1) : input
    if (API_BASE_URL) {
        return `${API_BASE_URL}/${sanitizedPath}`
    }

    return input.startsWith('/') ? input : `/${sanitizedPath}`
}

export class AuthService {
    private static instance: AuthService;
    private authStateListeners: ((state: AuthState) => void)[] = [];
    private adminMode: boolean = false;

    private constructor() { }

    static getInstance(): AuthService {
        if (!AuthService.instance) {
            AuthService.instance = new AuthService();
        }
        return AuthService.instance;
    }

    // Sign up new user
    async signUp(email: string, password: string, fullName: string): Promise<{ user: User; agentProfile: AgentProfile }> {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName } }
        });
        if (error) throw error;
        if (!data.user) throw new Error('Signup failed');

        const user = { uid: data.user.id, email: data.user.email, displayName: fullName };
        auth.currentUser = user;
        const agentProfile = await this.getOrCreateAgentProfile(user);
        return { user, agentProfile };
    }

    // Sign in existing user
    async signIn(email: string, password: string): Promise<{ user: User; agentProfile: AgentProfile }> {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (!data.user) throw new Error('Login failed');

        const user = { uid: data.user.id, email: data.user.email, displayName: data.user.user_metadata?.full_name || email.split('@')[0] };
        auth.currentUser = user;
        const agentProfile = await this.getOrCreateAgentProfile(user);
        return { user, agentProfile };
    }

    // Sign out
    async signOut(): Promise<void> {
        this.adminMode = false;
        auth.currentUser = null;
        await supabase.auth.signOut();
    }

    // Get or create agent profile
    private async getOrCreateAgentProfile(user: User): Promise<AgentProfile> {
        // Local profile only
        return {
            id: user.uid,
            name: user.displayName || 'New Agent',
            email: user.email || '',
            isOnboardingComplete: false,
            subscriptionStatus: 'trial',
            trialEndDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            features: { aiChat: true, fileUpload: true, emailAutomation: true, qrTracking: true, analytics: true, sequences: true },
            createdAt: new Date(),
            updatedAt: new Date()
        };
    }

    // Complete onboarding
    async completeOnboarding(agentId: string, onboardingData: Partial<AgentProfile>): Promise<void> {
        const key = `hlai_agent_${agentId}`;
        const raw = localStorage.getItem(key);
        const prev = raw ? (JSON.parse(raw) as Partial<AgentProfile>) : {};

        const defaultFeatures = prev.features || { aiChat: true, fileUpload: true, emailAutomation: true, qrTracking: true, analytics: true, sequences: true };
        const updatedFeatures = onboardingData.features
            ? { ...defaultFeatures, ...onboardingData.features }
            : defaultFeatures;

        const createdAt = prev.createdAt ? new Date(prev.createdAt as unknown as string) : new Date();
        const trialEndDate = onboardingData.trialEndDate
            ? onboardingData.trialEndDate
            : prev.trialEndDate
                ? new Date(prev.trialEndDate as unknown as string)
                : undefined;

        const updated: AgentProfile = {
            id: agentId,
            name: onboardingData.name || prev.name || 'Agent',
            email: onboardingData.email || prev.email || '',
            isOnboardingComplete: true,
            subscriptionStatus: onboardingData.subscriptionStatus || prev.subscriptionStatus || 'trial',
            features: updatedFeatures,
            createdAt,
            updatedAt: new Date(),
            trialEndDate,
            targetMarkets: prev.targetMarkets,
            averagePropertyPrice: prev.averagePropertyPrice,
            bio: prev.bio,
            communicationStyle: prev.communicationStyle,
            tone: prev.tone,
            expertise: prev.expertise,
            specialties: prev.specialties,
            commonQuestions: prev.commonQuestions,
            uniqueSellingPoints: prev.uniqueSellingPoints,
            company: prev.company,
            phone: prev.phone,
            website: prev.website,
            yearsExperience: prev.yearsExperience,
            ...onboardingData
        };

        localStorage.setItem(key, JSON.stringify(updated));
    }

    // Get current agent profile
    async getCurrentAgentProfile(): Promise<AgentProfile | null> {
        const user = auth.currentUser;
        if (!user) return null;

        const key = `hlai_agent_${user.uid}`;
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const data = JSON.parse(raw) as Partial<AgentProfile> & { trialEndDate?: string };

        return {
            ...data,
            id: data.id || user.uid,
            name: data.name || user.displayName || 'Agent',
            email: data.email || user.email || '',
            createdAt: data.createdAt ? new Date(data.createdAt as unknown as string) : new Date(),
            updatedAt: data.updatedAt ? new Date(data.updatedAt as unknown as string) : new Date(),
            trialEndDate: data.trialEndDate ? new Date(data.trialEndDate as unknown as string) : undefined,
            features: data.features || { aiChat: true, fileUpload: true, emailAutomation: true, qrTracking: true, analytics: true, sequences: true },
            subscriptionStatus: data.subscriptionStatus || 'trial',
            isOnboardingComplete: data.isOnboardingComplete ?? false
        };
    }

    // Update agent profile
    async updateAgentProfile(updates: Partial<AgentProfile>): Promise<void> {
        const user = auth.currentUser;
        if (!user) throw new Error('No authenticated user');

        const key = `hlai_agent_${user.uid}`;
        const raw = localStorage.getItem(key);
        const prev = raw ? (JSON.parse(raw) as AgentProfile) : await this.getOrCreateAgentProfile(user);
        const next: AgentProfile = {
            ...prev,
            ...updates,
            features: updates.features ? { ...prev.features, ...updates.features } : prev.features,
            updatedAt: new Date()
        };
        localStorage.setItem(key, JSON.stringify(next));
    }

    // Check if trial is active
    isTrialActive(agentProfile: AgentProfile): boolean {
        if (agentProfile.subscriptionStatus !== 'trial') return false;
        if (!agentProfile.trialEndDate) return false;
        return new Date() < agentProfile.trialEndDate;
    }

    // Get trial days remaining
    getTrialDaysRemaining(agentProfile: AgentProfile): number {
        if (!this.isTrialActive(agentProfile) || !agentProfile.trialEndDate) return 0;
        const now = new Date();
        const trialEnd = agentProfile.trialEndDate;
        const diffTime = trialEnd.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return Math.max(0, diffDays);
    }

    // Check if feature is available
    isFeatureAvailable(agentProfile: AgentProfile, feature: keyof AgentProfile['features']): boolean {
        if (this.isTrialActive(agentProfile)) {
            return agentProfile.features[feature];
        }
        return agentProfile.subscriptionStatus === 'active' && agentProfile.features[feature];
    }

    // Add auth state listener
    addAuthStateListener(listener: (state: AuthState) => void): () => void {
        this.authStateListeners.push(listener);

        // Return unsubscribe function
        return () => {
            const index = this.authStateListeners.indexOf(listener);
            if (index > -1) {
                this.authStateListeners.splice(index, 1);
            }
        };
    }

    // Notify listeners of auth state change
    private notifyListeners(state: AuthState): void {
        this.authStateListeners.forEach(listener => listener(state));
    }

    // Initialize auth state monitoring
    initializeAuthStateMonitoring(): void {
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                try {
                    const agentProfile = await this.getOrCreateAgentProfile(user);
                    const adminUser = this.adminMode ? await this.getAdminUser() : null;

                    const authState: AuthState = {
                        user,
                        agentProfile,
                        adminUser,
                        isLoading: false,
                        isOnboardingComplete: agentProfile.isOnboardingComplete,
                        isTrialActive: this.isTrialActive(agentProfile),
                        isAdmin: this.adminMode && adminUser !== null
                    };
                    this.notifyListeners(authState);
                } catch (error) {
                    console.error('Error getting agent profile:', error);
                    const authState: AuthState = {
                        user,
                        agentProfile: null,
                        adminUser: null,
                        isLoading: false,
                        isOnboardingComplete: false,
                        isTrialActive: false,
                        isAdmin: false
                    };
                    this.notifyListeners(authState);
                }
            } else {
                const authState: AuthState = {
                    user: null,
                    agentProfile: null,
                    adminUser: null,
                    isLoading: false,
                    isOnboardingComplete: false,
                    isTrialActive: false,
                    isAdmin: false
                };
                this.notifyListeners(authState);
            }
        });

        // Sync Supabase Session on Load
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                const user = { uid: session.user.id, email: session.user.email, displayName: session.user.user_metadata?.full_name };
                auth.currentUser = user;
                this.notifyListeners({
                    user,
                    agentProfile: null, // will load async?
                    adminUser: null,
                    isLoading: false,
                    isOnboardingComplete: false,
                    isTrialActive: false,
                    isAdmin: false
                });
                // We should technically call getOrCreateAgentProfile here but this is a stub recovery.
            }
        });
    }

    // ===== ADMIN-SPECIFIC METHODS =====

    // Verify admin permissions for a user
    async verifyAdminPermissions(_userId: string): Promise<boolean> { return false }

    // Get admin user profile
    async getAdminUser(): Promise<AdminUser | null> {
        const user = auth.currentUser;
        if (!user) return null;

        return null
    }

    // Switch to admin mode
    async switchToAdminMode(): Promise<void> {
        const user = auth.currentUser;
        if (!user) throw new Error('No authenticated user');

        // Simulate admin mode disabled by default
        this.adminMode = false
    }

    // Switch back to regular mode
    switchToRegularMode(): void {
        this.adminMode = false;

        const user = auth.currentUser;
        if (user) {
            // Notify listeners of state change
            this.getOrCreateAgentProfile(user).then(agentProfile => {
                const authState: AuthState = {
                    user,
                    agentProfile,
                    adminUser: null,
                    isLoading: false,
                    isOnboardingComplete: agentProfile.isOnboardingComplete,
                    isTrialActive: this.isTrialActive(agentProfile),
                    isAdmin: false
                };
                this.notifyListeners(authState);
            });
        }
    }

    // Check if user is in admin mode
    isInAdminMode(): boolean {
        return this.adminMode;
    }

    // Check if user has specific admin permission
    async hasAdminPermission(permission: keyof AdminUser['permissions']): Promise<boolean> {
        if (!this.adminMode) return false;

        const adminUser = await this.getAdminUser();
        if (!adminUser) return false;

        return adminUser.permissions[permission] || false;
    }

    // Get all admin users (super admin only)
    async getAllAdminUsers(): Promise<AdminUser[]> { return [] }

    // Create new admin user (super admin only)
    async createAdminUser(_adminData: {
        email: string;
        name: string;
        role: AdminUser['role'];
        permissions: AdminUser['permissions'];
    }): Promise<void> {
        const hasPermission = await this.hasAdminPermission('userManagement');
        if (!hasPermission) {
            throw new Error('Insufficient permissions to create admin users');
        }

        // No-op in local mode
        return;
    }

    // Update admin user permissions (super admin only)
    async updateAdminUser(_adminId: string, _updates: Partial<AdminUser>): Promise<void> {
        const hasPermission = await this.hasAdminPermission('userManagement');
        if (!hasPermission) {
            throw new Error('Insufficient permissions to update admin users');
        }

        return;
    }

    // Deactivate admin user (super admin only)
    async deactivateAdminUser(_adminId: string): Promise<void> {
        const hasPermission = await this.hasAdminPermission('userManagement');
        if (!hasPermission) {
            throw new Error('Insufficient permissions to deactivate admin users');
        }

        return;
    }

    // Get current user's auth token
    async getAuthToken(): Promise<string | null> {
        const { data } = await supabase.auth.getSession();
        return data.session?.access_token || null;
    }

    // Make authenticated API request
    async makeAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
        const resolvedUrl = resolveApiUrl(url)
        console.log('[AuthDebug] makeAuthenticatedRequest started for:', resolvedUrl);

        // Helper to timeout promises
        const withTimeout = <T>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
            return Promise.race([
                promise,
                new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timeout: ${label}`)), ms))
            ]);
        };

        try {
            const isLocalApi = resolvedUrl.includes('http://localhost:5001/') || resolvedUrl.includes('http://127.0.0.1:5001/') || resolvedUrl.startsWith('/')

            console.log('[AuthDebug] Getting Supabase Session (Token + ID)...');

            // STRATEGY: Try getSession (Local) first. If it hangs/fails, try getUser (Network).
            let token: string | undefined;
            let userId: string | undefined;

            // OPTIMISTIC BYPASS: Try to get token from LocalStorage DIRECTLY
            // This avoids the 'getSession' lock/timeout issues entirely.
            try {
                // Find any key that looks like a Supabase auth token
                const sbKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
                if (sbKey) {
                    const raw = localStorage.getItem(sbKey);
                    if (raw) {
                        const parsed = JSON.parse(raw);
                        token = parsed.access_token;
                        userId = parsed.user?.id;
                        console.log('[AuthDebug] ⚡️ Optimistic Token Found in LocalStorage');
                    }
                }
            } catch (e) {
                console.warn('[AuthDebug] Failed to parse local storage token', e);
            }

            if (!token) {
                try {
                    // Increased timeout to 30s (was 10s) for slow devices/network
                    const { data } = await withTimeout(supabase.auth.getSession(), 30000, 'Obtain Session');
                    token = data.session?.access_token;
                    userId = data.session?.user?.id;
                } catch (err) {
                    // Fall through to fallback below
                    console.warn('[AuthDebug] getSession timed out or failed. Trying getUser as fallback...', err);
                }
            }

            // Fallback: getUser (verifies with server, might bypass local storage lock) - 30s timeout
            // (Empty fallback block removed)

            // Fallback: getUser (verifies with server) ONLY if we still don't have a token/user
            if (!token && !userId) {
                try {
                    const { data: userData } = await withTimeout(supabase.auth.getUser(), 30000, 'Obtain User (Fallback)');
                    userId = userData.user?.id;

                    // If we have a user but no session token, we might have trouble with Bearer auth, 
                    // but at least we have the ID for x-user-id.
                    if (!token) {
                        // Last ditch effort for token, but don't block if it fails
                        const { data: sessionData } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
                        token = sessionData.session?.access_token;
                    }
                } catch (fallbackErr) {
                    // If we already have a token (optimistic), we don't care about this error.
                    if (!token) {
                        console.error('[AuthDebug] CRITICAL: Both session and user retrieval failed/timed out.', fallbackErr);
                        throw new Error('Unable to verify login session. Please check your internet connection.');
                    }
                }
            }

            console.log('[AuthDebug] Auth Resolved. HasToken:', !!token, 'HasID:', !!userId);

            if (!token && !isLocalApi) {
                console.warn('AuthService: proceeding without auth token for', resolvedUrl);
            }

            const headers = new Headers(options.headers);
            headers.set('Content-Type', 'application/json');

            if (token) {
                headers.set('Authorization', `Bearer ${token}`);
            }

            if (userId) {
                headers.set('x-user-id', userId);
            }

            console.log('[AuthDebug] Executing fetch...');
            const response = await withTimeout(fetch(resolvedUrl, {
                ...options,
                headers
            }), 15000, 'API Network Request');

            console.log('[AuthDebug] Fetch completed, Status:', response.status);
            return response;

        } catch (error) {
            console.error('[AuthDebug] Request FAILED:', error);
            throw error;
        }
    }



}

export const authService = AuthService.getInstance();
