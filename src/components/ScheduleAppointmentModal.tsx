

import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { Lead } from '../types';

interface ScheduleAppointmentModalProps {
    lead?: Lead | null;
    onClose: () => void;
    onSchedule: (appointmentData: object) => void;
}

// Reusable form components from AddLeadModal for consistency
const FormRow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="mb-4">{children}</div>
);

const Label: React.FC<{ htmlFor: string; children: React.ReactNode }> = ({ htmlFor, children }) => (
    <label htmlFor={htmlFor} className="block text-sm font-semibold text-slate-700 mb-1.5">
        {children}
    </label>
);

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
    <input
        {...props}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition"
    />
);

const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => (
    <textarea
        {...props}
        rows={3}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition"
    />
);

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
    <div className="relative">
        <select
            {...props}
            className="w-full appearance-none bg-white px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition"
        >
          {props.children}
        </select>
        <span className="material-symbols-outlined w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">expand_more</span>
    </div>
);


const ScheduleAppointmentModal: React.FC<ScheduleAppointmentModalProps> = ({ lead, onClose, onSchedule }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        date: '',
        time: 'Afternoon (1 PM - 4 PM)',
        message: ''
    });

    useEffect(() => {
        if (lead) {
            setFormData(prev => ({
                ...prev,
                name: lead.name || '',
                email: lead.email || '',
                phone: lead.phone || '',
            }));
        }
    }, [lead]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSchedule(formData);
    };

    return (
        <Modal title="Schedule Appointment" onClose={onClose}>
            <form onSubmit={handleSubmit}>
                <div className="p-8">
                    <FormRow>
                        <Label htmlFor="appt-name">Name *</Label>
                        <Input type="text" id="appt-name" name="name" placeholder="Enter full name" value={formData.name} onChange={handleChange} required />
                    </FormRow>
                    <FormRow>
                        <Label htmlFor="appt-email">Email *</Label>
                        <Input type="email" id="appt-email" name="email" placeholder="Enter email address" value={formData.email} onChange={handleChange} required />
                    </FormRow>
                    <FormRow>
                        <Label htmlFor="appt-phone">Phone</Label>
                        <Input type="tel" id="appt-phone" name="phone" placeholder="Enter phone number" value={formData.phone} onChange={handleChange} />
                    </FormRow>
                    <div className="grid grid-cols-2 gap-4">
                        <FormRow>
                            <Label htmlFor="appt-date">Preferred Date *</Label>
                            <div className="relative">
                                <Input type="text" id="appt-date" name="date" placeholder="mm/dd/yyyy" value={formData.date} onChange={handleChange} required className="pl-3 pr-10" />
                                <span className="material-symbols-outlined w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">calendar_month</span>
                            </div>
                        </FormRow>
                        <FormRow>
                             <Label htmlFor="appt-time">Preferred Time *</Label>
                             <Select id="appt-time" name="time" value={formData.time} onChange={handleChange}>
                                <option>Morning (9 AM - 12 PM)</option>
                                <option>Afternoon (1 PM - 4 PM)</option>
                                <option>Evening (5 PM - 7 PM)</option>
                            </Select>
                        </FormRow>
                    </div>
                     <FormRow>
                        <Label htmlFor="appt-message">Message</Label>
                        <Textarea id="appt-message" name="message" placeholder="Any special requests or notes" value={formData.message} onChange={handleChange} />
                    </FormRow>
                </div>
                <div className="flex justify-end items-center px-8 py-6 bg-slate-50 border-t border-slate-200 rounded-b-xl">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition mr-2">
                        Cancel
                    </button>
                    <button type="submit" className="px-4 py-2 text-sm font-semibold text-white bg-green-500 rounded-lg hover:bg-green-600 transition">
                        Schedule Appointment
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default ScheduleAppointmentModal;