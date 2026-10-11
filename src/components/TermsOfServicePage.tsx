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
                        <p className="text-slate-400 text-sm mb-10">Last updated: October 11, 2026</p>

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
                                    <li>Hold the licenses you need, follow the laws that apply to your business, and get the consent you need from the people you contact. You are responsible for your own compliance. We are not your lawyer or your compliance officer.</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">4. Plans, Billing & Cancellation</h2>
                                <ul className="list-disc pl-6 space-y-2 marker:text-cyan-500">
                                    <li>New accounts get a 7-day free trial with no card needed. If you start a plan during the trial, you are not charged until the trial ends.</li>
                                    <li>Subscriptions are billed monthly. No annual lock-in.</li>
                                    <li>You may cancel at any time. Access continues through the end of your billing period.</li>
                                    <li>Each plan includes set limits (for example listings, texts and AI phone minutes). When you reach a limit, that feature pauses until your limit resets or you change plans. We do not charge extra for going over.</li>
                                    <li>A launch price (for example $49 a month for the first 25 loan officers) stays the same for as long as your subscription stays active. If you cancel and come back later, the price then in effect applies.</li>
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
                                <p>Our AI tools generate listing descriptions, market summaries, and chatbot responses. You are responsible for reviewing AI-generated content before publishing. AI answers can be wrong. Buyer chat and phone answers are general information, not legal, tax or financial advice, and not a loan offer or a commitment to lend. HomeListingAI does not guarantee the accuracy of AI outputs and is not liable for errors in auto-generated content.</p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">7. Lead Data Ownership</h2>
                                <p>Leads captured through your listings belong to you. HomeListingAI does not sell lead data to third parties. We may use aggregated, anonymized data to improve the platform. See our <a href="/privacy" className="text-cyan-400 hover:text-cyan-300 transition-colors">Privacy Policy</a> for how buyer details are handled.</p>
                                <p className="mt-4"><strong className="text-white font-semibold">Agent accounts and invoices.</strong> A real estate agent's account on the platform does not oblige the agent to refer anyone to a loan officer. Invoices a loan officer sends an agent are between those two people. We create, email and track them, but we do not collect the payment or give advice about it.</p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">8. Limitation of Liability</h2>
                                <p>HomeListingAI is provided "as is." We do not promise any number of leads, loans or results. We are not liable for lost leads, missed opportunities, system downtime, or indirect damages. Our total liability is limited to the amount you paid in the 3 months prior to any claim.</p>
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
