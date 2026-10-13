'use client';

import { useSyncExternalStore } from 'react';

/**
 * Tips that point out how something works, like the arrow keys in Swipe.
 * Each goes away once it has been put to use, and can be brought back on the
 * profile page. Kept per browser, as they're about the device being used.
 */
export type Tip = 'swipe-skip-key' | 'swipe-save-key';

const STORAGE_KEY = 'season-o-meter:tips-seen';

const listeners = new Set<() => void>();

/** The parsed copy of what's stored, reused while the stored text is the same. */
let cache: { raw: string | null; seen: readonly string[] } = {
    raw: null,
    seen: [],
};

/** Used instead when storage is blocked, e.g. in some private windows. */
let fallback: readonly string[] | null = null;

function subscribe(listener: () => void) {
    listeners.add(listener);
    // Keeps other open tabs in step.
    window.addEventListener('storage', listener);
    return () => {
        listeners.delete(listener);
        window.removeEventListener('storage', listener);
    };
}

function read(): readonly string[] {
    if (fallback) return fallback;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw !== cache.raw) {
            let parsed: unknown = [];
            try {
                parsed = JSON.parse(raw ?? '[]');
            } catch {
                // Unreadable data is treated as nothing seen.
            }
            const seen = Array.isArray(parsed)
                ? parsed.filter((tip) => typeof tip === 'string')
                : [];
            cache = { raw, seen };
        }
    } catch {
        // Storage is blocked; keep whatever was read before.
    }
    return cache.seen;
}

function write(seen: readonly string[]) {
    try {
        if (seen.length) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(seen));
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
    } catch {
        // Then it only lasts until the page is reloaded.
        fallback = seen;
    }
    listeners.forEach((listener) => listener());
}

/** Hides a tip, now that it has been put to use. */
export function markTipSeen(tip: Tip) {
    const seen = read();
    if (!seen.includes(tip)) write([...seen, tip]);
}

/** Brings every tip back. */
export const resetTips = () => write([]);

const useSeen = () =>
    useSyncExternalStore<readonly string[] | null>(subscribe, read, () => null);

/** Whether a tip should be shown, or null until it has been read. */
export function useTip(tip: Tip): boolean | null {
    const seen = useSeen();
    return seen && !seen.includes(tip);
}

/** How many tips have gone away, or null until it has been read. */
export const useSeenTipCount = () => useSeen()?.length ?? null;
