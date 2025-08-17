import React, { useState, useEffect } from 'react';
import { LogoWithName } from './LogoWithName';
import { DEMO_FAT_PROPERTIES } from '../demoConstants';
import { Property, isAIDescription } from '../types';
import { ListingAppModals } from './ListingAppModals';
import VoiceChat from './VoiceChat';

type ModalType = 'schools' | 'financing' | 'schedule' | 'save' | 'share' | 'voice' | null;

// --- Helper Components from PublicPropertyApp ---
const TwitterIcon: React.FC<{className?: string}> = ({ className }) => (<svg fill="currentColor" viewBox="0 0 24 24" className={className}><path d="M22.46,6C21.69,6.35 20.86,6.58 20,6.69C20.88,6.16 21.56,5.32 21.88,4.31C21.05,4.81 20.13,5.16 19.16,5.36C18.37,4.5 17.26,4 16,4C13.65,4 11.73,5.92 11.73,8.29C11.73,8.63 11.77,8.96 11.84,9.27C8.28,9.09 5.11,7.38 3,4.79C2.63,5.42 2.42,6.16 2.42,6.94C2.42,8.43 3.17,9.75 4.33,10.5C3.62,10.5 2.96,10.3 2.38,10C2.38,10 2.38,10 2.38,10.03C2.38,12.11 3.86,13.85 5.82,14.24C5.46,14.34 5.08,14.39 4.69,14.39C4.42,14.39 4.15,14.36 3.89,14.31C4.43,16 6,17.26 7.89,17.29C6.43,18.45 4.58,19.13 2.56,19.13C2.22,19.13 1.88,19.11 1.54,19.07C3.44,20.29 5.7,21 8.12,21C16,21 20.33,14.46 20.33,8.79C20.33,8.6 20.33,8.42 20.32,8.23C21.16,7.63 21.88,6.87 22.46,6Z"></path></svg>);
const PinterestIcon: React.FC<{className?: string}> = ({ className }) => (<svg fill="currentColor" viewBox="0 0 24 24" className={className}><path d="M13,16.2C12.2,16.2 11.5,15.9 11,15.3C10.5,14.7 10.2,14 10.2,13.2C10.2,12.5 10.5,11.8 11,11.2C11.5,10.6 12.2,10.3 13,10.3C13.8,10.3 14.5,10.6 15,11.2C15.5,11.8 15.8,12.5 15.8,13.2C15.8,14 15.5,14.7 15,15.3C14.5,15.9 13.8,16.2 13,16.2M12,2C6.5,2 2,6.5 2,12C2,16.2 4.6,19.8 8.5,21.2C8.5,20.5 8.6,19.5 8.8,18.4L9.5,15.2C9.5,15.2 9.2,14.6 9.2,13.8C9.2,12.4 10.1,11.3 11.1,11.3C12,11.3 12.4,12 12.4,12.7C12.4,13.5 11.9,14.8 11.6,15.9C11.4,16.9 12.2,17.7 13.2,17.7C15,17.7 16.4,15.7 16.4,13.2C16.4,10.9 14.8,9.2 12.5,9.2C9.8,9.2 8.1,11.1 8.1,13.6C8.1,14.3 8.4,15 8.7,15.5C8.8,15.6 8.8,15.7 8.8,15.8L8.6,16.6C8.5,16.9 8.4,17.1 8.1,16.9C7.1,16.4 6.4,14.9 6.4,13.5C6.4,10.4 8.7,7.5 13.2,7.5C17,7.5 19.6,10 19.6,13.1C19.6,16.5 17.4,19.2 14.2,19.2C13.1,19.2 12,18.6 11.7,17.9L11.2,19.2C10.6,20.8 10,22.2 9.8,22.9C10.5,23.2 11.2,23.3 12,23.3C17.5,23.3 22,18.8 22,13.3C22,7.7 17.5,3.3 12,3.3"></path></svg>);
const LinkedInIcon: React.FC<{className?: string}> = ({ className }) => (<svg fill="currentColor" viewBox="0 0 24 24" className={className}><path d="M19,3A2,2 0 0,1 21,5V19A2,2 0 0,1 19,21H5A2,2 0 0,1 3,19V5A2,2 0 0,1 5,3H19M18.5,18.5V13.2A3.26,3.26 0 0,0 15.24,9.94C14.39,9.94 13.4,10.43 12.9,11.24V10.13H10.13V18.5H12.9V13.57C12.9,12.8 13.5,12.17 14.31,12.17A1.4,1.4 0 0,1 15.71,13.57V18.5H18.5M6.88,8.56A1.68,1.68 0 0,0 8.56,6.88C8.56,6 8,5.43 7.21,5.43A1.68,1.68 0 0,0 5.53,6.88C5.53,7.74 6,8.31 6.88,8.31V8.56H6.88M8.27,18.5V10.13H5.53V18.5H8.27Z"></path></svg>);
const YouTubeIcon: React.FC<{className?: string}> = ({ className }) => (<svg fill="currentColor" viewBox="0 0 24 24" className={className}><path d="M10,15L15.19,12L10,9V15M21.56,7.17C21.69,7.64 21.78,8.27 21.84,9.07C21.91,9.87 21.94,10.56 21.94,11.16L22,12C22,14.19 21.84,15.8 21.56,16.83C21.31,17.73 20.73,18.31 19.83,18.56C19.36,18.69 18.73,18.78 17.93,18.84C17.13,18.91 16.44,18.94 15.84,18.94L15,19C12.81,19 11.2,18.84 10.17,18.56C9.27,18.31 8.69,17.73 8.44,16.83C8.31,16.36 8.22,15.73 8.16,14.93C8.09,14.13 8.06,13.44 8.06,12.84L8,12C8,9.81 8.16,8.2 8.44,7.17C8.69,6.27 9.27,5.69 10.17,5.44C10.64,5.31 11.27,5.22 12.07,5.16C12.87,5.09 13.56,5.06 14.16,5.06L15,5C17.19,5 18.8,5.16 19.83,5.44C20.73,5.69 21.31,6.27 21.56,7.17Z"></path></svg>);

