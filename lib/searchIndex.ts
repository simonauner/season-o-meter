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
    /** IMDb ids of a film series' movies, in the same order. */
    movieIds?: string[];
};
