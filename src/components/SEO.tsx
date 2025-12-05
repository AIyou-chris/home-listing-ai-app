import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
    title?: string;
    description?: string;
    canonical?: string;
    type?: string;
    name?: string;
    image?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    structuredData?: Record<string, any>;
}

export const SEO: React.FC<SEOProps> = ({
    title,
    description,
    canonical,
    type = 'website',
    name = 'HomeListingAI',
    image = 'https://homelistingai.com/og-image.png',
    structuredData
}) => {
    const siteTitle = 'HomeListingAI - AI-Powered Real Estate Assistant';
    const metaTitle = title ? `${title} | ${name}` : siteTitle;
    const metaDescription = description || "Revolutionize your real estate business with AI. 24/7 multilingual support, automated follow-ups, and intelligent lead management for $89/month.";
    const currentUrl = canonical || window.location.href;

    return (
        <Helmet>
            {/* Standard metadata */}
            <title>{metaTitle}</title>
            <meta name="description" content={metaDescription} />
            <link rel="canonical" href={currentUrl} />

            {/* Open Graph */}
            <meta property="og:type" content={type} />
            <meta property="og:url" content={currentUrl} />
            <meta property="og:title" content={metaTitle} />
            <meta property="og:description" content={metaDescription} />
            <meta property="og:image" content={image} />
            <meta property="og:site_name" content={name} />

            {/* Twitter */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:creator" content="@HomeListingAI" />
            <meta name="twitter:title" content={metaTitle} />
            <meta name="twitter:description" content={metaDescription} />
            <meta name="twitter:image" content={image} />

            {/* Structured Data (JSON-LD) for AIO */}
            {structuredData && (
                <script type="application/ld+json">
                    {JSON.stringify(structuredData)}
                </script>
            )}
        </Helmet>
    );
};
