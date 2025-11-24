import React, { useState } from 'react';
import { supabase } from '../services/supabase';

interface AddContactModalProps {
    isOpen: boolean;
    onClose: () => void;
    onContactAdded: () => void;
}

const AddContactModal: React.FC<AddContactModalProps> = ({ isOpen, onClose, onContactAdded }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        contactType: 'lead', // 'lead', 'client', 'agent'
        status: 'new',
        source: 'website',
        propertyInterest: '',
        budgetRange: '',
        notes: '',
        role: 'agent', // for agents only
        plan: 'Solo Agent' // for agents only
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error('No authenticated user');
            }

            // Create contact based on type
            if (formData.contactType === 'agent') {
                // Create user account
                const { error: signUpError } = await supabase.auth.admin.createUser({
                    email: formData.email,
                    password: 'tempPassword123!', // They'll reset this
                    email_confirm: true,
                    user_metadata: {
                        name: formData.name,
                        role: formData.role,
                        plan: formData.plan
                    }
                });
                if (signUpError) throw signUpError;
            } else {
                // Create lead/client contact
                const { data, error: insertError } = await supabase
                    .from('contacts')
                    .insert({
                        name: formData.name,
                        email: formData.email,
                        phone: formData.phone,
                        role: formData.contactType,
                        stage: formData.status,
                        pipeline_note: formData.notes,
                        user_id: user.id
                    })
                    .select();
                if (insertError) throw insertError;
                console.log('Contact created successfully:', data);
            }

            // Reset form and close modal
            setFormData({
                name: '',
                email: '',
                phone: '',
                contactType: 'lead',
                status: 'new',
                source: 'website',
                propertyInterest: '',
                budgetRange: '',
                notes: '',
                role: 'agent',
                plan: 'Solo Agent'
            });
            onContactAdded();
            onClose();
        } catch (err) {
            console.error('Error adding contact:', err);
            const message = err instanceof Error ? err.message : 'Failed to add contact';
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">Add New Contact</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Contact Type */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Contact Type *
                            </label>
                            <select
                                name="contactType"
                                value={formData.contactType}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                                required
                            >
                                <option value="lead" className="text-gray-900">Lead</option>
                                <option value="client" className="text-gray-900">Client</option>
                                <option value="agent" className="text-gray-900">Agent</option>
                            </select>
                        </div>

                        {/* Basic Info */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Full Name *
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                                placeholder="Enter full name"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Email *
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                                placeholder="Enter email"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Phone
                            </label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                                placeholder="(555) 123-4567"
                            />
                        </div>

                        {/* Status and Source */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Status
                            </label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                            >
                                <option value="new" className="text-gray-900">New</option>
                                <option value="contacted" className="text-gray-900">Contacted</option>
                                <option value="qualified" className="text-gray-900">Qualified</option>
                                <option value="proposal" className="text-gray-900">Proposal</option>
                                <option value="closed" className="text-gray-900">Closed</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Source
                            </label>
                            <select
                                name="source"
                                value={formData.source}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                            >
                                <option value="website" className="text-gray-900">Website</option>
                                <option value="referral" className="text-gray-900">Referral</option>
                                <option value="social" className="text-gray-900">Social Media</option>
                                <option value="advertising" className="text-gray-900">Advertising</option>
                                <option value="cold-call" className="text-gray-900">Cold Call</option>
                                <option value="other" className="text-gray-900">Other</option>
                            </select>
                        </div>

                        {/* Property Interest and Budget (for leads/clients) */}
                        {formData.contactType !== 'agent' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Property Interest
                                    </label>
                                    <input
                                        type="text"
                                        name="propertyInterest"
                                        value={formData.propertyInterest}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                                        placeholder="e.g., 3BR House"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Budget Range
                                    </label>
                                    <input
                                        type="text"
                                        name="budgetRange"
                                        value={formData.budgetRange}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                                        placeholder="e.g., $300K-400K"
                                    />
                                </div>
                            </>
                        )}

                        {/* Role and Plan (for agents only) */}
                        {formData.contactType === 'agent' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Role
                                    </label>
                                    <select
                                        name="role"
                                        value={formData.role}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                                    >
                                        <option value="agent" className="text-gray-900">Agent</option>
                                        <option value="admin" className="text-gray-900">Admin</option>
                                        <option value="manager" className="text-gray-900">Manager</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Plan
                                    </label>
                                    <select
                                        name="plan"
                                        value={formData.plan}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                                    >
                                        <option value="Solo Agent" className="text-gray-900">Solo Agent</option>
                                        <option value="Team Lead" className="text-gray-900">Team Lead</option>
                                        <option value="Broker" className="text-gray-900">Broker</option>
                                    </select>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Notes */}
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Notes
                        </label>
                        <textarea
                            name="notes"
                            value={formData.notes}
                            onChange={handleInputChange}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                            placeholder="Additional notes about this contact..."
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Adding...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-sm">add</span>
                                    Add Contact
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddContactModal;
