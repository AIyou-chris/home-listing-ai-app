import React, { useState, useEffect } from 'react';
import { useAgentBranding } from '../hooks/useAgentBranding';
import ReportInputForm, { ReportInputData } from './reports/ReportInputForm';
import ReportPreviewEditor, { ReportContent } from './reports/ReportPreviewEditor';
import CoverPageBuilder, { CoverConfig } from './reports/CoverPageBuilder';

import { DEMO_AI_CARD_PROFILE } from '../constants';
import { AgentProfile } from '../types';

type ReportType = 'seller-guide' | 'listing-proposal' | 'buyer-guide';

interface MarketingReportsPageProps {
    isDemoMode?: boolean;
}

const MarketingReportsPage: React.FC<MarketingReportsPageProps> = ({ isDemoMode = false }) => {
    const { uiProfile: realUiProfile } = useAgentBranding();

    // Robust check for demo mode
    const effectiveIsDemoMode = isDemoMode || window.location.hash.includes('demo-dashboard');

    const uiProfile = React.useMemo(() => {
        if (effectiveIsDemoMode) {
            console.log('MarketingReportsPage: Using DEMO profile (Sarah Johnson)');
            return {
                name: DEMO_AI_CARD_PROFILE.fullName,
                slug: 'demo-agent',
                title: DEMO_AI_CARD_PROFILE.professionalTitle,
                company: DEMO_AI_CARD_PROFILE.company,
                phone: DEMO_AI_CARD_PROFILE.phone,
                email: DEMO_AI_CARD_PROFILE.email,
                headshotUrl: `/demo-headshot.png?v=${Date.now()}`, // Force the uploaded image with cache busting
                logoUrl: `/demo-logo.png?v=${Date.now()}`, // Force the uploaded logo with cache busting
                brandColor: DEMO_AI_CARD_PROFILE.brandColor,
                bio: DEMO_AI_CARD_PROFILE.bio,
                website: DEMO_AI_CARD_PROFILE.website,
                socials: [
                    { platform: 'Facebook', url: DEMO_AI_CARD_PROFILE.socialMedia.facebook },
                    { platform: 'Instagram', url: DEMO_AI_CARD_PROFILE.socialMedia.instagram },
                    { platform: 'Twitter', url: DEMO_AI_CARD_PROFILE.socialMedia.twitter },
                    { platform: 'LinkedIn', url: DEMO_AI_CARD_PROFILE.socialMedia.linkedin },
                    { platform: 'YouTube', url: DEMO_AI_CARD_PROFILE.socialMedia.youtube },
                ].filter(s => s.url) as AgentProfile['socials'],
                language: DEMO_AI_CARD_PROFILE.language
            } as AgentProfile;
        }
        return realUiProfile;
    }, [effectiveIsDemoMode, realUiProfile]);

    useEffect(() => {
        console.log('MarketingReportsPage mounted. Mode:', effectiveIsDemoMode ? 'DEMO' : 'REAL');
        console.log('Current Profile Name:', uiProfile.name);
    }, [effectiveIsDemoMode, uiProfile]);
    const [activeStep, setActiveStep] = useState<'select' | 'input' | 'cover-builder' | 'preview'>('select');
    const [selectedType, setSelectedType] = useState<ReportType | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [reportContent, setReportContent] = useState<ReportContent | null>(null);
    const [showTips, setShowTips] = useState(true);

    // Cover Page Config State
    const [coverConfig, setCoverConfig] = useState<CoverConfig>({
        title: '',
        subtitle: '',
        themeColor: 'slate',
        layout: 'modern',
        backgroundStyle: 'solid'
    });

    const handleTypeSelect = (type: ReportType) => {
        setSelectedType(type);

        // Set default cover config based on type
        if (type === 'seller-guide') {
            setCoverConfig({
                title: 'Why List With Me',
                subtitle: 'A Strategic Approach to Selling Your Home',
                themeColor: 'blue',
                layout: 'modern',
                backgroundStyle: 'solid'
            });
            setActiveStep('cover-builder');
        } else if (type === 'buyer-guide') {
            setCoverConfig({
                title: 'Home Buying Guide',
                subtitle: 'Your Roadmap to Homeownership',
                themeColor: 'emerald',
                layout: 'modern',
                backgroundStyle: 'solid'
            });
            setActiveStep('cover-builder');
        } else {
            // Listing Proposal goes to input first
            setActiveStep('input');
        }
    };

    const handleProposalSubmit = async (data: ReportInputData) => {
        // Set cover config for proposal
        setCoverConfig({
            title: 'Strategic Listing Proposal',
            subtitle: `Prepared for ${data.address}`,
            themeColor: 'purple',
            layout: 'modern',
            backgroundStyle: 'solid'
        });

        // Store input data temporarily if needed, or just pass to generation
        // For now, we'll generate the content but wait to show it until after cover builder
        await generateListingProposalContent(data);
        setActiveStep('cover-builder');
    };

    const handleCoverBuilderNext = () => {
        if (selectedType === 'seller-guide') {
            generateSellerGuide();
        } else if (selectedType === 'buyer-guide') {
            generateBuyerGuide();
        } else {
            // Proposal content was already generated in handleProposalSubmit, just show preview
            setActiveStep('preview');
        }
    };

    const generateSellerGuide = async () => {
        setIsGenerating(true);
        await new Promise(resolve => setTimeout(resolve, 1500));

        const content: ReportContent = {
            title: coverConfig.title,
            subtitle: coverConfig.subtitle,
            themeColor: coverConfig.themeColor,
            sections: [
                {
                    title: "My Philosophy",
                    content: `Selling a home is more than just a transaction; it's a life-changing experience. As your dedicated real estate partner, I believe in a personalized approach that puts your needs first.\n\nI don't just list homes; I market them. My goal is to ensure you feel supported, informed, and confident every step of the way.`
                },
                {
                    title: "Marketing Strategy",
                    content: "In today's digital age, 95% of homebuyers start their search online. My comprehensive marketing plan includes:\n\n• Professional Photography & Virtual Tours\n• Targeted Social Media Campaigns\n• Premium Listing Syndication\n• Exclusive Open House Events\n\nI leverage the latest technology to ensure your property gets maximum exposure to the right buyers."
                },
                {
                    title: "Why Choose Me?",
                    content: "With a deep understanding of the local market and a track record of success, I bring negotiation expertise and strategic insight to the table. I am committed to getting you the highest possible price in the shortest amount of time."
                }
            ]
        };

        setReportContent(content);
        setActiveStep('preview');
        setIsGenerating(false);
    };

    const generateBuyerGuide = async () => {
        setIsGenerating(true);
        await new Promise(resolve => setTimeout(resolve, 1500));

        const content: ReportContent = {
            title: coverConfig.title,
            subtitle: coverConfig.subtitle,
            themeColor: coverConfig.themeColor,
            sections: [
                {
                    title: "Step 1: Getting Pre-Approved",
                    content: "Before we start looking at homes, it's crucial to know your budget. Getting pre-approved for a mortgage gives you a clear price range and shows sellers that you are a serious and qualified buyer."
                },
                {
                    title: "Step 2: Needs vs. Wants",
                    content: "Make a list of your non-negotiables (e.g., number of bedrooms, location) versus your 'nice-to-haves' (e.g., pool, finished basement). This helps us focus our search on properties that truly fit your lifestyle."
                },
                {
                    title: "Step 3: The Search",
                    content: "I will set you up with a custom search portal that updates in real-time. We'll tour homes together, and I'll help you evaluate each property's condition, value, and potential."
                },
                {
                    title: "Step 4: Making a Winning Offer",
                    content: "When we find 'the one,' I will help you craft a competitive offer based on market data. I'll negotiate on your behalf to get the best possible price and terms."
                },
                {
                    title: "Step 5: Closing the Deal",
                    content: "From the home inspection to the final walk-through, I'll guide you through the closing process to ensure a smooth transaction. Welcome home!"
                }
            ]
        };

        setReportContent(content);
        setActiveStep('preview');
        setIsGenerating(false);
    };

    const generateListingProposalContent = async (data: ReportInputData) => {
        setIsGenerating(true);
        await new Promise(resolve => setTimeout(resolve, 2000));
        // Note: In a real app, we might want to wait to generate this until the user clicks "Next" on cover builder
        // But for simplicity, we generate it here and store it.

        const content: ReportContent = {
            title: "Strategic Listing Proposal", // Will be overwritten by coverConfig in render
            subtitle: `Prepared for ${data.address}`, // Will be overwritten by coverConfig in render
            themeColor: 'purple', // Will be overwritten
            propertyDetails: {
                price: `$${data.price}`,
                specs: `${data.beds} Beds • ${data.baths} Baths • ${data.sqft} Sq Ft`,
                features: data.features.split(',').map(f => f.trim()).filter(Boolean)
            },
            sections: [
                {
                    title: "Property Analysis",
                    content: `This ${data.propertyType.toLowerCase()} at ${data.address} is a standout property in the market. With ${data.sqft} square feet of living space, it offers the perfect blend of comfort and style.\n\nThe key highlights, including ${data.features}, make it highly attractive to today's buyers. My analysis suggests that it is well-positioned to command strong interest.`
                },
                {
                    title: "Valuation & Pricing Strategy",
                    content: `Based on current market trends and the unique attributes of your home, I recommend a list price of $${data.price}. This positions the property competitively while leaving room for negotiation.\n\nWe will target buyers looking for move-in ready homes in this price bracket, emphasizing the value proposition of your specific upgrades and location.`
                },
                {
                    title: "Next Steps",
                    content: "1. Prepare the home for photography (decluttering & staging).\n2. Launch 'Coming Soon' marketing campaign.\n3. Go live on MLS and syndicate to major portals.\n4. Host exclusive broker open house.\n\nI am ready to get started when you are. Let's make this a successful sale!"
                }
            ]
        };
        setReportContent(content);
        setIsGenerating(false);
    };

    if (activeStep === 'cover-builder') {
        return (
            <CoverPageBuilder
                config={coverConfig}
                onChange={setCoverConfig}
                onNext={handleCoverBuilderNext}
                onBack={() => setActiveStep(selectedType === 'listing-proposal' ? 'input' : 'select')}
                agentProfile={uiProfile}
            />
        );
    }

    if (activeStep === 'preview' && reportContent) {
        // Merge cover config into report content before rendering
        const finalContent = {
            ...reportContent,
            title: coverConfig.title,
            subtitle: coverConfig.subtitle,
            themeColor: coverConfig.themeColor,
            layout: coverConfig.layout,
            backgroundStyle: coverConfig.backgroundStyle,
            customImageUrl: coverConfig.customImageUrl
        };

        return (
            <ReportPreviewEditor
                content={finalContent}
                agentProfile={uiProfile}
                onBack={() => setActiveStep('cover-builder')}
            />
        );
    }


    return (
        <div className="max-w-5xl mx-auto py-10 px-6">
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Marketing Reports</h1>
                        <p className="text-slate-500 mt-1">Generate professional, AI-written guides and proposals in seconds.</p>
                    </div>
                    <button
                        onClick={() => setShowTips(!showTips)}
                        className="flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700 bg-primary-50 px-4 py-2 rounded-lg transition-colors"
                    >
                        <span className="material-symbols-outlined">{showTips ? 'visibility_off' : 'lightbulb'}</span>
                        {showTips ? 'Hide Tips' : 'Show Pro Tips'}
                    </button>
                </div>

                {/* Collapsible Pro Tips Section */}
                <div className={`transition-all duration-300 ease-in-out overflow-hidden ${showTips ? 'max-h-96 opacity-100 mb-8' : 'max-h-0 opacity-0'}`}>
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100 shadow-sm">
                        <div className="flex items-start gap-4">
                            <div className="bg-white p-3 rounded-lg shadow-sm text-blue-600">
                                <span className="material-symbols-outlined text-2xl">auto_awesome</span>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 mb-2">Marketing Reports Playbook</h3>
                                <ul className="space-y-2 text-slate-600 text-sm">
                                    <li className="flex items-start gap-2">
                                        <span className="material-symbols-outlined text-blue-500 text-lg mt-0.5">check_circle</span>
                                        <span><strong>Seller's Guide:</strong> Print this out for your listing presentations. It establishes you as a premium brand before you even talk price.</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="material-symbols-outlined text-blue-500 text-lg mt-0.5">check_circle</span>
                                        <span><strong>Listing Proposal:</strong> Use this to close the deal. Input the specific home details to show the seller you've done your homework.</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="material-symbols-outlined text-blue-500 text-lg mt-0.5">check_circle</span>
                                        <span><strong>Buying Guide:</strong> Send this PDF to every new lead immediately. It builds trust and answers their "what's next?" questions.</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="material-symbols-outlined text-blue-500 text-lg mt-0.5">check_circle</span>
                                        <span><strong>Live Editor:</strong> Don't like what the AI wrote? Click any text in the preview to rewrite it instantly before downloading.</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {activeStep === 'select' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                    {/* Option 1: Seller's Guide */}
                    <button
                        onClick={() => handleTypeSelect('seller-guide')}
                        disabled={isGenerating}
                        className="group relative bg-white p-6 rounded-2xl shadow-sm border-2 border-slate-200 hover:border-primary-500 hover:shadow-md transition-all text-left flex flex-col h-full"
                    >
                        <div className="bg-blue-100 text-blue-700 p-3 rounded-xl w-fit mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <span className="material-symbols-outlined text-3xl">menu_book</span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Seller's Guide</h3>
                        <p className="text-slate-500 text-sm mb-6 flex-1">
                            A generic "Why List With Me" guide. Perfect for initial meetings or open houses.
                        </p>
                        <span className="text-primary-600 font-semibold text-sm flex items-center group-hover:translate-x-1 transition-transform mt-auto">
                            Generate Guide <span className="material-symbols-outlined ml-1 text-lg">arrow_forward</span>
                        </span>
                        {isGenerating && selectedType === 'seller-guide' && (
                            <div className="absolute inset-0 bg-white/90 flex items-center justify-center rounded-2xl z-10">
                                <div className="flex flex-col items-center">
                                    <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-2"></span>
                                    <span className="text-sm font-medium text-primary-700">Writing guide...</span>
                                </div>
                            </div>
                        )}
                    </button>

                    {/* Option 2: Listing Proposal */}
                    <button
                        onClick={() => handleTypeSelect('listing-proposal')}
                        disabled={isGenerating}
                        className="group relative bg-white p-6 rounded-2xl shadow-sm border-2 border-slate-200 hover:border-primary-500 hover:shadow-md transition-all text-left flex flex-col h-full"
                    >
                        <div className="bg-purple-100 text-purple-700 p-3 rounded-xl w-fit mb-4 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                            <span className="material-symbols-outlined text-3xl">real_estate_agent</span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Listing Proposal</h3>
                        <p className="text-slate-500 text-sm mb-6 flex-1">
                            A custom proposal for a specific property. Input address & price for a tailored analysis.
                        </p>
                        <span className="text-primary-600 font-semibold text-sm flex items-center group-hover:translate-x-1 transition-transform mt-auto">
                            Start Proposal <span className="material-symbols-outlined ml-1 text-lg">arrow_forward</span>
                        </span>
                    </button>

                    {/* Option 3: Buyer's Guide */}
                    <button
                        onClick={() => handleTypeSelect('buyer-guide')}
                        disabled={isGenerating}
                        className="group relative bg-white p-6 rounded-2xl shadow-sm border-2 border-slate-200 hover:border-primary-500 hover:shadow-md transition-all text-left flex flex-col h-full"
                    >
                        <div className="bg-emerald-100 text-emerald-700 p-3 rounded-xl w-fit mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                            <span className="material-symbols-outlined text-3xl">cottage</span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Home Buying Guide</h3>
                        <p className="text-slate-500 text-sm mb-6 flex-1">
                            A step-by-step roadmap for new buyers. Send this to leads to build trust immediately.
                        </p>
                        <span className="text-primary-600 font-semibold text-sm flex items-center group-hover:translate-x-1 transition-transform mt-auto">
                            Generate Guide <span className="material-symbols-outlined ml-1 text-lg">arrow_forward</span>
                        </span>
                        {isGenerating && selectedType === 'buyer-guide' && (
                            <div className="absolute inset-0 bg-white/90 flex items-center justify-center rounded-2xl z-10">
                                <div className="flex flex-col items-center">
                                    <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mb-2"></span>
                                    <span className="text-sm font-medium text-emerald-700">Writing guide...</span>
                                </div>
                            </div>
                        )}
                    </button>
                </div>
            )}

            {activeStep === 'input' && (
                <ReportInputForm
                    onSubmit={handleProposalSubmit}
                    isLoading={isGenerating}
                    onBack={() => setActiveStep('select')}
                />
            )}
        </div>
    );
};

export default MarketingReportsPage;
