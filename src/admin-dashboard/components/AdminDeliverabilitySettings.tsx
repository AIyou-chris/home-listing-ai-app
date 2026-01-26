import React, { useState, useEffect } from 'react';

export const AdminDeliverabilitySettings: React.FC = () => {
    const [globalDailyLimit, setGlobalDailyLimit] = useState(5000);
    const [globalBatchSize, setGlobalBatchSize] = useState(50);
    const [globalDelaySeconds, setGlobalDelaySeconds] = useState(60);

    // Mock loading from local storage/API
    useEffect(() => {
        const saved = localStorage.getItem('admin_deliverability_settings');
        if (saved) {
            const parsed = JSON.parse(saved);
            setGlobalDailyLimit(parsed.globalDailyLimit || 5000);
            setGlobalBatchSize(parsed.globalBatchSize || 50);
            setGlobalDelaySeconds(parsed.globalDelaySeconds || 60);
        }
    }, []);

    const handleSave = () => {
        const settings = {
            globalDailyLimit,
            globalBatchSize,
            globalDelaySeconds
        };
        localStorage.setItem('admin_deliverability_settings', JSON.stringify(settings));
        alert('Global deliverability settings saved!');
    };

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Global Limits */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <span className="material-symbols-outlined text-indigo-600">speed</span>
                        Global Throttling & Limits
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                        Control the maximum send volume across the entire platform to protect IP reputation.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Platform Daily Limit</label>
                        <input
                            type="number"
                            className="w-full rounded-lg border-slate-200 text-sm focus:ring-indigo-500 focus:border-indigo-500 font-bold"
                            value={globalDailyLimit}
                            onChange={(e) => setGlobalDailyLimit(Number(e.target.value))}
                        />
                        <p className="text-[10px] text-slate-400 mt-2">Maximum emails sent platform-wide per 24h.</p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Global Batch Size</label>
                        <input
                            type="number"
                            className="w-full rounded-lg border-slate-200 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                            value={globalBatchSize}
                            onChange={(e) => setGlobalBatchSize(Number(e.target.value))}
                        />
                        <p className="text-[10px] text-slate-400 mt-2">Emails per burst across all active funnels.</p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Global Burst Delay (S)</label>
                        <input
                            type="number"
                            className="w-full rounded-lg border-slate-200 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                            value={globalDelaySeconds}
                            onChange={(e) => setGlobalDelaySeconds(Number(e.target.value))}
                        />
                        <p className="text-[10px] text-slate-400 mt-2">Cool-down period between global bursts.</p>
                    </div>
                </div>

                <div className="pt-2 flex justify-end">
                    <button
                        onClick={handleSave}
                        className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition shadow-sm"
                    >
                        Apply Global Limits
                    </button>
                </div>
            </div>

            {/* DNS Configuration Checklist (Centralized) */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <span className="material-symbols-outlined text-blue-600">dns</span>
                        Root Domain DNS Checklist
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                        Ensure the following records are set on <strong>homelistingai.com</strong> (or your white-labeled root).
                    </p>
                </div>

                <div className="space-y-4">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-bold text-slate-700">SPF Record (Sender Policy Framework)</span>
                            <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded uppercase">Verified</span>
                        </div>
                        <code className="block p-3 bg-white border border-slate-200 rounded-lg text-xs text-indigo-600 font-mono select-all">
                            v=spf1 include:mailgun.org include:resend.com ~all
                        </code>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-bold text-slate-700">DKIM Record (DomainKeys Identified Mail)</span>
                            <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded uppercase">Verified</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mb-2">Key: mg._domainkey</p>
                        <code className="block p-3 bg-white border border-slate-200 rounded-lg text-xs text-indigo-600 font-mono break-all select-all">
                            k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQ...[TRUNCATED]
                        </code>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-bold text-slate-700">DMARC Record</span>
                            <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded uppercase">Optimization Recommended</span>
                        </div>
                        <code className="block p-3 bg-white border border-slate-200 rounded-lg text-xs text-indigo-600 font-mono select-all">
                            v=DMARC1; p=quarantine; rua=mailto:dmarc@homelistingai.com
                        </code>
                    </div>
                </div>
            </div>
        </div>
    );
};
