import React, { useState } from 'react';
import { leadsService } from '../../services/leadsService';
import { LeadFunnelType } from '../../types';

interface ImportedLead {
    name: string;
    email: string;
    phone: string;
    company?: string;
}

interface ImportAssignment {
    assignee: string;
    funnel: string;
    tag: string;
}

interface LeadImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (leads: ImportedLead[], assignment: ImportAssignment) => void;
}

const LeadImportModal: React.FC<LeadImportModalProps> = ({ isOpen, onClose, onImport }) => {
    const [step, setStep] = useState<'upload' | 'preview'>('upload');
    const [rawText, setRawText] = useState('');
    const [parsedLeads, setParsedLeads] = useState<ImportedLead[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const [assignment, setAssignment] = useState({
        assignee: 'admin',
        funnel: 'agentSales',
        tag: 'cold-import'
    });

    const [invalidCount, setInvalidCount] = useState(0);

    if (!isOpen) return null;

    // Helper: Robust CSV Line Parser (handles quotes)
    const parseCSVLine = (text: string) => {
        const result = [];
        let start = 0;
        let inQuotes = false;
        for (let i = 0; i < text.length; i++) {
            if (text[i] === '"') {
                inQuotes = !inQuotes;
            } else if (text[i] === ',' && !inQuotes) {
                let field = text.substring(start, i).trim();
                // Remove surrounding quotes if present
                if (field.startsWith('"') && field.endsWith('"')) {
                    field = field.substring(1, field.length - 1).replace(/""/g, '"');
                }
                result.push(field);
                start = i + 1;
            }
        }
        // Last field
        let lastField = text.substring(start).trim();
        if (lastField.startsWith('"') && lastField.endsWith('"')) {
            lastField = lastField.substring(1, lastField.length - 1).replace(/""/g, '"');
        }
        result.push(lastField);
        return result;
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            if (text) setRawText(text);
        };
        reader.readAsText(file);
    };

    const handleParse = () => {
        const lines = rawText.trim().split(/\r?\n/);
        if (lines.length < 2) {
            alert('Please enter at least one header row and one data row.');
            return;
        }

        // Parse headers using the robust parser
        const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        let skipped = 0;
        const data: ImportedLead[] = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const values = parseCSVLine(line);

            // Map headers to logic
            // We search for our target keys in the header list
            const getName = () => {
                const idx = headers.findIndex(h => h === 'name' || h === 'first name' || h === 'first_name' || h === 'full name');
                return idx !== -1 ? values[idx] : '';
            };
            const getEmail = () => {
                const idx = headers.findIndex(h => h === 'email' || h === 'e-mail' || h === 'mail');
                return idx !== -1 ? values[idx] : '';
            };
            const getPhone = () => {
                const idx = headers.findIndex(h => h === 'phone' || h === 'cell' || h === 'mobile' || h === 'number');
                return idx !== -1 ? values[idx] : '';
            };

            const getCompany = () => {
                const idx = headers.findIndex(h => h === 'company' || h === 'organization' || h === 'business');
                return idx !== -1 ? values[idx] : '';
            };

            const lead = {
                name: getName(),
                email: getEmail(),
                phone: getPhone(),
                company: getCompany()
            };

            // Enhanced Validation: Must have name AND valid email format
            // Also allow imports without email if they have phone, or vice versa?
            // Current rule: Name is mandatory. Email OR Phone is required? 
            // Original logic was stricter on email. Let's keep it rigorous for now.
            if (lead.name && (lead.email && emailRegex.test(lead.email))) {
                data.push(lead);
            } else {
                // Try looser: Name + Phone is okay too if email is missing?
                if (lead.name && lead.phone && (!lead.email || lead.email.trim() === '')) {
                    // Accept name+phone only leads
                    data.push(lead);
                } else {
                    skipped++;
                }
            }
        }

        setParsedLeads(data);
        setInvalidCount(skipped);
        setStep('preview');
    };

    const handleImport = async () => {
        setIsImporting(true);
        try {
            const result = await leadsService.bulkImport(parsedLeads, {
                assignee: assignment.assignee,
                funnel: assignment.funnel as LeadFunnelType,
                tag: assignment.tag
            });

            alert(`Successfully imported ${result.imported} leads!`);
            onImport(parsedLeads, assignment); // Notify parent (just for logging/refresh)
            onClose();
            // Reset state
            setStep('upload');
            setRawText('');
            setParsedLeads([]);
        } catch (error) {
            console.error('Import failed', error);
            alert('Import failed. Please check the format and try again.');
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-900">Import Leads</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {step === 'upload' ? (
                        <div className="space-y-6">
                            {/* File Upload Section */}
                            <div className="p-6 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 text-center hover:bg-slate-100 transition-colors relative">
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileUpload}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <div className="space-y-2 pointer-events-none">
                                    <span className="material-symbols-outlined text-4xl text-slate-400">upload_file</span>
                                    <p className="text-sm font-medium text-slate-700">Click to upload CSV file</p>
                                    <p className="text-xs text-slate-500">or drag and drop here</p>
                                </div>
                            </div>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-slate-200"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="bg-white px-2 text-slate-500">or paste text</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Paste CSV Data (Name, Email, Phone)
                                </label>
                                <textarea
                                    className="w-full h-32 rounded-xl border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 font-mono text-sm"
                                    placeholder="name,email,phone&#10;John Doe,john@example.com,555-0100"
                                    value={rawText}
                                    onChange={(e) => setRawText(e.target.value)}
                                />
                                <p className="mt-2 text-xs text-slate-500">
                                    Supports generic CSV format. First row must be headers.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                <h3 className="font-semibold text-sm text-slate-900 mb-2">Assignment Settings</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">Assign To</label>
                                        <select
                                            className="block w-full rounded-lg border-slate-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                                            value={assignment.assignee}
                                            onChange={(e) => setAssignment({ ...assignment, assignee: e.target.value })}
                                        >
                                            <option value="admin">Me (Admin)</option>
                                            <option value="unassigned">Unassigned</option>
                                            <option value="round-robin">Round Robin (Active Agents)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">Target Funnel</label>
                                        <select
                                            className="block w-full rounded-lg border-slate-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                                            value={assignment.funnel}
                                            onChange={(e) => setAssignment({ ...assignment, funnel: e.target.value })}
                                        >
                                            <option value="agentSales">Recruitment (In Your Face)</option>
                                            <option value="welcome">Universal Welcome</option>
                                            <option value="buyer">Buyer Journey</option>
                                            <option value="listing">Seller Story</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">Tag</label>
                                        <input
                                            type="text"
                                            className="block w-full rounded-lg border-slate-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                                            value={assignment.tag}
                                            onChange={(e) => setAssignment({ ...assignment, tag: e.target.value })}
                                            placeholder="e.g. cold-nov"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-semibold text-sm text-slate-900">Preview ({parsedLeads.length} Leads)</h3>
                                    {invalidCount > 0 && (
                                        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-200">
                                            {invalidCount} invalid rows skipped
                                        </span>
                                    )}
                                </div>
                                <div className="border border-slate-200 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                                    <table className="min-w-full divide-y divide-slate-200">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Name</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Email</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Phone</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-slate-200">
                                            {parsedLeads.map((lead, idx) => (
                                                <tr key={idx}>
                                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-900">{lead.name || '-'}</td>
                                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-500">{lead.email || '-'}</td>
                                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-500">{lead.phone || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 rounded-b-2xl">
                    {step === 'upload' ? (
                        <>
                            <button onClick={onClose} className="px-4 py-2 text-slate-700 font-medium hover:bg-slate-200 rounded-lg transition">
                                Cancel
                            </button>
                            <button
                                onClick={handleParse}
                                disabled={!rawText}
                                className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Preview
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => setStep('upload')}
                                disabled={isImporting}
                                className="px-4 py-2 text-slate-700 font-medium hover:bg-slate-200 rounded-lg transition disabled:opacity-50"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleImport}
                                disabled={isImporting}
                                className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isImporting ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                        Importing...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-lg">upload</span>
                                        Import {parsedLeads.length} Leads
                                    </>
                                )}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LeadImportModal;
