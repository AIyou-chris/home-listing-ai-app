import React from 'react';
import { PublicHeader } from './layout/PublicHeader';
import { PublicFooter } from './layout/PublicFooter';
import { BackgroundTechIcons } from './BackgroundTechIcons';

const MarketingGuidelinesPage: React.FC = () => {
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
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-[#0B1121]/80 backdrop-blur-md p-8 sm:p-12 rounded-3xl shadow-[0_0_40px_rgba(6,182,212,0.1)] border border-cyan-900/30">
                        <p className="text-cyan-400 font-bold tracking-widest text-sm uppercase mb-3">Compliance</p>
                        <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-3 tracking-tight">Marketing Guidelines</h1>
                        <p className="text-slate-400 text-sm mb-2">For loan officers and real estate agents using HomeListingAI</p>
                        <p className="text-slate-400 text-sm mb-10">Last updated: May 2026</p>

                        {/* Intro callout */}
                        <div className="bg-cyan-950/30 border border-cyan-800/40 rounded-2xl p-6 mb-10">
                            <p className="text-cyan-100 leading-relaxed">
                                HomeListingAI makes it easy to market listings and capture leads — but with that power comes responsibility. These guidelines are here to keep you compliant with federal and state marketing laws so you can focus on closing loans and building partnerships, not fielding complaints.
                            </p>
                        </div>

                        <div className="prose prose-lg prose-invert max-w-none text-slate-300 font-light leading-relaxed space-y-10">

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">1. NMLS Disclosure Requirements</h2>
                                <div className="bg-amber-950/20 border border-amber-800/30 rounded-xl p-5 mb-5">
                                    <p className="text-amber-300 font-semibold text-sm">Required for all loan officers</p>
                                </div>
                                <p className="mb-4">
                                    If you are a licensed mortgage loan originator, federal law (S.A.F.E. Act) and most state laws require you to display your NMLS ID on all consumer-facing marketing materials — including AI listing pages, QR codes, and digital ads.
                                </p>
                                <ul className="list-disc pl-6 space-y-2 marker:text-cyan-500">
                                    <li>Your NMLS # must appear on every listing page you're co-branded on</li>
                                    <li>It must be clearly visible — not buried in fine print</li>
                                    <li>Add it in your HomeListingAI LO profile settings and it will auto-populate on all co-branded assets</li>
                                    <li>Check your state's requirements for any additional disclosure language</li>
                                </ul>
                                <p className="mt-4 text-slate-400 text-sm">Reference: <a href="https://www.nmlsconsumeraccess.org" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 transition-colors">NMLS Consumer Access</a></p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">2. SMS Marketing — TCPA Compliance</h2>
                                <div className="bg-amber-950/20 border border-amber-800/30 rounded-xl p-5 mb-5">
                                    <p className="text-amber-300 font-semibold text-sm">Federal law — violations can result in $500–$1,500 per text</p>
                                </div>
                                <p className="mb-4">The Telephone Consumer Protection Act (TCPA) governs automated text messages. HomeListingAI's lead forms include standard consent language, but here's what you need to know:</p>
                                <ul className="list-disc pl-6 space-y-3 marker:text-cyan-500">
                                    <li><strong className="text-white">Prior express written consent is required</strong> before sending automated marketing texts. Our lead capture forms collect this consent when a buyer submits their contact info.</li>
                                    <li><strong className="text-white">Only send to people who opted in.</strong> Never upload a purchased list to trigger SMS campaigns.</li>
                                    <li><strong className="text-white">Honor STOP requests immediately.</strong> Our system automatically processes STOP, QUIT, CANCEL, UNSUBSCRIBE, and END keywords.</li>
                                    <li><strong className="text-white">Transactional texts are different from marketing texts.</strong> Showing confirmations and appointment reminders are generally lower risk than promotional messages.</li>
                                    <li><strong className="text-white">Time restrictions apply.</strong> Do not send automated texts before 8 AM or after 9 PM in the recipient's local time zone.</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">3. Email Marketing — CAN-SPAM</h2>
                                <ul className="list-disc pl-6 space-y-2 marker:text-cyan-500">
                                    <li>Always identify yourself — don't use misleading "From" names or subject lines</li>
                                    <li>Include a physical mailing address in marketing emails</li>
                                    <li>Include a clear and working unsubscribe option in every marketing email</li>
                                    <li>Honor unsubscribe requests within 10 business days</li>
                                    <li>Transactional emails (showing confirmations, lead alerts to you) are exempt from most CAN-SPAM requirements</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">4. Real Estate Advertising Rules</h2>
                                <ul className="list-disc pl-6 space-y-2 marker:text-cyan-500">
                                    <li>All listing information must be accurate and not misleading</li>
                                    <li>Agent and broker license numbers may be required on advertising in your state — check your state's real estate commission rules</li>
                                    <li>Photos and property descriptions must represent the property truthfully</li>
                                    <li>Loan officers: any quoted rate, payment estimate, or APR is subject to Reg Z/Truth in Lending disclosures</li>
                                    <li>The "Est. Monthly Payment" shown on listing pages is an estimate only — make sure buyers understand it's not a loan commitment</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">5. Fair Housing</h2>
                                <div className="bg-red-950/20 border border-red-800/30 rounded-xl p-5 mb-5">
                                    <p className="text-red-300 font-semibold text-sm">Federal law — zero tolerance</p>
                                </div>
                                <p className="mb-4">
                                    HomeListingAI tools must never be used to discriminate based on race, color, religion, sex, national origin, disability, or familial status. This applies to:
                                </p>
                                <ul className="list-disc pl-6 space-y-2 marker:text-cyan-500">
                                    <li>Listing descriptions generated by AI — review all outputs before publishing</li>
                                    <li>Lead routing — all leads must be routed consistently regardless of demographic signals</li>
                                    <li>Advertising targeting — if running paid ads, do not exclude protected classes from your audience</li>
                                </ul>
                                <p className="mt-4">If you believe the AI has generated discriminatory content, do not publish it and report it to <a href="mailto:hello@homelistingai.com" className="text-cyan-400 hover:text-cyan-300 transition-colors">hello@homelistingai.com</a>.</p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">6. RESPA — No Kickbacks</h2>
                                <p>
                                    The Real Estate Settlement Procedures Act (RESPA) prohibits kickbacks and unearned referral fees between settlement service providers (real estate agents, LOs, title, etc.). HomeListingAI is a technology platform — using it to provide value to your agent partners is not a RESPA violation. However, do not condition referrals or co-marketing agreements on payment of fees outside of normal business arrangements.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">7. Social Media Use</h2>
                                <ul className="list-disc pl-6 space-y-2 marker:text-cyan-500">
                                    <li>When sharing listing links on social platforms, your NMLS # and required license disclosures must still be visible (in your bio, post caption, or on the landing page itself)</li>
                                    <li>Any rate or payment information shared on social is subject to Reg Z requirements</li>
                                    <li>Do not use HomeListingAI links in unsolicited DMs or spam campaigns</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">8. Questions?</h2>
                                <p>
                                    These guidelines are intended to help — not replace legal advice. If you have questions about your specific situation, consult your compliance officer, state licensing authority, or a qualified attorney.
                                </p>
                                <p className="mt-4">
                                    For platform-specific compliance questions: <a href="mailto:hello@homelistingai.com" className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium">hello@homelistingai.com</a>
                                </p>
                            </section>
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
