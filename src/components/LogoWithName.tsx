import React from 'react';
import { Logo } from './Logo';

interface LogoWithNameProps {
  className?: string;
  textClassName?: string;
}

export const LogoWithName: React.FC<LogoWithNameProps> = ({ className, textClassName = 'text-slate-800' }) => {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Logo className="h-8 w-8" />
      <span className={`text-xl font-bold tracking-tight ${textClassName}`}>HomeListingAI</span>
    </div>
  );
};

