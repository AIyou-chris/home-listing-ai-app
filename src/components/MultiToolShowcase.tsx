import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const tools = [
    {
        id: 'listing',
        title: 'AI Listing App',
        icon: 'home_app_logo',
        image: '/demo/silverlake-app.png',
        headline: 'Turn Every Listing Into an App',
        description: 'Instantly generate a branded mobile app for every property. Buyers get 24/7 answers, and you get every lead.',
        bullets: [
            {
                icon: 'chat_bubble',
                text: '24/7 AI Receptionist answers questions instantly',
                subtext: 'Never miss a query about schools or HOA fees again—even at 2 AM.'
            },
            {
                icon: 'campaign',
                text: 'Auto-promotes to social media & email lists',
                subtext: 'Save hours of manual posting. One click syndicates your listing everywhere.'
            },
            {
                icon: 'lock',
                text: 'Captures visitor contact info automatically',
                subtext: 'Turn casual browsers into leads without lifting a finger.'
            },
            {
                icon: 'qr_code',
                text: 'Instant QR Code & Flyer Generation for print',
                subtext: 'Ready-to-print marketing materials created in seconds for your open house.'
            }
        ],
        layout: 'left-image'
    },
    {
        id: 'card',
        title: 'AI Business Card',
        icon: 'contact_page',
        image: '/demo/ai-card-mockup.png',
        headline: "The Last Business Card You'll Ever Need",
        description: 'Share your profile, listings, and calendar in one tap. Your AI Assistant introduces you and schedules appointments on the spot.',
        bullets: [
            {
                icon: 'qr_code_2',
                text: 'Share instantly via QR code, link, or text',
                subtext: 'Ditch the paper cards. Share your professional profile effortlessly at networking events.'
            },
            {
                icon: 'calendar_month',
                text: 'Built-in scheduling & calendar sync',
                subtext: 'Let clients book time with you directly from your card, syncing with your calendar.'
            },
            {
                icon: 'smart_toy',
                text: 'AI chats with leads on your behalf',
                subtext: 'Your digital twin qualifies prospects while you focus on showing homes.'
            },
            {
                icon: 'sync',
                text: 'Seamless CRM integration updates contacts',
                subtext: 'New contacts go straight to your database—no more lost business cards.'
            }
        ],
        layout: 'right-image'
    },
    {
        id: 'funnel',
        title: 'AI Lead Funnel',
        icon: 'alt_route',
        image: '/demo/ai-funnel-mockup.png',
        headline: 'Nurture Leads While You Sleep',
        description: 'Automated multi-channel funnels guide buyers from "just looking" to "ready to buy". No manual follow-up required.',
        bullets: [
            {
                icon: 'send',
                text: 'Automated SMS & Email sequences',
                subtext: 'Keep your name top-of-mind with drip campaigns that feel personal, not robotic.'
            },
            {
                icon: 'psychology',
                text: 'AI qualifies & scores lead intent',
                subtext: 'Know exactly who is ready to buy now versus who is just looking.'
            },
            {
                icon: 'notifications_active',
                text: 'Instant alerts for hot prospects',
                subtext: 'Get notified the moment a lead shows high interest so you can call immediately.'
            },
            {
                icon: 'drag_indicator',
                text: 'Drag-and-drop journey builder',
                subtext: 'Customize the buyer journey visually to match your unique sales process.'
            }
        ],
        layout: 'left-image'
    },
    {
        id: 'assistant',
        title: 'AI Assistant',
        icon: 'smart_toy',
        image: '/demo/ai-assistant-mockup.png',
        headline: 'Your 24/7 Digital Twin',
        description: 'Clone yourself with an AI that knows your business, your listings, and your style. It works 24/7 so you don\'t have to.',
        bullets: [
            {
                icon: 'translate',
                text: 'Responds in 12+ languages',
                subtext: 'Serve international buyers in their native language without needing a translator.'
            },
            {
                icon: 'history',
                text: 'Remembers context from past conversations',
                subtext: 'Your AI recalls previous details—like "looking for a pool"—to build trust.'
            },
            {
                icon: 'group',
                text: 'Handles 100s of conversations simultaneously',
                subtext: 'Scale your outreach infinitely. Talk to 500 leads as easily as one.'
            },
            {
                icon: 'description',
                text: 'Drafts contracts & emails instantly',
                subtext: 'Generate professional offers and communications in seconds, not hours.'
            }
        ],
        layout: 'right-image'
    },
    {
        id: 'marketing',
        title: 'Marketing Hub',
        icon: 'ads_click',
        image: '/demo/marketing-hub-laptop.png',
        headline: 'Content Creation on Autopilot',
        description: 'Generate listing descriptions, social posts, and ad copy in seconds. Post to Facebook, Instagram, and LinkedIn with one click.',
        bullets: [
            {
                icon: 'edit_note',
                text: 'SEO-optimized listing descriptions',
                subtext: 'Rank higher on Zillow and Google with descriptions written to attract search traffic.'
            },
            {
                icon: 'share',
                text: 'One-click multi-platform posting',
                subtext: 'Blast your new listing to Facebook, Instagram, and LinkedIn instantly.'
            },
            {
                icon: 'bar_chart',
                text: 'Track engagement & ROI in real-time',
                subtext: 'See exactly which posts are driving leads so you can double down on what works.'
            },
            {
                icon: 'checklist',
                text: 'AI "Pulse" smart daily task prioritization',
                subtext: 'Start every day knowing exactly which 5 tasks will make you money.'
            }
        ],
        layout: 'left-image'
    }
];

