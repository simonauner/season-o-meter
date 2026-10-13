import { hashUnit } from './hash';

/**
 * One of the options, picked by the id so a series or film series always
 * gets the same one. Pages are built ahead of time and hydrated in the
 * browser, so a real random pick would differ between the two.
 */
export const pickVerdict = (id: string, options: string[]) =>
    options[Math.floor(hashUnit(id) * options.length)];

/**
 * The shape of a title's ratings, which its verdict is one way of saying.
 * Titles with the same shape are alike in a way their genres don't tell.
 */
export type Shape =
    | 'flawless'
    | 'steady'
    | 'original-best'
    | 'best-last'
    | 'worst-last'
    | 'ran-out-of-steam'
    | 'zigzag'
    | 'twin-peaks'
    | 'comeback'
    | 'big-spread'
    | 'decline'
    | 'rise'
    | 'standout'
    | 'peaked';

// Verdicts that read the same for series and film series.
export const FLAWLESS = ['Flawless victory', 'No notes', "Chef's kiss"];
export const STEADY = [
    'Rock steady',
    'Live long and plateau',
    'Just keep swimming',
    'Steady as she goes',
];
export const STEADY_AND_LOW = ['Rock bottom steady', 'Reliably meh'];
export const SAVED_THE_BEST = [
    'Saved the best for last',
    'The Return of the King',
    'Stuck the landing',
    'Mischief managed',
];
export const RAN_OUT_OF_STEAM = [
    'Ran out of steam',
    'Jumped the shark',
    'Getting too old for this',
    'Running on fumes',
];
export const ZIGZAG = [
    'Life is like a box of chocolates',
    'Shaken, not stirred',
];
export const TWIN_PEAKS = ['Twin Peaks'];
export const COMEBACK = [
    'Life finds a way',
    "I'm not dead yet!",
    "It's alive!",
];
export const BIG_SPREAD = ['The Good, the Bad and the Ugly'];
export const STANDOUT = ['There can be only one', 'Lightning in a bottle'];
export const BETTER_WITH_AGE = ['Getting better with age', 'Like a fine wine'];

/** At least this far between the best and the worst. */
export const BIG_SPREAD_MIN = 2.5;

/** Goes up and down, again and again, by more than a little each time. */
export function isZigzag(ratings: number[]) {
    const swings = ratings
        .slice(1)
        .map((rating, i) => rating - ratings[i])
        .filter((change) => Math.abs(change) >= 0.3);
    const turns = swings
        .slice(1)
        .filter((change, i) => Math.sign(change) !== Math.sign(swings[i]));
    return swings.length >= 4 && turns.length >= 3;
}

/** The two best are about as good and have a clear dip between them. */
export function hasTwinPeaks(ratings: number[]) {
    const [a, b] = ratings
        .map((rating, index) => ({ rating, index }))
        .sort((x, y) => y.rating - x.rating);
    if (!b || Math.abs(a.rating - b.rating) > 0.1) return false;
    const between = ratings.slice(
        Math.min(a.index, b.index) + 1,
        Math.max(a.index, b.index)
    );
    return between.length > 0 && Math.min(...between) <= b.rating - 0.4;
}

/** Dipped in the middle, then ended close to where it was before the dip. */
export function isComeback(ratings: number[]) {
    const middle = ratings.slice(1, -1);
    if (middle.length === 0) return false;
    const low = Math.min(...middle);
    const lowIndex = 1 + middle.indexOf(low);
    const before = Math.max(...ratings.slice(0, lowIndex));
    const last = ratings[ratings.length - 1];
    return Math.min(before, last) - low >= 0.4 && last >= before - 0.2;
}

/** The best is far ahead of the second best. */
export function hasStandout(ratings: number[]) {
    const [best, second] = [...ratings].sort((a, b) => b - a);
    return best - second >= 0.8;
}
