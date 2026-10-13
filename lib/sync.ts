'use client';

import { useSyncExternalStore } from 'react';
import { newPairingKeys, openSecret } from './pairingCode';
import {
    isSecret,
    listIdFor,
    newSecret,
    type ApproveRequest,
    type ListResponse,
    type PairRequest,
    type PairResponse,
    type SyncRequest,
    type SyncResponse,
    type WaitRequest,
    type WaitResponse,
} from './syncProtocol';
import { sanitize } from './userData';
import { getUserData, importData, onLocalChange } from './userStore';

/** The sync server (sync/). Without it, sync isn't offered. */
const SYNC_URL = process.env.NEXT_PUBLIC_SYNC_URL ?? '';

export const syncAvailable = SYNC_URL !== '';

const STATE_KEY = 'season-o-meter:sync';

/** Wait this long after a change, so a burst of changes syncs once. */
const PUSH_DELAY_MS = 1000;
/** Look for changes from other devices this often while the page is visible. */
const PULL_INTERVAL_MS = 60_000;

type SyncState = {
    secret: string;
    /** Where the previous sync left off on the server. */
    cursor: number;
    /** When this device last changed something. */
    changedAt: number;
    /** The `changedAt` that the latest successful sync sent. */
    pushedAt: number;
};

function readState(): SyncState | null {
    try {
        const state = JSON.parse(localStorage.getItem(STATE_KEY) ?? 'null');
        return isSecret(state?.secret) ? state : null;
    } catch {
        return null;
    }
}

function writeState(state: SyncState | null) {
    try {
        if (state) localStorage.setItem(STATE_KEY, JSON.stringify(state));
        else localStorage.removeItem(STATE_KEY);
    } catch {
        // Sync then can't be turned on, which the status shows.
    }
    notify();
}

/* Status for the UI. */

export type SyncStatus = {
    /** Null when this device doesn't sync. */
    secret: string | null;
    phase: 'idle' | 'syncing' | 'failed';
};

const listeners = new Set<() => void>();
let phase: SyncStatus['phase'] = 'idle';
let status: SyncStatus = { secret: null, phase };

function notify() {
    listeners.forEach((listener) => listener());
}

function setPhase(next: SyncStatus['phase']) {
    phase = next;
    notify();
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    // Another tab can turn sync on or off.
    window.addEventListener('storage', listener);
    return () => {
        listeners.delete(listener);
        window.removeEventListener('storage', listener);
    };
}

function getStatus(): SyncStatus {
    const secret = readState()?.secret ?? null;
    if (status.secret !== secret || status.phase !== phase) {
        status = { secret, phase };
    }
    return status;
}

/** Sync status, or null until it has been read in the browser. */
export const useSyncStatus = () =>
    useSyncExternalStore<SyncStatus | null>(subscribe, getStatus, () => null);

/* Syncing. */

let running: Promise<void> | null = null;
let runAgain = false;

/** Sends this device's changes, if any, and fetches other devices'. */
export function syncNow(): Promise<void> {
    if (running) {
        runAgain = true;
        return running;
    }
    running = run().finally(() => {
        running = null;
        if (runAgain) {
            runAgain = false;
            syncNow();
        }
    });
    return running;
}

