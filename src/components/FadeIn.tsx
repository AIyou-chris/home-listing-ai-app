import React, { useEffect, useRef, useState } from 'react';

interface FadeInProps {
    children: React.ReactNode;
    delay?: number;
    className?: string;
    direction?: 'up' | 'left' | 'right' | 'none';
}

export const FadeIn: React.FC<FadeInProps> = ({
    children,
    delay = 0,
    className = '',
    direction = 'up'
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const domRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(entries => {
            // Only trigger once
            if (entries[0].isIntersecting) {
                setIsVisible(true);
                observer.unobserve(entries[0].target);
            }
        }, {
            threshold: 0.1,
            rootMargin: '50px'
        });

        const currentRef = domRef.current;
        if (currentRef) {
            observer.observe(currentRef);
        }

        return () => {
            if (currentRef) {
                observer.unobserve(currentRef);
            }
        };
    }, []);

    let transformClass = '';
    switch (direction) {
        case 'up': transformClass = 'translate-y-8'; break;
        case 'left': transformClass = '-translate-x-8'; break;
        case 'right': transformClass = 'translate-x-8'; break;
        case 'none': transformClass = ''; break;
    }

    return (
        <div
            ref={domRef}
            className={`transition-all duration-700 ease-out ${isVisible ? 'opacity-100 transform-none' : 'opacity-0 motion-safe:' + transformClass} ${className}`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            {children}
        </div>
    );
};
