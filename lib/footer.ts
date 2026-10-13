import { ratedSeasons } from './analysis';
import { formatChange, formatRating } from './format';
import type { DataFile } from './types';

const MIN_VOTES = 50_000;

/** A series or film series, drawn as a cluster of bars, one per season or movie. */
export type SkylineBuilding = {
    href: string;
    title: string;
    ratings: number[];
};

/**
 * The most popular series and film series with at least three rated seasons
 * or movies. The skyline is drawn at random from these.
 */
export function skylinePool(
    { shows, franchises }: DataFile,
    seriesCount = 48,
    filmCount = 16,
    maxBars = 9
): SkylineBuilding[] {
    const series = shows.map((show) => ({
        href: `/shows/${show.id}/`,
        title: show.title,
        ratings: ratedSeasons(show.seasons).map((season) => season.rating),
    }));
    const films = franchises.map((franchise) => ({
        href: `/movies/${franchise.id}/`,
        title: franchise.title,
        ratings: franchise.movies.map((movie) => movie.rating),
    }));
    const tallEnough = ({ ratings }: SkylineBuilding) => ratings.length >= 3;

    return [
        ...series.filter(tallEnough).slice(0, seriesCount),
        ...films.filter(tallEnough).slice(0, filmCount),
    ].map((building) => ({
        ...building,
        ratings: building.ratings.slice(0, maxBars),
    }));
}

/** A small seeded random number generator (mulberry32). */
function seededRandom(seed: number) {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = Math.imul(state ^ (state >>> 15), state | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32;
    };
}

/** `count` buildings from the pool in random order, the same for the same seed. */
export function drawSkyline(
    pool: SkylineBuilding[],
    seed: number,
    count = 16
): SkylineBuilding[] {
    const random = seededRandom(seed);
    const drawn = [...pool];
    // Fisher–Yates, stopping once the first `count` are in place.
    for (let i = 0; i < Math.min(count, drawn.length); i++) {
        const j = i + Math.floor(random() * (drawn.length - i));
        [drawn[i], drawn[j]] = [drawn[j], drawn[i]];
    }
    return drawn.slice(0, count);
}

export type Fact = {
    lead: string;
    title: string;
    href: string;
    detail: string;
};

type Step<T> = { item: T; from: number; to: number; change: number };

/** The consecutive pair with the largest change, in either direction. */
function extremeStep<T>(
    items: T[],
    ratings: (item: T) => number[],
    sign: 1 | -1
): Step<T> | undefined {
    let found: Step<T> | undefined;
    for (const item of items) {
        const values = ratings(item);
        for (let i = 1; i < values.length; i++) {
            const change = values[i] - values[i - 1];
            if (!found || change * sign > found.change * sign) {
                found = { item, from: i - 1, to: i, change };
            }
        }
    }
    return found;
}

/** Trivia for the post-credits scene, all computed from the data. */
export function postCreditsFacts({ shows, franchises }: DataFile): Fact[] {
    const popular = shows
        .filter((show) => show.votes >= MIN_VOTES)
        .map((show) => ({ show, seasons: ratedSeasons(show.seasons) }));
    const popularFranchises = franchises.filter(
        (franchise) => franchise.votes >= MIN_VOTES
    );
    const seasonRatings = ({ seasons }: (typeof popular)[number]) =>
        seasons.map((season) => season.rating);
    const movieRatings = ({ movies }: (typeof franchises)[number]) =>
        movies.map((movie) => movie.rating);

    const facts: Fact[] = [];

    const fall = extremeStep(popular, seasonRatings, -1);
    if (fall && fall.change < 0) {
        const { show, seasons } = fall.item;
        facts.push({
            lead: 'The steepest fall from one season to the next',
            title: show.title,
            href: `/shows/${show.id}/`,
            detail: `season ${seasons[fall.from].seasonNumber} → ${seasons[fall.to].seasonNumber}, ${formatChange(fall.change)}`,
        });
    }

    const comeback = extremeStep(popular, seasonRatings, 1);
    if (comeback && comeback.change > 0) {
        const { show, seasons } = comeback.item;
        facts.push({
            lead: 'The biggest comeback in a single season',
            title: show.title,
            href: `/shows/${show.id}/`,
            detail: `season ${seasons[comeback.from].seasonNumber} → ${seasons[comeback.to].seasonNumber}, ${formatChange(comeback.change)}`,
        });
    }

    const allSeasons = popular.flatMap(({ show, seasons }) =>
        seasons.map((season) => ({ show, season }))
    );
    if (allSeasons.length > 0) {
        const best = allSeasons.reduce((a, b) =>
            b.season.rating > a.season.rating ? b : a
        );
        facts.push({
            lead: 'The highest-rated season of them all',
            title: best.show.title,
            href: `/shows/${best.show.id}/`,
            detail: `season ${best.season.seasonNumber}, ${formatRating(best.season.rating)}`,
        });

        const worst = allSeasons.reduce((a, b) =>
            b.season.rating < a.season.rating ? b : a
        );
        facts.push({
            lead: 'The season everyone would rather forget',
            title: worst.show.title,
            href: `/shows/${worst.show.id}/`,
            detail: `season ${worst.season.seasonNumber}, ${formatRating(worst.season.rating)}`,
        });
    }

    if (popular.length > 0) {
        const longest = popular.reduce((a, b) =>
            b.seasons.length > a.seasons.length ? b : a
        );
        facts.push({
            lead: 'The longest run in the database',
            title: longest.show.title,
            href: `/shows/${longest.show.id}/`,
            detail: `${longest.seasons.length} rated seasons and counting`,
        });
    }

    const flop = extremeStep(popularFranchises, movieRatings, -1);
    if (flop && flop.change < 0) {
        const { item, from, to } = flop;
        facts.push({
            lead: 'The sequel that hurt the most',
            title: item.title,
            href: `/movies/${item.id}/`,
            detail: `${item.movies[from].title} → ${item.movies[to].title}, ${formatChange(flop.change)}`,
        });
    }

    const glowUp = extremeStep(popularFranchises, movieRatings, 1);
    if (glowUp && glowUp.change > 0) {
        const { item, from, to } = glowUp;
        facts.push({
            lead: 'The biggest glow-up between two movies',
            title: item.title,
            href: `/movies/${item.id}/`,
            detail: `${item.movies[from].title} → ${item.movies[to].title}, ${formatChange(glowUp.change)}`,
        });
    }

    return facts;
}
