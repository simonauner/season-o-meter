export type ShowSummary = {
    id: number;
    name: string;
    overview: string;
    posterPath: string | null;
    backdropPath: string | null;
    firstAirDate: string | null;
    voteAverage: number;
    voteCount: number;
};

export type SeasonRating = {
    seasonNumber: number;
    airDate: string | null;
    episodeCount: number;
    ratedEpisodeCount: number;
    /** Mean episode rating (0–10), or null if no episode has been rated yet. */
    rating: number | null;
};

export type RatedSeason = SeasonRating & { rating: number };

export type ShowWithSeasons = ShowSummary & {
    lastAirDate: string | null;
    inProduction: boolean;
    status: string;
    seasons: SeasonRating[];
};
