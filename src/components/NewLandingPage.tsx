import React, { useState } from 'react';
import { AI_PERSONALITIES, DEFAULT_AI_ASSIGNMENTS } from '../constants';

interface NewLandingPageProps {
    onNavigateToSignUp: () => void;
    onNavigateToSignIn: () => void;
    onEnterDemoMode: () => void;
}

const NewLandingPage: React.FC<NewLandingPageProps> = ({ onNavigateToSignUp, onEnterDemoMode }) => {
    type DemoId = 'analytics' | 'personality' | 'comparison' | 'notifications' | 'multilingual';

    const [activeDemo, setActiveDemo] = useState<DemoId>('analytics');
    const [testQuestion, setTestQuestion] = useState('What makes this property a good investment?');
    const [personalityResponses, setPersonalityResponses] = useState<{ [key: string]: string }>({});

    const handleTestPersonality = () => {
        const responses: { [key: string]: string } = {};
        AI_PERSONALITIES.forEach(personality => {
            const response = personality.sampleResponses[0]?.response || 'I would respond based on my personality traits.';
            responses[personality.id] = response;
        });
        setPersonalityResponses(responses);
    };

    const DemoSection: React.FC<{ title: string; children: React.ReactNode; isActive: boolean }> = ({ title, children, isActive }) => (
        <div className={`transition-all duration-500 ${isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-95 absolute'}`}>
            <h3 className="text-2xl font-bold text-slate-900 mb-6">{title}</h3>
            {children}
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">


            {/* Hero Section */}
            <div className="relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
                    <div className="text-center">
                        <div className="flex justify-center mb-8">
                            <div className="bg-gradient-to-r from-primary-600 to-purple-600 text-white px-6 py-2 rounded-full text-sm font-semibold">
                                🚀 NEW: AI-Powered Real Estate Platform
                            </div>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-bold text-slate-900 mb-6">
                            The Future of
                            <span className="bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent"> Real Estate</span>
                            is Here
                        </h1>
                        <p className="text-xl text-slate-600 mb-8 max-w-3xl mx-auto">
                            Transform your property business with AI-powered insights, real-time analytics, intelligent automation, and three specialized AI sidekicks—now fluent in 12 languages with automatic detection for every conversation.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                            <button onClick={onNavigateToSignUp} className="bg-primary-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-primary-700 transition-all duration-300 transform hover:scale-105 shadow-lg">
                                Start Free Trial
                            </button>
                            <button onClick={onEnterDemoMode} className="border-2 border-slate-300 text-slate-700 px-8 py-4 rounded-lg font-semibold text-lg hover:border-primary-600 hover:text-primary-600 transition-all duration-300">
                                Watch Demo
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Feature Showcase */}
            <div className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold text-slate-900 mb-4">
                            Revolutionary AI Features
                        </h2>
                        <p className="text-xl text-slate-600">
                            See how our AI transforms every aspect of real estate
                        </p>
                    </div>

                    {/* Feature Navigation */}
                    <div className="flex flex-wrap justify-center gap-4 mb-12">
                        {[
                            { id: 'analytics', label: 'Analytics Dashboard', icon: '📊' },
                            { id: 'personality', label: 'AI Personalities', icon: '🎭' },
                            { id: 'comparison', label: 'Property Comparison', icon: '⚖️' },
                            { id: 'notifications', label: 'Smart Notifications', icon: '🔔' },
                            { id: 'multilingual', label: 'Multilingual AI', icon: '🌐' }
                        ].map(feature => (
                            <button
                                key={feature.id}
                                onClick={() => setActiveDemo(feature.id as DemoId)}
                                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${activeDemo === feature.id
                                    ? 'bg-primary-600 text-white shadow-lg'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                    }`}
                            >
                                <span>{feature.icon}</span>
                                <span>{feature.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Interactive Demo Area */}
                    <div className="relative min-h-[600px] bg-slate-50 rounded-2xl p-8 shadow-xl">
                        <DemoSection title="Real-Time Analytics Dashboard" isActive={activeDemo === 'analytics'}>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {[
                                    { title: 'Total Properties', value: '24', change: '+12%', icon: '🏠' },
                                    { title: 'Active Leads', value: '156', change: '+8%', icon: '👥' },
                                    { title: 'Conversion Rate', value: '23.4%', change: '+5%', icon: '📈' },
                                    { title: 'Monthly Revenue', value: '$89.2K', change: '+18%', icon: '💰' }
                                ].map((metric, index) => (
                                    <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-2xl">{metric.icon}</span>
                                            <span className="text-green-600 text-sm font-semibold">{metric.change}</span>
                                        </div>
                                        <h4 className="text-2xl font-bold text-slate-900 mb-1">{metric.value}</h4>
                                        <p className="text-slate-600 text-sm">{metric.title}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                    <h4 className="font-semibold text-slate-900 mb-4">Lead Source Performance</h4>
                                    <div className="space-y-3">
                                        {[
                                            { source: 'Website', leads: 45, conversion: '28%' },
                                            { source: 'Social Media', leads: 32, conversion: '22%' },
                                            { source: 'Referrals', leads: 28, conversion: '35%' },
                                            { source: 'Direct', leads: 51, conversion: '18%' }
                                        ].map((item, index) => (
                                            <div key={index} className="flex items-center justify-between">
                                                <span className="text-slate-700">{item.source}</span>
                                                <div className="flex items-center gap-4">
                                                    <span className="text-slate-600">{item.leads} leads</span>
                                                    <span className="text-green-600 font-semibold">{item.conversion}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                    <h4 className="font-semibold text-slate-900 mb-4">Property Performance</h4>
                                    <div className="space-y-3">
                                        {[
                                            { property: 'Ocean Drive Villa', views: 234, inquiries: 12 },
                                            { property: 'Downtown Loft', views: 189, inquiries: 8 },
                                            { property: 'Mountain Cabin', views: 156, inquiries: 6 },
                                            { property: 'City Penthouse', views: 298, inquiries: 15 }
                                        ].map((item, index) => (
                                            <div key={index} className="flex items-center justify-between">
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
                                {/* AI Sidekicks */}
                                <div>
                                    <h4 className="font-semibold text-slate-900 mb-4">Your Three AI Sidekicks</h4>
                                    <div className="space-y-4">
                                        {DEFAULT_AI_ASSIGNMENTS.map((sidekick) => (
                                            <div key={sidekick.id} className="bg-white p-4 rounded-lg border border-slate-200">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${sidekick.type === 'listing' ? 'bg-green-100' :
                                                        sidekick.type === 'agent' ? 'bg-blue-100' : 'bg-purple-100'
                                                        }`}>
                                                        <span className={`text-sm ${sidekick.type === 'listing' ? 'text-green-600' :
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

                                {/* Personality Testing */}
                                <div>
                                    <h4 className="font-semibold text-slate-900 mb-4">Personality Testing</h4>
                                    <div className="space-y-4">
                                        <div>
                                            <input
                                                type="text"
                                                value={testQuestion}
                                                onChange={(e) => setTestQuestion(e.target.value)}
                                                placeholder="Ask a question to test personalities..."
                                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                            />
                                        </div>
                                        <button
                                            onClick={handleTestPersonality}
                                            className="w-full bg-primary-600 text-white py-2 rounded-lg font-semibold hover:bg-primary-700 transition"
                                        >
                                            Test All Personalities
                                        </button>

                                        {Object.keys(personalityResponses).length > 0 && (
                                            <div className="space-y-3 mt-4">
                                                {AI_PERSONALITIES.slice(0, 3).map(personality => (
                                                    <div key={personality.id} className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <h6 className="font-semibold text-slate-800">{personality.name}</h6>
                                                            <div className="flex gap-1">
                                                                {personality.traits.slice(0, 2).map((trait, index) => (
                                                                    <span key={index} className="px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full">
                                                                        {trait}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <p className="text-sm text-slate-700">{personalityResponses[personality.id]}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </DemoSection>

                        <DemoSection title="Property Comparison Tool" isActive={activeDemo === 'comparison'}>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {[
                                    {
                                        title: 'Ocean Drive Villa',
                                        price: '$2,450,000',
                                        beds: 4,
                                        baths: 3,
                                        sqft: '3,200',
                                        image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?q=80&w=400&h=300&auto=format&fit=crop'
                                    },
                                    {
                                        title: 'Downtown Loft',
                                        price: '$1,850,000',
                                        beds: 3,
                                        baths: 2,
                                        sqft: '2,100',
                                        image: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?q=80&w=400&h=300&auto=format&fit=crop'
                                    },
                                    {
                                        title: 'Mountain Cabin',
                                        price: '$1,200,000',
                                        beds: 3,
                                        baths: 2,
                                        sqft: '2,800',
                                        image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=400&h=300&auto=format&fit=crop'
                                    }
                                ].map((property, index) => (
                                    <div key={index} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                        <img src={property.image} alt={property.title} className="w-full h-48 object-cover" />
                                        <div className="p-6">
                                            <h4 className="font-semibold text-slate-900 mb-2">{property.title}</h4>
                                            <p className="text-2xl font-bold text-primary-600 mb-4">{property.price}</p>
                                            <div className="grid grid-cols-3 gap-4 text-sm">
                                                <div>
                                                    <span className="text-slate-500">Bedrooms:</span>
                                                    <span className="font-medium ml-1">{property.beds}</span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-500">Bathrooms:</span>
                                                    <span className="font-medium ml-1">{property.baths}</span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-500">Square Feet:</span>
                                                    <span className="font-medium ml-1">{property.sqft}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-6 text-center">
                                <button className="bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 transition">
                                    Compare Properties
                                </button>
                            </div>
                        </DemoSection>

                        <DemoSection title="Smart Notification System" isActive={activeDemo === 'notifications'}>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div>
                                    <h4 className="font-semibold text-slate-900 mb-4">Real-Time Notifications</h4>
                                    <div className="space-y-3">
                                        {[
                                            { type: 'success', title: 'New Lead Captured', message: 'John Doe inquired about Ocean Drive Villa', time: '2 min ago' },
                                            { type: 'info', title: 'Appointment Scheduled', message: 'Showing scheduled for tomorrow at 2 PM', time: '5 min ago' },
                                            { type: 'warning', title: 'Market Update', message: 'Property values increased 3.2% this month', time: '1 hour ago' },
                                            { type: 'error', title: 'Lead Lost', message: 'Sarah Smith chose another property', time: '2 hours ago' }
                                        ].map((notification, index) => (
                                            <div key={index} className={`p-4 rounded-lg border ${notification.type === 'success' ? 'bg-green-50 border-green-200' :
                                                notification.type === 'info' ? 'bg-blue-50 border-blue-200' :
                                                    notification.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                                                        'bg-red-50 border-red-200'
                                                }`}>
                                                <div className="flex items-start gap-3">
                                                    <span className={`text-lg ${notification.type === 'success' ? 'text-green-600' :
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
                                <div>
                                    <h4 className="font-semibold text-slate-900 mb-4">Notification Settings</h4>
                                    <div className="bg-white p-6 rounded-lg border border-slate-200">
                                        <div className="space-y-4">
                                            {[
                                                'New Lead Notifications',
                                                'Appointment Reminders',
                                                'Market Updates',
                                                'AI Interaction Alerts',
                                                'Weekly Performance Reports'
                                            ].map((setting, index) => (
                                                <div key={index} className="flex items-center justify-between">
                                                    <span className="text-slate-700">{setting}</span>
                                                    <div className="w-12 h-6 bg-primary-600 rounded-full relative">
                                                        <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5"></div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </DemoSection>

                        <DemoSection title="Multilingual AI Assistants" isActive={activeDemo === 'multilingual'}>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                        <h4 className="font-semibold text-slate-900 mb-3">Auto-Detect Conversations</h4>
                                        <p className="text-slate-600 text-sm">
                                            Our AI listens for the language your lead is speaking—Spanish, French, Mandarin, and more—and instantly switches the entire experience to match. No settings to change, no scripts to rewrite.
                                        </p>
                                    </div>
                                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                        <h4 className="font-semibold text-slate-900 mb-3">Twelve Languages Out of the Box</h4>
                                        <div className="grid grid-cols-2 gap-3 text-sm text-slate-700">
                                            {[['English', 'en'], ['Spanish', 'es'], ['French', 'fr'], ['German', 'de'], ['Italian', 'it'], ['Portuguese', 'pt'], ['Chinese (Simplified)', 'zh-cn'], ['Chinese (Traditional)', 'zh-tw'], ['Japanese', 'ja'], ['Korean', 'ko'], ['Portuguese (Brazil)', 'pt-br'], ['Portuguese (Portugal)', 'pt-pt']].map(([label, code]) => (
                                                <div key={code} className="flex items-center gap-2">
                                                    <span className="text-primary-600 text-lg">•</span>
                                                    <span>{label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200 flex flex-col gap-6">
                                    <div className="bg-primary-50 border border-primary-100 rounded-lg p-4">
                                        <h5 className="font-semibold text-primary-700 mb-2">Live Example</h5>
                                        <p className="text-sm text-primary-700">
                                            “Hola, estoy buscando un condominio en Miami.”
                                        </p>
                                        <p className="text-xs text-primary-500 mt-2">Detected: Spanish • Confidence 0.94 • Switching assistant language to Spanish</p>
                                    </div>
                                    <div className="space-y-4 text-sm text-slate-600">
                                        <p><strong>Consistent Messaging:</strong> AI emails, listing descriptions, and sidekick replies stay in the same language, end-to-end.</p>
                                        <p><strong>Agent Preference:</strong> The language you set on the AI Business Card flows to training, listings, analytics, and scheduling.</p>
                                        <p><strong>Global-Friendly:</strong> Capture international buyers and sellers without hiring extra staff.</p>
                                    </div>
                                </div>
                            </div>
                        </DemoSection>
                    </div>
                </div>
            </div>

            {/* Technology Stack */}
            <div className="py-20 bg-slate-900">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold text-white mb-4">
                            Powered by Cutting-Edge Technology
                        </h2>
                        <p className="text-xl text-slate-300">
                            Built with the latest AI and cloud technologies
                        </p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {[
                            { icon: '🤖', name: 'Google AI (Gemini)', desc: 'Advanced language model' },
                            { icon: '📊', name: 'Real-time Analytics', desc: 'Live data insights' },
                            { icon: '🔔', name: 'Smart Notifications', desc: 'Intelligent alerts' },
                            { icon: '⚖️', name: 'Property Comparison', desc: 'Side-by-side analysis' }
                        ].map((tech, index) => (
                            <div key={index} className="text-center">
                                <div className="text-4xl mb-4">{tech.icon}</div>
                                <h3 className="text-lg font-semibold text-white mb-2">{tech.name}</h3>
                                <p className="text-slate-400 text-sm">{tech.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* CTA Section */}
            <div className="py-20 bg-gradient-to-r from-primary-600 to-purple-600">
                <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
                    <h2 className="text-4xl font-bold text-white mb-6">
                        Ready to Transform Your Real Estate Business?
                    </h2>
                    <p className="text-xl text-primary-100 mb-8">
                        Join thousands of agents who are already using AI to close more deals
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button className="bg-white text-primary-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-slate-100 transition-all duration-300 transform hover:scale-105">
                            Start Your Free Trial
                        </button>
                        <button className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white hover:text-primary-600 transition-all duration-300">
                            Schedule Demo
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NewLandingPage;
