import React from 'react';
import { highlightCards } from './funnelDefaults';

type Section = (typeof highlightCards)[number]['targetSection'];

interface Props { activeSection: Section; onSelect: (section: Section) => void }

// The bottom bar on phones.
const FunnelMobileNav: React.FC<Props> = ({ activeSection, onSelect }) => (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 md:hidden flex justify-around items-center px-2 py-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        {highlightCards.map((card) => {
            const isActive = activeSection === card.targetSection;
            return (
                <button
                    key={card.id}
                    onClick={() => onSelect(card.targetSection)}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all ${isActive ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <span className={`material-symbols-outlined text-2xl mb-0.5 ${isActive ? 'filled' : ''}`}>
                        {card.icon}
                    </span>
                    <span className="text-[10px] font-medium leading-none">
                        {card.title.replace('Live ', '').replace('Engine', '').replace('Sequence ', '')}
                    </span>
                </button>
            );
        })}
    </div>
);

export default FunnelMobileNav;
