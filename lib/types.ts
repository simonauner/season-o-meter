export type SeasonRating = {
    seasonNumber: number;
    /** Year the season's first episode aired. */
    year: number | null;
    episodeCount: number;
    ratedEpisodeCount: number;
    /** Sum of votes on the season's rated episodes. */
    votes: number;
    /** Mean episode rating (0–10), or null if no episode has been rated yet. */
    rating: number | null;
};

export type RatedSeason = SeasonRating & { rating: number };

export type Show = {
    /** IMDb id, e.g. tt0944947. */
    id: string;
    title: string;
    startYear: number | null;
    /** Null while the series is still running. */
    endYear: number | null;
    genres: string[];
    /** The series' own IMDb rating. */
    rating: number;
    votes: number;
    seasons: SeasonRating[];
};

export type Movie = {
    /** IMDb id, e.g. tt0076759. */
    id: string;
    title: string;
    year: number | null;
    rating: number;
    votes: number;
};

export type Franchise = {
    /** Wikidata id, e.g. Q22092344. */
    id: string;
    title: string;
    /** Release year of the first movie. */
    startYear: number | null;
    /** Release year of the latest movie. */
    endYear: number | null;
    /** Sum of votes on its movies. */
    votes: number;
    /** Rated movies in release order. */
    movies: Movie[];
};

export type DataFile = {
    generatedAt: string;
    /** Sorted by votes, most first. */
    shows: Show[];
    /** Sorted by votes, most first. */
    franchises: Franchise[];
};
