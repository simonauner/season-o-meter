/**
 * A recovery key is a synced list's secret written so that it can be copied
 * by hand, like 7KQM-3XF2-…: 28 characters of Crockford's base32 in groups of
 * four. They hold the secret's 128 bits and 10 bits that check them, so a
 * mistyped key is turned down instead of connecting to a new, empty list.
 * The alphabet has no I, L, O or U, and I and L are read as 1 and O as 0.
 */

import { isSecret } from './syncProtocol';
import { fromBase64Url, toBase64Url } from './userData';

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const SECRET_BYTES = 16;
const CHECK_BITS = 10;
/** 128 + 10 bits, and 2 zero bits to fill the last character. */
const LENGTH = 28;
const GROUP = 4;

/** Bits from FNV-1a over the secret's bytes. */
function check(bytes: Uint8Array) {
    let hash = 0x811c9dc5;
    for (const byte of bytes) hash = Math.imul(hash ^ byte, 0x01000193);
    return (hash >>> 0) % 2 ** CHECK_BITS;
}

const bitsOf = (value: number, width: number) =>
    value.toString(2).padStart(width, '0');

/** The recovery key for a secret. */
export function recoveryKey(secret: string) {
    const bytes = fromBase64Url(secret);
    const bits = [...bytes, check(bytes)]
        .map((value, i) => bitsOf(value, i < bytes.length ? 8 : CHECK_BITS))
        .join('')
        .padEnd(LENGTH * 5, '0');
    let key = '';
    for (let i = 0; i < LENGTH; i++) {
        if (i > 0 && i % GROUP === 0) key += '-';
        key += ALPHABET[parseInt(bits.slice(i * 5, i * 5 + 5), 2)];
    }
    return key;
}

/** The secret in a recovery key, or null if it isn't one. */
function secretFromKey(input: string): string | null {
    const text = input
        .toUpperCase()
        .replace(/[\s-]/g, '')
        .replace(/[IL]/g, '1')
        .replace(/O/g, '0');
    if (text.length !== LENGTH) return null;
    let bits = '';
    for (const char of text) {
        const value = ALPHABET.indexOf(char);
        if (value < 0) return null;
        bits += bitsOf(value, 5);
    }
    const bytes = Uint8Array.from({ length: SECRET_BYTES }, (_, i) =>
        parseInt(bits.slice(i * 8, i * 8 + 8), 2)
    );
    const end = SECRET_BYTES * 8;
    const checked = parseInt(bits.slice(end, end + CHECK_BITS), 2);
    if (check(bytes) !== checked || /1/.test(bits.slice(end + CHECK_BITS))) {
        return null;
    }
    return toBase64Url(bytes);
}

/**
 * The secret in what someone entered to get their list back: a recovery
 * key, or a private sync link, which people may have kept instead.
 */
export function secretFromInput(input: string): string | null {
    const text = input.trim();
    const link = /#sync=([A-Za-z0-9_-]+)/.exec(text);
    if (link) return isSecret(link[1]) ? link[1] : null;
    return secretFromKey(text);
}
