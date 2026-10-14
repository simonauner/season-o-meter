'use client';

import { useSyncExternalStore } from 'react';

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

/**
 * A value kept in the current history entry, like how many items of a list
 * are shown. Going back to the page brings it back, while following a link
 * to it starts over. It's null until it has been read in the browser or set.
 */
export const useHistoryState = (key: string) =>
    useSyncExternalStore<unknown>(
        subscribe,
        // The browser keeps the same object until the state is replaced.
        () => history.state?.[key] ?? null,
        () => null
    );

export function setHistoryState(key: string, value: unknown) {
    // Keeps what Next.js keeps there, which it needs to go back.
    history.replaceState({ ...history.state, [key]: value }, '');
    listeners.forEach((listener) => listener());
}
