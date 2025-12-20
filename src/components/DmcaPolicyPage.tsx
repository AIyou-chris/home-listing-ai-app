import React from 'react';
import { AuthHeader } from './AuthHeader';
import { AuthFooter } from './AuthFooter';

const DmcaPolicyPage: React.FC = () => {
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
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-8">DMCA Policy</h1>

                    <div className="prose prose-slate max-w-none text-slate-600">
                        <p className="lead text-lg mb-8">
                            HomeListingAI respects the intellectual property rights of others and expects its users to do the same. In accordance with the Digital Millennium Copyright Act of 1998 ("DMCA"), we will respond expeditiously to claims of copyright infringement reported to our designated Copyright Agent.
                        </p>

                        <section className="mb-8">
                            <h2 className="text-xl font-bold text-slate-800 mb-4">1. Reporting Claims of Copyright Infringement</h2>
                            <p>
                                If you are a copyright owner, or authorized to act on behalf of one, and you believe that any material accessed on or via our services infringes your rights, please submit a written notice ("DMCA Notice") containing the following information:
                            </p>
                            <ul className="list-disc pl-5 mt-4 space-y-2">
                                <li>A physical or electronic signature of a person authorized to act on behalf of the copyright owner.</li>
                                <li>Identification of the copyrighted work claimed to have been infringed.</li>
                                <li>Identification of the material that is claimed to be infringing or to be the subject of infringing activity and that is to be removed or access to which is to be disabled, and information reasonably sufficient to permit us to locate the material (e.g., URLs).</li>
                                <li>Your contact information, including your address, telephone number, and an email address.</li>
                                <li>A statement that you have a good faith belief that use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law.</li>
                                <li>A statement that the information in the notification is accurate, and under penalty of perjury, that you are authorized to act on behalf of the copyright owner.</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-xl font-bold text-slate-800 mb-4">2. Submit DMCA Notices To:</h2>
                            <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
                                <p className="font-semibold">Copyright Agent</p>
                                <p>HomeListingAI Legal Dept.</p>
                                <p>Email: <a href="mailto:legal@homelistingai.com" className="text-primary-600 hover:underline">legal@homelistingai.com</a></p>
                                <p>Subject Line: DMCA Takedown Request</p>
                            </div>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-xl font-bold text-slate-800 mb-4">3. Counter-Notifications</h2>
                            <p>
                                If you believe that your material was removed or disabled by mistake or misidentification, you may file a counter-notification with our Copyright Agent. The counter-notification must be in writing and include:
                            </p>
                            <ul className="list-disc pl-5 mt-4 space-y-2">
                                <li>Your physical or electronic signature.</li>
                                <li>Identification of the material that has been removed or to which access has been disabled.</li>
                                <li>A statement under penalty of perjury that you have a good faith belief that the material was removed or disabled as a result of mistake or misidentification.</li>
                                <li>Your name, address, and telephone number, and a statement that you consent to the jurisdiction of the Federal District Court for the judicial district in which your address is located.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-800 mb-4">4. Repeat Infringers</h2>
                            <p>
                                It is our policy in appropriate circumstances to disable and/or terminate the accounts of users who are repeat infringers.
                            </p>
                        </section>
                    </div>
                </div>
            </main>
            <AuthFooter />
        </div>
    );
};

export default DmcaPolicyPage;
