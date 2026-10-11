import React from 'react';
import { PublicHeader } from '../components/layout/PublicHeader';
import { PublicFooter } from '../components/layout/PublicFooter';
import SEO from '../components/SEO';

const SUPPORT_EMAIL = 'homelistingai@gmail.com';

const ANSWERS: Array<[string, string]> = [
    ['How do I send my first WOW Link?', 'Open Partners and invite an agent. They get a link and see their listing as an app.'],
    ['Where do my leads show up?', 'On your Today page and in Leads. You and the agent both get an alert when a buyer leaves their info.'],
    ['What if I run out of AI phone minutes?', 'Calls to your AI number ring your own cell phone until next month.'],
    ['How do I change what my AI says on the phone?', 'Open AI Brain, then "How it talks." Pick a voice, set a name, and write your own phone greeting under Advanced.'],
    ['How do I cancel?', 'Settings, then Billing, then Cancel. It opens your billing page where you can cancel in a click.'],
    ['How do I delete my account?', 'Settings, then Billing, then "Delete my account." This removes your listings, leads and files for good.'],
];

const HelpPage: React.FC = () => (
    <div className="min-h-screen bg-[#0B0F19] text-white">
        <SEO title="Help" description="Answers and support for HomeListingAI loan officers." url="https://homelistingai.com/help" image="https://homelistingai.com/og-image.png" />
        <PublicHeader />
        <main className="max-w-3xl mx-auto px-6 pt-36 pb-20">
            <h1 className="text-4xl font-extrabold mb-3">Help</h1>
            <p className="text-slate-300 text-lg mb-10">
                Email us any time at <a className="text-cyan-400 underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. We reply within one business day.
            </p>
            <div className="space-y-6">
                {ANSWERS.map(([q, a]) => (
                    <div key={q} className="border border-slate-800 rounded-xl p-5 bg-slate-900/40">
                        <h2 className="font-semibold text-white mb-1">{q}</h2>
                        <p className="text-slate-300 text-sm">{a}</p>
                    </div>
                ))}
            </div>
        </main>
        <PublicFooter />
    </div>
);

export default HelpPage;
