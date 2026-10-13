import { hashUnit } from './hash';
import { MAX_RATING, MIN_RATING, toBase64Url, type UserData } from './userData';

/**
 * An imaginary friend, for visitors with no real ones to compare with yet.
 * Their list id has the shape of any other, so they're kept and synced like
 * a real friend, but there's no list on the sync server: their ratings are
 * made up from the visitor's own.
 */

// 10 characters, followed by 12 random ones: 22 in all, like a list id. A
// real list id is a hash, so it won't start like this.
const PREFIX = 'IMAGINARY-';

export const isImaginary = (listId: string) => listId.startsWith(PREFIX);

export const newImaginaryId = () =>
    PREFIX + toBase64Url(crypto.getRandomValues(new Uint8Array(9)));

// Imaginary friends from films and comics known in many countries, and
// Alfons Åberg's Mollgan.
const NAMES = ['Harvey', 'Hobbes', 'Bing Bong', 'Drop Dead Fred', 'Mollgan'];

/** Mollgan for visitors who read Swedish, anyone for everyone else. */
export function imaginaryName(languages: readonly string[]) {
    if (languages.some((language) => /^sv\b/i.test(language))) {
        return 'Mollgan';
    }
    return NAMES[Math.floor(Math.random() * NAMES.length)];
}

// How far from the visitor's rating they are: mostly close, now and then not.
const OFFSETS = [-3, -2, -1, -1, 0, 0, 0, 1, 1, 2, 3];

/**
 * Ratings of about half of what the visitor has rated, a little higher or
 * lower than theirs. The same every time for the same friend, and they rate
 * more as the visitor does.
 */
export function imaginaryList(listId: string, own: UserData): UserData {
    // Some imaginary friends are kinder than others: -1, 0 or 1.
    const mood = Math.round(hashUnit(listId) * 2) - 1;
    const list: UserData = {};
    for (const [key, [value, updatedAt]] of Object.entries(own)) {
        if (typeof value !== 'number' || !key.startsWith('r:')) continue;
        const id = key.slice('r:'.length).split('/')[0];
        if (hashUnit(`${listId}:${id}`) >= 0.5) continue;
        const offset =
            OFFSETS[Math.floor(hashUnit(`${listId}:${key}`) * OFFSETS.length)];
        const rating = Math.min(
            MAX_RATING,
            Math.max(MIN_RATING, value + mood + offset)
        );
        list[key] = [rating, updatedAt];
    }
    return list;
}
