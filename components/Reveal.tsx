'use client';

import { type ReactNode, useState, useSyncExternalStore } from 'react';
import css from './reveal.module.css';

// Being in the browser never changes, so there is nothing to subscribe to.
const subscribeNever = () => () => {};

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
    const [hydrating] = useState(!inBrowser);

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
