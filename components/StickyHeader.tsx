'use client';

import { useEffect, useRef, type ReactNode } from 'react';

type StickyHeaderProps = {
    className: string;
    children: ReactNode;
};

// Publishes the header's height as --header-height, which the page uses as
// scroll padding. Next.js only scrolls a new page to the top if its top edge
// isn't already in view, and without the padding a page whose top is hidden
// under the header counts as in view, so it kept the old scroll position.
export function StickyHeader({ className, children }: StickyHeaderProps) {
    const header = useRef<HTMLElement>(null);

    useEffect(() => {
        const element = header.current;
        if (!element) return;
        const root = document.documentElement;
        const publish = () =>
            root.style.setProperty(
                '--header-height',
                `${element.offsetHeight}px`
            );
        publish();
        const observer = new ResizeObserver(publish);
        observer.observe(element);
        return () => {
            observer.disconnect();
            root.style.removeProperty('--header-height');
        };
    }, []);

    return (
        <header ref={header} className={className}>
            {children}
        </header>
    );
}
