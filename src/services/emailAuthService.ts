// Simple Email Authentication Service
// Handles Gmail and Outlook OAuth connections

export interface EmailConnection {
    provider: 'gmail' | 'outlook';
    email: string;
    name: string;
    accessToken?: string;
    refreshToken?: string;
    isConnected: boolean;
    connectedAt: string;
}

class EmailAuthService {
    private connections: Map<string, EmailConnection> = new Map();

    // Gmail OAuth Connection
    async connectGmail(): Promise<EmailConnection> {
        try {
            // In a real app, this would use Google OAuth2
            // For now, simulate the OAuth flow
            
            const mockGmailUser = {
                email: 'agent@gmail.com',
                name: 'Real Estate Agent',
                accessToken: 'mock_access_token_gmail',
                refreshToken: 'mock_refresh_token_gmail'
            };

            const connection: EmailConnection = {
                provider: 'gmail',
                email: mockGmailUser.email,
                name: mockGmailUser.name,
                accessToken: mockGmailUser.accessToken,
                refreshToken: mockGmailUser.refreshToken,
                isConnected: true,
                connectedAt: new Date().toISOString()
            };

            // Store connection
            this.connections.set('gmail', connection);
            localStorage.setItem('gmail_connection', JSON.stringify(connection));

            return connection;

        } catch (error) {
            console.error('Gmail connection failed:', error);
            throw new Error('Failed to connect Gmail account');
        }
    }

    // Outlook OAuth Connection  
    async connectOutlook(): Promise<EmailConnection> {
        try {
            // In a real app, this would use Microsoft OAuth2
            // For now, simulate the OAuth flow
            
            const mockOutlookUser = {
                email: 'agent@outlook.com',
                name: 'Real Estate Agent',
                accessToken: 'mock_access_token_outlook',
                refreshToken: 'mock_refresh_token_outlook'
            };

            const connection: EmailConnection = {
                provider: 'outlook',
                email: mockOutlookUser.email,
                name: mockOutlookUser.name,
                accessToken: mockOutlookUser.accessToken,
                refreshToken: mockOutlookUser.refreshToken,
                isConnected: true,
                connectedAt: new Date().toISOString()
            };

            // Store connection
            this.connections.set('outlook', connection);
            localStorage.setItem('outlook_connection', JSON.stringify(connection));

            return connection;

        } catch (error) {
            console.error('Outlook connection failed:', error);
            throw new Error('Failed to connect Outlook account');
        }
    }

    // Get stored connections
    getConnections(): EmailConnection[] {
        const connections: EmailConnection[] = [];
        
        // Load from localStorage
        const gmailConnection = localStorage.getItem('gmail_connection');
        if (gmailConnection) {
            connections.push(JSON.parse(gmailConnection));
        }
        
        const outlookConnection = localStorage.getItem('outlook_connection');
        if (outlookConnection) {
            connections.push(JSON.parse(outlookConnection));
        }
        
        return connections;
    }

    // Get primary connection (first connected)
    getPrimaryConnection(): EmailConnection | null {
        const connections = this.getConnections();
        return connections.length > 0 ? connections[0] : null;
    }

    // Disconnect a provider
    async disconnect(provider: 'gmail' | 'outlook'): Promise<void> {
        this.connections.delete(provider);
        localStorage.removeItem(`${provider}_connection`);
    }

    // Test email sending (mock)
    async testEmailSending(connection: EmailConnection): Promise<boolean> {
        try {
            // Simulate API call to test email sending
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Mock 90% success rate
            return Math.random() > 0.1;
        } catch (error) {
            return false;
        }
    }

    // Real OAuth URLs (for future implementation)
    getGmailOAuthUrl(): string {
        const clientId = 'your-gmail-client-id';
        const redirectUri = encodeURIComponent('http://localhost:5173/auth/gmail/callback');
        const scope = encodeURIComponent('https://www.googleapis.com/auth/gmail.send');
        
        return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code&access_type=offline`;
    }

    getOutlookOAuthUrl(): string {
        const clientId = 'your-outlook-client-id';
        const redirectUri = encodeURIComponent('http://localhost:5173/auth/outlook/callback');
        const scope = encodeURIComponent('https://graph.microsoft.com/mail.send');
        
        return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code`;
    }
}

export const emailAuthService = new EmailAuthService();

// Real-world implementation notes:
/*
To implement real OAuth:

1. Gmail Setup:
   - Go to Google Cloud Console
   - Create OAuth2 credentials
   - Add authorized redirect URIs
   - Use google-auth-library npm package

2. Outlook Setup:  
   - Go to Azure App Registration
   - Create new app registration
   - Configure redirect URIs
   - Use @azure/msal-node npm package

3. Backend Integration:
   - Handle OAuth callbacks
   - Exchange code for tokens
   - Store tokens securely
   - Refresh tokens when needed
*/
