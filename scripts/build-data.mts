/**
 * Downloads IMDb's non-commercial datasets and writes per-season ratings for
 * every sufficiently popular TV series, per-movie ratings for every
 * sufficiently popular film series, and the movies of the most popular
 * directors, writers and actors, to data/shows.json.
 *
 * Run with `npm run data`. Downloads are cached in .imdb/ for 20 hours, since
 * IMDb only refreshes the files once a day.
 *
 * IMDb doesn't say which movies belong together, so film series and their
 * movies come from Wikidata.
 *
 * With TMDB_API_KEY set, posters and photos of people come from TMDB. Without it the data has no
 * posters, and the site draws its own where it shows one.
 *
 * Datasets: https://developer.imdb.com/non-commercial-datasets/
 */
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, stat, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createGunzip } from 'node:zlib';
import type {
    Credit,
    DataFile,
    Franchise,
    Movie,
    Person,
    Role,
    SeasonRating,
    Show,
} from '../lib/types';

const DATASETS_URL = 'https://datasets.imdbws.com';
const CACHE_DIR = '.imdb';
const CACHE_HOURS = 20;
const OUT_FILE = 'data/shows.json';

/** Series with fewer votes than this are left out. */
const MIN_SERIES_VOTES = 5_000;
/** Episodes with fewer votes than this are too noisy to count. */
const MIN_EPISODE_VOTES = 5;
/** Daily shows number their seasons by year; those aren't seasons in our sense. */
const MAX_SEASON_NUMBER = 100;

const SERIES_TYPES = new Set(['tvSeries', 'tvMiniSeries']);

const WIKIDATA_URL = 'https://query.wikidata.org/sparql';
const USER_AGENT =
    'season-o-meter/2.0 (https://github.com/simonauner/season-o-meter)';

/** Movies with fewer votes than this are left out of their film series. */
const MIN_MOVIE_VOTES = 1_000;
/** Film series whose movies have fewer votes than this in total are left out. */
const MIN_FRANCHISE_VOTES = 20_000;
/** Studio filmographies, like "DreamWorks Animation feature films", aren't series. */
const EXCLUDED_FILM_SERIES = /feature films?$/i;
/**
 * Movies Wikidata wrongly puts in a film series, by Wikidata id of the series
 * and IMDb id of the movie.
 */
const EXCLUDED_MOVIES: Record<string, string[]> = {
    // Peter Jackson's Lord of the Rings trilogy, not the later Middle-earth
    // movies: The War of the Rohirrim and The Hunt for Gollum.
    Q190214: ['tt14824600', 'tt32328070'],
};

/**
 * Every movie that is part of a film series, or of anything Wikidata counts
 * as a kind of film series (trilogies, film franchises, …). Starting from the
 * series keeps the query fast; starting from the movies times out.
 */
const FILM_SERIES_QUERY = `
SELECT ?series ?label ?mulLabel ?imdb ?ordinal WHERE {
  ?series wdt:P31/wdt:P279* wd:Q24856.
  ?film p:P179 ?statement; wdt:P345 ?imdb.
  ?statement ps:P179 ?series.
  OPTIONAL { ?statement pq:P1545 ?ordinal }
  OPTIONAL { ?series rdfs:label ?label FILTER(LANG(?label) = "en") }
  OPTIONAL { ?series rdfs:label ?mulLabel FILTER(LANG(?mulLabel) = "mul") }
}`;

/** Movies with fewer votes than this are left out of people's movies. */
const MIN_PERSON_MOVIE_VOTES = 10_000;
/** People with fewer movies than this in a role have no trend to look at. */
const MIN_PERSON_MOVIES = 5;
/** How many directors, writers and actors are included, by votes. */
const PEOPLE_PER_ROLE = 50;
/**
 * Actors count for the movies they're among the first few billed in, so a
 * cameo doesn't count as one of their movies.
 */
const MAX_ACTOR_BILLING = 4;
/**
 * With TMDB, actors are picked from this many with the most votes in
 * IMDb's datasets, and count for their movies on TMDB.
 */
