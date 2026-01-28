import React, { useState, useRef } from 'react';
import { LeadStatus } from '../types';

interface LeadUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpload: (leads: Array<{ name: string; email: string; phone: string; status: LeadStatus }>) => Promise<void>;
}

export const LeadUploadModal: React.FC<LeadUploadModalProps> = ({ isOpen, onClose, onUpload }) => {
    const [rawText, setRawText] = useState('');
    const [parsedLeads, setParsedLeads] = useState<Array<{ name: string; email: string; phone: string }>>([]);
    const [addToPipeline, setAddToPipeline] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const parseCSV = (text: string) => {
        const lines = text.split(/\r?\n/);
        const leads: Array<{ name: string; email: string; phone: string }> = [];

        lines.forEach(line => {
            if (!line.trim()) return;
            // Simple parsing assuming: Name, Email, Phone OR Email, Name, Phone
            const parts = line.split(',').map(p => p.trim());
            let name = '', email = '', phone = '';

            parts.forEach(part => {
                // Stricter Email Validation
                // Must have @, dot, and not be too short.
                // Regex for basic email structure: something + @ + something + . + something
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

                if (emailRegex.test(part)) email = part;
                else if (part.match(/\d{10}/) || part.match(/[\d\-\(\)\s]{10,}/)) phone = part;
                else if (part.length > 2 && !name) name = part;
            });

            if (email) { // Minimum requirement
                // Improvement: Use "Friend" as a safe fallback instead of the email handle (which can be unprofessional like 'cool_guy_99')
                const fallbackName = 'Friend';
                leads.push({ name: name || fallbackName, email, phone });
            }
        });
        return leads;
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            setRawText(text);
            setParsedLeads(parseCSV(text));
        };
        reader.readAsText(file);
    };

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setRawText(e.target.value);
        setParsedLeads(parseCSV(e.target.value));
    };

    const handleSubmit = async () => {
        if (parsedLeads.length === 0) return;
        setIsProcessing(true);
        console.log(`📤 Uploading ${parsedLeads.length} leads. Status: ${addToPipeline ? 'New' : 'Marketing Only'}`);

        const leadsToImport = parsedLeads.map(l => ({
            ...l,
            status: (addToPipeline ? 'New' : 'Marketing Only') as LeadStatus
        }));

        await onUpload(leadsToImport);
        setIsProcessing(false);
        onClose();
        setRawText('');
        setParsedLeads([]);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900">Import Leads</h2>
                        <p className="text-slate-500 text-sm mt-1">Bulk upload contacts for marketing or sales.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 overflow-y-auto flex-1 space-y-6">

                    {/* File / Text Input */}
                    <div className="space-y-4">
                        <div className="flex gap-4">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex-1 border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-slate-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all cursor-pointer group"
                            >
                                <span className="material-symbols-outlined text-3xl mb-2 group-hover:scale-110 transition-transform">upload_file</span>
                                <span className="font-semibold text-sm">Upload CSV</span>
                                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv,.txt" className="hidden" />
                            </button>
                            <div className="flex-1 bg-slate-50 rounded-xl p-4 border border-slate-200">
                                <textarea
                                    className="w-full h-full bg-transparent border-none resize-none focus:ring-0 text-xs font-mono text-slate-600 placeholder:text-slate-400"
                                    placeholder="Paste emails here (comma or new line separated)...&#10;john@example.com, John Doe, 555-0123"
                                    value={rawText}
                                    onChange={handleTextChange}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Format Preview */}
                    {parsedLeads.length > 0 && (
                        <div className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-100">
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-lg">verified</span>
                                    {parsedLeads.length} Valid Contacts Found
                                </h4>
                            </div>
                            <div className="max-h-32 overflow-y-auto text-xs space-y-1">
                                {parsedLeads.slice(0, 10).map((l, i) => (
                                    <div key={i} className="flex gap-2 text-slate-600 border-b border-indigo-100/50 pb-1 last:border-0">
                                        <span className="font-bold w-[30%] truncate">{l.email}</span>
                                        <span className="w-[30%] truncate">{l.name}</span>
                                        <span className="opacity-70">{l.phone}</span>
                                    </div>
                                ))}
                                {parsedLeads.length > 10 && (
                                    <p className="text-center text-slate-400 italic pt-2">...and {parsedLeads.length - 10} more</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Pipeline Toggle */}
                    <div className="bg-white border rounded-xl p-4 flex items-start gap-4 hover:shadow-sm transition-shadow">
                        <div className={`mt-1 p-2 rounded-lg ${addToPipeline ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                            <span className="material-symbols-outlined">{addToPipeline ? 'verified_user' : 'archive'}</span>
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                                <h3 className="font-bold text-slate-900">Add to Active CRM Pipeline?</h3>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={addToPipeline} onChange={(e) => setAddToPipeline(e.target.checked)} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                                </label>
                            </div>
                            <p className="text-sm text-slate-500 leading-relaxed">
                                {addToPipeline
                                    ? "These leads will appear in your main 'Leads' view as 'New'. Use this for warm leads you want to call immediately."
                                    : "These leads will be saved as 'Marketing Only'. They won't clutter your daily CRM view but will be available for email campaigns and newsletters."
                                }
                            </p>
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={parsedLeads.length === 0 || isProcessing}
                        className="px-8 py-3 rounded-xl font-bold text-white bg-indigo-600 shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                    >
                        {isProcessing ? <span className="material-symbols-outlined animate-spin">refresh</span> : <span className="material-symbols-outlined">cloud_upload</span>}
                        {isProcessing ? 'Importing...' : `Import ${parsedLeads.length} Leads`}
                    </button>
                </div>
            </div>
        </div>
    );
};
