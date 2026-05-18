import React from 'react';
import { PublicHeader } from './layout/PublicHeader';
import { PublicFooter } from './layout/PublicFooter';
import { BackgroundTechIcons } from './BackgroundTechIcons';

const PrivacyPolicyPage: React.FC = () => {
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
                        <p className="text-cyan-400 font-bold tracking-widest text-sm uppercase mb-3">Legal</p>
                        <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-3 tracking-tight">Privacy Policy</h1>
                        <p className="text-slate-400 text-sm mb-10">Last updated: May 2026</p>

                        <div className="prose prose-lg prose-invert max-w-none text-slate-300 font-light leading-relaxed space-y-10">

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">1. Who We Are</h2>
                                <p>
                                    HomeListingAI ("we," "us," or "our") operates the HomeListingAI platform at homelistingai.com. We provide AI-powered listing pages, lead capture tools, and marketing systems for real estate agents, loan officers, and their partners.
                                </p>
                                <p className="mt-4">
                                    Questions? Contact us at <a href="mailto:hello@homelistingai.com" className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium">hello@homelistingai.com</a>.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">2. Information We Collect</h2>
                                <p className="mb-4 font-semibold text-white">From platform users (agents, loan officers):</p>
                                <ul className="list-disc pl-6 space-y-2 marker:text-cyan-500">
                                    <li>Name, email address, phone number at signup</li>
                                    <li>Billing information (processed by Stripe — we never store card numbers)</li>
                                    <li>Listing data, branding assets, and business information you add to the platform</li>
                                    <li>Usage data: pages visited, features used, login timestamps</li>
                                </ul>
                                <p className="mt-6 mb-4 font-semibold text-white">From buyers and leads (through listing pages):</p>
                                <ul className="list-disc pl-6 space-y-2 marker:text-cyan-500">
                                    <li>Name, email, and phone number submitted via lead capture forms</li>
                                    <li>Questions asked to the AI chatbot</li>
                                    <li>Showing request details</li>
                                    <li>Device type, IP address, and referral source for analytics</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">3. How We Use Your Information</h2>
                                <ul className="list-disc pl-6 space-y-2 marker:text-cyan-500">
                                    <li>To operate, maintain, and improve the platform</li>
                                    <li>To route buyer leads to the assigned agent and loan officer</li>
                                    <li>To send email and SMS alerts about new leads and appointments</li>
                                    <li>To process billing and manage subscriptions</li>
                                    <li>To send platform updates, product announcements, and support communications</li>
                                    <li>To comply with legal obligations</li>
                                </ul>
                                <p className="mt-4">We do <strong className="text-white">not</strong> sell your personal data to third parties. We do not use buyer lead data for our own advertising.</p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">4. SMS & Email Communications</h2>
                                <p>
                                    By providing your phone number through a HomeListingAI listing page, you consent to receive automated text messages related to that listing (showing confirmations, market reports, reminders). Standard message and data rates may apply.
                                </p>
                                <p className="mt-4">
                                    You can opt out of SMS at any time by replying <strong className="text-white">STOP</strong>. You can opt out of emails by clicking unsubscribe in any email we send. Opt-outs are processed immediately.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">5. Data Sharing</h2>
                                <p className="mb-4">We share data only in the following limited circumstances:</p>
                                <ul className="list-disc pl-6 space-y-2 marker:text-cyan-500">
                                    <li><strong className="text-white">Service providers:</strong> Supabase (database/auth), Stripe (billing), Textbelt (SMS), OpenAI (AI responses), Google (mapping/geocoding). Each is bound by their own privacy policy and our data processing agreements.</li>
                                    <li><strong className="text-white">Platform users:</strong> Buyer lead data is shared with the agent and loan officer assigned to that listing.</li>
                                    <li><strong className="text-white">Legal requirements:</strong> When required by law, court order, or to protect our rights.</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">6. Data Retention</h2>
                                <p>We retain your account data as long as your account is active. You may request deletion of your account and associated data by contacting us. Lead data associated with your listings is retained for 3 years unless you request earlier deletion.</p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">7. Your Rights</h2>
                                <p className="mb-4">Depending on your location, you may have rights to:</p>
                                <ul className="list-disc pl-6 space-y-2 marker:text-cyan-500">
                                    <li>Access the personal data we hold about you</li>
                                    <li>Correct inaccurate data</li>
                                    <li>Request deletion of your data</li>
                                    <li>Opt out of marketing communications</li>
                                    <li>Data portability (California residents — CCPA)</li>
                                </ul>
                                <p className="mt-4">To exercise any of these rights, contact us at <a href="mailto:hello@homelistingai.com" className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium">hello@homelistingai.com</a>.</p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">8. Security</h2>
                                <p>We use industry-standard security practices including encrypted data storage (Supabase/Postgres), HTTPS on all connections, and row-level security policies. No system is 100% secure — if you believe your account has been compromised, contact us immediately.</p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">9. Changes to This Policy</h2>
                                <p>We may update this policy from time to time. We'll notify registered users of material changes via email. Continued use of the platform after changes constitutes acceptance.</p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">10. Contact</h2>
                                <p>HomeListingAI — <a href="mailto:hello@homelistingai.com" className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium">hello@homelistingai.com</a></p>
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

export default PrivacyPolicyPage;
