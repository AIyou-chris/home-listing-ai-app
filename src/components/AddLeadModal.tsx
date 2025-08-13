import React, { useState } from 'react';
import Modal from './Modal';

interface AddLeadModalProps {
    onClose: () => void;
    onAddLead: (leadData: object) => void;
    initialData?: {
        name?: string;
        message?: string;
    };
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


const AddLeadModal: React.FC<AddLeadModalProps> = ({ onClose, onAddLead, initialData }) => {
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        email: '',
        phone: '',
        message: initialData?.message || '',
        source: 'Manual Entry'
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAddLead(formData);
    };

    return (
        <Modal title="Add New Lead" onClose={onClose}>
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
                </div>
                <div className="flex justify-end items-center px-4 pt-4 pb-12 bg-slate-50 border-t border-slate-200 rounded-b-xl">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition mr-2">
                        Cancel
                    </button>
                    <button type="submit" className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition">
                        Add Lead
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default AddLeadModal;