import React, { useState, useEffect } from 'react';

export const ColdEmailSettings: React.FC = () => {
    const [dailyLimit, setDailyLimit] = useState(50);
    const [senderName, setSenderName] = useState('');
    const [senderEmail, setSenderEmail] = useState('');
    const [replyTo, setReplyTo] = useState('');
    const [throttleCount, setThrottleCount] = useState(10);
    const [throttleSeconds, setThrottleSeconds] = useState(30);

    // Mock loading from local storage/API
    useEffect(() => {
        const saved = localStorage.getItem('cold_email_settings');
        if (saved) {
            const parsed = JSON.parse(saved);
            setDailyLimit(parsed.dailyLimit || 50);
            setSenderName(parsed.senderName || '');
            setSenderEmail(parsed.senderEmail || '');
            setReplyTo(parsed.replyTo || '');
            setThrottleCount(parsed.throttleCount || 10);
            setThrottleSeconds(parsed.throttleSeconds || 30);
        }
    }, []);

    const handleSave = () => {
        const settings = {
            dailyLimit,
            senderName,
            senderEmail,
            replyTo,
            throttleCount,
            throttleSeconds
        };
        localStorage.setItem('cold_email_settings', JSON.stringify(settings));
        alert('Settings saved!');
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-8">
            <div className="border-b border-slate-100 pb-4">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <span className="material-symbols-outlined text-indigo-600">mail_lock</span>
                    Cold Email Deliverability
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                    Configure limits and sender identity to maintain high reputation and avoid spam filters.
                </p>
            </div>

            {/* Sender Identity */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Sender Identity</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">From Name</label>
                        <input
                            type="text"
                            className="w-full rounded-lg border-slate-200 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="e.g. John from HomeListingAI"
                            value={senderName}
                            onChange={(e) => setSenderName(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">From Email (Verified Domain)</label>
                        <input
                            type="email"
                            className="w-full rounded-lg border-slate-200 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="john@yourdomain.com"
                            value={senderEmail}
                            onChange={(e) => setSenderEmail(e.target.value)}
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Reply-To Address</label>
                    <input
                        type="email"
                        className="w-full rounded-lg border-slate-200 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="replies@yourdomain.com"
                        value={replyTo}
                        onChange={(e) => setReplyTo(e.target.value)}
                    />
                </div>
            </div>

            {/* Throttling & Limits */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Throttling & Limits</h3>

                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <div className="flex flex-col gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-2">Daily Send Limit (Global)</label>
                            <div className="flex items-center gap-4">
                                <input
                                    type="range"
                                    min="10"
                                    max="5000"
                                    step="10"
                                    className="flex-1 accent-indigo-600"
                                    value={dailyLimit}
                                    onChange={(e) => setDailyLimit(Number(e.target.value))}
                                />
                                <span className="text-sm font-bold text-indigo-700 min-w-[60px] text-right">{dailyLimit}</span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">Start low (50/day) and increase gradually (warm-up).</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Batch Size (Emails per burst)</label>
                                <input
                                    type="number"
                                    className="w-full rounded-lg border-slate-200 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                    value={throttleCount}
                                    onChange={(e) => setThrottleCount(Number(e.target.value))}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Delay between bursts (Seconds)</label>
                                <input
                                    type="number"
                                    className="w-full rounded-lg border-slate-200 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                    value={throttleSeconds}
                                    onChange={(e) => setThrottleSeconds(Number(e.target.value))}
                                />
                            </div>
                        </div>
                        <div className="text-xs text-slate-500 italic bg-white p-2 rounded border border-slate-100">
                            Example: Send <strong>{throttleCount}</strong> emails, then wait <strong>{throttleSeconds}</strong> seconds.
                        </div>
                    </div>
                </div>
            </div>

            {/* DNS Checklist (Static) */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">DNS Configuration Checklist</h3>
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                    <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-amber-600">warning</span>
                        <div className="text-sm text-amber-800">
                            <p className="font-bold mb-1">Required for Delivery</p>
                            <p className="mb-2">Ensure you have added these records to your domain provider (GoDaddy, Namecheap, etc.):</p>
                            <ul className="list-disc list-inside space-y-1 text-xs">
                                <li><strong>SPF:</strong> <code>v=spf1 include:mailgun.org ~all</code></li>
                                <li><strong>DKIM:</strong> Add the TXT record provided by your email service.</li>
                                <li><strong>DMARC:</strong> <code>v=DMARC1; p=none; rua=mailto:dmarc-reports@yourdomain.com</code></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            <div className="pt-4 flex justify-end">
                <button
                    onClick={handleSave}
                    className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md transition active:scale-95"
                >
                    Save Settings
                </button>
            </div>
        </div>
    );
};
