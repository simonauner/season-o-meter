import { numberWord } from './format';
import { DEFAULT_MIN_COUNT, type MinCount } from './minCount';
import { findSections, type SectionDefinition } from './sections';
import { mean, slope } from './stats';
import type { Franchise, Movie } from './types';
import {
    BETTER_WITH_AGE,
    BIG_SPREAD,
    BIG_SPREAD_MIN,
    COMEBACK,
    FLAWLESS,
    hasStandout,
    hasTwinPeaks,
    isComeback,
    isZigzag,
    pickVerdict,
    RAN_OUT_OF_STEAM,
    SAVED_THE_BEST,
    STANDOUT,
    STEADY,
    STEADY_AND_LOW,
    TWIN_PEAKS,
    ZIGZAG,
} from './verdicts';

export type MovieTrend = {
    best: Movie;
    worst: Movie;
    first: Movie;
    last: Movie;
    /** Mean of the movie ratings. */
    average: number;
    /** Rating change from the first to the latest movie. */
    change: number;
    verdict: string;
};

export function analyzeMovies({ id, movies }: Franchise): MovieTrend | null {
    if (movies.length < 2) return null;

    const ratings = movies.map((movie) => movie.rating);
    const best = movies.reduce((a, b) => (b.rating > a.rating ? b : a));
    const worst = movies.reduce((a, b) => (b.rating < a.rating ? b : a));
    const first = movies[0];
    const last = movies[movies.length - 1];
    const average = mean(ratings);
    const spread = best.rating - worst.rating;
    // The trend over the whole series, so long series aren't judged per movie.
    const fittedChange = slope(ratings) * (movies.length - 1);

    const verdict = pickVerdict(id, verdictOptions());

    function verdictOptions(): string[] {
        if (worst.rating >= 8) return FLAWLESS;
        if (spread < 0.4) {
            return average < 6
                ? STEADY_AND_LOW
                : [
                      ...STEADY,
                      'Same procedure as every sequel',
                      'Sequel-y good',
                  ];
        }
        if (best === first) {
            return [
                movies.length === 2
                    ? 'The sequel fell short'
                    : 'Never topped the original',
                "You can't handle the sequel",
                'Nothing beats the original',
                'Sequelitis',
            ];
        }
        if (best === last) {
            return movies.length === 2
                ? [
                      'The sequel is better',
                      'The Empire Strikes Back',
                      "I'll be back… and better",
                  ]
                : [...SAVED_THE_BEST, "I'll be back… and better"];
        }
        if (last === worst) return RAN_OUT_OF_STEAM;
        if (isZigzag(ratings)) return ZIGZAG;
        if (hasTwinPeaks(ratings)) return TWIN_PEAKS;
        if (isComeback(ratings)) return COMEBACK;
        if (spread >= BIG_SPREAD_MIN) return BIG_SPREAD;
        if (fittedChange <= -0.5) {
            return [
                `All downhill after ${best.title}`,
                'I see dead sequels',
                "Should've quit while ahead",
            ];
        }
        if (fittedChange >= 0.5) return BETTER_WITH_AGE;
        if (hasStandout(ratings)) return STANDOUT;
        return [`Peaked with ${best.title}`];
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

const MIN_VOTES = 250_000;

const SECTION_DEFINITIONS: SectionDefinition<Franchise>[] = [
    {
        slug: 'most-popular',
        title: 'Most popular',
        description: 'The film series with the most ratings on IMDb.',
        minVotes: MIN_VOTES,
        minRatings: 2,
        score: (_, franchise) => franchise.votes,
    },
    {
        slug: 'best-over-time',
        title: 'Best over time',
        description: (minMovies) =>
            `Highest average across all movies, at least ${numberWord(minMovies)} of them.`,
        minVotes: MIN_VOTES,
        minRatings: 3,
        score: (ratings) => mean(ratings),
    },
    {
        slug: 'better-sequels',
        title: 'Better than the original',
        description: 'A sequel came along that beat the first movie.',
        minVotes: MIN_VOTES,
        minRatings: 2,
        score: ([first, ...rest]) => {
            const gain = Math.max(...rest) - first;
            return gain >= 0.4 ? gain : null;
        },
    },
    {
        slug: 'original-is-best',
        title: 'Should have stopped at one',
        description: 'Every sequel fell well short of the original.',
        sharedVerdict: true,
        minVotes: MIN_VOTES,
        minRatings: 2,
        score: ([first, ...rest]) => {
            const drop = first - mean(rest);
            return drop >= 1 && first > Math.max(...rest) ? drop : null;
        },
    },
    {
        slug: 'back-on-form',
        title: 'Back on form',
        description:
            'Lost their way in the middle, then won the audience back.',
        minVotes: MIN_VOTES,
        minRatings: 4,
        score: (ratings) => {
            const middle = ratings.slice(1, -1);
            const low = Math.min(...middle);
            const lowIndex = ratings.indexOf(low);
            const before = Math.max(...ratings.slice(0, lowIndex));
            const after = Math.max(...ratings.slice(lowIndex + 1));
            const dip = Math.min(before, after) - low;
            // The recovery has to come close to where it was before the dip.
            return dip >= 0.6 && after >= before - 0.3 ? dip : null;
        },
    },
    {
        slug: 'one-sequel-too-many',
        title: 'One sequel too many',
        description: 'The latest movie landed far below everything before it.',
        minVotes: MIN_VOTES,
        minRatings: 3,
        score: (ratings) => {
            const last = ratings[ratings.length - 1];
            const before = ratings.slice(0, -1);
            const drop = mean(before) - last;
            return drop >= 0.6 && last < Math.min(...before) ? drop : null;
        },
    },
    {
        slug: 'diminishing-returns',
        title: 'Diminishing returns',
        description: 'Every movie rated lower than the one before.',
        sharedVerdict: true,
        minVotes: MIN_VOTES,
        minRatings: 3,
        score: (ratings) =>
            ratings.every((rating, i) => i === 0 || rating < ratings[i - 1])
                ? ratings[0] - ratings[ratings.length - 1]
                : null,
    },
];

export const FRANCHISE_SECTION_SLUGS = SECTION_DEFINITIONS.map(
    ({ slug }) => slug
);

export const findFranchiseSections = (
    franchises: Franchise[],
    limit: number,
    minMovies: MinCount = DEFAULT_MIN_COUNT.movies
) =>
    findSections(
        franchises,
        SECTION_DEFINITIONS,
        (franchise) => franchise.movies.map((movie) => movie.rating),
        limit,
        minMovies
    );
