import { ratedSeasons } from './analysis';
import { formatChange, formatRating } from './format';
import type { DataFile } from './types';

const MIN_VOTES = 50_000;

export type SkylineShow = {
    href: string;
    title: string;
    ratings: number[];
};

/** The most popular series, each drawn as a cluster of season bars. */
export function skylineShows(
    { shows }: DataFile,
    count = 16,
    maxSeasons = 9
): SkylineShow[] {
    return shows
        .map((show) => ({
            href: `/shows/${show.id}/`,
            title: show.title,
            ratings: ratedSeasons(show.seasons)
                .slice(0, maxSeasons)
                .map((season) => season.rating),
        }))
        .filter(({ ratings }) => ratings.length >= 3)
        .slice(0, count);
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
