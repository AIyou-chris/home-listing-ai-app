import { auth, db, functions } from './firebase';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    updateProfile, 
    signOut as firebaseSignOut,
    User 
} from 'firebase/auth';
import { 
    doc, 
    getDoc, 
    setDoc, 
    updateDoc,
    collection,
    query,
    where,
    getDocs
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

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
    async signUp(email: string, password: string, fullName: string): Promise<{ user: User; agentProfile: AgentProfile }> {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            
            // Update display name
            await updateProfile(userCredential.user, {
                displayName: fullName,
            });

            // Create initial agent profile
            const agentProfile: AgentProfile = {
                id: userCredential.user.uid,
                name: fullName,
                email: email,
                isOnboardingComplete: false,
                subscriptionStatus: 'trial',
                trialEndDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
                features: {
                    aiChat: true,
                    fileUpload: true,
                    emailAutomation: true,
                    qrTracking: true,
                    analytics: true,
                    sequences: true
                },
                createdAt: new Date(),
                updatedAt: new Date()
            };

            await setDoc(doc(db, 'agents', userCredential.user.uid), agentProfile);

            return { user: userCredential.user, agentProfile };
        } catch (error) {
            console.error('Sign up error:', error);
            throw error;
        }
    }

    // Sign in existing user
    async signIn(email: string, password: string): Promise<{ user: User; agentProfile: AgentProfile }> {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            
            // Get or create agent profile
            const agentProfile = await this.getOrCreateAgentProfile(userCredential.user);
            
            return { user: userCredential.user, agentProfile };
        } catch (error) {
            console.error('Sign in error:', error);
            throw error;
        }
    }

    // Sign out
    async signOut(): Promise<void> {
        try {
            this.adminMode = false;
            await firebaseSignOut(auth);
        } catch (error) {
            console.error('Sign out error:', error);
            throw error;
        }
    }

    // Get or create agent profile
    private async getOrCreateAgentProfile(user: User): Promise<AgentProfile> {
        const agentDoc = await getDoc(doc(db, 'agents', user.uid));
        
        if (agentDoc.exists()) {
            const data = agentDoc.data();
            return {
                id: user.uid,
                ...data,
                createdAt: data.createdAt?.toDate() || new Date(),
                updatedAt: data.updatedAt?.toDate() || new Date(),
                trialEndDate: data.trialEndDate?.toDate()
            } as AgentProfile;
        } else {
            // Create agent profile for existing users
            const agentProfile: AgentProfile = {
                id: user.uid,
                name: user.displayName || 'New Agent',
                email: user.email || '',
                isOnboardingComplete: false,
                subscriptionStatus: 'trial',
                trialEndDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
                features: {
                    aiChat: true,
                    fileUpload: true,
                    emailAutomation: true,
                    qrTracking: true,
                    analytics: true,
                    sequences: true
                },
                createdAt: new Date(),
                updatedAt: new Date()
            };

            await setDoc(doc(db, 'agents', user.uid), agentProfile);
            return agentProfile;
        }
    }

    // Complete onboarding
    async completeOnboarding(agentId: string, onboardingData: Partial<AgentProfile>): Promise<void> {
        try {
            // Update agent profile
            await updateDoc(doc(db, 'agents', agentId), {
                ...onboardingData,
                isOnboardingComplete: true,
                updatedAt: new Date()
            });

            // Create AI personality
            const createPersonality = httpsCallable(functions, 'createAIPersonality');
            await createPersonality({
                agentId: agentId,
                personality: {
                    communicationStyle: onboardingData.communicationStyle,
                    tone: onboardingData.tone,
                    expertise: onboardingData.expertise,
                    specialties: onboardingData.specialties,
                    customPrompts: [
                        `You are a real estate agent with ${onboardingData.yearsExperience} years of experience.`,
                        `Your target markets are: ${onboardingData.targetMarkets?.join(', ')}`,
                        `Your average property price range is: ${onboardingData.averagePropertyPrice}`,
                        `Your bio: ${onboardingData.bio}`,
                        `Common questions you handle: ${onboardingData.commonQuestions?.join(', ')}`,
                        `Your unique selling points: ${onboardingData.uniqueSellingPoints?.join(', ')}`
                    ]
                }
            });
        } catch (error) {
            console.error('Complete onboarding error:', error);
            throw error;
        }
    }

    // Get current agent profile
    async getCurrentAgentProfile(): Promise<AgentProfile | null> {
        const user = auth.currentUser;
        if (!user) return null;

        try {
            const agentDoc = await getDoc(doc(db, 'agents', user.uid));
            if (agentDoc.exists()) {
                const data = agentDoc.data();
                return {
                    id: user.uid,
                    ...data,
                    createdAt: data.createdAt?.toDate() || new Date(),
                    updatedAt: data.updatedAt?.toDate() || new Date(),
                    trialEndDate: data.trialEndDate?.toDate()
                } as AgentProfile;
            }
            return null;
        } catch (error) {
            console.error('Get agent profile error:', error);
            return null;
        }
    }

    // Update agent profile
    async updateAgentProfile(updates: Partial<AgentProfile>): Promise<void> {
        const user = auth.currentUser;
        if (!user) throw new Error('No authenticated user');

        try {
            await updateDoc(doc(db, 'agents', user.uid), {
                ...updates,
                updatedAt: new Date()
            });
        } catch (error) {
            console.error('Update agent profile error:', error);
            throw error;
        }
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
    async verifyAdminPermissions(userId: string): Promise<boolean> {
        try {
            const adminDoc = await getDoc(doc(db, 'admins', userId));
            if (!adminDoc.exists()) return false;
            
            const adminData = adminDoc.data();
            return adminData.isActive === true;
        } catch (error) {
            console.error('Error verifying admin permissions:', error);
            return false;
        }
    }

    // Get admin user profile
    async getAdminUser(): Promise<AdminUser | null> {
        const user = auth.currentUser;
        if (!user) return null;

        try {
            const adminDoc = await getDoc(doc(db, 'admins', user.uid));
            if (!adminDoc.exists()) return null;

            const data = adminDoc.data();
            return {
                id: user.uid,
                email: user.email || '',
                name: data.name || user.displayName || 'Admin User',
                role: data.role || 'admin',
                permissions: {
                    userManagement: data.permissions?.userManagement || false,
                    systemSettings: data.permissions?.systemSettings || false,
                    analytics: data.permissions?.analytics || false,
                    contentModeration: data.permissions?.contentModeration || false,
                    billing: data.permissions?.billing || false,
                    security: data.permissions?.security || false,
                },
                isActive: data.isActive || false,
                lastLogin: data.lastLogin?.toDate(),
                createdAt: data.createdAt?.toDate() || new Date(),
                updatedAt: data.updatedAt?.toDate() || new Date()
            } as AdminUser;
        } catch (error) {
            console.error('Error getting admin user:', error);
            return null;
        }
    }

    // Switch to admin mode
    async switchToAdminMode(): Promise<void> {
        const user = auth.currentUser;
        if (!user) throw new Error('No authenticated user');

        try {
            // Verify admin permissions
            const isAdmin = await this.verifyAdminPermissions(user.uid);
            if (!isAdmin) {
                throw new Error('Insufficient permissions to access admin mode');
            }

            // Update last login
            await updateDoc(doc(db, 'admins', user.uid), {
                lastLogin: new Date()
            });

            // Enable admin mode
            this.adminMode = true;

            // Notify listeners of state change
            const agentProfile = await this.getOrCreateAgentProfile(user);
            const adminUser = await this.getAdminUser();
            
            const authState: AuthState = {
                user,
                agentProfile,
                adminUser,
                isLoading: false,
                isOnboardingComplete: agentProfile.isOnboardingComplete,
                isTrialActive: this.isTrialActive(agentProfile),
                isAdmin: true
            };
            this.notifyListeners(authState);

        } catch (error) {
            console.error('Error switching to admin mode:', error);
            throw error;
        }
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
    async getAllAdminUsers(): Promise<AdminUser[]> {
        const hasPermission = await this.hasAdminPermission('userManagement');
        if (!hasPermission) {
            throw new Error('Insufficient permissions to view admin users');
        }

        try {
            const adminQuery = query(collection(db, 'admins'));
            const adminSnapshot = await getDocs(adminQuery);
            
            return adminSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    email: data.email || '',
                    name: data.name || 'Admin User',
                    role: data.role || 'admin',
                    permissions: {
                        userManagement: data.permissions?.userManagement || false,
                        systemSettings: data.permissions?.systemSettings || false,
                        analytics: data.permissions?.analytics || false,
                        contentModeration: data.permissions?.contentModeration || false,
                        billing: data.permissions?.billing || false,
                        security: data.permissions?.security || false,
                    },
                    isActive: data.isActive || false,
                    lastLogin: data.lastLogin?.toDate(),
                    createdAt: data.createdAt?.toDate() || new Date(),
                    updatedAt: data.updatedAt?.toDate() || new Date()
                } as AdminUser;
            });
        } catch (error) {
            console.error('Error getting all admin users:', error);
            throw error;
        }
    }

    // Create new admin user (super admin only)
    async createAdminUser(adminData: {
        email: string;
        name: string;
        role: AdminUser['role'];
        permissions: AdminUser['permissions'];
    }): Promise<void> {
        const hasPermission = await this.hasAdminPermission('userManagement');
        if (!hasPermission) {
            throw new Error('Insufficient permissions to create admin users');
        }

        try {
            // Check if admin already exists
            const adminQuery = query(collection(db, 'admins'), where('email', '==', adminData.email));
            const adminSnapshot = await getDocs(adminQuery);
            
            if (!adminSnapshot.empty) {
                throw new Error('Admin user with this email already exists');
            }

            // Create admin user document
            const adminUser: Omit<AdminUser, 'id'> = {
                email: adminData.email,
                name: adminData.name,
                role: adminData.role,
                permissions: adminData.permissions,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            // Generate a temporary ID for the document
            const tempId = `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            await setDoc(doc(db, 'admins', tempId), adminUser);

        } catch (error) {
            console.error('Error creating admin user:', error);
            throw error;
        }
    }

    // Update admin user permissions (super admin only)
    async updateAdminUser(adminId: string, updates: Partial<AdminUser>): Promise<void> {
        const hasPermission = await this.hasAdminPermission('userManagement');
        if (!hasPermission) {
            throw new Error('Insufficient permissions to update admin users');
        }

        try {
            await updateDoc(doc(db, 'admins', adminId), {
                ...updates,
                updatedAt: new Date()
            });
        } catch (error) {
            console.error('Error updating admin user:', error);
            throw error;
        }
    }

    // Deactivate admin user (super admin only)
    async deactivateAdminUser(adminId: string): Promise<void> {
        const hasPermission = await this.hasAdminPermission('userManagement');
        if (!hasPermission) {
            throw new Error('Insufficient permissions to deactivate admin users');
        }

        try {
            await updateDoc(doc(db, 'admins', adminId), {
                isActive: false,
                updatedAt: new Date()
            });
        } catch (error) {
            console.error('Error deactivating admin user:', error);
            throw error;
        }
    }

    // Get current user's auth token
    async getAuthToken(): Promise<string | null> {
        const user = auth.currentUser;
        if (!user) return null;

        try {
            return await user.getIdToken();
        } catch (error) {
            console.error('Error getting auth token:', error);
            return null;
        }
    }

    // Make authenticated API request
    async makeAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
        const isLocalApi = url.startsWith('http://localhost:5001/') || url.startsWith('http://127.0.0.1:5001/');
        const token = await this.getAuthToken();
        if (!token && !isLocalApi) {
            throw new Error('No authentication token available');
        }

        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...options.headers
        } as Record<string, string>;

        return fetch(url, {
            ...options,
            headers
        });
    }
}

export const authService = AuthService.getInstance();
