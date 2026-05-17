import React from 'react';
import { Logo } from './Logo';
import { useOfficeBrand } from '../hooks/useOfficeBrand';

interface LogoWithNameProps {
  className?: string;
  textClassName?: string;
}

export const LogoWithName: React.FC<LogoWithNameProps> = ({ className, textClassName = 'text-slate-800' }) => {
  const brand = useOfficeBrand();

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {brand.whiteLabel && brand.logoUrl ? (
        <img src={brand.logoUrl} alt={brand.companyName || 'Office logo'} className="h-8 w-8 rounded object-contain" />
      ) : (
        <Logo className="h-8 w-8" />
      )}
      <span className={`text-xl font-bold tracking-tight ${textClassName}`}>
        {brand.whiteLabel && brand.companyName ? brand.companyName : 'HomeListingAI'}
      </span>
    </div>
  );
};
