import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { getLiveExampleUrl, safeNavigate, verifyHomepageCtaTargetsOnce } from '../utils/ctaLinks';

interface ConversionWedgeProps {
    onNavigateToSignUp: () => void;
    onEnterDemoMode: () => void;
}

export const ConversionWedge: React.FC<ConversionWedgeProps> = ({ onNavigateToSignUp, onEnterDemoMode }) => {
    const navigate = useNavigate();
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [step, setStep] = useState<1 | 2 | 'success'>(1);
    const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);
    const [aiAnswer, setAiAnswer] = useState<string | null>(null);
    const [isTyping, setIsTyping] = useState(false);

    // Form State
    const [formName, setFormName] = useState('');
    const [formContact, setFormContact] = useState('');

    // Demo send modal
    const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
    const [demoName, setDemoName] = useState('');
    const [demoEmail, setDemoEmail] = useState('');
    const [demoSent, setDemoSent] = useState(false);
    const qrCanvasRef = useRef<HTMLCanvasElement>(null);

    // Reset modal when opened
    useEffect(() => {
        if (isModalOpen) {
            setStep(1);
            setSelectedQuestion(null);
            setAiAnswer(null);
            setIsTyping(false);
            setFormName('');
            setFormContact('');
        }
    }, [isModalOpen]);

    useEffect(() => {
        verifyHomepageCtaTargetsOnce();
    }, []);

    useEffect(() => {
        if (!qrCanvasRef.current) return;
        const demoUrl = window.location.origin + getLiveExampleUrl();
        QRCode.toCanvas(qrCanvasRef.current, demoUrl, {
            width: 140,
            margin: 1,
            color: { dark: '#ffffff', light: '#0B1121' },
        });
    }, []);

    const handleDemoSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Open the live demo immediately — no email claim made until a real send is wired up.
        window.open('/partner-invite/demo', '_blank');
        setDemoSent(true);
    };

    const handleQuestionClick = (question: string) => {
        setSelectedQuestion(question);
        setIsTyping(true);
        setAiAnswer(null);

        // Simulate AI thinking
        setTimeout(() => {
            setIsTyping(false);
            if (question === 'Is it still available?') {
                setAiAnswer('Yes — as of right now it’s still available. Want the 1-page market report and the best showing windows?');
            } else if (question === 'Can I see it this weekend?') {
                setAiAnswer('Yes. I can request a showing window for you. Want the 1-page report too so you have pricing context before you go?');
            } else if (question === 'Any HOA or monthly cost?') {
                setAiAnswer('Good question. HOA and monthly costs can vary by property. Want the 1-page report and I’ll send the details and showing options?');
            }

            // Advance to step 2 after answer
            setTimeout(() => {
                setStep(2);
            }, 1000);
        }, 1200);
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setStep('success');
    };

    const _handleScrollTo = (id: string) => {
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <section id="how-it-works" className="relative py-24 lg:py-32 bg-slate-950 overflow-hidden border-t border-slate-900">
            {/* Background Gradients & Glows */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-slate-800 to-transparent"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 z-10">

                {/* 1) Headline + Subhead (Centered) */}
                <div className="text-center max-w-3xl mx-auto mb-16 lg:mb-20">
                    <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-6">
                        Every Listing Grows Your Pipeline.
                    </h2>
                    <p className="text-xl md:text-2xl text-slate-300 font-light leading-relaxed mb-4">
                        Give your agent partners AI-powered listing pages that buyers love.
                        <br className="hidden md:block" />
                        <span className="text-cyan-400 font-medium tracking-wide">Every lead it captures comes straight to you both — warm, qualified, and ready to talk.</span>
                    </p>
                    <div className="inline-block mt-2 px-4 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 backdrop-blur-sm">
                        <p className="text-xs md:text-sm text-slate-400 font-medium tracking-wide flex items-center justify-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> SMS alerts available
                            <span className="text-slate-700 mx-1">•</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Email alerts live
                            <span className="text-slate-700 mx-1">•</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Reminder texts live
                        </p>
                    </div>
                </div>

                {/* HOW IT WORKS — LO-built, LO-proven */}
                <div className="max-w-5xl mx-auto mb-16 lg:mb-20">

                    {/* Section Label */}
                    <div className="text-center mb-12">
                        <p className="inline-block text-xs font-bold uppercase tracking-widest text-cyan-500/70 mb-4 px-4 py-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/5">Built by an LO. For LOs.</p>
                        <h3 className="text-3xl md:text-4xl font-extrabold text-white mb-4 tracking-tight">
                            Three steps. Real partnerships.<br className="hidden md:block" />
                            <span className="text-cyan-400">Warm leads that actually close.</span>
                        </h3>
                        <p className="text-slate-400 text-lg leading-relaxed max-w-2xl mx-auto">
                            No cold calls. No purchased lists. No chasing ghosts. Every lead this tool delivers
                            is a buyer who raised their hand — and your name is already on the listing they came from.
                        </p>
                    </div>

                    {/* 3-Step Cards */}
                    <div className="relative grid md:grid-cols-3 gap-6">
                        {/* Connecting line (desktop) */}
                        <div className="hidden md:block absolute top-10 left-[calc(33.33%-1px)] right-[calc(33.33%-1px)] h-px bg-gradient-to-r from-cyan-500/50 via-cyan-400/80 to-cyan-500/50 z-0"></div>

                        {/* Step 1 */}
                        <div className="relative z-10 bg-[#0B1121] border border-slate-800 hover:border-cyan-500/40 rounded-2xl p-7 transition-colors group">
                            <div className="flex items-center gap-4 mb-5">
                                <div className="w-14 h-14 rounded-full bg-cyan-950 border-2 border-cyan-500 flex items-center justify-center shrink-0 shadow-[0_0_24px_rgba(6,182,212,0.3)] group-hover:shadow-[0_0_32px_rgba(6,182,212,0.5)] transition-shadow">
                                    <span className="text-cyan-400 font-extrabold text-xl">1</span>
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-0.5">30 seconds</p>
                                    <h4 className="text-white font-bold text-xl leading-tight">Name + email.<br/>That's it.</h4>
                                </div>
                            </div>
                            <p className="text-slate-400 text-sm leading-relaxed mb-4">
                                Type in the agent's name and email address. The platform handles everything else — branding, the listing page, the full marketing kit. You don't touch a thing.
                            </p>
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2 text-sm text-slate-300">
                                    <span className="material-symbols-outlined text-cyan-500 text-[16px]">check_circle</span>
                                    Your NMLS# and headshot auto-applied
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-300">
                                    <span className="material-symbols-outlined text-cyan-500 text-[16px]">check_circle</span>
                                    Co-branded instantly — no design work
                                </div>
                            </div>
                        </div>

                        {/* Step 2 */}
                        <div className="relative z-10 bg-[#0B1121] border border-cyan-500/30 rounded-2xl p-7 shadow-[0_0_30px_rgba(6,182,212,0.08)] group hover:border-cyan-500/60 transition-colors">
                            {/* "Most powerful step" badge */}
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-cyan-500 text-slate-950 text-[10px] font-extrabold uppercase tracking-widest rounded-full whitespace-nowrap shadow-[0_0_12px_rgba(6,182,212,0.6)]">
                                The WOW moment
                            </div>
                            <div className="flex items-center gap-4 mb-5 mt-2">
                                <div className="w-14 h-14 rounded-full bg-cyan-500 border-2 border-cyan-400 flex items-center justify-center shrink-0 shadow-[0_0_24px_rgba(6,182,212,0.5)]">
                                    <span className="text-slate-950 font-extrabold text-xl">2</span>
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-cyan-500/70 mb-0.5">One tap</p>
                                    <h4 className="text-white font-bold text-xl leading-tight">Send the<br/>WOW Link.</h4>
                                </div>
                            </div>
                            <p className="text-slate-300 text-sm leading-relaxed mb-4">
                                The agent opens it and their jaw drops — a live AI listing page with <em>their</em> property, <em>their</em> branding, and <em>your</em> mortgage chatbot answering buyer questions 24/7. They didn't know this existed. Now they can't live without it.
                            </p>
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2 text-sm text-slate-300">
                                    <span className="material-symbols-outlined text-cyan-400 text-[16px]">check_circle</span>
                                    Auto follow-up if they don't open it
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-300">
                                    <span className="material-symbols-outlined text-cyan-400 text-[16px]">check_circle</span>
                                    You get a text the second they claim it
                                </div>
                            </div>
                        </div>

                        {/* Step 3 */}
                        <div className="relative z-10 bg-[#0B1121] border border-slate-800 hover:border-cyan-500/40 rounded-2xl p-7 transition-colors group">
                            <div className="flex items-center gap-4 mb-5">
                                <div className="w-14 h-14 rounded-full bg-cyan-950 border-2 border-cyan-500 flex items-center justify-center shrink-0 shadow-[0_0_24px_rgba(6,182,212,0.3)] group-hover:shadow-[0_0_32px_rgba(6,182,212,0.5)] transition-shadow">
                                    <span className="text-cyan-400 font-extrabold text-xl">3</span>
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-0.5">Repeat</p>
                                    <h4 className="text-white font-bold text-xl leading-tight">Warm leads.<br/>True partners.</h4>
                                </div>
                            </div>
                            <p className="text-slate-400 text-sm leading-relaxed mb-4">
                                Every buyer who scans a QR, asks a question, or requests a showing routes to you — pre-qualified, with intent. Your follow-up call isn't cold anymore. They already know your name.
                            </p>
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2 text-sm text-slate-300">
                                    <span className="material-symbols-outlined text-cyan-500 text-[16px]">check_circle</span>
                                    Lead scored hot / warm / cold for you
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-300">
                                    <span className="material-symbols-outlined text-cyan-500 text-[16px]">check_circle</span>
                                    Agent partnership locked in — repeat every listing
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom conviction bar */}
                    <div className="mt-10 p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
                        <p className="text-white font-bold text-lg text-center md:text-left">
                            What more do you need?<br className="hidden md:block" />
                            <span className="text-slate-400 font-normal text-base">Warm lead. Follow-up call. Real partner. That's the whole game.</span>
                        </p>
                        <div className="flex flex-wrap gap-3 shrink-0 justify-center">
                            {['Follow-up call tool', 'True partnerships', 'Warm buyer leads'].map(chip => (
                                <span key={chip} className="px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase tracking-wider rounded-full">
                                    {chip}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* See what they get — QR + send demo */}
                    <div className="mt-12 flex flex-col items-center">
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-6">See what your partner gets</p>
                        <div className="flex flex-col sm:flex-row items-center gap-8 bg-[#0B1121] border border-slate-800 rounded-2xl px-8 py-8 w-full max-w-lg">
                            {/* QR Code */}
                            <div className="flex flex-col items-center gap-2 shrink-0">
                                <canvas ref={qrCanvasRef} className="rounded-xl" />
                                <p className="text-slate-500 text-xs font-medium">Scan to see it live</p>
                            </div>

                            <div className="w-px h-24 bg-slate-800 hidden sm:block shrink-0"></div>
                            <div className="h-px w-full bg-slate-800 sm:hidden"></div>

                            {/* Send it button */}
                            <div className="flex flex-col items-center sm:items-start gap-3 flex-1">
                                <p className="text-white font-semibold text-base leading-snug">Or send yourself a live demo right now</p>
                                <p className="text-slate-400 text-sm">Experience exactly what your agent partner will see.</p>
                                <button
                                    onClick={() => { setIsDemoModalOpen(true); setDemoSent(false); setDemoName(''); setDemoEmail(''); }}
                                    className="mt-1 px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl transition-all shadow-[0_0_16px_rgba(6,182,212,0.3)] hover:shadow-[0_0_22px_rgba(6,182,212,0.5)] text-sm flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-[18px]">send</span>
                                    Send me the demo
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2) Two Visual Cards Side-By-Side */}
                <div className="grid md:grid-cols-2 gap-8 mb-8">

                    {/* Visual Card 1: AI Listing Page */}
                    <div className="bg-[#0B1121] rounded-2xl border border-slate-800 p-8 shadow-xl shadow-black/50 hover:border-cyan-900/50 transition-colors group relative overflow-hidden">
                        {/* Glow effect on hover */}
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/0 to-transparent group-hover:via-cyan-500/50 transition-all duration-700"></div>

                        <div className="flex flex-col h-full">
                            <div className="mb-8">
                                <h3 className="text-2xl font-semibold text-white mb-2 flex items-center gap-3">
                                    <span className="material-symbols-outlined text-cyan-400">phone_iphone</span>
                                    AI Listing Page
                                </h3>
                                <p className="text-slate-400 font-medium uppercase tracking-wider text-sm">What buyers interact with</p>
                            </div>

                            {/* Real Product Screenshot */}
                            <div className="mb-8 flex-1 relative flex items-center justify-center group-hover:-translate-y-1 transition-transform duration-500">
                                <div className="relative w-full aspect-[3/4] max-h-[320px] rounded-[24px] overflow-hidden border-4 border-slate-800 shadow-2xl bg-slate-900 flex items-center justify-center">
                                    <img
                                        src="/assets/landing/ai-listing-card.webp"
                                        srcSet="/assets/landing/ai-listing-card.webp 1x, /assets/landing/ai-listing-card@2x.webp 2x"
                                        alt="HomeListingAI mobile listing page preview"
                                        className="w-full h-full object-cover object-top"
                                        loading="lazy"
                                    />
                                    {/* Bonus Overlay */}
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-950/80 backdrop-blur-md border border-slate-700/50 text-slate-200 text-xs font-semibold px-4 py-2 rounded-full shadow-[0_0_15px_rgba(0,0,0,0.5)] whitespace-nowrap opacity-90 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[14px] text-cyan-400">mic</span>
                                        Ask a question...
                                    </div>
                                </div>
                            </div>

                            <ul className="space-y-4 mb-8">
                                <li className="flex items-start gap-3 text-slate-300">
                                    <span className="material-symbols-outlined text-cyan-500 text-xl shrink-0">check_circle</span>
                                    Answers questions 24/7
                                </li>
                                <li className="flex items-start gap-3 text-slate-300">
                                    <span className="material-symbols-outlined text-cyan-500 text-xl shrink-0">check_circle</span>
                                    "Request a showing" built in
                                </li>
                                <li className="flex items-start gap-3 text-slate-300">
                                    <span className="material-symbols-outlined text-cyan-500 text-xl shrink-0">check_circle</span>
                                    Preapproval request built in
                                </li>
                            </ul>

                            <div className="mt-auto">
                                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-medium text-slate-400">
                                    <span className="material-symbols-outlined text-[14px]">qr_code_2</span> Shareable link + QR
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Visual Card 2: 1-Page Market Report */}
                    <div className="bg-[#0B1121] rounded-2xl border border-slate-800 p-8 shadow-xl shadow-black/50 hover:border-blue-900/50 transition-colors group relative overflow-hidden">
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/0 to-transparent group-hover:via-blue-500/50 transition-all duration-700"></div>
                        <div className="flex flex-col h-full">
                            <div className="mb-8">
                                <h3 className="text-2xl font-semibold text-white mb-2 flex items-center gap-3">
                                    <span className="material-symbols-outlined text-blue-400">rocket_launch</span>
                                    Full Listing Marketing Package
                                </h3>
                                <p className="text-slate-400 font-medium uppercase tracking-wider text-sm">Everything ready in under 5 minutes</p>
                            </div>

                            {/* Real Product Screenshot */}
                            <div className="mb-8 flex-1 relative flex items-center justify-center group-hover:-translate-y-1 transition-transform duration-500">
                                <div className="relative w-full aspect-[3/4] max-h-[320px] rounded-lg overflow-hidden border border-slate-700/50 shadow-[0_10px_40px_rgba(0,0,0,0.6)] bg-slate-900 flex items-center justify-center">
                                    <img
                                        src="/assets/landing/market-report-card.webp"
                                        srcSet="/assets/landing/market-report-card.webp 1x, /assets/landing/market-report-card@2x.webp 2x"
                                        alt="HomeListingAI one-page market report preview"
                                        className="w-full h-full object-cover object-top"
                                        loading="lazy"
                                    />
                                    {/* Bonus Overlay */}
                                    <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur-md border border-slate-700/50 text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-lg shadow-[0_0_15px_rgba(0,0,0,0.5)] flex items-center gap-2 opacity-95">
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                                        Generated in minutes
                                    </div>
                                </div>
                            </div>

                            <ul className="space-y-4 mb-8">
                                <li className="flex items-start gap-3 text-slate-300">
                                    <span className="material-symbols-outlined text-blue-500 text-xl shrink-0">check_circle</span>
                                    QR codes + sign riders + social assets
                                </li>
                                <li className="flex items-start gap-3 text-slate-300">
                                    <span className="material-symbols-outlined text-blue-500 text-xl shrink-0">check_circle</span>
                                    Open house flyer + property report
                                </li>
                                <li className="flex items-start gap-3 text-slate-300">
                                    <span className="material-symbols-outlined text-blue-500 text-xl shrink-0">check_circle</span>
                                    Co-branded with your LO partner
                                </li>
                            </ul>

                            <div className="mt-auto">
                                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-medium text-slate-400">
                                    <span className="material-symbols-outlined text-[14px]">bolt</span> Full package ready in under 5 minutes
                                </span>
                            </div>
                        </div>
                    </div>

                </div>


                {/* 3) Three Outcome Cards Underneath */}
                <div className="grid md:grid-cols-3 gap-6 mb-16">
                    {/* Capture Card */}
                    <div className="bg-slate-900/40 border border-slate-800/60 p-6 rounded-2xl hover:bg-slate-900/80 transition-colors">
                        <div className="w-12 h-12 bg-cyan-950 border border-cyan-900 rounded-xl flex items-center justify-center mb-5 shadow-inner shadow-cyan-500/20">
                            <span className="material-symbols-outlined text-cyan-400">person_add</span>
                        </div>
                        <h4 className="text-xl font-bold text-white mb-2">Capture</h4>
                        <p className="text-slate-400 text-sm leading-relaxed mb-5">
                            Every buyer question becomes a warm lead in your pipeline.
                        </p>
                        <ul className="space-y-2.5">
                            <li className="text-slate-300 text-sm flex items-start gap-2">
                                <span className="w-1 h-1 rounded-full bg-cyan-500 mt-2 shrink-0"></span> Name + phone/email captured instantly
                            </li>
                            <li className="text-slate-300 text-sm flex items-start gap-2">
                                <span className="w-1 h-1 rounded-full bg-cyan-500 mt-2 shrink-0"></span> Routed to you and your agent partner
                            </li>
                            <li className="text-slate-300 text-sm flex items-start gap-2">
                                <span className="w-1 h-1 rounded-full bg-cyan-500 mt-2 shrink-0"></span> Source tracked (link/QR/social)
                            </li>
                        </ul>
                    </div>

                    {/* Alert Card */}
                    <div className="bg-slate-900/40 border border-slate-800/60 p-6 rounded-2xl hover:bg-slate-900/80 transition-colors">
                        <div className="w-12 h-12 bg-blue-950 border border-blue-900 rounded-xl flex items-center justify-center mb-5 shadow-inner shadow-blue-500/20">
                            <span className="material-symbols-outlined text-blue-400">notifications_active</span>
                        </div>
                        <h4 className="text-xl font-bold text-white mb-2">Alert</h4>
                        <p className="text-slate-400 text-sm leading-relaxed mb-5">
                            You know the second a buyer raises their hand — before anyone else.
                        </p>
                        <ul className="space-y-2.5">
                            <li className="text-slate-300 text-sm flex items-start gap-2">
                                <span className="w-1 h-1 rounded-full bg-blue-500 mt-2 shrink-0"></span> Instant email + SMS notification
                            </li>
                            <li className="text-slate-300 text-sm flex items-start gap-2">
                                <span className="w-1 h-1 rounded-full bg-blue-500 mt-2 shrink-0"></span> Lead lands in your dashboard immediately
                            </li>
                            <li className="text-slate-300 text-sm flex items-start gap-2">
                                <span className="w-1 h-1 rounded-full bg-blue-500 mt-2 shrink-0"></span> Automated reminders keep appointments from ghosting
                            </li>
                        </ul>
                    </div>

                    {/* Convert Card */}
                    <div className="bg-slate-900/40 border border-slate-800/60 p-6 rounded-2xl hover:bg-slate-900/80 transition-colors">
                        <div className="w-12 h-12 bg-green-950 border border-green-900 rounded-xl flex items-center justify-center mb-5 shadow-inner shadow-green-500/20">
                            <span className="material-symbols-outlined text-green-400">check_circle</span>
                        </div>
                        <h4 className="text-xl font-bold text-white mb-2">Convert</h4>
                        <p className="text-slate-400 text-sm leading-relaxed mb-5">
                            Warm buyers. Stronger partnerships. A pipeline that never runs dry.
                        </p>
                        <ul className="space-y-2.5">
                            <li className="text-slate-300 text-sm flex items-start gap-2">
                                <span className="w-1 h-1 rounded-full bg-green-500 mt-2 shrink-0"></span> Lead status + full activity timeline
                            </li>
                            <li className="text-slate-300 text-sm flex items-start gap-2">
                                <span className="w-1 h-1 rounded-full bg-green-500 mt-2 shrink-0"></span> Appointments set, reminders automated
                            </li>
                            <li className="text-slate-300 text-sm flex items-start gap-2">
                                <span className="w-1 h-1 rounded-full bg-green-500 mt-2 shrink-0"></span> Buyers arrive pre-qualified and ready to move
                            </li>
                        </ul>
                    </div>
                </div>

                {/* 4) CTA Row */}
                <div className="flex flex-col items-center justify-center border-t border-slate-800/50 pt-12">
                    <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mb-4">
                        <button
                            onClick={onEnterDemoMode}
                            className="px-8 py-4 bg-transparent border border-cyan-500/50 hover:bg-cyan-500/10 text-cyan-400 font-semibold rounded-lg transition-all text-lg flex items-center justify-center gap-2"
                        >
                            See the AI Listing + Report
                        </button>
                        <button
                            onClick={onNavigateToSignUp}
                            className="px-8 py-4 bg-white text-slate-950 hover:bg-slate-200 font-bold rounded-lg transition-all text-lg flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                        >
                            Create Free Account
                        </button>
                    </div>
                    <p className="text-slate-500 text-sm font-medium">
                        Built for loan officers who win by making their partners look great.
                    </p>
                </div>

            </div>

            {/* Demo Send Modal */}
            {isDemoModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-sm bg-[#0B1121] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-800 flex items-start justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-white">Send yourself the demo</h3>
                                <p className="text-sm text-slate-400 mt-1">We'll send a live listing link — experience it as a buyer would.</p>
                            </div>
                            <button onClick={() => setIsDemoModalOpen(false)} className="text-slate-500 hover:text-slate-300 transition-colors p-1 ml-3">
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        <div className="p-6">
                            {!demoSent ? (
                                <form onSubmit={handleDemoSubmit} className="space-y-3">
                                    <input
                                        type="text"
                                        required
                                        placeholder="Your name"
                                        value={demoName}
                                        onChange={(e) => setDemoName(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-900 text-white font-medium outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all placeholder:text-slate-500"
                                    />
                                    <input
                                        type="email"
                                        required
                                        placeholder="Your email"
                                        value={demoEmail}
                                        onChange={(e) => setDemoEmail(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-900 text-white font-medium outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all placeholder:text-slate-500"
                                    />
                                    <button
                                        type="submit"
                                        className="w-full py-3.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl transition-all shadow-[0_0_16px_rgba(6,182,212,0.3)] mt-2"
                                    >
                                        Send me the link
                                    </button>
                                    <p className="text-center text-[11px] text-slate-500">No spam. No account needed. Just the demo.</p>
                                </form>
                            ) : (
                                <div className="py-6 text-center animate-in zoom-in-95 duration-300">
                                    <div className="w-14 h-14 rounded-full bg-cyan-950 border border-cyan-500 flex items-center justify-center mx-auto mb-4">
                                        <span className="material-symbols-outlined text-cyan-400 text-2xl">check</span>
                                    </div>
                                    <h4 className="text-white font-bold text-lg mb-2">There it is, {demoName.split(' ')[0]}.</h4>
                                    <p className="text-slate-400 text-sm mb-6">The live demo just opened in a new tab — that's exactly what your agents and buyers see when you send it.</p>
                                    <button
                                        onClick={() => setIsDemoModalOpen(false)}
                                        className="w-full py-3 border border-slate-700 hover:bg-slate-800 text-slate-300 font-semibold rounded-xl transition-all text-sm"
                                    >
                                        Close
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Overlay */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 leading-tight">Try it live</h3>
                                <p className="text-sm font-medium text-slate-500 mt-1">Ask a common buyer question. Watch what happens next.</p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 bg-slate-50 overflow-y-auto">
                            {/* Step 1 & AI Response */}
                            {step !== 'success' && (
                                <div className="space-y-4">
                                    <div className="flex flex-col gap-2">
                                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Pick a question</p>
                                        <button
                                            onClick={() => handleQuestionClick('Is it still available?')}
                                            disabled={!!selectedQuestion}
                                            className={`text-left px-4 py-3 rounded-xl border font-bold transition-all ${selectedQuestion === 'Is it still available?' ? 'bg-cyan-50 border-cyan-500 text-cyan-800' : 'bg-white border-slate-200 text-slate-700 hover:border-cyan-300 hover:bg-slate-50'}`}
                                        >
                                            1) Is it still available?
                                        </button>
                                        <button
                                            onClick={() => handleQuestionClick('Can I see it this weekend?')}
                                            disabled={!!selectedQuestion}
                                            className={`text-left px-4 py-3 rounded-xl border font-bold transition-all ${selectedQuestion === 'Can I see it this weekend?' ? 'bg-cyan-50 border-cyan-500 text-cyan-800' : 'bg-white border-slate-200 text-slate-700 hover:border-cyan-300 hover:bg-slate-50'}`}
                                        >
                                            2) Can I see it this weekend?
                                        </button>
                                        <button
                                            onClick={() => handleQuestionClick('Any HOA or monthly cost?')}
                                            disabled={!!selectedQuestion}
                                            className={`text-left px-4 py-3 rounded-xl border font-bold transition-all ${selectedQuestion === 'Any HOA or monthly cost?' ? 'bg-cyan-50 border-cyan-500 text-cyan-800' : 'bg-white border-slate-200 text-slate-700 hover:border-cyan-300 hover:bg-slate-50'}`}
                                        >
                                            3) Any HOA or monthly cost?
                                        </button>
                                    </div>

                                    {/* AI Answer Bubble */}
                                    {isTyping && (
                                        <div className="mt-6 flex items-center gap-2 text-slate-500 bg-white border border-slate-200 rounded-2xl rounded-tl-none p-4 max-w-[85%] animate-in fade-in zoom-in-95">
                                            <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                            <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                            <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                        </div>
                                    )}

                                    {aiAnswer && (
                                        <div className="mt-6 text-[15px] font-medium text-slate-800 leading-relaxed bg-white border border-slate-200 rounded-2xl rounded-tl-none p-4 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                                            {aiAnswer}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Step 2 Form */}
                            {step === 2 && (
                                <div className="mt-8 pt-6 border-t border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <h4 className="font-bold text-slate-900 text-lg mb-4">Want the 1-page report?</h4>
                                    <form onSubmit={handleFormSubmit} className="space-y-3">
                                        <input
                                            type="text"
                                            required
                                            placeholder="Name"
                                            value={formName}
                                            onChange={(e) => setFormName(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white font-medium text-slate-900 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all placeholder:text-slate-400"
                                        />
                                        <input
                                            type="text"
                                            required
                                            placeholder="Email or Phone"
                                            value={formContact}
                                            onChange={(e) => setFormContact(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white font-medium text-slate-900 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all placeholder:text-slate-400"
                                        />
                                        <p className="text-[11px] text-slate-500 font-medium px-1">Email alerts and SMS alerts are available.</p>

                                        <div className="pt-2 flex flex-col gap-3">
                                            <button
                                                type="submit"
                                                className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-transform active:scale-[0.98]"
                                            >
                                                Get the report
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setIsModalOpen(false)}
                                                className="w-full py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors"
                                            >
                                                Not now
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {/* Success State */}
                            {step === 'success' && (
                                <div className="py-8 text-center animate-in zoom-in-95 duration-300">
                                    <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                                        <span className="material-symbols-outlined text-3xl">check_circle</span>
                                    </div>
                                    <h4 className="text-xl font-bold text-slate-900 mb-2">Done — report link sent.</h4>
                                    <p className="text-slate-600 font-medium mb-8">Want to see a live example?</p>

                                    <div className="flex flex-col gap-3">
                                        <button
                                            onClick={() => {
                                                setIsModalOpen(false);
                                                safeNavigate(navigate, getLiveExampleUrl());
                                            }}
                                            className="w-full py-3.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl transition-all shadow-md hover:-translate-y-0.5"
                                        >
                                            See a live example
                                        </button>
                                        <button
                                            onClick={() => { setIsModalOpen(false); onNavigateToSignUp(); }}
                                            className="w-full py-3.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition-all"
                                        >
                                            Create free account
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};
