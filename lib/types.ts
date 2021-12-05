// FROM TMDB
export type tvShowSummaryResponse = {
    backdrop_path: string;
    first_air_date: string;
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
};

export type tvShowDetailsResponse = tvShowSummaryResponse & {
    number_of_seasons: number;
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
};

type Season = {
    id: number;
    rating: number;
};

export type tvShowDetails = tvShowSummary & {
    number_of_seasons: number;
    rating: Season[];
};

export type TopRatedSeries = {
    page: number;
    total_pages: number;
    total_results: number;
    results: Array<tvShowDetails>;
};
