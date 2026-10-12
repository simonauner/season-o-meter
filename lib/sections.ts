export type Section<T> = {
    slug: string;
    title: string;
    description: string;
    items: T[];
};

export type SectionDefinition<T> = Omit<Section<T>, 'items'> & {
    /** Only consider items with at least this many votes. */
    minVotes: number;
    /** Only consider items with at least this many ratings. */
    minRatings: number;
    maxRatings?: number;
    /** Any other condition an item has to meet. */
    filter?: (item: T) => boolean;
    /** How strongly an item matches, or null if it doesn't. Higher first. */
    score: (ratings: number[], item: T) => number | null;
};

/**
 * The best matches for each section. `ratingsOf` gives an item's ratings in
 * order: per season for a series, per movie for a film series.
 */
export function findSections<T extends { votes: number }>(
    items: T[],
    definitions: SectionDefinition<T>[],
    ratingsOf: (item: T) => number[],
    limit: number
): Section<T>[] {
    return definitions.map(
        ({
            minVotes,
            minRatings,
            maxRatings = Infinity,
            filter,
            score,
            ...section
        }) => {
            const scored = items.flatMap((item) => {
                if (item.votes < minVotes) return [];
                if (filter && !filter(item)) return [];
                const ratings = ratingsOf(item);
                if (ratings.length < minRatings) return [];
                if (ratings.length > maxRatings) return [];
                const value = score(ratings, item);
                return value === null ? [] : [{ item, value }];
            });
            scored.sort(
                (a, b) => b.value - a.value || b.item.votes - a.item.votes
            );
            return {
                ...section,
                items: scored.slice(0, limit).map(({ item }) => item),
            };
        }
    );
}
