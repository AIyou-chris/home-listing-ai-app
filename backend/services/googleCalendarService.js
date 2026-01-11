const { google } = require('googleapis');
const { supabaseAdmin } = require('./supabase');

class GoogleCalendarService {
    constructor() {
        this.oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5173/auth/google/callback'
        );
    }

    /**
     * Store Google Calendar connection in database
     */
    async storeConnection(userId, email, tokens) {
        try {
            const { error } = await supabaseAdmin
                .from('google_calendar_connections')
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
            console.error('Error storing Google Calendar connection:', error);
            throw error;
        }
    }

    /**
     * Get Google Calendar connection from database
     */
    async getConnection(userId) {
        try {
            const { data, error } = await supabaseAdmin
                .from('google_calendar_connections')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            return data;
        } catch (error) {
            console.error('Error getting Google Calendar connection:', error);
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
     * Create event in Google Calendar
     */
    async createEvent(userId, eventData) {
        try {
            const connection = await this.getConnection(userId);
            if (!connection) {
                console.log(`Google Calendar not connected for user ${userId}, skipping sync`);
                return null;
            }

            // Check if token needs refresh
            if (connection.expiry_date && new Date(connection.expiry_date) < new Date()) {
                await this.refreshAccessToken(userId);
            }

            this.oauth2Client.setCredentials({
                access_token: connection.access_token,
                refresh_token: connection.refresh_token
            });

            const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

            const event = {
                summary: eventData.title || 'Appointment',
                description: eventData.description || '',
                start: {
                    dateTime: eventData.startTime,
                    timeZone: eventData.timeZone || 'America/New_York',
                },
                end: {
                    dateTime: eventData.endTime,
                    timeZone: eventData.timeZone || 'America/New_York',
                },
                attendees: eventData.attendees || [],
                conferenceData: eventData.createMeetLink ? {
                    createRequest: {
                        requestId: `meet-${Date.now()}`,
                        conferenceSolutionKey: { type: 'hangoutsMeet' }
                    }
                } : undefined
            };

            const { data } = await calendar.events.insert({
                calendarId: 'primary',
                requestBody: event,
                conferenceDataVersion: eventData.createMeetLink ? 1 : 0
            });

            console.log(`✅ Created Google Calendar event: ${data.id}`);
            return data;
        } catch (error) {
            console.error('Error creating Google Calendar event:', error);
            // Don't throw - we don't want to fail appointment creation if Google Calendar sync fails
            return null;
        }
    }

    /**
     * Update event in Google Calendar
     */
    async updateEvent(userId, eventId, eventData) {
        try {
            const connection = await this.getConnection(userId);
            if (!connection || !eventId) {
                return null;
            }

            if (connection.expiry_date && new Date(connection.expiry_date) < new Date()) {
                await this.refreshAccessToken(userId);
            }

            this.oauth2Client.setCredentials({
                access_token: connection.access_token,
                refresh_token: connection.refresh_token
            });

            const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

            const event = {
                summary: eventData.title || 'Appointment',
                description: eventData.description || '',
                start: {
                    dateTime: eventData.startTime,
                    timeZone: eventData.timeZone || 'America/New_York',
                },
                end: {
                    dateTime: eventData.endTime,
                    timeZone: eventData.timeZone || 'America/New_York',
                }
            };

            const { data } = await calendar.events.update({
                calendarId: 'primary',
                eventId: eventId,
                requestBody: event
            });

            console.log(`✅ Updated Google Calendar event: ${eventId}`);
            return data;
        } catch (error) {
            console.error('Error updating Google Calendar event:', error);
            return null;
        }
    }

    /**
     * Delete event from Google Calendar
     */
    async deleteEvent(userId, eventId) {
        try {
            const connection = await this.getConnection(userId);
            if (!connection || !eventId) {
                return null;
            }

            if (connection.expiry_date && new Date(connection.expiry_date) < new Date()) {
                await this.refreshAccessToken(userId);
            }

            this.oauth2Client.setCredentials({
                access_token: connection.access_token,
                refresh_token: connection.refresh_token
            });

            const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

            await calendar.events.delete({
                calendarId: 'primary',
                eventId: eventId
            });

            console.log(`✅ Deleted Google Calendar event: ${eventId}`);
            return true;
        } catch (error) {
            console.error('Error deleting Google Calendar event:', error);
            return null;
        }
    }

    /**
     * Disconnect Google Calendar
     */
    async disconnect(userId) {
        try {
            const { error } = await supabaseAdmin
                .from('google_calendar_connections')
                .delete()
                .eq('user_id', userId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error disconnecting Google Calendar:', error);
            throw error;
        }
    }
}

module.exports = new GoogleCalendarService();
