export type Section<T> = {
    slug: string;
    title: string;
    description: string;
    items: T[];
};

export type SectionDefinition<T> = Omit<Section<T>, 'items' | 'description'> & {
    /** Given the minimum number of ratings the section ended up with. */
    description: string | ((minRatings: number) => string);
    /** Only consider items with at least this many votes. */
    minVotes: number;
    /**
     * Only consider items with at least this many ratings. Raised to the
     * visitor's chosen minimum when that is higher.
     */
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
 * `chosenMinRatings` is the visitor's chosen minimum, if they can pick one.
 */
export function findSections<T extends { votes: number }>(
    items: T[],
    definitions: SectionDefinition<T>[],
    ratingsOf: (item: T) => number[],
    limit: number,
    chosenMinRatings = 0
): Section<T>[] {
    return definitions.map(
        ({
            description,
            minVotes,
            minRatings: ownMinRatings,
            maxRatings = Infinity,
            filter,
            score,
            ...section
        }) => {
            const minRatings = Math.max(ownMinRatings, chosenMinRatings);
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
                description:
                    typeof description === 'function'
                        ? description(minRatings)
                        : description,
                items: scored.slice(0, limit).map(({ item }) => item),
            };
        }
    );
}
