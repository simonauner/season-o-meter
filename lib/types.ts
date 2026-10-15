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
    /** TMDB poster path, like /abc.jpg, if the data was built with TMDB. */
    poster?: string;
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
    /** TMDB poster path of the collection or first movie, if found. */
    poster?: string;
};

export type Role = 'director' | 'writer' | 'actor';

/** A movie someone made, in the roles they made it in. */
export type Credit = Movie & {
    roles: Role[];
    /** The character an actor played, the first one if more than one. */
    character?: string;
    /** Where an actor is billed in the cast, from 0. */
    billing?: number;
    /**
     * Whether an actor's part is a cameo: billed after the first 20 on TMDB,
     * or uncredited. Listed among their movies, but not counted.
     */
    cameo?: boolean;
};

/** One of the most popular directors, writers or actors. */
export type Person = {
    /** IMDb id, e.g. nm0634240. */
    id: string;
    name: string;
    /** The roles they're among the most popular in. */
    roles: Role[];
    /** Release year of the first movie that counts. */
    startYear: number | null;
    /** Release year of the latest movie that counts. */
    endYear: number | null;
    /** Sum of votes on their movies that count. */
    votes: number;
    /** Their movies in those roles, in release order, cameos too. */
    movies: Credit[];
    /** TMDB profile photo path, if found. */
    poster?: string;
};

export type DataFile = {
    generatedAt: string;
    /** Sorted by votes, most first. */
    shows: Show[];
    /** Sorted by votes, most first. */
    franchises: Franchise[];
    /** Sorted by votes, most first. Missing from data built before people were added. */
    people?: Person[];
};
