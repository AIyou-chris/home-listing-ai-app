import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BackgroundTechIcons } from './BackgroundTechIcons';
import { FadeIn } from './FadeIn';

interface FaqSectionProps {
    onNavigateToSignUp: () => void;
    onEnterDemoMode: () => void;
}

const faqs = [
    {
        question: "Is this a CRM?",
        answer: "No. HomeListingAI turns each listing into a lead-capture page, then routes leads into your inbox with alerts and a clean follow-up timeline. Use it standalone or alongside your CRM."
    },
    {
        question: "How fast can I launch an AI Listing?",
        answer: "Minutes. Create the AI Listing, generate the 1-page market report, and share the link or QR anywhere."
    },
    {
        question: "What does the buyer see?",
        answer: "A clean AI Listing page with instant answers, plus buttons to request a showing and get the 1-page market report."
    },
    {
        question: "Where do leads go?",
        answer: "Into your Lead Inbox inside HomeListingAI, tied to the exact listing, with source tracking (link/QR/social) and a clear next step."
    },
    {
        question: "How do I get alerted?",
        answer: "Email alerts and outbound SMS are live now. LO includes 250 SMS each month. LO Pro includes unlimited."
    },
    {
        question: "What counts as an SMS?",
        answer: "Only automated outbound texts count against your monthly plan limit."
    },
    {
        question: "What SMS is included in each plan?",
        answer: "LO includes 250 outbound SMS per month. LO Pro includes unlimited. HomeListingAI uses those texts for first-touch follow-up, showing confirmations, reminder texts, schedule changes, and open house reminders."
    },
    {
        question: "Can I use it for open houses and yard signs?",
        answer: "Yes. Every listing generates a share link + QR, and the Open House QR Pack makes it easy to capture every walk-in."
    },
    {
        question: "Do you support multiple listings or teams?",
        answer: "Yes. LO supports 20 active listings. LO Pro supports 50. You can add more via overages if you need it."
    },
    {
        question: "Can I cancel anytime?",
        answer: "Yes. No contracts."
    }
];

export const FaqSectionNew: React.FC<FaqSectionProps> = ({ onNavigateToSignUp, onEnterDemoMode }) => {
    const navigate = useNavigate();
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    const toggleFaq = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <section id="faq" className="relative py-24 lg:py-32 bg-[#040814] overflow-hidden border-t border-slate-900">
            {/* Ambient Background Glows */}
            <BackgroundTechIcons />
            <div className="absolute top-1/4 left-0 w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none -translate-x-1/2"></div>
            <div className="absolute bottom-1/4 right-0 w-[600px] h-[600px] bg-cyan-900/10 rounded-full blur-[120px] pointer-events-none translate-x-1/2"></div>

            <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
                {/* Header */}
                <FadeIn delay={100} className="text-center mb-16 lg:mb-20">
                    <p className="text-cyan-400 font-bold tracking-widest text-sm uppercase mb-3">FAQ</p>
                    <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-6">
                        FAQ
                    </h2>
                    <h3 className="text-2xl md:text-3xl font-semibold text-white tracking-tight mb-4">
                        Questions LOs and Agents Ask Before They Hit "Start Free."
                    </h3>
                    <p className="text-lg md:text-xl text-slate-300 font-light leading-relaxed max-w-2xl mx-auto">
                        Short answers. No fluff. If you still have questions, we'll show you a live listing.
                    </p>
                </FadeIn>

                {/* FAQ Accordion */}
                <div className="space-y-4 mb-16">
                    {faqs.map((faq, index) => {
                        const isOpen = openIndex === index;
                        return (
                            <FadeIn key={index} delay={200 + index * 80}>
                                <div
                                    className={`bg-[#0B1121]/80 backdrop-blur-sm border ${isOpen ? 'border-cyan-500/50' : 'border-slate-800'} rounded-2xl overflow-hidden transition-all duration-300 hover:border-slate-600`}
                                >
                                    <button
                                        onClick={() => toggleFaq(index)}
                                        className="w-full px-6 py-5 flex items-center justify-between focus:outline-none"
                                    >
                                        <span className="text-left text-lg font-medium text-white pr-4">{faq.question}</span>
                                        <span
                                            className={`material-symbols-outlined text-cyan-500 transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180' : 'rotate-0'}`}
                                        >
                                            expand_more
                                        </span>
                                    </button>

                                    <div
                                        className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
                                    >
                                        <div className="px-6 pb-6 pt-0 text-slate-400 leading-relaxed">
                                            {faq.answer}
                                        </div>
                                    </div>
                                </div>
                            </FadeIn>
                        );
                    })}
                </div>

                {/* Bottom CTA Row */}
                <FadeIn delay={400} className="flex flex-col items-center justify-center border-t border-slate-900/60 pt-16">
                    <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mb-4">
                        <div className="flex gap-2 w-full sm:w-auto">
                            <button
                                onClick={onEnterDemoMode}
                                className="flex-1 sm:flex-none px-5 py-4 bg-transparent border border-cyan-500/50 hover:bg-cyan-500/10 hover:shadow-[0_0_15px_rgba(6,182,212,0.2)] text-cyan-400 font-semibold rounded-lg transition-all text-sm flex flex-col items-center justify-center gap-0.5"
                            >
                                <span>Agent Demo</span>
                                <span className="text-[10px] text-cyan-600 font-normal">Dashboard view</span>
                            </button>
                            <button
                                onClick={() => navigate('/lo-demo')}
                                className="flex-1 sm:flex-none px-5 py-4 bg-transparent border border-cyan-500/50 hover:bg-cyan-500/10 hover:shadow-[0_0_15px_rgba(6,182,212,0.2)] text-cyan-400 font-semibold rounded-lg transition-all text-sm flex flex-col items-center justify-center gap-0.5"
                            >
                                <span>LO Demo</span>
                                <span className="text-[10px] text-cyan-600 font-normal">Loan officer view</span>
                            </button>
                        </div>
                        <button
                            onClick={onNavigateToSignUp}
                            className="w-full sm:w-auto px-10 py-4 bg-white text-slate-950 hover:bg-slate-200 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] font-bold rounded-lg transition-all text-lg flex items-center justify-center gap-2"
                        >
                            Create Free Account
                        </button>
                    </div>
                    <p className="text-slate-500 text-sm font-medium">
                        No credit card required to start.
                    </p>
                </FadeIn>
            </div>
        </section>
    );
};
