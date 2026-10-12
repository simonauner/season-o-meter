import 'server-only';
import { cacheLife } from 'next/cache';
import type { SeasonRating, ShowSummary, ShowWithSeasons } from './types';

const API_BASE = 'https://api.themoviedb.org/3';

// TMDB allows at most 20 sub-requests per append_to_response.
const APPEND_LIMIT = 20;

// How many list results we enrich with per-season ratings.
const LIST_SIZE = 20;

export type ShowList = 'trending' | 'popular' | 'top-rated';

const LIST_PATHS: Record<ShowList, string> = {
    trending: '/trending/tv/week',
    popular: '/tv/popular',
    'top-rated': '/tv/top_rated',
};

type TmdbShowSummary = {
    id: number;
    name: string;
    overview: string;
    poster_path: string | null;
    backdrop_path: string | null;
    first_air_date: string;
    vote_average: number;
    vote_count: number;
};

type TmdbSeason = {
    season_number: number;
    air_date: string | null;
    episode_count: number;
};

type TmdbShowDetails = TmdbShowSummary & {
    last_air_date: string | null;
    in_production: boolean;
    status: string;
    seasons: TmdbSeason[];
    [appended: `season/${number}`]: TmdbSeasonDetails | undefined;
};

type TmdbSeasonDetails = {
    season_number: number;
    air_date: string | null;
    episodes: {
        air_date: string | null;
        vote_average: number;
        vote_count: number;
    }[];
};

type TmdbPage<T> = {
    page: number;
    results: T[];
    total_pages: number;
    total_results: number;
};

export class TmdbNotConfiguredError extends Error {
    constructor() {
        super('TMDB_API_KEY is not set');
    }
}

export class TmdbError extends Error {
    constructor(
        path: string,
        readonly status: number
    ) {
        super(`TMDB ${path} responded ${status}`);
    }
}

export const isTmdbConfigured = () => Boolean(process.env.TMDB_API_KEY);

async function tmdb<T>(
    path: string,
    params: Record<string, string> = {}
): Promise<T> {
    const key = process.env.TMDB_API_KEY;
    if (!key) throw new TmdbNotConfiguredError();

    const url = new URL(API_BASE + path);
    const headers: HeadersInit = { accept: 'application/json' };

    // Accept both a v4 "API Read Access Token" (a JWT) and a v3 API key.
    if (key.startsWith('eyJ')) headers.authorization = `Bearer ${key}`;
    else url.searchParams.set('api_key', key);

    for (const [name, value] of Object.entries(params)) {
        url.searchParams.set(name, value);
    }

    const res = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new TmdbError(path, res.status);
    return res.json();
}

const toSummary = (show: TmdbShowSummary): ShowSummary => ({
    id: show.id,
    name: show.name,
    overview: show.overview,
    posterPath: show.poster_path,
    backdropPath: show.backdrop_path,
    firstAirDate: show.first_air_date || null,
    voteAverage: show.vote_average,
    voteCount: show.vote_count,
});

/**
 * A season's rating is the mean of its episode ratings. Episodes that have
 * not aired or have no votes yet would drag the mean towards zero, so they
 * are left out. Seasons without any rated episode get `rating: null`.
 */
const toSeasonRating = (
    season: TmdbSeason,
    details: TmdbSeasonDetails | undefined,
    today: string
): SeasonRating => {
    const rated = (details?.episodes ?? []).filter(
        (episode) =>
            episode.vote_count > 0 &&
            episode.air_date !== null &&
            episode.air_date <= today
    );
    const rating = rated.length
        ? rated.reduce((sum, episode) => sum + episode.vote_average, 0) /
          rated.length
        : null;

    return {
        seasonNumber: season.season_number,
        airDate: season.air_date,
        episodeCount: season.episode_count,
        ratedEpisodeCount: rated.length,
        rating,
    };
};

const range = (from: number, to: number) =>
    Array.from({ length: to - from + 1 }, (_, i) => from + i);

const fetchWithSeasons = (id: number, seasonNumbers: number[]) =>
    tmdb<TmdbShowDetails>(`/tv/${id}`, {
        append_to_response: seasonNumbers.map((n) => `season/${n}`).join(','),
    });

export async function getShow(id: number): Promise<ShowWithSeasons | null> {
    'use cache';
    cacheLife('days');

    // Optimistically ask for the first 20 seasons together with the show, so
    // that most shows need a single request.
    let show: TmdbShowDetails;
    try {
        show = await fetchWithSeasons(id, range(1, APPEND_LIMIT));
    } catch (error) {
        if (error instanceof TmdbError && error.status === 404) return null;
        throw error;
    }

    // Season 0 is "Specials" and not part of the show's arc.
    const seasons = show.seasons.filter((season) => season.season_number > 0);

    const missing = seasons
        .map((season) => season.season_number)
        .filter((n) => !show[`season/${n}`]);
    const extra = await Promise.all(
        range(0, Math.ceil(missing.length / APPEND_LIMIT) - 1).map((chunk) =>
            fetchWithSeasons(
                id,
                missing.slice(chunk * APPEND_LIMIT, (chunk + 1) * APPEND_LIMIT)
            )
        )
    );
    const seasonDetails = (n: number) =>
        [show, ...extra].find((response) => response[`season/${n}`])?.[
            `season/${n}`
        ];

    const today = new Date().toISOString().slice(0, 10);

    return {
        ...toSummary(show),
        lastAirDate: show.last_air_date,
        inProduction: show.in_production,
        status: show.status,
        seasons: seasons.map((season) =>
            toSeasonRating(season, seasonDetails(season.season_number), today)
        ),
    };
}

const withSeasons = async (shows: TmdbShowSummary[]) => {
    const settled = await Promise.allSettled(
        shows.slice(0, LIST_SIZE).map((show) => getShow(show.id))
    );
    return settled.flatMap((result) =>
        result.status === 'fulfilled' && result.value ? [result.value] : []
    );
};

export async function getShowList(list: ShowList): Promise<ShowWithSeasons[]> {
    'use cache';
    cacheLife('hours');

    const { results } = await tmdb<TmdbPage<TmdbShowSummary>>(LIST_PATHS[list]);
    return withSeasons(results);
}

export async function searchShows(query: string): Promise<ShowWithSeasons[]> {
    'use cache';
    cacheLife('hours');

    const { results } = await tmdb<TmdbPage<TmdbShowSummary>>('/search/tv', {
        query,
    });
    return withSeasons(results);
}
