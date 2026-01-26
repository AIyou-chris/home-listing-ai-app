const { google } = require('googleapis');
const { supabaseAdmin } = require('./supabase');

class GmailService {
    constructor() {
        this.oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5173/auth/google/callback'
        );
    }

    /**
     * Exchange authorization code for tokens
     */
    async exchangeCodeForTokens(code) {
        try {
            const { tokens } = await this.oauth2Client.getToken(code);
            return tokens;
        } catch (error) {
            console.error('Error exchanging code for tokens:', error);
            throw error;
        }
    }

    /**
     * Get user info from Google
     */
    async getUserInfo(accessToken) {
        try {
            const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
            this.oauth2Client.setCredentials({ access_token: accessToken });
            const { data } = await oauth2.userinfo.get();
            return data;
        } catch (error) {
            console.error('Error getting user info:', error);
            throw error;
        }
    }

    /**
     * Store Gmail connection in database
     */
    async storeConnection(userId, email, tokens) {
        try {
            const { error } = await supabaseAdmin
                .from('gmail_connections')
                .upsert({
                    user_id: userId,
                    email: email,
                    access_token: tokens.access_token,
                    refresh_token: tokens.refresh_token,
                    expiry_date: tokens.expiry_date,
                    scope: tokens.scope,
                    token_type: tokens.token_type,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error storing Gmail connection:', error);
            throw error;
        }
    }

    /**
     * Get Gmail connection from database
     */
    async getConnection(userId) {
        try {
            const { data, error } = await supabaseAdmin
                .from('gmail_connections')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') {
                // REDUNDANT AUDIT FIX: Handle schema cache errors gracefully
                if (error.code === 'PGRST205') {
                    console.warn('[GmailService] Schema cache stale (gmail_connections not yet visible). Falling back.');
                    return null;
                }
                throw error;
            }
            return data;
        } catch (error) {
            console.error('[GmailService] Error getting connection:', error.message);
            return null;
        }
    }

    /**
     * Refresh access token
     */
    async refreshAccessToken(userId) {
        try {
            const connection = await this.getConnection(userId);
            if (!connection || !connection.refresh_token) {
                throw new Error('No refresh token found');
            }

            this.oauth2Client.setCredentials({
                refresh_token: connection.refresh_token
            });

            const { credentials } = await this.oauth2Client.refreshAccessToken();

            // Update stored tokens
            await this.storeConnection(userId, connection.email, credentials);

            return credentials.access_token;
        } catch (error) {
            console.error('Error refreshing access token:', error);
            throw error;
        }
    }

    /**
     * Send email via Gmail API
     */
    async sendEmail(userId, { to, subject, text, html, replyTo }) {
        try {
            const connection = await this.getConnection(userId);
            if (!connection) {
                throw new Error('Gmail not connected');
            }

            // Check if token needs refresh
            if (connection.expiry_date && new Date(connection.expiry_date) < new Date()) {
                await this.refreshAccessToken(userId);
            }

            this.oauth2Client.setCredentials({
                access_token: connection.access_token,
                refresh_token: connection.refresh_token
            });

            const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

            // Create email content
            const emailHeaders = [
                `To: ${to}`,
                `Subject: ${subject}`,
                `Content-Type: text/html; charset=utf-8`
            ];

            if (replyTo) {
                emailHeaders.push(`Reply-To: ${replyTo}`);
            }

            const email = [
                ...emailHeaders,
                '',
                html || text
            ].join('\n');

            const encodedEmail = Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

            const { data } = await gmail.users.messages.send({
                userId: 'me',
                requestBody: {
                    raw: encodedEmail
                }
            });

            return data;
        } catch (error) {
            console.error('Error sending email via Gmail:', error);
            throw error;
        }
    }

    /**
     * Disconnect Gmail
     */
    async disconnect(userId) {
        try {
            const { error } = await supabaseAdmin
                .from('gmail_connections')
                .delete()
                .eq('user_id', userId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error disconnecting Gmail:', error);
            throw error;
        }
    }
}

module.exports = new GmailService();
