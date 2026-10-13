/** Compact summary served as /search-index.json for client-side search. */
export type SearchEntry = {
    type: 'series' | 'movies';
    /** IMDb id for a series, Wikidata id for a film series. */
    id: string;
    title: string;
    startYear: number | null;
    endYear: number | null;
    votes: number;
    /** Ratings per rated season, or per movie, in order. */
    ratings: number[];
    /** A series' own IMDb rating. */
    rating?: number;
    /** Season numbers of a series' rated seasons, in the same order. */
    seasons?: number[];
    /** How many seasons a series has, including ones without a rating yet. */
    seasonCount?: number;
    /** IMDb ids of a film series' movies, in the same order. */
    movieIds?: string[];
    /** TMDB poster path, like /abc.jpg (see lib/poster.ts). */
    poster?: string;
};

/** Lower case without accents, so "pokemon" finds "Pokémon". */
const normalize = (text: string) =>
    text
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase()
        .trim();

/** Without a leading "the", "a" or "an", so "office" is "The Office". */
const withoutArticle = (title: string) => title.replace(/^(the|an?) /, '');

/** Normalized titles, worked out once per entry. */
const titles = new WeakMap<SearchEntry, { title: string; words: string[] }>();

function titleOf(entry: SearchEntry) {
    let cached = titles.get(entry);
    if (!cached) {
        const title = normalize(entry.title);
        cached = { title, words: title.split(/[^\p{L}\p{N}]+/u) };
        titles.set(entry, cached);
    }
    return cached;
}

/**
 * Entries whose title has every word of the query in it. An exact title
 * comes first, then titles where every word of the query starts a word, then
 * the rest, each by votes, the order the index is in.
 */
export function search(index: SearchEntry[], query: string) {
    const text = normalize(query);
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length === 0) return [];
    const exact = withoutArticle(text);

    const ranked: { entry: SearchEntry; rank: number }[] = [];
    for (const entry of index) {
        const { title, words: titleWords } = titleOf(entry);
        if (!words.every((word) => title.includes(word))) continue;
        const rank =
            withoutArticle(title) === exact
                ? 0
                : words.every((word) =>
                        titleWords.some((titleWord) =>
                            titleWord.startsWith(word)
                        )
                    )
                  ? 1
                  : 2;
        ranked.push({ entry, rank });
    }
    // Sorting is stable, so entries of the same rank stay in order of votes.
    return ranked.sort((a, b) => a.rank - b.rank).map(({ entry }) => entry);
}
