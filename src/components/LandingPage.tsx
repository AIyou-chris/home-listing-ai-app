import React, { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

const ChatBotFAB = lazy(() => import('./ChatBotFAB'));
import SEO from './SEO';
import { StripeLogo } from './StripeLogo';
const MultiToolShowcase = lazy(() => import('./MultiToolShowcase').then(module => ({ default: module.MultiToolShowcase })));
import { PublicHeader } from './layout/PublicHeader';
import { PublicFooter } from './layout/PublicFooter';
import { ConversionWedge } from './ConversionWedge';
import { PlacementSection } from './PlacementSection';
import { PricingSectionNew } from './PricingSectionNew';
import { FaqSectionNew } from './FaqSectionNew';
import { ProofSectionNew } from './ProofSectionNew';
import { StatStripNew } from './StatStripNew';
import { FinalCtaNew } from './FinalCtaNew';

// Unused components removed to fix lint errors.
// const DashboardShowcaseSection ...
// const AIAppShowcaseSection ...


const PricingSection: React.FC<{ onNavigateToSignUp: () => void; onOpenContact: () => void }> = ({ onNavigateToSignUp, onOpenContact }) => {


    return (
        <section id="pricing" className="py-20 bg-slate-50 relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute inset-0 pointer-events-none">
                {/* Floating Icons */}
                <div className="absolute top-20 left-10 opacity-5 animate-float">
                    <span className="material-symbols-outlined text-5xl text-blue-500">payments</span>
                </div>
                <div className="absolute top-40 right-20 opacity-5 animate-float-slow">
                    <span className="material-symbols-outlined text-4xl text-green-500">verified</span>
                </div>
                <div className="absolute bottom-20 left-1/4 opacity-5 animate-float-slower">
                    <span className="material-symbols-outlined text-3xl text-purple-500">star</span>
                </div>

                {/* Geometric Shapes */}
                <div className="absolute top-60 right-1/3 opacity-5 animate-pulse">
                    <div className="w-20 h-20 border-2 border-blue-300 rounded-full"></div>
                </div>
                <div className="absolute bottom-40 right-10 opacity-5 animate-bounce">
                    <div className="w-16 h-16 bg-gradient-to-r from-purple-400 to-pink-400 rounded-lg transform rotate-45"></div>
                </div>

                {/* Dots Pattern */}
                <div className="absolute top-0 left-0 w-full h-full opacity-3">
                    <div className="grid grid-cols-20 gap-4 w-full h-full">
                        {Array.from({ length: 70 }).map((_, i) => (
                            <div key={i} className="w-1 h-1 bg-slate-400 rounded-full animate-pulse"
                                style={{
                                    animationDelay: `${i * 0.12}s`,
                                    animationDuration: `${2 + Math.random() * 2}s`
                                }}></div>
                        ))}
                    </div>
                </div>

                {/* Gradient Orbs */}
                <div className="absolute top-1/3 left-1/4 w-28 h-28 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full opacity-5 animate-pulse blur-xl"></div>
                <div className="absolute bottom-1/3 right-1/4 w-20 h-20 bg-gradient-to-r from-green-400 to-blue-400 rounded-full opacity-5 animate-pulse blur-xl"></div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center">
                    <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 animate-fade-in-up">Revolutionize Your Real Estate Business</h2>
                    <p className="mt-4 max-w-2xl mx-auto text-lg text-slate-600 animate-fade-in-up animation-delay-200">
                        Simple, transparent pricing. Powerful features. No hidden costs.
                    </p>
                </div>

                {/* Market Crash Survival Story */}
                <div className="mt-12 max-w-3xl mx-auto animate-fade-in-up animation-delay-300">
                    <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-2xl p-8 border-2 border-blue-200 shadow-lg relative overflow-hidden">
                        {/* Subtle background pattern */}
                        <div className="absolute inset-0 opacity-5">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full blur-2xl"></div>
                            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-pink-400 to-blue-400 rounded-full blur-2xl"></div>
                        </div>
                        <div className="relative z-10">
                            <div className="prose prose-lg max-w-none">
                                <p className="text-slate-700 leading-relaxed mb-6" style={{ fontFamily: "'Caveat', cursive", fontSize: '1.2rem' }}>
                                    I lived through the 2007 crash. And again in 2012. I know exactly what it feels like when deals stall, leads dry up, and every dollar needs to work overtime. That's why I built this AI tool specifically for realtors navigating today's tightening market. Not as a gimmick. Not for mass adoption. But because I remember how brutal these markets get. And I know smart tech—priced right—can be the difference between treading water and taking territory.
                                </p>
                                <div className="mt-6 pt-6 border-t-2 border-dashed border-slate-300">
                                    <p className="text-slate-800 font-semibold text-xl" style={{ fontFamily: "'Caveat', cursive", fontSize: '1.3rem' }}>
                                        👉 Normally $149/month, but right now, you can get it for just <span className="text-primary-700">$69/month</span>.
                                    </p>
                                </div>
                                <p className="text-slate-800 font-medium mt-8" style={{ fontFamily: "'Caveat', cursive", fontSize: '1.3rem' }}>
                                    — Chris Potter, Founder
                                </p>
                                <p className="text-sm text-slate-500 italic mt-4">
                                    * Price subject to change. Lock in this rate today.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="mt-16 flex justify-center animate-fade-in-up animation-delay-500">
                    {/* Single Plan */}
                    <div className="p-8 h-full flex flex-col rounded-2xl bg-gradient-to-tr from-primary-700 to-primary-500 text-white shadow-2xl relative border-2 border-primary-500 transform hover:scale-105 transition-all duration-300 animate-fade-in-up glow max-w-5xl w-full">
                        <div className="flex-grow">
                            <h3 className="text-2xl font-bold text-white text-center">Complete AI Solution</h3>
                            <p className="mt-2 text-slate-300 text-center">Everything you need to dominate your market, impress clients, and close more deals — automatically.</p>
                            <p className="mt-6 text-center">
                                <span className="text-5xl font-extrabold text-white">$69</span>
                                <span className="text-xl font-medium text-slate-300">/mo</span>
                            </p>
                            <p className="mt-2 text-slate-300 line-through text-sm text-center">Regular price: $149/mo</p>

                            <ul className="mt-10 grid md:grid-cols-2 gap-x-12 gap-y-6 text-left">
                                {/* LEFT COLUMN */}
                                <li className="flex items-start gap-3">
                                    <span className="material-symbols-outlined w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5">smart_toy</span>
                                    <div>
                                        <span className="text-slate-100 font-bold text-lg">24/7 AI Voice Appt Setter</span>
                                        <p className="text-sm text-slate-300 mt-1">Automated calls that confirm showings and qualify leads instantly.</p>
                                    </div>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="material-symbols-outlined w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5">chat</span>
                                    <div>
                                        <span className="text-slate-100 font-bold text-lg">Unlimited AI Chat & Text</span>
                                        <p className="text-sm text-slate-300 mt-1">Your leads can ask anything, anytime — your AI responds instantly.</p>
                                    </div>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="material-symbols-outlined w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5">phonelink_setup</span>
                                    <div>
                                        <span className="text-slate-100 font-bold text-lg">Your Own AI Listing Agent</span>
                                        <p className="text-sm text-slate-300 mt-1">A dedicated phone number that texts and talks to leads 24/7.</p>
                                    </div>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="material-symbols-outlined w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5">sms</span>
                                    <div>
                                        <span className="text-slate-100 font-bold text-lg">Smart Nurture (SMS)</span>
                                        <p className="text-sm text-slate-300 mt-1">Intelligent follow-up sequences that turn *your* inquiries into appointments.</p>
                                    </div>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="material-symbols-outlined w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5">psychology</span>
                                    <div>
                                        <span className="text-slate-100 font-bold text-lg">Custom AI Personality</span>
                                        <p className="text-sm text-slate-300 mt-1">Fully trained on your voice, your hours, and your specific rules.</p>
                                    </div>
                                </li>

                                {/* RIGHT COLUMN */}
                                <li className="flex items-start gap-3">
                                    <span className="material-symbols-outlined w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5">bolt</span>
                                    <div>
                                        <span className="text-slate-100 font-bold text-lg">Instant Lead Response (5s)</span>
                                        <p className="text-sm text-slate-300 mt-1">Never lose a lead to "speed-to-lead" again. We reply in seconds.</p>
                                    </div>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="material-symbols-outlined w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5">language</span>
                                    <div>
                                        <span className="text-slate-100 font-bold text-lg">12-Language Auto-Detect</span>
                                        <p className="text-sm text-slate-300 mt-1">Your AI instantly responds in your lead’s preferred language.</p>
                                    </div>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="material-symbols-outlined w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5">monitoring</span>
                                    <div>
                                        <span className="text-slate-100 font-bold text-lg">Command Center Dashboard</span>
                                        <p className="text-sm text-slate-300 mt-1">Track conversations, engagement, and lead intent ratings in real time.</p>
                                    </div>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="material-symbols-outlined w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5">handshake</span>
                                    <div>
                                        <span className="text-slate-100 font-bold text-lg">Tools Built to Close Deals</span>
                                        <p className="text-sm text-slate-300 mt-1">Scheduling, instant notifications, transcripts, and warm lead routing.</p>
                                    </div>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="material-symbols-outlined w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5">notifications_active</span>
                                    <div>
                                        <span className="text-slate-100 font-bold text-lg">Instant Lead Notifications</span>
                                        <p className="text-sm text-slate-300 mt-1">Get alerted the moment a hot lead engages with your listings.</p>
                                    </div>
                                </li>
                            </ul>
                        </div>
                        <button
                            onClick={onNavigateToSignUp}
                            className="w-full mt-8 py-3 px-6 text-lg font-bold rounded-lg transition-all duration-300 bg-white text-primary-700 shadow-lg hover:bg-slate-200 transform hover:scale-[1.02]"
                        >
                            Start Free Trial
                        </button>
                        <p className="text-center text-xs text-slate-300 mt-3 opacity-90">
                            Price may increase at any time. Secure your lifetime rate today.
                        </p>
                        <p className="text-center text-xs text-slate-300 mt-1 opacity-90">
                            Includes Unlimited AI Chat • 60 Voice Mins/mo • 1,000 SMS/mo
                        </p>
                        <div className="mt-6 pt-6 border-t border-white/20 text-center">
                            <div className="inline-flex items-center justify-center gap-3 bg-white/10 rounded-full px-6 py-2.5 mb-2 border border-white/20 backdrop-blur-sm shadow-sm ring-1 ring-white/10">
                                <span className="material-symbols-outlined text-yellow-300 text-2xl animate-pulse">verified_user</span>
                                <span className="text-lg sm:text-xl font-bold text-white tracking-wide">30-Day Money-Back Guarantee</span>
                            </div>
                            <p className="text-sm text-slate-100 mt-2 font-medium">If you're not satisfied, get a full refund. No questions asked.</p>
                            <div className="mt-4 flex flex-col items-center justify-center gap-1 opacity-80 pt-3 border-t border-white/10">
                                <span className="text-[10px] text-slate-300 uppercase tracking-widest font-semibold">Secured by</span>
                                <StripeLogo className="h-5 text-white" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Team/Office Programs Note */}
                <div className="mt-8 text-center animate-fade-in-up animation-delay-600">
                    <p className="text-slate-600 text-lg">
                        Need something more custom? No worries. <button onClick={onOpenContact} className="text-primary-600 hover:text-primary-700 font-semibold underline">Just reach out</button> →
                    </p>
                </div>
            </div>
        </section>
    );
};

