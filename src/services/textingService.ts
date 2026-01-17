



class TextingService {
    private static instance: TextingService;

    private constructor() {
        // API Key and From Number are now handled securely by the backend
    }

    static getInstance(): TextingService {
        if (!TextingService.instance) {
            TextingService.instance = new TextingService();
        }
        return TextingService.instance;
    }

    /**
     * Sends an SMS message using Telnyx API (via native fetch).
     */
    async sendSms(to: string, message: string): Promise<boolean> {
        // No client-side API key check needed (handled by backend)

        // Normalize destination (US-centric default)
        const normalizeTo = (num: string) => {
            const digits = num.replace(/\D/g, '');
            if (digits.length === 10) return `+1${digits}`;
            if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
            return num.startsWith('+') ? num : `+${digits}`; // Fallback
        };

        const destination = normalizeTo(to);

        try {
            console.log(`📱 Sending SMS to ${destination}...`);

            const response = await fetch('/api/sms/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    to: destination,
                    message: message
                    // userId can be added if we inject auth context, but for now allow unrestricted (backend skips check if missing)
                })
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                console.error('❌ SMS API Error:', data);
                return false;
            }

            console.log('✅ SMS successfully sent via Backend:', data);
            return true;
        } catch (error) {
            console.error('❌ Failed to send SMS via Backend:', error);
            return false;
        }
    }
}

export const textingService = TextingService.getInstance();
