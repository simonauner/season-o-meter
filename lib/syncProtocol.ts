/**
 * How the site and the sync server (sync/) talk.
 *
 * A synced list has a secret, which lets devices read and change it, and a
 * list id derived from the secret, which only lets people read it. The server
 * stores lists by id, so it never stores a secret. Pairing codes
 * (lib/pairingCode.ts) pass a secret on encrypted for the receiving device.
 */

import type { Sealed } from './pairingCode';
import { toBase64Url, type UserData } from './userData';

/** 128 random bits, base64url-encoded. List ids have the same shape. */
const TOKEN = /^[A-Za-z0-9_-]{22}$/;

export const isSecret = (value: unknown): value is string =>
    typeof value === 'string' && TOKEN.test(value);

export const isListId = isSecret;

export const newSecret = () =>
    toBase64Url(crypto.getRandomValues(new Uint8Array(16)));

/** The read-only id of the list a secret belongs to. */
export async function listIdFor(secret: string) {
    const hash = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(secret)
    );
    return toBase64Url(new Uint8Array(hash).slice(0, 16));
}

/**
 * POST /v1/sync with `Authorization: Bearer <secret>`.
 *
 * Sends the device's changes and gets back everything that changed on the
 * server since `since`, the cursor from the device's previous sync.
 */
export type SyncRequest = { since: number; changes: UserData };

export type SyncResponse = { cursor: number; changes: UserData };

/** GET /v1/lists/<list id>: everything that is set. */
export type ListResponse = { data: UserData };

/**
 * POST /v1/pair from a device that wants to connect, with the public key
 * the secret should be sealed for. `ticket` lets only that device collect
 * the secret. `expiresIn` is in milliseconds, so device clocks don't matter.
 * 429 if the device's network has too many codes waiting, 503 if everyone
 * has.
 */
export type PairRequest = { publicKey: string };

export type PairResponse = { code: string; ticket: string; expiresIn: number };

/**
 * POST /v1/pair/approve with `Authorization: Bearer <secret>`, from a device
 * that syncs: seals the secret for the device waiting with `code`. 404 if no
 * device is waiting with it, 429 after too many tries.
 */
export type ApproveRequest = { code: string };

/**
 * POST /v1/pair/wait from the waiting device: the sealed secret once the
 * code has been entered, and null until then. 404 once the code expires.
 * POST /v1/pair/cancel with the same body forgets the code, once the device
 * has connected or stops waiting.
 */
export type WaitRequest = { ticket: string };

export type WaitResponse = { sealed: Sealed | null };
