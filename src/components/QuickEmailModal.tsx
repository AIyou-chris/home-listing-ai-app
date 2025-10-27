import React, { useState } from 'react';
import Modal from './Modal';
import EmailTemplateModal from './EmailTemplateModal';
import { EmailTemplate } from '../constants/emailTemplates';

interface QuickEmailModalProps {
    onClose: () => void;
}

type StatusMessage = {
    type: 'success' | 'error';
    message: string;
};

const QuickEmailModal: React.FC<QuickEmailModalProps> = ({ onClose }) => {
    const [recipientName, setRecipientName] = useState('');
    const [recipientEmail, setRecipientEmail] = useState('');
    const [fromEmail, setFromEmail] = useState('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [status, setStatus] = useState<StatusMessage | null>(null);
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

    const resetForm = () => {
        setRecipientName('');
        setRecipientEmail('');
        setSubject('');
        setBody('');
        setFromEmail('');
    };

    const handleTemplateSelect = (template: EmailTemplate) => {
        setSubject(template.subject);
        setBody(template.content);
    };

    const handleSend = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!recipientEmail.trim() || !subject.trim() || !body.trim()) {
            setStatus({
                type: 'error',
                message: 'Recipient email, subject, and message are required.',
            });
            return;
        }

        setIsSending(true);
        setStatus(null);

        try {
            const response = await fetch('/api/admin/email/quick-send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    to: recipientEmail.trim(),
                    subject: subject.trim(),
                    html: body,
                    from: fromEmail.trim() || undefined,
                    metadata: {
                        recipientName: recipientName.trim() || undefined,
                        sentAt: new Date().toISOString(),
                    },
                }),
            });

            if (!response.ok) {
                const errorPayload = await response.json().catch(() => ({}));
                const details = errorPayload?.error || 'Failed to send email.';
                throw new Error(details);
            }

            setStatus({
                type: 'success',
                message: 'Email sent successfully via Mailgun.',
            });
            resetForm();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unexpected error sending email.';
            setStatus({
                type: 'error',
                message,
            });
        } finally {
            setIsSending(false);
        }
    };

    const titleNode = (
        <div className="flex items-center gap-3">
            <span className="material-symbols-outlined w-5 h-5 text-primary-600 flex-shrink-0">send</span>
            <span className="text-xl font-bold text-slate-800">Quick Send Email</span>
        </div>
    );

    return (
        <Modal title={titleNode} onClose={onClose}>
            <form onSubmit={handleSend}>
                <div className="px-6 py-5 space-y-5 max-h-[75vh] overflow-y-auto">
                    <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                        Use a pre-built template or craft a quick note—Mailgun will deliver it instantly to your lead.
                    </div>

                    {status && (
                        <div
                            className={`rounded-lg border px-4 py-3 text-sm ${
                                status.type === 'success'
                                    ? 'border-green-200 bg-green-50 text-green-700'
                                    : 'border-red-200 bg-red-50 text-red-700'
                            }`}
                        >
                            {status.message}
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Recipient Name</label>
                            <input
                                type="text"
                                value={recipientName}
                                onChange={(e) => setRecipientName(e.target.value)}
                                placeholder="e.g., Sarah Johnson"
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Recipient Email *</label>
                            <input
                                type="email"
                                value={recipientEmail}
                                onChange={(e) => setRecipientEmail(e.target.value)}
                                required
                                placeholder="sarah@email.com"
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">From Email (optional)</label>
                        <input
                            type="email"
                            value={fromEmail}
                            onChange={(e) => setFromEmail(e.target.value)}
                            placeholder="Agent Name <agent@yourdomain.com>"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        <p className="mt-1 text-xs text-slate-500">
                            Leave blank to use your default Mailgun sender.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Subject *</label>
                        <input
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            required
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-sm font-semibold text-slate-700">Message *</label>
                            <button
                                type="button"
                                onClick={() => setIsTemplateModalOpen(true)}
                                className="flex items-center gap-1 rounded-md bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-200"
                            >
                                <span className="material-symbols-outlined w-4 h-4">library_books</span>
                                Choose Template
                            </button>
                        </div>
                        <textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            required
                            rows={8}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="Write your email..."
                        />
                    </div>
                </div>

                <div className="flex justify-end items-center gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSending}
                        className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        {isSending && (
                            <span className="material-symbols-outlined w-4 h-4 animate-spin">progress_activity</span>
                        )}
                        <span>{isSending ? 'Sending...' : 'Send Email'}</span>
                    </button>
                </div>
            </form>

            {isTemplateModalOpen && (
                <EmailTemplateModal
                    onClose={() => setIsTemplateModalOpen(false)}
                    onSelectTemplate={(template) => {
                        handleTemplateSelect(template);
                        setIsTemplateModalOpen(false);
                    }}
                />
            )}
        </Modal>
    );
};

export default QuickEmailModal;

