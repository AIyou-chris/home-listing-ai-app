import React from 'react';
import { PublicHeader } from './layout/PublicHeader';
import { PublicFooter } from './layout/PublicFooter';
import { BackgroundTechIcons } from './BackgroundTechIcons';

const TermsOfServicePage: React.FC = () => {
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
                        <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-3 tracking-tight">Terms of Service</h1>
                        <p className="text-slate-400 text-sm mb-10">Last updated: May 2026</p>

                        <div className="prose prose-lg prose-invert max-w-none text-slate-300 font-light leading-relaxed space-y-10">

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">1. Agreement</h2>
                                <p>
                                    By creating an account or using HomeListingAI ("the Platform"), you agree to these Terms of Service. If you don't agree, don't use the platform. These terms apply to all users — agents, loan officers, office/branch accounts, and any admin users.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">2. What We Provide</h2>
                                <p>HomeListingAI provides:</p>
                                <ul className="list-disc pl-6 mt-4 space-y-2 marker:text-cyan-500">
                                    <li>AI-powered listing pages with buyer chatbot functionality</li>
                                    <li>Lead capture, routing, and inbox management</li>
                                    <li>QR code and marketing kit generation</li>
                                    <li>Automated email and SMS lead follow-up</li>
                                    <li>Market report generation</li>
                                    <li>Agent-LO partnership tools and co-branding</li>
                                    <li>Office/branch oversight dashboards (Office tier)</li>
                                </ul>
                                <p className="mt-4">We reserve the right to modify, suspend, or discontinue features with reasonable notice.</p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">3. Your Responsibilities</h2>
                                <p className="mb-4">You agree to:</p>
                                <ul className="list-disc pl-6 space-y-2 marker:text-cyan-500">
                                    <li>Provide accurate listing and business information</li>
                                    <li>Comply with all applicable real estate advertising laws in your state</li>
                                    <li>Comply with TCPA when using SMS features (see <a href="/marketing-guidelines" className="text-cyan-400 hover:text-cyan-300 transition-colors">Marketing Guidelines</a>)</li>
                                    <li>Display required NMLS disclosures if you are a licensed loan officer</li>
                                    <li>Not use the platform for discriminatory housing practices</li>
                                    <li>Not share login credentials or allow unauthorized access to your account</li>
                                    <li>Not scrape, reverse engineer, or resell platform data or features</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">4. Plans, Billing & Cancellation</h2>
                                <ul className="list-disc pl-6 space-y-2 marker:text-cyan-500">
                                    <li>Subscriptions are billed monthly. No annual lock-in.</li>
                                    <li>You may cancel at any time. Access continues through the end of your billing period.</li>
                                    <li>Overage charges apply per listing beyond your plan's included limit (see pricing page for rates).</li>
                                    <li>We do not offer prorated refunds for partial months, except where required by law.</li>
                                    <li>We reserve the right to change pricing with 30 days' notice to active subscribers.</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">5. Intellectual Property</h2>
                                <p>You retain ownership of listing content, photos, and data you upload. You grant HomeListingAI a limited license to host, display, and process that content to operate the platform. We retain all rights to the platform, AI models, UI, and underlying technology.</p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">6. AI-Generated Content</h2>
                                <p>Our AI tools generate listing descriptions, market summaries, and chatbot responses. You are responsible for reviewing AI-generated content before publishing. HomeListingAI does not guarantee the accuracy of AI outputs and is not liable for errors in auto-generated content.</p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">7. Lead Data Ownership</h2>
                                <p>Leads captured through your listings belong to you. HomeListingAI does not sell lead data to third parties. We may use aggregated, anonymized data to improve the platform.</p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">8. Limitation of Liability</h2>
                                <p>HomeListingAI is provided "as is." We are not liable for lost leads, missed opportunities, system downtime, or indirect damages. Our total liability is limited to the amount you paid in the 3 months prior to any claim.</p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">9. Termination</h2>
                                <p>We may suspend or terminate accounts that violate these terms, engage in discriminatory practices, abuse SMS/email features, or pose legal risk to the platform. You may close your account at any time.</p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">10. Governing Law</h2>
                                <p>These terms are governed by the laws of the State of California, without regard to conflict of law principles.</p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">11. Contact</h2>
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

export default TermsOfServicePage;
