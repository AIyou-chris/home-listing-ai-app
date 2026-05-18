import React, { useState } from 'react';
import { PublicHeader } from './layout/PublicHeader';
import { PublicFooter } from './layout/PublicFooter';
import { BackgroundTechIcons } from './BackgroundTechIcons';

interface Section {
    id: string;
    label: string;
    icon: string;
    color: string;
}

const sections: Section[] = [
    { id: 'nmls', label: 'NMLS Disclosure', icon: 'badge', color: 'cyan' },
    { id: 'respa', label: 'RESPA / Co-Marketing', icon: 'handshake', color: 'cyan' },
    { id: 'regz', label: 'Reg Z / Trigger Terms', icon: 'gavel', color: 'amber' },
    { id: 'tcpa', label: 'TCPA / SMS', icon: 'sms', color: 'amber' },
    { id: 'canspam', label: 'CAN-SPAM / Email', icon: 'mark_email_read', color: 'cyan' },
    { id: 'udaap', label: 'UDAAP', icon: 'policy', color: 'cyan' },
    { id: 'fairhousing', label: 'Fair Housing / ECOA', icon: 'balance', color: 'red' },
    { id: 'states', label: 'State Rules', icon: 'map', color: 'cyan' },
    { id: 'social', label: 'Social Media', icon: 'alternate_email', color: 'cyan' },
];

const RuleBadge: React.FC<{ level: 'required' | 'warning' | 'critical' }> = ({ level }) => {
    const map = {
        required: 'bg-cyan-950/40 border-cyan-800/40 text-cyan-300',
        warning: 'bg-amber-950/30 border-amber-800/30 text-amber-300',
        critical: 'bg-red-950/30 border-red-800/30 text-red-300',
    };
    const labels = { required: 'Required', warning: 'High Risk', critical: 'Zero Tolerance' };
    return (
        <div className={`inline-block px-4 py-2 rounded-xl border text-sm font-semibold mb-5 ${map[level]}`}>
            {labels[level]}
        </div>
    );
};

