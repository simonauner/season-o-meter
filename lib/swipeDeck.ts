import { hashUnit } from './hash';
import type { SearchEntry } from './searchIndex';
import { flaggedIds, ratedIds, type UserData } from './userData';

/**
 * How far the order strays from most votes first, in powers of e: titles
 * with up to e² ≈ 7 times the votes of each other can come in either order.
 */
const SPREAD = 2;

/** Votes per series or per movie, since a film series' votes add up. */
const popularity = (entry: SearchEntry) =>
    entry.votes / (entry.type === 'movies' ? (entry.movieIds?.length ?? 1) : 1);

/**
 * Every series and film series in a shuffled order that favours popular
 * ones, since those are the ones the visitor is most likely to have seen.
 * The same seed gives the same order.
 */
export function deckOrder(index: SearchEntry[], seed: number) {
    const keyed = index.map((entry) => ({
        entry,
        key:
            Math.log(popularity(entry)) +
            SPREAD * hashUnit(`${seed}:${entry.id}`),
    }));
    return keyed.sort((a, b) => b.key - a.key).map(({ entry }) => entry);
}

/** The visitor has rated it, or one of its seasons or movies. */
const isRated = (entry: SearchEntry, rated: Set<string>) =>
    rated.has(entry.id) || (entry.movieIds ?? []).some((id) => rated.has(id));

/**
 * What's left to swipe: everything not yet rated, skipped or on the
 * watchlist, in deck order.
 */
export function remaining(
    order: SearchEntry[],
    data: UserData,
    type: SearchEntry['type'] | 'all'
) {
    const rated = ratedIds(data);
    const watchlist = flaggedIds(data, 'w:');
    const skipped = flaggedIds(data, 's:');
    return order.filter(
        (entry) =>
            (type === 'all' || entry.type === type) &&
            !skipped.has(entry.id) &&
            !watchlist.has(entry.id) &&
            !isRated(entry, rated)
    );
}

/** How many seasons, or movies in a film series, as words. */
export function partsLabel(entry: SearchEntry) {
    const count =
        entry.type === 'movies'
            ? (entry.movieIds?.length ?? entry.ratings.length)
            : (entry.seasonCount ?? entry.ratings.length);
    const noun = entry.type === 'movies' ? 'movie' : 'season';
    return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

export const entryHref = (entry: SearchEntry) =>
    `/${entry.type === 'series' ? 'shows' : 'movies'}/${entry.id}/`;
