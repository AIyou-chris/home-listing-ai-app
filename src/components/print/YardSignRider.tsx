import React from 'react';

export interface YardSignRiderProps {
    slug?: string;
    qrImageUrl?: string;
    // Two standard sizes: 6x24 (horizontal strip) or 18x24 (large portrait sign)
    size?: '6x24' | '18x24';
    // Two layout variations
    layout?: 'split' | 'centered';
}

export const YardSignRider: React.FC<YardSignRiderProps> = ({
    slug = "123-main-st",
    qrImageUrl = "https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=https://homelistingai.com/l/sample-slug",
    size = '6x24',
    layout = 'split'
}) => {

    // Size mappings (in inches mapped to CSS standard 96dpi scaling for print)
    const dimensions = {
        '6x24': 'w-[24in] h-[6in]',
        '18x24': 'w-[24in] h-[18in]', // Using landscape 24x18 for a large yard sign variant based on standard corrugated plastic
    };

    if (size === '18x24') {
        // LARGE 18x24 VARIAD (Typically 24" wide x 18" tall)
        return (
            <div
                className={`${dimensions['18x24']} bg-white mx-auto relative flex flex-col p-8 overflow-hidden shadow-2xl print:shadow-none print:m-0`}
                style={{
                    pageBreakAfter: 'always',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact',
                }}
            >
                {/* Brand Header */}
                <div className="flex items-center gap-4 mb-6">
                    <img src="/newlogo.png" alt="" className="w-12 h-12 object-contain" />
                    <span className="font-extrabold text-3xl text-slate-800 tracking-tight">HomeListingAI</span>
                </div>

                <div className="flex flex-row flex-1 items-stretch gap-12">
                    {/* Left Column: Big Copy */}
                    <div className="flex-[1.5] flex flex-col justify-center">
                        <div className="inline-block px-8 py-3 bg-blue-600 text-white font-black tracking-widest text-4xl uppercase rounded-xl mb-8 self-start">
                            SCAN
                        </div>
                        <h1 className="text-[6.5rem] leading-[0.95] font-black text-slate-950 uppercase tracking-tighter mb-8">
                            FOR PRICE <br /> <span className="text-blue-600">+ REPORT</span>
                        </h1>
                        <p className="text-[2.75rem] text-slate-700 font-bold leading-tight">
                            Instant answers. <br /> Request a showing.
                        </p>
                    </div>

                    {/* Right Column: Giant QR */}
                    <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 border-4 border-slate-100 rounded-[3rem] p-10">
                        <img
                            src={qrImageUrl}
                            alt="Scan for property report"
                            className="w-[12in] h-[12in] object-contain flex-shrink-0"
                        />
                        <p className="text-2xl font-bold text-slate-600 mt-8 tracking-widest text-center">
                            homelistingai.com/l/<br />
                            <span className="text-slate-900 font-black">{slug}</span>
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // 6x24 RIDER VARIANT (Horizontal Strip)

    if (layout === 'centered') {
        // Centered Layout (6x24) - Works best if you need a very symmetrical look, 
        // but pushes text size down due to narrow height.
        return (
            <div
                className={`${dimensions['6x24']} bg-white mx-auto relative flex flex-row items-center p-4 overflow-hidden shadow-2xl print:shadow-none print:m-0 border-8 border-white`}
                style={{ pageBreakAfter: 'always', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
            >
                <div className="flex-1 text-right pr-12 flex flex-col justify-center">
                    <h1 className="text-[3.8rem] leading-[0.9] font-black text-slate-950 uppercase tracking-tighter mb-2">
                        <span className="text-blue-600">SCAN</span> FOR <br /> PRICE
                    </h1>
                </div>

                <div className="flex-shrink-0 flex flex-col items-center justify-center">
                    <img src={qrImageUrl} alt="QR" className="h-[4.5in] w-[4.5in] object-contain" />
                </div>

                <div className="flex-1 pl-12 flex flex-col justify-center">
                    <h1 className="text-[3.8rem] leading-[0.9] font-black text-slate-950 uppercase tracking-tighter mb-2">
                        + REPORT
                    </h1>
                    <p className="text-2xl text-slate-800 font-bold tracking-tight mb-2">
                        Instant answers. Request a showing.
                    </p>
                    <p className="text-lg font-bold text-slate-400">homelistingai.com/l/{slug}</p>
                </div>
            </div>
        );
    }

    // Split Layout (6x24) - STANDARD: Left Side Heavy Text, Right Side Huge QR
    // This maximizes readability from a passing car.
    return (
        <div
            className={`${dimensions['6x24']} bg-white mx-auto relative flex flex-row items-stretch p-6 overflow-hidden shadow-2xl print:shadow-none print:m-0`}
            style={{ pageBreakAfter: 'always', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
        >
            {/* Left Side: Bold Text */}
            <div className="flex-[1.8] flex flex-col justify-center h-full pr-8">
                <div className="flex items-center gap-8 mb-1">
                    <span className="text-[5.5rem] leading-none font-black text-blue-600 uppercase tracking-tighter">
                        SCAN
                    </span>
                    <span className="text-[4rem] leading-none font-black text-slate-950 uppercase tracking-tighter pt-3">
                        FOR PRICE <br /> + REPORT
                    </span>
                </div>

                <div className="flex items-center justify-between mt-2 pl-1 border-t-8 border-blue-600 pt-3">
                    <p className="text-[1.85rem] text-slate-800 font-extrabold tracking-tight">
                        Instant answers. Request a showing.
                    </p>
                    <div className="flex items-center gap-2 opacity-60">
                        <img src="/newlogo.png" alt="" className="w-8 h-8 object-contain" />
                        <span className="font-extrabold text-xl tracking-tight text-slate-900">HomeListingAI</span>
                    </div>
                </div>
            </div>

            {/* Right Side: Huge QR Code */}
            <div className="flex-1 flex flex-col items-center justify-center pl-8 border-l-8 border-slate-100 h-full py-2">
                <img
                    src={qrImageUrl}
                    alt="Scan for property report"
                    className="h-full max-h-[4.2in] w-auto object-contain"
                />
                <p className="text-lg font-black text-slate-800 mt-2 tracking-widest text-center whitespace-nowrap">
                    homelistingai.com/l/{slug}
                </p>
            </div>
        </div>
    );
};
