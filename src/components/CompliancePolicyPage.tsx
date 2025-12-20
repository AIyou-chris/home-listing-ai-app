import React from 'react';
import { AuthHeader } from './AuthHeader';
import { AuthFooter } from './AuthFooter';

const CompliancePolicyPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
            <AuthHeader
                onNavigateToSignUp={() => window.location.href = '/signup'}
                onNavigateToSignIn={() => window.location.href = '/signin'}
                onNavigateToLanding={() => window.location.href = '/'}
                onNavigateToSection={() => { }}
                onEnterDemoMode={() => { }}
            />
            <main className="flex-grow py-16 sm:py-24">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 bg-white p-8 sm:p-12 rounded-2xl shadow-sm border border-slate-200">
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-8">Compliance Policy</h1>

                    <div className="prose prose-slate max-w-none text-slate-600">
                        <section className="mb-8">
                            <h2 className="text-xl font-bold text-slate-800 mb-4">1. Equal Housing Opportunity</h2>
                            <p>
                                HomeListingAI is committed to the principles of the Fair Housing Act. We fully support and comply with strict prohibitions against discrimination in the sale, rental, and financing of housing based on race, color, religion, sex, handicap, familial status, or national origin.
                            </p>
                            <p className="mt-4">
                                Use of our AI tools to filter, screen, or discriminate against potential buyers or renters in violation of federal, state, or local fair housing laws is strictly prohibited.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-xl font-bold text-slate-800 mb-4">2. TCPA & Telemarketing Compliance</h2>
                            <p>
                                Our platform includes tools for automated messaging, texting, and calling. By using HomeListingAI, you agree to comply with the Telephone Consumer Protection Act (TCPA) and all applicable telemarketing laws.
                            </p>
                            <ul className="list-disc pl-5 mt-4 space-y-2">
                                <li>You must obtain prior express written consent before sending automated marketing texts or calls.</li>
                                <li>Our lead capture forms include standard consent language, but you are responsible for ensuring your specific use case is compliant.</li>
                                <li>You must honor all opt-out requests (e.g., "STOP") immediately. Our system handles standard keyword opt-outs automatically.</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-xl font-bold text-slate-800 mb-4">3. Data Privacy & Security</h2>
                            <p>
                                We implement industry-standard security measures to protect consumer data. As a user of our platform, you are also a data controller and must protect your leads' personal information in accordance with applicable privacy laws (e.g., CCPA, GDPR where applicable).
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-xl font-bold text-slate-800 mb-4">4. Advertising Truthfulness</h2>
                            <p>
                                All property listings and advertisements generated or hosted on our platform must be truthful, non-misleading, and comply with the REALTOR® Code of Ethics (if applicable) and state real estate commission advertising rules. You are responsible for the accuracy of all data provided to the AI.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-800 mb-4">5. Contact Us</h2>
                            <p>
                                If you have questions about our compliance policies, please contact our legal team at: <a href="mailto:legal@homelistingai.com" className="text-primary-600 hover:underline">legal@homelistingai.com</a>
                            </p>
                        </section>
                    </div>
                </div>
            </main>
            <AuthFooter />
        </div>
    );
};

export default CompliancePolicyPage;
