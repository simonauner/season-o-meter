/** Compact show summary served as /search-index.json for client-side search. */
export type SearchEntry = {
    id: string;
    title: string;
    startYear: number | null;
    endYear: number | null;
    votes: number;
    /** Ratings of the rated seasons, in order. */
    ratings: number[];
};
