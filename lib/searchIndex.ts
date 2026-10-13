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
