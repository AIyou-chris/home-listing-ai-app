
import React, { useEffect, useMemo, useState } from 'react';
import Modal from './Modal';
import { Lead } from '../types';
import { AppointmentKind } from '../services/schedulerService';

interface ScheduleAppointmentModalProps {
    lead?: Lead | null;
    initialDate?: string;
    initialTime?: string;
    onClose: () => void;
    onSchedule: (appointmentData: ScheduleAppointmentFormData) => void;
}

export interface ScheduleAppointmentFormData {
    name: string;
    email: string;
    phone: string;
    date: string;
    time: string;
    message: string;
    kind: AppointmentKind;
    remindAgent: boolean;
    remindClient: boolean;
    agentReminderMinutes: number;
    clientReminderMinutes: number;
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

const DEFAULT_TIME = 'Afternoon (1 PM - 4 PM)';
const BASE_TIME_OPTIONS: string[] = [
    'Morning (9 AM - 12 PM)',
    'Afternoon (1 PM - 4 PM)',
    'Evening (5 PM - 7 PM)',
    '10:00 AM',
    '2:00 PM',
    '6:00 PM'
];

const ScheduleAppointmentModal: React.FC<ScheduleAppointmentModalProps> = ({ lead, initialDate, initialTime, onClose, onSchedule }) => {
    const normalizedInitialTime = initialTime && initialTime.trim().length > 0 ? initialTime : DEFAULT_TIME;
    const timeOptions = useMemo(() => {
        const options = [...BASE_TIME_OPTIONS];
        if (normalizedInitialTime && !options.includes(normalizedInitialTime)) {
            options.push(normalizedInitialTime);
        }
        return Array.from(new Set(options));
    }, [normalizedInitialTime]);

    const [formData, setFormData] = useState<ScheduleAppointmentFormData>({
        name: '',
        email: '',
        phone: '',
        date: initialDate ?? '',
        time: normalizedInitialTime,
        message: '',
        kind: 'Consultation',
        remindAgent: true,
        remindClient: true,
        agentReminderMinutes: 60,
        clientReminderMinutes: 1440
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
        if (name === 'agentReminderMinutes' || name === 'clientReminderMinutes') {
            setFormData(prev => ({ ...prev, [name]: Number(value) }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleToggle = (name: 'remindAgent' | 'remindClient') => (e: React.ChangeEvent<HTMLInputElement>) => {
        const { checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: checked }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSchedule(formData);
    };

    return (
        <Modal title="Schedule Appointment" onClose={onClose}>
            <form onSubmit={handleSubmit} className="flex flex-col min-h-full">
                <div className="flex-1 p-8 pb-6">
                    <FormRow>
                        <Label htmlFor="appt-name">Name *</Label>
                        <Input type="text" id="appt-name" name="name" placeholder="Enter full name" value={formData.name} onChange={handleChange} required />
                    </FormRow>
                    <FormRow>
                        <Label htmlFor="appt-kind">Appointment Type *</Label>
                        <Select id="appt-kind" name="kind" value={formData.kind} onChange={handleChange}>
                            <option value="Consultation">Consultation</option>
                            <option value="Showing">Showing</option>
                            <option value="Open House">Open House</option>
                            <option value="Virtual Tour">Virtual Tour</option>
                            <option value="Follow-up">Follow-up</option>
                        </Select>
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
                                <Input type="date" id="appt-date" name="date" value={formData.date} onChange={handleChange} required className="pl-3 pr-10" min={new Date().toISOString().split('T')[0]} />
                                <span className="material-symbols-outlined w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">calendar_month</span>
                            </div>
                        </FormRow>
                        <FormRow>
                             <Label htmlFor="appt-time">Preferred Time *</Label>
                             <Select id="appt-time" name="time" value={formData.time} onChange={handleChange}>
                                {timeOptions.map(option => (
                                    <option key={option} value={option}>{option}</option>
                                ))}
                            </Select>
                        </FormRow>
                    </div>
                     <FormRow>
                        <Label htmlFor="appt-message">Message</Label>
                        <Textarea id="appt-message" name="message" placeholder="Any special requests or notes" value={formData.message} onChange={handleChange} />
                    </FormRow>
                    <div className="mt-6 space-y-3">
                        <h4 className="text-sm font-semibold text-slate-700">Reminders</h4>
                        <div className="flex items-start justify-between gap-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                            <div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="remind-agent"
                                        name="remindAgent"
                                        checked={formData.remindAgent}
                                        onChange={handleToggle('remindAgent')}
                                        className="h-4 w-4 text-primary-600 border-slate-300 rounded"
                                    />
                                    <Label htmlFor="remind-agent">Notify Agent</Label>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">Send a heads-up before the meeting starts.</p>
                            </div>
                            <div className="w-40">
                                <Select name="agentReminderMinutes" value={formData.agentReminderMinutes} onChange={handleChange}>
                                    <option value={15}>15 minutes before</option>
                                    <option value={30}>30 minutes before</option>
                                    <option value={60}>1 hour before</option>
                                    <option value={120}>2 hours before</option>
                                </Select>
                            </div>
                        </div>
                        <div className="flex items-start justify-between gap-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                            <div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="remind-client"
                                        name="remindClient"
                                        checked={formData.remindClient}
                                        onChange={handleToggle('remindClient')}
                                        className="h-4 w-4 text-primary-600 border-slate-300 rounded"
                                    />
                                    <Label htmlFor="remind-client">Notify Client</Label>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">Send reassurance so the client never forgets.</p>
                            </div>
                            <div className="w-40">
                                <Select name="clientReminderMinutes" value={formData.clientReminderMinutes} onChange={handleChange}>
                                    <option value={60}>1 hour before</option>
                                    <option value={180}>3 hours before</option>
                                    <option value={720}>12 hours before</option>
                                    <option value={1440}>1 day before</option>
                                </Select>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="sticky bottom-0 z-10 border-t border-slate-200 bg-white">
                    <div className="flex justify-end items-center px-8 py-5 gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition">
                            Cancel
                        </button>
                        <button type="submit" className="px-4 py-2 text-sm font-semibold text-white bg-green-500 rounded-lg hover:bg-green-600 transition">
                            Schedule Appointment
                        </button>
                    </div>
                </div>
            </form>
        </Modal>
    );
};

export default ScheduleAppointmentModal;