const MarketingGuidelinesPage: React.FC = () => {
    const [activeSection, setActiveSection] = useState<string | null>(null);

    return (
        <div className="min-h-screen bg-[#02050D] font-sans flex flex-col relative overflow-hidden text-white">
            <PublicHeader
                onNavigateToSignUp={() => window.location.href = '/signup'}
                onNavigateToSignIn={() => window.location.href = '/signin'}
                onEnterDemoMode={() => { }}
            />

            <BackgroundTechIcons />
            <div className="absolute top-1/4 left-0 w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none -translate-x-1/2"></div>
            <div className="absolute bottom-1/4 right-0 w-[600px] h-[600px] bg-cyan-900/10 rounded-full blur-[120px] pointer-events-none translate-x-1/2"></div>

            <main className="flex-grow py-24 sm:py-32 relative z-10 w-full">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

                    {/* Header */}
                    <div className="mb-12">
                        <p className="text-cyan-400 font-bold tracking-widest text-sm uppercase mb-3">Compliance</p>
                        <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-3 tracking-tight">LO Marketing Guidelines</h1>
                        <p className="text-slate-400 text-sm mb-2">Federal rules for mortgage loan originators using digital marketing tools</p>
                        <p className="text-slate-500 text-xs">Last updated: May 2026 · Based on current federal regulatory text and agency guidance</p>
                    </div>

                    {/* Intro callout */}
                    <div className="bg-cyan-950/30 border border-cyan-800/40 rounded-2xl p-6 mb-10">
                        <p className="text-cyan-100 leading-relaxed text-sm">
                            HomeListingAI makes it easy to market listings and capture leads — but with that power comes responsibility. These guidelines cover the federal rules that apply to every LO using any digital marketing tool, including this one. Read them. Know them. They exist to protect you, your license, and your borrowers.
                        </p>
                    </div>

                    {/* Jump Nav */}
                    <div className="flex flex-wrap gap-2 mb-14">
                        {sections.map((s) => (
                            <a
                                key={s.id}
                                href={`#${s.id}`}
                                onClick={() => setActiveSection(s.id)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${activeSection === s.id ? 'bg-cyan-900/50 border-cyan-600 text-cyan-300' : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200'}`}
                            >
                                <span className="material-symbols-outlined text-[13px]">{s.icon}</span>
                                {s.label}
                            </a>
                        ))}
                    </div>

                    <div className="space-y-16">

                        {/* 1. NMLS */}
                        <section id="nmls" className="bg-[#0B1121]/80 backdrop-blur-md p-8 sm:p-10 rounded-3xl border border-slate-800">
                            <div className="flex items-start gap-4 mb-6">
                                <div className="w-11 h-11 rounded-xl bg-cyan-950 border border-cyan-800/50 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-cyan-400">badge</span>
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">S.A.F.E. Act — 12 U.S.C. § 5104</p>
                                    <h2 className="text-2xl font-bold text-white">1. NMLS Disclosure</h2>
                                </div>
                            </div>
                            <RuleBadge level="required" />
                            <p className="text-slate-300 leading-relaxed mb-5">
                                The S.A.F.E. Act requires every licensed MLO to display their unique NMLS identifier on <strong className="text-white">all consumer-facing solicitations and advertising materials</strong> — including websites, social media profiles, social posts, email signatures, business cards, flyers, listing pages, and QR codes. Statutory language: 12 U.S.C. § 5104(a)(2).
                            </p>
                            <ul className="space-y-3 text-slate-300 text-sm mb-5">
                                {[
                                    'Your NMLS # must appear on every ad, digital or print — period.',
                                    'Display it alongside your licensed name: "Jane Smith, NMLS #123456"',
                                    'It must be clearly visible — no smaller than the smallest font in the ad, not obscured by graphics or shading.',
                                    'Must be provided to consumers on request and in your initial written communication.',
                                    'HomeListingAI auto-appends your NMLS # to all co-branded listing pages when added to your LO profile.',
                                ].map((item, i) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <span className="material-symbols-outlined text-cyan-500 text-base shrink-0 mt-0.5">check</span>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-xs text-slate-400">
                                <strong className="text-slate-300">State variance:</strong> Virginia requires the label "NMLS ID #" and the NMLS Consumer Access URL. California requires the broker's identity alongside. Texas (updated Nov 2024) prohibits graphics that obscure the company name and NMLS ID. Verify your state's rules.
                            </div>
                        </section>

                        {/* 2. RESPA */}
                        <section id="respa" className="bg-[#0B1121]/80 backdrop-blur-md p-8 sm:p-10 rounded-3xl border border-slate-800">
                            <div className="flex items-start gap-4 mb-6">
                                <div className="w-11 h-11 rounded-xl bg-cyan-950 border border-cyan-800/50 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-cyan-400">handshake</span>
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">RESPA Section 8 — 12 U.S.C. § 2607 · Regulation X</p>
                                    <h2 className="text-2xl font-bold text-white">2. RESPA & Co-Marketing with Agents</h2>
                                </div>
                            </div>
                            <RuleBadge level="required" />
                            <p className="text-slate-300 leading-relaxed mb-5">
                                RESPA Section 8 prohibits giving or receiving a "fee, kickback, or thing of value" in exchange for the referral of settlement service business. Co-branded marketing with real estate agents is <strong className="text-white">not automatically a violation</strong> — but it must be structured correctly.
                            </p>
                            <div className="grid sm:grid-cols-2 gap-4 mb-5">
                                <div className="bg-green-950/20 border border-green-900/30 rounded-xl p-4">
                                    <p className="text-green-400 font-bold text-sm mb-3">Allowed</p>
                                    <ul className="space-y-2 text-slate-300 text-sm">
                                        <li className="flex gap-2"><span className="text-green-500">✓</span> Paying fair market value for documented marketing services</li>
                                        <li className="flex gap-2"><span className="text-green-500">✓</span> Co-branded listing pages at no charge as a value-add tool</li>
                                        <li className="flex gap-2"><span className="text-green-500">✓</span> Splitting costs for joint ads where both parties benefit</li>
                                        <li className="flex gap-2"><span className="text-green-500">✓</span> Providing technology access if there's no referral quid pro quo</li>
                                    </ul>
                                </div>
                                <div className="bg-red-950/20 border border-red-900/30 rounded-xl p-4">
                                    <p className="text-red-400 font-bold text-sm mb-3">Not Allowed</p>
                                    <ul className="space-y-2 text-slate-300 text-sm">
                                        <li className="flex gap-2"><span className="text-red-500">✗</span> Paying for agent "marketing" where the real value is referrals</li>
                                        <li className="flex gap-2"><span className="text-red-500">✗</span> Gifts, tickets, dinners tied to referral expectations</li>
                                        <li className="flex gap-2"><span className="text-red-500">✗</span> Paying to speak at brokerage meetings in exchange for leads</li>
                                        <li className="flex gap-2"><span className="text-red-500">✗</span> Any arrangement where the fee exceeds the value of services</li>
                                    </ul>
                                </div>
                            </div>
                            <div className="bg-amber-950/20 border border-amber-800/30 rounded-xl p-4 text-xs text-slate-400">
                                <strong className="text-amber-300">2023 enforcement note:</strong> The CFPB's first RESPA enforcement actions since 2017 targeted LOs presenting at internal brokerage meetings and running direct mail campaigns directed at agents — not consumers. Document all co-marketing arrangements in writing at verifiable fair-market value.
                            </div>
                        </section>

                        {/* 3. Reg Z */}
                        <section id="regz" className="bg-[#0B1121]/80 backdrop-blur-md p-8 sm:p-10 rounded-3xl border border-amber-900/20">
                            <div className="flex items-start gap-4 mb-6">
                                <div className="w-11 h-11 rounded-xl bg-amber-950/40 border border-amber-800/30 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-amber-400">gavel</span>
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">TILA / Regulation Z — 12 C.F.R. § 1026.24</p>
                                    <h2 className="text-2xl font-bold text-white">3. Regulation Z — Trigger Terms</h2>
                                </div>
                            </div>
                            <RuleBadge level="warning" />
                            <p className="text-slate-300 leading-relaxed mb-5">
                                Regulation Z prohibits misleading mortgage advertising and establishes a <strong className="text-white">"trigger term" framework</strong>: use certain specific terms in an ad and you must include full loan cost disclosures in that same ad.
                            </p>
                            <div className="bg-amber-950/20 border border-amber-800/30 rounded-xl p-5 mb-5">
                                <p className="text-amber-300 font-bold text-sm mb-3">Trigger terms — if you use any of these, full disclosure is required:</p>
                                <ul className="space-y-2 text-slate-300 text-sm">
                                    {[
                                        'Amount or percentage of any down payment (e.g., "5% down," "$15,000 down")',
                                        'Number of payments or repayment period (e.g., "30-year loan," "360 payments")',
                                        'Amount of any payment (e.g., "payments as low as $1,299/month")',
                                        'Amount of any finance charge (e.g., "less than $500 in fees")',
                                        'Negative trigger terms: "no closing costs," "no points," "no down payment"',
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <span className="text-amber-500 shrink-0">⚡</span>{item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <p className="text-slate-300 text-sm mb-3"><strong className="text-white">When triggered, you must disclose:</strong> required down payment, repayment terms, APR (using that term), and whether the APR can increase after consummation.</p>
                            <p className="text-slate-300 text-sm mb-5"><strong className="text-white">Generally safe (non-triggering):</strong> "Low rates available," "Call for details," "Get pre-approved today," and general branding without specific loan terms.</p>
                            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-xs text-slate-400">
                                <strong className="text-slate-300">Digital + social media:</strong> All disclosures must be in the same post or on a page directly accessible via a link — not buried two clicks away. The "clear and conspicuous" standard applies; a 6-point gray footer is not compliant.
                            </div>
                        </section>

                        {/* 4. TCPA */}
                        <section id="tcpa" className="bg-[#0B1121]/80 backdrop-blur-md p-8 sm:p-10 rounded-3xl border border-amber-900/20">
                            <div className="flex items-start gap-4 mb-6">
                                <div className="w-11 h-11 rounded-xl bg-amber-950/40 border border-amber-800/30 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-amber-400">sms</span>
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">TCPA — 47 U.S.C. § 227 · $500–$1,500 per text</p>
                                    <h2 className="text-2xl font-bold text-white">4. TCPA — SMS & Phone Marketing</h2>
                                </div>
                            </div>
                            <RuleBadge level="warning" />
                            <p className="text-slate-300 leading-relaxed mb-5">
                                To send marketing texts using an auto-dialer, you must have <strong className="text-white">prior express written consent (PEWC)</strong> from that specific consumer, for your specific company. Penalties are $500–$1,500 per text with no cap — class actions are common in the mortgage industry.
                            </p>
                            <ul className="space-y-3 text-slate-300 text-sm mb-6">
                                {[
                                    'Consumer must affirmatively agree in writing (e-signature counts) to receive texts from you specifically — not a third party.',
                                    'Consent cannot be a condition of receiving a service.',
                                    'Never send marketing texts to purchased lists — no PEWC, no text.',
                                    'Timing: no marketing texts before 8 AM or after 9 PM in the recipient\'s local time zone.',
                                ].map((item, i) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <span className="material-symbols-outlined text-amber-500 text-base shrink-0 mt-0.5">warning</span>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-sm text-slate-400 mb-4">
                                <strong className="text-slate-300">Opt-out rules (effective April 11, 2025):</strong> Honor opt-outs through "any reasonable means" — not just STOP replies. Process within 10 business days. One confirmation text is allowed (no promo content, within 5 minutes). Retain opt-out records for 4 years.
                            </div>
                            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-xs text-slate-400">
                                <strong className="text-slate-300">FCC one-to-one rule update (2025–2026):</strong> The FCC adopted a stricter "one-to-one" consent rule in Dec 2023, but the 11th Circuit vacated it in 2025. The pre-existing PEWC standard applies as of mid-2026. Monitor this — the FCC may revisit it.
                            </div>
                        </section>

                        {/* 5. CAN-SPAM */}
                        <section id="canspam" className="bg-[#0B1121]/80 backdrop-blur-md p-8 sm:p-10 rounded-3xl border border-slate-800">
                            <div className="flex items-start gap-4 mb-6">
                                <div className="w-11 h-11 rounded-xl bg-cyan-950 border border-cyan-800/50 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-cyan-400">mark_email_read</span>
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">CAN-SPAM Act — 15 U.S.C. § 7701 · up to $53,088/email</p>
                                    <h2 className="text-2xl font-bold text-white">5. CAN-SPAM — Email Marketing</h2>
                                </div>
                            </div>
                            <RuleBadge level="required" />
                            <p className="text-slate-300 text-sm leading-relaxed mb-5">Seven core requirements for every commercial email:</p>
                            <ol className="space-y-3 text-slate-300 text-sm mb-5">
                                {[
                                    'No false or misleading header info — "From," "To," and "Reply-To" must accurately identify the sender.',
                                    'No deceptive subject lines — "You\'re pre-approved!" when you\'re not is a violation.',
                                    'Identify the message as an advertisement clearly and conspicuously.',
                                    'Include a valid physical postal address (P.O. box acceptable).',
                                    'Include a clear, working opt-out mechanism in every email.',
                                    'Honor opt-out requests within 10 business days — no fee, no extra info required.',
                                    'You are responsible for third-party senders acting on your behalf.',
                                ].map((item, i) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <span className="text-cyan-500 font-bold shrink-0">{i + 1}.</span>
                                        {item}
                                    </li>
                                ))}
                            </ol>
                            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-xs text-slate-400">
                                <strong className="text-slate-300">Important:</strong> Any email that includes specific rates, payments, or loan terms is also subject to Regulation Z disclosures. CAN-SPAM and Reg Z compliance are required simultaneously.
                            </div>
                        </section>

                        {/* 6. UDAAP */}
                        <section id="udaap" className="bg-[#0B1121]/80 backdrop-blur-md p-8 sm:p-10 rounded-3xl border border-slate-800">
                            <div className="flex items-start gap-4 mb-6">
                                <div className="w-11 h-11 rounded-xl bg-cyan-950 border border-cyan-800/50 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-cyan-400">policy</span>
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Dodd-Frank — 12 U.S.C. § 5531 · CFPB enforcement</p>
                                    <h2 className="text-2xl font-bold text-white">6. UDAAP — Unfair, Deceptive & Abusive Acts</h2>
                                </div>
                            </div>
                            <RuleBadge level="required" />
                            <p className="text-slate-300 text-sm leading-relaxed mb-5">The CFPB can pursue UDAAP violations in any consumer-facing mortgage marketing. A simple rule: if you wouldn't be comfortable showing the ad to a CFPB examiner, don't publish it.</p>
                            <div className="bg-red-950/20 border border-red-900/30 rounded-xl p-5 mb-5">
                                <p className="text-red-300 font-bold text-sm mb-3">What the CFPB specifically looks for in mortgage marketing:</p>
                                <ul className="space-y-2 text-slate-300 text-sm">
                                    {[
                                        'Advertising rates that are not generally available to the consumer being targeted',
                                        'Using "pre-approved" for consumers who haven\'t actually been pre-approved',
                                        '"No closing costs" or "no fees" when costs are embedded in the rate',
                                        'Performance guarantees you can\'t actually deliver ("close in 10 days or we pay")',
                                        'Implying government affiliation ("this is a government program") for private products',
                                        'Bait-and-switch: advertising one rate and delivering materially different terms',
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <span className="text-red-500 shrink-0">✗</span>{item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <p className="text-slate-400 text-sm">The current CFPB administration (2025–2026) has stated a preference for focusing on "actual fraud" with identifiable consumer harm — but deceptive advertising in mortgage marketing remains a stated priority.</p>
                        </section>

                        {/* 7. Fair Housing */}
                        <section id="fairhousing" className="bg-[#0B1121]/80 backdrop-blur-md p-8 sm:p-10 rounded-3xl border border-red-900/30">
                            <div className="flex items-start gap-4 mb-6">
                                <div className="w-11 h-11 rounded-xl bg-red-950/40 border border-red-800/30 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-red-400">balance</span>
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Fair Housing Act — 42 U.S.C. § 3604 · ECOA — 15 U.S.C. § 1691</p>
                                    <h2 className="text-2xl font-bold text-white">7. Fair Housing & ECOA</h2>
                                </div>
                            </div>
                            <RuleBadge level="critical" />
                            <p className="text-slate-300 text-sm leading-relaxed mb-5">
                                The Fair Housing Act and ECOA prohibit discriminatory advertising based on race, color, national origin, religion, sex, familial status, disability, marital status, or age. The "reasonable person" standard applies — if an ordinary reader would perceive a discriminatory preference, it's a violation — even without intent.
                            </p>
                            <div className="bg-red-950/20 border border-red-900/30 rounded-xl p-5 mb-5">
                                <p className="text-red-300 font-bold text-sm mb-3">Prohibited in advertising:</p>
                                <ul className="space-y-2 text-slate-300 text-sm">
                                    {[
                                        'Using words, symbols, or images that suggest a discriminatory preference — even unintentionally',
                                        'Coded language acting as a proxy for protected characteristics ("perfect for young professionals")',
                                        'Advertising only in media that excludes a racial or ethnic group (advertising redlining)',
                                        'Digital targeting that excludes protected classes — including geographic exclusions that map to race',
                                        'Lookalike audiences built from a seed audience of predominantly one protected class',
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <span className="text-red-500 shrink-0">✗</span>{item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-xs text-slate-400 mb-3">
                                <strong className="text-slate-300">HUD 2024 digital advertising guidance (FHEO-2024-01):</strong> HUD formally confirmed the Fair Housing Act applies fully to algorithmic ad delivery. Algorithmic systems that produce discriminatory outcomes — even without discriminatory intent — can constitute a violation. This applies directly to Meta, Google, and any programmatic ad platform.
                            </div>
                            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-xs text-slate-400">
                                <strong className="text-slate-300">Equal Housing Opportunity logo:</strong> The EHO logo or statement is expected on all mortgage advertising, websites, and social media profiles. HUD guidelines specify logo size requirements based on ad size.
                            </div>
                        </section>

                        {/* 8. State Rules */}
                        <section id="states" className="bg-[#0B1121]/80 backdrop-blur-md p-8 sm:p-10 rounded-3xl border border-slate-800">
                            <div className="flex items-start gap-4 mb-6">
                                <div className="w-11 h-11 rounded-xl bg-cyan-950 border border-cyan-800/50 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-cyan-400">map</span>
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">State mortgage licensing laws · Varies by state</p>
                                    <h2 className="text-2xl font-bold text-white">8. State-Level Advertising Rules</h2>
                                </div>
                            </div>
                            <RuleBadge level="required" />
                            <p className="text-slate-300 text-sm leading-relaxed mb-5">No single federal rule governs state advertising specifics — each state's mortgage licensing law adds its own requirements. The following are near-universal:</p>
                            <div className="overflow-x-auto mb-5">
                                <table className="w-full text-sm text-slate-300">
                                    <thead>
                                        <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wider">
                                            <th className="text-left py-3 pr-4">Requirement</th>
                                            <th className="text-left py-3">Near-Universal?</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-900">
                                        {[
                                            ['NMLS # in all ads', 'Yes — all states (S.A.F.E. Act + state implementation)'],
                                            ['Licensed company name in all ads', 'Yes — cannot advertise under DBA without licensed entity name'],
                                            ['No false/misleading claims', 'Yes — mirrors federal UDAAP'],
                                            ['Equal Housing Opportunity logo or statement', 'Near-universal — some states mandate explicitly'],
                                            ['"Licensed by [State Dept]" disclosure', 'Many states — verify yours'],
                                        ].map(([req, note], i) => (
                                            <tr key={i}>
                                                <td className="py-3 pr-4 font-medium text-white">{req}</td>
                                                <td className="py-3 text-slate-400 text-xs">{note}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-xs text-slate-400">
                                <strong className="text-slate-300">Examples:</strong> California requires broker identity alongside license number. Texas (2024) prohibits graphics obscuring company name/NMLS ID; team names must use "[Team Name] powered by [Company Name, NMLS ID]." Virginia requires "NMLS ID #" label and nmlsconsumeraccess.org URL. Verify rules for every state where you are licensed.
                            </div>
                        </section>

                        {/* 9. Social Media */}
                        <section id="social" className="bg-[#0B1121]/80 backdrop-blur-md p-8 sm:p-10 rounded-3xl border border-slate-800">
                            <div className="flex items-start gap-4 mb-6">
                                <div className="w-11 h-11 rounded-xl bg-cyan-950 border border-cyan-800/50 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-cyan-400">alternate_email</span>
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">FFIEC Social Media Guidance (Dec 2013) · All rules apply</p>
                                    <h2 className="text-2xl font-bold text-white">9. Social Media</h2>
                                </div>
                            </div>
                            <RuleBadge level="required" />
                            <p className="text-slate-300 text-sm leading-relaxed mb-5">
                                <strong className="text-white">Social media is not a different regulatory environment.</strong> The FFIEC's guidance (endorsed by the CFPB and all federal banking regulators) makes clear: every consumer protection law — TILA/Reg Z, RESPA, Fair Housing, ECOA, UDAAP, TCPA — applies in full to every social platform.
                            </p>
                            <ul className="space-y-3 text-slate-300 text-sm mb-5">
                                {[
                                    'If a social post includes a trigger term, required disclosures must appear in the same post or on an immediately accessible linked page — not two clicks away.',
                                    'EHO logo or statement must appear on your Facebook, Instagram, and LinkedIn profiles.',
                                    'Paid or incentivized testimonials must be disclosed (FTC 16 C.F.R. Part 255). User reviews you endorse or adopt are attributed to you.',
                                    'Any LO co-marketing arrangement via an agent\'s social profile must be documented at fair market value with a written MSA.',
                                    'Personal social accounts used for mortgage marketing are treated as institutional advertising — they are not exempt from Regulation Z or other rules.',
                                ].map((item, i) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <span className="material-symbols-outlined text-cyan-500 text-base shrink-0 mt-0.5">check</span>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </section>

                        {/* Quick Reference Table */}
                        <section className="bg-[#0B1121]/80 backdrop-blur-md p-8 sm:p-10 rounded-3xl border border-slate-800">
                            <h2 className="text-2xl font-bold text-white mb-6">Quick Reference: What Triggers What</h2>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wider">
                                            <th className="text-left py-3 pr-4 w-1/2">If your content includes…</th>
                                            <th className="text-left py-3 pr-4">Rule triggered</th>
                                            <th className="text-left py-3">Action required</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-900 text-slate-300">
                                        {[
                                            ['Specific rate or APR', 'Reg Z', 'Display APR prominently; disclose if it can increase'],
                                            ['Specific payment or down payment amount', 'Reg Z', 'Full trigger-term disclosures required'],
                                            ['"No closing costs" / "No down payment"', 'Reg Z', 'Full trigger-term disclosures required'],
                                            ['Any consumer-facing content', 'S.A.F.E. Act', 'Display your NMLS # clearly'],
                                            ['Co-marketing with a real estate agent', 'RESPA § 8', 'Document services; verify fair market value; no referral quid pro quo'],
                                            ['Commercial email', 'CAN-SPAM', 'Physical address, opt-out link, honest subject/sender'],
                                            ['SMS to a consumer', 'TCPA', 'Prior express written consent, opt-out mechanism, 8am–9pm only'],
                                            ['Any rate, speed, or approval claim', 'UDAAP', 'Must be accurate, documented, and not misleading'],
                                            ['Digital ad or social post', 'Fair Housing / ECOA', 'No discriminatory targeting; EHO logo on profiles'],
                                        ].map(([content, rule, action], i) => (
                                            <tr key={i}>
                                                <td className="py-3 pr-4 text-white">{content}</td>
                                                <td className="py-3 pr-4 text-cyan-400 font-medium whitespace-nowrap">{rule}</td>
                                                <td className="py-3 text-slate-400">{action}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        {/* Disclaimer */}
                        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 text-slate-500 text-xs leading-relaxed">
                            <strong className="text-slate-300">Disclaimer:</strong> This guide summarizes federal rules as of May 2026 based on publicly available regulatory text, agency guidance, and enforcement records. It does not constitute legal advice. Laws and agency interpretations change — always verify current rule text and consult a qualified compliance attorney or compliance officer for your specific situation. State rules vary and must be verified for each state of licensure.
                            <br /><br />
                            Questions? <a href="mailto:hello@homelistingai.com" className="text-cyan-400 hover:text-cyan-300 transition-colors">hello@homelistingai.com</a>
                        </div>

                    </div>
                </div>
            </main>

            <div className="mt-auto relative z-10">
                <PublicFooter />
            </div>
        </div>
    );
};

export default MarketingGuidelinesPage;
