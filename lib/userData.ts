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
 * - `s:<id>` is 1 when a series or film series was skipped in Swipe, so it
 *   isn't shown there again.
 * - `f:<list id>` is a friend's synced list, to compare ratings with. The
 *   value is the name the visitor gave them.
 */

/** A value and when it was set (ms since epoch). Null means it was cleared. */
export type Stamped = [value: number | string | null, updatedAt: number];

export type UserData = Record<string, Stamped>;

export const MIN_RATING = 1;
export const MAX_RATING = 10;

export const ratingKey = (id: string, season?: number) =>
    season === undefined ? `r:${id}` : `r:${id}/${season}`;

export const watchlistKey = (id: string) => `w:${id}`;

export const friendKey = (listId: string) => `f:${listId}`;

export const skipKey = (id: string) => `s:${id}`;

export const MAX_NAME_LENGTH = 40;

/** A rating or watchlist value, or null if there's none. */
export const valueOf = (data: UserData, key: string) => {
    const value = data[key]?.[0];
    return typeof value === 'number' ? value : null;
};

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

/** Ids of everything with the value 1 under a prefix, like `w:`. */
export function flaggedIds(data: UserData, prefix: 'w:' | 's:') {
    const ids = new Set<string>();
    for (const [key, [value]] of Object.entries(data)) {
        if (value === 1 && key.startsWith(prefix)) {
            ids.add(key.slice(prefix.length));
        }
    }
    return ids;
}

// A list id has the same shape as a secret (lib/syncProtocol.ts).
const KEY_PATTERN =
    /^(r:(tt\d+(\/\d+)?|Q\d+)|[ws]:(tt|Q)\d+|f:[A-Za-z0-9_-]{22})$/;

const isRating = (value: unknown): value is number =>
    Number.isInteger(value) &&
    (value as number) >= MIN_RATING &&
    (value as number) <= MAX_RATING;

const isName = (value: unknown): value is string =>
    typeof value === 'string' &&
    value === value.trim() &&
    value.length > 0 &&
    value.length <= MAX_NAME_LENGTH;

const isStamped = (key: string, stamped: unknown): stamped is Stamped => {
    if (!Array.isArray(stamped) || stamped.length !== 2) return false;
    const [value, updatedAt] = stamped as unknown[];
    if (typeof updatedAt !== 'number' || !Number.isFinite(updatedAt)) {
        return false;
    }
    if (value === null) return true;
    if (key.startsWith('f:')) return isName(value);
    return key.startsWith('r:') ? isRating(value) : value === 1;
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

/**
 * What others may see of a list: everything that is set, except friends and
 * skips. A friend's list id lets anyone read their list, and they only gave
 * it to the visitor. Skips are only for the visitor's own Swipe.
 */
export const shareable = (data: UserData): UserData =>
    Object.fromEntries(
        Object.entries(data).filter(
            ([key, [value]]) =>
                value !== null && !key.startsWith('f:') && !key.startsWith('s:')
        )
    );

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

export const fromBase64Url = (text: string) => {
    const binary = atob(text.replaceAll('-', '+').replaceAll('_', '/'));
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

// slice() copies into a plain ArrayBuffer, which Blob's types ask for.
const transform = (bytes: Uint8Array, stream: TransformStream) =>
    new Response(
        new Blob([bytes.slice()]).stream().pipeThrough(stream)
    ).arrayBuffer();

/** Encodes what others may see, for a share link. */
export async function encodeShare(data: UserData) {
    const json = new TextEncoder().encode(JSON.stringify(shareable(data)));
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
        return shareable(sanitize(JSON.parse(new TextDecoder().decode(json))));
    } catch {
        return null;
    }
}