const ImageCarousel: React.FC<{ images: string[] }> = ({ images }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % images.length);
        }, 3000);
        return () => clearInterval(timer);
    }, [images.length]);

    return (
        <div className="relative w-full aspect-[4/3] overflow-hidden rounded-b-3xl">
            {images.map((img, index) => (
                <img
                    key={index}
                    src={img}
                    alt={`Property image ${index + 1}`}
                    className={`absolute top-0 left-0 w-full h-full object-cover transition-opacity duration-500 ${index === currentIndex ? 'opacity-100' : 'opacity-0'}`}
                />
            ))}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
                {images.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => setCurrentIndex(index)}
                        className={`w-2 h-2 rounded-full transition-colors ${index === currentIndex ? 'bg-white' : 'bg-white/50'}`}
                    />
                ))}
            </div>
        </div>
    );
};

const InfoPill: React.FC<{ icon: string, value: string | number, label: string }> = ({ icon, value, label }) => (
    <div className="flex flex-col items-center justify-center space-y-1">
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
            <span className="material-symbols-outlined w-5 h-5">{icon}</span>
        </div>
        <p className="font-bold text-sm text-slate-800">{value}</p>
        <p className="text-[10px] text-slate-500">{label}</p>
    </div>
);

const FeatureButton: React.FC<{ icon: string, label: string, enabled?: boolean, onClick?: () => void }> = ({ icon, label, enabled = true, onClick }) => {
    if (!enabled) return null;
    return (
        <button onClick={onClick} className="flex flex-col items-center justify-center space-y-1 p-1 bg-white rounded-xl shadow-sm border border-slate-200/60 w-full h-full text-center hover:bg-slate-50 transition-colors disabled:opacity-50" disabled={!onClick}>
            <div className="text-blue-600"><span className="material-symbols-outlined" style={{fontSize: '24px'}}>{icon}</span></div>
            <p className="text-xs font-semibold text-slate-700">{label}</p>
        </button>
    );
};

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

