import React from 'react';

export const BackgroundTechIcons: React.FC = () => {
    // A collection of tech-oriented material icons to drift in the background
    const icons = ["smart_toy", "radar", "data_usage", "auto_graph", "memory", "settings_system_daydream", "network_node", "online_prediction"];

    // We want these icons to be ultra faint and float around slightly.
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
            {/* Respects prefers-reduced-motion via the motion-safe tailwind utility in custom CSS or standard tailwind if available */}
            {icons.map((icon, idx) => {
                // Randomize positions, sizes, and animation delay consistently based on index
                const top = `${(idx * 17) % 80 + 10}%`;
                const left = `${(idx * 23) % 80 + 10}%`;
                const delay = `${idx * 0.5}s`;
                const duration = `${15 + (idx % 3) * 5}s`;

                return (
                    <div
                        key={idx}
                        className="absolute opacity-[0.03] lg:opacity-[0.05] flex items-center justify-center animate-drift"
                        style={{
                            top,
                            left,
                            animationDelay: delay,
                            animationDuration: duration,
                        }}
                    >
                        <span className="material-symbols-outlined text-[6rem] lg:text-[10rem] text-cyan-500">
                            {icon}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};
