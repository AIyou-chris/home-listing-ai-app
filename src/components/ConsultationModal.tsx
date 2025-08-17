

import React, { useState } from 'react';
import Modal from './Modal';
import { googleMeetService } from '../services/googleMeetService';
import { emailService } from '../services/emailService';
import { addConsultation } from '../services/firestoreService';

interface ConsultationModalProps {
    onClose: () => void;
    onSuccess?: () => void;
}

const ConsultationModal: React.FC<ConsultationModalProps> = ({ onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        date: '',
        time: '',
        message: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitStatus('idle');

        try {
            // Validate required fields
            if (!formData.name || !formData.email || !formData.date || !formData.time) {
                throw new Error('Please fill in all required fields');
            }

            // Combine date and time
            const dateTime = new Date(`${formData.date}T${formData.time}`);
            const endTime = new Date(dateTime.getTime() + 30 * 60000); // 30 minutes duration

            // Create calendar event
            const event = {
                summary: `Free Consultation - ${formData.name}`,
                description: `Free consultation request from ${formData.name}

Contact Information:
- Email: ${formData.email}
- Phone: ${formData.phone}

Message:
${formData.message || 'No additional message provided'}

This consultation was booked through the HomeListingAI website.`,
                startTime: dateTime.toISOString(),
                endTime: endTime.toISOString(),
                attendees: [formData.email, 'us@homelistign.com'] // Your actual Gmail address
            };

            // Add to Google Calendar
            const calendarResult = await googleMeetService.createMeetEvent(event);

            // Send confirmation email to client
            await emailService.sendConsultationConfirmation(formData, calendarResult.meetLink);

            // Send notification email to admin
            await emailService.sendAdminNotification(formData, calendarResult.meetLink);

            // Save to admin dashboard
            await saveToAdminDashboard(formData, calendarResult);

            setSubmitStatus('success');
            setTimeout(() => {
                onSuccess?.();
                onClose();
            }, 2000);

        } catch (error) {
            console.error('Error scheduling consultation:', error);
            setSubmitStatus('error');
        } finally {
            setIsSubmitting(false);
        }
    };



    const saveToAdminDashboard = async (data: any, calendarResult: any) => {
        try {
            await addConsultation({
                name: data.name,
                email: data.email,
                phone: data.phone,
                date: data.date,
                time: data.time,
                message: data.message,
                calendarEventId: calendarResult.eventId,
                meetLink: calendarResult.meetLink,
                status: 'scheduled'
            });
            console.log('Consultation saved to admin dashboard');
        } catch (error) {
            console.error('Error saving consultation to dashboard:', error);
        }
    };

    const titleNode = (
        <div>
            <h3 className="text-xl font-bold text-slate-800">Schedule Free Consultation</h3>
            <p className="text-sm text-slate-500 mt-0.5">Book your personalized AI consultation</p>
        </div>
    );

    return (
        <Modal title={titleNode} onClose={onClose}>
            <form onSubmit={handleSubmit} className="p-6">
                <div className="space-y-4">
                    {/* Name */}
                    <div>
                        <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-1.5">
                            Full Name *
                        </label>
                        <input
                            id="name"
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition"
                            placeholder="Enter your full name"
                        />
                    </div>

                    {/* Email */}
                    <div>
                        <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-1.5">
                            Email Address *
                        </label>
                        <input
                            id="email"
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition"
                            placeholder="Enter your email address"
                        />
                    </div>

                    {/* Phone */}
                    <div>
                        <label htmlFor="phone" className="block text-sm font-semibold text-slate-700 mb-1.5">
                            Phone Number
                        </label>
                        <input
                            id="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => handleInputChange('phone', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition"
                            placeholder="Enter your phone number"
                        />
                    </div>

                    {/* Date and Time */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="date" className="block text-sm font-semibold text-slate-700 mb-1.5">
                                Preferred Date *
                            </label>
                            <input
                                id="date"
                                type="date"
                                required
                                value={formData.date}
                                onChange={(e) => handleInputChange('date', e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition"
                                min={new Date().toISOString().split('T')[0]}
                            />
                        </div>
                        <div>
                            <label htmlFor="time" className="block text-sm font-semibold text-slate-700 mb-1.5">
                                Preferred Time *
                            </label>
                            <input
                                id="time"
                                type="time"
                                required
                                value={formData.time}
                                onChange={(e) => handleInputChange('time', e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition"
                            />
                        </div>
                    </div>

                    {/* Message */}
                    <div>
                        <label htmlFor="message" className="block text-sm font-semibold text-slate-700 mb-1.5">
                            Additional Message
                        </label>
                        <textarea
                            id="message"
                            rows={4}
                            value={formData.message}
                            onChange={(e) => handleInputChange('message', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition"
                            placeholder="Tell us about your real estate needs, questions, or specific properties you're interested in..."
                        />
                    </div>

                    {/* Status Messages */}
                    {submitStatus === 'success' && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-green-800 text-sm">
                                ✅ Consultation scheduled successfully! Check your email for confirmation.
                            </p>
                        </div>
                    )}

                    {submitStatus === 'error' && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-red-800 text-sm">
                                ❌ There was an error scheduling your consultation. Please try again.
                            </p>
                        </div>
                    )}
                </div>

                <div className="flex justify-end items-center mt-6 pt-4 border-t border-slate-200">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition mr-2"
                        disabled={isSubmitting}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>Scheduling...</span>
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined w-5 h-5">calendar_today</span>
                                <span>Schedule Consultation</span>
                            </>
                        )}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default ConsultationModal;