const RevolutionaryAIFeaturesSection: React.FC = () => {
    const [activeDemo, setActiveDemo] = useState<'analytics' | 'personality' | 'leadgen' | 'notifications'>('analytics');

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
                    {[
                        { id: 'analytics', label: 'Analytics Dashboard', icon: '📊' },
                        { id: 'personality', label: 'AI Personalities', icon: '🎭' },
                        { id: 'leadgen', label: 'Lead Generation', icon: '🎯' },
                        { id: 'notifications', label: 'Smart Notifications', icon: '🔔' }
                    ].map(feature => (
                        <button
                            key={feature.id}
                            onClick={() => setActiveDemo(feature.id as any)}
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

const DashboardShowcaseSection: React.FC<{ onEnterDemoMode: () => void }> = ({ onEnterDemoMode }) => {
    const features = [
        { icon: 'track_changes', title: 'Never Lose a Lead', description: 'Watch in real-time as every inquiry—from your website, ads, or QR codes—populates your dashboard instantly.' },
        { icon: 'psychology', title: 'Know Who to Call Next', description: 'Our AI doesn\'t just capture leads; it qualifies them. See who is pre-approved and ready to talk, so you can focus on the hottest prospects.' },
        { icon: 'autoplay', title: 'Follow-Up on Autopilot', description: 'Launch powerful, multi-step follow-up sequences with a single click. Nurture every lead perfectly without lifting a finger.' },
        { icon: 'language', title: 'AI App Listing', description: "Transform each property into an interactive, AI-powered mobile app that buyers can engage with 24/7. It's your always-on open house." },
        { icon: 'auto_stories', title: 'AI Content Studio', description: 'Generate blog posts, social media updates, and professional property reports with a single click. Save hours on marketing.' },
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

                <div className="mt-12 animate-fade-in-up animation-delay-800">
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

const InteractiveListingAppEmbed: React.FC<{ onOpenModal: (modal: ModalType) => void }> = ({ onOpenModal }) => {
    const property = DEMO_FAT_PROPERTIES[0];
    if (!property) return null; // Guard against no demo data

    const heroImageUrls = property.heroPhotos && property.heroPhotos.length > 0
        ? property.heroPhotos.map(p => typeof p === 'string' ? p : URL.createObjectURL(p))
        : [property.imageUrl];

    const descriptionText = isAIDescription(property.description)
        ? property.description.paragraphs.join(' ')
        : (typeof property.description === 'string' ? property.description : '');

    const agent = property.agent;

    const allAppFeatures: { [key: string]: { icon: string; label: string; modal?: ModalType } } = {
        gallery: { icon: 'photo_camera', label: "Gallery" },
        schools: { icon: 'school', label: "Schools", modal: 'schools' },
        financing: { icon: 'payments', label: "Financing", modal: 'financing' },
        virtualTour: { icon: 'videocam', label: "Tour" },
        amenities: { icon: 'home_work', label: "Features" },
        history: { icon: 'schedule', label: "History" },
    };

    return (
        <div className="relative mx-auto border-gray-800 bg-gray-800 border-[14px] rounded-[2.5rem] h-[600px] w-[300px] shadow-xl">
            <div className="w-[148px] h-[18px] bg-gray-800 top-0 rounded-b-[1rem] left-1/2 -translate-x-1/2 absolute"></div>
            <div className="h-[46px] w-[3px] bg-gray-800 absolute -left-[17px] top-[72px] rounded-l-lg"></div>
            <div className="h-[46px] w-[3px] bg-gray-800 absolute -left-[17px] top-[124px] rounded-l-lg"></div>
            <div className="h-[64px] w-[3px] bg-gray-800 absolute -right-[17px] top-[142px] rounded-r-lg"></div>
            <div className="rounded-[2rem] overflow-hidden w-full h-full bg-white">
                <div className="relative w-full h-full bg-slate-100 flex flex-col">
                    <main className="flex-1 overflow-y-auto pb-16">
                        <ImageCarousel images={heroImageUrls} />
                        <div className="p-4 space-y-4">
                            <div>
                                <h1 className="text-lg font-bold text-slate-900">{property.title}</h1>
                                <p className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                                    <span className="material-symbols-outlined w-4 h-4">location_on</span>
                                    <span>{property.address}</span>
                                </p>
                                <p className="text-2xl font-extrabold text-green-600 mt-2">${property.price.toLocaleString('en-US')}</p>
                            </div>
                            
                            <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-200/60 flex justify-around">
                                <InfoPill icon="bed" value={property.bedrooms} label="Beds" />
                                <InfoPill icon="bathtub" value={property.bathrooms} label="Baths" />
                                <InfoPill icon="fullscreen" value={property.squareFeet.toLocaleString()} label="Sq Ft" />
                            </div>

                             <button onClick={() => onOpenModal('voice')} className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-shadow">
                                <span className="material-symbols-outlined text-xl">mic</span>
                                <span className="text-sm">Talk to the Home Now</span>
                            </button>
                            
                            <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-200/60">
                                <h2 className="text-md font-bold text-slate-800 mb-2">{isAIDescription(property.description) ? property.description.title : 'About This Property'}</h2>
                                <p className="text-sm text-slate-600 leading-relaxed">{descriptionText.substring(0, 100)}... <a href="#" onClick={(e) => e.preventDefault()} className="text-blue-600 font-semibold">Read More</a></p>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-2">
                                {Object.entries(allAppFeatures).map(([key, feature]) => (
                                    <FeatureButton 
                                        key={key}
                                        icon={feature.icon}
                                        label={feature.label}
                                        enabled={property.appFeatures?.[key]}
                                        onClick={feature.modal ? () => onOpenModal(feature.modal) : undefined}
                                    />
                                ))}
                            </div>
                            
                            {agent && (
                                <div>
                                     <h2 className="text-md font-bold text-slate-800 mb-2">Contact Agent</h2>
                                     <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-200/60">
                                        <div className="flex items-center gap-3">
                                            <img src={agent.headshotUrl} alt={agent.name} className="w-12 h-12 rounded-full object-cover" />
                                            <div>
                                                <h3 className="font-bold text-slate-900 text-sm">{agent.name}</h3>
                                                <p className="text-xs text-slate-600">{agent.company}</p>
                                            </div>
                                        </div>
                                        <div className="mt-3 grid grid-cols-2 gap-2">
                                            <button className="w-full py-2 bg-green-500 text-white font-bold rounded-lg text-xs">Call</button>
                                            <button className="w-full py-2 bg-blue-600 text-white font-bold rounded-lg text-xs">Email</button>
                                        </div>
                                         <div className="mt-3 flex justify-center items-center gap-2">
                                            {agent.socials.find(s => s.platform === 'Twitter') && <a href="#" onClick={e=>e.preventDefault()} className="w-7 h-7 flex items-center justify-center bg-sky-500 text-white rounded-full"><TwitterIcon className="w-4 h-4" /></a>}
                                            {agent.socials.find(s => s.platform === 'Pinterest') && <a href="#" onClick={e=>e.preventDefault()} className="w-7 h-7 flex items-center justify-center bg-red-600 text-white rounded-full"><PinterestIcon className="w-4 h-4" /></a>}
                                            {agent.socials.find(s => s.platform === 'LinkedIn') && <a href="#" onClick={e=>e.preventDefault()} className="w-7 h-7 flex items-center justify-center bg-blue-700 text-white rounded-full"><LinkedInIcon className="w-4 h-4" /></a>}
                                            {agent.socials.find(s => s.platform === 'YouTube') && <a href="#" onClick={e=>e.preventDefault()} className="w-7 h-7 flex items-center justify-center bg-red-500 text-white rounded-full"><YouTubeIcon className="w-5 h-5" /></a>}
                                        </div>
                                     </div>
                                </div>
                            )}
                        </div>
                    </main>

                    <footer className="absolute bottom-0 left-0 right-0 z-10 bg-white/80 backdrop-blur-sm border-t border-slate-200/80">
                        <div className="flex justify-around items-center h-16">
                            <FeatureButton icon="calendar_month" label="Showings" onClick={() => onOpenModal('schedule')}/>
                            <FeatureButton icon="bookmark" label="Save" onClick={() => onOpenModal('save')}/>
                            <FeatureButton icon="chat_bubble" label="Contact" />
                            <FeatureButton icon="share" label="Share" onClick={() => onOpenModal('share')}/>
                        </div>
                    </footer>
                </div>
            </div>
        </div>
    );
};


const AIAppShowcaseSection: React.FC<{ onOpenModal: (modal: ModalType) => void }> = ({ onOpenModal }) => {
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
                    <div className="flex justify-center animate-fade-in-left">
                        <InteractiveListingAppEmbed onOpenModal={onOpenModal} />
                    </div>
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


const PricingSection: React.FC<{ onNavigateToSignUp: () => void; onOpenConsultationModal: () => void; }> = ({ onNavigateToSignUp, onOpenConsultationModal }) => {
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
                <div className="mt-16 flex justify-center animate-fade-in-up animation-delay-400">
                    {/* Single Plan */}
                    <div className="p-8 h-full flex flex-col rounded-2xl bg-gradient-to-tr from-primary-700 to-primary-500 text-white shadow-2xl relative border-2 border-primary-500 transform hover:scale-105 transition-all duration-300 animate-fade-in-up glow max-w-md">
                        <div className="flex-grow">
                            <h3 className="text-2xl font-bold text-white">Complete AI Solution</h3>
                            <p className="mt-2 text-slate-300">Everything you need to dominate your market and close more deals.</p>
                            <p className="mt-6">
                                <span className="text-5xl font-extrabold text-white">$69</span>
                                <span className="text-xl font-medium text-slate-300">/mo</span>
                            </p>
                            <p className="mt-1 text-sm text-slate-300">Unlimited Active Listings</p>
                            <ul className="mt-8 space-y-4">
                                <PlanFeature dark>Full Dashboard Access</PlanFeature>
                                <PlanFeature dark>AI Content Studio</PlanFeature>
                                <PlanFeature dark>Automated Follow-up Sequences</PlanFeature>
                                <PlanFeature dark>AI Inbox & Lead Management</PlanFeature>
                                <PlanFeature dark>Team Collaboration Features</PlanFeature>
                                <PlanFeature dark>Advanced Analytics</PlanFeature>
                                <PlanFeature dark>Priority Email Support</PlanFeature>
                                <PlanFeature dark>White-Labeling Options</PlanFeature>
                            </ul>
                        </div>
                        <button 
                            onClick={onNavigateToSignUp}
                            className="w-full mt-8 py-3 px-6 text-lg font-bold rounded-lg transition-all duration-300 bg-white text-primary-700 shadow-lg hover:bg-slate-200 transform hover:scale-[1.02]"
                        >
                            Get Started Today
                        </button>
                    </div>
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

const FeaturesGridSection: React.FC<{ onNavigateToSignUp: () => void }> = ({ onNavigateToSignUp }) => {
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
                    Start Your Seven Day Free Trial
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
                        <button onClick={onNavigateToSignUp} className="flex items-center gap-2 px-6 py-3.5 bg-orange-500 text-white font-semibold rounded-lg shadow-md hover:bg-orange-600 transition-all transform hover:scale-105 btn-animate">
                            <span className="material-symbols-outlined w-5 h-5 animate-pulse">auto_awesome</span>
                            Try It Free for 5 Days
                        </button>
                        <button onClick={onEnterDemoMode} className="flex items-center gap-2 px-6 py-3.5 bg-purple-600 text-white font-bold rounded-lg shadow-md hover:bg-purple-700 transition-all transform hover:scale-105 btn-animate">
                            <span className="material-symbols-outlined animate-bounce">rocket_launch</span>
                            Explore the Live Dashboard
                        </button>
                    </div>
                    <p className="mt-3 text-sm text-slate-500 text-center lg:text-left animate-fade-in-up animation-delay-600">No card. No pressure. Just power.</p>
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
    const [activeModal, setActiveModal] = useState<ModalType>(null);
    const [isVoiceChatOpen, setIsVoiceChatOpen] = useState(false);
    // Use a real property from demo data for the interactive embed
    const propertyForDemo = DEMO_FAT_PROPERTIES[0]; 

    return (
        <div className="bg-white font-sans">
             {activeModal && (
                <ListingAppModals 
                    activeModal={activeModal}
                    onClose={() => setActiveModal(null)}
                    property={propertyForDemo}
                />
            )}
            <Header
                onNavigateToSignUp={onNavigateToSignUp}
                onNavigateToSignIn={onNavigateToSignIn}
                onEnterDemoMode={onEnterDemoMode}
                onOpenConsultationModal={onOpenConsultationModal}
            />
            <main className="pt-20"> {/* Add padding top to account for fixed header */}
                <Hero onNavigateToSignUp={onNavigateToSignUp} onEnterDemoMode={onEnterDemoMode} />
                <RevolutionaryAIFeaturesSection />
                <DashboardShowcaseSection onEnterDemoMode={onEnterDemoMode} />
                <AIAppShowcaseSection onOpenModal={setActiveModal} />
                <PricingSection onNavigateToSignUp={onNavigateToSignUp} onOpenConsultationModal={onOpenConsultationModal} />
                <WhiteLabelSection onOpenConsultationModal={onOpenConsultationModal} />
                <AboutUsSection />
                <FeaturesGridSection onNavigateToSignUp={onNavigateToSignUp} />
                <WhatYouGetSectionNew />
                <TestimonialsSection />
                <FaqSection />
                <FinalCtaNew onNavigateToSignUp={onNavigateToSignUp} onEnterDemoMode={onEnterDemoMode} />
            </main>
            <FooterNew onNavigateToAdmin={onNavigateToAdmin} />
        </div>
    );
};

export default LandingPage;