import React from 'react';

interface Props {
    testPhone: string;
    setTestPhone: (value: string) => void;
    isTestPhoneValid: boolean;
    testEmail: string;
    setTestEmail: (value: string) => void;
}

// Where test calls, texts and emails go.
const FunnelTestConfig: React.FC<Props> = ({ testPhone, setTestPhone, isTestPhoneValid, testEmail, setTestEmail }) => (
    <>
    <div className="mb-8 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-indigo-600">science</span>
            <h3 className="text-sm font-bold text-slate-800">Test Configuration</h3>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 max-w-md">
                <label className="block text-xs font-semibold text-slate-500 mb-1">Test Phone Number (for SMS & Voice)</label>
                <div className="relative">
                    <input
                        type="text"
                        placeholder="+15550000000"
                        className={`w-full text-sm border rounded-lg pl-9 p-2.5 ${!isTestPhoneValid && testPhone ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-indigo-200'}`}
                        value={testPhone}
                        onChange={(e) => setTestPhone(e.target.value)}
                    />
                    <span className="material-symbols-outlined absolute left-2.5 top-2.5 text-slate-400 text-[18px]">smartphone</span>
                </div>
                {!isTestPhoneValid && testPhone && (
                    <p className="text-[10px] text-red-500 mt-1">
                        Please use E.164 format (e.g. +12125551212). US/Canada must be +1 and exactly 10 digits.
                    </p>
                )}
                <p className="text-[10px] text-slate-400 mt-1">
                    Enter your mobile number to receive test calls and texts from your AI.
                </p>
            </div>
            <div className="flex-1 max-w-md">
                <label className="block text-xs font-semibold text-slate-500 mb-1">Test Email Address</label>
                <div className="relative">
                    <input
                        type="email"
                        placeholder="you@example.com"
                        className="w-full text-sm border border-slate-200 rounded-lg pl-9 p-2.5 focus:ring-indigo-200 focus:border-indigo-500"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                    />
                    <span className="material-symbols-outlined absolute left-2.5 top-2.5 text-slate-400 text-[18px]">email</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                    Enter an email to receive your test blasts (defaults to your login email).
                </p>
            </div>
        </div>
    </div>
    </>
);

export default FunnelTestConfig;
