// Email authentication service for managing email provider connections
import { googleOAuthService } from './googleOAuthService';

export interface EmailConnection {
    provider: 'gmail' | 'outlook';
    email: string;
    connectedAt: string;
    status: 'active' | 'expired' | 'error';
    dailyLimit?: number;
    dailySent?: number;
    accessToken?: string;
}

class EmailAuthService {
    private static instance: EmailAuthService;
    private connections: EmailConnection[] = [];
    private readonly STORAGE_KEY = 'email_connections';

    private constructor() {
        this.loadConnections();
    }

    static getInstance(): EmailAuthService {
        if (!EmailAuthService.instance) {
            EmailAuthService.instance = new EmailAuthService();
        }
        return EmailAuthService.instance;
    }

    private loadConnections(): void {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                this.connections = JSON.parse(stored);
            }

            // Also check for Gmail connection from googleOAuthService
            const gmailConnection = this.getGmailConnectionFromStorage();
            if (gmailConnection && !this.connections.find(c => c.provider === 'gmail')) {
                this.connections.push(gmailConnection);
                this.saveConnections();
            }
        } catch (error) {
            console.error('Error loading email connections:', error);
            this.connections = [];
        }
    }

    private getGmailConnectionFromStorage(): EmailConnection | null {
        try {
            const stored = localStorage.getItem('gmail_connection');
            if (stored) {
                const gmailData = JSON.parse(stored);
                return {
                    provider: 'gmail',
                    email: gmailData.email || 'Gmail Account',
                    connectedAt: gmailData.connectedAt || new Date().toISOString(),
                    status: gmailData.accessToken ? 'active' : 'expired',
                    dailyLimit: gmailData.dailyLimit || 2000,
                    dailySent: gmailData.dailySent || 0,
                    accessToken: gmailData.accessToken
                };
            }
        } catch (error) {
            console.error('Error getting Gmail connection:', error);
        }
        return null;
    }

    private saveConnections(): void {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.connections));
        } catch (error) {
            console.error('Error saving email connections:', error);
        }
    }

    getConnections(): EmailConnection[] {
        // Refresh Gmail connection status
        const gmailConnection = this.getGmailConnectionFromStorage();
        if (gmailConnection) {
            const existingIndex = this.connections.findIndex(c => c.provider === 'gmail');
            if (existingIndex >= 0) {
                this.connections[existingIndex] = gmailConnection;
            } else {
                this.connections.push(gmailConnection);
            }
        }

        return [...this.connections];
    }

    async connectGmail(): Promise<EmailConnection> {
        try {
            // Get userId from context (you'll need to pass this in)
            const userId = this.getUserId();

            // Use the existing Google OAuth service with gmail.send scope
            const result = await googleOAuthService.authenticate([
                'https://www.googleapis.com/auth/gmail.send',
                'https://www.googleapis.com/auth/gmail.readonly'
            ], { context: 'gmail' });

            if (!result.success || !result.accessToken) {
                throw new Error('Gmail authentication failed');
            }

            // Get user's email
            const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: {
                    'Authorization': `Bearer ${result.accessToken}`
                }
            });

            const userInfo = await userInfoResponse.json();

            // Create tokens object for storage
            const tokens = {
                access_token: result.accessToken,
                refresh_token: null,
                expiry_date: Date.now() + 3600000,
                scope: 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly',
                token_type: 'Bearer'
            };

            // Store connection in backend (Skip for default/demo user)
            if (userId !== 'default') {
                const response = await fetch('/api/gmail/oauth/store', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        userId,
                        email: userInfo.email,
                        tokens
                    })
                });

                const data = await response.json();

                if (!response.ok || !data.success) {
                    throw new Error(data.error || 'Failed to store Gmail connection');
                }
            } else {
                console.log('Skipping backend storage for default/demo user - using local persistence only');
            }

            const connection: EmailConnection = {
                provider: 'gmail',
                email: userInfo.email || 'Gmail Account',
                connectedAt: new Date().toISOString(),
                status: 'active',
                dailyLimit: 2000,
                dailySent: 0,
                accessToken: result.accessToken
            };

            // Update connections list
            this.connections = this.connections.filter(c => c.provider !== 'gmail');
            this.connections.push(connection);
            this.saveConnections();

            return connection;
        } catch (error) {
            console.error('Error connecting Gmail:', error);
            throw error;
        }
    }

    private async getUserId(): Promise<string> {
        try {
            const mod = await import('./supabase');
            const { data } = await mod.supabase.auth.getUser();
            return data.user?.id || 'default';
        } catch (e) {
            console.warn('Could not get user from Supabase, using default');
            return 'default';
        }
    }

    async connectOutlook(): Promise<EmailConnection> {
        try {
            // Outlook OAuth implementation would go here
            // For now, show a placeholder message
            alert('Outlook integration coming soon! Currently, only Gmail is supported.');

            throw new Error('Outlook integration not yet implemented');

            // When implemented, it would look like:
            /*
            const connection: EmailConnection = {
                provider: 'outlook',
                email: 'user@outlook.com',
                connectedAt: new Date().toISOString(),
                status: 'active',
                dailyLimit: 10000,
                dailySent: 0
            };

            this.connections = this.connections.filter(c => c.provider !== 'outlook');
            this.connections.push(connection);
            this.saveConnections();

            return connection;
            */
        } catch (error) {
            console.error('Error connecting Outlook:', error);
            throw error;
        }
    }

    async disconnect(provider: 'gmail' | 'outlook'): Promise<void> {
        try {
            this.connections = this.connections.filter(c => c.provider !== provider);
            this.saveConnections();

            // Also clear provider-specific storage
            if (provider === 'gmail') {
                localStorage.removeItem('gmail_connection');
                // Optionally revoke the token
                // await googleOAuthService.revoke();
            }

            console.log(`Disconnected ${provider}`);
        } catch (error) {
            console.error(`Error disconnecting ${provider}:`, error);
            throw error;
        }
    }

    async refreshConnection(provider: 'gmail' | 'outlook'): Promise<EmailConnection> {
        const connection = this.connections.find(c => c.provider === provider);
        if (!connection) {
            throw new Error(`No connection found for ${provider}`);
        }

        if (provider === 'gmail') {
            return await this.connectGmail();
        } else {
            return await this.connectOutlook();
        }
    }

    isConnected(provider: 'gmail' | 'outlook'): boolean {
        const connection = this.connections.find(c => c.provider === provider);
        return connection !== undefined && connection.status === 'active';
    }

    getConnection(provider: 'gmail' | 'outlook'): EmailConnection | undefined {
        return this.connections.find(c => c.provider === provider);
    }
}

export const emailAuthService = EmailAuthService.getInstance();
export default emailAuthService;