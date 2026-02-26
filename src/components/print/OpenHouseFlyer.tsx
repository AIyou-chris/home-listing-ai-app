import React from 'react';

export interface OpenHouseFlyerProps {
    address?: string;
    price?: string;
    beds?: string | number;
    baths?: string | number;
    sqft?: string | number;
    agentName?: string;
    agentPhone?: string;
    agentEmail?: string;
    slug?: string;
    qrImageUrl?: string;
    variant?: 'standard' | 'minimal'; // Toggle for different styles
}

export const OpenHouseFlyer: React.FC<OpenHouseFlyerProps> = ({
    address = "[Address Placeholder]",
    price = "[Price Placeholder]",
    beds = "[#]",
    baths = "[#]",
    sqft = "[#]",
    agentName = "[Agent Name]",
    agentPhone = "[Phone]",
    agentEmail = "[Email]",
    slug = "[slug]",
    qrImageUrl = "https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=https://homelistingai.com/l/sample-slug",
    variant = 'standard'
}) => {
    const isMinimal = variant === 'minimal';

    return (
        <div
            className={`w-[8.5in] h-[11in] mx-auto relative flex flex-col overflow-hidden shadow-2xl print:shadow-none print:m-0 ${isMinimal ? 'bg-white' : 'bg-gradient-to-br from-slate-50 to-slate-200'
                }`}
            style={{
                // Explicitly defining print dimensions ensuring it scales precisely for standard US Letter
                pageBreakAfter: 'always',
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact',
            }}
        >
            {/* Margins/Padding Wrapper (Safe Area) */}
            <div className={`flex-1 flex flex-col p-12 ${isMinimal ? '' : 'border-[1rem] border-white'}`}>

                {/* 1) Top Bar */}
                <div className="flex items-center justify-between mb-12">
                    <div className="flex items-center gap-3">
                        {/* Using explicit image sizes to prevent reflow during print */}
                        <img src="/newlogo.png" alt="HomeListingAI" className="w-10 h-10 object-contain grayscale-[20%]" />
                        <span className="font-extrabold text-2xl text-slate-800 tracking-tight">HomeListingAI</span>
                    </div>
                    <div className={`px-6 py-2 rounded-full font-bold tracking-widest uppercase text-sm ${isMinimal ? 'border-2 border-slate-900 text-slate-900' : 'bg-slate-900 text-white shadow-md'
                        }`}>
                        OPEN HOUSE
                    </div>
                </div>

                {/* 2) Main Headline & Subhead */}
                <div className={isMinimal ? 'mb-16' : 'mb-14'}>
                    <h1 className="text-[3.5rem] leading-[1.05] font-black text-slate-950 uppercase tracking-tight mb-6">
                        SCAN FOR THE <br className="hidden md:block" />
                        <span className={isMinimal ? 'text-slate-900' : 'text-blue-600'}>PROPERTY REPORT</span>
                    </h1>
                    <p className="text-2xl text-slate-600 font-medium leading-snug max-w-2xl">
                        Instant pricing insight, local trends, and showing options — in 30 seconds.
                    </p>
                </div>

                {/* 3) Center Section (Split Layout) */}
                <div className="flex flex-row gap-12 flex-1 items-stretch">

                    {/* LEFT: Property Block */}
                    <div className={`flex flex-col flex-1 justify-center p-8 rounded-3xl ${isMinimal ? 'bg-transparent pl-0 border-l-4 border-slate-200' : 'bg-white shadow-xl border border-slate-100'
                        }`}>
                        <h2 className="text-4xl font-extrabold text-slate-900 mb-4 leading-tight">
                            {address}
                        </h2>
                        <h3 className={`${isMinimal ? 'text-4xl text-slate-900' : 'text-5xl text-blue-600'} font-black tracking-tight mb-8`}>
                            {price}
                        </h3>

                        <div className="flex flex-col gap-5 text-slate-700 font-semibold text-xl mb-12">
                            <div className="flex items-center gap-4">
                                <span className="material-symbols-outlined text-[2rem] text-slate-400">bed</span>
                                <span>{beds} Beds</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="material-symbols-outlined text-[2rem] text-slate-400">shower</span>
                                <span>{baths} Baths</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="material-symbols-outlined text-[2rem] text-slate-400">square_foot</span>
                                <span>{sqft} Sq Ft</span>
                            </div>
                        </div>

                        {/* Agent Details block locked to bottom of left column */}
                        <div className={`mt-auto pt-6 border-t ${isMinimal ? 'border-slate-200' : 'border-slate-100'}`}>
                            <p className="text-slate-500 uppercase tracking-wider font-bold text-sm mb-2">Hosted By {agentName}</p>
                            <p className="text-slate-800 font-semibold text-lg">{agentPhone}</p>
                            <p className="text-slate-800 font-semibold text-lg">{agentEmail}</p>
                        </div>
                    </div>

                    {/* RIGHT: QR Block */}
                    <div className="flex flex-col items-center justify-center flex-1 w-full text-center">
                        <div className={`p-6 rounded-3xl ${isMinimal ? '' : 'bg-white shadow-2xl border border-slate-100'} mb-6 w-full flex justify-center`}>
                            {/* The huge QR code */}
                            <img
                                src={qrImageUrl}
                                alt="Scan for property report"
                                className="w-[320px] h-[320px] object-contain"
                            />
                        </div>

                        <p className="text-2xl font-black text-slate-900 leading-tight mb-2">
                            Scan to get the report <br /> + request a showing
                        </p>
                        <p className="text-lg font-semibold text-slate-500 mt-2">
                            homelistingai.com/l/{slug}
                        </p>
                    </div>

                </div>

                {/* 4) Bullet Benefits */}
                <div className="mt-12 mb-10">
                    <ul className="flex flex-row justify-between items-center text-xl font-bold text-slate-800 px-4">
                        <li className="flex items-center gap-3">
                            <span className={`material-symbols-outlined text-3xl font-bold ${isMinimal ? 'text-slate-900' : 'text-blue-500'}`}>check_circle</span>
                            Accurate pricing snapshot
                        </li>
                        <li className="flex items-center gap-3">
                            <span className={`material-symbols-outlined text-3xl font-bold ${isMinimal ? 'text-slate-900' : 'text-blue-500'}`}>check_circle</span>
                            Local market trends
                        </li>
                        <li className="flex items-center gap-3">
                            <span className={`material-symbols-outlined text-3xl font-bold ${isMinimal ? 'text-slate-900' : 'text-blue-500'}`}>check_circle</span>
                            Request a private showing
                        </li>
                    </ul>
                </div>

                {/* 5) Bottom CTA Bar */}
                <div className={`mt-auto w-full py-5 rounded-xl flex justify-center items-center ${isMinimal ? 'border-t-4 border-slate-900' : 'bg-slate-900 shadow-xl'
                    }`}>
                    <p className={`text-xl font-bold ${isMinimal ? 'text-slate-900' : 'text-white'}`}>
                        Don't want to scan? Ask the host for the report.
                    </p>
                </div>

            </div>
        </div>
    );
};
