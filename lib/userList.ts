import type { SearchEntry } from './searchIndex';
import type { UserData } from './userData';

export type ListItem = {
    entry: SearchEntry;
    /** Rating of the series or film series as a whole. */
    rating: number | null;
    /** Ratings of its seasons, or of the movies in a film series. */
    partRatings: number[];
    onWatchlist: boolean;
    /** When anything about it last changed. */
    updatedAt: number;
};

const KEY = /^([rw]):([^/]+)(?:\/(\d+))?$/;

/** The series and film series the visitor has rated or put on the watchlist. */
export function listItems(data: UserData, index: SearchEntry[]): ListItem[] {
    const byId = new Map(index.map((entry) => [entry.id, entry]));
    // A movie can be part of more than one film series.
    const byMovie = new Map<string, SearchEntry[]>();
    for (const entry of index) {
        for (const movieId of entry.movieIds ?? []) {
            byMovie.set(movieId, [...(byMovie.get(movieId) ?? []), entry]);
        }
    }

    const items = new Map<string, ListItem>();
    const itemFor = (entry: SearchEntry, updatedAt: number) => {
        let item = items.get(entry.id);
        if (!item) {
            item = {
                entry,
                rating: null,
                partRatings: [],
                onWatchlist: false,
                updatedAt,
            };
            items.set(entry.id, item);
        }
        item.updatedAt = Math.max(item.updatedAt, updatedAt);
        return item;
    };

    for (const [key, [value, updatedAt]] of Object.entries(data)) {
        const match = KEY.exec(key);
        if (value === null || !match) continue;
        const [, kind, id, season] = match;
        const entry = byId.get(id);
        if (kind === 'w') {
            if (entry) itemFor(entry, updatedAt).onWatchlist = true;
        } else if (season) {
            if (entry) itemFor(entry, updatedAt).partRatings.push(value);
        } else if (entry) {
            itemFor(entry, updatedAt).rating = value;
        } else {
            for (const franchise of byMovie.get(id) ?? []) {
                itemFor(franchise, updatedAt).partRatings.push(value);
            }
        }
    }

    return [...items.values()];
}

/** Most recently changed first. */
export const watchlist = (items: ListItem[]) =>
    items
        .filter((item) => item.onWatchlist)
        .sort((a, b) => b.updatedAt - a.updatedAt);

/** The average of the visitor's season or movie ratings, if any. */
export const partAverage = ({ partRatings }: ListItem) =>
    partRatings.length === 0
        ? null
        : partRatings.reduce((sum, rating) => sum + rating, 0) /
          partRatings.length;

/** The overall rating, or else the average of the parts. */
const score = (item: ListItem) => item.rating ?? partAverage(item) ?? 0;

/** Highest rated first. */
export const rated = (items: ListItem[]) =>
    items
        .filter((item) => item.rating !== null || item.partRatings.length > 0)
        .sort((a, b) => score(b) - score(a) || b.updatedAt - a.updatedAt);