const ACTOR_CANDIDATES = 100;
/**
 * On TMDB, a part billed after this many, or uncredited, is a cameo: listed
 * among someone's movies, but not counted. Its casts are complete, so
 * ensembles have long ones: Cate Blanchett is billed 12th in The Fellowship
 * of the Ring.
 */
const MAX_TMDB_BILLING = 20;
/**
 * Movies with fewer votes on TMDB than this aren't looked up on IMDb. Movies
 * with 10,000 votes on IMDb have a few hundred there.
 */
const MIN_TMDB_MOVIE_VOTES = 50;
/**
 * Writing credits for the movie itself. Others, like "characters" or
 * "novel", credit what it's based on: Stan Lee is credited on every Marvel
 * movie, and Stephen King on every adaptation.
 */
const WRITING_CREDIT =
    /^(\\N|writer|screenwriter|script|scenario|written( for the screen)? by|(original |adapted )?screen ?play( by)?|(original |screen )?story( by)?|story and screenplay)$/;

const TMDB_URL = 'https://api.themoviedb.org/3';
/** TMDB's API read access token, or its older API key. */
const TMDB_API_KEY = process.env.TMDB_API_KEY;
/** Requests to TMDB at a time, well within its rate limit. */
const TMDB_CONCURRENCY = 16;

const log = (message: string) =>
    console.log(`[${new Date().toISOString().slice(11, 19)}] ${message}`);

async function download(name: string): Promise<string> {
    const file = path.join(CACHE_DIR, `${name}.tsv.gz`);
    const cached = await stat(file).catch(() => null);
    if (cached && Date.now() - cached.mtimeMs < CACHE_HOURS * 3_600_000) {
        log(`Using cached ${file}`);
        return file;
    }

    log(`Downloading ${name}…`);
    await mkdir(CACHE_DIR, { recursive: true });
    const res = await fetch(`${DATASETS_URL}/${name}.tsv.gz`);
    if (!res.ok || !res.body) {
        throw new Error(`Downloading ${name} failed: ${res.status}`);
    }
    const partial = `${file}.partial`;
    await pipeline(
        Readable.fromWeb(res.body as never),
        createWriteStream(partial)
    );
    await rename(partial, file);
    return file;
}

/** Streams the rows of a gzipped IMDb TSV file, skipping the header. */
async function* rows(file: string): AsyncGenerator<string[]> {
    const lines = createInterface({
        input: createReadStream(file).pipe(createGunzip()),
        crlfDelay: Infinity,
    });
    let header = true;
    for await (const line of lines) {
        if (header) {
            header = false;
            continue;
        }
        yield line.split('\t');
    }
}

const nullable = (value: string) => (value === '\\N' ? null : value);
const toInt = (value: string) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
};
const round = (value: number, decimals = 2) =>
    Math.round(value * 10 ** decimals) / 10 ** decimals;

type Rating = { rating: number; votes: number };
type Episode = { season: number; rating: Rating | null };
type FilmSeries = {
    title: string;
    /** IMDb id of each movie, with its number in the series if Wikidata has one. */
    movies: Map<string, number | null>;
};

