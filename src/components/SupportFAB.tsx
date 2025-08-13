import React from 'react';

interface SupportFABProps {
  onClick: () => void;
}

const SupportFAB: React.FC<SupportFABProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-8 right-8 z-50 w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-primary-600 shadow-xl flex items-center justify-center text-white transition-transform transform hover:scale-110 animate-pulse-deep"
      aria-label="AI Voice Support"
    >
      <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>mic</span>
    </button>
  );
};

export default SupportFAB;