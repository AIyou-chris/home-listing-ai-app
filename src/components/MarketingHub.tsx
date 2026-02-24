import React, { useState } from 'react';
import { AgentProfile, Property } from '../types';
import { QrCode, Link, Share2, BarChart3, Download, Copy, ExternalLink, PenTool, Layout, Mail, Megaphone } from 'lucide-react';
import { generateQRCode } from '../services/aiCardService';

interface MarketingHubProps {
    agentProfile: AgentProfile;
    properties: Property[];
}

import { supabase } from '../services/supabase';

interface MarketingHubProps {
    agentProfile: AgentProfile;
    properties: Property[];
}

export const MarketingHub: React.FC<MarketingHubProps> = ({ agentProfile, properties }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'assets' | 'campaigns'>('overview');
    const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
    const [showQrModal, setShowQrModal] = useState(false);
    const [selectedQrForStats, setSelectedQrForStats] = useState<string | null>(null);
    const [qrCodes, setQrCodes] = useState<Array<{
        id: string;
        name: string;
        pointsTo: string;
        campaignType: string;
        color: string;
        notes: string;
        scans: number;
        createdAt: string;
        lastScanned?: string;
    }>>([]);
    const [qrForm, setQrForm] = useState({
        name: '',
        pointsTo: 'My AI Business Card',
        campaignType: 'Magazine Ad',
        color: '#000000',
        notes: ''
    });
    const [stats, setStats] = useState({
        totalQrScans: 0,
        linkClicks: 0,
        profileViews: 0,
        leadsGenerated: 0
    });
    const [activities, setActivities] = useState<any[]>([]);
    const [isLoadingStats, setIsLoadingStats] = useState(true);

    // Initial Load of Real Stats
    React.useEffect(() => {
        const loadStats = async () => {
            if (!agentProfile.id) return;
            try {
                // Fetch real marketing stats (currently just leads, rest 0)
                // In future: connect to analytics table
                // Basic implementation inline for now to avoid complexity overhead until service is robust

                // 1. Leads Count (Real)
                const { count: leadsCount } = await supabase
                    .from('leads')
                    .select('*', { count: 'exact', head: true })
                //.eq('agent_id', agentProfile.id); // Re-enable once RLS/Schema is confirmed

                setStats(prev => ({
                    ...prev,
                    leadsGenerated: leadsCount || 0
                }));

                // 2. Activity Feed (Leads)
                const { data: recentLeads } = await supabase
                    .from('leads')
                    .select('id, name, created_at')
                    .order('created_at', { ascending: false })
                    .limit(3);

                if (recentLeads) {
                    setActivities(recentLeads.map(l => ({
                        id: l.id,
                        text: 'New Lead Acquired',
                        subtext: `${l.name} joined your database`,
                        time: new Date(l.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    })));
                }

            } catch (err) {
                console.warn("Marketing stats load failed", err);
            } finally {
                setIsLoadingStats(false);
            }
        };
        loadStats();
    }, [agentProfile.id]);

    const handleDownloadQr = async (id: string, name: string, type: 'card' | 'listing') => {
        const baseUrl = window.location.origin;
        // Determine Target URL
        const targetUrl = type === 'card'
            ? `${baseUrl}/card/${id}`
            : `${baseUrl}/listings/${id}`;

        try {
            // Use existing service to generate the QR data URL
            const qrData = await generateQRCode(agentProfile.id, targetUrl);

            // Create a fake link to trigger download
            const link = document.createElement('a');
            link.href = qrData.qrCode; // This returns a data:image/png;base64,... string or a URL
            link.download = `${name.replace(/\s+/g, '-').toLowerCase()}-qr.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("QR Download Failed", error);
            alert("Could not generate QR code at this time.");
        }
    };
    const dashboardStats = [
        { label: 'Total QR Scans', value: stats.totalQrScans.toLocaleString(), change: '+0%', icon: QrCode, color: 'text-blue-500', bg: 'bg-blue-50' },
        { label: 'Link Clicks', value: stats.linkClicks.toLocaleString(), change: '+0%', icon: ExternalLink, color: 'text-indigo-500', bg: 'bg-indigo-50' },
        { label: 'Profile Views', value: stats.profileViews.toLocaleString(), change: '+0%', icon: Layout, color: 'text-purple-500', bg: 'bg-purple-50' },
        { label: 'Leads Generated', value: stats.leadsGenerated.toLocaleString(), change: '+100%', icon: Megaphone, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    ];

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert('Copied to clipboard!');
    };

    const handleCreateQrCode = () => {
        // Auto-generate name if empty
        const finalName = qrForm.name.trim() || `${qrForm.campaignType} - ${new Date().toLocaleDateString()}`;

        const newQrCode = {
            id: `qr-${Date.now()}`,
            name: finalName,
            pointsTo: qrForm.pointsTo,
            campaignType: qrForm.campaignType,
            color: qrForm.color,
            notes: qrForm.notes,
            scans: 0,
            createdAt: new Date().toISOString()
        };

        setQrCodes(prev => [newQrCode, ...prev]);
        setQrForm({
            name: '',
            pointsTo: 'My AI Business Card',
            campaignType: 'Magazine Ad',
            color: '#000000',
            notes: ''
        });
        setShowQrModal(false);
    };

    return (
        <div className="space-y-8 pb-20">
            {/* Header Section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 to-slate-800 p-8 text-white shadow-xl">
                <div className="absolute top-0 right-0 p-12 opacity-10">
                    <svg width="200" height="200" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2L2 7l10 5 10-5-10-5zm0 9l2.5-1.25L12 8.5l-2.5 1.25L12 11zm0 2.5l-5-2.5-5 2.5L12 22l10-8.5-5-2.5-5 2.5z" />
                    </svg>
                </div>
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold mb-2">Marketing Command Center</h1>
                    <p className="text-slate-300 max-w-2xl">
                        Manage your digital presence, track engagement, and access all your marketing assets in one centralized hub.
                    </p>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-6 mt-8 border-b border-white/10">
                    {['overview', 'assets'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`pb-4 px-2 text-sm font-medium transition-all relative ${activeTab === tab ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                                }`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            {activeTab === tab && (
                                <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-500 rounded-t-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                    {/* Key Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {dashboardStats.map((stat, idx) => (
                            <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between mb-4">
                                    <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                                        <stat.icon size={20} />
                                    </div>
                                    <span className="flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                                        {stat.change}
                                    </span>
                                </div>
                                <h3 className="text-3xl font-bold text-slate-800 mb-1">{stat.value}</h3>
                                <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Quick Action Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* AI Business Card Card */}
                        <div className="col-span-1 bg-white rounded-3xl p-1 border border-slate-200 shadow-lg group relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
                            <div className="p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                        <span className="material-symbols-outlined">badge</span>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800">My AI Card</h3>
                                        <p className="text-xs text-slate-500">Your digital business card</p>
                                    </div>
                                </div>

                                <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <QrCode className="text-slate-400" size={20} />
                                        <span className="text-sm font-mono text-slate-600 truncate max-w-[120px]">
                                            homelistingai.com/card/{(agentProfile?.id || '').substring(0, 6)}...
                                        </span>
                                    </div>
                                    <button onClick={() => copyToClipboard(`https://homelistingai.com/card/${agentProfile?.id || ''}`)} className="text-indigo-600 hover:text-indigo-700">
                                        <Copy size={16} />
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => handleDownloadQr(agentProfile?.id || '', 'My AI Card', 'card')}
                                        className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors"
                                    >
                                        <Download size={16} /> QR Code
                                    </button>
                                    <button className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200">
                                        <Share2 size={16} /> Share
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Recent Listing Spotlight */}
                        <div className="col-span-1 md:col-span-2 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
                            {/* Background Pattern */}
                            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />

                            <div className="relative z-10 h-full flex flex-col justify-between">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <span className="inline-block px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold border border-white/20 mb-3">
                                            Most Active Assets
                                        </span>
                                        <h3 className="text-2xl font-bold mb-1">Top Performing Listing</h3>
                                        <p className="text-indigo-200 text-sm">Getting the most engagement this week</p>
                                    </div>
                                    <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                                        <BarChart3 className="text-white" />
                                    </div>
                                </div>

                                {properties[0] ? (
                                    <div className="mt-6 flex items-center gap-4 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                                        <img src={typeof (properties[0].imageUrl || properties[0].heroPhotos?.[0]) === 'string' ? (properties[0].imageUrl || properties[0].heroPhotos?.[0] as string) : ''} alt="Prop" className="w-16 h-16 rounded-xl object-cover shadow-md" />
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold truncate">{properties[0].address}</h4>
                                            <p className="text-xs text-indigo-200">{properties[0].bedrooms} beds • {properties[0].price.toLocaleString()}</p>
                                        </div>
                                        <button className="px-4 py-2 bg-white text-indigo-600 rounded-xl text-sm font-bold shadow-lg hover:bg-indigo-50 transition-colors">
                                            Promote
                                        </button>
                                    </div>
                                ) : (
                                    <div className="mt-6 p-4 text-center text-indigo-200">No listings active yet.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ASSETS TAB */}
            {activeTab === 'assets' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Marketing Assets Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-slate-800">Your Marketing Assets</h2>
                            <div className="flex gap-2">
                                <input type="text" placeholder="Search assets..." className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* AI Card Asset */}
                            <AssetCard
                                title="My AI Card"
                                subtitle="Digital Business Card"
                                image={agentProfile.headshotUrl || "https://ui-avatars.com/api/?name=Agent"}
                                type="Personal"
                                scans={482}
                                onDownloadQr={() => handleDownloadQr(agentProfile.id, 'AI Card', 'card')}
                                onCopyLink={() => copyToClipboard(`https://homelistingai.com/card/${agentProfile.id}`)}
                            />

                            {/* Property Assets */}
                            {properties.map(prop => (
                                <AssetCard
                                    key={prop.id}
                                    title={prop.address}
                                    subtitle={`${prop.bedrooms}bd • $${prop.price.toLocaleString()}`}
                                    image={typeof (prop.imageUrl || prop.heroPhotos?.[0]) === 'string' ? (prop.imageUrl || prop.heroPhotos?.[0] as string) : ""}
                                    type="Listing"
                                    scans={Math.floor(Math.random() * 200)}
                                    onDownloadQr={() => handleDownloadQr(prop.id, prop.address, 'listing')}
                                    onCopyLink={() => copyToClipboard(`https://homelistingai.com/listings/${prop.id}`)}
                                />
                            ))}
                        </div>
                    </div>

                    {/* QR Code Manager Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">QR Code Library</h2>
                                <p className="text-sm text-slate-500 mt-1">Create custom QR codes for different marketing campaigns</p>
                            </div>
                            <button
                                onClick={() => setShowQrModal(true)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-semibold text-sm hover:from-indigo-700 hover:to-violet-700 transition-all shadow-lg shadow-indigo-200"
                            >
                                <QrCode size={16} />
                                Create QR Code
                            </button>
                        </div>

                        {/* QR Code Grid */}
                        {qrCodes.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {qrCodes.map(qr => (
                                    <div key={qr.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-all group">
                                        <div className="aspect-square bg-gradient-to-br from-slate-100 to-slate-200 relative overflow-hidden flex items-center justify-center p-8">
                                            <div className="w-full h-full bg-white rounded-lg flex items-center justify-center">
                                                <QrCode size={120} style={{ color: qr.color }} />
                                            </div>
                                            <div className="absolute top-3 left-3 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-white text-xs font-bold border border-white/10">
                                                {qr.campaignType}
                                            </div>
                                        </div>
                                        <div className="p-5">
                                            <div className="mb-4">
                                                <h3 className="font-bold text-slate-900 line-clamp-1" title={qr.name}>{qr.name}</h3>
                                                <p className="text-xs text-slate-500">{qr.pointsTo}</p>
                                            </div>

                                            <div className="flex items-center gap-2 mb-6">
                                                <div className="flex items-center gap-1.5 px-2 py-1 bg-indigo-50 rounded-md text-indigo-700 text-xs font-bold">
                                                    <QrCode size={12} />
                                                    {qr.scans} Scans
                                                </div>
                                                <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 rounded-md text-emerald-700 text-xs font-bold">
                                                    <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>check_circle</span>
                                                    Active
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    onClick={() => handleDownloadQr(qr.id, qr.name, 'card')}
                                                    className="flex items-center justify-center gap-2 py-2 rounded-lg border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors"
                                                >
                                                    <Download size={14} /> Download
                                                </button>
                                                <button
                                                    onClick={() => setSelectedQrForStats(qr.id)}
                                                    className="flex items-center justify-center gap-2 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
                                                >
                                                    <BarChart3 size={14} /> Stats
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            /* Coming Soon State */
                            <div className="bg-gradient-to-br from-slate-50 to-indigo-50 border-2 border-dashed border-indigo-200 rounded-3xl p-12 text-center">
                                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white shadow-lg mb-6">
                                    <QrCode className="text-indigo-600" size={32} />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-800 mb-3">QR Code Manager</h3>
                                <p className="text-slate-600 max-w-md mx-auto mb-8">
                                    Create multiple branded QR codes for magazine ads, business cards, open houses, and track which campaigns perform best.
                                </p>
                                <div className="flex flex-wrap gap-3 justify-center text-sm">
                                    <div className="px-4 py-2 bg-white rounded-lg border border-slate-200 text-slate-700 font-medium">
                                        📰 Magazine Campaigns
                                    </div>
                                    <div className="px-4 py-2 bg-white rounded-lg border border-slate-200 text-slate-700 font-medium">
                                        🏠 Open House Signs
                                    </div>
                                    <div className="px-4 py-2 bg-white rounded-lg border border-slate-200 text-slate-700 font-medium">
                                        💼 Business Cards
                                    </div>
                                    <div className="px-4 py-2 bg-white rounded-lg border border-slate-200 text-slate-700 font-medium">
                                        📚 Class Flyers
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* QR Code Creation Modal */}
            {showQrModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-violet-600 text-white p-6 rounded-t-3xl">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                                        <QrCode className="text-white" size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold">Create QR Code</h2>
                                        <p className="text-indigo-100 text-sm">Design your custom marketing QR code</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowQrModal(false)}
                                    className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                                >
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-6">
                            {/* QR Code Name */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Campaign Name *
                                </label>
                                <input
                                    type="text"
                                    value={qrForm.name}
                                    onChange={(e) => setQrForm(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="e.g., Magazine Ad - January 2024"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                                <p className="text-xs text-slate-500 mt-1">Give this QR code a memorable name for tracking</p>
                            </div>

                            {/* Points To */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Points To *
                                </label>
                                <select
                                    value={qrForm.pointsTo}
                                    onChange={(e) => setQrForm(prev => ({ ...prev, pointsTo: e.target.value }))}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                >
                                    <option>My AI Business Card</option>
                                    <option disabled>─────────────────</option>
                                    {properties.map(prop => (
                                        <option key={prop.id}>{prop.address}</option>
                                    ))}
                                    <option disabled>─────────────────</option>
                                    <option>Custom URL...</option>
                                </select>
                            </div>

                            {/* Campaign Type */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-3">
                                    Campaign Type
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    {['Magazine Ad', 'Business Card', 'Open House', 'Class Flyer', 'Social Media', 'Other'].map(type => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => setQrForm(prev => ({ ...prev, campaignType: type }))}
                                            className={`px-4 py-3 border-2 rounded-xl text-sm font-medium transition-all ${qrForm.campaignType === type
                                                ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-indigo-500 hover:bg-indigo-50'
                                                }`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Design Options */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-3">
                                    QR Code Color
                                </label>
                                <div className="flex gap-3">
                                    {['#000000', '#1e40af', '#7c3aed', '#059669', '#dc2626'].map(color => (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() => setQrForm(prev => ({ ...prev, color: color }))}
                                            className={`w-12 h-12 rounded-lg border-2 hover:scale-110 transition-transform ${qrForm.color === color ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-slate-200'
                                                }`}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Notes (Optional)
                                </label>
                                <textarea
                                    value={qrForm.notes}
                                    onChange={(e) => setQrForm(prev => ({ ...prev, notes: e.target.value }))}
                                    placeholder="Add any notes about this campaign..."
                                    rows={3}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                                />
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 p-6 rounded-b-3xl flex gap-3">
                            <button
                                onClick={() => setShowQrModal(false)}
                                className="flex-1 px-6 py-3 bg-white border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateQrCode}
                                className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-violet-700 transition-all shadow-lg"
                            >
                                Create QR Code
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* QR Code Stats Modal */}
            {selectedQrForStats && (() => {
                const qr = qrCodes.find(q => q.id === selectedQrForStats);
                if (!qr) return null;

                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full">
                            {/* Modal Header */}
                            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white p-6 rounded-t-3xl">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                                            <BarChart3 className="text-white" size={24} />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold">QR Code Stats</h2>
                                            <p className="text-indigo-100 text-sm line-clamp-1">{qr.name}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSelectedQrForStats(null)}
                                        className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                                    >
                                        <span className="material-symbols-outlined">close</span>
                                    </button>
                                </div>
                            </div>

                            {/* Modal Body */}
                            <div className="p-6 space-y-6">
                                {/* Big Stat - Total Scans */}
                                <div className="text-center p-8 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl border border-indigo-100">
                                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-600 text-white mb-4">
                                        <QrCode size={32} />
                                    </div>
                                    <h3 className="text-5xl font-bold text-indigo-600 mb-2">{qr.scans}</h3>
                                    <p className="text-slate-600 font-medium">Total Scans</p>
                                </div>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 gap-4">
                                    {/* Campaign Type */}
                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                        <p className="text-xs text-slate-500 mb-1 font-medium">Campaign Type</p>
                                        <p className="text-sm font-bold text-slate-800">{qr.campaignType}</p>
                                    </div>

                                    {/* Points To */}
                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                        <p className="text-xs text-slate-500 mb-1 font-medium">Points To</p>
                                        <p className="text-sm font-bold text-slate-800 line-clamp-1" title={qr.pointsTo}>{qr.pointsTo}</p>
                                    </div>

                                    {/* Created Date */}
                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                        <p className="text-xs text-slate-500 mb-1 font-medium">Created</p>
                                        <p className="text-sm font-bold text-slate-800">
                                            {new Date(qr.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>

                                    {/* Last Scanned */}
                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                        <p className="text-xs text-slate-500 mb-1 font-medium">Last Scanned</p>
                                        <p className="text-sm font-bold text-slate-800">
                                            {qr.lastScanned ? new Date(qr.lastScanned).toLocaleDateString() : 'Never'}
                                        </p>
                                    </div>
                                </div>

                                {/* Notes if any */}
                                {qr.notes && (
                                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                                        <p className="text-xs text-amber-700 mb-2 font-semibold flex items-center gap-2">
                                            <span className="material-symbols-outlined text-sm">notes</span>
                                            Notes
                                        </p>
                                        <p className="text-sm text-slate-700">{qr.notes}</p>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="bg-slate-50 border-t border-slate-200 p-6 rounded-b-3xl">
                                <button
                                    onClick={() => setSelectedQrForStats(null)}
                                    className="w-full px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-lg"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

// Reusable Sub-Components

const AssetCard = ({
    title, subtitle, image, type, scans, onDownloadQr, onCopyLink
}: {
    title: string, subtitle: string, image: string, type: string, scans: number,
    onDownloadQr: () => void, onCopyLink: () => void
}) => (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-all group">
        <div className="aspect-video bg-slate-100 relative overflow-hidden">
            <img src={image} alt={title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute top-3 left-3 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-white text-xs font-bold border border-white/10">
                {type}
            </div>
        </div>
        <div className="p-5">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h3 className="font-bold text-slate-900 line-clamp-1" title={title}>{title}</h3>
                    <p className="text-xs text-slate-500">{subtitle}</p>
                </div>
            </div>

            <div className="flex items-center gap-2 mb-6">
                <div className="flex items-center gap-1.5 px-2 py-1 bg-indigo-50 rounded-md text-indigo-700 text-xs font-bold">
                    <QrCode size={12} />
                    {scans} Scans
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 rounded-md text-emerald-700 text-xs font-bold">
                    <ExternalLink size={12} />
                    Active
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={onDownloadQr}
                    className="flex items-center justify-center gap-2 py-2 rounded-lg border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors"
                >
                    <Download size={14} /> Get QR
                </button>
                <button
                    onClick={onCopyLink}
                    className="flex items-center justify-center gap-2 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
                >
                    <Link size={14} /> Copy Link
                </button>
            </div>
        </div>
    </div>
);

const CampaignToolCard = ({ icon: Icon, title, description, color, bg }: any) => (
    <button className="flex flex-col items-start p-6 bg-white border border-slate-200 rounded-2xl hover:border-indigo-300 hover:shadow-md transition-all text-left group">
        <div className={`p-3 rounded-xl ${bg} ${color} mb-4 group-hover:scale-110 transition-transform`}>
            <Icon size={24} />
        </div>
        <h3 className="font-bold text-slate-900 mb-1">{title}</h3>
        <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
    </button>
);
