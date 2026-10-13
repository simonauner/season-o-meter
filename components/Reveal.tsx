'use client';

import {
    type ReactNode,
    useEffect,
    useState,
    useSyncExternalStore,
} from 'react';
import css from './reveal.module.css';

// Being in the browser never changes, so there is nothing to subscribe to.
const subscribeNever = () => () => {};

/** Long enough for the last element to have slid in. */
const REVEAL_MS = 1000;

/**
 * Keeps a page's content hidden until it has hydrated, so the visitor's
 * stored choices (whether the hero is shown, the filters) are known before
 * anything is drawn, then slides it in. After a navigation within the site
 * they are known at once, so it is shown straight away.
 */
export function Reveal({ children }: { children: ReactNode }) {
    const inBrowser = useSyncExternalStore(
        subscribeNever,
        () => true,
        () => false
    );
    // Only the first render while hydrating comes before the browser's.
    const [hydrating, setHydrating] = useState(!inBrowser);

    // Then lets what appears later, like the heading once the welcome is
    // closed, come in its own way.
    useEffect(() => {
        if (!hydrating) return;
        const timer = setTimeout(() => setHydrating(false), REVEAL_MS);
        return () => clearTimeout(timer);
    }, [hydrating]);

    return (
        <div
            className={css.reveal}
            data-reveal={!inBrowser ? 'hidden' : hydrating ? 'in' : undefined}
        >
            {children}
            {/* Without JavaScript the page never hydrates. */}
            <noscript
                dangerouslySetInnerHTML={{
                    __html: `<style>.${css.reveal}{visibility:visible!important}</style>`,
                }}
            />
        </div>
    );
}
