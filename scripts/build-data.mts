/**
 * Downloads IMDb's non-commercial datasets and writes per-season ratings for
 * every sufficiently popular TV series to data/shows.json.
 *
 * Run with `npm run data`. Downloads are cached in .imdb/ for 20 hours, since
 * IMDb only refreshes the files once a day.
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
import type { DataFile, SeasonRating, Show } from '../lib/types';

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

async function main() {
    const [ratingsFile, episodesFile, basicsFile] = await Promise.all([
        download('title.ratings'),
        download('title.episode'),
        download('title.basics'),
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
    for await (const row of rows(basicsFile)) {
        const [id, type, title, , , startYear, endYear, , genres] = row;
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

    const data: DataFile = {
        generatedAt: new Date().toISOString(),
        shows,
    };
    await mkdir(path.dirname(OUT_FILE), { recursive: true });
    await writeFile(OUT_FILE, JSON.stringify(data));
    const { size } = await stat(OUT_FILE);
    log(
        `Wrote ${shows.length} series to ${OUT_FILE} (${(size / 1e6).toFixed(1)} MB)`
    );
}

await main();
