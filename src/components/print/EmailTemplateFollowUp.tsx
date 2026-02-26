import React from 'react';

export interface EmailTemplateProps {
    address?: string;
    slug?: string;
    agentName?: string;
    agentPhone?: string;
    variant?: 'short' | 'long';
}

export const EmailTemplateFollowUp: React.FC<EmailTemplateProps> = ({
    address = "123 Main St",
    slug = "123-main-st",
    agentName = "[Your Name]",
    agentPhone = "[Your Phone]",
    variant = 'short'
}) => {

    const link = `https://homelistingai.com/l/${slug}`;

    return (
        <div className="bg-slate-50 p-8 rounded-xl max-w-2xl mx-auto font-sans text-slate-800 border border-slate-200 shadow-sm mt-8">
            <div className="mb-6 border-b border-slate-200 pb-4">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Subject Line Options</h3>
                <ul className="list-disc pl-5 space-y-1 text-slate-700 font-medium">
                    <li>Your 1-page report for {address}</li>
                    <li>Quick report + showing times for {address}</li>
                    <li>Here's the property report for {address}</li>
                    <li>Want to see {address}? Here are options</li>
                    <li>{address}: report + next steps</li>
                </ul>
            </div>

            <div className="text-lg leading-relaxed space-y-5">
                <p>Hi there,</p>

                {variant === 'short' ? (
                    <>
                        <p>
                            Thanks for checking out {address}. I've put together a quick, 1-page digital property report with pricing insights and local market trends.
                        </p>
                        <p>
                            You can view the full report instantly right here: <br />
                            <a href={link} className="text-blue-600 font-bold hover:underline">{link}</a>
                        </p>
                    </>
                ) : (
                    <>
                        <p>
                            Thanks for taking a look at {address}. Whether you're just browsing the neighborhood or actively looking to make a move, I wanted to make sure you had all the details.
                        </p>
                        <p>
                            I've generated a 1-page digital property report for the home that includes an instant pricing snapshot, school data, and recent local market trends.
                        </p>
                        <p>
                            You can access the full report instantly right here: <br />
                            <a href={link} className="text-blue-600 font-bold hover:underline">{link}</a>
                        </p>
                    </>
                )}

                <div className="bg-white border-l-4 border-blue-600 p-4 rounded shadow-sm my-6">
                    <p className="font-bold mb-2">Next Steps:</p>
                    <ul className="space-y-2">
                        <li>
                            👉 <a href={`${link}#report`} className="text-blue-600 font-semibold hover:underline">Get the report</a>
                        </li>
                        <li>
                            📅 <a href={`${link}#showing`} className="text-blue-600 font-semibold hover:underline">Request a private showing</a>
                        </li>
                    </ul>
                </div>

                <p className="font-bold text-slate-900 mt-6">
                    Are you free sometime this week to take a quick tour?
                </p>

                <div className="mt-8 pt-6 border-t border-slate-200">
                    <p className="font-semibold text-slate-900">{agentName}</p>
                    <p className="text-slate-500 text-sm mt-1">{agentPhone}</p>
                    <p className="text-slate-500 text-sm italic">Powered by HomeListingAI</p>
                </div>
            </div>
        </div>
    );
};
