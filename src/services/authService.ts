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

export interface AuthState {
    user: User | null;
    agentProfile: AgentProfile | null;
    isLoading: boolean;
    isOnboardingComplete: boolean;
    isTrialActive: boolean;
}

export class AuthService {
    private static instance: AuthService;
    private authStateListeners: ((state: AuthState) => void)[] = [];

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
                    const authState: AuthState = {
                        user,
                        agentProfile,
                        isLoading: false,
                        isOnboardingComplete: agentProfile.isOnboardingComplete,
                        isTrialActive: this.isTrialActive(agentProfile)
                    };
                    this.notifyListeners(authState);
                } catch (error) {
                    console.error('Error getting agent profile:', error);
                    const authState: AuthState = {
                        user,
                        agentProfile: null,
                        isLoading: false,
                        isOnboardingComplete: false,
                        isTrialActive: false
                    };
                    this.notifyListeners(authState);
                }
            } else {
                const authState: AuthState = {
                    user: null,
                    agentProfile: null,
                    isLoading: false,
                    isOnboardingComplete: false,
                    isTrialActive: false
                };
                this.notifyListeners(authState);
            }
        });
    }
}

export const authService = AuthService.getInstance();
