// Firebase removed. Provide lightweight local auth stubs to keep UI working.
type User = { uid: string; email?: string; displayName?: string; getIdToken?: () => Promise<string> };

type AuthStateChangeCallback = (user: User | null) => void;

const auth = {
    currentUser: null as User | null,
    onAuthStateChanged: (callback: AuthStateChangeCallback): (() => void) => {
        callback(auth.currentUser);
        return () => {};
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

export class AuthService {
    private static instance: AuthService;
    private authStateListeners: ((state: AuthState) => void)[] = [];
    private adminMode: boolean = false;

    private constructor() {}

    static getInstance(): AuthService {
        if (!AuthService.instance) {
            AuthService.instance = new AuthService();
        }
        return AuthService.instance;
    }

    // Sign up new user
    async signUp(email: string, _password: string, fullName: string): Promise<{ user: User; agentProfile: AgentProfile }> {
        const user = { uid: `local_${Date.now()}`, email, displayName: fullName };
        auth.currentUser = user;
        const agentProfile: AgentProfile = {
            id: user.uid,
            name: fullName,
            email,
            isOnboardingComplete: false,
            subscriptionStatus: 'trial',
            trialEndDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            features: { aiChat: true, fileUpload: true, emailAutomation: true, qrTracking: true, analytics: true, sequences: true },
            createdAt: new Date(),
            updatedAt: new Date()
        };
        return { user, agentProfile };
    }

    // Sign in existing user
    async signIn(email: string, _password: string): Promise<{ user: User; agentProfile: AgentProfile }> {
        const user = { uid: `local_${Date.now()}`, email, displayName: email.split('@')[0] };
        auth.currentUser = user;
        const agentProfile = await this.getOrCreateAgentProfile(user);
        return { user, agentProfile };
    }

    // Sign out
    async signOut(): Promise<void> { this.adminMode = false; auth.currentUser = null; }

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
        const user = auth.currentUser;
        if (!user) return null;

        if (typeof user.getIdToken === 'function') {
            try {
                return await user.getIdToken();
            } catch (error) {
                console.error('Error getting auth token:', error);
                return null;
            }
        }

        return 'dev-token';
    }

    // Make authenticated API request
    async makeAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
        const isLocalApi = url.startsWith('http://localhost:5001/') || url.startsWith('http://127.0.0.1:5001/');
        const token = await this.getAuthToken();
        if (!token && !isLocalApi) {
            throw new Error('No authentication token available');
        }

        const headers = new Headers(options.headers);
        headers.set('Content-Type', 'application/json');
        if (token) {
            headers.set('Authorization', `Bearer ${token}`);
        }

        return fetch(url, {
            ...options,
            headers
        });
    }
}

export const authService = AuthService.getInstance();
