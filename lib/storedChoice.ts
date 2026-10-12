'use client';

import { useSyncExternalStore } from 'react';

/**
 * A page-wide choice, like a filter, that is remembered in the browser and
 * kept in step between components and open tabs.
 */
export function storedChoice<T extends string | number>(
    storageKey: string,
    options: readonly T[],
    defaultValue: T
) {
    const listeners = new Set<() => void>();

    /** The latest choice, for when storage is blocked. */
    let chosen: T | null = null;

    function subscribe(listener: () => void) {
        listeners.add(listener);
        // Keeps other open tabs in step.
        window.addEventListener('storage', listener);
        return () => {
            listeners.delete(listener);
            window.removeEventListener('storage', listener);
        };
    }

    function getSnapshot(): T {
        try {
            const stored = localStorage.getItem(storageKey);
            const match = options.find((option) => String(option) === stored);
            if (match !== undefined) return match;
        } catch {
            // Storage can be blocked, e.g. in private windows.
        }
        return chosen ?? defaultValue;
    }

    function set(value: T) {
        chosen = value;
        try {
            localStorage.setItem(storageKey, String(value));
        } catch {
            // The choice then only lasts until the page is reloaded.
        }
        listeners.forEach((listener) => listener());
    }

    /** The visitor's choice, or null until it has been read in the browser. */
    const useStoredChoice = () =>
        useSyncExternalStore<T | null>(subscribe, getSnapshot, () => null);

    /** The visitor's choice, or the default until it has been read. */
    const useChoice = () => useStoredChoice() ?? defaultValue;

    return { set, useStoredChoice, useChoice };
}
