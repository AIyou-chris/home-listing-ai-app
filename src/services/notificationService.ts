/**
 * Browser Push Notification Service
 * Lightweight implementation with no backend dependencies
 */

export interface NotificationOptions {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    tag?: string;
    requireInteraction?: boolean;
    silent?: boolean;
}

class NotificationService {
    private static instance: NotificationService;
    private isSupported: boolean;
    private permission: NotificationPermission = 'default';

    constructor() {
        this.isSupported = 'Notification' in window;
        if (this.isSupported) {
            this.permission = Notification.permission;
        }
    }

    static getInstance(): NotificationService {
        if (!NotificationService.instance) {
            NotificationService.instance = new NotificationService();
        }
        return NotificationService.instance;
    }

    /**
     * Check if browser notifications are supported
     */
    isNotificationSupported(): boolean {
        return this.isSupported;
    }

    /**
     * Get current permission status
     */
    getPermission(): NotificationPermission {
        return this.permission;
    }

    /**
     * Request notification permission
     */
    async requestPermission(): Promise<NotificationPermission> {
        if (!this.isSupported) {
            throw new Error('Notifications not supported in this browser');
        }

        if (this.permission === 'granted') {
            return 'granted';
        }

        try {
            this.permission = await Notification.requestPermission();
            return this.permission;
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            return 'denied';
        }
    }

    /**
     * Show a notification
     */
    async showNotification(options: NotificationOptions): Promise<boolean> {
        if (!this.isSupported) {
            console.warn('Notifications not supported');
            return false;
        }

        if (this.permission !== 'granted') {
            console.warn('Notification permission not granted');
            return false;
        }

        try {
            const notification = new Notification(options.title, {
                body: options.body,
                icon: options.icon || '/favicon.ico',
                badge: options.badge || '/favicon.ico',
                tag: options.tag,
                requireInteraction: options.requireInteraction || false,
                silent: options.silent || false
            });

            // Auto-close after 5 seconds unless requireInteraction is true
            if (!options.requireInteraction) {
                setTimeout(() => {
                    notification.close();
                }, 5000);
            }

            return true;
        } catch (error) {
            console.error('Error showing notification:', error);
            return false;
        }
    }

    /**
     * Real Estate specific notification helpers
     */
    async showNewLeadNotification(leadName: string, propertyAddress?: string): Promise<boolean> {
        return this.showNotification({
            title: '🔥 New Lead!',
            body: `${leadName}${propertyAddress ? ` is interested in ${propertyAddress}` : ' has submitted an inquiry'}`,
            tag: 'new-lead',
            requireInteraction: true
        });
    }

    async showAppointmentReminder(clientName: string, time: string, propertyAddress?: string): Promise<boolean> {
        return this.showNotification({
            title: '📅 Appointment Reminder',
            body: `Meeting with ${clientName} at ${time}${propertyAddress ? ` - ${propertyAddress}` : ''}`,
            tag: 'appointment-reminder',
            requireInteraction: true
        });
    }

    async showPropertyInquiry(propertyAddress: string, clientName?: string): Promise<boolean> {
        return this.showNotification({
            title: '🏠 Property Inquiry',
            body: `${clientName || 'Someone'} is asking about ${propertyAddress}`,
            tag: 'property-inquiry',
            requireInteraction: true
        });
    }

    async showHotLeadAlert(leadName: string, score?: number): Promise<boolean> {
        return this.showNotification({
            title: '🔥🔥🔥 HOT LEAD ALERT!',
            body: `${leadName} is a high-priority lead${score ? ` (Score: ${score})` : ''} - Contact immediately!`,
            tag: 'hot-lead',
            requireInteraction: true
        });
    }

    async showContractMilestone(milestone: string, clientName: string, dueDate?: string): Promise<boolean> {
        return this.showNotification({
            title: '📋 Contract Milestone',
            body: `${milestone} for ${clientName}${dueDate ? ` - Due: ${dueDate}` : ''}`,
            tag: 'contract-milestone',
            requireInteraction: true
        });
    }

    /**
     * Check if user is in quiet hours
     */
    isQuietHours(quietStart: string = '22:00', quietEnd: string = '08:00'): boolean {
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        
        const [startHour, startMin] = quietStart.split(':').map(Number);
        const [endHour, endMin] = quietEnd.split(':').map(Number);
        
        const quietStartTime = startHour * 60 + startMin;
        const quietEndTime = endHour * 60 + endMin;
        
        // Handle overnight quiet hours (e.g., 22:00 to 08:00)
        if (quietStartTime > quietEndTime) {
            return currentTime >= quietStartTime || currentTime <= quietEndTime;
        }
        
        return currentTime >= quietStartTime && currentTime <= quietEndTime;
    }

    /**
     * Show notification respecting user preferences
     */
    async showNotificationWithPreferences(
        options: NotificationOptions,
        preferences: {
            quietStart?: string;
            quietEnd?: string;
            weekendNotifications?: boolean;
            soundAlerts?: boolean;
        } = {}
    ): Promise<boolean> {
        // Check quiet hours
        if (this.isQuietHours(preferences.quietStart, preferences.quietEnd)) {
            console.log('Notification suppressed - quiet hours');
            return false;
        }

        // Check weekend preferences
        const isWeekend = [0, 6].includes(new Date().getDay()); // 0 = Sunday, 6 = Saturday
        if (isWeekend && preferences.weekendNotifications === false) {
            console.log('Notification suppressed - weekend');
            return false;
        }

        // Apply sound preference
        if (preferences.soundAlerts === false) {
            options.silent = true;
        }

        return this.showNotification(options);
    }

    /**
     * Test notification - useful for settings page
     */
    async showTestNotification(): Promise<boolean> {
        return this.showNotification({
            title: '🎉 Test Notification',
            body: 'Great! Browser notifications are working perfectly on your device.',
            tag: 'test-notification'
        });
    }
}

export const notificationService = NotificationService.getInstance();
export default notificationService;
