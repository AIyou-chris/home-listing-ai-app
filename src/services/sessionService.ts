import { auth, db } from './firebase';
import { doc, setDoc, updateDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';

export class SessionService {
  private static currentSessionId: string | null = null;
  private static sessionStartTime: Date | null = null;
  private static heartbeatInterval: NodeJS.Timeout | null = null;

  // Start a new user session
  static async startSession(): Promise<string | null> {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log('No authenticated user, skipping session start');
        return null;
      }

      // Check if we already have an active session
      if (this.currentSessionId) {
        console.log('Session already active:', this.currentSessionId);
        return this.currentSessionId;
      }

      const sessionData = {
        userId: user.uid,
        startTime: serverTimestamp(),
        lastActivity: serverTimestamp(),
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        screenResolution: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        referrer: document.referrer || 'direct',
        isActive: true
      };

      const sessionRef = await addDoc(collection(db, 'userSessions'), sessionData);
      this.currentSessionId = sessionRef.id;
      this.sessionStartTime = new Date();

      // Start heartbeat to track session activity
      this.startHeartbeat();

      // Track session start event (with error handling)
      try {
        await this.trackEvent('session_start', {
          sessionId: this.currentSessionId,
          timestamp: new Date().toISOString()
        });
      } catch (eventError) {
        console.warn('Failed to track session start event:', eventError);
      }

      console.log('Session started successfully:', this.currentSessionId);
      return this.currentSessionId;
    } catch (error) {
      console.error('Error starting session:', error);
      
      // Fallback: create a local session ID for tracking
      this.currentSessionId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.sessionStartTime = new Date();
      console.log('Created fallback local session:', this.currentSessionId);
      
      return this.currentSessionId;
    }
  }

  // End the current session
  static async endSession(): Promise<void> {
    try {
      if (!this.currentSessionId) return;

      const user = auth.currentUser;
      if (!user) return;

      // Stop heartbeat
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }

      // Calculate session duration
      const endTime = new Date();
      const duration = this.sessionStartTime 
        ? endTime.getTime() - this.sessionStartTime.getTime()
        : 0;

      // Update session record
      const sessionRef = doc(db, 'userSessions', this.currentSessionId);
      await updateDoc(sessionRef, {
        endTime: serverTimestamp(),
        duration: duration,
        isActive: false,
        lastActivity: serverTimestamp()
      });

      // Track session end event
      await this.trackEvent('session_end', {
        sessionId: this.currentSessionId,
        duration: duration,
        timestamp: endTime.toISOString()
      });

      console.log('Session ended:', this.currentSessionId, 'Duration:', duration + 'ms');
      
      this.currentSessionId = null;
      this.sessionStartTime = null;
    } catch (error) {
      console.error('Error ending session:', error);
    }
  }

  // Update session activity (heartbeat)
  private static async updateActivity(): Promise<void> {
    try {
      if (!this.currentSessionId) return;

      const sessionRef = doc(db, 'userSessions', this.currentSessionId);
      await updateDoc(sessionRef, {
        lastActivity: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating session activity:', error);
    }
  }

  // Start heartbeat to track user activity
  private static startHeartbeat(): void {
    // Update activity every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      this.updateActivity();
    }, 30000);

    // Also update on user interactions
    const events = ['click', 'keypress', 'scroll', 'mousemove'];
    let lastActivity = Date.now();

    const throttledUpdate = () => {
      const now = Date.now();
      if (now - lastActivity > 10000) { // Only update if 10 seconds have passed
        this.updateActivity();
        lastActivity = now;
      }
    };

    events.forEach(event => {
      document.addEventListener(event, throttledUpdate, { passive: true });
    });
  }

  // Track custom events within the session
  static async trackEvent(eventType: string, eventData: any = {}): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log('No authenticated user, skipping event tracking');
        return;
      }

      // Skip if no session ID (fallback to local logging)
      if (!this.currentSessionId) {
        console.log('No session ID, logging event locally:', eventType, eventData);
        return;
      }

      const eventRecord = {
        userId: user.uid,
        sessionId: this.currentSessionId,
        eventType,
        eventData,
        timestamp: serverTimestamp(),
        url: window.location.href,
        userAgent: navigator.userAgent
      };

      await addDoc(collection(db, 'sessionEvents'), eventRecord);
    } catch (error) {
      console.warn('Error tracking event (continuing silently):', eventType, error.message);
      
      // Log locally as fallback
      console.log('Event tracked locally:', {
        eventType,
        eventData,
        timestamp: new Date().toISOString(),
        sessionId: this.currentSessionId
      });
    }
  }

  // Track page views
  static async trackPageView(page: string, additionalData: any = {}): Promise<void> {
    await this.trackEvent('page_view', {
      page,
      title: document.title,
      ...additionalData
    });
  }

  // Track user interactions
  static async trackInteraction(interactionType: string, target: string, data: any = {}): Promise<void> {
    await this.trackEvent('user_interaction', {
      interactionType,
      target,
      ...data
    });
  }

  // Track errors
  static async trackError(error: Error, context: string = ''): Promise<void> {
    await this.trackEvent('error', {
      message: error.message,
      stack: error.stack,
      context,
      url: window.location.href
    });
  }

  // Track performance metrics
  static async trackPerformance(metric: string, value: number, unit: string = 'ms'): Promise<void> {
    await this.trackEvent('performance', {
      metric,
      value,
      unit,
      timestamp: Date.now()
    });
  }

  // Get current session ID
  static getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }

  // Check if session is active
  static isSessionActive(): boolean {
    return this.currentSessionId !== null;
  }

  // Initialize session tracking
  static initialize(): void {
    // Start session when user is authenticated
    auth.onAuthStateChanged((user) => {
      if (user && !this.currentSessionId) {
        this.startSession();
      } else if (!user && this.currentSessionId) {
        this.endSession();
      }
    });

    // End session on page unload
    window.addEventListener('beforeunload', () => {
      if (this.currentSessionId) {
        // Use sendBeacon for reliable session end tracking
        const sessionEndData = {
          sessionId: this.currentSessionId,
          endTime: new Date().toISOString(),
          duration: this.sessionStartTime 
            ? Date.now() - this.sessionStartTime.getTime()
            : 0
        };

        navigator.sendBeacon(
          '/api/session-end', 
          JSON.stringify(sessionEndData)
        );
      }
    });

    // Handle visibility changes (tab switching)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.trackEvent('tab_hidden');
      } else {
        this.trackEvent('tab_visible');
        this.updateActivity();
      }
    });
  }
}