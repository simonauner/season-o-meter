'use client';

import { deleteSyncedList, disconnect, syncAvailable } from './sync';

/** Every key the site keeps in localStorage starts with this. */
const STORAGE_PREFIX = 'season-o-meter:';

/**
 * Removes everything the site keeps in this browser. A synced list stays on
 * the sync server, so its recovery key brings it back.
 */
export function forgetThisBrowser() {
    disconnect();
    try {
        for (const key of Object.keys(localStorage)) {
            if (key.startsWith(STORAGE_PREFIX)) localStorage.removeItem(key);
        }
    } catch {
        // Storage is blocked, so everything is only kept in memory, which a
        // reload forgets.
        location.reload();
        return;
    }
    // Removing keys tells other tabs, but not this one. Every store listens
    // for this, and a storage event without a key means everything changed.
    window.dispatchEvent(new StorageEvent('storage'));
}

/**
 * Deletes everything the site keeps about the visitor: the synced list on
 * the sync server, if this device syncs, and everything in this browser.
 * Throws, having deleted nothing, if the sync server can't be reached, so
 * the list is never left on the server with no device that can delete it.
 */
export async function deleteEverything(secret: string | null) {
    if (secret && syncAvailable) await deleteSyncedList(secret);
    forgetThisBrowser();
}
