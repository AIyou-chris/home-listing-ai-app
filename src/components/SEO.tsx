import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
    title: string;
    description?: string;
    image?: string;
    url?: string;
    type?: string;
    schema?: Record<string, unknown>;
}

const SEO: React.FC<SEOProps> = ({
    title,
    description = "AI-powered real estate listings designed to sell faster.",
    image,
    url,
    type = 'website',
    schema
}) => {
    const siteTitle = "HomeListingAI";
    const fullTitle = title === siteTitle ? title : `${title} | ${siteTitle}`;
    const currentUrl = typeof window !== 'undefined' ? (url || window.location.href) : '';
    const metaDesc = description.substring(0, 160); // Standard SEO length

    return (
        <Helmet>
            {/* Standard Metadata */}
            <title>{fullTitle}</title>
            <meta name="description" content={metaDesc} />

            {/* OpenGraph / Social */}
            <meta property="og:type" content={type} />
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={metaDesc} />
            {currentUrl && <meta property="og:url" content={currentUrl} />}
            {image && <meta property="og:image" content={image} />}

            {/* Twitter Card */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={fullTitle} />
            <meta name="twitter:description" content={metaDesc} />
            {image && <meta name="twitter:image" content={image} />}

            {/* AIO: JSON-LD Structured Data for AI Agents */}
            {schema && (
                <script type="application/ld+json">
                    {JSON.stringify(schema)}
                </script>
            )}
        </Helmet>
    );
};

export default SEO;
