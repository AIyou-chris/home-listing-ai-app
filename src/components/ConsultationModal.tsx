import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { emailService } from '../services/emailService';
import { ValidationUtils } from '../utils/validation';
import { scheduleAppointment, getAvailableSlots } from '../services/schedulerService';
import { Toaster, toast } from 'react-hot-toast';

interface ConsultationModalProps {
    onClose: () => void;
    onSuccess?: () => void;
    leadRole?: string;
}

const ConsultationModal: React.FC<ConsultationModalProps> = ({ onClose, onSuccess, leadRole }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        message: '',
        date: '',
        time: ''
    });
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [isLoadingSlots, setIsLoadingSlots] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [emailError, setEmailError] = useState<string>('');

    // Set default date to tomorrow
    useEffect(() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateStr = tomorrow.toISOString().split('T')[0];
        setFormData(prev => ({ ...prev, date: dateStr }));
    }, []);

    // Fetch slots when date changes
    useEffect(() => {
        if (formData.date) {
            fetchSlots(formData.date);
        }
    }, [formData.date]);

    const fetchSlots = async (date: string) => {
        setIsLoadingSlots(true);
        setAvailableSlots([]);
        try {
            // Pass undefined for userId to use default/admin calendar or current auth user if any
            // For public site, this should likely check the "admin" availability or a specific target agent.
            // Assuming system default for now.
            const slots = await getAvailableSlots(date);
            setAvailableSlots(slots);
        } catch (error) {
            console.error('Error fetching slots:', error);
            // Fallback slots if service fails strictly for demo/fallback
            setAvailableSlots(['9:00 AM', '10:00 AM', '11:00 AM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM']);
        } finally {
            setIsLoadingSlots(false);
        }
    };

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));

        if (field === 'email') {
            setEmailError('');
            if (value.trim()) {
                if (!ValidationUtils.isValidEmail(value)) {
                    setEmailError('Please enter a valid email address');
                } else {
                    const suggestedEmail = ValidationUtils.detectEmailTypos(value);
                    if (suggestedEmail) {
                        setEmailError(`Did you mean ${suggestedEmail}?`);
                    }
                }
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitStatus('idle');

        try {
            if (!formData.name || !formData.email || !formData.message || !formData.date || !formData.time) {
                throw new Error('Please fill in all required fields');
            }

            if (!ValidationUtils.isValidEmail(formData.email)) {
                throw new Error('Please enter a valid email address');
            }

            // Schedule the appointment
            // This service handles calendar event creation, email confirmation, and admin notification
            await scheduleAppointment({
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                date: formData.date,
                time: formData.time,
                message: formData.message,
                kind: 'Consultation',
                status: 'Scheduled'
            });

            setSubmitStatus('success');
            toast.success('Consultation scheduled successfully!');

            setTimeout(() => {
                onSuccess?.();
                onClose();
            }, 2000);

        } catch (error: any) {
            console.error('Error scheduling consultation:', error);
            setSubmitStatus('error');
            toast.error(error.message || 'Failed to schedule. Please try another time.');
            // Refresh slots in case of conflict
            fetchSlots(formData.date);
        } finally {
            setIsSubmitting(false);
        }
    };

    const titleNode = (
        <div>
            <h3 className="text-xl font-bold text-slate-800">Schedule Your Free Consultation</h3>
            <p className="text-sm text-slate-500 mt-0.5">Pick a time to chat about growing your brokerage with AI</p>
        </div>
    );

    return (
        <Modal title={titleNode} onClose={onClose}>
            <form onSubmit={handleSubmit} className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column: Contact Info */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-2">
                            1. Your Details
                        </h4>

                        <div>
                            <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name *</label>
                            <input
                                id="name"
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => handleInputChange('name', e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="John Doe"
                            />
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-1.5">Email *</label>
                            <input
                                id="email"
                                type="email"
                                required
                                value={formData.email}
                                onChange={(e) => handleInputChange('email', e.target.value)}
                                className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${emailError ? 'border-orange-300 bg-orange-50' : 'border-slate-300'}`}
                                placeholder="john@company.com"
                            />
                            {emailError && <p className="mt-1 text-xs text-orange-600">{emailError}</p>}
                        </div>

                        <div>
                            <label htmlFor="phone" className="block text-sm font-semibold text-slate-700 mb-1.5">Phone</label>
                            <input
                                id="phone"
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => handleInputChange('phone', e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="(555) 123-4567"
                            />
                        </div>

                        <div>
                            <label htmlFor="message" className="block text-sm font-semibold text-slate-700 mb-1.5">Goals / Questions *</label>
                            <textarea
                                id="message"
                                rows={3}
                                required
                                value={formData.message}
                                onChange={(e) => handleInputChange('message', e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="I'm interested in..."
                            />
                        </div>
                    </div>

                    {/* Right Column: Scheduling */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-2">
                            2. Select a Time
                        </h4>

                        <div>
                            <label htmlFor="date" className="block text-sm font-semibold text-slate-700 mb-1.5">Date *</label>
                            <input
                                id="date"
                                type="date"
                                required
                                min={new Date().toISOString().split('T')[0]}
                                value={formData.date}
                                onChange={(e) => handleInputChange('date', e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Available Slots *</label>
                            {isLoadingSlots ? (
                                <div className="text-center py-4 text-slate-400 text-sm">Loading availability...</div>
                            ) : availableSlots.length === 0 ? (
                                <div className="text-center py-4 text-orange-500 text-sm bg-orange-50 rounded-lg border border-orange-100">
                                    No slots available for this date.
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                                    {availableSlots.map(slot => (
                                        <button
                                            key={slot}
                                            type="button"
                                            onClick={() => handleInputChange('time', slot)}
                                            className={`px-2 py-2 text-xs font-medium rounded-md transition-colors border ${formData.time === slot
                                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                                    : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                                                }`}
                                        >
                                            {slot}
                                        </button>
                                    ))}
                                </div>
                            )}
                            {formData.time && (
                                <p className="mt-2 text-xs text-indigo-600 font-medium">
                                    Selected: {formData.date} at {formData.time}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex justify-end items-center mt-8 pt-4 border-t border-slate-200">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition mr-3"
                        disabled={isSubmitting}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting || !formData.time}
                        className="flex items-center gap-2 px-6 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
                    >
                        {isSubmitting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>Booking...</span>
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined w-5 h-5">calendar_add_on</span>
                                <span>Confirm Booking</span>
                            </>
                        )}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default ConsultationModal;
