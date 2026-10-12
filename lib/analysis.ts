import { DEFAULT_MIN_SEASONS, type MinSeasons } from './minSeasons';
import type { RatedSeason, SeasonRating, Show } from './types';

/**
 * Seasons with a rating based on at least half of their episodes. A season
 * that has only just started airing would otherwise skew the curve.
 */
export const ratedSeasons = (seasons: SeasonRating[]): RatedSeason[] =>
    seasons.filter(
        (season): season is RatedSeason =>
            season.rating !== null &&
            season.ratedEpisodeCount * 2 >= season.episodeCount
    );

const mean = (values: number[]) =>
    values.reduce((sum, value) => sum + value, 0) / values.length;

/** Least-squares slope of rating per season. */
const slope = (ratings: number[]) => {
    const meanX = (ratings.length - 1) / 2;
    const meanY = mean(ratings);
    let covariance = 0;
    let variance = 0;
    ratings.forEach((y, x) => {
        covariance += (x - meanX) * (y - meanY);
        variance += (x - meanX) ** 2;
    });
    return variance === 0 ? 0 : covariance / variance;
};

export type SeasonTrend = {
    best: RatedSeason;
    worst: RatedSeason;
    first: RatedSeason;
    last: RatedSeason;
    /** Mean of the season ratings. */
    average: number;
    /** Rating change from the first to the last rated season. */
    change: number;
    verdict: string;
};

export function analyzeSeasons(show: Show): SeasonTrend | null {
    const rated = ratedSeasons(show.seasons);
    if (rated.length < 2) return null;

    const ratings = rated.map((season) => season.rating);
    const best = rated.reduce((a, b) => (b.rating > a.rating ? b : a));
    const worst = rated.reduce((a, b) => (b.rating < a.rating ? b : a));
    const first = rated[0];
    const last = rated[rated.length - 1];
    const average = mean(ratings);
    const spread = best.rating - worst.rating;
    // The trend over the whole run, so long shows aren't judged per season.
    const fittedChange = slope(ratings) * (rated.length - 1);
    const ended = show.endYear !== null;

    let verdict: string;
    if (spread < 0.4) {
        verdict = 'Rock steady';
    } else if (best === last) {
        verdict = ended ? 'Saved the best for last' : 'Still climbing';
    } else if (ended && last === worst) {
        verdict = 'Fell at the finish line';
    } else if (ended && last.rating < average - 0.3) {
        verdict = 'Ran out of steam';
    } else if (fittedChange <= -0.5) {
        verdict = `All downhill since season ${best.seasonNumber}`;
    } else if (fittedChange >= 0.5) {
        verdict = 'Getting better with age';
    } else {
        verdict = `Peaked in season ${best.seasonNumber}`;
    }

    return {
        best,
        worst,
        first,
        last,
        average,
        change: last.rating - first.rating,
        verdict,
    };
}

export type Section = {
    slug: string;
    title: string;
    description: string;
    shows: Show[];
};

type SectionDefinition = Omit<Section, 'shows' | 'description'> & {
    description: string | ((minSeasons: number) => string);
    /** Only consider series with at least this many votes. */
    minVotes: number;
    /** Raised to the visitor's chosen minimum when that is higher. */
    minSeasons: number;
    maxSeasons?: number;
    onlyEnded?: boolean;
    /** How strongly a series matches, or null if it doesn't. Higher first. */
    score: (ratings: number[], show: Show) => number | null;
};

const MIN_VOTES = 50_000;

const NUMBER_WORDS: Record<number, string> = {
    2: 'two',
    3: 'three',
    4: 'four',
};

