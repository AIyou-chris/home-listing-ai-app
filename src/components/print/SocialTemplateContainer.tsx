import React from 'react';

export interface SocialTemplateContainerProps {
    templateType?: '1' | '2' | '3' | '4' | '5' | '6';
    format?: 'ig_post' | 'ig_story' | 'tiktok_cover' | 'fb_post';
    propertyImageUrl?: string;
    address?: string;
    price?: string;
    beds?: string | number;
    baths?: string | number;
    sqft?: string | number;
    slug?: string;
    qrImageUrl?: string;
}

export const SocialTemplateContainer: React.FC<SocialTemplateContainerProps> = ({
    templateType = '1',
    format = 'ig_story',
    propertyImageUrl = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=2075&q=80',
    address = '8441 NW 14th Ave',
    price = '$1,450,000',
    beds = '4',
    baths = '3',
    sqft = '2,800',
    slug = '8441-nw-14th',
    qrImageUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=https://homelistingai.com/l/sample-slug',
}) => {

    // FORMAT SIZING CONFIGURATIONS
    const formatStyles = {
        'ig_post': 'w-[1080px] h-[1350px]',     // 4:5
        'ig_story': 'w-[1080px] h-[1920px]',    // 9:16
        'tiktok_cover': 'w-[1080px] h-[1920px]', // 9:16
        'fb_post': 'w-[1200px] h-[630px]',      // 1.9:1
    };

    const isStory = format === 'ig_story' || format === 'tiktok_cover';
    const isLandscape = format === 'fb_post';

    // TEMPLATE CONTENT MAPPING
    const templates = {
        '1': {
            headline: 'JUST LISTED',
            sub: 'Scan / Click for the Property Report',
            cta: 'Get the Report',
            accent: 'bg-blue-600',
        },
        '2': {
            headline: 'OPEN HOUSE',
            sub: 'Scan for report + showing options',
            cta: 'Scan the QR',
            accent: 'bg-emerald-600',
        },
        '3': {
            headline: 'PRICE + DETAILS',
            sub: 'Instant answers inside',
            cta: 'Get the Report',
            accent: 'bg-indigo-600',
        },
        '4': {
            headline: 'SCHEDULE A TOUR',
            sub: 'Pick a time in seconds',
            cta: 'Request a Showing',
            accent: 'bg-purple-600',
        },
        '5': {
            headline: 'LOCAL MARKET REPORT',
            sub: 'Pricing + trends for this home',
            cta: 'Get the Report',
            accent: 'bg-slate-900',
        },
        '6': {
            headline: 'LOOKING AFTER HOURS?',
            sub: 'The listing answers instantly',
            cta: 'Click for details',
            accent: 'bg-rose-600',
        },
    };

    const content = templates[templateType];

    return (
        <div
            className={`relative overflow-hidden ${formatStyles[format]} bg-black mx-auto shadow-2xl flex flex-col items-center justify-between text-white font-sans print:m-0`}
            style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact', position: 'relative' }}
        >
            {/* Background Image with Gradient Overlay */}
            <div
                className="absolute inset-0 z-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${propertyImageUrl})` }}
            >
                {/* Dark gradient for text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/20" />
            </div>

            {/* TOP SECTION: Branding & Property Details */}
            <div className={`relative z-10 w-full p-12 ${isLandscape ? 'pt-10' : 'pt-16'}`}>
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <img src="/newlogo.png" alt="" className="w-10 h-10 object-contain filter brightness-0 invert opacity-90" />
                        <span className="font-extrabold text-2xl tracking-tight opacity-90">HomeListingAI</span>
                    </div>
                    {/* Floating badge for price */}
                    <div className="px-5 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 font-bold tracking-wider text-xl">
                        {price}
                    </div>
                </div>

                <div className={`${isLandscape ? 'max-w-xl' : 'max-w-3xl'}`}>
                    <h2 className="text-[2.5rem] leading-tight font-extrabold mb-4 drop-shadow-lg">
                        {address}
                    </h2>
                    <div className="flex items-center gap-6 text-xl font-semibold opacity-90">
                        <div className="flex items-center gap-2"><span className="material-symbols-outlined max-w-none">bed</span> {beds} Beds</div>
                        <div className="flex items-center gap-2"><span className="material-symbols-outlined max-w-none">shower</span> {baths} Baths</div>
                        <div className="flex items-center gap-2"><span className="material-symbols-outlined max-w-none">square_foot</span> {sqft} SqFt</div>
                    </div>
                </div>
            </div>

            {/* MIDDLE/BOTTOM SECTION: The Hook & CTA */}
            <div className={`relative z-10 w-full flex ${isLandscape ? 'flex-row items-end justify-between p-12 pt-0 gap-8' : 'flex-col items-center text-center p-12 pb-16'}`}>

                {/* Headline Block */}
                <div className={`${isLandscape ? 'flex-1 mb-4' : 'w-full mb-12 flex flex-col items-center'}`}>
                    {/* Accent pill */}
                    <div className={`inline-block px-4 py-1.5 rounded-full ${content.accent} text-white font-bold tracking-widest text-sm uppercase mb-4 shadow-xl`}>
                        {templateType === '2' ? 'LIVE NOW' : 'AVAILABLE'}
                    </div>

                    <h1 className={`${isLandscape ? 'text-[4rem]' : 'text-[5.5rem]'} leading-[1.05] font-black uppercase tracking-tighter mb-4 drop-shadow-2xl`}>
                        {content.headline}
                    </h1>
                    <p className={`${isLandscape ? 'text-2xl' : 'text-3xl'} font-medium text-white/90 drop-shadow-md`}>
                        {content.sub}
                    </p>
                </div>

                {/* QR Code (For Stories / Vertical specifically) & CTA */}
                <div className={`flex ${isLandscape ? 'flex-col-reverse items-end' : 'flex-col items-center'} gap-8`}>

                    {/* Story formats get the big bold QR block */}
                    {isStory && (
                        <div className="bg-white p-4 rounded-[2rem] shadow-2xl border-4 border-white/10 mt-4 mb-4">
                            <img src={qrImageUrl} alt="Scan QR" className="w-56 h-56 object-contain" />
                        </div>
                    )}

                    {/* Action Button & Link */}
                    <div className="flex flex-col items-center gap-4 w-full">
                        <div className={`w-full text-center px-10 py-5 rounded-2xl ${content.accent} shadow-2xl shadow-${content.accent}/50`}>
                            <span className="text-2xl font-black uppercase tracking-widest drop-shadow-md">{content.cta}</span>
                        </div>
                        <p className="text-xl font-bold font-mono text-white/70 tracking-tight">
                            homelistingai.com/l/{slug}
                        </p>
                    </div>

                </div>

            </div>
        </div>
    );
};
