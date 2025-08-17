import React, { useState, useEffect } from 'react';

interface CollapsibleCardProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  className?: string;
  icon?: string;
  badge?: string;
  defaultOpen?: boolean;
}

const CollapsibleCard: React.FC<CollapsibleCardProps> = ({ 
  title, 
  children, 
  defaultExpanded = false,
  className = '',
  icon,
  badge,
  defaultOpen
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultOpen || defaultExpanded);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-collapse on mobile
  useEffect(() => {
    if (isMobile && isExpanded) {
      setIsExpanded(false);
    }
  }, [isMobile]);

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ${className}`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon && (
            <span className="material-symbols-outlined text-slate-600">{icon}</span>
          )}
          <h3 className="font-semibold text-slate-800">{title}</h3>
          {badge && (
            <span className="px-2 py-1 text-xs font-medium bg-primary-100 text-primary-700 rounded-full">
              {badge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`material-symbols-outlined text-slate-500 transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}>
            expand_more
          </span>
        </div>
      </button>

      {/* Content */}
      <div className={`transition-all duration-300 ease-in-out ${
        isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
      }`}>
        <div className="px-6 pb-4">
          {children}
        </div>
      </div>
    </div>
  );
};

export default CollapsibleCard;
