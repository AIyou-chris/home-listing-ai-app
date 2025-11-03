import { googleOAuthService } from './googleOAuthService';

// Google Meet service for video consultations
export interface GoogleMeetEvent {
  summary: string;
  description: string;
  startTime: string;
  endTime: string;
  attendees: string[];
  meetLink?: string;
}

interface CalendarDateTime {
  dateTime?: string;
  date?: string;
  timeZone?: string;
}

interface GoogleCalendarEvent {
  id?: string;
  summary?: string;
  description?: string;
  start?: CalendarDateTime;
  end?: CalendarDateTime;
  attendees?: Array<{ email?: string }>;
  conferenceData?: {
    entryPoints?: Array<{ uri?: string; entryPointType?: string; label?: string }>;
  };
  [key: string]: unknown;
}

interface GoogleCalendarListResponse {
  items?: GoogleCalendarEvent[];
}

interface GoogleApiErrorResponse {
  error?: {
    message?: string;
  };
}

class GoogleMeetService {
  private static instance: GoogleMeetService;
  private meetApiEnabled: boolean = true; // Track if Meet API is available

  private constructor() {}

  static getInstance(): GoogleMeetService {
    if (!GoogleMeetService.instance) {
      GoogleMeetService.instance = new GoogleMeetService();
    }
    return GoogleMeetService.instance;
  }

  // Create a Google Meet event with video conference
  async createMeetEvent(event: GoogleMeetEvent): Promise<{ meetLink: string; eventId: string }> {
    try {
      // Check if user is authenticated
      if (!googleOAuthService.isAuthenticated()) {
        throw new Error('User not authenticated with Google');
      }

      const accessToken = googleOAuthService.getAccessToken();
      if (!accessToken) {
        throw new Error('No access token available');
      }

      const eventData = {
        summary: event.summary,
        description: event.description,
        start: {
          dateTime: event.startTime,
          timeZone: 'America/New_York',
        },
        end: {
          dateTime: event.endTime,
          timeZone: 'America/New_York',
        },
        attendees: event.attendees.map(email => ({ email })),
        conferenceData: {
          createRequest: {
            requestId: `meet-${Date.now()}`,
            conferenceSolutionKey: {
              type: 'hangoutsMeet'
            }
          }
        }
      };

      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData)
      });

      if (!response.ok) {
        const errorData = await response.json() as GoogleApiErrorResponse;
        console.error('Google Calendar API error:', errorData);
        
        // Check if it's a 403 error (API not enabled)
        if (response.status === 403 || errorData.error?.message?.includes('forbidden')) {
          this.meetApiEnabled = false;
          console.log('Google Meet API not enabled, falling back to regular calendar event');
          return this.createRegularCalendarEvent(event);
        }
        
        throw new Error(`Google Calendar API error: ${errorData.error?.message || 'Unknown error'}`);
      }

      const responseData = await response.json() as GoogleCalendarEvent;
      const meetLink = responseData.conferenceData?.entryPoints?.[0]?.uri || '';
      const eventId = responseData.id ?? '';

      return {
        meetLink,
        eventId
      };
    } catch (error) {
      console.error('Error creating Google Meet event:', error);
      
      // Check if it's a 403 error (API not enabled)
      const errorMessage = error instanceof Error ? error.message : '';
      if (errorMessage.includes('forbidden') || errorMessage.includes('403')) {
        this.meetApiEnabled = false;
        console.log('Google Meet API not enabled, falling back to regular calendar event');
        return this.createRegularCalendarEvent(event);
      }
      
      throw new Error('Failed to create video consultation');
    }
  }

  // Fallback: Create regular calendar event without video conferencing
  private async createRegularCalendarEvent(event: GoogleMeetEvent): Promise<{ meetLink: string; eventId: string }> {
    try {
      const accessToken = googleOAuthService.getAccessToken();
      if (!accessToken) {
        throw new Error('No access token available');
      }

      const eventData = {
        summary: event.summary,
        description: `${event.description}

Note: This is a regular calendar event. For video conferencing, please enable the Google Meet API in your Google Cloud Console.`,
        start: {
          dateTime: event.startTime,
          timeZone: 'America/New_York',
        },
        end: {
          dateTime: event.endTime,
          timeZone: 'America/New_York',
        },
        attendees: event.attendees.map(email => ({ email })),
      };

      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData)
      });

      if (!response.ok) {
        const errorData = await response.json() as GoogleApiErrorResponse;
        throw new Error(`Google Calendar API error: ${errorData.error?.message || 'Unknown error'}`);
      }

      const responseData = await response.json() as GoogleCalendarEvent;
      const eventId = responseData.id ?? '';

      return {
        meetLink: '', // No meet link for regular events
        eventId
      };
    } catch (error) {
      console.error('Error creating regular calendar event:', error);
      throw new Error('Failed to create calendar event');
    }
  }

  // Schedule a consultation with Google Meet
  async scheduleConsultation(
    agentEmail: string,
    clientEmail: string,
    propertyAddress: string,
    dateTime: string,
    duration: number = 30 // minutes
  ): Promise<{ meetLink: string; eventId: string }> {
    const startTime = new Date(dateTime);
    const endTime = new Date(startTime.getTime() + duration * 60000);

    const event: GoogleMeetEvent = {
      summary: `Property Consultation - ${propertyAddress}`,
      description: `Video consultation for property at ${propertyAddress}. 
      
Join this Google Meet to discuss the property details, answer questions, and provide a virtual tour.

Property: ${propertyAddress}
Agent: ${agentEmail}
Client: ${clientEmail}

Meeting Link: Will be provided once the event is created.`,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      attendees: [agentEmail, clientEmail]
    };

    return this.createMeetEvent(event);
  }

  // Check if Google Meet API is enabled
  isMeetApiEnabled(): boolean {
    return this.meetApiEnabled;
  }

  // Test Google Calendar API connection
  async testCalendarConnection(): Promise<boolean> {
    try {
      if (!googleOAuthService.isAuthenticated()) {
        return false;
      }

      const accessToken = googleOAuthService.getAccessToken();
      if (!accessToken) {
        return false;
      }

      // Test by fetching calendar list
      const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=1', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Error testing calendar connection:', error);
      return false;
    }
  }

  // Get upcoming consultations
  async getUpcomingConsultations(maxResults: number = 10): Promise<GoogleCalendarEvent[]> {
    try {
      if (!googleOAuthService.isAuthenticated()) {
        throw new Error('User not authenticated with Google');
      }

      const accessToken = googleOAuthService.getAccessToken();
      if (!accessToken) {
        throw new Error('No access token available');
      }

      const now = new Date();
      const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now.toISOString()}&maxResults=${maxResults}&singleEvents=true&orderBy=startTime&q=Property%20Consultation`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch consultations');
      }

      const data = await response.json() as GoogleCalendarListResponse;
      return data.items ?? [];
    } catch (error) {
      console.error('Error fetching consultations:', error);
      return [];
    }
  }

  // Cancel a consultation
  async cancelConsultation(eventId: string): Promise<boolean> {
    try {
      if (!googleOAuthService.isAuthenticated()) {
        throw new Error('User not authenticated with Google');
      }

      const accessToken = googleOAuthService.getAccessToken();
      if (!accessToken) {
        throw new Error('No access token available');
      }

      const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Error canceling consultation:', error);
      return false;
    }
  }
}

export const googleMeetService = GoogleMeetService.getInstance();
