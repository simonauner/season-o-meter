// FROM TMDB
export type tvShowSummaryResponse = {
    backdrop_path: string;
    first_air_date: string;
    last_air_date: string;
    // genre_ids: [10764]
    id: number;
    name: string;
    origin_country: string[];
    original_language: string;
    original_name: string;
    overview: string;
    popularity: number;
    poster_path: string;
    vote_average: number;
    vote_count: number;
    in_production: boolean;
};

export type SeasonResponse = {
    air_date: string;
    episode_count: number;
    season_number: number;
};

export type tvShowDetailsResponse = tvShowSummaryResponse & {
    number_of_seasons: number;
    seasons: SeasonResponse[];
};

export type tvShowEpisodeDetailsResponse = {
    vote_average: number;
};

export type tvShowSeasonDetailsResponse = {
    episodes: tvShowEpisodeDetailsResponse[];
};

export type TopRatedSeriesResponse = {
    page: number;
    total_pages: number;
    total_results: number;
    results: Array<tvShowDetailsResponse>;
};

// FROM API TO FE
export type tvShowSummary = {
    backdrop_path: string;
    first_air_date: string;
    last_air_date: string;
    // genre_ids: [10764]
    id: number;
    name: string;
    origin_country: string[];
    original_language: string;
    original_name: string;
    overview: string;
    popularity: number;
    poster_path: string;
    vote_average: number;
    vote_count: number;
    in_production: boolean;
};

export type Season = {
    air_date: string;
    episode_count: number;
    season_number: number;
    rating: number;
};

export type tvShowDetails = tvShowSummary & {
    number_of_seasons: number;
    seasons: Season[];
};

export type TopRatedSeries = {
    page: number;
    total_pages: number;
    total_results: number;
    results: Array<tvShowDetails>;
};
