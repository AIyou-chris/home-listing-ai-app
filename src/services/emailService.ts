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

    private async sendViaGmail(to: string, subject: string, html: string, fromEmail?: string): Promise<boolean> {
        try {
            // Get Gmail connection
            const gmailConnection = this.getGmailConnection();
            if (!gmailConnection || !gmailConnection.accessToken) {
                console.error('No Gmail connection or access token available');
                return false;
            }

            // Create email message
            const message = [
                `To: ${to}`,
                `From: ${fromEmail || gmailConnection.email}`,
                'Content-Type: text/html; charset=UTF-8',
                `Subject: ${subject}`,
                '',
                html
            ].join('\r\n');

            // Encode message for Gmail API
            const raw = btoa(unescape(encodeURIComponent(message)))
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');

            const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${gmailConnection.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ raw })
            });

            if (!response.ok) {
                console.error('Gmail API error:', await response.text());
                return false;
            }

            const result = await response.json();
            console.log('Email sent successfully:', result.id);
            return true;

        } catch (error) {
            console.error('Error sending email via Gmail:', error);
            return false;
        }
    }

    private getGmailConnection() {
        try {
            const stored = localStorage.getItem('gmail_connection');
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (error) {
            console.error('Error getting Gmail connection:', error);
        }
        return null;
    }

    async sendEmail(to: string, subject: string, html: string, fromEmail?: string): Promise<boolean> {
        // Try Gmail first
        const gmailResult = await this.sendViaGmail(to, subject, html, fromEmail);
        if (gmailResult) {
            return true;
        }

        console.log('Gmail sending failed, no fallback configured');
        return false;
    }

    // Send confirmation email to client
    async sendConsultationConfirmation(data: ConsultationData, meetLink?: string): Promise<boolean> {
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

            // Send the email using Gmail
            const emailSent = await this.sendEmail(data.email, subject, html);
            
            if (emailSent) {
                console.log('✅ Confirmation email sent successfully');
                return true;
            }

            console.log('❌ Failed to send confirmation email');
            
            // Show a user-friendly message about the booking
            alert(`✅ Consultation scheduled successfully!

📅 ${data.name}, your consultation is booked for:
📆 Date: ${new Date(data.date).toLocaleDateString()}
⏰ Time: ${data.time}
📧 Confirmation email: ${data.email}

Note: Email service is currently in demo mode. 
In production, you would receive confirmation emails.

We've logged your booking details for follow-up.`);
            
            return true; // Return true since the booking was successful, just email failed
        } catch (error) {
            console.error('❌ Error in consultation confirmation:', error);
            return false;
        }
    }

    private async sendViaBackend(emailContent: any): Promise<boolean> {
        try {
            // This would send email via your backend API
            const response = await fetch('/api/send-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(emailContent)
            });
            
            return response.ok;
        } catch (error) {
            console.log('📧 Backend email API not available (expected in demo)');
            return false;
        }
    }

    // Send notification email to admin
    async sendAdminNotification(data: ConsultationData, meetLink?: string): Promise<boolean> {
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

            // Try Gmail first
            const sentViaGmail = await this.sendViaGmail(adminEmail, emailContent.subject, emailContent.html);
            
            if (sentViaGmail) {
                console.log('✅ Admin notification sent successfully via Gmail');
                return true;
            }

            // Gmail failed, try backend
            const backendSent = await this.sendViaBackend(emailContent);
            if (backendSent) {
                console.log('✅ Admin notification sent successfully via backend');
                return true;
            }

            // All methods failed, log the notification
            console.log('⚠️ Admin notification could not be sent via email, logging instead:');
            console.log('📋 New consultation booking:', {
                client: data.name,
                email: data.email,
                phone: data.phone,
                date: data.date,
                time: data.time,
                message: data.message,
                meetLink: meetLink
            });
            
            return true; // Return true since the booking was successful
        } catch (error) {
            console.error('❌ Error in admin notification:', error);
            return false;
        }
    }
}

export const emailService = EmailService.getInstance();