const SECTION_DEFINITIONS: SectionDefinition[] = [
    {
        slug: 'most-popular',
        title: 'Most popular',
        description: 'The series with the most ratings on IMDb.',
        minVotes: MIN_VOTES,
        minSeasons: 2,
        score: (_, show) => show.votes,
    },
    {
        slug: 'best-over-time',
        title: 'Best over time',
        description: (minSeasons) =>
            `Highest average across all seasons, at least ${NUMBER_WORDS[minSeasons] ?? minSeasons} of them.`,
        minVotes: MIN_VOTES,
        minSeasons: 2,
        score: (ratings) => mean(ratings),
    },
    {
        slug: 'slow-starters',
        title: 'Slow starters',
        description:
            'Began weak but found their footing. Worth getting through season 1.',
        minVotes: MIN_VOTES,
        minSeasons: 3,
        score: ([first, ...rest]) => {
            const gain = mean(rest) - first;
            return gain >= 0.4 && Math.min(...rest) > first ? gain : null;
        },
    },
    {
        slug: 'mid-run-slump',
        title: 'The mid-run slump',
        description: 'Dipped in the middle, then won the audience back.',
        minVotes: MIN_VOTES,
        minSeasons: 4,
        // Very long runs wobble too much to have a single "middle".
        maxSeasons: 12,
        score: (ratings) => {
            const middle = ratings.slice(1, -1);
            const low = Math.min(...middle);
            const lowIndex = ratings.indexOf(low);
            const before = Math.max(...ratings.slice(0, lowIndex));
            const after = Math.max(...ratings.slice(lowIndex + 1));
            const dip = Math.min(before, after) - low;
            // The recovery has to come close to where it was before the dip.
            return dip >= 0.4 && after >= before - 0.2 ? dip : null;
        },
    },
    {
        slug: 'house-of-cards',
        title: 'Collapsed like a house of cards',
        description: 'Ended on a final season far below everything before it.',
        minVotes: MIN_VOTES,
        minSeasons: 3,
        onlyEnded: true,
        score: (ratings) => {
            const last = ratings[ratings.length - 1];
            const before = ratings.slice(0, -1);
            const drop = mean(before) - last;
            return drop >= 0.6 && last < Math.min(...before) ? drop : null;
        },
    },
    {
        slug: 'better-every-season',
        title: 'Better every season',
        description: 'Every season rated higher than the one before.',
        minVotes: MIN_VOTES,
        minSeasons: 3,
        score: (ratings) =>
            ratings.every((rating, i) => i === 0 || rating > ratings[i - 1])
                ? ratings[ratings.length - 1] - ratings[0]
                : null,
    },
    {
        slug: 'long-goodbye',
        title: 'The long goodbye',
        description: 'Long-running series on a slow, steady decline.',
        minVotes: MIN_VOTES,
        minSeasons: 7,
        score: (ratings) => {
            const decline = -slope(ratings) * (ratings.length - 1);
            // A slow decline, not a single collapse.
            const steepestDrop = Math.max(
                ...ratings.slice(1).map((rating, i) => ratings[i] - rating)
            );
            return decline >= 0.8 && steepestDrop <= 1 ? decline : null;
        },
    },
];

export const SECTION_SLUGS = SECTION_DEFINITIONS.map(({ slug }) => slug);

export function findSections(
    shows: Show[],
    limit: number,
    chosenMinSeasons: MinSeasons = DEFAULT_MIN_SEASONS
): Section[] {
    return SECTION_DEFINITIONS.map(
        ({
            description,
            minVotes,
            minSeasons: ownMinSeasons,
            maxSeasons = Infinity,
            onlyEnded,
            score,
            ...section
        }) => {
            const minSeasons = Math.max(ownMinSeasons, chosenMinSeasons);
            const scored = shows.flatMap((show) => {
                if (show.votes < minVotes) return [];
                if (onlyEnded && show.endYear === null) return [];
                const ratings = ratedSeasons(show.seasons).map(
                    (season) => season.rating
                );
                if (ratings.length < minSeasons) return [];
                if (ratings.length > maxSeasons) return [];
                const value = score(ratings, show);
                return value === null ? [] : [{ show, value }];
            });
            scored.sort(
                (a, b) => b.value - a.value || b.show.votes - a.show.votes
            );
            return {
                ...section,
                description:
                    typeof description === 'function'
                        ? description(minSeasons)
                        : description,
                shows: scored.slice(0, limit).map(({ show }) => show),
            };
        }
    );
}
