import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { funnelService } from '../services/funnelService';
import { supabase } from '../services/supabase';

export interface NewLeadPayload {
    name: string;
    email: string;
    phone: string;
    message: string;
    source: string;
    funnelType?: string;
    status?: string;
}

interface AddLeadModalProps {
    onClose: () => void;
    onAddLead: (leadData: NewLeadPayload) => void;
    initialData?: Partial<NewLeadPayload>;
    isEditing?: boolean;
}

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
        rows={4}
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


const AddLeadModal: React.FC<AddLeadModalProps> = ({ onClose, onAddLead, initialData, isEditing = false }) => {
    const [formData, setFormData] = useState<NewLeadPayload>({
        name: initialData?.name || '',
        email: initialData?.email || '',
        phone: initialData?.phone || '',
        message: initialData?.message || '',
        source: initialData?.source || 'Manual Entry',
        funnelType: initialData?.funnelType || ''
    });

    const [availableFunnels, setAvailableFunnels] = useState<string[]>([]);

    useEffect(() => {
        const fetchFunnels = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const funnels = await funnelService.fetchFunnels(user.id);
                    // User Request: "Only want a realtor funnel and a broker funnel that's it"
                    const allowedFunnels = ['realtor_funnel', 'broker_funnel'];
                    const filteredKeys = Object.keys(funnels).filter(k => allowedFunnels.includes(k));

                    if (filteredKeys.length > 0) {
                        setAvailableFunnels(filteredKeys);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch funnels for dropdown:', error);
            }
        };
        fetchFunnels();
    }, []);

    const formatFunnelName = (key: string) => {
        const map: Record<string, string> = {
            'universal_sales': 'Universal Welcome Drip',
            'homebuyer': 'AI-Powered Homebuyer Journey',
            'seller': 'AI-Powered Seller Funnel',
            'postShowing': 'After-Showing Follow-Up'
        };
        if (map[key]) return map[key];

        // Formatter for custom keys: "my_custom_funnel" -> "My Custom Funnel"
        return key
            .split(/[_-]/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAddLead(formData);
    };

    return (
        <Modal title={isEditing ? "Edit Contact Details" : "Add New Lead"} onClose={onClose}>
            <form onSubmit={handleSubmit}>
                <div className="p-6">
                    <FormRow>
                        <Label htmlFor="name">Name *</Label>
                        <Input type="text" id="name" name="name" placeholder="Enter full name" value={formData.name} onChange={handleChange} required />
                    </FormRow>
                    <FormRow>
                        <Label htmlFor="email">Email *</Label>
                        <Input type="email" id="email" name="email" placeholder="Enter email address" value={formData.email} onChange={handleChange} required />
                    </FormRow>
                    <FormRow>
                        <Label htmlFor="phone">Phone</Label>
                        <Input type="tel" id="phone" name="phone" placeholder="Enter phone number" value={formData.phone} onChange={handleChange} />
                    </FormRow>
                    <FormRow>
                        <Label htmlFor="message">Message *</Label>
                        <Textarea id="message" name="message" placeholder="Enter lead message or notes" value={formData.message} onChange={handleChange} required />
                    </FormRow>
                    <FormRow>
                        <Label htmlFor="source">Source</Label>
                        <Select id="source" name="source" value={formData.source} onChange={handleChange}>
                            <option>Manual Entry</option>
                            <option>Website Form</option>
                            <option>QR Code Scan</option>
                            <option>Referral</option>
                        </Select>
                    </FormRow>
                    <FormRow>
                        <Label htmlFor="funnelType">Enroll in Funnel</Label>
                        <Select id="funnelType" name="funnelType" value={formData.funnelType || ''} onChange={handleChange}>
                            <option value="">No Funnel (Manual Only)</option>
                            {availableFunnels.length > 0 ? (
                                availableFunnels.map(funnelId => (
                                    <option key={funnelId} value={funnelId}>
                                        {formatFunnelName(funnelId)}
                                    </option>
                                ))
                            ) : (
                                <>
                                    <option value="realtor_funnel">Realtor Funnel</option>
                                    <option value="broker_funnel">Broker Funnel</option>
                                </>
                            )}
                        </Select>
                    </FormRow>
                </div>
                <div className="flex justify-end items-center px-4 pt-4 pb-12 bg-slate-50 border-t border-slate-200 rounded-b-xl">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition mr-2">
                        Cancel
                    </button>
                    <button type="submit" className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition">
                        {isEditing ? 'Save Changes' : 'Add Lead'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default AddLeadModal;