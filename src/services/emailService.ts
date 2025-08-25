// Email service for sending consultation confirmations and notifications
import { googleOAuthService } from './googleOAuthService'

export interface ConsultationData {
    name: string;
    email: string;
    phone: string;
    date: string;
    time: string;
    message: string;
}

export interface CalendarResult {
    meetLink?: string;
    eventId: string;
}

class EmailService {
    private static instance: EmailService;

    private constructor() {}

    static getInstance(): EmailService {
        if (!EmailService.instance) {
            EmailService.instance = new EmailService();
        }
        return EmailService.instance;
    }

    private async sendViaGmail(to: string, subject: string, html: string): Promise<boolean> {
        try {
            if (!googleOAuthService.isAuthenticated()) {
                return false
            }
            const accessToken = googleOAuthService.getAccessToken()
            if (!accessToken) {
                return false
            }

            const message = [
                `To: ${to}`,
                'Content-Type: text/html; charset=UTF-8',
                `Subject: ${subject}`,
                '',
                html
            ].join('\r\n')

            const raw = btoa(unescape(encodeURIComponent(message)))
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '')

            const resp = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ raw })
            })

            return resp.ok
        } catch (e) {
            console.error('Gmail send error', e)
            return false
        }
    }

    // Send confirmation email to client
    async sendConsultationConfirmation(data: ConsultationData, meetLink?: string): Promise<boolean> {
        try {
            // This would integrate with your email service (SendGrid, AWS SES, etc.)
            console.log('Sending confirmation email to:', data.email);
            
            const emailContent = {
                to: data.email,
                subject: 'Your Consultation Has Been Scheduled - HomeListingAI',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #1e40af;">Your Consultation Has Been Scheduled!</h2>
                        <p>Hi ${data.name},</p>
                        <p>Thank you for scheduling a consultation with HomeListingAI. Here are your appointment details:</p>
                        
                        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="margin-top: 0;">Appointment Details</h3>
                            <p><strong>Date:</strong> ${new Date(data.date).toLocaleDateString()}</p>
                            <p><strong>Time:</strong> ${data.time}</p>
                            <p><strong>Duration:</strong> 30 minutes</p>
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
                `
            };

            const sent = await this.sendViaGmail(emailContent.to, emailContent.subject, emailContent.html)
            if (!sent) {
                console.log('Falling back to log-only confirmation (no Gmail token)')
            }
            console.log('Confirmation email content:', emailContent);
            return true;
        } catch (error) {
            console.error('Error sending confirmation email:', error);
            return false;
        }
    }

    // Send notification email to admin
    async sendAdminNotification(data: ConsultationData, meetLink?: string): Promise<boolean> {
        try {
            // This would send an email to you about the new appointment
            console.log('Sending admin notification about new consultation');
            
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

            const sent = await this.sendViaGmail(adminEmail, emailContent.subject, emailContent.html)
            if (!sent) {
                console.log('Falling back to log-only admin notification (no Gmail token)')
            }
            console.log('Admin notification email content:', emailContent);
            return true;
        } catch (error) {
            console.error('Error sending admin notification:', error);
            return false;
        }
    }
}

export const emailService = EmailService.getInstance();
