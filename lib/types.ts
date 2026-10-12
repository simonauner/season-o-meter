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

export type DataFile = {
    generatedAt: string;
    /** Sorted by votes, most first. */
    shows: Show[];
};
