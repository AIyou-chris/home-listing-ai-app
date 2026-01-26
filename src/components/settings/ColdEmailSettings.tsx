import React, { useState, useEffect } from 'react';
import { authService } from '../../services/authService';

export const ColdEmailSettings: React.FC = () => {
    const [senderName, setSenderName] = useState('');
    const [senderEmail, setSenderEmail] = useState('');
    const [replyTo, setReplyTo] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load settings from API
    useEffect(() => {
        const fetchIdentity = async () => {
            try {
                setIsLoading(true);
                const response = await authService.makeAuthenticatedRequest('/api/agent/identity');
                if (response.ok) {
                    const data = await response.json();
                    setSenderName(data.sender_name || '');
                    setSenderEmail(data.sender_email || '');
                    setReplyTo(data.sender_reply_to || '');
                } else {
                    console.error('Failed to fetch identity settings');
                }
            } catch (err) {
                console.error('Error fetching identity:', err);
                setError('Failed to load settings from server.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchIdentity();
    }, []);

    const handleSave = async () => {
        try {
            setIsSaving(true);
            setError(null);

            const response = await authService.makeAuthenticatedRequest('/api/agent/identity', {
                method: 'PUT',
                body: JSON.stringify({
                    senderName,
                    senderEmail,
                    replyTo
                })
            });

            if (!response.ok) {
                throw new Error('Failed to save identity');
            }

            alert('Identity settings synchronized with platform!');
        } catch (err) {
            console.error('Save error:', err);
            setError('Could not save to server. Please check your connection.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 flex flex-col items-center justify-center space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <p className="text-sm text-slate-500 font-medium">Fetching identity status...</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-8 animate-fadeIn">
            <div className="border-b border-slate-100 pb-4">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <span className="material-symbols-outlined text-indigo-600">verified_user</span>
                    Sender Identity
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                    Configure how you appear to your leads when the AI sends emails on your behalf.
                </p>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-xl text-xs font-medium flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">error</span>
                    {error}
                </div>
            )}

            {/* Sender Identity */}
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1 font-bold">From Name</label>
                        <input
                            type="text"
                            className="w-full rounded-lg border-slate-200 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="e.g. John from HomeListingAI"
                            value={senderName}
                            onChange={(e) => setSenderName(e.target.value)}
                            disabled={isSaving}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1 font-bold">From Email (Verified Domain)</label>
                        <input
                            type="email"
                            className="w-full rounded-lg border-slate-200 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="john@yourdomain.com"
                            value={senderEmail}
                            onChange={(e) => setSenderEmail(e.target.value)}
                            disabled={isSaving}
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1 font-bold">Reply-To Address</label>
                    <input
                        type="email"
                        className="w-full rounded-lg border-slate-200 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="replies@yourdomain.com"
                        value={replyTo}
                        onChange={(e) => setReplyTo(e.target.value)}
                        disabled={isSaving}
                    />
                </div>
            </div>

            <div className="pt-4 flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md transition active:scale-95 disabled:opacity-50 flex items-center gap-2"
                >
                    {isSaving ? (
                        <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Synchronizing...
                        </>
                    ) : (
                        <>
                            <span className="material-symbols-outlined text-lg">sync</span>
                            Save & Sync Identity
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