const WhiteLabelSection: React.FC = () => {
    const navigate = useNavigate();

    const ServiceItem: React.FC<{ icon: string, title: string, iconClass?: string, children: React.ReactNode }> = ({ icon, title, iconClass, children }) => (
        <div>
            <div className="flex justify-center mb-4 h-16 items-center">
                <span className={`material-symbols-outlined text-5xl ${iconClass}`}>{icon}</span>
            </div>
            <h3 className="text-xl font-bold text-slate-800">{title}</h3>
            <p className="mt-2 text-slate-600">{children}</p>
        </div>
    );

    return (
        <section id="white-label" className="py-20 bg-slate-50 relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute inset-0 pointer-events-none">
                {/* Floating Icons */}
                <div className="absolute top-20 left-10 opacity-5 animate-float">
                    <span className="material-symbols-outlined text-5xl text-blue-500">business</span>
                </div>
                <div className="absolute top-40 right-20 opacity-5 animate-float-slow">
                    <span className="material-symbols-outlined text-4xl text-green-500">verified</span>
                </div>
                <div className="absolute bottom-20 left-1/4 opacity-5 animate-float-slower">
                    <span className="material-symbols-outlined text-3xl text-purple-500">star</span>
                </div>

                {/* Geometric Shapes */}
                <div className="absolute top-60 right-1/3 opacity-5 animate-pulse">
                    <div className="w-20 h-20 border-2 border-blue-300 rounded-full"></div>
                </div>
                <div className="absolute bottom-40 right-10 opacity-5 animate-bounce">
                    <div className="w-16 h-16 bg-gradient-to-r from-purple-400 to-pink-400 rounded-lg transform rotate-45"></div>
                </div>

                {/* Dots Pattern */}
                <div className="absolute top-0 left-0 w-full h-full opacity-3">
                    <div className="grid grid-cols-20 gap-4 w-full h-full">
                        {Array.from({ length: 50 }).map((_, i) => (
                            <div key={i} className="w-1 h-1 bg-slate-400 rounded-full animate-pulse"
                                style={{
                                    animationDelay: `${i * 0.18}s`,
                                    animationDuration: `${2 + Math.random() * 2}s`
                                }}></div>
                        ))}
                    </div>
                </div>

                {/* Gradient Orbs */}
                <div className="absolute top-1/3 left-1/4 w-28 h-28 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full opacity-5 animate-pulse blur-xl"></div>
                <div className="absolute bottom-1/3 right-1/4 w-20 h-20 bg-gradient-to-r from-green-400 to-blue-400 rounded-full opacity-5 animate-pulse blur-xl"></div>
            </div>

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="bg-white p-8 sm:p-12 rounded-2xl shadow-xl border border-slate-200/80 text-center hover-lift">
                    <h2 className="text-3xl sm:text-4xl font-extrabold text-primary-700 tracking-tight animate-fade-in-up">White Label & Custom Services</h2>
                    <p className="mt-4 max-w-3xl mx-auto text-lg text-slate-600 animate-fade-in-up animation-delay-200">
                        Want your own brand? We offer full white labeling, custom web design, design systems, automation, and digital marketing for real estate pros, teams, and brokerages. Get a seamless, premium experience—your brand, your way.
                    </p>

                    <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-12 animate-fade-in-up animation-delay-400">
                        <ServiceItem icon="storefront" iconClass="text-primary-600" title="White Label Solutions">
                            Your logo, your domain, your colors—powered by our AI. Launch a fully branded platform for your team or brokerage, with all the features of HomeListingAI under your own identity.
                        </ServiceItem>
                        <ServiceItem icon="laptop_mac" iconClass="text-slate-700" title="Web & System Design">
                            Modern, responsive websites and design systems tailored for real estate. We build beautiful, high-converting sites and robust design systems that scale with your business.
                        </ServiceItem>
                        <ServiceItem icon="bolt" iconClass="text-yellow-500" title="Automation & AI">
                            Streamline your workflow with custom automations, AI chat, lead routing, and integrations. Free up your team to focus on what matters most—closing deals.
                        </ServiceItem>
                        <ServiceItem icon="trending_up" iconClass="text-green-600" title="Digital Marketing">
                            Lead generation, SEO, paid ads, and digital campaigns that get results. We help you attract, nurture, and convert more clients with proven digital strategies.
                        </ServiceItem>
                    </div>

                    <div className="mt-16 animate-fade-in-up animation-delay-600">
                        {/* Broker CTA */}
                        <div className="mt-10 pt-8 border-t border-slate-200/60 animate-fade-in-up animation-delay-800">
                            <p className="text-slate-600 mb-4 font-medium">Looking for enterprise solutions?</p>
                            <button
                                onClick={() => navigate('/white-label')}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 text-lg font-bold text-white bg-slate-900 rounded-xl shadow-lg hover:bg-slate-800 hover:shadow-slate-500/25 transition-all transform hover:scale-105 active:scale-95 border border-slate-700"
                            >
                                <span className="material-symbols-outlined">domain_add</span>
                                See our white label program
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

const FeaturesGridSection: React.FC = () => {
    const features = [
        { icon: "rocket_launch", title: "Generate 3x More Leads", description: "AI responds instantly to every buyer inquiry, capturing leads while you sleep." },
        { icon: "bolt", title: "Close Deals Faster", description: "Pre-qualified buyers arrive ready to buy, shortening your sales cycle." },
        { icon: "schedule", title: "Save 20+ Hours Weekly", description: "Eliminate repetitive answering of the same buyer questions." }
    ];
    return (
        <section className="py-20 bg-white relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute inset-0 pointer-events-none">
                {/* Floating Icons */}
                <div className="absolute top-20 left-10 opacity-5 animate-float">
                    <span className="material-symbols-outlined text-5xl text-blue-500">phone_iphone</span>
                </div>
                <div className="absolute top-40 right-20 opacity-5 animate-float-slow">
                    <span className="material-symbols-outlined text-4xl text-green-500">rocket_launch</span>
                </div>
                <div className="absolute bottom-20 left-1/4 opacity-5 animate-float-slower">
                    <span className="material-symbols-outlined text-3xl text-purple-500">bolt</span>
                </div>

                {/* Geometric Shapes */}
                <div className="absolute top-60 right-1/3 opacity-5 animate-pulse">
                    <div className="w-20 h-20 border-2 border-blue-300 rounded-full"></div>
                </div>
                <div className="absolute bottom-40 right-10 opacity-5 animate-bounce">
                    <div className="w-16 h-16 bg-gradient-to-r from-purple-400 to-pink-400 rounded-lg transform rotate-45"></div>
                </div>

                {/* Dots Pattern */}
                <div className="absolute top-0 left-0 w-full h-full opacity-3">
                    <div className="grid grid-cols-20 gap-4 w-full h-full">
                        {Array.from({ length: 60 }).map((_, i) => (
                            <div key={i} className="w-1 h-1 bg-blue-300 rounded-full animate-pulse"
                                style={{
                                    animationDelay: `${i * 0.15}s`,
                                    animationDuration: `${2 + Math.random() * 2}s`
                                }}></div>
                        ))}
                    </div>
                </div>

                {/* Gradient Orbs */}
                <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full opacity-5 animate-pulse blur-xl"></div>
                <div className="absolute bottom-1/4 left-1/4 w-24 h-24 bg-gradient-to-r from-green-400 to-blue-400 rounded-full opacity-5 animate-pulse blur-xl"></div>
            </div>

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
                <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 animate-fade-in-up">Turn Every Listing into an Installable App</h2>
                <p className="mt-4 text-lg text-slate-600 animate-fade-in-up animation-delay-200">
                    Stop chasing leads. Start capturing them automatically with AI that works 24/7. Each property becomes its own branded app with built-in messaging!
                </p>
                <div className="mt-12 grid sm:grid-cols-3 gap-8 animate-fade-in-up animation-delay-400">
                    {features.map((feature, index) => (
                        <div key={feature.title} className="p-8 bg-slate-50 rounded-2xl border border-slate-200/80 transform hover:scale-105 transition-all duration-300 hover-lift animate-fade-in-up"
                            style={{ animationDelay: `${index * 200}ms` }}>
                            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto animate-pulse">
                                <span className="material-symbols-outlined text-3xl text-purple-600">{feature.icon}</span>
                            </div>
                            <h3 className="mt-5 text-xl font-bold text-slate-800">{feature.title}</h3>
                            <p className="mt-2 text-slate-600">{feature.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

const WhatYouGetSectionNew: React.FC = () => {
    const items = [
        { icon: 'chat_bubble', title: 'AI Listing Agent', description: 'Your own AI assistant that answers buyer questions 24/7.', features: ['Instant responses', 'Qualifies leads', 'Schedules showings'] },
        { icon: 'dashboard', title: 'Live Dashboard & Notifications', description: 'Track leads, appointments, and messages in real-time with a notification center.', features: ['Live lead tracking', 'Notification center', 'Mobile-first design'] },
        { icon: 'phone_iphone', title: 'Mobile-First Design', description: 'Works perfectly on phones, tablets, and computers.', features: ['Responsive design', 'Mobile optimized', 'Cross-platform'] },
        { icon: 'security', title: 'Enterprise Security', description: 'Bank-level security to protect your data and clients.', features: ['SSL encryption', 'Data backup', 'GDPR compliant'] },
        { icon: 'filter_alt', title: 'Lead Generation Engine', description: 'Automatically capture and nurture qualified leads.', features: ['Auto-capture', 'Lead scoring', 'Follow-up automation'] },
        { icon: 'forum', title: 'Built-in Messaging System', description: 'Email, voice messages, and in-app notifications - direct communication.', features: ['No extra fees', 'Direct agent contact', 'Voice-enabled'] },
        { icon: 'install_mobile', title: 'Installable Property Apps', description: 'Each listing becomes its own app with custom branding and icons.', features: ['Property-specific apps', 'Home screen access', 'Custom branding'] },
    ];
    return (
        <section id="what-you-get" className="py-20 bg-slate-50 relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute inset-0 pointer-events-none">
                {/* Floating Icons */}
                <div className="absolute top-20 left-10 opacity-5 animate-float">
                    <span className="material-symbols-outlined text-5xl text-blue-500">check_circle</span>
                </div>
                <div className="absolute top-40 right-20 opacity-5 animate-float-slow">
                    <span className="material-symbols-outlined text-4xl text-green-500">verified</span>
                </div>
                <div className="absolute bottom-20 left-1/4 opacity-5 animate-float-slower">
                    <span className="material-symbols-outlined text-3xl text-purple-500">star</span>
                </div>

                {/* Geometric Shapes */}
                <div className="absolute top-60 right-1/3 opacity-5 animate-pulse">
                    <div className="w-20 h-20 border-2 border-blue-300 rounded-full"></div>
                </div>
                <div className="absolute bottom-40 right-10 opacity-5 animate-bounce">
                    <div className="w-16 h-16 bg-gradient-to-r from-purple-400 to-pink-400 rounded-lg transform rotate-45"></div>
                </div>

                {/* Dots Pattern */}
                <div className="absolute top-0 left-0 w-full h-full opacity-3">
                    <div className="grid grid-cols-20 gap-4 w-full h-full">
                        {Array.from({ length: 80 }).map((_, i) => (
                            <div key={i} className="w-1 h-1 bg-slate-400 rounded-full animate-pulse"
                                style={{
                                    animationDelay: `${i * 0.1}s`,
                                    animationDuration: `${2 + Math.random() * 2}s`
                                }}></div>
                        ))}
                    </div>
                </div>

                {/* Gradient Orbs */}
                <div className="absolute top-1/3 left-1/4 w-28 h-28 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full opacity-5 animate-pulse blur-xl"></div>
                <div className="absolute bottom-1/3 right-1/4 w-20 h-20 bg-gradient-to-r from-green-400 to-blue-400 rounded-full opacity-5 animate-pulse blur-xl"></div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
                <h2 className="text-3xl font-extrabold text-slate-900 animate-fade-in-up">What You Get With Home Listing AI</h2>
                <p className="mt-4 max-w-2xl mx-auto text-lg text-slate-600 animate-fade-in-up animation-delay-200">
                    Everything you need to dominate your market and close more deals.
                </p>
                <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-8 text-left animate-fade-in-up animation-delay-400">
                    {items.map((item, index) => (
                        <div key={item.title} className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200/60 transform hover:scale-105 transition-all duration-300 hover-lift animate-fade-in-up"
                            style={{ animationDelay: `${index * 100}ms` }}>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center animate-pulse">
                                    <span className="material-symbols-outlined w-7 h-7 text-blue-600">{item.icon}</span>
                                </div>
                                <h3 className="text-lg font-bold text-slate-800">{item.title}</h3>
                            </div>
                            <p className="mt-4 text-sm text-slate-600">{item.description}</p>
                            <hr className="my-4 border-slate-200" />
                            <ul className="space-y-2 text-sm">
                                {item.features.map(feature => (
                                    <li key={feature} className="flex items-center gap-2">
                                        <span className="material-symbols-outlined w-5 h-5 text-green-500">check</span>
                                        <span className="text-slate-600">{feature}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

const TestimonialsSection: React.FC = () => (
    <section className="py-20 bg-white relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 pointer-events-none">
            {/* Floating Icons */}
            <div className="absolute top-20 left-10 opacity-5 animate-float">
                <span className="material-symbols-outlined text-5xl text-blue-500">star</span>
            </div>
            <div className="absolute top-40 right-20 opacity-5 animate-float-slow">
                <span className="material-symbols-outlined text-4xl text-green-500">verified</span>
            </div>
            <div className="absolute bottom-20 left-1/4 opacity-5 animate-float-slower">
                <span className="material-symbols-outlined text-3xl text-purple-500">favorite</span>
            </div>

            {/* Geometric Shapes */}
            <div className="absolute top-60 right-1/3 opacity-5 animate-pulse">
                <div className="w-20 h-20 border-2 border-blue-300 rounded-full"></div>
            </div>
            <div className="absolute bottom-40 right-10 opacity-5 animate-bounce">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-400 to-pink-400 rounded-lg transform rotate-45"></div>
            </div>

            {/* Dots Pattern */}
            <div className="absolute top-0 left-0 w-full h-full opacity-3">
                <div className="grid grid-cols-20 gap-4 w-full h-full">
                    {Array.from({ length: 40 }).map((_, i) => (
                        <div key={i} className="w-1 h-1 bg-blue-300 rounded-full animate-pulse"
                            style={{
                                animationDelay: `${i * 0.25}s`,
                                animationDuration: `${2 + Math.random() * 2}s`
                            }}></div>
                    ))}
                </div>
            </div>

            {/* Gradient Orbs */}
            <div className="absolute top-1/3 left-1/4 w-28 h-28 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full opacity-5 animate-pulse blur-xl"></div>
            <div className="absolute bottom-1/3 right-1/4 w-20 h-20 bg-gradient-to-r from-green-400 to-blue-400 rounded-full opacity-5 animate-pulse blur-xl"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <h2 className="text-3xl font-extrabold text-slate-900 animate-fade-in-up">Trusted by Real Estate Professionals</h2>
            <p className="mt-4 text-lg text-slate-600 animate-fade-in-up animation-delay-200">See how our agency services have helped agents succeed with digital marketing.</p>
            <div className="mt-12 grid md:grid-cols-3 gap-8 text-left animate-fade-in-up animation-delay-400">
                {[
                    { name: 'Sarah Martinez', title: 'Top Producer, Coldwell Banker', location: 'Austin, TX', quote: '"Working with this team has been incredible. Their digital marketing strategies helped me triple my business in just 8 months. They really understand real estate!"' },
                    { name: 'Mike Thompson', title: 'RE/MAX Agent', location: 'Phoenix, AZ', quote: '"The team\'s expertise in online marketing and lead nurturing is unmatched. Their systematic approach helped me become a top producer in my office. Highly recommend their services."' },
                    { name: 'Jennifer Chen', title: 'Keller Williams, Team Lead', location: 'Seattle, WA', quote: '"The ROI has been outstanding. We get qualified, changing, daily new buyer/seller leads for our team to engage and work with. It\'s a huge time-saver."' },
                ].map((t, index) => (
                    <div key={t.name} className="p-8 bg-slate-50 rounded-2xl border border-slate-200/80 transform hover:scale-105 transition-all duration-300 hover-lift animate-fade-in-up"
                        style={{ animationDelay: `${index * 200}ms` }}>
                        <p className="text-slate-600 italic">"{t.quote}"</p>
                        <div className="mt-6">
                            <p className="font-bold text-slate-800">{t.name}</p>
                            <p className="text-sm text-slate-500">{t.title}, {t.location}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </section>
);

const FaqSection: React.FC = () => {
    const [openIndex, setOpenIndex] = React.useState<number | null>(null);
    const faqs = [
        { q: "How does the AI property assistant work?", a: "Our AI is trained on your specific property details, local market data, and your agent profile. It uses this knowledge to answer buyer questions 24/7 via text and voice, just like a real assistant." },
        { q: "How do I control what the AI knows?", a: "You have full control. Through the 'Knowledge Base' in your dashboard, you can upload documents, add text snippets, or even provide website URLs (like your personal blog or local market reports). The AI uses this information to provide accurate, customized answers, ensuring it represents you and your listings perfectly." },
        { q: "Can I change the AI's personality?", a: "Absolutely. You can choose from pre-defined personalities (e.g., 'Professional,' 'Friendly,' 'Enthusiastic') or create a custom one. This allows you to fine-tune the AI's tone and style to match your brand, making every interaction feel authentic to you." },
        { q: "How quickly can I get started?", a: "You can build your first AI-powered listing app in under 10 minutes. Our guided system makes it incredibly simple—no technical skills required." },
        { q: "What makes this different from other lead tools?", a: "Instead of just being a contact form, we create an interactive experience for each listing. This engages buyers more deeply, pre-qualifies them, and delivers a much higher quality lead directly to you. You get the full conversation transcript, giving you valuable context to start a meaningful conversation." },
        { q: "Is there really a 30-day money-back guarantee?", a: "Yes! We are so confident you'll love the results that we offer a no-questions-asked, 30-day money-back guarantee. If you don't get value, you don't pay." },
        { q: "Is my and my client's data secure?", a: "Yes, security is our top priority. All data is encrypted in transit and at rest using enterprise-grade security protocols. We are compliant with data privacy regulations, and you retain full ownership of your data. For trial accounts, all data is automatically purged after the trial period for your peace of mind." },
        { q: "What kind of support do you offer if I get stuck?", a: "We offer comprehensive support to all our users. This includes a detailed knowledge base, email support for all plans, and priority support for our Pro Team subscribers. We're here to ensure you get the most out of the platform." },
        { q: "How are these leads different from Zillow or Realtor.com?", a: "The leads you get from HomeListingAI are significantly warmer. Instead of just a name and email from a form, you get a contact who has actively engaged with your property, asked specific questions, and been pre-qualified by the AI. You receive the full conversation transcript, giving you valuable context to start a meaningful conversation." },
        { q: "Can I use my own branding (white-label)?", a: "Yes! Our Brokerage plan includes full white-labeling. You can use your own domain, logo, and brand colors to create a seamless experience for your agents and clients. Contact us for a consultation to discuss our white-label and custom service options." },
    ];

    return (
        <section className="py-20 bg-white">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-3xl font-extrabold text-slate-900 text-center">Frequently Asked Questions</h2>
                <div className="mt-10 space-y-4">
                    {faqs.map((faq, index) => (
                        <div key={index} className="border border-slate-200 rounded-lg">
                            <button onClick={() => setOpenIndex(openIndex === index ? null : index)} className="w-full flex justify-between items-center text-left p-5 font-semibold text-slate-800">
                                <span>{faq.q}</span>
                                <span className={`material-symbols-outlined transition-transform ${openIndex === index ? 'rotate-180' : ''}`}>expand_more</span>
                            </button>
                            {openIndex === index && (
                                <div className="px-5 pb-5 text-slate-600">
                                    <p>{faq.a}</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

const AboutUsSection: React.FC = () => (
    <section id="about-us" className="py-20 bg-white relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 pointer-events-none">
            {/* Floating Icons */}
            <div className="absolute top-20 left-10 opacity-5 animate-float">
                <span className="material-symbols-outlined text-5xl text-blue-500">history</span>
            </div>
            <div className="absolute top-40 right-20 opacity-5 animate-float-slow">
                <span className="material-symbols-outlined text-4xl text-green-500">trending_up</span>
            </div>
            <div className="absolute bottom-20 left-1/4 opacity-5 animate-float-slower">
                <span className="material-symbols-outlined text-3xl text-purple-500">star</span>
            </div>

            {/* Geometric Shapes */}
            <div className="absolute top-60 right-1/3 opacity-5 animate-pulse">
                <div className="w-20 h-20 border-2 border-blue-300 rounded-full"></div>
            </div>
            <div className="absolute bottom-40 right-10 opacity-5 animate-bounce">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-400 to-pink-400 rounded-lg transform rotate-45"></div>
            </div>

            {/* Dots Pattern */}
            <div className="absolute top-0 left-0 w-full h-full opacity-3">
                <div className="grid grid-cols-20 gap-4 w-full h-full">
                    {Array.from({ length: 60 }).map((_, i) => (
                        <div key={i} className="w-1 h-1 bg-blue-300 rounded-full animate-pulse"
                            style={{
                                animationDelay: `${i * 0.15}s`,
                                animationDuration: `${2 + Math.random() * 2}s`
                            }}></div>
                    ))}
                </div>
            </div>

            {/* Gradient Orbs */}
            <div className="absolute top-1/3 left-1/4 w-28 h-28 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full opacity-5 animate-pulse blur-xl"></div>
            <div className="absolute bottom-1/3 right-1/4 w-20 h-20 bg-gradient-to-r from-green-400 to-blue-400 rounded-full opacity-5 animate-pulse blur-xl"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            {/* Hero Header */}
            <div className="text-center mb-16">
                <h2 className="text-4xl font-bold text-slate-900 mb-4 animate-fade-in-up">About Us</h2>
                <p className="text-xl text-slate-600 animate-fade-in-up animation-delay-200">
                    We've been doing this since dial-up.
                </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-16 items-start">
                {/* Story Content */}
                <div className="animate-fade-in-left">
                    <div className="bg-slate-50 rounded-2xl p-8 shadow-lg border border-slate-200/60">
                        <p className="text-lg text-slate-700 leading-relaxed mb-6">
                            Founded by seasoned real estate and mortgage pros with over <span className="font-bold text-primary-600">25 years</span> of hands-on experience, we've seen the industry evolve—and helped shape it. From launching our first website in 1997 (yeah, we were there before Google), to pioneering our first mobile app in 2005, we've always stayed two steps ahead of the curve.
                        </p>
                        <p className="text-lg text-slate-700 leading-relaxed mb-6">
                            Today, we proudly serve over <span className="font-bold text-primary-600">500 loyal clients</span>, blending cutting-edge technology with old-school hustle. And let's not forget our two 100-pound Labrador companions, our unofficial <span className="font-bold text-green-600">Chief Happiness Officers</span>, who remind us daily that loyalty and presence are everything.
                        </p>
                        <p className="text-lg text-slate-700 leading-relaxed font-semibold">
                            This isn't just business—it's <span className="text-primary-600">legacy</span>, <span className="text-purple-600">innovation</span>, and a commitment to doing things right.
                        </p>
                    </div>
                </div>

                {/* Stats Card */}
                <div className="animate-fade-in-right">
                    <div className="bg-slate-50 rounded-2xl p-8 shadow-lg border border-slate-200/60">
                        <h3 className="text-2xl font-bold text-slate-900 text-center mb-8">Experience Accumulation</h3>

                        <div className="grid grid-cols-2 gap-6 mb-8">
                            {[
                                { number: '30', label: 'Years in Business', icon: '🏢' },
                                { number: '500+', label: 'Clients Served', icon: '👥' },
                                { number: '25+', label: 'Years Experience', icon: '⚡' },
                                { number: '2', label: 'Labrador Officers', icon: '🐕' }
                            ].map((stat, index) => (
                                <div key={index} className="text-center group hover:scale-105 transition-transform duration-300">
                                    <div className="text-3xl mb-2 animate-bounce" style={{ animationDelay: `${index * 0.2}s` }}>
                                        {stat.icon}
                                    </div>
                                    <div className="text-3xl font-bold text-primary-600 mb-2 group-hover:text-primary-700 transition-colors">
                                        {stat.number}
                                    </div>
                                    <div className="text-sm text-slate-600 group-hover:text-slate-800 transition-colors">
                                        {stat.label}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Timeline Section - Full Width */}
            <div className="mt-16 animate-fade-in-up animation-delay-400">
                <div className="bg-slate-50 rounded-2xl p-8 shadow-lg border border-slate-200/60">
                    <h3 className="text-2xl font-bold text-slate-900 text-center mb-8">Our Journey</h3>

                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="flex flex-col items-center text-center group">
                            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg mb-4 animate-pulse group-hover:scale-110 transition-transform duration-300">
                                1997
                            </div>
                            <h4 className="font-bold text-slate-900 text-lg mb-2 group-hover:text-blue-600 transition-colors">
                                The Beginning
                            </h4>
                            <p className="text-slate-600">Launched our first website (before Google existed!)</p>
                        </div>

                        <div className="flex flex-col items-center text-center group">
                            <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg mb-4 animate-pulse group-hover:scale-110 transition-transform duration-300">
                                2005
                            </div>
                            <h4 className="font-bold text-slate-900 text-lg mb-2 group-hover:text-green-600 transition-colors">
                                Mobile Revolution
                            </h4>
                            <p className="text-slate-600">Pioneered our first mobile app</p>
                        </div>

                        <div className="flex flex-col items-center text-center group">
                            <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center text-white font-bold text-lg mb-4 animate-pulse group-hover:scale-110 transition-transform duration-300">
                                2024
                            </div>
                            <h4 className="font-bold text-slate-900 text-lg mb-2 group-hover:text-orange-600 transition-colors">
                                AI-Powered Future
                            </h4>
                            <p className="text-slate-600">Leading the AI revolution in real estate</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
);






const Hero: React.FC<{ onNavigateToSignUp: () => void, onEnterDemoMode: () => void, onOpenChatBot?: () => void }> = ({ onNavigateToSignUp, onEnterDemoMode, onOpenChatBot }) => (
    <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-slate-950">
        {/* Deep, dark gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0B0F19] via-[#0B1528] to-[#040814]"></div>

        {/* Subtle animated grid pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik02MCAwaC0xdjYwaDFWMHptLTYwIDYwaDYwdi0xSDB2MXoiIGZpbGw9IiMzMzQxNTUiIGZpbGwtb3BhY2l0eT0iMC4yNCIvPjwvZz48L3N2Zz4=')] [mask-image:linear-gradient(to_bottom,white,transparent,transparent)] opacity-40 mix-blend-overlay"></div>

        {/* Soft glowing accent lines */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Top light beam */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent shadow-[0_0_15px_rgba(6,182,212,0.6)]"></div>
            {/* Ambient glows */}
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600 rounded-full mix-blend-screen filter blur-[100px] opacity-30 animate-pulse"></div>
            <div className="absolute top-40 -left-40 w-96 h-96 bg-cyan-600 rounded-full mix-blend-screen filter blur-[120px] opacity-20 animate-[pulse_4s_ease-in-out_infinite]"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
                <div className="text-center lg:text-left relative z-10">
                    <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-[1.1] animate-fade-in-up">
                        Turn Every Listing <br className="hidden lg:block" />
                        <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent drop-shadow-sm">Into a 24/7 Lead Machine.</span>
                    </h1>
                    <div className="sr-only">HomeListingAI is a web app for real estate agents that turns listings into lead-capture pages with an AI Listing Page and a 1-page Market Report.</div>
                    <p className="mt-8 max-w-xl mx-auto lg:mx-0 text-xl text-slate-400 animate-fade-in-up font-light leading-relaxed" style={{ animationDelay: "200ms" }}>
                        HomeListingAI turns every listing into a 24/7 AI sidekick that responds instantly, follows up relentlessly, and books real conversations — in your voice.
                    </p>
                    <div className="mt-10 flex flex-col sm:flex-row justify-center lg:justify-start items-center gap-5 animate-fade-in-up px-4 lg:px-0" style={{ animationDelay: "400ms" }}>
                        <button onClick={onNavigateToSignUp} className="w-full sm:w-auto px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all transform hover:scale-105 text-lg btn-animate group flex items-center justify-center gap-2">
                            Start Free Trial
                            <span className="material-symbols-outlined text-xl transition-transform group-hover:translate-x-1">arrow_forward</span>
                        </button>
                        <button onClick={onEnterDemoMode} className="w-full sm:w-auto px-8 py-4 bg-transparent border border-slate-700 hover:border-slate-500 text-white font-semibold rounded-lg transition-all text-lg hover:bg-slate-800/50 flex items-center justify-center gap-2">
                            For Brokers <span className="text-cyan-500 ml-1">→</span>
                        </button>
                    </div>
                </div>

                <div className="relative animate-fade-in-up" style={{ animationDelay: "600ms" }}>
                    {/* Modern Dashboard Mockup */}
                    <div className="relative w-full rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl shadow-cyan-900/20 overflow-hidden group hover:border-slate-700 transition-colors duration-500">
                        {/* Mockup Header */}
                        <div className="bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between">
                            <div className="flex gap-2">
                                <div className="w-3 h-3 rounded-full bg-slate-700"></div>
                                <div className="w-3 h-3 rounded-full bg-slate-700"></div>
                                <div className="w-3 h-3 rounded-full bg-slate-700"></div>
                            </div>
                            <div className="text-xs font-mono text-slate-500 flex gap-4">
                                <span>homelistingai.com/admin</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                <span className="text-xs text-slate-500">Active</span>
                            </div>
                        </div>

                        {/* Mockup Body Container */}
                        <div className="p-5 grid grid-cols-12 gap-5 relative bg-[#090E17]">
                            {/* Main Chart Area */}
                            <div className="col-span-12 sm:col-span-8 space-y-5">
                                <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4 relative overflow-hidden group-hover:border-cyan-900/40 transition-colors duration-500">
                                    <div className="flex justify-between items-center mb-6">
                                        <h4 className="text-slate-300 text-sm font-medium">Pipeline Velocity</h4>
                                    </div>
                                    <div className="h-28 w-full flex items-end gap-2 px-2 relative">
                                        {/* Abstract glowing chart line */}
                                        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                                            <path d="M0,80 Q20,20 40,60 T80,30 T100,50 L100,100 L0,100 Z" fill="url(#blue-gradient)" opacity="0.1" />
                                            <path d="M0,80 Q20,20 40,60 T80,30 T100,50" fill="none" stroke="currentColor" className="text-cyan-500" strokeWidth="2" vectorEffect="non-scaling-stroke" style={{ filter: 'drop-shadow(0px 0px 4px rgba(6,182,212,0.8))' }} />
                                            <defs>
                                                <linearGradient id="blue-gradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="rgba(6,182,212,1)" />
                                                    <stop offset="100%" stopColor="transparent" />
                                                </linearGradient>
                                            </defs>
                                        </svg>
                                        <div className="absolute right-4 top-4 bg-slate-950/80 border border-slate-800 rounded px-2 py-1 text-xs text-white flex items-center gap-1 backdrop-blur-sm shadow-lg">
                                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                                            +42% Response Speed
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-5">
                                    <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4 hover:border-slate-700 transition-colors">
                                        <div className="text-slate-500 text-xs mb-1">New Leads Captured</div>
                                        <div className="text-2xl font-bold text-white flex items-baseline gap-2">
                                            1,248
                                            <span className="text-cyan-400 text-xs font-normal">+18.5%</span>
                                        </div>
                                    </div>
                                    <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4 hover:border-slate-700 transition-colors">
                                        <div className="text-slate-500 text-xs mb-1">Appointments Booked</div>
                                        <div className="text-2xl font-bold text-white flex items-baseline gap-2">
                                            86
                                            <span className="text-cyan-400 text-xs font-normal">+33%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Live Chat Panel */}
                            <div className="hidden sm:flex col-span-4 bg-slate-900 border border-slate-800 rounded-xl flex-col overflow-hidden relative shadow-lg">
                                {/* Soft glow originating from chat */}
                                <div className="absolute top-0 inset-x-0 h-[40%] bg-cyan-900/10 blur-[20px]"></div>

                                <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/80 backdrop-blur z-10">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-[0_0_10px_rgba(6,182,212,0.4)]">
                                            <span className="material-symbols-outlined text-[10px] text-white">smart_toy</span>
                                        </div>
                                        <div className="text-xs font-medium text-slate-200">AI Agent</div>
                                    </div>
                                </div>
                                <div className="flex-1 p-3 space-y-3 relative z-10 font-sans">
                                    {/* Simulated Chat */}
                                    <div className="flex flex-col gap-1 items-start">
                                        <div className="bg-slate-800 text-slate-300 text-[10px] py-1.5 px-3 rounded-2xl rounded-tl-sm max-w-[90%] leading-relaxed border border-slate-700/50">
                                            Hi! I'm looking for a 3 bed / 2 bath under $500k.
                                        </div>
                                        <div className="text-[8px] text-slate-600 pl-1">New Buyer • Just now</div>
                                    </div>
                                    <div className="flex flex-col gap-1 items-end pt-2">
                                        <div className="bg-cyan-600 border border-cyan-500 text-white shadow-[0_0_10px_rgba(6,182,212,0.2)] text-[10px] py-1.5 px-3 rounded-2xl rounded-tr-sm max-w-[90%] leading-relaxed">
                                            I'd be happy to show you our current matches! I have availability tomorrow at 2PM or Thursday at 10AM to tour 123 Maple St. Which works for you?
                                        </div>
                                        <div className="text-[8px] text-slate-500 flex items-center gap-1 pr-1">
                                            AI Sidekick
                                            <span className="material-symbols-outlined text-[8px] text-cyan-400">check_all</span>
                                        </div>
                                    </div>
                                </div>
                                {/* Typing Indicator Block */}
                                <div className="p-2 border-t border-slate-800/80 bg-slate-900 z-10">
                                    <div className="w-full bg-slate-950 border border-slate-800 rounded-md px-2 py-1.5 flex justify-between items-center opacity-70">
                                        <span className="text-[9px] text-slate-500">Type a message...</span>
                                        <div className="flex gap-2">
                                            <span className="material-symbols-outlined text-[10px] text-slate-500 hover:text-cyan-400 transition-colors">sms</span>
                                            <span className="material-symbols-outlined text-[10px] text-slate-500 hover:text-cyan-400 transition-colors">mail</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
);

interface LandingPageProps {
    onNavigateToSignUp: () => void;
    onNavigateToSignIn: () => void;
    onEnterDemoMode: () => void;
    scrollToSection?: string | null;
    onScrollComplete?: () => void;
    onOpenConsultationModal: () => void;
    onNavigateToAdmin: () => void;
    onNavigateToShowcase?: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onNavigateToSignUp, onNavigateToSignIn, onEnterDemoMode, onOpenConsultationModal, onNavigateToAdmin, onNavigateToShowcase }) => {
    const [isChatOpen, setIsChatOpen] = React.useState(false);
    // const [isAIContactOpen, setIsAIContactOpen] = React.useState(false); // Unused now

    const handleOpenChatBot = () => {
        setIsChatOpen(true);
    };

    const handleOpenContact = () => {
        onOpenConsultationModal();
    };

    return (
        <div className="bg-white font-sans">
            <SEO
                title="HomeListingAI - AI Real Estate Assistant"
                description="Automate your real estate business with 24/7 AI agents. Lead qualification, scheduling, and marketing automation for modern realtors."
                schema={{
                    "@context": "https://schema.org",
                    "@type": "SoftwareApplication",
                    "name": "HomeListingAI",
                    "applicationCategory": "BusinessApplication",
                    "operatingSystem": "Web",
                    "offers": {
                        "@type": "Offer",
                        "price": "89.00",
                        "priceCurrency": "USD"
                    },
                    "description": "AI-powered real estate assistant for lead generation and management."
                }}
            />
            <PublicHeader
                onNavigateToSignUp={onNavigateToSignUp}
                onNavigateToSignIn={onNavigateToSignIn}
                onEnterDemoMode={onEnterDemoMode}
                onOpenContact={handleOpenContact}
                onNavigateToShowcase={onNavigateToShowcase}
            />
            <main className="pt-20"> {/* Add padding top to account for fixed header */}
                <Hero onNavigateToSignUp={onNavigateToSignUp} onEnterDemoMode={onEnterDemoMode} onOpenChatBot={handleOpenChatBot} />

                <ConversionWedge onNavigateToSignUp={onNavigateToSignUp} onEnterDemoMode={onEnterDemoMode} />

                <PlacementSection onNavigateToSignUp={onNavigateToSignUp} onEnterDemoMode={onEnterDemoMode} />

                <ProofSectionNew onNavigateToSignUp={onNavigateToSignUp} onEnterDemoMode={onEnterDemoMode} />

                <StatStripNew />

                <PricingSectionNew onNavigateToSignUp={onNavigateToSignUp} onEnterDemoMode={onEnterDemoMode} />

                <FaqSectionNew onNavigateToSignUp={onNavigateToSignUp} onEnterDemoMode={onEnterDemoMode} />

                <FinalCtaNew onNavigateToSignUp={onNavigateToSignUp} onEnterDemoMode={onEnterDemoMode} />
            </main>
            <PublicFooter onNavigateToAdmin={onNavigateToAdmin} />

            {/* Chat Bot FAB for visitors */}
            <Suspense fallback={null}>
                <ChatBotFAB
                    context={{
                        userType: 'visitor',
                        currentPage: 'landing',
                        previousInteractions: 0,
                        userInfo: {}
                    }}
                    onLeadGenerated={(leadInfo) => {
                        console.log('Lead generated from landing page chat:', leadInfo);
                        // Could trigger analytics event or save lead
                    }}
                    onSupportTicket={(ticketInfo) => {
                        console.log('Support ticket created from landing page:', ticketInfo);
                        // Could create support ticket or send notification
                    }}
                    position="bottom-right"
                    initialOpen={isChatOpen}
                />
            </Suspense>

            {/* <AIContactOverlay isOpen={false} onClose={() => {}} /> Unused - replaced by ConsultationModal */}
        </div >
    );
};

export default LandingPage;
