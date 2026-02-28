import React, { useRef, useState, useEffect } from 'react';
import { BackgroundTechIcons } from './BackgroundTechIcons';

interface ProofSectionProps {
    onNavigateToSignUp: () => void;
    onEnterDemoMode: () => void;
}

const credibilityChips = [
    "Windermere",
    "John L. Scott",
    "RE/MAX",
    "Century 21",
    "Major credit unions & banks"
];

const useCaseTiles = [
    {
        title: "Open House QR",
        icon: "meeting_room",
        microcopy: "Capture every walk-in. No clipboards."
    },
    {
        title: "Yard Sign QR",
        icon: "real_estate_agent",
        microcopy: "Scans turn into leads—even after hours."
    },
    {
        title: "Instagram / TikTok",
        icon: "alternate_email",
        microcopy: "Link in bio → AI Listing + report request."
    },
    {
        title: "Follow-up Link",
        icon: "connect_without_contact",
        microcopy: "Send the report. Keep the thread alive."
    }
];

const testimonials = [
    {
        quote: "This is the first tool I've used that actually turns listing interest into a clean next step.",
        tag: "Follow-up",
        outcomes: ["Leads routed into one inbox", "Faster response with less chaos"],
        name: "Michael Mallagh",
        isAnonymous: false
    },
    {
        quote: "We dropped the QR at the open house and stopped losing walk-ins.",
        tag: "Open House QR",
        outcomes: ["More leads captured on-site", "Cleaner follow-up after"],
        name: "Arthur Amot",
        isAnonymous: false
    },
    {
        quote: "The one-page report is an instant credibility boost in listing conversations.",
        tag: "Listing Appointment",
        outcomes: ["Sharper pricing conversations", "Clients love the summary"],
        name: "Sean D. Cresap",
        isAnonymous: false
    },
    {
        quote: "It's simple enough to launch in minutes—and the link works everywhere.",
        tag: "Speed",
        outcomes: ["Faster setup", "Consistent execution"],
        name: "Carrie Grahm",
        isAnonymous: false
    },
    {
        quote: "The yard sign QR brought in after-hours leads I would've missed.",
        tag: "Yard Sign QR",
        outcomes: ["More after-hours inquiries", "Better lead capture"],
        name: "Jane Frank",
        isAnonymous: false
    },
    {
        quote: "We used it on social and the conversations got higher quality immediately.",
        tag: "Social",
        outcomes: ["More engaged inquiries", "Better quality leads"],
        name: "Francis M McLovin (just to see if you're paying attention)",
        isAnonymous: false
    }
];

