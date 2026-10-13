/**
 * Pairing codes connect a new device to a synced list when typing is easier
 * than moving a link. The new device gets a code of two short words, like
 * `brave-otter`, and someone enters it on a device that already syncs, which
 * then hands the new device the list's secret through the sync server.
 *
 * There are only 256 × 256 codes, so the code can't protect the secret on
 * its own. The secret only goes where someone typed the code, and it goes
 * encrypted for a key that only the waiting device has (`newPairingKeys`).
 * Guessing a code at most connects a stranger's new device to the guesser's
 * own list. Codes last ten minutes.
 */

import { ADJECTIVES, NOUNS } from './pairingWords';
import { fromBase64Url, toBase64Url } from './userData';

export const PAIRING_CODE_TTL_MS = 10 * 60_000;

/** A uniformly random integer from 0 up to, but not including, `max`. */
function randomBelow(max: number) {
    const limit = 2 ** 32 - (2 ** 32 % max);
    for (;;) {
        const [n] = crypto.getRandomValues(new Uint32Array(1));
        if (n < limit) return n % max;
    }
}

export const newPairingCode = () =>
    `${ADJECTIVES[randomBelow(ADJECTIVES.length)]}-${NOUNS[randomBelow(NOUNS.length)]}`;

const adjectives = new Set<string>(ADJECTIVES);
const nouns = new Set<string>(NOUNS);

/**
 * A code as typed, in its usual form, or null if it isn't one. Case,
 * spaces and missing hyphens don't matter, so `Brave Otter` and
 * `braveotter` both work.
 */
export function parsePairingCode(input: string): string | null {
    const text = input.toLowerCase();
    if (/[0-9]/.test(text)) return null;
    const letters = (text.match(/[a-z]+/g) ?? []).join('');
    // No adjective and noun run together can be read as another pair
    // (lib/pairingWords.ts), so the first split that works is the one.
    for (let i = 1; i < letters.length; i++) {
        const adjective = letters.slice(0, i);
        const noun = letters.slice(i);
        if (adjectives.has(adjective) && nouns.has(noun)) {
            return `${adjective}-${noun}`;
        }
    }
    return null;
}

/* Handing the secret over, readable only by the waiting device. */

const ECDH = { name: 'ECDH', namedCurve: 'P-256' } as const;

/** An uncompressed P-256 public key, base64url-encoded. */
const PUBLIC_KEY = /^[A-Za-z0-9_-]{87}$/;

export const isPublicKey = (value: unknown): value is string =>
    typeof value === 'string' && PUBLIC_KEY.test(value);

/** A secret encrypted for one device's public key. */
export type Sealed = { publicKey: string; iv: string; data: string };

/** A key pair for one pairing. The private key never leaves the browser. */
export async function newPairingKeys() {
    const keys = (await crypto.subtle.generateKey(ECDH, false, [
        'deriveBits',
    ])) as CryptoKeyPair;
    const raw = await crypto.subtle.exportKey('raw', keys.publicKey);
    return {
        privateKey: keys.privateKey,
        publicKey: toBase64Url(new Uint8Array(raw as ArrayBuffer)),
    };
}

async function sharedKey(privateKey: CryptoKey, publicKey: string) {
    const peer = await crypto.subtle.importKey(
        'raw',
        fromBase64Url(publicKey),
        ECDH,
        false,
        []
    );
    // Not inline: the Workers types call `public` `$public`, which the
    // runtime doesn't read.
    const params = { name: 'ECDH', public: peer };
    const bits = await crypto.subtle.deriveBits(params, privateKey, 256);
    const hkdf = await crypto.subtle.importKey('raw', bits, 'HKDF', false, [
        'deriveKey',
    ]);
    return crypto.subtle.deriveKey(
        {
            name: 'HKDF',
            hash: 'SHA-256',
            salt: new Uint8Array(),
            info: new TextEncoder().encode('season-o-meter pairing'),
        },
        hkdf,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

/** Encrypts a secret so that only the holder of `publicKey` can read it. */
export async function sealSecret(
    publicKey: string,
    secret: string
): Promise<Sealed> {
    const ephemeral = await newPairingKeys();
    const key = await sharedKey(ephemeral.privateKey, publicKey);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        new TextEncoder().encode(secret)
    );
    return {
        publicKey: ephemeral.publicKey,
        iv: toBase64Url(iv),
        data: toBase64Url(new Uint8Array(data)),
    };
}

/** Decrypts a secret sealed for this device. */
export async function openSecret(privateKey: CryptoKey, sealed: Sealed) {
    const key = await sharedKey(privateKey, sealed.publicKey);
    const plaintext = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: fromBase64Url(sealed.iv) },
        key,
        fromBase64Url(sealed.data)
    );
    return new TextDecoder().decode(plaintext);
}
