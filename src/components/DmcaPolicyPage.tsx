import React from 'react';
import { PublicHeader } from './layout/PublicHeader';
import { PublicFooter } from './layout/PublicFooter';
import { BackgroundTechIcons } from './BackgroundTechIcons';

const DmcaPolicyPage: React.FC = () => {
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
                        <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-8 tracking-tight">DMCA Policy</h1>

                        <div className="prose prose-lg prose-invert max-w-none text-slate-300 font-light leading-relaxed">
                            <p className="lead text-xl mb-10 text-slate-200">
                                HomeListingAI respects the intellectual property rights of others and expects its users to do the same. In accordance with the Digital Millennium Copyright Act of 1998 ("DMCA"), we will respond expeditiously to claims of copyright infringement reported to our designated Copyright Agent.
                            </p>

                            <section className="mb-10">
                                <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">1. Reporting Claims of Copyright Infringement</h2>
                                <p>
                                    If you are a copyright owner, or authorized to act on behalf of one, and you believe that any material accessed on or via our services infringes your rights, please submit a written notice ("DMCA Notice") containing the following information:
                                </p>
                                <ul className="list-disc pl-6 mt-4 space-y-3 marker:text-cyan-500">
                                    <li>A physical or electronic signature of a person authorized to act on behalf of the copyright owner.</li>
                                    <li>Identification of the copyrighted work claimed to have been infringed.</li>
                                    <li>Identification of the material that is claimed to be infringing or to be the subject of infringing activity and that is to be removed or access to which is to be disabled, and information reasonably sufficient to permit us to locate the material (e.g., URLs).</li>
                                    <li>Your contact information, including your address, telephone number, and an email address.</li>
                                    <li>A statement that you have a good faith belief that use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law.</li>
                                    <li>A statement that the information in the notification is accurate, and under penalty of perjury, that you are authorized to act on behalf of the copyright owner.</li>
                                </ul>
                            </section>

                            <section className="mb-10">
                                <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">2. Submit DMCA Notices To:</h2>
                                <div className="bg-[#02050D]/50 p-6 rounded-xl border border-cyan-900/30">
                                    <p className="font-semibold text-white mb-2">Copyright Agent</p>
                                    <p>HomeListingAI Legal Dept.</p>
                                    <p>Email: <a href="mailto:legal@homelistingai.com" className="text-cyan-400 hover:text-cyan-300 transition-colors">legal@homelistingai.com</a></p>
                                    <p className="mt-2 text-slate-400 text-sm">Subject Line: DMCA Takedown Request</p>
                                </div>
                            </section>

                            <section className="mb-10">
                                <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">3. Counter-Notifications</h2>
                                <p>
                                    If you believe that your material was removed or disabled by mistake or misidentification, you may file a counter-notification with our Copyright Agent. The counter-notification must be in writing and include:
                                </p>
                                <ul className="list-disc pl-6 mt-4 space-y-3 marker:text-cyan-500">
                                    <li>Your physical or electronic signature.</li>
                                    <li>Identification of the material that has been removed or to which access has been disabled.</li>
                                    <li>A statement under penalty of perjury that you have a good faith belief that the material was removed or disabled as a result of mistake or misidentification.</li>
                                    <li>Your name, address, and telephone number, and a statement that you consent to the jurisdiction of the Federal District Court for the judicial district in which your address is located.</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">4. Repeat Infringers</h2>
                                <p>
                                    It is our policy in appropriate circumstances to disable and/or terminate the accounts of users who are repeat infringers.
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

export default DmcaPolicyPage;
