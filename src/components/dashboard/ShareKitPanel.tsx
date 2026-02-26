import React, { useState } from 'react';

// Using dummy types for the prop signature to wire this up quickly
export interface ShareKitPanelProps {
    listing: {
        id: string;
        title: string;
        address: string;
        price: string;
        status: 'DRAFT' | 'PUBLISHED';
        slug: string;
        beds: string | number;
        baths: string | number;
    };
    onPublish: () => void;
    onTestLeadSubmit: (data: { name: string, contact: string, context: string }) => Promise<void>;
    stats?: {
        leadsCaptured: number;
        topSource: string;
        lastLeadAgo: string;
    };
}

export const ShareKitPanel: React.FC<ShareKitPanelProps> = ({
    listing,
    onPublish,
    onTestLeadSubmit,
    stats = { leadsCaptured: 0, topSource: 'None', lastLeadAgo: 'N/A' }
}) => {

    const [qrSource, setQrSource] = useState<'sign' | 'open_house' | 'social'>('sign');
    const [isTestModalOpen, setIsTestModalOpen] = useState(false);

    // Copy states
    const [copiedLink, setCopiedLink] = useState(false);
    const [copiedCaption, setCopiedCaption] = useState(false);

    // Test form states
    const [testName, setTestName] = useState('');
    const [testContact, setTestContact] = useState('');
    const [testContext, setTestContext] = useState('Report requested');
    const [testSubmitting, setTestSubmitting] = useState(false);

    const isDraft = listing.status === 'DRAFT';
    const baseUrl = 'https://homelistingai.com/l/';
    const shareUrl = `${baseUrl}${listing.slug}`;
    const trackingUrl = `${shareUrl}?src=${qrSource}`;

    // Generate QR using the free API mapping exactly to the tracked URL
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(trackingUrl)}`;

    const captionTemplate = `Just listed: ${listing.address} 🏡✨\nPrice: ${listing.price} | ${listing.beds} Beds | ${listing.baths} Baths\n\nGet the instant 1-page property report + request a showing right here: ${shareUrl}`;

    const handleCopy = async (text: string, setCopiedState: (v: boolean) => void) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedState(true);
            setTimeout(() => setCopiedState(false), 2000);
        } catch (err) {
            console.error("Failed to copy", err);
        }
    };

    const handleTestSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setTestSubmitting(true);
        try {
            await onTestLeadSubmit({ name: testName, contact: testContact, context: testContext });
            // Let the parent component handle the success toast "Test lead created — open in Leads."
            setIsTestModalOpen(false);
        } catch (error) {
            console.error("Test lead failed", error);
        } finally {
            setTestSubmitting(false);
        }
    };

    return (
        <div className="bg-[#0B1121] border border-slate-800 rounded-2xl p-8 mb-8 shadow-2xl shadow-black/50 overflow-hidden font-sans">

            {/* Header Area */}
            <div className="mb-8">
                <h2 className="text-3xl font-extrabold text-white tracking-tight mb-2">Share Kit</h2>
                <p className="text-slate-400 text-lg">One link. One QR. Every placement routes back to this listing.</p>
            </div>

            {/* Top Status Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between bg-slate-900/50 p-6 rounded-xl border border-slate-800 mb-8 gap-6">
                <div className="flex items-start gap-4">
                    <div className={`px-4 py-1.5 rounded-full text-xs font-black tracking-widest uppercase mt-1 ${isDraft ? 'bg-slate-800 text-slate-400 border border-slate-700' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}>
                        {listing.status}
                    </div>
                    <div>
                        <p className="text-white font-semibold text-lg">
                            {isDraft ? 'Draft Status' : 'Live Status'}
                        </p>
                        <p className="text-slate-400 text-sm mt-1">
                            {isDraft
                                ? 'Publish to generate your live link + QR'
                                : 'Live link + QR ready to share'
                            }
                        </p>
                    </div>
                </div>

                <div>
                    {isDraft ? (
                        <button
                            onClick={onPublish}
                            className="w-full md:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors shadow-lg shadow-blue-600/20"
                        >
                            Publish Listing
                        </button>
                    ) : (
                        <a
                            href={shareUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-block w-full md:w-auto px-8 py-3 border border-slate-700 hover:bg-slate-800 text-white font-bold rounded-lg transition-colors text-center"
                        >
                            View Live Listing
                        </a>
                    )}
                </div>
            </div>

            {/* Main Content Grid */}
            <div className={`grid grid-cols-1 lg:grid-cols-2 gap-8 ${isDraft ? 'opacity-50 pointer-events-none' : ''}`}>

                {/* LEFT COLUMN */}
                <div className="space-y-8">

                    {/* Link Block */}
                    <div className="bg-[#040814] p-6 rounded-xl border border-slate-800">
                        <label className="block text-slate-300 font-bold mb-3">Share Link</label>
                        <div className="flex bg-[#0B1121] rounded-lg border border-slate-700 overflow-hidden">
                            <input
                                type="text"
                                readOnly
                                value={shareUrl}
                                className="flex-1 bg-transparent text-slate-300 px-4 py-3 outline-none font-mono text-sm"
                            />
                            <button
                                onClick={() => handleCopy(shareUrl, setCopiedLink)}
                                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors border-l border-slate-700"
                            >
                                {copiedLink ? 'Copied!' : 'Copy Link'}
                            </button>
                            <a
                                href={shareUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="hidden sm:flex items-center px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-colors border-l border-slate-700"
                            >
                                Open
                            </a>
                        </div>
                        <p className="text-slate-500 text-sm mt-3">Use this link for social, email, and DMs.</p>
                    </div>

                    {/* Open House Pack Block */}
                    <div className="bg-[#040814] p-6 rounded-xl border border-slate-800">
                        <h3 className="text-white font-bold mb-2 text-lg">Open House Pack</h3>
                        <p className="text-slate-400 text-sm mb-5">Capture every walk-in with one QR.</p>

                        <div className="flex flex-col sm:flex-row gap-4 mb-4">
                            <button className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg transition-colors text-sm text-center border border-slate-700">
                                Create Open House Flyer (PDF)
                            </button>
                            <button className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg transition-colors text-sm text-center border border-slate-700">
                                Create Sign Rider (PDF)
                            </button>
                        </div>
                        <p className="text-slate-500 text-xs">Print-ready files generated with this listing's link + QR.</p>
                    </div>

                    {/* Social Pack Block */}
                    <div className="bg-[#040814] p-6 rounded-xl border border-slate-800">
                        <h3 className="text-white font-bold mb-4 text-lg">Social Pack</h3>

                        <div className="flex flex-col sm:flex-row gap-4 mb-6">
                            <button className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg transition-colors text-sm text-center border border-slate-700">
                                Create IG Post
                            </button>
                            <button className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg transition-colors text-sm text-center border border-slate-700">
                                Create IG Story
                            </button>
                        </div>

                        <div className="bg-[#0B1121] rounded-lg p-4 border border-slate-800">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Caption Template</span>
                                <button
                                    onClick={() => handleCopy(captionTemplate, setCopiedCaption)}
                                    className="text-blue-500 text-xs font-bold hover:text-blue-400"
                                >
                                    {copiedCaption ? 'Copied!' : 'Copy Caption'}
                                </button>
                            </div>
                            <p className="text-slate-300 text-sm whitespace-pre-wrap font-mono">
                                {captionTemplate}
                            </p>
                        </div>
                    </div>

                </div>


                {/* RIGHT COLUMN */}
                <div className="space-y-8">

                    {/* QR Code Block */}
                    <div className="bg-[#040814] p-6 rounded-xl border border-slate-800 flex flex-col items-center">
                        <div className="w-full flex justify-between items-center mb-6">
                            <h3 className="text-white font-bold text-lg">QR Codes</h3>

                            {/* Simple Dropdown for QR Source Type */}
                            <select
                                value={qrSource}
                                onChange={(e) => setQrSource(e.target.value as 'sign' | 'open_house' | 'social')}
                                className="bg-slate-900 border border-slate-700 text-white text-sm rounded-lg px-3 py-1.5 outline-none font-semibold cursor-pointer"
                            >
                                <option value="sign">Sign QR</option>
                                <option value="open_house">Open House QR</option>
                                <option value="social">Social QR</option>
                            </select>
                        </div>

                        {/* Interactive QR Display */}
                        <div className="bg-white p-4 rounded-3xl w-64 h-64 mb-6 shadow-xl">
                            <img src={qrImageUrl} alt="QR Code" className="w-full h-full object-contain" />
                        </div>

                        <div className="w-full grid grid-cols-3 gap-3 mb-4">
                            <button className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold rounded-lg transition-colors">
                                Download PNG
                            </button>
                            <button className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold rounded-lg transition-colors">
                                Download SVG
                            </button>
                            <button
                                onClick={() => handleCopy(trackingUrl, () => { })}
                                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold rounded-lg transition-colors"
                            >
                                Copy QR Link
                            </button>
                        </div>
                        <p className="text-slate-500 text-xs text-center">
                            QRs track where leads come from (sign, open house, social).
                        </p>
                    </div>

                    {/* Test Lead Block */}
                    <div className="bg-[#040814] p-6 rounded-xl border border-slate-800">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h3 className="text-white font-bold text-lg">Test It</h3>
                                <p className="text-slate-400 text-sm mt-1">Send a test lead to your inbox to make sure everything is working.</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsTestModalOpen(true)}
                            className="w-full mt-4 px-4 py-3 border-2 border-slate-700 hover:border-slate-600 text-slate-300 font-bold rounded-lg transition-colors bg-transparent"
                        >
                            Send a Test Lead
                        </button>
                    </div>

                    {/* Stats / Performance Block */}
                    {stats && stats.leadsCaptured > 0 && (
                        <div className="bg-[#040814] p-6 rounded-xl border border-slate-800">
                            <div className="flex justify-between items-center mb-5">
                                <h3 className="text-white font-bold text-lg">What's working <span className="text-slate-500 text-sm font-normal ml-2">(last 7 days)</span></h3>
                            </div>
                            <div className="grid grid-cols-3 gap-4 mb-4">
                                <div className="bg-[#0B1121] border border-slate-800 rounded-lg p-3 text-center">
                                    <div className="text-2xl font-black text-white">{stats.leadsCaptured}</div>
                                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Leads Captured</div>
                                </div>
                                <div className="bg-[#0B1121] border border-slate-800 rounded-lg p-3 text-center">
                                    <div className="text-lg font-black text-blue-400 truncate">{stats.topSource}</div>
                                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Top Source</div>
                                </div>
                                <div className="bg-[#0B1121] border border-slate-800 rounded-lg p-3 text-center">
                                    <div className="text-lg font-black text-white truncate">{stats.lastLeadAgo}</div>
                                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Last Lead</div>
                                </div>
                            </div>
                            <a href="#" className="text-blue-500 text-sm font-bold hover:text-blue-400">View full performance &rarr;</a>
                        </div>
                    )}
                </div>
            </div>

            {/* Test Lead Modal Overlay */}
            {isTestModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#0B1121] border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white">Send Test Lead</h3>
                            <button onClick={() => setIsTestModalOpen(false)} className="text-slate-400 hover:text-white">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleTestSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-slate-400 text-sm font-bold mb-2">Name</label>
                                <input
                                    type="text"
                                    required
                                    value={testName}
                                    onChange={e => setTestName(e.target.value)}
                                    className="w-full bg-[#040814] border border-slate-700 text-white rounded-lg px-4 py-3 outline-none focus:border-blue-500"
                                    placeholder="John Doe"
                                />
                            </div>
                            <div>
                                <label className="block text-slate-400 text-sm font-bold mb-2">Email or Phone</label>
                                <input
                                    type="text"
                                    required
                                    value={testContact}
                                    onChange={e => setTestContact(e.target.value)}
                                    className="w-full bg-[#040814] border border-slate-700 text-white rounded-lg px-4 py-3 outline-none focus:border-blue-500"
                                    placeholder="john@example.com"
                                />
                            </div>
                            <div>
                                <label className="block text-slate-400 text-sm font-bold mb-2">Context</label>
                                <select
                                    value={testContext}
                                    onChange={e => setTestContext(e.target.value)}
                                    className="w-full bg-[#040814] border border-slate-700 text-white rounded-lg px-4 py-3 outline-none focus:border-blue-500 cursor-pointer"
                                >
                                    <option>Report requested</option>
                                    <option>Showing requested</option>
                                </select>
                            </div>
                            <button
                                type="submit"
                                disabled={testSubmitting}
                                className="w-full mt-6 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
                            >
                                {testSubmitting ? 'Sending...' : 'Submit Test Lead'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {isDraft && (
                <div className="mt-8 pt-6 border-t border-slate-800 text-center">
                    <p className="text-slate-500">Publish your listing to unlock the link, QR codes, and marketing packs.</p>
                </div>
            )}
        </div>
    );
};
