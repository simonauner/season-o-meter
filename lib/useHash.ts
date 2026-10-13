'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';

function subscribeToHash(listener: () => void) {
    window.addEventListener('hashchange', listener);
    return () => window.removeEventListener('hashchange', listener);
}

/** The URL fragment without #, or null until it has been read in the browser. */
export const useHash = () =>
    useSyncExternalStore(
        subscribeToHash,
        () => location.hash.slice(1),
        () => null
    );

/**
 * Whether the URL fragment is `#name`, once `ready`, and a ref to the element
 * it points to, which is then scrolled smoothly into view.
 *
 * The element shouldn't have `name` as its id: the browser and Next.js jump
 * straight to an element with the fragment's id, so the scroll wouldn't be
 * smooth. Panels that show up late would be missed by them anyway.
 */
export function usePointedTo<T extends HTMLElement>(
    name: string,
    ready = true
) {
    const ref = useRef<T>(null);
    const pointedTo = useHash() === name && ready;

    useEffect(() => {
        if (pointedTo) {
            ref.current?.scrollIntoView({
                behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
                    ? 'auto'
                    : 'smooth',
                block: 'center',
            });
        }
    }, [pointedTo]);

    return { ref, pointedTo };
}

/** Removes the fragment from the URL without adding a history entry. */
export function clearHash() {
    history.replaceState(null, '', location.pathname + location.search);
    // replaceState doesn't fire hashchange on its own.
    window.dispatchEvent(new HashChangeEvent('hashchange'));
}
