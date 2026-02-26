import React from 'react';

import SEO from '../components/SEO';
import { PublicHeader } from '../components/layout/PublicHeader';
import { PublicFooter } from '../components/layout/PublicFooter';
import AdminCommandCenter from '../admin-dashboard/components/AdminCommandCenter';
import AdminDashboardSidebar from '../admin-dashboard/AdminDashboardSidebar';
import { BackgroundTechIcons } from '../components/BackgroundTechIcons';

interface WhiteLabelPageProps {
    onOpenContact: () => void;
    onNavigateToAdmin: () => void;
    onNavigateToSignUp?: () => void;
    onNavigateToSignIn?: () => void;
    onEnterDemoMode?: () => void;
}

const WhiteLabelPage: React.FC<WhiteLabelPageProps> = ({
    onOpenContact,
    onNavigateToAdmin,
    onNavigateToSignUp = () => { },
    onNavigateToSignIn = () => { },
    onEnterDemoMode = () => { }
}) => {


    React.useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="min-h-screen bg-[#02050D] font-sans text-white relative overflow-hidden">
            <SEO
                title="White Label Solutions"
                description="Custom AI Real Estate Platforms for Brokerages and Teams."
            />

            <PublicHeader
                onNavigateToSignUp={onNavigateToSignUp}
                onNavigateToSignIn={onNavigateToSignIn}
                onEnterDemoMode={onEnterDemoMode}
                onOpenContact={onOpenContact}
            />

            <BackgroundTechIcons />

            <main className="pt-20 relative z-10">
                {/* 1. HERO SECTION */}
                <div className="relative pt-24 pb-20 overflow-hidden">
                    {/* Abstract background elements */}
                    <div className="absolute top-20 left-10 w-[500px] h-[500px] bg-cyan-900/10 rounded-full blur-[120px] pointer-events-none -translate-x-1/2"></div>
                    <div className="absolute top-20 right-10 w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none translate-x-1/2"></div>
                    <div className="absolute top-1/2 left-1/2 w-full h-[800px] bg-gradient-to-b from-transparent via-[#02050D] to-[#02050D] pointer-events-none -translate-x-1/2"></div>

                    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-medium text-sm mb-8 animate-fade-in-up backdrop-blur-sm shadow-[0_0_15px_rgba(6,182,212,0.15)]">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                            </span>
                            Enterprise & Brokerage Solutions
                        </div>

                        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6 animate-fade-in-up animation-delay-200 flex flex-col items-center">
                            <span>Imagine If You</span>
                            <div className="h-1 w-full max-w-2xl bg-gradient-to-r from-cyan-600 via-blue-600 to-cyan-600 rounded-full my-6 animate-gradient bg-300%"></div>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                                Had Agents Working 24/7 <br className="hidden md:block" />
                                All Under Your Control
                            </span>
                        </h1>

                        <p className="mt-8 text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed animate-fade-in-up font-light animation-delay-400">
                            Entice agents and dominate your market with a custom-built AI platform that carries
                            <strong className="text-white font-semibold"> your brand</strong>, <strong className="text-white font-semibold">your voice</strong>, and <strong className="text-white font-semibold">your rules</strong>.
                        </p>

                        <div className="mt-12 flex justify-center gap-4 animate-fade-in-up animation-delay-600">
                            <button onClick={onOpenContact} className="px-8 py-4 bg-white text-slate-950 font-bold rounded-xl hover:bg-slate-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)]">
                                Get Your Custom Build
                            </button>
                            <button onClick={onEnterDemoMode} className="px-8 py-4 bg-white/5 border border-slate-700/50 text-white font-bold rounded-xl hover:bg-white/10 transition-all backdrop-blur-sm">
                                View Live Demo
                            </button>
                        </div>

                        {/* Dashboard Mockup floating below hero */}
                        <div className="mt-24 relative mx-auto max-w-7xl animate-fade-in-up animation-delay-600 px-4 sm:px-6 lg:px-8">
                            <div className="group relative rounded-2xl border border-slate-800/60 bg-[#0B1121] shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-all overflow-hidden aspect-[16/10]">
                                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 blur-xl opacity-50 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 pointer-events-none"></div>

                                {/* Scaled Container for Dashboard Preview */}
                                <div className="absolute inset-0 bg-[#0B1121] overflow-hidden rounded-xl border border-slate-800/50">
                                    <div className="w-[160%] h-[160%] origin-top-left transform scale-[0.625] pointer-events-none select-none flex h-full">

                                        {/* Sidebar (Forced Open) */}
                                        <AdminDashboardSidebar
                                            activeView="dashboard"
                                            setView={() => { }}
                                            isOpen={true}
                                            onClose={() => { }}
                                        />

                                        {/* Main Content Area */}
                                        <div className="flex-1 flex flex-col h-full min-h-screen bg-[#050B14] overflow-hidden">
                                            {/* Mock Header */}
                                            <header className="flex items-center justify-between p-4 bg-[#0B1121] border-b border-slate-800/60 shadow-sm z-10">
                                                <div className="w-64"></div> {/* Spacer for where search might be */}
                                                <div className="flex items-center gap-4">
                                                    <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700"></div>
                                                    <div className="w-8 h-8 rounded-full bg-cyan-600 text-white flex items-center justify-center text-xs font-bold ring-2 ring-cyan-500/30">JD</div>
                                                </div>
                                            </header>

                                            {/* Dashboard Content */}
                                            <main className="flex-1 overflow-y-auto p-6">
                                                <AdminCommandCenter isDemoMode={true} />
                                            </main>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. SERVICES GRID */}
                <div className="py-24 relative z-10">
                    <div className="max-w-7xl mx-auto px-4">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-bold text-white tracking-tight">Get Leads. Nurture Leads. Close Leads. Repeat.</h2>
                            <p className="mt-4 text-slate-400 font-light text-lg">The exact stack your agents need to thrive in 2024.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            {[
                                { icon: 'ads_click', title: 'Lead Gen', desc: 'Auto-capture from FB & IG' },
                                { icon: 'forum', title: 'AI Nurture', desc: 'Instant SMS & Email replies' },
                                { icon: 'calendar_month', title: 'Booking', desc: 'Auto-scheduled tours' },
                                { icon: 'verified', title: 'Closing', desc: 'Transaction coordination' }
                            ].map((item, i) => (
                                <div key={i} className="p-8 rounded-2xl bg-[#0B1121]/50 backdrop-blur-md border border-slate-800/60 hover:border-cyan-500/30 hover:shadow-[0_0_30px_rgba(6,182,212,0.1)] transition-all group text-center cursor-default h-full flex flex-col items-center">
                                    <div className="w-16 h-16 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-inner border border-slate-700/50 flex items-center justify-center text-cyan-400 mb-6 group-hover:scale-110 group-hover:text-cyan-300 transition-transform">
                                        <span className="material-symbols-outlined text-3xl">{item.icon}</span>
                                    </div>
                                    <h3 className="font-bold text-lg text-white mb-3 tracking-tight">{item.title}</h3>
                                    <p className="text-sm text-slate-400 font-light">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 3. MOBILE APP SECTION */}
                <div className="py-24 relative overflow-hidden bg-[#050B14]">
                    <div className="absolute inset-0 bg-grid-slate-800/[0.04] bg-[size:32px_32px]"></div>
                    <div className="max-w-7xl mx-auto px-4 relative z-10">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                            <div className="relative">
                                <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-full blur-[80px] pointer-events-none"></div>
                                <img
                                    src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=800"
                                    alt="Mobile App Interface"
                                    className="relative rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] border-8 border-slate-800 mx-auto max-w-xs rotate-3 hover:rotate-0 transition-all duration-700 object-cover"
                                />
                            </div>
                            <div>
                                <div className="inline-block px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold text-sm mb-6 shadow-[0_0_15px_rgba(59,130,246,0.15)] backdrop-blur-sm">
                                    Mobile First
                                </div>
                                <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6 tracking-tight leading-tight">
                                    Turn Every Listing <br />
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Into a Lead Magnet</span>
                                </h2>
                                <p className="text-lg text-slate-400 font-light mb-10 leading-relaxed">
                                    Give every agent a branded mobile experience. Clients can search, book tours, and chat with your AI—all under your brokerage's logo.
                                </p>

                                <ul className="space-y-5">
                                    {[
                                        'Custom Branded Mobile Interface',
                                        'Instant Push Notifications for Leads',
                                        'One-Click Tour Booking',
                                        'Integrated Mortgage Calculators'
                                    ].map((feature, i) => (
                                        <li key={i} className="flex items-center gap-4 bg-[#0B1121]/50 p-3 rounded-xl border border-slate-800/40">
                                            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                                                <span className="material-symbols-outlined text-sm font-bold">check</span>
                                            </span>
                                            <span className="text-slate-300 font-medium">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 4. PRICING SECTION */}
                <div className="py-24 relative z-10" id="pricing">
                    <div className="max-w-5xl mx-auto px-4">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">Transparent Partnership Pricing</h2>
                            <p className="mt-4 text-slate-400 text-lg font-light">Straightforward costs. Infinite ROI.</p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch pt-4">
                            {/* Build Card */}
                            <div className="p-10 rounded-3xl border border-slate-800/60 bg-[#0B1121]/80 backdrop-blur-md hover:border-cyan-500/30 hover:shadow-[0_0_30px_rgba(6,182,212,0.1)] transition-all relative overflow-hidden flex flex-col">
                                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                                    <span className="material-symbols-outlined text-9xl text-white">architecture</span>
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">The Custom Build</h3>
                                <div className="flex items-end gap-2 mb-2">
                                    <span className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400">$2,500</span>
                                    <span className="text-slate-500 font-medium pb-1">starting one-time</span>
                                </div>
                                <p className="text-xs text-slate-500 mb-8 font-light italic">Final quote depends on team size & org structure.</p>

                                <p className="text-slate-300 font-light mb-8 flex-grow">
                                    A complete white-label setup of the entire HomeListingAI infrastructure, tailored to your brand.
                                </p>
                                <ul className="space-y-4 mb-10 pb-4 border-b border-slate-800/50">
                                    {[
                                        'Custom Domain Setup',
                                        'Brand Color & Logo Integration',
                                        'Marketing Engine (Blogs, Email, SEO)',
                                        'Team Onboarding Session',
                                        'Migration Assistance'
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-start gap-3 text-sm text-slate-400">
                                            <span className="material-symbols-outlined text-cyan-500 text-lg flex-shrink-0 mt-0.5">check_circle</span>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                                <div className="mt-auto">
                                    <button onClick={onOpenContact} className="w-full py-4 px-6 rounded-xl border border-slate-700 bg-slate-800/50 text-white font-bold hover:bg-slate-700 hover:border-slate-600 transition-all text-sm uppercase tracking-wider">
                                        Consultation
                                    </button>
                                </div>
                            </div>

                            {/* Monthly Card */}
                            <div className="p-10 rounded-3xl bg-gradient-to-b from-[#0B1121] to-[#050B14] border border-cyan-500/30 shadow-[0_0_40px_rgba(6,182,212,0.15)] relative overflow-hidden transform lg:-translate-y-6 flex flex-col z-10">
                                <div className="absolute -top-20 -right-20 pointer-events-none">
                                    <div className="w-[300px] h-[300px] bg-blue-500/20 rounded-full blur-[80px]"></div>
                                </div>

                                <div className="inline-block self-start px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 text-[10px] font-black tracking-widest uppercase mb-6 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                                    Most Popular
                                </div>

                                <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">Monthly Partnership</h3>
                                <div className="flex items-end gap-2 mb-2">
                                    <span className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-cyan-300 to-blue-500">$750</span>
                                    <span className="text-slate-400 font-medium pb-1">starting /month</span>
                                </div>
                                <p className="text-xs text-slate-500 mb-8 font-light italic">Final quote depends on team size & org structure.</p>

                                <p className="text-slate-300 font-light mb-8 flex-grow">
                                    Ongoing maintenance, server costs, and continual access to the best emerging AI models.
                                </p>
                                <ul className="space-y-4 mb-10 pb-4 border-b border-slate-800/50">
                                    {[
                                        'Unlimited Agent Accounts',
                                        '24/7 Server Uptime Monitoring',
                                        'Omnichannel Marketing Tools',
                                        'New Feature Rollouts (Weekly)',
                                        'Priority Tech Support',
                                        'Trainable AI (Your Brand Voice)',
                                        'Always up-to-date AI Models'
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                                            <span className="material-symbols-outlined text-cyan-400 text-lg flex-shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                                <div className="mt-auto">
                                    <button onClick={onOpenContact} className="w-full py-4 px-6 rounded-xl bg-white text-slate-950 font-bold hover:bg-slate-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)] text-sm uppercase tracking-wider">
                                        Start Partnership
                                    </button>
                                </div>
                            </div>
                        </div>

                        <p className="text-center text-slate-500 text-sm mt-12 font-light italic">
                            * Prices vary based on team size, specific needs, and other AI-related costs.
                        </p>
                    </div>
                </div>

                {/* 5. TESTIMONIALS */}
                <div className="py-24 relative z-10 bg-[#050B14]">
                    <div className="max-w-7xl mx-auto px-4">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">Brokerages We've Scaled</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {[
                                {
                                    quote: "We looked at building this internally, but the cost was astronomical. HomeListingAI built us a custom solution in 2 weeks.",
                                    author: "Sarah Jenkins",
                                    role: "Broker Owner, LuxeEstates"
                                },
                                {
                                    quote: "The 'Digital DNA' feature is scary good. I fed it my last 500 emails, and now it writes exactly like me.",
                                    author: "Marcus Thorne",
                                    role: "Team Lead, Thorne Group"
                                },
                                {
                                    quote: "Recruitment holds have dropped by 40% because new agents are blown away by the tech stack we provide.",
                                    author: "Elena Rodriguez",
                                    role: "VP of Operations"
                                }
                            ].map((review, i) => (
                                <div key={i} className="bg-[#0B1121]/80 backdrop-blur-sm p-8 rounded-3xl border border-slate-800/60 shadow-lg relative">
                                    <span className="material-symbols-outlined absolute top-6 right-6 text-6xl text-slate-800 opacity-50 pointer-events-none" style={{ fontVariationSettings: "'FILL' 1" }}>format_quote</span>
                                    <div className="flex gap-1 text-cyan-400 mb-6">
                                        {[...Array(5)].map((_, r) => (
                                            <span key={r} className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                        ))}
                                    </div>
                                    <p className="text-slate-300 italic mb-8 font-light leading-relaxed relative z-10">"{review.quote}"</p>
                                    <div className="relative z-10 border-t border-slate-800/50 pt-4">
                                        <p className="font-bold text-white tracking-tight">{review.author}</p>
                                        <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider">{review.role}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 6. CTA BOTTOM */}
                <div className="py-32 relative overflow-hidden flex items-center justify-center border-t border-slate-800/50">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.1)_0%,rgba(2,5,13,1)_70%)]"></div>
                    <div className="relative max-w-4xl mx-auto px-4 text-center z-10">
                        <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6 tracking-tight">Ready to Own Your Tech Stack?</h2>
                        <p className="text-xl text-slate-400 font-light mb-12 max-w-2xl mx-auto">
                            Stop renting generic tools. Start building your legacy using our infrastructure.
                        </p>
                        <button onClick={onOpenContact} className="px-10 py-5 bg-white text-slate-950 font-bold rounded-xl shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:bg-slate-200 transition-all transform hover:-translate-y-1 text-lg uppercase tracking-wider">
                            Schedule a Consultation
                        </button>
                    </div>
                </div>
            </main>

            <PublicFooter onNavigateToAdmin={onNavigateToAdmin} />
        </div>
    );
};

export default WhiteLabelPage;
