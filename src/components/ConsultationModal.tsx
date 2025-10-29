import React, { useState } from 'react';
import Modal from './Modal';
import { emailService } from '../services/emailService';
import { ValidationUtils } from '../utils/validation';

interface ConsultationModalProps {
    onClose: () => void;
    onSuccess?: () => void;
}

const ConsultationModal: React.FC<ConsultationModalProps> = ({ onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        message: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [emailError, setEmailError] = useState<string>('');

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));

        // Enhanced email validation with typo detection
        if (field === 'email') {
            setEmailError('');
            if (value.trim()) {
                if (!ValidationUtils.isValidEmail(value)) {
                    setEmailError('Please enter a valid email address');
                } else {
                    // Check for common typos using centralized validation
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
            // Validate required fields
            if (!formData.name || !formData.email || !formData.message) {
                throw new Error('Please fill in all required fields');
            }

            // Enhanced email validation
            if (!ValidationUtils.isValidEmail(formData.email)) {
                throw new Error('Please enter a valid email address');
            }

            // Send contact message to admin
            await emailService.sendContactMessage({
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                message: formData.message
            });

            setSubmitStatus('success');
            setTimeout(() => {
                onSuccess?.();
                onClose();
            }, 2000);

        } catch (error) {
            console.error('Error sending contact message:', error);
            setSubmitStatus('error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const titleNode = (
        <div>
            <h3 className="text-xl font-bold text-slate-800">Contact Our Team</h3>
            <p className="text-sm text-slate-500 mt-0.5">Tell us how we can help you grow with AI</p>
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
                            className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition ${
                                emailError ? 'border-orange-300 bg-orange-50' : 'border-slate-300'
                            }`}
                            placeholder="Enter your email address"
                        />
                        {emailError && (
                            <p className="mt-1 text-sm text-orange-600 flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">info</span>
                                {emailError}
                            </p>
                        )}
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

                    {/* Message */}
                    <div>
                        <label htmlFor="message" className="block text-sm font-semibold text-slate-700 mb-1.5">
                            How can we help? *
                        </label>
                        <textarea
                            id="message"
                            rows={5}
                            required
                            value={formData.message}
                            onChange={(e) => handleInputChange('message', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition"
                            placeholder="Share a bit about your goals, questions, or the support you need…"
                        />
                    </div>

                    {/* Status Messages */}
                    {submitStatus === 'success' && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-green-800 text-sm">
                                ✅ Thanks for reaching out! Our team will get back to you shortly.
                            </p>
                        </div>
                    )}

                    {submitStatus === 'error' && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-red-800 text-sm">
                                ❌ There was an error sending your message. Please try again.
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
                                <span>Sending...</span>
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined w-5 h-5">send</span>
                                <span>Send Message</span>
                            </>
                        )}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default ConsultationModal;
