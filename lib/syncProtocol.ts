/**
 * How the site and the sync server (sync/) talk.
 *
 * A synced list has a secret, which lets devices read and change it, and a
 * list id derived from the secret, which only lets people read it. The server
 * stores lists by id, so it never stores a secret.
 */

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