export const ProofSectionNew: React.FC<ProofSectionProps> = ({ onNavigateToSignUp, onEnterDemoMode }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_activeIndex, setActiveIndex] = useState(0);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_isAtStart, setIsAtStart] = useState(true);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_isAtEnd, setIsAtEnd] = useState(false);

    const handleScroll = () => {
        if (!scrollRef.current) return;

        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        setIsAtStart(scrollLeft <= 10);
        setIsAtEnd(scrollLeft >= scrollWidth - clientWidth - 10);

        // Calculate active dot based on scroll position
        const cardWidth = scrollRef.current.firstElementChild?.clientWidth || 0;
        if (cardWidth > 0) {
            const index = Math.round(scrollLeft / cardWidth);
            setActiveIndex(index);
        }
    };

    useEffect(() => {
        const currentRef = scrollRef.current;
        if (currentRef) {
            currentRef.addEventListener('scroll', handleScroll);
            return () => currentRef.removeEventListener('scroll', handleScroll);
        }
    }, []);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _scrollToIndex = (index: number) => {
        if (!scrollRef.current) return;
        const cardElement = scrollRef.current.children[index] as HTMLElement;
        if (cardElement) {
            scrollRef.current.scrollTo({
                left: cardElement.offsetLeft - scrollRef.current.offsetLeft,
                behavior: 'smooth'
            });
            setActiveIndex(index);
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _scrollNext = () => {
        if (!scrollRef.current) return;
        const { scrollLeft, clientWidth } = scrollRef.current;
        scrollRef.current.scrollTo({
            left: scrollLeft + clientWidth,
            behavior: 'smooth'
        });
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _scrollPrev = () => {
        if (!scrollRef.current) return;
        const { scrollLeft, clientWidth } = scrollRef.current;
        scrollRef.current.scrollTo({
            left: Math.max(0, scrollLeft - clientWidth),
            behavior: 'smooth'
        });
    };

    return (
        <section className="relative py-24 lg:py-32 bg-[#060B19] overflow-hidden border-t border-slate-900/60">
            {/* Ambient Lighting */}
            <BackgroundTechIcons />
            <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-cyan-900/5 rounded-full blur-[120px] pointer-events-none -translate-y-1/2"></div>
            <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[700px] bg-blue-900/5 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">

                {/* A) Header Section */}
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <p className="text-cyan-400 font-bold tracking-widest text-sm uppercase mb-3">REAL-WORLD PROOF</p>
                    <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-6">
                        Where HomeListingAI prints leads.
                    </h2>
                    <p className="text-lg md:text-xl text-slate-300 font-light leading-relaxed">
                        Built for how agents actually work—open houses, sign riders, and social. Used by agents at major brokerages and financial institutions.
                    </p>
                </div>

                {/* B) Credibility Strip */}
                <div className="flex flex-col items-center mb-20">
                    <p className="text-slate-500 text-sm font-semibold uppercase tracking-widest mb-4">Worked with teams at:</p>
                    <div className="flex flex-wrap justify-center gap-3">
                        {credibilityChips.map((chip, idx) => (
                            <div key={idx} className="px-5 py-2 bg-slate-900/50 border border-slate-800 rounded-full text-slate-300 text-sm font-medium">
                                {chip}
                            </div>
                        ))}
                    </div>
                </div>

                {/* C) Use Case Tiles */}
                <div className="mb-20">
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto mb-6">
                        {useCaseTiles.map((tile, idx) => (
                            <div key={idx} className="bg-[#0B1121]/80 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 transition-colors hover:border-slate-600 flex flex-col items-start h-full">
                                <span className="material-symbols-outlined text-cyan-400 text-3xl mb-4 p-3 bg-cyan-950/30 rounded-xl">{tile.icon}</span>
                                <h4 className="text-white font-bold text-lg mb-2">{tile.title}</h4>
                                <p className="text-slate-400 text-sm leading-relaxed">{tile.microcopy}</p>
                            </div>
                        ))}
                    </div>
                    <p className="text-center text-slate-500 text-sm italic">
                        Every placement routes back to one AI Listing link.
                    </p>
                </div>

                {/* D) Testimonial Carousel */}
                <div className="relative max-w-[100vw] overflow-hidden mb-20">

                    {/* Fade Masks */}
                    <div className="absolute inset-y-0 left-0 w-16 md:w-32 bg-gradient-to-r from-[#060B19] to-transparent z-10 pointer-events-none"></div>
                    <div className="absolute inset-y-0 right-0 w-16 md:w-32 bg-gradient-to-l from-[#060B19] to-transparent z-10 pointer-events-none"></div>

                    {/* Auto-scrolling Marquee Container */}
                    <div className="flex w-max animate-marquee pb-4 pt-4">
                        {[...testimonials, ...testimonials, ...testimonials].map((test, idx) => (
                            <div
                                key={idx}
                                className="shrink-0 w-[85vw] sm:w-[350px] lg:w-[400px] flex flex-col bg-gradient-to-b from-[#0F172A] to-[#0B1121] border border-cyan-900/30 rounded-3xl p-8 shadow-[0_0_20px_rgba(6,182,212,0.05)] hover:shadow-[0_0_30px_rgba(6,182,212,0.1)] transition-all h-auto mx-3"
                            >
                                <div className="mb-6">
                                    <span className="inline-block px-3 py-1 bg-blue-900/20 text-blue-400 border border-blue-900/50 rounded-full text-xs font-semibold uppercase tracking-wider mb-4">
                                        {test.tag}
                                    </span>
                                    <p className="text-white text-lg font-medium leading-relaxed mb-6">
                                        "{test.quote}"
                                    </p>
                                    <ul className="space-y-2 mb-6">
                                        {test.outcomes.map((outcome, oIdx) => (
                                            <li key={oIdx} className="flex items-start gap-2 text-sm text-slate-300">
                                                <span className="material-symbols-outlined text-cyan-500 text-base shrink-0">check</span>
                                                {outcome}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="mt-auto pt-6 border-t border-slate-800/80">
                                    <p className="text-white font-semibold flex items-baseline gap-2">
                                        {test.name}
                                        {test.isAnonymous && <span className="text-slate-500 font-normal text-xs">(Client example)</span>}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* E) CTA Row */}
                <div className="flex flex-col items-center justify-center pt-10 border-t border-slate-900">
                    <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mb-4">
                        <button
                            onClick={onEnterDemoMode}
                            className="w-full sm:w-auto px-10 py-4 bg-transparent border border-cyan-500/50 hover:bg-cyan-500/10 text-cyan-400 font-semibold rounded-lg transition-all text-lg flex items-center justify-center gap-2"
                        >
                            See a Live Example
                        </button>
                        <button
                            onClick={onNavigateToSignUp}
                            className="w-full sm:w-auto px-10 py-4 bg-white text-slate-950 hover:bg-slate-200 font-bold rounded-lg transition-all text-lg flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                        >
                            Start Free Trial
                        </button>
                    </div>
                    <p className="text-slate-500 text-sm font-medium">
                        No credit card required to start.
                    </p>
                </div>

            </div>
        </section>
    );
};
