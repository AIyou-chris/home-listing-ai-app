import React, { useState } from 'react';
import { LogoWithName } from './LogoWithName';
import ChatBotFAB from './ChatBotFAB';

// --- New Components for the Redesigned Page ---

const Header: React.FC<{ onNavigateToSignUp: () => void; onNavigateToSignIn: () => void; onEnterDemoMode: () => void; onOpenConsultationModal: () => void; }> = ({ onNavigateToSignUp, onNavigateToSignIn, onEnterDemoMode, onOpenConsultationModal }) => {
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const navLinks = [
        { name: "Price", href: "#pricing" },
        { name: "Demo", href: "#demo" },
        { name: "White Label", href: "#contact" },
        { name: "Contact", href: "#contact" }
    ];

    const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
        e.preventDefault();
        if (targetId === '#demo') {
            onEnterDemoMode();
        } else if (targetId === '#contact') {
            onOpenConsultationModal();
        }
        else {
            const element = document.getElementById(targetId.substring(1));
            if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
            }
        }
        setIsMenuOpen(false);
    };

    return (
        <header className="absolute top-0 left-0 right-0 z-50 py-4 bg-white/80 backdrop-blur-sm shadow-sm">
            <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
                <nav className="relative flex items-center justify-between">
                    <a href="#" className="flex items-center">
                        <LogoWithName />
                    </a>
                    <div className="hidden lg:flex lg:items-center lg:space-x-6">
                        {navLinks.map((link) => (
                            <a key={link.name} href={link.href} onClick={(e) => handleLinkClick(e, link.href)} className="text-sm font-semibold text-slate-700 hover:text-primary-600 transition-colors">
                                {link.name}
                            </a>
                        ))}
                    </div>
                    <div className="hidden lg:flex items-center gap-4">
                        <button onClick={onNavigateToSignIn} className="text-sm font-semibold text-slate-700 hover:text-primary-600 transition-colors">Login</button>
                        <button onClick={onNavigateToSignUp} className="px-5 py-2.5 bg-blue-600 text-white font-semibold text-sm rounded-lg shadow-md hover:bg-blue-700 transition-all">
                            Sign Up
                        </button>
                    </div>
                    <div className="lg:hidden">
                        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 rounded-md text-slate-600 hover:bg-slate-100">
                            <span className="material-symbols-outlined">{isMenuOpen ? 'close' : 'menu'}</span>
                        </button>
                    </div>
                </nav>
                {isMenuOpen && (
                    <div className="lg:hidden mt-4 bg-white rounded-lg shadow-lg p-4 space-y-2">
                        {navLinks.map((link) => (
                            <a key={link.name} href={link.href} onClick={(e) => handleLinkClick(e, link.href)} className="block px-3 py-2 text-base font-medium text-slate-700 rounded-md hover:bg-slate-50">
                                {link.name}
                            </a>
                        ))}
                        <div className="border-t border-slate-200 pt-4 space-y-2">
                             <button onClick={onNavigateToSignIn} className="w-full text-left block px-3 py-2 text-base font-medium text-slate-700 rounded-md hover:bg-slate-50">Login</button>
                             <button onClick={onNavigateToSignUp} className="w-full text-left block px-3 py-2 text-base font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">Sign Up</button>
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
};

type DemoFeatureId = 'analytics' | 'personality' | 'leadgen' | 'notifications';

const RevolutionaryAIFeaturesSection: React.FC = () => {
    const [activeDemo, setActiveDemo] = useState<DemoFeatureId>('analytics');

    const DemoSection: React.FC<{ title: string; children: React.ReactNode; isActive: boolean }> = ({ title, children, isActive }) => (
        <div className={`transition-all duration-500 ${isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-95 absolute'}`}>
            <h3 className="text-2xl font-bold text-slate-900 mb-6">{title}</h3>
            {children}
        </div>
    );

    return (
        <section className="py-20 bg-white relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute inset-0 pointer-events-none">
                {/* Floating Charts */}
                <div className="absolute top-20 left-10 opacity-10 animate-float-slow">
                    <svg width="80" height="60" viewBox="0 0 80 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10 50L20 40L30 45L40 35L50 30L60 25L70 20L80 15" stroke="#3B82F6" strokeWidth="2" fill="none"/>
                        <circle cx="20" cy="40" r="3" fill="#3B82F6"/>
                        <circle cx="40" cy="35" r="3" fill="#3B82F6"/>
                        <circle cx="60" cy="25" r="3" fill="#3B82F6"/>
                        <circle cx="80" cy="15" r="3" fill="#3B82F6"/>
                    </svg>
                </div>
                
                <div className="absolute top-40 right-20 opacity-8 animate-float-slower">
                    <svg width="60" height="40" viewBox="0 0 60 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="10" y="25" width="8" height="15" fill="#10B981"/>
                        <rect x="22" y="20" width="8" height="20" fill="#10B981"/>
                        <rect x="34" y="15" width="8" height="25" fill="#10B981"/>
                        <rect x="46" y="10" width="8" height="30" fill="#10B981"/>
                    </svg>
                </div>

                {/* Floating Icons */}
                <div className="absolute top-60 left-20 opacity-5 animate-float">
                    <span className="material-symbols-outlined text-6xl text-blue-500">analytics</span>
                </div>
                
                <div className="absolute top-80 right-10 opacity-5 animate-float-slow">
                    <span className="material-symbols-outlined text-5xl text-green-500">trending_up</span>
                </div>

                <div className="absolute top-40 left-1/4 opacity-5 animate-float-slower">
                    <span className="material-symbols-outlined text-4xl text-purple-500">psychology</span>
                </div>
                
                <div className="absolute bottom-60 right-1/4 opacity-5 animate-float">
                    <span className="material-symbols-outlined text-4xl text-orange-500">target</span>
                </div>
                
                <div className="absolute bottom-40 left-1/3 opacity-5 animate-float-slow">
                    <span className="material-symbols-outlined text-3xl text-red-500">favorite</span>
                </div>

                {/* Geometric Shapes */}
                <div className="absolute top-20 right-1/3 opacity-5 animate-pulse">
                    <div className="w-16 h-16 border-2 border-blue-300 rounded-full"></div>
                </div>
                
                <div className="absolute top-100 left-1/3 opacity-5 animate-bounce">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-400 rounded-lg transform rotate-45"></div>
                </div>

                {/* Dots Pattern */}
                <div className="absolute top-0 left-0 w-full h-full opacity-3">
                    <div className="grid grid-cols-20 gap-4 w-full h-full">
                        {Array.from({ length: 100 }).map((_, i) => (
                            <div key={i} className="w-1 h-1 bg-blue-300 rounded-full animate-pulse" 
                                 style={{ 
                                     animationDelay: `${i * 0.1}s`,
                                     animationDuration: `${2 + Math.random() * 2}s`
                                 }}></div>
                        ))}
                    </div>
                </div>

                {/* Gradient Orbs */}
                <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full opacity-5 animate-pulse blur-xl"></div>
                <div className="absolute bottom-1/4 left-1/4 w-24 h-24 bg-gradient-to-r from-green-400 to-blue-400 rounded-full opacity-5 animate-pulse blur-xl"></div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold text-slate-900 mb-4 animate-fade-in-up">
                        Revolutionary AI Features
                    </h2>
                    <p className="text-xl text-slate-600 animate-fade-in-up animation-delay-200">
                        See how our AI transforms every aspect of real estate
                    </p>
                </div>

                {/* Feature Navigation */}
                <div className="flex flex-wrap justify-center gap-4 mb-12 animate-fade-in-up animation-delay-400">
                    {([
                        { id: 'analytics', label: 'Analytics Dashboard', icon: '📊' },
                        { id: 'personality', label: 'AI Personalities', icon: '🎭' },
                        { id: 'leadgen', label: 'Lead Generation', icon: '🎯' },
                        { id: 'notifications', label: 'Smart Notifications', icon: '🔔' }
                    ] as Array<{ id: DemoFeatureId; label: string; icon: string }>).map(feature => (
                        <button
                            key={feature.id}
                            onClick={() => setActiveDemo(feature.id)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 ${
                                activeDemo === feature.id
                                    ? 'bg-primary-600 text-white shadow-lg'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                        >
                            <span className="animate-bounce">{feature.icon}</span>
                            <span>{feature.label}</span>
                        </button>
                    ))}
                </div>

                {/* Interactive Demo Area */}
                <div className="relative min-h-[600px] bg-slate-50 rounded-2xl p-8 shadow-xl backdrop-blur-sm border border-slate-200/50 animate-fade-in-up animation-delay-600">
                    {/* Background Pattern for Demo Area */}
                    <div className="absolute inset-0 opacity-5">
                        <div className="absolute top-4 right-4">
                            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="20" cy="20" r="18" stroke="#3B82F6" strokeWidth="1" fill="none"/>
                                <circle cx="20" cy="20" r="12" stroke="#3B82F6" strokeWidth="1" fill="none"/>
                                <circle cx="20" cy="20" r="6" stroke="#3B82F6" strokeWidth="1" fill="none"/>
                            </svg>
                        </div>
                        <div className="absolute bottom-4 left-4">
                            <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M15 5L25 15L15 25L5 15Z" stroke="#10B981" strokeWidth="1" fill="none"/>
                            </svg>
                        </div>
                    </div>

                    <DemoSection title="Real-Time Analytics Dashboard" isActive={activeDemo === 'analytics'}>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[
                                { title: 'Total Properties', value: '24', change: '+12%', icon: '🏠' },
                                { title: 'Active Leads', value: '156', change: '+8%', icon: '👥' },
                                { title: 'Conversion Rate', value: '23.4%', change: '+5%', icon: '📈' },
                                { title: 'Monthly Revenue', value: '$89.2K', change: '+18%', icon: '💰' }
                            ].map((metric, index) => (
                                <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 transform hover:scale-105 transition-all duration-300 animate-fade-in-up" 
                                     style={{ animationDelay: `${index * 100}ms` }}>
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-2xl animate-pulse">{metric.icon}</span>
                                        <span className="text-green-600 text-sm font-semibold animate-bounce">{metric.change}</span>
                                    </div>
                                    <h4 className="text-2xl font-bold text-slate-900 mb-1">{metric.value}</h4>
                                    <p className="text-slate-600 text-sm">{metric.title}</p>
                                </div>
                            ))}
                        </div>
                        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 transform hover:scale-105 transition-all duration-300 animate-fade-in-up animation-delay-400">
                                <h4 className="font-semibold text-slate-900 mb-4">Lead Source Performance</h4>
                                <div className="space-y-3">
                                    {[
                                        { source: 'Website', leads: 45, conversion: '28%' },
                                        { source: 'Social Media', leads: 32, conversion: '22%' },
                                        { source: 'Referrals', leads: 28, conversion: '35%' },
                                        { source: 'Direct', leads: 51, conversion: '18%' }
                                    ].map((item, index) => (
                                        <div key={index} className="flex items-center justify-between animate-fade-in-left" 
                                             style={{ animationDelay: `${index * 100}ms` }}>
                                            <span className="text-slate-700">{item.source}</span>
                                            <div className="flex items-center gap-4">
                                                <span className="text-slate-600">{item.leads} leads</span>
                                                <span className="text-green-600 font-semibold">{item.conversion}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 transform hover:scale-105 transition-all duration-300 animate-fade-in-up animation-delay-600">
                                <h4 className="font-semibold text-slate-900 mb-4">Property Performance</h4>
                                <div className="space-y-3">
                                    {[
                                        { property: 'Ocean Drive Villa', views: 234, inquiries: 12 },
                                        { property: 'Downtown Loft', views: 189, inquiries: 8 },
                                        { property: 'Mountain Cabin', views: 156, inquiries: 6 },
                                        { property: 'City Penthouse', views: 298, inquiries: 15 }
                                    ].map((item, index) => (
                                        <div key={index} className="flex items-center justify-between animate-fade-in-right" 
                                             style={{ animationDelay: `${index * 100}ms` }}>
                                            <span className="text-slate-700 truncate">{item.property}</span>
                                            <div className="flex items-center gap-4">
                                                <span className="text-slate-600">{item.views} views</span>
                                                <span className="text-primary-600 font-semibold">{item.inquiries} inquiries</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </DemoSection>

                    <DemoSection title="AI Personality System" isActive={activeDemo === 'personality'}>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="animate-fade-in-left">
                                <h4 className="font-semibold text-slate-900 mb-4">Your Three AI Sidekicks</h4>
                                <div className="space-y-4">
                                    {[
                                        { name: 'Listing Sidekick', type: 'listing', description: 'Specializes in home listings and property-specific information' },
                                        { name: 'Agent Sidekick', type: 'agent', description: 'Represents the real estate agent and handles sales conversations' },
                                        { name: 'Helper Sidekick', type: 'helper', description: 'Helps agents navigate the dashboard and maximize ROI' }
                                    ].map((sidekick, index) => (
                                        <div key={index} className="bg-white p-4 rounded-lg border border-slate-200 transform hover:scale-105 transition-all duration-300 animate-fade-in-up" 
                                             style={{ animationDelay: `${index * 200}ms` }}>
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center animate-pulse ${
                                                    sidekick.type === 'listing' ? 'bg-green-100' :
                                                    sidekick.type === 'agent' ? 'bg-blue-100' : 'bg-purple-100'
                                                }`}>
                                                    <span className={`text-sm ${
                                                        sidekick.type === 'listing' ? 'text-green-600' :
                                                        sidekick.type === 'agent' ? 'text-blue-600' : 'text-purple-600'
                                                    }`}>
                                                        {sidekick.type === 'listing' ? '🏠' :
                                                         sidekick.type === 'agent' ? '👤' : '🤖'}
                                                    </span>
                                                </div>
                                                <h5 className="font-semibold text-slate-900">{sidekick.name}</h5>
                                            </div>
                                            <p className="text-sm text-slate-600">{sidekick.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="animate-fade-in-right">
                                <h4 className="font-semibold text-slate-900 mb-4">AI Personalities</h4>
                                <div className="space-y-3">
                                    {[
                                        { name: 'Professional Expert', traits: ['Authoritative', 'Knowledgeable'] },
                                        { name: 'Friendly Guide', traits: ['Warm', 'Approachable'] },
                                        { name: 'Marketing Specialist', traits: ['Creative', 'Enthusiastic'] }
                                    ].map((personality, index) => (
                                        <div key={index} className="bg-slate-50 p-3 rounded-lg border border-slate-200 transform hover:scale-105 transition-all duration-300 animate-fade-in-up" 
                                             style={{ animationDelay: `${index * 200}ms` }}>
                                            <div className="flex items-center gap-2 mb-2">
                                                <h6 className="font-semibold text-slate-800">{personality.name}</h6>
                                                <div className="flex gap-1">
                                                    {personality.traits.map((trait, traitIndex) => (
                                                        <span key={traitIndex} className="px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full animate-pulse" 
                                                              style={{ animationDelay: `${traitIndex * 100}ms` }}>
                                                            {trait}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </DemoSection>

                    <DemoSection title="AI Lead Generation & Nurturing" isActive={activeDemo === 'leadgen'}>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Lead Generation Process */}
                            <div className="animate-fade-in-left">
                                <h4 className="font-semibold text-slate-900 mb-4">24/7 Lead Generation Process</h4>
                                <div className="space-y-4">
                                    {[
                                        { step: '1', title: 'Instant Engagement', description: 'AI responds to every inquiry within seconds, keeping buyers engaged', icon: '⚡' },
                                        { step: '2', title: 'Smart Qualification', description: 'AI asks intelligent questions to qualify leads automatically', icon: '🎯' },
                                        { step: '3', title: 'Lead Capture', description: 'Contact info and conversation history saved to your dashboard', icon: '📝' },
                                        { step: '4', title: 'Real-time Alerts', description: 'Get notified instantly when hot leads are captured', icon: '🔔' }
                                    ].map((item, index) => (
                                        <div key={index} className="bg-white p-4 rounded-lg border border-slate-200 transform hover:scale-105 transition-all duration-300 animate-fade-in-up" 
                                             style={{ animationDelay: `${index * 150}ms` }}>
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center animate-pulse">
                                                    <span className="text-sm font-bold text-primary-600">{item.step}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xl">{item.icon}</span>
                                                    <h5 className="font-semibold text-slate-900">{item.title}</h5>
                                                </div>
                                            </div>
                                            <p className="text-sm text-slate-600 ml-11">{item.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Lead Nurturing Features */}
                            <div className="animate-fade-in-right">
                                <h4 className="font-semibold text-slate-900 mb-4">AI-Powered Lead Nurturing</h4>
                                <div className="space-y-4">
                                    {[
                                        { feature: 'Automated Follow-ups', status: 'Active', leads: '156', icon: '🔄' },
                                        { feature: 'Personalized Messages', status: 'Active', leads: '89', icon: '💬' },
                                        { feature: 'Appointment Scheduling', status: 'Active', leads: '23', icon: '📅' },
                                        { feature: 'Market Updates', status: 'Active', leads: '67', icon: '📈' }
                                    ].map((item, index) => (
                                        <div key={index} className="bg-slate-50 p-4 rounded-lg border border-slate-200 transform hover:scale-105 transition-all duration-300 animate-fade-in-up" 
                                             style={{ animationDelay: `${index * 150}ms` }}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-2xl">{item.icon}</span>
                                                    <div>
                                                        <h5 className="font-semibold text-slate-900">{item.feature}</h5>
                                                        <p className="text-sm text-slate-500">{item.leads} leads engaged</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                                    <span className="text-sm text-green-600 font-semibold">{item.status}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        
                        {/* Lead Quality Metrics */}
                        <div className="mt-8 bg-white p-6 rounded-xl shadow-sm border border-slate-200 animate-fade-in-up animation-delay-600">
                            <h4 className="font-semibold text-slate-900 mb-4 text-center">Lead Quality Metrics</h4>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                {[
                                    { metric: 'Response Time', value: '< 30 sec', improvement: '+85%' },
                                    { metric: 'Lead Quality', value: '92%', improvement: '+67%' },
                                    { metric: 'Conversion Rate', value: '23.4%', improvement: '+45%' },
                                    { metric: 'Follow-up Rate', value: '100%', improvement: '+100%' }
                                ].map((item, index) => (
                                    <div key={index} className="text-center animate-fade-in-up" 
                                         style={{ animationDelay: `${index * 100}ms` }}>
                                        <div className="text-2xl font-bold text-primary-600 mb-1">{item.value}</div>
                                        <div className="text-sm text-slate-600 mb-1">{item.metric}</div>
                                        <div className="text-xs text-green-600 font-semibold">{item.improvement}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        <div className="mt-6 text-center animate-fade-in-up animation-delay-800">
                            <button className="bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 transition transform hover:scale-105">
                                Start Generating Leads
                            </button>
                        </div>
                    </DemoSection>

                    <DemoSection title="Smart Notification System" isActive={activeDemo === 'notifications'}>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="animate-fade-in-left">
                                <h4 className="font-semibold text-slate-900 mb-4">Real-Time Notifications</h4>
                                <div className="space-y-3">
                                    {[
                                        { type: 'success', title: 'New Lead Captured', message: 'John Doe inquired about Ocean Drive Villa', time: '2 min ago' },
                                        { type: 'info', title: 'Appointment Scheduled', message: 'Showing scheduled for tomorrow at 2 PM', time: '5 min ago' },
                                        { type: 'warning', title: 'Market Update', message: 'Property values increased 3.2% this month', time: '1 hour ago' },
                                        { type: 'error', title: 'Lead Lost', message: 'Sarah Smith chose another property', time: '2 hours ago' }
                                    ].map((notification, index) => (
                                        <div key={index} className={`p-4 rounded-lg border transform hover:scale-105 transition-all duration-300 animate-fade-in-up ${
                                            notification.type === 'success' ? 'bg-green-50 border-green-200' :
                                            notification.type === 'info' ? 'bg-blue-50 border-blue-200' :
                                            notification.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                                            'bg-red-50 border-red-200'
                                        }`} style={{ animationDelay: `${index * 150}ms` }}>
                                            <div className="flex items-start gap-3">
                                                <span className={`text-lg animate-pulse ${
                                                    notification.type === 'success' ? 'text-green-600' :
                                                    notification.type === 'info' ? 'text-blue-600' :
                                                    notification.type === 'warning' ? 'text-yellow-600' :
                                                    'text-red-600'
                                                }`}>
                                                    {notification.type === 'success' ? '✅' :
                                                     notification.type === 'info' ? 'ℹ️' :
                                                     notification.type === 'warning' ? '⚠️' : '❌'}
                                                </span>
                                                <div className="flex-1">
                                                    <h5 className="font-semibold text-slate-900">{notification.title}</h5>
                                                    <p className="text-sm text-slate-600">{notification.message}</p>
                                                    <p className="text-xs text-slate-500 mt-1">{notification.time}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="animate-fade-in-right">
                                <h4 className="font-semibold text-slate-900 mb-4">Notification Settings</h4>
                                <div className="bg-white p-6 rounded-lg border border-slate-200 transform hover:scale-105 transition-all duration-300">
                                    <div className="space-y-4">
                                        {[
                                            'New Lead Notifications',
                                            'Appointment Reminders',
                                            'Market Updates',
                                            'AI Interaction Alerts',
                                            'Weekly Performance Reports'
                                        ].map((setting, index) => (
                                            <div key={index} className="flex items-center justify-between animate-fade-in-up" 
                                                 style={{ animationDelay: `${index * 100}ms` }}>
                                                <span className="text-slate-700">{setting}</span>
                                                <div className="w-12 h-6 bg-primary-600 rounded-full relative animate-pulse">
                                                    <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5"></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </DemoSection>
                </div>
            </div>
        </section>
    );
};

const DashboardShowcaseSection: React.FC<{ onEnterDemoMode: () => void; onNavigateToSignUp: () => void }> = ({ onEnterDemoMode, onNavigateToSignUp }) => {
    const features = [
        { icon: 'track_changes', title: 'Never Lose a Lead', description: 'Watch in real-time as every inquiry—from your website, ads, or QR codes—populates your dashboard instantly.' },
        { icon: 'psychology', title: 'Know Who to Call Next', description: 'Our AI doesn\'t just capture leads; it qualifies them. See who is pre-approved and ready to talk, so you can focus on the hottest prospects.' },
        { icon: 'autoplay', title: 'Follow-Up on Autopilot', description: 'Launch powerful, multi-step follow-up sequences with a single click. Nurture every lead perfectly without lifting a finger.' },
        { icon: 'language', title: 'AI App Listing', description: "Transform each property into an interactive, AI-powered mobile app that buyers can engage with 24/7. It's your always-on open house." },
        { icon: 'translate', title: '12 Languages, Zero Barriers', description: 'AI automatically detects and responds in 12 languages. Connect with international buyers and expand your market reach effortlessly.' },
        { icon: 'insights', title: 'Actionable Analytics', description: 'See which marketing channels are working and get insights to optimize your strategy, budget, and ROI.' },
    ];

    return (
        <section className="py-20 bg-slate-50 relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute inset-0 pointer-events-none">
                {/* Floating Icons */}
                <div className="absolute top-20 left-10 opacity-5 animate-float">
                    <span className="material-symbols-outlined text-5xl text-blue-500">dashboard</span>
                </div>
                <div className="absolute top-40 right-20 opacity-5 animate-float-slow">
                    <span className="material-symbols-outlined text-4xl text-green-500">analytics</span>
                </div>
                <div className="absolute bottom-20 left-1/3 opacity-5 animate-float-slower">
                    <span className="material-symbols-outlined text-3xl text-purple-500">trending_up</span>
                </div>
                
                {/* Geometric Shapes */}
                <div className="absolute top-60 right-1/4 opacity-5 animate-pulse">
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
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
                <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight animate-fade-in-up">Your Mission Control for Closing More Deals</h2>
                <p className="mt-4 max-w-3xl mx-auto text-lg text-slate-600 animate-fade-in-up animation-delay-200">
                    The AI Listing App is just the beginning. The real power is your dashboard—a command center designed to turn leads into sales and make you the hero of every transaction.
                </p>

                <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-left animate-fade-in-up animation-delay-400">
                    {features.map((feature, index) => (
                        <div key={feature.title} className="flex items-start gap-4 p-6 bg-white rounded-xl shadow-md border border-slate-200/60 transform hover:scale-105 transition-all duration-300 hover-lift animate-fade-in-up" 
                             style={{ animationDelay: `${index * 100}ms` }}>
                            <div className="flex-shrink-0 w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center animate-pulse">
                                <span className="material-symbols-outlined text-3xl text-primary-600">{feature.icon}</span>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">{feature.title}</h3>
                                <p className="mt-1 text-slate-600">{feature.description}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-12 animate-fade-in-up animation-delay-800 flex justify-center gap-4">
                    <button onClick={onNavigateToSignUp} className="px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg shadow-lg hover:bg-blue-700 transition-all text-lg transform hover:scale-105 btn-animate">
                        <span className="flex items-center gap-2">
                            <span className="material-symbols-outlined w-5 h-5 animate-pulse">auto_awesome</span>
                            Get Started Now
                        </span>
                    </button>
                    <button onClick={onEnterDemoMode} className="px-8 py-4 bg-purple-600 text-white font-bold rounded-lg shadow-lg hover:bg-purple-700 transition-all text-lg transform hover:scale-105 btn-animate">
                        <span className="flex items-center gap-2">
                            <span className="material-symbols-outlined animate-bounce">rocket_launch</span>
                            Explore the Live Dashboard
                        </span>
                    </button>
                </div>
            </div>
        </section>
    );
};

const AIAppShowcaseSection: React.FC = () => {
    const highlights = [
        { icon: 'smart_toy', title: 'Your 24/7 AI Assistant', description: 'Engage buyers instantly with an AI that answers questions, provides details, and captures leads around the clock.' },
        { icon: 'touch_app', title: 'Interactive Buyer Tools', description: 'Empower buyers with built-in mortgage calculators, school information, and one-tap showing requests.' },
        { icon: 'filter_alt', title: 'Seamless Lead Capture', description: 'Every interaction is a qualified lead. All conversations and contact info are sent directly to your agent dashboard.' },
        { icon: 'explore', title: 'A Pressure-Free Discovery', description: "Buyers can explore properties on their own terms. The AI offers a private, no-pressure environment to ask any question, any time, leading to a more comfortable and informed journey." },
        { icon: 'palette', title: 'Your Brand, Your App', description: "Every listing app is fully branded to you. Your logo, your colors, your photo. Reinforce your brand with every interaction and stand out from the competition." }
    ];

    return (
        <section id="how-it-works" className="py-20 bg-white relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute inset-0 pointer-events-none">
                {/* Floating Icons */}
                <div className="absolute top-20 left-10 opacity-5 animate-float">
                    <span className="material-symbols-outlined text-6xl text-blue-500">smartphone</span>
                </div>
                <div className="absolute top-40 right-20 opacity-5 animate-float-slow">
                    <span className="material-symbols-outlined text-5xl text-green-500">touch_app</span>
                </div>
                <div className="absolute bottom-20 left-1/4 opacity-5 animate-float-slower">
                    <span className="material-symbols-outlined text-4xl text-purple-500">smart_toy</span>
                </div>
                
                {/* Geometric Shapes */}
                <div className="absolute top-60 right-1/3 opacity-5 animate-pulse">
                    <div className="w-24 h-24 border-2 border-blue-300 rounded-full"></div>
                </div>
                <div className="absolute bottom-40 right-10 opacity-5 animate-bounce">
                    <div className="w-20 h-20 bg-gradient-to-r from-purple-400 to-pink-400 rounded-lg transform rotate-45"></div>
                </div>
                
                {/* Dots Pattern */}
                <div className="absolute top-0 left-0 w-full h-full opacity-3">
                    <div className="grid grid-cols-20 gap-4 w-full h-full">
                        {Array.from({ length: 60 }).map((_, i) => (
                            <div key={i} className="w-1 h-1 bg-blue-300 rounded-full animate-pulse" 
                                 style={{ 
                                     animationDelay: `${i * 0.2}s`,
                                     animationDuration: `${2 + Math.random() * 2}s`
                                 }}></div>
                        ))}
                    </div>
                </div>
                
                {/* Gradient Orbs */}
                <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full opacity-5 animate-pulse blur-xl"></div>
                <div className="absolute bottom-1/4 left-1/4 w-24 h-24 bg-gradient-to-r from-green-400 to-blue-400 rounded-full opacity-5 animate-pulse blur-xl"></div>
            </div>
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center">
                    <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 animate-fade-in-up">From Home To Lead Machine</h2>
                    <p className="mt-4 max-w-3xl mx-auto text-lg text-slate-600 animate-fade-in-up animation-delay-200">
                        Transform your listings into lead magnets! Build your AI listing app in minutes, then watch as your home becomes a powerful lead generation machine.
                    </p>
                </div>
                <div className="mt-16 grid lg:grid-cols-2 gap-16 items-center animate-fade-in-up animation-delay-400">
                    {/* Left Column - Listing App Preview */}
                    <div className="flex justify-center lg:justify-end animate-fade-in-left">
                        <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden transform hover:scale-105 transition-all duration-300">
                            {/* Property Image */}
                            <div className="relative">
                                <img 
                                    src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&auto=format&fit=crop&q=80" 
                                    alt="Modern home" 
                                    className="w-full h-48 object-cover"
                                />
                                <div className="absolute bottom-2 left-2 bg-slate-900/70 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                                    I'M REALTORS®
                                </div>
                            </div>
                            
                            {/* Property Details */}
                            <div className="p-6">
                                <h3 className="text-xl font-bold text-slate-900 mb-2">Stunning Mid-Century Modern in Silver Lake</h3>
                                <div className="flex items-center gap-1 text-slate-600 mb-4">
                                    <span className="material-symbols-outlined text-lg">location_on</span>
                                </div>
                                <div className="text-3xl font-bold text-green-600 mb-6">$500,000.00</div>
                                
                                {/* Property Stats */}
                                <div className="grid grid-cols-3 gap-4 mb-6 bg-slate-50 rounded-xl p-4">
                                    <div className="text-center">
                                        <div className="w-10 h-10 mx-auto mb-2 bg-blue-100 rounded-lg flex items-center justify-center">
                                            <span className="material-symbols-outlined text-blue-600">bed</span>
                                        </div>
                                        <div className="text-2xl font-bold text-slate-900">0</div>
                                        <div className="text-xs text-slate-600">Bedrooms</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="w-10 h-10 mx-auto mb-2 bg-blue-100 rounded-lg flex items-center justify-center">
                                            <span className="material-symbols-outlined text-blue-600">bathtub</span>
                                        </div>
                                        <div className="text-2xl font-bold text-slate-900">0</div>
                                        <div className="text-xs text-slate-600">Bathrooms</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="w-10 h-10 mx-auto mb-2 bg-blue-100 rounded-lg flex items-center justify-center">
                                            <span className="material-symbols-outlined text-blue-600">square_foot</span>
                                        </div>
                                        <div className="text-2xl font-bold text-slate-900">0</div>
                                        <div className="text-xs text-slate-600">Sq Ft</div>
                                    </div>
                                </div>
                                
                                {/* CTA Button */}
                                <button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 px-6 rounded-xl hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 mb-4">
                                    <span className="material-symbols-outlined">mic</span>
                                    Talk to the Home Now
                                </button>
                                
                                {/* Action Icons */}
                                <div className="grid grid-cols-4 gap-2">
                                    <button className="flex flex-col items-center gap-1 p-2 hover:bg-slate-50 rounded-lg transition-colors">
                                        <span className="material-symbols-outlined text-blue-600">event</span>
                                        <span className="text-xs text-slate-600">Showings</span>
                                    </button>
                                    <button className="flex flex-col items-center gap-1 p-2 hover:bg-slate-50 rounded-lg transition-colors">
                                        <span className="material-symbols-outlined text-blue-600">bookmark</span>
                                        <span className="text-xs text-slate-600">Save</span>
                                    </button>
                                    <button className="flex flex-col items-center gap-1 p-2 hover:bg-slate-50 rounded-lg transition-colors">
                                        <span className="material-symbols-outlined text-blue-600">chat</span>
                                        <span className="text-xs text-slate-600">Contact</span>
                                    </button>
                                    <button className="flex flex-col items-center gap-1 p-2 hover:bg-slate-50 rounded-lg transition-colors">
                                        <span className="material-symbols-outlined text-blue-600">share</span>
                                        <span className="text-xs text-slate-600">Share</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Right Column - Features */}
                    <div className="space-y-8 animate-fade-in-right">
                        {highlights.map((item, index) => (
                            <div key={item.title} className="flex items-start gap-5 transform hover:scale-105 transition-all duration-300 animate-fade-in-up" 
                                 style={{ animationDelay: `${index * 150}ms` }}>
                                <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center animate-pulse">
                                    <span className="material-symbols-outlined text-3xl text-blue-600">{item.icon}</span>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800">{item.title}</h3>
                                    <p className="mt-1 text-slate-600">{item.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};


const PricingSection: React.FC<{ onNavigateToSignUp: () => void; onOpenConsultationModal: () => void }> = ({ onNavigateToSignUp, onOpenConsultationModal }) => {
    const PlanFeature: React.FC<{ children: React.ReactNode, dark?: boolean }> = ({ children, dark }) => (
        <li className="flex items-start gap-3">
            <span className={`material-symbols-outlined w-6 h-6 ${dark ? 'text-green-400' : 'text-green-500'} flex-shrink-0 mt-0.5`}>check_circle</span>
            <span className={dark ? 'text-slate-300' : 'text-slate-600'}>{children}</span>
        </li>
    );

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
                                    👉 Normally $199/month, but right now, you can get it for just <span className="text-primary-700">$89/month</span>.
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
                    <div className="p-8 h-full flex flex-col rounded-2xl bg-gradient-to-tr from-primary-700 to-primary-500 text-white shadow-2xl relative border-2 border-primary-500 transform hover:scale-105 transition-all duration-300 animate-fade-in-up glow max-w-md">
                        <div className="flex-grow">
                            <h3 className="text-2xl font-bold text-white">Complete AI Solution</h3>
                            <p className="mt-2 text-slate-300">Everything you need to dominate your market and close more deals.</p>
                            <p className="mt-6">
                                <span className="text-5xl font-extrabold text-white">$89</span>
                                <span className="text-xl font-medium text-slate-300">/mo</span>
                            </p>
                            <p className="mt-2 text-slate-300 line-through text-sm">Regular price: $199/mo</p>
                            <ul className="mt-8 space-y-4">
                                <PlanFeature dark>Unlimited AI interactions per month</PlanFeature>
                                <PlanFeature dark>Up to 3 active listings</PlanFeature>
                                <PlanFeature dark>300 emails per month</PlanFeature>
                                <PlanFeature dark>Advanced analytics dashboard</PlanFeature>
                                <PlanFeature dark>Your own trained GPT</PlanFeature>
                                <PlanFeature dark>Automated follow-up sequences</PlanFeature>
                                <li className="flex items-start gap-3">
                                    <span className="material-symbols-outlined text-white text-xl mt-0.5">check_circle</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-slate-100">AI conversations auto-detect & respond in 12 languages</span>
                                        <span className="material-symbols-outlined text-yellow-300 text-lg">language</span>
                                    </div>
                                </li>
                                <PlanFeature dark>Auto leads to closing</PlanFeature>
                                <PlanFeature dark>Need more? We do custom programs</PlanFeature>
                            </ul>
                        </div>
                        <button 
                            onClick={onNavigateToSignUp}
                            className="w-full mt-8 py-3 px-6 text-lg font-bold rounded-lg transition-all duration-300 bg-white text-primary-700 shadow-lg hover:bg-slate-200 transform hover:scale-[1.02]"
                        >
                            Lock In This Price Now
                        </button>
                        <p className="text-center text-xs text-slate-300 mt-3 opacity-90">
                            Price may increase at any time. Secure your rate today.
                        </p>
                    </div>
                </div>
                
                {/* Team/Office Programs Note */}
                <div className="mt-8 text-center animate-fade-in-up animation-delay-600">
                    <p className="text-slate-600 text-lg">
                        Looking for team or full office programs? <button onClick={onOpenConsultationModal} className="text-primary-600 hover:text-primary-700 font-semibold underline">Just reach out</button> →
                    </p>
                </div>
            </div>
        </section>
    );
};

const WhiteLabelSection: React.FC<{ onOpenConsultationModal: () => void; }> = ({ onOpenConsultationModal }) => {
    
    const ServiceItem: React.FC<{ icon: string, title: string, iconClass?: string, children: React.ReactNode}> = ({ icon, title, iconClass, children }) => (
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
                        <button
                            onClick={onOpenConsultationModal}
                            className="inline-flex items-center gap-2 px-6 py-3 text-base font-bold text-white bg-gradient-to-r from-green-400 to-primary-500 rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105 btn-animate"
                        >
                             <span className="material-symbols-outlined animate-pulse">calendar_today</span>
                            Set Up a Free Consultation
                        </button>
                        <p className="mt-4 text-sm text-slate-500 animate-fade-in-up animation-delay-800">
                            No obligation. See how we can help your business grow.
                        </p>
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
        { q: "How is pricing structured?", a: "We have a simple, per-listing monthly fee. Our limited-time launch pricing offers incredible value. There are no hidden fees, and you can cancel anytime." },
        { q: "Is there really a 30-day money-back guarantee?", a: "Yes! We are so confident you'll love the results that we offer a no-questions-asked, 30-day money-back guarantee. If you don't get value, you don't pay." },
        { q: "Is my and my client's data secure?", a: "Yes, security is our top priority. All data is encrypted in transit and at rest using enterprise-grade security protocols. We are compliant with data privacy regulations, and you retain full ownership of your data. For trial accounts, all data is automatically purged after 7 days for your peace of mind." },
        { q: "What kind of support do you offer if I get stuck?", a: "We offer comprehensive support to all our users. This includes a detailed knowledge base, email support for all plans, and priority support for our Pro Team subscribers. We're here to ensure you get the most out of the platform." },
        { q: "Does this integrate with my existing CRM?", a: "We are constantly expanding our integrations. Currently, we offer robust integration options through tools like Zapier, which allows you to connect HomeListingAI to hundreds of popular CRMs and marketing platforms. Direct integrations with major CRMs are on our roadmap." },
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
                            Founded by seasoned real estate and mortgage pros with over <span className="font-bold text-primary-600">15 years</span> of hands-on experience, we've seen the industry evolve—and helped shape it. From launching our first website in 1997 (yeah, we were there before Google), to pioneering our first mobile app in 2005, we've always stayed two steps ahead of the curve.
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
                                { number: '15+', label: 'Years Experience', icon: '⚡' },
                                { number: '2', label: 'Labrador Officers', icon: '🐕' }
                            ].map((stat, index) => (
                                <div key={index} className="text-center group hover:scale-105 transition-transform duration-300">
                                    <div className="text-3xl mb-2 animate-bounce" style={{animationDelay: `${index * 0.2}s`}}>
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

const FinalCtaNew: React.FC<{ onNavigateToSignUp: () => void; onEnterDemoMode: () => void; }> = ({ onNavigateToSignUp, onEnterDemoMode }) => (
    <section className="bg-gradient-to-r from-indigo-700 via-purple-800 to-slate-900 text-white relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 pointer-events-none">
            {/* Floating Icons */}
            <div className="absolute top-20 left-10 opacity-10 animate-float">
                <span className="material-symbols-outlined text-5xl text-white">rocket_launch</span>
            </div>
            <div className="absolute top-40 right-20 opacity-10 animate-float-slow">
                <span className="material-symbols-outlined text-4xl text-white">star</span>
            </div>
            <div className="absolute bottom-20 left-1/4 opacity-10 animate-float-slower">
                <span className="material-symbols-outlined text-3xl text-white">auto_awesome</span>
            </div>
            
            {/* Geometric Shapes */}
            <div className="absolute top-60 right-1/3 opacity-10 animate-pulse">
                <div className="w-20 h-20 border-2 border-white rounded-full"></div>
            </div>
            <div className="absolute bottom-40 right-10 opacity-10 animate-bounce">
                <div className="w-16 h-16 bg-white rounded-lg transform rotate-45"></div>
            </div>
            
            {/* Dots Pattern */}
            <div className="absolute top-0 left-0 w-full h-full opacity-5">
                <div className="grid grid-cols-20 gap-4 w-full h-full">
                    {Array.from({ length: 30 }).map((_, i) => (
                        <div key={i} className="w-1 h-1 bg-white rounded-full animate-pulse" 
                             style={{ 
                                 animationDelay: `${i * 0.3}s`,
                                 animationDuration: `${2 + Math.random() * 2}s`
                             }}></div>
                    ))}
                </div>
            </div>
            
            {/* Gradient Orbs */}
            <div className="absolute top-1/3 left-1/4 w-32 h-32 bg-white rounded-full opacity-5 animate-pulse blur-xl"></div>
            <div className="absolute bottom-1/3 right-1/4 w-24 h-24 bg-white rounded-full opacity-5 animate-pulse blur-xl"></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center relative z-10">
            <h2 className="text-4xl font-extrabold animate-fade-in-up">Don't Let Another Lead Slip Away</h2>
            <p className="mt-4 max-w-3xl mx-auto text-lg text-slate-300 animate-fade-in-up animation-delay-200">
                While you're thinking about it, your competitors are capturing leads 24/7.
                Start your HomeListingAI journey today and see results within hours.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4 animate-fade-in-up animation-delay-400">
                <button
                    onClick={onNavigateToSignUp}
                    className="flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-yellow-400 via-orange-400 to-purple-500 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all text-lg transform hover:scale-105 btn-animate"
                >
                    <span className="material-symbols-outlined animate-pulse">bolt</span>
                    Start Your Three Day Free Trial
                </button>
                <button
                    onClick={onEnterDemoMode}
                    className="flex items-center justify-center gap-2 px-8 py-4 bg-purple-600 text-white font-bold rounded-lg shadow-lg hover:bg-purple-700 transition-all text-lg transform hover:scale-105 btn-animate"
                >
                    <span className="material-symbols-outlined animate-bounce">rocket_launch</span>
                    Explore the Live Dashboard
                </button>
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-slate-300 animate-fade-in-up animation-delay-600">
                <span className="flex items-center gap-2"><span className="material-symbols-outlined text-green-400 animate-pulse">check_circle</span>Setup in under 10 minutes</span>
                <span className="flex items-center gap-2"><span className="material-symbols-outlined text-green-400 animate-pulse">check_circle</span>30-day money-back guarantee</span>
                <span className="flex items-center gap-2"><span className="material-symbols-outlined text-green-400 animate-pulse">check_circle</span>Cancel anytime</span>
            </div>
        </div>
    </section>
);


const FooterNew: React.FC<{ onNavigateToAdmin: () => void; }> = ({ onNavigateToAdmin }) => (
    <footer className="bg-slate-800 text-slate-400">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
                {/* HomeListingAI Section */}
                <div className="col-span-1 md:col-span-1">
                    <div className="flex items-center gap-3 mb-3">
                        <img 
                            src="/newlogo.png" 
                            alt="HomeListingAI Logo" 
                            className="w-8 h-8 object-contain"
                        />
                        <span className="text-white font-semibold text-lg">HomeListingAI</span>
                    </div>
                    <p className="text-sm text-slate-300">Transform your real estate business with AI-powered lead generation.</p>
                </div>
                
                {/* Product Section */}
                <div>
                    <h3 className="text-sm font-semibold text-white mb-3">Product</h3>
                    <ul className="space-y-2 text-sm">
                        <li><a href="#what-you-get" className="hover:text-white transition-colors">Features</a></li>
                        <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
                        <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                    </ul>
                </div>
                
                {/* Legal Section */}
                <div>
                    <h3 className="text-sm font-semibold text-white mb-3">Legal</h3>
                    <ul className="space-y-2 text-sm">
                        <li><a href="/terms-of-service.html" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Terms of Service</a></li>
                        <li><a href="/privacy-policy.html" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Privacy Policy</a></li>
                        <li><a href="#" className="hover:text-white transition-colors">Compliance Policy</a></li>
                        <li><a href="#" className="hover:text-white transition-colors">DMCA Policy</a></li>
                    </ul>
                </div>
                
                {/* Company Section */}
                <div>
                    <h3 className="text-sm font-semibold text-white mb-3">Company</h3>
                    <ul className="space-y-2 text-sm">
                        <li><a href="#about-us" className="hover:text-white transition-colors">About Us</a></li>
                        <li><a href="#" onClick={(e) => { e.preventDefault(); onNavigateToAdmin(); }} className="hover:text-white transition-colors">Admin</a></li>
                    </ul>
                </div>
                
                {/* Contact Section */}
                <div>
                    <h3 className="text-sm font-semibold text-white mb-3">Contact</h3>
                    <ul className="space-y-2 text-sm">
                        <li><a href="mailto:us@homelistingai.com" className="hover:text-white transition-colors">us@homelistingai.com</a></li>
                        <li><span className="text-slate-300">Seattle, WA</span></li>
                    </ul>
                </div>
            </div>
            
            {/* Copyright Notice */}
            <div className="mt-12 border-t border-slate-700 pt-8 text-center">
                <p className="text-sm text-slate-300">&copy; 2025 HomeListingAI. All rights reserved.</p>
            </div>
        </div>
    </footer>
);

const Hero: React.FC<{ onNavigateToSignUp: () => void, onEnterDemoMode: () => void }> = ({ onNavigateToSignUp, onEnterDemoMode }) => (
    <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50 to-white"></div>
        
        {/* Background Elements */}
        <div className="absolute inset-0 pointer-events-none">
            {/* Floating geometric shapes */}
            <div className="absolute top-20 left-10 w-20 h-20 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full opacity-10 animate-float-slow"></div>
            <div className="absolute top-40 right-20 w-16 h-16 bg-gradient-to-r from-green-400 to-blue-400 rounded-full opacity-8 animate-float"></div>
            <div className="absolute bottom-20 left-1/4 w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full opacity-6 animate-float-slower"></div>
            
            {/* Floating icons */}
            <div className="absolute top-60 right-1/3 opacity-5 animate-float">
                <span className="material-symbols-outlined text-4xl text-blue-500">home</span>
            </div>
            <div className="absolute bottom-40 left-1/3 opacity-5 animate-float-slow">
                <span className="material-symbols-outlined text-3xl text-green-500">trending_up</span>
            </div>
            
            {/* Dots pattern */}
            <div className="absolute top-0 left-0 w-full h-full opacity-3">
                <div className="grid grid-cols-20 gap-4 w-full h-full">
                    {Array.from({ length: 50 }).map((_, i) => (
                        <div key={i} className="w-1 h-1 bg-blue-300 rounded-full animate-pulse" 
                             style={{ 
                                 animationDelay: `${i * 0.2}s`,
                                 animationDuration: `${2 + Math.random() * 2}s`
                             }}></div>
                    ))}
                </div>
            </div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div className="text-center lg:text-left relative z-10">
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight animate-fade-in-up">
                        Imagine If You Had a <span className="text-primary-600 gradient-text">24/7 Real Estate Sidekick</span>
                    </h1>
                    <p className="mt-6 max-w-lg mx-auto lg:mx-0 text-lg text-slate-600 animate-fade-in-up animation-delay-200">
                        It never sleeps, always follows up, and sounds just like you... <a href="#what-you-get" className="font-semibold text-primary-600 hover:underline">and so much more</a>.
                    </p>
                    <div className="mt-8 flex justify-center lg:justify-start gap-4 animate-fade-in-up animation-delay-400">
                        <button onClick={onNavigateToSignUp} className="flex items-center gap-2 px-6 py-3.5 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-all transform hover:scale-105 btn-animate">
                            <span className="material-symbols-outlined w-5 h-5 animate-pulse">auto_awesome</span>
                            Get Started Now
                        </button>
                        <button onClick={onEnterDemoMode} className="flex items-center gap-2 px-6 py-3.5 bg-purple-600 text-white font-bold rounded-lg shadow-md hover:bg-purple-700 transition-all transform hover:scale-105 btn-animate">
                            <span className="material-symbols-outlined animate-bounce">rocket_launch</span>
                            Explore the Live Dashboard
                        </button>
                    </div>
                    <p className="mt-3 text-sm text-slate-500 text-center lg:text-left animate-fade-in-up animation-delay-600">Professional AI solution. No setup fees.</p>
                </div>
                <div className="relative animate-fade-in-up animation-delay-600">
                    <div className="relative lg:animate-float">
                         <div className="bg-white/60 backdrop-blur-lg p-6 rounded-2xl shadow-2xl border border-slate-200/80 hover-lift">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-slate-800">AI Agent Dashboard</h3>
                                <div className="flex space-x-1.5">
                                    <span className="w-3 h-3 bg-red-400 rounded-full"></span>
                                    <span className="w-3 h-3 bg-yellow-400 rounded-full"></span>
                                    <span className="w-3 h-3 bg-green-400 rounded-full"></span>
                                </div>
                            </div>
                            <div className="mt-6 grid grid-cols-2 gap-4">
                                <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200/60">
                                    <span className="material-symbols-outlined w-6 h-6 text-blue-500">group</span>
                                    <p className="text-2xl font-bold text-slate-900 mt-2">1,247</p>
                                    <p className="text-sm text-slate-500">Active Leads</p>
                                </div>
                                <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200/60">
                                    <span className="material-symbols-outlined w-6 h-6 text-green-500">trending_up</span>
                                    <p className="text-2xl font-bold text-slate-900 mt-2">+23%</p>
                                    <p className="text-sm text-slate-500">Conversion Rate</p>
                                </div>
                            </div>
                            <div className="mt-4 bg-white p-4 rounded-lg shadow-sm border border-slate-200/60">
                                <div className="flex justify-between items-center">
                                    <p className="text-sm text-slate-500">Monthly Revenue</p>
                                    <p className="text-sm font-bold text-green-600">+12%</p>
                                </div>
                                <p className="text-3xl font-bold text-slate-900 mt-1">$45,892</p>
                                <div className="mt-2 w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                    <div className="bg-gradient-to-r from-blue-500 to-green-400 h-full w-3/4"></div>
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
}

const LandingPage: React.FC<LandingPageProps> = ({ onNavigateToSignUp, onNavigateToSignIn, onEnterDemoMode, onOpenConsultationModal, onNavigateToAdmin }) => {
    return (
        <div className="bg-white font-sans">
            <Header
                onNavigateToSignUp={onNavigateToSignUp}
                onNavigateToSignIn={onNavigateToSignIn}
                onEnterDemoMode={onEnterDemoMode}
                onOpenConsultationModal={onOpenConsultationModal}
            />
            <main className="pt-20"> {/* Add padding top to account for fixed header */}
                <Hero onNavigateToSignUp={onNavigateToSignUp} onEnterDemoMode={onEnterDemoMode} />
                <RevolutionaryAIFeaturesSection />
                <DashboardShowcaseSection onEnterDemoMode={onEnterDemoMode} onNavigateToSignUp={onNavigateToSignUp} />
                <AIAppShowcaseSection />
                <PricingSection onNavigateToSignUp={onNavigateToSignUp} onOpenConsultationModal={onOpenConsultationModal} />
                <WhiteLabelSection onOpenConsultationModal={onOpenConsultationModal} />
                <AboutUsSection />
                <FeaturesGridSection />
                <WhatYouGetSectionNew />
                <TestimonialsSection />
                <FaqSection />
                <FinalCtaNew onNavigateToSignUp={onNavigateToSignUp} onEnterDemoMode={onEnterDemoMode} />
            </main>
            <FooterNew onNavigateToAdmin={onNavigateToAdmin} />
            
            {/* Chat Bot FAB for visitors */}
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
            />
        </div>
    );
};

export default LandingPage;
