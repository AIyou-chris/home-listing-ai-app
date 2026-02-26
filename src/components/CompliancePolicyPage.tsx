import React from 'react';
import { PublicHeader } from './layout/PublicHeader';
import { PublicFooter } from './layout/PublicFooter';
import { BackgroundTechIcons } from './BackgroundTechIcons';

const CompliancePolicyPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-[#02050D] font-sans flex flex-col relative overflow-hidden text-white">
            <PublicHeader
                onNavigateToSignUp={() => window.location.href = '/signup'}
                onNavigateToSignIn={() => window.location.href = '/signin'}
                onEnterDemoMode={() => { }}
            />

            {/* Ambient Background Glows */}
            <BackgroundTechIcons />
            <div className="absolute top-1/4 left-0 w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none -translate-x-1/2"></div>
            <div className="absolute bottom-1/4 right-0 w-[600px] h-[600px] bg-cyan-900/10 rounded-full blur-[120px] pointer-events-none translate-x-1/2"></div>

            <main className="flex-grow py-24 sm:py-32 relative z-10 w-full">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-[#0B1121]/80 backdrop-blur-md p-8 sm:p-12 rounded-3xl shadow-[0_0_40px_rgba(6,182,212,0.1)] border border-cyan-900/30">
                        <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-8 tracking-tight">Compliance Policy</h1>

                        <div className="prose prose-lg prose-invert max-w-none text-slate-300 font-light leading-relaxed">
                            <section className="mb-10">
                                <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">1. Equal Housing Opportunity</h2>
                                <p>
                                    HomeListingAI is committed to the principles of the Fair Housing Act. We fully support and comply with strict prohibitions against discrimination in the sale, rental, and financing of housing based on race, color, religion, sex, handicap, familial status, or national origin.
                                </p>
                                <p className="mt-4">
                                    Use of our AI tools to filter, screen, or discriminate against potential buyers or renters in violation of federal, state, or local fair housing laws is strictly prohibited.
                                </p>
                            </section>

                            <section className="mb-10">
                                <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">2. TCPA & Telemarketing Compliance</h2>
                                <p>
                                    Our platform includes tools for automated messaging, texting, and calling. By using HomeListingAI, you agree to comply with the Telephone Consumer Protection Act (TCPA) and all applicable telemarketing laws.
                                </p>
                                <ul className="list-disc pl-6 mt-4 space-y-3 marker:text-cyan-500">
                                    <li>You must obtain prior express written consent before sending automated marketing texts or calls.</li>
                                    <li>Our lead capture forms include standard consent language, but you are responsible for ensuring your specific use case is compliant.</li>
                                    <li>You must honor all opt-out requests (e.g., "STOP") immediately. Our system handles standard keyword opt-outs automatically.</li>
                                </ul>
                            </section>

                            <section className="mb-10">
                                <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">3. Data Privacy & Security</h2>
                                <p>
                                    We implement industry-standard security measures to protect consumer data. As a user of our platform, you are also a data controller and must protect your leads' personal information in accordance with applicable privacy laws (e.g., CCPA, GDPR where applicable).
                                </p>
                            </section>

                            <section className="mb-10">
                                <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">4. Advertising Truthfulness</h2>
                                <p>
                                    All property listings and advertisements generated or hosted on our platform must be truthful, non-misleading, and comply with the REALTOR® Code of Ethics (if applicable) and state real estate commission advertising rules. You are responsible for the accuracy of all data provided to the AI.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">5. Contact Us</h2>
                                <p>
                                    If you have questions about our compliance policies, please contact our legal team at: <a href="mailto:legal@homelistingai.com" className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium">legal@homelistingai.com</a>
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

export default CompliancePolicyPage;