const animations = [
    'animate-fade-in-left', // Listing (Left Layout) -> Slide in from Left
    'animate-scale-in',     // Card -> Pop in
    'animate-slide-in-right', // Funnel (Left Layout, but visually maybe flow right?) Let's stick to Layout logic or variety. slide-in-right is cool.
    'animate-fade-in-up',   // Assistant -> Rise up
    'animate-slide-in-left' // Marketing -> Slide in from Left
];

export const MultiToolShowcase: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState(0);

    return (
        <section className="py-24 bg-white relative overflow-hidden">

            {/* Background Elements */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-b from-blue-50 to-white opacity-50"></div>

                {/* Floating geometric shapes */}
                <div className="absolute top-20 left-10 w-40 h-40 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full opacity-10 animate-float-slow blur-3xl"></div>
                <div className="absolute top-1/3 right-10 w-32 h-32 bg-gradient-to-r from-green-400 to-blue-400 rounded-full opacity-10 animate-float blur-2xl"></div>
                <div className="absolute bottom-20 left-1/4 w-24 h-24 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full opacity-10 animate-float-slower blur-xl"></div>

                {/* Floating icons */}
                <div className="absolute top-40 right-1/4 opacity-5 animate-float hidden lg:block">
                    <span className="material-symbols-outlined text-6xl text-blue-500">grid_view</span>
                </div>
                <div className="absolute bottom-40 left-1/3 opacity-5 animate-float-slow hidden lg:block">
                    <span className="material-symbols-outlined text-5xl text-purple-500">auto_awesome</span>
                </div>

                {/* Dots pattern */}
                <div className="absolute top-0 left-0 w-full h-full opacity-3">
                    <div className="grid grid-cols-12 md:grid-cols-20 gap-4 w-full h-full">
                        {Array.from({ length: 80 }).map((_, i) => (
                            <div key={i} className="w-1 h-1 bg-blue-400 rounded-full animate-pulse"
                                style={{
                                    animationDelay: `${i * 0.15}s`,
                                    animationDuration: `${3 + Math.random() * 2}s`
                                }}></div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

                {/* Header / Tabs */}
                <div className="mb-12 md:mb-20">
                    <div className="text-center mb-10 md:mb-16 animate-fade-in-up">
                        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight mb-6">
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-500">Get Leads.</span>{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-600">Nurture Leads.</span>{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600">Close Leads.</span>{' '}
                            <span className="text-slate-800">Repeat.</span>
                        </h2>
                        <p className="max-w-3xl mx-auto text-lg md:text-xl text-slate-600 font-medium leading-relaxed">
                            The Ultimate Real Estate AI App. Built with 15 years of real estate industry experience and over 20 years of online development and marketing expertise.
                        </p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-4 md:gap-6">
                        {tools.map((tool, index) => (
                            <button
                                key={tool.id}
                                onClick={() => setActiveTab(index)}
                                className={`group flex flex-col items-center gap-3 p-4 rounded-2xl transition-all duration-300 min-w-[110px] sm:min-w-[130px] border ${activeTab === index
                                    ? 'bg-white border-blue-100 shadow-xl scale-105'
                                    : 'bg-slate-50 border-transparent hover:bg-white hover:shadow-md hover:scale-105'
                                    }`}
                            >
                                <div className={`p-3.5 rounded-2xl flex items-center justify-center transition-all duration-500 ${activeTab === index
                                    ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg scale-110'
                                    : 'bg-white text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500'
                                    }`}>
                                    <span className={`material-symbols-outlined text-2xl ${activeTab === index ? 'animate-pulse' : ''}`}>
                                        {tool.icon}
                                    </span>
                                </div>
                                <span className={`font-bold text-sm tracking-wide ${activeTab === index ? 'text-slate-900' : 'text-slate-500 group-hover:text-slate-700'}`}>
                                    {tool.title}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Area */}
                <div key={activeTab} className={animations[activeTab % animations.length]}>
                    <div className="bg-slate-50/60 border border-white/60 p-6 md:p-12 rounded-[2.5rem] shadow-2xl backdrop-blur-md">
                        <div className={`grid lg:grid-cols-2 gap-12 lg:gap-24 items-center`}>

                            {/* Image Column */}
                            <div className={`transition-all duration-500 ${tools[activeTab].layout === 'right-image' ? 'lg:order-2' : 'lg:order-1'
                                }`}>
                                <div className="relative group perspective-1000">
                                    {/* Glow Effect */}
                                    <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-purple-500/20 rounded-[2.5rem] blur-3xl transform -rotate-6 scale-95 group-hover:scale-100 transition-transform duration-700"></div>

                                    {/* Image Container */}
                                    <div className="relative transform transition-all duration-500 group-hover:rotate-y-2 group-hover:scale-[1.02]">
                                        <img
                                            src={tools[activeTab].image}
                                            alt={tools[activeTab].title}
                                            className="relative w-full h-auto max-h-[600px] object-contain mx-auto drop-shadow-2xl"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Text Column */}
                            <div className={`space-y-8 ${tools[activeTab].layout === 'right-image' ? 'lg:order-1' : 'lg:order-2'}`}>
                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-700 font-bold text-sm border border-blue-100">
                                    <span className="material-symbols-outlined text-lg">{tools[activeTab].icon}</span>
                                    {tools[activeTab].title}
                                </div>

                                <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 leading-tight">
                                    {tools[activeTab].headline}
                                </h2>

                                <p className="text-xl text-slate-600 leading-relaxed">
                                    {tools[activeTab].description}
                                </p>

                                <ul className="grid gap-6">
                                    {tools[activeTab].bullets.map((bullet, i) => (
                                        <li key={i} className="flex items-start gap-4 p-4 rounded-xl hover:bg-white transition-colors border border-transparent hover:border-slate-100 hover:shadow-sm">
                                            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 mt-1">
                                                <span className="material-symbols-outlined">{bullet.icon}</span>
                                            </div>
                                            <div>
                                                <p className="text-lg text-slate-800 font-bold leading-tight">{bullet.text}</p>
                                                <p className="text-sm text-slate-500 font-medium leading-relaxed mt-1.5">{bullet.subtext}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>

                            </div>

                        </div>
                    </div>
                </div>

                {/* Global CTA Buttons */}
                <div className="mt-16 flex flex-col sm:flex-row justify-center items-center gap-6 relative z-10 animate-fade-in-up animation-delay-200">
                    <button onClick={() => navigate('/signup')} className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 text-white font-bold text-lg rounded-xl shadow-lg hover:bg-blue-700 transition-all transform hover:scale-105 active:scale-95 hover:shadow-blue-500/25 ring-offset-2 focus:ring-2 ring-blue-500">
                        <span className="material-symbols-outlined animate-pulse">auto_awesome</span>
                        Get Started Now
                    </button>
                    <button onClick={() => navigate('/agent-blueprint-dashboard')} className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-purple-600 text-white font-bold text-lg rounded-xl shadow-lg hover:bg-purple-700 transition-all transform hover:scale-105 active:scale-95 hover:shadow-purple-500/25 ring-offset-2 focus:ring-2 ring-purple-500">
                        <span className="material-symbols-outlined animate-bounce">rocket_launch</span>
                        Explore the Live Dashboard
                    </button>
                </div>
            </div>
        </section>
    );
};
