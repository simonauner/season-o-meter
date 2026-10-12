/**
 * The visitor's own ratings and watchlist.
 *
 * Every value is stored under its own key together with when it was set, and
 * the latest change to a key wins. That makes two copies, e.g. from two
 * devices, safe to merge in any order without losing changes to different
 * titles or seasons.
 *
 * Keys:
 * - `r:<id>` rates a series (IMDb id), a film series (Wikidata id) or a
 *   movie (IMDb id), 1–10.
 * - `r:<id>/<season>` rates a season of a series, 1–10.
 * - `w:<id>` is 1 when a series or film series is on the watchlist.
 */

/** A value and when it was set (ms since epoch). Null means it was cleared. */
export type Stamped = [value: number | null, updatedAt: number];

export type UserData = Record<string, Stamped>;

export const MIN_RATING = 1;
export const MAX_RATING = 10;

export const ratingKey = (id: string, season?: number) =>
    season === undefined ? `r:${id}` : `r:${id}/${season}`;

export const watchlistKey = (id: string) => `w:${id}`;

export const valueOf = (data: UserData, key: string) => data[key]?.[0] ?? null;

/** Ids of everything rated as a whole or in part, e.g. a single season. */
export function ratedIds(data: UserData) {
    const ids = new Set<string>();
    for (const [key, [value]] of Object.entries(data)) {
        if (value !== null && key.startsWith('r:')) {
            ids.add(key.slice('r:'.length).split('/')[0]);
        }
    }
    return ids;
}

const KEY_PATTERN = /^(r:(tt\d+(\/\d+)?|Q\d+)|w:(tt|Q)\d+)$/;

const isRating = (value: unknown): value is number =>
    Number.isInteger(value) &&
    (value as number) >= MIN_RATING &&
    (value as number) <= MAX_RATING;

const isStamped = (key: string, stamped: unknown): stamped is Stamped => {
    if (!Array.isArray(stamped) || stamped.length !== 2) return false;
    const [value, updatedAt] = stamped as unknown[];
    if (typeof updatedAt !== 'number' || !Number.isFinite(updatedAt)) {
        return false;
    }
    if (value === null) return true;
    return key.startsWith('w:') ? value === 1 : isRating(value);
};

/** Keeps the well-formed entries of untrusted data, e.g. from a link. */
export function sanitize(input: unknown): UserData {
    if (typeof input !== 'object' || input === null) return {};
    return Object.fromEntries(
        Object.entries(input).filter(
            ([key, stamped]) => KEY_PATTERN.test(key) && isStamped(key, stamped)
        )
    );
}

/** Whether `incoming` should replace `current` for the same key. */
const isNewer = (incoming: Stamped, current: Stamped | undefined) =>
    !current || incoming[1] > current[1];

/** Merges `incoming` into `current`. The latest change to each key wins. */
export function merge(current: UserData, incoming: UserData) {
    const merged = { ...current };
    let changed = 0;
    for (const [key, stamped] of Object.entries(incoming)) {
        if (isNewer(stamped, merged[key])) {
            if (merged[key]?.[0] !== stamped[0]) changed++;
            merged[key] = stamped;
        }
    }
    return { merged, changed };
}

/* Share links carry the data, compressed, in the URL fragment. Fragments are
 * never sent to a server, so a shared list stays between the people who have
 * the link. */

const SHARE_VERSION = '1';

export const toBase64Url = (bytes: Uint8Array) => {
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary)
        .replaceAll('+', '-')
        .replaceAll('/', '_')
        .replace(/=+$/, '');
};

const fromBase64Url = (text: string) => {
    const binary = atob(text.replaceAll('-', '+').replaceAll('_', '/'));
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

// slice() copies into a plain ArrayBuffer, which Blob's types ask for.
const transform = (bytes: Uint8Array, stream: TransformStream) =>
    new Response(
        new Blob([bytes.slice()]).stream().pipeThrough(stream)
    ).arrayBuffer();

/** Encodes everything that is set, for a share link. */
export async function encodeShare(data: UserData) {
    const set = Object.fromEntries(
        Object.entries(data).filter(([, [value]]) => value !== null)
    );
    const json = new TextEncoder().encode(JSON.stringify(set));
    const compressed = await transform(
        json,
        new CompressionStream('deflate-raw')
    );
    return SHARE_VERSION + toBase64Url(new Uint8Array(compressed));
}

/** Decodes a share link's fragment, or returns null if it isn't one. */
export async function decodeShare(encoded: string): Promise<UserData | null> {
    if (!encoded.startsWith(SHARE_VERSION)) return null;
    try {
        const json = await transform(
            fromBase64Url(encoded.slice(SHARE_VERSION.length)),
            new DecompressionStream('deflate-raw')
        );
        return sanitize(JSON.parse(new TextDecoder().decode(json)));
    } catch {
        return null;
    }
}
