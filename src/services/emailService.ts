// Email service for sending consultation confirmations and notifications
type EmailRecipient = string | string[]

type SendEmailOptions = {
    fromEmail?: string
    text?: string
    cc?: EmailRecipient
    bcc?: EmailRecipient
    replyTo?: string
    preference?: {
        userId: string
        channel: 'email'
        event: string
    }
    tags?: Record<string, string>
}

type EmailRequestPayload = {
    to: EmailRecipient
    subject: string
    html?: string
    text?: string
    from?: string
    cc?: EmailRecipient
    bcc?: EmailRecipient
    replyTo?: string
    preference?: {
        userId: string
        channel: 'email'
        event: string
    }
    tags?: Record<string, string>
}

export interface ConsultationData {
    name: string;
    email: string;
    phone: string;
    date: string;
    time: string;
    message: string;
    location?: string;
}

export interface CalendarResult {
    meetLink?: string;
    eventId: string;
}

export interface ContactMessageData {
    name: string;
    email: string;
    phone?: string;
    message: string;
    role?: string;
}

// Helper to generate Google Maps URL
const getMapsUrl = (location: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;

class EmailService {
    private static instance: EmailService
    private readonly endpoint = `${import.meta.env.VITE_API_URL || 'https://home-listing-ai-backend.onrender.com'}/api/email/send`

    private constructor() { }

    static getInstance(): EmailService {
        if (!EmailService.instance) {
            EmailService.instance = new EmailService()
        }
        return EmailService.instance
    }

    private stripHtml(input: string): string {
        return input
            .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, ' ')
            .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, ' ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
    }

    private async postEmail(payload: EmailRequestPayload): Promise<boolean> {
        try {
            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            })

            if (!response.ok) {
                const details = await response.json().catch(() => ({}))
                console.error('Mailgun email request failed', {
                    status: response.status,
                    details
                })
                return false
            }

            const data = await response.json().catch(() => ({}))
            if (data?.success === false) {
                console.error('Mailgun email request reported failure', data)
                return false
            }

            return true
        } catch (error) {
            console.error('Mailgun email request errored', error)
            return false
        }
    }

    async sendEmail(to: string, subject: string, html: string, options: SendEmailOptions = {}): Promise<boolean> {
        const payload: EmailRequestPayload = {
            to,
            subject,
            html,
            text: options.text,
            from: options.fromEmail,
            cc: options.cc,
            bcc: options.bcc,
            replyTo: options.replyTo,
            preference: options.preference,
            tags: options.tags
        }

        if (!payload.text && html) {
            payload.text = this.stripHtml(html)
        }

        const success = await this.postEmail(payload)

        if (!success) {
            console.error('Failed to send email via backend service', {
                to,
                subject
            })
        }

        return success
    }

    // Send confirmation email to client
    async sendConsultationConfirmation(data: ConsultationData, meetLink?: string, options: SendEmailOptions = {}): Promise<boolean> {
        try {
            console.log('📧 Attempting to send confirmation email to:', data.email);

            const subject = 'Your Consultation Has Been Scheduled - HomeListingAI';
            const html = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #1e40af;">Your Consultation Has Been Scheduled!</h2>
                        <p>Hi ${data.name},</p>
                        <p>Thank you for scheduling a consultation with HomeListingAI. Here are your appointment details:</p>
                        
                        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="margin-top: 0;">Appointment Details</h3>
                            <p><strong>Date:</strong> ${new Date(data.date).toLocaleDateString()}</p>
                            <p><strong>Time:</strong> ${data.time}</p>
                            <p><strong>Duration:</strong> 30 minutes</p>
                            ${data.location ? `<p><strong>Location:</strong> <a href="${getMapsUrl(data.location)}" style="color: #1e40af;">${data.location}</a> 📍</p>` : ''}
                            ${meetLink ? `<p><strong>Meeting Link:</strong> <a href="${meetLink}" style="color: #1e40af;">Join Meeting</a></p>` : ''}
                        </div>
                        
                        <p>We'll discuss your real estate needs and how our AI-powered platform can help you:</p>
                        <ul>
                            <li>Generate more leads automatically</li>
                            <li>Close deals faster with AI assistance</li>
                            <li>Save 20+ hours weekly on repetitive tasks</li>
                            <li>Turn every listing into an installable app</li>
                        </ul>
                        
                        <p>If you need to reschedule or have any questions, please reply to this email or call us.</p>
                        
                        <p>Best regards,<br>The HomeListingAI Team</p>
                    </div>
                `;

            const emailSent = await this.sendEmail(data.email, subject, html, {
                text: this.stripHtml(html),
                ...options
            });

            if (emailSent) {
                console.log('✅ Confirmation email sent successfully');
                return true;
            }

            console.warn('❌ Failed to send confirmation email via Mailgun. Continuing without email.')
            return false;
        } catch (error) {
            console.error('❌ Error in consultation confirmation:', error);
            return false;
        }
    }

    // Send notification email to admin
    async sendAdminNotification(
        data: ConsultationData,
        meetLink?: string,
        options: { userId?: string } = {}
    ): Promise<boolean> {
        try {
            console.log('📧 Attempting to send admin notification about new consultation');

            const adminEmail = 'us@homelistingai.com';
            const emailContent = {
                to: adminEmail,
                subject: 'New Consultation Request - HomeListingAI',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #dc2626;">New Consultation Request</h2>
                        <p>You have a new consultation request from the HomeListingAI website.</p>
                        
                        <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="margin-top: 0;">Client Information</h3>
                            <p><strong>Name:</strong> ${data.name}</p>
                            <p><strong>Email:</strong> <a href="mailto:${data.email}" style="color: #1e40af;">${data.email}</a></p>
                            <p><strong>Phone:</strong> ${data.phone || 'Not provided'}</p>
                            <p><strong>Date:</strong> ${new Date(data.date).toLocaleDateString()}</p>
                            <p><strong>Time:</strong> ${data.time}</p>
                            ${data.location ? `<p><strong>Location:</strong> <a href="${getMapsUrl(data.location)}" style="color: #1e40af;">${data.location}</a> 📍</p>` : ''}
                            ${meetLink ? `<p><strong>Meeting Link:</strong> <a href="${meetLink}" style="color: #1e40af;">Join Meeting</a></p>` : ''}
                        </div>
                        
                        ${data.message ? `
                        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="margin-top: 0;">Client Message</h3>
                            <p>${data.message}</p>
                        </div>
                        ` : ''}
                        
                        <p>This consultation has been automatically added to your Google Calendar.</p>
                        
                        <p>Best regards,<br>HomeListingAI System</p>
                    </div>
                `
            };

            const preference = options.userId
                ? {
                    userId: options.userId,
                    channel: 'email' as const,
                    event: 'appointmentScheduled'
                }
                : undefined

            const emailSent = await this.sendEmail(adminEmail, emailContent.subject, emailContent.html, {
                text: this.stripHtml(emailContent.html),
                replyTo: data.email,
                preference
            })

            if (!emailSent) {
                console.warn('⚠️ Admin notification could not be sent via Mailgun. Logging instead.')
                console.log('📋 New consultation booking:', {
                    client: data.name,
                    email: data.email,
                    phone: data.phone,
                    date: data.date,
                    time: data.time,
                    message: data.message,
                    meetLink: meetLink
                })
            }

            return emailSent
        } catch (error) {
            console.error('❌ Error in admin notification:', error);
            return false;
        }
    }

    async sendContactMessage(data: ContactMessageData, options: SendEmailOptions = {}): Promise<boolean> {
        try {
            console.log('📧 Sending contact message via Lead Capture API (DB + Email)');

            const apiBase = import.meta.env.VITE_API_URL || 'https://home-listing-ai-backend.onrender.com';

            const response = await fetch(`${apiBase}/api/leads/public`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: data.name,
                    email: data.email,
                    phone: data.phone,
                    message: data.message,
                    source: 'Website Contact Form',
                    role: data.role, // Pass role to backend for funnel assignment
                    notifyAdmin: true // This triggers the email notification from backend
                })
            });

            if (!response.ok) {
                console.error('Lead capture API failed', response.status);
                return false;
            }

            const resData = await response.json();
            if (resData.success) {
                console.log('✅ Contact message saved as lead and admin notified.');
                return true;
            }

            return false;
        } catch (error) {
            console.error('❌ Error sending contact message:', error);
            return false;
        }
    }
}

export { EmailService };
export const emailService = EmailService.getInstance();
