import React from 'react';

export const StripeLogo: React.FC<{ className?: string }> = ({ className = "h-6" }) => (
    <img
        src="/stripe-badge.png"
        alt="Stripe Security Badge"
        className={`${className} object-contain inline-block rounded-sm`}
    />
);