async function run() {
    const state = readState();
    if (!state || !syncAvailable) return;
    setPhase('syncing');
    try {
        const request: SyncRequest = {
            since: state.cursor,
            // Everything, not just what changed, so nothing can be missed.
            // The server only keeps what's newer than what it has.
            changes: state.changedAt > state.pushedAt ? getUserData() : {},
        };
        const res = await fetch(`${SYNC_URL}/v1/sync`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${state.secret}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const response = (await res.json()) as SyncResponse;

        // Sync may have been turned off, or changes made, in the meantime.
        const latest = readState();
        if (latest?.secret !== state.secret) return;
        importData(sanitize(response.changes), { fromSync: true });
        writeState({
            ...latest,
            cursor: response.cursor,
            pushedAt: state.changedAt,
        });
        setPhase('idle');
    } catch {
        setPhase('failed');
    }
}

/** Keeps this device in sync while the site is open. Returns a cleanup. */
export function startSync() {
    if (!syncAvailable) return () => {};

    let timer: ReturnType<typeof setTimeout> | undefined;
    const stopListening = onLocalChange(() => {
        const state = readState();
        if (!state) return;
        writeState({ ...state, changedAt: Date.now() });
        clearTimeout(timer);
        timer = setTimeout(syncNow, PUSH_DELAY_MS);
    });

    const syncIfVisible = () => {
        if (document.visibilityState === 'visible') syncNow();
    };
    document.addEventListener('visibilitychange', syncIfVisible);
    window.addEventListener('online', syncIfVisible);
    const interval = setInterval(syncIfVisible, PULL_INTERVAL_MS);
    syncNow();

    return () => {
        stopListening();
        clearTimeout(timer);
        clearInterval(interval);
        document.removeEventListener('visibilitychange', syncIfVisible);
        window.removeEventListener('online', syncIfVisible);
    };
}

/**
 * Connects this device to a synced list, or starts a new one. What's on the
 * device is merged with what's in the list.
 */
export function connect(secret = newSecret()) {
    writeState({ secret, cursor: 0, changedAt: Date.now(), pushedAt: 0 });
    return syncNow();
}

/** A device waiting for a device that syncs to enter its pairing code. */
export type Pairing = {
    code: string;
    ticket: string;
    /** By this device's clock. */
    expiresAt: number;
    privateKey: CryptoKey;
};

/** Gets a pairing code for this device to show. */
export async function startPairing(): Promise<
    Pairing | 'too-many' | 'busy' | 'failed'
> {
    try {
        const { privateKey, publicKey } = await newPairingKeys();
        const request: PairRequest = { publicKey };
        const res = await fetch(`${SYNC_URL}/v1/pair`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request),
        });
        if (res.status === 429) return 'too-many';
        if (res.status === 503) return 'busy';
        if (!res.ok) return 'failed';
        const { code, ticket, expiresIn } = (await res.json()) as PairResponse;
        return { code, ticket, expiresAt: Date.now() + expiresIn, privateKey };
    } catch {
        return 'failed';
    }
}

/**
 * Whether the code has been entered yet, and the list's secret if it has.
 * Throws if the server can't be reached.
 */
export async function collectPairing(
    pairing: Pairing
): Promise<'waiting' | 'expired' | { secret: string }> {
    const request: WaitRequest = { ticket: pairing.ticket };
    const res = await fetch(`${SYNC_URL}/v1/pair/wait`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
    });
    if (res.status === 404) return 'expired';
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { sealed } = (await res.json()) as WaitResponse;
    if (!sealed) return 'waiting';
    const secret = await openSecret(pairing.privateKey, sealed);
    if (!isSecret(secret)) throw new Error('Not a secret');
    return { secret };
}

/** Tells the server to forget a code. Best effort, even as the page closes. */
export function cancelPairing(pairing: Pairing) {
    const request: WaitRequest = { ticket: pairing.ticket };
    fetch(`${SYNC_URL}/v1/pair/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        keepalive: true,
    }).catch(() => {});
}

export type ApproveResult = 'approved' | 'unknown' | 'too-many' | 'failed';

/** Connects the device that shows `code` to this device's list. */
export async function approvePairing(
    secret: string,
    code: string
): Promise<ApproveResult> {
    try {
        const request: ApproveRequest = { code };
        const res = await fetch(`${SYNC_URL}/v1/pair/approve`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${secret}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
        });
        if (res.status === 404) return 'unknown';
        if (res.status === 429) return 'too-many';
        return res.ok ? 'approved' : 'failed';
    } catch {
        return 'failed';
    }
}

/** Stops syncing. What's on the device stays. */
export function disconnect() {
    writeState(null);
    setPhase('idle');
}

const siteUrl = (path: string) =>
    `${location.origin}${process.env.NEXT_PUBLIC_BASE_PATH}${path}`;

/** Opening this on another device connects it to the list. */
export const syncLink = (secret: string) => siteUrl(`/mine/#sync=${secret}`);

/** A read-only link that always shows the list as it is now. */
export const liveShareLink = async (secret: string) =>
    siteUrl(`/shared/#list=${await listIdFor(secret)}`);

/** Fetches a list for a read-only link. */
export async function fetchList(listId: string) {
    const res = await fetch(`${SYNC_URL}/v1/lists/${listId}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return sanitize(((await res.json()) as ListResponse).data);
}
