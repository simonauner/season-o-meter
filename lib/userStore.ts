'use client';

import { useSyncExternalStore } from 'react';
import { merge, sanitize, type Stamped, type UserData } from './userData';

const STORAGE_KEY = 'season-o-meter:mine';

const listeners = new Set<() => void>();

/** Told about changes made on this device, but not ones from sync. */
const localChangeListeners = new Set<() => void>();

/** The parsed copy of what's stored, reused while the stored text is the same. */
let cache: { raw: string | null; data: UserData } = { raw: null, data: {} };

/** Used instead when storage is blocked, e.g. in some private windows. */
let fallback: UserData | null = null;

function subscribe(listener: () => void) {
    listeners.add(listener);
    // Keeps other open tabs in step.
    window.addEventListener('storage', listener);
    return () => {
        listeners.delete(listener);
        window.removeEventListener('storage', listener);
    };
}

export function onLocalChange(listener: () => void) {
    localChangeListeners.add(listener);
    return () => {
        localChangeListeners.delete(listener);
    };
}

function read(): UserData {
    if (fallback) return fallback;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw !== cache.raw) {
            let parsed: unknown = {};
            try {
                parsed = JSON.parse(raw ?? '{}');
            } catch {
                // Unreadable data is treated as empty rather than breaking pages.
            }
            cache = { raw, data: sanitize(parsed) };
        }
    } catch {
        // Storage is blocked; keep whatever was read before.
    }
    return cache.data;
}

function write(data: UserData, { fromSync = false } = {}) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
        // Then it only lasts until the page is reloaded.
        fallback = data;
    }
    listeners.forEach((listener) => listener());
    if (!fromSync) localChangeListeners.forEach((listener) => listener());
}

/** Everything stored, read outside React. */
export const getUserData = read;

/** Sets values, or clears them with null. */
export function setValues(changes: Record<string, Stamped[0]>) {
    const now = Date.now();
    const data = { ...read() };
    for (const [key, value] of Object.entries(changes)) {
        data[key] = [value, now];
    }
    write(data);
}

export const setValue = (key: string, value: Stamped[0]) =>
    setValues({ [key]: value });

/** Merges data from elsewhere and returns how many values changed. */
export function importData(incoming: UserData, { fromSync = false } = {}) {
    const { merged, changed } = merge(read(), incoming);
    if (changed > 0) write(merged, { fromSync });
    return changed;
}

/** The visitor's data, or null until it has been read in the browser. */
export const useUserData = () =>
    useSyncExternalStore<UserData | null>(subscribe, read, () => null);
