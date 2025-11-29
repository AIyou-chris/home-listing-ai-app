import React, { useState } from 'react';
import { supabase } from '../services/supabase'
import { upsertAgentProfile } from '../services/sidekickProfilesService'
import { Logo } from './Logo';

interface AgentOnboardingPageProps {
    onComplete: () => void;
}

interface OnboardingData {
    // Basic Info
    fullName: string;
    company: string;
    phone: string;
    website?: string;
    
    // AI Personality
    communicationStyle: 'professional' | 'friendly' | 'casual' | 'formal';
    tone: 'enthusiastic' | 'calm' | 'confident' | 'helpful';
    expertise: string;
    specialties: string[];
    
    // Business Info
    yearsExperience: number;
    targetMarkets: string[];
    averagePropertyPrice: string;
    
    // AI Training
    bio: string;
    commonQuestions: string[];
    uniqueSellingPoints: string[];
}

const AgentOnboardingPage: React.FC<AgentOnboardingPageProps> = ({ onComplete }) => {
    const [currentStep, setCurrentStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState<OnboardingData>({
        fullName: '',
        company: '',
        phone: '',
        website: '',
        communicationStyle: 'professional',
        tone: 'helpful',
        expertise: '',
        specialties: [],
        yearsExperience: 1,
        targetMarkets: [],
        averagePropertyPrice: '250k-500k',
        bio: '',
        commonQuestions: [],
        uniqueSellingPoints: []
    });

    const [tempSpecialty, setTempSpecialty] = useState('');
    const [tempMarket, setTempMarket] = useState('');
    const [tempQuestion, setTempQuestion] = useState('');
    const [tempUSP, setTempUSP] = useState('');

    const totalSteps = 4;

    const handleInputChange = <Key extends keyof OnboardingData>(field: Key, value: OnboardingData[Key]) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const addSpecialty = () => {
        if (tempSpecialty.trim() && !formData.specialties.includes(tempSpecialty.trim())) {
            handleInputChange('specialties', [...formData.specialties, tempSpecialty.trim()]);
            setTempSpecialty('');
        }
    };

    const removeSpecialty = (index: number) => {
        handleInputChange('specialties', formData.specialties.filter((_, i) => i !== index));
    };

    const addMarket = () => {
        if (tempMarket.trim() && !formData.targetMarkets.includes(tempMarket.trim())) {
            handleInputChange('targetMarkets', [...formData.targetMarkets, tempMarket.trim()]);
            setTempMarket('');
        }
    };

    const removeMarket = (index: number) => {
        handleInputChange('targetMarkets', formData.targetMarkets.filter((_, i) => i !== index));
    };

    const addQuestion = () => {
        if (tempQuestion.trim() && !formData.commonQuestions.includes(tempQuestion.trim())) {
            handleInputChange('commonQuestions', [...formData.commonQuestions, tempQuestion.trim()]);
            setTempQuestion('');
        }
    };

    const removeQuestion = (index: number) => {
        handleInputChange('commonQuestions', formData.commonQuestions.filter((_, i) => i !== index));
    };

    const addUSP = () => {
        if (tempUSP.trim() && !formData.uniqueSellingPoints.includes(tempUSP.trim())) {
            handleInputChange('uniqueSellingPoints', [...formData.uniqueSellingPoints, tempUSP.trim()]);
            setTempUSP('');
        }
    };

    const removeUSP = (index: number) => {
        handleInputChange('uniqueSellingPoints', formData.uniqueSellingPoints.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        setIsLoading(true)
        try {
            const { data: user } = await supabase.auth.getUser()
            const uid = user?.user?.id
            const email = user?.user?.email
            if (!uid) throw new Error('Not signed in')

            // Save agent onboarding info (basic profile) into a simple table
            const { error: upErr } = await supabase
              .from('agents')
              .upsert({
                id: uid,
                name: formData.fullName,
                company: formData.company,
                phone: formData.phone,
                website: formData.website,
                email,
                years_experience: formData.yearsExperience,
                target_markets: formData.targetMarkets,
                average_price_band: formData.averagePropertyPrice,
                bio: formData.bio,
                updated_at: new Date().toISOString()
              })
            if (upErr) throw upErr

            // Create agent-level default sidekick profile
            await upsertAgentProfile(uid, {
              persona_preset: 'custom',
              description: `You are an agent with ${formData.yearsExperience} years experience. Markets: ${formData.targetMarkets.join(', ')}. Avg price: ${formData.averagePropertyPrice}. Bio: ${formData.bio}.` ,
              traits: [...formData.specialties, ...formData.uniqueSellingPoints]
            })

            onComplete()
        } catch (error) {
            console.error('Onboarding error:', error)
            alert('There was an error setting up your profile. Please try again.')
        } finally {
            setIsLoading(false)
        }
    };

    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-800 mb-4">Basic Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
                                    <input
                                        type="text"
                                        value={formData.fullName}
                                        onChange={(e) => handleInputChange('fullName', e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                        placeholder="John Smith"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Company</label>
                                    <input
                                        type="text"
                                        value={formData.company}
                                        onChange={(e) => handleInputChange('company', e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                        placeholder="ABC Real Estate"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Phone</label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => handleInputChange('phone', e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                        placeholder="(555) 123-4567"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Website (Optional)</label>
                                    <input
                                        type="url"
                                        value={formData.website}
                                        onChange={(e) => handleInputChange('website', e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                        placeholder="https://yourwebsite.com"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 2:
                return (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-800 mb-4">AI Personality Setup</h3>
                            <p className="text-sm text-slate-600 mb-6">Help us customize your AI assistant to match your communication style.</p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Communication Style</label>
                                    <select
                                        value={formData.communicationStyle}
                                        onChange={(e) => handleInputChange('communicationStyle', e.target.value as OnboardingData['communicationStyle'])}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    >
                                        <option value="professional">Professional</option>
                                        <option value="friendly">Friendly</option>
                                        <option value="casual">Casual</option>
                                        <option value="formal">Formal</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Tone</label>
                                    <select
                                        value={formData.tone}
                                        onChange={(e) => handleInputChange('tone', e.target.value as OnboardingData['tone'])}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    >
                                        <option value="enthusiastic">Enthusiastic</option>
                                        <option value="calm">Calm</option>
                                        <option value="confident">Confident</option>
                                        <option value="helpful">Helpful</option>
                                    </select>
                                </div>
                            </div>

                            <div className="mt-6">
                                <label className="block text-sm font-medium text-slate-700 mb-2">Areas of Expertise</label>
                                <input
                                    type="text"
                                    value={formData.expertise}
                                    onChange={(e) => handleInputChange('expertise', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    placeholder="e.g., Luxury homes, First-time buyers, Investment properties"
                                />
                            </div>

                            <div className="mt-6">
                                <label className="block text-sm font-medium text-slate-700 mb-2">Specialties</label>
                                <div className="flex gap-2 mb-2">
                                    <input
                                        type="text"
                                        value={tempSpecialty}
                                        onChange={(e) => setTempSpecialty(e.target.value)}
                                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                        placeholder="Add a specialty"
                                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecialty())}
                                    />
                                    <button
                                        type="button"
                                        onClick={addSpecialty}
                                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                                    >
                                        Add
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {formData.specialties.map((specialty, index) => (
                                        <span
                                            key={index}
                                            className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm"
                                        >
                                            {specialty}
                                            <button
                                                type="button"
                                                onClick={() => removeSpecialty(index)}
                                                className="text-primary-600 hover:text-primary-800"
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 3:
                return (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-800 mb-4">Business Information</h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Years of Experience</label>
                                    <select
                                        value={formData.yearsExperience}
                                        onChange={(e) => handleInputChange('yearsExperience', parseInt(e.target.value))}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    >
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map(year => (
                                            <option key={year} value={year}>{year} {year === 1 ? 'year' : 'years'}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Average Property Price</label>
                                    <select
                                        value={formData.averagePropertyPrice}
                                        onChange={(e) => handleInputChange('averagePropertyPrice', e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    >
                                        <option value="under-100k">Under $100k</option>
                                        <option value="100k-250k">$100k - $250k</option>
                                        <option value="250k-500k">$250k - $500k</option>
                                        <option value="500k-1m">$500k - $1M</option>
                                        <option value="1m-2m">$1M - $2M</option>
                                        <option value="2m-plus">$2M+</option>
                                    </select>
                                </div>
                            </div>

                            <div className="mt-6">
                                <label className="block text-sm font-medium text-slate-700 mb-2">Target Markets</label>
                                <div className="flex gap-2 mb-2">
                                    <input
                                        type="text"
                                        value={tempMarket}
                                        onChange={(e) => setTempMarket(e.target.value)}
                                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                        placeholder="Add a target market"
                                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addMarket())}
                                    />
                                    <button
                                        type="button"
                                        onClick={addMarket}
                                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                                    >
                                        Add
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {formData.targetMarkets.map((market, index) => (
                                        <span
                                            key={index}
                                            className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                                        >
                                            {market}
                                            <button
                                                type="button"
                                                onClick={() => removeMarket(index)}
                                                className="text-green-600 hover:text-green-800"
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 4:
                return (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-800 mb-4">AI Training Information</h3>
                            <p className="text-sm text-slate-600 mb-6">Help your AI assistant understand your business better.</p>
                            
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-slate-700 mb-2">Professional Bio</label>
                                <textarea
                                    value={formData.bio}
                                    onChange={(e) => handleInputChange('bio', e.target.value)}
                                    rows={4}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    placeholder="Tell us about your background, achievements, and what makes you unique as a real estate agent..."
                                />
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-slate-700 mb-2">Common Questions You Handle</label>
                                <div className="flex gap-2 mb-2">
                                    <input
                                        type="text"
                                        value={tempQuestion}
                                        onChange={(e) => setTempQuestion(e.target.value)}
                                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                        placeholder="Add a common question"
                                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addQuestion())}
                                    />
                                    <button
                                        type="button"
                                        onClick={addQuestion}
                                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                                    >
                                        Add
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {formData.commonQuestions.map((question, index) => (
                                        <div key={index} className="flex items-center gap-2 p-2 bg-slate-50 rounded">
                                            <span className="flex-1 text-sm">{question}</span>
                                            <button
                                                type="button"
                                                onClick={() => removeQuestion(index)}
                                                className="text-red-600 hover:text-red-800"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Unique Selling Points</label>
                                <div className="flex gap-2 mb-2">
                                    <input
                                        type="text"
                                        value={tempUSP}
                                        onChange={(e) => setTempUSP(e.target.value)}
                                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                        placeholder="Add a unique selling point"
                                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addUSP())}
                                    />
                                    <button
                                        type="button"
                                        onClick={addUSP}
                                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                                    >
                                        Add
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {formData.uniqueSellingPoints.map((usp, index) => (
                                        <div key={index} className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                                            <span className="flex-1 text-sm">{usp}</span>
                                            <button
                                                type="button"
                                                onClick={() => removeUSP(index)}
                                                className="text-red-600 hover:text-red-800"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12">
            <div className="w-full max-w-4xl mx-auto px-4">
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200/70 overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-8 py-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Logo className="w-8 h-8 text-white" />
                            <h1 className="text-2xl font-bold text-white">Welcome to HomeListingAI</h1>
                        </div>
                        <p className="text-primary-100">Let's set up your AI assistant to match your style and expertise.</p>
                    </div>

                    {/* Progress Bar */}
                    <div className="px-8 py-4 bg-slate-50 border-b border-slate-200">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-slate-700">Step {currentStep} of {totalSteps}</span>
                            <span className="text-sm text-slate-500">{Math.round((currentStep / totalSteps) * 100)}% Complete</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                            <div
                                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                            />
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-8">
                        {renderStep()}

                        {/* Navigation */}
                        <div className="flex justify-between mt-8 pt-6 border-t border-slate-200">
                            <button
                                type="button"
                                onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                                disabled={currentStep === 1}
                                className="px-6 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>

                            {currentStep < totalSteps ? (
                                <button
                                    type="button"
                                    onClick={() => setCurrentStep(currentStep + 1)}
                                    className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                                >
                                    Next
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={isLoading}
                                    className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? 'Setting up...' : 'Complete Setup'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AgentOnboardingPage;
