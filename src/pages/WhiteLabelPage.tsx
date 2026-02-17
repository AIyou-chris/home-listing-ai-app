import React from 'react';

import SEO from '../components/SEO';
import { PublicHeader } from '../components/layout/PublicHeader';
import { PublicFooter } from '../components/layout/PublicFooter';
import AdminCommandCenter from '../admin-dashboard/components/AdminCommandCenter';
import AdminDashboardSidebar from '../admin-dashboard/AdminDashboardSidebar';

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
        <div className="min-h-screen bg-slate-50 font-sans">
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

            <main className="pt-20">
                {/* 1. HERO SECTION */}
                <div className="relative pt-24 pb-20 overflow-hidden bg-white">
                    <div className="absolute top-0 left-0 right-0 h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-50 via-white to-white opacity-70"></div>

                    {/* Abstract background elements (circles/dots) matching the reference */}
                    <div className="absolute top-20 left-10 w-64 h-64 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
                    <div className="absolute top-20 right-10 w-64 h-64 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

                    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 font-medium text-sm mb-8 animate-fade-in-up">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                            </span>
                            Enterprise & Brokerage Solutions
                        </div>

                        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 mb-6 animate-fade-in-up animation-delay-200 flex flex-col items-center">
                            <span>Imagine If You</span>
                            <div className="h-1 w-full max-w-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 rounded-full my-4 animate-gradient bg-300%"></div>
                            <span className="text-slate-800">
                                Had Agents Working 24/7 <br className="hidden md:block" />
                                All Under Your Control
                            </span>
                        </h1>

                        <p className="mt-6 text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed animate-fade-in-up animation-delay-400">
                            Entice agents and dominate your market with a custom-built AI platform that carries
                            <strong> your brand</strong>, <strong>your voice</strong>, and <strong>your rules</strong>.
                        </p>

                        <div className="mt-10 flex justify-center gap-4 animate-fade-in-up animation-delay-600">
                            <button onClick={onOpenContact} className="px-8 py-4 bg-slate-900 text-white rounded-xl font-bold text-lg hover:bg-slate-800 transition-all hover:scale-105 shadow-xl shadow-indigo-500/20">
                                Get Your Custom Build
                            </button>
                            <button onClick={onEnterDemoMode} className="px-8 py-4 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold text-lg hover:bg-slate-50 transition-all hover:border-slate-300">
                                View Live Demo
                            </button>
                        </div>


                        {/* Dashboard Mockup floating below hero */}
                        <div className="mt-20 relative mx-auto max-w-7xl animate-fade-in-up animation-delay-600 px-4 sm:px-6 lg:px-8">
                            <div className="group relative rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all hover:shadow-indigo-500/10 overflow-hidden ring-1 ring-slate-900/5 aspect-[16/10]">
                                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 opacity-20 blur transition duration-1000 group-hover:duration-200 pointer-events-none"></div>

                                {/* Scaled Container for Dashboard Preview */}
                                <div className="absolute inset-0 bg-slate-50 overflow-hidden">
                                    <div className="w-[160%] h-[160%] origin-top-left transform scale-[0.625] pointer-events-none select-none flex h-full">

                                        {/* Sidebar (Forced Open) */}
                                        <AdminDashboardSidebar
                                            activeView="dashboard"
                                            setView={() => { }}
                                            isOpen={true}
                                            onClose={() => { }}
                                        />

                                        {/* Main Content Area */}
                                        <div className="flex-1 flex flex-col h-full min-h-screen bg-slate-50 overflow-hidden">
                                            {/* Mock Header */}
                                            <header className="flex items-center justify-between p-4 bg-white border-b border-slate-200 shadow-sm z-10">
                                                <div className="w-64"></div> {/* Spacer for where search might be */}
                                                <div className="flex items-center gap-4">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200"></div>
                                                    <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">JD</div>
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

                {/* 2. SERVICES GRID (Get Leads, Nurture Leads, etc.) */}
                <div className="py-24 bg-white">
                    <div className="max-w-7xl mx-auto px-4">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-bold text-slate-900">Get Leads. Nurture Leads. Close Leads. Repeat.</h2>
                            <p className="mt-4 text-slate-600">The exact stack your agents need to thrive in 2024.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            {[
                                { icon: 'ads_click', title: 'Lead Gen', desc: 'Auto-capture from FB & IG' },
                                { icon: 'forum', title: 'AI Nurture', desc: 'Instant SMS & Email replies' },
                                { icon: 'calendar_month', title: 'Booking', desc: 'Auto-scheduled tours' },
                                { icon: 'verified', title: 'Closing', desc: 'Transaction coordination' }
                            ].map((item, i) => (
                                <div key={i} className="p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/30 transition-all group text-center cursor-default">
                                    <div className="w-14 h-14 mx-auto bg-white rounded-xl shadow-sm flex items-center justify-center text-indigo-600 mb-4 group-hover:scale-110 transition-transform">
                                        <span className="material-symbols-outlined text-2xl">{item.icon}</span>
                                    </div>
                                    <h3 className="font-bold text-slate-900 mb-2">{item.title}</h3>
                                    <p className="text-sm text-slate-500">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 3. MOBILE APP SECTION ("Turn Every Listing Into an App") */}
                <div className="py-24 bg-slate-50 relative overflow-hidden">
                    <div className="max-w-7xl mx-auto px-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                            <div className="relative">
                                <div className="absolute -inset-4 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full opacity-20 blur-3xl"></div>
                                <img
                                    src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=800"
                                    alt="Mobile App Interface"
                                    className="relative rounded-3xl shadow-2xl border-8 border-white mx-auto max-w-xs rotate-3 hover:rotate-0 transition-all duration-500"
                                />
                            </div>
                            <div>
                                <div className="inline-block px-4 py-1 rounded-full bg-purple-100 text-purple-700 font-semibold text-sm mb-6">
                                    Mobile First
                                </div>
                                <h2 className="text-4xl font-bold text-slate-900 mb-6">
                                    Turn Every Listing <br />
                                    <span className="text-purple-600">Into a Lead Magnet</span>
                                </h2>
                                <p className="text-lg text-slate-600 mb-8">
                                    Give every agent a branded mobile experience. Clients can search, book tours, and chat with your AI—all under your brokerage's logo.
                                </p>

                                <ul className="space-y-4">
                                    {[
                                        'Custom Branded Mobile Interface',
                                        'Instant Push Notifications for Leads',
                                        'One-Click Tour Booking',
                                        'Integrated Mortgage Calculators'
                                    ].map((feature, i) => (
                                        <li key={i} className="flex items-center gap-3">
                                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                                                <span className="material-symbols-outlined text-sm">check</span>
                                            </span>
                                            <span className="text-slate-700 font-medium">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 4. PRICING SECTION (Requested: $3000 build / $750mo) */}
                <div className="py-24 bg-white" id="pricing">
                    <div className="max-w-4xl mx-auto px-4">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-bold text-slate-900">Transparent Partnership Pricing</h2>
                            <p className="mt-4 text-slate-600">Straightforward costs. Infinite ROI.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
                            {/* Build Card */}
                            <div className="p-8 rounded-3xl border border-slate-200 bg-white hover:border-indigo-200 transition-all relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <span className="material-symbols-outlined text-9xl">architecture</span>
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">The Custom Build</h3>
                                <div className="flex items-baseline gap-1 mb-2">
                                    <span className="text-4xl font-bold text-slate-900">$2,500</span>
                                    <span className="text-slate-500">starting one-time</span>
                                </div>
                                <p className="text-xs text-slate-400 mb-6">Final quote depends on team size and custom organization.</p>

                                <p className="text-slate-600 mb-8 min-h-[60px]">
                                    A complete white-label setup of the entire HomeListingAI infrastructure, tailored to your brand.
                                </p>
                                <ul className="space-y-4 mb-8">
                                    {[
                                        'Custom Domain Setup',
                                        'Brand Color & Logo Integration',
                                        'Marketing Engine (Blogs, Email, SEO, AIO)',
                                        'Team Onboarding Session',
                                        'Migration Assistance',
                                        'Always up-to-date using the best AI available'
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-center gap-3 text-sm text-slate-700">
                                            <span className="material-symbols-outlined text-indigo-500 text-lg">check_circle</span>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                                <div className="mt-auto">
                                    <button onClick={onOpenContact} className="w-full py-3 px-6 rounded-xl border-2 border-slate-900 text-slate-900 font-bold hover:bg-slate-50 transition-colors">
                                        Set up a Free Consultation
                                    </button>
                                </div>
                            </div>

                            {/* Monthly Card */}
                            <div className="p-8 rounded-3xl bg-slate-900 text-white shadow-xl relative overflow-hidden transform md:-translate-y-4">
                                <div className="absolute top-0 right-0 p-0 opacity-20">
                                    <svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <circle cx="100" cy="100" r="80" stroke="white" strokeWidth="20" />
                                    </svg>
                                </div>

                                <div className="inline-block px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold mb-4">
                                    MOST POPULAR
                                </div>

                                <h3 className="text-xl font-bold mb-2">Monthly Partnership</h3>
                                <div className="flex items-baseline gap-1 mb-2">
                                    <span className="text-4xl font-bold">$750</span>
                                    <span className="text-slate-400">starting /month</span>
                                </div>
                                <p className="text-xs text-slate-400 mb-6">Final quote depends on team size and custom organization.</p>

                                <p className="text-slate-300 mb-8 min-h-[60px]">
                                    Ongoing maintenance, new feature updates, and server costs included. Pricing scales with team size.
                                </p>
                                <ul className="space-y-4 mb-8">
                                    {[
                                        'Unlimited Agent Accounts',
                                        '24/7 Server Uptime Monitoring',
                                        'Omnichannel Marketing Tools',
                                        'New Feature Rollouts (Weekly)',
                                        'Priority Tech Support',
                                        'Trainable AI (Your Brand Voice)',
                                        'Always up-to-date AI Models'
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-center gap-3 text-sm text-slate-200">
                                            <span className="material-symbols-outlined text-green-400 text-lg">check_circle</span>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                                <div className="mt-auto">
                                    <button onClick={onOpenContact} className="w-full py-3 px-6 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/30">
                                        Set up a Free Consultation
                                    </button>
                                </div>
                            </div>
                        </div>

                        <p className="text-center text-slate-500 text-sm mt-8">
                            * Prices vary based on team size, specific needs, and other AI-related costs.
                        </p>
                    </div>
                </div>

                {/* 5. TESTIMONIALS */}
                <div className="py-24 bg-slate-50">
                    <div className="max-w-7xl mx-auto px-4">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-bold text-slate-900">Brokerages We've Scaled</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {[
                                {
                                    quote: "We looked at building this internally, but the cost was astronomical. HomeListingAI built us a custom solution in 2 weeks.",
                                    author: "Sarah Jenkins",
                                    role: "Broker Owner, LuxeEstates",
                                    rating: 5
                                },
                                {
                                    quote: "The 'Digital DNA' feature is scary good. I fed it my last 500 emails, and now it writes exactly like me.",
                                    author: "Marcus Thorne",
                                    role: "Team Lead, Thorne Group",
                                    rating: 5
                                },
                                {
                                    quote: "Recruitment holds have dropped by 40% because new agents are blown away by the tech stack we provide.",
                                    author: "Elena Rodriguez",
                                    role: "VP of Operations",
                                    rating: 5
                                }
                            ].map((review, i) => (
                                <div key={i} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                                    <div className="flex gap-1 text-yellow-400 mb-4">
                                        {[...Array(review.rating)].map((_, r) => (
                                            <span key={r} className="material-symbols-outlined text-sm filled">star</span>
                                        ))}
                                    </div>
                                    <p className="text-slate-700 italic mb-6">"{review.quote}"</p>
                                    <div>
                                        <p className="font-bold text-slate-900">{review.author}</p>
                                        <p className="text-xs text-slate-500">{review.role}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 6. CTA BOTTOM */}
                <div className="py-24 bg-slate-900 text-white text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-900 to-slate-900"></div>
                    <div className="relative max-w-4xl mx-auto px-4">
                        <h2 className="text-4xl font-bold mb-6">Ready to Own Your Tech Stack?</h2>
                        <p className="text-xl text-slate-400 mb-10">
                            Stop renting generic tools. Start building your legacy using our infrastructure.
                        </p>
                        <button onClick={onOpenContact} className="px-10 py-5 bg-white text-slate-900 rounded-full font-bold text-lg hover:bg-indigo-50 transition-all transform hover:scale-105 shadow-xl">
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