async function fetchFilmSeries(): Promise<Map<string, FilmSeries>> {
    type Binding = Record<string, { value: string } | undefined>;
    let bindings: Binding[] | undefined;
    for (let attempt = 1; !bindings; attempt++) {
        log(`Querying Wikidata for film series…`);
        try {
            const res = await fetch(WIKIDATA_URL, {
                method: 'POST',
                headers: {
                    Accept: 'application/sparql-results+json',
                    'User-Agent': USER_AGENT,
                },
                body: new URLSearchParams({ query: FILM_SERIES_QUERY }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            // A query that times out is cut off mid-response, so this throws.
            bindings = (await res.json()).results.bindings;
        } catch (error) {
            if (attempt === 3) {
                throw new Error('Querying Wikidata failed', { cause: error });
            }
            log(`Wikidata query failed (${error}), retrying…`);
            await new Promise((resolve) =>
                setTimeout(resolve, attempt * 10_000)
            );
        }
    }

    const filmSeries = new Map<string, FilmSeries>();
    for (const { series, label, mulLabel, imdb, ordinal } of bindings) {
        const title = label?.value ?? mulLabel?.value;
        if (!series || !imdb || !title || EXCLUDED_FILM_SERIES.test(title)) {
            continue;
        }
        const id = series.value.replace('http://www.wikidata.org/entity/', '');
        if (EXCLUDED_MOVIES[id]?.includes(imdb.value)) continue;
        let entry = filmSeries.get(id);
        if (!entry) {
            entry = { title, movies: new Map() };
            filmSeries.set(id, entry);
        }
        const number = ordinal ? Number.parseFloat(ordinal.value) : NaN;
        entry.movies.set(imdb.value, Number.isNaN(number) ? null : number);
    }
    return filmSeries;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Runs `fn` on every item, at most `limit` at a time. */
async function mapLimit<T>(
    items: T[],
    limit: number,
    fn: (item: T) => Promise<void>
) {
    let next = 0;
    const worker = async () => {
        while (next < items.length) await fn(items[next++]);
    };
    await Promise.all(Array.from({ length: limit }, worker));
}

/** A TMDB API response, or null if TMDB doesn't have it. */
async function tmdb<T>(apiKey: string, pathname: string): Promise<T | null> {
    const url = new URL(`${TMDB_URL}${pathname}`);
    const headers: Record<string, string> = {
        Accept: 'application/json',
        'User-Agent': USER_AGENT,
    };
    // A read access token is a JWT. An API key goes in the query instead.
    if (apiKey.startsWith('eyJ')) headers.Authorization = `Bearer ${apiKey}`;
    else url.searchParams.set('api_key', apiKey);

    for (let attempt = 1; ; attempt++) {
        const res = await fetch(url, { headers });
        if (res.ok) return (await res.json()) as T;
        if (res.status === 404) return null;
        if ((res.status === 429 || res.status >= 500) && attempt < 4) {
            const seconds = Number(res.headers.get('Retry-After')) || attempt;
            await sleep(seconds * 1_000);
            continue;
        }
        throw new Error(`TMDB ${pathname}: HTTP ${res.status}`);
    }
}

type TmdbTitle = { id: number; poster_path: string | null };
type TmdbFind = {
    tv_results: TmdbTitle[];
    movie_results: TmdbTitle[];
    person_results: TmdbPerson[];
};
type TmdbPerson = { id: number; profile_path: string | null };
type TmdbMovie = TmdbTitle & {
    belongs_to_collection: { poster_path: string | null } | null;
};

/**
 * Adds TMDB posters: a series' own, and a film series' collection poster,
 * or else its first movie's, and photos of people. A failed lookup only
 * leaves that poster out.
 */
async function addPosters(
    shows: Show[],
    franchises: Franchise[],
    people: Person[]
) {
    if (!TMDB_API_KEY) {
        log('TMDB_API_KEY is not set, leaving posters out');
        return;
    }
    const apiKey = TMDB_API_KEY;
    try {
        await tmdb(apiKey, '/configuration');
    } catch (error) {
        log(`TMDB can't be reached (${error}), leaving posters out`);
        return;
    }

    const find = (imdbId: string) =>
        tmdb<TmdbFind>(apiKey, `/find/${imdbId}?external_source=imdb_id`);
    let failed = 0;
    const lookup = async (fn: () => Promise<void>) => {
        try {
            await fn();
        } catch {
            failed++;
        }
    };

    log('Looking up posters on TMDB…');
    await mapLimit(shows, TMDB_CONCURRENCY, (show) =>
        lookup(async () => {
            const poster = (await find(show.id))?.tv_results[0]?.poster_path;
            if (poster) show.poster = poster;
        })
    );
    await mapLimit(franchises, TMDB_CONCURRENCY, (franchise) =>
        lookup(async () => {
            const found = (await find(franchise.movies[0].id))
                ?.movie_results[0];
            if (!found) return;
            const movie = await tmdb<TmdbMovie>(apiKey, `/movie/${found.id}`);
            const poster =
                movie?.belongs_to_collection?.poster_path ?? found.poster_path;
            if (poster) franchise.poster = poster;
        })
    );

    await mapLimit(people, TMDB_CONCURRENCY, (person) =>
        lookup(async () => {
            const photo = (await find(person.id))?.person_results[0]
                ?.profile_path;
            if (photo) person.poster = photo;
        })
    );

    const count = (titles: { poster?: string }[]) =>
        titles.filter((title) => title.poster).length;
    log(
        `Found posters for ${count(shows)} of ${shows.length} series and ${count(franchises)} of ${franchises.length} film series, and photos of ${count(people)} of ${people.length} people` +
            (failed > 0 ? ` (${failed} lookups failed)` : '')
    );
}

type PersonCredit = {
    roles: Set<Role>;
    character?: string;
    /** Where an actor is billed in the cast, from 0. */
    billing?: number;
    /** Whether an actor's part is a cameo, which doesn't count. */
    cameo?: boolean;
};
type TmdbCast = {
    id: number;
    order: number;
    character: string;
    vote_count: number;
};

/**
 * Replaces the movies IMDb's datasets have actors in with their movies on
 * TMDB. IMDb's list only about ten people per movie, in no reliable order,
 * and leave out Cate Blanchett as Galadriel in two of the three Lord of the
 * Rings movies. TMDB has whole casts in billing order. An actor whose
 * lookups fail keeps IMDb's movies.
 */
async function addTmdbActing(
    apiKey: string,
    personIds: string[],
    credits: Map<string, Map<string, PersonCredit>>,
    isIncluded: (movieId: string) => boolean
) {
    log('Looking up actors on TMDB…');
    const casts = new Map<string, TmdbCast[]>();
    await mapLimit(personIds, TMDB_CONCURRENCY, async (personId) => {
        try {
            const tmdbId = (
                await tmdb<TmdbFind>(
                    apiKey,
                    `/find/${personId}?external_source=imdb_id`
                )
            )?.person_results[0]?.id;
            if (tmdbId === undefined) return;
            const found = await tmdb<{ cast: TmdbCast[] }>(
                apiKey,
                `/person/${tmdbId}/movie_credits`
            );
            if (!found) return;
            casts.set(
                personId,
                found.cast
                    .filter((entry) => entry.vote_count >= MIN_TMDB_MOVIE_VOTES)
                    // Their first billed character, if they played two.
                    .sort((a, b) => a.order - b.order)
            );
        } catch {
            // Keeps IMDb's movies.
        }
    });

    // TMDB doesn't say a movie's IMDb id in someone's credits.
    const imdbIds = new Map<number, string | null>();
    const tmdbIds = new Set([...casts.values()].flat().map(({ id }) => id));
    await mapLimit([...tmdbIds], TMDB_CONCURRENCY, async (tmdbId) => {
        try {
            const ids = await tmdb<{ imdb_id: string | null }>(
                apiKey,
                `/movie/${tmdbId}/external_ids`
            );
            imdbIds.set(tmdbId, ids?.imdb_id ?? null);
        } catch {
            // Leaves the actors of this movie with IMDb's movies.
        }
    });

    let replaced = 0;
    for (const [personId, cast] of casts) {
        if (cast.some(({ id }) => !imdbIds.has(id))) continue;
        const movies = credits.get(personId)!;
        for (const credit of movies.values()) {
            credit.roles.delete('actor');
            delete credit.character;
            delete credit.billing;
            delete credit.cameo;
        }
        for (const entry of cast) {
            const movieId = imdbIds.get(entry.id);
            if (!movieId || !isIncluded(movieId)) continue;
            let credit = movies.get(movieId);
            if (!credit) movies.set(movieId, (credit = { roles: new Set() }));
            if (credit.roles.has('actor')) continue;
            credit.roles.add('actor');
            credit.billing = entry.order;
            if (entry.character) credit.character = entry.character;
            if (
                entry.order >= MAX_TMDB_BILLING ||
                /uncredited/i.test(entry.character)
            ) {
                credit.cameo = true;
            }
        }
        replaced++;
    }
    log(
        `Found the movies of ${replaced} of ${personIds.length} actors on TMDB, looking up ${tmdbIds.size} movies`
    );
}

/**
 * The most popular directors, writers and actors, by the votes on their
 * movies, each with the movies of every role they're among the most
 * popular in.
 */
async function findPeople(
    principalsFile: string,
    namesFile: string,
    ratings: Map<string, Rating>,
    movieInfo: Map<string, { title: string; year: number | null }>
): Promise<Person[]> {
    log('Reading credits…');
    // Credits by person and movie.
    const credits = new Map<string, Map<string, PersonCredit>>();
    // Actors billed so far per movie. Rows come in billing order, and an
    // actor with two characters has two rows.
    const billed = new Map<string, string[]>();
    for await (const [movieId, , personId, category, job, characters] of rows(
        principalsFile
    )) {
        if ((ratings.get(movieId)?.votes ?? 0) < MIN_PERSON_MOVIE_VOTES) {
            continue;
        }
        if (!movieInfo.has(movieId)) continue;

        let role: Role;
        let billing: number | undefined;
        if (category === 'director') role = 'director';
        else if (category === 'writer' && WRITING_CREDIT.test(job)) {
            role = 'writer';
        } else if (category === 'actor' || category === 'actress') {
            let cast = billed.get(movieId);
            if (!cast) billed.set(movieId, (cast = []));
            if (!cast.includes(personId)) cast.push(personId);
            billing = cast.indexOf(personId);
            if (billing >= MAX_ACTOR_BILLING) continue;
            role = 'actor';
        } else continue;

        let movies = credits.get(personId);
        if (!movies) credits.set(personId, (movies = new Map()));
        let credit = movies.get(movieId);
        if (!credit) movies.set(movieId, (credit = { roles: new Set() }));
        credit.roles.add(role);
        if (billing !== undefined) credit.billing ??= billing;
        if (role === 'actor' && !credit.character) {
            const parsed = nullable(characters);
            credit.character = parsed
                ? (JSON.parse(parsed) as string[])[0]
                : undefined;
        }
    }

    const votesOf = (movieIds: string[]) =>
        movieIds.reduce((sum, id) => sum + ratings.get(id)!.votes, 0);
    /** The people with the most votes on their movies in a role, but cameos. */
    const topInRole = (role: Role, limit: number) =>
        [...credits]
            .map(([personId, movies]) => {
                const ids = [...movies]
                    .filter(
                        ([, credit]) =>
                            credit.roles.has(role) &&
                            !(role === 'actor' && credit.cameo)
                    )
                    .map(([id]) => id);
                return { personId, ids };
            })
            .filter(({ ids }) => ids.length >= MIN_PERSON_MOVIES)
            .map(({ personId, ids }) => ({ personId, votes: votesOf(ids) }))
            .sort((a, b) => b.votes - a.votes)
            .slice(0, limit)
            .map(({ personId }) => personId);

    if (TMDB_API_KEY) {
        await addTmdbActing(
            TMDB_API_KEY,
            topInRole('actor', ACTOR_CANDIDATES),
            credits,
            (movieId) =>
                movieInfo.has(movieId) &&
                (ratings.get(movieId)?.votes ?? 0) >= MIN_PERSON_MOVIE_VOTES
        );
    }

    const roles = new Map<string, Set<Role>>();
    for (const role of ['director', 'writer', 'actor'] as const) {
        for (const personId of topInRole(role, PEOPLE_PER_ROLE)) {
            const own = roles.get(personId) ?? new Set();
            own.add(role);
            roles.set(personId, own);
        }
    }

    log('Reading names…');
    const names = new Map<string, string>();
    for await (const [id, name] of rows(namesFile)) {
        if (roles.has(id)) names.set(id, name);
    }

    const people: Person[] = [];
    for (const [id, own] of roles) {
        const name = names.get(id);
        if (!name) continue;
        const movies = [...credits.get(id)!]
            .flatMap(([movieId, credit]): Credit[] => {
                const creditRoles = [...own].filter((role) =>
                    credit.roles.has(role)
                );
                if (creditRoles.length === 0) return [];
                const { rating, votes } = ratings.get(movieId)!;
                return [
                    {
                        id: movieId,
                        ...movieInfo.get(movieId)!,
                        rating,
                        votes,
                        roles: creditRoles,
                        ...(creditRoles.includes('actor')
                            ? {
                                  character: credit.character,
                                  billing: credit.billing,
                                  ...(credit.cameo ? { cameo: true } : {}),
                              }
                            : {}),
                    },
                ];
            })
            .sort(
                (a, b) =>
                    (a.year ?? Infinity) - (b.year ?? Infinity) ||
                    a.id.localeCompare(b.id)
            );
        // Their years and votes are of the movies that count.
        const counted = movies.filter(
            (movie) =>
                !movie.cameo || movie.roles.some((role) => role !== 'actor')
        );
        const years = counted.flatMap((movie) =>
            movie.year === null ? [] : [movie.year]
        );
        people.push({
            id,
            name,
            roles: [...own],
            startYear: years.length ? Math.min(...years) : null,
            endYear: years.length ? Math.max(...years) : null,
            votes: votesOf(counted.map((movie) => movie.id)),
            movies,
        });
    }
    people.sort((a, b) => b.votes - a.votes);
    return people;
}

async function main() {
    const [
        ratingsFile,
        episodesFile,
        basicsFile,
        principalsFile,
        namesFile,
        filmSeries,
    ] = await Promise.all([
        download('title.ratings'),
        download('title.episode'),
        download('title.basics'),
        download('title.principals'),
        download('name.basics'),
        fetchFilmSeries(),
    ]);

    log('Reading ratings…');
    const ratings = new Map<string, Rating>();
    for await (const [id, rating, votes] of rows(ratingsFile)) {
        ratings.set(id, { rating: Number(rating), votes: Number(votes) });
    }

    log('Reading episodes…');
    // Only keep episodes of series that are popular enough to be included.
    const episodesBySeries = new Map<string, Map<string, Episode>>();
    for await (const [id, seriesId, seasonNumber] of rows(episodesFile)) {
        const seriesVotes = ratings.get(seriesId)?.votes ?? 0;
        if (seriesVotes < MIN_SERIES_VOTES) continue;

        const season = toInt(seasonNumber);
        if (season === null || season < 1 || season > MAX_SEASON_NUMBER) {
            continue;
        }

        const rating = ratings.get(id);
        let episodes = episodesBySeries.get(seriesId);
        if (!episodes) {
            episodes = new Map();
            episodesBySeries.set(seriesId, episodes);
        }
        episodes.set(id, {
            season,
            rating: rating && rating.votes >= MIN_EPISODE_VOTES ? rating : null,
        });
    }

    log('Reading titles…');
    type Series = Omit<Show, 'rating' | 'votes' | 'seasons'>;
    const series = new Map<string, Series>();
    const episodeYears = new Map<string, number>();
    const episodeIds = new Set<string>();
    for (const episodes of episodesBySeries.values()) {
        for (const id of episodes.keys()) episodeIds.add(id);
    }
    const movieIds = new Set<string>();
    for (const { movies } of filmSeries.values()) {
        for (const id of movies.keys()) movieIds.add(id);
    }
    const movieInfo = new Map<string, { title: string; year: number | null }>();
    for await (const row of rows(basicsFile)) {
        const [id, type, title, , isAdult, startYear, endYear, , genres] = row;
        if (episodeIds.has(id)) {
            const year = toInt(startYear);
            if (year !== null) episodeYears.set(id, year);
        } else if (SERIES_TYPES.has(type) && episodesBySeries.has(id)) {
            series.set(id, {
                id,
                title,
                startYear: toInt(startYear),
                endYear: toInt(endYear),
                genres: nullable(genres)?.split(',') ?? [],
            });
        } else if (
            type === 'movie' &&
            isAdult === '0' &&
            (movieIds.has(id) ||
                (ratings.get(id)?.votes ?? 0) >= MIN_PERSON_MOVIE_VOTES)
        ) {
            movieInfo.set(id, { title, year: toInt(startYear) });
        }
    }

    log('Computing season ratings…');
    const shows: Show[] = [];
    for (const [id, info] of series) {
        const bySeason = new Map<number, string[]>();
        for (const [episodeId, episode] of episodesBySeries.get(id)!) {
            const ids = bySeason.get(episode.season) ?? [];
            ids.push(episodeId);
            bySeason.set(episode.season, ids);
        }

        const seasons: SeasonRating[] = [...bySeason.entries()]
            .sort(([a], [b]) => a - b)
            .map(([seasonNumber, ids]) => {
                const episodes = ids.map((episodeId) =>
                    episodesBySeries.get(id)!.get(episodeId)!
                );
                const rated = episodes.flatMap((episode) =>
                    episode.rating ? [episode.rating] : []
                );
                const years = ids.flatMap((episodeId) => {
                    const year = episodeYears.get(episodeId);
                    return year === undefined ? [] : [year];
                });
                return {
                    seasonNumber,
                    year: years.length ? Math.min(...years) : null,
                    episodeCount: ids.length,
                    ratedEpisodeCount: rated.length,
                    votes: rated.reduce((sum, r) => sum + r.votes, 0),
                    rating: rated.length
                        ? round(
                              rated.reduce((sum, r) => sum + r.rating, 0) /
                                  rated.length
                          )
                        : null,
                };
            });

        // A single season has no curve to look at.
        if (seasons.filter((season) => season.rating !== null).length < 2) {
            continue;
        }

        const { rating, votes } = ratings.get(id)!;
        shows.push({ ...info, rating, votes, seasons });
    }

    shows.sort((a, b) => b.votes - a.votes);

    log('Computing film series…');
    const franchises: Franchise[] = [];
    // Wikidata sometimes has two items for the same series, like "James Bond"
    // and "Eon James Bond series". Keep one of each set of movies.
    const seenMovieSets = new Set<string>();
    const filmSeriesByTitleLength = [...filmSeries].sort(
        ([, a], [, b]) => a.title.length - b.title.length
    );
    for (const [id, { title, movies: members }] of filmSeriesByTitleLength) {
        const movies = [...members].flatMap(([movieId, number]) => {
            const info = movieInfo.get(movieId);
            const rating = ratings.get(movieId);
            if (!info || !rating || rating.votes < MIN_MOVIE_VOTES) return [];
            return [{ id: movieId, ...info, ...rating, number }];
        });
        if (movies.length < 2) continue;

        const votes = movies.reduce((sum, movie) => sum + movie.votes, 0);
        if (votes < MIN_FRANCHISE_VOTES) continue;

        const movieSet = movies
            .map((movie) => movie.id)
            .sort()
            .join();
        if (seenMovieSets.has(movieSet)) continue;
        seenMovieSets.add(movieSet);

        // Release order, using the number in the series for same-year movies.
        movies.sort(
            (a, b) =>
                (a.year ?? Infinity) - (b.year ?? Infinity) ||
                (a.number ?? Infinity) - (b.number ?? Infinity) ||
                a.id.localeCompare(b.id)
        );
        const years = movies.flatMap((movie) =>
            movie.year === null ? [] : [movie.year]
        );
        franchises.push({
            id,
            title,
            startYear: years.length ? Math.min(...years) : null,
            endYear: years.length ? Math.max(...years) : null,
            votes,
            movies: movies.map(({ id, title, year, rating, votes }): Movie => ({
                id,
                title,
                year,
                rating,
                votes,
            })),
        });
    }

    franchises.sort((a, b) => b.votes - a.votes);

    const people = await findPeople(
        principalsFile,
        namesFile,
        ratings,
        movieInfo
    );

    await addPosters(shows, franchises, people);

    const data: DataFile = {
        generatedAt: new Date().toISOString(),
        shows,
        franchises,
        people,
    };
    await mkdir(path.dirname(OUT_FILE), { recursive: true });
    await writeFile(OUT_FILE, JSON.stringify(data));
    const { size } = await stat(OUT_FILE);
    log(
        `Wrote ${shows.length} series, ${franchises.length} film series and ${people.length} people to ${OUT_FILE} (${(size / 1e6).toFixed(1)} MB)`
    );
}

await main();
